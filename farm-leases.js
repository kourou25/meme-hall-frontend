import {cropMatureAt,cropHasPests,cropMaxSeconds} from './farm-crop-care.js?v=8f410db6'
import {el,button,sprite,duration} from '/farm-ui.js?v=8f410db6'
export function createFarmLeases(root,{request,userId,getFarm,onChanged}){
 const dialog=el('dialog','farm-social farm-leases'),head=el('header'),nav=el('nav'),body=el('div','farm-social-content'),status=el('p','farm-lease-status'),retry=button('确认上次操作',()=>void send())
 head.append(el('h2','','地块租赁'),button('关闭',()=>dialog.close()));dialog.setAttribute('aria-label','地块租赁');status.setAttribute('role','status');retry.hidden=true
 for(const [id,label] of [['mine','我的租地'],['market','找地租'],['offer','出租空地']]){const b=button(label,()=>{tab=id;void load()});b.dataset.tab=id;nav.append(b)}
 nav.append(button('刷新',()=>void load()))
 dialog.append(head,nav,body,status,retry);root.append(dialog)
 const key='farm.lease.pending:'+userId;let tab='mine',data=null,market=[],next=null,busy=false,pending=null,disposed=false
 const selectedRent=new Set(),selectedOffers=new Set(),plotKey=x=>x.owner_id+':'+x.plot
 let serverTime=Math.floor(Date.now()/1000),receivedAt=performance.now()
 const clock=()=>serverTime+Math.floor(Math.max(0,performance.now()-receivedAt)/1000),date=t=>new Date(t*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
 function controls(){for(const b of dialog.querySelectorAll('button,input,select'))b.disabled=busy||!!pending||b.dataset.empty==='true';head.querySelector('button').disabled=false;retry.hidden=!pending;retry.disabled=busy;for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.tab===tab))}
 async function load(after=null){
  if(disposed||busy||pending)return;busy=true;controls();status.textContent='正在读取…'
  try{const r=await request(tab==='market'?'/api/farm/leases/market'+(after===null?'':'?after='+after):'/api/farm/leases');if(!r.ok)throw Error(r.data.error);if(disposed)return;serverTime=r.data.server_time;receivedAt=performance.now()
   if(tab==='market'){market=after===null?r.data.items:[...market,...r.data.items.filter(x=>!market.some(y=>y.owner_id===x.owner_id&&y.plot===x.plot))];next=r.data.next;for(const key of selectedRent)if(!market.some(x=>plotKey(x)===key))selectedRent.delete(key)}else data=r.data
   status.textContent='';draw()
  }catch(e){status.textContent=e.message||'读取失败，请重试';if(!body.children.length)body.append(button('重新读取',()=>void load()))}finally{busy=false;controls()}
 }
 async function mutate(path,operation){
  if(busy||pending)return;try{pending={path,body:operation};sessionStorage.setItem(key,JSON.stringify(pending))}catch{pending=null;status.textContent='无法保存重试凭据，本次未发送';return}await send()
 }
 async function send(){
  if(busy||!pending||disposed)return;busy=true;controls();status.textContent='正在保存…'
  try{const r=await request(pending.path,pending.body);if(r.ok||[400,401,403,404,409,429].includes(r.status)){sessionStorage.removeItem(key);pending=null;const text=r.ok?(r.data.penalty!==undefined?`土地已买回 · 违约金 ${r.data.penalty} D币付给租客 · 双方各获作物结算 ${r.data.reward} D币 · 已退出自动出租，仅主动重新挂牌后可再租；本地块48小时内不可再次违约。`:r.data.total!==undefined?`已租入 ${r.data.count} 块 · 支付 ${r.data.total} D币 · 余额 ${r.data.balance} D币，土地已追加到农场。`:`${r.data.removed?'已撤下':r.data.offered?'已挂牌':'已完成'}${r.data.count!==undefined?' '+r.data.count+' 块土地':''}`):r.data.error||'操作未完成';status.textContent=text;if(r.ok){selectedRent.clear();selectedOffers.clear()}const refreshed=await Promise.allSettled([Promise.resolve().then(()=>onChanged())]);busy=false;await load();status.textContent=text+(refreshed[0].status==='rejected'?' 页面刷新失败，请手动刷新；无需重复操作。':'')}else status.textContent=(r.data.error||'暂时无法确认')+'，请确认上次操作，不会重复扣款'}catch{status.textContent='连接中断，请确认上次操作，不会重复扣款'}finally{busy=false;controls()}
 }
 function row(title,detail){const n=el('article','farm-lease-row');n.append(el('strong','',title),el('p','farm-small',detail));body.append(n);return n}
 function draw(){
  body.replaceChildren();const {state,catalog}=getFarm()
  if(tab==='market'){
   body.append(el('p','farm-small','勾选土地后统一支付租金，地主可支付1.2倍租金买回；当期作物双方各获得完整收成的基础售价。闲置满48小时的空地可租1天；每次最多60块。'))
   const summary=el('div','farm-lease-bulk'),info=el('strong'),pay=button('',()=>{const items=market.filter(x=>selectedRent.has(plotKey(x))).map(({owner_id,plot,price,days,forced})=>({owner_id,plot,price,days,forced}));if(items.length)void mutate('/api/farm/leases/rent-batch',{id:crypto.randomUUID(),items,confirm:true})})
   function syncRent(){const chosen=market.filter(x=>selectedRent.has(plotKey(x))),total=chosen.reduce((n,x)=>n+x.price,0);info.textContent=`已选 ${chosen.length} 块 · 合计 ${total} D币`;pay.textContent=`支付 ${total} D币并租用`;pay.dataset.empty=String(!chosen.length);pay.disabled=busy||!!pending||!chosen.length;for(const box of body.querySelectorAll('[data-rent-plot]'))box.checked=selectedRent.has(box.dataset.rentPlot)}
   summary.append(info,button('全选前60块',()=>{selectedRent.clear();market.slice(0,60).forEach(x=>selectedRent.add(plotKey(x)));syncRent()}),button('清空',()=>{selectedRent.clear();syncRent()}),pay);body.append(summary)
   const groups=new Map();for(const item of market){const k=[item.owner_id,item.price,item.days,item.forced].join(':');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(item)}
   for(const group of groups.values()){
    const item=group[0],n=row(item.name,`${item.forced?'闲置空地':'主动挂牌'} · ${item.days}天 · 每块 ${item.price} D币 · ${group.length}块可租`),grid=el('div','farm-lease-grid')
    for(const x of group){const label=el('label'),box=el('input');box.type='checkbox';box.dataset.rentPlot=plotKey(x);box.setAttribute('aria-label',`${item.name} 的田地 ${x.plot+1}`);box.onchange=()=>{if(box.checked&&selectedRent.size>=60){box.checked=false;status.textContent='一次最多租用60块，请先完成当前选择';return}box.checked?selectedRent.add(plotKey(x)):selectedRent.delete(plotKey(x));syncRent()};label.append(box,document.createTextNode('田地 '+(x.plot+1)));grid.append(label)}n.append(grid)
   }
   syncRent()
   if(!market.length)body.append(el('p','','暂无可出租的空地。'))
   if(next!==null)body.append(button('更多农友',()=>void load(next)))
  }else if(tab==='offer'){
   body.append(el('p','farm-small','按块勾选、全部挂牌或选择连续地块。租客付款前仍可撤下或使用；已出租的地块由租客经营。'))
   const active=new Set(data.leases.filter(l=>l.owner_id===userId&&l.state==='active').map(l=>l.plot)),empty=data.empty.filter(p=>!active.has(p))
   if(empty.length){
    for(const p of selectedOffers)if(!empty.includes(p))selectedOffers.delete(p)
    const form=el('form','farm-lease-offer'),price=el('input'),days=el('input');price.type=days.type='number';price.min=days.min='1';price.max='10000';days.max='7';price.step=days.step='1';price.value='10';days.value='1';price.required=days.required=true
    for(const [text,input] of [['每块租金（D币）',price],['租期（天）',days]]){const label=el('label','',text);label.append(input);form.append(label)}
    const grid=el('div','farm-lease-grid'),toolbar=el('div','farm-lease-actions'),start=el('select'),count=el('input'),submit=el('button'),selection=el('p','farm-small');submit.type='submit';start.setAttribute('aria-label','连续地块起点');for(const p of empty)start.add(new Option('从田地 '+(p+1),p));count.type='number';count.min='1';count.max=String(state.plots.length);count.step='1';count.value='1';count.setAttribute('aria-label','连续地块数量')
    const sync=()=>{for(const box of grid.querySelectorAll('input'))box.checked=selectedOffers.has(Number(box.value));submit.textContent=`挂牌所选 ${selectedOffers.size} 块`;submit.dataset.empty=String(!selectedOffers.size);submit.disabled=busy||!!pending||!selectedOffers.size;selection.textContent=`已选 ${selectedOffers.size} 块 · 每块 ${price.value||0} D币 · 全部租出可得 ${selectedOffers.size*(Number(price.value)||0)} D币`};price.oninput=sync
    toolbar.append(button('全部空地',()=>{selectedOffers.clear();empty.forEach(p=>selectedOffers.add(p));sync()}),button('清空选择',()=>{selectedOffers.clear();sync()}),start,count,button('选择连续地块',()=>{const n=Number(count.value),first=Number(start.value);if(!Number.isInteger(n)||n<1||n>state.plots.length){status.textContent='请输入有效的连续地块数量';return}const range=Array.from({length:n},(_,i)=>first+i);if(range.some(p=>!empty.includes(p))){status.textContent='该范围含种植中、已出租或未开放的地块，请调整起点或数量';return}selectedOffers.clear();range.forEach(p=>selectedOffers.add(p));status.textContent='';sync()}))
    for(const p of empty){const label=el('label'),box=el('input');box.type='checkbox';box.value=String(p);box.onchange=()=>{box.checked?selectedOffers.add(p):selectedOffers.delete(p);sync()};label.append(box,document.createTextNode('田地 '+(p+1)));grid.append(label)}
    form.append(submit);form.onsubmit=e=>{e.preventDefault();if(form.reportValidity()&&selectedOffers.size)void mutate('/api/farm/leases/offer',{plots:[...selectedOffers].sort((a,b)=>a-b),price:Number(price.value),days:Number(days.value),remove:false})};body.append(toolbar,grid,selection,form);sync()
   }else body.append(el('p','','没有可挂牌的空地。'))
   if(data.offers.length)body.append(button('撤下全部挂牌',()=>void mutate('/api/farm/leases/offer',{plots:data.offers.map(o=>o.plot),remove:true})))
   for(const o of data.offers){const n=row('田地 '+(o.plot+1),`${o.days}天 · ${o.price} D币`);n.append(button('撤下挂牌',()=>void mutate('/api/farm/leases/offer',{plot:o.plot,remove:true})))}
   for(const l of data.leases.filter(x=>x.owner_id===userId&&x.state==='active')){const c=catalog.crops.find(c=>c.id===l.crop_state.crop),n=row('田地 '+(l.plot+1)+' · 已出租',`${l.tenant_name} 正在经营 · ${c?c.name+(cropMatureAt(l.crop_state,c)<=clock()?' · 已成熟':' · 生长中'):'尚未播种'} · ${date(l.expires_at)}归还 · 租金 ${l.price} D币已入账`);n.append(button('买回土地',async()=>{if(busy||pending)return;busy=true;controls();status.textContent='正在计算买回报价…';try{const r=await request('/api/farm/leases/'+l.id+'/buyback');if(!r.ok)throw Error(r.data.error);if(disposed)return;const q=r.data,box=el('div','farm-lease-buyback');box.append(el('p','',`违约金 ${q.penalty} D币付给租客；${q.crop?q.crop+' ×'+q.quantity:'空地'}，双方各获 ${q.reward} D币。买回后默认不再自动出租；仅主动重新挂牌后可再租，本地块48小时内不可再次违约。`),button('确认支付并买回',()=>void mutate('/api/farm/leases/'+l.id+'/buyback',{id:crypto.randomUUID(),revision:q.revision,penalty:q.penalty,reward:q.reward,confirm:true})),button('取消',()=>box.remove()));n.querySelector('.farm-lease-buyback')?.remove();n.append(box);status.textContent='请核对费用与收成后确认。'}catch(e){status.textContent=e.message||'无法取得报价'}finally{busy=false;controls()}}))}
  }else{
   body.append(el('p','farm-small','使用自己的种子，播种自动浇水，收成与经验归自己。到期自动收获并归还土地。种子列表预留最多10%虫害缓冲，保证收成可在租期内成熟。'))
   const mine=data.leases.filter(x=>x.tenant_id===userId)
   for(const l of mine){
    const p=l.crop_state,c=catalog.crops.find(x=>x.id===p.crop),n=row(`${l.owner_name} · 田地 ${l.plot+1}`,l.state==='ended'?(l.buyback_penalty!==null?`地主已买回 · 违约金 ${l.buyback_penalty} D币、作物结算 ${l.buyback_reward} D币已到账`:'租约已结束，收成已入仓'):`${date(l.expires_at)}到期`)
    if(l.state==='ended')continue
    if(c){n.prepend(sprite(c.frame));const mature=cropMatureAt(p,c)<=clock();n.append(el('p','',c.name+' · '+(mature?'可收获':duration(cropMatureAt(p,c)-clock())+'后成熟')));if(cropHasPests(p,c,clock()))n.append(button('驱虫',()=>void mutate('/api/farm/leases/'+l.id+'/work',{id:crypto.randomUUID(),type:'pest'})));if(mature)n.append(button('收获入仓',()=>void mutate('/api/farm/leases/'+l.id+'/work',{id:crypto.randomUUID(),type:'harvest'})))}
    else if(l.expires_at>clock()){
     const select=el('select');select.setAttribute('aria-label','租地种子');for(const s of catalog.crops.filter(x=>(catalog.allUnlocked||state.xp>=x.unlock)&&clock()+cropMaxSeconds(x.seconds)<=l.expires_at).sort((a,b)=>(state.seeds[b.id]??0)-(state.seeds[a.id]??0)))select.add(new Option(`${s.name} ×${state.seeds[s.id]??0} · 缺种补买 ${s.seedPrice}`,s.id))
     const label=el('label','farm-preference'),auto=el('input');auto.type='checkbox';label.append(auto,document.createTextNode('缺种时按商店价格补买'))
     const actions=el('div','farm-lease-actions');actions.append(select,button('播种并浇水',()=>{if(select.value)void mutate('/api/farm/leases/'+l.id+'/work',{id:crypto.randomUUID(),type:'plant',crop:select.value,autoBuy:auto.checked})}));n.append(actions,label)
    }
   }
   if(!mine.length)body.append(el('p','','还没有租地。到“找地租”选择农友的空地。'))
  }
 }
 return {async open(){if(disposed)return;dialog.showModal();try{pending=JSON.parse(sessionStorage.getItem(key)||'null')}catch{status.textContent='待确认记录无法读取，请联系管理员';return}if(pending){status.textContent='上次操作结果待确认';controls()}else await load()},destroy(){disposed=true;dialog.close();dialog.remove()}}
}
