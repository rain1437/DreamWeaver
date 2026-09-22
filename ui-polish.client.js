
/* ==UI-POLISH-JS== 手机端：汉堡按钮 + 侧滑导航抽屉
   ---------------------------------------------------------------------------
   · 触发点：编辑器顶栏「书名左边那个图标」(#editorScreen .logo)
   · 只加 class / 只插入纯展示节点（遮罩 + 关闭按钮），不改任何 id / data-* / 表单
   · 不覆盖原有点击逻辑：模块切换仍走原有 onclick，本层只负责开关与收起
   · 整段包在 try/catch 里；桌面端直接不启用，异常时退回原生底部栏
   --------------------------------------------------------------------------- */
(function(){
  try{
    if(window.__dwNavDrawer) return; window.__dwNavDrawer=1;
    var ROOT=document.documentElement;
    if(!ROOT||!ROOT.getAttribute) return;
    function isPhone(){ return ROOT.getAttribute('data-device')==='phone'; }

    var burger=null, sidenav=null, scrim=null, closeBtn=null, opened=false;

    function make(tag, cls, txt){
      var el=document.createElement(tag);
      if(cls) el.className=cls;
      if(txt!=null) el.textContent=txt;
      return el;
    }
    function build(){
      if(!isPhone()) return;
      var logo=document.querySelector('#editorScreen .logo');
      var nav=document.querySelector('#editorScreen .sidenav') || document.querySelector('.sidenav');
      if(!logo||!nav) return;

      if(!burger){
        logo.classList.add('dw-burger');
        logo.setAttribute('role','button');
        logo.setAttribute('tabindex','0');
        logo.setAttribute('aria-label','打开导航');
        logo.setAttribute('aria-expanded','false');
        logo.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); toggle(); });
        logo.addEventListener('keydown',function(e){
          if(e.key==='Enter'||e.key===' '||e.keyCode===13||e.keyCode===32){
            e.preventDefault(); toggle();
          }
        });
        burger=logo;
      }
      if(!scrim){
        scrim=make('div','dw-scrim');
        (document.body||ROOT).appendChild(scrim);
        scrim.addEventListener('click',close);
      }
      sidenav=nav;
      if(!closeBtn){
        var h=nav.querySelector('.sidenav-h');
        if(h){
          closeBtn=make('button','dw-navclose','\u2715');
          closeBtn.type='button';
          closeBtn.setAttribute('aria-label','关闭导航');
          closeBtn.addEventListener('click',function(e){ e.preventDefault(); close(); });
          h.appendChild(closeBtn);
        }
      }
    }
    function toggle(){ opened?close():open(); }
    function open(){
      if(!sidenav) build();
      if(!sidenav) return;
      sidenav.classList.add('dw-open');
      if(scrim) scrim.classList.add('on');
      if(burger) burger.setAttribute('aria-expanded','true');
      ROOT.classList.add('dw-navon');
      opened=true;
    }
    function close(){
      if(sidenav) sidenav.classList.remove('dw-open');
      if(scrim) scrim.classList.remove('on');
      if(burger) burger.setAttribute('aria-expanded','false');
      ROOT.classList.remove('dw-navon');
      opened=false;
    }

    /* 点任意模块后自动收起（原有 onclick 照常执行） */
    document.addEventListener('click',function(e){
      if(!opened) return;
      if(e.target&&e.target.closest&&e.target.closest('.tab')) close();
    },true);
    /* Esc 关闭 */
    document.addEventListener('keydown',function(e){
      if(opened&&(e.key==='Escape'||e.keyCode===27)) close();
    });
    /* 左边缘滑入 / 左滑关闭 */
    var sx=0, sy=0, tracking=false;
    document.addEventListener('touchstart',function(e){
      if(!isPhone()||!e.touches||!e.touches[0]) return;
      var t=e.touches[0]; sx=t.clientX; sy=t.clientY;
      tracking = opened || sx<26;
    },{passive:true});
    document.addEventListener('touchend',function(e){
      if(!tracking||!e.changedTouches||!e.changedTouches[0]) return;
      tracking=false;
      var t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
      if(Math.abs(dx)<44||Math.abs(dy)>Math.abs(dx)) return;
      if(!opened && sx<26 && dx>50) open();
      else if(opened && dx<-50) close();
    },{passive:true});

    function sync(){
      if(isPhone()){ build(); }
      else{
        close();
        if(burger) burger.classList.remove('dw-burger');
        if(scrim&&scrim.parentNode) scrim.parentNode.removeChild(scrim);
        if(closeBtn&&closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
        scrim=null; closeBtn=null;
      }
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync);
    else sync();
    window.addEventListener('devicechange',function(){ setTimeout(sync,80); });
  }catch(e){}
})();
