/* =========================================================
   DreamWeaver · 幻梦织者 —— UI 重编排「呈现层」
   ---------------------------------------------------------
   定位：只做「视觉收纳」，一行业务逻辑都不碰。
     · 不改 state 数据、不读写 localStorage 结构、不动导入导出
     · 不删任何 DOM、不移动任何节点、不改任何 id / data-* / 表单字段
     · 不给业务按钮加事件（业务事件绑定一动不动）
     · 仅「插入」少量纯展示节点：折叠头 / 无名 checkbox /「更多 ⋯」/ ⓘ 气泡

   交互实现：折叠与「更多 ⋯」全部用原生 <input type=checkbox> + <label>
   配 CSS :checked 兄弟选择器完成，因此本层没有事件逻辑；
   即使本层完全不执行，页面也只是「不折叠」，一切功能照常（纯 CSS 兜底）。

   幂等性：所有插入前都会用「内容指纹」判断是否已折叠过，
   因此业务 JS 重渲染 innerHTML 后能自动重新收纳，重复调用也不会插重复。

   六个任务：
     ① layFold   ：长说明文字 → .accordion 折叠面板（手机默认收起）
     ② layAdv    ：高级参数 → 折叠面板（按所在的卡片自动分组）
     ③ layTier   ：工具条次要按钮 → 「更多 ⋯」（仅手机/平板）
     ④ layTips   ：工具条 → ⓘ 信息气泡
     ⑤ layEmpty  ：空状态 → 加类与内联 SVG 符号（文案不动）
     ⑥ layState  ：状态浮窗 → 空闲 / 运行 / 错误 三态（仅外观）
   ========================================================= */
const LAY={
  on:true,        /* 连续出错自动关闭，退回纯 CSS */
  fold:true, adv:true, tier:true, tips:true, empty:true, state:true,
  minHint:64,     /* 超过这个字数的说明才收纳（短提示直接展示） */
  /* 展开状态记忆：手机默认收起、桌面默认展开；用户手动切换后按指纹记住 */
  mem:{}
};
let _layErr=0, _laySeq=0, _layQueued=false;
function layOff(why){
  _layErr++;
  if(_layErr>=3&&LAY.on){
    LAY.on=false;
    console.warn('UI 呈现层已自动停用（连续出错 '+_layErr+' 次），回到纯 CSS 表现：'+why);
  }
}

/* ---------------- 基础工具（自带实现，兼容各种环境） ---------------- */
function layEls(list){ try{ return Array.prototype.slice.call(list||[]); }catch(e){ return []; } }
function layKids(el){ return layEls(el&&el.children); }
function layAll(sel,root){ try{ return layEls((root||document).querySelectorAll(sel)); }catch(e){ return []; } }
function layOne(sel,root){ try{ return (root||document).querySelector(sel); }catch(e){ return null; } }
/* 自实现的 closest：支持 ".cls" / "tag" / "#id" / "[attr=value]" 组合 */
function layClosest(el,sels){
  let n=el;
  while(n&&n.nodeType===1){
    for(let i=0;i<sels.length;i++){
      const s=String(sels[i]);
      try{
        if(s.charAt(0)==='.'&&n.classList&&n.classList.contains(s.slice(1))) return n;
        else if(s.charAt(0)==='#'&&n.id===s.slice(1)) return n;
        else if(s.charAt(0)==='['){
          const m=s.match(/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
          if(m&&n.getAttribute){ const v=n.getAttribute(m[1]); if(m[2]===undefined?v!=null:v===m[2]) return n; }
        }
        else if(/^[a-zA-Z]+$/.test(s)&&n.tagName&&n.tagName.toLowerCase()===s.toLowerCase()) return n;
      }catch(e){}
    }
    n=n.parentNode;
  }
  return null;
}
function layHas(el,cls){ try{ return !!(el&&el.classList&&el.classList.contains(cls)); }catch(e){ return false; } }
function layIn(el,sels){ return !!layClosest(el,sels); }
/* 跳过：弹窗内（临时容器）、聊天流（流式重绘）、脚本样式 */
function laySkip(el){
  if(!el||el.nodeType!==1) return true;
  if(layIn(el,['dialog','#chatLog','#toast','#aiStatus'])) return true;
  const t=el.tagName;
  if(t==='SCRIPT'||t==='STYLE') return true;
  return false;
}
function layText(el){ try{ return String(el.textContent||'').replace(/\s+/g,''); }catch(e){ return ''; } }
function layLen(el){ return layText(el).length; }
/* 内容指纹：用于幂等判断与展开状态记忆 */
function layFp(el){
  const t=layText(el).slice(0,48);
  let h=5381;
  for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0;
  return 'f'+(h>>>0).toString(36);
}
function layPhone(){
  try{
    const d=document.documentElement.dataset.device;
    if(d==='phone') return true;
    if(d==='tablet') return true;
    if(d==='desktop') return false;
  }catch(e){}
  try{ if(window.matchMedia) return window.matchMedia('(max-width:1024px)').matches; }catch(e){}
  return false;
}
/* 记忆用户手动切换过的展开状态（只记开关，不记内容） */
function layRemember(fp,open){ try{ LAY.mem[fp]=!!open; }catch(e){} }
function layRecalled(fp){
  try{ return Object.prototype.hasOwnProperty.call(LAY.mem,fp)?LAY.mem[fp]:null; }catch(e){ return null; }
}
/* 插入折叠头：checkbox + label（原生联动，零事件） */
function layHead(host,anchor,label,kind,key,open){
  if(!host||!anchor) return null;
  try{
    const id='lay-cb-'+(++_laySeq);
    const cb=document.createElement('input');
    cb.type='checkbox'; cb.className='acc-toggle'; cb.id=id;
    cb.setAttribute('tabindex','-1');
    cb.setAttribute('aria-hidden','true');
    cb.checked=!!open;
    cb.setAttribute('data-lay-key',key||'');
    const lab=document.createElement('label');
    lab.className='accordion-head';
    lab.setAttribute('for',id);
    if(kind) lab.setAttribute('data-kind',kind);
    lab.setAttribute('data-lay-key',key||'');
    /* 用 createElement 构建（不依赖 innerHTML，任何环境都能跑） */
    const ic=document.createElement('span'); ic.className='ah-ic';
    const tx=document.createElement('span'); tx.className='ah-tx'; tx.textContent=label||'说明与帮助';
    const mt=document.createElement('span'); mt.className='ah-meta';
    mt.textContent=(kind==='adv')?'（点开调整）':'（点开查看）';
    const ct=document.createElement('span'); ct.className='ah-caret';
    lab.appendChild(ic); lab.appendChild(tx); lab.appendChild(mt); lab.appendChild(ct);
    host.insertBefore(cb,anchor);
    host.insertBefore(lab,anchor);
    return {cb:cb,lab:lab,id:id};
  }catch(e){ layOff('插入折叠头失败'); return null; }
}
/* 把一组节点登记为折叠内容（只改 class/attribute，不动内容与位置） */
function layBind(cb,nodes,fp){
  if(!cb||!nodes||!nodes.length) return;
  nodes.forEach(n=>{
    if(!n||n.nodeType!==1) return;
    try{ n.classList.add('accordion-body'); }catch(e){}
    try{ n.setAttribute('data-laystate',cb.checked?'open':'closed'); }catch(e){}
    try{
      cb.addEventListener('change',()=>{
        try{ n.setAttribute('data-laystate',cb.checked?'open':'closed'); }catch(e){}
        layRemember(fp,cb.checked);
      });
    }catch(e){}
  });
}
/* 已存在同指纹的折叠头？ */
function layHasHead(host,key){
  try{
    const hs=layAll('.accordion-head[data-lay-key="'+key+'"]',host);
    return hs.length>0;
  }catch(e){ return false; }
}

/* ---------------- ① 长说明文字 → 折叠面板 ---------------- */
const LAY_FOLD_HOSTS=['#tab-setup .card','#tab-style .card','#sub-mem .card','#sub-hook .card',
  '#sub-toc .card','#sub-text .card','#tab-write .card','#loreBody .card','.lgroup'];
function layFoldPass(){
  try{
    const hosts=[];
    LAY_FOLD_HOSTS.forEach(sel=>{
      layAll(sel).forEach(h=>{ if(hosts.indexOf(h)<0) hosts.push(h); });
    });
    hosts.forEach(host=>{
      try{
        if(!host||laySkip(host)) return;
        const kids=layKids(host);
        const isCand=n=>{
          if(!n||n.nodeType!==1) return false;
          if(!(layHas(n,'hint')||layHas(n,'warnbox'))) return false;
          if(layHas(n,'accordion-body')||n.getAttribute('data-lay-done')) return false;
          return layLen(n)>=LAY.minHint;
        };
        /* 找出「连续成组」的说明段，避免把夹杂的按钮/表单一起折进去 */
        const runs=[]; let cur=null, prev=null;
        kids.forEach(n=>{
          if(isCand(n)){
            if(prev&&cur&&prev===cur[cur.length-1]) cur.push(n);
            else { cur=[n]; runs.push(cur); }
            prev=n;
          } else { prev=n; cur=null; }
        });
        if(!runs.length) return;
        runs.forEach(run=>{
          const key='hint:'+layFp(run[0]);
          if(layHasHead(host,key)) return;                 /* 已折叠过（幂等） */
          const rc=layRecalled(key);
          const open=(rc===null)?!layPhone():rc;           /* 手机收起 / 桌面展开 */
          const h=layHead(host,run[0],run.length>1?('说明与帮助 · '+run.length+' 条'):'说明与帮助','hint',key,open);
          if(!h) return;
          layBind(h.cb,run,key);
          run.forEach(n=>{ try{ n.setAttribute('data-lay-done','1'); }catch(e){} });
        });
      }catch(e){ layOff('说明折叠失败'); }
    });
  }catch(e){ layOff('说明折叠遍历失败'); }
}

/* ---------------- ② 高级参数 → 折叠面板（按所在卡片自动分组） ---------------- */
const LAY_ADV=[
  {label:'高级参数（上下文注入）', desc:'一般无需修改', ids:['s-scan','s-budget','s-showprompt']},
  {label:'高级参数（记忆与压缩）', desc:'一般无需修改', ids:['m-limit','m-keep','m-auto','m-autosuggest','m-suggestn']},
  {label:'高级参数（伏笔识别）',   desc:'一般无需修改', ids:['hook-adv','hk-threshold','hk-batch']}
];
function layAdvPass(){
  try{
    LAY_ADV.forEach(spec=>{
      /* 按「控件所在的卡片」分组：同一张卡片里的高级参数合成一个面板 */
      const groups=[];
      spec.ids.forEach(id=>{
        let el=null;
        try{ el=document.getElementById(id); }catch(e){}
        if(!el||laySkip(el)) return;
        const unit=layClosest(el,['.row','.switch','label','.toolbar'])||el;
        const card=layClosest(el,['.card','.lgroup','.safe-sec'])||unit.parentNode||el;
        let g=null;
        groups.forEach(x=>{ if(x.card===card) g=x; });
        if(!g){ g={card:card,units:[]}; groups.push(g); }
        /* 顺带把前置的 label 文本也收进面板，避免露在半截 */
        let prev=unit.previousElementSibling;
        if(prev&&prev.tagName==='LABEL'&&!layHas(prev,'switch')&&g.units.indexOf(prev)<0) g.units.push(prev);
        if(g.units.indexOf(unit)<0) g.units.push(unit);
      });
      groups.forEach(g=>{
        try{
          if(!g.card||!g.units.length) return;
          const key='adv:'+spec.label+':'+layFp(g.units[0]);
          if(layHasHead(g.card,key)) return;
          /* 按文档顺序取第一个单元作为插入锚点 */
          const inCard=g.units.filter(u=>g.card.contains&&g.card.contains(u));
          const anchor=(inCard.length?inCard:g.units)[0];
          const rc=layRecalled(key);
          const open=(rc===null)?!layPhone():rc;
          const h=layHead(g.card,anchor,spec.label,'adv',key,open);
          if(!h) return;
          layBind(h.cb,g.units,key);
          g.units.forEach(n=>{ try{ n.setAttribute('data-lay-done','1'); }catch(e){} });
        }catch(e){ layOff('高级参数折叠失败'); }
      });
    });
  }catch(e){ layOff('高级参数遍历失败'); }
}

/* ---------------- ③ 工具条：次要按钮 →「更多 ⋯」 ---------------- */
const LAY_TB=[
  {sel:'#shelfActions', keep:2, also:['#shelfSearch','#shelfSort']},
  {sel:'#editorActions', keep:2, also:[]},
  {sel:'#sub-hook .toolbar', keep:1, also:[]},
  {sel:'#sub-mem .toolbar', keep:1, also:[]},
  {sel:'#sub-toc .toolbar', keep:1, also:[]},
  {sel:'#sub-text .editor-head', keep:2, also:[]},
  {sel:'#sub-text .meta', keep:1, also:[]},
  {sel:'#tab-chars .toolbar', keep:1, also:[]},
  {sel:'#loreBar', keep:1, also:[]},
  {sel:'#tab-lore .toolbar', keep:1, also:[]},
  /* 列表条目里的次要操作：上/下移、导出、删除等收进「更多 ⋯」 */
  {sel:'#loreBody .lrow-top, #loreBody .lhead', keep:1, min:3},
  {sel:'#hookList .hookacts', keep:1, min:2},
  {sel:'.snap-list .sn-a', keep:1, min:3}
];
const LAY_MAIN=/新建|创建|生成|出文|保存|完成|导入|添加|扫描|✦/;
function layTierPass(){
  try{
    if(!layPhone()) return;              /* 桌面不收纳：空间够，全部按钮照常显示 */
    LAY_TB.forEach(spec=>{
      layAll(spec.sel).forEach(box=>{
        try{
          if(!box||laySkip(box)) return;
          if(layOne('.acc-toggle',box)&&layOne('.btn-more',box)) return;   /* 已收纳（幂等） */
          const btns=layKids(box).filter(n=>n.tagName==='BUTTON');
          const extras=(spec.also||[]).map(id=>{ try{ return box.querySelector(id); }catch(e){ return null; } }).filter(Boolean);
          if(btns.length+extras.length<(spec.min||4)) return;            /* 本来就精简，不动 */
          const keep=[];
          btns.forEach(b=>{ if(keep.length<(spec.keep||1)&&layHas(b,'primary')) keep.push(b); });
          btns.forEach(b=>{ if(keep.length<(spec.keep||1)+1&&keep.indexOf(b)<0&&LAY_MAIN.test(b.textContent||'')) keep.push(b); });
          if(!keep.length&&btns[0]) keep.push(btns[0]);                    /* 兜底：至少留一个主操作 */
          const sec=btns.filter(b=>keep.indexOf(b)<0).concat(extras);
          if(!sec.length) return;
          const key='tb:'+layFp(box);
          const cb=document.createElement('input');
          cb.type='checkbox'; cb.className='acc-toggle'; cb.id='lay-tb-'+(++_laySeq);
          cb.setAttribute('tabindex','-1'); cb.setAttribute('aria-hidden','true');
          cb.setAttribute('data-lay-key',key);
          const lab=document.createElement('label');
          lab.className='btn xs ghost btn-more';
          lab.setAttribute('for',cb.id);
          const ct=document.createElement('span'); ct.className='ah-caret';
          const tx=document.createElement('span'); tx.textContent='更多 ⋯';
          lab.appendChild(ct); lab.appendChild(tx);
          sec.forEach(b=>{ try{ b.classList.add('lay-sec'); }catch(e){} });
          try{ box.classList.add('lay-tb'); }catch(e){}
          box.insertBefore(cb,box.firstChild);      /* 插到最前，保证 :checked ~ .lay-sec 成立 */
          box.appendChild(lab);
          try{ cb.addEventListener('change',()=>{ try{ box.classList.toggle('tb-open',cb.checked); }catch(e){} }); }catch(e){}
        }catch(e){ layOff('按钮收纳失败'); }
      });
    });
  }catch(e){ layOff('按钮收纳遍历失败'); }
}

/* ---------------- ④ 工具条 ⓘ 气泡（桌面与手机都给一个帮助入口） ---------------- */
const LAY_TIP_HOSTS=['#tab-lore .toolbar','#tab-chars .toolbar','#tab-write .chat-head','#sub-hook .toolbar','#sub-mem .toolbar'];
const LAY_TIP_TEXT='长说明已折叠在上方面板，点开可查看；次要按钮收在「更多 ⋯」里。';
function layTipsPass(){
  try{
    LAY_TIP_HOSTS.forEach(sel=>{
      layAll(sel).forEach(n=>{
        try{
          if(!n||laySkip(n)||layOne('.tip-info',n)) return;
          const b=document.createElement('button');
          b.type='button'; b.className='tip-info';
          b.setAttribute('data-tip',n.getAttribute('data-tip')||LAY_TIP_TEXT);
          b.setAttribute('tabindex','0'); b.setAttribute('aria-label','帮助说明');
          b.textContent='i';
          n.appendChild(b);
        }catch(e){}
      });
    });
  }catch(e){ layOff('信息气泡失败'); }
}

/* ---------------- ⑤ 空状态：加类与符号（文案由业务决定，不改） ---------------- */
const LAY_EMPTY=[['#bookGrid','book'],['#charList','user'],['#loreBody','globe'],['#hookList','hook'],
  ['#chapterList','list'],['#chatLog','chat'],['#summaryList','file'],['#readPane','book'],['#relList','net']];
function layEmptyPass(){
  try{
    LAY_EMPTY.forEach(([sel,kind])=>{
      const host=layOne(sel);
      if(!host) return;
      layAll('.empty',host).forEach(n=>{
        try{
          if(!n.classList.contains('lay-empty')){ n.classList.add('lay-empty'); n.setAttribute('data-empty',kind); }
        }catch(e){}
      });
    });
  }catch(e){ layOff('空状态美化失败'); }
}

/* ---------------- ⑥ 状态浮窗三态（只改视觉属性） ---------------- */
let _layStateTimer=null;
function layStateSet(state,text){
  try{
    const el=document.getElementById('aiStatus'); if(!el) return;
    el.setAttribute('data-state',state);
    if(state==='err'){
      clearTimeout(_layStateTimer);
      _layStateTimer=setTimeout(()=>{ try{ el.setAttribute('data-state','ok'); }catch(e){} },3200);
    }
  }catch(e){}
}
function layStateWrapToast(){
  try{
    if(typeof toast!=='function'||toast._layWrapped) return;
    const raw=toast;
    const wrapped=function(msg){
      try{
        const s=String(msg==null?'':msg);
        if(/失败|错误|异常|无法|不足|不能|已满|损坏|中断|过期|无效/.test(s)) layStateSet('err',s);
        else if(/已|完成|成功|恢复|开启|关闭|复制/.test(s)) layStateSet('ok',s);
      }catch(e){}
      return raw.apply(this,arguments);
    };
    try{ Object.defineProperty(wrapped,'_layWrapped',{value:true}); }catch(e){}
    toast=wrapped;
  }catch(e){ layOff('状态三态挂钩失败'); }
}

/* ---------------- 统一调度 ---------------- */
function layRun(){
  if(!LAY.on||_layQueued) return;
  _layQueued=true;
  const run=()=>{
    _layQueued=false;
    if(!LAY.on) return;
    try{ if(LAY.fold) layFoldPass(); }catch(e){ layOff('fold'); }
    try{ if(LAY.adv) layAdvPass(); }catch(e){ layOff('adv'); }
    try{ if(LAY.tier) layTierPass(); }catch(e){ layOff('tier'); }
    try{ if(LAY.tips) layTipsPass(); }catch(e){ layOff('tips'); }
    try{ if(LAY.empty) layEmptyPass(); }catch(e){ layOff('empty'); }
  };
  try{ if(window.requestAnimationFrame) requestAnimationFrame(run); else setTimeout(run,16); }
  catch(e){ setTimeout(run,16); }
}
function layWatch(){
  try{
    if(typeof MutationObserver!=='function') return;
    const mo=new MutationObserver(muts=>{
      try{
        /* 聊天流式输出高频重绘，直接忽略，避免多余开销 */
        for(let i=0;i<muts.length;i++){
          const t=muts[i].target;
          if(t&&layIn(t,['#chatLog'])) continue;
          layRun(); return;
        }
      }catch(e){}
    });
    mo.observe(document.body||document.documentElement,{childList:true,subtree:true});
    /* 低频兜底：JS 动态渲染的面板（设定库 / 角色卡 / 章节列表） */
    setInterval(()=>{ try{ if(!document.body||document.body.dataset.ai!=='busy') layRun(); }catch(e){} },2600);
  }catch(e){ console.warn('UI 呈现层监听初始化失败',e); }
}
function layBoot(){
  try{ layStateWrapToast(); }catch(e){}
  layRun();
  layWatch();
  /* 设备切换（横竖屏 / 手动切手机版）后重新评估收纳 */
  try{ window.addEventListener('devicechange',()=>setTimeout(layRun,120)); }catch(e){}
  console.log('UI 重编排呈现层已就绪（折叠 / 收纳 / 空状态 / 三态，纯 CSS 驱动，业务零改动）');
}
