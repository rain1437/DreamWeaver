/* ============================================================
   DreamWeaver —— 测试总入口
   用法：node tools/run-tests.js  （或 npm test）
   按顺序跑全部测试，汇总通过 / 失败，任一失败则退出码非 0（方便 CI 判定）
   ============================================================ */
const { execFileSync } = require('child_process');
const fs = require('fs');

/* 顺序有讲究：先构建，再跑功能测试，最后跑结构校验 */
const SUITE = [
  ['构建 + 全套自检',            'build.js'],
  ['结构规范（script/弹窗/CSS）', 'verify.js'],
  ['弹窗与移动端规范',            'verify-dialog.js'],
  ['UI 重编排（折叠/收纳/空状态）', 'test-layout.js'],
  ['品牌 / 主题 / 状态浮窗 / 性能', 'test-dream.js'],
  ['人物关系 + 叙事地位九级',      'test-cast.js'],
  ['角色卡细分结构',              'test-char.js'],
  ['世界书导入分类',              'test-classify.js'],
  ['世界观设定库',                'test-lore.js'],
  ['整库导入导出',                'test-import.js'],
  ['数据保险 / 快照',             'safety-test.js'],
  ['刷新后数据恢复',              'test-reload.js'],
  ['端到端冒烟',                  'test-smoke3.js'],
  ['示例世界书 / 成书稿',          'test-sample.js', 'test-book.js']
];

let pass = 0, fail = 0;
const failed = [];

function runOne(file) {
  const t0 = Date.now();
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [file], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, timeout: 180000
    });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = (e.status === undefined ? 'TIMEOUT' : e.status);
  }
  const ms = Date.now() - t0;
  /* 统计断言：优先看日志里的 OK/NG，其次看退出码 */
  const okN = (out.match(/^\s*(?:OK|✔)/gm) || []).length;
  const ngN = (out.match(/^\s*(?:NG|✘)/gm) || []).length;
  const good = (code === 0);
  if (good) pass++; else { fail++; failed.push(file); }
  const tail = out.trim().split('\n').filter(l => /通过|失败|OK|✘|Error/.test(l)).slice(-1)[0] || '';
  console.log(
    (good ? '  ✔ ' : '  ✘ ') + file.padEnd(20) +
    (ms / 1000).toFixed(1).padStart(6) + 's' +
    (okN ? ('  断言 ' + okN + (ngN ? (' / NG ' + ngN) : '')) : '') +
    (good ? '' : ('   ← ' + (tail || String(code)).slice(0, 90)))
  );
  if (!good) {
    const errs = out.split('\n').filter(l => /NG|Error|错误|异常/.test(l)).slice(0, 6);
    errs.forEach(l => console.log('       ' + l.trim().slice(0, 110)));
  }
  return good;
}

console.log('DreamWeaver 测试套件\n' + '='.repeat(62));
SUITE.forEach(([label, ...files]) => {
  console.log('\n▌ ' + label);
  files.forEach(f => {
    if (!fs.existsSync(f)) { console.log('  · 跳过（不存在）' + f); return; }
    runOne(f);
  });
});
console.log('\n' + '='.repeat(62));
console.log(fail === 0
  ? ('全部通过：' + pass + ' 个测试文件，0 失败 🎉')
  : ('有 ' + fail + ' 个测试文件失败：' + failed.join(', ')));
process.exit(fail === 0 ? 0 : 1);
