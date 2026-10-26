export function createGuessCloseControls({h,api,getRound,refresh}){
 let busy=false,quote=null,mid=0
 const message=h('p',{role:'status'}),options=h('div',{class:'gr-close-options'}),panel=h('div',{class:'gr-close-panel',hidden:true,'aria-label':'流局管理'},message,options),vote=h('div',{class:'gr-close-vote',hidden:true,'aria-label':'流局表决'})
 const button=(label,fn)=>h('button',{type:'button',class:'gr-link',onclick:fn},label)
 async function action(body){
  if(busy)return;const r=getRound();if(!r)return;busy=true
  for(const b of [...options.querySelectorAll('button'),...vote.querySelectorAll('button')])b.disabled=true
  try{const data=await api(`/chat/messages/${r.message_id}/guess-close`,{method:'POST',body});message.textContent=data.text||'投票已记录';if(body.action!=='vote')panel.hidden=true;await refresh()}
  catch(e){panel.hidden=false;message.textContent=e.message;message.setAttribute('role','alert');if(body.action==='force')quote=null}
  finally{busy=false;for(const b of [...options.querySelectorAll('button'),...vote.querySelectorAll('button')])b.disabled=false;update(getRound())}
 }
 async function open(){
  const r=getRound();if(!r?.owner||r.state!=='open')return
  panel.hidden=!panel.hidden;if(panel.hidden)return
  mid=r.message_id;message.textContent='正在核对本轮状态…';options.replaceChildren();message.setAttribute('role','status')
  try{
   const data=await api(`/chat/messages/${mid}/guess-close`);if(getRound()?.message_id!==mid||panel.hidden)return;quote=data
   if(!data.available){message.textContent='已有中奖奖励锁定，不能主动流局。';return}
   if(data.pending){message.textContent='判题正在进行，请稍后重新打开；不会提前结束或扣奖。';return}
   message.textContent=data.needs_vote?'存在相关度高于50%的答案，普通流局须经有效参与者过半同意。':'本轮尚无高于50%的答案，可直接结束并公开答案。'
   options.append(button(data.needs_vote?'发起流局表决':'确认结束本轮',()=>action({action:'request'})))
   if(data.force_available){
    const confirm=h('input',{type:'checkbox','aria-label':'确认扣除奖励作为流局补偿'}),force=button(`确认扣除 ${data.compensation} ${data.currency} 并流局`,()=>{if(confirm.checked&&quote)action({action:'force',confirm:true,revision:quote.revision})});force.disabled=true;confirm.onchange=()=>{force.disabled=!confirm.checked}
    const details=h('details',null,h('summary',null,'强制流局 · 分出50%奖励'),h('p',null,'同答案仅首答者获得，补偿不计猜中。'),...data.recipients.map(v=>h('p',null,`${v.name} · ${v.score}% · ${v.amount} ${data.currency}`)),h('label',null,confirm,' 我确认分配上述奖励'),force)
    options.append(details)
   }
   options.append(button('收起',()=>{panel.hidden=true}))
  }catch(e){message.textContent=e.message;message.setAttribute('role','alert')}
 }
 function update(r){
  if(r?.message_id!==mid||r?.state!=='open')panel.hidden=true
  const v=r?.close_vote;vote.hidden=!v||v.status!=='open'||r.state!=='open'
  if(vote.hidden)return
  const text=`流局表决 ${v.yes}/${v.needed} 票同意 · ${v.no} 票反对`
  vote.replaceChildren(h('span',null,text))
  if(v.eligible&&v.choice===null){const yes=button('同意',()=>action({action:'vote',agree:true})),no=button('反对',()=>action({action:'vote',agree:false}));yes.disabled=no.disabled=busy;vote.append(yes,no)}
  else vote.append(h('small',null,v.choice===null?'仅本次参与者可投票':v.choice?'已同意':'已反对'))
  vote.title='需发起时有效参与者过半同意；截止 '+new Date(v.ends_at*1000).toLocaleTimeString('zh-CN')+'。投票期间可继续猜题。'
 }
 return {panel,vote,open,update}
}
