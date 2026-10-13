// ==UserScript==
// @name         尽欢红包连接器
// @namespace    https://52dmeme.com/
// @version      1.0.1
// @downloadURL  https://52dmeme.com/meme-redpacket.user.js
// @updateURL    https://52dmeme.com/meme-redpacket.user.js
// @description  使用自己的HB/Credit/fish登录态查询和领取；不托管积分，不上传登录凭据。
// @match        https://52dmeme.com/*
// @connect      hb.unsnow.org
// @connect      credit.linux.do
// @connect      meme.442224.xyz
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(()=>{
"use strict";
// 外站响应白名单。只用于展示个人查询结果，不作为本站积分账本。
const packetMoney = value => /^(?:0|[1-9]\d{0,12})(?:\.\d{1,8})?$/.test(String(value)) ? String(value) : null
const packetCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null
function packetSnapshot(provider, raw) {
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
function claimReceipt(provider, raw) {
  const d = provider === 'credit' ? raw?.data : raw
  if (d?.error) throw Error(String(d.error).slice(0,160))
  if (provider === 'hb' && d?.already === true) return { claimed: true, amount: null }
  const amount = packetMoney(d?.amount)
  if (amount === null) throw Error('领取结果尚未确认，请先重新查询或到原站核对，不要连续领取')
  return { claimed: true, amount }
}

// 与官方页面的公开请求契约一致；不读取Cookie，不接受任意请求URL。
const fishUuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)
const fishCode = value => [...value].length>=6 && [...value].length<=18 && /^[\p{Script=Han}A-Za-z0-9]+$/u.test(value)
async function fishPacket(action,ext,request) {
  const origin='https://meme.442224.xyz',session=await request(origin+'/api/session')
  if(!session.user || typeof session.csrfToken!=='string')throw Error('请先在 fish 登录自己的账号，再回群里继续')
  const accountKey='memeFish:'+String(session.user.id)+':'
  const key=accountKey+ext.ref, discoveryKey=key+':discovery'
  let id=ext.ref_kind==='id'?ext.ref:localStorage.getItem(key)
  let discoveredClaim=false
  const read=async activityId=>{
    if(!fishUuid(activityId))throw Error('fish 活动标识无效')
    const data=await request(origin+'/api/activities/'+activityId)
    const own=data.activity?.rewardType==='ldc'?await request(origin+'/api/activities/'+activityId+'/participation'):{}
    return {data,snapshot:packetSnapshot('fish',{...data,...own})}
  }
  if(!id && action==='query')return {state:'unmatched',kind:'password',claimed:false,remaining:null,total:null,amount:null}
  if(!id) {
    // discover 本身可能直接兑奖，只允许用户点击领取后执行，原 submissionId 保留到结果确定。
    let submission
    try{submission=JSON.parse(localStorage.getItem(discoveryKey)||'null')}catch{}
    if(!submission)submission={submissionId:crypto.randomUUID(),password:ext.ref}
    localStorage.setItem(discoveryKey,JSON.stringify(submission))
    let result
    try{result=await request(origin+'/api/redemptions/discover','POST',submission,{'X-CSRF-Token':session.csrfToken})}
    catch(e){if(e.status>=400&&e.status<500&&e.status!==429)localStorage.setItem(discoveryKey,'');throw e}
    if(result.result==='none'){localStorage.setItem(discoveryKey,'');throw Error('没有匹配的 fish 活动，请核对口令')}
    if(result.result!=='single' || !fishUuid(result.selectedActivityId || result.items?.[0]?.id || ''))throw Error('此口令匹配多个活动，请到 fish 选择要参加的活动')
    id=result.selectedActivityId || result.items[0].id
    if(!fishUuid(result.claimSubmissionId || '') || !fishUuid(result.id || ''))throw Error('fish 返回的兑奖标识无法确认，请到原站核对')
    localStorage.setItem(key,id)
    localStorage.setItem(accountKey+id+':submission',JSON.stringify({submissionId:result.claimSubmissionId,password:ext.ref,discoveryId:result.id}))
    discoveredClaim=!!result.claimResult
    localStorage.setItem(discoveryKey,'')
  }
  const pendingKey=accountKey+id+':submission'
  const {data,snapshot}=await read(id)
  if(discoveredClaim)return snapshot
  if(action==='query' || snapshot.claimed || snapshot.state!=='active' || !['fixed','random','custom','timed_draw'].includes(snapshot.kind))return snapshot
  let submission
  try{submission=JSON.parse(localStorage.getItem(pendingKey)||'null')}catch{}
  if(!submission) {
    if(data.activity.participationMode==='direct')submission={submissionId:crypto.randomUUID(),participationMode:'direct'}
    else {
      const password=ext.ref_kind==='text'?ext.ref:String(ext.password || '')
      if(!fishCode(password))throw Error('这个 fish 活动需要6–18字原站口令，请填写后再领取')
      submission={submissionId:crypto.randomUUID(),password}
    }
  }
  if(!fishUuid(submission.submissionId || ''))throw Error('fish 返回的兑奖标识无法确认，请到原站核对')
  localStorage.setItem(pendingKey,JSON.stringify(submission))
  let result
  try{result=await request(origin+'/api/activities/'+id+'/claim','POST',submission,{'X-CSRF-Token':session.csrfToken})}
  catch(e){if(e.status>=400&&e.status<500&&e.status!==429)localStorage.setItem(pendingKey,'');throw e}
  if(result.result==='incorrect'){localStorage.setItem(pendingKey,'');throw Error('fish 原站口令不正确')}
  const refreshed=await read(id)
  if(refreshed.snapshot.claimed || ['registered','drawing','not_won','payment_pending','simulation','expired','exhausted'].includes(refreshed.snapshot.state))localStorage.setItem(pendingKey,'')
  return refreshed.snapshot
}
window.addEventListener('message', async event => {
  if(event.source!==window || event.origin!==location.origin || location.origin!=='https://52dmeme.com')return
  const data=event.data
  if(data?.type!=='meme-redpacket-request' || !/^[a-f0-9-]{36}$/i.test(data.id))return
  const reply=(result,error)=>window.postMessage({type:'meme-redpacket-result',id:data.id,result,error},location.origin)
  if(data.action==='ping'){reply({version:'1.0.1'});return}
  if(!['query','claim'].includes(data.action))return
  try {
    const ext=data.external,provider=ext?.provider,ref=String(ext?.ref || '')
    let lookup
    if(provider==='credit' && /^[1-9][0-9]{0,19}$/.test(ref))lookup='https://credit.linux.do/api/v1/redenvelope/'+ref
    else if(provider==='hb' && ((ext.ref_kind==='numeric' && /^[0-9]{8}$/.test(ref)) || (ext.ref_kind==='text' && [...ref].length>=6 && [...ref].length<=18 && !/[\p{Cc}\p{Cf}]/u.test(ref))))lookup='https://hb.unsnow.org/api/hongbao/'+(ext.ref_kind==='numeric'?'code/':'text-code/')+encodeURIComponent(ref)
    else if(provider==='fish' && (ext.ref_kind==='id'&&fishUuid(ref) || ext.ref_kind==='text'&&fishCode(ref)))lookup='https://meme.442224.xyz/api/session'
    else throw Error('红包来源或口令无效，未发送请求')
    if(!navigator.locks?.request)throw Error('浏览器不支持领取锁，请前往原站')
    await navigator.locks.request('meme-redpacket-'+provider,{ifAvailable:true},async lock=>{
      if(!lock)throw Error('另一页面正在查询或领取，请稍后重试')
      const timeKey='memeRedpacketTime:'+provider,last=Number(localStorage.getItem(timeKey)||0)
      if(!Number.isFinite(last) || last>Date.now())throw Error('本机时间异常，请到原站核对')
      if(Date.now()-last<5000)throw Error('稍等 '+Math.ceil((5000-Date.now()+last)/1000)+' 秒再试')
      localStorage.setItem(timeKey,String(Date.now()))
      const request=(url,method='GET',body,extraHeaders={})=>new Promise((resolve,reject)=>GM_xmlhttpRequest({
        url,method,responseType:'json',timeout:15000,anonymous:false,
        headers:{Accept:'application/json',...(provider==='credit'?{'X-Requested-With':'XMLHttpRequest'}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{}),...extraHeaders},
        ...(body?{data:JSON.stringify(body)}:{}),
        onload:r=>{
          if(r.status<200 || r.status>=300){const error=Error(r.status===401?'请先在原站登录自己的账号':String(r.response?.error?.message || r.response?.error || `外站返回 ${r.status}，请到原站核对`).slice(0,180));error.status=r.status;reject(error);return}
          if(!r.response || typeof r.response!=='object'){reject(Error('外站需要验证或返回格式变化，请打开原站'));return}
          resolve(r.response)
        },onerror:()=>reject(Error('外站连接失败，请到原站核对')),ontimeout:()=>reject(Error('外站请求超时，请到原站核对')),
      }))
      if(provider==='fish'){reply(await fishPacket(data.action,ext,request));return}
      const snapshot=packetSnapshot(provider,await request(lookup))
      const uncertain='memeRedpacketUncertain:'+provider+':'+ref
      if(data.action==='query'){localStorage.setItem(uncertain,'');reply(snapshot);return}
      if(snapshot.claimed || snapshot.state!=='active'){reply(snapshot);return}
      if(!['fixed','equal','random','exclusive'].includes(snapshot.kind)){reply(snapshot);return}
      if(localStorage.getItem(uncertain))throw Error('上次领取结果未确认，请先刷新状态或到原站核对')
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(snapshot.id))throw Error('外站红包编号异常，未领取')
      localStorage.setItem(uncertain,'1')
      let receipt
      try {
        const raw=await request(provider==='credit'?'https://credit.linux.do/api/v1/redenvelope/claim':'https://hb.unsnow.org/api/hongbao/'+encodeURIComponent(snapshot.id)+'/grab','POST',provider==='credit'?{id:ref}:undefined)
        receipt=claimReceipt(provider,raw)
      }catch(error){throw Error('领取结果未确认：'+error.message+'。请先刷新状态，勿连续领取')}
      localStorage.setItem(uncertain,'')
      reply({...snapshot,...receipt,remaining:null})
    })
  }catch(error){reply(null,error.message)}
})

})();
