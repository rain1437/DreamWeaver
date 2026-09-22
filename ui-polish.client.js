
/* ==UI-POLISH-JS== 手机端分模块抽屉增强层
   ---------------------------------------------------------------------------
   · 只插入纯展示节点（抽屉头）+ 加一个 class，不改任何 id / data-* / 表单字段
   · 不覆盖原有点击逻辑：原 onclick 照常触发，本层只在捕获阶段负责「点完收起」
   · 整段包在 try/catch 里，任何异常都只是「退回原生横向页签」，不会影响主流程
   · 桌面端直接 return，零副作用
   --------------------------------------------------------------------------- */
(function(){
  try{
    var ROOT=document.documentElement;
    if(!ROOT||!ROOT.getAttribute) return;
    function isPhone(){ return ROOT.getAttribute('data-device')==='phone'; }
    function labelOf(tab){
      var c=tab.cloneNode(true), ns=c.querySelectorAll('.n'), i;
      for(i=0;i<ns.length;i++){ if(ns[i].parentNode) ns[i].parentNode.removeChild(ns[i]); }
      return (c.textContent||'').replace(/\s+/g,' ').trim();
    }
    function countOf(tab){
      var n=tab.querySelector('.n');
      return n?((n.textContent||'').trim()):'';
    }
    function activeOf(strip){
      return strip.querySelector('.subtab.active,.ltab.active')
          || strip.querySelector('.subtab,.ltab');
    }
    function sync(strip){
      var head=strip.__dwHead; if(!head) return;
      var act=activeOf(strip); if(!act) return;
      var tx=head.querySelector('.dw-dh-tx'), nn=head.querySelector('.dw-dh-n');
      if(tx) tx.textContent=labelOf(act);
      if(nn) nn.textContent=countOf(act);
    }
    function close(strip){
      if(!strip.__dwHead) return;
      strip.classList.remove('dw-open');
      strip.__dwHead.classList.remove('on');
      strip.__dwHead.setAttribute('aria-expanded','false');
    }
    function enhance(strip){
      if(!isPhone()||strip.__dwHead) return;
      try{
        var head=document.createElement('button');
        head.type='button';
        head.className='dw-dh';
        head.setAttribute('aria-expanded','false');
        head.setAttribute('aria-label','展开分模块');
        head.innerHTML='<span class="dw-dh-tx"></span>'
                     + '<span class="dw-dh-n"></span>'
                     + '<span class="dw-dh-ca" aria-hidden="true">\u25BE</span>';
        strip.parentNode.insertBefore(head,strip);
        strip.__dwHead=head;
        strip.classList.add('dw-drawer');
        head.addEventListener('click',function(e){
          e.preventDefault(); e.stopPropagation();
          var open=strip.classList.toggle('dw-open');
          head.classList.toggle('on',open);
          head.setAttribute('aria-expanded',open?'true':'false');
          if(open) sync(strip);
        });
        strip.addEventListener('click',function(e){
          var t=(e.target&&e.target.closest)?e.target.closest('.subtab,.ltab'):null;
          if(!t) return;
          close(strip);
          setTimeout(function(){ sync(strip); },0);
        },true);
        if(window.MutationObserver){
          new MutationObserver(function(){ sync(strip); })
            .observe(strip,{subtree:true,attributes:true,
                            attributeFilter:['class'],characterData:true,childList:true});
        }
        sync(strip);
      }catch(err){
        try{ strip.classList.remove('dw-drawer','dw-open'); }catch(_e){}
      }
    }
    function teardown(){
      var hs=document.querySelectorAll('.dw-dh'), i, j;
      for(i=0;i<hs.length;i++){ if(hs[i].parentNode) hs[i].parentNode.removeChild(hs[i]); }
      var ss=document.querySelectorAll('.dw-drawer');
      for(j=0;j<ss.length;j++){
        ss[j].classList.remove('dw-drawer','dw-open');
        ss[j].__dwHead=null;
      }
    }
    var pending=0;
    function run(){
      if(!isPhone()) return;
      var ss=document.querySelectorAll('.subtabs,.ltabs');
      for(var i=0;i<ss.length;i++) enhance(ss[i]);
    }
    function schedule(){
      if(pending) return; pending=1;
      setTimeout(function(){ pending=0; try{ run(); }catch(_e){} },90);
    }
    function boot(){
      try{
        run();
        if(window.MutationObserver && document.body){
          new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
        }
        window.addEventListener('devicechange',function(){
          setTimeout(function(){ try{ if(isPhone()) run(); else teardown(); }catch(_e){} },80);
        });
      }catch(_e){}
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
    else boot();
  }catch(e){}
})();
