// 外站响应白名单。只用于展示个人查询结果，不作为本站积分账本。
const packetMoney = value => /^(?:0|[1-9]\d{0,12})(?:\.\d{1,8})?$/.test(String(value)) ? String(value) : null
const packetCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const packetName = value => String(value??'').normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'').slice(0,80)
const packetDate = value => typeof value==='string'&&Number.isFinite(Date.parse(value))?Math.floor(Date.parse(value)/1000):null
const packetPeople = (list,convert) => Array.isArray(list)?list.slice(0,100).map(convert):[]
const packetPerson = p => ({name:packetName(p.name||p.displayName||p.username||'匿名用户'),username:packetName(p.username),amount:packetMoney(p.amount)})
export function packetSnapshot(provider, raw, viewer) {
  if(provider==='fish')return fishSnapshot(raw)
  const d = provider === 'credit' ? raw?.data : raw
  const p = provider === 'credit' ? d?.red_envelope : d
  const states = { active: 'active', finished: 'exhausted', exhausted: 'exhausted', expired: 'expired', cancelled: 'cancelled', drawn: 'drawn' }
  if (!p || !['hb','credit'].includes(provider) || !states[p.status] || !p.id || (typeof p.id === 'number' && !Number.isSafeInteger(p.id))) throw Error('红包平台返回无法识别，请打开平台核对')
  const mine = provider === 'credit' ? d.user_claimed : p.mine
  const result = { id: String(p.id).slice(0,100), state: states[p.status], kind: String(p.type || 'unknown').slice(0,30),
    total: packetCount(provider === 'credit' ? p.total_count : p.count), remaining: packetCount(p.remaining_count),
    creator: String(provider === 'credit' ? p.creator_username || '' : p.creator?.username || '').slice(0,100),
    wish: String(provider === 'credit' ? p.greeting || '' : p.wish || '').slice(0,120),
    expires_at: provider === 'credit' && Number.isFinite(Date.parse(p.expires_at)) ? Math.floor(Date.parse(p.expires_at)/1000) : null,
    claimed: mine != null && mine !== false, amount: mine != null && mine !== false ? packetMoney(typeof mine==='object' ? mine.amount : mine) : null }
  result.claimed_count=provider==='hb'?packetCount(p.claimed_count):result.total!==null&&result.remaining!==null?Math.max(0,result.total-result.remaining):null
  if(provider==='hb'&&result.remaining===null&&result.total!==null&&result.claimed_count!==null)result.remaining=Math.max(0,result.total-result.claimed_count)
  result.recipients=packetPeople(provider==='credit'?d.claims:p.claims,packetPerson)
  result.roster_more=Array.isArray(provider==='credit'?d.claims:p.claims)&&(provider==='credit'?d.claims:p.claims).length>100
  if(provider==='hb'){
    // viewer 仅来自 HB 当前会话。不得用本站合并后的用户 ID 推断领奖身份。
    const known=viewer!==undefined,uid=viewer?.linuxdo_id
    result.blocked=known&&!viewer?'login':uid!=null&&String(uid)===String(p.creator?.linuxdo_id)?'own':
      known&&viewer&&p.target_username&&String(viewer.username).toLowerCase()!==String(p.target_username).toLowerCase()?'exclusive':null
    if(p.type==='lottery'){
      const winner=uid!=null&&Array.isArray(p.winners)?p.winners.find(w=>String(w.linuxdo_id)===String(uid)):null
      const ended=!!p.drawn_at||p.status==='drawn',clock=Number.isFinite(p.server_now)?p.server_now:Date.now()
      result.expires_at=Number.isFinite(p.draw_at)?Math.floor(p.draw_at/1000):null
      result.draw_at=result.expires_at;result.draw_complete=ended
      result.server_now=Number.isFinite(p.server_now)?Math.floor(p.server_now/1000):null
      result.participant_count=Array.isArray(p.participants)?p.participants.length:null
      result.winner_count=ended&&Array.isArray(p.winners)?p.winners.length:null
      result.winners=ended?packetPeople(p.winners,w=>({...packetPerson(w),payout:w.payout_status==='paid'?'paid':'pending'})):[]
      const winners=new Set((Array.isArray(p.winners)?p.winners:[]).map(w=>String(w.linuxdo_id)))
      result.participants=packetPeople(p.participants,v=>({...packetPerson(v),amount:null,result:ended?(winners.has(String(v.linuxdo_id))?'won':'not_won'):'registered'}))
      result.roster_more=(p.winners?.length||0)>100||(p.participants?.length||0)>100
      result.claimed=!!winner&&winner.payout_status==='paid'
      result.amount=result.claimed?packetMoney(winner.amount):null
      if(winner)result.state=result.claimed?'drawn':'payment_pending'
      else if(ended)result.state=p.joined?'not_won':'drawn'
      else if(p.status==='active'&&Number.isFinite(p.draw_at)&&p.draw_at<=clock)result.state='drawing'
      else if(p.status==='active'&&p.joined)result.state='registered'
    }
  }
  return result
}
function fishSnapshot(raw) {
  const p=raw?.activity,registration=raw?.registration,claim=raw?.claim || registration?.claim,q=p?.quantity
  if(!p || !/^[a-f0-9-]{36}$/i.test(p.id) || !['draft','active','ended','archived'].includes(p.status))throw Error('fish 活动返回无法识别，请到原站核对')
  const total=q?.mode==='exact'?packetCount(q.total):null, count=q?.mode==='exact'?packetCount(q.claimed):null
  const remaining=total!==null && count!==null ? Math.max(0,total-count) : null
  const empty=!p.draw && (remaining===0 || q?.mode==='availability' && q.available===false || q?.mode==='fuzzy' && q.level==='empty')
  const expires=packetDate(p.deadlineAt),completed=['completed','empty'].includes(p.draw?.state)
  let state=p.status==='draft'?'draft':empty?'exhausted':['ended','archived'].includes(p.status)?'expired':expires && expires<=Date.now()/1000&&!p.draw?'expired':'active'
  if(p.draw?.state==='settling')state='drawing'
  if(p.draw && expires && expires<=Date.now()/1000&&!completed)state='drawing'
  if(completed)state='drawn'
  if(registration?.status==='registered')state='registered'
  if(registration?.status==='drawing')state='drawing'
  if(registration?.status==='not_won')state='not_won'
  if(registration?.status==='won')state='payment_pending'
  const claimed=claim?.rewardType==='ldc' && claim.payment?.mode==='real' && claim.payment?.status==='confirmed'
  if(claim?.rewardType==='ldc'&&!claimed)state=claim.payment?.mode==='simulation'?'simulation':'payment_pending'
  // 新版公开活动省略旧显示开关，名单接口自身控制可见性；显式false继续尊重。
  const list=raw?.roster,visible=p.showRecipientList!==false&&list?.enabled!==false
  const high=Array.isArray(list?.titles?.highestClaimIds)?list.titles.highestClaimIds.slice(0,100):[]
  const low=Array.isArray(list?.titles?.lowestClaimIds)?list.titles.lowestClaimIds.slice(0,100):[]
  const people=visible?packetPeople(list?.items,row=>{
    const user=row.claimant||row.participant||row
    const king=typeof row.id==='string'&&high.includes(row.id),last=typeof row.id==='string'&&low.includes(row.id)
    return {...packetPerson({...user,amount:p.showRecipientAmount!==false?row.amount:null}),
      ...(p.showRecipientUsername===false?{name:'匿名用户',username:''}:{}),
      luck:p.reward?.mode==='random'&&king!==last?(king?'king':'last'):undefined,
      result:['registered','drawing','won','not_won'].includes(row.status)?row.status:undefined}
  }):[]
  return {id:p.id,state,kind:p.rewardType==='text'?'text':String(p.reward?.mode || 'unknown'),claimed,amount:claimed?packetMoney(claim.amount):null,
    total,remaining,claimed_count:count,participant_count:packetCount(p.draw?.registeredCount),winner_count:completed?packetCount(p.draw?.winnerCount):null,
    draw_at:p.draw?(packetDate(registration?.drawAt)||expires):null,draw_deadline:!!p.draw,draw_complete:completed,
    winners:p.draw&&completed?people:[],participants:p.draw&&!completed?people:[],recipients:!p.draw?people:[],
    roster_more:visible&&(!!list?.nextCursor||list?.truncated===true||(list?.items?.length||0)>100),roster_error:raw?.roster_error===true,
    expires_at:expires,requires_password:p.participationMode!=='direct',creator:String(p.author?.displayName || p.author?.username || '').slice(0,100),wish:String(p.title || '').slice(0,120)}
}
export function claimReceipt(provider, raw) {
  const d = provider === 'credit' ? raw?.data : raw
  if (d?.error) throw Error(String(d.error).slice(0,160))
  if (provider === 'hb' && d?.already === true) return { claimed: true, amount: null }
  const amount = packetMoney(d?.amount)
  if (amount === null) throw Error('领取结果尚未确认，请先重新查询或到原站核对，不要连续领取')
  return { claimed: true, amount }
}
