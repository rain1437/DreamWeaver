
/* ================== 导入世界书：复现 bug + 验证修复 + 进度弹窗 ================== */
const fs2=require('fs');

head('A 加载整页脚本');
try{ vm.createContext(sandbox); vm.runInContext(code, sandbox, {filename:'app.js'}); ok(true,'脚本执行未抛异常'); }
catch(e){ ok(false,'脚本执行抛异常: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }

/* ---- 模拟浏览器真实行为：input.files 是「活」的 FileList，value='' 会把它清空 ---- */
function makeFile(name,content){ return {name, text:()=>Promise.resolve(content)}; }
function liveFileList(files, input){
  const fl={
    get length(){ return input.value===''?0:files.length; },   /* 真实浏览器就是这样 */
    item:i=>files[i]
  };
  files.forEach((f,i)=>{ fl[i]=f; });
  return fl;
}
function fireFileInput(sel, files){
  const inp=doc.querySelector(sel);
  if(!inp.onchange) return {err:'未绑定 onchange'};
  inp.value='C:\\fakepath\\'+files[0].name;
  const fl=liveFileList(files, inp);
  const ev={target:inp, stopPropagation(){}, preventDefault(){}};
  Object.defineProperty(ev.target,'files',{get:()=>fl,configurable:true});
  try{ inp.onchange(ev); }catch(e){ return {err:e.message}; }
  return {ok:true, fl};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* 记录 #dlg 的开关序列，用来验证「进度窗自动关闭 → 报告窗再弹出」 */
const dlgEl=doc.querySelector('#dlg');
let SEQ=[];
(function(){
  const _show=dlgEl.showModal.bind(dlgEl), _close=dlgEl.close.bind(dlgEl);
  dlgEl.showModal=()=>{ SEQ.push('open'); _show(); };
  dlgEl.close=()=>{ SEQ.push('close'); _close(); };
})();

setTimeout(async()=>{ try{

  head('B 读取素材');
  const bookJson=fs2.readFileSync('世界书-已分类版.json','utf8');
  ok(bookJson.length>1000,'拆解版世界书可读（'+bookJson.length+' 字符）');

  head('C 复现原 bug 的机制（活性 FileList）');
  {
    const inp={value:''};
    const files=[makeFile('a.json','{}')];
    const fl=liveFileList(files,inp);
    inp.value='C:\\fakepath\\a.json';
    const before=[].slice.call(fl).length;
    inp.value='';
    const after=[].slice.call(fl).length;
    ok(before===1,'选中文件后 FileList.length = '+before);
    ok(after===0,'清空 value 后 FileList.length = '+after+'  ← 旧代码正是在此丢掉文件');
  }

  head('D 点击「⇧ 导入世界书」的实际链路');
  const fi=doc.querySelector('#fileWB');
  ok(typeof fi.onchange==='function','#fileWB 已绑定 onchange（按钮点击后能走到这里）');
  const r=fireFileInput('#fileWB',[makeFile('世界书-已分类版.json',bookJson)]);
  ok(!r.err,'触发导入未抛异常'+(r.err?(' → '+r.err):''));

  head('E 进度弹窗（立刻出现）');
  const dlg=doc.querySelector('#dlg');
  ok(dlg.open===true,'导入一开始就弹出了进度窗口');
  const head1=doc.querySelector('#wbProgHead');
  ok(head1.textContent.indexOf('正在导入世界书')>=0,'进度窗标题正确：「'+head1.textContent+'」');
  ok(doc.querySelector('#wbProgStat').innerHTML.indexOf('已解析')>=0,'进度窗显示实时统计');

  await sleep(2600);

  head('F 导入结果落位');
  const L=sandbox.__T.state.lore;
  ok(L.w.length===17,'世界观大类 17 条（实际 '+L.w.length+'）');
  ok(L.pw.realms.length===1,'力量/境界 1 条');
  ok(L.pw.branches.length===1,'力量/修炼分支 1 条');
  ok((L.pw.general||'').indexOf('魔素进化机制')>=0,'力量/总纲已写入');
  ok((L.gl.extra||'').indexOf('能量体系唯一性')>=0,'全局约束已写入');
  const geo=L.w.filter(x=>x.cat==='geo');
  ok(geo.length===6,'地理疆域归入 6 条（实际 '+geo.length+'）');
  const rel=L.w.filter(x=>x.cat==='religion');
  ok(rel.length===4,'宗教信仰归入 4 条（实际 '+rel.length+'）');

  head('G 进度弹窗自动关闭 → 报告窗随后弹出');
  ok(doc.querySelector('#wbProgBar').style.width==='100%','进度条走到 100%');
  ok(doc.querySelector('#wbProgHead').textContent.indexOf('导入完成')>=0,'标题变为「导入完成」');
  ok(SEQ[0]==='open','第 1 次弹窗 = 进度窗：'+JSON.stringify(SEQ));
  ok(SEQ.indexOf('close')>=0,'进度窗确实被关闭过（自动关闭）');
  ok(SEQ[SEQ.length-1]==='open','关闭之后又弹出了报告窗（最终为 open）');
  ok(SEQ.join(',').indexOf('open,close,open')>=0,'开关序列符合预期：进度窗→关闭→报告窗');

  head('H 分类报告内容');
  const body=doc.querySelector('#dlgBody').innerHTML;
  ok(body.length>200,'报告窗口已渲染（'+body.length+' 字符）');
  ok(body.indexOf('地理疆域')>=0,'报告里有「地理疆域」分类分布');

  head('I 多文件 + 坏文件容错');
  const before=L.w.length;
  SEQ=[];
  const r2=fireFileInput('#fileWB',[
    makeFile('好文件.json',bookJson),
    makeFile('坏的.json','{ 这不是 json')
  ]);
  ok(!r2.err,'多文件导入未抛异常');
  await sleep(3600);
  ok(L.w.length===before,'重复条目被跳过，不覆盖已有内容（'+before+' → '+L.w.length+'）');
  ok(SEQ.indexOf('close')>=0,'含坏文件时进度窗同样自动关闭（序列 '+JSON.stringify(SEQ)+'）');
  ok(doc.querySelector('#wbProgBar').style.width==='100%','多文件进度条同样到 100%');
  ok(ERR.length===0,'全程无未捕获异常'+(ERR.length?('：'+ERR.join(' | ')):''));

  head('J 设定库导入入口仍正常');
  ok(typeof doc.querySelector('#fileLore').onchange==='function','#fileLore 已绑定');
  ok(typeof doc.querySelector('#fileChar').onchange==='function','#fileChar 已绑定');

  LOG.push('\n===== '+(ERR.length?('失败 '+ERR.length+' 项'):'全部通过')+' =====');
  fs2.writeFileSync('imp.log',LOG.join('\n'),'utf8');
  console.log(LOG.join('\n'));
  process.exit(ERR.length?1:0);

}catch(e){ LOG.push('测试脚本异常: '+e.message+'\n'+e.stack); fs2.writeFileSync('imp.log',LOG.join('\n'),'utf8'); console.log(LOG.join('\n')); process.exit(1); } },300);
