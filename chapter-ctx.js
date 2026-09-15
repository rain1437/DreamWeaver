/* =========================================================
   章节上下文工具
   ---------------------------------------------------------
   世界书引擎本体已在 worldbook.js（wbRun / wbHit / wbParse / worldToST …），
   这里只保留与「章节上下文」相关的公共工具，供提示词拼装与界面复用。
   ========================================================= */
function toKeys(v){
  if(Array.isArray(v)) return v.map(x=>String(x).trim()).filter(Boolean);
  if(typeof v==='string') return v.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
  return [];
}
function updateCounters(){
  const nL=$('#nLore');
  if(nL){
    try{ const c=loreCount(); const t=c.w+c.pw+c.hi+c.gl; nL.textContent=t?('('+t+')'):''; }
    catch(e){}
  }
  const nC=$('#nChars'); if(nC) nC.textContent = state.chars.length?('('+state.chars.length+')'):'';
  const nO=$('#nWrite'); if(nO) nO.textContent = state.outline.length?('('+state.outline.length+')'):'';
}
function activeCharsFor(idx){
  const n = idx+1;
  return state.chars.filter(c=>c.enabled && n>=c.from && n<=c.to);
}
function buildScanText(idx){
  const p = wbScanParts(idx);
  return (p.prior + '\n' + p.focus).trim();
}
function keyHit(key, text, caseSensitive){
  if(!key) return false;
  const k = caseSensitive?key:key.toLowerCase();
  const t = caseSensitive?text:text.toLowerCase();
  return t.indexOf(k)>=0;
}
/* 兼容旧调用：本章将被注入的世界书文本 */
function worldBlock(idx){
  try{
    const r=wbRun(idx,{commit:false});
    return ((r.sys||'')+'\n'+(r.ctx||'')).trim();
  }catch(e){ return ''; }
}
function buildWorldContext(idx){
  const r=wbRun(idx,{commit:false});
  return {
    included: r.included.map(x=>x.e),
    matched: r.included.filter(x=>!x.e.constant).map(x=>x.e),
    overflow: r.dropped.map(x=>x.e),
    skipped: r.skipped
  };
}
function charBlock(idx){
  /* 人物细分的注入实现统一在 char-module.js 的 chBlockText（单一来源） */
  try{ return (typeof chBlockText==='function')?chBlockText(idx):''; }
  catch(e){ console.warn('角色卡注入失败',e); return ''; }
}
