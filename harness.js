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

