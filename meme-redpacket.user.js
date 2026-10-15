// ==UserScript==
// @name         尽欢红包连接器
// @namespace    https://52dmeme.com/
// @version      1.3.0
// @downloadURL  https://52dmeme.com/meme-redpacket.user.js
// @updateURL    https://52dmeme.com/meme-redpacket.user.js
// @description  用本人登录态查询领取 HB/Credit/fish；Credit 发包仅在其来源页本人确认，不托管积分或登录凭据。
// @match        https://52dmeme.com/*
// @match        https://credit.linux.do/*
// @connect      hb.unsnow.org
// @connect      credit.linux.do
// @connect      meme.442224.xyz
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(()=>{
"use strict";
// 外站响应白名单。只用于展示个人查询结果，不作为本站积分账本。
const packetMoney = value => /^(?:0|[1-9]\d{0,12})(?:\.\d{1,8})?$/.test(String(value)) ? String(value) : null
const packetCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null
function packetSnapshot(provider, raw, viewer) {
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
  if(provider==='hb'){
    // viewer 仅来自 HB 当前会话。不得用本站合并后的用户 ID 推断领奖身份。
    const known=viewer!==undefined,uid=viewer?.linuxdo_id
    result.blocked=known&&!viewer?'login':uid!=null&&String(uid)===String(p.creator?.linuxdo_id)?'own':
      known&&viewer&&p.target_username&&String(viewer.username).toLowerCase()!==String(p.target_username).toLowerCase()?'exclusive':null
    if(p.type==='lottery'){
      const winner=uid!=null&&Array.isArray(p.winners)?p.winners.find(w=>String(w.linuxdo_id)===String(uid)):null
      const ended=!!p.drawn_at||p.status==='drawn',clock=Number.isFinite(p.server_now)?p.server_now:Date.now()
      result.expires_at=Number.isFinite(p.draw_at)?Math.floor(p.draw_at/1000):null
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

const operationPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const creditIdPattern=/^[1-9]\d{0,19}$/

function cents(value){
 const text=String(value)
 if(!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(text))throw Error('LDC 金额最多两位小数')
 const [whole,fraction='']=text.split('.')
 return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))
}
function decimal(value){return `${value/100n}.${String(value%100n).padStart(2,'0')}`}

function normalizeCreditCreate(input){
 if(input?.provider!=='credit' || !operationPattern.test(String(input.operation||'')) || !['fixed','random'].includes(input.kind))throw Error('Credit 创建参数无效')
 const amount=cents(input.amount),count=Number(input.count),greeting=String(input.greeting||'').trim()
 if(amount<100n || !Number.isSafeInteger(count) || count<1 || count>10000 || amount<BigInt(count))throw Error('总额至少 1 LDC，每份至少 0.01 LDC，份数为 1～10000')
 if([...greeting].length>100)throw Error('祝福语最多 100 字')
 return {operation:String(input.operation),kind:input.kind,amount:decimal(amount),count,greeting}
}

function previewCreditCreate(params,config){
 if(config?.red_envelope_enabled!==true)throw Error('Credit 红包暂未开放或公开配置无法确认')
 const amount=cents(params.amount),rate=cents(config.red_envelope_fee_rate),max=cents(config.red_envelope_max_amount)
 const maxCount=Number(config.red_envelope_max_recipients)
 if(rate>100n || amount>max || !Number.isSafeInteger(maxCount) || params.count>maxCount)throw Error('超过 Credit 当前金额、份数或费率限制')
 const fee=(amount*rate+50n)/100n
 return {fee:decimal(fee),deduction:decimal(amount+fee)}
}

function creditCreateId(raw){
 const id=raw?.data?.id
 if(raw?.success===false || typeof id!=='string' || !creditIdPattern.test(id))throw Error('Credit 创建结果无法确认，请核对已发送记录')
 return id
}

// 仅在 Credit 自身来源页面运行。支付口令不经过尽欢页面、postMessage 或 GM 存储。
function mountCreditCreatePage(){
 if(location.origin!=='https://credit.linux.do')return
 const operation=new URLSearchParams(location.search).get('jh-credit')
 if(!operationPattern.test(operation||''))return
 const key='credit-create:'+operation
 const host=document.createElement('div')
 host.id='jh-credit-create'
 const root=host.attachShadow({mode:'closed'})
 root.innerHTML=`<style>
  :host{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#172820b8;padding:12px;font:16px/1.5 system-ui;color:#52392f}
  *{box-sizing:border-box}.panel{width:min(440px,100%);max-height:calc(100vh - 24px);overflow:auto;background:#fff7e9;border:3px solid #e7a088;border-radius:23px;box-shadow:0 18px 50px #1d1a1680;padding:22px}
  h1{font-size:22px;margin:0 0 8px}.cat{font-size:34px;float:right}p{margin:10px 0}dl{display:grid;grid-template-columns:auto 1fr;gap:4px 18px;padding:12px;background:#fff;border-radius:14px}dd{margin:0;text-align:right;font-weight:700}
  label{display:block;margin:14px 0 7px;font-weight:700}input{width:100%;font:inherit;padding:12px;border:1px solid #c8b6a7;border-radius:11px}button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:11px 16px;cursor:pointer}button:disabled{opacity:.55;cursor:wait}.pay{background:#eb9c87;color:#3c2a23}.cancel{background:#eee8dd;color:#513d32}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.state{min-height:24px;color:#8c493b}.recovery{padding:12px;background:#fff;border-radius:12px}.recovery a{color:#a64d37}.recovery input{margin-top:8px}.recovery label{font-weight:400}
  </style><section class="panel" role="dialog" aria-modal="true" aria-labelledby="title"><span class="cat" aria-hidden="true">✉️</span><h1 id="title">在 Credit 确认红包</h1><p class="intro">正在读取发包信息…</p><dl hidden></dl><form hidden><label for="pay-key">Credit 支付口令（6～10 位）</label><input id="pay-key" type="password" minlength="6" maxlength="10" required autocomplete="off"><div class="actions"><button class="pay" type="submit">确认扣款并创建</button><button class="cancel" type="button">取消</button></div></form><p class="state" role="status"></p><div class="recovery" hidden><p>先到 <a href="https://credit.linux.do/home" target="_blank" rel="noopener">Credit 已发送和交易记录</a>核对，再选择：</p><label for="known-id">已经创建：填写该红包编号</label><input id="known-id" inputmode="numeric" placeholder="红包编号"><button class="known" type="button">保存已创建编号</button><label><input class="no-charge" type="checkbox" style="width:auto"> 我已确认没有创建，也没有扣款</label><button class="unlock" type="button">解除锁定后重新尝试</button></div></section>`
 document.body.append(host)
 const intro=root.querySelector('.intro'),detail=root.querySelector('dl'),form=root.querySelector('form'),input=root.querySelector('#pay-key'),pay=root.querySelector('.pay'),cancel=root.querySelector('.cancel'),state=root.querySelector('.state'),recovery=root.querySelector('.recovery'),knownInput=root.querySelector('#known-id'),known=root.querySelector('.known'),noCharge=root.querySelector('.no-charge'),unlock=root.querySelector('.unlock')
 let record=null,configReady=false,waiting=0
 const display=(text)=>{state.textContent=text}
 const stop=(text)=>{intro.textContent=text;form.hidden=true;detail.hidden=true}
 const poll=setInterval(async()=>{
  if(!host.isConnected){clearInterval(poll);return}
  record=GM_getValue(key,null)
  if(!record?.params){if(++waiting>15){clearInterval(poll);stop('没有收到发包资料，请回群聊重新打开。')}return}
  clearInterval(poll)
  if(record.status==='created'){stop('这个红包已经创建，请回群聊继续发布。');display('红包编号 '+record.id);return}
  if(record.status==='sent'||record.status==='unknown'){stop('上次扣款结果尚未确认。请在 Credit 核对，避免重复扣款。');recovery.hidden=false;return}
  if(record.status!=='pending'){stop('本次发包已取消。请回群聊重新打开。');return}
  try{
   const response=await fetch('/api/v1/config/public',{credentials:'include',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}})
   if(!response.ok)throw Error('无法读取 Credit 公开配置，请登录后重新打开')
   const raw=await response.json(),preview=previewCreditCreate(record.params,raw?.data)
   const params=record.params
   intro.textContent='使用当前 Credit 登录账号扣款；确认后红包会回到群聊发出。'
   detail.replaceChildren()
   for(const [label,value] of [['类型',params.kind==='fixed'?'普通红包':'拼手气红包'],['总额',params.amount+' LDC'],['份数',params.count+' 份'],['预计手续费',preview.fee+' LDC'],['预计扣款',preview.deduction+' LDC']]){
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;detail.append(dt,dd)
   }
   detail.hidden=false;form.hidden=false;configReady=true;input.focus()
  }catch(error){stop(error.message||'无法核对 Credit 配置，请到原站确认')}
 },1000)
 cancel.addEventListener('click',event=>{
  if(!event.isTrusted)return
  if(record?.status==='pending'){GM_setValue(key,{...record,status:'cancelled'});stop('已取消，未发送扣款请求。')}
 })
 known.addEventListener('click',event=>{
  if(!event.isTrusted || !['sent','unknown'].includes(record?.status))return
  const id=knownInput.value.trim()
  if(!creditIdPattern.test(id)){display('填写已发送记录中的红包编号');return}
  record={...record,status:'created',id};GM_setValue(key,record)
  const global=GM_getValue('credit-create-uncertain',null)
  if(global?.operation===operation)GM_setValue('credit-create-uncertain',null)
  recovery.hidden=true;display('已保存红包编号 '+id+'，请回群聊完成发送。')
 })
 unlock.addEventListener('click',event=>{
  if(!event.isTrusted || !noCharge.checked || !['sent','unknown'].includes(record?.status)){display('先核对已发送和交易记录，并勾选确认');return}
  record={...record,status:'pending'};GM_setValue(key,record)
  const global=GM_getValue('credit-create-uncertain',null)
  if(global?.operation===operation)GM_setValue('credit-create-uncertain',null)
  recovery.hidden=true;stop('已解除本次锁定。回到群聊重新点击，将再次尝试创建。');display('此操作由你确认，本站不会自动重复扣款。')
 })
 form.addEventListener('submit',async event=>{
  event.preventDefault()
  if(!event.isTrusted || !configReady || record?.status!=='pending')return
  const payKey=input.value;input.value=''
  if(payKey.length<6 || payKey.length>10){display('Credit 支付口令需为 6～10 位');return}
  if(!navigator.locks?.request){display('浏览器缺少跨窗口领取锁，无法安全创建。请到 Credit 原站发包。');return}
  pay.disabled=true;cancel.disabled=true;display('正在 Credit 创建，请不要重复点击…')
  try{await navigator.locks.request('jh-credit-create',{mode:'exclusive'},async()=>{
   const current=GM_getValue(key,null)
   if(GM_getValue('credit-create-uncertain',null)||current?.status!=='pending' || JSON.stringify(current.params)!==JSON.stringify(record.params)){
    pay.disabled=false;cancel.disabled=false;display('另一窗口已有发包操作，请回群聊核对');return
   }
   record=current
   const params=record.params
   GM_setValue('credit-create-uncertain',{operation,at:Date.now()})
   GM_setValue(key,{...record,status:'sent'})
   try{
   const response=await fetch('/api/v1/redenvelope/create',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'},
    body:JSON.stringify({type:params.kind,total_amount:params.amount,total_count:params.count,greeting:params.greeting,pay_key:payKey}),
   })
   const raw=await response.json().catch(()=>null)
   if(!response.ok){
    const message=String(raw?.error?.message||raw?.error||`Credit 返回 ${response.status}`).slice(0,150)
    throw Error(message)
   }
   const id=creditCreateId(raw)
   record={...record,status:'created',id};GM_setValue(key,record);GM_setValue('credit-create-uncertain',null)
   form.hidden=true;display('创建成功，红包编号 '+id+'。回到群聊完成发送。')
   }catch(error){record={...record,status:'unknown'};GM_setValue(key,record);form.hidden=true;recovery.hidden=false;display('扣款结果无法确认：'+(error.message||'请求中断')+'。请到 Credit 已发送和交易记录核对，勿再次扣款。')}
  })}catch{
   const current=GM_getValue(key,null)
   if(current?.status==='pending'){pay.disabled=false;cancel.disabled=false;display('无法取得跨窗口锁；本次没有发送扣款请求，请到原站确认后重试')}
   else{record={...current,status:'unknown'};GM_setValue(key,record);form.hidden=true;recovery.hidden=false;display('扣款结果无法确认，请核对 Credit 已发送和交易记录')}
  }
 })
}

// 站内表单与连接器使用同一字段校验；所有金额按整数分计算。
const platformUuid=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value||''))
const platformCode=value=>[...value].length>=6&&[...value].length<=18&&/^[\p{Script=Han}A-Za-z0-9]+$/u.test(value)
function platformCents(value){
 const s=String(value??'').trim()
 if(!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(s))throw Error('金额需为正数，最多两位小数')
 const [whole,fraction='']=s.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))
 if(cents<1n||cents>BigInt(Number.MAX_SAFE_INTEGER))throw Error('金额超出有效范围')
 return Number(cents)
}
const platformMoney=cents=>(BigInt(cents)/100n).toString()+'.'+(BigInt(cents)%100n).toString().padStart(2,'0')
function normalizePlatformCreate(input){
 const provider=input.provider,operation=String(input.operation||''),account=String(input.account||'')
 if(!['hb','fish'].includes(provider)||!platformUuid(operation)||!account||account.length>128||/[\p{Cc}\p{Cf}]/u.test(account))throw Error('请重新检测平台账户后创建')
 const kind=String(input.kind),greeting=String(input.greeting||'').normalize('NFC').trim()
 if([...greeting].length>100||/[\p{Cc}\p{Cf}]/u.test(greeting))throw Error('祝福语最多100字，不能含控制字符')
 const code=String(input.code||'').normalize('NFC').trim()
 const count=provider==='hb'&&kind==='exclusive'?1:Number(input.count)
 if(kind!=='custom'&&(!Number.isInteger(count)||count<1||count>(provider==='hb'?500:1000)))throw Error('红包份数超出平台范围')
 const cents=kind==='custom'?0:platformCents(input.amount)
 if(kind!=='custom'&&cents<count)throw Error('每份至少需要0.01 LDC')
 if(provider==='hb'){
  if(!['equal','random','exclusive','lottery'].includes(kind))throw Error('请选择HB支持的红包类型')
  if(cents<100||cents>(kind==='exclusive'?80000:200000))throw Error(kind==='exclusive'?'HB专属红包总额为1–800 LDC':'HB红包总额为1–2000 LDC')
  const distribution=kind==='lottery'?String(input.distribution||'random'):kind
  if(kind==='lottery'&&!['equal','random'].includes(distribution))throw Error('请选择抽奖的金额分配方式')
  if(distribution==='equal'&&(cents%count!==0||cents/count<100))throw Error('HB普通红包总额需可均分，每份至少1 LDC')
  const drawSeconds=kind==='lottery'?Number(input.drawSeconds):null
  if(kind==='lottery'&&(!Number.isInteger(drawSeconds)||drawSeconds<40||drawSeconds>300))throw Error('HB开奖倒计时需为40–300秒')
  const target=kind==='exclusive'?String(input.target||'').trim().replace(/^@/,''):''
  if(kind==='exclusive'&&(!target||target.length>60||/[\s\p{Cc}\p{Cf}]/u.test(target)))throw Error('请填写专属用户的Linux DO用户名')
  const codeType=kind==='exclusive'?'numeric':String(input.codeType||'numeric')
  if(!['numeric','text'].includes(codeType)||codeType==='text'&&!platformCode(code))throw Error('文字口令需为6–18字中英文或数字')
  return {provider,operation,account,payload:{total:platformMoney(cents),count,wish:greeting||'恭喜发财，大吉大利',type:kind,target_username:target,code_type:codeType,text_code:codeType==='text'?code:'',...(kind==='lottery'?{distribution_type:distribution}:{}),draw_seconds:drawSeconds}}
 }
 const merchantId=String(input.merchantId||''),credentialVersion=Number(input.credentialVersion)
 if(!platformUuid(merchantId)||!Number.isSafeInteger(credentialVersion)||credentialVersion<1)throw Error('请检测并选择已绑定的Fish真实商户')
 if(!['fixed','random','custom','timed_draw'].includes(kind))throw Error('请选择Fish支持的红包类型')
 const participation=String(input.participation||'direct')
 if(!['direct','password'].includes(participation)||participation==='password'&&!platformCode(code))throw Error('Fish活动口令需为6–18字中英文或数字')
 if(kind==='fixed'&&cents%count!==0)throw Error('普通红包总额必须可以精确均分到分')
 const algorithm=String(input.algorithm||'double_mean_v1')
 if(!['double_mean_v1','bounded_mean_v1'].includes(algorithm))throw Error('Fish金额分配算法无效')
 let money={mode:kind,totalAmount:platformMoney(cents),count}
 if(kind==='custom'){
  const amounts=String(input.amounts||'').split(/[\s,，;；]+/).filter(Boolean).map(platformCents)
  if(!amounts.length||amounts.length>1000||amounts.reduce((s,n)=>s+BigInt(n),0n)>BigInt(Number.MAX_SAFE_INTEGER))throw Error('自定义金额需为1–1000份有效金额')
  money={mode:kind,amounts:amounts.map(platformMoney)}
 }
 if(['random','timed_draw'].includes(kind))money.algorithm=algorithm
 if(kind==='timed_draw'){
  const seconds=Number(input.drawSeconds),limit=String(input.participantLimit||'').trim()===''?null:Number(input.participantLimit)
  if(!Number.isSafeInteger(seconds)||seconds<1||seconds>8e12||limit!==null&&(!Number.isSafeInteger(limit)||limit<1))throw Error('开奖秒数和人数上限需为有效正整数')
  money={...money,countdownSeconds:seconds,participantLimit:limit,distributeFullPool:input.distributeFullPool!==false}
 }
 return {provider,operation,account,merchantId,credentialVersion,payload:{title:greeting||'恭喜发财，大吉大利',topicUrl:'',forceDedicated:false,joinSquare:false,deadline:{mode:'duration'},allocation:['random','timed_draw'].includes(kind)?'random':'sequential',passwords:participation==='password'?[code]:[],quantityVisibility:'exact',showRecipientList:true,showRecipientUsername:true,showRecipientTime:true,showRecipientAmount:true,beforeInfo:'',afterClaimInfo:'',afterEndInfo:'',participationMode:participation,rewardType:'ldc',merchantId,money}}
}

// 固定平台、本人登录态、按账户持久化操作。未知结果不创建第二笔。
async function platformCreate(action,ext,request){
 const provider=ext?.provider
 if(!['hb','fish'].includes(provider))throw Error('创建平台无效')
 if(typeof GM_getValue!=='function'||typeof GM_setValue!=='function')throw Error('请允许连接器存储待确认操作')
 const origin=provider==='hb'?'https://hb.unsnow.org':'https://meme.442224.xyz'
 const session=await request(origin+(provider==='hb'?'/api/me':'/api/session'))
 const account=String(provider==='hb'?session.user?.linuxdo_id??'':session.user?.id??'')
 if(!account)throw Error('请先登录 '+(provider==='hb'?'HB':'Fish')+'，再回本站检测账户')
 const globalKey='packet-create-pending:'+provider+':'+account
 const pendingOperation=GM_getValue(globalKey,null)
 const pending=pendingOperation?GM_getValue('packet-create:'+provider+':'+pendingOperation,null):null
 const headers=provider==='fish'?{'X-CSRF-Token':session.csrfToken}:{}
 let merchants=[]
 if(provider==='fish'){
  if(typeof session.csrfToken!=='string')throw Error('Fish登录状态失效，请重新登录')
  if(action==='creationOptions'&&session.user?.canUseLdc){
   const data=await request(origin+'/api/me/merchants')
   const items=[...(data.items||[])]
   if(platformUuid(data.currentMerchantId)&&!items.some(m=>m.id===data.currentMerchantId))items.push((await request(origin+'/api/me/merchants/'+data.currentMerchantId)).merchant)
   merchants=items.filter(m=>m?.mode==='real'&&platformUuid(m.id)).map(m=>({id:m.id,name:String(m.label||m.name||'LDC商户').slice(0,100),credentialVersion:m.credentialVersion,ready:m.publicationEligibility?.allowed===true,current:m.id===data.currentMerchantId}))
  }
 }
 if(action==='creationOptions')return {account,name:String(session.user?.username||session.user?.name||account).slice(0,100),ready:provider==='hb'?session.canCreate===true:session.user?.canUseLdc===true&&merchants.some(m=>m.current),merchants,pending:pending?{operation:pending.operation,form:pending.form,status:pending.status,id:pending.id||null}:null}
 if(action==='releaseCreation'){
  if(provider!=='hb'||ext.account!==account||ext.operation!==pendingOperation||!['prepared','rejected','sent','unknown'].includes(pending?.status)||ext.ack!=='checked-platform-history')throw Error('待确认操作不匹配，不能清理')
  // 用户已明确核对平台记录；只结束本机待确认流程，不重试、不撤销平台红包。
  await request(origin+'/api/hongbao/mine')
  GM_setValue('packet-create:'+provider+':'+pendingOperation,{...pending,status:'abandoned'})
  GM_setValue(globalKey,null);return {released:true}
 }
 const params=normalizePlatformCreate(ext)
 if(params.account!==account)throw Error('平台登录账户已改变，请核对原操作，未提交创建')
 const key='packet-create:'+provider+':'+params.operation
 let record=GM_getValue(key,null)
 if(record&&JSON.stringify(record.params)!==JSON.stringify(params))throw Error('待确认红包的参数已改变，请恢复原参数')
 if(record?.status==='abandoned')throw Error('原操作已结束，请使用新的红包表单')
 if(record?.status==='opened')return record.result
 if(pendingOperation&&pendingOperation!==params.operation)throw Error('这个账户还有一笔创建结果待确认，请先恢复原操作')
 if(provider==='hb'&&!session.canCreate)throw Error('请先在 HB“我的配置”完成 LDC 绑定，密钥仅保留在 HB')
 if(provider==='fish'&&!session.user?.canUseLdc)throw Error('请先在 Fish 使用官方 Connect 升级登录')
 const verifyAccount=async()=>{
  const fresh=await request(origin+(provider==='hb'?'/api/me':'/api/session'))
  const identity=String(provider==='hb'?fresh.user?.linuxdo_id??'':fresh.user?.id??'')
  if(identity!==account)throw Error('平台登录账户已改变，停止提交，请切回原账户核对')
  if(provider==='fish'){if(!fresh.user?.canUseLdc||typeof fresh.csrfToken!=='string')throw Error('Fish登录权限已改变');headers['X-CSRF-Token']=fresh.csrfToken}
 }
 const verifyMerchant=async()=>{
  const list=await request(origin+'/api/me/merchants')
  if(list.currentMerchantId!==params.merchantId)throw Error('Fish当前商户已改变，请到平台核对原草稿，不会自动更换付款账户')
  const {merchant}=await request(origin+'/api/me/merchants/'+params.merchantId)
  if(merchant?.mode!=='real'||merchant.credentialVersion!==params.credentialVersion)throw Error('Fish商户或凭证版本已改变，请到商户管理核对')
  if(merchant.publicationEligibility?.allowed!==true&&merchant.publicationEligibility?.reason!=='MERCHANT_CREDENTIALS_UNVERIFIED')throw Error('Fish商户暂不能开放活动，请到商户管理完成验证后继续原操作')
 }
 if(!record){
  const form={}
  for(const field of ['kind','amount','count','greeting','target','codeType','code','distribution','drawSeconds','merchantId','credentialVersion','participation','algorithm','amounts','participantLimit','distributeFullPool'])if(ext[field]!==undefined)form[field]=ext[field]
  record={params,form,operation:params.operation,account,status:'prepared'}
 }
 const save=()=>{GM_setValue(key,record);GM_setValue(globalKey,record.status==='opened'?null:params.operation)}
 if(provider==='hb'){
  if(record.status==='sent'||record.status==='unknown')throw Error('HB上次创建结果未确认，不能再次扣积分。请打开HB已发记录，使用“分享已有红包”发送对应红包；确认没有创建后再解除待确认状态')
  await verifyAccount();record.status='sent';save()
  let result
  try{result=await request(origin+'/api/hongbao','POST',params.payload)}
  catch(error){record.status=error.status>=400&&error.status<500&&![408,429].includes(error.status)?'rejected':'unknown';save();throw error}
  if(!/^[A-Za-z0-9]{1,100}$/.test(String(result.id||''))){record.status='unknown';save();throw Error('HB已接收请求但返回编号无法确认，请核对已发记录，勿重复创建')}
  record.result={id:String(result.id),url:origin+'/hb/'+encodeURIComponent(result.id),code:typeof result.code==='string'?result.code:null}
  record.status='opened';save();return record.result
 }
 await verifyMerchant()
 if(!record.id){
  await verifyAccount();record.status='sent';save()
  // Fish明确支持requestId幂等；重试保持相同账户、参数和requestId。
  const result=await request(origin+'/api/activities','POST',{requestId:params.operation,activity:params.payload},headers)
  const activity=result.activity
  if(!platformUuid(activity?.id)||!Number.isSafeInteger(activity.version)){record.status='unknown';save();throw Error('Fish创建结果未确认，请继续核对原操作')}
  record.id=activity.id;record.version=activity.version;record.status='created';save()
 }
 const readActivity=async()=>{
  const {activity}=await request(origin+'/api/me/activities/'+record.id)
  if(activity?.id!==record.id||activity.config?.merchantId!==params.merchantId||activity.config?.rewardType!=='ldc'||activity.paymentMode!=='real')throw Error('Fish活动配置与本次真实LDC红包不一致，未开放')
  if(activity.version!==(activity.openedAt?record.version+1:record.version))throw Error('Fish活动已被修改，请在平台核对，未覆盖修改')
  return activity
 }
 const complete=activity=>{
  if(!activity.openedAt)throw Error('Fish草稿已保存，尚未开放，请继续原操作')
  record.status='opened';record.result={id:record.id,url:origin+'/activities/'+record.id};save();return record.result
 }
 const activity=await readActivity()
 if(activity.openedAt)return complete(activity)
 await verifyMerchant();await verifyAccount()
 try{
  await request(origin+'/api/me/activities/'+record.id+'/open','POST',{version:record.version,merchantId:params.merchantId,credentialVersion:params.credentialVersion},headers)
 }catch(error){
  try{const fresh=await readActivity();if(fresh.openedAt)return complete(fresh)}catch{}
  throw Error('Fish草稿已保存（'+record.id+'），开放未完成：'+error.message+'。继续时会使用同一红包')
 }
 return complete(await readActivity())
}

function packetPlatformRequest(provider){
 const platform=({hb:'HB',credit:'Credit',fish:'Fish'})[provider],origin=({hb:'https://hb.unsnow.org',credit:'https://credit.linux.do',fish:'https://meme.442224.xyz'})[provider]
 return (url,method='GET',body,extraHeaders={})=>new Promise((resolve,reject)=>{
  if(!origin||!url.startsWith(origin+'/api/')||!['GET','POST'].includes(method)){reject(Error('红包请求目标无效'));return}
  GM_xmlhttpRequest({url,method,responseType:'json',timeout:20000,anonymous:false,
   headers:{Accept:'application/json',...(provider==='credit'?{'X-Requested-With':'XMLHttpRequest'}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{}),...extraHeaders},...(body?{data:JSON.stringify(body)}:{}),
   onload:r=>{
    if(r.status<200||r.status>=300){const error=Error(r.status===401?'请先登录 '+platform:String(r.response?.error?.message||r.response?.error||platform+' 返回 '+r.status).slice(0,180));error.status=r.status;reject(error);return}
    if(!r.response||typeof r.response!=='object'){reject(Error(platform+'需要验证或返回格式变化，请打开平台核对'));return}
    resolve(r.response)
   },onerror:()=>reject(Error(platform+'连接失败，请核对原操作')),ontimeout:()=>reject(Error(platform+'请求超时，请核对原操作'))
  })
 })
}

// 与官方页面的公开请求契约一致；不读取Cookie，不接受任意请求URL。
mountCreditCreatePage()
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
  // Tampermonkey 的 window 是沙箱代理；MessageEvent.source 指向文档所属的真实窗口。
  // 仍严格校验同一窗口和本站来源，不能仅删除 source 检查。
  const pageWindow=window.document?.defaultView || window
  if(event.source!==pageWindow || event.origin!==location.origin || location.origin!=='https://52dmeme.com')return
  const data=event.data
  if(data?.type!=='meme-redpacket-request' || !/^[a-f0-9-]{36}$/i.test(data.id))return
  const reply=(result,error)=>pageWindow.postMessage({type:'meme-redpacket-result',id:data.id,result,error},location.origin)
  if(data.action==='ping'){reply({version:'1.3.0',creditCreate:true,participationV2:true,platformCreateV1:true});return}
  if(['creationOptions','platformCreate','releaseCreation'].includes(data.action)){
    try{
      if(!['hb','fish'].includes(data.external?.provider))throw Error('创建平台无效')
      if(!navigator.locks?.request)throw Error('浏览器不支持创建锁，请打开平台操作')
      await navigator.locks.request('meme-redpacket-create-'+data.external.provider,{ifAvailable:true},async lock=>{
        if(!lock)throw Error('另一窗口正在处理创建，请稍后核对原操作')
        reply(await platformCreate(data.action,data.external,packetPlatformRequest(data.external.provider)))
      })
    }catch(error){reply(null,error.message)}
    return
  }
  if(['prepareCreate','awaitCreate'].includes(data.action)){
    try{
      if(typeof GM_getValue!=='function'||typeof GM_setValue!=='function')throw Error('请更新红包连接器并允许脚本存储')
      const ext=data.external
      if(ext?.provider!=='credit'||!operationPattern.test(String(ext.operation||'')))throw Error('Credit 创建操作无效')
      const key='credit-create:'+ext.operation
      if(data.action==='prepareCreate'){
        const params=normalizeCreditCreate(ext),cached=GM_getValue(key,null),global=GM_getValue('credit-create-uncertain',null)
        if(global)throw Error('上次扣款结果未确认，请先核对 Credit 已发送记录')
        if(['sent','unknown','created'].includes(cached?.status) && JSON.stringify(cached.params)!==JSON.stringify(params))throw Error('创建参数已改变，请核对上次操作')
        if(cached?.status==='created'){reply({id:cached.id});return}
        if(cached?.status==='sent'||cached?.status==='unknown')throw Error('上次扣款结果未确认，请到 Credit 核对')
        GM_setValue(key,{status:'pending',params});reply({ready:true});return
      }
      for(let i=0;i<180;i++){
        const state=GM_getValue(key,null)
        if(state?.status==='created'){reply({id:state.id});return}
        if(state?.status==='unknown')throw Error('扣款结果尚未确认，请到 Credit 已发送记录核对，勿重复创建')
        if(state?.status==='cancelled')throw Error('已取消，未创建红包')
        await new Promise(resolve=>setTimeout(resolve,1000))
      }
      throw Error('等待 Credit 确认超时；如已扣款，请核对已发送记录并引用红包编号')
    }catch(error){reply(null,error.message)}
    return
  }
  if(!['query','claim'].includes(data.action))return
  try {
    const ext=data.external,provider=ext?.provider,ref=String(ext?.ref || '')
    const platform=({hb:'HB',credit:'Credit',fish:'Fish'})[provider]||'红包平台'
    let lookup
    if(provider==='credit' && /^[1-9][0-9]{0,19}$/.test(ref))lookup='https://credit.linux.do/api/v1/redenvelope/'+ref
    else if(provider==='hb'&&ext.ref_kind==='id'&&/^[A-Za-z0-9]{1,100}$/.test(ref))lookup='https://hb.unsnow.org/api/hongbao/'+ref
    else if(provider==='hb' && ((ext.ref_kind==='numeric' && /^[0-9]{8}$/.test(ref)) || (ext.ref_kind==='text' && fishCode(ref))))lookup='https://hb.unsnow.org/api/hongbao/'+(ext.ref_kind==='numeric'?'code/':'text-code/')+encodeURIComponent(ref)
    else if(provider==='fish' && (ext.ref_kind==='id'&&fishUuid(ref) || ext.ref_kind==='text'&&fishCode(ref)))lookup='https://meme.442224.xyz/api/session'
    else throw Error('红包来源或口令无效，未发送请求')
    if(!navigator.locks?.request)throw Error('浏览器不支持领取锁，请前往原站')
    await navigator.locks.request('meme-redpacket-'+provider,{ifAvailable:true},async lock=>{
      if(!lock)throw Error('另一页面正在查询或领取，请稍后重试')
      // 查询不消费领取冷却。用户看过状态后应能立即开包；连续领取仍限流。
      if(data.action==='claim'){
        const timeKey='memeRedpacketClaimTime:'+provider,last=Number(localStorage.getItem(timeKey)||0)
        if(!Number.isFinite(last) || last>Date.now())throw Error('本机时间异常，请到原站核对')
        if(Date.now()-last<5000)throw Error('稍等 '+Math.ceil((5000-Date.now()+last)/1000)+' 秒再试')
        localStorage.setItem(timeKey,String(Date.now()))
      }
      const request=(url,method='GET',body,extraHeaders={})=>new Promise((resolve,reject)=>GM_xmlhttpRequest({
        url,method,responseType:'json',timeout:15000,anonymous:false,
        headers:{Accept:'application/json',...(provider==='credit'?{'X-Requested-With':'XMLHttpRequest'}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{}),...extraHeaders},
        ...(body?{data:JSON.stringify(body)}:{}),
        onload:r=>{
          if(r.status<200 || r.status>=300){const error=Error(r.status===401?'请先登录 '+platform+'，再回群里刷新状态':String(r.response?.error?.message || r.response?.error || `${platform} 返回 ${r.status}，请打开平台核对`).slice(0,180));error.status=r.status;reject(error);return}
          if(!r.response || typeof r.response!=='object'){reject(Error(platform+' 需要验证或返回格式变化，请打开平台核对'));return}
          resolve(r.response)
        },onerror:()=>reject(Error(platform+' 连接失败，请打开平台核对')),ontimeout:()=>reject(Error(platform+' 请求超时，请打开平台核对')),
      }))
      if(provider==='fish'){reply(await fishPacket(data.action,ext,request));return}
      const viewer=provider==='hb'?(await request('https://hb.unsnow.org/api/me')).user??null:undefined
      const snapshot=packetSnapshot(provider,await request(lookup),viewer)
      const uncertain='memeRedpacketUncertain:'+provider+':'+ref
      const resolved=s=>s.claimed||['exhausted','expired','cancelled','drawn','registered','drawing','not_won','payment_pending'].includes(s.state)
      if(data.action==='query'){
        if(resolved(snapshot))localStorage.setItem(uncertain,'')
        reply(localStorage.getItem(uncertain)?{...snapshot,state:'unconfirmed'}:snapshot);return
      }
      if(snapshot.claimed || snapshot.state!=='active' || snapshot.blocked){if(resolved(snapshot))localStorage.setItem(uncertain,'');reply(snapshot);return}
      if(!(provider==='hb'?['fixed','equal','random','exclusive','lottery']:['fixed','random']).includes(snapshot.kind)){reply(snapshot);return}
      if(localStorage.getItem(uncertain))throw Error('上次领取结果未确认，请刷新状态或打开 '+platform+' 核对，勿连续领取')
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(snapshot.id))throw Error(platform+' 红包编号异常，未领取')
      localStorage.setItem(uncertain,'1')
      let receipt
      try {
        const raw=await request(provider==='credit'?'https://credit.linux.do/api/v1/redenvelope/claim':'https://hb.unsnow.org/api/hongbao/'+encodeURIComponent(snapshot.id)+'/grab','POST',provider==='credit'?{id:ref}:undefined)
        if(provider==='hb'&&snapshot.kind==='lottery'){
          // 报名返回 packet，不是金额收据。只认已报名/开奖/发放状态。
          const fresh=packetSnapshot('hb',raw?.packet||await request(lookup),viewer)
          if(resolved(fresh))localStorage.setItem(uncertain,'')
          reply(localStorage.getItem(uncertain)?{...fresh,state:'unconfirmed'}:fresh);return
        }
        receipt=claimReceipt(provider,raw)
      }catch(error){
        if(error.status>=400&&error.status<500){localStorage.setItem(uncertain,'');throw error}
        try{const fresh=packetSnapshot(provider,await request(lookup),viewer);if(resolved(fresh)){localStorage.setItem(uncertain,'');reply(fresh);return}}catch{}
        throw Error('领取结果未确认：'+error.message+'。请刷新状态或打开 '+platform+' 核对，勿连续领取')
      }
      localStorage.setItem(uncertain,'')
      reply({...snapshot,...receipt,remaining:null})
    })
  }catch(error){reply(null,error.message)}
})

})();
