// 外站响应白名单。只用于展示个人查询结果，不作为本站积分账本。
const packetMoney = value => /^(?:0|[1-9]\d{0,12})(?:\.\d{1,8})?$/.test(String(value)) ? String(value) : null
const packetCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null
export function packetSnapshot(provider, raw) {
  if(provider==='fish')return fishSnapshot(raw)
  const d = provider === 'credit' ? raw?.data : raw
  const p = provider === 'credit' ? d?.red_envelope : d
  const states = { active: 'active', finished: 'exhausted', exhausted: 'exhausted', expired: 'expired', cancelled: 'cancelled', drawn: 'drawn' }
  if (!p || !['hb','credit'].includes(provider) || !states[p.status] || !p.id || (typeof p.id === 'number' && !Number.isSafeInteger(p.id))) throw Error('外站返回无法识别，请到原站核对')
  const mine = provider === 'credit' ? d.user_claimed : p.mine
  return { id: String(p.id).slice(0,100), state: states[p.status], kind: String(p.type || 'unknown').slice(0,30),
    total: packetCount(provider === 'credit' ? p.total_count : p.count), remaining: packetCount(p.remaining_count),
    creator: String(provider === 'credit' ? p.creator_username || '' : p.creator?.username || '').slice(0,100),
    wish: String(provider === 'credit' ? p.greeting || '' : p.wish || '').slice(0,120),
    expires_at: provider === 'credit' && Number.isFinite(Date.parse(p.expires_at)) ? Math.floor(Date.parse(p.expires_at)/1000) : null,
    claimed: mine != null && mine !== false, amount: mine && typeof mine==='object' ? packetMoney(mine.amount) : null }
}
function fishSnapshot(raw) {
  const p=raw?.activity,registration=raw?.registration,claim=raw?.claim || registration?.claim,q=p?.quantity
  if(!p || !/^[a-f0-9-]{36}$/i.test(p.id) || !['draft','active','ended','archived'].includes(p.status))throw Error('fish 活动返回无法识别，请到原站核对')
  const total=q?.mode==='exact'?packetCount(q.total):null, count=q?.mode==='exact'?packetCount(q.claimed):null
  const remaining=total!==null && count!==null ? Math.max(0,total-count) : null
  const empty=!p.draw && (remaining===0 || q?.mode==='availability' && q.available===false || q?.mode==='fuzzy' && q.level==='empty')
  const expires=Number.isFinite(Date.parse(p.deadlineAt))?Math.floor(Date.parse(p.deadlineAt)/1000):null
  let state=p.status==='draft'?'draft':empty?'exhausted':['ended','archived'].includes(p.status)?'expired':expires && expires<=Date.now()/1000&&!p.draw?'expired':'active'
  if(p.draw?.state==='settling')state='drawing'
  if(p.draw && expires && expires<=Date.now()/1000)state='drawing'
  if(registration?.status==='registered')state='registered'
  if(registration?.status==='drawing')state='drawing'
  if(registration?.status==='not_won')state='not_won'
  if(registration?.status==='won')state='payment_pending'
  const claimed=claim?.rewardType==='ldc' && claim.payment?.mode==='real' && claim.payment?.status==='confirmed'
  if(claim?.rewardType==='ldc'&&!claimed)state=claim.payment?.mode==='simulation'?'simulation':'payment_pending'
  return {id:p.id,state,kind:p.rewardType==='text'?'text':String(p.reward?.mode || 'unknown'),claimed,amount:claimed?packetMoney(claim.amount):null,
    total,remaining,expires_at:expires,requires_password:p.participationMode!=='direct',creator:String(p.author?.displayName || p.author?.username || '').slice(0,100),wish:String(p.title || '').slice(0,120)}
}
export function claimReceipt(provider, raw) {
  const d = provider === 'credit' ? raw?.data : raw
  if (d?.error) throw Error(String(d.error).slice(0,160))
  if (provider === 'hb' && d?.already === true) return { claimed: true, amount: null }
  const amount = packetMoney(d?.amount)
  if (amount === null) throw Error('领取结果尚未确认，请先重新查询或到原站核对，不要连续领取')
  return { claimed: true, amount }
}
