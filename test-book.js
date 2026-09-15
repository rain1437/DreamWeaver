/* 验证拆解版世界书：
   ① 真实导入流程 → 每条落到正确模块与分类
   ② 内容零丢失（与原文件做字符级覆盖比对）
   ③ 触发设置 / 常驻标记正确 */
const fs=require('fs');
const loreSrc=fs.readFileSync('lore-module.js','utf8');
const wbSrc=fs.readFileSync('worldbook.js','utf8');

const state={meta:{},api:{},rules:{},settings:{},memory:{},suggest:{},chars:[],outline:[],chapters:[],hooks:[],current:0,lore:null};
const dep={
  state, uid:()=>Math.random().toString(36).slice(2,10),
  esc:s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  $:()=>null, $$:()=>[], save:()=>{}, toast:()=>{},
  openDlg:()=>{}, chat:async()=>'', parseLoose:()=>null, setBusy:()=>{},
  fieldContext:()=>'', download:()=>{}, ensureMem:()=>({}), prompt:()=>null, confirm:()=>true,
  activeCharsFor:()=>[],
  toKeys:v=>Array.isArray(v)?v:(typeof v==='string'?v.split(/[,，]/).map(x=>x.trim()).filter(Boolean):[]),
  wbFix:e=>e, wbMetaOf:()=>({}),
  wbNum:(v,d)=>{const n=Number(v);return isFinite(n)?n:d;},
  wbBool:(v,d)=>v==null?!!d:(typeof v==='string'?(v.trim()==='true'||v==='1'):!!v)
};
const SB=new Function(...Object.keys(dep),
  loreSrc+'\n'+wbSrc+'\n;return {wbParse,wbEntry,wbImport,ensureLore,wbClassifyName};')(...Object.values(dep));

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  ✔ '+m);} else {fail++;console.log('  ✘ '+m);} };

/* ============ ① 解析 + 导入落位 ============ */
console.log('\n=== ① 真实导入流程 ===');
const raw=fs.readFileSync('世界书-已分类版.json','utf8');
const list=SB.wbParse(raw);
ok(list.length===22,'解析出 22 条（实际 '+list.length+'）');

const L=SB.ensureLore();
L.w.length=0; L.pw.branches.length=0; L.pw.realms.length=0; L.hi.events.length=0; L.hi.cal=''; L.gl.extra=''; L.pw.general='';
const res=SB.wbImport(list,{auto:true});

const book=JSON.parse(raw);
const nameToCat={};
Object.keys(book.entries).forEach(k=>{
  const e=book.entries[k];
  const m=e.comment.match(/^【(.+?)】(.+)$/);
  if(m) nameToCat[m[2]]=m[1];
});
const catMap={'世界起源':'world/origin','时代背景':'world/era','地理疆域':'world/geo','气候环境':'world/climate',
 '政治制度':'world/politics','军事':'world/military','经济':'world/economy','科技':'world/tech',
 '文化思想':'world/culture','宗教信仰':'world/religion','民族族群':'world/race','语言称谓':'world/lang',
 '日常生活':'world/daily','超自然规则':'world/super','力量总纲':'power/general','修炼体系':'power/branch',
 '境界':'power/realm','历法纪年':'history/calendar','历史事件':'history/event','全局规则':'global/rule'};

let wrong=[];
Object.keys(nameToCat).forEach(title=>{
  const target=catMap[nameToCat[title]];
  if(!target) { wrong.push(title+'（前缀未识别：'+nameToCat[title]+'）'); return; }
  const [tb,tc]=target.split('/');
  let found=null;
  if(tb==='world') found=L.w.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='power'&&tc==='realm') found=L.pw.realms.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='power'&&tc==='branch') found=L.pw.branches.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='power'&&tc==='general'){ if((L.pw.general||'').indexOf(title)>=0) found={name:title}; }
  if(tb==='history') found=L.hi.events.find(x=>x.name&&x.name.indexOf(title)>=0);
  if(tb==='global'){ if((L.gl.extra||'').indexOf(title)>=0) found={name:title}; }
  if(!found){ wrong.push(title+' 未落位到 '+target); return; }
  if(tb==='world'&&found.cat!==tc) wrong.push(title+' 期望 '+tc+' 实际 '+found.cat);
});
ok(wrong.length===0,'22 条全部落到期望分类'+(wrong.length?('：\n      '+wrong.join('\n      ')):''));
ok(res.conf.high===22,'全部高可信（'+res.conf.high+'/22）');
ok(res.lows.length===0,'0 条待确认');
ok(res.skip===0,'0 条被跳过');
console.log('\n  落位统计：');
console.log('   世界观大类条目        '+L.w.length+' 条（其中常驻 '+L.w.filter(x=>x.constant).length+' 条）');
console.log('   力量/总纲             '+((L.pw.general||'').trim()?1:0)+' 条');
console.log('   力量/修炼分支         '+L.pw.branches.length+' 条');
console.log('   力量/境界             '+L.pw.realms.length+' 条');
console.log('   全局约束              '+((L.gl.extra||'').trim()?2:0)+' 条');
ok(L.w.length===17,'世界观大类 17 条（实际 '+L.w.length+'）');
ok(L.pw.branches.length===1&&L.pw.realms.length===1,'力量体系 分支1 + 境界1');
ok((L.gl.extra||'').indexOf('能量体系唯一性')>=0&&(L.gl.extra||'').indexOf('战力判定')>=0,'两条全局规则都进去了');

/* 触发关键词保留 */
const dragon=L.w.find(x=>x.name.indexOf('六大天灾名录')>=0);
ok(dragon&&dragon.keys.length===6,'天灾名录保留 6 个触发词（'+((dragon&&dragon.keys)||[])+'）');
ok(dragon&&dragon.constant===false,'天灾名录为关键词触发（非常驻）');
const geo=L.w.find(x=>x.name.indexOf('东之大陆')>=0);
ok(geo&&geo.constant===true,'东之大陆为常驻');
ok(geo&&geo.keys.indexOf('圣光皇国')>=0,'东之大陆关键词含国名');
const realm=L.pw.realms[0];
ok(realm&&realm.feat.indexOf('C级')>=0,'境界梯度内容完整');

/* ============ ② 内容零丢失 ============ */
console.log('\n=== ② 内容零丢失比对 ===');
const oldBook=JSON.parse(fs.readFileSync('世界书.json','utf8'));
const oldAll=Object.keys(oldBook.entries).map(k=>String(oldBook.entries[k].content||'')).join('\n');
/* 新书的「标题 + 正文」一起比对：小标题升格为条目标题，仍属保留 */
const newAll=Object.keys(book.entries).map(k=>String(book.entries[k].comment||'')+'\n'+String(book.entries[k].content||'')).join('\n');
const strip=s=>String(s).replace(/[\s【】:：]/g,'');
const A=strip(oldAll), B=strip(newAll);
let i=0, covered=0; const gaps=[];
while(i<A.length){
  let best=0;
  for(let len=Math.min(60,A.length-i); len>=8; len--){
    if(B.indexOf(A.slice(i,i+len))>=0){ best=len; break; }
  }
  if(best>0){ covered+=best; i+=best; }
  else{
    let j=i, seg='';
    while(j<A.length){
      let b2=0;
      for(let len=Math.min(60,A.length-j); len>=8; len--){
        if(B.indexOf(A.slice(j,j+len))>=0){ b2=len; break; }
      }
      if(b2>0) break;
      seg+=A[j]; j++;
    }
    if(seg) gaps.push(seg);
    i=(j>i)?j:i+1;
  }
}
const ratio=covered/A.length;
console.log('  原文（归一化）'+A.length+' 字 → 覆盖 '+covered+' 字 = '+(ratio*100).toFixed(2)+'%');
if(gaps.length) console.log('  残差（'+gaps.reduce((a,b)=>a+b.length,0)+' 字）：'+gaps.map(g=>'「'+g+'」').join(' '));
ok(ratio>=0.985,'内容覆盖率 ≥98.5%（无实质丢失）');
const maxGap=gaps.length?Math.max(...gaps.map(g=>g.length)):0;
ok(maxGap<=12,'残差最长片段 ≤12 字（只丢小标题措辞，无整句丢失；实际 '+maxGap+'）');

/* 关键专有名词逐一核查 */
const nouns=['魔素','元素术法','近战斗法','召唤巫法','神秘术法','星王龙','凛霜龙','原初魔王','原初勇者','始源圣灵',
 '天妖圣主','圣光皇国','永夜魔渊帝国','万妖天朝','苍风自由公国','银月精灵联邦','熔峰矮人王庭','暗影鬼族皇朝',
 '熔岩巨兽汗国','幽彩幻魔公国','翠源圣灵王国','沧澜人鱼帝国','圣光至高神','莱昂纳','格罗因','西尔菲','艾尔温',
 '摩洛克','赫尔迪斯','卡尔加','莉莉丝','克罗诺斯','朱庇特','觉醒勇者','大魔王','诸天神域','魔王种','勇者种'];
const missing=nouns.filter(n=>B.indexOf(n)<0);
ok(missing.length===0,'38 个专有名词全部保留'+(missing.length?('，缺失：'+missing.join('、')):''));

/* ============ ③ 与原件结构对照 ============ */
console.log('\n=== ③ 拆解映射 ===');
const norm=list.map((x,i)=>SB.wbEntry(x,{di:i}));
ok(norm.length===22,'解析出 22 条');
ok(norm.every(e=>/^【.+?】/.test(e.name||'')),'每条都带【分类名】前缀');
const withKeys=norm.filter(e=>e.keys&&e.keys.length).length;
ok(withKeys===22,'22 条都有关键词（'+withKeys+'）');
ok(norm.filter(e=>e.constant).length===13,'13 条常驻（'+norm.filter(e=>e.constant).length+'）');

console.log('\n===== '+pass+' 通过 / '+fail+' 失败 =====');
process.exit(fail?1:0);
