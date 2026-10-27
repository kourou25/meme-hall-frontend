import {el,button,coin,duration} from '/farm-ui.js?v=97fd912d'
import {fishingFrame,FISHING_GAME} from '/farm-fishing-game.js?v=97fd912d'
import {fishSprite} from '/farm-fish-art.js?v=97fd912d'

export async function createFarmLeisure(parent,{session,now,onClose}){
 if(!document.querySelector('link[data-farm-leisure]')){const css=el('link');css.rel='stylesheet';css.href='/farm-leisure.css?v=97fd912d';css.dataset.farmLeisure='1';document.head.append(css)}
 let world=null,disposed=false,held=false,fight=null,finishing=false,lastState=null,signature='',useBait=false,useLine=false,rods=1,tick=0
 const host=el('section','farm-leisure'),header=el('header','fl-header'),back=button('← 返回农场',onClose),balance=el('div','fl-balance')
 header.append(back,el('strong','','溪湾垂钓'),balance)
 const layout=el('div','fl-layout'),stage=el('div','fl-stage'),hint=el('div','fl-scene-hint'),canvasHost=el('div','fl-canvas'),panel=el('section','fl-control'),title=el('h2'),copy=el('p'),meter=el('progress'),status=el('p','fl-status'),extra=el('div','fl-extra'),stock=el('section','fl-stock')
 const tensionLabel=el('div','fl-tension-label'),tension=el('progress'),tensionBox=el('div','fl-tension'),actions=el('div','fl-actions')
 tension.max=100;tension.setAttribute('aria-label','鱼线张力');tensionBox.append(tensionLabel,tension)
 stage.append(canvasHost,hint);meter.max=100;meter.setAttribute('aria-label','收服进度');panel.append(title,copy,meter,tensionBox,actions,extra,status);layout.append(stage,panel);host.append(header,layout,stock);parent.append(host)
 status.setAttribute('role','status');status.setAttribute('aria-live','polite')
 const current=()=>{const d=session.view().data;return {s:d.state,c:d.catalog,t:now()}},ready=()=>session.view().status==='ready'
 const phase=()=>{const {s,t}=current(),f=s.fishing;if(f.idle)return'idle';if(!f.cast)return'rest';if(t>f.cast.expires)return'miss';if(f.cast.reelAt)return'reel';return t>=f.cast.biteAt?'bite':'waiting'}
 async function act(a){if(disposed||!ready())return false;if(!session.enqueue(a))return false;await session.flush();if(disposed)return false;status.textContent=session.view().error||session.view().data.state.fishing.lastOutcome?.label||'进度已保存';refresh();return !session.view().error&&ready()}
 async function cast(point){if(!ready()||!['rest','miss'].includes(phase()))return;fight=null;held=false;await act({type:'fish_cast',point,bait:useBait,line:useLine,rods})}
 async function hook(){
  if(!ready()||phase()!=='bite')return
  held=true;const cast=current().s.fishing.cast
  if(await act({type:'fish_reel',...(cast.v===3?{castId:cast.id}:{})})){
   const next=current().s.fishing.cast
   if(next?.v===3){fight={id:next.id,at:performance.now(),moves:[[0,1]],config:next};if(!held)fight.moves.push([80,0]);refresh()}
  }
 }
 function control(value){
  held=value;if(!fight)return
  const ms=Math.min(FISHING_GAME.maxDuration,Math.max(0,Math.floor(performance.now()-fight.at))),last=fight.moves.at(-1)
  if(last[1]===Number(value)||ms-last[0]<FISHING_GAME.minMoveGap||fight.moves.length>=FISHING_GAME.maxMoves)return
  fight.moves.push([ms,Number(value)])
 }
 function play(){if(!fight)return null;return fishingFrame(fight.config,fight.moves,Math.min(FISHING_GAME.maxDuration,Math.floor(performance.now()-fight.at)))}
 async function finish(){
  if(finishing||!ready()||!fight||fight.submitted)return
  finishing=true;fight.submitted=true;const active=fight,ms=Math.min(FISHING_GAME.maxDuration,Math.floor(performance.now()-active.at))
  const ok=await act({type:'fish_catch',castId:active.id,moves:active.moves.map(x=>[...x]),duration:ms})
  if(ok){fight=null;held=false}
  finishing=false;signature='';refresh()
 }
 const cancel=async()=>{const f=current().s.fishing;if(!f.cast?.id)return;held=false;if(await act({type:'fish_abandon',castId:f.cast.id}))fight=null}
 function rebuild(s,c,t){
  extra.replaceChildren();actions.replaceChildren();stock.replaceChildren()
  const f=s.fishing,gear=f.gear?.rod??0,busy=!!f.idle||!!f.cast&&t<=f.cast.expires
  const gearInfo=el('section','fl-tackle');gearInfo.append(el('h3','',c.fishingRods?.[gear]?.name||'旧竹竿'))
  if(!busy){
   const count=el('div','fl-rod-count');count.setAttribute('aria-label','同时抛竿数量');for(const n of [1,3,5]){const b=button(n+'杆 · '+n*2+' D币',()=>{rods=n;signature='';refresh()});b.setAttribute('aria-pressed',String(rods===n));b.disabled=!ready()||s.coins<n*2;count.append(b)}gearInfo.append(count,el('small','','联动收放线，每杆单独消耗鱼饵/鱼线，独立抽取收获和脱钩结果。'))
   for(const [key,label,id] of [['bait','溪虫饵','river_bait'],['line','韧丝线','strong_line']]){const row=el('label','fl-tackle-option'),input=el('input');input.type='checkbox';input.checked=key==='bait'?useBait:useLine;input.disabled=!ready()||!(f.items?.[id]>=rods);input.onchange=()=>{if(key==='bait')useBait=input.checked;else useLine=input.checked};row.append(input,el('span','',`${label} ×${f.items?.[id]??0}`));gearInfo.append(row)}
   const next=c.fishingRods?.[gear+1];if(next){const b=button('',()=>void act({type:'fish_rod_upgrade'}));b.innerHTML=`升级${next.name} · ${coin(next.cost)}`;b.disabled=!ready()||s.coins<next.cost;gearInfo.append(b)}
  }else gearInfo.append(el('small','',f.cast?.line?'本竿已用韧丝线':'本竿普通鱼线'))
  extra.append(gearInfo)
  if(f.cast?.id){const b=button('收起鱼竿',()=>void cancel());b.disabled=!ready();actions.append(b)}
  if(fight?.submitted&&f.cast?.id===fight.id){const b=button('重试本次入篓',()=>{fight.submitted=false;void finish()});b.disabled=!ready()||finishing;actions.append(b)}
  if(!busy){
   const idle=el('details','fl-idle'),summary=el('summary','','离线垂钓');idle.append(summary,el('p','fl-small','每10分钟1条鱼，预付鱼饵；离线继续。提前收取不退未用鱼饵。'))
   const row=el('div','fl-idle-options');for(const hours of c.leisure.idleHours){const cost=hours*3600/c.leisure.idleInterval*c.leisure.castCost,b=button('',()=>void act({type:'fish_idle',hours}));b.innerHTML=`${hours}小时 · ${coin(cost)}`;b.disabled=!ready()||s.coins<cost;row.append(b)}idle.append(row);extra.append(idle)
  }else if(f.idle){const n=Math.min(f.idle.count,Math.floor((t-f.idle.started)/c.leisure.idleInterval)),b=button(`收取并结束 · ${n} 条`,()=>void act({type:'fish_idle_claim'}));b.disabled=!ready()||n<1;actions.append(b)}
  if(f.lastOutcomes?.length>1&&!busy){const results=el('section','fl-catch-results');results.append(el('h3','','这一组的收获'));f.lastOutcomes.forEach((x,i)=>{const row=el('p',x.ok?'is-caught':'is-escaped');row.append(el('span','',`${i+1}号竿`),el('strong','',x.label));results.append(row)});extra.append(results)}
  const rules=el('details','fl-loot-rules');rules.append(el('summary','','鱼饵与掉落'),el('p','fl-small','普通饵：鱼70%、作物9%、种子7%、D币5%、道具8%、称号秘藏1%。溪虫饵将10%的鱼替换为道具。成功遛鱼后仍有8%基础脱钩概率；使用韧丝线降至2%。'))
  extra.append(rules)
  const tools=el('section','fl-toolbag');tools.append(el('h3','','随身道具'))
  for(const item of c.fishingItems??[]){const n=f.items?.[item.id]??0;if(!n)continue;const row=el('div','fl-tool-row');row.append(el('strong','',`${item.name} ×${n}`),el('small','',item.description))
   if(item.id==='reed'){const b=button('编成韧丝线',()=>void act({type:'fish_craft_line'}));b.disabled=!ready()||n<3;row.append(b)}
   if(['ward_charm','feed_bundle'].includes(item.id)){const b=button('使用',()=>void act({type:'farm_item',item:item.id}));b.disabled=!ready();row.append(b)}tools.append(row)
  }
  if(!Object.values(f.items??{}).some(n=>n>0))tools.append(el('p','fl-small','钓获的道具会收进这里，堆肥可返回农田使用。'))
  stock.append(tools,el('h3','',`水生图鉴 · ${Object.keys(f.discovery).length} / ${c.fish.length}`))
  if(s.market)stock.append(el('p','farm-small','新鱼获进入集市批次仓库；下方仅出售开通前的库存。'))
  const grid=el('div','fl-fish-grid');for(const spec of c.fish){const n=(s.market?s.market.legacy['fish:'+spec.id]:f.basket[spec.id])??0,seen=!!f.discovery[spec.id],row=el('article','fl-fish-item'),text=el('div'),art=fishSprite(spec.frame);if(!seen)art.classList.add('is-undiscovered');text.append(el('strong','',seen?spec.name:'尚未发现'),el('small','',seen?`鱼篓 ${n} · 累计 ${f.discovery[spec.id]}`:'等待一次相遇'));row.append(art,text);if(n){const sell=button('',()=>void act({type:'fish_sell',fish:spec.id,count:Math.min(n,99)}));sell.innerHTML=`出售 ${Math.min(n,99)} · ${coin(spec.price*Math.min(n,99))}`;sell.disabled=!ready();row.append(sell)}grid.append(row)}stock.append(grid)
 }
 function refresh(){
  if(disposed)return;if(fight&&!fight.submitted)control(held);const {s,c,t}=current(),f=s.fishing,stage=phase(),progress=play()
  if(useBait&&!(f.items?.river_bait>=rods)&&!f.cast)useBait=false;if(useLine&&!(f.items?.strong_line>=rods)&&!f.cast)useLine=false
  const key=stage+'|'+session.view().status+'|'+(f.idle?Math.floor((t-f.idle.started)/600):'');if(signature!==key||lastState!==s){signature=key;lastState=s;rebuild(s,c,t)}
  const money=coin(s.coins);if(balance.innerHTML!==money)balance.innerHTML=money
  title.textContent={rest:'抛竿去',miss:'再试一竿',waiting:'浮漂轻晃',bite:'提竿！',reel:'收线与放线',idle:'鱼竿托管中'}[stage]
  hint.textContent=stage==='bite'?'浮漂沉了 · 按住水面提竿':stage==='reel'?'按住收线 · 松开放线':stage==='idle'?'离线也会继续':'拖向水面选落点 · 松手抛竿'
  copy.textContent=stage==='waiting'?'静候咬钩；浮漂沉下后有12秒提竿时间。':stage==='bite'?`还有 ${Math.max(0,f.cast.expires-t)} 秒，按住水面或空格提竿。`:stage==='reel'?(fight?'张力接近红区就松手，回落后继续收线。':'这一竿已中断，收起鱼竿后可以重新开始。'):stage==='idle'?`剩余 ${duration(f.idle.ends-t)}，随时可收取并结束。`:`本次${rods}杆，共${rods*2}枚D币鱼饵。拖向水面选落点，松手一起抛竿；收放线操作共同控制这组鱼竿。`
  meter.hidden=stage!=='reel';tensionBox.hidden=!progress;meter.value=progress?.progress??0
  if(progress){tension.value=progress.tension;tension.dataset.danger=String(progress.tension>78||progress.tension<9);tensionLabel.textContent=progress.tension>78?'鱼线快绷紧 · 松手':progress.tension<9?'鱼线太松 · 收线':progress.force>.75?'鱼儿正在猛冲':'张力适中';if(progress.status!=='playing'&&!finishing)void finish()}
  if(fight&&(!f.cast||f.cast.id!==fight.id)){fight=null;held=false}
  if(!f.cast&&f.lastOutcome&&t-f.lastOutcome.at<30){hint.textContent=f.lastOutcome.label;hint.dataset.result=f.lastOutcome.ok?'caught':'escaped'}else delete hint.dataset.result
  world?.state({state:s,catalog:c,now:t,held});if(!ready())status.textContent=session.view().error||'正在同步…'
  clearTimeout(tick);tick=0;if(!document.hidden)tick=setTimeout(refresh,fight&&!fight.submitted?100:1000)
 }
 const visibility=()=>{clearTimeout(tick);tick=0;if(document.hidden)control(false);else refresh()};document.addEventListener('visibilitychange',visibility)
 refresh()
 try{const {createLeisureWorld}=await import('/farm-pond-pixel.js?v=97fd912d');if(!disposed){world=createLeisureWorld(canvasHost,{onCast:cast,onHook:hook,onControl:control,getPlay:play});refresh()}}catch{canvasHost.append(el('p','fl-fallback','场景暂不可用，请刷新页面重试；存档与道具已保留。'))}
 return {refresh,destroy(){if(disposed)return;disposed=true;control(false);clearTimeout(tick);document.removeEventListener('visibilitychange',visibility);world?.destroy();world=null;host.remove()}}
}
