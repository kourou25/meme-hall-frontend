import {dcoinIcon} from '/dcoin.js?v=c8639d55'
export function createGuessTip({h,api,userId}){
 let mid=0,busy=false,attempt=null,generation=0
 const note=h('p',{role:'status'}),balance=h('small'),history=h('p',{class:'muted'})
 const amount=h('input',{type:'number',min:1,max:10000,step:1,value:10,inputmode:'numeric','aria-label':'打赏D币数量',oninput:()=>{confirm.checked=false;if(attempt?.retryable){attempt.amount=Number(amount.value);remember()}sync()}})
 const confirm=h('input',{type:'checkbox','aria-label':'确认自愿支付打赏',onchange:()=>sync()})
 const send=h('button',{type:'button',class:'gr-send',onclick:()=>submit()},'确认打赏')
 const body=h('div',{class:'gr-tip-body'},balance,h('label',null,'金额 ',amount,dcoinIcon(h)),h('label',{class:'gr-tip-confirm'},confirm,h('span',null,'自愿从我的D币钱包支付')),h('div',{class:'gr-tip-actions'},send,h('button',{type:'button',class:'gr-link',onclick:()=>{element.open=false}},'暂不打赏')),note,history)
 const element=h('details',{class:'gr-tip',hidden:true},h('summary',null,'感谢出题人'),body)
 const storageKey=()=>`guess-tip-pending:${userId}:${mid}`
 function remember(){try{if(attempt)sessionStorage.setItem(storageKey(),JSON.stringify(attempt));else sessionStorage.removeItem(storageKey())}catch{}}
 function sync(){amount.disabled=busy||!!(attempt&&!attempt.retryable);confirm.disabled=busy;send.disabled=busy||!confirm.checked||!amount.checkValidity();send.textContent=busy?'正在核对…':attempt?'核对并重试原打赏':'确认打赏'}
 async function load(){const token=++generation,id=mid;note.textContent='正在读取钱包…';try{const data=await api(`/chat/messages/${id}/guess-tip`);if(token!==generation||id!==mid)return;balance.textContent=`可用 ${data.balance} D币 · 每次1–10000`;history.textContent=data.recent.length?'最近打赏：'+data.recent.map(x=>`${x.amount} D币`).join('、'):'';note.textContent=attempt?'上次结果待核对，重试原单不会重复扣款。':'直接转给本轮出题人，与中奖奖励分开记账。'}catch(e){if(token===generation)note.textContent=e.message}sync()}
 async function submit(){
  if(busy||!confirm.checked||!amount.checkValidity())return
  const id=mid;attempt=attempt||{amount:Number(amount.value),nonce:crypto.randomUUID()};remember();busy=true;sync();note.textContent='正在转账…'
  try{const data=await api(`/chat/messages/${id}/guess-tip`,{method:'POST',body:{...attempt,confirm:true}});if(id!==mid)return;attempt=null;remember();confirm.checked=false;await load();note.textContent=`已向出题人打赏 ${data.amount} D币，双方账本已记录。`}
  catch(e){if(id!==mid)return;if(e.code==='guess_tip_not_sent'){attempt.retryable=true;remember()}note.textContent=e.message+(attempt?.retryable?'；可调整金额后核对原单重试。':'；结果待核对，请核对并重试原打赏。')}
  finally{busy=false;sync()}
 }
 element.addEventListener('toggle',()=>{if(element.open&&!busy)load()})
 function update(r){
  if(r?.message_id!==mid){generation++;element.open=false;mid=r?.message_id||0;attempt=null;try{const p=JSON.parse(sessionStorage.getItem(storageKey())||'null');if(p&&Number.isInteger(p.amount)&&p.amount>0&&p.amount<=10000&&/^[-a-f0-9]{36}$/i.test(p.nonce))attempt=p}catch{};amount.value=attempt?.amount||10;confirm.checked=false;note.textContent='';history.textContent='';sync()}
  element.hidden=!r||r.owner||!r.mine||r.mine.purpose==='compensation'
 }
 return {element,update,close(){generation++;element.open=false}}
}
