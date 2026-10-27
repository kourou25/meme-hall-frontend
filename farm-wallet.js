import {coin} from '/farm-ui.js?v=810c43bb'
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
const labels={'title-upgrade':'鲸伴解锁与升级','title-entry':'称号抽奖报名与追加','title-refund':'称号抽奖退款','farm-import':'原农场金币承接','farm-compensation':'改版补偿','farm-action':'农场经营','owner-adjustment':'站长余额调整','packet-send':'发出红包','packet-claim':'领取红包','packet-refund':'红包余款退回'}
labels['guess-tip-send']='猜词打赏支出';labels['guess-tip-receive']='猜词打赏收入'
labels['card-pay']='抽卡投入';labels['card-income']='抽卡收入';labels['card-prize']='抽卡D币奖励';labels['card-prize-pay']='抽卡奖池支出'
labels['huancai-buy']='欢彩购票';labels['huancai-scratch']='刮刮乐中奖';labels['huancai-lotto']='大乐透中奖'
labels['content-post']='发帖奖励';labels['content-road']='鞭打内容奖励'
labels['farm-rent-pay']='租地支出';labels['farm-rent-income']='土地租金收入';labels['farm-lease-work']='租地经营'
labels['farm-market']='田园集市交易'
export function createFarmWallet(root,{request}){
 const dialog=el('dialog','farm-social farm-wallet'),heading=el('header','farm-social-heading'),title=el('h2','','账本'),close=el('button','','关闭'),body=el('div','farm-social-body');title.prepend(el('i','dcoin'))
 title.id='farm-wallet-title';dialog.setAttribute('aria-labelledby',title.id)
 close.type='button';close.onclick=()=>dialog.close();heading.append(title,close);dialog.append(heading,body);root.append(dialog)
 let disposed=false,loading=false,generation=0
 const date=t=>new Date(t*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
 async function load(before){
  if(loading||disposed)return
  const token=++generation;loading=true;body.setAttribute('aria-busy','true')
  const more=body.querySelector('[data-more]');if(more)more.disabled=true
  if(!before)body.replaceChildren(el('p','','正在读取账本…'))
  try{
   const r=await request('/api/farm/wallet'+(before?'?before='+before:''))
   if(disposed||token!==generation)return
   if(!r.ok)throw Error(r.data.error||'账本暂时无法读取')
   const d=r.data
   if(!before){
    const balance=el('div','farm-wallet-balance'),amount=el('strong');amount.innerHTML=coin(d.balance.toLocaleString('zh-CN'));balance.append(el('span','','可用余额'),amount);body.replaceChildren(balance)
    if(d.migration){const m=d.migration;body.append(el('p','farm-small',`原金币承接 ${m.imported_coins} · 改版补偿 +${m.compensation}。均已计入余额。`))}
    body.append(el('ol','farm-wallet-rows'))
   }
   more?.remove();body.querySelector('[data-wallet-error]')?.remove()
   const list=body.querySelector('ol')
   for(const row of d.rows){const item=el('li'),info=el('div'),amount=el('div','farm-wallet-amount');info.append(el('strong','',(labels[row.kind]||'积分收支')+(['content-post','content-road'].includes(row.kind)?' #'+row.ref:'')),el('small','',date(row.created_at)));amount.append(el('strong',row.delta>=0?'is-income':'',`${row.delta>0?'+':''}${row.delta}`),el('small','',`余额 ${row.balance_after}`));item.append(info,amount);list.append(item)}
   if(!list.children.length)list.append(el('li','','暂无收支记录'))
   if(d.next){const next=el('button','','更早记录');next.type='button';next.dataset.more='';next.onclick=()=>load(d.next);body.append(next)}
  }catch(e){
   if(disposed||token!==generation)return
   if(!before)body.replaceChildren()
   body.querySelector('[data-wallet-error]')?.remove()
   const error=el('p','farm-wallet-error',e.message||'账本读取失败');error.dataset.walletError='';error.setAttribute('role','alert');const retry=el('button','','重试');retry.type='button';retry.onclick=()=>load(before);error.append(retry);body.append(error);if(more)more.disabled=false
  }finally{if(token===generation){loading=false;body.removeAttribute('aria-busy')}}
 }
 return {open(){if(disposed)return;if(!dialog.open)dialog.showModal();void load()},destroy(){disposed=true;generation++;dialog.remove()}}
}
