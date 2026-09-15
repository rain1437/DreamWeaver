/* 世界书自动分类：准确度与跨块搬运测试 */
const fs=require('fs');
const loreSrc=fs.readFileSync('lore-module.js','utf8');
const wbSrc=fs.readFileSync('worldbook.js','utf8');

let store={};
const state={meta:{title:'分类测试'},api:{},rules:{},settings:{},memory:{},suggest:{},chars:[],outline:[],chapters:[],hooks:[],current:0};
const dep={
  state,
  uid:()=>Math.random().toString(36).slice(2,10),
  esc:s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  $:()=>null, $$:()=>[],
  save:()=>{}, toast:()=>{},
  openDlg:()=>{}, chat:async()=>'', parseLoose:()=>null, setBusy:()=>{},
  fieldContext:()=>'', download:()=>{}, ensureMem:()=>({}),
  prompt:()=>null, confirm:()=>true,
  activeCharsFor:()=>[], toKeys:v=>Array.isArray(v)?v:(typeof v==='string'?v.split(/[,，]/).map(x=>x.trim()).filter(Boolean):[]),
  wbFix:e=>e, wbMetaOf:r=>(r&&r.extensions&&r.extensions.moYan)||{}, wbNum:(v,d)=>{const n=Number(v);return isFinite(n)?n:d;},
  wbBool:(v,d)=>v==null?!!d:(typeof v==='string'?(v.trim()==='true'||v==='1'):!!v)
};
const api=new Function(...Object.keys(dep),
  loreSrc+'\n;return {loreGuessCat,loreTitlePrefix,loreCatLabel,loreRelocate,loreFindAny,loreAllEntries,lorePlainText,'+
  'blankLore,ensureLore,loreApply,setState:s=>{state=s;}};')(...Object.values(dep));

let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  ✔ '+m);} else {fail++;console.log('  ✘ '+m);} }
function head(t){ console.log('\n=== '+t+' ==='); }
const L=api.ensureLore();

/* ============ T1 真实世界书条目：应当分对 ============ */
head('T1 典型条目自动分类（16 组）');
const CASES=[
  ['【地理】北境三国','天险山脉为界，边境设九座关城，北接雪原。','world','geo'],
  ['地理格局','大陆分为东西两半，中间是横贯的黑水山脉，南面是群岛海域。','world','geo'],
  ['疆域与城邦','共有十七座城邦，以墨砚城为首，各城以灵渠相连。','world','geo'],
  ['【军事】兵种编制','禁军分三营：铁甲营、弓弩营、斥候营。军规：不得私斗。','world','military'],
  ['军备与战争规则','各国交战不得屠城，俘虏可赎。骑兵为主力，城防以弩炮为主。','world','military'],
  ['政治制度·朝堂','设三省六部，皇权受御史台节制。贵族分九等，平民不得为官。','world','politics'],
  ['势力：天枢阁','天枢阁掌控天下情报，与皇族共治，门下分四堂。','world','politics'],
  ['货币与物价','通用方孔铜钱，一石米约三十文，一两银兑一千文。','world','economy'],
  ['物产与商路','北境产铁与寒玉，南疆产茶，商队经三关入中原。','world','economy'],
  ['宗教信仰体系','天地之间共有七神，主神为司命。教派分三支，祭祀需以血为引。','world','religion'],
  ['种族的血脉特征','龙族血脉者鳞化于背，精灵不与外族通婚，兽人分三支。','world','race'],
  ['语言与称谓','通用语为雅言，皇族自称“孤”，民间互称“某兄”。','world','lang'],
  ['日常生活·衣食住行','平民食粟米饭，着麻布短衣，行路靠驴车，夜宿驿舍。','world','daily'],
  ['气候与环境异象','每年秋末必有黑风过境，持续三日。四季分明，冬季极寒。','world','climate'],
  ['超自然规则','灵气源于地脉，凡人不可直视。鬼物惧墨汁与铜镜。','world','super'],
  ['科技与生产力','已能铸造水力锻锤，纸与活字皆备，但火药未现。','world','tech'],
  ['文化思想与习俗','民间重孝，岁末祭祖。文人推崇清谈，忌直言。','world','culture'],
  ['世界起源·创世神话','世界诞生于一枚墨印，印裂而天地分。','world','origin'],
  ['时代背景','当前处于末法之世，灵气渐枯，诸国纷争。','world','era'],
  ['境界·金丹','金丹境可御物飞行，晋升需凝聚金丹，弱点为金丹未固时不可久战。','power','realm'],
  ['境界等级体系','淬体→引气→筑基→金丹→元婴→化神，共六境。','power','realm'],
  ['修炼体系·剑修','剑修以剑入道，剑气可斩虚，但需以寿命为代价。','power','branch'],
  ['力量体系总纲','力量本质是改写他人记忆中的因果，每次施展必遭反噬。','power','general'],
  ['历史年表','苍历元年墨砚立城，二百三十七年断渠之盟，五百一十年旧王朝覆灭。','history','event'],
  ['白鸦之乱','发生于苍历三百一十年前的一场叛乱，导致旧王朝灭亡。','history','event'],
  ['历法与纪年','以玄鸟衔印之年为元年，一年分十旬，每旬三十六日。','history','calendar'],
  ['全局规则铁律','写文不得出现战力崩坏；角色性格不能 OOC。','global','rule']
];
CASES.forEach(([name,content,eb,ec])=>{
  const g=api.loreGuessCat(name,content);
  ok(g.block===eb&&g.cat===ec, name+'  → '+eb+'/'+ec+'  （实际 '+g.block+'/'+g.cat+' · '+g.conf+' · '+g.why+'）');
});

/* ============ T2 置信度分级 ============ */
head('T2 置信度分级合理');
const c1=api.loreGuessCat('【地理】北境','x');
ok(c1.conf==='high','标题带【地理】提示 → 高可信');
const c2=api.loreGuessCat('地理格局','大陆与海洋的分布，山脉纵横，城邦众多。');
ok(c2.conf==='high','明确标题+正文 → 高可信');
const c3=api.loreGuessCat('天枢阁','一个以情报为生的组织，门下分四堂，与皇族共治。');
ok(c3.conf!=='high','只有名字看不出主题 → 不是高可信（交 AI 复核）');
const c4=api.loreGuessCat('随便写点','x');
ok(c4.low===true,'无主题内容 → 待确认');

/* ============ T3 标题提示解析 ============ */
head('T3 标题分类提示解析');
ok(api.loreTitlePrefix('【地理】北境')==='地理','解析【】提示');
ok(api.loreTitlePrefix('境界·金丹')==='境界','解析·提示');
ok(api.loreTitlePrefix('军事 - 兵种')==='军事','解析 - 提示');
ok(api.loreTitlePrefix('宗教：七神')==='宗教','解析：提示');
ok(api.loreTitlePrefix('北境三国')==='','无提示词时返回空');

/* ============ T4 跨块搬运 ============ */
head('T4 分类结果真正落到四大块（跨块搬运）');
const L2=api.ensureLore();
L2.w.length=0; L2.pw.branches.length=0; L2.pw.realms.length=0; L2.hi.events.length=0; L2.hi.cal=''; L2.gl.extra='';
L2.w.push({id:'x1',cat:'geo',name:'灵脉境界说明',content:'灵脉分九层，每一层对应一个境界。',note:'备注保留',enabled:true,constant:true,keys:['灵脉'],secondary:[],real:false,_conf:'low'});
const r1=api.loreRelocate('x1','power','realm');
ok(r1===true&&L2.w.length===0&&L2.pw.realms.length===1,'世界观 → 力量/境界：搬过去了');
ok(L2.pw.realms[0].feat.indexOf('灵脉分九层')>=0,'境界条目的特征字段带上了原文内容');
ok(L2.pw.realms[0].note==='备注保留','备注随条目一起搬');
const r2=api.loreRelocate('x1','power','branch');
ok(r2===true&&L2.pw.branches.length===1&&L2.pw.realms.length===0,'力量/境界 → 力量/分支：继续搬');
ok(L2.pw.branches[0].keys&&L2.pw.branches[0].keys[0]==='灵脉','世界书触发关键词在搬运中保留');
const r3=api.loreRelocate('x1','world','geo');
ok(r3===true&&L2.w.length===1&&L2.pw.branches.length===0,'力量/分支 → 世界观/地理：搬回来');
ok(L2.w[0].note==='备注保留'&&L2.w[0].keys[0]==='灵脉','搬回后备注与关键词仍在');
const r4=api.loreRelocate('x1','world','geo');
ok(r4===false,'目标分类相同 → 不做无意义搬运');
const r5=api.loreRelocate('x1','world','military');
ok(r5===true&&L2.w[0].cat==='military','同块内换分类 → 直接改分类');

/* ============ T5 历史事件搬运保留时间字段 ============ */
head('T5 历史事件搬运');
L2.hi.events.length=0;
L2.hi.events.push({id:'y1',name:'白鸦之乱',time:'苍历 310 年',desc:'旧王朝覆灭。',effect:'此后百年无中枢。',note:'',enabled:true});
const rj=api.loreRelocate('y1','world','geo');
ok(rj===true&&L2.w.some(x=>x.name==='白鸦之乱'),'历史事件 → 世界观：搬过去了');
const back=L2.w.find(x=>x.name==='白鸦之乱');
ok(back.content.indexOf('苍历 310 年')>=0&&back.content.indexOf('长远影响')>=0,'搬运时把时间/影响拼回正文，信息不丢');
const rk=api.loreRelocate('y1','history','event');
ok(rk===true&&L2.hi.events.length===1,'再搬回历史年表');
ok(L2.hi.events[0].desc.indexOf('旧王朝覆灭')>=0,'事件简述保留');

/* ============ T6 同名保护 ============ */
head('T6 目标已有同名条目 → 跳过而不是覆盖');
api.ensureLore();
const L3=api.ensureLore();
L3.w.push({id:'d1',cat:'geo',name:'重名条目',content:'A',note:'',enabled:true,keys:[]});
L3.pw.branches.push({id:'d2',name:'重名条目',content:'B',note:'',enabled:true});
const rd=api.loreRelocate('d1','power','branch');
ok(rd==='dup','目标分类同名 → 返回 dup，不覆盖');
ok(L3.w.some(x=>x.id==='d1')&&L3.pw.branches.length===1,'原条目还在，数据没被动');

console.log('\n================ 结果：'+pass+' 通过 / '+fail+' 失败 ================');
process.exit(fail?1:0);
