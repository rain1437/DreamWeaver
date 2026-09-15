/* 回归：模拟「关掉应用再打开」——复用同一份 localStorage，看能否直接进编辑器 */
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const code=scripts.join('\n;\n')
  +'\n;globalThis.__T={get state(){return state;},get lib(){return lib;},get currentId(){return currentId;},setTab(v){loreTab=v;}};';

const LOG=[], ERR=[];
const ok=(c,m)=>{ LOG.push((c?'  OK  ':'  NG  ')+m); if(!c) ERR.push(m); };
const head=t=>LOG.push('\n=== '+t+' ===');

function newEnv(store){
  function makeEl(tag){
    const el={
      tagName:String(tag||'div').toUpperCase(), _children:[], _attrs:{}, _cls:new Set(),
      dataset:{}, style:{setProperty(){},getPropertyValue(){return '';},removeProperty(){}},
      innerHTML:'', textContent:'', value:'', checked:false, open:false, files:[], _listeners:{},
      classList:{ add:(...c)=>c.forEach(x=>el._cls.add(x)), remove:(...c)=>c.forEach(x=>el._cls.delete(x)),
        toggle:(c,f)=>{ const on=(f===undefined)?!el._cls.has(c):!!f; on?el._cls.add(c):el._cls.delete(c); return on; },
        contains:c=>el._cls.has(c) },
      appendChild:c=>{ el._children.push(c); return c; }, prepend:c=>{ el._children.unshift(c); return c; },
      insertBefore:c=>{ el._children.push(c); return c; }, removeChild:()=>{}, remove:()=>{},
      addEventListener:(t,f)=>{ (el._listeners[t]=el._listeners[t]||[]).push(f); },
      removeEventListener:()=>{}, dispatchEvent:()=>{},
      querySelector:s=>{ if(!el._q) el._q={}; return el._q[s]||(el._q[s]=makeEl('div')); },
      querySelectorAll:()=>[], closest:()=>null, contains:()=>false,
      getBoundingClientRect:()=>({top:0,left:0,width:120,height:120,bottom:120,right:120}),
      focus:()=>{}, blur:()=>{}, click:()=>{ if(el.onclick) el.onclick({target:el,stopPropagation(){}}); },
      showModal:()=>{ el.open=true; }, close:()=>{ el.open=false; },
      setAttribute:(k,v)=>{ el._attrs[k]=v; }, getAttribute:k=>el._attrs[k], scrollIntoView:()=>{},
      get firstElementChild(){ return el._children[0]||null; },
      get previousElementSibling(){ return null; },
      get parentElement(){ return {insertBefore:()=>{},appendChild:()=>{}}; },
      get parentNode(){ return {insertBefore:()=>{},appendChild:()=>{}}; },
      get nextSibling(){ return null; }
    };
    return el;
  }
  const reg={};
  const doc={
    querySelector(sel){ return reg[sel]||(reg[sel]=makeEl('div')); },
    querySelectorAll(){ return []; },
    getElementById(id){ return doc.querySelector('#'+id); },
    createElement:t=>makeEl(t), createTextNode:t=>({textContent:String(t)}),
    addEventListener:()=>{}, removeEventListener:()=>{},
    body:makeEl('body'), head:makeEl('head'), documentElement:makeEl('html'),
    hidden:false, title:'', readyState:'complete', write:()=>{}, open:()=>{}, close:()=>{}
  };
  const localStorage={
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>{ store.set(k,String(v)); },
    removeItem:k=>store.delete(k), clear:()=>store.clear(),
    key:i=>[...store.keys()][i], get length(){ return store.size; }
  };
  const sb={
    console:{log(){},warn(){},error(){}}, setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set, isNaN, parseInt, parseFloat,
    document:doc, localStorage,
    navigator:{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
               onLine:true, language:'zh-CN', maxTouchPoints:0},
    location:{href:'file:///test.html', search:'', hash:'', protocol:'file:'},
    Blob:function(p,o){ this.parts=p; this.type=(o||{}).type; },
    URL:{createObjectURL:()=>'blob:stub', revokeObjectURL:()=>{}},
    requestAnimationFrame:f=>setTimeout(f,0), confirm:()=>true, prompt:()=>null, alert:()=>{},
    getComputedStyle:()=>({getPropertyValue:()=>''}),
    matchMedia:()=>({matches:false,addEventListener(){},addListener(){},removeEventListener(){}}),
    innerWidth:1440, innerHeight:900, devicePixelRatio:1,
    addEventListener:()=>{}, removeEventListener:()=>{},
    fetch:()=>Promise.reject(new Error('stub')), indexedDB:undefined, Storage:undefined
  };
  sb.window=sb; sb.globalThis=sb; sb.self=sb;
  return {sb,doc,reg};
}

const store=new Map();
let booted=0;

function load(label){
  const {sb,doc}=newEnv(store);
  let err=null;
  try{ vm.createContext(sb); vm.runInContext(code, sb, {filename:'app-'+label+'.js'}); }
  catch(e){ err=e; ERR.push(label+' 加载抛异常: '+e.message+' @ '+((e.stack||'').split('\n')[1]||'')); }
  return {sb,doc,err};
}

const first=load('first');
setTimeout(async()=>{
 try{
  head('第 1 次打开（全新）');
  ok(!first.err,'脚本加载无异常');
  const A=first.sb.__T;
  ok(A.lib.items.length===0,'书架初始为空');

  /* 新建一本并写入内容（模拟真实使用） */
  first.sb.newBookDialog();
  const foot=first.doc.querySelector('#dlgFoot');
  const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent));
  create.onclick({target:create,stopPropagation(){}});
  ok(first.doc.querySelector('#editorScreen').style.display==='','已进入编辑器');
  const id=A.currentId;
  A.state.meta.title='重开测试书';
  A.state.lore.gl.master='不得战力崩坏。';
  A.state.lore.w.push({id:'r1',cat:'geo',name:'北境',content:'三重山脉。',note:'',real:false,enabled:true});
  first.sb.setupChapter ? null : null;
  /* 写一章正文，验证章节数据也能往返 */
  if(first.sb.ensureSlot){ first.sb.ensureSlot(0); A.state.chapters[0].content='夜色压城。'; }
  first.sb.flushSave();
  await new Promise(r=>setTimeout(r,30));

  head('模拟关闭：清掉内存，只留 localStorage');
  const keys=[...store.keys()];
  ok(keys.some(k=>k.startsWith('dw-book-')),'书籍已落盘（'+keys.length+' 个键，DreamWeaver- 前缀）');
  ok(keys.includes('dw-shelf-v1'),'书架索引已落盘');

  head('第 2 次打开（关掉再开）');
  const second=load('second');
  ok(!second.err,'重开脚本加载无异常'+(second.err?(' → '+second.err.message):''));
  await new Promise(r=>setTimeout(r,40));
  const B=second.sb.__T;
  ok(B.lib.items.length===1,'书架仍有 1 本书');
  ok(B.currentId===''||B.currentId===id,'自动打开了上次那本书：'+B.currentId);
  ok(second.doc.querySelector('#editorScreen').style.display==='','重启后直接进入编辑器（不是停在书架）');
  ok(B.state.meta.title==='重开测试书','书名完好');
  ok(B.state.lore&&B.state.lore.w.length===1&&B.state.lore.w[0].name==='北境','世界观设定库完好');
  ok(B.state.lore.gl.master.includes('不得战力崩坏'),'全局总提示词完好');
  ok(B.state.chapters[0]&&B.state.chapters[0].content==='夜色压城。','章节正文完好');
  let bp=null,e=null;
  try{ bp=second.sb.buildPrompt(0,'write','梗概'); }catch(x){ e=x; }
  ok(!e&&bp&&bp.sys.includes('北境'),'重启后仍能把设定库注入 System');

  head('第 3 次打开：localStorage 被清掉（模拟清缓存）');
  for(const k of [...store.keys()]) if(!k.startsWith('dw-safety')) store.delete(k);
  const third=load('third');
  ok(!third.err,'清缓存后脚本加载无异常');
  await new Promise(r=>setTimeout(r,40));
  const C=third.sb.__T;
  ok(C.lib.items.length===0,'确认本地已空（' + C.lib.items.length + ' 本）');
  ok(third.doc.querySelector('#shelfScreen').style.display!=='none','此时停书架（符合预期）');
 }catch(e){ ERR.push('main 抛异常: '+e.message+' @ '+((e.stack||'').split('\n')[1]||'')); }

 fs.writeFileSync('reload.log',LOG.join('\n')+'\n\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====\n'+(ERR.length?('\n'+ERR.join('\n')):''));
 process.exit(0);
},60);
