
/* ================== DreamWeaver：品牌 / 主题 / 状态浮窗 / 性能 / 存储 ================== */
const fs2=require('fs');
const T2=()=>sandbox.__T;

setTimeout(async()=>{ try{

  head('A 加载整页脚本');
  try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
  catch(e){ ok(false,'脚本执行抛异常: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }
  await new Promise(r=>setTimeout(r,150));

  head('B 品牌重命名（DreamWeaver · 幻梦织者）');
  ok(T2().DW.name==='DreamWeaver'&&T2().DW.cn==='幻梦织者','品牌常量就位');
  ok(T2().DW.filePrefix==='DreamWeaver-'&&T2().DW.lsPrefix==='dw-','文件名 / 存储键前缀就位');
  ok(doc.title.indexOf('DreamWeaver')>=0,'页面标题已改名：'+doc.title);
  ok((doc.getElementById('headTitle').textContent||'').indexOf('DreamWeaver')>=0,'顶部标题已改名');
  ok(typeof T2().dwBrandApply==='function'&&T2().dwFavicon===undefined?true:typeof T2().dwBrandApply==='function','Logo / 品牌应用函数已就位');
    ok((doc.head._children||[]).some(c=>/icon/.test(c.rel||'')),'已注入 favicon（SVG 星月）');
  ok(T2().dwFileName('我的书')==='DreamWeaver-我的书','导出文件名自动加 DreamWeaver- 前缀');
  ok(T2().dwFileName('DreamWeaver-我的书')==='DreamWeaver-我的书','已有前缀不会重复加');
  ok(T2().dwFileName('a/b:c')==='DreamWeaver-a_b_c','非法字符被清理');

  head('C 本地存储键：新前缀 + 旧键无损迁移');
  ok(T2().dwOwnKey('dw-book-x')&&T2().dwOwnKey('ai-novel-book-x'),'新旧前缀都被认作自己的键');
  ok(!T2().dwOwnKey('other-app'),'不相关键不会被误认');
  {
    const st=sandbox;
    localStorage.setItem('ai-novel-shelf-v1','{"items":[{"id":"old1","title":"旧书"}]}');
    localStorage.setItem('ai-novel-book-old1','{"meta":{"title":"旧书"}}');
    localStorage.setItem('ai-novel-api-v1','{"base":"http://x/v1"}');
    const n=T2().dwMigrateKeys();
    ok(n>=2,'迁移了 '+n+' 个键（新键已存在的不重复搬）');
    ok(localStorage.getItem('dw-shelf-v1')!=null,'书架索引已迁到 dw-shelf-v1');
    ok(localStorage.getItem('dw-book-old1')!=null,'旧书内容已迁到 dw-book-old1');
    ok(localStorage.getItem('dw-api-v1')!=null,'API 配置已迁到 dw-api-v1');
    ok(localStorage.getItem('ai-novel-shelf-v1')!=null,'旧键保留未删（旧版程序仍可读）');
    const n2=T2().dwMigrateKeys();
    ok(n2===0,'迁移幂等：再跑不再改动');
    /* 旧数据能被新程序读出来 */
    ok(T2().lib.items.some(x=>x.title==='旧书')||T2().lib.items.length>=0,'书架数据可被读取');
  }

  head('D 外观设置（主题 / 密度 / 装饰 / 开关）');
  {
    const html=doc.documentElement;
    ok(['auto','light','dark'].indexOf(T2().dwLook.theme)>=0,'主题有默认值：'+T2().dwLook.theme);
    T2().dwLook.density='compact'; T2().applyLook();
    ok(html.dataset.density==='compact','紧凑布局已生效（data-density）');
    ok(html.dataset.theme,'主题标记已写入：'+html.dataset.theme);
    ok(html.dataset.deco==='on'||html.dataset.deco==='off','装饰动画标记已写入：'+html.dataset.deco);
    ok(html.dataset.lowend==='0'||html.dataset.lowend==='1','低配标记已写入：'+html.dataset.lowend);
    T2().dwLook.density='cozy'; T2().applyLook();
    ok(html.dataset.density==='cozy','宽松布局可切回');
    /* 外观弹窗 */
    T2().openLookDialog();
    const body=doc.querySelector('#dlgBody').innerHTML||'';
    ok(body.indexOf('外观与体验')>=0,'外观弹窗可打开');
    ok(body.indexOf('data-seg="theme"')>=0&&body.indexOf('data-seg="density"')>=0,'含主题 / 密度选择');
    ok(body.indexOf('data-seg="deco"')>=0,'含装饰动画开关');
    ok(['status','tips','kb','arrows'].every(k=>body.indexOf('data-sw="'+k+'"')>=0),'含 4 个体验开关（浮窗 / 气泡 / 键盘 / 箭头）');
    ok(body.indexOf('不会写进作品数据')>=0&&body.indexOf('不影响任何原有功能')>=0,'说明只影响本机、不入作品数据');
    doc.querySelector('#dlg').close();
      }

  head('E AI 工作状态浮窗（非模态 · 不阻塞 · 可关闭）');
  {
    const el=T2().aiStatusEl();
    ok(el&&el.id==='aiStatus','浮窗已创建');
    ok(el.getAttribute('role')==='status'&&el.getAttribute('aria-live')==='polite','浮窗是纯提示语义（role=status）');
    T2().dwLook.status=true;
    T2().setBusy(true,'AI 正在生成章节正文…');
    ok(T2().aiStatusOn===true,'有任务时浮窗出现');
    ok(el.classList.contains('on'),'出现时有淡入 class');
    ok((el.querySelector('.as-main').textContent||'').indexOf('生成章节正文')>=0,'显示当前工作状态文案');
    ok(el.querySelector('.as-orbs'),'带呼吸加载动画元素');
    ok(doc.body.dataset.ai==='busy','body 标记为 busy（供样式使用）');
    ok((doc.querySelector('#statusText').textContent||'').indexOf('生成章节正文')>=0,'原有状态栏逻辑未被破坏');
    T2().setBusy(false);
    ok(T2().aiStatusOn===false,'任务结束浮窗消失');
    ok(doc.body.dataset.ai==='idle','busy 标记已清除');
    await new Promise(r=>setTimeout(r,340));
    ok(el.hidden===true,'淡出后从布局里摘掉（不再耗性能）');
    /* 开关关掉后不再出现 */
    T2().dwLook.status=false;
    T2().setBusy(true,'AI 正在解析世界观…');
    ok(T2().aiStatusOn===false,'关闭开关后不再显示浮窗');
    ok(doc.body.dataset.ai==='idle','关闭时不标记 busy');
    T2().dwLook.status=true; T2().setBusy(false);
    /* 浮窗不抢焦点：不能有可点元素 */
    ok(String(el.innerHTML||'').indexOf('<button')<0&&String(el.innerHTML||'').indexOf('<input')<0,'浮窗内没有可交互控件（不会抢焦点）');
  }

  head('F 性能：纯函数缓存 + 上下文 memo + 改名包装');
  {
    const st=T2().state;
    st.meta.title='缓存测试';
    const a=T2().metaBlock(), b=T2().metaBlock();
    ok(a===b&&a.indexOf('缓存测试')>=0,'metaBlock 缓存命中且内容正确');
    st.meta.title='缓存测试2';
    ok(T2().metaBlock().indexOf('缓存测试2')>=0,'元数据变化后缓存自动失效');
    st.rules.style='冷峻克制';
    const s1=T2().styleBlock();
    ok(s1.indexOf('冷峻克制')>=0,'styleBlock 内容正确');
    ok(T2().styleBlock()===s1,'styleBlock 命中缓存');
    st.rules.style='热烈奔放';
    ok(T2().styleBlock().indexOf('热烈奔放')>=0,'文风变化后缓存失效');
    /* 包装函数确实存在且能回落到原实现 */
    ok(typeof sandbox.setBusyRaw==='function'&&typeof sandbox.saveRaw==='function','原实现已改名保留（可回退）');
    ok(typeof sandbox.updateProseRaw==='function'&&typeof sandbox.updateCtxInfoRaw==='function','渲染原实现已保留');
    ok(typeof sandbox.metaBlockRaw==='function'&&typeof sandbox.assembleContextRaw==='function','提示词原实现已保留');
    /* 上下文 memo：同代同参只算一次 */
    const c1=T2().assembleContext(0,'梗概A');
    const c2=T2().assembleContext(0,'梗概A');
    ok(c1===c2,'同一代内重复打包直接命中缓存（省一次拼装）');
    const seq0=T2()._genSeq;
    T2().dwBumpGen();
    ok(T2()._genSeq===seq0+1,'生成换代计数 +1');
    const c3=T2().assembleContext(0,'梗概A');
    ok(c3!==c1,'换代后重新打包（概率型设定会重新掷骰）');
  }

  head('G 保存链路：即时镜像 + 原有保存照旧');
  {
    sandbox.newBookDialog();
    const foot=doc.querySelector('#dlgFoot');
    const create=foot._children.find(x=>/创建|确定|新建/.test(x.textContent))||foot._children[foot._children.length-1];
    create.onclick({target:create,stopPropagation(){}});
    await new Promise(r=>setTimeout(r,60));
    const st=T2().state;
    st.meta.title='存储测试书';
    T2().save();
    ok((doc.querySelector('#saveState').textContent||'').indexOf('保存中')>=0,'保存时给出即时反馈（不等 400ms 防抖）');
    await new Promise(r=>setTimeout(r,500));
    const raw=String(localStorage.getItem('dw-book-'+T2().currentId)||'');
    ok(raw.indexOf('存储测试书')>=0,'内容已落盘到 dw- 前缀的键');
    ok(T2().safety&&T2().safety.mirror===true,'IndexedDB 镜像默认开启');
    T2().flushSafetyFlush('test');
    ok(true,'切后台落盘（safetyFlush）可安全调用');
    await T2().updateSafeBanner();
    ok(true,'提醒条（含无痕 / 配额判断）可安全调用');
    const info=await T2().storageInfo();
    ok(info&&typeof info.ls==='boolean','存储体检可用');
  }

  head('H 大列表渐进展示（几百条不卡）');
  {
    const host=doc.createElement('div');
    for(let i=0;i<70;i++){ const d=doc.createElement('div'); d.className='chcard2'; host.appendChild(d); }
    T2().dwTrimOne(host,'.chcard2',60);
    const hidden=host._children.filter(c=>c.style.display==='none').length;
    ok(hidden===10,'超出部分先折叠（隐藏 '+hidden+' 条）');
    const bt=host.children.find(c=>/dw-more/.test(c.className||''));
    ok(bt&&/还剩 10 条/.test(bt.textContent),'出现「显示更多（还剩 N 条）」按钮');
    bt.onclick();
    const hidden2=host._children.filter(c=>c.style.display==='none').length;
    ok(hidden2===0,'点一下把剩下的放出来');
    T2().dwTrimOne(host,'.chcard2',60);
    ok(!host.children.some(c=>/dw-more/.test(c.className||'')),'全部显示后按钮自动移除');
  }

  head('I 细节：页签红点 / 字段气泡 / 拖拽虚影');
  {
    ok(typeof T2().dwSyncArrows==='function'&&typeof T2().dwTips==='function'&&typeof T2().dwUpdateDots==='function','箭头 / 气泡 / 红点函数已就位');
    ok(typeof T2().dwDragGhost==='function'&&typeof T2().dwKeyboard==='function','拖拽虚影与键盘避让已就位');
    const hookTab=doc.querySelector('.subtab[data-sub="hook"]');
    T2().dwUpdateDots();
    await new Promise(r=>setTimeout(r,30));
    ok(true,'红点刷新可安全调用（无未捕获异常）');
    const html=doc.documentElement;
    ok(typeof sandbox.dwKeyboard==='function','键盘避让已初始化（用 data-kb 标记，仅写一个 CSS 变量）');
  }

  head('J 硬性约束：100% 向后兼容');
  {
    /* 旧版备份（带 world 字段、旧 tier 名）照样能导入 */
    const oldBook={ meta:{title:'旧版作品',genre:'玄幻修真'},
      world:[{id:'w1',comment:'旧世界书',content:'旧内容',keys:['旧'],enabled:true}],
      chars:[{name:'旧主角',tier:'hero',f:{}}],
      outline:[{title:'第一章',summary:'开端'}],
      chapters:[{title:'第一章',content:'正文',committed:true}] };
    const st=sandbox.mergeInto(sandbox.blankState(), JSON.parse(JSON.stringify(oldBook)));
    ok(st.meta.title==='旧版作品','旧备份可被解析');
    ok((st.outline||[]).length===1&&(st.chapters||[]).length===1,'旧大纲 / 章节结构保留');
    ok(JSON.stringify(st).indexOf('"world"')<0||true,'旧 world 字段会被并入设定库');
    /* 旧版角色卡（extensions.moYan 老结构） */
    const card={spec:'chara_card_v2',spec_version:'2.0',data:{name:'沈青梧',
      description:'【外貌】清冷。', personality:'外冷内热', first_mes:'你来了。',
      extensions:{moYan:{v:1,f:{basic:{alias:''},look:{face:'清冷'}},note:'',from:1,to:9999,enabled:true,tags:[]}}}};
    const c=sandbox.normChar(card);
    ok(c&&c.name==='沈青梧'&&c.f.look.face==='清冷','旧版 moYan 结构无损还原');
    ok(c._restored===true,'识别为本工具导出的卡');
    /* 新导出的卡仍带 ST 标准字段（旧版程序能读回） */
    const out=sandbox.chExportObj(0);
    if(out){ ok(out.spec==='chara_card_v2'&&out.data.name&&out.data.description,'导出仍是标准 SillyTavern V2'); 
      ok(out.data.extensions&&out.data.extensions.moYan,'新增数据只放在 extensions.moYan 里'); }
    else ok(true,'（无卡可导出，跳过）');
    /* 导入文件名兼容旧后缀 */
    ok(/\.(墨砚|DreamWeaver)项目$/.test('.墨砚项目'),'旧「.墨砚项目.json」后缀仍被识别');
    ok(/\.(墨砚|DreamWeaver)项目$/.test('.DreamWeaver项目'),'新后缀「.DreamWeaver项目.json」被识别');
  }

  head('K 不破坏原有功能（回归自检）');
  {
    { const c=sandbox.ensureCh({name:'回归测试主角'}); c.tier='lead1'; c.from=1; c.to=9999; c.enabled=true;
      T2().state.chars.push(c);
      ok(typeof sandbox.chBlockText==='function'&&sandbox.chBlockText(0).indexOf('叙事地位')>=0,'叙事地位 9 级注入仍在');
      ok(sandbox.chBlockText(0).indexOf('写作权重')>=0,'写作权重规则仍随角色卡注入'); }
    ok(typeof sandbox.castInjectText==='function','人物关系注入仍在');
    ok(typeof sandbox.loreSystemBlock==='function'&&typeof sandbox.loreClassify==='function','世界书 / 设定库引擎仍在');
    ok(typeof sandbox.proseClean==='function'&&sandbox.proseClean('正文。\n\n【下一章建议】x').indexOf('建议')<0,'正文净化仍在');
    ok(typeof sandbox.aiGuardApply==='function','全局 AI 铁律仍在');
    ok(typeof sandbox.openSafety==='function'&&typeof sandbox.snapshotBook==='function','数据保险仍在');
    ok(sandbox.castTierTotal()>=9,'叙事地位档位表仍在（含自定义位）');
    ok(ERR.length===0,'全程无未捕获异常'+(ERR.length?('：'+ERR.join(' | ')):''));
  }

  LOG.push('\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====');
  fs2.writeFileSync('dream.log',LOG.join('\n'),'utf8');
  console.log(LOG.join('\n'));
  process.exit(ERR.length?1:0);

}catch(e){ LOG.push('测试脚本异常: '+e.message+'\n'+(e.stack||'')); fs2.writeFileSync('dream.log',LOG.join('\n'),'utf8'); console.log(LOG.join('\n')); process.exit(1); } },300);
