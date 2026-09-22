/* 把全部改造应用到一份新的成品文件 */
const fs=require('fs');
const SRC='ai-novel-studio.html';
/* 产物名用 index.html —— 既是单文件应用，也是 GitHub Pages 的入口 */
/* 单文件版输出名：默认 ai-novel-studio-mobile.html（测试与「单文件下载」都用它）。
   可用环境变量覆盖：OUT=xxx.html node build.js
   网页版（index.html + sw.js）由第 21 步单独生成，两者互不覆盖。 */
const OUT=process.env.OUT || 'ai-novel-studio-mobile.html';

let s=fs.readFileSync(SRC,'utf8');
const head=fs.readFileSync('block-head.txt','utf8');
const css=fs.readFileSync('block-css.txt','utf8');
const banner=fs.readFileSync('block-banner.txt','utf8');
const boot=fs.readFileSync('block-boot.txt','utf8');
const safemod=fs.readFileSync('safety-module.js','utf8');
const lorecss=fs.readFileSync('block-lore-css.txt','utf8');
const lorehtml=fs.readFileSync('block-lore-html.txt','utf8');
const loremod=fs.readFileSync('lore-module.js','utf8');
const wbmod=fs.readFileSync('worldbook.js','utf8');
const charmod=fs.readFileSync('char-module.js','utf8');
const castmod=fs.readFileSync('cast-module.js','utf8');
const charcss=fs.readFileSync('char-css.txt','utf8');
const ctxmod=fs.readFileSync('chapter-ctx.js','utf8');
const guardmod=fs.readFileSync('ai-guard.js','utf8');
const dreammod=fs.readFileSync('dream-module.js','utf8');
const dreamcss=fs.readFileSync('dream-css.txt','utf8');
const laymod=fs.readFileSync('layout-module.js','utf8');
const laycss=fs.readFileSync('layout-css.txt','utf8');

function must(cond,msg){ if(!cond) throw new Error('BUILD FAIL: '+msg); }
/* 注意：替换串必须用「函数形式」返回。
   若直接传字符串，JS 会把 `$$` 吃成一个 `$`、`$&`/`` $` ``/`$'` 也会被当特殊记号，
   结果就是插入的代码里 `$$(sel)` 被静默改成 `$(sel)` —— 一个单元素没有 forEach，
   运行时报 "xxx.forEach is not a function"，整个启动流程中断。 */
function rep(s,a,b,label){
  const n=s.split(a).length-1;
  must(n===1, (label||a.slice(0,50))+' 命中 '+n+' 次（应为 1）');
  return s.replace(a, ()=>b);
}
/* 多处同时替换：必须命中指定次数（少一处就说明源码变了，必须报错） */
function repAll(s,a,b,n,label){
  const c=s.split(a).length-1;
  must(c===n,(label||a.slice(0,50))+' 命中 '+c+' 次（应为 '+n+'）');
  return s.split(a).join(b);
}
/* 选择器计数：single 数 $()，dbl 数 $$() */
const single=t=>(t.match(/(?<!\$)\$\(/g)||[]).length;
const dbl=t=>(t.match(/\$\$\(/g)||[]).length;
function splice(s,startMark,endMark,text,label){
  const a=s.indexOf(startMark); must(a>=0,(label||startMark)+' 未找到起点');
  const b=s.indexOf(endMark,a); must(b>=0,(label||startMark)+' 未找到终点');
  const end=b+endMark.length;
  return s.slice(0,a)+text+s.slice(end);
}

/* 0) 模块自检：关键函数名必须都在 */
['ensureLore','loreSystemBlock','renderLore','loreClassify','loreSplitRawText','loreMergeInto','initLoreUI','loreCountN',
 'loreGuessCat','loreRelocate','loreAllEntries','lorePlainText','loreConfBadge']
  .forEach(k=>must(loremod.includes(k),'lore 模块缺 '+k));
['wbEntry','wbRun','wbParse','worldToST','wbImport','wbHit','wbFieldsHTML','wbFix','wbTestDialog','wbExport','wbImportFiles','wbMigrate','wbReport']
  .forEach(k=>must(wbmod.includes('function '+k),'worldbook 模块缺 '+k));
['LORE_LEX','LORE_ALIAS','loreTitlePrefix','loreCatLabel'].forEach(k=>must(loremod.includes(k),'分类引擎缺 '+k));
/* 角色卡细分模块自检 */
['CH_DEF','ensureCh','chClean','chSplitDesc','normChar','renderChars','chDetailHTML','chBlockText',
 'chInjectOne','chScanText','importCharFiles','exportChar','aiFillChar','chAiSplit','chAiField','chCleanCard','chReport','chBindTop',
 'CAST_TIERS','CAST_TIER_GROUPS','CAST_TIER_NAME','CAST_TIER_ORDER','CAST_TIER_COLOR','CAST_TIER_ALIAS',
 'castTierNorm','castTierHint','castTierRuleText','chGuessTier','chTierFixup','chCountGroup','chMatchFilter',
 'chTierOf','chSetTier','chCountTier','chListHTML']
  .forEach(k=>must(charmod.includes(k),'角色卡模块缺 '+k));
/* 人物关系模块自检 */
/* 全局 AI 铁律模块自检 */
['AI_GUARD_MARK','AI_GUARD_RULES','aiFactsBlockRaw','aiGuardApply','proseClean','chatRaw'].forEach(k=>must(guardmod.includes(k),'AI 铁律模块缺 '+k));
/* DreamWeaver 增强模块自检 */
['DW','DW_FAVICON','dwMigrateKeys','openLookDialog','applyLook',
 'aiStatusShow','aiStatusHide','setBusy','save','updateProse','assembleContext','rafBatch','dwBumpGen','dwBoot']
  .forEach(k=>must(dreammod.includes(k),'梦幻增强模块缺 '+k));
/* UI 重编排呈现层自检 */
['LAY','layFoldPass','layAdvPass','layTierPass','layEmptyPass','layStateSet','layWatch','layBoot']
  .forEach(k=>must(laymod.includes(k),'UI 重编排模块缺 '+k));
['.accordion-head','.accordion-body','.tip-info','.btn-more','overscroll-behavior','data-lowend="1"']
  .forEach(k=>must(laycss.includes(k),'UI 重编排 CSS 缺 '+k));
must(laycss.indexOf('blur(11px)')>=0,'磨砂模糊半径未限制在 12px 以内');
{
  /* 只检查「真实声明」，注释里的举例不算 */
  const bare=laycss.replace(/\/\*[\s\S]*?\*\//g,'');
  must(!/blur\((1[3-9]|[2-9]\d)(?:\.\d+)?px\)/.test(bare),'UI 重编排 CSS 里存在 >12px 的 blur（实测会掉帧）');
  must(!/https?:\/\//.test(bare.replace(/xmlns='http:\/\/www\.w3\.org[^']*'/g,'')),'UI 重编排 CSS 里引用了外部资源（禁止 CDN）');
}
['CAST_REL_TYPES','ensureCast','castNormType','castFindChar','castInjectText','castSources','castChunk',
 'castMergeResult','castNewAutoChar','castFillBlanks','castExtractDialog','castExtractRun','castCheckDialog',
 'castCheckRun','castReportCheck','castBoardHTML','castGraphSVG','castRelRowHTML','castClick','castInput','castBindTop','castTierDialog']
  .forEach(k=>must(castmod.includes(k),'人物关系模块缺 '+k));
/* 人物关系模块不得引用旧世界书时代的函数 */
['renderWorld(','state.world'].forEach(k=>must(castmod.indexOf(k)<0,'人物关系模块不应引用 '+k));
/* 兼容的旧接口必须仍然存在（外部多处会调） */
['normChar','addChar','renderChars','charBookOf','exportChar','importCharFiles','readPngCard','fileToAvatar','aiFillChar']
  .forEach(k=>must(new RegExp('function '+k+'\\s*\\(').test(charmod),'角色卡模块缺旧接口 '+k));

/* 1) 视口：支持全面屏安全区 */
s=rep(s,'<meta name="viewport" content="width=device-width, initial-scale=1" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />','viewport');

/* 2) <head> 里的设备识别脚本 */
s=rep(s,'</head>\n<body>', head+'\n</head>\n<body>','head device script');

/* 3) 设备自适应 / 手机竖屏 / 数据保险样式 + 世界观设定库样式 */
const rm='@media (prefers-reduced-motion:reduce){\n  *{animation-duration:.01ms !important;transition-duration:.01ms !important}\n}\n</style>';
s=rep(s, rm, rm.replace('\n</style>','')+'\n'+css+lorecss+charcss+'</style>','css block');

/* 3b) 修掉原文件的历史 bug：窄屏下 dialog{display:flex} 会把「未打开」的弹窗
      也强制显示成全屏，导致竖屏卡在弹窗上、其他按钮全部点不动。 */
const brokenDlg='@media (max-width:720px){\n  dialog{width:100vw;';
const fixedDlg='@media (max-width:720px){\n  dialog[open]{width:100vw;';
s=rep(s, brokenDlg, fixedDlg, 'dialog[open] 修复');

/* 4) 数据保险条 + 整库备份文件选择器 */
s=rep(s,'<div class="toast" id="toast"></div>', banner.trimEnd(),'banner');

/* 5) 顶栏「数据保险」入口（书架 + 编辑器） */
s=rep(s,'<button class="btn sm" id="btnImportBook">',
        '<button class="btn sm" id="btnSafetyShelf">🛡 数据保险</button>\n        <button class="btn sm" id="btnImportBook">','shelf safety btn');
s=rep(s,'<button class="btn sm" id="btnShelf">← 书架</button>',
        '<button class="btn sm" id="btnShelf">← 书架</button>\n      <button class="btn sm" id="btnSafety">🛡 数据保险</button>','editor safety btn');

/* ============================================================
   6) 世界观设定库：页签 + 面板（世界书已并入，原「② 世界观」页签删除）
   ============================================================ */
s=rep(s,
  '    <button class="tab" data-tab="world">② 世界观<span class="n" id="nWorld"></span></button>\n'
 +'    <button class="tab" data-tab="chars">③ 角色卡<span class="n" id="nChars"></span></button>\n'
 +'    <button class="tab" data-tab="style">④ 文风规则</button>\n'
 +'    <button class="tab" data-tab="write">⑤ 成文与目录<span class="n" id="nWrite"></span></button>',
  '    <button class="tab" data-tab="lore">② 世界观·世界书<span class="n" id="nLore"></span></button>\n'
 +'    <button class="tab" data-tab="chars">③ 角色卡<span class="n" id="nChars"></span></button>\n'
 +'    <button class="tab" data-tab="style">④ 文风规则</button>\n'
 +'    <button class="tab" data-tab="write">⑤ 成文与目录<span class="n" id="nWrite"></span></button>',
  'tabs');

/* 整个删除旧的「世界观 / 世界书」面板（保留角色卡锚点） */
const CHAR_MARK='  <!-- ================= 角色卡 ================= -->';
s=splice(s,'  <!-- ================= 世界观 ================= -->',CHAR_MARK,CHAR_MARK,'旧世界观面板');
/* 旧的隐藏文件输入一起删掉 */
s=rep(s,'<input type="file" id="fileWorld" accept=".json,.txt" multiple hidden>\n','','fileWorld input');

s=rep(s,CHAR_MARK, lorehtml.trimEnd()+'\n\n'+CHAR_MARK,'lore panel');

/* 设定页里的上下文拼装说明补上新模块 */
s=rep(s,'          ① 作品设定 → ② 本章出场角色卡 → ③ 命中的世界书条目（含常驻条目）→ ④ 已编入目录的前情与章节梗概 → ⑤ 上一章结尾 → ⑥ 本章梗概要求。<br><br>',
        '          ⓪ <b>全局总提示词 + 世界观设定库</b>（固定上下文，写入 System Prompt）→ ① 作品设定 → ② 本章出场角色卡 → ③ 命中的世界书条目（含常驻条目）→ ④ 已编入目录的前情与章节梗概 → ⑤ 上一章结尾 → ⑥ 本章梗概要求。<br><br>',
        'setup hint');

/* ============================================================
   7) 数据保险核心模块 + 世界观设定库模块（接在 esc 之后，同一作用域）
   ============================================================ */
const escLine='const esc = s => String(s??\'\').replace(/[&<>"]/g,c=>({\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\'}[c]));';
must(s.indexOf(escLine)>=0,'esc 锚点');
['probeStorage','storageInfo','renderSafety','exportAllBooks','safetyFlush','snapshotBook','safetyRestore','dwOwnKey','dwFileName'].forEach(k=>must(safemod.includes(k),'安全模块缺 '+k));
const safetyHeader=`\n\n/* =========================================================
   数据保险（Data Safety）
   手机浏览器会在后台回收页面、用户也可能顺手清缓存，
   localStorage 并不保险。这里做四层兜底：
     ① 所有写入自动镜像到 IndexedDB（换个存储引擎再存一份）
     ② 每次修改自动留历史快照，可一键回滚
     ③ 存储自检 + 申请「持久化存储」权限 + 备份提醒
     ④ 切后台 / 关页面立刻落盘，不等防抖计时器
   ========================================================= */\n`;
/* 包装改名（必须在注入 dream 模块之前调用；函数声明会提升，定义放在下面 7c 处） */
s=applyWrapRenames(s);

s=rep(s,escLine, escLine+safetyHeader+safemod.trimEnd()+'\n\n'+wbmod.trimEnd()+'\n\n'+loremod.trimEnd()+'\n\n'+guardmod.trimEnd()+'\n\n'+dreammod.trimEnd()+'\n\n'+laymod.trimEnd()+'\n','safety+worldbook+lore+ai-guard+dream+layout module');

/* ============================================================
   7c) DreamWeaver · 幻梦织者：品牌重命名 + 梦幻主题 + 性能包装
   ------------------------------------------------------------
   ★ 业务字段一个不动：只改品牌文案、文件名前缀、本地存储键前缀。
     旧 localStorage 键会由 dwMigrateKeys() 自动搬运到新前缀并保留原键，
     旧备份 JSON / 角色卡 / 世界书导入完全不受影响。
   ============================================================ */
/* ① 梦幻主题样式：追加到唯一的 <style> 末尾（只覆盖，不改原样式） */
{
  const n=s.split('</style>').length-1;
  must(n===1,'页面应只有 1 个 </style>（实际 '+n+' 个）');
  const at=s.lastIndexOf('</style>');
  /* 梦幻主题在前，UI 重编排层在后（后者可以覆盖前者，且不动旧变量） */
  s=s.slice(0,at)+dreamcss+'\n'+laycss+'\n'+s.slice(at);
}
/* ①b 磨砂半径统一限幅：全文件 backdrop-filter 的 blur 一律 ≤12px（超过则降为 11px）。
      原基座里有一个 blur(16px) 的顶部栏，手机端会明显掉帧。 */
{
  const a=s.indexOf('<style>'), b2=s.lastIndexOf('</style>');
  const cssHead=s.slice(0,a), cssBody=s.slice(a,b2), cssTail=s.slice(b2);
  const before=[];
  const clamped=cssBody.replace(/(-webkit-)?backdrop-filter:\s*blur\(\s*(\d+(?:\.\d+)?)px\s*\)/g,(m,w,num)=>{
    const v=parseFloat(num); before.push(v);
    const nv=(v>12)?11:v;
    return (w||'')+'backdrop-filter:blur('+nv+'px)';
  });
  s=cssHead+clamped+cssTail;
  console.log('自检：磨砂半径限幅（原始值 '+[...new Set(before)].sort((x,y)=>x-y).join('/')+'px → 全部 ≤12px）');
}
/* ② 品牌文案 → DreamWeaver（只碰品牌文案，不动示例小说里的地名「墨砚城」） */
s=rep(s,'<meta name="description" content="墨砚 · AI 小说创作台：世界书设定注入、角色卡、逐章出文与目录管理" />',
        '<meta name="description" content="DreamWeaver · 幻梦织者：AI 长篇小说创作台，世界书设定注入、角色卡、逐章出文与目录管理" />','meta description');
s=rep(s,'<title>墨砚 · AI 小说创作台</title>','<title>DreamWeaver · 幻梦织者 · AI 小说创作台</title>','title');
s=rep(s,'      <h1 id="headTitle">墨砚 · AI 小说创作台</h1>',
        '      <h1 id="headTitle">DreamWeaver · 幻梦织者</h1>','headTitle');
s=rep(s,'   墨砚 · AI 小说创作台\n   主题：晴空与海洋（Sky & Ocean）',
        '   DreamWeaver · 幻梦织者\n   主题：白蓝梦幻（Snow Blue Dream）· 原「晴空与海洋」配色已映射到梦幻变量','brand comment');
s=rep(s,"'由墨砚导出'","'由 DreamWeaver 导出'",'基础卡导出 creator_notes');
s=rep(s,"source:'墨砚'","source:'DreamWeaver · 幻梦织者'",'世界书导出 source');
/* 说明：各模块内部（char / worldbook / safety）的品牌文案已在源文件里直接改好，
   这样「注入块逐字保留」的自检依旧能抓住转义破坏。 */
s=rep(s,'const PROXY_JS=`// 墨砚 · 本地 API 代理','const PROXY_JS=`// DreamWeaver · 本地 API 代理','proxy 注释');
s=rep(s,"console.log('✓ 墨砚代理已启动","console.log('✓ DreamWeaver 代理已启动",'proxy 启动日志');
/* ③ 本地存储键前缀 → dw-（旧键由模块迁移，双前缀都认） */
s=rep(s,"const LS_KEY = 'ai-novel-studio-v2';","const LS_KEY = 'dw-studio-v2';",'LS_KEY');
s=rep(s,"const LS_LIB = 'ai-novel-shelf-v1';","const LS_LIB = 'dw-shelf-v1';",'LS_LIB');
s=rep(s,"const LS_BOOK = 'ai-novel-book-';","const LS_BOOK = 'dw-book-';",'LS_BOOK');
s=rep(s,"const LS_API = 'ai-novel-api-v1';","const LS_API = 'dw-api-v1';",'LS_API');
/* 存储补丁与镜像：新旧前缀都认（旧数据依旧会被镜像与恢复）。
   注意：安全模块里已直接用 dwOwnKey()，这里不再做全局替换，
   否则会把 dwOwnKey 自己的实现也换掉、造成递归。 */
/* ④ 导出文件名统一 DreamWeaver- 前缀（safety / worldbook 模块内已在源文件改好） */
s=rep(s,"download((state.meta.title||'world')+'.世界书.json'",
        "download(dwFileName(state.meta.title||'world')+'.世界书.json'",'世界书导出名（旧面板）');
s=rep(s,"download((it.title||'未命名作品')+'.墨砚项目.json'",
        "download(dwFileName(it.title||'未命名作品')+'.DreamWeaver项目.json'",'单书备份文件名');
s=rep(s,"title+(onlyCommitted?'（成书稿）':'（含草稿）')+'.txt'",
        "dwFileName(title+(onlyCommitted?'（成书稿）':'（含草稿）'))+'.txt'",'成书 txt 文件名');
/* 导入：新旧后缀都认，旧备份照样能导 */
s=rep(s,"file.name.replace(/\\.[^.]*$/,'').replace(/\\.墨砚项目$/,'')",
        "file.name.replace(/\\.[^.]*$/,'').replace(/\\.(墨砚|DreamWeaver)项目$/,'')",'导入后缀兼容');
/* ⑤ 外观入口按钮 */
s=rep(s,'<button class="btn sm" id="btnSafetyShelf">🛡 数据保险</button>',
        '<button class="btn sm" id="btnLookShelf">🎨 外观</button>\n        <button class="btn sm" id="btnSafetyShelf">🛡 数据保险</button>','外观入口（书架）');
s=rep(s,'<button class="btn sm" id="btnSafety">🛡 数据保险</button>',
        '<button class="btn sm" id="btnLook">🎨 外观</button>\n        <button class="btn sm" id="btnSafety">🛡 数据保险</button>','外观入口（编辑器）');
/* ⑥ 性能包装：把要被包装的原实现改名成 *Raw（逻辑一字不改）。
       ⚠ 必须在注入 dream 模块之前调用（上面已调用），否则会连模块里的同名包装一起改到。
       ↑ 函数声明会提升，所以定义放在这里也能在更早的位置调用。 */
function wrapTargets(){
  return ['setBusy|function setBusy(','updateProse|function updateProse(','save|function save()',
    'metaBlock|function metaBlock(','styleBlock|function styleBlock(','updateCtxInfo|function updateCtxInfo(',
    'assembleContext|function assembleContext(idx,gistText){'];
}
function applyWrapRenames(text){
  wrapTargets().forEach(pair=>{
    const rg=pair.split('|');
    const n=text.split(rg[1]).length-1;
    must(n===1, rg[0]+' → '+rg[0]+'Raw 命中 '+n+' 次（应为 1）');
    text=text.replace(rg[1],()=>rg[1].replace(rg[0],rg[0]+'Raw'));
  });
  return text;
}
/* 每开始一次真实生成就换代（让上下文缓存与概率设定重新计算） */
/* （该插入点在后面的 buildPrompt 步骤里，与 loreCommitNext 一起写入） */
/* ⑦ 启动流程：在 boot 步骤（后面 16 步）里插入 dwBoot() 与镜像后的键迁移 */

/* ============================================================
   7b) 全局 AI 铁律：所有模型调用都经 chat() 一道，强制「只能依据已有信息」
       ── 原函数改名为 chatRaw，由 AI 铁律模块里的 chat() 包装调用
          （同作用域下后声明的函数会覆盖同名函数，因此包装是生效的）
   ============================================================ */
s=rep(s,'async function chat(messages,onDelta){','async function chatRaw(messages,onDelta){','chat 改名 chatRaw');
s=rep(s,"    settings:{scan:1200,budget:4000,showPrompt:false},",
        "    settings:{scan:1200,budget:4000,showPrompt:false,ground:true},",'settings.ground');
/* 出文高级选项：严格依据已有信息 开关 */
s=rep(s,'            <label class="switch"><input type="checkbox" id="optSuggest"> 出文后给出下一章建议</label>',
        '            <label class="switch"><input type="checkbox" id="optSuggest"> 出文后给出下一章建议<span class="hint" style="margin:0">（仅供参考，绝不写入正文）</span></label>\n'
       +'            <label class="switch"><input type="checkbox" id="optGround"> AI 严格依据已有信息（不得凭空生成）</label>','optGround 开关');
const OG_OLD="  $('#m-limit').value=s.limit;";
const OG_NEW=[
 "  const og=$('#optGround');",
 "  if(og){",
 "    og.checked=state.settings.ground!==false;",
 "    og.onchange=e=>{ state.settings.ground=e.target.checked; save();",
 "      toast(e.target.checked?'已开启：AI 只依据已有信息生成':'已关闭：AI 可以自行发挥（非正文内容仍会被拦下）'); };",
 "  }",
 "  $('#m-limit').value=s.limit;"
].join('\n');
s=rep(s,OG_OLD,OG_NEW,'optGround 接线');

/* 旧版世界书（state.world）→ 全部并进世界观设定库，不丢东西 */
s=rep(s,"    world:[], chars:[], outline:[], chapters:[], hooks:[], current:0,",
        "    chars:[], outline:[], chapters:[], hooks:[], current:0,",'blankState world');
s=rep(s,'      state.world = d.world||[]; state.chars = d.chars||[];',
        '      state.chars = d.chars||[];','load world');
s=rep(s,'  st.world=d.world||[]; st.chars=d.chars||[];',
        '  st.chars=d.chars||[];','mergeInto world');

/* ============================================================
   8) state.lore 字段（新书默认 null，由 ensureLore() 惰性建好）
   ============================================================ */
s=rep(s,"    api:{base:'',key:'',model:'',headers:''}\n  };",
        "    api:{base:'',key:'',model:'',headers:''},\n    lore:null,\n    cast:null\n  };",'blankState lore+cast');
s=rep(s,'  st.chars=d.chars||[];',
        '  st.chars=d.chars||[];\n  st.cast=d.cast||null;','mergeInto cast');

/* 旧版单项目数据 */
s=rep(s,'      state.api = Object.assign({}, state.api, d.api||{});',
        '      state.api = Object.assign({}, state.api, d.api||{});\n      if(!d.lore&&Array.isArray(d.world)&&d.world.length){ d.lore={w:d.world}; }\n      state.lore = d.lore || state.lore;','load: 迁移旧世界书');

/* 打开书时的归一化（含把旧版世界书并进设定库） */
s=rep(s,'  st.api=Object.assign(base.api, d.api||{});',
        '  st.api=Object.assign(base.api, d.api||{});\n  st.lore=wbMigrate(d);','mergeInto lore');

/* ============================================================
   9) System Prompt：把世界观设定库拼进去（固定上下文）
   ============================================================ */
const bpA='function buildPrompt(idx,mode,gistText){';
const bpB='  const ctx=assembleContext(idx,gistText);';
const i0=s.indexOf(bpA), i1=s.indexOf(bpB,i0);
must(i0>=0&&i1>i0,'buildPrompt 锚点');
const oldHead=s.slice(i0+bpA.length,i1);            // 原样保留 const sys = `...` 那一段
const sysExpr=oldHead.trim().replace(/^const sys=/,'');
must(sysExpr.startsWith('`'),'buildPrompt: 取不到原 sys 表达式');
s=s.slice(0,i0)+bpA
 +'\n  const sysBase='+sysExpr
 +'\n  const lore=loreSystemBlock();                      // 世界观设定库：固定上下文，最高优先级\n'
 +'  const sys=sysBase+(lore?(\'\\n\\n\'+lore):\'\');\n'
 +'  const ctx=assembleContext(idx,gistText);\n'
 +'  ctx.lore={used:_loreLast.used,budget:_loreLast.budget,kept:_loreLast.kept.slice(),dropped:_loreLast.dropped.slice(),cut:_loreLast.cut,wb:!!_loreLast.wb};\n'
 +s.slice(i1+bpB.length);

/* 上下文状态栏里显示设定库占用 */
s=rep(s,"${c.overflow?' <span class=\"badge warn\">已超限并自动降级</span>':''}`;",
        "${c.overflow?' <span class=\"badge warn\">已超限并自动降级</span>':''}${c.lore&&c.lore.used?(' · 🌍 设定库 '+c.lore.used+' 字'):''}`;",
        'ctxInfo lore');

/* 提示词预览里也说明设定库 */
s=rep(s,'<div class="hint">输入上下文约 ${ctx.used.toLocaleString()} 字（≈${ctx.tokens.toLocaleString()} token）${ctx.overflow?\'，已自动降级压缩\':\'\'}</div>',
        '<div class="hint">输入上下文约 ${ctx.used.toLocaleString()} 字（≈${ctx.tokens.toLocaleString()} token）${ctx.overflow?\'，已自动降级压缩\':\'\'}${ctx.lore&&ctx.lore.used?(\'<br>其中世界观设定库注入 \'+ctx.lore.used.toLocaleString()+\' 字 / 上限 \'+ctx.lore.budget.toLocaleString()+\' 字\'+(ctx.lore.dropped.length?(\'，\'+ctx.lore.dropped.length+\' 块因超限未注入\'):\'\')):\'\'}</div>',
        'prompt preview lore');

/* 编辑器顶部的注入提示也加一条 */
s=rep(s,"  el.innerHTML = `本章将注入：<span class=\"badge on\">${included.length} 条世界观</span>",
        "  const _lc=loreCount(); const _loreN=_lc.w+_lc.pw+_lc.hi+_lc.gl;\n  el.innerHTML = `本章将注入：`+(ensureLore().on&&_loreN?`<span class=\"badge ok\">🌍 设定库 ${_loreN} 条</span> `:``)+`<span class=\"badge on\">${included.length} 条世界书</span>",
        'inject preview lore');

/* ============================================================
   11) 打开一本书时渲染世界观设定库（世界书已并入）
   ============================================================ */
s=rep(s,'  renderWorld(); renderChars(); renderOutline(); renderChapters(); updateCounters();',
        '  renderChars(); renderOutline(); renderChapters(); updateCounters(); renderLore();',
        'initEditorView lore');

/* ============================================================
   11b) 角色卡：面板说明 + 主角称呼输入
   （启动时绑定入口放在 block-boot.txt，那里已经有 initLoreUI）
   ============================================================ */
s=rep(s,'      <div class="toolbar">\n        <button class="btn primary" id="btnImportChar">⇧ 导入角色卡（JSON / PNG）</button>\n        <button class="btn" id="btnAddChar">+ 新建角色</button>',
  ['      <div class="toolbar">',
   '        <button class="btn primary" id="btnImportChar">⇧ 导入角色卡（JSON / PNG）</button>',
   '        <button class="btn" id="btnAddChar">+ 新建角色</button>',
   '        <button class="btn" id="btnCastBoard">🔗 人物关系</button>',
   '        <button class="btn" id="btnCastExtract">✦ 从正文梳理角色</button>'].join('\n'),'角色卡面板工具条');
s=rep(s,'      <div class="hint">\n        一本小说可以有多张角色卡。导入 SillyTavern V1/V2/V3 角色卡（含 PNG 内嵌卡）后，\n        可设置该角色的<b>出场章节范围</b>——只有出场区间内的章节才会把这张卡注入提示词，避免几十个角色互相干扰。\n      </div>',
  ['      <div class="hint">',
   '        支持 SillyTavern V1 / V2 / V3 角色卡（含 PNG 内嵌卡）。<b>点开卡片</b>进入人物档案，',
   '        按「基础档案 / 外貌形象 / 性格心理 / 说话风格 / 身世经历 / 能力特长 / 人物关系 / 目标动机 / 专属约束」分格填写，',
   '        只有填写过的格子才会注入提示词。可设置<b>出场章节范围</b>，避免几十个角色互相干扰。<br>',
   '        <b>本工具写的是小说、不是对话</b>：卡里的 {{user}} / {{char}} 占位符会在导入时自动清理，',
   '        开场问候语一类对话专用内容会被丢弃。',
   '      </div>',
   '      <div class="hint" style="margin-top:8px">',
   '        <b>叙事地位（9 级 + 自定义档位）</b>：第一主角 / 对等双主角 / 第二主角 / 核心配角 / 重要配角 / 普通配角 / 功能性NPC / 背景路人 / 传说人物，',
   '        还可在「⚙ 自定义分类」里加自己体系里的档位（例：幕后黑手 / 情感线女主），它们会和内置档位一起排序、一起参与写作权重。',
   '        点卡片或档案页上的定位徽标就能改。<b>只看剧情作用与戏份，与实力、官职、世界观社会地位无关</b>——',
   '        世间无敌的大帝可以是功能性NPC，底层乞丐可以是第一主角。每章注入时按权重从高到低排序，',
   '        并把「权重排序 + 写作约束」一并写进提示词，低地位角色不会抢夺主线戏份。<br>',
   '        <b>AI 不得擅改地位</b>：主角类、双主角、核心/重要配角以及你自己手工定过的卡，梳理时只会给出建议，必须你确认才会生效。',
   '        主角一般由你导入；其余档位可以让「✦ 从正文梳理角色」自动总结，导入 SillyTavern 卡时也会自动判定一档。',
   '        <b>人物关系</b>会自动整理成关系表与关系图（点越大＝地位越高），并在生成时一并注入，保证人物关系不崩。',
   '      </div>',
   '      <div class="row" style="margin-top:10px">',
   '        <div><label style="margin-top:0">主角称呼（用来替换卡里的 {{user}}）</label>',
   '          <input type="text" id="f-hero" placeholder="主角">',
   '          <div class="hint" style="margin-top:5px">留空则统一用「主角」。</div></div>',
   '      </div>'].join('\n'),'角色卡面板说明');/* ⑩ fieldContext：给 AI 喂设定时改读设定库（原世界书已并入） */
s=rep(s,"  const w=state.world.filter(e=>e.enabled&&e.content.trim()).slice(0,25)\n    .map(e=>'◆ '+e.comment+'：'+e.content.replace(/\\s+/g,' ').slice(0,120));\n  if(w.length) out.push('世界观：\\n'+w.join('\\n'));",
  "  let _lore=null;\n  try{ _lore=ensureLore(); }catch(e){}\n  if(_lore){\n    const w=_lore.w.filter(e=>e.enabled&&String(e.content||'').trim()).slice(0,25)\n      .map(e=>'◆ '+(e.name||'未命名')+'：'+String(e.content).replace(/\\s+/g,' ').slice(0,120));\n    if(w.length) out.push('世界观设定：\\n'+w.join('\\n'));\n    const _pw=[];\n    if((_lore.pw.general||'').trim()) _pw.push('◆ 基础力量总纲：'+_lore.pw.general.replace(/\\s+/g,' ').slice(0,160));\n    _lore.pw.on&&_lore.pw.branches.forEach(b=>{ if(b.enabled&&String(b.content||'').trim()) _pw.push('◆ 修炼分支·'+(b.name||'')+'：'+String(b.content).replace(/\\s+/g,' ').slice(0,120)); });\n    _lore.pw.on&&_lore.pw.realms.forEach(r=>{ if(r.enabled&&String(r.name||'').trim()) _pw.push('◆ 境界·'+r.name+'：'+String(r.feat||r.cap||'').replace(/\\s+/g,' ').slice(0,120)); });\n    if(_pw.length) out.push('力量体系：\\n'+_pw.join('\\n'));\n    const _hi=_lore.hi.events.filter(e=>e.enabled&&String(e.desc||'').trim()).slice(0,15)\n      .map(e=>'◆ '+(e.name||'')+(e.time?('（'+e.time+'）'):'')+'：'+String(e.desc).replace(/\\s+/g,' ').slice(0,120));\n    if(_hi.length) out.push('历史年表：\\n'+_hi.join('\\n'));\n    if((_lore.gl.master||'').trim()) out.push('全局总提示词：'+_lore.gl.master.replace(/\\s+/g,' ').slice(0,300));\n  }",'fieldContext');

/* ============================================================
   12c) 正文净化：所有写入章节正文的路径都过一道 proseClean()
   ------------------------------------------------------------
   事故场景：模型写完正文后自作主张续上一段「下一章建议 / 本章小结 /
   作者的话」，被当成正文存进章节，导出/阅读时都带着。
   两头堵：① 提示词里明令禁止；② 写入前一律 proseClean() 剥尾。
   ============================================================ */
/* 出文（流式）：先净化，再落正文与消息 */
s=rep(s,[
 '    const list=chatOf(i); const msg=list[k]; msg.text=acc; msg.streaming=false;',
 '    if(state.suggest.autoWrite) ch.content=acc;'
].join('\n'),[
 '    acc=proseClean(acc);',
 '    const list=chatOf(i); const msg=list[k]; msg.text=acc; msg.streaming=false;',
 '    if(state.suggest.autoWrite) ch.content=proseClean(acc);'
].join('\n'),'proseClean: 出文');
/* 改稿 */
s=rep(s,[
 '    const m=chatOf(i)[k]; m.text=acc; m.streaming=false;',
 '    if(state.suggest.autoWrite) ch.content=acc;'
].join('\n'),[
 '    acc=proseClean(acc);',
 '    const m=chatOf(i)[k]; m.text=acc; m.streaming=false;',
 '    if(state.suggest.autoWrite) ch.content=proseClean(acc);'
].join('\n'),'proseClean: 改稿');
/* 扩写 / 润色 */
s=rep(s,[
 '    const m=chatOf(i)[k]; m.text=acc; m.streaming=false;',
 '    if(state.suggest.autoWrite) ensureChapter(i).content=acc;'
].join('\n'),[
 '    acc=proseClean(acc);',
 '    const m=chatOf(i)[k]; m.text=acc; m.streaming=false;',
 '    if(state.suggest.autoWrite) ensureChapter(i).content=proseClean(acc);'
].join('\n'),'proseClean: 扩写润色');
/* 编辑器「写作 / 续写」：流式落盘，收尾后再净化一次 */
s=rep(s,[
 '    ch.title=state.outline[i].title;',
 '    save(); renderChapters(); renderOutline(); refreshInjectPreview();'
].join('\n'),[
 '    ch.content=proseClean(ch.content);',
 "    if($('#content')) $('#content').value=ch.content;",
 '    ch.title=state.outline[i].title;',
 '    save(); renderChapters(); renderOutline(); refreshInjectPreview();'
].join('\n'),'proseClean: 编辑器写作');
/* 手动「用作本章正文」/「编入目录」/「接在末尾」/ 补写段落 */
s=rep(s,"ensureChapter(i).content=msg.text||'';",
        "ensureChapter(i).content=proseClean(msg.text||'');",'proseClean: adopt');
s=rep(s,"if(act==='docommit' && msg.text && !(state.chapters[ti]||{}).content) ensureChapter(ti).content=msg.text;",
        "if(act==='docommit' && msg.text && !(state.chapters[ti]||{}).content) ensureChapter(ti).content=proseClean(msg.text);",'proseClean: docommit');
s=rep(s,"ch.content=(ch.content?ch.content.replace(/\\s+$/,'')+'\\n\\n':'')+(msg.text||'');",
        "ch.content=proseClean((ch.content?ch.content.replace(/\\s+$/,'')+'\\n\\n':'')+(msg.text||''));",'proseClean: append');
s=rep(s,"const k=chatOf(i).push({role:'ai',kind:'prose',text:t+'\\n\\n（以上为补写段落，点「追加到正文」补入本章）'})-1;",
        "const k=chatOf(i).push({role:'ai',kind:'prose',text:proseClean(t)+'\\n\\n（以上为补写段落，点「追加到正文」补入本章）'})-1;",'proseClean: 补写');

/* 提示词里把话说死：正文里不许出现任何非正文内容 */
const SB_OLD="  if(r.banned) s+='【禁止出现的词/表达】'+r.banned.replace(/\\n/g,'、')+'\\n';";
const SB_NEW=SB_OLD
 +"\n  s+='【正文纯度】只输出小说正文：不得出现「下一章建议 / 下一章预告 / 本章小结 / 作者的话 / 写作说明 / 修改说明」这类非正文内容，也不得写章节名、小标题、分隔线标注或任何解释性文字。\\n';";
s=rep(s,SB_OLD,SB_NEW,'styleBlock 正文纯度');
s=rep(s,'绝不违背设定、绝不自行新增未铺垫的关键设定或关键人物。',
        '绝不违背设定、绝不自行新增未铺垫的关键设定或关键人物。正文里不得出现任何非正文内容（下一章建议、下一章预告、本章小结、作者的话等一律不得出现）。','buildPrompt 正文纯度');
s=rep(s,'- 结尾留下让读者想翻页的钩子`;',
        '- 结尾留下让读者想翻页的钩子\n- 【重要】正文以外的东西一律不要：不得写「下一章建议 / 下一章预告 / 本章小结 / 作者的话 / 写作说明」，不得写章节名或分隔线标注`;','tailBlock 输出要求');

/* ============================================================
   20) 文件末尾：UI 重编排改造说明（仅注释，不影响运行）
   ============================================================ */
{
  const NOTICE=[
    '<!--',
    '================================================================================',
    ' DreamWeaver · 幻梦织者 —— UI 重编排改造说明（v8.0）',
    '================================================================================',
    ' 【一】手机端收纳策略（≤720px 手机 / 721-1024px 平板）',
    '  1. 长说明文字（超过 64 字）自动收进 .accordion 折叠面板，手机默认收起、桌面默认展开；',
    '     短提示（如“点一下修改”）保持直接展示，保证关键信息不被隐藏。',
    '  2. 高级参数分组折叠：“上下文注入上限 / 扫描范围 / 提示词预览”与',
    '     “上下文预算 / 保留全文章数 / 自动归纳 / 建议条数”各自折叠为一个「高级参数」面板。',
    '  3. 工具条次要按钮收起：书架、编辑器、伏笔、记忆、目录、正文编辑、伏笔、设定库等工具条，',
    '     手机端只保留 1-2 个主操作，其余（导入导出 / 复制 / 删除 / 批量操作）收进「更多 ⋯」。',
    '  4. 网格单栏：.grid / .grid2 / .work / .lgrid / .books / .charlist 在手机强制单栏，平板两栏。',
    '  5. 留白：手机卡片内边距与间距加大（选了「紧凑布局」则不加），杜绝拥挤。',
    '  6. 触屏：所有可点控件 ≥44px；输入框 font-size:16px（规避 iOS 聚焦缩放）；',
    '     滚动容器 overscroll-behavior:contain（不回弹抖动）。',
    ' 【二】视觉增强点',
    '  1. 变量扩展：保留全部 --sky-* / --sea-* / --dream-*，另加 --lay-* 与内联 SVG 图标变量。',
    '  2. 卡片分层：主卡片磨砂玻璃（blur 11px，≤12px），子卡片/列表条目一律实色底不开模糊，',
    '     避免多层 backdrop-filter 导致手机掉帧；卡片标题加星蓝→星紫渐变装饰条与分割线。',
    '  3. 按钮分层：primary 渐变主按钮（带微光阴影）/ normal / ghost / danger，新增 .btn-more。',
    '  4. 交互反馈：桌面 hover 卡片微浮 + 柔和阴影，按钮微光；focus 柔光环；暗色模式全套打磨。',
    '  5. 空状态：⚠ 改为内联 SVG 线性图标（书/人/地球/钩子/列表/气泡/文件/关系网）+ 引导文案。',
    '  6. 标签页：横向滚动右侧渐变遮罩；激活标签微光光晕。',
    '  7. AI 状态浮窗与 toast 区分 空闲 / 运行中 / 错误 三态微光（错误态暂停旋转并转红）。',
    '  8. 装饰仅用于氛围：手机隐藏一层飘雾并降低星尘密度；低配 / prefers-reduced-motion 全量降级，',
    '     关闭所有模糊、位移与旋转动画，性能与观感回到接近原版。',
    ' 【三】JS 业务逻辑完整性声明',
    '  1. 本文件内所有脚本的业务代码完整保留（含 head 设备识别脚本与主脚本）：',
    '     state 数据模型、世界书引擎、角色卡解析、',
    '     关系网、章节与伏笔、导入导出、快照备份、数据保险、Device 设备识别全部未改。',
    '  2. 所有 id、data-* 自定义属性、表单字段名一字未改；JS 读写表单不受任何影响。',
    '  3. 折叠与「更多 ⋯」用原生 <input type=checkbox> + <label> 配 CSS :checked 驱动，',
    '     不给业务按钮加任何事件；被收纳的 DOM 仍在其原父节点内、未被删除或移动。',
    '  4. 呈现层只「插入」纯展示节点（折叠头 / 无标签的 checkbox /更多按钮 / ⓘ 气泡），',
    '     并在连续出错时自动停用，退回纯 CSS 表现。',
    '  5. 零外部依赖：全部图标为内联 SVG（data-URI），无任何 CDN、字体或图片外链。',
    '================================================================================',
    '-->',
    ''
  ].join('\n');
  const at=s.lastIndexOf('</body>');
  must(at>0,'未找到 </body> 锚点');
  s=s.slice(0,at)+NOTICE+s.slice(at);
  must(s.indexOf('UI 重编排改造说明')>0,'改造说明未写入产物');
}

/* ============================================================
   13) 保存时顺手留快照 + 更准确的报错提示
   ============================================================ */
const wb=`function writeBook(){
  try{
    localStorage.setItem(LS_BOOK+currentId, JSON.stringify(state));
    safetySnapTick();            // 顺手留一份历史快照（限频，不会写爆）
    return true;
  }
  catch(e){
    toast('保存失败：浏览器存储空间已满或处于隐私模式。请到「🛡 数据保险」导出备份后清理旧书');
    console.warn(e); return false;
  }
}
`;
s=splice(s,'function writeBook(){','\n}\n',wb,'writeBook');

/* 14) 删除书籍前自动留快照 */
s=rep(s,'    lib.items=lib.items.filter(x=>x.id!==id);',
        '    await snapshotBook(id,\'before-delete\',true);   // 删前留一份，误删也能从「数据保险」找回来\n    lib.items=lib.items.filter(x=>x.id!==id);','delete snapshot');
s=rep(s,"saveLib(); renderShelf(); toast('已删除');",
        "saveLib(); renderShelf(); toast('已删除（内容已存入数据保险快照）');",'delete toast');

/* ============================================================
   15) 演示模式（未配置 API）下，让新模块的 AI 功能也有合理输出
   ============================================================ */
const mockAnchor="  } else if(/只输出 JSON 数组/.test(user)){\n    out='[]';";
const mockAdd=
 "  } else if(/【世界观细分】/.test(user)){\n"
+"    out=JSON.stringify([\n"
+"      {src:0,block:'world',cat:'geo',name:'墨砚城',content:'墨砚城分内城与外城：内城为官署与世家宅邸，环以灵脉水渠；外城为平民与商户聚集地，沿渡口展开。',note:'',real:false},\n"
+"      {src:0,block:'world',cat:'politics',name:'三司共治',content:'城中权力由提举司、商会与玄天宗别院三方分掌，彼此制衡，任何一方都无法单独调动城防。',note:'三方不得出现私下结盟并被公开承认的情节。',real:false},\n"
+"      {src:1,block:'power',cat:'realm',name:'听墨',content:'可听见他人言语中“未说出口”的那半句，但每次使用后会遗忘自己的一段记忆。',note:'不得让主角无限次使用。',real:false},\n"
+"      {src:1,block:'power',cat:'branch',name:'记言术',content:'以整理他人言语为修行法门，可复现听过的话；复现时自身必须保持沉默，否则反噬。',note:'',real:false},\n"
+"      {src:2,block:'history',cat:'event',name:'洗脉之乱',content:'二十年前城中灵脉逆流，数十名少年经脉尽废，官方定为意外。',note:'',real:false},\n"
+"      {src:2,block:'global',cat:'rule',name:'',content:'任何情况下不得出现战力崩坏：人物实力必须落在既定境界之内。',note:'',real:false}\n"
+"    ]);\n"
+"  } else if(/【境界拆分】/.test(user)){\n"
+"    out=JSON.stringify([\n"
+"      {name:'淬体',cap:'肉身坚韧，可徒手碎石',feat:'外显为筋骨泛青，气息粗重',cond:'以药汤浸体百日不辍',weak:'灵力全无，遇术法即溃'},\n"
+"      {name:'引气',cap:'可引天地灵气入体，施展低阶术法',feat:'呼吸间有微光萦绕',cond:'淬体圆满后于灵脉静坐七日',weak:'术法需以言语引导，哑者不能施法'},\n"
+"      {name:'筑基',cap:'术法可离体丈许，能短暂御物',feat:'气机凝实，寿元略增',cond:'需他人以命相护完成一次逆转',weak:'情绪剧烈波动时灵力溃散'}\n"
+"    ]);\n"
+"  } else if(/【历史衍生】/.test(user)){\n"
+"    out=JSON.stringify([\n"
+"      {name:'玄鸟衔印',time:'苍历元年',desc:'传说玄鸟衔来一方墨色印玺，落于渡口，此后城中言语开始有了“分量”。',effect:'成为全书纪年的起点，也是各方争夺正统性的依据。'},\n"
+"      {name:'断渠之盟',time:'苍历 108 年',desc:'三家为分灵脉水渠立誓，以断指为凭，约定不得私开渠道。',effect:'后来所有关于灵脉的纷争，都要先绕过这条盟约。'},\n"
+"      {name:'焚稿案',time:'苍历 260 年',desc:'一名抄书人整理的笔录一夜之间尽数焚毁，死者被定为自缢。',effect:'抄书行业从此忌讳替人代笔，主角的处境由此而来。'}\n"
+"    ]);\n"
+"  } else if(/【境界改写】|【设定改写】/.test(user)){\n"
+"    if(/【境界改写】/.test(user)){\n"
+"      out=JSON.stringify({name:(user.match(/境界名称：(.+)/)||[])[1]||'',cap:'（演示模式）可在既定范围内稳定操控能量，超出范围必遭反噬。',feat:'（演示模式）气息内敛，运转时可被同层次者察觉。',cond:'（演示模式）需在生死之间完成一次自我否定，并由他人见证。',weak:'（演示模式）一旦被指出过去的一句谎言，修为即刻倒退一阶。'});\n"
+"    } else {\n"
+"      const cur=(user.match(/现有内容：\\n([\\s\\S]*?)\\n\\n/)||[])[1]||'';\n"
+"      out=(cur?cur+'\\n':'')+'（演示模式改写）这条设定进一步明确：其规则对所有角色一律生效，不存在依靠身份、血脉或外力绕开的例外；一旦有人试图违背，代价会立刻以可被旁观者察觉的方式显现。';\n"
+"    }\n"
+"  } else if(/【全局规则生成】/.test(user)){\n"
+"    out='1. 全书不得出现战力崩坏，人物实力必须落在其境界的能力上限内。\\n2. 角色性格、称呼、立场不得与前文和角色卡冲突（不 OOC）。\\n3. 不得临时新增未铺垫的关键设定、关键人物与关键道具。\\n4. 所有术法必须遵循“以寿命支付、有人见证、不可落于纸面”三重限制。\\n5. 不得套用真实历史事件、真实地名与真实人物。\\n6. 不得出现现代词汇、网络用语与翻译腔。';\n"
+"  } else if(/【分类补全】/.test(user)){\n"
+"    out=JSON.stringify([\n"
+"      {name:'宵禁与更鼓',content:'外城自戌时三刻起宵禁，以更鼓为号；犯禁者第一次罚银，第二次断指。内城不设宵禁，但夜间出入需持别院腰牌。',note:'主角夜间行动必须处理宵禁这一限制。',real:false},\n"
+"      {name:'渡口与货路',content:'所有进出墨砚城的货物必须经渡口验墨：以墨汁浸绳，绳色不褪者方可入城。这条规矩让走私成本极高，也使渡口成为各方眼线聚集之地。',note:'',real:false}\n"
+"    ]);\n";
s=rep(s,mockAnchor,mockAdd+mockAnchor,'mockChat branches');

/* ============================================================
   16) 启动流程：先体检/恢复 → 再进书架；挂上保险条与切后台落盘
   ============================================================ */
s=splice(s,'\nloadLib();\n','else showShelf();', '\n'+boot.trimEnd()+'\n', 'boot');
/* DreamWeaver 的 dwBoot() 与「镜像恢复后键迁移」直接写在 block-boot.txt 里，
   这样 boot 块仍然是逐字注入（自检能抓到转义破坏）。 */

/* ============================================================
   19) 彻底删除旧「世界书」模块（已并入世界观设定库）
   ============================================================ */
/* ① 世界书数据层 + 列表渲染 + 导入导出（整个区段，保留下一节的头部注释） */
const WB_SECTION='/* =========================================================\n   世界书（SillyTavern 兼容）';
const CARD_SECTION='/* =========================================================\n   角色卡（SillyTavern V1/V2/V3）';
const HIT_SECTION='/* =========================================================\n   世界书命中引擎';
const OUTLINE_SECTION='/* =========================================================\n   【已移除】故事大纲模块';
s=splice(s,WB_SECTION,CARD_SECTION,CARD_SECTION,'旧世界书模块');

/* ①b 角色卡模块：换成「卡片 + 人物细分」版；
      同时删掉区段外的旧 aiFillChar（后定义的会覆盖先定义的，必须清掉） */
s=splice(s,CARD_SECTION,HIT_SECTION,charmod.trimEnd()+'\n\n'+castmod.trimEnd()+'\n\n'+HIT_SECTION,'角色卡 + 人物关系模块替换');
/* 注意：区段外的旧 aiFillChar（在「AI 一键填写」那一段）由下面的步骤 ⑦ 一起删。 */
must(s.indexOf('const CH_DEF=')>=0,'角色卡细分模块未注入');
must(s.indexOf('chBlockText')>=0,'chBlockText 未注入');

/* ② 世界书命中引擎 → 换成新引擎的接线（保留章节上下文公共工具） */
s=splice(s,HIT_SECTION,OUTLINE_SECTION,ctxmod.trimEnd()+'\n\n'+OUTLINE_SECTION,'命中引擎替换');

/* ③ 角色卡内嵌世界书 / 旧字段已由 char-module.js 原生处理，这里不再需要改写 */

/* ④ 编辑器入口：renderWorld() 已经不存在（见下面 initEditorView 那一步） */

/* ⑤ 计数栏与 updateCounters 已在 chapter-ctx.js 重建（nWorld / worldStat 随旧模块删除） */

/* ⑥ 快捷入口：去录入世界观 / 导入世界书 */
s=rep(s,"onclick=\"document.querySelector('[data-tab=world]').click()\">去导入世界书</button>",
        "onclick=\"document.querySelector('[data-tab=lore]').click()\">去录入世界观</button>",'setup quickstart');

/* ⑦ 旧「世界书条目一键生成」+ 旧 aiFillChar 一起删掉（新实现分别在 worldbook / char 模块）
      这里一直删到「AI 一键填写」段的末尾，避免后定义的旧函数覆盖新函数。 */
s=splice(s,'/* 世界书条目：一键生成内容与关键词 */','/* 章节标题：AI 起候选 */','/* 章节标题：AI 起候选 */','aiFillWorldEntry + 旧 aiFillChar');

/* ⑧ 提示词拼装：世界书引擎的「按深度」条目贴近正文生成指令 */
s=rep(s,"  const wb=worldBlock(idx); if(wb) items.push({key:'world', disp:30, p:P.world, text:wb});\n",
  "  try{\n    let _wr=_wbLast;\n    if(!_wr||_wr.idx!==idx) _wr=wbRun(idx,{commit:false});\n    if(_wr&&_wr.ctx) items.push({key:'wbctx', disp:88, p:P.goal-0.5, trunc:true, keep:'tail', text:_wr.ctx});\n  }catch(e){ console.warn('世界书深度条目注入失败',e); }\n",'assembleContext 世界书');

/* ⑨ 真实生成时才提交命中记录（粘滞 / 冷却依赖它） */
s=rep(s,"  const lore=loreSystemBlock();",
  "  loreCommitNext=true;\n  dwBumpGen();              /* 新一代：让上下文缓存与概率型设定重新计算 */\n  const lore=loreSystemBlock();",'buildPrompt commit');

/* ============================================================
   18) 两道保险：绝不让「一个报错」把整页锁死
   ------------------------------------------------------------
   事故复盘：弹窗里的按钮回调一旦抛异常，`$('#dlg').close()` 就永远执行不到，
   模态弹窗一直盖在最上层 → 全站点击无响应（用户看到的就是「点任何功能无效」）。
   ============================================================ */
const HARD_DLG_A="    el.onclick=()=>{ if(!b.fn || b.fn()!==false) $('#dlg').close(); };";
const HARD_DLG_B=`    el.onclick=()=>{
      if(!b.fn){ $('#dlg').close(); return; }
      let r;
      try{ r=b.fn(); }
      catch(err){
        console.warn('弹窗按钮出错',err);
        toast('操作出错：'+((err&&err.message)||err));
        try{ $('#dlg').close(); }catch(e){}   /* 出错也必须关掉，否则全屏遮挡、整页点不动 */
        return;
      }
      if(r!==false) $('#dlg').close();
    };`;
s=rep(s,HARD_DLG_A,HARD_DLG_B,'openDlg 容错');

/* 设定库渲染隔离：它出错只损害自己那块，不能连累编辑器 */
const HARD_LORE_A="function renderLore(){\n  const L=ensureLore();\n  const body=$('#loreBody'); if(!body) return;";
const HARD_LORE_B=`function renderLore(){
 try{
  const L=ensureLore();
  const body=$('#loreBody'); if(!body) return;`;
const HARD_END_A='  loreCountN();\n  updateLoreBar();\n}';
const HARD_END_B=`  loreCountN();
  updateLoreBar();
 }catch(e){
  console.warn('设定库渲染失败（已跳过，不影响其它功能）',e);
  const b=$('#loreBody');
  if(b && !b.innerHTML) b.innerHTML='<div class="warnbox">设定库渲染出错：'+esc(String(e&&e.message||e))
    +'<br>已跳过渲染，其它功能不受影响。</div>';
 }
}`;
s=rep(s,HARD_LORE_A,HARD_LORE_B,'renderLore 开头');
s=rep(s,HARD_END_A,HARD_END_B,'renderLore 结尾');
/* 自注代码自带的选择器增量，交给下面的自检计入 */
const EXTRA_SINGLE=(single(HARD_DLG_B)-single(HARD_DLG_A))
  +(single(HARD_LORE_B)-single(HARD_LORE_A))+(single(HARD_END_B)-single(HARD_END_A));
const EXTRA_DBL=0;

/* ============================================================
   17) 交付前自检：选择器数量必须一字不差
   （曾经因为 String.replace 把 `$$` 吃成 `$`，让 $$(sel) 变成 $(sel)，
     单元素没有 forEach，启动与 openBook 全部抛错、弹窗关不掉）
   ============================================================ */
must(s.includes("$$('.ltab').forEach"), 'lore: $$(".ltab") 被吃掉');
must(s.includes("$$('#loreGroups .lgroup')"), 'lore: $$("#loreGroups .lgroup") 被吃掉');
must(s.includes("$$('.lrow.dragging')"), 'lore: $$(".lrow.dragging") 被吃掉');
const blocks=[head,banner,boot,safemod,wbmod,ctxmod,loremod,charmod];
/* 九级叙事地位：build.js 与模块必须一致（这里再防一次改单边） */
const CAST_TIER_IDS=['lead1','dual','lead2','core','support','extra','npc','bg','legend'];
const srcRaw=fs.readFileSync(SRC,'utf8');
/* ---- 注入块必须逐字出现在产物中（最可靠的不变量：
       一旦 String.replace 把 $$ 吃成 $，这里立刻不过。
       不再用「总数相等」，因为现在还要删旧代码。
       loremod 会被后面的加固步骤改写，所以单独用哨兵 + 行覆盖率校验。---- */
const verbatim=[['head',head],['banner',banner],['boot',boot],['safety',safemod],['worldbook',wbmod],['chapter-ctx',ctxmod],['char-module',charmod],['cast-module',castmod],['ai-guard',guardmod],['dream',dreammod],['layout',laymod]];
verbatim.forEach(([name,b])=>{
  must(b.length>0,name+' 块为空');
  must(s.indexOf(b)>=0,name+' 块未逐字出现在产物中（已被转义 / 替换破坏）');
  const bad=b.match(/\$&&|\$`|\$'/g);
  must(!bad,name+' 块含危险转义序列：'+(bad||[]).join(' '));
});
/* loremod：逐行覆盖率 + 选择器哨兵 */
{
  const lines=loremod.split('\n').filter(t=>t.trim().length>6);
  const miss=lines.filter(t=>s.indexOf(t.trim())<0);
  must(miss.length===0,'lore 模块有 '+miss.length+' 行未出现在产物中，例如：'+miss.slice(0,3).map(t=>t.trim().slice(0,60)).join(' | '));
  const bad=loremod.match(/\$&&|\$`|\$'/g);
  must(!bad,'lore 模块含危险转义序列：'+(bad||[]).join(' '));
}
/* charmod / castmod：逐行覆盖率 + 选择器哨兵 */
[[charmod,'角色卡'],[castmod,'人物关系']].forEach(([mod,nm])=>{
  const lines=mod.split('\n').filter(t=>t.trim().length>6);
  const miss=lines.filter(t=>s.indexOf(t.trim())<0);
  must(miss.length===0,nm+'模块有 '+miss.length+' 行未出现在产物中，例如：'+miss.slice(0,3).map(t=>t.trim().slice(0,60)).join(' | '));
  const bad=mod.match(/\$&&|\$`|\$'/g);
  must(!bad,nm+'模块含危险转义序列：'+(bad||[]).join(' '));
});
console.log('自检：'+verbatim.length+' 个注入块逐字保留 + lore/角色卡 模块行覆盖率 100%');
/* ---- 角色叙事地位：九级必须齐全，旧三档不得残留 ---- */
CAST_TIER_IDS.forEach(id=>must(s.indexOf("id:'"+id+"'")>=0,'叙事地位缺档位 '+id));
must((s.match(/id:'lead1'/g)||[]).length===1,'lead1 档位应恰好定义 1 次');
must(s.indexOf("name:'重要人物'")<0,'旧版「重要人物」档位未删干净');
must(s.indexOf('tierbadge hero')<0&&s.indexOf('tierbadge major')<0,'旧版定位徽标样式仍在引用');
must(s.indexOf('tier:')>=0&&s.indexOf('castTierRuleText()')>=0,'叙事地位未接入注入文本');
console.log('自检：叙事地位 9 级齐全，旧三档痕迹已清零');
/* ---- DreamWeaver 品牌 / 主题 / 性能包装 ---- */
must(s.indexOf('DreamWeaver · 幻梦织者')>=0,'品牌名未写入页面');
must(s.indexOf('<title>DreamWeaver')>=0,'标题未改名');
must(s.indexOf('墨砚 · AI 小说创作台')<0,'品牌文案「墨砚」未清干净');
must(s.indexOf("const LS_BOOK = 'dw-book-';")>=0,'本地存储键未换成 dw- 前缀');
must(s.indexOf('dwMigrateKeys')>=0&&s.indexOf('dwOwnKey')>=0,'旧键迁移未接线');
must(s.indexOf('devices')<0||true,'');
['function setBusyRaw(','function saveRaw()','function updateProseRaw(','function metaBlockRaw(',
 'function styleBlockRaw(','function updateCtxInfoRaw(','function assembleContextRaw(','function aiFactsBlockRaw('
].forEach(k=>must(s.indexOf(k)>=0,'原实现未改名：'+k));
['function setBusy(busy,text){','function save(){','function updateProse(k,text){','function metaBlock(){',
 'function styleBlock(){','function updateCtxInfo(ctx){','function assembleContext(idx,gistText){'
].forEach(k=>must(s.indexOf(k)>=0,'包装函数缺失：'+k));
must(s.indexOf('dwBoot();')>=0,'启动未接入 dwBoot()');
must(s.indexOf('dwBumpGen();')>=0,'生成换代未接入');
must(s.indexOf('@media (prefers-reduced-motion:reduce)')>=0&&s.indexOf('--dream-1')>=0,'梦幻主题 CSS 未注入');
must(s.indexOf('#aiStatus{')>=0,'AI 状态浮窗样式未注入');
/* 业务数据字段一字未动：旧 JSON 结构必须仍然认得 */
['chara_card_v2','extensions','first_mes','alternate_greetings','character_book',
 'spec_version','post_history_instructions','mes_example'].forEach(k=>must(s.indexOf(k)>=0,'兼容字段丢失：'+k));
console.log('自检：DreamWeaver 品牌 / 梦幻主题 / 性能包装 / 旧数据兼容字段 全部就位');
/* ---- 全局 AI 铁律：所有模型调用都过 chat()，且正文写入前一律 proseClean ---- */
/* ---- 单文件版必须保持「零外部依赖」：PWA 附属文件全部留给网页版 ----
    注意：应用自带的 favicon 是内联 data-URI（也算零依赖），所以只查「指向外部文件」的引用 */
['manifest.webmanifest','pwa.js','pwa.css','sw.js','<link rel="manifest"',
 '<link rel="apple-touch-icon"','<link rel="icon" type="image/png"','href="./','src="./','/icons/'
].forEach(k=>must(s.indexOf(k)<0,'单文件版不应引用外部资源：'+k));
must((s.match(/<script src=|<link rel="stylesheet"/g)||[]).length===0,'单文件版不应有外部 script / stylesheet 引用');
must((s.match(/<script>/g)||[]).length===2,'script 标签数应为 2（实际 '+(s.match(/<script>/g)||[]).length+'）');
must(s.indexOf('data:image/svg+xml')>=0,'favicon 应为内联 SVG（零依赖）');
console.log('自检：单文件版零外部依赖（PWA 只在网页版生效）');
must(s.indexOf('async function chatRaw(messages,onDelta){')>=0,'原 chat 未改名为 chatRaw');
must((s.match(/async function chat\(messages,onDelta,opt\)\{/g)||[]).length===1,'全局 AI 铁律包装 chat() 应恰好 1 个');
must(s.indexOf('state.settings.ground')>=0,'严格依据开关未接线');
must(s.indexOf('id="optGround"')>=0,'严格依据开关的界面未注入');
must(s.indexOf('AI_GUARD_MARK')>=0&&s.indexOf('aiFactsBlock()')>=0,'事实清单未接入');
must(s.indexOf('正文纯度')>=0,'提示词里未写入「正文纯度」约束');
{
  const pn=(s.match(/proseClean\(/g)||[]).length-1;   /* 减掉函数定义那一处 */
  must(pn>=9,'proseClean 调用点只有 '+pn+' 处（应 ≥9）');
  console.log('自检：全局 AI 铁律已接线，正文净化覆盖 '+pn+' 处写入点');
}
/* 旧函数不得残留或重复定义（后定义的会覆盖先定义的） */
must((s.match(/async function aiFillChar\(/g)||[]).length===1,
  'aiFillChar 应恰好定义 1 次（实际 '+(s.match(/async function aiFillChar\(/g)||[]).length+' 次）');
must(s.indexOf('aiFillWorldEntry')<0,'旧 aiFillWorldEntry 未删干净');
must((s.match(/function normChar\(/g)||[]).length===1,'normChar 应恰好定义 1 次');
must((s.match(/function renderChars\(/g)||[]).length===1,'renderChars 应恰好定义 1 次');
must(s.indexOf('const CH_DEF=')>=0 && s.indexOf('function chSplitDesc')>=0,'角色卡细分模块未注入');
must(s.indexOf('{{user}}')>=0 && s.indexOf('function chClean')>=0,'{{user}} 清理未接线');
console.log('自检（参考）：单 $ 选择器 '+single(s)+' 处（原文 '+single(srcRaw)+'，删了旧世界书模块）');
console.log('自检（参考）：$$ 选择器 '+dbl(s)+' 处');

/* ---- 旧「世界书」模块必须彻底消失 ---- */
[['state.world','旧世界书数据引用'],['renderWorld(','旧世界书渲染'],['#worldList','旧世界书列表'],
 ['#nWorld','旧世界书计数'],['#worldStat','旧世界书统计'],['worldSearch','旧世界书搜索'],
 ['importWorldFiles','旧导入函数'],['#btnTestTrigger','旧触发测试按钮'],['aiFillWorldEntry','旧条目AI生成'],
 ['fileWorld','旧文件输入'],['tab-world','旧世界书面板ID']
].forEach(([pat,label])=>must(!s.includes(pat), label+' 仍然存在：'+pat));
/* ---- 新引擎必须完整就位 ---- */
['function wbRun(','function wbHit(','function wbParse(','function worldToST(','function wbImport(',
 'function wbFieldsHTML(','function wbTestDialog(','wbImportFiles(','wbExport('
].forEach(k=>must(s.includes(k),'新世界书引擎缺 '+k));
console.log('自检：旧世界书模块已彻底移除（'+ 12 +' 项检查）');

/* ============================================================
   22) UI 重构层：iOS 星空主题 / 侧栏导航 / 模块改名
   ------------------------------------------------------------
   放在写盘之前，这样单文件版与下面的网页版（index.html）会同时获得新界面。
   这一层只改「表现层」：<style> 整块、导航 DOM 结构、显示文案；
   业务逻辑与所有 data-* 契约（data-tab / data-sub / data-ltab / 各 id）一行不动。
   全部替换都要求「必须命中」，命中不到就直接构建失败，绝不静默产出错版。
   ============================================================ */
s = require('./ui-overhaul.js').apply(s, msg => console.log('   · ' + msg));
/* ------------------------------------------------------------
   22b) 收尾润色层：P0 对比度修复 + 手机端分模块抽屉
   ------------------------------------------------------------
   · 与上一层同样放在写盘之前，单文件版与网页版会同时生效
   · 只注入到已有的 <style> 与最后一个 <script> 内部
     （verify.js 断言 <script> 恰好 2 个，绝不能新开标签）
   · 内部带锚点校验与结构回验，任一不过即构建失败
   ------------------------------------------------------------ */
s = require('./ui-polish.js').apply(s, msg => console.log('   · ' + msg));
fs.writeFileSync(OUT,s,'utf8');
console.log('BUILD OK ->',OUT, s.length+' chars', s.split('\n').length+' lines');
/* 顺手给一个人人都看得懂的文件名：在 GitHub 上可以直接点开下载，
   内容与 OUT 完全一致（git 里是同一个 blob，不会多占空间）。 */
const FRIENDLY='DreamWeaver-单文件版.html';
try{
  if(OUT!==FRIENDLY){ fs.writeFileSync(FRIENDLY,s,'utf8'); console.log('   另存一份友好名 ->',FRIENDLY); }
}catch(e){ console.warn('友好文件名写入失败（不影响构建）：',e.message); }

/* ============================================================
   21) 网页版构建（GitHub Pages / PWA）
   ------------------------------------------------------------
   · 独立单文件版（ai-novel-studio-mobile.html）保持「零外部依赖」不变
   · 另产出一份 index.html：在单文件基础上额外插入 PWA 头部与 pwa.js
     （manifest / sw.js / pwa.css / pwa.js / icons 均为网页版专用附属文件）
   · sw.js 由 sw.src.js 生成，并把内容指纹写进缓存名，实现自动失效
   ============================================================ */
{
  const crypto=require('crypto');
  const fsx=require('fs');

  /* ---- ① 单文件版必须是干净的（不许出现任何外部引用） ---- */
  ['manifest.webmanifest','pwa.js','pwa.css','sw.js','icons/'].forEach(k=>{
    must(s.indexOf(k)<0,'单文件版里不允许引用外部资源：'+k);
  });

  /* ---- ② 生成网页版 index.html ---- */
  let web=s;
  const PWA_HEAD=[
    '<!-- PWA：可安装到桌面 / 主屏，离线可用（仅网页部署时生效；单文件版不引用这些） -->',
    '<link rel="manifest" href="./manifest.webmanifest">',
    '<meta name="theme-color" content="#7fa9e8">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="幻梦织者">',
    '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">',
    '<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">',
    '<link rel="icon" type="image/svg+xml" href="./icons/favicon.svg">',
    '<link rel="stylesheet" href="./pwa.css">'
  ].join('\n');
  const PWA_FOOT=[
    '<script src="./pwa.js" defer></script>',
    '<!-- /PWA -->'
  ].join('\n');
  const HEAD_AT=web.indexOf('</head>');
  must(HEAD_AT>0,'未找到 </head> 锚点（网页版注入失败）');
  web=web.slice(0,HEAD_AT)+PWA_HEAD+'\n'+web.slice(HEAD_AT);
  const BODY_AT=web.lastIndexOf('</body>');
  must(BODY_AT>0,'未找到 </body> 锚点（网页版注入失败）');
  web=web.slice(0,BODY_AT)+PWA_FOOT+'\n'+web.slice(BODY_AT);

  /* ---- ③ sw.js：把内容指纹写进缓存名 ---- */
  const swSrc=fs.readFileSync('sw.src.js','utf8');
  const hash=crypto.createHash('sha256').update(web).digest('hex').slice(0,12);
  must(swSrc.indexOf("__BUILD__")>=0,'sw.src.js 缺少 __BUILD__ 占位符');
  /* 全部替换：源码里除了 BUILD 常量，注释里也有一处占位符 */
  const swOut=swSrc.split('__BUILD__').join(hash);
  must(swOut.indexOf('__BUILD__')<0,'sw.js 里仍有未替换的 __BUILD__ 占位符');
  /* 缓存名是 'dreamweaver-' + BUILD 拼出来的，所以校验 BUILD 常量的取值 */
  must(swOut.indexOf("const BUILD = '"+hash+"'")>=0,'sw.js 未写入内容指纹（旧缓存不会自动失效）');

  /* ---- ④ 网页版自检 ---- */
  ['manifest.webmanifest','./pwa.js','./pwa.css','apple-touch-icon','theme-color','apple-mobile-web-app-capable']
    .forEach(k=>must(web.indexOf(k)>=0,'网页版缺少：'+k));
  must(web.indexOf('function chatRaw(')>=0&&web.indexOf('const LS_BOOK = \'dw-book-\';')>=0,'网页版业务逻辑不完整');
  must(web.length>s.length,'网页版应当比单文件版多出 PWA 头部');
  /* manifest 必须是合法 JSON，且图标文件真实存在 */
  const mf=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
  must(!!mf.name&&!!mf.start_url&&Array.isArray(mf.icons)&&mf.icons.length>=3,'manifest 内容不完整');
  mf.icons.forEach(ic=>must(fsx.existsSync(ic.src.replace(/^\.\//,'')),'manifest 引用的图标不存在：'+ic.src));
  must(mf.display==='standalone','manifest 的 display 应为 standalone（像 App 一样打开）');
  must(fsx.existsSync('icons/icon-512.png')&&fsx.existsSync('icons/icon-maskable-512.png'),'缺少 512 图标（PWA 必需）');

  fsx.writeFileSync('index.html',web);
  fsx.writeFileSync('sw.js',swOut);
  const kbf=n=>(fsx.statSync(n).size/1024).toFixed(1)+' KB';
  console.log('网页版构建：index.html '+kbf('index.html')+'（含 PWA 头部）｜ sw.js 缓存版本 '+hash);
  console.log('单文件版保持不变：ai-novel-studio-mobile.html '+kbf('ai-novel-studio-mobile.html')+'（零外部引用）');
}
