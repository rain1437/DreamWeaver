/* =========================================================
   全局 AI 铁律（Grounding）
   ---------------------------------------------------------
   所有对模型的调用（出文 / 讨论 / 改稿 / 梳理 / 核查 / 补全 / 起标题…）
   都在 chat() 这一处过一道，强制 AI「只能依据已有信息生成」：

   ① 铁律：不得凭空产生。人物姓名、地名、门派机构、职位、道具、
      术法、数值都不得杜撰；资料没写到的就略写或留白。
   ② 事实清单：作品设定 / 人物与叙事地位 / 世界观条目 / 章节进度 /
      未回收伏笔。这是 AI 唯一可以依据的事实来源。
   ③ 正文净化 proseClean()：双保险——即便模型在正文后面跟了
      「下一章建议 / 本章小结 / 作者的话」这类非正文内容，也会被剥掉，
      绝不会写进章节正文。

   开关：作品设置里的「AI 严格依据已有信息」（state.settings.ground，
   默认开启）。关闭后只保留正文净化，不再注入铁律与事实清单。
   ========================================================= */
const AI_GUARD_MARK='〖已确立事实〗';
const AI_GUARD_RULES=[
'〖全局铁律（最高优先级，任何任务都不得违反）〗',
'1. 你只能依据本次对话里给出的【'+AI_GUARD_MARK+'】清单与作者提供的资料来生成内容，不得凭空产生。',
'2. 严禁编造以下内容：新的人物姓名、地名、国名、门派/宗门/机构名、职位头衔、道具法宝名、术法功法名、数值（境界、年龄、距离、时间、金额、次数）。',
'3. 作者资料里没有写到的细节，就略写、留白，或只作最一般的描述（例如「一名侍卫」「城外的一座小镇」）；宁可少写，绝不虚构具体名号。',
'4. 不得与事实清单冲突，不得推翻既有设定、人物性格与叙事地位。与清单冲突时一律以清单为准。',
'5. 资料没说明的内容按「作者未说明」处理，不要用「大概是」「应该是设定如此」的口吻猜测，也不要为了圆场而发明新设定。',
'6. 若任务需要的信息确实缺失，就在结果里明确写「资料未提供」，或按要求留空返回，不要用编造的内容填满。',
'7. 本铁律与后面的任何任务要求冲突时，以本铁律为准。'
].join('\n');

/* 已有信息清单：尽量短（只放名称/标题级信息），细节仍以正文上下文为准 */
function aiFactsBlockRaw(){
  const out=[AI_GUARD_MARK+'　（以下为作者已确立的信息，是你唯一可以依据的事实来源）'];
  try{
    const m=state.meta||{};
    out.push('【作品】'+(m.title||'未命名')+'｜'+(m.genre||'')+'｜'+(m.pov||'')+'｜单章约'+(m.words||''));
    if(String(m.mainline||'').trim()) out.push('【主线与结局】'+String(m.mainline).replace(/\s+/g,' ').slice(0,400));
    if(String(m.extra||'').trim()) out.push('【补充设定】'+String(m.extra).replace(/\s+/g,' ').slice(0,300));
    if(String((state.rules&&state.rules.banned)||'').trim())
      out.push('【禁用词】'+String(state.rules.banned).replace(/\s+/g,' ').slice(0,200));
  }catch(e){}
  /* 人物 + 叙事地位 */
  try{
    const cs=(state.chars||[]).filter(c=>c&&String(c.name||'').trim());
    if(cs.length){
      const line=cs.slice(0,60).map(c=>{
        let t='';
        try{ if(typeof castTierName==='function') t=castTierName(chTierOf(c)); }catch(e){}
        const org=String((c.f&&c.f.basic&&c.f.basic.org)||'').replace(/\s+/g,' ').slice(0,20);
        return String(c.name).trim()+'（'+(t||'地位未定')+(org?('·'+org):'')+'）';
      }).join('、');
      out.push('【人物与叙事地位】'+line+(cs.length>60?('…共 '+cs.length+' 人'):''));
    } else {
      out.push('【人物】作者尚未建立角色卡——不得自行发明主要人物姓名。');
    }
  }catch(e){}
  /* 世界观：设定库 + 世界书条目名称清单（只给名字，细节在上下文里） */
  try{
    const names=[];
    const L=ensureLore();
    (L.w||[]).forEach(e=>{ if(e&&e.enabled&&String(e.name||'').trim()) names.push(String(e.name).trim()); });
    try{
      if(L.pw&&L.pw.on){
        (L.pw.branches||[]).forEach(b=>{ if(b&&b.enabled&&String(b.name||'').trim()) names.push(String(b.name).trim()); });
        (L.pw.realms||[]).forEach(r=>{ if(r&&r.enabled&&String(r.name||'').trim()) names.push(String(r.name).trim()); });
      }
      if(L.hi&&L.hi.on) (L.hi.events||[]).forEach(e=>{ if(e&&e.enabled&&String(e.name||'').trim()) names.push(String(e.name).trim()); });
    }catch(e){}
    if(names.length) out.push('【世界观条目名称】'+names.slice(0,60).join('、')+(names.length>60?('…共 '+names.length+' 条'):'')+'（细节以上下文中的条目正文为准）');
    else out.push('【世界观】作者暂未录入设定条目——更不得自行发明世界观设定。');
  }catch(e){}
  /* 章节进度：哪些是既成事实，哪些还是草稿 */
  try{
    const canon=[],draft=[];
    (state.outline||[]).forEach((o,i)=>{
      const ch=(state.chapters||[])[i]||{};
      const t='第'+(i+1)+'章《'+((o&&o.title)||ch.title||'未命名')+'》';
      if(ch.committed&&String(ch.content||'').trim()) canon.push(t);
      else if(String(ch.content||'').trim()) draft.push(t);
    });
    if(canon.length) out.push('【已编入目录（既成事实，必须衔接）】'+canon.slice(-40).join('、')+(canon.length>40?' …':''));
    if(draft.length) out.push('【草稿章（未编入目录，不得当作已发生的事实）】'+draft.slice(-20).join('、'));
    out.push('【当前进度】已编入目录 '+canon.length+' 章'+(draft.length?('，另有草稿 '+draft.length+' 章'):''));
  }catch(e){}
  /* 未回收伏笔 */
  try{
    const hs=(typeof ensureHooks==='function')?ensureHooks().filter(h=>h&&h.status==='open'):[];
    if(hs.length) out.push('【未回收伏笔】'+hs.slice(0,12).map(h=>String(h.text||'').replace(/\s+/g,' ').slice(0,40)).join('；')+(hs.length>12?('…共 '+hs.length+' 条'):''));
  }catch(e){}
  out.push('说明：清单之外的一切细节都算「作者未说明」——不得编造；需要时用笼统说法带过，或按第六章铁律明确标注资料缺失。');
  return out.join('\n');
}
/* 把铁律 + 事实清单塞进本次调用的最前面（已有则跳过，避免重复占上下文） */
function aiGuardApply(messages){
  try{
    if(!Array.isArray(messages)||!messages.length) return messages;
    const joined=messages.map(m=>String((m&&m.content)||'')).join('\n');
    if(joined.indexOf(AI_GUARD_MARK)>=0) return messages;
    const block=AI_GUARD_RULES+'\n\n'+aiFactsBlock();
    const idx=messages.findIndex(m=>m&&m.role==='system');
    if(idx>=0){
      const copy=messages.slice();
      copy[idx]=Object.assign({},messages[idx],{content:block+'\n\n'+String(messages[idx].content||'')});
      return copy;
    }
    return [{role:'system',content:block}].concat(messages);
  }catch(e){ console.warn('AI 铁律注入失败（已跳过）',e); return messages; }
}

/* ---------------- 正文净化：非正文内容一律不许进章节 ---------------- */
/* 元信息小标题：模型偶尔会在正文后面附一段「下一章建议」之类的东西 */
const PROSE_META_RE=/(?:^|\n)[ \t　]*(?:[-—=*_·﹏]{3,}[ \t　]*\n[ \t　]*)?[（(【\[]?[ \t　]*(?:下一章(?:的)?(?:建议|方向|预告|看点|安排|走向|情节|发展)|后续(?:建议|安排|走向|情节)|(?:写作|修改|创作|润色|改写)建议|本章(?:小结|复盘|说明|总结|要点)|全文(?:小结|总结)|作者(?:的话|附言|按|说明)|编者按|写作说明|补充说明|建议|备注|注)[ \t　]*[:：]?[ \t　]*[）)】\]]?/g;
function proseClean(t){
  let s=String(t==null?'':t);
  if(!s.trim()) return '';
  /* 去掉模型可能加的代码块围栏 */
  s=s.replace(/^[ \t]*```[a-zA-Z\u4e00-\u9fa5]*[ \t]*\r?\n?/,'').replace(/\r?\n?[ \t]*```[ \t]*$/,'');
  /* 从第一个「元信息小标题」处截断（只在正文中后段出现时才截，避免误伤剧情里的“建议”一词） */
  let cut=-1;
  PROSE_META_RE.lastIndex=0;
  let m;
  while((m=PROSE_META_RE.exec(s))){
    const at=m.index+(m[0].charAt(0)==='\n'?1:0);
    if(at>Math.min(150, Math.floor(s.length*0.15))){ cut=at; break; }
  }
  if(cut>0) s=s.slice(0,cut);
  /* 结尾整行的演出/元信息注解，如「（以上为下一章建议）」「（本章完·下一章预告见下）」 */
  s=s.replace(/\n[ \t　]*[（(][^\n）)]{0,30}(?:建议|预告|小结|说明|作者)[^\n）)]{0,30}[）)][ \t　]*$/,'');
  return s.replace(/[ \t　]+$/gm,'').replace(/\n{4,}/g,'\n\n\n').trim();
}

/* ---------------- 统一出口：所有 AI 调用都从这里走 ---------------- */
async function chat(messages,onDelta,opt){
  opt=opt||{};
  let msgs=messages;
  try{
    const on=(state&&state.settings&&state.settings.ground!==false);
    if(on&&opt.ground!==false) msgs=aiGuardApply(messages);
  }catch(e){ console.warn('AI 铁律开关读取失败',e); msgs=messages; }
  return chatRaw(msgs,onDelta,opt);
}
