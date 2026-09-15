/* =========================================================
   世界书引擎（SillyTavern 全兼容）
   ---------------------------------------------------------
   · 字段层：完整支持 ST 世界书的全部字段，导入 / 导出双向无损
   · 触发层：常驻、关键词、次要关键词逻辑、大小写、全词匹配、
            扫描深度、触发概率、插入位置 / 深度 / 角色、
            分组竞争、粘滞 / 冷却 / 延迟、递归扫描、向量条目
   · 存储层：所有条目统一存在 lore.w，用 block/cat 归入四大块，
            导出时通过 extensions.moYan 完整还原结构
   ========================================================= */
const WB_POS=[
  {v:0,n:'角色定义之前'},{v:1,n:'角色定义之后'},
  {v:2,n:'作者注记·顶部'},{v:3,n:'作者注记·底部'},{v:4,n:'按深度插入（贴近正文指令）'}
];
const WB_ROLE=[{v:0,n:'系统 system'},{v:1,n:'用户 user'},{v:2,n:'助手 assistant'}];
const WB_LOGIC=[
  {v:0,n:'任一次要关键词命中（AND ANY）'},
  {v:1,n:'次要关键词未全部命中（NOT ALL）'},
  {v:2,n:'次要关键词全部未命中（NOT ANY）'},
  {v:3,n:'全部次要关键词命中（AND ALL）'}
];
function wbLogicName(v){ const x=WB_LOGIC.find(z=>z.v===Number(v)); return x?x.n:('未知逻辑 '+v); }
function wbPosName(v){ const x=WB_POS.find(z=>z.v===Number(v)); return x?x.n:('位置 '+v); }
function wbRoleName(v){ const x=WB_ROLE.find(z=>z.v===Number(v)); return x?x.n:('角色 '+v); }
function wbBool(v,d){
  if(v==null) return !!d;
  if(typeof v==='string'){ const s=v.trim().toLowerCase(); if(s==='' ) return !!d; return s==='true'||s==='1'||s==='yes'; }
  return !!v;
}
function wbNum(v,d){ const n=Number(v); return isFinite(n)?n:d; }

/* ---------------- 条目归一化（ST → 内部） ---------------- */
function wbMetaOf(raw){
  return (raw&&raw.extensions&&raw.extensions.moYan)||{};
}
function wbEntry(raw,o){
  raw=raw||{}; o=o||{};
  const keys = toKeys(raw.keys!=null?raw.keys:raw.key);
  const sec  = toKeys(raw.secondary!=null?raw.secondary
              :(raw.keysecondary!=null?raw.keysecondary:(raw.secondary_keys!=null?raw.secondary_keys:raw.secondaryKeys)));
  const meta = wbMetaOf(raw);
  const cf   = raw.characterFilter||{};
  const names= toKeys(cf.names);
  const e={
    id: o.id || uid(),
    block: o.block || meta.block || 'world',
    cat: o.cat || meta.cat || '',
    name: String(raw.comment!=null?raw.comment:(raw.name!=null?raw.name:(raw.title!=null?raw.title:(keys[0]||'未命名条目')))),
    content: String(raw.content!=null?raw.content:(raw.entry!=null?raw.entry:'')),
    note: String(meta.note!=null?meta.note:(raw.note!=null?raw.note:'')),
    real: wbBool(meta.real!=null?meta.real:raw.real, false),
    enabled: !wbBool(raw.disable!=null?raw.disable:(raw.disabled!=null?raw.disabled:false), false),
    /* ---- SillyTavern 全字段 ---- */
    keys, secondary: sec,
    constant: wbBool(raw.constant!=null?raw.constant:raw.alwaysOn, false),
    selective: wbBool(raw.selective, sec.length>0),
    selectiveLogic: wbNum(raw.selectiveLogic,0),
    caseSensitive: wbBool(raw.caseSensitive,false),
    matchWholeWords: wbBool(raw.matchWholeWords,false),
    scanDepth: (raw.scanDepth==null||raw.scanDepth==='')?null:wbNum(raw.scanDepth,null),
    vectorized: wbBool(raw.vectorized,false),
    probability: wbNum(raw.probability,100),
    useProbability: wbBool(raw.useProbability,true),
    order: wbNum(raw.order!=null?raw.order:(raw.insertion_order!=null?raw.insertion_order:raw.insertionOrder),100),
    position: wbNum(raw.position,0),
    depth: wbNum(raw.depth,4),
    role: wbNum(raw.role,0),
    include: String(meta.include!=null?meta.include:(names.length?names.join(','):'')),
    exclude: String(meta.exclude!=null?meta.exclude:''),
    group: String(raw.group==null?'':raw.group),
    groupWeight: wbNum(raw.groupWeight,100),
    groupOverride: wbBool(raw.groupOverride,false),
    sticky: wbNum(raw.sticky,0),
    cooldown: wbNum(raw.cooldown,0),
    delay: wbNum(raw.delay,0),
    excludeRecursion: wbBool(raw.excludeRecursion,false),
    preventRecursion: wbBool(raw.preventRecursion,false),
    delayUntilRecursion: wbBool(raw.delayUntilRecursion,false)?1:0,
    displayIndex: wbNum(raw.displayIndex,o.di!=null?o.di:0),
    addMemo: wbBool(raw.addMemo,true),
    automationId: String(raw.automationId||''),
    stUid: raw.uid,
    _grp: meta.grp||'',                 // 分组竞争结果标记（仅内部用）
    _auto: meta.auto!=null?!!meta.auto:!!o.auto,
    _linked: o.linkedChar||raw.linkedChar||null,
    _raw: raw
  };
  if(meta.realm) e.realm=Object.assign({cap:'',feat:'',cond:'',weak:''},meta.realm);
  if(meta.event) e.event=Object.assign({time:'',effect:''},meta.event);
  return e;
}
/* 兼容旧调用（角色卡内嵌世界书） */
function normWorldEntry(e){ return wbEntry(e); }

/* ---------------- 旧版世界书迁移 ---------------- */
function wbMigrate(d){
  d=d||{};
  if(d.lore&&typeof d.lore==='object'){
    const L=d.lore;
    if(Array.isArray(d.world)&&d.world.length&&!(Array.isArray(L.w)&&L.w.length)){
      L.w=d.world.map(e=>wbEntry(e,{}));
    }
    return L;
  }
  if(Array.isArray(d.world)&&d.world.length){
    const L=blankLore();
    L.w=d.world.map(e=>wbEntry(e,{}));
    return L;
  }
  return null;
}

/* ---------------- 内部条目补全（保证字段齐全） ---------------- */
function wbFix(e){
  if(!e||typeof e!=='object') return e;
  if(!e.id) e.id=uid();
  if(e.block==null) e.block='world';
  if(e.cat==null) e.cat='';
  ['name','content','note','include','exclude','group'].forEach(k=>{ if(typeof e[k]!=='string') e[k]=String(e[k]==null?'':e[k]); });
  ['keys','secondary'].forEach(k=>{ if(!Array.isArray(e[k])) e[k]=(e[k]==null?[]:toKeys(e[k])); });
  const nums={selectiveLogic:0,probability:100,order:100,position:0,depth:4,role:0,
    groupWeight:100,sticky:0,cooldown:0,delay:0,displayIndex:0};
  Object.keys(nums).forEach(k=>{ if(typeof e[k]!=='number'||!isFinite(e[k])) e[k]=wbNum(e[k],nums[k]); });
  if(e.scanDepth===0||e.scanDepth==='') e.scanDepth=null;
  else if(e.scanDepth!=null) e.scanDepth=wbNum(e.scanDepth,null);
  const bools={constant:false,selective:true,caseSensitive:false,matchWholeWords:false,vectorized:false,
    useProbability:true,groupOverride:false,excludeRecursion:false,preventRecursion:false,real:false};
  Object.keys(bools).forEach(k=>{ if(typeof e[k]!=='boolean') e[k]=wbBool(e[k],bools[k]); });
  if(e.enabled==null) e.enabled=true;
  e.delayUntilRecursion=e.delayUntilRecursion?1:0;
  if(!Array.isArray(e._hit)) e._hit=[];
  if(e.addMemo==null) e.addMemo=true;
  return e;
}

/* ---------------- 触发设置面板（世界书条目用） ---------------- */
function wbOpts(list,cur){ return list.map(x=>'<option value="'+x.v+'"'+(Number(cur)===Number(x.v)?' selected':'')+'>'+esc(x.n)+'</option>').join(''); }
function wbNumField(label,f,v,title,w){
  return '<div><label style="margin-top:0">'+esc(label)+'</label>'
    +'<input type="number" data-f="'+f+'" data-num="1" value="'+(v==null?'':v)+'"'
    +(title?(' title="'+esc(title)+'"'):'')+' style="width:100%"></div>';
}
function wbFieldsHTML(e){
  wbFix(e);
  const open=_loreOpen.has('wb:'+e.id);
  const badges=[e.constant?'<span class="badge on">常驻</span>':'<span class="badge ok">关键词触发</span>'];
  if(Number(e.probability)<100) badges.push('<span class="badge warn">概率 '+e.probability+'%</span>');
  if(e.group) badges.push('<span class="badge">组 '+esc(e.group)+'</span>');
  if(Number(e.sticky)>0) badges.push('<span class="badge">粘滞 '+e.sticky+'</span>');
  if(Number(e.cooldown)>0) badges.push('<span class="badge">冷却 '+e.cooldown+'</span>');
  if(Number(e.delay)>0) badges.push('<span class="badge">延迟 '+e.delay+'</span>');
  if(e.vectorized) badges.push('<span class="badge">向量</span>');
  if(e._hit&&e._hit.length) badges.push('<span class="badge">已命中 '+(e._hit[e._hit.length-1]+1)+' 章</span>');
  return '<div class="wbfold'+(open?' open':'')+'">'
    +'<div class="wbhead" data-act="wbfold" data-id="'+e.id+'">'
    +'<span class="caret">▶</span><b>⚙ 触发设置</b>'
    +'<span class="hint" style="margin:0">SillyTavern 世界书字段</span>'
    +'<div class="spacer"></div>'+badges.join(' ')+'</div>'
    +'<div class="wbbody">'

    +'<div class="lgrid">'
    +'<div><label style="margin-top:0">注入方式</label><select data-f="constant" data-bool="1">'
      +'<option value="false"'+(e.constant?'':' selected')+'>关键词触发（默认）</option>'
      +'<option value="true"'+(e.constant?' selected':'')+'>常驻 · 每章必注入</option></select></div>'
    +wbNumField('插入顺序 order',"order",e.order,'越大越靠前，相同则按命中强度')
    +'</div>'

    +'<label>触发关键词（英文逗号分隔；留空则永不触发，除非勾了向量）</label>'
    +'<input type="text" data-f="keys" data-keys="1" value="'+esc((e.keys||[]).join(', '))+'" placeholder="例：墨砚城, 渡口, 验墨">'

    +'<div class="lgrid">'
    +'<div><label>次要关键词（可选）</label><input type="text" data-f="secondary" data-keys="1" value="'+esc((e.secondary||[]).join(', '))+'" placeholder="需配合下方逻辑"></div>'
    +'<div><label>次要关键词逻辑</label><select data-f="selectiveLogic" data-num="1">'+wbOpts(WB_LOGIC,e.selectiveLogic)+'</select></div>'
    +'</div>'
    +'<div class="toolbar" style="margin-top:6px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="selective"'+(e.selective?' checked':'')+'> 启用次要关键词</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="caseSensitive"'+(e.caseSensitive?' checked':'')+'> 区分大小写</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="matchWholeWords"'+(e.matchWholeWords?' checked':'')+'> 全词匹配</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="vectorized"'+(e.vectorized?' checked':'')+'> 向量检索（本地近似，无需 API）</label>'
    +'</div>'

    +'<div class="lgrid">'
    +wbNumField('扫描范围覆盖（字，留空用全局）',"scanDepth",e.scanDepth,'只扫描最近这么多字的前文')
    +'<div><label style="margin-top:0">插入位置</label><select data-f="position" data-num="1">'+wbOpts(WB_POS,e.position)+'</select></div>'
    +'</div>'
    +'<div class="lgrid">'
    +wbNumField('插入深度 depth',"depth",e.depth,'「按深度插入」时贴多近')
    +'<div><label style="margin-top:0">消息角色 role</label><select data-f="role" data-num="1">'+wbOpts(WB_ROLE,e.role)+'</select></div>'
    +'</div>'

    +'<div class="lgrid">'
    +wbNumField('触发概率 %',"probability",e.probability,'100 表示必定触发')
    +wbNumField('组内权重 groupWeight',"groupWeight",e.groupWeight,'参与分组竞争时使用')
    +'</div>'
    +'<label>分组名（同组条目只会注入一条，按权重 / order 竞争）</label>'
    +'<input type="text" data-f="group" value="'+esc(e.group||'')+'" placeholder="留空表示不参与分组">'
    +'<div class="toolbar" style="margin-top:6px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="useProbability"'+(e.useProbability?' checked':'')+'> 使用触发概率</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="groupOverride"'+(e.groupOverride?' checked':'')+'> 组内按权重优先</label>'
    +'</div>'

    +'<div class="lgrid">'
    +wbNumField('粘滞 sticky（章）',"sticky",e.sticky,'命中后继续生效这么多章')
    +wbNumField('冷却 cooldown（章）',"cooldown",e.cooldown,'命中后这么多章内不再触发')
    +'</div>'
    +'<div class="lgrid">'+wbNumField('延迟 delay（章）',"delay",e.delay,'第 delay+1 章起才可能触发')+'</div>'

    +'<div class="toolbar" style="margin-top:6px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="excludeRecursion"'+(e.excludeRecursion?' checked':'')+'> 不参与递归</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="preventRecursion"'+(e.preventRecursion?' checked':'')+'> 本条目内容不再触发其它条目</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="delayUntilRecursion"'+(e.delayUntilRecursion?' checked':'')+'> 仅在递归中被触发</label>'
    +'</div>'

    +'<div class="lgrid">'
    +'<div><label style="margin-top:0">限定角色 include（仅这些角色在场时生效）</label><input type="text" data-f="include" value="'+esc(e.include||'')+'" placeholder="角色名，逗号分隔"></div>'
    +'<div><label style="margin-top:0">排除角色 exclude（这些角色在场时不生效）</label><input type="text" data-f="exclude" value="'+esc(e.exclude||'')+'" placeholder="角色名，逗号分隔"></div>'
    +'</div>'

    +((e._hit&&e._hit.length)?('<div class="toolbar" style="margin-top:8px"><span class="hint" style="margin:0">已命中章节：'+e._hit.map(i=>(i+1)).join('、')+'</span>'
      +'<div class="spacer"></div><button class="btn xs ghost" data-act="wbclear" data-id="'+e.id+'">清除命中记录</button></div>'):'')
    +'</div></div>';
}

/* ---------------- 触发判定 ---------------- */
function wbReEsc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, c=>'\\'+c); }
function wbIsCJK(s){ return /^[\u3400-\u9fff\uf900-\ufaff]+$/.test(String(s||'')); }
function wbMatchKey(key,text,e){
  if(!key) return false;
  let k=String(key), t=String(text||'');
  if(!k.trim()) return false;
  if(!e.caseSensitive){ k=k.toLowerCase(); t=t.toLowerCase(); }
  if(e.matchWholeWords && !wbIsCJK(k)){
    try{ return new RegExp('(?:^|[^0-9a-z_])(?:'+wbReEsc(k)+')(?:[^0-9a-z_]|$)','i').test(t); }
    catch(_){ return t.indexOf(k)>=0; }
  }
  return t.indexOf(k)>=0;
}
function wbGrams(s){
  const t=String(s||'').replace(/\s+/g,' ');
  const g=new Set();
  for(let i=0;i<t.length-1;i++) g.add(t.slice(i,i+2));
  return g;
}
/* 条目内容被扫描文本覆盖的比例（本地近似「向量检索」，不依赖任何 API） */
function wbCover(a,b){
  const A=wbGrams(a); if(!A.size) return 0;
  const B=wbGrams(b); if(!B.size) return 0;
  let n=0; A.forEach(x=>{ if(B.has(x)) n++; });
  return n/A.size;
}

/* ---------------- 扫描文本 ---------------- */
function wbScanParts(idx){
  const prior=[], focus=[];
  const prevText=(state.chapters[idx-1]&&state.chapters[idx-1].content)||'';
  if(prevText) prior.push(prevText);
  for(let i=idx-2;i>=0;i--){
    const s=(state.chapters[i]&&state.chapters[i].summary)||'';
    if(s) prior.push('第'+(i+1)+'章：'+s);
    if(prior.join('\n').length>20000) break;
  }
  prior.reverse();
  const cur=state.outline[idx];
  if(cur) focus.push(cur.title+' '+(cur.summary||''));
  const curText=(state.chapters[idx]&&state.chapters[idx].content)||'';
  if(curText) focus.push(curText);
  activeCharsFor(idx).forEach(c=>{
    /* 人物细分版：把所有非空字段都作为关键词扫描文本 */
    if(typeof chScanText==='function'){ try{ focus.push(chScanText(c)); return; }catch(e){} }
    focus.push([c.name,c.description,c.personality,c.scenario,c.speech].join(' '));
  });
  if(state.meta.extra) focus.push(state.meta.extra);
  return {prior:prior.join('\n'), focus:focus.join('\n')};
}
/* 世界书条目看到的文本：扫描深度决定回看多少前文 */
function wbTextFor(e,parts,globalScan){
  const n = (e.scanDepth!=null && e.scanDepth>0) ? e.scanDepth : globalScan;
  const p = parts.prior?parts.prior.slice(-n):'';
  return p+'\n'+parts.focus;
}

/* ---------------- 单条命中判定 ---------------- */
function wbHit(e,parts,globalScan,charNames,idx){
  const inc=toKeys(e.include), exc=toKeys(e.exclude);
  if(inc.length && !inc.some(n=>charNames.some(nm=>nm.indexOf(n)>=0||n.indexOf(nm)>=0)))
    return {hit:false,why:'角色过滤未命中（限定：'+inc.join('、')+'）'};
  if(exc.length && exc.some(n=>charNames.some(nm=>nm.indexOf(n)>=0||n.indexOf(nm)>=0)))
    return {hit:false,why:'被角色过滤排除（排除：'+exc.join('、')+'）'};
  if(e.delay>0 && idx<e.delay) return {hit:false,why:'延迟生效中（第 '+(e.delay+1)+' 章起才启用）'};
  const hist=e._hit||[];
  const last=hist.length?Math.max.apply(null,hist):null;
  if(e.cooldown>0 && last!=null && (idx-last)<e.cooldown)
    return {hit:false,why:'冷却中（上次命中第 '+(last+1)+' 章，冷却 '+e.cooldown+' 章）'};
  if(e.sticky>0 && last!=null && (idx-last)<=e.sticky)
    return {hit:true,why:'粘滞生效（第 '+(last+1)+' 章命中，粘滞 '+e.sticky+' 章）',sticky:true};
  const t=wbTextFor(e,parts,globalScan);
  const ks=e.keys.filter(k=>String(k||'').trim());
  const hitKeys=ks.filter(k=>wbMatchKey(k,t,e));
  let ok=false, why='';
  if(hitKeys.length){ ok=true; why='命中关键词：'+hitKeys.slice(0,4).join('、'); }
  else if(ks.length) why='关键词未命中（'+ks.slice(0,4).join('、')+'）';
  else if(!e.vectorized) why='没有触发关键词';
  if(ok && e.selective && e.secondary.length){
    const sh=e.secondary.filter(k=>wbMatchKey(k,t,e));
    const n=sh.length, m=e.secondary.length, lg=Number(e.selectiveLogic)||0;
    const pass = lg===0? n>=1 : lg===1? n<m : lg===2? n===0 : n===m;
    if(!pass){ ok=false; why='次要关键词逻辑未通过（'+wbLogicName(lg)+'，命中 '+n+'/'+m+'）'; }
    else why+='；次要关键词通过（'+n+'/'+m+'）';
  }
  if(!ok && e.vectorized){
    const cv=wbCover(e.keys.join(' ')+' '+e.content,t);
    if(cv>=0.5){ ok=true; why='向量近似命中（覆盖度 '+cv.toFixed(2)+'）'; }
    else if(!why||/没有触发关键词/.test(why)) why='向量相似度不足（覆盖度 '+cv.toFixed(2)+'，需 ≥0.50）';
  }
  if(ok && e.useProbability && e.probability<100){
    if(Math.random()*100>=e.probability){ ok=false; why='触发概率未通过（'+e.probability+'%）'; }
    else why+='；概率通过（'+e.probability+'%）';
  }
  return {hit:ok,why:why,score:hitKeys.join('').length*100+(e.order||0)};
}

/* ---------------- 主引擎 ---------------- */
let _wbLast={sys:'',ctx:'',included:[],skipped:[],dropped:[],used:0,budget:0,scanLen:0,levels:0,groups:[]};
function wbLast(){ return _wbLast; }
function wbRun(idx,opt){
  opt=opt||{};
  const L=ensureLore();
  const budget=Math.max(500,Number(L.wbudget)||6000);
  const globalScan=Math.max(200,Number(state.settings&&state.settings.scan)||1200);
  const parts=wbScanParts(idx);
  const charNames=activeCharsFor(idx).map(c=>c.name||'');
  const pool=L.w.filter(e=>e.enabled && String(e.content||'').trim());
  const incIds=new Set(), items=[];
  const skipped=[];
  const add=(e,why,lv)=>{ if(incIds.has(e.id)) return; incIds.add(e.id); items.push({e,why,level:lv||0}); };

  /* ① 常驻条目 */
  pool.forEach(e=>{ if(e.constant) add(e,'常驻（固定上下文）',0); });

  /* ② 关键词触发 + 递归扫描 */
  const maxLv=Math.max(0,Math.min(5,Number(L.recursion)||2));
  let buf=parts.prior.slice(-globalScan)+'\n'+parts.focus;
  let lv=0;
  while(lv<=maxLv){
    let grew=false;
    for(const e of pool){
      if(incIds.has(e.id)||e.constant) continue;
      if(lv>0 && e.excludeRecursion){ continue; }               // 不参与递归
      if(lv===0 && e.delayUntilRecursion){ continue; }          // 只在递归中出现
      const r=wbHit(e,{prior:buf,focus:parts.focus},globalScan,charNames,idx);
      if(r.hit){
        add(e,(lv?('递归第 '+lv+' 层 · '):'')+r.why,lv);
        if(!e.preventRecursion && String(e.content||'').trim()){ buf+='\n'+e.content; grew=true; }
      } else if(lv===0){
        skipped.push({e,why:r.why});
      }
    }
    if(!grew) break;
    lv++;
  }

  /* ③ 分组竞争：同组只保留一条 */
  const byGroup={}, groups=[];
  items.forEach(x=>{ if(x.e.group) (byGroup[x.e.group]=byGroup[x.e.group]||[]).push(x); });
  const droppedIds=new Set();
  Object.keys(byGroup).forEach(g=>{
    const arr=byGroup[g];
    if(arr.length<2) return;
    arr.sort((a,b)=>{
      if(a.e.groupOverride||b.e.groupOverride){
        const d=(b.e.groupWeight||0)-(a.e.groupWeight||0); if(d) return d;
      }
      return (b.e.order||0)-(a.e.order||0);
    });
    const win=arr[0];
    const losers=arr.slice(1).map(x=>x.e.name);
    groups.push({name:g,winner:win.e.name,losers:losers});
    arr.slice(1).forEach(x=>droppedIds.add(x.e.id));
  });
  let kept=items.filter(x=>!droppedIds.has(x.e.id));
  const groupOut=items.filter(x=>droppedIds.has(x.e.id))
    .map(x=>({e:x.e,why:'同组竞争落选（组「'+x.e.group+'」已有更优先条目）'}));

  /* ④ 排序：常驻在前，其余按 order 从大到小（与 ST 一致） */
  kept.sort((a,b)=>{
    const ca=a.e.constant?1:0, cb=b.e.constant?1:0;
    if(ca!==cb) return cb-ca;
    return (b.e.order||0)-(a.e.order||0);
  });

  /* ⑤ 预算裁剪 */
  const usedItems=[], dropped=[];
  let used=0;
  kept.forEach(x=>{
    const len=String(x.e.content||'').length+String(x.e.name||'').length+8;
    if(used+len<=budget){ usedItems.push(x); used+=len; }
    else dropped.push(x);
  });

  /* ⑥ 按插入位置 / 角色归位 */
  const pre=[], post=[], ctxItems=[];
  usedItems.forEach(x=>{
    const e=x.e;
    const head='◆ '+(e.name||'未命名')+(x.why?('　（'+x.why+'）'):'')+(x.level?('　[递归 L'+x.level+']'):'');
    const one='· '+head+'\n'+(e.note?('   ↳【解读限制】'+String(e.note).replace(/\s*\n\s*/g,' ')+'\n'):'')
      +String(e.content||'').replace(/\s*\n\s*/g,' ');
    if(Number(e.position)===4 || Number(e.role)!==0) ctxItems.push({e,text:one});
    else if(Number(e.position)===0||Number(e.position)===2) pre.push(one);
    else post.push(one);
  });
  let sys='';
  if(pre.length) sys+='\n\n【世界书 · 前置设定（必须严格遵守）】\n'+pre.join('\n');
  if(post.length) sys+='\n\n【世界书 · 补充设定（必须严格遵守）】\n'+post.join('\n');
  let ctx='';
  if(ctxItems.length){
    ctx='【世界书 · 按深度注入（贴近本章正文，优先级最高，与正文同步生效）】';
    ctxItems.forEach(x=>{ ctx+='\n'+x.text+(Number(x.e.role)===1?'\n   （以「用户补充」身份给出）':(Number(x.e.role)===2?'\n   （以「助手备注」身份给出）':'')); });
  }

  /* ⑦ 记录命中历史（仅在实际生成时提交，用于粘滞 / 冷却） */
  if(opt.commit){
    usedItems.forEach(x=>{
      const e=x.e; e._hit=Array.isArray(e._hit)?e._hit:[];
      if(e._hit[e._hit.length-1]!==idx) e._hit.push(idx);
      if(e._hit.length>30) e._hit=e._hit.slice(-30);
    });
  }

  _wbLast={idx, sys,ctx,included:usedItems,skipped:skipped.concat(groupOut),dropped,
    used,budget,scanLen:(parts.prior.slice(-globalScan)+'\n'+parts.focus).length,
    levels:lv,groups,pool:pool.length,constants:pool.filter(e=>e.constant).length};
  return _wbLast;
}

/* ---------------- ST 解析 ---------------- */
function wbParse(text){
  let j;
  try{ j=(typeof text==='string')?JSON.parse(text):text; }
  catch(e){ throw new Error('不是有效的 JSON：'+e.message); }
  let arr=[];
  if(Array.isArray(j)) arr=j;
  else if(!j||typeof j!=='object') return [];
  else if(j.entries!=null) arr=Array.isArray(j.entries)?j.entries:Object.values(j.entries);
  else if(j.data&&j.data.entries!=null) arr=Array.isArray(j.data.entries)?j.data.entries:Object.values(j.data.entries);
  else if(j.world_info!=null) arr=Array.isArray(j.world_info)?j.world_info:Object.values(j.world_info);
  else if(j.character_book&&j.character_book.entries!=null)
    arr=Array.isArray(j.character_book.entries)?j.character_book.entries:Object.values(j.character_book.entries);
  else if(j.content!=null||j.keys!=null||j.key!=null) arr=[j];
  else if(j.data&&(j.data.content!=null||j.data.keys!=null)) arr=[j.data];
  return arr.filter(x=>x&&typeof x==='object');
}
/* ---------------- ST 导出 ---------------- */
function wbRealmText(r){
  const seg=[];
  if((r.cap||'').trim()) seg.push('能力上限：'+r.cap.trim());
  if((r.feat||'').trim()) seg.push('特征：'+r.feat.trim());
  if((r.cond||'').trim()) seg.push('晋升条件：'+r.cond.trim());
  if((r.weak||'').trim()) seg.push('弱点：'+r.weak.trim());
  return seg.join('\n');
}
function wbEventText(v){
  const seg=[];
  if((v.time||'').trim()) seg.push('时间：'+v.time.trim());
  if((v.desc||'').trim()) seg.push(v.desc.trim());
  if((v.effect||'').trim()) seg.push('长远影响：'+v.effect.trim());
  return seg.join('\n');
}
function wbStEntry(e,kind,di){
  const meta={block:e.block||'world',cat:e.cat||'',note:e.note||'',real:!!e.real,auto:!!e._auto};
  if(kind==='realm') meta.realm={cap:e.cap||'',feat:e.feat||'',cond:e.cond||'',weak:e.weak||''};
  if(kind==='event') meta.event={time:e.time||'',effect:e.effect||''};
  const linked=e._linked||e.linkedChar;
  const base=Object.assign({},e._raw||{});
  return Object.assign(base,{
    uid: e.stUid!=null?e.stUid:di,
    key: e.keys||[],
    keys: e.keys||[],
    keysecondary: e.secondary||[],
    secondary_keys: e.secondary||[],
    comment: e.name||'',
    name: e.name||'',
    content: kind==='realm'?wbRealmText(e):(kind==='event'?wbEventText(e):String(e.content||'')),
    constant: !!e.constant,
    selective: !!e.selective,
    selectiveLogic: Number(e.selectiveLogic)||0,
    addMemo: e.addMemo!==false,
    order: Number(e.order)||0,
    insertion_order: Number(e.order)||0,
    position: Number(e.position)||0,
    depth: Number(e.depth)||4,
    role: Number(e.role)||0,
    disable: e.enabled===false,
    probability: Number(e.probability)||100,
    useProbability: e.useProbability!==false,
    caseSensitive: !!e.caseSensitive,
    matchWholeWords: !!e.matchWholeWords,
    scanDepth: e.scanDepth==null?null:Number(e.scanDepth),
    vectorized: !!e.vectorized,
    group: e.group||'',
    groupWeight: Number(e.groupWeight)||100,
    groupOverride: !!e.groupOverride,
    sticky: Number(e.sticky)||0,
    cooldown: Number(e.cooldown)||0,
    delay: Number(e.delay)||0,
    excludeRecursion: !!e.excludeRecursion,
    preventRecursion: !!e.preventRecursion,
    delayUntilRecursion: !!e.delayUntilRecursion,
    displayIndex: di,
    linkedChar: linked||undefined,
    extensions: Object.assign({},(e._raw&&e._raw.extensions)||{},{moYan:meta})
  });
}
function wbExportList(){
  const L=ensureLore(), list=[];
  L.w.forEach(e=>list.push({e,kind:'w',block:e.block||'world',cat:e.cat||''}));
  if(L.pw.on){
    L.pw.branches.forEach(e=>list.push({e,kind:'branch',block:'power',cat:'branch'}));
    L.pw.realms.forEach(e=>list.push({e,kind:'realm',block:'power',cat:'realm',constant:true}));
  }
  L.hi.events.forEach(e=>list.push({e,kind:'event',block:'history',cat:'event',constant:true}));
  return list;
}
function worldToST(){
  const L=ensureLore(), entries={}, list=wbExportList();
  list.forEach((it,i)=>{
    const e=Object.assign({},it.e);
    e.block=it.block; e.cat=it.cat;
    if(it.constant&&!e.constant) e.constant=true;
    entries[String(i)]=wbStEntry(e,it.kind,i);
  });
  if((L.pw.general||'').trim()){
    const i=list.length;
    entries[String(i)]=wbStEntry({id:'pw-general',block:'power',cat:'general',name:'基础力量总纲',
      content:L.pw.general,note:L.pw.gnote||'',keys:[],secondary:[],constant:true,enabled:true,
      order:120,position:0,depth:4,role:0,probability:100,useProbability:true,
      group:'',groupWeight:100,sticky:0,cooldown:0,delay:0},'branch',i);
  }
  return {entries, originalData:{name:state.meta.title||'未命名',source:'DreamWeaver · 幻梦织者'}};
}

/* ---------------- 世界书导入（并入四大块） ---------------- */
function wbClassifyName(name,content){
  try{
    const g=loreGuessCat(name,content);
    return {block:g.block,cat:g.cat,conf:g.conf||'low',why:g.why||''};
  }catch(e){ return {block:'world',cat:'era',conf:'low',why:'分类失败'}; }
}
function wbImport(list,opts){
  opts=opts||{};
  const L=ensureLore();
  const same=(a,b)=>String(a||'').trim()===String(b||'').trim();
  let nw=0,np=0,nh=0,skip=0,restored=0;
  const conf={high:0,mid:0,low:0,restored:0};
  const dist={};                                     // 'block|cat' → 条数
  const lows=[];                                     // 低置信度条目，供复核
  const bump=(block,cat)=>{ const k=block+'|'+(cat||''); dist[k]=(dist[k]||0)+1; };
  list.forEach((raw,i)=>{
    const e=wbEntry(raw,{di:i,auto:opts.auto!==false});
    const meta=wbMetaOf(raw);
    const kindBlock = meta.block;
    /* 先算一次自动分类（不管最终进哪块，把依据记下来） */
    const g = wbClassifyName(e.name, e.content);
    const mark=(obj,isRestored)=>{
      obj._conf = isRestored?'restored':g.conf;
      obj._why  = isRestored?'来自本工具导出的文件，原样还原':g.why;
      obj._score= g.score||0;
      return obj;
    };
    const note=(isRestored)=>{ if(isRestored){ conf.restored++; } else { conf[g.conf]=(conf[g.conf]||0)+1; if(g.conf!=='high') lows.push({name:e.name,block:g.block,cat:g.cat,conf:g.conf,why:g.why,score:g.score}); } };
    /* 由本工具导出过的文件 → 原样还原回对应的结构 */
    if(kindBlock==='power'&&(e.cat==='realm'||e.cat==='branch')){
      if(e.cat==='realm'){
        if(L.pw.realms.some(x=>same(x.name,e.name))){ skip++; return; }
        const rr=mark(Object.assign({id:uid(),name:e.name,cap:'',feat:e.content,cond:'',weak:'',note:e.note||'',enabled:e.enabled},e.realm||{}),true);
        L.pw.realms.push(rr); np++; restored++; bump('power','realm'); note(true); return;
      }
      if(L.pw.branches.some(x=>same(x.name,e.name))){ skip++; return; }
      L.pw.branches.push(mark(Object.assign({id:uid(),name:e.name,content:e.content,note:e.note||'',enabled:e.enabled},e),true));
      np++; restored++; bump('power','branch'); note(true); return;
    }
    if(kindBlock==='history'&&e.cat==='event'){
      if(L.hi.events.some(x=>same(x.name,e.name))){ skip++; return; }
      L.hi.events.push(mark(Object.assign({id:uid(),name:e.name,time:(e.event&&e.event.time)||'',desc:e.content,
        effect:(e.event&&e.event.effect)||'',note:e.note||'',real:!!e.real,enabled:e.enabled},e),true));
      nh++; restored++; bump('history','event'); note(true); return;
    }
    if(kindBlock==='power'&&e.cat==='general'){
      L.pw.general=(L.pw.general?L.pw.general+'\n':'')+(e.name?('◆ '+e.name+'\n'):'')+e.content; np++; restored++; bump('power','general'); note(true); return;
    }
    if(kindBlock==='global'){
      L.gl.extra=(L.gl.extra?L.gl.extra+'\n':'')+(e.name?('◆ '+e.name+'\n'):'')+e.content; np++; restored++; bump('global','rule'); note(true); return;
    }
    /* 普通世界书条目：先归类，再查重 */
    let block=e.block, cat=e.cat;
    if(!kindBlock){ block=g.block; cat=g.cat; }
    if(block==='power'){
      if(cat==='branch'){ if(L.pw.branches.some(x=>same(x.name,e.name))){ skip++; return; } L.pw.branches.push(mark(Object.assign({id:uid(),name:e.name,content:e.content,note:e.note||'',enabled:e.enabled},e))); np++; bump('power','branch'); note(); return; }
      if(cat==='realm'){ if(L.pw.realms.some(x=>same(x.name,e.name))){ skip++; return; } L.pw.realms.push(mark(Object.assign({id:uid(),name:e.name,cap:'',feat:e.content,cond:'',weak:'',note:e.note||'',enabled:e.enabled},e))); np++; bump('power','realm'); note(); return; }
      if(cat==='general'){ L.pw.general=(L.pw.general?L.pw.general+'\n':'')+(e.name?('◆ '+e.name+'\n'):'')+e.content; np++; bump('power','general'); note(); return; }
    }
    if(block==='history'){
      if(cat==='calendar'){ L.hi.cal=(L.hi.cal?L.hi.cal+'\n':'')+(e.name?('◆ '+e.name+'\n'):'')+e.content; nh++; bump('history','calendar'); note(); return; }
      if(L.hi.events.some(x=>same(x.name,e.name))){ skip++; return; }
      L.hi.events.push(mark(Object.assign({id:uid(),name:e.name,time:'',desc:e.content,effect:'',note:e.note||'',real:!!e.real,enabled:e.enabled},e))); nh++; bump('history','event'); note(); return;
    }
    if(block==='global'){ L.gl.extra=(L.gl.extra?L.gl.extra+'\n':'')+(e.name?('◆ '+e.name+'\n'):'')+e.content; np++; bump('global','rule'); note(); return; }
    /* 世界观大类：同名不覆盖 */
    if(L.w.some(x=>same(x.name,e.name))){ skip++; return; }
    if(!L.cats.some(c=>c.id===cat)) cat=(L.cats.find(c=>c.name===cat)||L.cats[0]||{}).id;
    L.w.push(mark(Object.assign({},e,{block:'world',cat:cat})));
    nw++; bump('world',cat); note();
  });
  save();
  return {nw,np,nh,skip,restored,all:list.length,conf,dist,lows};
}

/* ---------------- 导入报告（分类分布 + 低置信度复核） ---------------- */
function wbReport(res){
  if(!res) return;
  const rows=Object.keys(res.dist).sort((a,b)=>res.dist[b]-res.dist[a]).map(k=>{
    const [b,c]=k.split('|');
    const n=res.dist[k];
    const bar=Math.max(2,Math.round(n/Math.max(1,res.all)*100));
    return '<div class="wbrep-row"><span class="wbrep-n">'+esc(loreCatLabel(b,c))+'</span>'
      +'<span class="wbrep-bar"><i style="width:'+bar+'"></i></span>'
      +'<span class="wbrep-c">'+n+' 条</span></div>';
  }).join('');
  const lowN=res.lows.length;
  const lowRows = lowN? res.lows.slice(0,20).map(x=>'<div class="hint" style="margin:2px 0">· '+esc(x.name||'未命名')
      +'　<span style="opacity:.85">→ '+esc(loreCatLabel(x.block,x.cat))+'（'+esc(x.why||'')+'）</span></div>').join('')
    : '';
  openDlg('<h3>导入完成 · 自动分类结果</h3>'
    +'<div class="hint">共 '+res.all+' 条：世界观 '+res.nw+' · 力量体系 '+res.np+' · 历史年表 '+res.nh
    +(res.skip?(' · 跳过重复 '+res.skip):'')+(res.restored?(' · 原样还原 '+res.restored):'')+'</div>'
    +'<div class="hint" style="margin-top:6px">'
      +'高可信 <b>'+res.conf.high+'</b> 条 ｜ 中 <b>'+res.conf.mid+'</b> 条 ｜ 待确认 <b class="'+(lowN?'':'')+'">'+res.conf.low+'</b> 条'
    +'</div>'
    +'<h3 style="margin-top:14px;font-size:14px">分类分布</h3>'
    +'<div class="wbrep">'+(rows||'<div class="hint">无</div>')+'</div>'
    +(lowN?('<h3 style="margin-top:14px;font-size:14px">⚠ 待确认的 '+lowN+' 条（显示前 20）</h3>'+lowRows):'')
    +'<div class="hint" style="margin-top:12px">分类由「标题提示 + 特征词典 + 语义句式」三层判定：标题里带【地理】/「境界·∨」这类提示的会直接锁定。'
    +'待确认的通常只有名字看不出主题（如「天枢阁」），可以交给 AI 复核——只会发待确认的那几条，省 token。</div>'
    +(res.np+res.nh?('<div class="warnbox" style="margin-top:10px">注意：归入「力量体系」与「历史年表」的条目会作为<b>固定上下文</b>，每章都注入（不再依赖关键词）。'
      +'如果不希望它们常驻，在预览里把归入模块改回「世界观大类」，条目会继续按原来的关键词触发。</div>'):''),
    [{label:'知道了'},
     {label:'查看 / 修改分类',fn:()=>{ setTimeout(()=>loreClassifyFlow(),80); return true; }},
     {label:'✦ AI 复核待确认条目',cls:'primary',fn:()=>{ setTimeout(()=>loreClassify('auto',true),80); return true; }}]);
}

/* ---------------- 导入 / 导出 入口 ---------------- */
/* ---------------- 导入进度弹窗（导入期间可见，完成自动关闭） ---------------- */
function wbProgSleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
/* 读文件文本：优先用 Blob.text()，旧浏览器回退 FileReader */
function wbReadText(f){
  if(f&&typeof f.text==='function'){ try{ return f.text(); }catch(e){ /* 回退 */ } }
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result);
    r.onerror=()=>rej(new Error('读取失败'));
    r.readAsText(f,'utf-8');
  });
}
function wbProgHTML(){
  return '<div class="item" style="padding:15px 17px">'
    +'<div style="font-weight:600;font-size:13.5px" id="wbProgHead">正在导入世界书…</div>'
    +'<div class="hint" style="margin:6px 0 0" id="wbProgStep">准备中…</div>'
    +'<div class="gauge" style="height:12px;margin:11px 0"><i id="wbProgBar" style="width:0%"></i></div>'
    +'<div id="wbProgStat" style="font-size:12.5px;line-height:1.9"></div>'
    +'<div class="hint" style="margin-top:11px">导入完成后本窗口会自动关闭，并显示分类结果。</div>'
    +'</div>';
}
function wbProgUpdate(done,total,cur,res,phase){
  const pct=Math.round(done/Math.max(1,total)*100);
  const bar=$('#wbProgBar'); if(bar) bar.style.width=pct+'%';
  const head=$('#wbProgHead'); if(head) head.textContent='正在导入世界书…（'+done+' / '+total+' 个文件）';
  const st=$('#wbProgStep');
  if(st) st.textContent = (phase? (phase+'：'+(cur||'')) : (done<total? ('下一个：'+(cur||'')) : '处理完成，正在刷新列表…'));
  const stat=$('#wbProgStat');
  if(stat) stat.innerHTML='已解析 <b>'+(res.all||0)+'</b> 条 ｜ 世界观 <b>'+(res.nw||0)+'</b> · 力量 <b>'
    +(res.np||0)+'</b> · 历史 <b>'+(res.nh||0)+'</b>'+(res.skip?(' ｜ 跳过重复 '+res.skip):'')
    +'<br>高可信 <b>'+(res.conf.high||0)+'</b> ｜ 中 '+(res.conf.mid||0)+' ｜ 待确认 '+(res.conf.low||0);
}
function wbImportFiles(files){
  const arr=[].slice.call(files||[]).filter(Boolean);
  if(!arr.length) return;
  const res={nw:0,np:0,nh:0,skip:0,restored:0,all:0,
    conf:{high:0,mid:0,low:0,restored:0},dist:{},lows:[]};
  const fails=[];
  /* 先关掉可能开着的弹窗（showModal 对已打开的弹窗会抛错），再开进度窗 */
  try{ const d0=$('#dlg'); if(d0&&d0.open) d0.close(); }catch(e){}
  try{ openDlg(wbProgHTML(),[{label:'后台导入'}]); }catch(e){ console.warn('进度窗打开失败',e); }
  wbProgUpdate(0,arr.length,arr[0].name,res,'读取中');
  (async()=>{
    for(let i=0;i<arr.length;i++){
      const f=arr[i];
      wbProgUpdate(i,arr.length,f.name,res,'读取中');
      await wbProgSleep(40);                       /* 先让进度条画出来再干活 */
      try{
        const txt=await wbReadText(f);
        wbProgUpdate(i,arr.length,f.name,res,'解析中');
        await wbProgSleep(20);
        const list=wbParse(txt);
        if(!list.length) throw new Error('没有解析到任何条目');
        wbProgUpdate(i,arr.length,f.name,res,'归类中');
        await wbProgSleep(20);
        const got=wbImport(list,{auto:true});
        res.all+=list.length;
        ['nw','np','nh','skip','restored'].forEach(k=>{ res[k]+=(got[k]||0); });
        ['high','mid','low','restored'].forEach(k=>{ res.conf[k]+=((got.conf&&got.conf[k])||0); });
        Object.keys(got.dist||{}).forEach(k=>{ res.dist[k]=(res.dist[k]||0)+(got.dist[k]||0); });
        (got.lows||[]).forEach(x=>res.lows.push(x));
      }catch(err){
        fails.push(f.name+'（'+((err&&err.message)||err)+'）');
      }
      wbProgUpdate(i+1,arr.length,f.name,res,'');
    }
    /* 收尾：落盘 + 刷新列表（单独 try，即使刷新出错也不能漏掉关闭弹窗） */
    try{ save(); renderLore(); }catch(e){ console.warn('导入后刷新出错',e); }
    wbProgUpdate(arr.length,arr.length,'',res,'导入完成');
    try{ const h=$('#wbProgHead'); if(h) h.textContent=(fails.length?'导入完成（部分文件失败）':'导入完成'); }catch(e){}
    await wbProgSleep(800);                        /* 让用户看到 100% 与统计结果 */
    try{ const d=$('#dlg'); if(d&&d.open) d.close(); }catch(e){}   /* 自动关闭 */
    if(!res.all){
      toast(fails.length?('导入失败：'+fails[0]):'没有解析到任何条目');
      if(fails.length) openDlg('<div class="warnbox">以下文件导入失败：<br>'+fails.map(esc).join('<br>')+'</div>');
      return;
    }
    toast('已导入 '+res.all+' 条：世界观 '+res.nw+' · 力量 '+res.np+' · 历史 '+res.nh+(res.skip?(' · 跳过重复 '+res.skip):''));
    if(fails.length) setTimeout(()=>toast('有 '+fails.length+' 个文件导入失败'),900);
    setTimeout(()=>wbReport(res),420);
  })();
}
function wbExport(){
  const L=ensureLore();
  const n=wbExportList().length+((L.pw.general||'').trim()?1:0);
  if(!n){ toast('还没有可导出的条目'); return; }
  download(dwFileName(state.meta.title||'world')+'.世界书.json', JSON.stringify(worldToST(),null,2),'application/json');
  toast('已导出 SillyTavern 世界书（'+n+' 条，含全部触发字段）');
}

/* ---------------- 命中测试 ---------------- */
function wbTestDialog(){
  const idx=state.current;
  const res=wbRun(idx);
  const groupsHTML = res.groups.length
    ? res.groups.map(g=>'<div class="hint" style="margin:3px 0">组「'+esc(g.name)+'」保留 <b>'+esc(g.winner)+'</b>，落选：'+g.losers.map(esc).join('、')+'</div>').join('')
    : '<div class="hint" style="margin:0">没有分组竞争。</div>';
  const inc=res.included.map(x=>{
    const e=x.e;
    const tags=[];
    if(e.constant) tags.push('<span class="badge on">常驻</span>');
    else tags.push('<span class="badge ok">触发</span>');
    tags.push('<span class="badge">'+esc(wbPosName(e.position))+'</span>');
    if(Number(e.role)!==0) tags.push('<span class="badge">'+esc(wbRoleName(e.role))+'</span>');
    if(e.group) tags.push('<span class="badge">组 '+esc(e.group)+'</span>');
    if(x.level) tags.push('<span class="badge warn">递归 L'+x.level+'</span>');
    if(e.vectorized) tags.push('<span class="badge">向量</span>');
    return '<div class="item" style="padding:8px 11px;margin-bottom:6px">'
      +'<div class="item-head" style="flex-wrap:wrap">'+tags.join(' ')
      +'<span class="nm">'+esc(e.name||'未命名')+'</span><div class="spacer"></div>'
      +'<span class="hint" style="margin:0">'+String(e.content||'').length+' 字 · order '+e.order+'</span></div>'
      +'<div class="hint" style="margin-top:5px">'+esc(x.why)+'</div></div>';
  }).join('')||'<div class="hint">本章没有任何世界书条目被触发。</div>';
  const sk=res.skipped.slice(0,60).map(x=>'<div class="hint" style="margin:2px 0">· '+esc(x.e.name||'未命名')
    +'　<span style="opacity:.8">'+esc(x.why)+'</span></div>').join('')||'<div class="hint">无</div>';
  const dp=res.dropped.length
    ? '<div class="warnbox">因超出世界书预算（'+res.budget+' 字）未注入：'
      +res.dropped.map(x=>esc(x.e.name)).join('、')+'。可调高上限或停用部分条目。</div>'
    : '';
  openDlg('<h3>🔍 世界书命中测试 · 第 '+(idx+1)+' 章</h3>'
    +'<div class="hint">扫描文本 '+res.scanLen.toLocaleString()+' 字 ｜ 候选条目 '+res.pool+' 条（常驻 '+res.constants
    +'）｜ 实际注入 '+res.included.length+' 条 / '+res.used.toLocaleString()+' 字（上限 '+res.budget.toLocaleString()
    +'）｜ 递归深度 '+res.levels+'</div>'
    +'<h3 style="margin-top:14px;font-size:14px">✅ 将被注入（'+res.included.length+' 条）</h3>'+inc+dp
    +'<h3 style="margin-top:14px;font-size:14px">🔀 分组竞争</h3>'+groupsHTML
    +'<h3 style="margin-top:14px;font-size:14px">⛔ 未被触发（'+res.skipped.length+' 条，显示前 60）</h3>'+sk,
    [{label:'关闭'}]);
}
