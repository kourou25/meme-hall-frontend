export function openWhaleGrowth({anchor,api,h,onChanged}){
 const doc=anchor.ownerDocument,dialog=h('dialog',{class:'tr-dialog whale-growth'}),body=h('div',{class:'tr-body'}),close=h('button',{class:'tr-close','aria-label':'关闭鲸伴成长',onclick:()=>dialog.close()},'×')
 dialog.append(h('header',{class:'tr-head'},h('h2',null,'鲸伴成长'),close),body);doc.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>{dialog.remove();if(anchor.isConnected)anchor.focus()},{once:true})
 const stages=['初遇','眨眼相伴','招手问好','蓝潮渐变','鲸尾轻摆','边缘流光','元气招呼','深蓝潮汐','划水嬉戏','沿岸嬉游','环游鲸湾']
 let data,busy=false,requestId=null
 async function load(){body.textContent='正在读取等级与余额…';try{data=await api('/me/whalebuddy');if(dialog.isConnected)draw()}catch(e){body.replaceChildren(h('p',{role:'alert'},e.message),h('button',{class:'tr-action',onclick:load},'重试'))}}
 function draw(){
  const preview=h('div',{class:'whale-growth-preview'}),label=h('strong'),slider=h('input',{type:'range',min:1,max:20,value:Math.max(1,data.level),'aria-label':'预览鲸伴等级'}),paint=()=>{const n=Number(slider.value);label.textContent=`Lv${n} · ${stages[Math.floor(n/2)]}`;preview.replaceChildren(h('div',{class:`cm-text ot-bubble rt-bubble rt-collection rt-whalebuddy whale-stage-${Math.floor(n/2)}`},h('span',{class:'rt-copy'},'今天也要开心呀，和鲸伴一起去看海。')))};slider.oninput=paint;paint()
  const error=h('p',{class:'tr-error',role:'alert'}),buy=h('button',{class:'tr-action primary',disabled:data.next_price===null||data.balance<data.next_price,onclick:async()=>{
   if(busy)return;busy=true;buy.disabled=true;requestId??=crypto.randomUUID()
   try{data=await api('/me/whalebuddy',{method:'POST',body:{id:requestId,level:data.level}});requestId=null;await onChanged?.();if(dialog.isConnected)draw()}
   catch(e){try{const latest=await api('/me/whalebuddy');if(latest.level!==data.level)requestId=null;data=latest;if(dialog.isConnected){draw();body.querySelector('[role=alert]').textContent=e.message+'；已刷新等级与余额，请核对后再操作。'}}catch{error.textContent=e.message+'；可重试，同一请求不会重复扣款。';buy.disabled=false}}finally{busy=false}
  }},data.owner?'站长 · 满级已解锁':data.next_price===null?'已达到 Lv20':`支付 ${data.next_price.toLocaleString()} D币 · ${data.level?'升至':'解锁'} Lv${data.level+1}`)
  body.replaceChildren(h('p',null,`当前 ${data.level?'Lv'+data.level:'未拥有'} · 余额 ${data.balance.toLocaleString()} D币`),label,preview,slider,h('p',{class:'tr-meta'},'每两级进阶：眨眼、招手、蓝色渐变、摆尾与划水；20级沿上沿游动。'),buy,data.next_price!==null&&data.balance<data.next_price?h('p',{class:'tr-error'},'余额不足，可先经营农场获得D币。'):'',error,h('details',null,h('summary',null,'升级价格表'),h('p',{class:'tr-meta'},'解锁1级 1,000；1→2 1,000；之后每级加2,000。10→11 29,000，之后每级加2,000，19→20 47,000。'))) 
 }
 load()
}
