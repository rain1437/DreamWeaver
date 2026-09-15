/* =========================================================
   人物关系（Cast & Relations）
   ---------------------------------------------------------
   ① 叙事地位（9 级）：第一主角 / 对等双主角 / 第二主角 / 核心配角 / 重要配角 /
      普通配角 / 功能性NPC / 背景路人 / 传说人物——只看剧情权重，不看实力官职。
   ② 关系表：结构化的「谁和谁是什么关系」，可手填、可由 AI 梳理
   ③ 从正文梳理：只读「已编入目录」的正式章节，总结人物与关系
   ④ 关系核查：对照正式章节检查已录关系是否矛盾、是否有遗漏
   注入：关系网会随角色卡一起进 System Prompt，保证人物关系不崩
   ========================================================= */
const CAST_REL_TYPES=['亲属','夫妻','恋人','师徒','同门','挚友','同伴','同盟','上下级','主从','同僚','竞争','宿敌','仇敌','利用','交易','旧识','其他'];
const CAST_TYPE_ALIAS=[
  ['师徒','师徒'],['师父','师徒'],['弟子','师徒'],['师','师徒'],
  ['同门','同门'],['同宗','同门'],['同派','同门'],
  ['亲属','亲属'],['血亲','亲属'],['家族','亲属'],['亲','亲属'],['父','亲属'],['母','亲属'],
  ['兄','亲属'],['弟','亲属'],['姐','亲属'],['妹','亲属'],['子','亲属'],
  ['夫妻','夫妻'],['夫妇','夫妻'],['夫','夫妻'],['妻','夫妻'],['婚','夫妻'],
  ['恋人','恋人'],['爱慕','恋人'],['恋','恋人'],
  ['挚友','挚友'],['好友','挚友'],['朋友','挚友'],['友','挚友'],
  ['同伴','同伴'],['伙伴','同伴'],['搭档','同伴'],['同行','同伴'],
  ['同盟','同盟'],['盟友','同盟'],['盟','同盟'],
  ['上下级','上下级'],['上级','上下级'],['下属','上下级'],['上司','上下级'],
  ['主从','主从'],['主人','主从'],['属下','主从'],['仆','主从'],['侍','主从'],['主','主从'],
  ['同僚','同僚'],['同事','同僚'],
  ['竞争','竞争'],['对手','竞争'],['竞','竞争'],
  ['仇敌','仇敌'],['仇','仇敌'],['宿敌','宿敌'],['敌','宿敌'],
  ['利用','利用'],['操控','利用'],
  ['交易','交易'],['买卖','交易'],['雇佣','交易'],['雇','交易'],
  ['旧识','旧识'],['相识','旧识'],['旧','旧识'],['识','旧识']
];
/* 关系代号（面板里显示得紧凑一些） */
const CAST_TYPE_ICON={'亲属':'家','夫妻':'婚','恋人':'恋','师徒':'师','同门':'门','挚友':'友','同伴':'伴',
  '同盟':'盟','上下级':'属','主从':'仆','同僚':'僚','竞争':'争','宿敌':'敌','仇敌':'仇','利用':'用',
  '交易':'易','旧识':'识','其他':'·'};

/* ---------------- ① 数据层 ---------------- */
function ensureCast(){
  if(!state.cast||typeof state.cast!=='object'||Array.isArray(state.cast)) state.cast={rels:[],last:null};
  const C=state.cast;
  if(!Array.isArray(C.rels)) C.rels=[];
  C.rels.forEach(r=>{
    if(!r||typeof r!=='object') return;
    if(!r.id) r.id=uid();
    if(r.dir==null) r.dir=0; else r.dir=+r.dir||0;
    if(r.src==null) r.src='manual';
    if(r.conf==null) r.conf='';
    ['type','desc','note','labelA','labelB'].forEach(k=>{ if(typeof r[k]!=='string') r[k]=String(r[k]==null?'':r[k]); });
    if(!r.a) r.a=''; if(!r.b) r.b='';
    if(r.from!=null && !(Number(r.from)>0)) r.from=null;
    if(r.from!=null) r.from=Number(r.from);
    if(r.upd==null) r.upd=Date.now();
  });
  C.rels=C.rels.filter(r=>r&&r.a&&r.b);
  /* 自定义叙事地位档位（用户自定分类） */
  if(!Array.isArray(C.custom)) C.custom=[];
  if(!C.tierNames||typeof C.tierNames!=='object'||Array.isArray(C.tierNames)) C.tierNames={};
  return C;
}
function castNormType(t){
  const s=String(t||'').trim();
  if(!s) return '其他';
  if(CAST_REL_TYPES.indexOf(s)>=0) return s;
  for(let i=0;i<CAST_TYPE_ALIAS.length;i++){ if(s.indexOf(CAST_TYPE_ALIAS[i][0])>=0) return CAST_TYPE_ALIAS[i][1]; }
  return '其他';
}
function castNorm(s){
  return String(s||'').replace(/[\s　·・、,，.\-—_（）()【】\[\]:：;；“”"']/g,'').toLowerCase();
}
function castAliasList(c){
  const raw=String((c&&c.f&&c.f.basic&&c.f.basic.alias)||'');
  return raw.split(/[、,，\/|\s]+/).map(s=>castNorm(s)).filter(s=>s.length>=1);
}
function castFindChar(name){
  const n=castNorm(name); if(!n) return null;
  const cs=state.chars||[];
  let hit=cs.find(c=>c&&castNorm(c.name)===n); if(hit) return hit;
  hit=cs.find(c=>castAliasList(c).indexOf(n)>=0); if(hit) return hit;
  /* 退一步：一方包含另一方（「顾长庚」vs「顾长庚先生」） */
  hit=cs.find(c=>{
    if(!c) return false;
    const a=castNorm(c.name);
    return a.length>=2&&n.length>=2&&(a.indexOf(n)>=0||n.indexOf(a)>=0);
  });
  return hit||null;
}
function castNameOf(id){
  const c=(state.chars||[]).find(x=>x&&x.id===id);
  return c?String(c.name||'未命名'):'';
}
function castRelsOf(id){ return ensureCast().rels.filter(r=>r.a===id||r.b===id); }
function castRelWords(id){
  return castRelsOf(id).map(r=>{
    const other=castNameOf(r.a===id?r.b:r.a);
    return (r.type||'')+' '+other;
  }).join(' ').trim();
}
/* 社交中心：关系最多的几张卡 */
function castHubs(n){
  const cs=state.chars||[];
  return cs.map(c=>({c,n:castRelsOf(c.id).length}))
    .filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,n||5);
}

/* ---------------- ② 注入文本 ---------------- */
function castInjectText(idx){
  const list=(typeof activeCharsFor==='function')?activeCharsFor(idx):(state.chars||[]);
  if(!list.length) return '';
  const ids={}; list.forEach(c=>{ if(c&&c.id) ids[c.id]=1; });
  const rels=ensureCast().rels.filter(r=>ids[r.a]&&ids[r.b]);
  if(!rels.length) return '';
  const lines=rels.map(r=>{
    const A=castNameOf(r.a), B=castNameOf(r.b);
    if(!A||!B) return '';
    const core=r.type||'关系';
    const way=(r.dir===1)?(A+' → '+B):(r.dir===2)?(B+' → '+A):(A+' 与 '+B+' 是双向的');
    return '· '+way+'：'+core+(r.desc?('——'+r.desc):'');
  }).filter(Boolean);
  if(!lines.length) return '';
  return '【人物关系网】（必须严格遵守，不得写出与以下关系矛盾的内容）\n'+lines.join('\n');
}

/* ---------------- ③ 进度弹窗 ---------------- */
function castSleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function castProgOpen(title){
  try{ const d=$('#dlg'); if(d&&d.open) d.close(); }catch(e){}
  const html='<div class="item" style="padding:15px 17px">'
    +'<div style="font-weight:600;font-size:13.5px" id="castProgHead">'+esc(title)+'</div>'
    +'<div class="hint" style="margin:6px 0 0" id="castProgStep">准备中…</div>'
    +'<div class="gauge" style="height:12px;margin:11px 0"><i id="castProgBar" style="width:0%"></i></div>'
    +'<div id="castProgStat" style="font-size:12.5px;line-height:1.9"></div>'
    +'<div class="hint" style="margin-top:11px">完成后自动关闭并显示结果；可点「后台运行」继续用其它功能。</div>'
    +'</div>';
  try{ openDlg(html,[{label:'后台运行'}]); }catch(e){ console.warn('进度窗打开失败',e); }
}
function castProgSet(done,total,step,stats,label){
  const pct=Math.round(done/Math.max(1,total)*100);
  const b=$('#castProgBar'); if(b) b.style.width=pct+'%';
  const h=$('#castProgHead'); if(h) h.textContent=(label||'AI 正在梳理…')+'（'+done+' / '+total+' 批）';
  const s=$('#castProgStep'); if(s) s.textContent=step||'';
  const st=$('#castProgStat');
  if(st&&stats) st.innerHTML='新角色 <b>'+(stats.newChars||0)+'</b> ｜ 补充字段 '+(stats.updChars||0)
    +' ｜ 新关系 <b>'+(stats.newRels||0)+'</b>'+(stats.calls?(' ｜ 已调用模型 '+stats.calls+' 次'):'');
}
function castProgClose(){ try{ const d=$('#dlg'); if(d&&d.open) d.close(); }catch(e){} }
function castWithScroll(fn){
  const host=$('#charList');
  const tops=[]; let box=host?host.parentElement:null, guard=0;
  while(box&&guard++<12){
    try{ if(box.scrollHeight>box.clientHeight+4) tops.push([box,box.scrollTop]); }catch(e){}
    box=box.parentElement;
  }
  const de=document.scrollingElement||document.documentElement;
  const dt=de?de.scrollTop:0;
  try{ fn(); }finally{
    tops.forEach(([b,t])=>{ try{ b.scrollTop=t; }catch(e){} });
    if(de){ try{ de.scrollTop=dt; }catch(e){} }
  }
}

/* ---------------- ④ 正式章节来源 ---------------- */
/* 只有「已编入目录」的正式章节才参与梳理与核查 */
function castSources(opts){
  opts=opts||{};
  const arr=[];
  (state.outline||[]).forEach((ol,i)=>{
    const ch=state.chapters[i]||{};
    if(!(ch.committed&&ch.content&&String(ch.content).trim())) return;
    arr.push({i, title:String((ol&&ol.title)||ch.title||''), text:String(ch.content)});
  });
  const recent=+opts.recent||0;
  return recent>0? arr.slice(-recent) : arr;
}
function castChunk(list,budget){
  budget=budget||6000;
  const out=[]; let cur=[], n=0;
  list.forEach(c=>{
    let text=c.text, trimmed=false;
    if(text.length>budget){
      const head=Math.floor(budget*0.62), tail=budget-head;
      text=text.slice(0,head)+'\n……（本章过长，中间省略）……\n'+text.slice(-tail);
      trimmed=true;
    }
    const cost=text.length+90;
    if(n+cost>budget&&cur.length){ out.push(cur); cur=[]; n=0; }
    cur.push({i:c.i,title:c.title,text,trimmed});
    n+=cost;
  });
  if(cur.length) out.push(cur);
  return out;
}
function castBatchText(batch){
  return batch.map(c=>'【第'+(c.i+1)+'章《'+(c.title||'')+'》】'+(c.trimmed?'（本章过长，已取开头与结尾）':'')
    +'\n'+c.text).join('\n\n');
}

/* ---------------- ⑤ 合并 AI 结果 ---------------- */
const CAST_FILL_MAP=[['basic','org','org'],['look','face','look'],['person','core','person'],
  ['speech','tone','speech'],['power','skill','power'],['rel','others','rel'],['goal','goal','goal'],
  ['bg','past','bg']];
function castFillBlanks(c,x){
  let n=0;
  ensureCh(c);
  if(!String(c.f.basic.alias||'').trim()&&String(x.alias||'').trim()){ c.f.basic.alias=chClean(String(x.alias).trim(),c.name); n++; }
  CAST_FILL_MAP.forEach(p=>{
    const v=String(x[p[2]]||'').trim();
    if(!v) return;
    if(!c.f[p[0]]||String(c.f[p[0]][p[1]]||'').trim()) return;
    c.f[p[0]][p[1]]=chClean(v,c.name); n++;
  });
  if(c._fromCh==null&&Number(x.firstCh)>0) c._fromCh=Number(x.firstCh);
  if(String(x.why||'').trim()) c._why=String(x.why).trim().slice(0,120);
  return n;
}
function castNewAutoChar(x){
  const c={
    id:uid(), name:String(x.name||'').trim()||'未命名角色', avatar:'', enabled:true, from:1, to:9999,
    tags:[], note:'', f:chBlankF(), _book:[], _raw:{}, _clean:[],
    tier:'extra', tierAuto:true, _tierWhy:'AI 梳理时自动判定', _auto:true,
    _fromCh:Number(x.firstCh)>0?Number(x.firstCh):null, _why:''
  };
  ensureCh(c);
  castFillBlanks(c,x);
  return c;
}
function castMergeResult(j,stats){
  if(!j||typeof j!=='object') return;
  stats.newChars=stats.newChars||0; stats.updChars=stats.updChars||0;
  stats.newRels=stats.newRels||0; stats.dup=stats.dup||0;
  stats.missing=stats.missing||{}; stats.tiers=stats.tiers||{};
  const cs=Array.isArray(j.chars)?j.chars:[];
  const rs=Array.isArray(j.rels)?j.rels:[];
  const map={};
  /* ---- 人物 ---- */
  cs.forEach(x=>{
    if(!x||typeof x!=='object') return;
    const name=String(x.name||'').trim(); if(!name) return;
    let c=castFindChar(name);
    const aiTier=castTierNorm(x.tier,'extra');
    if(!c){
      c=castNewAutoChar(Object.assign({},x,{tier:aiTier}));
      c.tier=aiTier; c.tierAuto=true;
      (state.chars||[]).push(c);
      stats.newChars++;
      stats.tiers[aiTier]=(stats.tiers[aiTier]||0)+1;
    } else {
      const n=castFillBlanks(c,x);
      if(n) stats.updChars++;
      /* 定位：作者手工定过的、主角类、重要配角、自定义档——一律不擅改（只记建议） */
      const oldT=chTierOf(c);
      if(oldT!==aiTier){
        if(castTierLocked(c)){
          stats.tierKeep=stats.tierKeep||[];
          if(stats.tierKeep.length<60) stats.tierKeep.push({name:c.name,from:oldT,to:aiTier});
        } else {
          c.tier=aiTier; c.tierAuto=true;
        }
      }
    }
    map[castNorm(name)]=c;
    castAliasList(c).forEach(a=>{ map[a]=c; });
    map[castNorm(c.name)]=c;
  });
  const look=nm=>(map[castNorm(nm)]||castFindChar(nm));
  /* ---- 关系 ---- */
  const C=ensureCast();
  rs.forEach(r=>{
    if(!r||typeof r!=='object') return;
    const an=String(r.a||'').trim(), bn=String(r.b||'').trim();
    if(!an||!bn) return;
    if(castNorm(an)===castNorm(bn)) return;
    const A=look(an), B=look(bn);
    if(!A||!B){
      if(!A) stats.missing[an]=(stats.missing[an]||0)+1;
      if(!B) stats.missing[bn]=(stats.missing[bn]||0)+1;
      return;
    }
    /* 两个名字指到同一个人（姓名与别名），不是人物关系，丢弃 */
    if(A.id===B.id){ stats.selfSkip=(stats.selfSkip||0)+1; return; }
    const type=castNormType(r.type);
    const dir=(+r.dir===1||+r.dir===2)?+r.dir:0;
    const desc=String(r.desc||'').trim();
    const from=Number(r.ch)>0?Number(r.ch):null;
    const ex=C.rels.find(x=>((x.a===A.id&&x.b===B.id)||(x.a===B.id&&x.b===A.id))&&x.type===type);
    if(ex){
      if(!ex.desc&&desc) ex.desc=desc;
      if(ex.from==null&&from) ex.from=from;
      ex.upd=Date.now();
      stats.dup++;
      return;
    }
    C.rels.push({id:uid(),a:A.id,b:B.id,type,dir,desc,from,src:'ai',conf:'',
      labelA:'',labelB:'',note:'',upd:Date.now()});
    stats.newRels++;
  });
}

/* ---------------- ⑥ AI：从正文梳理角色与关系 ---------------- */
function castExtractDialog(){
  const all=castSources({recent:0});
  if(!all.length){
    openDlg('<div class="warnbox">还没有「已编入目录」的正式章节，暂时无从梳理。<br><br>'
      +'请先在「章节」里把写好的章节点「编入目录」，AI 只依据正式章节总结人物与关系，草稿不参与。</div>');
    return;
  }
  const words=all.reduce((a,c)=>a+c.text.replace(/\s/g,'').length,0);
  const chunks=castChunk(all.slice(-30),6000);
  const html='<h3>✦ 从正文梳理角色与关系</h3>'
    +'<div class="item" style="padding:12px 14px"><div style="font-size:13px;line-height:2">'
    +'已编入目录的正式章节 <b>'+all.length+'</b> 章 ｜ 正文约 <b>'+words.toLocaleString()+'</b> 字<br>'
    +'<span class="hint">只读正式章节，草稿不参与。约需调用模型 '+chunks.length+' 次。</span>'
    +'</div></div>'
    +'<div class="row" style="margin-top:10px">'
    +'<div><label style="margin-top:0">扫描范围</label><select id="castRange">'
    +'<option value="0">全部 '+all.length+' 章</option>'
    +(all.length>10?'<option value="10">最近 10 章</option>':'')
    +(all.length>20?'<option value="20">最近 20 章</option>':'')
    +(all.length>30?'<option value="30">最近 30 章</option>':'')
    +'</select></div>'
    +'<div><label style="margin-top:0">梳理内容</label><select id="castWhat">'
    +'<option value="both">人物 + 人物关系</option>'
    +'<option value="chars">只梳理人物</option>'
    +'<option value="rels">只梳理人物关系</option>'
    +'</select></div></div>'
    +'<div class="hint" style="margin-top:10px">新角色会按 AI 判断给出<b>叙事地位</b>（九级，从「第一主角」到「传说人物」）'
    +'——只看戏份与剧情作用，不看实力、官职；拿不准会压低一档。标记为「自动判定」，可随时点卡片上的徽标改。'
    +'<b>已有的角色只补空白字段，不覆盖你写过的内容</b>。第一主角一般由你自行导入并标注。</div>';
  openDlg(html,[
    {label:'取消'},
    {label:'开始梳理',cls:'primary',fn:()=>{
      const rg=$('#castRange'), wt=$('#castWhat');
      const recent=rg?(+rg.value||0):0;
      const what=wt?(wt.value||'both'):'both';
      setTimeout(()=>castExtractRun({recent,what}),120);
      return true;
    }}
  ]);
}
async function castExtractRun(opts){
  opts=opts||{};
  const what=opts.what||'both';
  const src=castSources(opts);
  if(!src.length){ toast('所选范围内没有正式章节'); return; }
  const chunks=castChunk(src,6000);
  const stats={newChars:0,updChars:0,newRels:0,dup:0,calls:0,fails:0,tiers:{},missing:{}};
  setBusy(true,'AI 正在梳理人物与关系…');
  castProgOpen('正在从正式章节梳理人物与关系…');
  castProgSet(0,chunks.length,'准备第一批…',stats,'AI 正在梳理');
  try{
    for(let i=0;i<chunks.length;i++){
      const b=chunks[i];
      const span='第 '+(b[0].i+1)+'–'+(b[b.length-1].i+1)+' 章';
      castProgSet(i,chunks.length,'正在分析 '+span,stats,'AI 正在梳理');
      await castSleep(40);
      const want=what==='chars'?'只梳理人物，rels 返回空数组':(what==='rels'?'只梳理人物关系，chars 返回空数组':'人物与人物关系都要梳理');
      const user='【小说人物与关系梳理】\n下面是这部小说<b>已编入目录的正式章节</b>正文片段。'
        +'请从中梳理出场人物与人物之间的关系。\n\n'
        +castBatchText(b)+'\n\n'
        +(typeof fieldContext==='function'?fieldContext()+'\n\n':'')
        +'要求：\n'
        +'- 本次任务：'+want+'\n'
        +'- 只提取正文中<b>确有依据</b>的内容，绝不凭想象编造；正文没写的一律留空\n'
        +'- tier 按【叙事权重】判定，与实力 / 官职 / 修为高低无关（世间无敌的大帝可以是 "npc"，底层乞丐可以是 "lead1"）\n'
        +'- tier 只能取下列值（id 必须完全一致）：\n'+castTierAiLines().join('\n')+'\n'
        +'- 拿不准就压低一档（宁低勿高）；只给你能看出戏份的角色定档\n'
        +'- 作者已有的角色卡：主角类与重要配角的地位由作者掌握，你只补空白字段，不要提出改档\n'
        +'- 同一人物只出现一次，姓名用正文中最常见、最完整的写法\n'
        +'- 人物字段只填能从正文确定的，不确定的留空字符串（每项 20-80 字，不要长篇大论）\n'
        +'- org=身份职衔/所属势力，look=外貌特征，person=性格，speech=说话风格，power=能力，rel=与其它人物的关系，goal=目标动机\n'
        +'- 关系 type 只能取：'+CAST_REL_TYPES.join(' / ')+'\n'
        +'- dir：0=双向，1=前者→后者单向，2=后者→前者单向；ch=该关系首次确立的章节序号（数字）\n'
        +'- why 用一句话说明判断依据（引用或概括正文）\n'
        +'- 只输出 JSON，不要解释、不要代码块标记：\n'
        +'{"chars":[{"name":"","alias":"","tier":"support","org":"","look":"","person":"","speech":"","power":"","rel":"","goal":"","firstCh":1,"why":""}],'
        +'"rels":[{"a":"","b":"","type":"师徒","dir":0,"desc":"","ch":1}]}';
      let out='';
      try{ out=await chat([{role:'system',content:CH_AI_SYS},{role:'user',content:user}]); stats.calls++; }
      catch(e){ stats.fails++; continue; }
      const j=parseLoose(out);
      if(j) castMergeResult(j,stats);
      castProgSet(i+1,chunks.length,'已完成 '+span,stats,'AI 正在梳理');
    }
    castProgSet(chunks.length,chunks.length,'全部完成，正在保存…',stats,'AI 正在梳理');
    await castSleep(400);
  }catch(e){
    console.warn('梳理失败',e); toast('梳理过程出错：'+((e&&e.message)||e));
  }finally{
    castProgClose(); setBusy(false);
  }
  try{ save(); renderChars(); updateCounters(); }catch(e){ console.warn(e); }
  castLastExtract=stats;
  castReportExtract(stats);
}
function castReportExtract(stats){
  stats=stats||{};
  stats.tiers=stats.tiers||{};
  const missing=Object.keys(stats.missing||{});
  const tierLine=CAST_TIERS.filter(t=>stats.tiers[t.id]).map(t=>castTierNameOf(t.id)+' '+(stats.tiers[t.id]||0)).join(' · ')
    +castCustomTiers().filter(t=>stats.tiers[t.id]).map(t=>t.name+' '+(stats.tiers[t.id]||0)).join(' · ')||'—';
  const html='<h3>人物梳理完成</h3>'
    +'<div class="item" style="padding:12px 14px"><div style="font-size:13.5px;line-height:2">'
    +'依据正式章节梳理，共调用模型 <b>'+(stats.calls||0)+'</b> 次'
    +(stats.fails?(' ｜ <span style="color:var(--warn)">失败 '+(stats.fails||0)+' 批</span>'):'')
    +'<br>新增角色 <b>'+(stats.newChars||0)+'</b> 张（'+tierLine+'）'
    +'<br>补充字段 '+(stats.updChars||0)+' 处 ｜ 新增人物关系 <b>'+(stats.newRels||0)+'</b> 条'
    +(stats.dup?(' ｜ 已存在关系 '+(stats.dup||0)+' 条'):'')
    +'</div></div>'
    +(stats.newChars?'<div class="hint" style="margin-top:8px">新角色按叙事权重自动定了档（标记「自动判定」），可在角色卡里点定位徽标改成更合适的一档，共 9 级。</div>':'')
    +(missing.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge warn">关系里出现但还没有卡片</span></div>'
      +'<div class="hint" style="margin-top:6px">'+missing.slice(0,40).map(esc).join('、')
      +(missing.length>40?('…共 '+missing.length+' 个'):'')+'</div></div>'):'')
    +(stats.tierKeep&&stats.tierKeep.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge ok">🛡 已保护 '+stats.tierKeep.length+' 张卡的地位不被改动</span></div>'
      +'<div class="hint" style="margin-top:6px">主角、双主角、核心/重要配角，以及你手工定过的卡，AI 不会自动改。'
      +'下面是 AI 另外给出的看法，<b>只作建议</b>，需要你确认才会生效：</div>'
      +stats.tierKeep.slice(0,20).map(x=>'<div style="margin:6px 0 0;font-size:13px">'+esc(x.name)+'：'
        +'<span class="badge '+castTierCls(x.from)+'">'+esc(castTierNameOf(x.from))+'</span> → '
        +'<span class="badge '+castTierCls(x.to)+'">'+esc(castTierNameOf(x.to))+'</span></div>').join('')
      +(stats.tierKeep.length>20?('<div class="hint" style="margin-top:6px">…共 '+stats.tierKeep.length+' 张</div>'):'')+'</div>'):'')
    +((!stats.newChars&&!stats.newRels&&!stats.updChars&&!(stats.tierKeep&&stats.tierKeep.length))
      ?'<div class="warnbox">这次没有梳理出新内容。<br>可能是这批章节里没有新人物，也可能模型返回格式不符。可以先检查 API 设置是否正常。</div>':'');
  const btns=[{label:'知道了'}];
  if(stats.tierKeep&&stats.tierKeep.length) btns.push({label:'采纳 AI 建议的地位',fn:()=>{
    let n=0;
    (stats.tierKeep||[]).forEach(x=>{
      const c=castFindChar(x.name); if(!c) return;
      if(chTierOf(c)===x.from){ c.tier=x.to; c.tierAuto=true; c._tierFixed=true; n++; }
    });
    save(); renderChars(); toast('已采纳 '+n+' 张卡的地位建议');
    return true; }});
  if(missing.length) btns.push({label:'为缺失角色补建角色卡',fn:()=>{ setTimeout(castAdoptMissingChars,80); return true; }});
  btns.push({label:'查看人物关系',cls:'primary',fn:()=>{ charView='board'; charOpen=null; renderChars(); return true; }});
  openDlg(html,btns);
}
function castAdoptMissingChars(){
  const missing=Object.keys((castLastExtract&&castLastExtract.missing)||{});
  if(!missing.length){ toast('没有缺失的角色'); return; }
  let n=0;
  missing.forEach(nm=>{
    if(castFindChar(nm)) return;
    const c=castNewAutoChar({name:nm,tier:'extra'});
    c.tier='extra'; c.tierAuto=true; c._placeholder=true;
    (state.chars||[]).push(c); n++;
  });
  save(); renderChars(); updateCounters();
  toast('已补建 '+n+' 张角色卡（内容为空，可稍后用 AI 补全）');
  openDlg('<h3>已补建 '+n+' 张角色卡</h3><div class="hint">这些卡只有名字，先按「普通配角」定档，方便把人物关系连起来。'
    +'点开任意一张，用「✦ AI 补全空白字段」就能自动填内容。</div>',
    [{label:'知道了'},{label:'去角色列表',cls:'primary',fn:()=>{ charView='list'; renderChars(); return true; }}]);
}

/* ---------------- ⑦ AI：关系核查 ---------------- */
function castCheckDialog(){
  const C=ensureCast();
  if(!C.rels.length){
    openDlg('<div class="warnbox">还没有录入任何人物关系。<br><br>先手动「＋ 新增关系」，或用「✦ 从正文梳理角色」让 AI 自动整理。</div>');
    return;
  }
  const all=castSources({recent:0});
  if(!all.length){
    openDlg('<div class="warnbox">还没有「已编入目录」的正式章节，无法核查关系。<br><br>'
      +'请先把章节编入目录，AI 只依据正式章节来核对。</div>');
    return;
  }
  const chunks=castChunk(all,6000);
  const html='<h3>✦ AI 检查人物关系</h3>'
    +'<div class="item" style="padding:12px 14px"><div style="font-size:13px;line-height:2">'
    +'待核查关系 <b>'+C.rels.length+'</b> 条 ｜ 依据正式章节 <b>'+all.length+'</b> 章<br>'
    +'<span class="hint">AI 会逐条给出「正文支持 / 与正文矛盾 / 正文未提及」，并找出正文里有、关系表里缺的关系。约需调用模型 '+chunks.length+' 次。</span>'
    +'</div></div>'
    +'<div class="hint" style="margin-top:10px">核查结果只做提示与建议，<b>不会自动改动你已录的关系</b>。</div>';
  openDlg(html,[
    {label:'取消'},
    {label:'开始核查',cls:'primary',fn:()=>{ setTimeout(castCheckRun,120); return true; }}
  ]);
}
async function castCheckRun(){
  const C=ensureCast();
  const all=castSources({recent:0});
  if(!all.length||!C.rels.length) return;
  const chunks=castChunk(all,6000);
  const relLines=C.rels.map(r=>{
    const A=castNameOf(r.a), B=castNameOf(r.b);
    if(!A||!B) return '';
    const d=(r.dir===1)?(A+' → '+B):(r.dir===2)?(B+' → '+A):(A+' ↔ '+B);
    return '· '+d+'：'+r.type+(r.desc?('（'+r.desc+'）'):'');
  }).filter(Boolean).join('\n');
  const stats={calls:0,fails:0};
  const verdict={};      /* key → {ok:n, conflict:n, unknown:n, note} */
  const missing=[];
  const keyOf=(a,b,t)=>castNorm(a)+'|'+castNorm(b)+'|'+castNormType(t);
  setBusy(true,'AI 正在核查人物关系…');
  castProgOpen('正在核查人物关系…');
  castProgSet(0,chunks.length,'准备中…',stats,'AI 正在核查关系');
  try{
    for(let i=0;i<chunks.length;i++){
      const b=chunks[i];
      const span='第 '+(b[0].i+1)+'–'+(b[b.length-1].i+1)+' 章';
      castProgSet(i,chunks.length,'正在比对 '+span,stats,'AI 正在核查关系');
      await castSleep(40);
      const user='【人物关系核查】\n下面①是这部小说已有的「人物关系表」，②是<b>已编入目录的正式章节</b>正文片段。\n'
        +'请核查关系表里每一条关系是否与正文相符，并找出正文明示、但关系表里缺失的关系。\n\n'
        +'① 已有关系表：\n'+relLines+'\n\n'
        +'② 正文片段：\n'+castBatchText(b)+'\n\n'
        +'要求：\n'
        +'- reviews：对①里的关系逐条给 verdict——"ok"（正文支持）/ "conflict"（正文与之矛盾）/ "unknown"（这段正文里查不到依据）\n'
        +'- a、b、type 必须与①里的写法完全一致，便于程序匹配\n'
        +'- 若 conflict，用 note 简述正文里的实际情况（一句话，引用依据）\n'
        +'- missing：只列正文中<b>确有依据</b>、但①里没有的关系；type 只能取 '+CAST_REL_TYPES.join(' / ')+'\n'
        +'- 绝不编造：正文没写的不要列\n'
        +'- 只输出 JSON，不要解释、不要代码块标记：\n'
        +'{"reviews":[{"a":"","b":"","type":"","verdict":"ok","note":""}],'
        +'"missing":[{"a":"","b":"","type":"师徒","dir":0,"desc":"","ch":1}]}';
      let out='';
      try{ out=await chat([{role:'system',content:CH_AI_SYS},{role:'user',content:user}]); stats.calls++; }
      catch(e){ stats.fails++; continue; }
      const j=parseLoose(out);
      if(!j||typeof j!=='object') continue;
      (Array.isArray(j.reviews)?j.reviews:[]).forEach(rv=>{
        if(!rv) return;
        const k=keyOf(rv.a,rv.b,rv.type);
        const v=String(rv.verdict||'').toLowerCase();
        if(!verdict[k]) verdict[k]={ok:0,conflict:0,unknown:0,note:'',a:rv.a,b:rv.b,type:rv.type};
        if(v==='ok') verdict[k].ok++;
        else if(v==='conflict'){ verdict[k].conflict++; if(String(rv.note||'').trim()) verdict[k].note=String(rv.note).trim(); }
        else verdict[k].unknown++;
      });
      (Array.isArray(j.missing)?j.missing:[]).forEach(m=>{
        if(!m||!m.a||!m.b) return;
        missing.push(m);
      });
      castProgSet(i+1,chunks.length,'已完成 '+span,stats,'AI 正在核查关系');
    }
    castProgSet(chunks.length,chunks.length,'完成',stats,'AI 正在核查关系');
    await castSleep(400);
  }catch(e){ console.warn('核查失败',e); toast('核查出错：'+((e&&e.message)||e)); }
  finally{ castProgClose(); setBusy(false); }
  castReportCheck(verdict,missing,stats);
}
function castReportCheck(verdict,missing,stats){
  const rows=C=>C.rels.map(r=>({r,k:(castNorm(castNameOf(r.a))+'|'+castNorm(castNameOf(r.b))+'|'+castNormType(r.type))}));
  const all=rows(ensureCast());
  const ok=[],conf=[],unk=[];
  all.forEach(x=>{
    const v=verdict[x.k];
    if(!v){ unk.push(x.r); return; }
    if(v.conflict>0){ conf.push({r:x.r,note:v.note}); return; }
    if(v.ok>0){ ok.push(x.r); return; }
    unk.push(x.r);
  });
  /* 关系表里方向写反的情况：AI 的 a/b 与我们的相反 */
  const line=r=>{
    const A=castNameOf(r.a),B=castNameOf(r.b);
    return '<b>'+esc(A)+'</b> —['+esc(r.type)+']— <b>'+esc(B)+'</b>'
      +(r.desc?('<div class="hint" style="margin:3px 0 0">'+esc(r.desc)+'</div>'):'');
  };
  const html='<h3>关系核查结果</h3>'
    +'<div class="item" style="padding:12px 14px"><div style="font-size:13.5px;line-height:2">'
    +'已核对 <b>'+all.length+'</b> 条关系，依据正式章节'
    +'（调用模型 '+(stats.calls||0)+' 次'+(stats.fails?('，失败 '+stats.fails+' 批'):'')+'）<br>'
    +'<span class="badge ok">正文支持 '+(ok.length)+'</span> '
    +'<span class="badge '+(conf.length?'warn':'')+'">与正文矛盾 '+conf.length+'</span> '
    +'<span class="badge">正文未提及 '+unk.length+'</span>'
    +(missing.length?(' <span class="badge ok">新发现 '+missing.length+'</span>'):'')
    +'</div></div>'
    +(conf.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge warn">⚠ 与正文矛盾，建议修正</span></div>'
      +conf.slice(0,20).map(x=>'<div style="margin-top:8px">'+line(x.r)
      +(x.note?('<div class="hint" style="margin:3px 0 0">正文实际：'+esc(x.note)+'</div>'):'')+'</div>').join('')
      +(conf.length>20?('<div class="hint" style="margin-top:8px">…共 '+conf.length+' 条</div>'):'')+'</div>'):'')
    +(missing.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge ok">正文里有、关系表里缺</span></div>'
      +missing.slice(0,25).map(m=>'<div class="hint" style="margin:4px 0">· '+esc(m.a)+' —['+esc(castNormType(m.type))+']— '+esc(m.b)
      +(m.ch?('　第 '+esc(m.ch)+' 章'):'')+(m.desc?('　'+esc(String(m.desc).slice(0,40))):'')+'</div>').join('')
      +(missing.length>25?('<div class="hint" style="margin-top:6px">…共 '+missing.length+' 条</div>'):'')+'</div>'):'')
    +(unk.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge">正文未提及（可能还没写到）</span></div>'
      +'<div class="hint" style="margin-top:6px">'+unk.slice(0,25).map(r=>esc(castNameOf(r.a))+'—'+esc(r.type)+'—'+esc(castNameOf(r.b))).join('、')
      +(unk.length>25?'…':'')+'</div></div>'):'');
  const btns=[{label:'关闭'}];
  if(missing.length) btns.push({label:'采纳新发现的关系',fn:()=>{
    const st={newRels:0}; castMergeResult({chars:[],rels:missing},st);
    save(); renderChars(); toast('已采纳 '+(st.newRels||0)+' 条新关系');
    return true; }});
  btns.push({label:'查看人物关系板',cls:'primary',fn:()=>{ charView='board'; charOpen=null; renderChars(); return true; }});
  openDlg(html,btns);
}

/* ---------------- ⑧ 关系板界面 ---------------- */
var castFocus=null;
let castRelSel=null;
let castLastExtract=null;

function castStatHTML(){
  const C=ensureCast();
  const cs=state.chars||[];
  const hubs=castHubs(3);
  const tiers=castTierSeq().filter(t=>chCountTier(t.id)>0)
    .map(t=>'<span class="badge '+castTierCls(t.id)+'">'+esc(t.name)+' '+chCountTier(t.id)+'</span>').join('');
  return '<div class="relstat">'
    +'<span class="badge">角色 '+cs.length+'</span>'
    +tiers
    +'<span class="badge'+(C.rels.length?' ok':'')+'">关系 '+C.rels.length+' 条</span>'
    +(hubs.length?('<span class="hint" style="margin:0">关系最多：'+hubs.map(h=>esc(h.c.name)+'('+h.n+')').join('、')+'</span>'):'')
    +'</div>';
}
function castGraphSVG(){
  const cs=(state.chars||[]).filter(c=>c&&String(c.name||'').trim());
  if(!cs.length) return '<div class="empty">还没有角色卡，先导入或梳理出人物。</div>';
  const W=760,H=680,cx=W/2,cy=H/2;
  castTierRebuild();
  const by={}; castTierSeq().forEach(t=>{ by[t.id]=[]; });
  cs.forEach(c=>{ const t=chTierOf(c); if(!by[t]) by[t]=[]; by[t].push(c); });
  /* 图心：唯一的第一主角（若同时存在对等双主角，则二人一起进内环，体现“同等核心”） */
  let centerNode=null;
  if(by.lead1.length===1&&!by.dual.length) centerNode=by.lead1[0];
  const inner=cs.filter(c=>c!==centerNode&&CAST_TIER_ORDER[chTierOf(c)]<=4).slice(0,14);  /* 主线 + 核心配角 + 自定义高位档 */
  const outer=by.npc.concat(by.bg).concat(by.legend).slice(0,46);                          /* NPC / 路人 / 传说 */
  const used={}; if(centerNode) used[centerNode.id]=1;
  inner.forEach(c=>{ used[c.id]=1; }); outer.forEach(c=>{ used[c.id]=1; });
  const mid=cs.filter(c=>!used[c.id]).slice(0,60);                                          /* 重要 / 普通配角 + 其它档位 */
  const pos={};
  const place=(arr,R,off)=>{
    arr.forEach((c,i)=>{
      const a=-Math.PI/2+(off||0)+i/Math.max(1,arr.length)*Math.PI*2;
      pos[c.id]={x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};
    });
  };
  const R1=Math.max(94,Math.min(152,52+inner.length*13));
  const R2=R1+Math.max(58,Math.min(98,20+mid.length*7));
  const R3=R2+Math.max(60,Math.min(104,24+outer.length*6));
  place(inner,R1);
  place(mid,R2,0.42);
  place(outer,R3,0.9);
  if(centerNode) pos[centerNode.id]={x:cx,y:cy};
  const C=ensureCast();
  const rels=C.rels.filter(r=>pos[r.a]&&pos[r.b]);
  /* 边 */
  let edges='',labels='';
  rels.forEach((r,i)=>{
    const A=pos[r.a],B=pos[r.b];
    const on=!castFocus||castFocus===r.a||castFocus===r.b;
    const col=on?(castFocus?'var(--accent)':'#8fb0c9'):'#cbd5e1';
    const w=(on&&castFocus)?2.6:1.4;
    const op=on?(castFocus?1:.72):.18;
    const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
    const dx=B.x-A.x, dy=B.y-A.y, len=Math.max(1,Math.sqrt(dx*dx+dy*dy));
    const px=-dy/len, py=dx/len;
    const off=(i%2?1:-1)*10;
    const marker=(r.dir===1)?' marker-end="url(#castArw)"':(r.dir===2)?' marker-start="url(#castArw)"':'';
    edges+='<line x1="'+A.x.toFixed(1)+'" y1="'+A.y.toFixed(1)+'" x2="'+B.x.toFixed(1)+'" y2="'+B.y.toFixed(1)
      +'" stroke="'+col+'" stroke-width="'+w+'" stroke-opacity="'+op+'"'+marker+'></line>';
    if(on&&(castFocus||rels.length<=26)){
      const badge=(CAST_TYPE_ICON[r.type]||'·');
      labels+='<g class="elab" data-act="relsel" data-id="'+r.id+'" style="cursor:pointer">'
        +'<circle cx="'+(mx+px*off).toFixed(1)+'" cy="'+(my+py*off).toFixed(1)+'" r="10" fill="#fff" '
        +'stroke="'+col+'" stroke-width="'+(on&&castFocus?1.6:1)+'" opacity="'+(on?1:.25)+'"></circle>'
        +'<text x="'+(mx+px*off).toFixed(1)+'" y="'+(my+py*off).toFixed(1)+'" text-anchor="middle" dominant-baseline="central" '
        +'font-size="10.5" fill="'+(on?'#38546b':'#9aa8b5')+'" opacity="'+(on?1:.3)+'">'+esc(badge)+'</text>'
        +'</g>';
    }
  });
  /* 节点 */
  let nodes='';
  cs.forEach(c=>{
    const p=pos[c.id]; if(!p) return;
    const t=chTierOf(c);
    const on=!castFocus||castFocus===c.id||ensureCast().rels.some(r=>(r.a===castFocus&&r.b===c.id)||(r.b===castFocus&&r.a===c.id));
    const R=CAST_TIER_NODE_R[t]||14;
    const fill=CAST_TIER_COLOR[t]||'#c3d0dc';
    const tx=(t==='npc'||t==='bg')?'#33475c':'#fff';
    const nm=String(c.name||'');
    const short=nm.length>6?nm.slice(0,6)+'…':nm;
    nodes+='<g class="nd" data-act="relfocus" data-id="'+c.id+'" opacity="'+(on?1:.25)+'">'
      +'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+R+'" fill="'+fill+'" '
      +(t==='legend'?'stroke-dasharray="4 3" ':'')+'stroke="#fff" stroke-width="2"></circle>'
      +'<text x="'+p.x.toFixed(1)+'" y="'+p.y.toFixed(1)+'" text-anchor="middle" dominant-baseline="central" '
      +'font-size="'+(R<=13?9.5:11)+'" font-weight="600" fill="'+tx+'">'+esc(short)+'</text>'
      +'<text x="'+p.x.toFixed(1)+'" y="'+(p.y+R+13).toFixed(1)+'" text-anchor="middle" font-size="10" '
      +'fill="#5b7285" opacity="'+(on?1:.35)+'">'+esc(CAST_TIER_NAME[t])+'</text>'
      +'</g>';
  });
  const focusName=castFocus?castNameOf(castFocus):'';
  const legend=castTierSeq().filter(t=>by[t.id]&&by[t.id].length).map(t=>
    '<b style="color:'+(CAST_TIER_COLOR[t.id]||'#8fb0c9')+'">'+esc(t.name)+'</b> '+by[t.id].length).join(' · ');
  return '<div class="relgraph">'
    +'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="人物关系图">'
    +'<defs><marker id="castArw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
    +'<path d="M0,0 L10,5 L0,10 z" fill="#8fb0c9"></path></marker></defs>'
    +edges+labels+nodes
    +'</svg>'
    +'<div class="hint" style="margin:6px 0 0">'
    +(focusName?('已聚焦「'+esc(focusName)+'」，点空白处或名字可取消。'):'点圆点可聚焦某个人物的关系。')
    +'圆点越大＝叙事地位越高（虚线圆＝传说人物）：'+legend
    +'。连线上的徽标=关系类型，箭头=单向。</div></div>'
    +'<div class="rellist">'
    +castRelRowsHTML(rels)
    +'</div>';
}
function castRelRowsHTML(rels){
  if(!rels.length) return '<div class="empty">还没有人物关系。点「＋ 新增关系」手填，或用「✦ 从正文梳理角色」让 AI 自动整理。</div>';
  const sorted=rels.slice().sort((a,b)=>{
    const ta=CAST_TIER_ORDER[chTierOf((state.chars||[]).find(c=>c.id===a.a))]||0;
    const tb=CAST_TIER_ORDER[chTierOf((state.chars||[]).find(c=>c.id===b.a))]||0;
    return ta-tb;
  });
  return sorted.map(r=>castRelRowHTML(r)).join('');
}
function castRelRowHTML(r){
  const sel=(v,list)=>list.map(x=>'<option value="'+esc(x[0])+'"'+(String(v)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>').join('');
  const charOpts=id=>'<option value="">（选择角色）</option>'+(state.chars||[]).map((c,k)=>
    '<option value="'+esc(c.id)+'"'+(id===c.id?' selected':'')+'>'+esc(c.name||('角色'+(k+1)))+'（'+CAST_TIER_NAME[chTierOf(c)]+'）</option>').join('');
  const A=castNameOf(r.a)||'⚠ 未落卡', B=castNameOf(r.b)||'⚠ 未落卡';
  return '<div class="relrow'+(castRelSel===r.id?' sel':'')+'" data-rel="'+esc(r.id)+'">'
    +'<div class="rr-top">'
    +'<span class="rr-who">'+esc(A)+'</span>'
    +'<span class="badge '+(r.src==='ai'?'ok':'')+'">'+esc(CAST_TYPE_ICON[r.type]||'')+' '+esc(r.type||'关系')+'</span>'
    +'<span class="rr-who">'+esc(B)+'</span>'
    +(r.src==='ai'?'<span class="badge">AI 梳理</span>':'')
    +(r.from?'<span class="badge">第 '+r.from+' 章起</span>':'')
    +'<div class="spacer"></div>'
    +'<button class="btn xs ghost danger" data-act="reldel" data-id="'+esc(r.id)+'">✕</button>'
    +'</div>'
    +'<div class="rr-grid">'
    +'<div><label style="margin-top:0">人物 A</label><select data-rf="a" data-id="'+esc(r.id)+'">'+charOpts(r.a)+'</select></div>'
    +'<div><label style="margin-top:0">人物 B</label><select data-rf="b" data-id="'+esc(r.id)+'">'+charOpts(r.b)+'</select></div>'
    +'<div><label style="margin-top:0">关系类型</label><select data-rf="type" data-id="'+esc(r.id)+'">'
      +sel(r.type,CAST_REL_TYPES.map(t=>[t,CAST_TYPE_ICON[t]+' '+t]))+'</select></div>'
    +'<div><label style="margin-top:0">方向</label><select data-rf="dir" data-id="'+esc(r.id)+'">'
      +sel(r.dir,[['0','双向（互为）'],['1',A+' → '+B],['2',B+' → '+A]])+'</select></div>'
    +'<div><label style="margin-top:0">确立章节（可空）</label><input type="number" min="1" data-rf="from" data-id="'+esc(r.id)+'" value="'+(r.from||'')+'"></div>'
    +'</div>'
    +'<label>关系描述</label>'
    +'<textarea rows="2" data-rf="desc" data-id="'+esc(r.id)+'" placeholder="（可空）例：顾长庚救其性命并授剑，但双方都对当年的事有所隐瞒">'+esc(r.desc||'')+'</textarea>'
    +'</div>';
}
function castBoardHTML(){
  const C=ensureCast();
  const toolbar='<div class="toolbar" style="margin-bottom:10px">'
    +'<button class="btn sm" data-act="boardback">‹ 返回角色列表</button>'
    +'<div class="spacer"></div>'
    +'<button class="btn sm" data-act="reladd">＋ 新增关系</button>'
    +'<button class="btn sm" data-act="castcheck">✦ AI 检查关系</button>'
    +'<button class="btn sm primary" data-act="castextract">✦ 从正文梳理角色</button>'
    +'</div>';
  const src=castSources({recent:0});
  const note=src.length
    ? '<div class="hint" style="margin:0 0 10px">梳理与核查只依据 <b>'+src.length+'</b> 章「已编入目录」的正式章节，草稿不参与。</div>'
    : '<div class="warnbox" style="margin-bottom:10px">还没有「已编入目录」的正式章节。AI 梳理与关系核查都需要先把章节<b>编入目录</b>。</div>';
  const focusBar=castFocus
    ? '<div class="toolbar" style="margin-bottom:10px"><span class="badge ok">聚焦：'+esc(castNameOf(castFocus))+'</span>'
      +'<button class="btn xs ghost" data-act="relfocus" data-id="'+esc(castFocus)+'">取消聚焦</button></div>'
    : '';
  return toolbar+note+castStatHTML()+focusBar+castGraphSVG();
}
function castTierDialog(i){
  const c=state.chars[i]; if(!c) return;
  castTierRebuild();
  const cur=chTierOf(c);
  const total=castTierTotal();
  const rows=castTierGroupsAll().map(x=>{
    const g=x.g;
    const items=x.items.map(t=>{
      const on=(cur===t.id);
      return '<div class="tieropt'+(on?' on':'')+'">'
        +'<span class="badge '+castTierCls(t.id)+'">'+esc(t.name)+'</span>'
        +'<div style="flex:1;min-width:0"><div class="to-n">权重 '+t.w+' / '+total
        +(on?'<span class="to-w">当前</span>':'')
        +(t.custom?'<span class="to-w">自定义</span>':'')
        +(castTierIsLocked(t.id)?'<span class="to-w">AI 不得擅改</span>':'')
        +'<span class="to-w">'+chCountTier(t.id)+' 张</span></div>'
        +'<div class="hint" style="margin:4px 0 0">'+esc(t.hint||'')+'</div></div></div>';
    }).join('');
    return '<div class="tierhead" style="margin-top:12px">'+esc(g.name)+'<span class="n">'+x.items.length+' 档</span></div>'+items;
  }).join('');
  openDlg('<h3>叙事地位（出场权重）</h3>'
    +'<div class="item" style="padding:12px 14px"><div style="font-weight:600;font-size:14px">'+esc(c.name||'未命名角色')+'</div>'
    +'<div class="hint" style="margin-top:4px">当前：'+esc(castTierNameOf(cur))+'（'+ (c._tierFixed?'手工设定，AI 不会改':(c.tierAuto?'自动判定':'未设定')) +'）</div>'
    +(String(c._tierWhy||'').trim()?('<div class="hint" style="margin-top:3px">判定依据：'+esc(c._tierWhy)+'</div>'):'')
    +'<div class="hint" style="margin-top:6px">叙事地位只看<b>剧情作用与戏份</b>，与实力、官职、修为、世界观社会地位无关；'
    +'它决定 AI 给多少笔墨，社会地位（大帝 / 贵族 / 平民 / 奴隶）不改变戏份权重。</div></div>'
    +rows
    +'<div class="toolbar" style="margin-top:14px"><button class="btn sm ghost" id="tierManageBtn">⚙ 自定义分类（新增 / 改名 / 删除）</button></div>',
    [{label:'取消'}].concat(castTierSeq().map(t=>({label:t.name,cls:(cur===t.id?'primary':''),
      fn:()=>{ chSetTier(i,t.id); return true; }}))));
  const mb=$('#tierManageBtn');
  if(mb) mb.onclick=()=>{ castTierManageDialog(); };
}
/* 自定义分类：新增 / 改名 / 排序 / 删除 */
function castTierManageDialog(){
  castTierRebuild();
  const seq=castTierSeq();
  const total=seq.length;
  const builtin=CAST_TIERS.map(t=>{
    const o=castTierObj(t.id)||t;
    const renamed=(o.name!==t.name);
    return '<div class="tieropt"><span class="badge '+castTierCls(t.id)+'">'+esc(o.name)+'</span>'
      +'<div style="flex:1;min-width:0"><div class="to-n">权重 '+o.w+' / '+total
      +'<span class="to-w">内置</span>'+(renamed?'<span class="to-w">已改名（原名 '+esc(t.name)+'）</span>':'')+'</div>'
      +'<div class="hint" style="margin:4px 0 0">'+esc(t.hint)+'</div></div>'
      +'<button class="btn xs ghost" data-ctren="'+t.id+'">改名</button></div>';
  }).join('');
  const customs=castCustomTiers().length
    ? castCustomTiers().map(c=>{
        const o=castTierObj(c.id)||c;
        return '<div class="tieropt"><span class="badge '+castTierCls(c.id)+'">'+esc(o.name)+'</span>'
          +'<div style="flex:1;min-width:0"><div class="to-n">权重 '+o.w+' / '+total
          +'<span class="to-w">自定义</span><span class="to-w">'+chCountTier(c.id)+' 张</span>'
          +'<span class="to-w">排在：'+(c.after===''?'最前':(c.after==='last'?'最后':esc(castTierNameOf(c.after)+'之后')))+'</span></div>'
          +'<div class="hint" style="margin:4px 0 0">'+esc(o.hint||'（未填写说明）')+'</div></div>'
          +'<button class="btn xs ghost" data-ctren="'+c.id+'">改名</button>'
          +'<button class="btn xs ghost danger" data-ctdel="'+c.id+'">删除</button></div>';
      }).join('')
    : '<div class="hint" style="margin-top:8px">还没有自定义档位。可以加“幕后黑手 / 情感线女主 / 城主线”这类你自己体系里的分类。</div>';
  const afterOpts=seq.map(t=>'<option value="'+esc(t.id)+'">排在「'+esc(t.name)+'」之后</option>').join('')
    +'<option value="">排在最前（高于第一主角）</option>';
  openDlg('<h3>自定义叙事地位分类</h3>'
    +'<div class="hint">内置九级已覆盖大多数情况；如果这本书有自己的一套分类（例：“幕后黑手 / 情感线女主 / 阶段性boss”），'
    +'可以自建档位，它会和内置档位一起排序、一起参与 AI 写作权重。内置档位不能删，但可以改名。</div>'
    +'<div class="item" style="padding:12px 14px;margin-top:10px"><div style="font-weight:600;font-size:13.5px">＋ 新增自定义档位</div>'
    +'<div class="row" style="margin-top:8px"><div><label style="margin-top:0">档位名称（≤ 12 字）</label><input type="text" id="ctName" placeholder="例：幕后黑手"></div></div>'
    +'<label>档位说明（会给 AI 看，写清“什么时候用这一档”）</label><input type="text" id="ctHint" placeholder="例：从未露面但操控全局的人">'
    +'<label>插入位置</label><select id="ctAfter">'+afterOpts+'</select></div>'
    +'<div class="tierhead" style="margin-top:14px">内置档位<span class="n">'+CAST_TIERS.length+' 档</span></div>'+builtin
    +'<div class="tierhead" style="margin-top:14px">自定义档位<span class="n">'+castCustomTiers().length+' 档</span></div>'+customs
    +'<div class="hint" style="margin-top:10px">主角、双主角、核心/重要配角以及自定义档位都是<b>受保护档位</b>：AI 梳理时只会给出建议，不会擅自改动。</div>',
    [{label:'关闭'},
     {label:'＋ 新增档位',cls:'primary',fn:()=>{
       const v=sel=>{ const el=$(sel); return el?String(el.value||''):''; };
       const r=castTierAdd(v('#ctName'),v('#ctHint'),v('#ctAfter')||'last');
       if(r.err){ toast(r.err); return false; }
       save(); renderChars(); toast('已新增档位「'+(v('#ctName')||'').trim()+'」');
       setTimeout(castTierManageDialog,120);
       return true;
     }}]);
  /* 改名 / 删除的按钮在弹窗正文里，需要单独绑事件 */
  const host=$('#dlgBody');
  if(host&&host.querySelectorAll){
    try{
      host.querySelectorAll('[data-ctren]').forEach(b=>{ b.onclick=()=>{
        const id=b.getAttribute('data-ctren');
        const o=castTierObj(id);
        const nm=prompt('改名为（留空则恢复内置原名）：',o?o.name:'');
        if(nm==null) return;
        const r=castTierSet(id,{name:nm});
        if(r.err){ toast(r.err); return; }
        renderChars(); toast('已更新档位名'); setTimeout(castTierManageDialog,120);
      }; });
      host.querySelectorAll('[data-ctdel]').forEach(b=>{ b.onclick=()=>{
        const id=b.getAttribute('data-ctdel');
        const o=castTierObj(id);
        const used=chCountTier(id);
        if(!confirm('删除档位「'+(o?o.name:id)+'」？'+(used?('已定为该档的 '+used+' 张卡会回落到「'+CAST_TIER_NAME[CAST_TIER_DEFAULT]+'」，卡本身不会丢。'):''))) return;
        const r=castTierDel(id);
        if(r.err){ toast(r.err); return; }
        renderChars(); toast('已删除该档位'); setTimeout(castTierManageDialog,120);
      }; });
    }catch(e){ console.warn('自定义档位按钮绑定失败',e); }
  }
}
function castRelAddDialog(){
  if(!(state.chars||[]).length){ toast('先导入或新建角色卡'); return; }
  openDlg('<h3>新增人物关系</h3>'
    +'<div class="row"><div><label style="margin-top:0">人物 A</label><select id="relAddA">'
    +(state.chars||[]).map((c,k)=>'<option value="'+esc(c.id)+'">'+esc(c.name||('角色'+(k+1)))+'（'+CAST_TIER_NAME[chTierOf(c)]+'）</option>').join('')
    +'</select></div><div><label style="margin-top:0">人物 B</label><select id="relAddB">'
    +'<option value="">（选择角色）</option>'
    +(state.chars||[]).map((c,k)=>'<option value="'+esc(c.id)+'">'+esc(c.name||('角色'+(k+1)))+'（'+CAST_TIER_NAME[chTierOf(c)]+'）</option>').join('')
    +'</select></div></div>'
    +'<div class="row"><div><label>关系类型</label><select id="relAddT">'
    +CAST_REL_TYPES.map(t=>'<option value="'+t+'">'+CAST_TYPE_ICON[t]+' '+t+'</option>').join('')
    +'</select></div><div><label>方向</label><select id="relAddD">'
    +'<option value="0">双向（互为）</option><option value="1">A → B</option><option value="2">B → A</option></select></div></div>'
    +'<div class="row"><div><label>确立章节（可空）</label><input type="number" id="relAddC" min="1"></div></div>'
    +'<label>关系描述（可空）</label><textarea id="relAddX" rows="2"></textarea>',
    [{label:'取消'},
     {label:'添加',cls:'primary',fn:()=>{
       const v=s=>{ const el=$(s); return el?String(el.value||''):''; };
       const a=v('#relAddA'), b=v('#relAddB'), t=castNormType(v('#relAddT')||'其他');
       if(!a||!b){ toast('请选择人物 A 与人物 B'); return false; }
       if(a===b){ toast('两侧不能是同一个人'); return false; }
       const C=ensureCast();
       if(C.rels.some(r=>((r.a===a&&r.b===b)||(r.a===b&&r.b===a))&&r.type===t)){ toast('这条关系已经存在'); return false; }
       const cc=+v('#relAddC');
       C.rels.push({id:uid(),a,b,type:t,dir:(+v('#relAddD'))||0,desc:v('#relAddX').trim(),
         from:cc>0?cc:null,src:'manual',conf:'',labelA:'',labelB:'',note:'',upd:Date.now()});
       save(); charView='board'; renderChars();
       toast('已添加关系');
       return true;
     }}]);
}
/* 事件 */
function castBind(host){
  if(!host||host._castBound) return;
  host._castBound=true;
  host.addEventListener('click',castClick);
  host.addEventListener('input',castInput);
  host.addEventListener('change',castInput);
}
function castClick(e){
  const btn=e.target.closest('[data-act]'); if(!btn) return;
  const act=btn.dataset.act;
  if(act==='boardback'){ charView='list'; castFocus=null; castRelSel=null; renderChars(); return; }
  if(act==='castboard'){ charView='board'; charOpen=null; renderChars(); return; }
  if(act==='castextract'){ castExtractDialog(); return; }
  if(act==='castcheck'){ castCheckDialog(); return; }
  if(act==='tiermanage'){ castTierManageDialog(); return; }
  if(act==='reladd'){ castRelAddDialog(); return; }
  if(act==='relsel'){ castRelSel=(castRelSel===btn.dataset.id?null:btn.dataset.id);
    castWithScroll(()=>renderChars()); return; }
  if(act==='reldel'){
    const C=ensureCast(); const k=C.rels.findIndex(x=>x.id===btn.dataset.id);
    if(k<0) return; C.rels.splice(k,1); save(); castWithScroll(()=>renderChars()); toast('已删除该关系'); return;
  }
  if(act==='relfocus'){
    const id=btn.dataset.id; castFocus=(castFocus===id?null:id);
    castWithScroll(()=>renderChars()); return;
  }
}
function castInput(e){
  const el=e.target; if(!el||!el.dataset) return;
  const f=el.dataset.rf; if(!f) return;
  const C=ensureCast(); const r=C.rels.find(x=>x.id===el.dataset.id); if(!r) return;
  if(f==='desc'){ r.desc=String(el.value||''); r.upd=Date.now(); save(); return; }
  if(f==='from'){ const n=Math.max(1,+el.value||0); r.from=n>0?n:null; r.upd=Date.now(); save(); return; }
  if(f==='dir'){ r.dir=+el.value||0; r.upd=Date.now(); save(); castWithScroll(()=>renderChars()); return; }
  if(f==='a'||f==='b'){ const v=String(el.value||''); if(!v) return; r[f]=v; r.upd=Date.now(); save(); castWithScroll(()=>renderChars()); return; }
  if(f==='type'){ r.type=castNormType(el.value); r.upd=Date.now(); save(); castWithScroll(()=>renderChars()); return; }
}
/* 入口绑定 */
function castBindTop(){
  const b1=$('#btnCastBoard'), b2=$('#btnCastExtract');
  if(b1) b1.onclick=()=>{ charView='board'; charOpen=null; renderChars();
    const t=document.querySelector('.tab[data-tab="chars"]'); if(t&&t.classList&&!t.classList.contains('active')) t.click(); };
  if(b2) b2.onclick=()=>castExtractDialog();
}
