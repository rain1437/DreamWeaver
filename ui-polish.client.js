
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

/* ==UI-POLISH-JS2== 运行时修补层
   ---------------------------------------------------------------------------
   ① 手机端不把「人物关系 / 从正文梳理角色」收进「更多 ⋯」——它们被 LAY_TB
      的 keep:1 挤掉了（「+ 新建角色」先抢到 LAY_MAIN 的名额），用户以为功能坏了。
   ② AI 调用加 90 秒超时兜底 —— chatRaw 里的 fetch 没有超时，接口地址在手机上
      打不通时 Promise 永不 settle，表现就是「点了没反应」。
   ③ 原本静默 return 的路径补成可见提示，任何失败都不再无声无息。
   --------------------------------------------------------------------------- */
(function(){
  try{
    var ROOT=document.documentElement;
    function isPhone(){ return ROOT.getAttribute('data-device')==='phone'; }
    function say(m){ try{ if(typeof toast==='function') toast(m); }catch(e){} }

    /* ---------- ① 关键按钮不再被「更多 ⋯」收纳 ---------- */
    var KEEP=['#btnCastBoard','#btnCastExtract'];
    function unhideKey(){
      if(!isPhone()) return;
      var bar=document.querySelector('#tab-chars .toolbar'); if(!bar) return;
      for(var i=0;i<KEEP.length;i++){
        var b=bar.querySelector(KEEP[i]); if(b) b.classList.remove('lay-sec');
      }
      var more=bar.querySelector('.btn-more');
      if(more) more.style.display = bar.querySelector('.lay-sec') ? '' : 'none';
    }
    var _layTier=window.layTierPass;
    if(typeof _layTier==='function'){
      window.layTierPass=function(){
        var r=_layTier.apply(this,arguments); try{ unhideKey(); }catch(e){} return r;
      };
    }
    try{ unhideKey(); }catch(e){}
    setInterval(function(){ try{ unhideKey(); }catch(e){} }, 2000);

    /* ---------- ② AI 调用超时兜底 ---------- */
    var AI_TIMEOUT=90000;
    var _chat=window.chat;
    if(typeof _chat==='function'){
      window.chat=function(){
        var args=arguments, self=this;
        return new Promise(function(resolve,reject){
          var done=false;
          var timer=setTimeout(function(){
            if(done) return; done=true;
            reject(new Error('接口 90 秒无响应。请到「API 设置 → 检测连接」看地址在手机上能不能通，'
                            +'常见原因是地址填了 localhost / 被跨域拦截 / 手机网络不通。'));
          }, AI_TIMEOUT);
          Promise.resolve().then(function(){ return _chat.apply(self,args); })
            .then(function(v){ if(done) return; done=true; clearTimeout(timer); resolve(v); },
                  function(e){ if(done) return; done=true; clearTimeout(timer); reject(e); });
        });
      };
    }

    /* ---------- ③ 静默 return → 可见提示 ---------- */
    var _cai=window.chAiField;
    if(typeof _cai==='function'){
      window.chAiField=function(i,mod,k,mode){
        if(!mod||!k){ say('这个 AI 按钮缺少字段信息，已跳过（mod='+mod+' k='+k+'）'); return; }
        var c=null; try{ c=state.chars[i]; }catch(e){}
        if(!c){ say('找不到第 '+((i|0)+1)+' 个角色，无法执行'); return; }
        return _cai.apply(this,arguments);
      };
    }
    var _aif=window.aiFill;
    if(typeof _aif==='function'){
      window.aiFill=function(f){
        if(!f||!f.sel){ say('AI 按钮配置异常（缺少目标选择器）'); return; }
        if(!document.querySelector(f.sel)){ say('找不到目标输入框 '+f.sel+'，无法写入'); return; }
        return _aif.apply(this,arguments);
      };
    }
    var _lfc=window.loreFillCat;
    if(typeof _lfc==='function'){
      window.loreFillCat=function(catId){
        if(!catId){ say('这个「整类补全」按钮缺少分类信息，已跳过'); return; }
        return _lfc.apply(this,arguments);
      };
    }

    /* ---------- ④ 「从正文梳理」没正式章节时先讲清原因 ---------- */
    var _ced=window.castExtractDialog;
    if(typeof _ced==='function'){
      window.castExtractDialog=function(){
        try{
          var n=(typeof castSources==='function')?castSources({recent:0}).length:-1;
          if(n===0) say('还没有「已编入目录」的正式章节。先去「执笔成章 → 章节工坊」写一章，写好点章节上的「编入目录」，再回来梳理。');
        }catch(e){}
        return _ced.apply(this,arguments);
      };
    }
  }catch(e){}
})();
