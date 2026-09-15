/* =========================================================
   DreamWeaver · 幻梦织者 —— 品牌 / 外观 / 状态浮窗 / 性能 / 细节
   ---------------------------------------------------------
   这个模块只做「增强与外观」，绝不改动任何业务数据结构：
   ① 品牌：标题、Logo、favicon、导出文件名前缀、本地存储键前缀
      （旧键自动迁移并保留，旧备份 JSON 字段一个不动）
   ② 外观：白蓝梦幻主题 / 宽松·紧凑布局 / 装饰动画 / 暗色模式
   ③ AI 工作状态浮窗：纯提示，非模态、不抢焦点、不阻塞任何操作
   ④ 性能：纯函数缓存、上下文打包 memo、流式输出合帧、渲染批量调度
   ⑤ 细节：页签红点、字段提示气泡、拖拽虚影、键盘避让、低配降级

   所有被包装的函数（setBusy / save / updateProse / updateCtxInfo /
   metaBlock / styleBlock / aiFactsBlock / assembleContext）的原实现
   都在 build.js 里改名成 *Raw，这里只包一层，逻辑完全沿用；
   任何包装出错都会自动回退到原实现。
   ========================================================= */

/* ---------------- ① 品牌 ---------------- */
const DW={ name:'DreamWeaver', cn:'幻梦织者', full:'DreamWeaver · 幻梦织者',
  tagline:'设定 · 世界书 · 角色卡 → 逐章成文 → 编入目录，设定自动随章节注入',
  filePrefix:'DreamWeaver-', lsPrefix:'dw-' };
const DW_FAVICON='data:image/svg+xml,'+encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"+
  "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"+
  "<stop offset='0' stop-color='#8ab0ea'/><stop offset='1' stop-color='#7f6fd0'/></linearGradient></defs>"+
  "<rect width='64' height='64' rx='16' fill='url(#g)'/>"+
  "<path d='M44 15a15 15 0 1 0 6.5 22.5A18 18 0 0 1 44 15z' fill='#ffffff' opacity='.95'/>"+
  "<path d='M22 12l1.9 4.6L28.5 18l-4.6 1.9L22 24.5l-1.9-4.6L15.5 18l4.6-1.4z' fill='#ffffff'/>"+
  "<circle cx='45' cy='48' r='2.4' fill='#ffffff'/><circle cx='33' cy='41' r='1.6' fill='#ffffff'/>"+
  "</svg>");
const DW_LOGO_SVG=
  "<svg viewBox='0 0 32 32' aria-hidden='true' focusable='false'>"+
  "<path d='M23 5.5a9.5 9.5 0 1 0 4.1 14.2A11.4 11.4 0 0 1 23 5.5z' fill='#fff' opacity='.96'/>"+
  "<path d='M9.5 4l1.2 2.9L13.6 8l-2.9 1.2L9.5 12 8.3 9.2 5.4 8l2.9-1.1z' fill='#fff'/>"+
  "<circle cx='13' cy='22' r='1.5' fill='#fff' opacity='.9'/>"+
  "</svg>";
function dwFavicon(){
  try{
    var olds=document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]');
    for(var i=0;i<olds.length;i++){ try{ olds[i].parentNode.removeChild(olds[i]); }catch(e){} }
    var l=document.createElement('link');
    l.rel='icon'; l.type='image/svg+xml'; l.href=DW_FAVICON;
    document.head.appendChild(l);
    var t=document.createElement('link'); t.rel='apple-touch-icon'; t.href=DW_FAVICON;
    document.head.appendChild(t);
  }catch(e){ console.warn('favicon 设置失败',e); }
}
function dwBrandApply(){
  try{ if(document.title.indexOf('DreamWeaver')<0) document.title=DW.full+' · AI 小说创作台'; }catch(e){}
  try{
    var h1=document.getElementById('headTitle');
    if(h1 && h1.getAttribute('data-dwbrand')!=='1'){ h1.setAttribute('data-dwbrand','1'); h1.textContent=DW.full; }
    var m=document.querySelector('meta[name="description"]');
    if(m) m.setAttribute('content',DW.full+' · AI 小说创作台：世界书设定注入、角色卡、逐章出文与目录管理');
    var sub=document.querySelector('#shelfScreen .title-block .sub');
    if(sub && !sub.getAttribute('data-dwbrand')) sub.setAttribute('data-dwbrand','1');
  }catch(e){}
  try{
    var logos=document.querySelectorAll('.logo');
    for(var i=0;i<logos.length;i++){
      if(logos[i].getAttribute('data-dwbrand')) continue;
      logos[i].setAttribute('data-dwbrand','1');
      logos[i].innerHTML=DW_LOGO_SVG;
      if(!logos[i].title) logos[i].title=DW.full;
    }
  }catch(e){}
}

/* ---------------- ② 本地存储键迁移（新前缀 dw-，旧键保留不动） ---------------- */
const DW_LS_MAP=[
  ['ai-novel-studio-v2','dw-studio-v2'],
  ['ai-novel-shelf-v1','dw-shelf-v1'],
  ['ai-novel-api-v1','dw-api-v1'],
  ['ai-novel-safety-v1','dw-safety-v1'],
  ['ai-novel-ui-v1','dw-ui-v1']
];
const DW_LS_BOOK_OLD='ai-novel-book-';
/* 存储键判定统一在安全模块里： dwOwnKey()（新旧前缀都认） */
function dwMigrateKeys(){
  let moved=0;
  try{
    DW_LS_MAP.forEach(function(p){
      try{
        if(localStorage.getItem(p[1])!=null) return;
        const v=localStorage.getItem(p[0]);
        if(v!=null){ localStorage.setItem(p[1],v); moved++; }
      }catch(e){}
    });
    try{
      const olds=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k && k.indexOf(DW_LS_BOOK_OLD)===0) olds.push(k);
      }
      olds.forEach(function(k){
        const nk=LS_BOOK+k.slice(DW_LS_BOOK_OLD.length);
        try{ if(localStorage.getItem(nk)==null){ localStorage.setItem(nk,localStorage.getItem(k)); moved++; } }catch(e){}
      });
    }catch(e){}
  }catch(e){ console.warn('本地存储键迁移失败',e); }
  return moved;
}
/* 导出文件名前缀由安全模块统一提供（dwFileName） */

/* ---------------- ③ 外观设置 ---------------- */
const LOOK_KEY='dw-look-v1';
const dwLook={ theme:'auto', density:'cozy', deco:'on', status:true, tips:true, kb:true, arrows:true };
function loadLook(){ try{ const r=localStorage.getItem(LOOK_KEY); if(r) Object.assign(dwLook,JSON.parse(r)||{}); }catch(e){} }
function saveLook(){ try{ localStorage.setItem(LOOK_KEY,JSON.stringify(dwLook)); }catch(e){} }
loadLook();
function dwLowEnd(){
  try{
    const c=navigator.hardwareConcurrency||0;
    const small=Math.min(window.innerWidth||1e4,(window.screen&&screen.width)||1e4)<=380;
    return (c>0&&c<=4)||small;
  }catch(e){ return false; }
}
function applyLook(){
  const root=document.documentElement;
  root.dataset.theme=dwLook.theme||'auto';
  root.dataset.density=(dwLook.density==='compact')?'compact':'cozy';
  const low=dwLowEnd();
  root.dataset.lowend=low?'1':'0';
  root.dataset.deco=(dwLook.deco==='off'||low)?'off':'on';
  try{
    if(window.matchMedia){
      const q=window.matchMedia('(prefers-color-scheme: dark)');
      root.dataset.sysdark=q.matches?'1':'0';
      if(!q._dwBound){
        q._dwBound=true;
        const h=e=>{ try{ root.dataset.sysdark=e.matches?'1':'0'; }catch(_){} };
        if(q.addEventListener) q.addEventListener('change',h); else if(q.addListener) q.addListener(h);
      }
    }
  }catch(e){}
  if(!dwLook.status) aiStatusHide(true);
}
function openLookDialog(){
  const seg=(id,val,opts)=>'<div class="seg2" data-seg="'+id+'">'+opts.map(o=>
    '<button type="button" data-val="'+esc(o[0])+'" class="'+((val===o[0])?'on':'')+'">'+esc(o[1])+'</button>').join('')+'</div>';
  const sw=(id,on,label,hint)=>'<label class="switch" style="margin-top:8px"><input type="checkbox" data-sw="'+id+'" '+(on?'checked':'')+'> '+label
    +(hint?('<span class="hint" style="margin:0">'+hint+'</span>'):'')+'</label>';
  const html='<h3>🎨 外观与体验</h3>'
    +'<div class="hint" style="margin-top:0">这些都是体验增强，随时可以关掉；关掉后界面回到接近原版的状态。'
    +'设置只影响本机，<b>不会写进作品数据</b>，也不影响任何原有功能。</div>'
    +'<div class="safe-sec"><h4>主题</h4>'
    +'<div class="kvrow"><span class="k">配色</span><span class="v">'+seg('theme',dwLook.theme,[['auto','跟随系统'],['light','白昼梦'],['dark','夜空梦']])+'</span></div>'
    +'<div class="kvrow"><span class="k">布局密度</span><span class="v">'+seg('density',dwLook.density,[['cozy','宽松'],['compact','紧凑便携']])+'</span></div>'
    +'<div class="kvrow"><span class="k">装饰动画</span><span class="v">'+seg('deco',dwLook.deco,[['on','开启'],['off','关闭']])+'</span></div>'
    +(dwLowEnd()?'<div class="hint">检测到设备性能或屏幕尺寸偏低，星尘与飘雾动画已自动弱化。</div>':'')
    +'<div class="hint">装饰动画只用 transform / opacity；系统开启「减少动态效果」时会自动静音。</div>'
    +'</div>'
    +'<div class="safe-sec"><h4>操作体验</h4>'
    +sw('status',dwLook.status,'显示 AI 工作状态浮窗','右下角的小面板，只做提示，永不遮挡按钮与输入框')
    +sw('tips',dwLook.tips,'显示字段说明气泡','字段名旁的小问号，悬停 / 长按查看含义')
    +sw('kb',dwLook.kb,'键盘弹出时自动避让','手机上输入法顶起时不遮住输入框与弹窗')
    +sw('arrows',dwLook.arrows,'标签栏左右箭头','提示标签可以左右滑动')
    +'</div>';
  openDlg(html,[{label:'完成'}]);
  const body=$('#dlgBody'); if(!body) return;
  body.onclick=e=>{
    const segBtn=e.target.closest('[data-seg] button'); if(!segBtn) return;
    const box=segBtn.closest('[data-seg]');
    const id=box.getAttribute('data-seg');
    dwLook[id]=segBtn.getAttribute('data-val');
    saveLook(); applyLook();
    Array.prototype.forEach.call(box.querySelectorAll('button'),b=>b.classList.toggle('on',b===segBtn));
  };
  body.onchange=e=>{
    const cb=e.target.closest('[data-sw]'); if(!cb) return;
    const id=cb.getAttribute('data-sw');
    dwLook[id]=cb.checked;
    saveLook(); applyLook();
    if(id==='status'&&cb.checked) aiStatusShow('状态浮窗已开启','有 AI 任务时会自动出现');
  };
}

/* ---------------- ④ AI 工作状态浮窗（非模态 · 不抢焦点 · 不阻塞） ---------------- */
let _asEl=null, _asTimer=null, _asOn=false;
function aiStatusInit(){
  if(_asEl) return _asEl;
  try{
    const el=document.createElement('div');
    el.id='aiStatus'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
    el.hidden=true;
    el.innerHTML='<span class="as-orbs"><i></i><i></i></span>'
      +'<span class="as-tx"><span class="as-main">AI 正在工作…</span><span class="as-sub"></span></span>'
      +'<span class="as-dot"></span>';
    document.body.appendChild(el);
    _asEl=el;
  }catch(e){ console.warn('状态浮窗创建失败',e); }
  return _asEl;
}
function aiStatusShow(text,sub){
  if(!dwLook.status) return;
  const el=aiStatusInit(); if(!el) return;
  el.hidden=false;
  const m=el.querySelector('.as-main'), s=el.querySelector('.as-sub');
  if(m&&text) m.textContent=text;
  if(s) s.textContent=sub||'';
  if(!_asOn){ _asOn=true; el.classList.add('on'); }
  try{ document.body.dataset.ai='busy'; }catch(e){}
  clearTimeout(_asTimer);
  _asTimer=setTimeout(()=>{ try{
    const m2=el.querySelector('.as-main');
    if(m2&&_asOn&&text) m2.textContent=text+'（还在继续，可放心切页）';
  }catch(e){} },12000);
}
function aiStatusHide(immediate){
  clearTimeout(_asTimer);
  try{ document.body.dataset.ai='idle'; }catch(e){}
  if(!_asOn){ if(immediate&&_asEl) _asEl.hidden=true; return; }
  _asOn=false;
  const el=_asEl; if(!el) return;
  el.classList.remove('on');
  setTimeout(()=>{ try{ if(!_asOn) el.hidden=true; }catch(e){} }, immediate?0:300);
}
/* 包装 setBusy：所有 AI 任务都经过它，浮窗因此能跟着任何功能自动出现 / 消失 */
function setBusy(busy,text){
  try{ if(busy) aiStatusShow(text||'AI 正在工作…',''); else aiStatusHide(); }
  catch(e){ console.warn('状态浮窗更新失败',e); }
  return setBusyRaw(busy,text);
}

/* ---------------- ⑤ 性能：缓存 · 合帧 · 渲染调度 ---------------- */
let _cMeta={k:'',v:''}, _cStyle={k:'',v:''}, _cFacts={k:'',v:''};
function metaBlock(){
  let k;
  try{ k=JSON.stringify(state.meta||{}); }catch(e){ return metaBlockRaw(); }
  if(_cMeta.k===k) return _cMeta.v;
  _cMeta={k:k,v:metaBlockRaw()};
  return _cMeta.v;
}
function styleBlock(){
  let k;
  try{ k=JSON.stringify(state.rules||{}); }catch(e){ return styleBlockRaw(); }
  if(_cStyle.k===k) return _cStyle.v;
  _cStyle={k:k,v:styleBlockRaw()};
  return _cStyle.v;
}
/* 铁律事实清单：只有这些「名字级」输入变了才需要重算 */
function dFactsKey(){
  const parts=[];
  try{
    const m=state.meta||{};
    parts.push(String(m.title||'').length,String(m.mainline||'').length,String(m.extra||'').length);
    const cs=state.chars||[];
    let sig=0;
    cs.forEach(c=>{ sig+=chFilled(c)*31; });
    parts.push(cs.length,sig);
    let lc=0;
    try{ const c=loreCount(); lc=c.w+c.pw+c.hi+c.gl; }catch(e){}
    parts.push(lc);
    let ho=0;
    try{ if(typeof openHooks==='function') ho=openHooks().length; }catch(e){}
    parts.push(ho);
    parts.push((state.outline||[]).length);
    try{ parts.push(committedCount()); }catch(e){}
  }catch(e){ return ''; }
  return parts.join('~');
}
function aiFactsBlock(){
  const k=dFactsKey();
  if(k&&_cFacts.k===k) return _cFacts.v;
  let v;
  try{ v=aiFactsBlockRaw(); }catch(e){ return ''; }
  _cFacts={k:k,v:v};
  return v;
}
/* 上下文打包 memo：一次生成里 assembleContext 常被调用 2-3 次（预览 + 正文），
   同一代内只真正拼一次；开始新一次生成时换 key，保证概率类设定会重新掷骰。 */
let _genSeq=0, _ctxMemo={k:'',v:null};
function dwBumpGen(){ _genSeq++; _cFacts.k=''; }
function dwCtxInvalidate(){ _ctxMemo.k=''; }
function dwCtxKey(idx,gist){
  let sig='';
  try{
    const cs=state.chars||[];
    let on=0; cs.forEach(c=>{ if(c&&c.enabled!==false) on++; });
    const m=state.memory||{};
    sig=[on,(state.outline||[]).length,String(m.rolling||'').length,(m.trackedUpto||0),(m.limit||0)].join('.');
  }catch(e){}
  return [_genSeq,idx,String(gist||'').length,sig].join('|');
}
function assembleContext(idx,gistText){
  try{
    const k=dwCtxKey(idx,gistText);
    if(_ctxMemo.v&&_ctxMemo.k===k) return _ctxMemo.v;
    const v=assembleContextRaw(idx,gistText);
    _ctxMemo={k:k,v:v};
    return v;
  }catch(e){ console.warn('上下文缓存失败，已回退',e); return assembleContextRaw(idx,gistText); }
}
/* 合帧调度：同一帧内多次触发只执行最后一回 */
function rafBatch(fn){
  let queued=false, lastArgs=null;
  return function(){
    lastArgs=arguments;
    if(queued) return;
    queued=true;
    const run=()=>{ queued=false; try{ fn.apply(null,lastArgs); }catch(e){ console.warn('延迟渲染失败',e); } };
    try{ requestAnimationFrame(run); }catch(e){ setTimeout(run,16); }
  };
}
/* 流式输出：每帧最多重绘一次正文，打字更顺滑 */
const _proseFlush=rafBatch((k,text)=>{ try{ updateProseRaw(k,text); }catch(e){ console.warn('正文渲染失败',e); } });
function updateProse(k,text){ _proseFlush(k,text); }
/* 上下文状态栏：防抖，避免每次输入都重算 */
const _ctxDeb=rafBatch(()=>{ try{ updateCtxInfoRaw(); }catch(e){} });
function updateCtxInfo(ctx){ return ctx?updateCtxInfoRaw(ctx):_ctxDeb(); }
/* 保存：先立刻把最新内容镜像进 IndexedDB（不等 400ms 防抖），再走原有保存流程 */
let _mirrorTimer=null;
function save(){
  try{
    if(currentId){
      const st=$('#saveState'); if(st) st.textContent='保存中…';
      clearTimeout(_mirrorTimer);
      _mirrorTimer=setTimeout(()=>{
        let raw=null;
        try{ raw=JSON.stringify(state); }catch(e){ return; }
        try{ if(safety.mirror) IDB.put('kv',{k:LS_BOOK+currentId,v:raw,t:Date.now()}); }catch(e){}
      },120);
    }
  }catch(e){ console.warn('即时镜像失败',e); }
  dwCtxInvalidate();
  return saveRaw();
}

/* ---------------- ⑥ 细节：红点 · 提示气泡 · 拖拽虚影 · 键盘避让 ---------------- */
function dwDot(host,on){
  if(!host) return;
  let d=host.querySelector('.reddot');
  if(on&&!d){ d=document.createElement('span'); d.className='reddot'; d.title='有新内容'; host.appendChild(d); }
  else if(!on&&d) d.remove();
}
const dwUpdateDots=rafBatch(()=>{
  try{
    let hooks=0;
    try{ if(typeof openHooks==='function') hooks=openHooks().length; }catch(e){}
    dwDot(document.querySelector('.subtab[data-sub="hook"]'), hooks>0);
    let pend=0;
    try{
      const L=ensureLore();
      (L.w||[]).forEach(e=>{ if(e&&e.enabled&&!String(e.cat||'').trim()) pend++; });
    }catch(e){}
    dwDot(document.querySelector('.tab[data-tab="lore"]'), pend>0);
  }catch(e){}
});
/* 新快照红点：比「上次打开数据保险」更新就亮 */
async function dwCheckSnaps(){
  try{
    const snaps=(typeof listSnaps==='function')?await listSnaps():[];
    const newest=snaps.length?(snaps[0].t||0):0;
    const on=newest>(safety.snapSeen||0);
    dwDot($('#btnSafety'),on);
    dwDot($('#btnSafetyShelf'),on);
  }catch(e){}
}
/* ================== 大列表渐进展示 ==================
   角色卡 / 设定条目几百条时，一次性铺完会卡。先渲染前 N 条，
   剩下的折叠成「显示更多」按钮，点一下再放一批。
   （元素仍在 DOM 里，只改 display，事件委托不受影响） */
const DW_TRIM=[['#charList','.chcard2',60],['#loreBody','.lrow',80],['#hookList','.hookrow',80],['#summaryList','.sumrow',60]];
function dwTrimOne(host,sel,limit){
  try{
    const all=Array.prototype.slice.call(host.children||[]);
    const kids=all.filter(c=>c.matches&&c.matches(sel));
    let bt=all.filter(c=>c.classList&&c.classList.contains('dw-more'))[0]||null;
    if(kids.length<=limit){ if(bt) bt.remove(); return; }
    /* 已展开多少条记在容器上（重渲染后仍然保留用户的展开状态） */
    let showN=Number(host._dwShown);
    if(!(showN>0)) showN=limit;
    if(showN>kids.length) showN=kids.length;
    kids.forEach((c,i)=>{ try{ c.style.display=(i<showN)?'':'none'; }catch(e){} });
    const left=kids.length-showN;
    if(left<=0){ if(bt) bt.remove(); return; }
    if(!bt){
      bt=document.createElement('button');
      bt.className='btn sm dw-more'; bt.type='button';
      bt.style.gridColumn='1/-1';
      host.appendChild(bt);
    }
    bt.textContent='显示更多（还剩 '+left+' 条）';
    bt.onclick=()=>{ host._dwShown=showN+limit; dwTrimOne(host,sel,limit); };
    host._dwShown=showN;
  }catch(e){ console.warn('大列表折叠出错',e); }
}
function dwTrimHeavy(){
  try{ DW_TRIM.forEach(t=>{ const h=$(t[0]); if(h) dwTrimOne(h,t[1],t[2]); }); }catch(e){}
}
function dwTips(root){
  if(!dwLook.tips) return;
  try{
    const host=root&&root.querySelectorAll?root:document;
    Array.prototype.forEach.call(host.querySelectorAll('.chfield-head .lb'),lb=>{
      if(lb.getAttribute('data-tipdone')) return;
      lb.setAttribute('data-tipdone','1');
      const d=document.createElement('span');
      d.className='tip-dot'; d.textContent='?';
      d.setAttribute('data-tip','这一格只写一件事；留空表示不注入。✦ 扩写 / ✎ 润色 / ↻ 重写 只改这一格。');
      lb.appendChild(d);
    });
  }catch(e){}
}
function dwArrowsOne(box){
  try{
    const max=box.scrollWidth-box.clientWidth;
    if(max<=6){ box.dataset.more='none'; return; }
    const left=box.scrollLeft>6, right=box.scrollLeft<max-6;
    box.dataset.more=(left&&right)?'both':(left?'left':(right?'right':'none'));
  }catch(e){}
}
function dwSyncArrows(){
  if(!dwLook.arrows) return;
  try{
    Array.prototype.forEach.call(document.querySelectorAll('.tabs,.ltabs,.subtabs'),box=>{
      if(!box.classList.contains('xswrap')){
        box.classList.add('xswrap');
        const l=document.createElement('button'); l.className='xsnap l'; l.type='button'; l.textContent='‹';
        const r=document.createElement('button'); r.className='xsnap r'; r.type='button'; r.textContent='›';
        l.onclick=e=>{ e.stopPropagation(); box.scrollLeft=Math.max(0,box.scrollLeft-box.clientWidth*0.7); dwArrowsOne(box); };
        r.onclick=e=>{ e.stopPropagation(); box.scrollLeft+=box.clientWidth*0.7; dwArrowsOne(box); };
        box.appendChild(l); box.appendChild(r);
        box.addEventListener('scroll',()=>dwArrowsOne(box),{passive:true});
      }
      dwArrowsOne(box);
    });
  }catch(e){}
}
/* 拖拽虚影：拖动世界书条目 / 境界时跟手，落点更清楚 */
function dwDragGhost(){
  let ghost=null;
  const start=e=>{
    let h=null;
    try{ h=e.target&&e.target.closest?e.target.closest('.drag,.dhandle,.todrag'):null; }catch(err){}
    if(!h) return;
    let label='';
    try{
      const row=h.closest('.lrow,.wrow,.item');
      const t=row&&row.querySelector('.nm,.name,.t,.tt');
      label=t?t.textContent:'';
    }catch(err){}
    try{
      ghost=document.createElement('div');
      ghost.className='dragghost';
      ghost.textContent=String(label||'拖动排序').trim().slice(0,28);
      document.body.appendChild(ghost);
    }catch(err){ ghost=null; }
  };
  const move=e=>{
    if(!ghost||!e.clientX) return;
    ghost.style.left=e.clientX+'px';
    ghost.style.top=e.clientY+'px';
  };
  const end=()=>{ if(ghost){ try{ ghost.remove(); }catch(e){} ghost=null; } };
  document.addEventListener('dragstart',start,true);
  document.addEventListener('dragover',move,true);
  document.addEventListener('dragend',end,true);
  document.addEventListener('drop',end,true);
}
/* 键盘弹出避让：只写一个 CSS 变量，布局交给 CSS */
function dwKeyboard(){
  try{
    const vv=window.visualViewport; if(!vv) return;
    const upd=()=>{
      const h=Math.max(0,(window.innerHeight-vv.height-vv.offsetTop));
      const on=dwLook.kb&&h>120;
      document.documentElement.dataset.kb=on?'1':'0';
      document.documentElement.style.setProperty('--kb-h',Math.round(on?h:0)+'px');
    };
    vv.addEventListener('resize',upd,{passive:true});
    vv.addEventListener('scroll',upd,{passive:true});
    upd();
  }catch(e){ console.warn('键盘避让初始化失败',e); }
}
/* 手机端：设定库 / 世界书列表默认收起大段内容，只留标题与标签 */
function dwPhoneFold(){
  try{
    if(!Device.isPhone) return;
    if(localStorage.getItem('dw-fold-init')==='1') return;
    localStorage.setItem('dw-fold-init','1');
    Array.prototype.forEach.call(document.querySelectorAll('.lrow.open'),x=>x.classList.remove('open'));
  }catch(e){}
}
/* 渲染后统一补挂（新出现的按钮也要有箭头与提示） */
const dwAfterRender=rafBatch(()=>{
  try{ dwSyncArrows(); dwTips(); dwUpdateDots(); dwTrimHeavy(); dwBrandApply(); }catch(e){}
});
function dwWatchDOM(){
  try{
    if(typeof MutationObserver!=='function') return;
    let mo=new MutationObserver(()=>{ dwAfterRender(); });
    mo.observe(document.body||document.documentElement,{childList:true,subtree:true});
    /* 兜底：低频巡检，保证动态生成的标签栏也能拿到提示 */
    setInterval(()=>{ if(document.body&&document.body.dataset.ai!=='busy') dwAfterRender(); },2000);
    /* 快照红点：低频检查即可 */
    setInterval(dwCheckSnaps,20000);
    setTimeout(dwCheckSnaps,3000);
  }catch(e){ console.warn('渲染监听初始化失败',e); }
}

/* ---------------- ⑦ 启动 ---------------- */
function dwBindLookEntry(){
  try{
    const b1=$('#btnLook'), b2=$('#btnLookShelf');
    if(b1) b1.onclick=()=>openLookDialog();
    if(b2) b2.onclick=()=>openLookDialog();
  }catch(e){ console.warn('外观入口绑定失败',e); }
}
function dwFlushNow(){
  try{
    if(safety.mirror&&currentId) IDB.put('kv',{k:LS_BOOK+currentId,v:JSON.stringify(state),t:Date.now()});
  }catch(e){}
}
function dwBoot(){
  try{ dwMigrateKeys(); }catch(e){ console.warn('键迁移失败',e); }
  dwFavicon();
  dwBrandApply();
  applyLook();
  aiStatusInit();
  dwKeyboard();
  dwPhoneFold();
  dwDragGhost();
  dwWatchDOM();
  dwBindLookEntry();
  dwAfterRender();
  if(dwLook.status){ aiStatusShow('就绪','有 AI 任务时这里会显示进度'); setTimeout(()=>aiStatusHide(),1500); }
  /* 切后台 / 关页面：立刻落盘 + 镜像（不等防抖） */
  try{
    window.addEventListener('pagehide',dwFlushNow);
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) dwFlushNow(); });
  }catch(e){}
  console.log('DreamWeaver · 幻梦织者 已就绪（品牌 / 外观 / 状态浮窗 / 性能增强）');
}
