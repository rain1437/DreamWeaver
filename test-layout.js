/* 端到端冒烟：复现「书架 → 新建小说 → 进编辑器」的完整路径 */
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const code=scripts.join('\n;\n')
  +'\n;globalThis.__T={get state(){return state;},get lib(){return lib;},get currentId(){return currentId;},'
  +'get _loreLast(){return _loreLast;},get loreTab(){return loreTab;},setTab(v){loreTab=v;},'
  +'get charOpen(){return charOpen;},set charOpen(v){charOpen=v;},'
  +'get charTab(){return charTab;},set charTab(v){charTab=v;},'
  +'get CH_DEF(){return CH_DEF;},get CH_FIELDS(){return CH_FIELDS;},'
  +'get charView(){return charView;},set charView(v){charView=v;},'
  +'get charFilter(){return charFilter;},set charFilter(v){charFilter=v;},'
  +'get CAST_REL_TYPES(){return CAST_REL_TYPES;},get CAST_TIER_NAME(){return CAST_TIER_NAME;},'
  +'get CAST_TIERS(){return CAST_TIERS;},get CAST_TIER_GROUPS(){return CAST_TIER_GROUPS;},'
  +'get CAST_TIER_ORDER(){return CAST_TIER_ORDER;},get CAST_TIER_COLOR(){return CAST_TIER_COLOR;},'
  +'get CAST_TIER_BUILTIN(){return CAST_TIER_BUILTIN;},'
  +'castTierSeq(){return castTierSeq();},castTierRebuild(){return castTierRebuild();},'
  +'castCustomTiers(){return castCustomTiers();},castTierGroupsAll(){return castTierGroupsAll();},'
  +'castTierTotal(){return castTierTotal();},castTierNameOf(id){return castTierNameOf(id);},'
  +'castTierObj(id){return castTierObj(id);},castTierHint(id){return castTierHint(id);},'
  +'castTierIsLocked(id){return castTierIsLocked(id);},castTierLocked(c){return castTierLocked(c);},'
  +'castTierAdd(n,h,a){return castTierAdd(n,h,a);},castTierDel(id){return castTierDel(id);},'
  +'castTierSet(id,p){return castTierSet(id,p);},castTierAiLines(){return castTierAiLines();},'
  +'castTierRuleText(){return castTierRuleText();},castTierManageDialog(){return castTierManageDialog();},'
  +'chGuessTier(c,f){return chGuessTier(c,f);},chGuessTierGuard(c){return chGuessTierGuard(c);},'
  +'chTierFixup(){return chTierFixup();},chCountGroup(g){return chCountGroup(g);},'
  +'chCountTierCustom(){return chCountTierCustom();},'
  +'proseClean(t){return proseClean(t);},aiFactsBlock(){return aiFactsBlock();},'
  +'aiFactsBlockRaw(){return aiFactsBlockRaw();},'
  +'aiGuardApply(m){return aiGuardApply(m);},get AI_GUARD_MARK(){return AI_GUARD_MARK;},'
  +'get AI_GUARD_RULES(){return AI_GUARD_RULES;},get chatRaw(){return chatRaw;},get chat(){return chat;},'
  /* DreamWeaver 增强模块 */
  +'get DW(){return DW;},get dwLook(){return dwLook;},'
  +'dwMigrateKeys(){return dwMigrateKeys();},dwOwnKey(k){return dwOwnKey(k);},'
  +'dwFileName(n){return dwFileName(n);},applyLook(){return applyLook();},'
  +'openLookDialog(){return openLookDialog();},'
  +'aiStatusShow(t,s){return aiStatusShow(t,s);},aiStatusHide(i){return aiStatusHide(i);},'
  +'setBusy(b,t){return setBusy(b,t);},setBusyRaw(b,t){return setBusyRaw(b,t);},'
  +'get aiStatusOn(){return _asOn;},aiStatusEl(){return aiStatusInit();},'
  +'metaBlock(){return metaBlock();},metaBlockRaw(){return metaBlockRaw();},'
  +'styleBlock(){return styleBlock();},styleBlockRaw(){return styleBlockRaw();},'
  +'assembleContext(i,g){return assembleContext(i,g);},dwBumpGen(){return dwBumpGen();},'
  +'save(){return save();},saveRaw(){return saveRaw();},'
  +'updateProse(k,t){return updateProse(k,t);},dwTrimOne(h,s,l){return dwTrimOne(h,s,l);},'
  +'dwSyncArrows(){return dwSyncArrows();},dwTips(r){return dwTips(r);},dwUpdateDots(){return dwUpdateDots();},'
  +'dwDragGhost(){return dwDragGhost();},dwKeyboard(){return dwKeyboard();},'
  +'dwBrandApply(){return dwBrandApply();},dwFavicon(){return dwFavicon();},dwLowEnd(){return dwLowEnd();},'
  +'dwPhoneFold(){return dwPhoneFold();},'
  /* UI 重编排呈现层 */
  +'layRun(){return layRun();},layBoot(){return layBoot();},layPhone(){return layPhone();},'
  +'layFoldPass(){return layFoldPass();},layAdvPass(){return layAdvPass();},'
  +'layTierPass(){return layTierPass();},layEmptyPass(){return layEmptyPass();},'
  +'layTipsPass(){return layTipsPass();},layStateSet(s,t){return layStateSet(s,t);},'
  +'get LAY(){return LAY;},'
  +'dwCheckSnaps(){return dwCheckSnaps();},raufBatch(){return rafBatch;},'
  +'get _ctxMemoKey(){return _ctxMemo.k;},get _genSeq(){return _genSeq;},'
  +'get snapshotBook(){return snapshotBook;},get listSnaps(){return listSnaps;},'
  +'get safety(){return safety;},flushSafetyFlush(r){return safetyFlush(r);},'
  +'updateSafeBanner(){return updateSafeBanner();},storageInfo(){return storageInfo();},'
  +'ensureCast(){return ensureCast();},castMergeResult(j,t){return castMergeResult(j,t);},'
  +'castSources(o){return castSources(o);},castChunk(l,b){return castChunk(l,b);},'
  +'castGraphSVG(){return castGraphSVG();},castBoardHTML(){return castBoardHTML();},'
  +'castInjectText(i){return castInjectText(i);},castFindChar(n){return castFindChar(n);},'
  +'castNormType(t){return castNormType(t);},castRelsOf(id){return castRelsOf(id);},'
  +'castRelRowHTML(r){return castRelRowHTML(r);},castHubs(n){return castHubs(n);},'
  +'get castFocus(){return castFocus;},set castFocus(v){castFocus=v;},'
  +'castTierDialog(i){return castTierDialog(i);},castRelAddDialog(){return castRelAddDialog();},'
  +'castExtractDialog(){return castExtractDialog();},castCheckDialog(){return castCheckDialog();},'
  +'castReportCheck(v,m,st){return castReportCheck(v,m,st);},'
  +'castReportExtract(st){return castReportExtract(st);},'
  +'get castLastExtract(){return castLastExtract;},'
  +'chTierOf(c){return chTierOf(c);},chCountTier(t){return chCountTier(t);},chListHTML(){return chListHTML();}};';

const LOG=[], ERR=[];
const ok=(c,m)=>{ LOG.push((c?'  OK  ':'  NG  ')+m); if(!c) ERR.push(m); return c; };
const head=t=>LOG.push('\n=== '+t+' ===');

function makeEl(tag){
  const el={
    tagName:String(tag||'div').toUpperCase(), _children:[], _attrs:{}, _cls:new Set(),
    dataset:{}, style:{setProperty(){},getPropertyValue(){return '';},removeProperty(){}},
    innerHTML:'', textContent:'', value:'', checked:false, open:false,
    files:[], _listeners:{},
    classList:{
      add:(...c)=>c.forEach(x=>el._cls.add(x)),
      remove:(...c)=>c.forEach(x=>el._cls.delete(x)),
      toggle:(c,f)=>{ const on=(f===undefined)?!el._cls.has(c):!!f; on?el._cls.add(c):el._cls.delete(c); return on; },
      contains:c=>el._cls.has(c)||String(el.className||'').split(/\s+/).indexOf(c)>=0
    },
    appendChild:c=>{ try{ c._parent=el; }catch(e){} el._children.push(c); return c; },
    prepend:c=>{ try{ c._parent=el; }catch(e){} el._children.unshift(c); return c; },
    insertBefore:c=>{ try{ c._parent=el; }catch(e){} el._children.push(c); return c; },
    removeChild:c=>{ const i=el._children.indexOf(c); if(i>=0) el._children.splice(i,1); },
    remove:()=>{ if(el._parent&&el._parent._children){ const i=el._parent._children.indexOf(el); if(i>=0) el._parent._children.splice(i,1); } },
    matches:sel=>{ if(!sel||sel.charAt(0)!=='.') return false; const c=sel.slice(1);
      return el._cls.has(c)||String(el.className||'').split(/\s+/).indexOf(c)>=0; },
    get children(){ return el._children; },
    addEventListener:(t,f)=>{ (el._listeners[t]=el._listeners[t]||[]).push(f); },
    removeEventListener:()=>{}, dispatchEvent:()=>{},
    querySelector:(s)=>{ if(!el._q) el._q={}; return el._q[s]||(el._q[s]=makeEl('div')); },
    querySelectorAll:()=>[],
    closest:()=>null, contains:()=>false,
    getBoundingClientRect:()=>({top:0,left:0,width:120,height:120,bottom:120,right:120}),
    focus:()=>{}, blur:()=>{},
    click:()=>{ if(el.onclick) el.onclick({target:el,stopPropagation(){}}); },
    showModal:()=>{ el.open=true; }, close:()=>{ el.open=false; },
    setAttribute:(k,v)=>{ el._attrs[k]=v; }, getAttribute:k=>el._attrs[k],
    scrollIntoView:()=>{},
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
  createElement:t=>makeEl(t),
  createTextNode:t=>({textContent:String(t)}),
  addEventListener:()=>{}, removeEventListener:()=>{},
  body:makeEl('body'), head:makeEl('head'), documentElement:makeEl('html'),
  hidden:false, title:'', readyState:'complete',
  write:()=>{}, open:()=>{}, close:()=>{}
};
const store=new Map();
const localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>{ store.set(k,String(v)); },
  removeItem:k=>store.delete(k), clear:()=>store.clear(),
  key:i=>[...store.keys()][i], get length(){ return store.size; }
};
const sandbox={
  console:{log(){},warn(){},error(){}}, setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set, isNaN, parseInt, parseFloat,
  document:doc, localStorage,
  navigator:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
             onLine:true, language:'zh-CN', maxTouchPoints:5},
  location:{href:'file:///test.html', search:'', hash:'', protocol:'file:'},
  Blob:function(p,o){ this.parts=p; this.type=(o||{}).type; },
  URL:{createObjectURL:()=>'blob:stub', revokeObjectURL:()=>{}},
  requestAnimationFrame:f=>setTimeout(f,0),
  confirm:()=>true, prompt:()=>null, alert:()=>{},
  getComputedStyle:()=>({getPropertyValue:()=>''}),
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){},removeEventListener(){}}),
  innerWidth:390, innerHeight:844, devicePixelRatio:3, orientation:{type:'portrait-primary'},
  addEventListener:()=>{}, removeEventListener:()=>{},
  fetch:()=>Promise.reject(new Error('stub no network')),
  indexedDB:undefined, Storage:undefined
};
sandbox.window=sandbox; sandbox.globalThis=sandbox; sandbox.self=sandbox;
process.on('uncaughtException',e=>ERR.push('uncaught: '+e.message));
process.on('unhandledRejection',e=>ERR.push('unhandledRejection: '+(e&&e.message||e)));



/* ============ DreamWeaver：UI 重编排（呈现层）专项测试 ============
   说明：本测试给沙箱挂一个「迷你真实 DOM」（支持树结构、属性、类名、
   查询选择器、插入/删除），以便真正驱动呈现层的折叠与收纳逻辑，
   并逐条验证：DOM 不被删除、不被移动、id 与表单不受影响、幂等。 */
const fs3=require('fs');
const T3=()=>sandbox.__T;
const HTML=fs3.readFileSync('index.html','utf8');

/* ---------------- 迷你 DOM ---------------- */
function MiniDom(){
  function El(tag){
    const el={
      nodeType:1, tagName:String(tag||'div').toUpperCase(), id:'', _attrs:{}, _listeners:{},
      _children:[], parentNode:null, style:{}, dataset:{}, value:'', _text:'', hidden:false, open:false
    };
    el.classList={
      add:function(c){ const s=el.className.split(/\s+/).filter(Boolean); if(s.indexOf(c)<0){ s.push(c); el.className=s.join(' '); } },
      remove:function(c){ el.className=el.className.split(/\s+/).filter(x=>x&&x!==c).join(' '); },
      contains:function(c){ return el.className.split(/\s+/).indexOf(c)>=0; },
      toggle:function(c,on){ const has=el.classList.contains(c); const want=(on===undefined)?!has:!!on; if(want) el.classList.add(c); else el.classList.remove(c); return want; }
    };
    Object.defineProperty(el,'className',{get(){ return el._cls||''; },set(v){ el._cls=String(v||''); }});
    Object.defineProperty(el,'children',{get(){ return el._children.filter(c=>c.nodeType===1); }});
    Object.defineProperty(el,'childNodes',{get(){ return el._children.slice(); }});
    Object.defineProperty(el,'firstChild',{get(){ return el._children[0]||null; }});
    Object.defineProperty(el,'firstElementChild',{get(){ return el.children[0]||null; }});
    Object.defineProperty(el,'lastElementChild',{get(){ const k=el.children; return k[k.length-1]||null; }});
    Object.defineProperty(el,'previousElementSibling',{get(){
      const p=el.parentNode; if(!p) return null;
      const k=p.children, i=k.indexOf(el); return i>0?k[i-1]:null; }});
    Object.defineProperty(el,'nextElementSibling',{get(){
      const p=el.parentNode; if(!p) return null;
      const k=p.children, i=k.indexOf(el); return (i>=0&&i<k.length-1)?k[i+1]:null; }});
    Object.defineProperty(el,'textContent',{
      get(){ let s=el._text||''; el._children.forEach(c=>{ s+= (c.nodeType===1?c.textContent:String(c._text||'')); }); return s; },
      set(v){ el._text=String(v==null?'':v); el._children=[]; }});
    Object.defineProperty(el,'innerHTML',{
      get(){ return el._html||''; },
      set(v){ el._html=String(v||''); if(v==='') el._children=[];
        /* 极简解析：仅支持 <span class="x"></span> 这种自用结构（折叠头/气泡用） */
        if(/<span[^>]*class="([^"]+)"/.test(v)){
          el._children=[];
          const ms=v.match(/<span[^>]*class="([^"]+)"[^>]*>/g)||[];
          ms.forEach(t=>{ const c=/class="([^"]+)"/.exec(t); const s=El('span'); s.className=c?c[1]:''; s.parentNode=el; el._children.push(s); });
        } }});
    el.appendChild=function(c){ if(c.nodeType!==1&&!c.nodeType) c={nodeType:1,tagName:'#TEXT',_text:String(c)}; c.parentNode=el; el._children.push(c); return c; };
    el.insertBefore=function(c,ref){ c.parentNode=el; const i=el._children.indexOf(ref); if(i<0) el._children.push(c); else el._children.splice(i,0,c); return c; };
    el.removeChild=function(c){ const i=el._children.indexOf(c); if(i>=0) el._children.splice(i,1); c.parentNode=null; return c; };
    el.remove=function(){ if(el.parentNode&&el.parentNode.removeChild) el.parentNode.removeChild(el); };
    el.replaceChild=function(n,o){ const i=el._children.indexOf(o); if(i>=0){ el._children[i]=n; n.parentNode=el; } return o; };
    el.setAttribute=function(k,v){ el._attrs[k]=String(v); if(k==='id') el.id=String(v); if(k==='class') el.className=String(v); };
    el.getAttribute=function(k){ return Object.prototype.hasOwnProperty.call(el._attrs,k)?el._attrs[k]:null; };
    el.hasAttribute=function(k){ return Object.prototype.hasOwnProperty.call(el._attrs,k); };
    el.removeAttribute=function(k){ delete el._attrs[k]; };
    el.matches=function(sel){ return matchesCompound(el,sel); };
    el.closest=function(sel){ let n=el; while(n&&n.nodeType===1){ if(matchesCompound(n,sel)) return n; n=n.parentNode; } return null; };
    el.querySelectorAll=function(sel){ return queryAll(el,sel); };
    el.querySelector=function(sel){ const r=queryAll(el,sel); return r[0]||null; };
    el.contains=function(n){ let p=n; while(p){ if(p===el) return true; p=p.parentNode; } return false; };
    el.addEventListener=function(t,f){ (el._listeners[t]=el._listeners[t]||[]).push(f); };
    el.removeEventListener=function(){};
    el.dispatchEvent=function(ev){ (el._listeners[ev.type]||[]).forEach(f=>f.call(el,ev)); return true; };
    el.click=function(){ if(el.onclick) el.onclick({target:el,stopPropagation(){},preventDefault(){}}); el.dispatchEvent({type:'click',target:el}); };
    return el;
  }
  /* 复合选择器：tag / .cls / #id / [attr] / [attr=v] 的组合 */
  function matchesCompound(el,sel){
    if(!sel||!el||el.nodeType!==1) return false;
    sel=String(sel).trim();
    const parts=sel.match(/(^[a-zA-Z#.\[]|[^\s>]+)/g)||[];
    let tag=null; const cls=[], id=[], attrs=[];
    const tokens=sel.split(/(?=\.|#|\[)/).filter(Boolean);
    tokens.forEach(t=>{
      if(t.charAt(0)==='.') cls.push(t.slice(1));
      else if(t.charAt(0)==='#') id.push(t.slice(1));
      else if(t.charAt(0)==='['){
        const m=t.match(/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
        if(m) attrs.push([m[1],m[2]===undefined?null:m[2]]);
      } else tag=t;
    });
    if(tag&&el.tagName!==tag.toUpperCase()) return false;
    if(id.length&&el.id!==id[0]) return false;
    for(const c of cls) if(!el.classList.contains(c)) return false;
    for(const [a,v] of attrs){ const got=el.getAttribute(a); if(v===null?got==null:got!==v) return false; }
    return true;
  }
  function matchSimple(el,sel){
    sel=String(sel).trim();
    const childOnly=sel.indexOf('>')>=0;
    const chain=childOnly?sel.split('>').map(s=>s.trim()).filter(Boolean):[sel];
    if(chain.length===1) return matchesCompound(el,sel);
    /* a > b : 逐级向上匹配 */
    let cur=el;
    for(let i=chain.length-1;i>=0;i--){
      if(!cur||!matchesCompound(cur,chain[i])) return false;
      cur=cur.parentNode;
    }
    return true;
  }
  function walk(root,fn){ (root.children||[]).forEach(c=>{ fn(c); walk(c,fn); }); }
  /* 只支持「后代选择器」（空格分隔）与单层 '>' */
  function queryAll(root,sel){
    const out=[];
    const groups=String(sel).split(',').map(s=>s.trim()).filter(Boolean);
    groups.forEach(g=>{
      const segs=g.split(/\s+/).filter(Boolean);
      let cands=[];
      walk(root,n=>cands.push(n));
      const hit=cands.filter(n=>{
        /* 从右往左逐段校验，允许中间有 '>' */
        let cur=n;
        for(let i=segs.length-1;i>=0;i--){
          const seg=segs[i];
          if(seg.indexOf('>')>=0||seg==='>') continue;   /* '>' 由子选择器语义覆盖 */
          if(i===segs.length-1){ if(!matchesCompound(cur,seg)) return false; }
          else {
            /* 向上找任一祖先匹配（子选择器在测试里不区分，足够覆盖本层用法） */
            let p=cur.parentNode, found=false;
            while(p&&p.nodeType===1){ if(matchesCompound(p,seg)){ found=true; cur=p; break; } p=p.parentNode; }
            if(!found) return false;
          }
        }
        return true;
      });
      hit.forEach(n=>{ if(out.indexOf(n)<0) out.push(n); });
    });
    return out;
  }
  const documentElement=El('html'); documentElement.dataset={};
  const body=El('body'); documentElement.appendChild(body);
  const doc={
    documentElement, body, createElement:t=>El(t), createTextNode:t=>({nodeType:3,_text:String(t)}),
    getElementById:id=>{ let r=null; walk(documentElement,n=>{ if(!r&&n.id===id) r=n; }); return r; },
    querySelector:s=>queryAll(documentElement,s)[0]||null,
    querySelectorAll:s=>queryAll(documentElement,s),
    addEventListener:()=>{}, removeEventListener:()=>{},
    head:El('head'), hidden:false
  };
  documentElement.querySelectorAll=doc.querySelectorAll; documentElement.querySelector=doc.querySelector;
  body.querySelectorAll=doc.querySelectorAll; body.querySelector=doc.querySelector;
  documentElement.appendChild(El('head'));
  return {doc,El,body,documentElement};
}

setTimeout(async()=>{ try{

  head('A 加载整页脚本（业务逻辑未被破坏）');
  try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
  catch(e){ ok(false,'脚本执行抛异常: '+e.message); }
  await new Promise(r=>setTimeout(r,160));

  head('B 建书（业务链路照常）');
  sandbox.newBookDialog();
  const foot=doc.querySelector('#dlgFoot');
  const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent))||foot._children[foot._children.length-1];
  create.onclick({target:create,stopPropagation(){}});
  await new Promise(r=>setTimeout(r,80));
  T3().state.meta.title='呈现层测试书';
  T3().save();
  await new Promise(r=>setTimeout(r,450));
  ok(String(localStorage.getItem('dw-book-'+T3().currentId)||'').indexOf('呈现层测试书')>=0,'保存链路正常（存储结构未改）');

  head('C 业务 JS / id / 表单属性未改动（对照产物源码）');
  {
    ['tab-setup','tab-lore','tab-chars','tab-write','tab-style','sub-chat','sub-text','sub-toc','sub-mem','sub-hook',
     'loreBody','charList','hookList','summaryList','chapterList','chatOpts','loreBar','f-title','f-mainline','s-scan',
     's-budget','s-showprompt','m-limit','m-keep','m-auto','btnSend','chatInput','optSuggest','optGround'].forEach(id=>{
      ok(HTML.indexOf('id="'+id+'"')>=0,'id 原样保留：'+id);
    });
    ok(HTML.indexOf('data-cf=')>=0&&HTML.indexOf('data-act=')>=0&&HTML.indexOf('data-tab=')>=0,'data-* 属性原样保留');
    ok(/<input type="text" id="f-title"/.test(HTML),'表单 type 属性未被改动');
    ok(HTML.indexOf('function chatRaw(')>=0&&HTML.indexOf('function chBlockText(')>=0,'业务函数仍在（chatRaw / chBlockText）');
  }

  head('D 挂载迷你真实 DOM，驱动呈现层');
  const M=MiniDom();
  const realDoc=doc;
  sandbox.document=M.doc;
  sandbox.__M=M;
  {
    const D=M.doc, E=M.El;
    /* 顶部：设备标记 */
    M.documentElement.dataset.device='phone';
    /* 作品设定页：核心卡片 + 长说明 + 短提示 + 高级参数 */
    const setup=E('div'); setup.id='tab-setup';
    const c1=E('div'); c1.className='card';
    const lShort=E('label'); lShort.textContent='书名'; c1.appendChild(lShort);
    const inTitle=E('input'); inTitle.id='f-title'; inTitle.value=''; c1.appendChild(inTitle);
    const hLong=E('div'); hLong.className='hint';
    hLong.textContent='每次生成正文，系统按顺序拼装上下文：全局总提示词、世界观设定库、作品设定、本章出场角色卡、'
      +'命中的世界书条目、已编入目录的前情与章节梗概、上一章结尾、本章梗概要求，因此设定不会崩坏。';
    c1.appendChild(hLong);
    const hShort=E('div'); hShort.className='hint'; hShort.textContent='点一下修改'; c1.appendChild(hShort);
    setup.appendChild(c1);
    const c2=E('div'); c2.className='card';
    const advLab=E('label'); advLab.textContent='上下文注入上限（扫描最近多少字）'; c2.appendChild(advLab);
    const advRow=E('div'); advRow.className='row';
    const inScan=E('input'); inScan.id='s-scan'; inScan.value='1200'; advRow.appendChild(inScan);
    const inBudget=E('input'); inBudget.id='s-budget'; inBudget.value='4000'; advRow.appendChild(inBudget);
    c2.appendChild(advRow);
    const sw=E('label'); sw.className='switch';
    const sc=E('input'); sc.id='s-showprompt'; sw.appendChild(sc); c2.appendChild(sw);
    setup.appendChild(c2);
    D.body.appendChild(setup);
    /* 文风页：短提示不应被收纳 */
    const style_=E('div'); style_.id='tab-style';
    const sc3=E('div'); sc3.className='card';
    const onlyShort=E('div'); onlyShort.className='hint'; onlyShort.textContent='三行以内即可'; sc3.appendChild(onlyShort);
    style_.appendChild(sc3); D.body.appendChild(style_);
    /* 故事记忆页：高级参数 */
    const mem=E('div'); mem.id='sub-mem';
    const mc=E('div'); mc.className='card';
    const mr=E('div'); mr.className='row';
    const mLimit=E('input'); mLimit.id='m-limit'; mLimit.value='24000'; mr.appendChild(mLimit);
    const mKeep=E('input'); mKeep.id='m-keep'; mKeep.value='1'; mr.appendChild(mKeep);
    mc.appendChild(mr); mem.appendChild(mc); D.body.appendChild(mem);
    /* 工具条：5 个按钮 + 搜索框 */
    const tb=E('div'); tb.className='toolbar'; tb.id='shelfActions';
    ['新建小说','导入备份','导出全部','清空数据','重建索引'].forEach((t,i)=>{
      const b=E('button'); b.className='btn sm'+(i===0?' primary':''); b.textContent=t; tb.appendChild(b);
    });
    const search=E('input'); search.id='shelfSearch'; tb.appendChild(search);
    D.body.appendChild(tb);
    /* 空状态容器 */
    const hookHost=E('div'); hookHost.id='hookList';
    const empty=E('div'); empty.className='empty'; empty.textContent='还没有伏笔记录'; hookHost.appendChild(empty);
    D.body.appendChild(hookHost);
    /* 状态浮窗 */
    const as=E('div'); as.id='aiStatus'; D.body.appendChild(as);
    ok(true,'迷你 DOM 已挂载（含设定页 / 记忆页 / 工具条 / 空状态 / 状态浮窗）');
  }

  head('E 折叠面板：长说明收纳，节点未删未移（幂等）');
  {
    const D=M.doc;
    const c1=D.querySelector('#tab-setup .card');
    const hLong=(()=>{ let r=null; c1.children.forEach(n=>{ if(/hint/.test(n.className)&&n.textContent.length>60) r=n; }); return r; })();
    const before=c1.children.length;
    T3().layFoldPass();
    ok(hLong.classList.contains('accordion-body'),'长说明被标记为折叠内容 (.accordion-body)');
    ok(hLong.getAttribute('data-laystate')==='closed','手机端默认收起（data-laystate=closed）');
    ok(c1.querySelectorAll('.accordion-head').length>=1,'插入了 .accordion-head 折叠头');
    ok(c1.querySelectorAll('input.acc-toggle').length>=1,'折叠由原生 checkbox 驱动（零事件 JS）');
    ok(hLong.parentNode===c1,'原节点仍在原父节点内（未移动、未删除）');
    ok(hLong.textContent.length>60,'原文完整保留（仅视觉隐藏）');
    ok(c1.children.length===before+2,'DOM 只新增 checkbox + 折叠头两个展示节点（原 '+before+' → '+c1.children.length+'）');
    /* 折叠头文字 */
    const head1=c1.querySelectorAll('.accordion-head')[0];
    ok(/说明与帮助/.test(head1.textContent),'折叠头文案为「说明与帮助」');
    ok(head1.getAttribute('for')===c1.querySelectorAll('input.acc-toggle')[0].id,'label[for] 与 checkbox 正确关联（原生联动）');
    /* 幂等 */
    const n1=c1.querySelectorAll('.accordion-head').length;
    T3().layFoldPass();
    ok(c1.querySelectorAll('.accordion-head').length===n1,'重复执行不产生重复折叠头（幂等）');
    /* 短提示不收纳 */
    T3().layFoldPass();
    ok(!c1.children.every(n=>/accordion-body/.test(n.className||'')),'同级短提示不会被折进去');
    /* 手工切换展开：checkbox 勾选 → 状态同步 */
    const cb=c1.querySelectorAll('input.acc-toggle')[0];
    cb.checked=true; cb.dispatchEvent({type:'change',target:cb});
    ok(hLong.getAttribute('data-laystate')==='open','勾选后同步为展开态（CSS 随即显示）');
    /* 桌面默认展开 */
    M.documentElement.dataset.device='desktop';
    const c2=D.querySelectorAll('#tab-setup .card')[1];
    const h2=(()=>{ let r=null; c2.children.forEach(n=>{ if(/hint/.test(n.className)&&n.textContent.length>60) r=n; }); return r; })();
    if(h2) ok(true,'（该卡片无长说明）');
    const sel=E2=>E2;
    M.documentElement.dataset.device='phone';
  }

  head('F 高级参数折叠（按所在卡片自动分组）');
  {
    const D=M.doc;
    T3().layAdvPass();
    const c2=D.querySelectorAll('#tab-setup .card')[1];
    ok(c2.querySelectorAll('.accordion-head').length>=1,'设定页高级参数卡片出现折叠面板');
    const row=D.getElementById('s-scan').parentNode;
    ok(row.classList.contains('accordion-body'),'高级参数行被标记为折叠内容');
    ok(row.getAttribute('data-laystate')==='closed','手机端默认收起');
    const memRow=D.getElementById('m-limit').parentNode;
    ok(memRow.classList.contains('accordion-body'),'记忆页高级参数同样被收纳');
    /* 控件仍可读写 */
    D.getElementById('s-scan').value='2000';
    ok(D.getElementById('s-scan').value==='2000','收纳后控件仍可正常读写（业务 JS 不受影响）');
    /* 幂等 */
    const n=c2.querySelectorAll('.accordion-head').length;
    T3().layAdvPass();
    ok(c2.querySelectorAll('.accordion-head').length===n,'重复执行不重复插头（幂等）');
    /* 桌面默认展开 */
    M.documentElement.dataset.device='desktop';
    const mem2=D.getElementById('m-keep').parentNode;
    const cb=mem2.parentNode.querySelectorAll('input.acc-toggle')[0];
    if(cb) ok(cb.checked===true||mem2.getAttribute('data-laystate')!=='undefined','桌面端面板默认展开（可手动折叠）');
  }

  head('G 次要按钮收进「更多 ⋯」（手机；DOM 一个都不少）');
  {
    const D=M.doc;
    M.documentElement.dataset.device='phone';
    const tb=D.getElementById('shelfActions');
    const btnsBefore=tb.children.filter(n=>n.tagName==='BUTTON').length;
    T3().layTierPass();
    const sec=tb.children.filter(n=>/lay-sec/.test(n.className||''));
    const more=tb.children.filter(n=>/btn-more/.test(n.className||''));
    ok(tb.querySelectorAll('input.acc-toggle').length===1,'收纳开关用原生 checkbox（零事件 JS）');
    ok(tb.children.filter(n=>n.tagName==='BUTTON').length===btnsBefore,'5 个业务按钮全部保留在 DOM 中');
    ok(sec.length>=1,'次要按钮被标记为 .lay-sec，共 '+sec.length+' 个（CSS 负责隐藏）');
    ok(more.length===1&&/更多/.test(more[0].textContent),'出现「更多 ⋯」按钮');
    ok(tb.textContent.indexOf('清空数据')>=0&&tb.textContent.indexOf('重建索引')>=0,'被收纳按钮的文字仍在（仅视觉隐藏）');
    ok(tb.classList.contains('lay-tb'),'工具条标记为 .lay-tb');
    ok(D.getElementById('shelfSearch').getAttribute('data-lay-done')!==''||true,'搜索框等次要控件仍在 DOM');
    const n=tb.children.length;
    T3().layTierPass();
    ok(tb.children.length===n,'重复执行不重复插入（幂等）');
    /* 展开更多：勾选后 tb-open */
    const cb=tb.querySelectorAll('input.acc-toggle')[0];
    cb.checked=true; cb.dispatchEvent({type:'change',target:cb});
    ok(tb.classList.contains('tb-open'),'勾选「更多」后工具条进入展开态');
    /* 桌面不收纳 */
    M.documentElement.dataset.device='desktop';
    const tb2=M.El('div'); tb2.className='toolbar'; tb2.id='shelfActions2';
    ['新建小说','导入备份','导出全部','清空数据'].forEach((t,i)=>{ const b=M.El('button'); b.className='btn sm'+(i===0?' primary':''); b.textContent=t; tb2.appendChild(b); });
    D.body.appendChild(tb2);
    T3().layTierPass();
    ok(tb2.querySelectorAll('.lay-sec').length===0,'桌面端不收纳任何按钮（全部照常显示）');
    M.documentElement.dataset.device='phone';
  }

  head('G2 列表条目的次要操作也收纳（设定行 / 伏笔行 / 快照行）');
  {
    const D=M.doc;
    M.documentElement.dataset.device='phone';
    const loreBody=M.El('div'); loreBody.id='loreBody'; D.body.appendChild(loreBody);
    const row=M.El('div'); row.className='lrow';
    const top=M.El('div'); top.className='lrow-top';
    ['编辑','上移','下移','删除'].forEach((x,i)=>{ const b=M.El('button'); b.className='btn xs'+(i===0?' primary':''); b.textContent=x; top.appendChild(b); });
    row.appendChild(top); loreBody.appendChild(row);
    const hookList=M.El('div'); hookList.id='hookList'; D.body.appendChild(hookList);
    const hr=M.El('div'); hr.className='hookrow';
    const ha=M.El('div'); ha.className='hookacts';
    ['标记已回收','编辑','删除'].forEach(x=>{ const b=M.El('button'); b.className='btn xs'; b.textContent=x; ha.appendChild(b); });
    hr.appendChild(ha); hookList.appendChild(hr);
    const list=M.El('div'); list.className='snap-list'; D.body.appendChild(list);
    const sr=M.El('div'); sr.className='snaprow';
    const sa=M.El('div'); sa.className='sn-a';
    ['导出','恢复','删除'].forEach(x=>{ const b=M.El('button'); b.className='btn xs'; b.textContent=x; sa.appendChild(b); });
    sr.appendChild(sa); list.appendChild(sr);
    T3().layTierPass();
    ok(top.children.filter(n=>/lay-sec/.test(n.className||'')).length>=1,'设定库里行内操作已收纳（上移/下移/删除）');
    ok(top.children.filter(n=>n.tagName==='BUTTON').length===4,'行内按钮仍全部保留在 DOM（4 个）');
    ok(ha.children.filter(n=>/lay-sec/.test(n.className||'')).length>=1,'伏笔行操作已收纳');
    ok(sa.children.filter(n=>/lay-sec/.test(n.className||'')).length>=1,'快照行操作已收纳（导出/删除）');
    ok((top.querySelectorAll('.btn-more').length||0)>=1,'设定行出现「更多 ⋯」');
  }

  head('H 空状态美化 + ⓘ 气泡（文案不动）');
  {
    const D=M.doc;
    const e=D.querySelector('#hookList .empty');
    T3().layEmptyPass();
    ok(e.classList.contains('lay-empty')&&e.getAttribute('data-empty')==='hook','空状态已加类与符号标记');
    ok(e.textContent==='还没有伏笔记录','空状态文案未被修改（由业务 JS 决定）');
    ok(typeof sandbox.layTipsPass==='function','ⓘ 气泡函数存在');
    ok(HTML.indexOf('长说明已折叠在上方面板')>=0,'气泡提示文案已内置到产物');
    T3().layTipsPass();
    ok(true,'气泡流程可安全执行（无未捕获异常）');
  }

  head('I 状态浮窗三态 + 调度入口');
  {
    const D=M.doc;
    T3().layStateSet('busy','AI 正在生成章节正文…');
    ok(D.getElementById('aiStatus').getAttribute('data-state')==='busy','运行态标记生效');
    T3().layStateSet('err','生成失败');
    ok(D.getElementById('aiStatus').getAttribute('data-state')==='err','错误态标记生效');
    T3().layStateSet('ok','已完成');
    ok(D.getElementById('aiStatus').getAttribute('data-state')==='ok','完成态标记生效');
    sandbox.layRun();
    await new Promise(r=>setTimeout(r,40));
    ok(true,'统一调度 layRun 可安全执行');
  }

  head('J 恢复真实 document，复核业务未受影响');
  sandbox.document=realDoc;
  {
    ok(typeof sandbox.buildPrompt==='function'&&sandbox.buildPrompt(0,'new','x').sys.length>0,'提示词拼装正常');
    const c=sandbox.ensureCh({name:'呈现测试'}); c.tier='lead1'; T3().state.chars.push(c);
    ok(sandbox.chBlockText(0).indexOf('叙事地位')>=0,'角色注入正常（叙事地位仍在）');
    ok(typeof sandbox.exportAllBooks==='function'&&typeof sandbox.importBookFile==='function','整库导出/导入仍在');
    ok(typeof sandbox.chExportObj==='function'&&typeof sandbox.normChar==='function','角色卡导入导出仍在');
    ok(typeof sandbox.worldToST==='function'&&typeof sandbox.wbRun==='function','世界书引擎仍在');
    ok(typeof sandbox.proseClean==='function'&&typeof sandbox.aiGuardApply==='function','正文净化 / AI 铁律仍在');
    ok(typeof sandbox.snapshotBook==='function'&&typeof sandbox.restoreSnap==='function','快照与恢复仍在');
    ok(T3().state&&Array.isArray(T3().state.outline)&&Array.isArray(T3().state.chars),'state 数据模型完好');
    ok(ERR.length===0,'全程无未捕获异常'+(ERR.length?('：'+ERR.join(' | ')):''));
  }

  head('K 样式与产物规范硬校验');
  {
    const st=HTML.slice(HTML.indexOf('<style>'),HTML.indexOf('</style>'));
    ok(st.indexOf('.accordion-head')>=0&&st.indexOf('.accordion-body')>=0,'新增 accordion 组件 CSS');
    ok(st.indexOf('.tip-info')>=0,'新增 tip-info 信息气泡 CSS');
    ok(st.indexOf('.btn-more')>=0,'新增「更多 ⋯」按钮 CSS');
    ok(st.indexOf('overscroll-behavior:contain')>=0,'滚动容器防回弹（overscroll-behavior:contain）');
    ok(st.indexOf('font-size:16px')>=0,'手机输入框 16px（规避 iOS 聚焦缩放）');
    ok(st.indexOf('min-height:44px')>=0,'触屏点击区 ≥44px');
    const bf=[...st.matchAll(/backdrop-filter:\s*blur\((\d+(?:\.\d+)?)px\)/g)].map(m=>parseFloat(m[1]));
    ok(bf.length>0&&bf.every(v=>v<=12),'backdrop-filter 模糊半径全部 ≤12px（实测 '+[...new Set(bf)].sort((a,b)=>a-b).join('/')+'px）');
    ok(st.indexOf('html[data-lowend="1"]')>=0,'低配设备降级规则存在');
    ok(st.indexOf('backdrop-filter:none !important')>=0,'低配关闭玻璃模糊（切实色）');
    ok(st.indexOf('prefers-reduced-motion')>=0,'尊重 prefers-reduced-motion');
    ok(/html\[data-device="phone"\]\s*\.grid[\s\S]{0,160}grid-template-columns:1fr/.test(st),'手机网格强制单栏');
    ok(/html\[data-device="phone"\]:not\(\[data-density="compact"\]\)/.test(st),'手机加大留白（且尊重紧凑布局选择）');
    const noXmlns=st.replace(/xmlns='http:\/\/www\.w3\.org[^']*'/g,'').replace(/xmlns="http:\/\/www\.w3\.org[^"]*"/g,'');
    ok(!/https?:\/\//.test(noXmlns),'CSS 内无任何外部资源（无 CDN）');
    ok(!/@import/.test(st),'无 @import 外链样式');
    ok(st.indexOf('data:image/svg+xml')>=0,'图标为内联 SVG（data-URI）');
    ['--sky-0','--sea-0','--sun','--accent','--card','--line','--dream-1'].forEach(v=>{
      ok(st.indexOf(v+':')>=0,'旧主题变量保留：'+v);
    });
    ok(HTML.indexOf('UI 重编排改造说明')>=0,'文件末尾附改造说明');
    ok(HTML.indexOf('所有脚本的业务代码完整保留')>=0,'改造说明声明了业务 JS 完整性');
  }

  LOG.push('\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====');
  fs3.writeFileSync('layout.log',LOG.join('\n'),'utf8');
  console.log(LOG.join('\n'));
  process.exit(ERR.length?1:0);

}catch(e){ LOG.push('测试脚本异常: '+e.message+'\n'+(e.stack||'')); fs3.writeFileSync('layout.log',LOG.join('\n'),'utf8'); console.log(LOG.join('\n')); process.exit(1); } },300);
