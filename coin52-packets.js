import {dcoinIcon,dcoinAmount} from '/dcoin.js?v=8f410db6'
import {packetLuckRanks} from '/packet-luck.js?v=8f410db6'
export function coin52Create({h,api,group,onSent,onBack,onBusy}){
 const nonce=crypto.randomUUID(),amount=h('input',{type:'number',min:1,max:1000000,step:1,required:true,class:'rpk-input','aria-label':'总额 · D币'}),count=h('input',{type:'number',min:1,max:100,step:1,value:'1',required:true,class:'rpk-input','aria-label':'份数'}),kind=h('select',{class:'rpk-input','aria-label':'分配方式'},h('option',{value:'random'},'拼手气'),h('option',{value:'fixed'},'等额')),minutes=h('input',{type:'number',min:1,max:10080,value:'1440',required:true,class:'rpk-input','aria-label':'有效期 · 分钟'}),prompt=h('input',{maxlength:120,class:'rpk-input','aria-label':'祝福语',placeholder:'给大家一点经营的收获'}),status=h('p',{class:'rpk-status',role:'status'}),submit=h('button',{type:'submit',class:'rpk-primary'},'确认发出 ',dcoinIcon(h),' 红包'),back=h('button',{type:'button',class:'rpk-secondary',onclick:onBack},'返回其他红包方式')
 const field=(name,input)=>h('label',{class:'rpk-field'},h('span',null,name),input)
 let locked=null,busy=false
 const form=h('form',{class:'rpk-create',onsubmit:async e=>{e.preventDefault();if(busy)return;busy=true;onBusy(true);submit.disabled=true;back.disabled=true
  locked??={provider:'coin52',nonce,amount:Number(amount.value),count:Number(count.value),kind:kind.value,minutes:Number(minutes.value),prompt:prompt.value}
  for(const el of [amount,count,kind,minutes,prompt])el.disabled=true
  try{const d=await api(`/chat/groups/${group.id}/redpacks`,{method:'POST',body:locked});onSent(d.message)}catch(e){status.textContent=e.message+'；重试沿用同一红包，不会重复扣款。';submit.textContent='重试确认发送'}finally{busy=false;onBusy(false);submit.disabled=false;back.disabled=false}
 }},h('h3',{class:'dcoin-heading'},dcoinIcon(h),'红包'),h('p',{class:'rpk-help'},'使用农场与站内积分余额，发出时扣除总额。每人限领一份，不能领取自己发的红包；过期余款自动退回。'),field(h('span',null,'总额 ',dcoinIcon(h)),amount),field('份数',count),field('分配方式',kind),field('有效期 · 分钟',minutes),field('祝福语',prompt),status,submit,back)
 return form
}
export function coin52Detail({h,api,packet,messageId,onRefresh,onUpdate,onBusy,celebrate=false}){
 const p=packet.coin52,status=h('p',{class:'rpk-status',role:'status'}),root=h('div',{class:'dcoin-packet'+(celebrate&&p.mine!==null?' is-arriving':'')}),claim=h('button',{type:'button',class:'rpk-primary'})
 if(p.mine!==null)claim.append('已领取 ',dcoinAmount(h,p.mine));else if(p.owner)claim.append('自己发出的红包');else if(p.state==='active')claim.append('领取 ',dcoinIcon(h));else claim.append(p.state==='expired'?'已过期':'已领完')
 claim.disabled=p.owner||p.mine!==null||p.state!=='active'
 claim.onclick=async()=>{claim.disabled=true;onBusy(true);try{const d=await api(`/chat/messages/${messageId}/redpack/coin52-claim`,{method:'POST',body:{}});onUpdate?.(d.message);onRefresh(d.packet,{celebrate:true})}catch(e){status.textContent=e.message;claim.disabled=false}finally{onBusy(false)}}
 const hero=h('div',{class:'dcoin-vault'},dcoinIcon(h,'dcoin--hero'),h('h3',null,packet.prompt||'财源滚滚'),dcoinAmount(h,p.mine!==null?p.mine:p.total,'dcoin-vault-amount'),h('span',{class:'dcoin-vault-caption'},p.mine!==null?'已到账 · 收入钱包':`${p.count} 份 · ${p.mode==='fixed'?'等额':'拼手气'}`))
 if(celebrate&&p.mine!==null){const shower=h('div',{class:'dcoin-shower','aria-hidden':'true'});for(let i=0;i<8;i++){const c=dcoinIcon(h);c.style.setProperty('--coin-i',i);shower.append(c)}shower.addEventListener('animationend',e=>{if(e.target===shower)shower.remove()});hero.append(shower)}
 root.append(hero,h('p',{class:'rpk-help'},`${p.recipients.length} / ${p.count} 人已领 · 截止 ${new Date(p.expires_at*1000).toLocaleString('zh-CN')}`),claim,status)
 if(p.owner&&p.state==='expired')root.append(h('p',{class:'rpk-help'},p.refunded_at?'未领余款已退回钱包':'未领余款正在自动退回，请稍后查看账本'))
 const complete=p.remaining_count===0||p.state==='expired',ranks=packetLuckRanks(p.recipients,p.mode==='random'&&complete),list=h('ol',{class:'dcoin-records'})
 p.recipients.forEach((r,i)=>{const rank=ranks[i],who=h('div',{class:'dcoin-recipient'},h('strong',null,r.name||r.username||'匿名用户'),rank&&h('b',{class:'rpk-luck '+rank},rank==='king'?'手气王':'手气亡'),h('time',null,new Date(r.claimed_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})));list.append(h('li',{class:'dcoin-record'+(rank?' is-'+rank:'')},who,dcoinAmount(h,r.amount)))})
 root.append(h('div',{class:'dcoin-record-heading'},h('h4',null,'领取记录'),h('span',null,complete?'已结算':'领取中')),list)
 if(!p.recipients.length)root.append(h('p',{class:'rpk-help'},'还没有人领取'))
 else if(p.mode==='random'&&!complete)root.append(h('p',{class:'rpk-help'},'领完或到期后揭晓手气王与手气亡'))
 const refresh=h('button',{type:'button',class:'rpk-secondary',onclick:async()=>{refresh.disabled=true;try{onRefresh((await api(`/chat/messages/${messageId}/redpack`)).packet)}catch(e){status.textContent=e.message}finally{refresh.disabled=false}}},'刷新记录');root.append(refresh);return root
}
