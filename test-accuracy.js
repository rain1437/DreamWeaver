/* 分类准确度压力测试：真实世界书常见的各种命名风格 */
const fs=require('fs');
const loreSrc=fs.readFileSync('lore-module.js','utf8');
const state={meta:{},api:{},rules:{},settings:{},memory:{},suggest:{},chars:[],outline:[],chapters:[],hooks:[],current:0};
const dep={
  state, uid:()=>Math.random().toString(36).slice(2,10),
  esc:s=>String(s==null?'':s), $:()=>null, $$:()=>[], save:()=>{}, toast:()=>{},
  openDlg:()=>{}, chat:async()=>'', parseLoose:()=>null, setBusy:()=>{},
  fieldContext:()=>'', download:()=>{}, ensureMem:()=>({}), prompt:()=>null, confirm:()=>true,
  activeCharsFor:()=>[], toKeys:v=>Array.isArray(v)?v:[], wbFix:e=>e,
  wbMetaOf:()=>({}), wbNum:(v,d)=>{const n=Number(v);return isFinite(n)?n:d;}, wbBool:(v,d)=>v==null?!!d:!!v
};
const api=new Function(...Object.keys(dep),
  loreSrc+'\n;return {loreGuessCat};')(...Object.values(dep));

/* block+cat 判定正确即算对；power/history/global 额外看块 */
const CASES=[
  ['天枢阁','以情报为生的组织，掌门人称阁主，门下四堂。','world','politics'],
  ['黑水山脉','横贯大陆的天然屏障，北侧极寒，南侧多雨。','world','geo'],
  ['大梁王朝官制','设三省六部，御史台掌监察，地方设州郡县三级。','world','politics'],
  ['玄鸟衔印','传说世界诞生于玄鸟衔印之年，此为苍历纪元之始。','world','origin'],
  ['灵脉','地脉中流动的能量，凡人不可直视，修士可引以为用。','world','super'],
  ['淬体境界','肉身坚韧如铁，但无法动用任何术法。','power','realm'],
  ['太虚剑典','剑修至高功法，练成后剑气可斩虚空。','power','branch'],
  ['一石米的价格','寻常年景下一石米约三十文钱，荒年可涨至百文。','world','economy'],
  ['禁军三营','铁甲营、弓弩营、斥候营，各自听命于不同将领。','world','military'],
  ['七神信仰','天地间共有七位神明，主神司命掌生死簿。','world','religion'],
  ['龙族','鳞化于背，寿数逾千年，不与外族通婚。','world','race'],
  ['雅言与俗语','官方通行雅言，各地另有方言，贵族互称“阁下”。','world','lang'],
  ['平民的一日','卯时起，食粟米饭，日中劳作，戌时宵禁。','world','daily'],
  ['黑风期','每年秋末黑风过境三日，牲畜不进棚。','world','climate'],
  ['水力锻锤','已能借水力锻打铁器，火药尚未出现。','world','tech'],
  ['清谈之风','文人以清谈为雅，忌直言时政，岁末祭祖。','world','culture'],
  ['末法之世','灵气渐枯，诸国纷争，修士数量锐减。','world','era'],
  ['世界树的传说','世界最初是一棵树，树倒而万物生。','world','origin'],
  ['历法：一年十旬','一年分十旬，每旬三十六日，以印为元。','history','calendar'],
  ['断渠之盟','苍历二百三十七年三家立誓分渠，此后水系归属有据可依。','history','event'],
  ['战力崩坏禁令','写文不得出现战力崩坏，角色实力须落在其境界上限内。','global','rule'],
  ['基础力量总纲','力量本质是改写他人记忆中的因果，每次施展必遭反噬。','power','general'],
  ['术法代价','所有术法需以寿命支付，且必须有人见证，不可落于纸面。','power','general'],
  ['剑修分支','以剑入道，剑气可斩虚，但需以寿命为代价。','power','branch'],
  ['境界等级','淬体、引气、筑基、金丹、元婴、化神，共六境。','power','realm'],
  ['都城墨砚城','城内分外城与内城，环绕灵渠，北接黑水山脉。','world','geo'],
  ['雪原诸部','北境雪原上有七个游牧部落，不与中原通商。','world','race'],
  ['货币体系','方孔铜钱为基本单位，一两银兑一千文。','world','economy'],
  ['祭祀仪式','祭天需以血为引，由祭司主持，凡人不得旁观。','world','religion'],
  ['气候与季节','四季分明，冬季极寒，夏季多雨，秋末有黑风。','world','climate'],
  ['民间习俗','重孝道，岁末祭祖，婚嫁需三媒六聘。','world','culture'],
  ['官阶与爵位','官员分九品，爵位分公侯伯子男五等，世袭三代。','world','politics'],
  ['结丹之法','需在生死之间完成一次自我否定，金丹方凝。','power','realm'],
  ['航海与船坞','南疆临海，以楼船为主，渡海需择季风。','world','geo'],
  ['军规十二条','不得私斗、不得扰民、败退者斩。','world','military'],
  ['日常饮食','平民食粟米与腌菜，肉食一月不过三次。','world','daily'],
  ['禁忌与铁律','严禁提及旧王朝年号，违者黥面。','global','rule'],
  ['白鸦之乱始末','苍历三百一十年叛乱，旧王朝由此覆灭。','history','event'],
  ['古神与邪祟','古神已沉睡，邪祟由怨念而生，惧铜镜。','world','super'],
  ['称谓与敬语','对贵族称“大人”，对修士称“真君”。','world','lang']
];
let ok=0, wrong=[];
CASES.forEach(([name,content,eb,ec])=>{
  const g=api.loreGuessCat(name,content);
  const hitBlock=g.block===eb&&g.cat===ec;
  const hitBlockOnly=g.block===eb;
  if(hitBlock) ok++;
  else if(hitBlockOnly) wrong.push({name,eb,ec,gb:g.block,gc:g.cat,level:'块对类错',conf:g.conf});
  else wrong.push({name,eb,ec,gb:g.block,gc:g.cat,level:'块也错',conf:g.conf});
});
console.log('总用例 '+CASES.length+' 条');
console.log('完全正确 '+ok+' 条（'+(ok/CASES.length*100).toFixed(1)+'%）');
console.log('块正确率 '+CASES.filter(([n,c])=>{const g=api.loreGuessCat(n,c);return g.block===CASES.find(x=>x[0]===n)[2];}).length+' 条');
if(wrong.length){
  console.log('\n未完全命中的用例：');
  wrong.forEach(w=>console.log('  ['+w.level+'] '+w.name+'  期望 '+w.eb+'/'+w.ec+' → 实际 '+w.gb+'/'+w.gc+' ('+w.conf+')'));
}
/* 高/中/低置信度分布 */
const dist={high:0,mid:0,low:0};
CASES.forEach(([n,c])=>{ const g=api.loreGuessCat(n,c); dist[g.conf]=(dist[g.conf]||0)+1; });
console.log('\n置信度分布: 高 '+dist.high+' / 中 '+dist.mid+' / 待确认 '+dist.low);
/* 待确认的条目应当真的是「看不出主题」的那类 */
const lowNames=CASES.filter(([n,c])=>api.loreGuessCat(n,c).conf==='low').map(x=>x[0]);
console.log('待确认条目：'+(lowNames.length?lowNames.join('、'):'无'));
