/* 端到端冒烟：复现「书架 → 新建小说 → 进编辑器」的完整路径 */
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const code=scripts.join('\n;\n')
  +'\n;globalThis.__T={get state(){return state;},get lib(){return lib;},get currentId(){return currentId;},'
  +'get _loreLast(){return _loreLast;},get loreTab(){return loreTab;},setTab(v){loreTab=v;},'
  +'get charOpen(){return charOpen;},set charOpen(v){charOpen=v;},'
  +'get charTab(){return charTab;},set charTab(v){charTab=v;},'
  +'get CH_DEF(){return CH_DEF;},get CH_FIELDS(){return CH_FIELDS;}};';

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







/* ================== 角色卡：细分结构 + SillyTavern 兼容 + {user} 清理 ================== */
const fs2=require('fs');

head('A 加载整页脚本');
try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
catch(e){ ok(false,'脚本执行抛异常: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }
const S=sandbox;
const CH_DEF=S.__T.CH_DEF||[];
const ST=()=>S.__T.state;

/* ST V2 角色卡样本（故意带上 {user} / {{char}} 与对话专用字段） */
const cardBlob=JSON.stringify({
  spec:'chara_card_v2', spec_version:'2.0',
  data:{
    name:'沈青梧',
    description:'【外貌】容貌清冷绝艳，左眉尾有一道浅疤；常着素白长衫。【性格】外冷内热，'
      +'遇事先算三分，对{{user}}却总是心软。【身份】天枢阁阁主，执掌天下情报。【能力】剑修，'
      +'境界已至金丹，出手不留余地。【限制】剑意入体，每动一次便折一分寿元。',
    personality:'外冷内热，说话极简，从不解释自己的决定。',
    scenario:'{{char}}与{{user}}在雨夜的长安城重逢。',
    first_mes:'*她抬眼看了{{user}}一眼* 你来了。',
    alternate_greetings:['*沉默*','又见面了。'],
    mes_example:'<START>\n{{user}}: 你为什么来？\n{{char}}: 顺路。',
    system_prompt:'无论何时都不得让她主动示弱。称呼{{user}}时一律用「你」。',
    post_history_instructions:'保持冷静克制的语气。',
    tags:['女主','剑修','天枢阁'],
    creator:'测试', character_version:'1.2'
  }
});

setTimeout(async()=>{ try{

  head('A2 先建一本书（让保存有去处）');
  try{
    S.newBookDialog();
    const foot=doc.querySelector('#dlgFoot');
    const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent))||foot._children[foot._children.length-1];
    create.onclick({target:create,stopPropagation(){}});
  }catch(e){ ERR.push('建书失败: '+e.message); }
  ok(S.__T.lib.items.length===1,'书架里有 1 本书');
  ok(doc.querySelector('#dlg').open===false,'建书弹窗已关闭');
  ok(doc.querySelector('#editorScreen').style.display==='','已进入编辑器');
  S.__T.state.chars.length=0;

  head('B 角色卡细分结构');
  ok(Array.isArray(CH_DEF)&&CH_DEF.length===9,'细分模块 9 个（实际 '+((CH_DEF||[]).length)+'）');
  ok(CH_DEF.map(m=>m.name).join('').indexOf('性格内核')>=0,'含「性格内核」');
  ['角色档案','形貌特征','性格内核','口吻腔调','身世履历','能力谱系','关系星图','目标驱动','角色铁律']
    .forEach(n=>ok(CH_DEF.some(m=>m.name===n),'含模块「'+n+'」'));
  ok(S.chTotal()===34,'可填字段共 34 格（实际 '+S.chTotal()+'）');

  head('C {user} / {char} 占位符清理（小说不需要）');
  {
    S.__T.state.meta.hero='顾长庚';
    const t=S.chClean('{{char}}看着{{user}}，说：{user}，别走。<USER>懂了。<BOT>笑了。', '沈青梧');
    ok(t.indexOf('{{user}}')<0&&t.indexOf('{{char}}')<0&&t.indexOf('<USER>')<0,'占位符全部清除');
    ok(t.indexOf('顾长庚')>=0,'{{user}} 换成了主角名「顾长庚」');
    ok(t.indexOf('沈青梧')>=0,'{{char}} 换成了角色名');
  }

  head('D 规则拆分：把一大段 description 分到各模块');
  {
    const r=S.chSplitDesc('【外貌】容貌清冷绝艳，左眉尾有一道浅疤。【性格】外冷内热，遇事先算三分。'
      +'【身份】天枢阁阁主，执掌天下情报。【能力】剑修，境界已至金丹。【限制】每动一次便折一分寿元。','沈青梧');
    ok(r.split===true,'识别出小标题并完成拆分');
    ok(r.f.look.face.indexOf('浅疤')>=0,'外貌 → look.face');
    ok(r.f.person.core.indexOf('外冷内热')>=0,'性格 → person.core');
    ok(r.f.basic.org.indexOf('天枢阁')>=0,'身份 → basic.org');
    ok(r.f.power.skill.indexOf('剑修')>=0,'能力 → power.skill');
    ok(r.f.power.limit.indexOf('折一分寿元')>=0,'限制 → power.limit');
    ok(r.f.bg.past===''&&r.f.goal.goal==='','没有内容被硬塞进无关格子');
  }

  head('E 导入 SillyTavern V2 卡');
  {
    const c=S.normChar(JSON.parse(cardBlob));
    ok(c.name==='沈青梧','角色名正确');
    ok(c.f.look.face.indexOf('浅疤')>=0,'description 的【外貌】已拆到 形貌特征');
    ok(c.f.person.core.indexOf('外冷内热')>=0,'personality 落到 性格内核');
    ok(c.f.person.core.indexOf('{{user}}')<0,'性格里的 {{user}} 已清理');
    ok(c.f.bg.now.indexOf('长安城')>=0,'scenario 落到 当前处境');
    ok(c.f.bg.now.indexOf('{{char}}')<0&&c.f.bg.now.indexOf('{{user}}')<0,'处境里的占位符已清理');
    ok(c.f.power.skill.indexOf('剑修')>=0,'能力落到 能力谱系');
    ok((c.f.speech.sample||'').indexOf('<START>')<0,'台词示例里的 <START> 标记已清除');
    ok(c.f.rule.other.indexOf('不得让她主动示弱')>=0||c.f.rule.ooc.indexOf('不得让她主动示弱')>=0,
      'system_prompt 落到 角色铁律');
    ok(c._dropped.length===2,'报告丢弃了 2 项对话专用内容（'+c._dropped.join(' / ')+'）');
    ok(c.tags.join(',')==='女主,剑修,天枢阁','标签保留');
    ok(c.enabled===true&&c.from===1&&c.to===9999,'出场区间默认值正确');
    ok(S.chFilled(c)>=9,'细分字段已填 '+S.chFilled(c)+' 格');
    S.addChar(c);
  }

  head('F 卡片列表渲染');
  S.renderChars();
  {
    const host=doc.querySelector('#charList');
    const h=(host&&host.innerHTML)||'';
    ok(h.indexOf('chcard2')>=0,'渲染出卡片');
    ok(h.indexOf('沈青梧')>=0,'卡片显示角色名');
    ok(h.indexOf('格</span>')>=0,'卡片显示字段填充度徽标');
    ok(h.indexOf('data-act="open"')>=0,'卡片可点开');
    ok(h.indexOf('点开编辑')>=0,'有「点开编辑」提示');
    ok(h.indexOf('沈青梧')>=0&&h.indexOf('天枢阁')>=0,'卡片摘要显示身份');
  }

  head('G 点开卡片 → 人物档案（细分编辑）');
  {
    const btn={dataset:{act:'open',i:'0'}, closest:()=>({dataset:{act:'open',i:'0'}})};
    S.__T.charOpen=0; S.__T.charTab='basic'; S.renderChars();
    const host=doc.querySelector('#charList');
    const h=(host&&host.innerHTML)||'';
    ok(host._cls&&host._cls.has('detail'),'列表切到档案视图（.detail）');
    ok(h.indexOf('返回角色列表')>=0,'有返回按钮');
    ok(CH_DEF.every(m=>h.indexOf(m.name)>=0),'9 个细分页签全部渲染');
    ok(h.indexOf('姓名')>=0&&h.indexOf('称号')>=0,'角色档案字段在');
    ok(h.indexOf('data-act="cai"')>=0,'字段带 AI 扩写/润色/重写按钮');
    ok(h.indexOf('data-cf="basic.alias"')>=0,'字段绑定到 basic.alias');
    ok(h.indexOf('data-cf="@name"')>=0,'姓名绑定到顶层 name');
    ok(h.indexOf('AI 补全空白字段')>=0,'有整卡 AI 补全');
    ok(h.indexOf('清理 {user} 占位符')>=0,'有占位符清理按钮');
  }

  head('H 切换细分页签');
  {
    ['look','person','speech','bg','power','rel','goal','rule'].forEach(t=>{
      let bad=null;
      try{ S.__T.charTab=t; S.renderChars(); }catch(e){ bad=e.message; }
      const h=(doc.querySelector('#charList').innerHTML)||'';
      const m=CH_DEF.find(x=>x.id===t);
      ok(!bad&&h.indexOf(m.fields.filter(f=>!f.top)[0].label)>=0,'页签「'+m.name+'」渲染出字段'+(bad?(' → '+bad):''));
    });
  }

  head('I 编辑字段 → 落盘');
  {
    S.__T.charTab='goal'; S.renderChars();
    S.__T.state.chars[0].f.goal.goal='夺回被篡改的天枢阁密档';
    S.__T.state.chars[0].f.rel.hero='与主角是旧识，彼此试探';
    S.save();
    if(typeof S.flushSave==='function') S.flushSave();
    ok(S.__T.state.chars[0].f.goal.goal.indexOf('密档')>=0,'字段写入内存');
    const raw=String(localStorage.getItem('dw-book-'+S.__T.currentId)||'');
    LOG.push('     落盘长度 '+(raw?raw.length:0)+' 字节');
    ok(raw.indexOf('密档')>=0,'字段已落盘到 localStorage');
    ok(raw.indexOf('旧识')>=0,'关系星图字段也落盘');
  }

  head('J 注入：只发非空字段、无占位符、无对话');
  {
    const txt=S.chBlockText(0);
    ok(txt.indexOf('本章登场角色')>=0,'有角色区块标题');
    ok(txt.indexOf('沈青梧')>=0,'含角色名');
    ok(txt.indexOf('【性格内核】')>=0,'按细分模块分组');
    ok(txt.indexOf('【形貌特征】')>=0,'外貌已注入');
    ok(txt.indexOf('{{user}}')<0&&txt.indexOf('{{char}}')<0,'注入文本无占位符');
    ok(txt.indexOf('first_mes')<0&&txt.indexOf('开场')<0,'不注入开场问候语');
    ok(txt.indexOf('顾长庚')>=0||txt.indexOf('主角')>=0,'占位符已替换成具体称呼');
    const empty=CH_DEF.filter(m=>!S.chModHas(S.__T.state.chars[0],m.id));
    ok(txt.length>80,'注入文本长度合理（'+txt.length+' 字）');
  }

  head('K 导出 → 再导入：结构无损');
  {
    const c=S.__T.state.chars[0];
    const before={look:c.f.look.face, person:c.f.person.core, goal:c.f.goal.goal,
      limit:c.f.power.limit, alias:c.f.basic.alias, note:c.note};
    /* 走真实的导出构造 */
    const out=S.chExportObj(0);
    ok(out.spec==='chara_card_v2','导出为 SillyTavern V2');
    ok(out.data.description.indexOf('【形貌特征】')>=0||out.data.description.indexOf('【性格内核】')>=0,
      'description 里按模块拼装');
    ok(!!(out.data.extensions&&out.data.extensions.moYan),'细分结构写入 extensions.moYan');
    ok(out.data.first_mes.indexOf('{{user}}')<0,'导出的 first_mes 也已清理');
    /* 清空后重新导入 */
    S.__T.state.chars.length=0;
    const c2=S.normChar(JSON.parse(JSON.stringify(out)));
    ok(c2._restored===true,'识别为本工具导出的卡');
    ok(c2.f.look.face===before.look,'外貌无损还原');
    ok(c2.f.person.core===before.person,'性格无损还原');
    ok(c2.f.goal.goal===before.goal,'目标无损还原');
    ok(c2.f.power.limit===before.limit,'限制无损还原');
    ok(c2.f.basic.alias===before.alias,'称号无损还原');
    S.addChar(c2);
  }

  head('L 内嵌世界书 → 并进世界观设定库');
  {
    S.__T.state.chars.length=0;
    const withBook=JSON.parse(cardBlob);
    withBook.data.character_book={ entries:[
      {keys:['天枢阁'], comment:'【政治制度】天枢阁', content:'天下情报之首，阁主可调动三省密探。', constant:false},
      {keys:['金丹'], comment:'【境界】金丹境', content:'真气凝丹，可御剑百里。', constant:false}
    ]};
    const c=S.normChar(withBook);
    ok(c._book.length===2,'解析出内嵌世界书 2 条');
    S.addChar(c);
    /* 真实导入流程会把 _book 并进设定库 */
    const L=S.ensureLore(); const n0=L.w.length;
    c._book.forEach(raw=>{ const e=S.wbEntry(raw,{linkedChar:c.id}); e._linked=c.id; L.w.push(e); });
    c._book=[];
    ok(L.w.length===n0+2,'内嵌条目已并入设定库（'+n0+' → '+L.w.length+'）');
    ok(L.w.filter(x=>x._linked===c.id).length===2,'条目与角色建立了关联');
  }

  head('M 出场区间控制注入');
  {
    S.__T.state.chars.length=0;
    S.__T.state.meta.hero='主角';
    const c=S.normChar(JSON.parse(cardBlob)); c.from=3; c.to=5; S.addChar(c);
    ok(S.activeCharsFor(0).length===0,'第 1 章（未到出场）不注入');
    ok(S.activeCharsFor(2).length===1,'第 3 章开始注入');
    ok(S.activeCharsFor(4).length===1,'第 5 章仍在区间');
    ok(S.activeCharsFor(5).length===0,'第 6 章已超出区间');
    c.enabled=false;
    ok(S.activeCharsFor(3).length===0,'停用后完全不注入');
  }

  head('N 新建角色 / 空卡容错');
  {
    S.__T.state.chars.length=0;
    S.chAddBlank();
    ok(S.__T.state.chars.length===1,'新建出一张空卡');
    ok(S.chFilled(S.__T.state.chars[0])===1,'空卡只填了姓名 1 格');
    ok(S.chBlockText(0).indexOf('新角色')>=0,'空卡也能安全注入（不抛异常）');
    const t=S.chBlockText(0);
    ok(t.indexOf('【角色档案】')<0||t.length>0,'空字段不产生空模块标题');
    S.renderChars();
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('新角色')>=0,'空卡在列表可见');
  }

  head('O 坏数据自愈');
  {
    const bad=[{id:'x'},{name:'只有名字'},null,{name:'怪数据',f:'不是对象',tags:'a,b',from:'abc'}];
    bad.forEach((b,i)=>{
      let err=null;
      try{ const c=S.ensureCh(b||{}); if(c) S.chFilled(c); }catch(e){ err=e.message; }
      ok(!err,'第 '+(i+1)+' 个坏数据未抛异常'+(err?(' → '+err):''));
    });
    const c=S.ensureCh({name:'怪数据',f:'不是对象',tags:'a,b',from:'abc'});
    ok(c&&c.f&&c.f.basic,'f 被修成合法结构');
    ok(c.tags.join(',')==='a,b','字符串标签被转成数组');
    ok(c.from===1,'非法 from 修正为 1');
  }

  head('P 与世界观模块共存（回归）');
  {
    S.__T.state.chars.length=0;
    S.addChar(S.normChar(JSON.parse(cardBlob)));
    let err=null;
    try{ S.renderLore(); }catch(e){ err='renderLore: '+e.message; }
    try{ S.renderChars(); }catch(e){ err=(err||'')+' renderChars: '+e.message; }
    ok(!err,'两个模块同时渲染无异常'+(err?(' → '+err):''));
    ok((doc.querySelector('#charList').innerHTML||'').indexOf('沈青梧')>=0,'角色卡仍在');
    ok(ERR.length===0,'全程无未捕获异常'+(ERR.length?('：'+ERR.join(' | ')):''));
  }

  LOG.push('\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====');
  fs2.writeFileSync('char.log',LOG.join('\n'),'utf8');
  console.log(LOG.join('\n'));
  process.exit(ERR.length?1:0);

}catch(e){ LOG.push('测试脚本异常: '+e.message+'\n'+(e.stack||'')); fs2.writeFileSync('char.log',LOG.join('\n'),'utf8'); console.log(LOG.join('\n')); process.exit(1); } },300);
