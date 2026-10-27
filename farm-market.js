import {el,button,coin,duration,icon} from './farm-ui.js?v=8f410db6'
import {quantityStepper} from './farm-quantity.js?v=8f410db6'
import {goodsArt,metric,priceChart,marketStyles} from './farm-market-visuals.js?v=8f410db6'
import {panelClock} from './farm-panel-clock.js?v=8f410db6'
export function createFarmMarket(root,{request,onChanged,userId}){
 marketStyles()
 const dialog=el('dialog','farm-social farm-market'),head=el('header','farm-social-heading'),body=el('div','farm-social-body'),note=el('p','farm-market-notice'),title=el('h2','','田园集市')
 const wide=button('大屏',()=>{dialog.classList.toggle('fm-wide');wide.setAttribute('aria-pressed',String(dialog.classList.contains('fm-wide')))});wide.setAttribute('aria-pressed','false')
 title.id='farm-market-title';dialog.setAttribute('aria-labelledby',title.id);note.setAttribute('role','status');head.append(title,wide,button('关闭',()=>dialog.close()));dialog.append(head,note,body);root.append(dialog)
 const pendingKey='farm.market.pending:'+userId,histories=new Map(),quantities=new Map(),expanded=new Set()
 let shopSort='expiry',shopSource='',shopMax='',shopQty='',shopFresh=0,shopAdvanced=false,searchTimer=null
 let disposed=false,busy=false,data=null,tab='warehouse',filter='',kind='',search='',stockFilter='all',generation=0,pending=null,chartGeneration=0,selected='',historyError='',historyBusy=false,live=[],sortKey='owned',sortDirection=-1,period=24,saleReview=null
 const clock=panelClock(dialog,()=>{for(const update of live)update()})
 try{const cached=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(cached?.id&&cached?.payload)pending=cached}catch{}
 const money=c=>coin((c/100).toFixed(2)),date=t=>new Date(t*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),specFor=key=>data.catalog.find(c=>c.key===key)
 const visible=key=>(!filter||key===filter)&&(!kind||specFor(key)?.kind===kind)&&(!search||(specFor(key)?.name??key).toLocaleLowerCase().includes(search.toLocaleLowerCase()))
 const serverNow=clock.now
 async function load(before,shopAfter=null,quiet=false){
  if(disposed)return;const gen=++generation;body.setAttribute('aria-busy','true');if(!data)body.replaceChildren(el('p','farm-empty','正在读取行情…'))
  try{const q=new URLSearchParams();if(filter)q.set('item',filter);if(before)q.set('before',String(before));q.set('shop_sort',shopSort);if(kind)q.set('shop_kind',kind);if(search)q.set('shop_q',search);if(shopSource)q.set('shop_source',shopSource);if(shopMax)q.set('shop_max',String(Math.round(Number(shopMax)*100)));if(shopQty)q.set('shop_qty',shopQty);if(shopFresh)q.set('shop_fresh',String(shopFresh));if(shopAfter)q.set('shop_after',shopAfter);const r=await request('/api/farm/market?'+q)
   if(disposed||gen!==generation)return;if(!r.ok)throw Error(r.data.error||'行情读取失败')
   data={...r.data,lots:before?[...data.lots,...r.data.lots]:r.data.lots,shop:shopAfter?[...new Map([...data.shop,...r.data.shop].map(l=>[l.id,l])).values()].slice(-240):r.data.shop};saleReview=null;clock.sync(data.server_time);if(quantities.size>180)quantities.clear();render();if(tab==='prices')void loadChart();return true
  }catch(e){if(disposed||gen!==generation)return false;if(!quiet){note.dataset.state='error';note.textContent=e.message}if(!data)body.replaceChildren(button('重新读取',()=>load()));return false}finally{if(gen===generation)body.removeAttribute('aria-busy')}
 }
 async function loadChart(force=false){
  const cached=histories.get(selected)
  if(!selected||disposed||cached&&serverNow()-cached.sampled_at<20&&!force)return
  const item=selected,seq=++chartGeneration;historyBusy=true;historyError='';render()
  try{const r=await request('/api/farm/market/history?item='+encodeURIComponent(item));if(disposed||seq!==chartGeneration)return;if(!r.ok)throw Error(r.data.error||'走势暂不可用');if(histories.size>=6)histories.delete(histories.keys().next().value);histories.set(item,{points:r.data.points,sampled_at:r.data.quotes_at??r.data.server_time})
  }catch(e){if(!disposed&&seq===chartGeneration)historyError=e.message}finally{if(!disposed&&seq===chartGeneration){historyBusy=false;render()}}
 }
 async function trade(payload){
  if(busy||disposed)return
  if(pending&&JSON.stringify(pending.payload)!==JSON.stringify(payload)){note.textContent='上一笔尚未确认，请先重试查询，避免重复交易。';return}
  pending??={payload,id:crypto.randomUUID()};try{sessionStorage.setItem(pendingKey,JSON.stringify(pending))}catch{note.textContent='浏览器无法保存交易编号，请允许本站会话存储后再交易。';pending=null;return}
  busy=true;render();note.dataset.state='pending';note.textContent='正在确认交易…'
  try{const r=await request('/api/farm/market',{...pending.payload,id:pending.id});if(disposed)return
   if(!r.ok){if(r.status<500){sessionStorage.removeItem(pendingKey);pending=null;await load()}throw Error(r.data.error||'交易未确认，请重试')}
   sessionStorage.removeItem(pendingKey);pending=null;saleReview=null
   const receipt=r.data,buy=receipt.kind==='buy',text=receipt.message||`${buy?'已购入':'已售出'} ${receipt.batches?receipt.batches+' 批 · ':''}${receipt.quantity} 份 · ${buy?'支出':'成交金额'} ${(receipt.total_cents/100).toFixed(2)} D币 · 余额 ${receipt.balance} D币${buy?'；已放入仓库，转售冷却10分钟':''}${receipt.duplicate?'（原交易已确认，未重复扣款）':''}`
   // Apply the confirmed debit once locally; refresh failures must never turn a
   // committed trade into an apparent failure or leave already-sold rows usable.
   if(data){
    const spent=new Map((payload.lots??[{id:payload.lot,quantity:payload.quantity}]).map(l=>[l.id,l.quantity])),key=buy?'shop':'lots'
    if(['buy','sell','sell_batch'].includes(receipt.kind)&&!receipt.duplicate){
     data.owned_counts={...data.owned_counts}
     if(buy)data.owned_counts[receipt.item]=(data.owned_counts[receipt.item]??0)+receipt.quantity
     else for(const lot of data.lots)if(spent.has(lot.id))data.owned_counts[lot.item]=Math.max(0,(data.owned_counts[lot.item]??0)-spent.get(lot.id))
     data[key]=data[key].map(l=>({...l,quantity:l.quantity-(spent.get(l.id)??0)})).filter(l=>l.quantity>0)
    }
    if(receipt.remainder_cents!==undefined)data.remainder_cents=receipt.remainder_cents
   }
   note.dataset.state='success';note.textContent=text;render()
   const refreshed=await Promise.allSettled([Promise.resolve().then(()=>onChanged()),load(null,null,true)])
   if(!disposed){note.dataset.state='success';note.textContent=text+(refreshed.some(x=>x.status==='rejected'||x.value===false)?'。交易已完成，部分页面数据刷新失败，请点刷新；无需重新交易。':'')}
  }catch(e){note.dataset.state='error';note.textContent=e.message||'网络中断，使用原编号重新确认即可。'}finally{busy=false;if(!disposed)render()}
 }
 function render(){
  if(!data||disposed)return;const scroll=body.scrollTop,searchFocus=document.activeElement?.classList.contains('fm-search'),caret=searchFocus?document.activeElement.selectionStart:0;live=[];body.replaceChildren()
  const tabs=el('nav','farm-market-tabs');tabs.setAttribute('aria-label','集市内容')
  for(const [id,name] of [['warehouse','我的仓库'],['shop','公共商店'],['prices','物产行情']]){const b=button(name,()=>{tab=id;body.scrollTop=0;render();if(id==='shop')void load();if(id==='prices')void loadChart()});b.setAttribute('aria-pressed',String(tab===id));b.disabled=busy;tabs.append(b)}
  const reload=button('',()=>{histories.clear();void load()},'fm-refresh');reload.innerHTML=icon('refresh');reload.title='刷新';reload.setAttribute('aria-label','刷新');reload.disabled=busy;tabs.append(reload);body.append(tabs)
  if(pending){const retry=button('重新确认上一笔交易',()=>trade(pending.payload));retry.disabled=busy;body.append(retry)}
  if(!data.active){const intro=el('div','fm-intro');intro.append(el('strong','','让收成进入市场'),el('p','','历史库存原数量迁入，并获得7天新鲜保护期；新收成按批次记录保质期。行情每10分钟按供需更新。'));const start=button(data.enabled?'开通行情仓库':'市场暂未开放',()=>trade({kind:'enroll'}));start.disabled=!data.enabled||busy;intro.append(start);body.append(intro)}
  const toolbar=el('div','fm-toolbar'),kinds=el('div','fm-kind-tabs');for(const [id,name]of [['','全部'],['crop','作物'],['animal','畜产'],['fish','渔获']]){const b=button(name,()=>{kind=id;saleReview=null;if(filter&&id&&specFor(filter)?.kind!==id){filter='';void load()}else{if(tab==='shop')void load();else render();if(tab==='prices')void loadChart()}});b.setAttribute('aria-pressed',String(kind===id));b.disabled=busy;kinds.append(b)}
  const select=el('select');select.setAttribute('aria-label','商品筛选');select.add(new Option('查找物产…',''));for(const c of data.catalog)select.add(new Option(c.name,c.key));select.value=filter;select.disabled=busy;select.onchange=()=>{filter=select.value;search='';stockFilter='all';if(filter)kind=specFor(filter)?.kind??'';saleReview=null;void load()};toolbar.append(kinds);if(tab!=='shop')toolbar.append(select);body.append(toolbar);const searchBox=el('input','fm-search');searchBox.type='search';searchBox.placeholder=tab==='shop'?'搜索全部在售物产':'搜索已加载的物产';searchBox.setAttribute('aria-label','搜索物产');searchBox.value=search;searchBox.disabled=busy;const searchUpdate=()=>{search=searchBox.value;saleReview=null;clearTimeout(searchTimer);if(tab==='shop')searchTimer=setTimeout(()=>load(),300);else render()};searchBox.oninput=e=>{if(!e.isComposing)searchUpdate()};searchBox.oncompositionend=searchUpdate;body.append(searchBox);if(searchFocus){searchBox.focus({preventScroll:true});searchBox.setSelectionRange(caret,caret)}
  if(tab==='prices'){prices();body.scrollTop=scroll;return}
  const shop=tab==='shop';if(shop)shopControls(select);const lots=(shop?data.shop:data.lots).filter(l=>visible(l.item)&& (shop||stockFilter!=='ready'||l.quantity>l.locked_quantity&&l.cooldown_until<=serverNow())&&(shop||stockFilter!=='soon'||l.expires_at>serverNow()&&l.expires_at<=serverNow()+3600)).sort((a,b)=>shop?0:a.expires_at-b.expires_at||a.id.localeCompare(b.id)),summary=el('div','fm-summary'),expiring=metric(shop?'购买溢价':'临期批次',shop?'+10%':'0',shop?'购入后冷却10分钟':'1小时内到期')
  if(!shop)live.push(()=>expiring.querySelector('strong').textContent=String(lots.filter(l=>l.expires_at>serverNow()&&l.expires_at-serverNow()<3600).length))
  summary.append(metric(shop?'在售批次':'当前批次',String(lots.length),shop?'筛选全部货架 · 每页60批':'临期批次排在前面'),expiring,metric('零钱结余',(data.remainder_cents/100).toFixed(2),'累计整币自动入钱包'));body.append(summary)
  body.append(el('p','fm-context',shop?'固定24种基础货源，每10分钟检查并补足低库存；另有玩家出售的10%新鲜收成。购入溢价10%，转售冷却10分钟；保质期持续流逝。':'新鲜物产按当前价格出售；腐烂品按现价10%回收。历史迁入批次有7天新鲜保护期。冻结或冷却中的库存不会被批量出售。'))
  if(!shop){const filters=el('nav','fm-kind-tabs');filters.setAttribute('aria-label','库存状态');for(const [id,label]of [['all','全部批次'],['ready','可出售'],['soon','一小时内到期']]){const b=button(label,()=>{stockFilter=id;saleReview=null;render()});b.setAttribute('aria-pressed',String(stockFilter===id));b.disabled=busy;filters.append(b)}body.append(filters)}
  if(!shop){const ready=lots.filter(l=>l.quantity>l.locked_quantity&&l.cooldown_until<=serverNow()).slice(0,60),sell=button('出售当前可售物产',()=>{saleReview=saleLots(ready);render()});sell.disabled=busy||!data.active||!ready.length;body.append(sell);if(saleReview){const review=el('div','fm-sale-review'),sum=saleReview.reduce((n,l)=>n+l.total,0),confirm=button('确认出售',()=>trade({kind:'sell_batch',lots:saleReview}));confirm.disabled=busy;review.append(el('strong','',`当前筛选 · ${saleReview.length} 批 · ${saleReview.reduce((n,l)=>n+l.quantity,0)} 份`),el('span','',`预计 ${(sum/100).toFixed(2)} D币`),confirm,button('取消',()=>{saleReview=null;render()}));body.append(review)}}
  if(!lots.length){const empty=el('div','fm-empty');empty.innerHTML=icon('basket');empty.append(el('strong','',shop?'没有符合条件的在售商品':'这里还没有新收成'),el('p','',shop?'可调整筛选；基础货源会自动补货，无需等待农友收成。':'收获、摘取或钓鱼后，新的批次会出现在这里。'));body.append(empty)}
  const list=el('div','fm-lot-list');function lotRow(lot,container){
   const spec=specFor(lot.item),available=lot.quantity-lot.locked_quantity,card=el('article','farm-market-lot'),desc=el('div','fm-lot-detail'),controls=el('div','farm-market-lot-actions');let n=Math.min(data.rules.maxTrade,available,quantities.get(lot.id)??1),quoted=0,lastTotal=-1
   const price=shop?Math.ceil(lot.price_cents*110/100):lot.price_cents,source=lot.id.startsWith('initial-')?'基础货源':lot.id.startsWith('historic-')?'历史迁入 · '+(lot.source==='stolen'?'摘取':'收成'):shop?'公共货架':({grown:'自产',stolen:'摘取',market:'购入'}[lot.source]||'收成')
   desc.append(el('h3','',spec?.name??lot.item),el('p','farm-small',`${source} · 可用 ${available}${lot.locked_quantity?' · 冻结 '+lot.locked_quantity:''}`))
   const freshness=el('div','fm-freshness'),bar=el('i'),expiry=el('small','fm-expiry'),cooldown=el('small','fm-cooldown');freshness.append(bar);freshness.title=date(lot.expires_at)+'到期';desc.append(freshness,expiry,cooldown)
   const total=el('strong','fm-trade-total'),action=button(shop?'购入':'出售',()=>trade({kind:shop?'buy':'sell',lot:lot.id,quantity:n,price,expected_total:quoted})),update=()=>{
    const left=lot.expires_at-serverNow(),rotten=left<=0,cool=Math.max(0,lot.cooldown_until-serverNow());quoted=Math.floor(price*(n??0)/(rotten?10:1))
    if(quoted!==lastTotal){total.innerHTML=money(quoted);lastTotal=quoted}card.dataset.freshness=rotten?'rotten':left<3600?'soon':'fresh';bar.style.width=Math.round(Math.max(0,Math.min(1,left/Math.max(1,lot.expires_at-lot.born_at)))*100)+'%'
    expiry.textContent=rotten?(shop?'已到期 · 不可购买':'已腐烂 · 10%回收价'):`${duration(left)}后到期`;cooldown.textContent=cool?'转售冷却 '+duration(cool):'';cooldown.hidden=!cool
    action.disabled=busy||!data.active||!n||!available||!!cool||shop&&(!data.enabled||rotten)
   }
   const stepper=quantityStepper(Math.max(1,n),{label:(spec?.name??'物产')+'交易数量',max:Math.max(1,Math.min(data.rules.maxTrade,available)),onChange:v=>{n=v;if(v!==null)quantities.set(lot.id,v);update()}});if(busy)for(const e of stepper.querySelectorAll('button,input'))e.disabled=true
   const quick=el('div','fm-quick-quantity'),limit=Math.max(1,Math.min(data.rules.maxTrade,available));for(const [label,count]of [['1',1],['10',Math.min(10,limit)],['一半',Math.max(1,Math.floor(limit/2))],['最大',limit]]){const b=button(label,()=>{const input=stepper.querySelector('input');input.value=String(count);input.dispatchEvent(new Event('input',{bubbles:true}))});b.disabled=busy||!available;quick.append(b)}
   controls.append(stepper,quick,total,action);live.push(update);card.append(goodsArt(spec),desc,controls);container.append(card)
  }
  if(shop){for(const lot of lots)lotRow(lot,list)}else{
   const groups=new Map();for(const lot of lots){if(!groups.has(lot.item))groups.set(lot.item,[]);groups.get(lot.item).push(lot)}
   for(const [item,rows]of groups){const group=el('section','fm-stock-group'),heading=el('div','fm-stock-heading'),desc=el('div'),ready=rows.filter(l=>l.quantity>l.locked_quantity&&l.cooldown_until<=serverNow()),count=rows.reduce((n,l)=>n+l.quantity,0),sell=button('出售可售库存',()=>{saleReview=saleLots(ready);render()});sell.disabled=busy||!data.active||!ready.length;desc.append(el('h3','',specFor(item)?.name??item),el('p','farm-small',count+' 份 · '+rows.length+' 批 · 可售 '+ready.reduce((n,l)=>n+l.quantity-l.locked_quantity,0)+' 份'));heading.append(goodsArt(specFor(item)),desc,sell);group.append(heading);const details=el('details','fm-stock-details'),content=el('div'),summary=el('summary','','选数量 / 查看保质期');details.open=expanded.has(item);let rendered=false;const fill=()=>{if(rendered)return;rendered=true;for(const l of rows)lotRow(l,content);clock.tick()};details.append(summary,content);details.ontoggle=()=>{if(details.open){expanded.add(item);fill()}else expanded.delete(item)};if(details.open)fill();group.append(details);list.append(group)}
  }body.append(list);if(shop&&data.shop_next)body.append(button('更多在售批次',()=>load(null,data.shop_next)));if(!shop&&data.next)body.append(button('更多批次',()=>load(data.next)));clock.tick();body.scrollTop=scroll
 }
 function shopControls(itemSelect){
  const primary=el('div','fm-shop-primary'),row=el('div','fm-shop-filters'),choose=(label,options,value,changed,destination=row)=>{const wrap=el('label','',label),s=el('select');s.setAttribute('aria-label',label);for(const [v,n]of options)s.add(new Option(n,v));s.value=value;s.disabled=busy;s.onchange=()=>{changed(s.value);void load()};wrap.append(s);destination.append(wrap)}
  choose('货架排序',[['expiry','临期优先'],['fresh','保鲜最久'],['price','价格从低到高'],['price_desc','价格从高到低'],['quantity','库存从多到少'],['newest','最近入库']],shopSort,v=>shopSort=v,primary)
  const active=[shopSource,shopFresh,shopMax,shopQty,filter].filter(Boolean).length,toggle=button('更多筛选'+(active?' · '+active:''),()=>{shopAdvanced=!shopAdvanced;row.hidden=!shopAdvanced;toggle.setAttribute('aria-expanded',String(shopAdvanced))});toggle.setAttribute('aria-expanded',String(shopAdvanced));toggle.setAttribute('aria-controls','fm-shop-advanced');row.id='fm-shop-advanced';row.hidden=!shopAdvanced;primary.append(toggle);body.append(primary);const item=el('label','','指定物产');item.append(itemSelect);row.append(item)
  choose('货源',[['','全部货源'],['player','玩家出售'],['initial','基础货源']],shopSource,v=>shopSource=v)
  choose('剩余保质期',[['0','不限'],['600','至少10分钟'],['3600','至少1小时'],['21600','至少6小时'],['86400','至少1天']],String(shopFresh),v=>shopFresh=Number(v))
  const max=el('input'),qty=el('input');for(const [input,label,value,step,limit]of [[max,'最高单价（D币）',shopMax,'.01',1000000],[qty,'至少库存（份）',shopQty,'1',10000]]){input.type='number';input.min='0';input.max=String(limit);input.step=step;input.value=value;input.placeholder='不限';input.setAttribute('aria-label',label);const wrap=el('label','',label);wrap.append(input);row.append(wrap)}
  const apply=button('应用范围',()=>{if(!max.reportValidity()||!qty.reportValidity())return;shopMax=max.value;shopQty=qty.value;void load()}),reset=button('重置筛选',()=>{shopSort='expiry';shopSource='';shopMax='';shopQty='';shopFresh=0;shopAdvanced=false;kind='';filter='';search='';void load()});apply.disabled=reset.disabled=busy;row.append(apply,reset);body.append(row)
 }
 function saleLots(lots){return lots.slice(0,60).map(l=>{const quantity=Math.min(10000,l.quantity-l.locked_quantity);return {id:l.id,quantity,price:l.price_cents,total:Math.floor(l.price_cents*quantity/(serverNow()>=l.expires_at?10:1))}})}
 function goTrade(next){tab=next;filter=selected;kind=specFor(selected)?.kind??'';search='';stockFilter='all';body.scrollTop=0;void load()}
 function prices(){
  const goods=data.goods.filter(g=>visible(g.item));if(!goods.length){body.append(el('p','farm-empty','有新增收成后生成对应行情。'));return}
  goods.sort((a,b)=>sortDirection*(sortKey==='name'?specFor(a.item).name.localeCompare(specFor(b.item).name,'zh-CN'):sortKey==='owned'?(data.owned_counts?.[a.item]??0)-(data.owned_counts?.[b.item]??0):sortKey==='delta'?a.price_cents/a.base_cents-b.price_cents/b.base_cents:(a[sortKey]??0)-(b[sortKey]??0))||specFor(a.item).name.localeCompare(specFor(b.item).name,'zh-CN'))
  const board=el('section','fm-summary fm-board-summary');board.append(metric(filter||kind||search?'当前筛选持仓':'全部物产持仓',String(goods.reduce((n,g)=>n+(data.owned_counts?.[g.item]??0),0)),'我的库存 · 含冻结与冷却中'),metric('全服新鲜供应',String(goods.reduce((n,g)=>n+g.fresh_qty,0)),'当前筛选物产'),metric('上涨 / 下跌',goods.filter(g=>g.price_cents>g.base_cents).length+' / '+goods.filter(g=>g.price_cents<g.base_cents).length,'相对基础价格'));body.append(board)
  if(!goods.some(g=>g.item===selected)){selected=goods[0].item;chartGeneration++;historyBusy=false;historyError=''}
  const g=goods.find(g=>g.item===selected),spec=specFor(selected),owned=data.owned_counts?.[selected]??0,pct=(g.price_cents/g.base_cents-1)*100,hero=el('section','fm-price-focus'),info=el('div','fm-price-heading'),text=el('div','fm-price-copy'),value=el('strong','fm-price-value');value.innerHTML=money(g.price_cents);text.append(el('h3','',spec.name),value);const delta=el('span','fm-delta',(pct>0?'+':'')+pct.toFixed(1)+'%');delta.dataset.direction=pct>0?'up':pct<0?'down':'flat';info.append(goodsArt(spec),text,delta);hero.append(info,el('p','fm-context',`我的持有 ${owned} 份 · 全服新鲜库存 ${g.fresh_qty} · 上档折算 ${g.effective_qty??'—'} · ${g.reference_only?'尚无新收成 · 基础参考价':date(g.tick_at)+' 更新'}`))
  const shortcuts=el('div','fm-trade-shortcuts'),buyAction=button('去买入',()=>goTrade('shop')),sellAction=button(owned?'卖出我的持仓':'暂无持仓',()=>goTrade('warehouse'));buyAction.disabled=busy;sellAction.disabled=busy||owned===0;shortcuts.append(buyAction,sellAction);hero.append(shortcuts)
  const periods=el('div','fm-periods');periods.setAttribute('aria-label','走势时间范围');for(const hours of [6,24]){const b=button(hours+'小时',()=>{period=hours;render()});b.setAttribute('aria-pressed',String(period===hours));periods.append(b)}hero.append(periods)
  const points=(histories.get(selected)?.points??[]).filter(p=>p.tick_at>=data.server_time-period*3600)
  periods.hidden=!points.length
  if(historyBusy)hero.append(el('div','fm-chart-empty','正在读取真实走势…'));else if(historyError)hero.append(el('p','',historyError),button('重读走势',()=>loadChart(true)));else hero.append(priceChart(points,spec));if(points.length)hero.append(el('small','fm-chart-key','实线为价格 · 虚线为基础价 · 柱形为成交量。拖动时间轴查看记录。'))
  const layout=el('div','fm-prices-layout');layout.append(hero);body.append(layout)
  const table=el('table','farm-market-prices'),h=el('thead'),tr=el('tr');for(const [key,label,short]of [['name','物产','物产'],['price_cents','当前价格','现价'],['delta','较基础价','价差'],['owned','我的持有','持有'],['effective_qty','折算库存','折算']]){const th=el('th'),b=button('',()=>{sortDirection=sortKey===key?-sortDirection:key==='name'?1:-1;sortKey=key;render()}),marker=el('span','fm-sort-marker',sortKey===key?(sortDirection===1?'↑':'↓'):'↕');marker.setAttribute('aria-hidden','true');b.append(el('span','fm-column-label',label),el('span','fm-column-short',short),marker);th.scope='col';th.setAttribute('aria-sort',sortKey===key?(sortDirection===1?'ascending':'descending'):'none');b.setAttribute('aria-label','按'+label+'排序');b.title=label;th.append(b);tr.append(th)}h.append(tr);table.append(h);const rows=el('tbody');table.append(rows)
  for(const item of goods){const c=specFor(item.item),r=el('tr'),name=el('td'),choose=button('',()=>{selected=item.item;historyError='';chartGeneration++;historyBusy=false;render();void loadChart()});choose.append(goodsArt(c),el('span','',c.name));choose.setAttribute('aria-label','查看'+c.name+'走势');choose.setAttribute('aria-pressed',String(selected===item.item));name.append(choose);const price=el('td'),change=el('td','fm-delta'),diff=(item.price_cents/item.base_cents-1)*100;price.innerHTML=money(item.price_cents);change.textContent=(diff>0?'+':'')+diff.toFixed(1)+'%';change.dataset.direction=diff>0?'up':diff<0?'down':'flat';r.dataset.selected=String(selected===item.item);r.append(name,price,change,el('td','fm-owned',String(data.owned_counts?.[item.item]??0)),el('td','',item.effective_qty==null?'—':String(item.effective_qty)));rows.append(r)}
  const tableWrap=el('div','fm-table-wrap');tableWrap.append(table);layout.append(tableWrap);body.append(el('p','fm-context','折算库存按剩余保质期计算，临期权重更低。行情快照最多延迟20秒；交易按实时库存与金额再次核对。无交易不随机涨跌。'))
 }
 return {open(){if(disposed)return;if(!dialog.open)dialog.showModal();clock.start();void load()},destroy(){disposed=true;clearTimeout(searchTimer);clock.destroy();live=[];generation++;chartGeneration++;histories.clear();quantities.clear();dialog.remove()}}
}
