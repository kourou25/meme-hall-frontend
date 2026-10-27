import {el,coin,duration} from './farm-ui.js?v=8f410db6'
import {quantityStepper} from './farm-quantity.js?v=8f410db6'
const quantities=new WeakMap()
export function pigStatus(p,spec,t){const grown=p.deadAt?0:Math.max(0,Math.min(spec.seconds-p.growth,Math.min(t,p.fedUntil)-p.updatedAt)),growth=p.growth+grown,manure=p.manure===undefined?0:Math.min(12,p.manure+Math.floor(((p.manureSeconds??0)+grown)/7200));return {growth,manure,adult:growth>=spec.seconds,dead:!!p.deadAt||t>=p.fedUntil+172800}}
export function drawPigPanel(details,{state:s,catalog:c,selected,time,actionButton,isLocked}){
 const t=time(),prefs=quantities.get(details)??{buy:1,feed:1};quantities.set(details,prefs)
 const changes=[];const update=()=>changes.forEach(fn=>fn())
 details.append(el('h3','',`育肥动物 · ${s.pigs.animals.length} / ${c.leisure.pigSlots} 栏`),el('p','farm-small','猪与牛羊鸡在同一牧场活动。猪养大后出售，原有成长、饲料与栏位保留；缺粮48小时死亡。'))
 const p=s.pigs.animals.find(p=>p.id===selected?.index)
 if(p){const spec=c.pigs.find(x=>x.id===p.kind),v=pigStatus(p,spec,t),card=el('section','farm-note');card.append(el('h3','',spec.name),el('p','farm-small',v.dead?'已死亡，请清理栏位。':v.adult?'已成年，可以出售。':`成长 ${Math.floor(v.growth/spec.seconds*100)}% · 还需 ${duration(spec.seconds-v.growth)}`))
  if(!v.dead){card.append(el('p','farm-small',p.fedUntil>t?'余粮 '+duration(p.fedUntil-t):'缺粮停长，距死亡 '+duration(p.fedUntil+172800-t)))
   card.append(quantityStepper(prefs.feed,{label:'添粮份数',max:12,onChange:n=>{prefs.feed=n;update()}}))
   const feedAction={type:'pig_feed',pig:p.id,count:prefs.feed},feed=actionButton('',feedAction);card.append(feed)
   changes.push(()=>{const n=prefs.feed;feedAction.count=n;const unavailable=n===null||s.coins<n*4||Math.max(time(),p.fedUntil)+n*7200-time()>86400;feed.innerHTML=`添粮 ${(n??0)*2} 小时 · ${coin((n??0)*4)}`;feed.dataset.unavailable=String(unavailable);feed.disabled=unavailable||isLocked()})
   if(!v.adult)card.append(actionButton(`使用库存饲料 ×${c.leisure.pigFeedUnits??2} · 添粮2小时`,{type:'pig_feed_stock',pig:p.id,count:1},s.ranch.feed<(c.leisure.pigFeedUnits??2)||Math.max(t,p.fedUntil)+7200-t>86400))
   if(v.adult)card.append(actionButton(`出售成年猪 · +${spec.sellPrice} 🍌`,{type:'pig_sell',pig:p.id}))
  }else card.append(actionButton('清理栏位',{type:'pig_remove',pig:p.id}));if(v.manure)card.append(actionButton(`清洁 · 原料${v.manure}份`,{type:'pig_clean',pig:p.id}));details.append(card)
 }
 details.append(el('h3','','猪仔小铺'),quantityStepper(prefs.buy,{label:'购买数量',max:c.leisure.pigSlots,onChange:n=>{prefs.buy=n;update()}}))
 for(const spec of c.pigs){const row=el('article','farm-shop-row'),art=el('span','farm-pig-sprite'),copy=el('div');art.setAttribute('aria-hidden','true');art.style.setProperty('--pig-color',spec.color);copy.append(el('h3','',spec.name),el('p','farm-small',`${duration(spec.seconds)}成年 · ${spec.unlock}经验解锁`));const value=el('p','farm-small');value.innerHTML='成年出售 '+coin(spec.sellPrice);copy.append(value)
  const buyAction={type:'pig_buy',kind:spec.id,count:prefs.buy},buy=actionButton('',buyAction);row.append(art,copy,buy);details.append(row)
  changes.push(()=>{const n=prefs.buy;buyAction.count=n;const unavailable=n===null||s.pigs.animals.length+n>c.leisure.pigSlots||s.coins<spec.price*n||!c.allUnlocked&&s.xp<spec.unlock;buy.innerHTML=`购入 ×${n??0} · ${coin(spec.price*(n??0))}`;buy.dataset.unavailable=String(unavailable);buy.disabled=isLocked()||unavailable})
 }
 update()
}
