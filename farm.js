import {farmSceneState,farmBatchLimit,plotLabel,plotLocked,plotWork,leaseCanPlant,plotTargetValid} from './farm-plot-view.js?v=98ddcc7d'
import {cropMatureAt,cropHasPests} from './farm-crop-care.js?v=98ddcc7d'
import {createFarmSession} from '/farm-client.js?v=98ddcc7d'
import {createFarmWorld} from '/farm-world.js?v=98ddcc7d'
import {planFarmBatch,planRanchBatch,ranchFeedCost} from '/farm-management.js?v=98ddcc7d'
import {farmBrushAction} from '/farm-brush.js?v=98ddcc7d'
import {createFarmSocial} from '/farm-social.js?v=98ddcc7d'
import {createFarmWallet} from '/farm-wallet.js?v=98ddcc7d'
import {createFarmLeases} from '/farm-leases.js?v=98ddcc7d'
import {ranchAnimalStatus} from '/farm-ranch.js?v=98ddcc7d'
import {pigStatus,drawPigPanel} from '/farm-pigs.js?v=98ddcc7d'
import {drawGuardianPanel} from '/farm-guardian.js?v=98ddcc7d'
import {createFarmPanel} from '/farm-panels.js?v=98ddcc7d'
import {createFarmPreferences,sortFarmSeeds,farmQuantity} from '/farm-preferences.js?v=98ddcc7d'
import {el,button,iconButton,icon,coin,sprite,escape,duration} from '/farm-ui.js?v=98ddcc7d'

async function request(path,body,{keepalive=false}={}){
 const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,keepalive,signal:AbortSignal.timeout(15000)})
 let data;try{data=await response.json()}catch{data={error:'服务器响应暂时无法读取'}}
 return {ok:response.ok,status:response.status,data}
}
export function mountFarm(root,{userId,onLeave,characters=[]}){
 const preferences=createFarmPreferences({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},userId),prefs=preferences.value
 let statsMarkup='',leisure=null,leisureTask=null,market=null,conflict=null
 let world=null,social=null,wallet=null,leases=null,worldLoading=false,worldTask=null,visiting=false,disposed=false,selected={kind:'plot',index:0},seed='carrot',place='home',panel='journal',notice='',lastData=null,dialogReturn=null
 const shell=el('section','farm-page'),heading=el('header','farm-heading'),name=el('div'),stats=el('div','farm-stats')
 name.append(el('h1','','欢欢农场'));heading.append(name,stats)
 const savebar=el('div','farm-savebar'),saveText=el('span'),retry=button('重试确认',()=>void session.retry());savebar.append(saveText,retry)
 const gameShell=el('div','farm-game-shell'),nav=el('nav','farm-world-nav');nav.setAttribute('aria-label','农场场景')
 for(const [id,label,i] of [['home','农田','seed'],['ranch','牧场','ranch']]){
  const b=iconButton(i,label,()=>world?.travel(id));b.dataset.place=id;nav.append(b)
 }
 const friends=iconButton('friends','农友',async()=>{
  await session.flush();if(session.view().status!=='ready')return message('请先确认云存档，再进入互访')
  social??=createFarmSocial(shell,{request,catalog:session.view().data.catalog,userId,onChanged:()=>session.load(),canAct:()=>session.view().status==='ready',onOpen:async()=>{visiting=true;world?.destroy();world=null;await worldTask},onClose:()=>{visiting=false;if(!disposed)draw(session.view())}})
  await social.open()
 },'farm-friends');nav.append(friends)
 const leaseButton=button('租约',async()=>{await session.flush();if(locked())return message('请先确认云存档');leases??=createFarmLeases(shell,{request,userId,getFarm:()=>session.view().data,onChanged:()=>session.load()});await leases.open()});nav.append(leaseButton)
 async function openMarket(){await session.flush();if(locked())return message('请先确认云存档');if(!market){const {createFarmMarket}=await import('/farm-market.js?v=98ddcc7d');if(disposed)return;market=createFarmMarket(shell,{request,userId,onChanged:()=>session.load()})}market.open()}
 nav.append(button('集市',()=>void openMarket()))
 async function openConflict(){await session.flush();if(locked())return message('请先确认云存档');if(!conflict){const {createFarmConflict}=await import('/farm-conflict.js?v=98ddcc7d');if(disposed)return;conflict=createFarmConflict(shell,{request,userId,onChanged:()=>session.load()})}conflict.open()}
 nav.append(button('货仓攻防',()=>void openConflict()))
 const leisureButton=button('池塘',async()=>{
  if(leisureTask||visiting)return
  await session.flush();if(locked())return message('请先确认云存档')
  visiting=true;world?.destroy();world=null;gameShell.hidden=true;footer.hidden=true
  const closeLeisure=()=>{leisure?.destroy();leisure=null;visiting=false;gameShell.hidden=false;footer.hidden=false;if(!disposed)draw(session.view())}
  leisureTask=(async()=>{try{await worldTask;if(disposed)return;const {createFarmLeisure}=await import('/farm-leisure.js?v=98ddcc7d');if(disposed)return;const instance=await createFarmLeisure(shell,{session,now:time,onClose:closeLeisure});if(disposed||!visiting)instance.destroy();else leisure=instance}catch{closeLeisure();message('池塘暂时无法打开，请重试')}finally{leisureTask=null}})();await leisureTask
 });nav.append(leisureButton)
 let brushTool='smart'
 if(new URLSearchParams(location.search).get('farm3d')!=='0'){
  const tools=el('select');tools.setAttribute('aria-label','左键划过照料工具')
  for(const [value,label] of [['smart','✋ 点按照料'],['harvest','🧺 收获'],['water','💧 浇水'],['pest','驱虫'],['plant','🌱 播种'],['till','🪏 开垦'],['feed','🌾 添粮'],['clean','清洁']])tools.add(new Option(label,value))
  tools.onchange=()=>{brushTool=tools.value;message(world?.renderer==='pixel'?'按住左键划过目标，松手统一确认；右键拖动画面。':'按住左键划过目标，松手统一确认；右键拖动旋转，Shift＋右键平移。')}
  nav.insertBefore(tools,friends)
 }
 const board=el('div','farm-board'),field=el('section','farm-field'),sceneHead=el('div','farm-scene-head'),sceneTitle=el('strong'),sceneSummary=el('span')
 sceneHead.append(sceneTitle,sceneSummary)
 const map=el('div','farm-map'),mapState=el('div','farm-map-state','正在读取你的农场…'),mapFrame=el('div','farm-map-frame');mapFrame.append(map,mapState)
 const sceneFooter=el('div','farm-scene-footer'),sceneTip=el('span'),quickActions=el('div','farm-quick-actions'),batchToggle=button('照料设置',()=>{setBatchOpen(batchMenu.hidden);if(!batchMenu.hidden)drawBatch()})
 batchToggle.setAttribute('aria-expanded','false')
 const batchMenu=el('div','farm-batch-menu');batchMenu.hidden=true;batchMenu.setAttribute('aria-label','批量操作')
 sceneFooter.append(sceneTip,batchToggle);field.append(sceneHead,mapFrame,sceneFooter,quickActions,batchMenu)
 const guide=el('aside','farm-guide'),context=el('section','farm-context'),progress=el('section','farm-progress-goal'),expand=button('',()=>openPanel('expand'),'farm-expand-link')
 guide.append(context,progress,expand);board.append(field,guide)
 const bench=el('div','farm-workbench'),seedBench=el('section','farm-seed-bench'),storage=el('section','farm-storage')
 bench.append(seedBench,storage);gameShell.append(nav,board,bench)
 const feedback=el('p','farm-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite')
 const footer=el('footer','farm-underbar'),footerActions=el('div')
 footerActions.append(button('道具商店',()=>openPanel('items')),iconButton('book','图鉴与成就',()=>openPanel('book')),iconButton('bag','账本',async()=>{
   await session.flush();if(session.view().status!=='ready')return message('请先确认云存档，再查看账本')
   wallet??=createFarmWallet(shell,{request});wallet.open()
  }))
 footerActions.prepend(button('守护兽',()=>openPanel('guardian')))
 footer.append(el('span','','浇水后自动生长，离线也会继续。'),footerActions)
 const dialog=el('dialog','farm-aside'),dialogHead=el('header'),dialogTitle=el('h2'),close=button('×',()=>dialog.close(),'farm-panel-close'),details=el('div','farm-details')
 close.setAttribute('aria-label','关闭农场面板');dialogTitle.id='farm-panel-title';dialog.setAttribute('aria-labelledby',dialogTitle.id)
 dialogHead.append(dialogTitle,close);dialog.append(dialogHead,details);dialog.addEventListener('close',()=>{if(dialogReturn?.isConnected)dialogReturn.focus({preventScroll:true})})
 shell.append(heading,savebar,gameShell,feedback,footer,dialog);root.replaceChildren(shell)
 const session=createFarmSession({
  userId,storage:{getItem:k=>sessionStorage.getItem(k),setItem:(k,v)=>sessionStorage.setItem(k,v),removeItem:k=>sessionStorage.removeItem(k)},request,
  onChange:draw,onNotice:message,
  onCommit:(actions,d)=>{const old=lastData;world?.updateState(sceneState(d));world?.feedback(actions.flatMap(a=>{if(!a.leaseId)return [a];const i=(d.rentedPlots??[]).findIndex(l=>l.id===a.leaseId);return i<0?[]:[{...a,plot:d.state.plots.length+i}]}));collectFlight(actions,old);if(actions.some(a=>['animal_remove','animal_sell','pig_remove','pig_sell'].includes(a.type)))selected=null}
 })
 const panels=createFarmPanel({details,session,preferences,getSelection:()=>({panel,selected,seed}),time,actionButton,chooseSeed:()=>{dialog.close();seedBench.scrollIntoView({block:'nearest'})}})
 let sceneData=null,sceneSave=null
 function sceneState(data=session.view().data){if(sceneData!==data){sceneData=data;sceneSave=farmSceneState(data)}return sceneSave}
 function cropBatch(type){const d=session.view().data;return planFarmBatch(sceneState(),d.catalog,type.replace(/^lease_/,''),seed,time(),prefs).slice(0,farmBatchLimit(d))}
 function time(){const d=session.view().data;return d?d.server_time+Math.max(0,Math.floor((Date.now()-d.receivedAt)/1000)):Math.floor(Date.now()/1000)}
 function message(text){notice=text;feedback.textContent=text;feedback.dataset.error=String(['uncertain','error'].includes(session.view().status))}
 function locked(){return session.view().status!=='ready'}
 function keepFocus(fn){
  const active=document.activeElement,key=active?.dataset.farmFocus;fn()
  if(key&&!active.isConnected)shell.querySelector(`[data-farm-focus="${CSS.escape(key)}"]`)?.focus({preventScroll:true})
 }
 function actionButton(text,a,unavailable=false){
  if(prefs.batch&&(a.plot!==undefined||a.leaseId)&&!['uproot','boost','farm_item'].includes(a.type))text+=' · 全部适用田地'
  if(prefs.ranchBatch&&a.type==='animal_collect')text+=' · 全部可收取动物'
  const b=button('',()=>action(a),'farm-primary');b.innerHTML=escape(text).replace(/([+-]?\d+) 🍌/g,(_,n)=>coin(n))
  b.setAttribute('aria-label',text.replaceAll('🍌','D币'));b.dataset.farmAction='true';b.dataset.farmFocus=JSON.stringify(a);b.dataset.unavailable=String(unavailable);b.disabled=unavailable||locked();return b
 }
 function action(a){
  if(locked())return message('请先等待本次保存完成，或确认上次操作结果')
  const {state,catalog}=session.view().data,batch=prefs.batch&&(a.plot!==undefined||a.leaseId)&&!['uproot','boost','farm_item'].includes(a.type)?cropBatch(a.type):prefs.ranchBatch&&a.type==='animal_collect'?planRanchBatch(state,catalog,a.type,time()):null
  if(batch?session.enqueueBatch(batch):session.enqueue(a))message(batch?`正在保存 ${batch.length} 个目标的操作…`:'正在保存本次操作…')
  else message(session.view().error||'这项操作尚未提交，请稍后重试')
 }
 function setPlace(p){
  place=p;selected=p==='ranch'?null:{kind:'plot',index:0};setBatchOpen(false)
  drawMain();message({home:'点地即可开垦、播种、浇水或收获。',ranch:'点击动物收取畜产；添粮后离线也会生产。'}[p])
 }
 function plotAction(index){
  const {catalog}=session.view().data,s=sceneState(),p=s.plots[index],c=catalog.crops.find(c=>c.id===p?.crop)
  if(!p||plotLocked(p,time()))return null
  const work=(type,extra)=>plotWork(p,index,type,extra)
  if(!p.tilled)return work('till')
  if(!p.crop)return leaseCanPlant(p,catalog.crops.find(c=>c.id===seed),time())?work('plant',{crop:seed,...prefs.autoBuy?{autoBuy:true}:{}}):null
  if(p.wateredAt===null)return work('water')
  if(cropHasPests(p,c,time()))return work('pest')
  if(time()>=cropMatureAt(p,c))return work('harvest')
  return null
 }
 function onTarget(target){
  if(target.kind==='guardian'){openPanel('guardian');return}
  if(target.kind==='character'){message((characters.find(c=>c.id===target.index)?.name||'牧场伙伴')+'回应了你的招呼。');return}
  if(target.kind==='plot'&&!plotTargetValid(sceneState(),target))return message('租约已变化，请重新选择田地')
  selected=target;keepFocus(drawContext)
  if(locked())return message('当前保存尚未确认，请使用上方的重试按钮或等待完成')
  const {state:s,catalog}=session.view().data
  if(brushTool==='clean'||brushTool==='pest'||brushTool==='feed'){
   const a=farmBrushAction(sceneState(),catalog,target,brushTool,seed,time(),prefs)
   if(a)action(a);else message('这里暂无符合当前工具的目标，或饲料不足。')
   return
  }
  if(target.kind==='plot'){
   const a=plotAction(target.index)
   if(['plant','lease_plant'].includes(a?.type)&&!s.seeds[seed]&&!prefs.autoBuy){message('当前种子已经用完，购买后再播种。');openPanel('bag');return}
   if(a)action(a)
  }else if(target.kind==='animal'){
   const a=s.ranch.animals[target.index],c=catalog.animals.find(c=>c.id===a.kind)
   if(ranchAnimalStatus(a,c,time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds).stored>0)action({type:'animal_collect',animal:target.index})
   else if(ranchAnimalStatus(a,c,time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds).manure>0)action({type:'animal_clean',animal:target.index})
   else openPanel('ranch',true)
  }else if(target.kind==='pig')openPanel('pigs',true)
 }
 function onBrush(targets){
  if(locked())return message('请先确认上一批操作结果')
  const {state:s,catalog}=session.view().data,projected=structuredClone(sceneState()),actions=[]
  for(const a of projected.ranch.animals){const spec=catalog.animals.find(c=>c.id===a.kind),v=ranchAnimalStatus(a,spec,time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds);a.stored=v.stored;a.manure=v.manure;a.producedAt=time()}
  for(const target of targets){
   const a=farmBrushAction(projected,catalog,target,brushTool,seed,time(),prefs);if(!a)continue
   actions.push(a);if(['plant','lease_plant'].includes(a.type)){if(projected.seeds[seed]>0)projected.seeds[seed]--;else projected.coins-=catalog.crops.find(c=>c.id===seed).seedPrice}if(a.type==='animal_feed')projected.ranch.feed--;if(a.type==='pig_feed_stock')projected.ranch.feed-=catalog.leisure.pigFeedUnits??2
   if(actions.length===farmBatchLimit(session.view().data))break
  }
  if(!actions.length)return message('划过区域没有符合当前工具的目标；播种需先选种子。')
  if(session.enqueueBatch(actions))message(`正在确认 ${actions.length} 个目标的照料结果…`)
 }
 function draw(snapshot){
  if(disposed)return
  const {data,status,error}=snapshot
  leisure?.refresh()
  saveText.textContent=error||({loading:'正在读取云存档…',ready:'云存档已同步',queued:'操作待提交…',saving:'正在保存…',uncertain:'保存结果待确认',error:'暂时无法加载'})[status]
  savebar.dataset.state=error?'error':status;retry.hidden=!['uncertain','error'].includes(status);retry.textContent=data?'重试确认':'重新加载'
  for(const b of nav.querySelectorAll('button'))b.disabled=!data||!!b.dataset.place&&(!world||worldLoading)
  if(!data){mapState.textContent=error?'进度未加载，请使用上方重试按钮。':'正在读取你的农场…';return}
  const changed=lastData!==data
  keepFocus(()=>{drawMain();if(dialog.open&&changed)drawPanel();for(const b of details.querySelectorAll('[data-farm-action]'))b.disabled=locked()||b.dataset.unavailable==='true'})
  lastData=data;world?.updateState(sceneState(data))
  if(error)message(error)
  if(!world&&!worldLoading&&!visiting){
   worldLoading=true;mapState.hidden=false;mapState.textContent='正在准备田地…'
   worldTask=createFarmWorld(map,{state:sceneState(data),catalog:data.catalog,now:time,onTarget,onBrush,characters,onMessage:message,onPlace:setPlace,onSelection:target=>{if(target?.kind==='character')return;selected=target;keepFocus(drawContext)}})
    .then(w=>{if(disposed||visiting){w?.destroy();return}world=w;shell.classList.toggle('is-pixel',w?.renderer==='pixel');if(w){mapState.hidden=true;w.updateState(sceneState());w.travel(place)}for(const b of nav.querySelectorAll('[data-place]'))b.disabled=!w;const tools=nav.querySelector('select');if(tools)tools.hidden=!['voxel','pixel'].includes(w?.renderer);drawMain()})
    .catch(()=>{world?.destroy();world=null;if(!disposed&&!visiting)mapState.replaceChildren(el('p','','地图暂时加载失败，云存档仍然保留。'),button('重新加载地图',()=>draw(session.view())))})
    .finally(()=>{worldLoading=false;worldTask=null})
  }
 }
 function drawMain(){
  if(!session.view().data)return
  drawStats();drawContext();drawProgress();drawBench();drawStorage();drawBatch()
  for(const b of nav.querySelectorAll('[data-place]'))b.setAttribute('aria-pressed',String(b.dataset.place===place))
  const {state:s,catalog}=session.view().data
  sceneTitle.textContent={home:'我的农田',ranch:'我的牧场'}[place]
  sceneSummary.textContent=place==='home'?`${s.plots.length} 块自有${session.view().data.rentedPlots?.length?` · 租入 ${session.view().data.rentedPlots.length} 块`:""}${s.plots.some(p=>(p.leaseUntil??0)>time())?` · 出租 ${s.plots.filter(p=>(p.leaseUntil??0)>time()).length} 块`:""}`:catalog.previewSpecies?`${s.ranch.animals.length} 种外观预览`:`${s.ranch.animals.length} / ${s.ranch.slots??catalog.ranch.slots} 产物动物 · ${s.pigs?.animals.length??0} / ${catalog.leisure?.pigSlots??6} 育肥动物`
  sceneTip.textContent=world?.renderer==='pixel'?(matchMedia('(pointer:coarse)').matches?'点按照料 · 镜头按钮缩放':'左键划过照料 · 右键平移 · 镜头按钮缩放'):world?.renderer==='voxel'?(matchMedia('(pointer:coarse)').matches?'点按照料 · 单指旋转 · 双指缩放':'左键划过照料 · 右键旋转 · Shift＋右键平移 · 滚轮缩放'):{home:'点田地照料 · 收成进入仓库',ranch:'点动物收取 · 空闲时记得添粮'}[place]
  expand.hidden=false
 }
 function drawStats(){
  const s=session.view().data.state,markup=`<div title="D币余额">${coin(s.coins)}</div><div title="经验" aria-label="经验 ${s.xp}">${icon('star')}<strong>${s.xp}</strong></div>`;if(statsMarkup!==markup){statsMarkup=markup;stats.innerHTML=markup}
 }
 function drawContext(){
  const {state:s,catalog}=session.view().data;context.replaceChildren()
  let kicker='',title='',copy='',primary=null
  if(place==='home'){
   const scene=sceneState();if(selected?.leaseId){const index=scene.plots.findIndex(p=>p.leaseId===selected.leaseId);selected=index<0?null:{...selected,index}}
   const i=selected?.kind==='plot'&&scene.plots[selected.index]?selected.index:0,p=scene.plots[i],c=catalog.crops.find(c=>c.id===p.crop),a=plotAction(i),type=a?.type.replace(/^lease_/,'')
   kicker=plotLabel(p,i);title=!p.tilled?'开垦第一步':!p.crop?'播下新的种子':p.wateredAt===null?'浇水，开始生长':type==='pest'?'叶片有小虫':a?'收成已经成熟':'正在生长'
   if(plotLocked(p,time())){title=p.leaseId?'租约已到期':c?`租客种植 · ${c.name}`:'已出租 · 等待租客播种';copy=p.leaseId?'本地块已停止照料，到期收成按原租约规则结算。':`租客：${p.leaseTenant??'农友'} · 还有 ${duration(p.leaseUntil-time())}归还。`+(c?(cropMatureAt(p,c)<=time()?' 作物已成熟，等待租客收获。':` ${duration(cropMatureAt(p,c)-time())}后成熟。`):'')+' 出租期间由租客照料，收成归租客。';primary=button('查看租约',()=>leaseButton.click())}
   else if(type==='till'){copy='把空地变成可以播种的田地。';primary=actionButton('开垦这块地',a)}
   else if(type==='plant'){const seedSpec=catalog.crops.find(c=>c.id===seed);copy=`${seedSpec.name}种子 ×${s.seeds[seed]??0} · ${p.leaseId?'播种自动浇水，':'浇水后 '}${duration(seedSpec.seconds)}成熟。`+(prefs.autoBuy?'缺少时按商店价格补买。':'');primary=s.seeds[seed]||prefs.autoBuy?actionButton('播种'+seedSpec.name,a):button('去买种子',()=>openPanel('bag'),'farm-primary')}
   else if(type==='water'){copy=`${c.name}只需浇水一次，之后自动生长。`;primary=actionButton('浇水',a)}
   else if(type==='pest'){copy=`${c.name}生长略受影响。免费驱虫恢复原进度；不处理也会成熟，最多多等原时长的10%，收成不减少。`;primary=actionButton('驱虫',a)}
   else if(type==='harvest'){copy=`收获${c.name} ×${2-(p.stolen??0)}，进入仓库后可自行出售。`;primary=actionButton('收获入仓',a)}
   else if(!c){title='请选择更快成熟的种子';copy='剩余租期不足以覆盖当前种子的成熟及虫害缓冲时间。';primary=button('选择种子',()=>seedBench.scrollIntoView({block:'nearest'}))}
   else{copy=`${c.name}还有 ${duration(cropMatureAt(p,c)-time())}成熟。可以照料其他田地，离开页面也会继续生长。`;primary=button('看看收成仓库',()=>openPanel('warehouse'))}
   if(p.leaseId&&p.leaseEnds>time())copy+=` 租期剩余 ${duration(p.leaseEnds-time())}。`
  }else if(selected?.kind==='pig'&&s.pigs?.animals.some(p=>p.id===selected.index)){
   const p=s.pigs.animals.find(p=>p.id===selected.index),spec=catalog.pigs.find(c=>c.id===p.kind),v=pigStatus(p,spec,time());kicker='牧场 · 育肥动物';title=spec.name;copy=v.dead?'连续缺粮已满48小时，请清理栏位。':v.adult?'已成年，可出售获得收益。':`成长 ${Math.floor(v.growth/spec.seconds*100)}% · 还需喂养 ${duration(spec.seconds-v.growth)}`;primary=button('照料与详情',()=>openPanel('pigs',true),'farm-primary')
  }else{
   const i=selected?.kind==='animal'?selected.index:-1,a=s.ranch.animals[i]
   kicker='牧场照料'
   if(a){
    const c=catalog.animals.find(c=>c.id===a.kind),r=ranchAnimalStatus(a,c,time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds)
    title=c.name;copy=r.dead?'已连续缺粮 48 小时。已有畜产仍可收取，收完后清理栏位。':r.hungry?`缺粮停产，距离死亡还有 ${duration(r.deathAt-time())}。`:r.full?'暂存已满；收取后继续生产，饲料时间仍在消耗。':`饲料还能支持 ${duration(a.fedUntil-time())}，现有${c.product} ×${r.stored}。`
    primary=r.stored?actionButton('收取'+c.product,{type:'animal_collect',animal:i}):button(r.dead?'清理与详情':'添粮与详情',()=>openPanel('ranch',true),'farm-primary')
   }else{title=s.ranch.animals.length?'照料你的动物':'领养第一只动物';copy='添粮后自动生产，离线也会继续。缺粮停产，持续 48 小时会死亡。';primary=button('前往动物小铺',()=>openPanel('ranch'),'farm-primary')}
  }
  const actions=el('div','farm-context-actions');actions.append(primary)
  if(place==='home'&&selected?.kind==='plot'&&s.plots[selected.index]?.crop&&!plotLocked(s.plots[selected.index],time()))actions.append(button('铲除这株作物',()=>openPanel('uproot'),'farm-subtle'))
  context.append(el('span','farm-context-kicker',kicker),el('h2','',title),el('p','',copy),actions)
 }
 function drawProgress(){
  const {state:s,catalog}=session.view().data,defs=place==='ranch'?catalog.animals:catalog.crops,next=defs.filter(c=>!catalog.allUnlocked&&c.unlock>s.xp).sort((a,b)=>a.unlock-b.unlock)[0]
  progress.replaceChildren()
  const row=el('div','farm-goal-title'),copy=el('div');if(next)row.append(sprite(next.frame,place==='ranch'))
  copy.append(el('strong','',next?'下一步 · '+next.name:'全部物种已解锁'),el('small','',next?`再获得 ${next.unlock-s.xp} 经验`:`继续收获，点亮图鉴与成就`));row.append(copy);progress.append(row)
  const track=el('div','farm-xp-track'),fill=el('i');fill.style.width=(next?Math.min(100,s.xp/next.unlock*100):100)+'%';track.append(fill);progress.append(track,el('small','farm-small',`✧ ${s.xp}${next?' / '+next.unlock:''} 经验`))
  const ranch=place==='ranch',size=ranch?(s.ranch.slots??catalog.ranch.slots):s.plots.length,expansion=ranch?catalog.ranch.expansions?.find(x=>x.slots===size):catalog.expansions.find(x=>x.plots===size)
  expand.innerHTML=`<span><strong>${expansion?(ranch?'扩建 6 个栏位':'扩建 6 块地'):(ranch?'牧场已全部开放':'全部田地已开放')}</strong><small>${expansion?coin(expansion.coins)+` · ✧ ${catalog.allUnlocked?'已解锁':s.xp+'/'+expansion.xp}`:size+(ranch?' 个栏位':' 块田地')}</small></span><span aria-hidden="true">›</span>`;expand.disabled=!expansion
 }
 function drawBench(){
  const {state:s,catalog}=session.view().data,scroll=seedBench.querySelector('.farm-seed-list')?.scrollLeft??0
  seedBench.replaceChildren();const head=el('div','farm-bench-title'),list=el('div','farm-seed-list')
  head.append(el('h3','',place==='home'?'选一种种子':'饲料与动物'))
  if(place==='home'){
   head.append(button('种子商店 ›',()=>openPanel('bag'),'farm-subtle'))
   for(const c of sortFarmSeeds(catalog.crops,s.seeds)){
    const b=button('',()=>{seed=c.id;keepFocus(()=>{drawBench();drawContext();drawBatch()})},'farm-seed');b.dataset.farmFocus='seed:'+c.id;b.setAttribute('aria-pressed',String(seed===c.id));b.disabled=!catalog.allUnlocked&&s.xp<c.unlock
    b.setAttribute('aria-label',`${c.name}种子 ${s.seeds[c.id]??0}份，${duration(c.seconds)}${!catalog.allUnlocked&&s.xp<c.unlock?'，'+c.unlock+'经验解锁':''}`)
    const text=el('span');text.append(el('strong','',c.name),el('small','',!catalog.allUnlocked&&s.xp<c.unlock?`${c.unlock}经验解锁`:`×${s.seeds[c.id]??0} · ${duration(c.seconds)}`));b.append(sprite(c.frame),text);list.append(b)
   }
  }else if(place==='ranch'){
   const shops=el('div','farm-shop-links');shops.append(button('动物小铺',()=>openPanel('ranch'),'farm-subtle'),button('育肥猪小铺',()=>openPanel('pigs'),'farm-subtle'));head.append(shops)
   list.classList.add('farm-feed-supplies')
   list.append(el('p','farm-small',`库存 ${s.ranch.feed} 份 · 添粮使用库存，不足时可补买。每份支持一轮生产，最多备24小时。`),actionButton(`买饲料 ×12 · ${12*catalog.ranch.feedPrice} 🍌`,{type:'feed_buy',count:12},s.coins<12*catalog.ranch.feedPrice||s.ranch.feed>catalog.ranch.maxFeed-12))
  }
  seedBench.append(head,list);list.scrollLeft=scroll
  if(place==='home')seedBench.append(preferenceToggle('autoBuy','缺种时自动购买（按商店价格补足本次播种）'))
 }
 function preferenceToggle(key,text){
  const label=el('label','farm-preference'),input=el('input');input.type='checkbox';input.dataset.farmFocus='preference:'+key;input.checked=prefs[key];input.onchange=()=>{if(!preferences.set(key,input.checked))message('浏览器无法保存设置，本次未更改');keepFocus(()=>{drawBench();drawContext();drawBatch()})};label.append(input,document.createTextNode(text));return label
 }
 let stockFilter='all'
 function inventory(filter='all'){
  const {state:s,catalog}=session.view().data
  if(filter==='seeds')return catalog.crops.map(c=>({...c,name:c.name+'种子',count:s.seeds[c.id]??0,sellPrice:Math.floor(c.seedPrice/2),type:'seed_sell',payload:'crop',ranch:false})).filter(c=>c.count>0)
  return [...catalog.crops.map(c=>({...c,count:s.produce[c.id]??0,type:'sell',payload:'crop',ranch:false})),...catalog.animals.map(c=>({...c,name:c.product,count:s.ranch.products[c.id]??0,type:'product_sell',payload:'kind',ranch:true}))].map(c=>{
   const key=(c.ranch?'animal:':'crop:')+c.id;if(s.market)c.count=s.market.legacy[key]??0
   const saved=(s.market?s.market.legacyOrigins:s.stockOrigins)?.[key],grown=Math.min(c.count,saved?.grown??0),stolen=Math.min(c.count-grown,saved?.stolen??0),parts={grown,stolen,legacy:c.count-grown-stolen}
   return {...c,count:filter==='all'?c.count:parts[filter],source:filter==='all'?undefined:filter,breakdown:parts}
  }).filter(c=>c.count>0)
 }
 function drawStorage(){
  const {state:s}=session.view().data;storage.classList.toggle('farm-storage-market',!!s.market)
  if(s.market){const count=Object.values(s.produce).reduce((n,q)=>n+q,0)+Object.values(s.ranch.products).reduce((n,q)=>n+q,0)+Object.values(s.fishing?.basket??{}).reduce((n,q)=>n+q,0);storage.replaceChildren(el('h3','','收成仓库'),el('strong','',count+' 份'),el('p','farm-small','作物、畜产与鱼获按批次出售。'),button('出售收成',()=>void openMarket()),button('管理种子',()=>{stockFilter='seeds';openPanel('warehouse')}));return}
  const items=inventory(),n=items.reduce((v,c)=>v+c.count,0),value=items.reduce((v,c)=>v+c.count*c.sellPrice,0)
  storage.replaceChildren(el('h3','','收成仓库'))
  const row=el('div','farm-storage-line');if(items.length)row.append(sprite(items[0].frame,items[0].ranch));row.append(el('strong','',n+' 份'),el('span','farm-small',n?'等待出售':'收获后存放在这里'));storage.append(row)
  const copy=el('p');copy.innerHTML=n?'全部价值 '+coin(value):'收获入仓，出售后才获得收益。';storage.append(copy,iconButton('basket','查看与出售',()=>openPanel('warehouse')))
 }
 function setBatchOpen(open){
  batchMenu.hidden=!open;batchToggle.setAttribute('aria-expanded',String(open));batchToggle.textContent=open?'收起设置':'照料设置'
 }
 function drawBatch(){
  batchMenu.replaceChildren();quickActions.replaceChildren();if(!session.view().data)return
  const {state:s,catalog}=session.view().data,ranch=place==='ranch',unit=ranch?'只':'块'
  batchMenu.append(preferenceToggle(ranch?'ranchBatch':'batch',ranch?'点击动物默认批量收取':'点地默认批量照料'),el('span','farm-small',ranch?'关闭后点动物只操作当前一只，下方一键操作仍可使用。点按照料需手动点击，不会离线自动喂食。':'关闭后点地只操作当前一块，下方一键操作仍可使用。'))
  for(const [id,label] of ranch?[['animal_collect','收取'],['animal_feed','添粮'],['animal_clean','清洁'],['animal_remove','一键收尸']]:[['till','开垦'],['plant','播种'],['water','浇水'],['pest','驱虫'],['harvest','收获']]){
   const plan=()=>ranch?planRanchBatch(session.view().data.state,catalog,id,time(),{autoBuy:true}):cropBatch(id),actions=plan(),cost=id==='animal_feed'?ranchFeedCost(s,catalog,actions):0
   const text=`${cost?'补粮并添粮':label} ${actions.length} ${unit}`,b=button('',()=>{if(locked())return;const current=plan();if(current.length&&session.enqueueBatch(current)){message(`正在确认 ${current.length} ${unit}${ranch?'动物':'田地'}的${label}结果…`);setBatchOpen(false)}})
   b.innerHTML=escape(text)+(cost?' · '+coin(cost):'');b.setAttribute('aria-label',text+(cost?`，补粮花费 ${cost} D币`:''))
   b.title=id==='animal_feed'?(cost>s.coins?'D币不足，请先出售收成。':`每只产物动物添1份、育肥猪添2份；跳过死亡、成年猪及已备满的动物。${cost?'只购买缺少的饲料。':''}`):id==='animal_remove'?'收好剩余畜产后清理死亡动物，保留存活动物；畜产仓满时暂留对应动物。':''
   b.disabled=locked()||!actions.length||cost>s.coins;b.dataset.farmFocus='batch:'+id;quickActions.append(b)
  }
  if(ranch){
   const statuses=s.ranch.animals.map(a=>ranchAnimalStatus(a,catalog.animals.find(c=>c.id===a.kind),time(),catalog.ranch.capacity,catalog.ranch.starvationSeconds)),pigs=(s.pigs?.animals??[]).map(p=>pigStatus(p,catalog.pigs.find(c=>c.id===p.kind),time()))
   const dead=statuses.filter(a=>a.dead).length+pigs.filter(p=>p.dead).length,hungry=statuses.filter(a=>!a.dead&&a.hungry).length+(s.pigs?.animals??[]).filter((p,i)=>!pigs[i].dead&&!pigs[i].adult&&p.fedUntil<=time()).length
   quickActions.append(el('p','farm-care-status',`${hungry?'缺粮停产 '+hungry+' 只 · ':''}${dead?'已死亡 '+dead+' 只 · 收尸会保留已有畜产，仓满请先出售。':'连续缺粮48小时会死亡，记得及时添粮。'}`))
  }
 }
 function openPanel(next,retain=false){
  if(!session.view().data)return
  panel=next;if(next==='ranch'&&!retain)selected=null
  drawPanel();if(!dialog.open){dialogReturn=document.activeElement;dialog.showModal()}
 }
 function drawPanel(){
  dialogTitle.textContent=({journal:'农场手记',bag:'种子商店',book:'图鉴与成就',ranch:'牧场照料',warehouse:'仓库',expand:'扩建农田',uproot:'铲除作物',items:'道具商店'})[panel]
  if(panel==='pigs'){
   dialogTitle.textContent='牧场 · 育肥动物';details.replaceChildren();drawPigPanel(details,{state:session.view().data.state,catalog:session.view().data.catalog,selected,time,actionButton,isLocked:locked})
  }else if(panel==='guardian'){
   dialogTitle.textContent='AI 守护兽';details.replaceChildren();drawGuardianPanel(details,{state:session.view().data.state,catalog:session.view().data.catalog,time,actionButton})
  }else if(panel==='items'){
   const {state:s,catalog}=session.view().data,until=Math.max(s.guardUntil??0,s.guardSoftUntil??0,s.guardian?.protectionUntil??0),active=until>time()
   const shops=el('div','farm-shop-actions');shops.append(button('种子',()=>openPanel('bag')),button('动物与饲料',()=>openPanel('ranch')),button('育肥动物',()=>openPanel('pigs')))
   details.replaceChildren(shops,el('h3','','全园守护'),el('p','farm-small','守护全部田地与牧场6小时：拦截普通摘取，付费潜入成功率降至40%。访客仍可浇水。旧绝对保护履行至到期。'))
   if(active)details.append(el('p','',`守护中 · ${duration(until-time())}后结束`))
   if(s.fishing?.items?.ward_charm)details.append(actionButton(`使用巡田铃 · 持有${s.fishing.items.ward_charm}`,{type:'farm_item',item:'ward_charm'},active))
   if(s.fishing?.items?.feed_bundle)details.append(actionButton(`打开谷物包 · 持有${s.fishing.items.feed_bundle}`,{type:'farm_item',item:'feed_bundle'},s.ranch.feed>9994))
   details.append(actionButton('购买并开启守护 · 30 🍌',{type:'guard'},active||s.coins<30),el('h3','','作物加速'),el('p','farm-small','每茬限一次，最多缩短原生长时间的25%。费用为种子单价的四分之一向上取整，最低2D币；成熟作物不收费加速。'))
   let count=0
   for(const [i,p] of s.plots.entries()){
    const c=catalog.crops.find(c=>c.id===p.crop);if(!c||p.wateredAt===null||p.boosted||time()>=cropMatureAt(p,c))continue
    if((p.leaseUntil??0)>time())continue
    const price=Math.max(2,Math.ceil(c.seedPrice/4)),row=el('div','farm-note');row.append(el('p','',`田地${i+1} · ${c.name} · 剩余${duration(cropMatureAt(p,c)-time())}`),actionButton(`加速这一株 · ${price} 🍌`,{type:'boost',plot:i},s.coins<price));if(s.fishing?.items?.compost)row.append(actionButton(`水草堆肥 · 持有${s.fishing.items.compost}`,{type:'farm_item',item:'compost',plot:i}));details.append(row);count++
   }
   if(!count)details.append(el('p','farm-small','暂无可加速作物，先播种并浇水。'))
  }else if(panel==='warehouse'){
   if(session.view().data.state.market)stockFilter='seeds'
   details.replaceChildren(el('p','farm-small',stockFilter==='seeds'?'种子按购买单价的一半回售，单价向下取整。':'自产与摘取分开统计；上线前来源不明的物产保留为历史库存。'))
   if(session.view().data.state.market)details.prepend(button('出售收成 · 行情仓库',()=>{dialog.close();void openMarket()}),el('p','farm-small','作物、畜产与鱼获已进入行情仓库；这里管理剩余种子。'))
   const filters=el('select');filters.setAttribute('aria-label','仓库分类');for(const [id,label] of (session.view().data.state.market?[['seeds','已有种子']]:[['all','全部收成'],['grown','自产'],['stolen','摘取所得'],['legacy','历史库存'],['seeds','已有种子']]))filters.add(new Option(label,id));filters.value=stockFilter;filters.onchange=()=>{stockFilter=filters.value;drawPanel()};details.append(filters)
   const q=el('select');q.setAttribute('aria-label','每次出售数量');for(const n of [1,5,10,99])q.add(new Option(n===99?'最多 99 份':'每次 '+n+' 份',String(n)));q.value=String(prefs.sellQuantity);q.onchange=()=>{if(!preferences.set('sellQuantity',Number(q.value)))message('浏览器无法保存设置');drawPanel()};details.append(q)
   const items=inventory(stockFilter);if(!items.length)details.append(el('p','farm-empty','这个分类暂无库存。'))
   for(const c of items){const n=Math.min(c.count,farmQuantity(prefs.sellQuantity,session.view().data.state)),row=el('article','farm-shop-row'),copy=el('div');copy.append(el('h3','',c.name),el('p','farm-small',`库存 ${c.count} 份`));if(stockFilter==='all')copy.append(el('small','farm-small',`自产 ${c.breakdown.grown} · 摘取 ${c.breakdown.stolen} · 历史 ${c.breakdown.legacy}`));row.append(sprite(c.frame,c.ranch),copy,actionButton(`出售 ${n} 份 · +${n*c.sellPrice} 🍌`,{type:c.type,[c.payload]:c.id,count:n,...c.source?{source:c.source}:{}}));details.append(row)}
  }else if(panel==='uproot'){
   const i=selected?.index,s=session.view().data.state,p=s.plots[i],c=session.view().data.catalog.crops.find(c=>c.id===p?.crop)
   details.replaceChildren(el('p','',c?`铲除田地 ${i+1} 的${c.name}？本株进度与收成会清空，不返还种子，土地保持开垦。`:'作物已变化，请重新选择田地。'))
   if(c){const confirm=actionButton('确认铲除这株',{type:'uproot',plot:i});confirm.addEventListener('click',()=>dialog.close());details.append(confirm)}
   details.append(button('取消',()=>dialog.close()))
  }else if(panel==='expand'){
   const {state:s,catalog}=session.view().data,ranch=place==='ranch',size=ranch?(s.ranch.slots??catalog.ranch.slots):s.plots.length,expansion=ranch?catalog.ranch.expansions?.find(x=>x.slots===size):catalog.expansions.find(x=>x.plots===size)
   dialogTitle.textContent=ranch?'扩建牧场':'扩建农田'
   details.replaceChildren(el('h3','',expansion?'再增加 6 '+(ranch?'个栏位':'块田地'):size+(ranch?' 个栏位':' 块田地')+'已全部开放'),el('p','farm-small','扩建不改变原有作物或动物。场景分区显示，左右切换；批量照料仍覆盖全园。'))
   if(expansion){const cost=el('p');cost.innerHTML=`${coin(s.coins)} / ${coin(expansion.coins)}　✧ ${s.xp} / ${expansion.xp} 经验${catalog.allUnlocked?'（站长已解锁）':''}`;details.append(cost,el('p','farm-small','经验只作解锁条件，不会扣除。'),actionButton('确认扩建',{type:ranch?'ranch_expand':'expand'},s.coins<expansion.coins||!catalog.allUnlocked&&s.xp<expansion.xp));if(s.coins<expansion.coins)details.append(button('出售仓库收成',()=>openPanel('warehouse')))}
  }else{panels.draw();if(panel==='bag')details.prepend(button('出售已有种子',()=>{stockFilter='seeds';openPanel('warehouse')}))}
 }
 function collectFlight(actions,old){
  if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||!old)return
  const a=actions.find(a=>['harvest','lease_harvest','animal_collect'].includes(a.type));if(!a)return
  const animal=a.type==='animal_collect',index=a.leaseId?old.state.plots.length+(old.rentedPlots??[]).findIndex(l=>l.id===a.leaseId):a.plot,source=animal?old.state.ranch.animals[a.animal]:farmSceneState(old).plots[index],spec=(animal?old.catalog.animals:old.catalog.crops).find(c=>c.id===(animal?source?.kind:source?.crop)),from=world?.getTargetRect(animal?'animal':'plot',animal?a.animal:index),to=storage.getBoundingClientRect()
  if(!spec||!from)return
  const token=el('span','farm-harvest-flight');token.append(sprite(animal?400+old.catalog.animals.findIndex(c=>c.id===spec.id):spec.frame,animal));shell.append(token)
  const animation=token.animate([{transform:`translate(${from.x+from.width/2-22}px,${from.y}px) scale(1)`,opacity:1},{transform:`translate(${to.x+25}px,${to.y+35}px) scale(.5)`,opacity:0}],{duration:850,easing:'cubic-bezier(.25,.7,.35,1)'})
  animation.finished.then(()=>token.remove(),()=>token.remove())
 }
 function tick(){
  if(disposed||document.hidden||!session.view().data)return
  world?.updateState(sceneState());keepFocus(()=>{drawStats();drawContext();if(!batchMenu.hidden)drawBatch()})
  if(dialog.open){let changed=false;for(const n of details.querySelectorAll('[data-countdown]')){const remaining=Number(n.dataset.countdown)-time();if(remaining<=0)changed=true;else n.textContent=n.dataset.prefix+duration(remaining)}if(changed)keepFocus(drawPanel)}
 }
 const timer=setInterval(tick,1000),hide=()=>void session.flush({keepalive:true});window.addEventListener('pagehide',hide)
 const cleanup=()=>{if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('pagehide',hide);conflict?.destroy();market?.destroy();leisure?.destroy();leases?.destroy();wallet?.destroy();social?.destroy();world?.destroy();world=null;void session.dispose()}
 onLeave(cleanup);void session.load().then(()=>{if(!disposed&&session.view().status==='ready'){const next=new URLSearchParams(location.search).get('panel');if(next==='conflict')void openConflict();else if(next==='market')void openMarket()}});return {destroy:cleanup}
}
