export function formatGuessDeadline(endsAt,nowSeconds,state){
  if(!Number.isFinite(endsAt)||endsAt<=0)return '截止时间待同步'
  const d=new Date(endsAt*1000),pad=n=>String(n).padStart(2,'0')
  const absolute=`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  if(state!=='open')return `原定截止 ${absolute}`
  const seconds=endsAt-nowSeconds,minutes=Math.ceil(seconds/60),hours=Math.floor(minutes/60),rest=minutes%60
  const remaining=seconds<=0?'已到期':seconds<60?'剩余不足1分钟':hours?`剩余 ${hours}小时${rest?rest+'分钟':''}`:`剩余 ${minutes}分钟`
  return `截止 ${absolute} · ${remaining}`
}

export function createGuessView({h,button,avatarImage,load,getSummaries}){
  function avatar(user){return user?.avatar?avatarImage(h,user.avatar,'',22,'gr-avatar'):h('span',{class:'gr-avatar gr-initial','aria-hidden':true},'·')}
  const progress=score=>h('div',{class:'gr-progress',role:'progressbar','aria-label':'答案相关度','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':score},h('i',{style:{width:Math.max(0,Math.min(100,score))+'%'}}))
  function participants(item){const users=item.users||[item.user],total=item.participant_count||users.length;return h('span',{class:'gr-person gr-avatar-stack','aria-label':total+' 人参与此回答',title:total+' 人参与此回答'},...users.map(avatar),total>users.length?h('b',{class:'gr-avatar-more'},'+'+(total-users.length)):null)}
  function row(item,state,index){
    if(item.hidden_answer===true)return h('article',{class:'gr-answer gm-hidden-winner','data-entry':item.id,'aria-label':'系统确认：'+item.user.name+'已猜中，答案保密'},h('div',{class:'gr-answer-top'},avatar(item.user),h('strong',{class:'gm-winner-name'},item.user.name),h('span',{class:'gm-system-confirmed',title:'系统已确认该玩家猜中，具体答案暂不公开'},h('span',{'aria-hidden':'true'},'✓'),' 系统确认 · 保密'),h('b',{class:'gm-winner-score'},'100%')));
    const label=({verified:'GPT 已审核',corrected:'GPT 已更正',uncertain:'GPT 待核实'})[item.review_state],review=label?h('small',{class:'gr-review '+item.review_state,'aria-label':label,title:item.review_state==='uncertain'?'GPT 无法确定，保留原判定':label},({verified:'已审',corrected:'更正',uncertain:'待核'})[item.review_state]):null
    const question=button(item.question,event=>{const node=event.currentTarget,open=node.closest('article').classList.toggle('is-expanded');node.setAttribute('aria-expanded',String(open))},{class:'gr-question-text',title:item.question+'（点击展开或收起）','aria-expanded':'false'})
    if(state.kind==='guesses'&&Array.isArray(item.character_matches))question.replaceChildren(...[...item.question].map((char,i)=>{const hit=item.character_matches[i];return h('span',{class:hit==='correct'?'gr-letter-correct gm-char-correct':hit==='present'?'gr-letter-present gm-char-present':'',title:hit==='correct'?'该字存在，且位置正确':hit==='present'?'该字存在，但位置不同':undefined},char)}))
    if(item.ai_style_hint?.length)question.append(h('small',{class:'gr-review uncertain',title:'命中发言模板，仅供人工复核，不能证明使用了AI'},' · 风格线索'))
    if(state.kind==='guesses')return h('article',{class:'gr-answer'+(!state.cursor&&index===0?' is-best':''),'data-entry':item.id},h('div',{class:'gr-answer-top'},h('small',null,String(state.history.length*20+index+1)),h('strong',null,question),review,h('b',null,`${item.score}%`)),h('div',{class:'gr-answer-bottom'},participants(item),progress(item.score)))
    return h('article',{class:'gr-yes-row','data-entry':item.id},h('p',null,h('span',{'aria-hidden':true},({negative:'×',unknown:'?',not_question:'·'})[state.kind]||'✓'),question,review),participants(item))
  }
  function renderSummary(state,data){
    const top=state.feed.scrollTop,old=new Map([...state.list.children].map(n=>[n.dataset.entry,n])),rows=data?.items||[]
    if(!rows.length)state.list.replaceChildren(h('p',{class:'gr-empty'},state.cursor?'本页暂无内容，可返回上一页。':state.kind==='guesses'?'还没有已评分的答案':['unknown','not_question'].includes(state.kind)?'暂无此类提问':'暂无确认的事实'))
    else{state.list.querySelector('.gr-empty')?.remove();rows.forEach((item,i)=>{const n=old.get(String(item.id)),value=JSON.stringify([item,i,state.cursor]);if(n?.dataset.value===value){state.list.append(n);old.delete(String(item.id));return}const el=row(item,state,i);el.dataset.value=value;n?.remove();state.list.append(el);old.delete(String(item.id))});for(const n of old.values())n.remove()}
    state.feed.scrollTop=state.fresh?0:top;state.fresh=false;state.next=data?.next||null;state.count.textContent=state.history.length?'第 '+(state.history.length+1)+' 页':rows.length?`${rows.length}${state.next?'+':''}`:'';state.back.hidden=!state.history.length;state.more.hidden=!state.next;state.back.disabled=state.more.disabled=false
  }
  function resetPages(){for(const state of getSummaries()){state.cursor=state.next=null;state.history=[];state.fresh=true}}
  function page(state,forward){
    if(forward&&!state.next||!forward&&!state.history.length)return
    if(forward){state.history.push(state.cursor);state.cursor=state.next}else state.cursor=state.history.pop()
    state.fresh=true;state.back.disabled=state.more.disabled=true;if(state.reload)state.reload();else load({restart:true})
  }
  return {avatar,participants,renderSummary,resetPages,page};
}
