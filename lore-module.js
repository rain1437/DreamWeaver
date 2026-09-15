/* =========================================================
   世界观设定库（四大块 · 条目化 · 固定上下文注入）
   ---------------------------------------------------------
   ① 世界观大类设定：14 个内置分类 + 自定义分类，每条独立保存
   ② 力量体系：基础总纲 / 修炼分支（可多条）/ 境界词条库（可拖拽排序）
   ③ 历史年表：事件条目 + 时间轴 + 自定义纪年
   ④ 全局约束：真实 / 幻想标记 + 全局总提示词（优先级最高）
   所有「启用」的条目在生成章节时拼进 System Prompt，保证设定统一不崩。
   ========================================================= */
const LORE_DEF=[
  {id:'origin',   name:'世界起源',    hint:'世界诞生、创世神话、天地本源、世界形态（星球 / 位面 / 界域）'},
  {id:'era',      name:'时代背景',    hint:'故事所处时代、文明整体发展阶段'},
  {id:'geo',      name:'地理疆域',    hint:'大陆、海洋、国家、城邦、秘境、地形分布'},
  {id:'climate',  name:'气候环境',    hint:'季节、特殊天象、环境异象'},
  {id:'politics', name:'政治制度',    hint:'国家政体、权力结构、阶层划分'},
  {id:'military', name:'军事',        hint:'兵种、军备、战争规则、势力兵力'},
  {id:'economy',  name:'经济',        hint:'货币、物产、商贸、资源分布'},
  {id:'tech',     name:'科技/生产力', hint:'工业、造物技术、器械水平'},
  {id:'culture',  name:'文化思想',    hint:'习俗、艺术、价值观、人文风气'},
  {id:'religion', name:'宗教信仰',    hint:'神明、教派、祭祀、信仰体系'},
  {id:'race',     name:'民族族群',    hint:'不同种族、血脉特征、族群矛盾'},
  {id:'lang',     name:'语言称谓',    hint:'通用语、专有称呼、敬语'},
  {id:'daily',    name:'日常生活',    hint:'衣食住行、平民日常习惯'},
  {id:'super',    name:'超自然规则',  hint:'魔力 / 灵气本源、异类生物的基础规则'}
];
const LORE_BLK_NAME={world:'世界观大类',power:'力量体系',history:'历史时间线',global:'全局约束'};
const LORE_AI_SYS='你是一位资深小说设定集编辑。你直接输出可用的成品设定文本，不解释、不客套、不加 markdown 标题标记。所有产出必须与作者已有设定相容，不得引入矛盾的新设定，不得创造与既有专有名词冲突的名称。';
const LORE_AI_TASK={
  expand:'扩写：保留原有全部信息与设定倾向，把内容写得更具体、更可执行——补上机制细节、限制条件、代价与后果，并给出一两个具体示例。长度约为原文的 1.6-2 倍。',
  polish:'润色：原意与信息量完全不变，只把语言改得更准确、凝练、有条理，删掉空话、重复与含糊表述。长度与原文相当。',
  rewrite:'重写：换一个角度重新组织同一份设定，信息量不少于原文，措辞与结构都要明显不同，但不得改变任何既定事实。'
};
const LORE_MODE_NAME={expand:'扩写',polish:'润色',rewrite:'重写'};

function blankLore(){
  return {
    on:true, budget:8000, wbudget:6000, recursion:2,
    cats: LORE_DEF.map(c=>Object.assign({builtin:true},c)),
    w:[],
    pw:{on:true, general:'', gnote:'', branches:[], realms:[]},
    hi:{cal:'', eras:[], events:[]},
    gl:{master:'', extra:''}
  };
}
/* 兼容旧数据 / 缺字段：任何入口都先过一遍这里 */
function ensureLore(){
  if(!state.lore||typeof state.lore!=='object'||Array.isArray(state.lore)) state.lore=blankLore();
  const L=state.lore, B=blankLore();
  if(L.on==null) L.on=true;
  if(!(Number(L.budget)>0)) L.budget=8000;
  if(!(Number(L.wbudget)>0)) L.wbudget=6000;
  if(L.recursion==null) L.recursion=2;
  if(!Array.isArray(L.cats)||!L.cats.length) L.cats=B.cats;
  else L.cats.forEach(c=>{ if(c.builtin==null) c.builtin=false; if(!c.id) c.id='c'+uid(); if(!c.hint) c.hint=''; });
  if(!Array.isArray(L.w)) L.w=[];
  L.w.forEach(e=>{
    wbFix(e);
    if(e.real==null) e.real=false;
    if(typeof e.content!=='string') e.content='';
    if(typeof e.note!=='string') e.note='';
    if(!e.cat||!L.cats.some(c=>c.id===e.cat)) e.cat=(L.cats[0]||{}).id;
  });
  if(!L.pw||typeof L.pw!=='object') L.pw=B.pw;
  if(L.pw.on==null) L.pw.on=true;
  if(typeof L.pw.general!=='string') L.pw.general='';
  if(typeof L.pw.gnote!=='string') L.pw.gnote='';
  if(!Array.isArray(L.pw.branches)) L.pw.branches=[];
  L.pw.branches.forEach(b=>{ wbFix(b); if(b.enabled==null) b.enabled=true; if(typeof b.content!=='string') b.content=''; if(typeof b.note!=='string') b.note=''; });
  if(!Array.isArray(L.pw.realms)) L.pw.realms=[];
  L.pw.realms.forEach(r=>{
    if(!r.id) r.id=uid(); if(r.enabled==null) r.enabled=true;
    ['name','cap','feat','cond','weak','note'].forEach(k=>{ if(typeof r[k]!=='string') r[k]=''; });
  });
  if(!L.hi||typeof L.hi!=='object') L.hi=B.hi;
  if(typeof L.hi.cal!=='string') L.hi.cal='';
  if(!Array.isArray(L.hi.eras)) L.hi.eras=[];
  if(!Array.isArray(L.hi.events)) L.hi.events=[];
  L.hi.events.forEach(e=>{
    wbFix(e); if(e.real==null) e.real=false;
    ['time','desc','effect'].forEach(k=>{ if(typeof e[k]!=='string') e[k]=''; });
  });
  if(!L.gl||typeof L.gl!=='object') L.gl=B.gl;
  if(typeof L.gl.master!=='string') L.gl.master='';
  if(typeof L.gl.extra!=='string') L.gl.extra='';
  return L;
}
function loreGet(scope,id){
  const L=ensureLore();
  if(scope==='w') return L.w.find(x=>x.id===id);
  if(scope==='branch') return L.pw.branches.find(x=>x.id===id);
  if(scope==='realm') return L.pw.realms.find(x=>x.id===id);
  if(scope==='ev') return L.hi.events.find(x=>x.id===id);
  return null;
}
function loreHasContent(o,scope){
  if(scope==='realm') return !!(String(o.name||'').trim()||String(o.feat||'').trim()||String(o.cap||'').trim());
  if(scope==='ev') return !!String(o.desc||'').trim();
  return !!String(o.content||'').trim();
}

/* ---------------- 统计 ---------------- */
function loreCount(){
  const L=ensureLore();
  const w=L.w.filter(e=>e.enabled&&loreHasContent(e,'w')).length;
  const pw=L.pw.on ? ((L.pw.general||'').trim()?1:0)
      + L.pw.branches.filter(b=>b.enabled&&loreHasContent(b,'branch')).length
      + L.pw.realms.filter(r=>r.enabled&&loreHasContent(r,'realm')).length : 0;
  const hi=L.hi.events.filter(e=>e.enabled&&loreHasContent(e,'ev')).length + ((L.hi.cal||'').trim()?1:0);
  const gl=((L.gl.master||'').trim()?1:0)+((L.gl.extra||'').trim()?1:0);
  return {w,pw,hi,gl};
}

/* ---------------- 拼接 System Prompt ---------------- */
let _loreLast={used:0,budget:0,kept:[],dropped:[],text:'',cut:false};
function loreMarks(){
  const L=ensureLore(), realN=[], fakeN=[];
  L.w.forEach(e=>{ if(!e.enabled||!loreHasContent(e,'w')) return; (e.real?realN:fakeN).push(e.name||'未命名'); });
  L.hi.events.forEach(e=>{ if(!e.enabled||!loreHasContent(e,'ev')) return; (e.real?realN:fakeN).push(e.name||'历史事件'); });
  return {realN,fakeN};
}
function loreOneLine(s){ return String(s||'').trim().replace(/\s*\n\s*/g,' '); }
function loreSections(){
  const L=ensureLore(), secs=[];
  if(!L.on) return secs;
  /* ④ 全局总提示词：永远注入，优先级高于一切设定 */
  if((L.gl.master||'').trim()){
    secs.push({key:'master',title:'全局总提示词',lock:true,
      text:'【全局总提示词 · 最高优先级｜高于一切设定条目与角色卡，任何情况下都不得违背】\n'+L.gl.master.trim()});
  }
  /* ④ 全局约束：真实/幻想标记 + 补充规则 */
  let cons='';
  if((L.gl.extra||'').trim()) cons+='【补充规则】\n'+L.gl.extra.trim()+'\n';
  const mk=loreMarks();
  if(mk.realN.length||mk.fakeN.length){
    cons+='【真实 / 幻想标记 · 必须遵守】\n';
    if(mk.realN.length) cons+='· 标记为「参考现实」的设定：'+mk.realN.join('、')
      +'\n  → 可按现实世界的物理、常识与社会规律书写，但不得直接搬用真实历史事件、真实人物与真实地名。\n';
    if(mk.fakeN.length) cons+='· 标记为「完全架空」的设定：'+mk.fakeN.join('、')
      +'\n  → 只能使用已给出的架空设定，严禁用现实常识、真实历史或真实地理去替换、补充或“纠正”它们。\n';
  }
  if(cons.trim()) secs.push({key:'gl',title:'全局约束',text:'【全局约束 · 优先级仅次于全局总提示词】\n'+cons.trim()});
  /* ① 世界观大类设定：改由世界书引擎按触发规则注入（见 wbRun） */
  /* ② 力量体系 */
  if(L.pw.on){
    const parts=[];
    if((L.pw.general||'').trim()){
      parts.push('■ 基础力量总纲：'+loreOneLine(L.pw.general));
      if((L.pw.gnote||'').trim()) parts.push('   ↳【解读限制】'+loreOneLine(L.pw.gnote));
    }
    const brs=L.pw.branches.filter(b=>b.enabled&&loreHasContent(b,'branch'));
    if(brs.length){
      parts.push('■ 修炼 / 能力分支（各自独立，不得互相混淆、不得跨体系套用）：');
      brs.forEach(b=>{
        parts.push(' · '+(b.name||'未命名分支')+'：'+loreOneLine(b.content));
        if((b.note||'').trim()) parts.push('   ↳【解读限制】'+loreOneLine(b.note));
      });
    }
    const rzs=L.pw.realms.filter(r=>r.enabled&&loreHasContent(r,'realm'));
    if(rzs.length){
      parts.push('■ 境界阶梯（由低到高，顺序不可颠倒；角色实力必须落在其境界的能力上限之内）：');
      rzs.forEach((r,i)=>{
        const seg=[(i+1)+'. '+(r.name||'未命名境界')];
        if((r.cap||'').trim()) seg.push('能力上限：'+loreOneLine(r.cap));
        if((r.feat||'').trim()) seg.push('特征：'+loreOneLine(r.feat));
        if((r.cond||'').trim()) seg.push('晋升条件：'+loreOneLine(r.cond));
        if((r.weak||'').trim()) seg.push('弱点：'+loreOneLine(r.weak));
        parts.push(' '+seg.join('｜'));
        if((r.note||'').trim()) parts.push('   ↳【解读限制】'+loreOneLine(r.note));
      });
    }
    if(parts.length) secs.push({key:'power',title:'力量 / 修炼体系',text:'【力量 / 修炼体系】\n'+parts.join('\n')});
  }
  /* ③ 历史年表 */
  const evs=L.hi.events.filter(e=>e.enabled&&loreHasContent(e,'ev'));
  if(evs.length||(L.hi.cal||'').trim()){
    let out='【历史年表 · 既成事实，不得改写；新情节必须与之兼容】';
    if((L.hi.cal||'').trim()) out+='\n◆ 本世界纪年与历法：'+loreOneLine(L.hi.cal);
    if(evs.length){
      out+='\n◆ 大事年表（按时间先后）：';
      evs.forEach(e=>{
        out+='\n· '+(e.time||'时间未定')+'　'+(e.name||'未命名事件')+'：'+loreOneLine(e.desc);
        if((e.effect||'').trim()) out+='　→长远影响：'+loreOneLine(e.effect);
        if((e.note||'').trim()) out+='\n   ↳【解读限制】'+loreOneLine(e.note);
      });
    }
    secs.push({key:'history',title:'历史时间线',text:out});
  }
  return secs;
}
/* 按预算裁剪：全局总提示词永不丢弃，其余超出上限的整块略过并如实告知 */
function loreSystemBlock(){
  const L=ensureLore();
  const secs=loreSections();
  const budget=Math.max(600,Number(L.budget)||8000);
  let used=0; const kept=[], dropped=[];
  secs.forEach(sc=>{
    const len=sc.text.length;
    if(sc.lock){ kept.push(sc); used+=len; return; }   // 全局总提示词永不丢弃
    if(used+len<=budget){ kept.push(sc); used+=len; return; }
    if(!kept.length&&len>budget){                        // 第一块就超限：截断但保留
      kept.push(Object.assign({},sc,{text:sc.text.slice(0,budget)+'\n…（因超出注入上限，本块已被截断）',cut:true}));
      used=budget; return;
    }
    dropped.push(sc);
  });
  /* 世界书条目：交给全功能引擎（常驻 / 关键词 / 递归 / 分组 / 粘滞冷却 …） */
  let wb=null;
  try{ wb=wbRun(state.current,{commit:!!loreCommitNext}); }
  catch(e){ console.warn('世界书引擎出错',e); }
  if(loreCommitNext) loreCommitNext=false;
  const wbSys = (wb&&wb.sys)?wb.sys:'';
  const text=kept.map(x=>x.text).join('\n\n')+wbSys;
  _loreLast={used:used+wbSys.length, blockUsed:used, wbUsed:(wb?wb.used:0),
    budget, wbudget:(wb?wb.budget:0),
    kept:kept.map(x=>x.title).concat(wb?wb.included.map(x=>'世界书·'+x.e.name):[]),
    dropped:dropped.map(x=>x.title).concat(wb?wb.dropped.map(x=>'世界书·'+x.e.name):[]),
    cut:kept.some(x=>x.cut), text, wb};
  return text;
}
let loreCommitNext=false;   // 下一太真实生成时提交命中记录（用于粘滞 / 冷却）

/* ---------------- 渲染 ---------------- */
let loreTab='world';
let _loreOpen=new Set();
function loreOpenKey(scope,id){ return scope+':'+id; }
function loreCountN(){
  const c=loreCount();
  const set=(sel,v)=>{ const el=$(sel); if(el) el.textContent=v?('('+v+')'):''; };
  set('#nLoreW',c.w); set('#nLoreP',c.pw); set('#nLoreH',c.hi); set('#nLoreG',c.gl);
  const tot=c.w+c.pw+c.hi+c.gl;
  const tab=$('#nLore'); if(tab) tab.textContent=tot?('('+tot+')'):'';
}
function loreBarHTML(){ return '<div class="lorebar" id="loreBar"></div>'; }
function updateLoreBar(){
  const el=$('#loreBar'); if(!el) return;
  const L=ensureLore();
  try{ loreSystemBlock(); }catch(e){ console.warn(e); }
  if(!L.on){
    el.innerHTML='<span class="hint">设定库已关闭：当前不会向 AI 注入任何世界观设定。</span>';
    return;
  }
  const pct=Math.min(100,Math.round(_loreLast.used/Math.max(1,_loreLast.budget+(_loreLast.wbudget||0))*100));
  const wb=_loreLast.wb;
  el.innerHTML='<span class="hint">固定上下文 <b>'+(_loreLast.blockUsed||0).toLocaleString()+'</b>/'+_loreLast.budget.toLocaleString()+' 字'
    +'　·　世界书 <b>'+(_loreLast.wbUsed||0).toLocaleString()+'</b>/'+(_loreLast.wbudget||0).toLocaleString()+' 字'
    +(wb?('（注入 '+wb.included.length+' 条 / 共 '+wb.pool+' 条）'):'')+'</span>'
    +'<div class="gauge'+(pct>=85?' hot':'')+'"><i style="width:'+pct+'"></i></div>'
    +'<button class="btn xs" data-act="wbtest">🔍 命中测试</button>'
    +'<button class="btn xs" data-act="preview">注入预览</button>'
    +'<button class="btn xs ghost" data-act="budget">⚙ 上限</button>'
    +(_loreLast.dropped.length?('<span class="badge warn">'+_loreLast.dropped.length+' 条因超限未注入</span>'):'');
}
function loreToolbarWorld(){
  return '<div class="card" style="margin-bottom:12px">'
    +'<div class="toolbar">'
    +'<button class="btn sm primary" data-act="wbimport">⇧ 导入世界书</button>'
    +'<button class="btn sm" data-act="wbexport">⇩ 导出为世界书</button>'
    +'<button class="btn sm" data-act="wbtest">🔍 命中测试</button>'
    +'<div class="spacer"></div>'
    +'<input type="text" id="loreSearch" placeholder="搜索条目 / 内容…" style="max-width:200px">'
    +'</div>'
    +'<div class="toolbar" style="margin-top:8px">'
    +'<button class="btn sm" data-act="classify">✦ 智能细分</button>'
    +'<button class="btn sm" data-act="cadd">＋ 新建分类</button>'
    +'<button class="btn sm ghost" data-act="gall">展开 / 收起</button>'
    +'<div class="spacer"></div><span class="hint" style="margin:0" id="loreWCnt"></span>'
    +'</div>'
    +'<div class="hint" style="margin-top:8px">'
    +'<b>完全兼容 SillyTavern 世界书</b>：可以直接导入 <code>world_info</code> / <code>entries</code> / 角色卡内嵌世界书，'
    +'关键词、次要关键词逻辑、常驻、概率、分组竞争、粘滞 / 冷却 / 延迟、扫描深度、位置与深度、递归扫描、向量条目全部保留；'
    +'导出可原样回到 SillyTavern（结构在本工具内通过 <code>extensions.moYan</code> 无损保存）。<br>'
    +'导入的条目会按内容自动归入下面的分类，点每条旁边的 <b>⚙ 触发设置</b> 可调全部触发参数。</div>'
    +'</div>';
}
function loreConfBadge(o){
  const c=o&&o._conf;
  if(!c) return '';
  const t=(o._why||'').replace(/"/g,'');
  if(c==='high')   return '<span class="badge ok" title="'+esc(t)+'">自动归类·高可信</span>';
  if(c==='mid')    return '<span class="badge" title="'+esc(t)+'">自动归类·中</span>';
  if(c==='low')    return '<span class="badge warn" title="'+esc(t)+'">待确认分类</span>';
  if(c==='ai')     return '<span class="badge ok" title="'+esc(t)+'">AI 判定</span>';
  if(c==='manual') return '';
  if(c==='restored') return '';
  return '';
}
function loreEntryHTML(scope,o){
  const off=o.enabled===false, open=_loreOpen.has(loreOpenKey(scope,o.id));
  return '<div class="lentry'+(open?' open':'')+(off?' off':'')+'" data-scope="'+scope+'" data-id="'+o.id+'">'
    +'<div class="lhead" data-act="open"><span class="caret">▶</span>'
    +'<span class="nm">'+esc(o.name||'未命名条目')+'</span>'
    +(o.real?'<span class="tag-real">参考现实</span>':'<span class="tag-fake">完全架空</span>')
    +loreConfBadge(o)
    +(off?'<span class="badge warn">停用</span>':'')
    +'<span class="spacer"></span><span class="hint" style="margin:0">'+String(o.content||'').length+' 字</span></div>'
    +'<div class="lbody">'
    +'<div class="row"><div><label style="margin-top:0">条目名称</label>'
    +'<input type="text" data-f="name" value="'+esc(o.name||'')+'" placeholder="例：北境三国鼎立"></div></div>'
    +'<label>设定内容</label>'
    +'<textarea data-f="content" style="min-height:130px" placeholder="写清这条设定的具体规则、表现与边界。越具体，AI 越不容易写崩。">'+esc(o.content||'')+'</textarea>'
    +'<label>备注区（给 AI 的额外提示，限定它如何解读本条设定）</label>'
    +'<textarea data-f="note" style="min-height:64px" placeholder="例：本条中的「灵脉」只是能量通道，不等于生物血脉；人物无法直接“看见”灵脉。">'+esc(o.note||'')+'</textarea>'
    +'<div class="toolbar" style="margin-top:10px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="real"'+(o.real?' checked':'')+'> 参考现实</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="enabled"'+(off?'':' checked')+'> 启用</label>'
    +'<span class="spacer"></span>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="polish">✎ 润色</button>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="rewrite">↻ 重写</button>'
    +'<button class="btn xs ghost" data-act="dupe">⧉ 复制</button>'
    +'<button class="btn xs ghost danger" data-act="del">删除</button>'
    +'</div>'
    +(scope==='w'?wbFieldsHTML(o):'')
    +'</div></div>';
}
function htmlLoreWorld(){
  const L=ensureLore();
  const groups=L.cats.map(cat=>{
    const all=L.w.filter(e=>e.cat===cat.id);
    return '<div class="lgroup" data-cat="'+cat.id+'">'
      +'<div class="lghead" data-act="gopen"><span class="caret">▶</span>'
      +'<span class="nm">'+esc(cat.name)+'</span>'
      +(all.length?('<span class="badge on">'+all.length+' 条</span>'):'<span class="badge">空</span>')
      +'<span class="spacer"></span>'
      +'<button class="btn xs ghost" data-act="eadd" data-cat="'+cat.id+'">＋ 条目</button>'
      +'<button class="btn xs ghost" data-act="cai" data-cat="'+cat.id+'">✦ 整类补全</button>'
      +'<button class="btn xs ghost" data-act="cmenu" data-cat="'+cat.id+'">⋯</button>'
      +'</div>'
      +'<div class="lgbody">'
      +'<div class="lhint">'+esc(cat.hint||'自定义分类')+'</div>'
      +(all.map(e=>loreEntryHTML('w',e)).join('')||'<div class="hint" style="margin:0">这一类还没有条目。</div>')
      +'</div></div>';
  }).join('');
  const total=L.w.length;
  return loreToolbarWorld()+loreBarHTML()
    +'<div class="card"><div id="loreGroups">'+groups
    +(total?'':'<div class="hint" style="margin-top:10px">💡 提示：也可以先到「③ 世界书」导入 SillyTavern 世界书 JSON，再回到这里点「✦ 智能细分」。</div>')
    +'</div></div>';
}
function loreRealmHTML(r,i){
  const off=r.enabled===false, open=_loreOpen.has(loreOpenKey('realm',r.id));
  return '<div class="lrow'+(off?' off':'')+(open?' open':'')+'" data-scope="realm" data-id="'+r.id+'">'
    +'<div class="lrow-top"><span class="drag" draggable="true" title="按住拖动排序">⠿</span>'
    +'<span class="idx">'+(i+1)+'</span>'
    +'<span class="nm">'+esc(r.name||'未命名境界')+'</span>'
    +loreConfBadge(r)
    +(off?'<span class="badge warn">停用</span>':'')
    +'<span class="spacer"></span>'
    +'<button class="btn xs ghost" data-act="rmove" data-dir="-1" title="上移">↑</button>'
    +'<button class="btn xs ghost" data-act="rmove" data-dir="1" title="下移">↓</button>'
    +'<button class="btn xs ghost" data-act="open">编辑</button>'
    +'</div>'
    +'<div class="fields">'
    +'<div class="lgrid">'
    +'<div><label style="margin-top:0">境界名称</label><input type="text" data-f="name" value="'+esc(r.name||'')+'"></div>'
    +'<div><label style="margin-top:0">能力上限</label><input type="text" data-f="cap" value="'+esc(r.cap||'')+'" placeholder="例：可操控百米内灵气"></div>'
    +'</div>'
    +'<label>境界特征</label><textarea data-f="feat" style="min-height:72px">'+esc(r.feat||'')+'</textarea>'
    +'<div class="lgrid">'
    +'<div><label style="margin-top:0">晋升条件</label><textarea data-f="cond" style="min-height:60px">'+esc(r.cond||'')+'</textarea></div>'
    +'<div><label style="margin-top:0">弱点 / 副作用</label><textarea data-f="weak" style="min-height:60px">'+esc(r.weak||'')+'</textarea></div>'
    +'</div>'
    +'<label>备注区（给 AI 的解读限制）</label><textarea data-f="note" style="min-height:52px">'+esc(r.note||'')+'</textarea>'
    +'<div class="toolbar" style="margin-top:9px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="enabled"'+(off?'':' checked')+'> 启用</label>'
    +'<span class="spacer"></span>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="polish">✎ 润色</button>'
    +'<button class="btn xs ghost" data-act="del">删除</button>'
    +'</div></div></div>';
}
function htmlLorePower(){
  const L=ensureLore(), pw=L.pw;
  return '<div class="card" style="margin-bottom:12px">'
    +'<div class="toolbar">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-static="pw.on"'+(pw.on?' checked':'')+'> 启用力量体系（现实题材可整体关闭）</label>'
    +'<div class="spacer"></div>'
    +'<button class="btn sm primary" data-act="bsplit">✦ 词条拆分</button>'
    +'</div>'
    +'<div class="hint" style="margin-top:8px">分两层：<b>基础力量总纲</b>写力量从何而来、底层能量规则与代价；'
    +'<b>境界词条库</b>按高低排序，AI 会按顺序理解实力层级，避免越级崩坏。'
    +'不知道怎么写？把一整套修炼体系文本粘进「✦ 词条拆分」，AI 会自动拆成独立境界条目。</div>'
    +'</div>'
    +loreBarHTML()
    +'<div class="card" style="margin-bottom:12px"><h3>① 基础力量总纲</h3>'
    +'<textarea data-static="pw.general" style="min-height:120px" placeholder="例：力量源于“墨玉”中残存的念头，一切术法本质是改写他人记忆里的因果……力量受三重限制：需以寿命支付、需有人在场见证、言语不能落于纸面。">'+esc(pw.general)+'</textarea>'
    +'<label>备注区（给 AI 的解读限制）</label>'
    +'<textarea data-static="pw.gnote" style="min-height:56px" placeholder="例：以上限制不可被任何角色以任何方式绕过，也不得出现“例外”。">'+esc(pw.gnote)+'</textarea>'
    +'<div class="toolbar" style="margin-top:9px">'
    +'<button class="btn xs ghost" data-act="pai" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="pai" data-mode="polish">✎ 润色</button>'
    +'<button class="btn xs ghost" data-act="pai" data-mode="rewrite">↻ 重写</button>'
    +'</div></div>'
    +'<div class="card" style="margin-bottom:12px">'
    +'<div class="toolbar" style="margin-bottom:8px"><h3 style="margin:0">② 修炼 / 能力分支</h3><div class="spacer"></div>'
    +'<button class="btn sm" data-act="badd">＋ 新增分支</button></div>'
    +'<div class="hint">支持多条路线并行（剑修 / 巫术 / 异能 / 妖兽血脉…），每条单独编辑、单独启用。</div>'
    +(pw.branches.map(b=>loreEntryHTML('branch',b)).join('')||'<div class="hint" style="margin:0">还没有分支。</div>')
    +'</div>'
    +'<div class="card">'
    +'<div class="toolbar" style="margin-bottom:8px"><h3 style="margin:0">③ 境界词条库</h3>'
    +'<span class="hint" style="margin:0">由低到高 · 可拖拽排序</span><div class="spacer"></div>'
    +'<button class="btn sm" data-act="radd">＋ 新增境界</button></div>'
    +(pw.realms.map((r,i)=>loreRealmHTML(r,i)).join('')||'<div class="hint" style="margin:0">还没有境界条目。</div>')
    +'</div>';
}
function loreEventHTML(e,i){
  const off=e.enabled===false, open=_loreOpen.has(loreOpenKey('ev',e.id));
  return '<div class="lrow'+(off?' off':'')+(open?' open':'')+'" data-scope="ev" data-id="'+e.id+'">'
    +'<div class="lrow-top"><span class="idx">'+(i+1)+'</span>'
    +'<span class="t-time">'+esc(e.time||'时间未定')+'</span>'
    +'<span class="nm">'+esc(e.name||'未命名事件')+'</span>'
    +(e.real?'<span class="tag-real">参考现实</span>':'<span class="tag-fake">完全架空</span>')
    +loreConfBadge(e)
    +(off?'<span class="badge warn">停用</span>':'')
    +'<span class="spacer"></span>'
    +'<button class="btn xs ghost" data-act="emove" data-dir="-1" title="上移">↑</button>'
    +'<button class="btn xs ghost" data-act="emove" data-dir="1" title="下移">↓</button>'
    +'<button class="btn xs ghost" data-act="open">编辑</button>'
    +'</div>'
    +'<div class="fields">'
    +'<div class="lgrid">'
    +'<div><label style="margin-top:0">事件名称</label><input type="text" data-f="name" value="'+esc(e.name||'')+'"></div>'
    +'<div><label style="margin-top:0">发生时间</label><input type="text" data-f="time" value="'+esc(e.time||'')+'" placeholder="例：苍历 312 年 / 三千年前"></div>'
    +'</div>'
    +'<label>事件简述</label><textarea data-f="desc" style="min-height:80px">'+esc(e.desc||'')+'</textarea>'
    +'<label>造成的长远影响</label><textarea data-f="effect" style="min-height:60px">'+esc(e.effect||'')+'</textarea>'
    +'<label>备注区（给 AI 的解读限制）</label><textarea data-f="note" style="min-height:52px">'+esc(e.note||'')+'</textarea>'
    +'<div class="toolbar" style="margin-top:9px">'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="real"'+(e.real?' checked':'')+'> 参考现实</label>'
    +'<label class="switch" style="margin:0"><input type="checkbox" data-f="enabled"'+(off?'':' checked')+'> 启用</label>'
    +'<span class="spacer"></span>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="ai" data-mode="polish">✎ 润色</button>'
    +'<button class="btn xs ghost" data-act="del">删除</button>'
    +'</div></div></div>';
}
function htmlLoreHistory(){
  const L=ensureLore(), hi=L.hi;
  const evs=hi.events;
  return '<div class="card" style="margin-bottom:12px">'
    +'<div class="toolbar">'
    +'<button class="btn sm primary" data-act="ebrain">✦ 历史头脑风暴</button>'
    +'<button class="btn sm" data-act="evadd">＋ 新增事件</button>'
    +'<button class="btn sm ghost" data-act="etimesort">⇅ 按时间自动排序</button>'
    +'<div class="spacer"></div><span class="hint" style="margin:0">'+evs.length+' 条</span>'
    +'</div>'
    +'<div class="hint" style="margin-top:8px">记录世界过往的重大事件，规避剧情时间矛盾。'
    +'AI 生成章节时会把年表当作<b>既成事实</b>，不会写出与之冲突的“新历史”。</div>'
    +'</div>'
    +loreBarHTML()
    +'<div class="card" style="margin-bottom:12px"><h3>自定义纪年 / 历法</h3>'
    +'<textarea data-static="hi.cal" style="min-height:66px" placeholder="例：本世界行「苍历」，以玄鸟衔印之年为元年；一年分十旬，一旬三十六日；每十二年称一轮。">'+esc(hi.cal)+'</textarea>'
    +'<div class="hint" style="margin-top:6px">填了这里，AI 写时间、年龄、朝代更替时会按这套历法来算。</div>'
    +'</div>'
    +'<div class="card"><div class="toolbar" style="margin-bottom:10px"><h3 style="margin:0">时间轴</h3>'
    +'<div class="spacer"></div><span class="hint" style="margin:0">用 ↑↓ 调整先后顺序</span></div>'
    +'<div class="tl">'+(evs.map((e,i)=>loreEventHTML(e,i)).join('')||'<div class="hint" style="margin:0">还没有历史事件。可以用「✦ 历史头脑风暴」让 AI 基于已有设定衍生。</div>')+'</div>'
    +'</div>';
}
function htmlLoreGlobal(){
  const L=ensureLore(), mk=loreMarks();
  return '<div class="card" style="margin-bottom:12px">'
    +'<h3>① 全局总提示词 <span class="tip">作用于全部内容 · 优先级最高</span></h3>'
    +'<textarea data-static="gl.master" style="min-height:170px" placeholder="例：写文不得出现战力崩坏；角色性格不能 OOC；所有法术必须遵循世界能量规则；不得出现现代词汇与网络用语。">'+esc(L.gl.master)+'</textarea>'
    +'<div class="toolbar" style="margin-top:9px">'
    +'<button class="btn xs ghost" data-act="gai" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="gai" data-mode="polish">✎ 润色</button>'
    +'<button class="btn xs ghost" data-act="ggen">✦ 由设定生成规则</button>'
    +'</div>'
    +'<div class="hint" style="margin-top:6px">这段文字会排在 System Prompt 最前面，优先级高于所有设定条目与角色卡。</div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:12px"><h3>② 全局约束补充</h3>'
    +'<textarea data-static="gl.extra" style="min-height:100px" placeholder="例：本书不写任何血腥描写；反派台词不使用脏话。">'+esc(L.gl.extra)+'</textarea>'
    +'<div class="toolbar" style="margin-top:9px">'
    +'<button class="btn xs ghost" data-act="gai2" data-mode="expand">✦ 扩写</button>'
    +'<button class="btn xs ghost" data-act="gai2" data-mode="polish">✎ 润色</button>'
    +'</div></div>'
    +loreBarHTML()
    +'<div class="card"><h3>③ 真实 / 幻想标记总览</h3>'
    +'<div class="hint">下表的标记来自每一条设定的勾选状态：勾了「参考现实」= 允许参照现实规律；没勾 = 完全架空，AI 只能用你给出的设定。'
    +'点条目名可以跳到对应位置修改。</div>'
    +'<div style="margin-top:10px"><b style="font-size:13px;color:var(--ok)">参考现实（'+mk.realN.length+'）</b><div class="hint" style="margin:4px 0 10px">'+(mk.realN.map(esc).join('、')||'（无）')+'</div>'
    +'<b style="font-size:13px;color:var(--warn)">完全架空（'+mk.fakeN.length+'）</b><div class="hint" style="margin:4px 0 0">'+(mk.fakeN.map(esc).join('、')||'（无）')+'</div></div>'
    +'</div>';
}
function renderLore(){
  const L=ensureLore();
  const body=$('#loreBody'); if(!body) return;
  const on=$('#loreOn'); if(on) on.checked=!!L.on;
  $$('.ltab').forEach(t=>t.classList.toggle('active',t.dataset.ltab===loreTab));
  body.innerHTML = loreTab==='power'?htmlLorePower()
    : loreTab==='history'?htmlLoreHistory()
    : loreTab==='global'?htmlLoreGlobal()
    : htmlLoreWorld();
  const wc=$('#loreWCnt');
  if(wc) wc.textContent=L.w.length?('共 '+L.w.length+' 条 · '+L.cats.length+' 个分类'):'还没有条目';
  loreCountN();
  updateLoreBar();
}

/* ---------------- 事件绑定（委托，只绑一次） ---------------- */
function loreBind(){
  const body=$('#loreBody'); if(!body||body._bound) return;
  body._bound=true;
  body.addEventListener('click',loreClick);
  body.addEventListener('input',loreInput);
  body.addEventListener('change',loreChange);
  body.addEventListener('dragstart',loreDragStart);
  body.addEventListener('dragover',loreDragOver);
  body.addEventListener('drop',loreDrop);
  body.addEventListener('dragend',()=>{ loreDragId=null; $$('.lrow.dragging').forEach(x=>x.classList.remove('dragging')); });
}
function loreClick(e){
  const btn=e.target.closest('[data-act]'); if(!btn) return;
  const act=btn.dataset.act;
  const host=btn.closest('[data-scope]');
  const scope=host?host.dataset.scope:'';
  const id=host?host.dataset.id:'';
  const catId=btn.dataset.cat||'';
  /* 展开 / 收起 */
  if(act==='open'){
    e.stopPropagation();
    const key=loreOpenKey(scope,id);
    if(_loreOpen.has(key)) _loreOpen.delete(key); else _loreOpen.add(key);
    host.classList.toggle('open');
    return;
  }
  if(act==='gopen'){ btn.closest('.lgroup').classList.toggle('open'); return; }
  if(act==='wbfold'){
    e.stopPropagation();
    const key='wb:'+btn.dataset.id;
    if(_loreOpen.has(key)) _loreOpen.delete(key); else _loreOpen.add(key);
    const fold=btn.closest('.wbfold'); if(fold) fold.classList.toggle('open');
    return;
  }
  if(act==='wbclear'){
    e.stopPropagation();
    const o=loreGet('w',btn.dataset.id); if(!o) return;
    o._hit=[]; save(); renderLore(); toast('已清除命中记录（粘滞 / 冷却重新计算）');
    return;
  }
  if(act==='wbimport'){ e.stopPropagation(); const f=$('#fileWB'); if(f) f.click(); return; }
  if(act==='wbexport'){ e.stopPropagation(); wbExport(); return; }
  if(act==='wbtest'){ e.stopPropagation(); wbTestDialog(); return; }
  if(act==='gall'){
    const gs=$$('#loreGroups .lgroup');
    const anyOpen=gs.some(g=>g.classList.contains('open'));
    gs.forEach(g=>g.classList.toggle('open',!anyOpen));
    return;
  }
  if(act==='eadd'){
    e.stopPropagation();
    const L=ensureLore();
    const o={id:uid(),cat:catId||L.cats[0].id,name:'新条目',content:'',note:'',real:false,enabled:true,upd:Date.now(),
      keys:[],secondary:[],constant:true,selective:true,selectiveLogic:0,caseSensitive:false,matchWholeWords:false,
      vectorized:false,probability:100,useProbability:true,order:100,position:0,depth:4,role:0,
      scanDepth:null,include:'',exclude:'',group:'',groupWeight:100,groupOverride:false,
      sticky:0,cooldown:0,delay:0,excludeRecursion:false,preventRecursion:false,delayUntilRecursion:0,
      addMemo:true,displayIndex:0,_auto:false,_hit:[]};   /* 手写条目默认常驻：固定上下文 */
    wbFix(o);
    L.w.unshift(o);
    _loreOpen.add(loreOpenKey('w',o.id));
    save(); renderLore();
    const g=document.querySelector('.lgroup[data-cat="'+o.cat+'"]'); if(g) g.classList.add('open');
    return;
  }
  if(act==='cadd'){
    e.stopPropagation();
    const name=prompt('新分类名称（例：风土怪物 / 组织势力）：','');
    if(!name||!name.trim()) return;
    ensureLore().cats.push({id:'c'+uid(),name:name.trim().slice(0,20),hint:'自定义分类',builtin:false});
    save(); renderLore(); toast('已新建分类「'+name.trim()+'」');
    return;
  }
  if(act==='cmenu'){
    e.stopPropagation();
    const L=ensureLore(), cat=L.cats.find(c=>c.id===catId); if(!cat) return;
    const n=L.w.filter(x=>x.cat===cat.id).length;
    openDlg('<h3>分类：'+esc(cat.name)+'</h3><div class="hint">本分类共 '+n+' 条条目。</div>'
      +'<label>分类名称</label><input type="text" id="catName" value="'+esc(cat.name)+'">'
      +'<label>分类说明（给作者自己看的提示）</label><input type="text" id="catHint" value="'+esc(cat.hint||'')+'">',
      [{label:'关闭'},
       {label:'删除分类',cls:'danger',fn:()=>{
          if(L.cats.length<=1){ toast('至少要保留一个分类'); return false; }
          const target=L.cats.find(c=>c.id!==cat.id);
          if(n&&!confirm('「'+cat.name+'」下有 '+n+' 条条目，删除后会并入「'+target.name+'」，继续？')) return false;
          L.w.forEach(x=>{ if(x.cat===cat.id) x.cat=target.id; });
          L.cats=L.cats.filter(c=>c.id!==cat.id);
          save(); renderLore(); toast('已删除分类');
        }},
       {label:'保存',cls:'primary',fn:()=>{
          const nm=$('#catName').value.trim(); if(nm) cat.name=nm.slice(0,20);
          cat.hint=$('#catHint').value.trim();
          save(); renderLore(); toast('已保存分类');
        }}]);
    return;
  }
  if(act==='cai'){ e.stopPropagation(); loreFillCat(catId); return; }
  if(act==='classify'){ e.stopPropagation(); loreClassifyFlow(); return; }
  if(act==='preview'){ e.stopPropagation(); lorePreview(); return; }
  if(act==='budget'){
    e.stopPropagation();
    const L=ensureLore();
    const v=prompt('① 固定上下文（力量体系 / 历史年表 / 全局约束）每次注入上限（字）：',String(L.budget));
    if(v==null) return;
    const n=parseInt(v,10);
    if(!(n>=600)){ toast('请输入 600 以上的数字'); return; }
    const v2=prompt('② 世界书条目每次注入上限（字）：',String(L.wbudget));
    const n2=parseInt(v2,10);
    L.budget=n;
    if(n2>=500) L.wbudget=n2;
    save(); renderLore(); toast('已设置：固定上下文 '+n+' 字 · 世界书 '+L.wbudget+' 字');
    return;
  }
  /* 力量体系 */
  if(act==='badd'){
    const L=ensureLore();
    const o={id:uid(),name:'新分支',content:'',note:'',enabled:true};
    L.pw.branches.push(o); _loreOpen.add(loreOpenKey('branch',o.id));
    save(); renderLore(); return;
  }
  if(act==='radd'){
    const L=ensureLore();
    const o={id:uid(),name:'新境界',cap:'',feat:'',cond:'',weak:'',note:'',enabled:true};
    L.pw.realms.push(o); _loreOpen.add(loreOpenKey('realm',o.id));
    save(); renderLore(); return;
  }
  if(act==='bsplit'){ loreSplitRealmDialog(); return; }
  if(act==='rmove'||act==='emove'){
    const arr = act==='rmove'?ensureLore().pw.realms:ensureLore().hi.events;
    const i=arr.findIndex(x=>x.id===id); const d=+btn.dataset.dir;
    const j=i+d; if(i<0||j<0||j>=arr.length) return;
    const t=arr[i]; arr[i]=arr[j]; arr[j]=t;
    save(); renderLore(); return;
  }
  /* 历史 */
  if(act==='evadd'){
    const L=ensureLore();
    const o={id:uid(),name:'新事件',time:'',desc:'',effect:'',note:'',real:false,enabled:true};
    L.hi.events.push(o); _loreOpen.add(loreOpenKey('ev',o.id));
    save(); renderLore(); return;
  }
  if(act==='etimesort'){ loreTimeSort(); return; }
  if(act==='ebrain'){ loreBrainstorm(); return; }
  /* AI */
  if(act==='ai'){
    const mode=btn.dataset.mode;
    if(scope==='realm') loreAIRealm(id,mode);
    else loreAIOne(scope,id,mode);
    return;
  }
  if(act==='pai'){ loreAIGeneral('pw.general',btn.dataset.mode); return; }
  if(act==='gai'){ loreAIGeneral('gl.master',btn.dataset.mode); return; }
  if(act==='gai2'){ loreAIGeneral('gl.extra',btn.dataset.mode); return; }
  if(act==='ggen'){ loreGenRules(); return; }
  if(act==='del'){
    e.stopPropagation();
    const L=ensureLore();
    let arr=null, nm='';
    if(scope==='w'){ arr=L.w; nm=(loreGet('w',id)||{}).name; }
    else if(scope==='branch'){ arr=L.pw.branches; nm=(loreGet('branch',id)||{}).name; }
    else if(scope==='realm'){ arr=L.pw.realms; nm=(loreGet('realm',id)||{}).name; }
    else if(scope==='ev'){ arr=L.hi.events; nm=(loreGet('ev',id)||{}).name; }
    if(!arr) return;
    if(!confirm('删除「'+(nm||'未命名')+'」？')) return;
    const i=arr.findIndex(x=>x.id===id); if(i<0) return;
    arr.splice(i,1); save(); renderLore(); loreCountN(); toast('已删除');
    return;
  }
  if(act==='dupe'){
    e.stopPropagation();
    const o=loreGet(scope,id); if(!o) return;
    const L=ensureLore();
    const arr=scope==='w'?L.w:L.pw.branches;
    const c=JSON.parse(JSON.stringify(o)); c.id=uid(); c.name=(o.name||'')+' 副本';
    arr.splice(arr.findIndex(x=>x.id===id)+1,0,c);
    save(); renderLore(); toast('已复制');
    return;
  }
}
function loreDirty(){ save(); }
/* 把表单元素的值写回条目（支持数字 / 关键词 / 布尔） */
function loreAssign(o,el){
  const f=el.dataset.f; if(!f) return false;
  if(el.dataset.keys!=null){ o[f]=toKeys(el.value); }
  else if(el.dataset.num!=null){ const n=Number(el.value); o[f]=isFinite(n)?n:0; }
  else if(el.dataset.bool!=null){ o[f]=(el.value==='true'); }
  else if(el.type==='checkbox'){ o[f]=el.checked; }
  else { o[f]=el.value; }
  if(f==='delayUntilRecursion') o[f]=o[f]?1:0;
  o.upd=Date.now();
  return true;
}
function loreInput(e){
  if(e.target.id==='loreSearch'){ loreFilter(); return; }
  const el=e.target.closest('[data-f]');
  if(el){
    const host=el.closest('[data-scope]'); if(!host) return;
    const o=loreGet(host.dataset.scope,host.dataset.id); if(!o) return;
    const f=el.dataset.f;
    loreAssign(o,el);
    if(f==='name'){
      const nm=host.querySelector('.lhead .nm')||host.querySelector('.lrow-top .nm');
      if(nm) nm.textContent=el.value||'未命名';
    }
    if(f==='content'){
      const c=host.querySelector('.lhead .hint'); if(c) c.textContent=el.value.length+' 字';
    }
    if(f==='time'){
      const t=host.querySelector('.t-time'); if(t) t.textContent=el.value||'时间未定';
    }
    loreDirty(); loreCountN();
    return;
  }
  const st=e.target.closest('[data-static]');
  if(st){ loreSetStatic(st.dataset.static, st.value); }
}
function loreChange(e){
  const el=e.target.closest('[data-f]');
  if(el){
    const host=el.closest('[data-scope]'); if(!host) return;
    const o=loreGet(host.dataset.scope,host.dataset.id); if(!o) return;
    if(!loreAssign(o,el)) return;
    save();
    renderLore();
    return;
  }
  const st=e.target.closest('[data-static]');
  if(st&&st.type==='checkbox'){ loreSetStatic(st.dataset.static, st.checked); renderLore(); return; }
}
function loreSetStatic(path,val){
  const L=ensureLore(); const [a,b]=path.split('.');
  if(b==null) L[a]=val; else L[a][b]=val;
  save(); updateLoreBar(); loreCountN();
}
/* 拖拽排序（境界） */
let loreDragId=null;
function loreDragStart(e){
  const row=e.target.closest('.lrow[data-scope="realm"]'); if(!row) return;
  loreDragId=row.dataset.id; row.classList.add('dragging');
  try{ e.dataTransfer.setData('text/plain',loreDragId); e.dataTransfer.effectAllowed='move'; }catch(_){}
}
function loreDragOver(e){
  if(!loreDragId) return;
  if(e.target.closest('.lrow[data-scope="realm"]')) e.preventDefault();
}
function loreDrop(e){
  const row=e.target.closest('.lrow[data-scope="realm"]');
  if(!loreDragId||!row){ loreDragId=null; return; }
  e.preventDefault();
  const L=ensureLore();
  const from=L.pw.realms.findIndex(r=>r.id===loreDragId);
  if(from<0){ loreDragId=null; return; }
  const box=row.getBoundingClientRect();
  const after=(e.clientY-box.top)>box.height/2;
  const [item]=L.pw.realms.splice(from,1);
  let idx=L.pw.realms.findIndex(r=>r.id===row.dataset.id);
  if(idx<0) idx=L.pw.realms.length-1;
  L.pw.realms.splice(after?idx+1:idx,0,item);
  loreDragId=null; save(); renderLore();
}
/* 搜索过滤（不重渲染，避免输入框失焦） */
function loreFilter(){
  const inp=$('#loreSearch'); if(!inp) return;
  const q=inp.value.trim().toLowerCase();
  $$('#loreGroups .lgroup').forEach(g=>{
    let hit=0;
    g.querySelectorAll('.lentry').forEach(en=>{
      const txt=en.textContent.toLowerCase();
      const ok=!q||txt.includes(q);
      en.style.display=ok?'':'none';
      if(ok) hit++;
    });
    g.style.display=(!q||hit)?'':'none';
    if(q&&hit) g.classList.add('open');
  });
}

/* ---------------- 注入预览 ---------------- */
function lorePreview(){
  const L=ensureLore();
  if(!L.on){ toast('设定库当前是关闭状态'); return; }
  loreSystemBlock();
  const kept=_loreLast.kept, dropped=_loreLast.dropped;
  const wb=_loreLast.wb;
  const wbRows = wb? wb.included.map(x=>'<div class="item" style="padding:8px 11px;margin-bottom:6px">'
      +'<span class="badge '+(x.e.constant?'on':'ok')+'">'+(x.e.constant?'常驻':'触发')+'</span> '
      +'<b style="font-size:13px">'+esc(x.e.name||'未命名')+'</b>'
      +'<div class="hint" style="margin-top:4px">'+esc(x.why)+'</div></div>').join('')
    : '';
  openDlg('<h3>🔍 注入预览</h3>'
    +'<div class="hint">每次生成章节，下面这些内容会拼进 System Prompt（固定上下文）。</div>'
    +'<div class="hint" style="margin-top:6px">固定上下文：<b>'+(_loreLast.blockUsed||0).toLocaleString()+'</b> / '+_loreLast.budget.toLocaleString()+' 字'
    +'　世界书：<b>'+(_loreLast.wbUsed||0).toLocaleString()+'</b> / '+(_loreLast.wbudget||0).toLocaleString()+' 字</div>'
    +'<h3 style="margin-top:14px;font-size:14px">世界书将注入（'+(wb?wb.included.length:0)+' 条）</h3>'
    +(wbRows||'<div class="hint">没有世界书条目被触发。</div>')
    +'<h3 style="margin-top:14px;font-size:14px">固定上下文已注入（'+kept.length+' 块）</h3>'
    +(kept.filter(k=>k.indexOf('世界书·')!==0).map(k=>'<div class="item" style="padding:8px 11px;margin-bottom:6px"><span class="badge ok">✔</span> <b style="font-size:13px">'+esc(k)+'</b></div>').join('')
      ||'<div class="hint">还没有可注入的内容。</div>')
    +(dropped.length?('<div class="warnbox" style="margin-top:10px">因超出上限未注入：'+dropped.map(esc).join('、')
      +'。可以点「⚙ 上限」调高，或停用部分条目。</div>'):'')
    +(_loreLast.cut?'<div class="warnbox" style="margin-top:10px">已注入内容被截断（单块超过上限），建议调高上限或拆分条目。</div>':'')
    +'<h3 style="margin-top:14px;font-size:14px">最终文本（节选）</h3>'
    +'<pre class="prompt">'+esc(_loreLast.text.slice(0,4000))
    +(_loreLast.text.length>4000?('\n\n……（省略 '+(_loreLast.text.length-4000).toLocaleString()+' 字）'):'')+'</pre>',
    [{label:'关闭'}]);
}

/* ---------------- AI：单条扩写 / 润色 / 重写 ---------------- */
function loreRealmText(r){
  const seg=[];
  if((r.cap||'').trim()) seg.push('能力上限：'+r.cap.trim());
  if((r.feat||'').trim()) seg.push('特征：'+r.feat.trim());
  if((r.cond||'').trim()) seg.push('晋升条件：'+r.cond.trim());
  if((r.weak||'').trim()) seg.push('弱点：'+r.weak.trim());
  return seg.join('\n');
}
async function loreAIOne(scope,id,mode){
  const o=loreGet(scope,id); if(!o) return;
  const label = scope==='w'?'世界观条目':scope==='branch'?'修炼分支':scope==='ev'?'历史事件':'设定';
  const name=o.name||'（未命名）';
  const body = scope==='ev'
    ? ('事件名称：'+(o.name||'')+'\n发生时间：'+(o.time||'')+'\n事件简述：'+(o.desc||'')+'\n长远影响：'+(o.effect||''))
    : (o.content||'');
  setBusy(true,'AI 正在'+LORE_MODE_NAME[mode]+'「'+name+'」…');
  try{
    const user='【设定改写】\n作者正在写一份长篇小说设定集，请对下面这条设定做「'+LORE_MODE_NAME[mode]+'」。\n\n'
      +'条目类型：'+label+'\n条目名称：'+name+'\n'
      +((o.note||'').trim()?('解读限制（必须继续遵守）：'+o.note+'\n'):'')
      +'\n现有内容：\n'+(body||'（还没有内容，请根据条目名称与已有设定直接写出这条设定）')+'\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- '+LORE_AI_TASK[mode]+'\n'
      +'- 只输出改写后的设定正文，不要标题、不要解释、不要 markdown 标记、不要用引号包裹\n'
      +'- 不得推翻已有设定，不得让新内容与其它条目冲突\n'
      +'- 写具体、可执行，能直接用来约束写作';
    let out=String(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}])||'').trim();
    out=out.replace(/^```[a-z]*\s*/i,'').replace(/```$/,'').trim();
    if(!out) throw new Error('模型没有返回内容');
    if(scope==='ev') o.desc=out; else o.content=out;
    o.upd=Date.now();
    save(); renderLore();
    toast('已'+LORE_MODE_NAME[mode]+'「'+name+'」');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
async function loreAIRealm(id,mode){
  const L=ensureLore(); const r=L.pw.realms.find(x=>x.id===id); if(!r) return;
  setBusy(true,'AI 正在'+LORE_MODE_NAME[mode]+'「'+(r.name||'未命名境界')+'」…');
  try{
    const user='【境界改写】\n作者正在写小说设定集的「境界词条库」，请对该境界做「'+LORE_MODE_NAME[mode]+'」。\n\n'
      +'境界名称：'+(r.name||'未命名')+'\n能力上限：'+(r.cap||'（空）')+'\n特征：'+(r.feat||'（空）')
      +'\n晋升条件：'+(r.cond||'（空）')+'\n弱点：'+(r.weak||'（空）')+'\n'
      +((r.note||'').trim()?('解读限制：'+r.note+'\n'):'')
      +'当前境界在阶梯中的位置：第 '+(L.pw.realms.findIndex(x=>x.id===id)+1)+' / '+L.pw.realms.length+' 级\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- '+LORE_AI_TASK[mode]+'\n'
      +'- 各字段内容必须与该境界的高低位置相匹配，不得越级\n'
      +'- 只输出 JSON，不要解释、不要代码块标记：\n{"name":"","cap":"","feat":"","cond":"","weak":""}';
    const j=parseLoose(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}]));
    if(!j||typeof j!=='object'||Array.isArray(j)) throw new Error('解析失败');
    ['name','cap','feat','cond','weak'].forEach(k=>{ if(j[k]!=null&&String(j[k]).trim()) r[k]=String(j[k]).trim(); });
    r.upd=Date.now();
    save(); renderLore();
    toast('已'+LORE_MODE_NAME[mode]+'「'+(r.name||'境界')+'」');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
async function loreAIGeneral(path,mode){
  const L=ensureLore(); const [a,b]=path.split('.');
  const cur=String(L[a][b]||'');
  const label={ 'pw.general':'基础力量总纲', 'gl.master':'全局总提示词', 'gl.extra':'全局约束补充' }[path]||'设定';
  setBusy(true,'AI 正在'+LORE_MODE_NAME[mode]+'「'+label+'」…');
  try{
    const user='【设定改写】\n请对下面这段长篇小说设定做「'+LORE_MODE_NAME[mode]+'」。\n\n'
      +'字段：'+label+'\n现有内容：\n'+(cur||'（空，请根据作者的其它设定直接写出这段内容）')+'\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- '+LORE_AI_TASK[mode]+'\n'
      +'- 只输出改写后的正文，不要标题、不要解释、不要 markdown 标记\n'
      +'- 与作者已有设定相容，不得引入矛盾内容\n'
      +'- 若是「全局总提示词」，请写成可直接约束 AI 的硬性规则（编号列表）';
    let out=String(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}])||'').trim();
    out=out.replace(/^```[a-z]*\s*/i,'').replace(/```$/,'').trim();
    if(!out) throw new Error('模型没有返回内容');
    L[a][b]=out; save(); renderLore(); toast('已'+LORE_MODE_NAME[mode]+'「'+label+'」');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
async function loreGenRules(){
  const L=ensureLore();
  setBusy(true,'AI 正在根据已有设定生成全局规则…');
  try{
    const user='【全局规则生成】\n根据作者已有的设定，写一套「全局总提示词」：这是作用于全书、优先级最高的硬性规则。\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- 6-12 条，编号排列（如「1. 」），每条 20-45 字\n'
      +'- 必须紧扣上面给出的具体设定（地名、体系、禁忌），不要写空泛套话\n'
      +'- 至少涵盖：不得战力崩坏、角色不得 OOC、不得临时新增关键设定、法术必须遵循能量规则、不得套用现实历史\n'
      +'- 只输出编号列表，不要解释、不要标题';
    let out=String(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}])||'').trim();
    out=out.replace(/^```[a-z]*\s*/i,'').replace(/```$/,'').trim();
    if(!out) throw new Error('模型没有返回内容');
    L.gl.master=out; save(); renderLore(); toast('已生成全局总提示词');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
/* 整类补全 */
async function loreFillCat(catId){
  const L=ensureLore(); const cat=L.cats.find(c=>c.id===catId); if(!cat) return;
  setBusy(true,'AI 正在补全「'+cat.name+'」…');
  try{
    const existing=L.w.filter(e=>e.cat===catId).map(e=>'· '+(e.name||'')+'：'+String(e.content||'').slice(0,90)).join('\n');
    const user='【分类补全】\n作者的长篇小说设定集里，「'+cat.name+'」这一类目前'+(existing?'已有内容':'还是空白')+'，请为这一类补写 3-5 条设定条目。\n\n'
      +'该分类应涵盖：'+(cat.hint||cat.name)+'\n'
      +(existing?('已有条目（不要重复，请从新角度补充）：\n'+existing+'\n'):'')
      +'\n'+fieldContext()+'\n\n'
      +'要求：\n- 每条 80-160 字，具体、可执行、能直接约束写作\n'
      +'- 与已有设定相容，不得矛盾\n'
      +'- 只输出 JSON 数组，不要解释、不要代码块标记：\n'
      +'[{"name":"条目名（不超16字）","content":"设定内容","note":"给 AI 的解读限制，没有就空字符串","real":false}]';
    const arr=parseLoose(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}]));
    if(!Array.isArray(arr)||!arr.length) throw new Error('没有生成内容');
    let n=0;
    arr.forEach(x=>{
      if(!x||!x.name) return;
      L.w.push({id:uid(),cat:catId,name:String(x.name).slice(0,30),content:String(x.content||''),
        note:String(x.note||''),real:!!x.real,enabled:true,upd:Date.now()});
      n++;
    });
    save(); renderLore(); toast('已为「'+cat.name+'」补全 '+n+' 条');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
/* 词条拆分 */
function loreSplitRealmDialog(){
  openDlg('<h3>✦ AI 词条拆分</h3>'
    +'<div class="hint">粘贴一大段修炼 / 等级体系文本，AI 会自动提取并拆分成独立的「境界条目」（按由低到高排序），直接进入境界词条库。</div>'
    +'<label>粘贴文本</label>'
    +'<textarea id="splitSrc" style="min-height:200px" placeholder="例：淬体境，肉身强横……筑基境，可引气入体……金丹境……"></textarea>',
    [{label:'取消'},
     {label:'开始拆分',cls:'primary',fn:()=>{
        const t=$('#splitSrc').value.trim();
        if(!t){ toast('请先粘贴文本'); return false; }
        setTimeout(()=>loreSplitRealms(t),60); return true;
     }}]);
}
async function loreSplitRealms(text){
  setBusy(true,'AI 正在拆分境界条目…');
  try{
    const user='【境界拆分】\n作者粘贴了一段力量 / 修炼体系文本，请把它拆分成结构化的「境界条目」，按由低到高排列。\n\n'
      +'【文本】\n'+text.slice(0,6000)+'\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- 每个境界输出：名称、能力上限、境界特征、晋升条件、弱点\n'
      +'- 文本里没有提到的项用空字符串，不要编造与文本冲突的内容\n'
      +'- 不要漏掉文本中出现的任何境界\n'
      +'- 只输出 JSON 数组，不要解释、不要代码块标记：\n'
      +'[{"name":"境界名","cap":"能力上限","feat":"特征","cond":"晋升条件","weak":"弱点"}]';
    const arr=parseLoose(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}]));
    if(!Array.isArray(arr)||!arr.length) throw new Error('没有解析到境界条目');
    const L=ensureLore();
    let n=0;
    arr.forEach(r=>{
      if(!r||!r.name) return;
      L.pw.realms.push({id:uid(),name:String(r.name).slice(0,40),cap:String(r.cap||''),feat:String(r.feat||''),
        cond:String(r.cond||''),weak:String(r.weak||''),note:'',enabled:true});
      n++;
    });
    save(); loreTab='power'; renderLore();
    toast('已拆分出 '+n+' 个境界条目');
  }catch(e){ toast('拆分失败：'+e.message); }
  finally{ setBusy(false); }
}
/* 历史头脑风暴 */
async function loreBrainstorm(){
  setBusy(true,'AI 正在衍生历史事件…');
  try{
    const L=ensureLore();
    const have=L.hi.events.map(e=>'· '+(e.time||'')+' '+(e.name||'')+'：'+String(e.desc||'').slice(0,80)).join('\n');
    const user='【历史衍生】\n基于作者已有的世界观与历史，衍生 5-8 条新的历史事件，用来补厚世界背景。\n\n'
      +((L.hi.cal||'').trim()?('本世界纪年：'+L.hi.cal+'\n'):'')
      +(have?('已有事件（不要重复，要能与之衔接）：\n'+have+'\n'):'')
      +'\n'+fieldContext()+'\n\n'
      +'要求：\n- 每个事件要有明确的时间、发生了什么、以及对现在的长远影响\n'
      +'- 时间必须与已有事件的前后关系相容，不得矛盾\n'
      +'- 只输出 JSON 数组，不要解释、不要代码块标记：\n'
      +'[{"name":"事件名（不超14字）","time":"发生时间","desc":"发生了什么（60-140字）","effect":"长远影响（30-80字）"}]';
    const arr=parseLoose(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}]));
    if(!Array.isArray(arr)||!arr.length) throw new Error('没有生成内容');
    let n=0;
    arr.forEach(x=>{
      if(!x||!x.name) return;
      ensureLore().hi.events.push({id:uid(),name:String(x.name).slice(0,30),time:String(x.time||''),
        desc:String(x.desc||''),effect:String(x.effect||''),note:'',real:false,enabled:true});
      n++;
    });
    save(); loreTab='history'; renderLore(); toast('已衍生 '+n+' 条历史事件');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
/* 按时间文本自动排序：带数字的按数值升序排在前，时间未定的按原顺序跟在后面 */
function loreTimeSort(){
  const L=ensureLore();
  const num=s=>{ const m=String(s||'').match(/\d+(?:\.\d+)?/); return m?parseFloat(m[0]):null; };
  const arr=L.hi.events;
  const withNum=arr.filter(e=>num(e.time)!=null);
  const rest=arr.filter(e=>num(e.time)==null);
  if(withNum.length<2){ toast('至少需要两条填了数字时间的条目才能自动排序'); return; }
  withNum.sort((a,b)=>num(a.time)-num(b.time));
  L.hi.events=withNum.concat(rest);
  save(); renderLore();
  toast('已按时间文本里的数字排序 '+withNum.length+' 条'
    + (rest.length?('；时间未定的 '+rest.length+' 条排在最后，可用 ↑↓ 手动调整'):''));
}

/* ---------------- 智能分类引擎 ----------------
   三层判定，目标是「导入即归对」：
   ① 标题别名表：条目名形如【地理】/「境界·金丹」/「军事 - 兵种」→ 直接锁定（高置信）
   ② 特征词典：强特征词（几乎只属于该分类）与一般词分开计权，标题命中权重 ≫ 内容命中
   ③ 语义正则：年份纪年、境界修为、战争事件等句式补充加分
   长词比短词更有指向性，所以按词长加权；同一词只计一次，避免长文堆分。
   ------------------------------------------------------------ */
const LORE_LEX={
  origin:{strong:['世界起源','天地本源','创世神话','开天辟地','世界诞生','造物主','创世神','世界树','量子本源','宇宙之初','混沌初开','万物起源','世界由来'],
          weak:['起源','创世','诞生','本源','初始','太初','鸿蒙','神话','传说','由来','远古']},
  era:{strong:['时代背景','文明阶段','历史时期','时代划分','纪元划分','所处时代','文明程度','科技水平时代','末法之世'],
       weak:['时代','年代','文明','发展阶段','纪元','上古','中古','近古','末法','黄金时代','黑暗时代','王朝更替','王朝','皇朝','百年前','千年前']},
  geo:{strong:['地理','疆域','版图','地形','地貌','山脉','河流','海洋','海域','大陆','岛屿','半岛','群岛','城邦','都城','首都','秘境','要塞','关隘','峡谷','盆地','高原','平原','沙漠','绿洲','湖泊','港口','地图','方位','边界线','国境','领地','地域','国土','航海','船坞','航路','冰川','雪原','山地','丘陵','沼泽','都城','城邑'],
       weak:['国家','城池','城镇','村落','边境','边界','区域','位置','路线','关城','州郡','地形','山','河','湖','港','岛','海外','中原','南疆','北境']},
  climate:{strong:['气候','季节','天象','环境异象','气象','四季','雨季','旱季','潮汐','月相','昼夜交替','天灾','风暴','飓风','极寒','酷暑','天候','风期','汛期','霜期','雪期'],
           weak:['天气','寒冷','炎热','降雨','降雪','刮风','季节变化','异象','气候变迁','秋末','初春','一日']},
  politics:{strong:['政治制度','政体','权力结构','阶层划分','皇权','王权','皇位','帝位','议会','内阁','官僚','官职','官制','官阶','官衔','爵位','法典','律法','朝廷','官府','衙门','税制','统治结构','权力格局','三省六部','御史台'],
            weak:['政治','权力','阶层','等级','统治','制度','组织','势力','门派','宗门','家族','贵族','平民','奴隶','身份','地位','门派势力']},
  military:{strong:['兵种','军备','军队','兵力','骑兵','步兵','弓兵','军团','军衔','军规','战争规则','战法','阵法','城防','武备','军队编制','禁军','边军','卫队','军需','兵营'],
            weak:['军事','战争','作战','战士','士兵','将军','将领','武装','防御','进攻','武器','兵器','刀剑','铠甲','粮草','兵','卫']},
  economy:{strong:['货币','物价','价格','通货','钱币','银两','铜钱','金锭','税收','赋税','商会','商路','贸易','物产','资源分布','矿区','矿脉','粮食产量','经济体系','汇率','赋役','商船'],
           weak:['经济','财富','交易','买卖','商人','市场','集市','资源','粮食','钱','税','商']},
  tech:{strong:['科技','技术水平','生产力','工业','器械','机械','造物技术','炼器术','工艺水平','技术体系','发明','工具制造','工程学','锻锤','水力','冶炼','火药'],
        weak:['技术','工艺','器具','制造','工匠','炼器','工具','装置','设备','打铁','锻造','铁器','船只']},
  culture:{strong:['文化','思想','习俗','风俗','艺术','价值观','人文风气','教育','学派','学术','节庆','礼仪','审美','娱乐','民间传统','社会风气','人文','清谈'],
           weak:['传统','习惯','风气','文艺','绘画','音乐','诗词','礼节','节日','庆典','文人','婚嫁','祭祖']},
  religion:{strong:['宗教','信仰','教派','教会','教义','神殿','神庙','祭祀','神职','主教','祭祀仪式','邪神','神系','神格','祈祷','信徒','朝圣','神祇','神明'],
            weak:['神灵','庙宇','寺院','祭拜','供奉','祭司','圣物','信仰体系','古神','神']},
  race:{strong:['种族','族群','血脉','血统','异族','兽人','精灵','矮人','妖精','妖族','魔族','人族','龙族','混血','族裔','非人','部落','氏族','游牧'],
        weak:['血裔','族群矛盾','民族','诸部','部族','分支血脉']},
  lang:{strong:['语言','通用语','官方语','称谓','称呼','敬语','文字','字母','语法','口音','方言','外语','雅称','尊称','自称','语系','雅言'],
        weak:['语言习惯','俗称','称号','名叫','名谓','俗语']},
  daily:{strong:['日常生活','衣食住行','平民生活','生活起居','饮食习惯','服饰','民居','日常开销','作息','市井生活','生活习俗','风土人情','一日','日常作息'],
         weak:['日常','生活','饮食','食物','衣服','出行','起居','劳作','休息','吃穿','宵禁','卯时','做饭']},
  super:{strong:['超自然','魔力本源','灵气','灵力','异能体系','法则','诅咒','邪祟','异类生物','精怪','鬼物','妖物','能量规则','神秘力量','超自然规则','灵脉','地脉','巫力','妖气'],
         weak:['神秘','妖魔','鬼怪','咒术','邪术','异能','奇物','怪异','超凡','残念','怨念']},
  /* —— 力量体系 —— */
  general:{strong:['力量总纲','力量体系总纲','力量本源','力量来源','能量规则','修炼总纲','基础力量','力量限制','代价与副作用','修行原理','总纲','代价','副作用','反噬','术法代价'],
           weak:['力量','能量','源泉','原理','限制','根基','后遗症']},
  realm:{strong:['境界','境界划分','修为层次','境界等级','晋升条件','瓶颈','突破','筑基','结丹','金丹','元婴','化神','淬体','引气','飞升','登堂','入室','大成','宗师','大能'],
         weak:['层次','等级','晋升','修为','实力等级','阶段','小成','巅峰','上限']},
  branch:{strong:['修炼体系','力量体系','法门','功法','流派','分支','道途','职业体系','能力分支','剑修','巫术','术士','法师','武修','体修','驭兽','炼金','传承','术法','剑典','心法'],
          weak:['体系','流派','分支','职业','修行','道统','方式','门派分支']},
  /* —— 历史 —— */
  calendar:{strong:['历法','纪年','年号','纪元','日历','历制','时间计算','元年','年历','一旬'],
            weak:['纪年体系','年份','时代纪','年']},
  event:{strong:['历史事件','重大事件','编年','年表','之战','之乱','之盟','之约','之变','之祸','之劫','之役','事变','起义','叛乱','灭亡','覆灭','建国','开国','革命','灭门','屠城','灾难','浩劫'],
         weak:['事件','战争','灭亡','建立','发生','导致','年间','年前','之后','旧事','立誓','始末']},
  /* —— 全局约束 —— */
  rule:{strong:['全局规则','全局约束','全局总提示词','铁律','硬性规则','写作规则','不可违背','硬性设定','总则','禁令','战力崩坏','OOC'],
        weak:['禁忌','约束','禁止','不得','必须','规则','违规']}
};
/* 标题别名：条目名里出现这些词就直接锁定分类（最高置信） */
const LORE_ALIAS=[
  ['world','geo',['地理','地理格局','地理疆域','地域','疆域','版图','地图','地点','场景','位置','地形','世界地理','地理设定','版图设定','区域','航海','船坞','山脉','河流']],
  ['world','climate',['气候','天象','季节','环境','环境异象','气象','风期']],
  ['world','politics',['政治','政治制度','制度','政体','权力','权力结构','势力','组织','门派','宗门','朝廷','官府','阶层','等级','国家结构','官制','官阶','爵位']],
  ['world','military',['军事','军备','兵种','战争','军力','武力','军队','军事设定']],
  ['world','economy',['经济','货币','物价','商贸','商业','资源','物产','贸易','交易','经济体系']],
  ['world','culture',['文化','风俗','习俗','艺术','思想','人文','节日','节庆','文化思想']],
  ['world','religion',['宗教','信仰','神系','神明','教会','祭祀','神祇','宗教体系']],
  ['world','race',['种族','族群','民族','血脉','血统','族裔','异族','部落','氏族']],
  ['world','lang',['语言','称谓','用语','称呼','敬语','文字','语言体系']],
  ['world','daily',['日常','日常生活','生活','衣食住行','生活习俗','风土人情']],
  ['world','tech',['科技','技术','工业','工艺','生产力','器械','锻锤']],
  ['world','super',['超自然','超自然规则','异类','神秘','妖魔','鬼怪','妖物','神秘侧','灵脉','地脉','灵气']],
  ['world','origin',['起源','创世','神话','世界起源','创世神话','世界诞生']],
  ['world','era',['时代','时代背景','背景','文明','发展阶段']],
  ['power','general',['力量总纲','力量体系总纲','力量本源','基础力量','力量来源','力量设定','总纲设定']],
  ['power','branch',['力量体系','修炼体系','修行体系','修炼','修行','功法','法门','流派','职业','能力体系','力量分支','传承体系']],
  ['power','realm',['境界','境界等级','修为','境界体系','境界划分','等级体系','层次体系']],
  ['history','event',['历史','历史年表','年表','大事记','历史事件','编年','时间线','编年史','历史线']],
  ['history','calendar',['历法','纪年','纪元','年号','日历','历制']],
  ['global',['全局规则','全局约束','规则','禁忌','铁律','硬性设定','总则','写作规则']]
];
const LORE_ALIAS_MAP=(()=>{ const m={}; LORE_ALIAS.forEach(r=>{ const [b,c,list]=r.length===3?r:[r[0],null,r[1]];
  (list||[]).forEach(k=>{ if(!m[k]) m[k]=[b,c]; }); }); return m; })();
const LORE_CAT_NAME={};
LORE_DEF.forEach(c=>LORE_CAT_NAME[c.id]=c.name);
LORE_CAT_NAME.general='力量总纲'; LORE_CAT_NAME.realm='境界词条'; LORE_CAT_NAME.branch='修炼分支';
LORE_CAT_NAME.calendar='历法纪年'; LORE_CAT_NAME.event='历史事件'; LORE_CAT_NAME.rule='全局规则';
/* 分类名 → 归属块：让用户直接拿界面上的分类名当前缀就能锁定 */
const LORE_CATNAME_MAP=(()=>{ const m={};
  const blkOf=id=>(id==='general'||id==='realm'||id==='branch')?'power'
    :(id==='event'||id==='calendar')?'history':(id==='rule')?'global':'world';
  Object.keys(LORE_CAT_NAME).forEach(id=>{ const n=LORE_CAT_NAME[id];
    if(!n) return; if(!m[n]) m[n]=[blkOf(id),id]; });
  /* 界面上另外出现过的写法，一并认 */
  m['境界']=m['境界']||['power','realm'];
  m['修炼分支']=m['修炼分支']||['power','branch'];
  m['基础力量总纲']=m['基础力量总纲']||['power','general'];
  m['历法纪年']=m['历法纪年']||['history','calendar'];
  return m; })();
function loreCatLabel(block,cat){ return (LORE_BLK_NAME[block]||block)+' › '+(LORE_CAT_NAME[cat]||cat); }

/* 取标题开头的分类提示：'【地理】xxx' / '地理·xxx' / '地理 - xxx' / '地理：xxx' */
function loreTitlePrefix(name){
  const s=String(name||'').trim();
  let m=s.match(/^[【\[（(]\s*([^】\]）)]{1,12}?)\s*[】\]）)]/);
  if(m) return m[1].trim();
  m=s.match(/^([^·:：\-—|/]{1,12}?)\s*[·:：\-—|/]\s*\S/);
  if(m) return m[1].trim();
  const bare=s.replace(/[\s【】\[\]（）()·:：\-—|/,]/g,'');
  if(LORE_CATNAME_MAP[bare]||LORE_ALIAS_MAP[bare]) return bare;
  return '';
}
function loreLenW(k){ const n=String(k).length; return n<=2?1:(n<=4?1.3:1.55); }
function loreGuessCat(name,content){
  const rawName=String(name||'');
  const title=rawName.toLowerCase();
  const body=String(content||'').slice(0,600).toLowerCase();
  const scores={};                                  // 'block|cat' → 分数
  const hits={};                                    // 命中的词，用于给出理由
  const add=(block,cat,v,why)=>{
    const k=block+'|'+cat;
    scores[k]=(scores[k]||0)+v;
    (hits[k]=hits[k]||[]).push(why);
  };
  const uniq=(arr,text)=>{
    const seen=new Set(), out=[];
    arr.forEach(k=>{ const kk=String(k).toLowerCase();
      if(!kk||seen.has(kk)) return;
      if(text.indexOf(kk)>=0){ seen.add(kk); out.push(k); } });
    return out;
  };
  /* ② 特征词典 */
  Object.keys(LORE_LEX).forEach(cat=>{
    const lex=LORE_LEX[cat];
    const block = (cat==='general'||cat==='realm'||cat==='branch')?'power'
                : (cat==='event'||cat==='calendar')?'history'
                : (cat==='rule')?'global':'world';
    uniq(lex.strong||[],title).forEach(k=>add(block,cat,14*loreLenW(k),'标题强特征「'+k+'」'));
    uniq(lex.weak  ||[],title).forEach(k=>add(block,cat, 6*loreLenW(k),'标题含「'+k+'」'));
    uniq(lex.strong||[],body ).forEach(k=>add(block,cat,3.2*loreLenW(k),'正文强特征「'+k+'」'));
    uniq(lex.weak  ||[],body ).forEach(k=>add(block,cat,1.0*loreLenW(k),'正文含「'+k+'」'));
  });
  /* ③ 语义正则 */
  const titleRe=(re,w,block,cat,why)=>{ if(re.test(title)) add(block,cat,w,why); };
  const bodyRe =(re,w,block,cat,why)=>{ if(re.test(body )) add(block,cat,w,why); };
  const YEAR=/(?:[一二三四五六七八九十百千万零〇两]{1,6}|\d{1,4})\s*年/;
  titleRe(YEAR,5,'history','event','标题含年份/纪年');
  bodyRe (YEAR,2.5,'history','event','正文含年份/纪年');
  bodyRe(/(?:战争|起兵|叛乱|政变|灾|浩劫|覆灭|灭亡|中兴|起义)/,2.2,'history','event','正文含历史事件叙述');
  titleRe(/(?:境界|修为|晋升|突破|瓶颈|功法|修炼|修行|法术|术法|灵气|灵力|术国|道途|剑典|心法)/,7,'power','realm','标题为修炼/境界主题');
  titleRe(/(?:总纲|本源|代价|副作用|反噬|限制)/,6,'power','general','标题为力量总纲主题');
  titleRe(/(?:术士|法师|剑修|武修|体修|巫术|炼金|驭兽)/,6,'power','branch','标题为修炼分支主题');
  titleRe(/(?:历法|纪年|年号|纪元)/,6,'history','calendar','标题为历法纪年主题');
  titleRe(/(?:之盟|之约|之乱|之战|之变|之祸|之劫|事变|起义|叛乱)/,6,'history','event','标题为历史事件主题');
  titleRe(/(?:禁令|铁律|不得|禁止|硬性)/,6,'global','rule','标题为全局约束主题');
  titleRe(/(?:部落|氏族|族裔|诸部)/,6,'world','race','标题为族群主题');
  titleRe(/(?:货币|物价|价格|税收|商路|赋税)/,5,'world','economy','标题为经济主题');
  titleRe(/(?:都城|城邦|山脉|河流|岛屿|平原|高原|沙漠|港口|航路|疆|域)/,5,'world','geo','标题为地理主题');
  titleRe(/(?:信仰|神明|神灵|教派|教会|教义|祭祀|神祇)/,5,'world','religion','标题为宗教主题');
  titleRe(/(?:习俗|风俗|传统|艺术|文化|清谈|风气)/,5,'world','culture','标题为文化主题');
  titleRe(/(?:科技|技术|工艺|器械|生产力)/,5,'world','tech','标题为技术主题');
  titleRe(/(?:日常|生活|饮食|服饰|一日|起居)/,5,'world','daily','标题为日常主题');
  titleRe(/(?:气候|季节|天象|风期|雨季|旱季)/,5,'world','climate','标题为气候主题');
  titleRe(/(?:军事|军队|兵种|军规|战术|军备)/,5,'world','military','标题为军事主题');
  titleRe(/(?:制度|官制|官职|爵位|律法|朝廷|政体)/,5,'world','politics','标题为政治制度主题');
  titleRe(/(?:起源|创世|诞生|神话)/,5,'world','origin','标题为世界起源主题');
  titleRe(/(?:超自然|灵脉|地脉|灵力|灵气|诅咒|妖族|鬼物)/,5,'world','super','标题为超自然主题');
  bodyRe (/(?:境界|修为|晋升|突破|瓶颈|凝聚|功法|修炼|打坐|真气|内力)/,2.0,'power','realm','正文含修炼/境界叙述');
  bodyRe (/(?:代价|副作用|反噬|透支|限制条件|以寿命)/,2.2,'power','general','正文含代价/限制叙述');
  bodyRe (/(?:货币|铜钱|银两|物价|赋税|交易)/,2.0,'world','economy','正文含经济叙述');
  bodyRe (/(?:官职|爵位|律法|朝廷|贵族|阶层)/,2.0,'world','politics','正文含政治叙述');
  bodyRe (/(?:军队|兵种|骑兵|军团|将领|城防)/,2.0,'world','military','正文含军事叙述');
  bodyRe (/(?:山脉|河流|海域|岛屿|城邦|都城|港口|平原)/,2.0,'world','geo','正文含地理叙述');
  bodyRe (/(?:部落|氏族|血脉|族群|游牧)/,2.0,'world','race','正文含族群叙述');
  bodyRe (/(?:神明|教会|信仰|祭祀|神职|祭司)/,2.0,'world','religion','正文含宗教叙述');
  /* ① 标题别名：最高优先，直接锁定 */
  const pre=loreTitlePrefix(rawName);
  /* 优先级：分类名（界面里看到的写法）≥ 别名表 */
  const alias=pre?(LORE_CATNAME_MAP[pre]||LORE_ALIAS_MAP[pre]||null):null;
  /* 汇总 */
  let best=null, second=null;
  Object.keys(scores).forEach(k=>{
    const o={k,block:k.split('|')[0],cat:k.split('|')[1],s:scores[k],why:hits[k]};
    if(!best||o.s>best.s){ second=best; best=o; }
    else if(!second||o.s>second.s) second=o;
  });
  if(alias){
    const b=alias[0];
    const c=alias[1]||(b==='power'?'branch':b==='history'?'event':b==='global'?'rule':'era');
    return {block:b,cat:c,conf:'high',low:false,
      why:'标题提示「'+pre+'」→ '+loreCatLabel(b,c),score:99,prefix:pre};
  }
  /* 标题以某分类名开头 → 给该分类额外加权（不如锁定那么硬） */
  Object.keys(LORE_ALIAS_MAP).forEach(k=>{
    if(k.length<2||title.indexOf(k)!==0) return;
    const a=LORE_ALIAS_MAP[k]; if(!a) return;
    const b=a[0]; const c=a[1]||(b==='power'?'branch':b==='history'?'event':b==='global'?'rule':'era');
    add(b,c,5,'标题以「'+k+'」开头');
  });
      if(!best) return {block:'world',cat:'era',conf:'low',low:true,why:'未识别到明确主题',score:0};
  const gap = best.s/Math.max(1,(second?second.s:0));
  let conf = (best.s>=12 && gap>=1.45) ? 'high' : (best.s>=5 && gap>=1.12) ? 'mid' : 'low';
  /* 关键：即使分低也返回最优分类（标为待确认），不要丢回默认的「时代背景」 */
  return {block:best.block,cat:best.cat,conf:conf,low:conf==='low',score:Math.round(best.s*10)/10,
    why:(best.why||[]).slice(0,3).join(' + ')||('累计得分 '+Math.round(best.s)),
    alt:second?{block:second.block,cat:second.cat,score:Math.round(second.s*10)/10}:null};
}
/* ---------------- 跨块搬运：把分类结果真正落到四大块 ---------------- */
function lorePlainText(o){
  if(!o||typeof o!=='object') return '';
  if(typeof o.content==='string'&&o.content.trim()) return o.content;
  if(o.cap!=null||o.feat!=null){                            /* 境界条目 */
    const cap=String(o.cap||'').trim(), feat=String(o.feat||'').trim(),
          cond=String(o.cond||'').trim(), weak=String(o.weak||'').trim();
    if(feat&&!cap&&!cond&&!weak) return feat;               /* 只有正文时不加多余前缀 */
    const seg=[];
    if(cap)  seg.push('能力上限：'+cap);
    if(feat) seg.push('特征：'+feat);
    if(cond) seg.push('晋升条件：'+cond);
    if(weak) seg.push('弱点：'+weak);
    return seg.join('\n');
  }
  if(o.desc!=null){                                         /* 历史事件 */
    const time=String(o.time||'').trim(), desc=String(o.desc||'').trim(), effect=String(o.effect||'').trim();
    if(desc&&!time&&!effect) return desc;
    const seg=[];
    if(time)   seg.push('时间：'+time);
    if(desc)   seg.push(desc);
    if(effect) seg.push('长远影响：'+effect);
    return seg.join('\n');
  }
  return '';
}
/* 在四大块里按 id 找条目 */
function loreFindAny(id){
  const L=ensureLore();
  let o=null;
  o=L.w.find(x=>x.id===id);            if(o) return {o,scope:'w',block:'world',cat:o.cat||''};
  o=L.pw.branches.find(x=>x.id===id);  if(o) return {o,scope:'branch',block:'power',cat:'branch'};
  o=L.pw.realms.find(x=>x.id===id);    if(o) return {o,scope:'realm',block:'power',cat:'realm'};
  o=L.hi.events.find(x=>x.id===id);    if(o) return {o,scope:'ev',block:'history',cat:'event'};
  return null;
}
function loreRemoveAny(id){
  const L=ensureLore();
  L.w=L.w.filter(x=>x.id!==id);
  L.pw.branches=L.pw.branches.filter(x=>x.id!==id);
  L.pw.realms=L.pw.realms.filter(x=>x.id!==id);
  L.hi.events=L.hi.events.filter(x=>x.id!==id);
}
/* 把已有条目搬到新的 (block,cat)；保留原有触发设置与备注。
   返回 true=搬了， false=已经是那个分类（无需动）， 'dup'=目标分类已有同名条目 */
function loreRelocate(id,block,cat){
  const L=ensureLore();
  const f=loreFindAny(id);
  if(!f) return false;
  if(f.block===block){
    if(block==='world'){ if(f.o.cat===cat) return false; f.o.cat=cat; f.o._conf='manual'; return true; }
    if(block==='power'&&((f.cat==='branch'&&cat==='branch')||(f.cat==='realm'&&cat==='realm'))) return false;
    if(block==='history'&&cat==='event') return false;
  }
  const text=lorePlainText(f.o);
  const name=f.o.name||f.o.comment||'未命名';
  const base={id:f.o.id, name,note:f.o.note||'',real:!!f.o.real,enabled:f.o.enabled!==false,_conf:'manual',_auto:false};
  /* 保留原有的世界书触发设置（无论原条目在哪个块） */
  ['keys','secondary','constant','selective','selectiveLogic','caseSensitive','matchWholeWords',
   'scanDepth','vectorized','probability','useProbability','order','position','depth','role',
   'include','exclude','group','groupWeight','groupOverride','sticky','cooldown','delay',
   'excludeRecursion','preventRecursion','delayUntilRecursion','_hit','_auto'].forEach(k=>{
    if(f.o[k]!==undefined) base[k]=f.o[k];
  });
  if(block==='world'){
    if(!L.cats.some(c=>c.id===cat)) cat=(L.cats[0]||{}).id;
    if(L.w.some(x=>String(x.name||'').trim()===name&&x.id!==id)) return 'dup';
    loreRemoveAny(id);
    L.w.push(wbFix(Object.assign(base,{block:'world',cat,content:text,keys:base.keys||[],secondary:base.secondary||[]})));
    return true;
  }
  if(block==='power'){
    if(cat==='general'){ L.pw.general=(L.pw.general?L.pw.general+'\n':'')+text; loreRemoveAny(id); return true; }
    if(cat==='realm'){
      if(L.pw.realms.some(x=>String(x.name||'').trim()===name&&x.id!==id)) return 'dup';
      const old=f.scope==='realm'?f.o:{};
      loreRemoveAny(id);
      L.pw.realms.push(Object.assign(base,{cap:old.cap||'',feat:old.feat||text,cond:old.cond||'',weak:old.weak||''}));
      return true;
    }
    if(L.pw.branches.some(x=>String(x.name||'').trim()===name&&x.id!==id)) return 'dup';
    loreRemoveAny(id);
    L.pw.branches.push(wbFix(Object.assign(base,{content:text})));
    return true;
  }
  if(block==='history'){
    if(cat==='calendar'){ L.hi.cal=(L.hi.cal?L.hi.cal+'\n':'')+(name?('◆ '+name+'\n'):'')+text; loreRemoveAny(id); return true; }
    if(L.hi.events.some(x=>String(x.name||'').trim()===name&&x.id!==id)) return 'dup';
    const old=f.scope==='ev'?f.o:{};
    loreRemoveAny(id);
    L.hi.events.push(wbFix(Object.assign(base,{time:old.time||'',desc:old.desc||text,effect:old.effect||''})));
    return true;
  }
  L.gl.extra=(L.gl.extra?L.gl.extra+'\n':'')+(name?('◆ '+name+'\n'):'')+text;
  loreRemoveAny(id);
  return true;
}
/* 列出四大块里的全部条目（供细分类与复核使用） */
function loreAllEntries(){
  const L=ensureLore();
  const out=[];
  L.w.forEach(e=>out.push({o:e,block:'world',cat:e.cat||''}));
  L.pw.branches.forEach(e=>out.push({o:e,block:'power',cat:'branch'}));
  L.pw.realms.forEach(e=>out.push({o:e,block:'power',cat:'realm'}));
  L.hi.events.forEach(e=>out.push({o:e,block:'history',cat:'event'}));
  return out;
}
function loreSplitRawText(text){
  const blocks=String(text||'').split(/\n\s*\n+/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  const push=b=>{
    b=String(b).trim(); if(!b) return;
    const first=(b.split('\n')[0]||'').replace(/^[#\-*\s]+/,'').trim();
    out.push({name:(first||b).slice(0,30),content:b});
  };
  const chop=b=>{                       // 过长：按行攒块，单行过长再按字硬切
    let cur='';
    String(b).split('\n').forEach(line=>{
      if(line.length>600){
        if(cur.trim()){ push(cur); cur=''; }
        for(let i=0;i<line.length;i+=600) push(line.slice(i,i+600));
        return;
      }
      if((cur+line).length>600&&cur.trim()){ push(cur); cur=''; }
      cur+=line+'\n';
    });
    if(cur.trim()) push(cur);
  };
  blocks.forEach(b=> b.length<=800 ? push(b) : chop(b));
  return out;
}
function loreClassifyFlow(){
  const L=ensureLore();
  const all=loreAllEntries().filter(x=>String(lorePlainText(x.o)||'').trim());
  const auto=all.filter(x=>x.o._conf&&x.o._conf!=='high'&&x.o._conf!=='restored').length;
  openDlg('<h3>✦ 智能细分 / 归类</h3>'
    +'<div class="hint">把条目重新归入四大模块与对应分类。导入世界书时已自动归类，这里用来复核与调整。</div>'
    +'<label>数据来源</label>'
    +'<select id="clsSrc">'
    +'<option value="auto"'+(auto?' selected':'')+(auto?'':' disabled')+'>待确认的条目（'+auto+' 条）</option>'
    +'<option value="all"'+(auto?'':' selected')+'>全部条目（'+all.length+' 条）</option>'
    +'<option value="paste">粘贴文本（新建条目）</option>'
    +'</select>'
    +'<div id="clsPasteBox" style="display:none">'
    +'<label>粘贴设定文本（每条之间空一行）</label>'
    +'<textarea id="clsText" style="min-height:180px" placeholder="把整段世界观资料粘进来，每条之间空一行。"></textarea></div>'
    +'<div class="hint" style="margin-top:10px">'
    +'<b>规则细分</b>：不消耗 API、立即出结果（标题提示 + 特征词典 + 语义句式）。<br>'
    +'<b>✦ AI 细分</b>：更准，适合标题看不出主题的条目（如「天枢阁」）。</div>',
    [{label:'取消'},
     {label:'不调 AI · 规则归类',fn:()=>{ const src=loreClsSrc(); if(src===false) return false; setTimeout(()=>loreClassify(src,false),60); return true; }},
     {label:'✦ AI 细分',cls:'primary',fn:()=>{ const src=loreClsSrc(); if(src===false) return false; setTimeout(()=>loreClassify(src,true),60); return true; }}]);
  setTimeout(()=>{
    const sel=$('#clsSrc'); if(!sel) return;
    const up=()=>{ const b=$('#clsPasteBox'); if(b) b.style.display=(sel.value==='paste')?'':'none'; };
    sel.onchange=up; up();
  },60);
}
function loreClsSrc(){
  const sel=$('#clsSrc');
  const v=(sel&&sel.value)||'auto';
  if(v==='paste'){
    const t=($('#clsText')||{}).value||'';
    if(!t.trim()){ toast('请先粘贴文本'); return false; }
    return t;
  }
  return v;
}
function loreClassify(src,useAI){
  const L=ensureLore();
  let items;
  if(src==='auto'||src==='all'){
    const all=loreAllEntries();
    const arr = (src==='auto')
      ? all.filter(x=>x.o._conf&&x.o._conf!=='high'&&x.o._conf!=='restored'&&String(lorePlainText(x.o)||'').trim())
      : all.filter(x=>String(lorePlainText(x.o)||'').trim());
    items=arr.map(x=>({id:x.o.id,name:x.o.name||x.o.comment||'',content:lorePlainText(x.o),
      note:x.o.note||'',real:!!x.o.real,block:x.block,cat:x.cat,
      conf:x.o._conf||'',why:x.o._why||''}));
  } else {
    items=loreSplitRawText(src).map(x=>({id:'',name:x.name,content:x.content,note:'',real:false,block:'',cat:'',conf:'',why:''}));
  }
  if(!items.length){ toast(src==='auto'?'没有待确认的条目了（可改用「全部条目」）':'没有需要细分的条目'); return; }
  if(!useAI){
    loreClsPreview(items.map(it=>{
      if(it.id) return {id:it.id,name:it.name,content:it.content,note:it.note,real:it.real,
        block:it.block||'world',cat:it.cat||'',conf:it.conf,why:it.why,low:it.conf==='low'};
      const g=loreGuessCat(it.name,it.content);
      return {id:'',name:it.name,content:it.content,note:'',real:false,block:g.block,cat:g.cat,
        conf:g.conf,why:g.why,low:g.conf==='low'};
    }));
    return;
  }
  (async()=>{
    setBusy(true,'AI 正在细分 '+items.length+' 条设定…');
    try{
      const all=[];
      const BATCH=10;
      for(let i=0;i<items.length;i+=BATCH){
        const chunk=items.slice(i,i+BATCH);
        setBusy(true,'AI 正在细分（'+(i+1)+'-'+Math.min(items.length,i+BATCH)+' / '+items.length+'）…');
        const got=await loreClassifyBatch(chunk);
        got.forEach(x=>{
          const idx=Number(x&&x.src);
          const s0=chunk[idx]||chunk[0]||{};
          all.push({
            id:s0.id||'',
            name:String((x&&x.name)||s0.name||'未命名').slice(0,30),
            content:String((x&&x.content)||s0.content||''),
            note:String((x&&x.note)||s0.note||''),
            real:(x&&x.real!=null)?!!x.real:!!s0.real,
            block:['world','power','history','global'].indexOf(x&&x.block)>=0?x.block:(s0.block||'world'),
            cat:String((x&&x.cat)||s0.cat||''),
            conf:'ai', why:'AI 判定', low:false
          });
        });
      }
      if(!all.length) throw new Error('没有解析到结果');
      setBusy(false);
      loreClsPreview(all);
    }catch(e){ setBusy(false); toast('AI 细分失败：'+e.message+'（可改用「规则细分」）'); }
  })();
}
async function loreClassifyBatch(items){
  const L=ensureLore();
  const catNames=L.cats.map(c=>c.name+'('+c.id+')').join('、');
  const user='【世界观细分】\n作者有一批零散的设定文本，请把每一条归入下面四大模块并给出分类。一条原始文本允许拆成最多 3 条。\n\n'
    +'四大模块 block：\n'
    +'- world：世界观大类设定（世界背景、地理、政治、经济、文化等）\n'
    +'- power：力量 / 修炼体系（力量本源、修炼分支、境界等级）\n'
    +'- history：历史年表与时间线（历史事件、纪年历法）\n'
    +'- global：全局约束（写作时必须遵守的硬性规则，例如“不得战力崩坏”）\n\n'
    +'当 block=world 时，cat 只能取以下之一（填 id）：'+catNames+'\n'
    +'当 block=power 时，cat 只能取：general（基础力量总纲）、branch（修炼/能力分支）、realm（境界）\n'
    +'当 block=history 时，cat 只能取：event（历史事件）、calendar（纪年与历法）\n'
    +'当 block=global 时，cat 只能取：rule\n\n'
    +'输出格式（每条一个对象）：\n'
    +'{"src": 原始文本序号, "block":"", "cat":"", "name":"简短条目名（不超16字）", "content":"整理后的设定内容（保留全部关键信息，去掉口语与重复）", "note":"给 AI 的解读限制，没有就空字符串", "real": true/false}\n'
    +'real=true 表示这条设定参考现实世界规律；false 表示完全架空。\n'
    +'只输出 JSON 数组，不要解释、不要代码块标记。\n\n'
    +'【待细分文本】\n'
    +items.map((it,i)=>'['+i+'] '+(it.name||'')+'\n'+String(it.content||'').slice(0,700)).join('\n\n');
  const arr=parseLoose(await chat([{role:'system',content:LORE_AI_SYS},{role:'user',content:user}]));
  return Array.isArray(arr)?arr:[];
}
function loreClsPreview(list){
  const L=ensureLore();
  const blkName=LORE_BLK_NAME;
  const blkOpts=sel=>['world','power','history','global'].map(b=>'<option value="'+b+'"'+(sel===b?' selected':'')+'>'+blkName[b]+'</option>').join('');
  const catOpts=(blk,sel)=>{
    if(blk==='world') return L.cats.map(c=>'<option value="'+c.id+'"'+(sel===c.id?' selected':'')+'>'+esc(c.name)+'</option>').join('');
    if(blk==='power') return [['general','基础力量总纲'],['branch','修炼分支'],['realm','境界']].map(x=>'<option value="'+x[0]+'"'+(sel===x[0]?' selected':'')+'>'+x[1]+'</option>').join('');
    if(blk==='history') return [['event','历史事件'],['calendar','纪年与历法']].map(x=>'<option value="'+x[0]+'"'+(sel===x[0]?' selected':'')+'>'+x[1]+'</option>').join('');
    return '<option value="rule" selected>全局规则</option>';
  };
  const rows=list.map((x,i)=>{
    const blk=blkName[x.block]?x.block:'world';
    const cat=(blk==='world'&&!L.cats.some(c=>c.id===x.cat))?'era':x.cat;
    const confBadge = x.conf==='ai'? '<span class="badge ok">AI</span>'
      : x.conf==='manual'? '<span class="badge">手动</span>'
      : x.conf==='high'? '<span class="badge ok">高可信</span>'
      : x.conf==='mid'? '<span class="badge">中</span>'
      : '<span class="badge warn">待确认</span>';
    return '<div class="clsrow" data-i="'+i+'" data-id="'+(x.id||'')+'">'
      +'<input type="checkbox" checked data-on>'
      +'<div class="txt"><div class="t1">'+esc(x.name||'（无标题）')
      +(x.id?' <span class="badge">已有条目 · 改分类会搬过去</span>':' <span class="badge ok">新建</span>')
      +' '+confBadge+'</div>'
      +'<div class="t2">'+esc(String(x.content||'').slice(0,150))+'</div>'
      +((x.why&&x.conf!=='manual')?('<div class="t3">依据：'+esc(x.why)+'</div>'):'')
      +'</div>'
      +'<div class="toolbar" style="margin:0">'
      +'<select data-blk>'+blkOpts(blk)+'</select>'
      +'<select data-cat>'+catOpts(blk,cat)+'</select>'
      +'</div></div>';
  }).join('');
  const nLow=list.filter(x=>x.conf==='low').length;
  const nHigh=list.filter(x=>x.conf==='high').length;
  const nAi=list.filter(x=>x.conf==='ai').length;
  openDlg('<h3>✦ 细分 / 归类预览</h3>'
    +'<div class="hint">共 '+list.length+' 条。可勾选要应用的条目，并逐条修改归入的模块与分类。'
    +(nHigh||nAi||nLow?('高可信 '+(nHigh+nAi)+' ｜ <b>待确认 '+nLow+'</b> ｜ '):'')
    +'已有条目改到别的模块会「搬过去」（保留备注与触发设置）；同名条目会自动跳过，不覆盖你已写好的内容。</div>'
    +'<div style="max-height:46vh;overflow:auto;margin-top:8px">'+rows+'</div>',
    [{label:'取消'},
     {label:'确认导入',cls:'primary',fn:()=>{ loreClsApply(); return true; }}]);
  setTimeout(()=>{
    const b=$('#dlgBody'); if(!b) return;
    b._cls=list;
    b.querySelectorAll('.clsrow').forEach(row=>{
      const blk=row.querySelector('[data-blk]'), cat=row.querySelector('[data-cat]');
      if(!blk||!cat) return;
      blk.onchange=()=>{ cat.innerHTML=catOpts(blk.value, blk.value==='world'?((L.cats[0]||{}).id||'era'):(blk.value==='power'?'realm':'event')); };
    });
  },60);
}
function loreClsApply(){
  const b=$('#dlgBody'); const list=(b&&b._cls)||[];
  const picked=[], upd=[];
  b.querySelectorAll('.clsrow').forEach(row=>{
    const x=list[+row.dataset.i]; if(!x) return;
    const on=row.querySelector('[data-on]'); if(on&&!on.checked) return;
    x.block=row.querySelector('[data-blk]').value;
    x.cat=row.querySelector('[data-cat]').value;
    if(x.id) upd.push(x); else picked.push(x);
  });
  if(!picked.length&&!upd.length){ toast('没有勾选任何条目'); return; }
  let moved=0, same=0, dup=0;
  upd.forEach(x=>{
    const r=loreRelocate(x.id, x.block, x.cat);
    if(r===true) moved++;
    else if(r==='dup') dup++;
    else same++;
  });
  const r=picked.length?loreApply(picked):{nw:0,np:0,nh:0,ng:0,skip:0};
  save(); renderLore();
  toast('归类完成：搬运 '+moved+' 条'+(same?(' · 已就位 '+same):'')+(dup?(' · 目标同名 '+dup):'')
    +' · 新建 世界观 '+r.nw+' / 力量 '+r.np+' / 历史 '+r.nh+' / 规则 '+r.ng+(r.skip?('（跳过同名 '+r.skip+'）'):''));
}
function loreApply(list){
  const L=ensureLore();
  const same=(s,t)=>String(s||'').trim()===String(t||'').trim();
  let nw=0,np=0,nh=0,ng=0,skip=0;
  list.forEach(x=>{
    const name=String(x.name||'').trim(), content=String(x.content||'').trim();
    if(!content&&!name) return;
    if(x.block==='world'){
      const cat=L.cats.find(c=>c.id===x.cat)||L.cats.find(c=>c.name===x.cat)||L.cats[0];
      if(L.w.some(e=>same(e.name,name))){ skip++; return; }
      L.w.push(wbFix({id:uid(),cat:cat.id,name:name||'未命名',content:content,note:String(x.note||''),
        real:!!x.real,enabled:true,block:'world',keys:[],secondary:[],constant:true,order:100,
        position:0,depth:4,role:0,probability:100,useProbability:true,selective:true,selectiveLogic:0,
        caseSensitive:false,matchWholeWords:false,vectorized:false,scanDepth:null,
        group:'',groupWeight:100,groupOverride:false,sticky:0,cooldown:0,delay:0,
        excludeRecursion:false,preventRecursion:false,delayUntilRecursion:0,_auto:false,_hit:[]}));
      nw++;
    } else if(x.block==='power'){
      if(x.cat==='general'){
        L.pw.general=(L.pw.general?L.pw.general+'\n':'')+(name?('◆ '+name+'\n'):'')+content; np++;
      } else if(x.cat==='branch'){
        if(L.pw.branches.some(b=>same(b.name,name))){ skip++; return; }
        L.pw.branches.push(wbFix({id:uid(),name:name||'未命名分支',content:content,note:String(x.note||''),enabled:true})); np++;
      } else {
        if(L.pw.realms.some(r=>same(r.name,name))){ skip++; return; }
        L.pw.realms.push({id:uid(),name:name||'未命名境界',cap:'',feat:content,cond:'',weak:'',note:String(x.note||''),enabled:true}); np++;
      }
    } else if(x.block==='history'){
      if(x.cat==='calendar'){ L.hi.cal=(L.hi.cal?L.hi.cal+'\n':'')+(name?('◆ '+name+'\n'):'')+content; nh++; }
      else {
        if(L.hi.events.some(e=>same(e.name,name))){ skip++; return; }
        L.hi.events.push(wbFix({id:uid(),name:name||'未命名事件',time:'',desc:content,effect:'',note:String(x.note||''),real:!!x.real,enabled:true})); nh++;
      }
    } else {
      L.gl.extra=(L.gl.extra?L.gl.extra+'\n':'')+(name?('◆ '+name+'\n'):'')+content; ng++;
    }
  });
  save();
  return {nw,np,nh,ng,skip};
}
/* 导入报告已改由 worldbook.js 的 wbReport() 承担（带分类分布与待确认清单） */

/* ---------------- 导入 / 导出设定库 ---------------- */
function loreExport(){
  const L=ensureLore();
  download(dwFileName(state.meta.title||'世界设定')+'.设定库.json',
    JSON.stringify({_type:'mo-yan-lore',version:1,title:state.meta.title||'',exported:Date.now(),lore:L},null,2),
    'application/json');
  toast('已导出世界观设定库');
}
function loreImportFile(f){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const j=JSON.parse(r.result);
      const d=(j&&j.lore)?j.lore:j;
      if(!d||typeof d!=='object'||(!d.w&&!d.pw&&!d.hi&&!d.gl&&!d.cats)) throw new Error('这不像是世界观设定库文件');
      if(!confirm('将把文件中的设定库并入当前作品（同名条目自动跳过，不会覆盖已有内容），继续？')) return;
      loreMergeInto(d);
      save(); renderLore();
      toast('已导入世界观设定库');
    }catch(e){ toast('导入失败：'+e.message); }
  };
  r.readAsText(f,'utf-8');
}
function loreMergeInto(d){
  const L=ensureLore();
  const same=(s,t)=>String(s||'').trim()===String(t||'').trim();
  if(Array.isArray(d.cats)) d.cats.forEach(c=>{
    if(c&&c.id&&!L.cats.some(x=>x.id===c.id)) L.cats.push({id:c.id,name:c.name||c.id,hint:c.hint||'',builtin:false});
  });
  if(Array.isArray(d.w)) d.w.forEach(e=>{
    if(!e||!e.name) return;
    if(L.w.some(x=>same(x.name,e.name)&&same(x.cat,e.cat))) return;
    L.w.push({id:uid(),cat:(L.cats.some(c=>c.id===e.cat)?e.cat:L.cats[0].id),name:e.name,content:String(e.content||''),
      note:String(e.note||''),real:!!e.real,enabled:e.enabled!==false});
  });
  if(d.pw){
    if(d.pw.general) L.pw.general=(L.pw.general?L.pw.general+'\n':'')+d.pw.general;
    if(d.pw.gnote) L.pw.gnote=(L.pw.gnote?L.pw.gnote+'\n':'')+d.pw.gnote;
    (d.pw.branches||[]).forEach(b=>{ if(!b||!b.name) return;
      if(L.pw.branches.some(x=>same(x.name,b.name))) return;
      L.pw.branches.push({id:uid(),name:b.name,content:String(b.content||''),note:String(b.note||''),enabled:b.enabled!==false}); });
    (d.pw.realms||[]).forEach(r=>{ if(!r||!r.name) return;
      if(L.pw.realms.some(x=>same(x.name,r.name))) return;
      L.pw.realms.push({id:uid(),name:r.name,cap:String(r.cap||''),feat:String(r.feat||''),cond:String(r.cond||''),
        weak:String(r.weak||''),note:String(r.note||''),enabled:r.enabled!==false}); });
  }
  if(d.hi){
    if(d.hi.cal) L.hi.cal=(L.hi.cal?L.hi.cal+'\n':'')+d.hi.cal;
    (d.hi.events||[]).forEach(e=>{ if(!e||(!e.name&&!e.desc)) return;
      if(L.hi.events.some(x=>same(x.name,e.name))) return;
      L.hi.events.push({id:uid(),name:String(e.name||''),time:String(e.time||''),desc:String(e.desc||''),
        effect:String(e.effect||''),note:String(e.note||''),real:!!e.real,enabled:e.enabled!==false}); });
  }
  if(d.gl){
    if(d.gl.master) L.gl.master=(L.gl.master?L.gl.master+'\n':'')+d.gl.master;
    if(d.gl.extra) L.gl.extra=(L.gl.extra?L.gl.extra+'\n':'')+d.gl.extra;
  }
}

/* ---------------- 初始化 ---------------- */
function initLoreUI(){
  loreBind();
  $$('.ltab').forEach(t=>{
    t.onclick=()=>{
      loreTab=t.dataset.ltab;
      renderLore();
    };
  });
  const on=$('#loreOn');
  if(on) on.onchange=()=>{ ensureLore().on=on.checked; save(); renderLore(); toast(on.checked?'世界观设定库已启用':'已关闭（不再注入设定）'); };
  const bi=$('#btnLoreImport'), fi=$('#fileLore');
  /* ⚠ 顺序很重要：必须先把 FileList 抓成真正的数组，再清空 input.value。
     input.files 是「活」的 FileList，value='' 会把它的 length 直接清成 0；
     写成「先存引用、后清空」，导入函数就永远收不到文件 —— 表现就是点了没反应。 */
  if(bi&&fi){ bi.onclick=()=>fi.click(); fi.onchange=e=>{ const fl=[].slice.call(e.target.files||[]); e.target.value=''; if(fl.length) loreImportFile(fl[0]); }; }
  const fw=$('#fileWB');
  if(fw) fw.onchange=e=>{ const fl=[].slice.call(e.target.files||[]); e.target.value=''; if(fl.length) wbImportFiles(fl); };
  const be=$('#btnLoreExport'); if(be) be.onclick=loreExport;
  const tabBtn=document.querySelector('.tab[data-tab="lore"]');
  if(tabBtn) tabBtn.addEventListener('click',()=>{ renderLore(); });
  renderLore();
}
