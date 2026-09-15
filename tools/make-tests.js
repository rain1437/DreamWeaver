/* ============================================================
   DreamWeaver —— 测试文件生成器
   用法：node tools/make-tests.js   （或 npm run tests:gen）

   本项目的功能测试由两部分拼成：
     harness.js  = 公共测试脚手架（加载页面脚本、迷你 DOM、断言与日志）
     body-*.js   = 各专项测试的「测试体」
   把两者拼起来就是可执行的 test-*.js。

   这样改脚手架（例如给 __T 增加导出）只需要动 harness.js 一处，
   再重新生成即可，不必手工改十几个测试文件。
   ============================================================ */
const fs = require('fs');

if (!fs.existsSync('harness.js')) {
  console.error('找不到 harness.js —— 请在仓库根目录运行本脚本。');
  process.exit(1);
}
const harness = fs.readFileSync('harness.js', 'utf8');
const PAD = harness.endsWith('\n') ? '' : '\n';

const bodies = fs.readdirSync('.').filter(f => /^body-[a-z0-9-]+\.js$/.test(f));
if (!bodies.length) { console.log('没有找到任何 body-*.js，无需生成。'); process.exit(0); }

let n = 0;
bodies.forEach(b => {
  const name = b.replace(/^body-/, 'test-');
  const body = fs.readFileSync(b, 'utf8');
  fs.writeFileSync(name, harness + PAD + '\n' + body, 'utf8');
  console.log('  ✔ ' + b.padEnd(20) + ' → ' + name + '  (' + ((harness.length + body.length) / 1024).toFixed(1) + ' KB)');
  n++;
});

/* test-smoke3.js 没有对应 body（历史遗留，整体保存在仓库里），单独说明一下 */
if (fs.existsSync('test-smoke3.js') && !fs.existsSync('body-smoke3.js')) {
  console.log('  · test-smoke3.js 为独立文件（无 body 对应），保持原样');
}
console.log('\n已生成 / 更新 ' + n + ' 个测试文件。');
