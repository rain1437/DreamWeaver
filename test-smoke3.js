/* 端到端冒烟：复现「书架 → 新建小说 → 进编辑器」的完整路径 */
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const code=scripts.join('\n;\n')
  +'\n;globalThis.__T={get state(){return state;},get lib(){return lib;},get currentId(){return currentId;},'
  +'get _loreLast(){return _loreLast;},get loreTab(){return loreTab;},setTab(v){loreTab=v;}};';

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
      contains:c=>el._cls.has(c)
    },
    appendChild:c=>{ el._children.push(c); return c; },
    prepend:c=>{ el._children.unshift(c); return c; },
    insertBefore:c=>{ el._children.push(c); return c; },
    removeChild:()=>{}, remove:()=>{},
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

head('A 加载整页脚本');
try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
catch(e){ ok(false,'脚本执行抛异常: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }

const T=sandbox.__T;
setTimeout(()=>{ try{
  head('B 启动流程是否跑完（boot）');
  ok(typeof T==='object','可以访问内部状态');
  ok(sandbox.__T && T.state,'state 可读');
  const grid=doc.querySelector('#bookGrid');
  ok(!!grid&&typeof grid.innerHTML==='string','书架网格已渲染');
  const b1=doc.querySelector('#btnSafety'), b2=doc.querySelector('#btnSafetyShelf');
  ok(b1&&typeof b1.onclick==='function','编辑器「数据保险」按钮已绑定');
  ok(b2&&typeof b2.onclick==='function','书架「数据保险」按钮已绑定');
  ok(typeof sandbox.renderShelf==='function','renderShelf 存在');

  head('C 世界观设定库渲染（不抛异常）');
  let threw=null;
  try{ sandbox.renderLore(); }catch(e){ threw=e; }
  ok(!threw,'renderLore() 不抛异常'+(threw?(' → '+threw.message):''));
  const lb=doc.querySelector('#loreBody');
  const lh=(lb&&lb.innerHTML)||'';
  ok(lh.length>1000,'设定库渲染出内容（'+lh.length+' 字符）');
  ['世界起源','地理疆域','日常生活','超自然规则','智能细分','新建分类'].forEach(k=>ok(lh.includes(k),'渲染含「'+k+'」'));
  ok(lh.includes('loreBar'),'注入总览条存在');
  let t2=null;
  ['world','power','history','global'].forEach(tab=>{
    try{ sandbox.__T.setTab(tab); sandbox.renderLore(); }catch(e){ t2=tab+': '+e.message; }
  });
  ok(!t2,'四个子页签都能渲染'+(t2?(' → '+t2):''));
  sandbox.__T.setTab('world'); sandbox.renderLore();

  head('D 复现报告的操作路径：新建小说 → 进编辑器');
  let err=null;
  try{
    sandbox.newBookDialog();
    const foot=doc.querySelector('#dlgFoot');
    ok(!!foot&&foot._children.length>0,'新建小说弹窗生成了按钮（'+((foot&&foot._children.length)||0)+' 个）');
    const labels=foot._children.map(x=>x.textContent);
    LOG.push('     按钮：'+labels.join(' / '));
    const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent))||foot._children[foot._children.length-1];
    ok(!!create,'找到「创建」按钮：'+create.textContent);
    create.onclick({target:create,stopPropagation(){}});
  }catch(e){ err=e; ERR.push('创建点击抛异常堆栈:\n'+String(e.stack||'').split('\n').slice(0,6).join('\n')); }
  ok(!err,'点击创建未抛异常'+(err?(' → '+err.message):''));
  ok(T.lib.items.length===1,'书架里已新增 1 本书（'+T.lib.items.length+'）');
  ok(T.currentId!=='','currentId 已设置：'+T.currentId);

  head('E 弹窗是否关闭（决定「点击任何功能无效」）');
  const dlg=doc.querySelector('#dlg');
  ok(dlg&&dlg.open===false,'新建小说弹窗已关闭（否则会挡住全屏、点什么都无效）');

  head('F 是否真的进入了编辑界面');
  ok(doc.querySelector('#editorScreen').style.display==='','编辑器已显示（display=""）');
  ok(doc.querySelector('#shelfScreen').style.display==='none','书架已隐藏');

  head('G 新书的设定库可用');
  const L=T.state.lore;
  ok(L&&Array.isArray(L.cats)&&L.cats.length===14,'新书自动建好 14 个分类');
  ok(Array.isArray(L.w)&&Array.isArray(L.pw.realms)&&Array.isArray(L.hi.events),'四块数据结构就位');
  T.state.lore.gl.master='不得战力崩坏。';
  T.state.lore.w.push({id:'t1',cat:'geo',name:'墨砚城',content:'分内外城。',note:'外城无墙。',real:false,enabled:true,constant:true,keys:[],secondary:[]});
  let bp=null,e2=null;
  try{ sandbox.ensureSlot(0); bp=sandbox.buildPrompt(0,'write','测试梗概'); }catch(e){ e2=e; }
  ok(!e2,'buildPrompt 不抛异常'+(e2?(' → '+e2.message):''));
  ok(bp&&bp.sys.indexOf('【全局总提示词')>=0,'System 里含全局总提示词');
  ok(bp&&bp.sys.indexOf('墨砚城')>=0&&bp.sys.indexOf('外城无墙')>=0,'常驻世界观条目+备注注入了 System');
  ok(bp&&bp.ctx.lore&&bp.ctx.lore.used>0,'ctx.lore 统计正常（'+((bp&&bp.ctx.lore.used)||0)+' 字）');

  head('G2 世界书引擎：常驻 / 关键词 / 次要关键词 / 分组 / 粘滞冷却 / 预算');
  const LO=T.state.lore;
  LO.w.length=0;
  LO.w.push({id:'k1',cat:'geo',name:'渡口',content:'验墨后方可入城。',note:'',enabled:true,constant:false,keys:['渡口'],secondary:[],selective:true,selectiveLogic:0,probability:100,useProbability:true,order:100,position:0,depth:4,role:0,group:'',sticky:0,cooldown:0,delay:0});
  LO.w.push({id:'k2',cat:'geo',name:'不可能命中',content:'这段不应出现。',note:'',enabled:true,constant:false,keys:['紫月蚀'],secondary:[],selective:true,selectiveLogic:0,probability:100,useProbability:true,order:100,position:0,depth:4,role:0,group:'',sticky:0,cooldown:0,delay:0});
  LO.w.push({id:'k3',cat:'geo',name:'次要词条目',content:'次要词通过。',note:'',enabled:true,constant:false,keys:['渡口'],secondary:['青石','红线'],selective:true,selectiveLogic:0,probability:100,useProbability:true,order:100,position:0,depth:4,role:0,group:'',sticky:0,cooldown:0,delay:0});
  LO.w.push({id:'k4',cat:'geo',name:'深插条目',content:'按深度注入。',note:'',enabled:true,constant:false,keys:['渡口'],secondary:[],selective:true,probability:100,useProbability:true,order:100,position:4,depth:2,role:0,group:'',sticky:0,cooldown:0,delay:0});
  let r1=null,er=null;
  try{ r1=sandbox.wbRun(0,{commit:false}); }catch(e){ er=e; }
  ok(!er,'wbRun 不抛异常'+(er?(' → '+er.message):''));
  const names=r1?r1.included.map(x=>x.e.name):[];
  ok(names.indexOf('不可能命中')<0,'未命中的关键词条目不注入');
  ok(names.indexOf('渡口')<0,'梗概里没有「渡口」时该条不触发');
  ok(r1&&r1.skipped.some(x=>x.e.name==='不可能命中'),'未触发条目给出了原因');
  /* 把关键词放进正文，再跑一次 */
  T.state.chapters[0].content='他走进渡口，看见青石地面。';
  const r2=sandbox.wbRun(0,{commit:false});
  const n2=r2.included.map(x=>x.e.name);
  ok(n2.indexOf('渡口')>=0,'关键词命中后注入');
  ok(n2.indexOf('次要词条目')>=0,'次要关键词逻辑通过后注入');
  ok(r2.ctx.indexOf('深插条目')>=0,'位置=按深度插入的条目进了 ctx（贴近正文）');
  const g=sandbox.wbRun(0,{commit:false});
  ok(g.groups!==undefined&&g.levels!==undefined,'引擎返回分组与递归层级信息');
  /* 分组竞争 */
  LO.w.push({id:'g1',cat:'geo',name:'组A',content:'A。',enabled:true,constant:false,keys:['渡口'],secondary:[],selective:true,probability:100,useProbability:true,order:10,position:0,depth:4,role:0,group:'渡口组',groupWeight:100,groupOverride:false,sticky:0,cooldown:0,delay:0});
  LO.w.push({id:'g2',cat:'geo',name:'组B',content:'B。',enabled:true,constant:false,keys:['渡口'],secondary:[],selective:true,probability:100,useProbability:true,order:999,position:0,depth:4,role:0,group:'渡口组',groupWeight:100,groupOverride:false,sticky:0,cooldown:0,delay:0});
  const rg=sandbox.wbRun(0,{commit:false});
  const gn=rg.included.map(x=>x.e.name);
  ok(!(gn.indexOf('组A')>=0&&gn.indexOf('组B')>=0),'同组只注入一条');
  ok(gn.indexOf('组B')>=0&&gn.indexOf('组A')<0,'按 order 高者胜出');
  ok(rg.groups.length>=1,'返回了分组竞争结果');
  /* 粘滞与冷却 */
  LO.w.push({id:'s1',cat:'geo',name:'粘滞条',content:'粘滞。',enabled:true,constant:false,keys:['渡口'],secondary:[],selective:true,probability:100,useProbability:true,order:50,position:0,depth:4,role:0,group:'',sticky:3,cooldown:0,delay:0});
  sandbox.wbRun(0,{commit:true});
  const s1=LO.w.find(x=>x.id==='s1');
  ok(s1._hit&&s1._hit.length===1&&s1._hit[0]===0,'commit 模式记下了命中章节');
  T.state.chapters[0].content='与关键词无关的一段文字。';
  const rs=sandbox.wbRun(1,{commit:false});
  ok(rs.included.some(x=>x.e.name==='粘滞条'),'粘滞期内关键词消失仍继续注入');
  s1.cooldown=5; s1.sticky=0; s1._hit=[1];
  const rc=sandbox.wbRun(2,{commit:false});
  ok(!rc.included.some(x=>x.e.name==='粘滞条'),'冷却期内不再注入');
  ok(rc.skipped.some(x=>x.e.name==='粘滞条'&&/冷却/.test(x.why)),'冷却给出了原因');
  /* 预算 */
  T.state.chapters[2]=T.state.chapters[2]||{content:''};
  T.state.chapters[2].content='他回到渡口，青石上落了一层灰。';
  const cand=LO.w.length;
  LO.wbudget=120;
  const rb=sandbox.wbRun(2,{commit:false});
  ok(rb.used<=120,'预算生效（用了 '+rb.used+' / 120）');
  ok(rb.included.length<cand,'超出预算的条目被挡下（注入 '+rb.included.length+' / 候选 '+cand+'）');
  ok(rb.included.length>0,'预算内至少注入一条');
  LO.wbudget=6000;

  head('G3 旧世界书数据迁移 + ST 导出往返');
  const legacy={meta:{title:'迁移测试'},world:[{id:'w1',comment:'旧世界书条目',content:'旧内容',keys:['旧键'],secondary:[],constant:false,enabled:true,order:100}]};
  const mig=sandbox.wbMigrate(legacy);
  ok(mig&&Array.isArray(mig.w)&&mig.w.length===1,'旧 state.world 被迁进设定库');
  ok(mig.w[0].name==='旧世界书条目','comment → name 映射正确');
  ok(mig.w[0].keys[0]==='旧键','触发关键词保留');
  const st=sandbox.worldToST();
  const stArr=Object.values(st.entries);
  ok(stArr.length>0,'导出为 ST 世界书（'+stArr.length+' 条）');
  const one=stArr.find(x=>x.comment==='渡口');
  ok(!!one,'导出含「渡口」');
  ['key','keys','comment','content','constant','selective','selectiveLogic','order','position','depth','role','probability','useProbability','caseSensitive','matchWholeWords','group','groupWeight','sticky','cooldown','delay','excludeRecursion','preventRecursion','vectorized','scanDepth','disable','keysecondary','secondary_keys','addMemo','displayIndex'].forEach(k=>ok(k in one,'ST 字段齐全：'+k));
  head('G4 导入 ST 世界书（多种格式）');
  const before=sandbox.ensureLore().w.length;
  const f1='{"entries":{"0":{"uid":0,"key":["灵脉"],"keysecondary":["封锁"],"comment":"灵脉管制","content":"灵脉由国家统一登记。","constant":false,"selective":true,"selectiveLogic":0,"order":120,"position":1,"depth":4,"role":0,"probability":80,"useProbability":true,"group":"灵脉","groupWeight":100,"sticky":2,"cooldown":3,"delay":0,"excludeRecursion":false,"preventRecursion":false,"vectorized":false}}}';
  const l1=sandbox.wbParse(f1);
  ok(l1.length===1,'解析 entries 对象格式');
  const imp=sandbox.wbImport(l1,{auto:true});
  ok(imp.nw===1,'导入 1 条到世界观');
  const nw=sandbox.ensureLore().w.find(x=>x.name==='灵脉管制');
  ok(!!nw,'条目已入库');
  ok(nw.keys[0]==='灵脉'&&nw.secondary[0]==='封锁','主/次关键词保留');
  ok(nw.probability===80&&nw.useProbability===true,'概率保留');
  ok(nw.sticky===2&&nw.cooldown===3,'粘滞 / 冷却保留');
  ok(nw.position===1&&nw.order===120,'位置 / 顺序保留');
  ok(nw.group==='灵脉','分组保留');
  ok(nw.block&&nw.cat,'已自动归入四大块之一（'+nw.block+'/'+nw.cat+'）');
  const f2='[{"key":"法阵","content":"内容","comment":"数组格式"}]';
  ok(sandbox.wbParse(f2).length===1,'解析数组格式');
  const f3='{"data":{"entries":[{"comment":"ST角色卡内嵌","content":"x","key":["k"]}]}}';
  ok(sandbox.wbParse(f3).length===1,'解析 data.entries 格式');
  const f4='{"world_info":{"a":{"comment":"旧式world_info","content":"y","key":["k"]}}}';
  ok(sandbox.wbParse(f4).length===1,'解析 world_info 格式');
  const f5='{"comment":"单条","content":"z","key":["k"]}';
  ok(sandbox.wbParse(f5).length===1,'解析单条对象格式');
  const rr=sandbox.wbImport([{comment:'渡口',content:'重复的',key:['k']}],{auto:true});
  ok(rr.skip===1,'同名条目被跳过（不覆盖已有）');

  head('G5 触发设置面板 + 命中测试窗口渲染');
  const L2=sandbox.ensureLore();
  const demo=L2.w.find(x=>x.name==='灵脉管制')||L2.w[0];
  let html=null,e5=null;
  try{ html=sandbox.wbFieldsHTML(demo); }catch(e){ e5=e; }
  ok(!e5,'wbFieldsHTML 不抛异常'+(e5?(' → '+e5.message):''));
  ok(html&&html.indexOf('触发设置')>=0,'面板有标题');
  ['constant','keys','secondary','selectiveLogic','scanDepth','position','depth','role','probability',
   'group','groupWeight','sticky','cooldown','delay','excludeRecursion','preventRecursion','vectorized',
   'caseSensitive','matchWholeWords','useProbability','include','exclude'].forEach(f=>
    ok(html.indexOf('data-f="'+f+'"')>=0,'面板含字段控件：'+f));
  let eh=null,e6=null;
  try{ sandbox.__T.setTab('world'); sandbox.renderLore(); eh=doc.querySelector('#loreBody').innerHTML; }catch(e){ e6=e; }
  ok(!e6,'世界観页渲染不抛异常'+(e6?(' → '+e6.message):''));
  ok(eh&&eh.indexOf('⇧ 导入世界书')>=0,'工具栏有「导入世界书」');
  ok(eh&&eh.indexOf('⇩ 导出为世界书')>=0,'工具栏有「导出为世界书」');
  ok(eh&&eh.indexOf('🔍 命中测试')>=0,'工具栏有「命中测试」');
  ok(eh&&eh.indexOf('触发设置')>=0,'条目里展开了触发设置入口');
  let e7=null;
  try{ sandbox.wbTestDialog(); }catch(e){ e7=e; }
  ok(!e7,'命中测试窗口不抛异常'+(e7?(' → '+e7.message):''));
  const dlgHTML=(doc.querySelector('#dlgBody').innerHTML)||'';
  ok(dlgHTML.indexOf('世界书命中测试')>=0,'命中测试窗口有内容（'+dlgHTML.length+' 字符）');
  ok(dlgHTML.indexOf('将被注入')>=0,'命中测试列出了将被注入的条目');
  ok(dlgHTML.indexOf('未被触发')>=0,'命中测试列出了未触发的条目与原因');

  head('G6 导出 → 导入 结构无损往返（境界 / 分支 / 事件 / 世界观）');
  const L3=sandbox.ensureLore();
  L3.w.length=0; L3.pw.branches.length=0; L3.pw.realms.length=0; L3.hi.events.length=0;
  L3.w.push({id:'rt1',cat:'geo',name:'往返世界观',content:'世界观内容。',note:'备注X',enabled:true,constant:true,keys:[],secondary:[],real:true});
  L3.pw.on=true;
  L3.pw.branches.push({id:'rt2',name:'往返分支',content:'分支内容。',note:'',enabled:true});
  L3.pw.realms.push({id:'rt3',name:'往返境界',cap:'上限A',feat:'特征B',cond:'条件C',weak:'弱点D',note:'',enabled:true});
  L3.hi.events.push({id:'rt4',name:'往返事件',time:'苍历 9 年',desc:'事件简述',effect:'长远影响',note:'',enabled:true});
  const exp=sandbox.worldToST();
  const arr=Object.keys(exp.entries).map(k=>exp.entries[k]);
  ok(arr.length>=4,'导出包含全部结构（'+arr.length+' 条）');
  L3.w.length=0; L3.pw.branches.length=0; L3.pw.realms.length=0; L3.hi.events.length=0;
  const back=sandbox.wbImport(arr,{auto:false});
  ok(L3.w.length===1&&L3.w[0].name==='往返世界观','世界观条目往返成功');
  ok(L3.pw.branches.length===1&&L3.pw.branches[0].name==='往返分支','修炼分支往返成功');
  ok(L3.pw.realms.length===1&&L3.pw.realms[0].name==='往返境界','境界条目往返成功');
  ok(L3.pw.realms[0].cap==='上限A'&&L3.pw.realms[0].feat==='特征B'&&L3.pw.realms[0].cond==='条件C'&&L3.pw.realms[0].weak==='弱点D','境界四个字段完整还原');
  ok(L3.hi.events.length===1&&L3.hi.events[0].name==='往返事件','历史事件往返成功');
  ok(L3.hi.events[0].time==='苍历 9 年'&&L3.hi.events[0].effect==='长远影响','事件的时间与影响完整还原');
  ok(L3.w[0].note==='备注X'&&L3.w[0].real===true,'备注区与真实/架空标记往返成功');
  ok(back.restored>=3,'导入计数认出了还原的条目（restored='+back.restored+'）');

  head('H 存档往返');
  try{ sandbox.flushSave(); ok(true,'flushSave 正常'); }catch(e){ ok(false,'flushSave 抛错: '+e.message); }
  const raw=localStorage.getItem('dw-book-'+T.currentId);
  ok(!!raw,'新书已落盘');
  let parsed=null;
  try{ parsed=JSON.parse(raw); }catch(e){}
  ok(!!parsed&&parsed.lore&&Array.isArray(parsed.lore.w)&&parsed.lore.w.length>0,'设定库条目随书存档（'+((parsed&&parsed.lore&&parsed.lore.w.length)||0)+' 条）');
  ok(!!parsed&&parsed.lore.pw.realms.length>0&&parsed.lore.hi.events.length>0,'境界与历史事件也随书存档');
  ok(!!parsed&&!('world' in parsed),'存档里已不再有旧的 world 字段（仅保留 lore）');

  head('I 手机上竖屏再走一遍（弹窗关闭 + 布局规则）');
  sandbox.newBookDialog();
  const foot2=doc.querySelector('#dlgFoot');
  const c2=foot2._children.find(x=>/创建|确定|新建/.test(x.textContent));
  try{ c2.onclick({target:c2,stopPropagation(){}}); ok(true,'竖屏下再次新建并进入编辑器未抛异常'); }
  catch(e){ ok(false,'竖屏下新建抛错: '+e.message); }
  ok(doc.querySelector('#dlg').open===false,'竖屏下弹窗同样已关闭');
  ok(T.lib.items.length===2,'第二本书已建立（'+T.lib.items.length+'）');

  head('G7 导入后自动分类落位（端到端）');
  const L7=sandbox.ensureLore();
  L7.w.length=0; L7.pw.branches.length=0; L7.pw.realms.length=0; L7.hi.events.length=0;
  const book={entries:{
    '0':{uid:0,key:['北境'],comment:'【地理】北境三国',content:'天险山脉为界，边境设九座关城。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false},
    '1':{uid:1,key:['金丹'],comment:'境界·金丹',content:'金丹境可御物飞行，晋升需凝聚金丹。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false},
    '2':{uid:2,key:['白鸦'],comment:'白鸦之乱',content:'发生于苍历三百一十年前，导致旧王朝灭亡。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false},
    '3':{uid:3,key:['宗门'],comment:'宗门势力·天枢阁',content:'天枢阁门下分四堂，与皇族共治。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false},
    '4':{uid:4,key:['钱'],comment:'货币与物价',content:'通用方孔铜钱，一石米约三十文。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false},
    '5':{uid:5,key:['吹笛人'],comment:'吹笛人雷恩',content:'一个总在雨夜出现的陌生人。',position:0,depth:4,order:100,probability:100,useProbability:true,selective:true,selectiveLogic:0,constant:false,disable:false}
  }};
  const got7=sandbox.wbImport(sandbox.wbParse(JSON.stringify(book)),{auto:true});
  ok(got7.all===6,'解析到 6 条');
  ok(L7.w.some(x=>x.name==='【地理】北境三国'&&x.cat==='geo'),'「【地理】北境三国」→ 世界观/地理疆域');
  ok(L7.w.some(x=>x.name==='宗门势力·天枢阁'&&x.cat==='politics'),'「宗门势力·天枢阁」→ 世界观/政治制度');
  ok(L7.w.some(x=>x.name==='货币与物价'&&x.cat==='economy'),'「货币与物价」→ 世界观/经济');
  ok(L7.pw.realms.some(x=>x.name==='境界·金丹'),'「境界·金丹」→ 力量体系/境界词条');
  ok(L7.hi.events.some(x=>x.name==='白鸦之乱'),'「白鸦之乱」→ 历史年表/历史事件');
  const imp7=L7.w.find(x=>x.name==='【地理】北境三国');
  ok(imp7&&imp7.keys[0]==='北境','导入后触发关键词保留');
  ok(imp7&&imp7._conf==='high','分类置信度已记录（'+((imp7&&imp7._conf)||'')+'）');
  ok(got7.conf.high>=4,'高可信计数正确（'+got7.conf.high+' 条）');
  ok(got7.lows.length===1&&got7.lows[0].name==='吹笛人雷恩','只有看不出主题的 1 条被列为待确认');
  ok(Object.keys(got7.dist).length>=5,'分类分布包含 '+Object.keys(got7.dist).length+' 个类别');
  let e8=null;
  try{ sandbox.wbReport(got7); }catch(e){ e8=e; }
  ok(!e8,'导入报告窗口不抛异常'+(e8?(' → '+e8.message):''));
  const rep=doc.querySelector('#dlgBody').innerHTML||'';
  ok(rep.indexOf('自动分类结果')>=0,'报告有标题');
  ok(rep.indexOf('地理疆域')>=0,'报告列出了「地理疆域」分类');
  ok(rep.indexOf('待确认')>=0,'报告标出了待确认条目');
  ok(rep.indexOf('固定上下文')>=0,'报告提醒了力量/历史条目会常驻');

  }catch(e){ ERR.push('main 抛异常: '+e.message+' @ '+((e.stack||'').split('\n')[1]||'')); }
  fs.writeFileSync('smoke.log',LOG.join('\n')+'\n\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====\n'+(ERR.length?('\n'+ERR.join('\n')):''));
  process.exit(0);
},60);
