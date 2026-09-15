/* 数据保险模块功能测试（Node 桩环境） */
const fs=require('fs');
const mod=fs.readFileSync('safety-module.js','utf8');

/* ---------- 假 Storage 类 ---------- */
function makeStorage(failWrite){
  return class Storage{
    constructor(){ this.m=Object.create(null); this.fail=!!failWrite; }
    getItem(k){ k=String(k); return k in this.m ? this.m[k] : null; }
    setItem(k,v){ if(this.fail) throw new Error('QuotaExceededError'); this.m[String(k)]=String(v); }
    removeItem(k){ delete this.m[String(k)]; }
    get length(){ return Object.keys(this.m).length; }
  };
}

/* ---------- 假 indexedDB ---------- */
function makeIDB(){
  const stores={};
  function storeFor(name){
    if(!stores[name]) stores[name]={ data:new Map(), auto:1 };
    return stores[name];
  }
  function req(res){ const r={result:res,onsuccess:null,onerror:null}; setTimeout(()=>r.onsuccess&&r.onsuccess(),0); return r; }
  const db={
    objectStoreNames:{ contains:n=>!!stores[n] },
    createObjectStore(n){ storeFor(n); return { createIndex(){} }; },
    transaction(name){ return {
      objectStore(){ const s=storeFor(name); return {
        put:(v)=>{ const key=(v&&v.k!==undefined)?v.k:(v.id!==undefined?v.id:s.auto++); s.data.set(key, JSON.parse(JSON.stringify(v))); return req(key); },
        get:(k)=>req(s.data.get(k)),
        getAll:()=>req(Array.from(s.data.values())),
        delete:(k)=>{ s.data.delete(k); return req(undefined); },
        clear:()=>{ s.data.clear(); return req(undefined); }
      };},
      set oncomplete(f){ setTimeout(()=>f&&f(),1); },
      set onerror(f){}, set onabort(f){}
    }; }
  };
  return { open(){ const r={result:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
      setTimeout(()=>{ r.result=db; r.onupgradeneeded&&r.onupgradeneeded(); r.onsuccess&&r.onsuccess(); },0); return r; },
    _stores:stores };
}

/* ---------- 环境 ---------- */
function bootEnv(opts){
  opts=opts||{};
  const IDBfake=makeIDB();
  const Storage=makeStorage(opts.failWrite);
  const ls=new Storage();
  const g=globalThis;
  g.Storage=Storage; g.localStorage=ls; g.indexedDB=IDBfake; g.window={Storage, indexedDB:IDBfake};
  g.document={ querySelector:()=>null, documentElement:{dataset:{}} };
  g.navigator={ storage:null };
  g.location={protocol:'https:'};
  g.Device={ isPhone:false, isTouch:false, get device(){return 'desktop';}, get pref(){return 'auto';} };
  g.toast=(m)=>{ (g.__toasts=g.__toasts||[]).push(m); };
  g.$=(sel)=>{ const d=g.document; return d&&d.querySelector?d.querySelector(sel):null; };
  g.esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  g.fmtW=n=>String(n||0);
  g.LS_BOOK='ai-novel-book-'; g.LS_LIB='ai-novel-shelf-v1'; g.LS_API='ai-novel-api-v1'; g.LS_KEY='ai-novel-studio-v2';
  g.currentId=''; g.state={meta:{title:'测试书'},outline:[],chapters:[]};
  g.lib={active:'',items:[]};
  g.libItem=id=>g.lib.items.find(x=>x.id===id);
  g.wordsOf=st=>(st.chapters||[]).reduce((n,c)=>n+((c.content||'').length),0);
  g.doneOf=st=>(st.chapters||[]).filter(c=>c.content).length;
  g.blankState=()=>({meta:{title:''},outline:[],chapters:[]});
  g.mergeInto=(st,d)=>Object.assign(st,d);
  g.createBook=(t)=>{ const id='id'+Math.random().toString(36).slice(2,6); g.lib.items.unshift({id,title:t||'新书'}); g.lib.active=g.lib.active||id; return id; };
  g.saveLib=()=>{ localStorage.setItem('ai-novel-shelf-v1', JSON.stringify(g.lib)); };
  g.renderShelf=()=>{}; g.openBook=()=>{}; g.flushSave=()=>{}; g.loadApi=()=>null;
  g.download=(n,t)=>downloadCalls.push(n);
  g.updateSafeBannerCalls=0;
  g.__downloads=[];
  return {ls, IDBfake, Storage};
}
let downloadCalls=[];
function loadModule(){
  const fn=new Function(mod+`
    return { IDB, safety, loadSafety, saveSafety, probeStorage, fmtBytes, stamp, storageInfo, snapshotBook,
             listSnaps, snapRowsHTML, restoreSnap, exportAllBooks, importAllFile, safetyRestore,
             updateSafeBanner, safetyFlush, MEM_FALLBACK };`);
  return fn();
}

/* ================= 测试 1：写入自动镜像到 IndexedDB ================= */
(async ()=>{
  const env=bootEnv(); downloadCalls=[];
  const M=loadModule();
  await M.IDB.open();
  localStorage.setItem('ai-novel-book-abc','{"meta":{"title":"长夜行舟"}}');
  localStorage.setItem('ai-novel-other','x');           // 非 ai-novel 前缀不镜像
  await new Promise(r=>setTimeout(r,20));
  const kv=env.IDBfake._stores.kv? Array.from(env.IDBfake._stores.kv.data.keys()):[];
  console.log('T1 镜像键:', JSON.stringify(kv));

  /* ================= 测试 2：localStorage 被清空后自动恢复 ================= */
  env.ls.m={};                                           // 模拟被浏览器清掉
  localStorage.setItem('unrelated','keep');
  const n=await M.safetyRestore();
  console.log('T2 恢复条数:', n, '| 恢复内容:', localStorage.getItem('ai-novel-book-abc'), '| 无关键保留:', localStorage.getItem('unrelated'));

  /* ================= 测试 3：快照 / 列表 / 回滚 ================= */
  global.currentId='abc';
  global.lib.items=[{id:'abc',title:'长夜行舟'}];
  localStorage.setItem('ai-novel-book-abc','{"meta":{"title":"长夜行舟"},"chapters":[{"content":"第一章内容"}]}');
  M.safety.snapGap=0;
  await M.snapshotBook('abc','auto',true);
  localStorage.setItem('ai-novel-book-abc','{"meta":{"title":"长夜行舟"},"chapters":[{"content":"被写坏了的内容"}]}');
  const snaps=await M.listSnaps();
  console.log('T3 快照数:', snaps.length, '| 标题:', snaps[0].title, '| 字数:', snaps[0].words);
  const rows=M.snapRowsHTML(snaps);
  console.log('T3 列表HTML片段:', rows.slice(0,80).replace(/\n/g,' ')+'...');
  console.log('T3 恢复按钮存在:', /data-sact="rs"/.test(rows));

  /* ================= 测试 4：保险条提醒判断 ================= */
  const bannerEl={ hidden:true, classList:{ toggle(){}, } };
  const txtEl={ textContent:'' };
  global.document={ querySelector:(sel)=>{ if(sel==='#safeBanner') return bannerEl; if(sel==='#safeBannerText') return txtEl; return null; } };
  M.safety.lastBackup=0;
  global.location={protocol:'file:'}; M.updateSafeBanner();
  console.log('T4 显示保险条:', bannerEl.hidden===false, '| 文案:', txtEl.textContent.slice(0,40));
  M.safety.lastBackup=Date.now(); global.location={protocol:'https:'}; M.updateSafeBanner();
  console.log('T4 刚备份后隐藏:', bannerEl.hidden===true);

  /* ================= 测试 5：无痕模式（setItem 抛错）仍不丢数据 ================= */
  const env2=bootEnv({failWrite:true});
  const M2=loadModule();
  await M2.IDB.open();
  let threw=false;
  try{ localStorage.setItem('ai-novel-book-x','{"hello":1}'); }catch(e){ threw=true; }
  console.log('T5 原生写入抛错:', threw, '| 会话内仍可读:', localStorage.getItem('ai-novel-book-x'), '| 内存兜底:', M2.MEM_FALLBACK.get('ai-novel-book-x'));
  env2.ls.m={};
  const n2=await M2.safetyRestore();
  console.log('T5 镜像恢复条数:', n2, '| 恢复后读取:', localStorage.getItem('ai-novel-book-x'));

  /* ================= 测试 6：字节格式化 & 文件名时间戳 ================= */
  console.log('T6 fmtBytes:', M.fmtBytes(900), M.fmtBytes(2048), M.fmtBytes(5*1048576), '| stamp:', M.stamp());

  /* ================= 测试 7：整库导出不必崩 ================= */
  global.lib={active:'abc',items:[{id:'abc',title:'长夜行舟'}]};
  global.state={meta:{title:'长夜行舟'},api:{}};
  try{ M.exportAllBooks(); console.log('T7 导出调用:', JSON.stringify(downloadCalls)); }
  catch(e){ console.log('T7 ERROR', e.message); }
})();
