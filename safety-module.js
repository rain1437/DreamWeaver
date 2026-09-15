const LS_SAFE='dw-safety-v1';
const IDB_NAME='ai-novel-studio-idb';   /* IndexedDB 库名保持原样：旧镜像数据依旧能恢复 */
const IDB_VER=1;
const SNAP_MAX=24;          // 最多保留多少份历史快照

/* 是否本应用自己的存储键：新旧前缀都算（新 dw-，早期 ai-novel-）。
   镜像、恢复、清理都靠这一个判定，因此旧数据永远还能被找回来。 */
function dwOwnKey(k){
  k=String(k==null?'':k);
  return k.indexOf('dw-')===0 || k.indexOf('ai-novel')===0;
}
/* 导出文件名统一前缀（品牌前缀由梦幻模块提供，单独跑存储层时自动兜底） */
function dwFileName(name){
  let p='DreamWeaver-';
  try{ if(typeof DW!=='undefined'&&DW&&DW.filePrefix) p=DW.filePrefix; }catch(e){}
  const s=String(name==null?'未命名':name).replace(/[\\/:*?"<>|]/g,'_');
  return (s.indexOf(p)===0)?s:(p+s);
}

const IDB=(()=>{            // 极简 IndexedDB 封装：拿不到就静默降级，绝不让主流程崩
  let db=null, dead=false, opening=null;
  function open(){
    if(db) return Promise.resolve(db);
    if(dead||!window.indexedDB) return Promise.resolve(null);
    if(opening) return opening;
    opening=new Promise(res=>{
      let req;
      try{ req=indexedDB.open(IDB_NAME,IDB_VER); }catch(e){ dead=true; return res(null); }
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv',{keyPath:'k'});
        if(!d.objectStoreNames.contains('snaps')){
          const st=d.createObjectStore('snaps',{keyPath:'id',autoIncrement:true});
          st.createIndex('t','t');
        }
      };
      req.onsuccess=()=>{ db=req.result; res(db); };
      req.onerror=()=>{ dead=true; res(null); };
      req.onblocked=()=>res(null);
    });
    return opening;
  }
  function run(store,mode,fn){
    return open().then(d=>{
      if(!d) return undefined;
      return new Promise(res=>{
        let t;
        try{ t=d.transaction(store,mode); }catch(e){ return res(undefined); }
        let out;
        try{ out=fn(t.objectStore(store)); }catch(e){ return res(undefined); }
        t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);
        t.onerror=()=>res(undefined);
        t.onabort=()=>res(undefined);
      });
    });
  }
  return {
    open,
    put:(s,v)=>run(s,'readwrite',o=>o.put(v)),
    get:(s,k)=>run(s,'readonly',o=>o.get(k)),
    all:s=>run(s,'readonly',o=>o.getAll()),
    del:(s,k)=>run(s,'readwrite',o=>o.delete(k)),
    clear:s=>run(s,'readwrite',o=>o.clear()),
    get usable(){ return !!db; },
    get dead(){ return dead; }
  };
})();

const safety={ mirror:true, autoSnap:true, snapGap:150000, lastBackup:0, snooze:0, lastSnap:{}, snapSeen:0 };
/* 快照间隔允许自定义（分钟）：1 / 2.5 / 5 / 10 / 30 */
const SNAP_GAP_OPTS=[[60000,'1 分钟'],[150000,'2.5 分钟（默认）'],[300000,'5 分钟'],[600000,'10 分钟'],[1800000,'30 分钟']];
function loadSafety(){ try{ const r=localStorage.getItem(LS_SAFE); if(r) Object.assign(safety, JSON.parse(r)); }catch(e){} }
function saveSafety(){ try{ localStorage.setItem(LS_SAFE, JSON.stringify(safety)); }catch(e){} }
loadSafety();

/* ---- ① 劫持 localStorage 写入：自动镜像到 IndexedDB ----
   同时解决「无痕模式 / 存储被禁用」时 setItem 抛错导致整站不可用：
   原生写失败也先把内容放进内存与 IndexedDB，至少本次会话可用、下次还能恢复。 */
const MEM_FALLBACK=new Map();
(function installStorageSafety(){
  try{
    const SP=window.Storage && Storage.prototype;
    if(!SP || SP.__moYanPatched) return;
    SP.__moYanPatched=true;
    const _get=SP.getItem, _set=SP.setItem, _rem=SP.removeItem;
    SP.getItem=function(k){
      k=String(k);
      try{ const v=_get.call(this,k); if(v!==null && v!==undefined) return v; }catch(e){}
      return MEM_FALLBACK.has(k)?MEM_FALLBACK.get(k):null;
    };
    SP.setItem=function(k,v){
      k=String(k); v=String(v);
      if(this===localStorage||this===sessionStorage) MEM_FALLBACK.set(k,v);
      if(this===localStorage && dwOwnKey(k)){
        try{ if(safety.mirror) IDB.put('kv',{k:k,v:v,t:Date.now()}); }catch(e){}
      }
      return _set.call(this,k,v);   // 原生失败就照旧抛错，让上层给出提示
    };
    SP.removeItem=function(k){
      k=String(k); MEM_FALLBACK.delete(k);
      if(this===localStorage && dwOwnKey(k)){ try{ IDB.del('kv',k); }catch(e){} }
      return _rem.call(this,k);
    };
  }catch(e){ console.warn('storage safety patch failed',e); }
})();

let storageProbe={ ls:true, err:'' };
function probeStorage(){
  try{
    const k='ai-novel-probe';
    localStorage.setItem(k,'1');
    storageProbe.ls = localStorage.getItem(k)==='1';
    localStorage.removeItem(k);
    if(!storageProbe.ls) storageProbe.err='写入未生效';
  }catch(e){ storageProbe.ls=false; storageProbe.err=(e&&e.message)||String(e); }
  return storageProbe;
}
function fmtBytes(n){ n=Number(n)||0;
  if(n<1024) return n+' B';
  if(n<1024*1024) return (n/1024).toFixed(1)+' KB';
  if(n<1024*1024*1024) return (n/1048576).toFixed(1)+' MB';
  return (n/1073741824).toFixed(2)+' GB';
}
function stamp(){
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());
}
async function storageInfo(){
  const info={ ls:storageProbe.ls, err:storageProbe.err, idb:false, persist:'unknown', usage:0, quota:0 };
  await IDB.open();
  info.idb=IDB.usable;
  try{
    if(navigator.storage&&navigator.storage.estimate){
      const e=await navigator.storage.estimate();
      info.usage=e.usage||0; info.quota=e.quota||0;
    }
  }catch(e){}
  try{
    if(navigator.storage&&navigator.storage.persisted) info.persist=(await navigator.storage.persisted())?'granted':'default';
    else info.persist='unsupported';
  }catch(e){ info.persist='unknown'; }
  return info;
}
async function requestPersist(){
  try{
    if(!navigator.storage||!navigator.storage.persist) return 'unsupported';
    if(navigator.storage.persisted && await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist())?'granted':'denied';
  }catch(e){ return 'error'; }
}

/* ---- ② 历史快照 ---- */
async function snapshotBook(id, reason, force){
  if(!id) return false;
  if(!safety.autoSnap && !force) return false;
  const last=safety.lastSnap[id]||0;
  if(!force && Date.now()-last<safety.snapGap) return false;
  let raw=null;
  try{ raw=localStorage.getItem(LS_BOOK+id); }catch(e){}
  if(!raw) return false;
  const it=libItem(id)||{};
  let title=it.title||'', words=it.words||0;
  try{ const d=JSON.parse(raw); title=title||(d.meta&&d.meta.title)||''; words=wordsOf(d); }catch(e){}
  safety.lastSnap[id]=Date.now(); saveSafety();
  await IDB.put('snaps',{t:Date.now(),bid:id,title:title,words:words,reason:reason||'auto',data:raw});
  const all=(await IDB.all('snaps'))||[];
  if(all.length>SNAP_MAX){
    all.sort((a,b)=>a.t-b.t);
    for(const s of all.slice(0,all.length-SNAP_MAX)) await IDB.del('snaps',s.id);
  }
  return true;
}
let snapTimer=null;
function safetySnapTick(){
  if(!safety.autoSnap||!currentId) return;
  clearTimeout(snapTimer);
  snapTimer=setTimeout(()=>{ snapshotBook(currentId,'auto').catch(()=>{}); },1600);
}
async function listSnaps(){
  try{ const a=(await IDB.all('snaps'))||[]; return a.sort((x,y)=>y.t-x.t); }catch(e){ return []; }
}
function reasonLabel(r){
  return r==='before-delete'?'删除前留存':(r==='before-restore'?'回滚前留存':(r==='manual'?'手动':'自动'));
}
function snapRowsHTML(snaps){
  if(!snaps.length) return '<div class="hint" style="margin:0">还没有快照。修改任意一章后会自动生成。</div>';
  return snaps.map(s=>{
    const meta=libItem(s.bid);
    return `<div class="snaprow">
      <div><div class="sn-t">${esc(s.title||'未命名作品')}${meta?'':' <span class="badge">原书已删除</span>'}</div>
      <div class="sn-m">${new Date(s.t).toLocaleString('zh-CN')} · ${fmtW(s.words||0)} 字 · ${reasonLabel(s.reason)}</div></div>
      <div class="sn-a">
        <button class="btn xs" data-sact="dl" data-id="${s.id}" title="导出这一份快照（可随时导回）">导出</button>
        <button class="btn xs primary" data-sact="rs" data-id="${s.id}">恢复</button>
        <button class="btn xs danger" data-sact="rm" data-id="${s.id}">删除</button>
      </div></div>`;
  }).join('');
}
async function restoreSnap(sid){
  const s=await IDB.get('snaps',sid);
  if(!s||!s.data){ toast('这份快照已经不在了'); return; }
  if(!confirm('把《'+(s.title||'未命名作品')+'》回滚到 '+new Date(s.t).toLocaleString('zh-CN')+' 的状态？\n\n当前内容会先自动留一份快照，回滚后可以在列表里再切回来。')) return;
  let st=null;
  try{ st=mergeInto(blankState(), JSON.parse(s.data)); }catch(e){ toast('快照内容损坏，无法恢复'); return; }
  let id=s.bid;
  if(!id||!libItem(id)){
    if(!confirm('原书《'+(s.title||'')+'》已经不在书架上了。\n把它作为一本新书恢复到书架？')) return;
    id=createBook(st.meta.title||s.title||'恢复的作品', st.meta.genre||'玄幻修真');
  }else{
    await snapshotBook(id,'before-restore',true);
  }
  try{ localStorage.setItem(LS_BOOK+id, JSON.stringify(st)); }
  catch(e){ toast('恢复失败：浏览器存储空间不足'); return; }
  const it=libItem(id);
  if(it){ it.title=st.meta.title||it.title; it.words=wordsOf(st); it.chapters=(st.outline||[]).length;
          it.done=doneOf(st); it.logline=st.meta.logline||''; it.updated=Date.now(); }
  saveLib();
  if(currentId===id) openBook(id); else renderShelf();
  await renderSafety();
  toast('已回滚到 '+new Date(s.t).toLocaleTimeString('zh-CN',{hour12:false}));
}
async function downloadSnap(sid){
  const s=await IDB.get('snaps',sid);
  if(!s||!s.data){ toast('这份快照已经不在了'); return; }
  download(dwFileName('快照-'+(s.title||'未命名作品')+'-'+stamp())+'.json', s.data, 'application/json');
}
async function delSnap(sid){
  if(!confirm('删除这份快照？')) return;
  await IDB.del('snaps',sid);
  renderSafety();
}

/* ---- ③ 整库备份 / 恢复 ---- */
function exportAllBooks(){
  flushSave();
  const books={};
  lib.items.forEach(it=>{
    try{ const raw=localStorage.getItem(LS_BOOK+it.id); if(raw) books[it.id]=JSON.parse(raw); }catch(e){}
  });
  const pack={ app:'DreamWeaver · 幻梦织者', kind:'full-backup', ver:1, t:Date.now(),
               lib:{active:lib.active, items:lib.items}, api:loadApi()||state.api||{}, books:books };
  download(dwFileName('全部备份-'+stamp())+'.json', JSON.stringify(pack), 'application/json');
  safety.lastBackup=Date.now(); safety.snooze=0; saveSafety();
  updateSafeBanner();
  toast('已导出 '+lib.items.length+' 本书的完整备份');
}
async function importAllFile(file){
  let d=null;
  try{ d=JSON.parse(await file.text()); }catch(e){ toast('文件不是有效的 JSON'); return; }
  if(!d||typeof d!=='object'||!d.books||typeof d.books!=='object'){
    toast('这不是「全部备份」文件，单本书请用「⇧ 导入备份」'); return;
  }
  const entries=Object.entries(d.books);
  if(!entries.length){ toast('备份文件里没有书'); return; }
  const empty=!lib.items.length;
  const msg=empty
    ? '检测到当前书架是空的。\n将完整恢复 '+entries.length+' 本书（含原有 ID 与写作进度），继续？'
    : '将把 '+entries.length+' 本书作为新书导入（不会覆盖现有内容），继续？';
  if(!confirm(msg)) return;
  let ok=0;
  for(const [oldId,raw] of entries){
    let st=null;
    try{ st=mergeInto(blankState(), (typeof raw==='string')?JSON.parse(raw):raw); }catch(e){ continue; }
    let id=oldId;
    if(!empty && libItem(id)) id='';
    if(!id) id=createBook(st.meta.title||'导入的作品', st.meta.genre||'玄幻修真');
    try{ localStorage.setItem(LS_BOOK+id, JSON.stringify(st)); ok++; }catch(e){}
    const it=libItem(id);
    if(it){ it.title=st.meta.title||it.title; it.words=wordsOf(st);
            it.chapters=(st.outline||[]).length; it.done=doneOf(st); it.logline=st.meta.logline||''; }
  }
  if(d.api&&d.api.base){ try{ localStorage.setItem(LS_API, JSON.stringify(d.api)); }catch(e){} }
  saveLib(); renderShelf();
  safety.lastBackup=Date.now(); safety.snooze=0; saveSafety(); updateSafeBanner();
  toast('已恢复 '+ok+' 本书');
  renderSafety();
}

/* ---- ④ 启动时从镜像里把丢失的数据捞回来 ---- */
async function safetyRestore(){
  let hasLocal=false;
  try{
    const d=JSON.parse(localStorage.getItem(LS_LIB)||'null');
    hasLocal=!!(d&&Array.isArray(d.items)&&d.items.length);
  }catch(e){}
  if(hasLocal) return 0;
  await IDB.open();
  const rows=await IDB.all('kv');
  if(!rows||!rows.length) return 0;
  let n=0;
  for(const r of rows){
    if(!r||!r.k||typeof r.v!=='string') continue;
    if(!dwOwnKey(r.k)) continue;
    try{ localStorage.setItem(r.k,r.v); n++; }catch(e){ n++; }   // 失败也没关系，内存里已经有了
  }
  return n;
}

/* ---- 备份提醒条：无痕风险 / 配额不足 / 久未备份 ---- */
let _quota={usage:0,quota:0,t:0};
async function dwQuota(force){
  try{
    if(!force && Date.now()-_quota.t<60000) return _quota;
    if(navigator.storage&&navigator.storage.estimate){
      const e=await navigator.storage.estimate();
      _quota={usage:e.usage||0,quota:e.quota||0,t:Date.now()};
    }
  }catch(e){}
  return _quota;
}
async function updateSafeBanner(){
  const el=$('#safeBanner'); if(!el) return;
  const reasons=[]; let bad=false;
  if(!storageProbe.ls){
    bad=true;
    reasons.push('⚠ 无痕 / 隐私模式：浏览器不允许本地保存，关掉页面或切后台回收，数据就会丢。请立刻导出备份文件。');
  }else if(!lib.items.length){
    el.hidden=true; return;
  }else if(Date.now()<safety.snooze){
    el.hidden=true; return;
  }else if(location.protocol==='file:' && Device.isTouch){
    reasons.push('你正在用手机打开本地文件：浏览器清理缓存后，本地数据可能被一起清掉。建议导出备份文件（可随时导入恢复）。');
  }else if(!safety.lastBackup){
    reasons.push('还没有导出过备份文件。本地存储不等于永久存储，建议现在备份一次。');
  }else if(Date.now()-safety.lastBackup>=3*86400000){
    reasons.push('距上次导出备份已 '+Math.floor((Date.now()-safety.lastBackup)/86400000)+' 天，建议再备份一次。');
  }
  /* 存储配额预警：快撑满时主动提醒导出（写入失败往往就在这一步发生） */
  if(!bad && storageProbe.ls){
    try{
      const q=await dwQuota(false);
      if(q.quota>0){
        const pct=q.usage/q.quota;
        if(pct>=0.85) reasons.push('⚠ 浏览器存储已用 '+Math.round(pct*100)+'%（'+fmtBytes(q.usage)+' / '+fmtBytes(q.quota)+'）：快写不进去了，请立刻导出备份并清理旧书。');
        else if(pct>=0.7) reasons.push('浏览器存储已用 '+Math.round(pct*100)+'%，建议导出备份并清理用不到的旧书。');
      }
    }catch(e){}
  }
  if(!reasons.length){ el.hidden=true; return; }
  el.classList.toggle('bad',bad);
  const tx=$('#safeBannerText'); if(tx) tx.textContent=reasons[0];
  el.hidden=false;
}

/* ---- 数据保险面板 ---- */
async function openSafety(){
  if(!$('#dlg').open) openDlg('<div class="hint" style="margin:0">正在体检本地存储…</div>',[{label:'关闭'}]);
  await renderSafety();
}
async function renderSafety(){
  const body=$('#dlgBody'); if(!body) return;
  const info=await storageInfo();
  const snaps=await listSnaps();
  const devLabel={phone:'手机',tablet:'平板',desktop:'电脑'}[Device.device]||'未知';
  const ori=document.documentElement.dataset.orient==='portrait'?'竖屏':'横屏';
  const pref=Device.pref;
  const lv=v=>('v '+v);
  body.innerHTML=`
    <h3>🛡 数据保险</h3>
    <div class="hint" style="margin-top:0">
      所有内容默认存在<b>浏览器本地</b>。手机上换浏览器、清缓存、无痕模式、系统清理空间，都可能把 localStorage 清掉；
      所以这里再加了三层保险：<b>IndexedDB 镜像</b>、<b>修改自动留快照</b>、<b>备份文件</b>。
    </div>
    <div class="safe-sec">
      <h4>存储体检</h4>
      <div class="kvrow"><span class="k">本地存储 localStorage</span><span class="${lv(info.ls?'ok':'bad')}">${info.ls?'可用':'不可用'+(info.err?'（'+esc(String(info.err).slice(0,36))+'）':'')}</span></div>
      <div class="kvrow"><span class="k">IndexedDB 镜像</span><span class="${lv(info.idb?'ok':'warn')}">${info.idb?'已启用（写入自动双份）':'不可用'}</span></div>
      <div class="kvrow"><span class="k">持久化存储授权</span><span class="${lv(info.persist==='granted'?'ok':'warn')}">${info.persist==='granted'?'已授权，不容易被系统清理':(info.persist==='unsupported'?'此浏览器不支持':'未授权')}</span></div>
      <div class="kvrow"><span class="k">已用空间</span><span class="v">${fmtBytes(info.usage)}${info.quota?' / '+fmtBytes(info.quota)+(info.usage/info.quota>=0.7?('（已用 '+Math.round(info.usage/info.quota*100)+'%，建议导出备份并清理）'):''):''}</span></div>
      <div class="kvrow"><span class="k">上次文件备份</span><span class="${lv(safety.lastBackup?'ok':'warn')}">${safety.lastBackup?new Date(safety.lastBackup).toLocaleString('zh-CN'):'从未备份'}</span></div>
      <div class="toolbar" style="margin-top:8px">
        <button class="btn sm" data-sact="persist">申请持久化存储</button>
        <button class="btn sm primary" data-sact="exportAll">导出全部备份</button>
        <button class="btn sm" data-sact="importAll">从备份文件恢复</button>
      </div>
    </div>
    <div class="safe-sec">
      <h4>自动快照 <span class="hint" style="margin:0">改动后最多每 ${Math.round(safety.snapGap/60000)} 分钟留一份，保留最近 ${SNAP_MAX} 份；元数据含作品名 / 字数 / 时间，可单独导出</span></h4>
      <label class="switch"><input type="checkbox" id="safeAutoSnap" ${safety.autoSnap?'checked':''}> 开启自动快照（出问题可一键回滚）</label>
      <div class="kvrow" style="margin-top:6px"><span class="k">快照间隔</span><span class="v">
        <select id="safeSnapGap">${SNAP_GAP_OPTS.map(o=>`<option value="${o[0]}"${Number(safety.snapGap)===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>
      </span></div>
      <label class="switch" style="margin-top:6px"><input type="checkbox" id="safeMirror" ${safety.mirror?'checked':''}> 同步镜像到 IndexedDB（强烈建议开启）</label>
      <div class="snap-list">${snapRowsHTML(snaps)}</div>
    </div>
    <div class="safe-sec">
      <h4>界面适配 <span class="hint" style="margin:0">自动识别电脑 / 平板 / 手机</span></h4>
      <div class="kvrow"><span class="k">当前识别为</span><span class="v">${devLabel}${Device.isTouch?' · 触屏':''} · ${ori}</span></div>
      <div class="kvrow"><span class="k">界面模式</span>
        <span class="seg2" id="safeDevSeg">
          <button data-dev="auto" class="${pref==='auto'?'on':''}">自动</button>
          <button data-dev="phone" class="${pref==='phone'?'on':''}">手机版</button>
          <button data-dev="desktop" class="${pref==='desktop'?'on':''}">电脑版</button>
        </span>
      </div>
      <div class="hint">「自动」按设备类型切换：手机版会放大按钮与输入框（避免 iOS 聚焦时整页缩放），竖屏强制单列布局；
      「电脑版」保持多栏密度，屏幕小的时候可以横向滑动查看。</div>
    </div>`;
  body.onclick=async e=>{
    const devBtn=e.target.closest('[data-dev]');
    if(devBtn){ Device.setPref(devBtn.dataset.dev); renderSafety(); return; }
    const b=e.target.closest('[data-sact]'); if(!b) return;
    const act=b.dataset.sact, id=+b.dataset.id;
    if(act==='persist'){
      const r=await requestPersist();
      toast(r==='granted'?'已获得持久化存储授权':(r==='unsupported'?'此浏览器不支持该权限':'授权未通过，浏览器仍可能清理数据，建议定期导出备份'));
      renderSafety();
    }
    else if(act==='exportAll') exportAllBooks();
    else if(act==='importAll') $('#fileAllBackup').click();
    else if(act==='dl') downloadSnap(id);
    else if(act==='rs') restoreSnap(id);
    else if(act==='rm') delSnap(id);
  };
  const a=$('#safeAutoSnap'); if(a) a.onchange=e=>{ safety.autoSnap=e.target.checked; saveSafety(); toast(e.target.checked?'已开启自动快照':'已关闭自动快照'); };
  const g=$('#safeSnapGap'); if(g) g.onchange=e=>{ safety.snapGap=Math.max(60000,parseInt(e.target.value)||150000); safety.lastSnap={}; saveSafety(); toast('快照间隔已设为 '+Math.round(safety.snapGap/60000)+' 分钟'); };
  /* 打开过就记下时间，页签红点随之消失 */
  try{ safety.snapSeen=Date.now(); saveSafety(); }catch(e){}
  const m=$('#safeMirror'); if(m) m.onchange=e=>{ safety.mirror=e.target.checked; saveSafety(); toast(e.target.checked?'已开启 IndexedDB 镜像':'已关闭镜像（不建议）'); };
}

/* ---- 切后台 / 关页面：立刻落盘 + 留快照（手机上一旦被回收就来不及了） ---- */
function safetyFlush(reason){
  try{ flushSave(); }catch(e){}
  try{ if(currentId){ snapshotBook(currentId,'auto').catch(()=>{}); } }catch(e){}
  /* 关键内容直接镜像一份，不看防抖计时器 */
  try{
    if(currentId&&safety.mirror){
      IDB.put('kv',{k:LS_BOOK+currentId,v:JSON.stringify(state),t:Date.now()});
      IDB.put('kv',{k:LS_LIB,v:localStorage.getItem(LS_LIB)||'',t:Date.now()});
    }
  }catch(e){}
  try{ updateSafeBanner(); }catch(e){}
}