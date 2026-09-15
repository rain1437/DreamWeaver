/* 验证：示例世界书 → 真实导入流程 → 每条落到正确分类 */
const fs=require('fs');
const loreSrc=fs.readFileSync('lore-module.js','utf8');
const wbSrc=fs.readFileSync('worldbook.js','utf8');

let store={};
const state={meta:{title:'示例验证'},api:{},rules:{},settings:{},memory:{},suggest:{},chars:[],outline:[],chapters:[],hooks:[],current:0,lore:null};
const dep={
  state, uid:()=>Math.random().toString(36).slice(2,10),
  esc:s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  $:()=>null, $$:()=>[], save:()=>{}, toast:()=>{},
  openDlg:()=>{}, chat:async()=>'', parseLoose:()=>null, setBusy:()=>{},
  fieldContext:()=>'', download:()=>{}, ensureMem:()=>({}), prompt:()=>null, confirm:()=>true,
  activeCharsFor:()=>[], toKeys:v=>Array.isArray(v)?v:(typeof v==='string'?v.split(/[,，]/).map(x=>x.trim()).filter(Boolean):[]), wbFix:e=>e, wbNum:(v,d)=>{const n=Number(v);return isFinite(n)?n:d;},
  wbBool:(v,d)=>v==null?!!d:(typeof v==='string'?(v.trim()==='true'||v==='1'):!!v),
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  renderLore:()=>{}, buildPrompt:()=>'', loreSystemBlock:()=>''
};
const sandbox=new Function(...Object.keys(dep),
  loreSrc+'\n'+wbSrc+'\n;return {wbParse,wbImport,ensureLore,wbClassifyName,wbEntry};')(...Object.values(dep));

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  ✔ '+m);} else {fail++;console.log('  ✘ '+m);} };

console.log('\n=== 示例世界书导入验证 ===');
const raw=fs.readFileSync('示例世界书-墨砚.json','utf8');
const list=sandbox.wbParse(raw);
ok(list.length===48,'解析出 48 条（实际 '+list.length+'）');

const L=sandbox.ensureLore();
L.w.length=0; L.pw.branches.length=0; L.pw.realms.length=0; L.hi.events.length=0; L.hi.cal=''; L.gl.extra='';
const res=sandbox.wbImport(list,{auto:true});

/* 逐条对照：JSON 里写的分类 vs 导入后实际落点 */
const book=JSON.parse(raw);
const want={};
Object.keys(book.entries).forEach(k=>{
  const e=book.entries[k];
  const m=e.comment.match(/^【(.+?)】(.+)$/);
  want[m[2]]=m[1];
});
/* 从命名反推期望分类 */
const nameToCat={
  '世界起源':'world/origin','时代背景':'world/era','地理疆域':'world/geo','气候环境':'world/climate',
  '政治制度':'world/politics','军事':'world/military','经济':'world/economy','科技':'world/tech',
  '文化思想':'world/culture','宗教信仰':'world/religion','民族族群':'world/race','语言称谓':'world/lang',
  '日常生活':'world/daily','超自然规则':'world/super',
  '力量总纲':'power/general','修炼体系':'power/branch','境界':'power/realm',
  '历法纪年':'history/calendar','历史事件':'history/event','全局规则':'global/rule'
};
let wrong=[];
Object.keys(want).forEach(title=>{
  const pfx=want[title], target=nameToCat[pfx];
  if(!target) return;
  const [tb,tc]=target.split('/');
  let found=null;
  if(tb==='world') found=L.w.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='power'&&tc==='realm') found=L.pw.realms.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='power'&&tc==='branch') found=L.pw.branches.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='history') found=L.hi.events.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='global') found=L.gl.extra.indexOf(title)>=0?{name:title}:null;
  if(tb==='power'&&tc==='general'){ if(L.pw.general.indexOf(title)>=0) found={name:title}; }
  if(tb==='history'&&tc==='calendar'){ if(L.hi.cal.indexOf(title)>=0) found={name:title}; }
  if(!found){ wrong.push(title+'（未落位到 '+target+'）'); return; }
  if(tb==='world'&&found.cat!==tc) wrong.push(title+'（期望 '+tc+' 实际 '+found.cat+'）');
});
ok(wrong.length===0,'48 条全部落到期望分类'+(wrong.length?('，异常：'+wrong.join('；')):''));

/* 统计各块条数 */
console.log('\n  落位统计：');
console.log('   世界观大类  '+L.w.length+' 条');
console.log('   力量/境界   '+L.pw.realms.length+' 条');
console.log('   力量/分支   '+L.pw.branches.length+' 条');
console.log('   力量/总纲   '+((L.pw.general||'').trim()?2:0)+' 条');
console.log('   历史/事件   '+L.hi.events.length+' 条');
console.log('   历史/历法   '+((L.hi.cal||'').trim()?1:0)+' 条');
console.log('   全局约束    '+((L.gl.extra||'').trim()?2:0)+' 条');
console.log('   合计        '+(L.w.length+L.pw.realms.length+L.pw.branches.length+L.hi.events.length+((L.gl.extra||'').trim()?2:0)+((L.pw.general||'').trim()?2:0)+((L.hi.cal||'').trim()?1:0)));

/* 触发设置是否保留 */
const geo=L.w.find(x=>x.name.indexOf('中州大陆')>=0);
ok(geo&&geo.keys&&geo.keys[0]==='中州','关键词触发保留（keys='+(geo&&geo.keys)+'）');
const cons=L.w.find(x=>x.name.indexOf('末法之世')>=0);
ok(cons&&cons.constant===true,'常驻标记保留');
ok(res.conf.high>=46,'高可信 ≥46 条（实际 '+res.conf.high+'）');
ok(res.lows.length<=2,'待确认 ≤2 条（实际 '+res.lows.length+'）');
ok(Object.keys(res.dist).length>=18,'覆盖 ≥18 个分类（实际 '+Object.keys(res.dist).length+'）');

/* 境界字段完整性 */
const jd=L.pw.realms.find(x=>x.name.indexOf('金丹')>=0);
ok(jd&&jd.feat&&jd.feat.indexOf('能力上限')>=0,'境界条目内容完整（含能力上限/特征/晋升条件/弱点）');
/* 历史时间 */
const ev=L.hi.events.find(x=>x.name.indexOf('白鸦')>=0);
ok(ev&&ev.desc.indexOf('苍历 310')>=0,'历史事件内容完整');

console.log('\n===== '+pass+' 通过 / '+fail+' 失败 =====');
process.exit(fail?1:0);
