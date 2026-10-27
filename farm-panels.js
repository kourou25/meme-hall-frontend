import {cropMatureAt,cropHasPests} from './farm-crop-care.js?v=8f410db6'
import {el,button,sprite,duration,coin} from '/farm-ui.js?v=8f410db6'
import {quantityStepper} from '/farm-quantity.js?v=8f410db6'
import {drawRanchPanel} from '/farm-ranch.js?v=8f410db6'
import {sortFarmSeeds,farmQuantity} from '/farm-preferences.js?v=8f410db6'
export function createFarmPanel({details,session,preferences,getSelection,time,actionButton,chooseSeed}){
 function section(title){const e=el('section','farm-note');e.append(el('h2','',title));details.append(e);return e}
 function countdown(node,end,prefix){node.dataset.countdown=String(end);node.dataset.prefix=prefix;node.textContent=prefix+duration(end-time())}
 function drawPanel(){
  const {panel,selected,seed}=getSelection()
  const data=session.view().data;if(!data)return
  const {state:s,catalog}=data;details.replaceChildren()
  if(panel==='ranch'){drawRanchPanel(details,{state:s,catalog,selected,time,actionButton,isLocked:()=>session.view().status!=='ready'});return}
  if(panel==='journal'){
   const target=section(selected?.kind==='plot'?`田地 ${selected.index+1}`:'今天，从一粒种子开始')
   if(!selected){target.append(el('p','','点地即可开垦、播种、浇水或收获。收成进入仓库，出售后可买种子、领养动物或扩建。'))}
   else if(selected.kind==='plot'){
    const p=s.plots[selected.index]
    if(!p.tilled){target.append(el('p','','青草下是一块好土地。开垦后即可播种。'),actionButton('开垦这块地',{type:'till',plot:selected.index}))}
    else if(!p.crop){const c=catalog.crops.find(c=>c.id===seed);target.append(el('p','',`已开垦，可种植。当前种子：${c.name}，剩余 ${s.seeds[seed]}。`),actionButton('播种'+c.name,{type:'plant',plot:selected.index,crop:seed},s.seeds[seed]<1),button('选择其他种子',chooseSeed))}
    else{const c=catalog.crops.find(c=>c.id===p.crop),row=el('div','farm-species');row.append(sprite(c.frame),el('strong','',c.name));target.append(row)
     if(p.wateredAt===null)target.append(el('p','','还需要一次浇水，之后便会自己生长。'),actionButton('浇水',{type:'water',plot:selected.index}))
     else if(cropHasPests(p,c,time()))target.append(el('p','','叶片有虫害，驱虫可恢复原生长进度；不处理最多延迟10%，不减少收成。'),actionButton('驱虫',{type:'pest',plot:selected.index}))
     else if(time()>=cropMatureAt(p,c))target.append(el('p','',`已经成熟，可收获 ${2-(p.stolen??0)} 份。${p.stolen?'有农友摘过，本次剩余收成为你保留。':''}`),actionButton('收获',{type:'harvest',plot:selected.index}))
     else{const n=el('p');countdown(n,cropMatureAt(p,c),'距离成熟 ');target.append(n,el('p','farm-small','不用守在页面里，回来时按实际时间继续生长。'))}
    }
   }
   const diary=section('成长中的农场');diary.append(el('p','',`${s.plots.length} 块田地 · 已收获 ${s.totals.harvest} 份 · 发现 ${catalog.crops.filter(c=>s.discovery[c.id]).length}/${catalog.crops.length} 种物产`))
   const next=catalog.crops.filter(c=>!catalog.allUnlocked&&c.unlock>s.xp).sort((a,b)=>a.unlock-b.unlock)[0];diary.append(el('p','farm-small',next?`再积累 ${next.unlock-s.xp} 经验，解锁${next.name}。`:'全部作物均已解锁。继续收获，完成图鉴与成就。'))
   const expansion=catalog.expansions.find(x=>x.plots===s.plots.length);if(expansion){const e=expansion;diary.append(actionButton(`扩建 6 块地 · ${e.coins} 🍌 · ${e.xp}经验`,{type:'expand'},s.coins<e.coins||!catalog.allUnlocked&&s.xp<e.xp))}
   else diary.append(el('p','farm-small','24 块土地已全部开放。'))
  }else if(panel==='bag'){
   let quantity=farmQuantity(preferences.value.buyQuantity,s);const intro=section('选择种子'),purchases=[]
   const update=n=>{quantity=n;if(n!==null)preferences.set('buyQuantity',n);for(const {c,b,payload,unlocked} of purchases){payload.count=n;b.innerHTML=n===null?'请输入数量':`买 ${n} 份 · ${coin(c.seedPrice*n)}`;const disabled=n===null||!unlocked||s.coins<c.seedPrice*n||(s.seeds[c.id]??0)+n>10000;b.dataset.unavailable=String(disabled);b.disabled=disabled||session.view().status!=='ready';b.setAttribute('aria-label',n===null?'请输入数量':`买${c.name} ${n}份，${c.seedPrice*n}D币`)}}
   intro.append(el('p','farm-small','按持有数量排序，购买数量自动记住。'),quantityStepper(quantity,{label:'购买数量',onChange:update}),button('按全部田地数量',()=>{preferences.set('buyQuantity','plots');drawPanel()}))
   for(const c of sortFarmSeeds(catalog.crops,s.seeds)){const row=el('article','farm-shop-row'),text=el('div'),unlocked=catalog.allUnlocked||s.xp>=c.unlock,payload={type:'buy',crop:c.id,count:quantity},b=actionButton('',payload);text.append(el('h3','',c.name),c.collection?el('small','',c.collection):'',el('p','farm-small',unlocked?`种子 ${s.seeds[c.id]??0} · 生长 ${duration(c.seconds)}`:`${c.unlock} 经验解锁`));purchases.push({c,b,payload,unlocked});row.append(sprite(c.frame),text,b);details.append(row)}
   const saved=preferences.value.buyQuantity;update(quantity);if(saved==='plots')preferences.set('buyQuantity','plots')
  }else{
   const book=section('田园物种图鉴');book.append(el('p','farm-small',`已发现 ${catalog.crops.filter(c=>s.discovery[c.id]).length}/${catalog.crops.length} 种。收获作物后记录首次发现。`))
   const list=el('div','farm-book-grid');for(const c of catalog.crops){const found=s.discovery[c.id],item=el('article','farm-book-item'+(found?'':' is-locked'));item.append(sprite(c.frame),el('strong','',c.name),el('span','farm-small',found?`累计 ${found.count}${c.id==='oak'||c.id==='pine'?' 棵':' 份'}`:'尚未发现'));if(c.story)item.append(el('small','',c.story));if(found)item.append(el('small','',new Date(found.firstAt*1000).toLocaleDateString('zh-CN')));list.append(item)}book.append(list)
   const goals=section('成长成就');for(const a of catalog.achievements){const done=s.achievements.includes(a.id),progress=a.kind==='discovery'?[...catalog.crops.map(c=>c.id),'oak','pine'].filter(id=>s.discovery[id]).length:s.totals[a.kind],row=el('div','farm-achievement');row.append(el('strong','',(done?'✓ ':'')+a.name),el('span','farm-small',a.description),el('span','farm-small',`${Math.min(progress,a.target)}/${a.target} · ${done?'已获得':'奖励'} ${a.coins} 🍌`));goals.append(row)}
  }
 }

 return {draw:drawPanel}
}
