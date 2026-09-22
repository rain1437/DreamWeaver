/* ============================================================================
   DreamWeaver · 幻梦织者 —— 收尾润色层（构建模块）
   ----------------------------------------------------------------------------
   由 build.js 在「ui-overhaul.js 之后、写盘之前」调用：

       s = require('./ui-polish.js').apply(s, msg => console.log('   · ' + msg));

   内容都在同目录的两个静态文件里，本文件只负责「校验锚点 → 注入 → 回验」：
       ui-polish.css        → 注入到 <style> 末尾
       ui-polish.client.js  → 注入到最后一个 <script> 内部末尾

   ⚠ 关键约束（踩过坑，写死在这里防止回退）：
     verify.js 断言单文件版 <script> 标签【恰好 2 个】。
     所以客户端代码必须【注入进已有的主脚本内部】，
     绝不能再新开一个 <script> 标签，否则 CI 直接红。

   本层只改表现层：不碰任何 id / data-* / 表单字段 / 业务逻辑。
   所有校验都是「必须通过」，任一条不过就直接抛错让构建失败，绝不静默产出错版。
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join(__dirname, 'ui-polish.css');
const JS_PATH  = path.join(__dirname, 'ui-polish.client.js');

const MARK_CSS = '/* ==UI-POLISH-CSS== 对比度修复 + 手机端分模块抽屉（由 ui-polish.js 注入） */\n';
const MARK_JS  = '\n/* ==UI-POLISH-JS-BEGIN== */\n';

function must(cond, msg) {
  if (!cond) throw new Error('[ui-polish] ' + msg);
}
function count(s, sub) { return s.split(sub).length - 1; }

function apply(html, log) {
  const say = (typeof log === 'function') ? log : function () {};

  must(typeof html === 'string' && html.length > 0, '传入的 HTML 为空');

  /* ---------- ① 注入前：锚点必须唯一且数量正确 ---------- */
  must(count(html, '</style>') === 1,
    '</style> 锚点应恰好 1 个，实际 ' + count(html, '</style>') + ' 个');
  must(count(html, '<script>') === 2,
    '<script> 应恰好 2 个（verify.js 有此断言），实际 ' + count(html, '<script>') + ' 个');
  must(count(html, '</script>') === 2,
    '</script> 应恰好 2 个，实际 ' + count(html, '</script>') + ' 个');

  /* ---------- ② 幂等保护 ---------- */
  must(html.indexOf('==UI-POLISH-CSS==') < 0, 'CSS 已经注入过了（重复调用）');
  must(html.indexOf('==UI-POLISH-JS-BEGIN==') < 0, 'JS 已经注入过了（重复调用）');

  /* ---------- ③ 读入并自检两个载体文件 ---------- */
  const css = fs.readFileSync(CSS_PATH, 'utf8').replace(/\r\n/g, '\n');
  const js  = fs.readFileSync(JS_PATH,  'utf8').replace(/\r\n/g, '\n');

  must(css.length > 0, 'ui-polish.css 为空');
  must(js.length  > 0, 'ui-polish.client.js 为空');
  must(css.indexOf('</style>') < 0, 'ui-polish.css 里不允许出现 </style>');
  must(js.indexOf('</scr' + 'ipt>') < 0, 'ui-polish.client.js 里不允许出现闭合 script 标签');
  must(css.indexOf('==UI-POLISH-CSS==') < 0, 'ui-polish.css 内不能包含注入标记');
  /* 载体文件里绝不能出现标签字面量，否则会破坏 verify.js 的结构断言 */
  ['<style>', '</style>', '<script>', '</script>'].forEach(function(tag){
    must(css.indexOf(tag) < 0, 'ui-polish.css 不允许出现字面量 ' + tag);
    must(js.indexOf(tag) < 0,  'ui-polish.client.js 不允许出现字面量 ' + tag);
  });

  /* CSS 花括号必须平衡（verify.js 会校验整段样式表） */
  let ob = 0, cb = 0;
  for (const ch of css) { if (ch === '{') ob++; if (ch === '}') cb++; }
  must(ob === cb, 'ui-polish.css 花括号不平衡：' + ob + '/' + cb);

  /* 客户端 JS 必须语法正确（verify.js 会用 new Function 再查一遍） */
  try { new Function(js); }
  catch (e) { throw new Error('[ui-polish] ui-polish.client.js 语法错误：' + e.message); }

  /* ---------- ④ 注入 CSS：<style> 末尾 ---------- */
  const i = html.lastIndexOf('</style>');
  html = html.slice(0, i) + '\n' + MARK_CSS + css + html.slice(i);

  /* ---------- ⑤ 注入 JS：最后一个 <script> 内部末尾（绝不新开标签） ---------- */
  const j = html.lastIndexOf('</script>');
  html = html.slice(0, j) + MARK_JS + js + html.slice(j);

  /* ---------- ⑥ 注入后回验：结构契约一个都不能破 ---------- */
  must(count(html, '<script>') === 2,
    '注入后 <script> 变成 ' + count(html, '<script>') + ' 个（verify.js 会失败）');
  must(count(html, '</script>') === 2,
    '注入后 </script> 变成 ' + count(html, '</script>') + ' 个（verify.js 会失败）');
  must(count(html, '</style>') === 1, '注入后 </style> 数量异常');
  must(count(html, '<style>') === 1, '注入后 <style> 数量异常');
  must(count(html, '<script src=') === 0, '单文件版不允许出现外部 script 引用');
  must(html.indexOf('==UI-POLISH-CSS==') > 0, 'CSS 注入标记缺失');
  must(html.indexOf('==UI-POLISH-JS-BEGIN==') > 0, 'JS 注入标记缺失');
  must(html.indexOf('.dw-burger') > 0, '汉堡按钮样式未进入产物');
  must(html.indexOf('.dw-scrim') > 0, '抽屉遮罩样式未进入产物');
  must(html.indexOf('dw-navclose') > 0, '抽屉关闭按钮样式未进入产物');
  must(html.indexOf('__dwNavDrawer') > 0, '抽屉脚本未进入产物');

  say('收尾润色层：对比度修复 7 处 + 手机端导航抽屉（汉堡按钮 + 侧滑目录）');
  say('注入位置：CSS -> <style> 末尾（' + css.length + ' 字符）｜JS -> 主脚本内部（' + js.length + ' 字符）');
  say('结构回验：<script> 仍为 2 个、<style> 仍为 1 个、零外部引用');
  return html;
}

module.exports = { apply };
