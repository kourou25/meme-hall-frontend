import {farmArt} from './farm-assets.js?v=8f410db6'
import {quantityStepper} from './farm-quantity.js?v=8f410db6'
import {coin} from './farm-ui.js?v=8f410db6'
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
export function ranchAnimalStatus(animal,spec,t,capacity=12,starvationSeconds=48*3600){
 const produced=Math.max(0,Math.floor((Math.min(t,animal.fedUntil)-animal.producedAt)/spec.seconds)),stored=Math.min(capacity,animal.stored+produced)
 const deathAt=animal.deadAt??animal.fedUntil+starvationSeconds,dead=animal.deadAt!==undefined||t>=deathAt
 const manure=animal.manure===undefined?0:Math.min(12,animal.manure+(animal.deadAt?0:Math.min(capacity-animal.stored,produced)))
 return {stored:animal.deadAt!==undefined?animal.stored:stored,manure,dead,deathAt,hungry:animal.fedUntil<=t,nextAt:animal.producedAt+(produced+1)*spec.seconds,full:stored>=capacity}
}
export function ranchSprite(frame){const art=farmArt(frame,true),[x,y,w,h]=art.rect,n=el('span','farm-ranch-sprite');n.setAttribute('aria-hidden','true');n.style.backgroundImage=`url('${art.url}')`;n.style.backgroundSize=`${art.width/w*100}% ${art.height/h*100}%`;n.style.backgroundPosition=`${x/(art.width-w)*100}% ${y/(art.height-h)*100}%`;return n}
export function drawRanchPanel(details,{state:s,catalog,selected,time,actionButton,isLocked=()=>false}){
 const r=s.ranch,defs=catalog.animals;if(!r||!defs)return
 const note=el('section','farm-note');note.append(el('h2','','牧场手记'),el('p','',`占用 ${r.animals.length}/${r.slots??catalog.ranch.slots} 个栏位 · 饲料 ${r.feed} 份`),el('p','farm-small','每份饲料支持一轮生产，最多备24小时。离线也会产出，每只最多暂存12份；满仓后饲料时间仍流逝。缺粮先停产，连续缺粮48小时死亡。死亡前的畜产可收取，动物不能复活或出售。'));details.append(note)
 const buyFeed=el('div','farm-shop-actions');for(const n of [12,48])buyFeed.append(actionButton(`饲料 ×${n} · ${n*catalog.ranch.feedPrice} 🍌`,{type:'feed_buy',count:n},s.coins<n*catalog.ranch.feedPrice));note.append(buyFeed)
 for(let i=0;i<r.animals.length;i++){
  if(!selected||selected.index>=r.animals.length)continue
  if(selected?.kind==='animal'&&selected.index<r.animals.length&&selected.index!==i)continue
  const a=r.animals[i],spec=defs.find(x=>x.id===a.kind),status=ranchAnimalStatus(a,spec,time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds),card=el('section','farm-ranch-animal'),name=el('div','farm-species')
  name.append(ranchSprite(spec.frame),el('h3','',`${i+1}. ${spec.name}`));card.append(name,el('p','',`${spec.product} ${status.stored}/${catalog.ranch.capacity} · ${status.dead?'已死亡':status.hungry?'缺粮停产':status.full?'已满仓':'正在生产'}`))
  if(!status.dead){const timer=el('p','farm-small');timer.dataset.countdown=String(status.hungry?status.deathAt:a.fedUntil);timer.dataset.prefix=status.hungry?'请及时添粮，距离死亡 ':'饲料耗尽还需 ';const left=Math.max(0,Number(timer.dataset.countdown)-time());timer.textContent=timer.dataset.prefix+(left>=3600?`${Math.floor(left/3600)}小时${Math.floor(left%3600/60)}分`:`${Math.ceil(left/60)}分钟`);card.append(timer)}
  if(!status.hungry&&!status.full){const timer=el('p','farm-small');timer.dataset.countdown=String(status.nextAt);timer.dataset.prefix='下一份还需 ';timer.textContent=`下一份约 ${Math.max(1,Math.ceil((status.nextAt-time())/60))} 分钟`;card.append(timer)}
  const actions=el('div','farm-shop-actions'),feedCount=Math.max(0,Math.min(12,Math.floor((time()+catalog.ranch.maxFedSeconds-Math.max(time(),a.fedUntil))/spec.seconds))),feedCost=Math.max(0,feedCount-r.feed)*catalog.ranch.feedPrice
  actions.append(actionButton('收取'+spec.product,{type:'animal_collect',animal:i},status.stored<1));if(!status.dead)actions.append(actionButton(`${feedCost?'补粮并添粮':'添粮'} ×${feedCount}${feedCost?' · '+feedCost+' 🍌':''}`,{type:'animal_feed',animal:i,count:feedCount,autoBuy:true},feedCount<1||s.coins<feedCost));card.append(actions)
  if(status.manure)actions.append(actionButton(`清洁 · 原料${status.manure}份`,{type:'animal_clean',animal:i}))
  if(status.dead){card.append(el('p','farm-small','连续缺粮已满48小时。清理时会先收好剩余畜产，不返还购价；仓满请先出售。'),actionButton('收好畜产并清理',{type:'animal_remove',animal:i,collect:true},(r.products[spec.id]??0)+status.stored>10000));details.append(card);continue}
  const release=el('details','farm-animal-release'),summary=el('summary','','出售动物');release.append(summary,el('p','farm-small',`返还 ${Math.floor(spec.price/2)} 🍌。请先收取畜产；剩余饲料时段不退回。`));const confirm=actionButton('确认出售'+spec.name,{type:'animal_sell',animal:i},status.stored>0);release.append(confirm);card.append(release);details.append(card)
 }
 if(selected?.kind==='animal'&&selected.index<r.animals.length)return
 const shop=el('section','farm-note farm-ranch-shop');shop.append(el('h2','','动物小铺'));details.append(shop)
 const free=(r.slots??catalog.ranch.slots)-r.animals.length,purchases=[]
 const update=n=>{for(const {spec,payload,b} of purchases){payload.count=n;b.innerHTML=n===null?'请输入数量':`领养 ${n} 只 · ${coin(spec.price*n)}`;const disabled=n===null||n>free||(!catalog.allUnlocked&&s.xp<spec.unlock)||s.coins<spec.price*n;b.dataset.unavailable=String(disabled);b.disabled=disabled||isLocked();b.setAttribute('aria-label',n===null?'请输入数量':`领养${spec.name} ${n}只，${spec.price*n}D币`)}}
 shop.append(quantityStepper(1,{label:'领养数量',max:Math.max(1,free),onChange:update}))
 for(const spec of defs){const row=el('article','farm-shop-row'),text=el('div'),payload={type:'animal_buy',kind:spec.id,count:1},b=actionButton('',payload);text.append(el('h3','',spec.name),el('p','farm-small',`${spec.product} · ${spec.seconds<3600?spec.seconds/60+'分钟':spec.seconds/3600+'小时'}/份 · ${catalog.allUnlocked?'已解锁':spec.unlock+'经验解锁'}`));purchases.push({spec,payload,b});row.append(ranchSprite(spec.frame),text,b);shop.append(row)}
 update(1)
 const products=el('section','farm-note');products.append(el('h2','','畜产与图鉴'));if(s.market)products.append(el('p','farm-small','以下仅出售开通前的原价库存；新畜产请在集市按批次出售。'));details.append(products)
 for(const spec of defs){const n=(s.market?s.market.legacy['animal:'+spec.id]:r.products[spec.id])??0,d=r.discovery[spec.id],row=el('div','farm-ranch-product');row.append(el('strong','',`${spec.product} ×${n}`),el('p','farm-small',d?`已发现${spec.name} · 累计收取 ${d.count} 份`:`收取${spec.product}后点亮图鉴`),actionButton(`出售 ${Math.min(99,n)} 份 · +${Math.min(99,n)*spec.sellPrice} 🍌`,{type:'product_sell',kind:spec.id,count:Math.min(99,n)},n<1));products.append(row)}
}
