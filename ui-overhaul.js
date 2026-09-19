/* ============================================================================
   DreamWeaver · 幻梦织者 —— UI 重构层（iOS 星空主题 / 侧栏导航 / 模块改名）
   ----------------------------------------------------------------------------
   由 build.js 在「全部业务改造完成之后、写盘之前」调用：

       s = require('./ui-overhaul.js').apply(s, msg => console.log('   ' + msg));

   这样单文件版与网页版（index.html）会同时获得新界面。
   设计要点：
     · 只改「表现层」—— <style> 整块、导航 DOM 结构、显示文案；
       业务逻辑、data-* 契约（data-tab / data-sub / data-ltab / 各 id）一行不动
     · 所有替换都是「必须命中」的：源码一变就构建失败，绝不静默跳过
     · 出口关卡会校验标签引号闭合等 HTML 层问题（JS 语法检查覆盖不到这一层）
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const THEME_PATH = path.join(__dirname, 'ui-theme.css');

/* 改名表：显示文案 → 更贴合「AI 小说生成器」的命名。
   注意顺序有意义（后面的规则会引用前面产生的新名）。 */
const RENAMES = [
    /* 注：侧栏标题与主导航五项由 build-layout.js 生成，其改名放在 build-names.js 末道处理 */
    /* 世界树面板子页签 */
    ['🌍 世界观大类','🌍 世界百科'],
    ['📜 历史年表','📜 纪年史册'],
    ['🔒 全局约束','🔒 铁律约束'],
    /* 执笔成章面板子页签 */
    ['💬 对话出文','💬 与 AI 共创'],
    ['✎ 正文编辑','✎ 正文精修'],
    ['📖 目录阅读','📖 目录阅览'],
    ['🧠 故事记忆','🧠 记忆卷宗'],
    ['🪝 伏笔追踪','🪝 伏笔罗盘'],
    /* 章节级模块标题 */
    ['<h3>核心设定</h3>','<h3>故事基石</h3>'],
    ['<h3>这套工作流怎么保证「不跑偏」</h3>','<h3>防跑偏工作流</h3>'],
    ['<h3 style="margin-top:22px">快速开始</h3>','<h3 style="margin-top:22px">三步开始织梦</h3>'],
    ['<h3>文风预设 ','<h3>风格谱系 '],
    ['<h3>写作法则（硬性规则）</h3>','<h3>创作铁律</h3>'],
    ['<h3>章节　','<h3>章节工坊　'],
    ['<h3 style="margin-top:0">目录</h3>','<h3 style="margin-top:0">章节目录</h3>'],
    ['<h3>上下文预算与自动归纳</h3>','<h3>上下文预算 · 自动归纳</h3>'],
    ['<h3 style="margin-top:18px">下次写作实际会送出的上下文</h3>','<h3 style="margin-top:18px">下次送出的上下文</h3>'],
    ['<h3>章节摘要 ','<h3>章节脉络 '],
    ['<h3>API 设置</h3>','<h3>AI 引擎</h3>'],
    ['🛡 数据保险','🛡 数据保险库'],
    /* 角色星图九个子模块（name: 驱动子页签；其余为引用它的说明文案） */
    ['基础档案','角色档案'],
    ['外貌形象','形貌特征'],
    ['性格心理','性格内核'],
    ['说话风格','口吻腔调'],
    ['身世经历','身世履历'],
    ['能力特长','能力谱系'],
    ['目标动机','目标驱动'],
    ['专属约束','角色铁律'],
    /* 「人物关系」全局出现 38 次（含大量逻辑文案）→ 只改模块名与列表引用 */
    ["name:'人物关系'","name:'关系星图'"],
    ['能力谱系 / 人物关系 / 目标驱动 / 角色铁律','能力谱系 / 关系星图 / 目标驱动 / 角色铁律'],
    /* 与主模块名保持一致的引用文案 / 无障碍标签 / 注释 */
    ['① 作品设定','① 创世设定'],
    ['② 事实清单：作品设定','② 事实清单：创世设定'],
    ['在「作品设定」里用','在「创世设定」里用'],
    ['作品设定表单','创世设定表单'],
    ['【作品设定】','【创世设定】'],
    ['aria-label="人物关系图"','aria-label="关系星图"'],
    ['<!-- ================= 文风规则 ================= -->','<!-- ================= 文风熔炉 ================= -->'],
    ['<!-- ================= 世界观设定库（四大块） ================= -->','<!-- ================= 世界树 · 设定库 ================= -->'],
    ['<!-- ================= 角色卡 ================= -->','<!-- ================= 角色星图 ================= -->'],
    ['<!-- ================= 成文工作台 ================= -->','<!-- ================= 执笔成章 ================= -->'],
  ];

/* 侧栏导航：五项的名称（长名 / 手机端短名）。
   键为 data-tab —— 它是切换逻辑的契约，绝对不动。 */
const NAV = [
  ['setup', '①', '创世设定',     '创世'],
  ['lore',  '②', '世界树·设定库', '世界'],
  ['chars', '③', '角色星图',     '角色'],
  ['style', '④', '文风熔炉',     '文风'],
  ['write', '⑤', '执笔成章',     '成文']
];

function count(s, sub){ return s.split(sub).length - 1; }

/* 替换：必须恰好命中 1 次，否则抛错（CI 里宁可失败也不要静默产出错版） */
function rep(s, name, from, to){
  const n = count(s, from);
  if(n !== 1) throw new Error('[ui-overhaul] ' + name + ' 命中 ' + n + ' 次（应为 1）');
  return s.split(from).join(to);
}

/* ---------------- HTML 结构重排：顶部标签栏 → 侧栏 + 内容工作区 ----------------
   页签切换逻辑只依赖 .tab[data-tab] 与 #tab-x，跟 DOM 层级无关，
   所以可以安全地把 .tabs 搬进侧栏、把 5 个 panel 包进 <main>。 */
function restructure(src){
  if(src.includes('==WORKSPACE==')) return { s: src, moved: false };

  const L = src.split('\n');
  const tabsStart = L.findIndex(l => l.includes('class="tabs"'));
  if(tabsStart < 0) throw new Error('[ui-overhaul] 未找到 .tabs');

  let tabsEnd = -1;
  for(let i = tabsStart + 1; i < tabsStart + 25; i++){
    if(L[i] && L[i].trim() === '</div>'){ tabsEnd = i; break; }
  }
  if(tabsEnd < 0) throw new Error('[ui-overhaul] 未找到 .tabs 结束');
  const stCloseIdx = tabsEnd + 1;                 // </div> 关闭 .stickytop

  const VOID = new Set(['br','hr','img','input','meta','link','source','area','base','col',
    'embed','param','track','wbr','path','circle','rect','stop','use','line','polygon',
    'polyline','ellipse','defs','mask']);
  const RX = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;

  const scriptIdx = L.findIndex((l, i) => i > stCloseIdx && l.trim() === '<script>');
  function blockEnd1(start){
    let d = 0, seen = false;
    for(let i = start - 1; i < scriptIdx; i++){
      for(const m of L[i].matchAll(RX)){
        const close = m[1] === '/', tag = m[2].toLowerCase(), self = m[4] === '/';
        if(VOID.has(tag) || self) continue;
        if(!close){ d++; seen = true; } else { d--; if(seen && d === 0) return i + 1; }
      }
    }
    return -1;
  }
  const writeLine = L.findIndex(l => l.includes('id="tab-write"'));
  if(writeLine < 0) throw new Error('[ui-overhaul] 未找到 #tab-write');
  const writeEnd1 = blockEnd1(writeLine + 1);
  if(writeEnd1 < 0) throw new Error('[ui-overhaul] 未找到 #tab-write 结束');
  const setupIdx = L.findIndex(l => l.includes('id="tab-setup"'));
  if(setupIdx < 0) throw new Error('[ui-overhaul] 未找到 #tab-setup');

  /* 边界断言：任何一条不符就中止，绝不盲改 */
  const checks = [
    ['tabs 起始', L[tabsStart].trim().startsWith('<div class="tabs"')],
    ['tabs 结束', L[tabsEnd].trim() === '</div>'],
    ['stickytop 关闭', L[stCloseIdx].trim() === '</div>'],
    ['tab-write 结束', L[writeEnd1 - 1].trim() === '</section>'],
    ['tabs 在 panels 之前', tabsStart < setupIdx]
  ];
  checks.forEach(([n, ok]) => { if(!ok) throw new Error('[ui-overhaul] 断言失败: ' + n); });

  const navLines = [
    '    <!-- ==WORKSPACE== 侧栏 + 内容工作区（仅重排布局；.tab[data-tab] / .panel 契约原样保留）-->',
    '    <div class="workspace">',
    '      <aside class="sidenav">',
    '        <div class="sidenav-h">织梦流程</div>',
    '        <nav class="tabs" aria-label="织梦流程">'
  ].concat(NAV.map(([tab, num, long, short], i) => {
    const badge = (tab === 'lore' || tab === 'chars' || tab === 'write')
      ? '<span class="n" id="n' + (tab === 'lore' ? 'Lore' : tab === 'chars' ? 'Chars' : 'Write') + '"></span>'
      : '';
    return '          <button class="tab' + (i === 0 ? ' active' : '') + '" data-tab="' + tab + '">'
      + '<span class="ti">' + num + '</span>'
      + '<span class="tl">' + long + '</span>'
      + '<span class="ts">' + short + '</span>' + badge + '</button>';
  })).concat([
    '        </nav>',
    '      </aside>',
    '',
    '      <main class="panels">'
  ]);

  const out = [].concat(
    L.slice(0, tabsStart),
    [L[stCloseIdx]],
    navLines,
    L.slice(setupIdx, writeEnd1),
    ['      </main>', '    </div>'],
    L.slice(writeEnd1)
  ).join('\n');

  return { s: out, moved: true };
}

/* ---------------- 出口关卡：HTML 属性层的引号闭合校验 ----------------
   JS 语法检查（new Function）覆盖不到 HTML 标签内部，
   历史上就因为一个未闭合的属性引号吃掉过整个 <style> 开标签。 */
function gate(src){
  const lines = src.split('\n');
  let inBlock = false;
  for(let i = 0; i < lines.length; i++){
    const t = lines[i].trim();
    if(t === '<style>'   || t === '<script>'){  inBlock = true;  lines[i] = ''; continue; }
    if(t === '</style>'  || t === '</script>'){ inBlock = false; lines[i] = ''; continue; }
    if(inBlock) lines[i] = '';
  }
  const bad = [];
  lines.forEach((l, li) => {
    const re = /<[a-zA-Z\/!][^>]*>/g; let m;
    while((m = re.exec(l))){
      if(((m[0].match(/"/g) || []).length % 2) !== 0) bad.push('行' + (li + 1) + ': ' + m[0].slice(0, 90));
    }
  });
  if(bad.length) throw new Error('[ui-overhaul] 标签引号不闭合：\n' + bad.join('\n'));

  [['<!DOCTYPE html>'], ['</html>'], ['</body>'], ['<title>']].forEach(([k]) => {
    if(!src.includes(k)) throw new Error('[ui-overhaul] 缺少关键结构：' + k);
  });
  if(count(src, '<style>')  !== 1) throw new Error('[ui-overhaul] <style> 数量异常');
  if(count(src, '<script>') !== 2) throw new Error('[ui-overhaul] <script> 数量异常');
  /* 导航契约 */
  NAV.forEach(([tab]) => {
    if(!src.includes('data-tab="' + tab + '"')) throw new Error('[ui-overhaul] 导航项丢失：' + tab);
  });
  ['nLore', 'nChars', 'nWrite'].forEach(id => {
    if(!src.includes('id="' + id + '"')) throw new Error('[ui-overhaul] 计数徽标丢失：' + id);
  });
}

function apply(html, msg){
  const log = typeof msg === 'function' ? msg : (() => {});
  const theme = fs.readFileSync(THEME_PATH, 'utf8');
  let s = html;

  /* ① 样式：整块替换 */
  {
    const L = s.split('\n');
    const i = L.findIndex(l => l.trim() === '<style>');
    const j = L.findIndex(l => l.trim() === '</style>');
    if(i < 0 || j < 0 || j < i) throw new Error('[ui-overhaul] <style> 定位失败');
    const before = j - i - 1;
    s = L.slice(0, i + 1).concat(theme.split('\n')).concat(L.slice(j)).join('\n');
    log('样式块替换：' + before + ' 行 → ' + theme.split('\n').length + ' 行');
  }

  /* ② 头部 meta */
  s = rep(s, 'meta color-scheme',
    '<meta name="color-scheme" content="light" />',
    '<meta name="color-scheme" content="light dark" />');

  /* ③ favicon：换成深空月相 + 星点 */
  {
    const re = /<link rel="icon" href="data:image\/svg\+xml,[^"]*">/;
    if(!re.test(s)) throw new Error('[ui-overhaul] favicon link 未找到');
    s = s.replace(re,
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E'
      + "%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230b1226'/%3E%3Cstop offset='1' stop-color='%2322346e'/%3E%3C/linearGradient%3E"
      + "%3Cmask id='m'%3E%3Crect width='32' height='32' fill='%23fff'/%3E%3Ccircle cx='24' cy='9' r='5.4' fill='%23000'/%3E%3C/mask%3E%3C/defs%3E"
      + "%3Crect width='32' height='32' rx='8' fill='url(%23g)'/%3E"
      + "%3Ccircle cx='20' cy='13' r='6' fill='%23eaf2ff' mask='url(%23m)'/%3E"
      + "%3Ccircle cx='10' cy='7' r='1' fill='%23fff'/%3E%3Ccircle cx='15' cy='22' r='.9' fill='%238fc0ff'/%3E%3Ccircle cx='6' cy='17' r='.8' fill='%23fff'/%3E"
      + '%3C/svg%3E">');
    const m = s.match(/<link rel="icon"[^>]*>/);
    if(!m) throw new Error('[ui-overhaul] favicon link 丢失');
    if((m[0].match(/"/g) || []).length % 2 !== 0) throw new Error('[ui-overhaul] favicon 属性引号不闭合');
  }

  /* ④ 背景注释 */
  s = rep(s, '背景注释',
    '<!-- 背景画：晴空 · 阳光 · 海浪 -->',
    '<!-- 背景画：星空 · 星云 · 月（.art/.sky/.sun/.wave 结构保持不变）-->');

  /* ⑤ JS 里的品牌 favicon */
  {
    const A = "const DW_FAVICON='data:image/svg+xml,'+encodeURIComponent(";
    const B = 'const DW_LOGO_SVG=';
    const i = s.indexOf(A), j = s.indexOf(B, i);
    if(i < 0 || j < 0) throw new Error('[ui-overhaul] DW_FAVICON 区块定位失败');
    const block = [
      A,
      "  \"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>\"+",
      "  \"<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\"+",
      "  \"<stop offset='0' stop-color='#0b1226'/><stop offset='1' stop-color='#22346e'/></linearGradient>\"+",
      "  \"<mask id='m'><rect width='64' height='64' fill='#fff'/>\"+",
      "  \"<circle cx='48' cy='17' r='10.5' fill='#000'/></mask></defs>\"+",
      "  \"<rect width='64' height='64' rx='16' fill='url(#g)'/>\"+",
      "  \"<circle cx='41' cy='25' r='11.5' fill='#eaf2ff' mask='url(#m)'/>\"+",
      "  \"<circle cx='20' cy='15' r='1.7' fill='#ffffff'/><circle cx='30' cy='44' r='1.4' fill='#8fc0ff'/>\"+",
      "  \"<circle cx='13' cy='34' r='1.2' fill='#ffffff'/><circle cx='50' cy='45' r='1.3' fill='#c9b4ff'/>\"+",
      "  \"</svg>\");",
      ''
    ].join('\n') + '\n';
    s = s.slice(0, i) + block + s.slice(j);
    log('品牌 favicon → 深空月相 + 星点');
  }

  /* ⑥ 外观默认值：星夜 + 关闭标签箭头 */
  s = rep(s, 'dwLook 默认值',
    "const dwLook={ theme:'auto', density:'cozy', deco:'on', status:true, tips:true, kb:true, arrows:true };",
    "const dwLook={ theme:'dark', density:'cozy', deco:'on', status:true, tips:true, kb:true, arrows:false };");

  /* ⑦ 主题选项文案 */
  s = rep(s, '主题选项文案',
    "[['auto','跟随系统'],['light','白昼梦'],['dark','夜空梦']]",
    "[['auto','跟随系统'],['light','幻昼'],['dark','星夜']]");

  /* ⑧ 箭头开关说明 */
  s = rep(s, '箭头开关文案',
    "+sw('arrows',dwLook.arrows,'标签栏左右箭头','提示标签可以左右滑动')",
    "+sw('arrows',dwLook.arrows,'标签栏左右箭头','默认关闭；开启后横向标签栏会显示左右滑动按钮')");

  /* ⑨ applyLook 写入 data-arrows（CSS 兜底隐藏 .xsnap 依赖它） */
  s = rep(s, 'applyLook 写入 data-arrows',
    "  root.dataset.deco=(dwLook.deco==='off'||low)?'off':'on';",
    "  root.dataset.deco=(dwLook.deco==='off'||low)?'off':'on';\n"
    + "  root.dataset.arrows=dwLook.arrows?'1':'0';\n"
    + "  try{ if(dwLook.arrows&&typeof dwSyncArrows==='function') dwSyncArrows(); }catch(_){}");

  /* ⑩ 状态浮窗：取消启动时的「就绪」浮现 */
  s = rep(s, '移除启动就绪浮窗',
    "if(dwLook.status){ aiStatusShow('就绪','有 AI 任务时这里会显示进度'); setTimeout(()=>aiStatusHide(),1500); }",
    "/* 状态浮窗只在 AI 任务进行中出现：启动时不再弹「就绪」，也不长期驻留 */");

  /* ⑪ 状态浮窗：久驻自动收纳成小圆点，避免长期遮挡视线 */
  s = rep(s, 'aiStatus 久驻收纳',
    "  clearTimeout(_asTimer);\n"
    + "  _asTimer=setTimeout(()=>{ try{\n"
    + "    const m2=el.querySelector('.as-main');\n"
    + "    if(m2&&_asOn&&text) m2.textContent=text+'（还在继续，可放心切页）';\n"
    + "  }catch(e){} },12000);\n"
    + "}\n"
    + "function aiStatusHide(immediate){\n"
    + "  clearTimeout(_asTimer);\n"
    + "  try{ document.body.dataset.ai='idle'; }catch(e){}\n"
    + "  if(!_asOn){ if(immediate&&_asEl) _asEl.hidden=true; return; }\n"
    + "  _asOn=false;\n"
    + "  const el=_asEl; if(!el) return;\n"
    + "  el.classList.remove('on');",
    "  try{ el.classList.remove('mini'); }catch(e){}\n"
    + "  clearTimeout(_asTimer);\n"
    + "  /* 只在 AI 任务进行中出现；久驻后自动收纳成小圆点，避免长期遮挡视线（任务照常继续） */\n"
    + "  _asTimer=setTimeout(()=>{ try{ if(_asOn) el.classList.add('mini'); }catch(e){} },8000);\n"
    + "}\n"
    + "function aiStatusHide(immediate){\n"
    + "  clearTimeout(_asTimer);\n"
    + "  try{ document.body.dataset.ai='idle'; }catch(e){}\n"
    + "  if(!_asOn){ if(immediate&&_asEl){ try{ _asEl.hidden=true; _asEl.classList.remove('mini'); }catch(e){} } return; }\n"
    + "  _asOn=false;\n"
    + "  const el=_asEl; if(!el) return;\n"
    + "  try{ el.classList.remove('mini'); }catch(e){}\n"
    + "  el.classList.remove('on');");

  /* ⑫ 外观里打开状态浮窗的反馈：自动收起，不永久停留 */
  s = rep(s, '状态浮窗开关反馈',
    "if(id==='status'&&cb.checked) aiStatusShow('状态浮窗已开启','有 AI 任务时会自动出现');",
    "if(id==='status'&&cb.checked){ aiStatusShow('状态浮窗已开启','有 AI 任务时会自动出现'); setTimeout(()=>aiStatusHide(),2200); }");

  /* ⑬ 切换页签回顶（独立监听，不触碰原有 onclick） */
  if(!s.includes('/* ==TABTOP== */')){
    const tpl = [
      '/* ==TABTOP== */ (function(){',
      '  try{',
      '    document.addEventListener("click",function(e){',
      '      var t=(e.target&&e.target.closest)?e.target.closest(".tab"):null;',
      '      if(!t) return;',
      '      try{ window.scrollTo(0,0); }catch(err){}',
      '    });',
      '  }catch(e){}',
      '})();'
    ].join('\n');
    const last = s.lastIndexOf('</script>');
    if(last < 0) throw new Error('[ui-overhaul] 未找到 </script>');
    s = s.slice(0, last) + tpl + '\n' + s.slice(last);
    log('加入「切换页签回顶」增强');
  }

  /* ⑭ 模块改名 */
  {
    let n = 0;
    for(const [from, to] of RENAMES){
      const c = count(s, from);
      if(c === 0) throw new Error('[ui-overhaul] 改名未命中：' + from.slice(0, 40));
      s = s.split(from).join(to);
      n += c;
    }
    log('模块改名：' + RENAMES.length + ' 条规则，共 ' + n + ' 处');
  }

  /* ⑮ 布局重排 */
  {
    const r = restructure(s);
    s = r.s;
    if(r.moved) log('布局重排：顶部标签栏 → 侧栏 + 内容工作区');
  }

  /* ⑯ 出口关卡 */
  gate(s);
  log('出口关卡通过：标签引号闭合 / 结构完整 / 导航契约完好');

  return s;
}

module.exports = { apply, RENAMES, NAV };
