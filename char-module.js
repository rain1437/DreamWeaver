/* =========================================================
   角色卡（SillyTavern V1 / V2 / V3 兼容）· 人物细分版
   ---------------------------------------------------------
   设计要点：
   ① 卡片列表：一格一张卡，点开进入「人物档案」细分编辑
   ② 细分模块：基础档案 / 外貌形象 / 性格心理 / 说话风格 / 身世经历 /
              能力特长 / 人物关系 / 目标动机 / 专属约束
   ③ 本工具写的是小说、不是对话，因此：
      · 导入时自动清除 {{user}} / {user} / <USER> 一类占位符
      · first_mes / alternate_greetings（开场问候语）直接丢弃，不占上下文
      · 导出时仍写回标准 SillyTavern V2 格式，互通不受影响
   ④ 结构信息放在 extensions.moYan，导出再导入可无损还原细分字段
   ========================================================= */
const CH_AI_SYS='你是一位资深的小说人物设定师。你直接输出可用的成品设定文本，'
  +'不解释、不客套、不加 markdown 标题标记、不用第一人称。'
  +'所有产出必须与作者已有的人物设定和世界观相容，不得推翻既有人设，不得引入矛盾的新设定。'
  +'注意：这是长篇小说人物，不是对话机器人；不要写 {{user}}、{{char}} 这类占位符，'
  +'一律用具体称呼（角色名或「主角」）。';
const CH_AI_TASK={
  expand:'扩写：保留原有全部信息与人设倾向，把内容写得更具体、更可用——补上细节、动机、具体例子。长度约为原文的 1.6-2 倍。',
  polish:'润色：原意与信息量完全不变，只把语言改得更准确、凝练、有画面感，删掉空话与重复。长度与原文相当。',
  rewrite:'重写：换一个角度重新组织同一份人设，信息量不少于原文，措辞与结构明显不同，但不得改变任何既定事实。'
};
const CH_MODE_NAME={expand:'扩写',polish:'润色',rewrite:'重写'};

/* ---------------- 角色叙事地位（9 级） -------------
   判定只看【叙事权重】：剧情作用 · 戏份 · 成长弧光 · 对主线的影响。
   与实力、官职、修为、世界观社会地位完全无关——
   世间无敌的大帝可以是「功能性NPC」，底层乞丐可以是「第一主角」。
   lead1 主角一般由作者自行导入；其余档位可以由「✦ 从正文梳理角色」自动总结。 */
const CAST_TIERS=[
  {id:'lead1',  name:'第一主角',  g:'lead', w:1,
   hint:'故事绝对核心。主线围绕该角色展开，拥有完整成长弧光与大量内心描写，是故事的主要视角载体。'},
  {id:'dual',   name:'对等双主角', g:'lead', w:2,
   hint:'与另一角色同等核心。二者各有独立完整的成长线，叙事权重接近，缺任意一人主线就残缺（双人搭档 / 男女双主）。'},
  {id:'lead2',  name:'第二主角',  g:'lead', w:3,
   hint:'主次双主角模式。有独立故事线，但整体戏份与叙事权重低于第一主角，剧情依附主线主角的行动。'},
  {id:'core',   name:'核心配角',  g:'cast', w:4,
   hint:'能左右主线走向，拥有完整动机与弧光：主要反派、挚爱、宿敌、关键导师。'},
  {id:'support',name:'重要配角',  g:'cast', w:5,
   hint:'多次出场、有人设、推动局部剧情，但不会改变故事整体结局：挚友、阶段性对手、家族重要人物。'},
  {id:'extra',  name:'普通配角',  g:'cast', w:6,
   hint:'拥有姓名，少量出场，服务片段剧情，没有完整成长弧光。'},
  {id:'npc',    name:'功能性NPC', g:'minor',w:7,
   hint:'工具人。只完成单一剧情任务（提供情报、引路、传递消息），几乎没有独立性格。'},
  {id:'bg',     name:'背景路人',  g:'minor',w:8,
   hint:'无名无姓，仅渲染场景氛围，没有独立行为逻辑。'},
  {id:'legend', name:'传说人物',  g:'minor',w:9,
   hint:'从未正面出场，依靠传说、遗物、他人回忆影响故事。'}
];
/* 内置九级（不可删，可改名）；用户可以在任意位置插入自定义档位 */
const CAST_TIER_BUILTIN=CAST_TIERS.map(t=>t.id);
/* 受保护的档位：AI 自动梳理时**一律不得改动**这些卡的地位
   （主角类 + 双主角 + 核心配角 + 重要配角；自定义档位同样受保护） */
const CAST_TIER_LOCK_ID={lead1:1,dual:1,lead2:1,core:1,support:1};
const CAST_CUSTOM_COLORS=['#e0651f','#7c3aed','#0ea5e9','#059669','#b45309','#be185d','#4d7c0f','#0891b2','#9333ea','#c2410c'];
const CAST_TIER_GROUPS=[
  {id:'lead', name:'主线主角',  tiers:['lead1','dual','lead2']},
  {id:'cast', name:'配角群',    tiers:['core','support','extra']},
  {id:'minor',name:'NPC 与路人',tiers:['npc','bg','legend']},
  {id:'custom',name:'自定义档位',tiers:[]}
];
const CAST_TIER_NAME={};  CAST_TIERS.forEach(t=>{ CAST_TIER_NAME[t.id]=t.name; });
const CAST_TIER_ORDER={}; CAST_TIERS.forEach(t=>{ CAST_TIER_ORDER[t.id]=t.w; });
const CAST_TIER_COLOR={lead1:'#f0763c',dual:'#8b5cf6',lead2:'#2f7fd6',core:'#14966e',
  support:'#0e9488',extra:'#5b7285',npc:'#94a3b8',bg:'#c7d3de',legend:'#c79a2e'};
const CAST_TIER_NODE_R={lead1:27,dual:25,lead2:23,core:21,support:18,extra:16,npc:13,bg:11,legend:20};
/* 旧版三档定位（主角 / 重要人物 / NPC）→ 新版九级的迁移别名，v6.0 的老数据不必手工改 */
const CAST_TIER_ALIAS={hero:'lead1',major:'support',lead:'lead1',protagonist:'lead1',villain:'core'};
const CAST_TIER_DEFAULT='support';
/* ---------------- 自定义档位（用户自己定分类） ----------------
   state.cast.custom = [{id,name,hint,after}]   after='' 排最前，'last' 排最后，
   否则排在指定档位之后；顺序一变，权重（1..N）自动重排。
   state.cast.tierNames = {id:新名字}  允许把内置档位改名（只改显示名，id 不变）。 */
function castCustomTiers(){
  try{
    const C=ensureCast();
    if(!Array.isArray(C.custom)) C.custom=[];
    C.custom=C.custom.filter(c=>c&&typeof c==='object'&&c.id&&String(c.name||'').trim());
    C.custom.forEach(c=>{
      c.name=String(c.name).trim().slice(0,12);
      c.hint=String(c.hint==null?'':c.hint).trim().slice(0,200);
      if(typeof c.after!=='string') c.after='last';
    });
    if(!C.tierNames||typeof C.tierNames!=='object'||Array.isArray(C.tierNames)) C.tierNames={};
    return C.custom;
  }catch(e){ return []; }
}
function castTierFindCustom(id){
  try{ return castCustomTiers().some(c=>c.id===id); }catch(e){ return false; }
}
function castTierSeq(){
  const list=CAST_TIERS.map(t=>Object.assign({},t,{custom:false}));
  castCustomTiers().forEach(c=>{
    const o={id:c.id,name:c.name,hint:c.hint,g:'custom',custom:true,after:c.after};
    let at=list.length;
    if(c.after==='') at=0;
    else if(c.after&&c.after!=='last'){ const i=list.findIndex(x=>x.id===c.after); at=(i>=0)?i+1:list.length; }
    list.splice(at,0,o);
  });
  /* 显示名允许作者覆盖（内置也可改名） */
  let over={};
  try{ over=(state.cast&&state.cast.tierNames)||{}; }catch(e){}
  list.forEach((t,i)=>{
    t.w=i+1;
    if(over[t.id]&&String(over[t.id]).trim()) t.name=String(over[t.id]).trim().slice(0,12);
  });
  return list;
}
/* 把自定义档位注册进各张表（包括删除后的残留清理），后续所有查询都能拿到 */
function castTierRebuild(){
  const list=castTierSeq();
  const ids=list.map(t=>t.id);
  Object.keys(CAST_TIER_NAME).forEach(k=>{ if(CAST_TIER_BUILTIN.indexOf(k)<0&&ids.indexOf(k)<0) delete CAST_TIER_NAME[k]; });
  Object.keys(CAST_TIER_ORDER).forEach(k=>{ if(ids.indexOf(k)<0) delete CAST_TIER_ORDER[k]; });
  Object.keys(CAST_TIER_COLOR).forEach(k=>{ if(CAST_TIER_BUILTIN.indexOf(k)<0&&ids.indexOf(k)<0) delete CAST_TIER_COLOR[k]; });
  list.forEach((t,i)=>{
    CAST_TIER_NAME[t.id]=t.name;
    CAST_TIER_ORDER[t.id]=i+1;
    if(t.custom&&!CAST_TIER_COLOR[t.id]) CAST_TIER_COLOR[t.id]=CAST_CUSTOM_COLORS[i%CAST_CUSTOM_COLORS.length];
    if(t.custom) CAST_TIER_NODE_R[t.id]=CAST_TIER_NODE_R[t.id]||16;
  });
  const G=CAST_TIER_GROUPS.find(x=>x.id==='custom');
  if(G) G.tiers=list.filter(t=>t.custom).map(t=>t.id);
  return list;
}
function castTierTotal(){ try{ return castTierRebuild().length; }catch(e){ return CAST_TIERS.length; } }
/* 徽标 class：自定义档位加一个通用样式勾 */
function castTierCls(id){
  const o=castTierObj(id);
  return 'tierbadge '+id+(o&&o.custom?' custom-t':'');
}
function castTierObj(id){ return castTierSeq().find(t=>t.id===castTierNorm(id,''))||null; }
/* 按分组给出全部档位（含自定义），供列表、统计、弹窗使用 */
function castTierGroupsAll(){
  castTierRebuild();
  const list=castTierSeq();
  return CAST_TIER_GROUPS.map(g=>({g,items:list.filter(t=>t.g===g.id)})).filter(x=>x.items.length);
}
function castTierNameOf(id){ const o=castTierObj(id); return o?o.name:''; }
function castTierIsLocked(id){
  const o=castTierObj(id); if(!o) return false;
  return !!CAST_TIER_LOCK_ID[id]||!!o.custom;
}
/* 这张卡的地位是否禁止 AI 改动 */
function castTierLocked(c){
  if(!c) return true;
  if(!c.tierAuto) return true;              /* 作者手工定过 → 永不动 */
  return castTierIsLocked(chTierOf(c));     /* 主角类 / 重要配角 / 自定义档 → 不动 */
}
function castTierAdd(name,hint,after){
  const nm=String(name||'').trim().slice(0,12);
  if(!nm) return {err:'请填写档位名称'};
  const L=castTierSeq();
  if(L.some(t=>t.name===nm)) return {err:'已经有叫「'+nm+'」的档位了'};
  const C=ensureCast();
  const t={id:'c'+(typeof uid==='function'?uid():Math.random().toString(36).slice(2,9)),name:nm,
    hint:String(hint||'').trim(),after:(after===undefined?'last':String(after))};
  C.custom.push(t);
  castTierRebuild(); save();
  return {ok:true,id:t.id};
}
function castTierSet(id,patch){
  const C=ensureCast();
  const c=C.custom.find(x=>x.id===id);
  if(c){
    if(patch.name!=null){ const nm=String(patch.name).trim().slice(0,12);
      if(nm&&castTierSeq().some(t=>t.name===nm&&t.id!==id)) return {err:'已经有叫「'+nm+'」的档位了'};
      if(nm) c.name=nm; }
    if(patch.hint!=null) c.hint=String(patch.hint).trim();
    if(patch.after!=null) c.after=String(patch.after);
  } else {
    /* 内置档位：只允许改名（id 不动，权重不动） */
    if(CAST_TIER_BUILTIN.indexOf(id)<0) return {err:'找不到这个档位'};
    if(!C.tierNames) C.tierNames={};
    if(patch.name!=null){
      const nm=String(patch.name).trim().slice(0,12);
      if(nm&&castTierSeq().some(t=>t.name===nm&&t.id!==id)) return {err:'已经有叫「'+nm+'」的档位了'};
      if(nm) C.tierNames[id]=nm; else delete C.tierNames[id];
    }
  }
  castTierRebuild(); save();
  return {ok:true};
}
function castTierDel(id){
  const C=ensureCast();
  if(CAST_TIER_BUILTIN.indexOf(id)>=0) return {err:'内置档位不能删除（可改名）'};
  const n=C.custom.length;
  C.custom=C.custom.filter(c=>c.id!==id);
  if(C.custom.length===n) return {err:'找不到这个档位'};
  /* 用到该档位的卡回落到重要配角，不丢卡 */
  (state.chars||[]).forEach(c=>{ if(c&&chTierOf(c)===id){ c.tier=CAST_TIER_DEFAULT; c.tierAuto=false; } });
  castTierRebuild(); save();
  return {ok:true};
}
/* 给 AI 看的档位清单（含作者自定义） */
function castTierAiLines(){
  return castTierRebuild().map(t=>'  · "'+t.id+'"＝'+t.name+(t.custom?'（作者自定义档位）':'')+'：'+t.hint);
}
function castTierNorm(t,def){
  let s=String(t==null?'':t).trim();
  if(CAST_TIER_ALIAS[s]) s=CAST_TIER_ALIAS[s];
  if(CAST_TIER_NAME[s]) return s;
  /* 自定义档位可能在注册前就被读到（如旧数据归一化）→ 先补登一次 */
  if(s&&castTierFindCustom(s)){ try{ castTierRebuild(); }catch(e){} if(CAST_TIER_NAME[s]) return s; }
  return (def===undefined)?CAST_TIER_DEFAULT:def;
}
function castTierName(t){ return CAST_TIER_NAME[castTierNorm(t,'')]||''; }
function castTierHint(t){
  const o=castTierObj(castTierNorm(t,''));
  return o?o.hint:'';
}
function chTierOf(c){
  if(!c) return CAST_TIER_DEFAULT;
  return castTierNorm(c.tier,CAST_TIER_DEFAULT);
}
function chCountTier(t){ return (state.chars||[]).filter(c=>chTierOf(c)===t).length; }
function chCountGroup(g){
  const G=CAST_TIER_GROUPS.find(x=>x.id===g); if(!G) return 0;
  return (state.chars||[]).filter(c=>G.tiers.indexOf(chTierOf(c))>=0).length;
}
function chSetTier(i,t){
  const c=(state.chars||[])[i]; if(!c||!CAST_TIER_NAME[t]) return;
  c.tier=t; c.tierAuto=false; c._tierFixed=true;   /* 手工设定：从此 AI 不得擅改 */
  save(); renderChars(); updateCounters();
  /* 一个故事只能有一位「第一主角」：双主角请用「对等双主角」，这里只提醒不阻拦 */
  if(t==='lead1'&&chCountTier('lead1')>1)
    toast('已设为「第一主角」——注意现已有 '+chCountTier('lead1')+' 位第一主角，双主角请改用「对等双主角」');
  else toast('已设为「'+CAST_TIER_NAME[t]+'」');
}
/* 旧数据迁移：先落成新 id；若出现多位「第一主角」，只保留戏份最重的那位，其余改为「对等双主角」 */
function chTierFixup(){
  try{
    if(!state||!Array.isArray(state.chars)) return 0;
    if(!state.meta||typeof state.meta!=='object') state.meta={};
    if(state.meta.tier9) return 0;
    state.meta.tier9=1;
    try{ castTierRebuild(); }catch(e){}
    let moved=0;
    const leads=state.chars.filter(c=>c&&chTierOf(c)==='lead1');
    if(leads.length>1){
      leads.slice().sort((a,b)=>chFilled(b)-chFilled(a)).forEach((c,ix)=>{
        if(!ix) return;
        c.tier='dual'; c.tierAuto=false; c._tierFixed=true;
        c._tierWhy='原同为「主角」，已按新规则改为「对等双主角」'; moved++;
      });
    }
    state.chars.forEach(c=>{ if(c) c.tier=chTierOf(c); });
    if(moved) state.meta.tier9Notice=moved;
    return moved;
  }catch(e){ console.warn('角色叙事地位迁移失败',e); return 0; }
}
/* 叙事地位的写作权重规则：随角色卡一起进 System Prompt，保证戏份不乱 */
function castTierRuleText(){
  const L=castTierRebuild();
  const lines=L.map((t,i)=>(i+1)+'. '+t.name+(t.custom?'（作者自定义）':'')+'：'+t.hint);
  const chain=L.map(t=>t.name).join('＞');
  return '【人物叙事地位 · 写作权重】\n'
   +'按下表权重判定，只看剧情作用、戏份、成长弧光与对主线的影响；\n'
   +'与实力、官职、修为、世界观社会地位无关（世间无敌的大帝可以是功能性NPC，底层乞丐可以是第一主角）。\n'
   +lines.join('\n')+'\n'
   +'写作约束：\n'
   +'· 双主角必须明确区分「对等双主角」或「第一主角 + 第二主角」，禁止只写「双主角」。\n'
   +'· 反派同样适用本分级：大反派＝核心配角，杂鱼反派＝普通配角 / 功能性NPC。\n'
   +'· 叙事地位可以随剧情动态变化，配角可以升级为第二主角。\n'
   +'· 出场与描写优先级：'+chain+'（传说人物未正面登场，只在传说、遗物与他人回忆中出现）。\n'
   +'· 高地位角色优先分配行动、心理描写与高光时刻；低地位角色不得喧宾夺主、不得抢夺主线戏份。\n'
   +'· 叙事地位决定戏份多少；世界观社会地位（大帝、贵族、平民、奴隶、宗门长老）不改变戏份权重。';
}

/* ---------------- 细分模块定义 ----------------
   top:true 的字段直接写 c.name（角色名），其余写 c.f[mod][k] */
const CH_DEF=[
  {id:'basic', name:'基础档案', hint:'姓名、称号、性别、年龄、种族、身份职衔',
   fields:[
     {k:'name',  label:'姓名', top:true},
     {k:'alias', label:'称号 / 别名'},
     {k:'gender',label:'性别'},
     {k:'age',   label:'年龄'},
     {k:'race',  label:'种族 / 血脉'},
     {k:'org',   label:'身份 / 职衔 / 所属势力'}
   ]},
  {id:'look', name:'外貌形象', hint:'面容、身形、衣着、标志特征',
   fields:[
     {k:'face', label:'面容五官'},
     {k:'body', label:'身形体态'},
     {k:'dress',label:'衣着装饰'},
     {k:'mark', label:'标志性特征'}
   ]},
  {id:'person', name:'性格心理', hint:'核心性格、行为习惯、弱点、价值观',
   fields:[
     {k:'core',  label:'核心性格'},
     {k:'habit', label:'行为习惯与癖好'},
     {k:'weak',  label:'弱点与忌讳'},
     {k:'value', label:'价值观与底线'}
   ]},
  {id:'speech', name:'说话风格', hint:'语气、口癖、称谓、台词示例',
   fields:[
     {k:'tone',  label:'语气语调'},
     {k:'tic',   label:'口癖与惯用语'},
     {k:'call',  label:'自称与对他人的称谓'},
     {k:'sample',label:'台词示例'}
   ]},
  {id:'bg', name:'身世经历', hint:'出身、关键经历、当前处境',
   fields:[
     {k:'origin',label:'出身来历'},
     {k:'past',  label:'关键经历'},
     {k:'now',   label:'当前处境'}
   ]},
  {id:'power', name:'能力特长', hint:'能力境界、擅长领域、战斗风格、限制代价',
   fields:[
     {k:'rank', label:'能力 / 境界'},
     {k:'skill',label:'擅长领域'},
     {k:'fight',label:'战斗风格'},
     {k:'limit',label:'限制与代价'}
   ]},
  {id:'rel', name:'人物关系', hint:'与主角、与其他角色的关系网络',
   fields:[
     {k:'hero',   label:'与主角的关系'},
     {k:'others', label:'与其他角色的关系'},
     {k:'attitude',label:'待人处事的态度'}
   ]},
  {id:'goal', name:'目标动机', hint:'目标、内心冲突、恐惧执念',
   fields:[
     {k:'goal',   label:'核心目标'},
     {k:'conflict',label:'内心冲突'},
     {k:'fear',   label:'恐惧与执念'}
   ]},
  {id:'rule', name:'专属约束', hint:'给 AI 的硬性要求（不得 OOC、称谓规定等）',
   fields:[
     {k:'ooc',  label:'不可 OOC 的底线'},
     {k:'addr', label:'称谓与用词规定'},
     {k:'other',label:'其他硬性要求'}
   ]}
];
const CH_FIELDS=[];
CH_DEF.forEach(m=>m.fields.forEach(f=>CH_FIELDS.push({mod:m.id,k:f.k,label:f.label,top:!!f.top})));
const CH_FIELD_N=CH_FIELDS.length;

/* ---------------- ① 占位符清理（小说不需要 {{user}}） ---------------- */
function chHero(){
  /* 优先取主角类角色卡的名字（第一主角 → 对等双主角 → 第二主角）：
     这样 {{user}} 会换成真实的男/女主角名 */
  try{
    const cs=state.chars||[];
    const pick=['lead1','dual','lead2'].map(t=>cs.find(c=>c&&chTierOf(c)===t&&String(c.name||'').trim()))
      .find(Boolean);
    if(pick) return String(pick.name).trim();
  }catch(e){}
  return String((state.meta&&state.meta.hero)||'主角').trim()||'主角';
}
function chClean(s, cname){
  if(s==null) return '';
  let t=String(s);
  const hero=chHero(), cn=String(cname||'').trim();
  t=t.replace(/\{\{\s*(char|charactername|charname|name)\s*\}\}/gi, cn)
     .replace(/\{\s*(char|charactername|charname)\s*\}/gi, cn)
     .replace(/<\s*BOT\s*>/gi, cn)
     .replace(/\[\s*char\s*\]/gi, cn);
  t=t.replace(/\{\{\s*(user|persona|username)\s*\}\}/gi, hero)
     .replace(/\{\s*(user|persona|username)\s*\}/gi, hero)
     .replace(/<\s*USER\s*>/gi, hero)
     .replace(/\[\s*user\s*\]/gi, hero);
  t=t.replace(/\{\{\s*(original|originalchar|description)\s*\}\}/gi,'');
  t=t.replace(/<\s*START\s*>/gi,'').replace(/<\s*\/?START\s*>/gi,'');
  t=t.replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  return t;
}
/* 清理整张卡的所有字段；返回清理掉的占位符个数 */
function chCleanCard(c){
  let n=0;
  const scan=x=>{ if(typeof x!=='string') return x; const b=x; const a=chClean(x,c.name);
    if(a!==b) n += ((b.match(/\{\{|\{[a-z]|<USER|<BOT/gi)||[]).length||1);
    return a; };
  CH_DEF.forEach(m=>m.fields.forEach(f=>{ if(f.top) return;
    const cur=(c.f&&c.f[m.id]&&c.f[m.id][f.k])||'';
    if(cur) c.f[m.id][f.k]=scan(cur);
  }));
  if(c.note) c.note=scan(c.note);
  return n;
}

/* ---------------- ② 数据结构 ---------------- */
function chBlankF(){
  const f={};
  CH_DEF.forEach(m=>{ f[m.id]={}; m.fields.forEach(x=>{ f[m.id][x.k]=''; }); });
  return f;
}
function ensureCh(c){
  if(!c||typeof c!=='object') return c;
  if(!c.id) c.id=uid();
  if(!c.f||typeof c.f!=='object') c.f={};
  CH_DEF.forEach(m=>{
    if(!c.f[m.id]||typeof c.f[m.id]!=='object') c.f[m.id]={};
    m.fields.forEach(x=>{ if(typeof c.f[m.id][x.k]!=='string') c.f[m.id][x.k]=''; });
  });
  /* 旧版字段迁移（老项目 / 老导出） */
  if(!c.f.basic.org   && c.description)  c.f.basic.org   =chClean(c.description,c.name);
  if(!c.f.person.core && c.personality)  c.f.person.core =chClean(c.personality,c.name);
  if(!c.f.speech.tone && c.speech)       c.f.speech.tone =chClean(c.speech,c.name);
  if(!c.f.bg.now      && c.scenario)     c.f.bg.now      =chClean(c.scenario,c.name);
  if(!c.f.speech.sample&&c.example)      c.f.speech.sample=chClean(c.example,c.name);
  if(!c.f.rule.other  && c.systemPrompt) c.f.rule.other  =chClean(c.systemPrompt,c.name);
  if(c.postHistory && !c.note) c.note=chClean(c.postHistory,c.name);
  if(!c.name) c.name=String((c.f.basic&&c.f.basic.name)||'未命名角色');
  if(typeof c.note!=='string') c.note='';
  if(!Array.isArray(c.tags)) c.tags=toKeys(c.tags||[]);
  if(!Array.isArray(c._book)) c._book=[];
  if(!Array.isArray(c._clean)) c._clean=[];
  if(!(Number(c.from)>0)) c.from=1;
  if(!(Number(c.to)>0)) c.to=9999;
  if(c.enabled==null) c.enabled=true;
  if(c._raw==null) c._raw={};
  /* 叙事地位（九级 + 作者自定义档位）；旧版 hero / major 在这里落成新 id */
  c.tier=castTierNorm(c.tier,CAST_TIER_DEFAULT);
  if(c.tierAuto==null) c.tierAuto=false;
  if(c._tierFixed==null) c._tierFixed=false;   /* 作者是否手工定过档（定了就永不被自动覆盖） */
  if(typeof c._tierWhy!=='string') c._tierWhy='';
  if(c._auto==null) c._auto=false;
  if(c._placeholder==null) c._placeholder=false;
  if(c._fromCh==null) c._fromCh=null;
  if(typeof c._why!=='string') c._why='';
  if(c._split==null) c._split=false;
  if(!Array.isArray(c._heads)) c._heads=[];
  if(c._dropped==null) c._dropped=[];
  if(c._restored==null) c._restored=false;
  return c;
}
function chFilled(c){
  let n=0;
  if(String(c.name||'').trim()) n++;
  CH_DEF.forEach(m=>m.fields.forEach(f=>{
    if(f.top) return;
    if(String((c.f&&c.f[m.id]&&c.f[m.id][f.k])||'').trim()) n++;
  }));
  return n;
}
function chTotal(){ return CH_FIELD_N; }
/* 该模块下已填字段数 */
function chModFilled(c,mod){
  const m=CH_DEF.find(x=>x.id===mod); if(!m) return 0;
  let n=0;
  m.fields.forEach(f=>{ if(f.top){ if(String(c.name||'').trim()) n++; }
    else if(String((c.f[m.id]&&c.f[m.id][f.k])||'').trim()) n++; });
  return n;
}
function chModHas(c,mod){
  const m=CH_DEF.find(x=>x.id===mod); if(!m) return false;
  return m.fields.some(f=>f.top? String(c.name||'').trim()
    : String((c.f[m.id]&&c.f[m.id][f.k])||'').trim());
}
function chCardOf(id){ return ensureLore().w.filter(e=>(e._linked||e.linkedChar)===id); }

/* ---------------- ③ 规则拆分：把 ST 一大段 description 分到各模块 ---------------- */
const CH_HEAD_MAP=[
  {re:/(外貌|外形|形象|外观|长相|容貌|样貌|面貌|颜值)/, mod:'look',   f:'face'},
  {re:/(身形|身材|体格|体型|身姿)/,                     mod:'look',   f:'body'},
  {re:/(衣着|服饰|穿着|打扮|服装|装束|配饰)/,            mod:'look',   f:'dress'},
  {re:/(特征|标志|印记|伤疤|纹路|瞳色|发色)/,            mod:'look',   f:'mark'},
  {re:/(性格|性情|人格|个性|心性)/,                     mod:'person', f:'core'},
  {re:/(习惯|癖好|嗜好|小动作|日常习性)/,                mod:'person', f:'habit'},
  {re:/(弱点|缺点|忌讳|软肋|破绽|短板)/,                 mod:'person', f:'weak'},
  {re:/(价值观|信念|底线|准则|道德观)/,                  mod:'person', f:'value'},
  {re:/(说话|语气|口癖|口头禅|语言风格|谈吐|声音|台词)/,  mod:'speech', f:'tone'},
  {re:/(口癖|惯用语|常用语|口音)/,                       mod:'speech', f:'tic'},
  {re:/(称谓|自称|称呼|敬语|称呼方式)/,                  mod:'speech', f:'call'},
  {re:/(示例|对话示例|台词示例|例句)/,                   mod:'speech', f:'sample'},
  {re:/(出身|来历|家世|籍贯|血脉出身)/,                  mod:'bg',     f:'origin'},
  {re:/(背景|身世|经历|过去|履历|往事|生平|故事)/,        mod:'bg',     f:'past'},
  {re:/(处境|现状|当前|目前|如今|当下)/,                 mod:'bg',     f:'now'},
  {re:/(境界|修为|等级|阶位|实力等级)/,                  mod:'power',  f:'rank'},
  {re:/(能力|实力|异能|法术|特长|技能|擅长|天赋|专长)/,   mod:'power',  f:'skill'},
  {re:/(战斗|打法|招式|战斗风格|作战方式)/,              mod:'power',  f:'fight'},
  {re:/(限制|代价|副作用|反噬|禁忌|后遗症)/,             mod:'power',  f:'limit'},
  {re:/(与主角|主角关系|对主角)/,                        mod:'rel',    f:'hero'},
  {re:/(关系|人际|羁绊|同伴|亲友|敌人|师承)/,            mod:'rel',    f:'others'},
  {re:/(态度|处事|待人)/,                                mod:'rel',    f:'attitude'},
  {re:/(目标|动机|追求|愿望|理想|欲望|野心)/,            mod:'goal',   f:'goal'},
  {re:/(冲突|矛盾|挣扎|纠结|内心戏)/,                    mod:'goal',   f:'conflict'},
  {re:/(恐惧|害怕|执念|心结|阴影|忌讳的事)/,             mod:'goal',   f:'fear'},
  {re:/(性别)/,                                          mod:'basic',  f:'gender'},
  {re:/(年龄|岁数)/,                                     mod:'basic',  f:'age'},
  {re:/(种族|血脉|族群|族属|物种)/,                      mod:'basic',  f:'race'},
  {re:/(身份|职衔|职业|所属|阵营|头衔|职位|势力)/,        mod:'basic',  f:'org'},
  {re:/(称号|别名|别称|尊号|诨名)/,                      mod:'basic',  f:'alias'},
  {re:/(禁止|不可|不得|注意|要求|约束|ooc|不得崩)/i,      mod:'rule',   f:'ooc'}
];
function chHeadMatch(head){
  const h=String(head||'').replace(/[\s　]/g,'');
  if(!h||h.length>14) return null;
  for(const it of CH_HEAD_MAP){ if(it.re.test(h)) return it; }
  return null;
}
/* 把一段文本按小标题切分到各模块；没有小标题则整段进「身份/职衔」 */
function chSplitDesc(text, cname){
  const t=String(text||'').replace(/\r/g,'');
  const f=chBlankF();
  const res={f, split:false, hits:[], heads:[]};
  if(!t.trim()) return res;
  const marks=[];
  /* 识别【标题】/ [标题] / （标题） / 标题： 形态的分段标记 */
  const re=/(?:[【\[（(]\s*([^】\]）)]{1,14})\s*[】\]）)]|(?:^|\n)[ \t　]*([\u4e00-\u9fa5A-Za-z][^\n。；;：:]{0,9})[:：])/g;
  let m;
  while((m=re.exec(t))){
    const head=(m[1]||m[2]||'').trim();
    const tgt=chHeadMatch(head);
    if(!tgt) continue;
    const start=m.index+(m[1]?0:(m.index===0?0:1));      /* 行首形态跳过前导换行 */
    marks.push({i:start, end:m.index+m[0].length, mod:tgt.mod, f:tgt.f, head});
  }
  if(!marks.length){ res.f.basic.org=chClean(t.trim(),cname); return res; }
  const pre=t.slice(0,marks[0].i).trim();
  if(pre) res.f.basic.org=chClean(pre,cname);
  marks.forEach((mk,n)=>{
    const seg=t.slice(mk.end, n+1<marks.length?marks[n+1].i:t.length).trim();
    res.heads.push(mk.head);
    if(!seg) return;
    const cur=res.f[mk.mod][mk.f];
    const val=chClean(seg,cname);
    res.f[mk.mod][mk.f]=cur?(cur+'\n'+val):val;
    res.hits.push(mk.mod+'.'+mk.f);
  });
  res.split=res.hits.length>0;
  return res;
}

/* ---------------- ③b 叙事地位：从角色卡信息自动判定（导入时用） ----------------
   判定依据是「叙事权重」（身份 / 戏份 / 功能），不是实力高低。
   只做一次默认值，标 tierAuto=true，作者随时可点定位徽标改。 */
const CH_TIER_LEX_STRONG=[
  {t:'dual',   re:/对等双主角|双主角|双人搭档|男女双主|二人组/},
  {t:'lead2',  re:/第二主角|次主角|副主角/},
  {t:'lead1',  re:/第一主角|男主角|女主角|男主|女主|主人公|主角卡|【主角】/},
  {t:'core',   re:/大反派|最终\s*boss|终极\s*boss|主要反派|幕后黑手|终极反派|关键导师/i},
  {t:'legend', re:/传说人物|从未登场|上古传说|神话人物/},
  {t:'bg',     re:/背景路人|群众演员/},
  {t:'npc',    re:/功能性\s*npc|工具人/i},
  {t:'extra',  re:/普通配角|龙套/}
];
/* 字段正文里不再用光杆「主角」：太容易把「与主角的关系」之类误判成主角本人 */
const CH_TIER_LEX_WEAK=[
  {t:'dual',   re:/对等双主|双主角|双人搭档|男女双主/},
  {t:'lead2',  re:/第二主角|次主角|副主角/},
  {t:'lead1',  re:/主人公|第一主角|主线视角|本作核心/},
  {t:'core',   re:/宿敌|挚爱|主要反派|最终对手/},
  {t:'support',re:/重要配角|核心配角|挚友|师父|师尊|师兄|师姐|师妹|师弟|恋人|未婚妻|未婚夫|长老|家主/},
  {t:'extra',  re:/普通配角|配角/},
  {t:'npc',    re:/店小二|掌柜|侍从|侍卫|守卫|信使|传令|随从|仆役|摊贩/},
  {t:'bg',     re:/路人|看客|围观/},
  {t:'legend', re:/传说|已故|先祖/}
];
/* 命中词越长越可信：这样「对等双主角」赢过「主角」、「重要配角」赢过「配角」 */
function chTierVote(text,lex){
  const t=String(text||''); let best=null;
  lex.forEach(it=>{
    const m=t.match(it.re); if(!m) return;
    const score=String(m[0]).length;
    if(!best||score>best.score) best={t:it.t,score,why:String(m[0]).trim()};
  });
  return best;
}
function chGuessTier(c,force){
  if(!c) return '';
  if(!force&&chGuessTierGuard(c)) return '';
  try{
    const bag=[String(c.name||'')].concat((c.tags||[]).map(String));
    if(c._st&&c._st.creator_notes) bag.push(String(c._st.creator_notes).slice(0,400));
    if(c.note) bag.push(String(c.note).slice(0,200));
    let hit=chTierVote(bag.join(' ｜ '),CH_TIER_LEX_STRONG);
    if(!hit){
      const weak=[];
      CH_DEF.forEach(m=>{ if(m.id==='rel') return;   /* 不扫「人物关系」，避开「与主角的关系」 */
        m.fields.forEach(f=>{ if(f.top) return;
          const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim();
          if(v) weak.push(v.slice(0,300)); }); });
      hit=chTierVote(weak.join(' ｜ '),CH_TIER_LEX_WEAK);
    }
    if(!hit) return '';
    c.tier=hit.t; c.tierAuto=true;
    c._tierWhy='按角色卡信息自动判定（认到「'+hit.why+'」）';
    return c.tier;
  }catch(e){ console.warn('叙事地位自动判定失败',e); return ''; }
}

/* ---------------- ④ 导入：SillyTavern → 细分结构 ---------------- */
function normChar(data, raw){
  const d=(data&&data.data)?data.data:(data||{});
  const cb=d.character_book||(raw&&raw.character_book)||null;
  let book=[];
  if(cb&&cb.entries){
    const arr=Array.isArray(cb.entries)?cb.entries:Object.values(cb.entries);
    book=arr.map(normWorldEntry);
  }
  const c={ id:uid(), name:String(d.name||'未命名角色'), avatar:'', enabled:true, from:1, to:9999,
    tags:[], note:'', f:chBlankF(), _book:book, _raw:data||{}, _st:{}, _clean:[] };
  /* 对话专用的字段单独留着，不进注入（导出时可原样写回） */
  c._st={
    first_mes:String(d.first_mes||''),
    alternate_greetings:Array.isArray(d.alternate_greetings)?d.alternate_greetings:[],
    post_history_instructions:String(d.post_history_instructions||''),
    creator:String(d.creator||''), creator_notes:String(d.creator_notes||''),
    character_version:String(d.character_version||''),
    spec:String((raw&&raw.spec)||''), spec_version:String((raw&&raw.spec_version)||'')
  };
  /* ① 本工具导出的卡：结构无损还原 */
  const mo=d.extensions&&(d.extensions.moYan||d.extensions.moyan);
  if(mo&&mo.f&&typeof mo.f==='object'){
    CH_DEF.forEach(m=>{ if(!mo.f[m.id]) return;
      m.fields.forEach(x=>{ if(x.top) return;
        if(typeof mo.f[m.id][x.k]==='string') c.f[m.id][x.k]=chClean(mo.f[m.id][x.k],c.name); });
    });
    if(typeof mo.note==='string') c.note=chClean(mo.note,c.name);
    if(Number(mo.from)>0) c.from=Number(mo.from);
    if(Number(mo.to)>0) c.to=Number(mo.to);
    if(mo.enabled!=null) c.enabled=!!mo.enabled;
    if(mo.tier){
      const t9=castTierNorm(mo.tier,'');
      if(t9){ c.tier=t9; c.tierAuto=!!mo.tierAuto; c._tierWhy=String(mo.tierWhy||'');
        c._tierFixed=!mo.tierAuto; }
    }
    c._restored=true;
  } else {
    /* ② 外部卡：按小标题规则拆分 */
    const sp=chSplitDesc(chClean(d.description||'',c.name), c.name);
    c.f=sp.f; c._split=sp.split; c._heads=sp.heads;
  }
  /* ③ 其余 ST 字段按语义落到对应细分字段（为空才写，不覆盖已拆出的） */
  const put=(mod,k,val)=>{ if(!String(val||'').trim()) return; if(String(c.f[mod][k]||'').trim()) return; c.f[mod][k]=chClean(val,c.name); };
  put('person','core', d.personality);
  put('bg','now', d.scenario);
  put('speech','sample', d.mes_example||d.example_dialogue);
  if(d.system_prompt){
    /* system_prompt 通常是「不管怎样都要遵守」的要求 → 专属约束 */
    const sp=chSplitDesc(chClean(d.system_prompt,c.name),c.name);
    if(sp.split) CH_DEF.forEach(m=>m.fields.forEach(x=>{ if(x.top) return;
      if(!String(c.f[m.id][x.k]||'').trim() && sp.f[m.id][x.k]) c.f[m.id][x.k]=sp.f[m.id][x.k]; }));
    else put('rule','other', d.system_prompt);
  }
  put('basic','alias', '');
  /* ④ 数值 / 标记 */
  if(d.creator||d.creator_notes) c._st.creator_notes=d.creator_notes||'';
  c.tags=toKeys(d.tags||[]);
  const dropped=[];
  if(c._st.first_mes) dropped.push('开场问候语 first_mes');
  if(c._st.alternate_greetings.length) dropped.push('备用开场 '+c._st.alternate_greetings.length+' 条');
  c._dropped=dropped;
  /* ⑤ 兜底清理占位符 */
  chCleanCard(c);
  ensureCh(c);
  /* ⑥ 叙事地位：本工具导出的卡原样还原；外部卡按卡里的角色信息自动判定（强制跑一次），可随时改 */
  if(!(mo&&mo.tier)) chGuessTier(c,true);
  return c;
}

async function readPngCard(file){
  const buf=new Uint8Array(await file.arrayBuffer());
  const dec=new TextDecoder('utf-8');
  let p=8, found={};
  const dv=new DataView(buf.buffer);
  while(p+8<=buf.length){
    const len=dv.getUint32(p); const type=String.fromCharCode(buf[p+4],buf[p+5],buf[p+6],buf[p+7]);
    const data=buf.slice(p+8,p+8+len);
    if(type==='tEXt'){
      let z=0; while(z<data.length && data[z]!==0) z++;
      const key=dec.decode(data.slice(0,z));
      const val=dec.decode(data.slice(z+1));
      if(/^(chara|ccv3|character)$/i.test(key)) found[key]=val;
    } else if(type==='iTXt'){
      let z=0; while(z<data.length && data[z]!==0) z++;
      const key=dec.decode(data.slice(0,z));
      if(/^(chara|ccv3|character)$/i.test(key)){
        let q=z+1; while(q<data.length){ if(data[q]===0){ q++; break; } q++; }   /* compression flag+method */
        let r=q; while(r<data.length && data[r]!==0) r++; r++;                     /* language tag */
        let s=r; while(s<data.length && data[s]!==0) s++; s++;                     /* translated keyword */
        found[key]=dec.decode(data.slice(s));
      }
    }
    p+=8+len+4;
    if(type==='IEND') break;
  }
  const raw=found.ccv3||found.chara||found.character;
  if(!raw) throw new Error('PNG 里没有找到角色卡数据');
  let json;
  try{ json=JSON.parse(raw); }
  catch(e){ json=JSON.parse(decodeURIComponent(escape(atob(raw)))); }
  return json;
}
function fileToAvatar(file, max){
  return new Promise(resolve=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const m=max||160;
      const s=Math.min(1, m/Math.max(img.width,img.height));
      const cv=document.createElement('canvas');
      cv.width=Math.max(1,Math.round(img.width*s)); cv.height=Math.max(1,Math.round(img.height*s));
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg',0.82));
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); resolve(''); };
    img.src=url;
  });
}
function addChar(c){ state.chars.push(ensureCh(c)); }
function charBookOf(id){ return chCardOf(id); }

async function importCharFiles(files){
  const arr=[].slice.call(files||[]).filter(Boolean);
  if(!arr.length) return;
  const rep={add:0,restore:0,split:0,clean:0,dropped:0,book:0,names:[],fails:[],splitNames:[],dropNames:[]};
  for(const f of arr){
    try{
      let json, avatar='';
      if(/\.png$/i.test(f.name)){
        json=await readPngCard(f);
        avatar=await fileToAvatar(f,160);
      } else {
        json=JSON.parse(await f.text());
        if(Array.isArray(json)){
          for(const j of json){
            const c=normChar(j); c.avatar=avatar; addChar(c); chTally(c,rep,f.name);
          }
          renderChars(); save(); continue;
        }
      }
      const c=normChar(json); c.avatar=avatar;
      addChar(c); chTally(c,rep,f.name);
    }catch(e){ rep.fails.push(f.name+'（'+((e&&e.message)||e)+'）'); }
  }
  /* 内嵌世界书 → 归入世界观设定库 */
  const L=ensureLore();
  state.chars.forEach(c=>{
    if(!c._book||!c._book.length) return;
    c._book.forEach(raw=>{
      const e=wbEntry(raw,{linkedChar:c.id}); e._linked=c.id;
      try{ const g=wbClassifyName(e.name,e.content); e.block=g.block; e.cat=g.cat; }catch(err){}
      L.w.push(e); rep.book++;
    });
    c._book=[];
  });
  renderChars(); save(); updateCounters();
  chReport(rep);
}
function chTally(c,rep,filename){
  rep.add++;
  if(c._restored) rep.restore++;
  if(c._split) { rep.split++; rep.splitNames.push(c.name); }
  rep.dropped += (c._dropped||[]).length;
  if(c._dropped&&c._dropped.length) rep.dropNames.push('◆ '+c.name+'：'+c._dropped.join('、'));
  const cleaned=chCleanCard(c);
  rep.clean+=cleaned;
}
/* 导入报告 */
function chReport(rep){
  if(!rep) return;
  const warn=[];
  if(rep.dropped) warn.push('已丢弃 '+rep.dropped+' 项<b>对话专用内容</b>（开场问候语 / 备用开场），它们只用于聊天，写小说用不上，留着反而占上下文。');
  if(rep.clean) warn.push('已清理 <b>'+rep.clean+' 处 {user} / {char} 一类占位符</b>，替换为具体称呼。');
  const miss=state.chars.filter(c=>!chModHas(c,'person')&&!chModHas(c,'bg'));
  if(miss.length) warn.push('有 '+miss.length+' 张卡的「性格 / 身世」仍是空的，点开卡片可手动补，或用「✦ AI 补全空白字段」。');
  const html='<h3>角色卡导入完成</h3>'
    +'<div class="item" style="padding:12px 14px">'
    +'<div style="font-size:13.5px;line-height:2">'
    +'新增角色 <b>'+rep.add+'</b> 张'
    +(rep.restore?(' ｜ 结构还原 <b>'+rep.restore+'</b> 张'):'')
    +(rep.split?(' ｜ 自动拆分 <b>'+rep.split+'</b> 张'):'')
    +'<br>细分字段已填 <b>'+state.chars.map(c=>chFilled(c)).reduce((a,b)=>a+b,0)+'</b> / '
    +(state.chars.length*chTotal())+' 格'
    +(rep.book?('<br>内嵌世界书条目 <b>'+rep.book+'</b> 条已并入「② 世界观 · 世界书」'):'')
    +'<br>叙事地位 <b>'+state.chars.filter(c=>c.tierAuto).length+'</b> 张已自动判定（点卡片上的定位徽标可改）'
    +'</div></div>'
    +(rep.splitNames.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge ok">已智能拆分</span></div>'
      +'<div class="hint" style="margin-top:6px">'+rep.splitNames.map(esc).join('、')+'：已按小标题把长描述分到对应模块，请点开核对。</div></div>'):'')
    +(rep.dropNames.length?('<div class="item" style="padding:11px 14px"><div class="item-head"><span class="badge">已丢弃对话内容</span></div>'
      +'<div class="hint" style="margin-top:6px">'+rep.dropNames.map(esc).join('<br>')+'</div></div>'):'')
    +(warn.length?('<div class="warnbox">'+warn.join('<br>')+'</div>'):'')
    +(rep.fails.length?('<div class="warnbox">导入失败：'+rep.fails.map(esc).join('、')+'</div>'):'');
  const names=state.chars.map((c,i)=>({i,c,empty:chFilled(c)}))
    .filter(x=>x.empty<4).map(x=>x.i);
  openDlg(html,[
    {label:'知道了'},
    {label:'查看角色卡',fn:()=>{ const t=document.querySelector('.tab[data-tab="chars"]'); if(t) t.click();
      charOpen=state.chars.length-1; renderChars(); return true; }},
    (names.length?{label:'✦ AI 补全空白字段',cls:'primary',fn:()=>{ setTimeout(()=>aiFillChar(state.chars.length-1),80); return true; }}
                 :{label:'打开最后一张卡',cls:'primary',fn:()=>{ charOpen=state.chars.length-1; renderChars(); return true; }})
  ]);
}

/* ---------------- ⑤ 导出：细分结构 → SillyTavern V2 ---------------- */
function chDescOf(c){
  const seg=[];
  if((c.f.basic.gender||'').trim()) seg.push('性别：'+c.f.basic.gender.trim());
  if((c.f.basic.age||'').trim()) seg.push('年龄：'+c.f.basic.age.trim());
  if((c.f.basic.race||'').trim()) seg.push('种族/血脉：'+c.f.basic.race.trim());
  if((c.f.basic.org||'').trim()) seg.push(String(c.f.basic.org).trim());
  CH_DEF.forEach(m=>{
    if(m.id==='basic') return;
    const parts=[];
    m.fields.forEach(f=>{
      const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim();
      if(v) parts.push('【'+f.label+'】'+v);
    });
    if(parts.length) seg.push('【'+m.name+'】\n'+parts.join('\n'));
  });
  if(String(c.note||'').trim()) seg.push('【给 AI 的额外提示】'+String(c.note).trim());
  return seg.join('\n');
}
function chExportObj(i){
  const c=ensureCh(state.chars[i]); if(!c) return null;
  const out={
    spec:'chara_card_v2', spec_version:'2.0',
    data:{
      name:c.name,
      description:chDescOf(c),
      personality:String((c.f.person&&c.f.person.core)||''),
      scenario:String((c.f.bg&&c.f.bg.now)||''),
      first_mes:chClean(String((c._st&&c._st.first_mes)||''), c.name),
      mes_example:String((c.f.speech&&c.f.speech.sample)||''),
      creator_notes:(c._st&&c._st.creator_notes)||'由 DreamWeaver 导出',
      system_prompt:String((c.f.rule&&c.f.rule.other)||''),
      post_history_instructions:String((c._st&&c._st.post_history_instructions)||''),
      alternate_greetings:(c._st&&c._st.alternate_greetings)||[],
      tags:c.tags||[], creator:(c._st&&c._st.creator)||'', character_version:(c._st&&c._st.character_version)||'1.0',
      extensions:{}
    }
  };
  /* 结构无损：细分字段全量写进 extensions.moYan，SillyTavern 会忽略它 */
  out.data.extensions.moYan={ v:1, f:c.f, note:c.note||'', from:c.from, to:c.to,
    enabled:!!c.enabled, tags:c.tags||[],
    tier:chTierOf(c), tierAuto:!!c.tierAuto, tierWhy:String(c._tierWhy||'') };
  return out;
}
function exportChar(i){
  const c=state.chars[i]; if(!c) return;
  const out=chExportObj(i); if(!out) return;
  download(dwFileName(c.name)+'.card.json', JSON.stringify(out,null,2),'application/json');
  toast('已导出角色卡 '+c.name+'（含细分字段）');
}

/* ---------------- ⑥ 注入：只有非空字段进提示词 ---------------- */
function chInjectOne(c){
  const seg=['◆ '+c.name+(String(c.f.basic.alias||'').trim()?('（'+c.f.basic.alias.trim()+'）'):'')];
  const _t=chTierOf(c);
  seg.push('【叙事地位】'+castTierNameOf(_t)+'（权重 '+CAST_TIER_ORDER[_t]+' / '+castTierTotal()+'）——'+castTierHint(_t));
  const basics=[];
  if(String(c.f.basic.gender||'').trim()) basics.push('性别：'+c.f.basic.gender.trim());
  if(String(c.f.basic.age||'').trim()) basics.push('年龄：'+c.f.basic.age.trim());
  if(String(c.f.basic.race||'').trim()) basics.push('种族/血脉：'+c.f.basic.race.trim());
  if(String(c.f.basic.org||'').trim()) basics.push(c.f.basic.org.trim());
  if(basics.length) seg.push('【基础档案】'+basics.join(' ｜ '));
  CH_DEF.forEach(m=>{
    if(m.id==='basic') return;
    const parts=[];
    m.fields.forEach(f=>{
      const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim();
      if(v) parts.push(f.label+'：'+v.replace(/\s*\n\s*/g,' '));
    });
    if(parts.length) seg.push('【'+m.name+'】'+parts.join(' ｜ '));
  });
  if(String(c.note||'').trim()) seg.push('【额外提示】'+String(c.note).replace(/\s*\n\s*/g,' '));
  return seg.join('\n');
}
function chBlockText(idx){
  try{ castTierRebuild(); }catch(e){ console.warn('档位表同步跳过',e); }
  const list=activeCharsFor(idx).slice().sort((a,b)=>CAST_TIER_ORDER[chTierOf(a)]-CAST_TIER_ORDER[chTierOf(b)]);
  if(!list.length) return '';
  let out=castTierRuleText()
    +'\n\n【本章登场角色设定】（按叙事地位从高到低）\n'
    +list.map(c=>chInjectOne(ensureCh(c))).join('\n\n');
  try{
    const rl=(typeof castInjectText==='function')?castInjectText(idx):'';
    if(rl) out+='\n\n'+rl;
  }catch(e){ console.warn('人物关系注入失败',e); }
  return out;
}
/* 供世界书扫描用的角色关键词文本 */
function chScanText(c){
  const parts=[c.name];
  CH_DEF.forEach(m=>m.fields.forEach(f=>{ if(f.top) return;
    const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim(); if(v) parts.push(v); }));
  if(c.note) parts.push(c.note);
  try{ const rw=(typeof castRelWords==='function')?castRelWords(c.id):''; if(rw) parts.push(rw); }catch(e){}
  try{ if(c._fromCh) parts.push(c.name+'首次出现于第'+c._fromCh+'章'); }catch(e){}
  return parts.join(' ');
}

/* ---------------- ⑦ 界面：卡片列表 ---------------- */
let charOpen=null, charTab='basic';
function chBadge(c){
  const n=chFilled(c), t=chTotal();
  const pct=Math.round(n/t*100);
  const cls=pct>=60?'ok':(pct>=25?'':'warn');
  return '<span class="badge '+cls+'">'+n+' / '+t+' 格</span>';
}
function chCardHTML(c,i){
  c=ensureCh(c);
  const bk=chCardOf(c.id).length;
  const filled=chFilled(c);
  const tier=chTierOf(c);
  const bar=Math.max(2,Math.round(filled/chTotal()*100));
  return '<div class="chcard2 '+(c.enabled?'':'off')+'" data-act="open" data-i="'+i+'">'
    +'<div class="charhead">'
    +'<div class="avatar">'+(c.avatar?('<img src="'+c.avatar+'" alt="">'):esc((c.name||'?')[0]))+'</div>'
    +'<div style="flex:1;min-width:0">'
    +'<div class="ch-name">'+esc(c.name||'未命名角色')+'</div>'
    +(String(c.f.basic.alias||'').trim()?('<div class="ch-alias">'+esc(c.f.basic.alias)+'</div>'):'')
    +'<div class="toolbar" style="margin-top:5px">'
    +'<button class="badge '+castTierCls(tier)+'" data-act="tierpick" data-i="'+i+'" title="叙事地位 权重 '+CAST_TIER_ORDER[tier]+'/'+castTierTotal()+'，点一下修改">'
    +esc(castTierNameOf(tier))+(c.tierAuto?'·自动':'')+'</button>'
    +chBadge(c)
    +(c._placeholder?'<span class="badge warn">待补充</span>':'')
    +(bk?('<span class="badge ok">内嵌世界书 '+bk+'</span>'):'')
    +(c.enabled?'':'<span class="badge warn">已停用</span>')+'</div>'
    +'</div></div>'
    +'<div class="gauge" style="height:7px;margin:9px 0 7px"><i style="width:'+bar+'%"></i></div>'
    +'<div class="ch-sum">'+esc(chSummary(c))+'</div>'
    +'<div class="ch-foot"><span class="hint" style="margin:0">出场 第'+(c.from||1)+'-'+(c.to>=9999?'末':c.to)+'章'
      +(c._fromCh?('　首现第'+c._fromCh+'章'):'')+'</span>'
    +'<div class="spacer"></div>'
    +'<span class="hint" style="margin:0;color:var(--accent)">点开编辑 ›</span></div>'
    +'</div>';
}
function chSummary(c){
  const cands=[
    String(c.f.basic.org||''), String(c.f.person.core||''),
    String(c.f.bg.past||''), String(c.f.look.face||''),
    String(c.f.speech.tone||''), String(c.f.bg.now||'')
  ].map(s=>s.trim()).filter(Boolean);
  if(!cands.length) return '（还没有填写内容，点开补全）';
  let s=cands[0].replace(/\s+/g,' ');
  if(cands.length>1) s+=' ｜ '+cands[1].replace(/\s+/g,' ').slice(0,40);
  return s.slice(0,110)+(s.length>110?'…':'');
}

/* ---------------- ⑧ 界面：卡片详情（细分编辑） ---------------- */
function chDetailHTML(c,i){
  c=ensureCh(c);
  const bk=chCardOf(c.id).length;
  const tabs='<div class="ltabs">'+CH_DEF.map(m=>{
    const f=chModFilled(c,m.id), t=m.fields.length;
    return '<button class="ltab'+(charTab===m.id?' active':'')+'" data-act="tab" data-mod="'+m.id+'">'
      +esc(m.name)+'<span class="n">'+(f?('('+f+'/'+t+')'):'')+'</span></button>';
  }).join('')+'</div>';
  const mod=CH_DEF.find(m=>m.id===charTab)||CH_DEF[0];
  const fields=mod.fields.map(f=>{
    const val=f.top?String(c.name||''):String((c.f[mod.id]&&c.f[mod.id][f.k])||'');
    const rows=f.top?2:3;
    const ph=f.top?'角色姓名':'（未填写）';
    return '<div class="chfield">'
      +'<div class="chfield-head"><span class="lb">'+esc(f.label)+'</span><div class="spacer"></div>'
      +'<button class="btn xs ghost" data-act="cai" data-mode="expand"  data-mod="'+mod.id+'" data-k="'+f.k+'">✦ 扩写</button>'
      +'<button class="btn xs ghost" data-act="cai" data-mode="polish"  data-mod="'+mod.id+'" data-k="'+f.k+'">✎ 润色</button>'
      +'<button class="btn xs ghost" data-act="cai" data-mode="rewrite" data-mod="'+mod.id+'" data-k="'+f.k+'">↻ 重写</button>'
      +'</div>'
      +'<textarea rows="'+rows+'" data-cf="'+(f.top?'@name':(mod.id+'.'+f.k))+'" placeholder="'+esc(ph)+'">'+esc(val)+'</textarea>'
      +'</div>';
  }).join('');
  return '<div class="card" style="margin-bottom:12px">'
    +'<div class="toolbar">'
    +'<button class="btn sm" data-act="back">‹ 返回角色列表</button>'
    +'<div class="spacer"></div>'
    +'<button class="btn sm ghost" data-act="img" data-i="'+i+'">换头像</button>'
    +'<button class="btn sm ghost" data-act="exp" data-i="'+i+'">导出卡</button>'
    +'<button class="btn sm ghost danger" data-act="del" data-i="'+i+'">删除</button>'
    +'</div>'
    +'<div class="toolbar" style="margin-top:10px">'
    +'<div class="avatar" style="width:60px;height:60px;flex:0 0 60px">'
      +(c.avatar?('<img src="'+c.avatar+'" alt="">'):esc((c.name||'?')[0]))+'</div>'
    +'<div style="flex:1;min-width:0">'
    +'<div class="ch-name">'+esc(c.name||'未命名角色')+'</div>'
    +'<div class="toolbar" style="margin-top:5px">'+chBadge(c)
    +(bk?('<span class="badge ok">内嵌世界书 '+bk+'</span>'):'')+'</div>'
    +'</div></div>'
    +'<div class="row" style="margin-top:10px">'
    +'<div><label style="margin-top:0">出场章节 从</label><input type="number" min="1" data-cn="from" data-i="'+i+'" value="'+(c.from||1)+'"></div>'
    +'<div><label style="margin-top:0">到（9999 = 直到结局）</label><input type="number" min="1" data-cn="to" data-i="'+i+'" value="'+(c.to||9999)+'"></div>'
    +'</div>'
    +'<label class="switch" style="margin-top:8px"><input type="checkbox" data-cb="enabled" data-i="'+i+'" '+(c.enabled?'checked':'')+'> 启用该角色卡（仅出场区间内注入）</label>'
    +'<label style="margin-top:12px">叙事地位（权重 '+CAST_TIER_ORDER[chTierOf(c)]+' / '+castTierTotal()+'）'
    +'<span class="tip-dot" data-tip="叙事地位只看剧情作用与戏份，与实力、官职、修为、世界观社会地位无关。它决定 AI 给多少笔墨；主角类 / 核心配角 / 重要配角以及你手工定过的卡，AI 梳理时不会擅改。">?</span></label>'
    +'<div class="toolbar">'
    +'<button class="badge '+castTierCls(chTierOf(c))+'" data-act="tierpick" data-i="'+i+'" title="点一下修改叙事地位">'
    +esc(castTierNameOf(chTierOf(c)))+(c.tierAuto?'·自动':'')+' ▾</button>'
    +(c.tierAuto?'<span class="badge">自动判定</span>':'')
    +(castTierIsLocked(chTierOf(c))?'<span class="badge ok">AI 不得擅改</span>':'')
    +'<div class="spacer"></div>'
    +'<button class="btn sm ghost" data-act="tiermanage">⚙ 自定义分类</button>'
    +'<button class="btn sm ghost" data-act="castboard">🔗 人物关系（'+castRelsOf(c.id).length+'）</button>'
    +'</div>'
    +'<div class="hint" style="margin-top:6px">'+esc(castTierHint(chTierOf(c)))+'</div>'
    +(String(c._tierWhy||'').trim()?('<div class="hint" style="margin-top:4px">判定依据：'+esc(c._tierWhy)+'</div>'):'')
    +'</div>'
    +'<div class="card">'
    +tabs
    +'<div class="hint" style="margin:0 0 10px">'+esc(mod.name)+'：'+esc(mod.hint)+'</div>'
    +fields
    +'<label>整卡备注（给 AI 的额外提示，例：本角色口癖固定，「老子」不得改成「我」）</label>'
    +'<textarea rows="2" data-cf="@note" placeholder="（未填写）">'+esc(c.note||'')+'</textarea>'
    +'<div class="toolbar" style="margin-top:12px">'
    +'<button class="btn sm" data-act="aisplit" data-i="'+i+'">✦ AI 智能拆分</button>'
    +'<button class="btn sm primary" data-act="aifill" data-i="'+i+'">✦ AI 补全空白字段</button>'
    +'<button class="btn sm ghost" data-act="clean" data-i="'+i+'">⌫ 清理 {user} 占位符</button>'
    +'</div>'
    +'</div>';
}
function chStatLine(){
  const el=$('#charStat'); if(!el) return;
  const cs=state.chars||[];
  const en=cs.filter(c=>c.enabled).length;
  el.textContent = cs.length
    ? (cs.length+' 张卡 · 主线 '+chCountGroup('lead')+' · 配角 '+chCountGroup('cast')+' · NPC与路人 '+chCountGroup('minor')
       +(castCustomTiers().length?(' · 自定义 '+chCountTierCustom()):'')+' · 启用 '+en)
    : '';
}
function chCountTierCustom(){
  try{ const ids=castCustomTiers().map(c=>c.id);
    return (state.chars||[]).filter(c=>c&&ids.indexOf(chTierOf(c))>=0).length; }catch(e){ return 0; }
}
var charView='list';        /* list | board：陈列列表 / 人物关系板 */
var charFilter='all';       /* all | 分组 id（lead/cast/minor） | 具体档位 id（lead1/dual/…/legend） */
function chMatchFilter(c,f){
  if(!f||f==='all') return true;
  const t=chTierOf(c);
  if(CAST_TIER_NAME[f]) return t===f;              /* 具体档位（含自定义） */
  const G=CAST_TIER_GROUPS.find(x=>x.id===f);      /* 分组 */
  return G?G.tiers.indexOf(t)>=0:true;
}
function chGuessTierGuard(c){
  /* 作者手工定过的、或已经落在受保护档位（主角类 / 核心·重要配角 / 自定义）上的卡，
     一律不让自动判定覆盖——避免导入或 AI 梳理把主角降档。 */
  if(!c) return true;
  if(c._tierFixed) return true;
  return castTierIsLocked(chTierOf(c));
}
function chListHTML(){
  const G=castTierGroupsAll();
  const chips=[{id:'all',name:'全部'}].concat(G.filter(x=>x.g.id!=='custom'||x.items.length).map(x=>({id:x.g.id,name:x.g.name})));
  let bar='<div class="tierbar">'
    +chips.map(x=>{
      const n=x.id==='all'?(state.chars||[]).length:chCountGroup(x.id);
      return '<button class="tchip'+(charFilter===x.id?' on':'')+'" data-act="filter" data-t="'+x.id+'">'
        +x.name+'<span class="n">'+n+'</span></button>';
    }).join('')
    +'<div class="spacer"></div>'
    +'<button class="btn xs" data-act="tiermanage">⚙ 自定义分类</button>'
    +'<button class="btn xs" data-act="castboard">🔗 人物关系</button>'
    +'<button class="btn xs" data-act="castextract">✦ 从正文梳理角色</button>'
    +'</div>';
  if(state.meta&&state.meta.tier9Notice){
    bar+='<div class="hint" style="margin-bottom:10px">定位升级为九级：原有 '+state.meta.tier9Notice
      +' 张「主角」卡已改为「对等双主角」（一个故事只有一位第一主角）。'
      +'<button class="btn xs ghost" data-act="tiernotice">知道了</button></div>';
  }
  const list=(state.chars||[]).map((c,i)=>({c,i})).filter(x=>chMatchFilter(x.c,charFilter));
  if(!list.length) return bar+'<div class="empty" style="grid-column:1/-1">这个定位下还没有角色卡。</div>';
  castTierRebuild();
  const groups=castTierSeq().map(t=>({t,items:list.filter(x=>chTierOf(x.c)===t.id)})).filter(g=>g.items.length);
  return bar+groups.map(g=>
    '<div class="tierhead" style="grid-column:1/-1">'+esc(g.t.name)+(g.t.custom?'<span class="badge">自定义</span>':'')
    +'<span class="n">'+g.items.length+'</span>'
    +'<span class="hint" style="margin:0">'+esc(g.t.hint||'')+'</span></div>'
    +g.items.map(x=>chCardHTML(x.c,x.i)).join('')
  ).join('');
}
function renderChars(){
  const host=$('#charList'); if(!host) return;
  try{ chTierFixup(); }catch(e){ console.warn('定位迁移跳过',e); }
  try{ castTierRebuild(); }catch(e){ console.warn('档位表同步跳过',e); }
  chStatLine();
  if(charOpen!=null && !state.chars[charOpen]) charOpen=null;
  /* 人物关系板：完全独立的一个视图 */
  if(charView==='board'){
    host.classList.remove('detail'); host.classList.add('boardview');
    try{ host.innerHTML=castBoardHTML(); }
    catch(e){ console.warn('关系板渲染出错',e); host.innerHTML='<div class="warnbox">人物关系板渲染出错：'+esc(e.message)+'</div>'; }
    castBind(host);
    return;
  }
  host.classList.remove('boardview');
  if(charOpen!=null){
    const c=ensureCh(state.chars[charOpen]);
    if(!CH_DEF.some(m=>m.id===charTab)) charTab='basic';
    host.innerHTML=chDetailHTML(c,charOpen);
    host.classList.add('detail');
  } else {
    host.classList.remove('detail');
    host.innerHTML = (state.chars||[]).length
      ? chListHTML()
      : '<div class="empty" style="grid-column:1/-1">还没有角色卡。<br>点「⇧ 导入角色卡」上传 SillyTavern 的 PNG 卡或 JSON，也可以「+ 新建角色」手填。</div>';
  }
  chBind(host);
}

/* ---------------- ⑨ 事件绑定 ---------------- */
function chBind(host){
  if(host._chBound) return;
  host._chBound=true;
  host.addEventListener('click',chClick);
  host.addEventListener('input',chInput);
  host.addEventListener('change',chInput);
}
function chClick(e){
  const btn=e.target.closest('[data-act]'); if(!btn) return;
  const act=btn.dataset.act;
  if(act==='open'){ charOpen=+btn.dataset.i; charTab='basic'; renderChars(); return; }
  if(act==='back'){ charOpen=null; renderChars(); return; }
  if(act==='tab'){ charTab=btn.dataset.mod; renderChars();
    const h=$('#charList'); if(h) h.scrollIntoView({block:'nearest'}); return; }
  if(act==='exp'){ exportChar(+btn.dataset.i); return; }
  if(act==='del'){
    const i=+btn.dataset.i, c=state.chars[i]; if(!c) return;
    if(!confirm('删除角色「'+c.name+'」？绑定的世界书条目会保留在「世界观」中。')) return;
    state.chars.splice(i,1); charOpen=null; renderChars(); save(); updateCounters();
    return;
  }
  if(act==='img'){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async()=>{
      const fl=[].slice.call(inp.files||[]); if(!fl.length) return;
      state.chars[+btn.dataset.i].avatar=await fileToAvatar(fl[0],160);
      renderChars(); save(); toast('头像已更新');
    };
    inp.click(); return;
  }
  if(act==='aifill'){ aiFillChar(+btn.dataset.i); return; }
  if(act==='aisplit'){ chAiSplit(+btn.dataset.i); return; }
  if(act==='cai'){ chAiField(+btn.dataset.i, btn.dataset.mod, btn.dataset.k, btn.dataset.mode); return; }
  if(act==='tierpick'){ castTierDialog(+btn.dataset.i); return; }
  if(act==='tiermanage'){ castTierManageDialog(); return; }
  if(act==='settier'){ chSetTier(+btn.dataset.i, btn.dataset.t); return; }
  if(act==='filter'){ charFilter=btn.dataset.t||'all'; charOpen=null; renderChars(); return; }
  if(act==='tiernotice'){ if(state.meta) state.meta.tier9Notice=0; save(); renderChars(); return; }
  if(act==='clean'){
    const c=ensureCh(state.chars[+btn.dataset.i]);
    const n=chCleanCard(c); save(); renderChars();
    toast(n?('已清理 '+n+' 处占位符'):'没有发现 {user} / {char} 一类占位符');
    return;
  }
}
function chInput(e){
  const el=e.target;
  const i=el.dataset.i!=null?+el.dataset.i:charOpen;
  const c=state.chars[i]; if(!c) return;
  if(el.dataset.cf!=null){
    const path=el.dataset.cf;
    if(path==='@name') c.name=el.value;
    else if(path==='@note') c.note=el.value;
    else { const [mod,k]=path.split('.'); if(c.f[mod]) c.f[mod][k]=el.value; }
    save(); chRefreshHead();
    return;
  }
  if(el.dataset.cn!=null){ c[el.dataset.cn]=Math.max(1,+el.value||1); save(); renderChars(); return; }
  if(el.dataset.cb!=null){ c[el.dataset.cb]=el.checked; save(); updateCounters(); renderChars(); return; }
}
/* 轻量刷新：只更新计数，不重绘（避免输入时丢失光标） */
function chRefreshHead(){
  const c=state.chars[charOpen]; if(!c) return;
  const host=$('#charList'); if(!host) return;
  const n=chFilled(c);
  host.querySelectorAll('.badge').forEach(b=>{
    if(/格$/.test(b.textContent||'')) b.textContent=n+' / '+chTotal()+' 格';
  });
  const nameEl=host.querySelector('.ch-name'); if(nameEl&&c.name) nameEl.textContent=c.name;
  if(!host._chT){ host._chT=setTimeout(()=>{ host._chT=null; chStatLine(); refreshInjectPreview(); },400); }
}

/* ---------------- ⑩ 单字段 AI 改写 ---------------- */
async function chAiField(i,mod,k,mode){
  const c=ensureCh(state.chars[i]); if(!c) return;
  const m=CH_DEF.find(x=>x.id===mod); if(!m) return;
  const f=m.fields.find(x=>x.k===k); if(!f) return;
  const isTop=!!f.top;
  const cur=isTop?String(c.name||''):String((c.f[mod]&&c.f[mod][k])||'');
  setBusy(true,'AI 正在'+CH_MODE_NAME[mode]+'「'+c.name+' · '+f.label+'」…');
  try{
    const other=NvChBrief(c,mod,k);
    const user='【人物设定改写】\n作者正在写长篇小说的人物设定。请对下面这一格做「'+CH_MODE_NAME[mode]+'」。\n\n'
      +'角色：'+c.name+'\n字段（'+m.name+' › '+f.label+'）：\n'+(cur?cur:'（空，请根据该角色的其它设定直接写出这一格）')+'\n\n'
      +(other?('该角色其它已填设定（供参考，必须相容）：\n'+other+'\n\n'):'')
      +fieldContext()+'\n\n'
      +'要求：\n- '+CH_AI_TASK[mode]+'\n'
      +'- 只写「'+f.label+'」这一格的内容，不要写别的字段、不要标题、不要解释\n'
      +'- 这是小说人物不是聊天机器人：不要出现 {{user}}、{{char}}，一律用具体称呼\n'
      +'- 只输出正文，不要 markdown 代码块';
    let out=String(await chat([{role:'system',content:CH_AI_SYS},{role:'user',content:user}])||'').trim();
    out=out.replace(/^```[a-z]*\s*/i,'').replace(/```$/,'').trim();
    if(!out) throw new Error('模型没有返回内容');
    out=chClean(out,c.name).replace(/^[【\[]?[^】\]]{0,10}[】\]]?\s*[:：]\s*/,'');
    if(isTop) c.name=out.split(/[\n，,。]/)[0].slice(0,20)||c.name;
    else c.f[mod][k]=out;
    save(); renderChars();
    toast('已'+CH_MODE_NAME[mode]+'「'+f.label+'」');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
/* 该角色的其它已填设定（截断，避免过长） */
function NvChBrief(c,skipMod,skipK){
  const seg=[];
  CH_DEF.forEach(m=>{
    const parts=[];
    m.fields.forEach(f=>{
      if(m.id===skipMod&&f.k===skipK) return;
      if(f.top){ if(String(c.name||'').trim()) parts.push('姓名：'+c.name.trim()); return; }
      const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim();
      if(v) parts.push(f.label+'：'+v.replace(/\s*\n\s*/g,' ').slice(0,160));
    });
    if(parts.length) seg.push('【'+m.name+'】'+parts.join('；'));
  });
  if(String(c.note||'').trim()) seg.push('【额外提示】'+String(c.note).trim().slice(0,160));
  return seg.join('\n').slice(0,1600);
}

/* ---------------- ⑪ AI 补全空白字段 ---------------- */
async function aiFillChar(i){
  const c=ensureCh(state.chars[i]); if(!c) return;
  /* 只补空白的字段，已有内容不动 */
  const todo=[];
  CH_DEF.forEach(m=>m.fields.forEach(f=>{
    if(f.top) return;
    if(!String((c.f[m.id]&&c.f[m.id][f.k])||'').trim()) todo.push({mod:m.id,mname:m.name,k:f.k,label:f.label});
  }));
  if(!todo.length){ toast('这张卡的所有字段都已填写，没有需要补的空白格'); return; }
  setBusy(true,'AI 正在补全「'+c.name+'」的 '+todo.length+' 个空白字段…');
  try{
    const list=todo.map(t=>'· "'+t.mod+'.'+t.k+'" （'+t.mname+' › '+t.label+'）').join('\n');
    const cur=CH_DEF.map(m=>{
      const p=[]; m.fields.forEach(f=>{ if(f.top) return;
        const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim(); if(v) p.push(f.label+'：'+v); });
      return p.length?('【'+m.name+'】'+p.join('；')):'';
    }).filter(Boolean).join('\n');
    const user='【人物设定补全】\n作者正在写长篇小说。请为下面这个角色补全<b>空白字段</b>。\n\n'
      +'角色名：'+c.name+'\n'
      +(cur?('已有设定（必须保留其倾向、不得推翻）：\n'+cur+'\n\n'):'')
      +'需要补全的字段（只填这些，key 必须完全一致）：\n'+list+'\n\n'
      +fieldContext()+'\n\n'
      +'要求：\n- 每个字段 '+(todo.length>6?'40-90':'60-140')+' 字，具体、可用、有画面感，不要空泛套话\n'
      +'- 各字段之间必须自洽（性格要能解释目标，弱点要能解释冲突）\n'
      +'- 与已有世界观、已有角色设定相容，不得引入矛盾\n'
      +'- 这是小说人物不是聊天机器人：不要出现 {{user}}、{{char}}，一律用具体称呼\n'
      +'- 只输出 JSON，不要解释、不要代码块标记：\n{"'+todo[0].mod+'.'+todo[0].k+'":"...","...":"..."}';
    const j=parseLoose(await chat([{role:'system',content:CH_AI_SYS},{role:'user',content:user}]));
    if(!j||typeof j!=='object'||Array.isArray(j)) throw new Error('解析失败');
    let n=0;
    todo.forEach(t=>{
      const raw=j[t.mod+'.'+t.k];
      if(raw!=null && String(raw).trim()){ c.f[t.mod][t.k]=chClean(String(raw).trim(),c.name); n++; }
    });
    if(!n) throw new Error('模型没有返回可用内容');
    save(); renderChars();
    toast('已补全 '+n+' 个字段（还剩 '+(todo.length-n)+' 个未补）');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}

/* ---------------- ⑫ AI 智能拆分（把整卡文本重新分格） ---------------- */
async function chAiSplit(i){
  const c=ensureCh(state.chars[i]); if(!c) return;
  const cur=CH_DEF.map(m=>{
    const p=[]; m.fields.forEach(f=>{ if(f.top) return;
      const v=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim(); if(v) p.push(f.label+'：'+v); });
    return p.length?('【'+m.name+'】'+p.join('；')):'';
  }).filter(Boolean).join('\n');
  const all=cur||'（这张卡几乎是空的）';
  setBusy(true,'AI 正在重新拆分「'+c.name+'」的字段…');
  try{
    const keys=CH_DEF.map(m=>m.fields.filter(f=>!f.top).map(f=>m.id+'.'+f.k).join(' / ')).join('\n');
    const user='【人物设定重新拆分】\n下面是某个小说角色卡现有的全部内容（可能是一大段没分格的文字）。\n'
      +'请把它<b>按语义重新分到各细分字段</b>里：原意不变、不新增设定、不删掉信息，只是重新归类。\n\n'
      +'角色：'+c.name+'\n现有内容：\n'+all+'\n\n'
      +'可用字段（key 必须完全一致）：\n'+keys+'\n\n'
      +'要求：\n- 同一内容只放最合适的那一格，不要重复抄到多格\n'
      +'- 某格确实没有对应内容就留空字符串，不要硬编\n'
      +'- 保留原文措辞，不要改写润色\n'
      +'- 只输出 JSON，不要解释、不要代码块标记';
    const j=parseLoose(await chat([{role:'system',content:CH_AI_SYS},{role:'user',content:user}]));
    if(!j||typeof j!=='object'||Array.isArray(j)) throw new Error('解析失败');
    const valid=new Set(); CH_DEF.forEach(m=>m.fields.forEach(f=>{ if(!f.top) valid.add(m.id+'.'+f.k); }));
    let n=0;
    const nf=chBlankF();
    aKeys(j).forEach(k=>{
      if(!valid.has(k)) return;
      const v=String(j[k]||'').trim();
      if(v){ const [mod,kk]=k.split('.'); nf[mod][kk]=chClean(v,c.name); n++; }
    });
    if(!n) throw new Error('模型没有返回可用内容');
    /* 拆出来为空、但原来有内容的字段，保留原值（保证不丢信息） */
    CH_DEF.forEach(m=>m.fields.forEach(f=>{
      if(f.top) return;
      const had=String((c.f[m.id]&&c.f[m.id][f.k])||'').trim();
      if(!nf[m.id][f.k] && had) nf[m.id][f.k]=had;
    }));
    c.f=nf;
    save(); renderChars();
    toast('已重新拆分出 '+n+' 格内容');
  }catch(e){ toast('失败：'+e.message); }
  finally{ setBusy(false); }
}
function aKeys(o){ try{ return Object.keys(o||{}); }catch(e){ return []; } }

/* ---------------- ⑬ 新建 / 导入入口 ---------------- */
function chAddBlank(){
  const c={ id:uid(), name:'新角色', avatar:'', enabled:true, from:1, to:9999,
    tags:[], note:'', f:chBlankF(), _book:[], _raw:{}, _clean:[] };
  addChar(c);
  charOpen=state.chars.length-1; charTab='basic';
  renderChars(); save(); updateCounters();
}
function chBindTop(){
  const bi=$('#btnImportChar'), fi=$('#fileChar');
  if(bi&&fi) bi.onclick=()=>fi.click();
  if(fi) fi.onchange=e=>{
    /* ⚠ 必须先把 FileList 拷成真数组，再清空 value（否则活 FileList 会被清掉） */
    const fl=[].slice.call(e.target.files||[]);
    e.target.value='';
    if(fl.length) importCharFiles(fl);
  };
  const ba=$('#btnAddChar'); if(ba) ba.onclick=chAddBlank;
  const hero=$('#f-hero');
  if(hero){
    hero.value=(state.meta&&state.meta.hero)||'';
    hero.onchange=()=>{ state.meta.hero=hero.value.trim(); save(); renderChars(); toast('主角称呼已设为「'+chHero()+'」'); };
  }
  /* 人物关系板 / 从正文梳理：入口按钮 */
  try{ if(typeof castBindTop==='function') castBindTop(); }catch(e){ console.warn(e); }
}
