/* 世界观设定库：核心逻辑回归测试 */
const fs=require('fs');
const src=fs.readFileSync('lore-module.js','utf8');

/* ---- 最小依赖桩 ---- */
let store={};
const state={meta:{title:'测试书'},world:[],api:{},rules:{},settings:{},memory:{},suggest:{},chars:[],outline:[],chapters:[],hooks:[],current:0};
const toastLog=[];
const dep={
  state,
  uid:()=>Math.random().toString(36).slice(2,10),
  esc:s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  $:()=>null, $$:()=>[],
  save:()=>{}, toast:m=>toastLog.push(m),
  openDlg:()=>{}, chat:async()=>'', parseLoose:()=>null, setBusy:()=>{},
  fieldContext:()=>'（桩上下文）', download:()=>{}, ensureMem:()=>({}),
  prompt:()=>null, confirm:()=>true,
  /* 世界书引擎桩：只把「常驻」条目拼出来（引擎本身另有专项测试 test-smoke3） */
  wbFix:e=>e,
  toKeys:v=>Array.isArray(v)?v:(typeof v==='string'?v.split(/[,，]/).map(x=>x.trim()).filter(Boolean):[]),
  activeCharsFor:()=>[],
  wbRun:(idx,o)=>{
    const L2=state.lore||{w:[],wbudget:6000};
    const inc=(L2.w||[]).filter(e=>e.enabled&&e.constant&&String(e.content||'').trim());
    let sy='';
    if(inc.length){
      sy='\n\n【世界书 · 前置设定（必须严格遵守）】';
      inc.forEach(e=>{ sy+='\n· ◆ '+(e.name||'')+'\n'+(e.note?('   ↳【解读限制】'+e.note+'\n'):'')+String(e.content).replace(/\s*\n\s*/g,' '); });
    }
    const notTrig=(L2.w||[]).filter(e=>e.enabled&&!e.constant&&String(e.content||'').trim()).map(e=>({e,why:'关键词未命中'}));
    return {sys:sy,ctx:'',included:inc.map(e=>({e,why:'常驻（固定上下文）',level:0})),dropped:[],
      skipped:notTrig,used:sy.length,budget:L2.wbudget||6000,pool:(L2.w||[]).length,
      constants:inc.length,levels:0,groups:[],idx:idx};
  }
};
const api=new Function(...Object.keys(dep),
  src+'\n;return {blankLore,ensureLore,loreGet,loreCount,loreSystemBlock,loreSections,loreApply,loreMergeInto,'
  +'loreTimeSort,loreGuessCat,loreSplitRawText,getLast:()=>_loreLast,setState:s=>{state=s;},'
  +'loreOpenKey,loreCountN};')(...Object.values(dep));

let pass=0,fail=0;
function ok(cond,msg){ if(cond){pass++;console.log('  ✔ '+msg);} else {fail++;console.log('  ✘ '+msg);} }
function head(t){ console.log('\n=== '+t+' ==='); }

/* ============ T1 默认结构 ============ */
head('T1 默认分类与惰性初始化');
let L=api.ensureLore();
ok(state.lore===L,'ensureLore 把 state.lore 建了起来');
ok(L.cats.length===14,'内置 14 个分类 → '+L.cats.length);
ok(L.cats.every(c=>c.builtin),'内置分类都带 builtin 标记');
ok(L.on===true&&L.pw.on===true&&L.budget===8000,'默认 on / pw.on / budget 正确');
ok(Array.isArray(L.w)&&Array.isArray(L.pw.realms)&&Array.isArray(L.hi.events),'各块数组就位');

/* ============ T2 注入文本 ============ */
head('T2 拼装 System Prompt');
L.gl.master='写文不得出现战力崩坏；角色性格不能 OOC。';
L.gl.extra='本书不写血腥描写。';
L.w.push({id:'a1',cat:'geo',name:'墨砚城',content:'分内城与外城，环以灵脉水渠。',note:'外城不设城墙。',real:false,enabled:true,constant:true,keys:[],secondary:[]});
L.w.push({id:'a2',cat:'economy',name:'渡口验墨',content:'货物入城需以墨汁浸绳验色。',note:'',real:true,enabled:true,constant:true,keys:[],secondary:[]});
L.w.push({id:'a3',cat:'geo',name:'已停用条目',content:'不该出现',note:'',real:false,enabled:false,constant:true,keys:[],secondary:[]});
L.w.push({id:'a4',cat:'geo',name:'关键词条目',content:'不该在固定上下文里出现',note:'',real:false,enabled:true,constant:false,keys:['x'],secondary:[]});
L.pw.general='力量本质是改写他人记忆里的因果。';
L.pw.gnote='不得出现例外。';
L.pw.branches.push({id:'b1',name:'记言术',content:'整理他人言语为法门。',note:'',enabled:true});
L.pw.realms.push({id:'r1',name:'淬体',cap:'肉身坚韧',feat:'筋骨泛青',cond:'药汤浸体百日',weak:'无灵力',note:'',enabled:true});
L.pw.realms.push({id:'r2',name:'引气',cap:'可施展低阶术法',feat:'呼吸有微光',cond:'静坐七日',weak:'需言语引导',note:'',enabled:true});
L.hi.cal='苍历，以玄鸟衔印之年为元年。';
L.hi.events.push({id:'e1',name:'断渠之盟',time:'苍历 108 年',desc:'三家立誓分渠。',effect:'后世纷争需绕过此盟约。',note:'',real:false,enabled:true});
const txt=api.loreSystemBlock();
const last=api.getLast();
ok(txt.includes('【全局总提示词'),'含全局总提示词段');
ok(txt.includes('【全局约束'),'含全局约束段');
ok(txt.includes('【世界书 · 前置设定'),'含世界书注入段（固定上下文条目）');
ok(!txt.includes('不该在固定上下文里出现'),'非站驻（关键词）条目不进固定上下文');
ok(txt.includes('【力量 / 修炼体系】'),'含力量体系段');
ok(txt.includes('【历史年表'),'含历史段');
ok(txt.indexOf('【全局总提示词')<txt.indexOf('【世界书 · 前置设定'),'总提示词排在世界书之前（优先级）');
ok(txt.includes('◆ 墨砚城')&&txt.includes('◆ 渡口验墨'),'常驻世界观条目被注入（分类由设定库管理）');
ok(txt.includes('↳【解读限制】外城不设城墙。'),'备注区进入注入文本');
ok(!txt.includes('不该出现'),'停用条目被排除');
ok(txt.includes('参考现实」的设定：渡口验墨'),'真实/架空标记：参考现实名单正确');
ok(txt.includes('完全架空」的设定：墨砚城'),'真实/架空标记：架空名单正确');
ok(txt.includes('1. 淬体')&&txt.includes('2. 引气'),'境界按顺序编号');
ok(txt.includes('能力上限：肉身坚韧')&&txt.includes('弱点：需言语引导'),'境界字段齐全');
ok(txt.includes('苍历 108 年　断渠之盟'),'年表含时间+事件名');
ok(last.kept.includes('全局总提示词')&&last.kept.some(k=>k.indexOf('世界书')===0),'kept 列表正确');
ok(last.dropped.length===0,'默认预算下没有丢弃（关键词条目不算丢弃）');
ok(txt.includes('“纠正”')||txt.includes('纠正'),'架空条目的强制说明存在');

/* ============ T3 预算裁剪 ============ */
head('T3 注入上限裁剪');
L.budget=400;
const t3=api.loreSystemBlock(); const l3=api.getLast();
ok(l3.used<=l3.budget,'用量不超上限（'+l3.used+' ≤ '+l3.budget+'）');
ok(l3.budget===600,'上限有 600 字下限保护，输入 400 被抬到 600 → '+l3.budget);
ok(l3.kept.includes('全局总提示词'),'超限时「全局总提示词」仍被保留（永不丢弃）');
ok(l3.dropped.length>0,'超限块被记入 dropped → '+l3.dropped.join('、'));
console.log('     kept: '+l3.kept.join('、'));
L.budget=8000;

/* ============ T4 智能细分：规则归类 ============ */
head('T4 规则细分（离线）');
const g1=api.loreGuessCat('地理疆域·北境三国','三国鼎立，以天险山脉为界，边境设九座关城。');
ok(g1.block==='world'&&g1.cat==='geo','地理内容 → world/geo');
const g2=api.loreGuessCat('境界·金丹','金丹境可御物飞行，晋升需凝聚金丹。');
ok(g2.block==='power'&&g2.cat==='realm','境界内容 → power/realm');
const g3=api.loreGuessCat('货币与物价','通用货币为方孔铜钱，一石米约三十文。');
ok(g3.block==='world'&&g3.cat==='economy','经济内容 → world/economy');
const g4=api.loreGuessCat('白鸦之乱','发生于三百年前的一场战争，导致旧王朝灭亡。');
ok(g4.block==='history','历史内容 → history/'+g4.cat);
const g5=api.loreGuessCat('随便写点','x');
ok(g5.low===true,'无主题内容被标 low（提示手动改分类）');

/* ============ T5 细分导入 ============ */
head('T5 细分结果导入');
const before=L.w.length;
const r=api.loreApply([
  {block:'world',cat:'geo',name:'北境',content:'三重山脉屏障。',note:'',real:false},
  {block:'world',cat:'geo',name:'墨砚城',content:'重复名，应跳过',note:'',real:false},
  {block:'power',cat:'realm',name:'金丹',content:'御物飞行。',note:'',real:false},
  {block:'power',cat:'branch',name:'剑修',content:'以剑入道。',note:'',real:false},
  {block:'history',cat:'event',name:'白鸦之乱',content:'旧王朝覆灭。',note:'',real:false},
  {block:'history',cat:'calendar',name:'',content:'一年分十旬。',note:'',real:false},
  {block:'global',cat:'rule',name:'',content:'不得出现现代词汇。',note:'',real:false}
]);
ok(r.nw===1,'world 新增 1 条（同名跳过）→ '+r.nw);
ok(r.skip===1,'同名跳过计数 1 → '+r.skip);
ok(L.w.length===before+1,'世界书条目数正确');
ok(L.pw.realms.some(x=>x.name==='金丹'),'境界条目已入库');
ok(L.pw.branches.some(x=>x.name==='剑修'),'分支条目已入库');
ok(L.hi.events.some(x=>x.name==='白鸦之乱'),'历史事件已入库');
ok(L.hi.cal.includes('一年分十旬'),'纪年文本已并入');
ok(L.gl.extra.includes('不得出现现代词汇'),'全局规则已并入补充约束');

/* ============ T6 时间轴排序 ============ */
head('T6 按时间自动排序');
L.hi.events.length=0;
[['丙','苍历 500 年'],['甲','苍历 100 年'],['乙','时间未定'],['丁','苍历 300 年']].forEach(([n,t])=>{
  L.hi.events.push({id:'e'+n,name:n,time:t,desc:'d'+n,effect:'',note:'',real:false,enabled:true});
});
api.loreTimeSort();
const order=L.hi.events.map(e=>e.name).join('');
ok(L.hi.events[0].name==='甲'&&L.hi.events[1].name==='丁'&&L.hi.events[2].name==='丙','带数字的按 100<300<500 升序排在前面 → '+order);
ok(L.hi.events[3].name==='乙','时间未定的排在最后（可手动调整）');

/* ============ T7 粘贴文本切分 ============ */
head('T7 粘贴文本切分');
const chunks=api.loreSplitRawText('第一条设定\n内容内容\n\n第二条设定\n内容\n\n\n第三条');
ok(chunks.length===3,'空行分隔 → '+chunks.length+' 条');
ok(chunks[0].name==='第一条设定','条目名取首行');
const long='长'.repeat(1500);
const chunks2=api.loreSplitRawText(long);
ok(chunks2.length>=2,'超长块被自动切开 → '+chunks2.length);

/* ============ T8 导入合并去重 ============ */
head('T8 设定库文件合并');
const snap=JSON.parse(JSON.stringify(state.lore));
api.loreMergeInto(snap);
const wCount=L.w.filter(x=>x.name==='墨砚城').length;
ok(wCount===1,'重复导入同名条目不会重复 → '+wCount+' 份');
api.loreMergeInto({cats:[{id:'mycat',name:'我的分类',hint:'自定义'}],w:[
  {name:'新分类条目',cat:'mycat',content:'内容',real:true,enabled:true}]});
ok(L.cats.some(c=>c.id==='mycat'),'新分类被并入');
ok(L.w.some(x=>x.name==='新分类条目'&&x.cat==='mycat'),'自定义分类条目归位正确');

/* ============ T9 存档往返 ============ */
head('T9 存档 / 读档往返');
const round=JSON.parse(JSON.stringify(state.lore));
const st2={lore:round};
state.lore=null; api.ensureLore();
const keep=state.lore; state.lore=round; api.ensureLore();
ok(state.lore.cats.some(c=>c.id==='mycat'),'JSON 往返后自定义分类仍在');
ok(state.lore.w.some(x=>x.name==='墨砚城'),'JSON 往返后条目仍在');
ok(state.lore.pw.realms.length>=3,'JSON 往返后境界仍在');
state.lore={w:'坏数据',cats:[]}; api.ensureLore();
ok(Array.isArray(state.lore.w)&&state.lore.cats.length===14,'坏数据被自动修复成默认结构');

/* ============ T10 计数 ============ */
head('T10 计数');
const c=api.loreCount();
ok(typeof c.w==='number'&&typeof c.pw==='number'&&typeof c.hi==='number'&&typeof c.gl==='number','四块计数都返回数字 → '+JSON.stringify(c));

console.log('\n================ 结果：'+pass+' 通过 / '+fail+' 失败 ================');
process.exit(fail?1:0);
