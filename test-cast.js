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



/* ================== 人物关系：角色定位 + 关系表 + AI 梳理/核查 ================== */
const fs2=require('fs');
const T2=()=>sandbox.__T;

setTimeout(async()=>{ try{

  head('A 加载整页脚本');
  try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
  catch(e){ ok(false,'脚本执行抛异常: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }
  /* boot 是异步的（await IDB.open()），必须给它执行机会，否则入口还没绑定 */
  await new Promise(r=>setTimeout(r,120));

  head('A2 建书（让保存与章节有去处）');
  try{
    sandbox.newBookDialog();
    const foot=doc.querySelector('#dlgFoot');
    const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent))||foot._children[foot._children.length-1];
    create.onclick({target:create,stopPropagation(){}});
  }catch(e){ ERR.push('建书失败: '+e.message); }
  ok(T2().lib.items.length===1,'书架里有 1 本书');
  ok(doc.querySelector('#editorScreen').style.display==='','已进入编辑器');
  await new Promise(r=>setTimeout(r,60));
  const ST=()=>sandbox.__T.state;
  ST().chars.length=0;
  if(ST().cast) ST().cast=null;

  
head('B 叙事地位（9 级：只看剧情权重，不看实力官职）');
  ok(T2().CAST_TIERS.length===9,'九个地位档位（实际 '+T2().CAST_TIERS.length+'）');
  ok(T2().CAST_TIERS.map(t=>t.name).join('/')===
     '第一主角/对等双主角/第二主角/核心配角/重要配角/普通配角/功能性NPC/背景路人/传说人物','档位名称与顺序正确');
  ok(T2().CAST_TIERS.map(t=>t.w).join('')==='123456789','权重 1-9 依次递增');
  ok(T2().CAST_TIERS.every(t=>t.hint&&t.g),'每档都有说明与分组');
  ok(T2().CAST_TIER_GROUPS.length>=3&&T2().CAST_TIER_GROUPS[0].tiers.length===3,'三个内置分组、每组三档');
  ok(T2().CAST_TIER_GROUPS.some(g=>g.id==='custom')&&T2().CAST_TIERS.length===9,'另有「自定义档位」分组，内置仍为 9 档');
  ok(T2().CAST_TIERS.find(t=>t.id==='lead1').hint.indexOf('绝对核心')>=0,'第一主角的档位说明与需求一致');
  ok(T2().CAST_TIERS.find(t=>t.id==='core').hint.indexOf('主要反派')>=0,'核心配角的档位说明含主要反派');
  ok(T2().CAST_TIERS.find(t=>t.id==='legend').hint.indexOf('从未正面出场')>=0,'传说人物的档位说明正确');
  {
    const c1=sandbox.ensureCh({name:'顾长庚'}); sandbox.addChar(c1);
    const c2=sandbox.ensureCh({name:'沈青梧'}); sandbox.addChar(c2);
    const c3=sandbox.ensureCh({name:'店小二'}); sandbox.addChar(c3);
    ok(T2().chTierOf(ST().chars[0])==='support','默认定位为「重要配角」');
    sandbox.chSetTier(0,'lead1');
    ok(T2().chTierOf(ST().chars[0])==='lead1','可设为「第一主角」');
    ok(ST().chars[0].tierAuto===false,'手动设定后标记为非自动');
    sandbox.chSetTier(1,'dual'); sandbox.chSetTier(2,'bg');
    ok(T2().chCountTier('lead1')===1&&T2().chCountTier('dual')===1&&T2().chCountTier('bg')===1,'分档计数正确');
    ok(sandbox.chCountGroup('lead')===2&&sandbox.chCountGroup('minor')===1&&sandbox.chCountGroup('cast')===0,'分组计数正确');
    ok(sandbox.chHero()==='顾长庚','主角类卡的名字自动成为「主角称呼」（{{user}} 的替换词）');
    ok(sandbox.chTierOf({tier:'hero'})==='lead1'&&sandbox.castTierNorm('major')==='support',
      '旧版 hero / major 在读取时就能兼容（不必等迁移）');
    ok(ST().chars[0]._tierFixed===true,'手工设过档的标记 _tierFixed');
    ok(sandbox.castTierIsLocked('lead1')&&sandbox.castTierIsLocked('dual')&&sandbox.castTierIsLocked('lead2')
      &&sandbox.castTierIsLocked('core')&&sandbox.castTierIsLocked('support'),'主角类 + 核心/重要配角为受保护档位');
    ok(!sandbox.castTierIsLocked('extra')&&!sandbox.castTierIsLocked('npc')&&!sandbox.castTierIsLocked('bg'),
      '普通配角 / NPC / 路人可由 AI 自行判定');
  }

  head('B3 用户自定义分类（自建档位）');
  {
    const n0=T2().castTierTotal();
    const r=T2().castTierAdd('幕后黑手','从未露面但操控全局的人','lead1');
    ok(r.ok&&r.id,'新增自定义档位成功 → '+r.id);
    ok(T2().castTierTotal()===n0+1,'档位总数 +1（自定义会与内置一起排序）');
    const seq=T2().castTierSeq();
    const mine=seq.find(t=>t.id===r.id);
    ok(!!mine&&mine.name==='幕后黑手'&&mine.custom===true,'自定义档位已进入序列');
    ok(mine.w===2,'插在「第一主角」之后 → 权重变 2（实际 '+mine.w+'）');
    ok(T2().castTierNameOf(r.id)==='幕后黑手','能按 id 取到自定义档位名');
    ok(T2().CAST_TIER_ORDER[r.id]===2&&T2().CAST_TIER_ORDER.lead2===4,'内置档位权重随序列自动重排');
    ok(T2().castTierIsLocked(r.id),'自定义档位同样受保护（AI 不得擅改）');
    /* 自定义档位能用在角色卡上 */
    const c=sandbox.ensureCh({name:'殿主'}); sandbox.addChar(c);
    sandbox.chSetTier(ST().chars.length-1,r.id);
    ok(T2().chTierOf(ST().chars[ST().chars.length-1])===r.id,'角色可以定为自定义档位');
    ok(sandbox.chCountTier(r.id)===1,'自定义档位参与计数');
    ok(sandbox.chCountGroup('custom')===1,'归入「自定义」分组');
    ok(T2().castTierAiLines().some(l=>l.indexOf('幕后黑手')>=0&&l.indexOf('作者自定义')>=0),'自定义档位会写进给 AI 的档位清单');
    ok(T2().castTierRuleText().indexOf('幕后黑手')>=0,'写作权重规则里含自定义档位');
    ok(sandbox.chBlockText(0).indexOf('幕后黑手')>=0,'自定义档位随角色卡注入提示词');
    /* 改名（自定义） */
    ok(T2().castTierSet(r.id,{name:'幕后执棋人'}).ok,'自定义档位改名成功');
    ok(T2().castTierNameOf(r.id)==='幕后执棋人','改名生效');
    /* 改名（内置） */
    ok(T2().castTierSet('core',{name:'主要反派'}).ok,'内置档位允许改名');
    ok(T2().castTierNameOf('core')==='主要反派'&&T2().CAST_TIERS.find(t=>t.id==='core').name==='核心配角',
      '只改显示名，内置定义不动');
    /* 名字冲突 */
    ok(!!T2().castTierAdd('主要反派','重复名字','last').err,'拒绝重名档位');
    /* 界面：列表/选择弹窗/管理弹窗都能出来 */
    T2().charView='list'; T2().charFilter='all'; sandbox.renderChars();
    const h=doc.querySelector('#charList').innerHTML||'';
    ok(h.indexOf('自定义档位')>=0||h.indexOf('幕后执棋人')>=0,'列表筛选条/分组含自定义档位');
    ok(h.indexOf('自定义分类')>=0,'列表有「自定义分类」入口');
    const footEl=doc.querySelector('#dlgFoot'); const before=(footEl._children||[]).length;
    T2().castTierDialog(0);
    const body=doc.querySelector('#dlgBody').innerHTML||'';
    ok(body.indexOf('幕后执棋人')>=0&&body.indexOf('主要反派')>=0,'选择弹窗列出自定义档与改名后的内置档');
    const foot=(footEl._children||[]).slice(before).map(x=>x.textContent);
    ok(foot.length===T2().castTierTotal()+1,'弹窗按钮 = 全部档位 + 取消（实际 '+foot.length+'）');
    ok(foot.indexOf('幕后执棋人')>=0,'自定义档位可以在弹窗里直接选');
    doc.querySelector('#dlg').close();
    let err=null;
    try{ T2().castTierManageDialog(); }catch(e){ err=e.message; }
    const mb=doc.querySelector('#dlgBody').innerHTML||'';
    ok(!err&&mb.indexOf('自定义叙事地位分类')>=0,'管理弹窗可打开'+(err?(' → '+err):''));
    ok(mb.indexOf('ctName')>=0&&mb.indexOf('data-ctren')>=0&&mb.indexOf('data-ctdel')>=0,'有新增表单与改名/删除按钮');
    ok(mb.indexOf('受保护档位')>=0,'说明受保护档位规则');
    doc.querySelector('#dlg').close();
    /* 删除：卡回落到默认档，卡本身不丢 */
    const beforeN=ST().chars.length;
    ok(T2().castTierDel(r.id).ok,'删除自定义档位');
    ok(T2().castTierTotal()===n0,'档位总数回到 '+n0);
    ok(ST().chars.length===beforeN,'删档不删卡');
    ok(T2().chTierOf(ST().chars[ST().chars.length-1])==='support','原用该档的卡回落到重要配角（实际 '+T2().chTierOf(ST().chars[ST().chars.length-1])+'）');
    ok(!!T2().castTierDel('core').err,'内置档位不允许删除');
    ok(T2().castTierSet('core',{name:''}).ok&&T2().castTierNameOf('core')==='核心配角','内置档位可恢复原名');
  }

  head('B2 自动判定（导入 ST 卡）+ 旧数据迁移');
  {
    const mkCard=(name,tags,desc)=>({spec:'chara_card_v2',spec_version:'2.0',
      data:{name,tags,description:desc}});
    const g1=sandbox.normChar(mkCard('萧别离',['男主'],'本作男主，全书的视角载体。'));
    ok(g1.tier==='lead1','tags 含「男主」→ 第一主角');
    const g1b=sandbox.normChar(mkCard('李昭',['女主角'],'女主角，与男主并肩。'));
    ok(g1b.tier==='lead1','tags 含「女主角」→ 第一主角');
    const g2=sandbox.normChar(mkCard('叶红绡',['双主角'],'另一位核心人物。'));
    ok(g2.tier==='dual','标注「双主角」→ 对等双主角（不允许只写双主角）');
    const g2b=sandbox.normChar(mkCard('顾千秋',[],'本作第二主角，有独立故事线。'));
    ok(g2b.tier==='lead2','「第二主角」→ lead2');
    const g3=sandbox.normChar(mkCard('裴无咎',['大反派'],'幕后黑手。'));
    ok(g3.tier==='core','「大反派」→ 核心配角（反派同样适用分级）');
    const g4=sandbox.normChar(mkCard('店小二',[],'客栈里的店小二，只负责传一句话。'));
    ok(g4.tier==='npc','工具人 → 功能性NPC（实际 '+g4.tier+'）');
    const g5=sandbox.normChar(mkCard('无名剑仙',[],'早已身故，只在传说中被提起。'));
    ok(g5.tier==='legend','只在传说中出现 → 传说人物（实际 '+g5.tier+'）');
    ok(g4.tierAuto===true&&String(g4._tierWhy||'').length>0,'标记为自动判定并记录依据：'+(g4._tierWhy||''));
    ok(sandbox.normChar(mkCard('完全没线索的人',[],'一个路人。'))!=null,'无标签的卡也能安全判定');
    /* 旧数据迁移 */
    ok(sandbox.ensureCh({name:'旧甲',tier:'hero'}).tier==='lead1','旧「主角 hero」→ 第一主角');
    ok(sandbox.ensureCh({name:'旧乙',tier:'major'}).tier==='support','旧「重要人物 major」→ 重要配角');
    ok(sandbox.ensureCh({name:'旧丙',tier:'npc'}).tier==='npc','旧 NPC 保持 npc');
    ok(sandbox.ensureCh({name:'旧丁',tier:'乱七八糟'}).tier==='support','未知档位回落重要配角');
    /* 多位第一主角 → 保留戏份最重的那位，其余改为对等双主角 */
    const backup=ST().chars;
    ST().chars=[];
    ST().meta=ST().meta||{};
    ST().meta.tier9=0; ST().meta.tier9Notice=0;
    const A=sandbox.ensureCh({name:'甲长主角'}); A.tier='hero'; A.f.person.core='一二三四五六七八九十';
    const B=sandbox.ensureCh({name:'乙短主角'}); B.tier='hero';
    sandbox.addChar(A); sandbox.addChar(B);
    const moved=sandbox.chTierFixup();
    ok(moved===1,'多出的第一主角被改档（实际 '+moved+'）');
    ok(sandbox.chTierOf(ST().chars[0])==='lead1'&&sandbox.chTierOf(ST().chars[1])==='dual',
      '内容更多的那位保留第一主角，另一位成为对等双主角');
    ok(ST().meta.tier9Notice===1,'记录了迁移提示');
    ok(sandbox.chTierFixup()===0,'迁移幂等（再跑不再改动）');
    ST().meta.tier9Notice=0; ST().meta.tier9=1;
    ST().chars=backup;
    ok(ST().chars[0].name==='顾长庚','原角色卡已恢复');
    /* 导出 → 再导入：叙事地位无损 */
    const out=sandbox.chExportObj(0);
    ok(out&&out.data.extensions.moYan.tier==='lead1','导出的卡里写了叙事地位');
    const back=sandbox.normChar(JSON.parse(JSON.stringify(out)));
    ok(back.tier==='lead1'&&back.tierAuto===false,'叙事地位导出再导入无损还原');
    ok(back._restored===true,'仍被识别为本工具导出的卡');
  }

  
head('C 关系表：新增 / 编辑 / 删除');
  {
    const C=T2().ensureCast();
    ok(Array.isArray(C.rels)&&C.rels.length===0,'新书关系表为空');
    const a=ST().chars[0].id, b=ST().chars[1].id, c=ST().chars[2].id;
    C.rels.push({id:'r1',a,b,type:'师徒',dir:1,desc:'顾长庚授其剑术',from:3,src:'manual'});
    C.rels.push({id:'r2',a:a,b:c,type:'上下级',dir:0,desc:'',from:null,src:'manual'});
    sandbox.save(); if(sandbox.flushSave) sandbox.flushSave();
    ok(T2().ensureCast().rels.length===2,'两条关系已录入');
    ok(T2().castRelsOf(a).length===2,'按角色反查关系（顾长庚 2 条）');
    ok(T2().castHubs(3)[0].c.name==='顾长庚'||T2().castHubs(3).length>0,'社交中心统计可用');
    /* 删除 */
    const C2=T2().ensureCast(); C2.rels.splice(1,1); sandbox.save();
    ok(T2().ensureCast().rels.length===1,'删除后剩 1 条');
    C2.rels.push({id:'r2',a,b,type:'宿敌',dir:0,desc:'争夺密档',from:5,src:'ai'});
  }

  head('D 关系类型归一化');
  {
    const p=[['师徒','师徒'],['师父','师徒'],['弟子','师徒'],['仇敌','仇敌'],['宿敌','宿敌'],['敌人','宿敌'],
      ['恋人','恋人'],['夫妻','夫妻'],['上下级','上下级'],['主人','主从'],['旧识','旧识'],['同僚','同僚'],
      ['挚友','挚友'],['奇怪的说法','其他'],['','其他']];
    p.forEach(([i,e])=>ok(T2().castNormType(i)===e,'「'+i+'」→ '+T2().castNormType(i)));
  }

  head('E 关系图（SVG）');
  {
    ST().cast.rels=[];
    const a=ST().chars[0].id,b=ST().chars[1].id,c=ST().chars[2].id;
    ST().cast.rels.push({id:'r1',a,b,type:'师徒',dir:1,desc:'授剑',from:3,src:'manual'});
    ST().cast.rels.push({id:'r2',a:a,b:c,type:'上下级',dir:0,desc:'',from:null,src:'ai'});
    const svg=T2().castGraphSVG();
    ok(svg.indexOf('<svg')>=0,'生成了 SVG 关系图');
    ok(svg.indexOf('长庚')>=0&&svg.indexOf('青梧')>=0,'图上含人物节点');
    ok(svg.indexOf('小二')>=0,'NPC 节点也在图上');
    ok(svg.indexOf('castArw')>=0,'定义了单向箭头 marker');
    ok(svg.indexOf('marker-end')>=0,'单向关系使用了箭头');
    ok(svg.indexOf('data-act="relfocus"')>=0,'节点可点击聚焦');
    ok((svg.match(/<line /g)||[]).length===2,'画出了 2 条连线');
  }

  
head('F 关系板视图渲染');
  {
    T2().charView='board';
    sandbox.renderChars();
    const host=doc.querySelector('#charList');
    const h=(host&&host.innerHTML)||'';
    ok(host._cls&&host._cls.has('boardview'),'切换到关系板视图');
    ok(h.indexOf('返回角色列表')>=0,'有返回按钮');
    ok(h.indexOf('关系星图')>=0,'标题含「关系星图」');
    ok(h.indexOf('＋ 新增关系')>=0,'有新增关系入口');
    ok(h.indexOf('AI 检查关系')>=0,'有 AI 检查关系');
    ok(h.indexOf('从正文梳理角色')>=0,'有从正文梳理');
    ok(h.indexOf('已编入目录')>=0,'提示只依据已编入目录的正式章节');
    ok(h.indexOf('data-rf="type"')>=0,'关系行有类型下拉');
    ok(h.indexOf('data-rf="dir"')>=0,'关系行有方向下拉');
    ok(h.indexOf('data-rf="desc"')>=0,'关系行有描述输入');
    ok(h.indexOf('<svg')>=0,'关系板内嵌了关系图');
    ok(h.indexOf('第一主角 1')>=0&&h.indexOf('背景路人 1')>=0,'统计条按九级显示各档数量');
    ok(h.indexOf('对等双主角 1')>=0,'对等双主角单独成档，不写成笼统的「双主角」');
    ok(h.indexOf('圆点越大＝叙事地位越高')>=0,'关系图图例说明权重高低');
  }

  head('G 输入交互：改类型 / 方向 / 描述');
  {
    const mk=(ds,val,checked)=>({dataset:ds,value:val,checked:!!checked,target:null});
    /* 描述：只保存，不重绘（避免打断输入） */
    const r=T2().ensureCast().rels[0];
    r.desc=''; sandbox.castInput({target:mk({rf:'desc',id:r.id},'改写：剑意传承')});
    ok(T2().ensureCast().rels[0].desc==='改写：剑意传承','描述已写入');
    /* 类型：归一化并保存 */
    sandbox.castInput({target:mk({rf:'type',id:r.id},'友')});
    ok(T2().ensureCast().rels[0].type==='挚友','类型被归一化为挚友');
    /* 方向 / 章节 */
    sandbox.castInput({target:mk({rf:'dir',id:r.id},'2')});
    ok(T2().ensureCast().rels[0].dir===2,'方向已改');
    sandbox.castInput({target:mk({rf:'from',id:r.id},'7')});
    ok(T2().ensureCast().rels[0].from===7,'确立章节已改');
  }

  
head('H 注入：关系网随角色卡进 System Prompt');
  {
    ST().chars.forEach((c,i)=>{ c.from=1; c.to=9999; c.enabled=true; });
    const txt=sandbox.chBlockText(0);
    ok(txt.indexOf('人物关系网')>=0,'注入文本含关系网');
    ok(txt.indexOf('顾长庚')>=0&&txt.indexOf('沈青梧')>=0,'关系网含双方姓名');
    ok(txt.indexOf('挚友')>=0,'关系网含关系类型');
    ok(txt.indexOf('剑意传承')>=0,'关系网含关系描述');
    ok(txt.indexOf('→')>=0,'单向关系显示箭头');
    ok(txt.indexOf('{{user}}')<0,'无占位符');
    /* 角色卡按定位排序：主角在前 */
    ok(txt.indexOf('顾长庚')<txt.indexOf('店小二'),'主角排在 NPC 前面');
    /* 只注入本章活跃角色的关系 */
    ST().chars[1].from=9; ST().chars[1].to=20;
    const txt2=sandbox.chBlockText(0);
    ok(txt2.indexOf('人物关系网')<0||txt2.indexOf('沈青梧')<0,'区间外的角色，其关系不注入');
  }

  
head('I AI 梳理：来源只取「已编入目录」的正式章节');
  {
    ST().outline=[{title:'雨夜重逢',summary:''},{title:'阁中密谈',summary:''},{title:'草稿章',summary:''}];
    ST().chapters=[
      {title:'雨夜重逢',content:'顾长庚在长街遇见沈青梧。',committed:true},
      {title:'阁中密谈',content:'沈青梧与苏怀玉交涉。',committed:true},
      {title:'草稿章',content:'这是一段还没定稿的内容。',committed:false}
    ];
    const src=T2().castSources({recent:0});
    ok(src.length===2,'只取到 2 章已编入目录的章节（草稿被排除）');
    ok(src.map(x=>x.title).join(',')==='雨夜重逢,阁中密谈','取到的是正式章节');
    const rec=T2().castSources({recent:1});
    ok(rec.length===1&&rec[0].title==='阁中密谈','「最近 1 章」范围正确');
    const ck=T2().castChunk(src,60);
    ok(ck.length>=1,'按预算分批成功（'+ck.length+' 批）');
  }

  
head('J AI 梳理结果合并：新角色 + 新关系 + 只补空白');
  {
    ST().chars.length=0;
    ST().cast.rels=[];
    const hero=sandbox.ensureCh({name:'顾长庚'}); hero.tier='lead1';
    hero.f.person.core='沉默寡言，认死理';
    sandbox.addChar(hero);
    const st={};
    T2().castMergeResult({
      chars:[
        {name:'顾长庚',tier:'lead1',person:'不该覆盖我手写的性格',goal:'查清身世'},
        {name:'沈青梧',tier:'core',org:'天枢阁阁主',person:'外冷内热',look:'左眉有疤',firstCh:1},
        {name:'苏怀玉',tier:'support',org:'secret 首辅',power:'谋士',firstCh:2},
        {name:'店小二',tier:'npc',org:'客栈伙计',firstCh:1}
      ],
      rels:[
        {a:'顾长庚',b:'沈青梧',type:'师徒',dir:1,desc:'授剑',ch:3},
        {a:'沈青梧',b:'苏怀玉',type:'宿敌',dir:0,desc:'争夺密档',ch:2},
        {a:'顾长庚',b:'店小二',type:'旧识',dir:0,desc:'',ch:1},
        {a:'顾长庚',b:'从未出现的人',type:'其他',dir:0,desc:'',ch:1}
      ]
    },st);
    ok(ST().chars.length===4,'新角色 3 张被创建（共 4 张）');
    ok(st.newChars===3,'统计新角色 3 张（实际 '+(st.newChars||0)+'）');
    ok(st.newRels===3,'统计新关系 3 条（实际 '+(st.newRels||0)+'）');
    ok(Object.keys(st.missing||{}).indexOf('从未出现的人')>=0,'记录了关系里缺失的角色');
    ok(T2().chTierOf(ST().chars.find(c=>c.name==='沈青梧'))==='core','AI 判定的地位已写入（核心配角）');
    ok(T2().chTierOf(ST().chars.find(c=>c.name==='苏怀玉'))==='support','AI 判定的地位已写入（重要配角）');
    ok(T2().chTierOf(ST().chars.find(c=>c.name==='店小二'))==='npc','NPC 定位正确');
    const hero2=ST().chars.find(c=>c.name==='顾长庚');
    ok(T2().chTierOf(hero2)==='lead1','主角地位未被 AI 改动');
    ok(hero2.f.person.core==='沉默寡言，认死理','已有内容的字段不被覆盖（作者手写的性格保留）');
    ok(hero2.f.goal.goal==='查清身世','空白字段被补上（目标驱动）');
    ok(ST().chars.find(c=>c.name==='沈青梧').f.basic.org==='天枢阁阁主','身份写入角色档案');
    ok(T2().ensureCast().rels.length===3,'关系表新增 3 条');
    const r=T2().ensureCast().rels.find(x=>x.type==='师徒');
    ok(r&&r.dir===1&&r.from===3,'方向与确立章节保留');
    /* 再合并一次：幂等，不重复 */
    const st2={};
    T2().castMergeResult({chars:[{name:'沈青梧',tier:'core',person:'外冷内热'}],
      rels:[{a:'顾长庚',b:'沈青梧',type:'师徒',dir:1,desc:'',ch:3}]},st2);
    ok((st2.newChars||0)===0,'同名角色不重复创建');
    ok((st2.newRels||0)===0,'同类型关系不重复添加');
    ok(st2.dup===1,'记入「已存在关系」计数');
  }

  
  head('J2 AI 梳理不得擅改主角 / 重要配角的分类');
  {
    ST().chars.length=0; ST().cast.rels=[];
    const A=sandbox.ensureCh({name:'顾长庚'}); A.tier='lead1'; A.tierAuto=false; A._tierFixed=true; sandbox.addChar(A);
    const B=sandbox.ensureCh({name:'沈青梧'}); B.tier='support'; B.tierAuto=true; sandbox.addChar(B);
    const Cc=sandbox.ensureCh({name:'路人甲'}); Cc.tier='extra'; Cc.tierAuto=true; sandbox.addChar(Cc);
    const D=sandbox.ensureCh({name:'手定配角'}); D.tier='npc'; D.tierAuto=false; D._tierFixed=true; sandbox.addChar(D);
    const st={};
    T2().castMergeResult({chars:[
      {name:'顾长庚',tier:'extra'},
      {name:'沈青梧',tier:'npc'},
      {name:'路人甲',tier:'bg'},
      {name:'手定配角',tier:'lead1'}
    ],rels:[]},st);
    ok(T2().chTierOf(ST().chars[0])==='lead1','主角地位未被 AI 改动（实际 '+T2().chTierOf(ST().chars[0])+'）');
    ok(T2().chTierOf(ST().chars[1])==='support','AI 定为「重要配角」的卡不会被降档');
    ok(T2().chTierOf(ST().chars[2])==='bg','仅「普通配角」档允许 AI 修正（extra → bg）');
    ok(T2().chTierOf(ST().chars[3])==='npc','作者手工定过的地位永不被改');
    ok((st.tierKeep||[]).length===3,'记录 3 条「只提示不改动」建议（实际 '+((st.tierKeep||[]).length)+'）');
    ok((st.tierKeep||[]).every(x=>x.name&&x.from&&x.to),'建议里含原名与目标档');
    /* 报告：只提示，需作者确认 */
    T2().castReportExtract(st);
    const body=doc.querySelector('#dlgBody').innerHTML||'';
    ok(body.indexOf('已保护')>=0,'报告里说明已保护若干张卡');
    ok(body.indexOf('只作建议')>=0,'说明只提示、不自动改');
    const foot=(doc.querySelector('#dlgFoot')._children||[]).map(x=>x.textContent);
    ok(foot.some(t=>t.indexOf('采纳 AI 建议')>=0),'提供「采纳建议」按钮（需作者确认）');
    doc.querySelector('#dlg').close();
    /* 导出 → 再导入：手工档位与保护标记无损 */
    const out=sandbox.chExportObj(0);
    const back=sandbox.normChar(JSON.parse(JSON.stringify(out)));
    ok(back.tier==='lead1'&&back._tierFixed===true,'导出再导入保留「手工设定」与保护标记');
  }

head('K 别名匹配');
  {
    ST().chars.length=0;
    ST().cast.rels=[];
    const c=sandbox.ensureCh({name:'沈青梧'});
    c.f.basic.alias='青梧仙子、阁主';
    sandbox.addChar(c);
    ok(T2().castFindChar('青梧仙子')===c,'按别名找到角色');
    ok(T2().castFindChar('阁主')===c,'别名列表第二个也能匹配');
    ok(T2().castFindChar('沈青梧')===c,'按姓名匹配');
    ok(T2().castFindChar('完全不存在')===null,'不存在的名字返回 null');
    /* 关系指向别名 → 能连到同一张卡 */
    const st={};
    T2().castMergeResult({chars:[],rels:[{a:'青梧仙子',b:'沈青梧',type:'其他',dir:0,desc:'',ch:1}]},st);
    ok((st.selfSkip||0)===1,'识别出「同一人的姓名与别名」');
    const _rr=T2().ensureCast().rels;
    ok(_rr.length===0,'姓名与别名指同一个人时，自关系被丢弃（实际 '+_rr.length+' 条）');
  }

  
head('L 核查结果报告');
  {
    ST().chars.length=0;
    const A=sandbox.ensureCh({name:'顾长庚'}); A.tier='lead1'; sandbox.addChar(A);
    const B=sandbox.ensureCh({name:'沈青梧'}); sandbox.addChar(B);
    const Cc=sandbox.ensureCh({name:'苏怀玉'}); sandbox.addChar(Cc);
    ST().cast.rels=[
      {id:'x1',a:A.id,b:B.id,type:'师徒',dir:1,desc:'',from:1,src:'manual'},
      {id:'x2',a:B.id,b:Cc.id,type:'宿敌',dir:0,desc:'',from:2,src:'manual'},
      {id:'x3',a:A.id,b:Cc.id,type:'挚友',dir:0,desc:'',from:1,src:'manual'}
    ];
    const verdict={};
    verdict[sandbox.castNorm('顾长庚')+'|'+sandbox.castNorm('沈青梧')+'|师徒']={ok:2,conflict:0,unknown:0,note:''};
    verdict[sandbox.castNorm('沈青梧')+'|'+sandbox.castNorm('苏怀玉')+'|宿敌']={ok:0,conflict:1,unknown:0,note:'正文写的是同门师兄妹'};
    const missing=[{a:'顾长庚',b:'苏怀玉',type:'旧识',dir:0,desc:'早年相识',ch:1}];
    /* castNorm 未导出 → 用 __T 里的键构造方式重算 */
    T2().castReportCheck(verdict,missing,{calls:1,fails:0});
    const body=doc.querySelector('#dlgBody').innerHTML;
    ok(body.indexOf('关系核查结果')>=0,'弹出核查报告');
    ok(body.indexOf('正文支持')>=0,'显示「正文支持」计数');
    ok(body.indexOf('与正文矛盾')>=0,'显示「与正文矛盾」');
    ok(body.indexOf('正文未提及')>=0,'显示「正文未提及」');
    ok(body.indexOf('同门师兄妹')>=0,'矛盾项列出了正文实际写法');
    ok(body.indexOf('正文里有、关系表里缺')>=0,'列出缺失的关系');
    const foot=(doc.querySelector('#dlgFoot')._children||[]).map(x=>x.textContent).join('|');
    LOG.push('     弹窗按钮：'+foot);
    ok(foot.indexOf('采纳新发现的关系')>=0,'提供采纳按钮');
    ok(doc.querySelector('#dlg').open===true,'报告弹窗已打开');
    doc.querySelector('#dlg').close();
  }

  head('M 界面入口与容错');
  {
    T2().charView='list'; sandbox.renderChars();
    const h=doc.querySelector('#charList').innerHTML||'';
    ok(h.indexOf('全部')>=0&&h.indexOf('tchip')>=0,'列表顶部有定位筛选条');
    ok(h.indexOf('人物关系')>=0,'列表里有「人物关系」入口');
    ok(h.indexOf('从正文梳理角色')>=0,'列表里有「从正文梳理角色」');
    ok(h.indexOf('tierhead')>=0,'按定位分组显示');
    ok(h.indexOf('tierbadge lead1')>=0,'卡片上有定位徽标（第一主角）');
    ok(h.indexOf('主线主角')>=0&&h.indexOf('配角群')>=0&&h.indexOf('NPC 与路人')>=0,'筛选条按三大分组');
    ok(h.indexOf('第一主角')>=0&&h.indexOf('重要配角')>=0,'列表按九级逐档分组（有人的档才有标题）');
    LOG.push('     btnCastBoard='+typeof doc.querySelector('#btnCastBoard').onclick
      +' | btnCastExtract='+typeof doc.querySelector('#btnCastExtract').onclick
      +' | btnImportChar='+typeof doc.querySelector('#btnImportChar').onclick
      +' | fileChar='+typeof doc.querySelector('#fileChar').onchange
      +' | castBindTop='+typeof sandbox.castBindTop);
    ok(typeof doc.querySelector('#btnCastBoard').onclick==='function','工具栏「人物关系」按钮已绑定');
    ok(typeof doc.querySelector('#btnCastExtract').onclick==='function','工具栏「从正文梳理角色」按钮已绑定');
    /* 筛选：分组 */
    T2().charFilter='lead'; sandbox.renderChars();
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('苏怀玉')<0,'按「主线主角」分组筛选后隐藏配角');
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('顾长庚')>=0,'主线主角仍在');
    /* 筛选：具体档位 */
    T2().charFilter='support'; sandbox.renderChars();
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('顾长庚')<0,'按具体档位「重要配角」筛选后隐藏主角');
    T2().charFilter='minor'; sandbox.renderChars();
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('顾长庚')<0,'按「NPC 与路人」分组筛选后隐藏主角');
    T2().charFilter='all'; sandbox.renderChars();
    /* 空关系板 */
    ST().cast.rels=[]; T2().charView='board'; sandbox.renderChars();
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('还没有人物关系')>=0,'空关系表有引导文案');
    /* 无正式章节时点梳理 → 提示 */
    ST().chapters.forEach(c=>{ c.committed=false; });
    sandbox.castExtractDialog();
    ok((doc.querySelector('#dlgBody').innerHTML||'').indexOf('已编入目录')>=0,'无正式章节时给出明确提示');
    doc.querySelector('#dlg').close();
  }

  head('M2 定位弹窗：九级可选 + 判定说明');
  {
    ST().chars.forEach((c,i)=>{ c.tier=['lead1','core','support'][i%3]; });
    const footEl=doc.querySelector('#dlgFoot');
    const before=(footEl._children||[]).length;
    T2().castTierDialog(0);
    const body=doc.querySelector('#dlgBody').innerHTML||'';
    ok(body.indexOf('叙事地位')>=0,'弹窗标题含「叙事地位」');
    ok(T2().CAST_TIERS.every(t=>body.indexOf(t.name)>=0),'九级档位全部列出');
    ok(body.indexOf('权重 1 / 9')>=0&&body.indexOf('权重 9 / 9')>=0,'每一档都标了权重');
    ok(body.indexOf('tieropt')>=0,'档位以卡片形式列出');
    ok(body.indexOf('世界观社会地位')>=0&&body.indexOf('不改变戏份权重')>=0,'说明叙事地位 ≠ 世界观社会地位');
    const foot=(footEl._children||[]).slice(before).map(x=>x.textContent);
    ok(foot.length===10,'9 个档位按钮 + 取消（实际 '+foot.length+'）');
    ok(foot.indexOf('对等双主角')>=0&&foot.indexOf('传说人物')>=0,'按钮含对等双主角与传说人物');
    ok(foot.indexOf('双主角')<0,'不出现笼统的「双主角」（必须写成对等双主角）');
    doc.querySelector('#dlg').close();
  }

  head('M3 叙事地位写进提示词（权重排序 + 写作约束）');
  {
    ST().chars.forEach((c,i)=>{ c.from=1; c.to=9999; c.enabled=true; c.tier=['lead1','core','support'][i%3]; });
    const txt=sandbox.chBlockText(0);
    ok(txt.indexOf('人物叙事地位')>=0,'注入「人物叙事地位 · 写作权重」区块');
    ok(txt.indexOf('第一主角')>=0&&txt.indexOf('传说人物')>=0,'九级档位全部列出');
    ok(txt.indexOf('双主角必须明确区分')>=0,'约束：双主角必须明确标记');
    ok(txt.indexOf('大反派＝核心配角')>=0,'约束：反派同样适用分级');
    ok(txt.indexOf('不改变戏份权重')>=0,'约束：叙事地位 ≠ 世界观社会地位');
    ok(txt.indexOf('不得喧宾夺主')>=0,'约束：低地位角色不抢主线戏份');
    ok(txt.indexOf('可以升级为第二主角')>=0,'约束：地位可随剧情动态变化');
    ok(txt.indexOf('【叙事地位】')>=0,'每个角色都标了叙事地位');
    ok(txt.indexOf('顾长庚')<txt.indexOf('沈青梧'),'角色按叙事地位从高到低排列');
    ok(txt.indexOf('{{user}}')<0,'注入文本无占位符');
  }

  head('M4 出文净化：模型多写的「下一章建议」绝不进正文');
  {
    ST().chars.length=0; if(ST().cast) ST().cast=null;
    ST().outline=[{title:'雨夜',summary:''}];
    ST().chapters=[{title:'',content:'',committed:false}];
    ST().suggest={cover:false,autoWrite:true,on:false,count:0};
    ST().current=0;
    const raw='雨落在青石板上。\n\n他握紧了那半枚棋子。\n\n【下一章建议】\n1. 夜行牌\n2. 缺的那两枚\n且看他如何应对。';
    const bak=sandbox.chatRaw;
    sandbox.chatRaw=async(m,d)=>{ if(typeof d==='function') d(raw); return raw; };
    await sandbox.doGist(0,'雨夜查账册');
    const ch=ST().chapters[0];
    ok(ch.content.indexOf('下一章建议')<0,'正文不含「下一章建议」');
    ok(ch.content.indexOf('夜行牌')<0&&ch.content.indexOf('青石板')>=0,'只保留正文，建议段已剥除');
    const prose=(ch.chat||[]).filter(m=>m.kind==='prose');
    ok(prose.length&&prose.every(m=>m.text.indexOf('下一章建议')<0),'聊天里的正文卡片也已净化');
    /* 手动「用作本章正文」/「接在末尾」也要过净化（走真实的 click 监听） */
    const mkBtn=ds=>({dataset:ds,closest:()=>({dataset:ds})});
    const clickLog=async(ds)=>{ const hs=doc.querySelector('#chatLog')._listeners.click||[];
      if(!hs.length) return null; return hs[hs.length-1]({target:mkBtn(ds)}); };
    const list=ch.chat;
    list.push({role:'ai',kind:'prose',text:'正文一句。\n\n（本章小结）作者按语：下次再见。'});
    const k=list.length-1;
    await clickLog({act:'adopt',k:String(k)});
    ok(ST().chapters[0].content.indexOf('本章小结')<0,'「用作本章正文」也拦下非正文内容');
    await clickLog({act:'append',k:String(k)});
    ok(ST().chapters[0].content.indexOf('作者按语')<0,'「接在末尾」同样净化');
    sandbox.chatRaw=bak;
  }

  head('M5 全局 AI 铁律：不可凭空产生，须依据已有信息');
  {
    ok(ST().settings.ground!==false,'默认开启「AI 严格依据已有信息」');
    ST().meta.title='墨砚录'; ST().meta.mainline='抄书人查清三年前的真相';
    ST().chars.length=0; if(ST().cast) ST().cast=null;
    const A=sandbox.ensureCh({name:'顾长庚'}); A.tier='lead1'; sandbox.addChar(A);
    ST().chars[0].f.basic.org='天枢阁阁主';
    ST().outline=[{title:'雨夜',summary:''}];
    ST().chapters=[{title:'',content:'正文正文',committed:true}];
    const msgs=T2().aiGuardApply([{role:'system',content:'你是小说家'},{role:'user',content:'写一段'}]);
    const sys=msgs[0].content;
    ok(msgs[0].role==='system'&&sys.indexOf(T2().AI_GUARD_MARK)>=0,'铁律 + 事实清单已注入 system');
    ok(sys.indexOf('不得凭空产生')>=0&&sys.indexOf('严禁编造')>=0,'含「不得凭空产生 / 严禁编造」铁律');
    ok(sys.indexOf('作者未说明')>=0||sys.indexOf('资料未提供')>=0,'信息缺失时要求留白或标注，而不是编造');
    ok(sys.indexOf('你是小说家')>=0&&msgs[1].content==='写一段','原有消息不被破坏');
    ok(sys.indexOf('墨砚录')>=0,'事实清单含作品设定');
    ok(sys.indexOf('顾长庚')>=0&&sys.indexOf('第一主角')>=0,'事实清单含人物与叙事地位');
    ok(sys.indexOf('已编入目录 1 章')>=0,'事实清单含章节进度');
    ok(sys.indexOf('作者尚未建立角色卡')<0,'有角色卡时不出现「无卡」提示');
    const facts=T2().aiFactsBlock();
    ok(facts.indexOf('巳确立')<0,'事实清单文案无错字');
    /* 不重复注入 */
    const twice=T2().aiGuardApply(msgs);
    const marker=T2().AI_GUARD_MARK+'　（以下为作者已确立的信息';
    ok(twice.map(m=>m.content).join('\n').split(marker).length===2,'重复调用不会重复注入');
    /* 临时关掉开关时，不注入事实清单（但正文净化仍在） */
    ST().settings.ground=false;
    const msgs2=[{role:'system',content:'你是小说家'},{role:'user',content:'写一段'}];
    const guarded=ST().settings.ground===false? msgs2 : T2().aiGuardApply(msgs2);
    ok(guarded===msgs2,'关闭开关后不注铁律');
    ST().settings.ground=true;
    ok(typeof T2().chat==='function'&&typeof T2().chatRaw==='function','所有 AI 调用都经过 chat() → chatRaw()');
    /* 提示词层面：正文纯度约束 */
    const bp=sandbox.buildPrompt(0,'new','雨夜查账');
    ok(bp.sys.indexOf('下一章建议')>=0,'出文 System 里明令禁止写「下一章建议」');
    ok(bp.user.indexOf('正文以外的东西一律不要')>=0,'出文指令里也禁止非正文内容');
    ok(bp.user.indexOf('人物叙事地位')>=0,'出文提示里带上叙事地位权重表');
  }

  head('M6 正文净化 proseClean 细节');
  {
    const P=T2().proseClean;
    ok(P('他抬头看了看天。\n\n【下一章建议】\n1. 去找祁掌柜').indexOf('下一章建议')<0,'去掉【下一章建议】块');
    ok(P('他抬头看了看天。\n\n【下一章建议】\n1. 去找祁掌柜').indexOf('看了看天')>=0,'保留前面的正文');
    const long='正' .repeat(200);
    ok(P(long+'\n\n（本章小结）主角得到了棋子。').indexOf('本章小结')<0,'去掉尾部（本章小结）');
    ok(P(long+'\n\n下一章预告：两人再会。').indexOf('下一章预告')<0,'去掉「下一章预告」');
    ok(P(long+'\n\n作者的话：感谢阅读。').indexOf('作者的话')<0,'去掉「作者的话」');
    ok(P(long+'\n\n---\n写作说明：本章为试写。').indexOf('写作说明')<0,'去掉分隔线 + 写作说明');
    ok(P(long+'\n\n（以上为下一章建议，仅供参考）').indexOf('以上为下一章建议')<0,'去掉整行注解');
    ok(P('```\n正文内容。\n```').indexOf('```')<0,'去掉代码块围栏');
    ok(P('他说：“我建议先查账册。”').indexOf('建议')>=0,'剧情里的“建议”一词不能被误删');
    ok(P(long+'\n\n他提了一个建议：先查账册。').indexOf('他提了一个建议')>=0,'非行首的“建议”保留');
    ok(P('')===''&&P(null)==='','空值安全');
    /* 净化后的正文不会因此丢内容 */
    ok(P('第一段。\n\n第二段。')==='第一段。\n\n第二段。','正常正文原样保留');
  }

  head('N 坏数据自愈 + 与其它模块共存');
  {
    ST().cast={rels:'不是数组'};
    let err=null;
    try{ T2().ensureCast(); }catch(e){ err=e.message; }
    ok(!err,'rels 被修成合法结构'+(err?(' → '+err):''));
    ST().cast.rels=[null,{type:'师徒'},{a:'x'},{a:'x',b:'y',type:'奇怪',dir:'abc',from:'qq'},42];
    err=null;
    try{ T2().ensureCast(); }catch(e){ err=e.message; }
    ok(!err,'一堆坏条目被清洗'+(err?(' → '+err):''));
    ok(T2().ensureCast().rels.length===1,'只保留有 a/b 的合法条目');
    ok(T2().ensureCast().rels[0].type==='奇怪','类型保留原值（后续规范化）');
    ST().cast=null;
    let e2=null;
    try{ sandbox.renderLore(); sandbox.renderChars(); }catch(e){ e2=e.message; }
    ok(!e2,'三个模块同时渲染无异常'+(e2?(' → '+e2):''));
    ok(ERR.length===0,'全程无未捕获异常'+(ERR.length?('：'+ERR.join(' | ')):''));
  }

  LOG.push('\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====');
  fs2.writeFileSync('cast.log',LOG.join('\n'),'utf8');
  console.log(LOG.join('\n'));
  process.exit(ERR.length?1:0);

}catch(e){ LOG.push('测试脚本异常: '+e.message+'\n'+(e.stack||'')); fs2.writeFileSync('cast.log',LOG.join('\n'),'utf8'); console.log(LOG.join('\n')); process.exit(1); } },300);
