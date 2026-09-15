/* 回归测试：不允许任何「未打开的 dialog」被作者样式显示出来
   —— 这正是竖屏卡死、点哪都没反应的根因 */
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const cssRaw=html.slice(html.indexOf('<style>')+7, html.indexOf('</style>'));
const css=cssRaw.replace(/\/\*[\s\S]*?\*\//g,'');   // 先去掉注释，避免注释里的花括号干扰解析

/* 轻量 CSS 解析：按花括号切出「选择器 { 声明 }」，同时记录所处的 @media 条件 */
const rules=[];
(function parse(text, cond){
  let i=0;
  while(i<text.length){
    const open=text.indexOf('{',i);
    if(open<0) break;
    const sel=text.slice(i,open).trim();
    if(sel.startsWith('@media')||sel.startsWith('@supports')){
      // 找到与之配对的右括号
      let depth=1,j=open+1;
      while(j<text.length&&depth>0){ if(text[j]==='{')depth++; else if(text[j]==='}')depth--; j++; }
      parse(text.slice(open+1,j-1), (cond?cond+' && ':'')+sel);
      i=j; continue;
    }
    const close=text.indexOf('}',open);
    if(close<0) break;
    const body=text.slice(open+1,close);
    sel.split(',').forEach(s=>rules.push({sel:s.trim(),media:cond||'',body}));
    i=close+1;
  }
}) (css,'');

let bad=[], guards=0;
rules.forEach(r=>{
  if(!/\bdialog\b/.test(r.sel)) return;
  const isClosed = /:not\(\[open\]\)/.test(r.sel);
  const isOpen = !isClosed && /\[open\]/.test(r.sel);   // 注意：[open] 也出现在 :not([open]) 里
  const setsDisplay = /(^|;|\s)display\s*:/.test(r.body);
  if(isOpen) return;
  if(isClosed){
    guards++;
    if(/display\s*:\s*none\s*!important/.test(r.body)) return;
    bad.push({why:'兜底规则不够强硬',...r});
    return;
  }
  // 裸 dialog（或带 data-* 前缀的裸 dialog）且设置了 display —— 危险
  if(setsDisplay){
    // 若声明里明确是 display:none 则无妨
    if(/display\s*:\s*none\b/.test(r.body)) return;
    bad.push({why:'裸 dialog 被设置了可见 display，未打开的弹窗也会显示',...r});
  }
});

console.log('扫描 dialog 相关规则:', rules.filter(r=>/\bdialog\b/.test(r.sel)).length, '条');
console.log('\n【会显示未打开弹窗的规则】');
if(!bad.length) console.log('  无 ✔');
bad.forEach(b=>console.log('  ✘ ['+b.why+']\n     条件: '+(b.media||'(全局)')+'\n     选择器: '+b.sel+'\n     声明: '+b.body.trim().replace(/\s+/g,' ')));

console.log('\n【必须有】dialog:not([open]){display:none !important} ——',
  guards>0 ? '存在 ✔' : '缺失 ✘');

/* 再确认竖屏全屏弹窗只在 [open] 且 portrait 下生效 */
const portraitRule=rules.find(r=>/data-orient="portrait"/.test(r.sel) && /\[open\]/.test(r.sel) && /display\s*:\s*flex/.test(r.body));
console.log('【必须有】竖屏 [open] 才全屏 ——', portraitRule? '存在 ✔' : '缺失 ✘');

/* 媒体查询里不能有裸 dialog */
const mediaBare=rules.filter(r=>/max-width:720px/.test(r.media) && /^\s*dialog\s*$/.test(r.sel));
console.log('【媒体查询内裸 dialog】', mediaBare.length? '仍有 '+mediaBare.length+' 条 ✘' : '已清理 ✔');
mediaBare.forEach(m=>console.log('   -> '+m.sel+' { '+m.body.trim().replace(/\s+/g,' ').slice(0,90)+' }'));

/* 横屏手机不应被强制全屏 */
const landFull=rules.find(r=>/data-orient="landscape"/.test(r.sel) && /dialog\[open\]/.test(r.sel) && /width:100vw/.test(r.body));
console.log('【横屏弹窗未强制全屏】', landFull? '有问题 ✘' : '正常 ✔');

process.exit(bad.length?1:0);
