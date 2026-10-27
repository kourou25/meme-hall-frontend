import {createFarmWorld} from './farm-world.js?v=8f410db6'
import {iconButton,coin,duration} from '/farm-ui.js?v=8f410db6'
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
const button=(text,fn)=>{const b=el('button','',text);b.type='button';b.onclick=fn;return b}
export function createFarmSocial(parent,{request,catalog,userId,onChanged,canAct,onOpen=()=>{},onClose=()=>{}}){
 const dialog=el('dialog','farm-social'),head=el('header'),title=el('h2','','农友互访'),close=button('回我的农场',()=>dialog.close()),nav=el('nav'),content=el('div','farm-social-content'),feedback=el('div','farm-social-feedback'),status=el('p','farm-social-status'),retry=button('↻',()=>void submit())
 retry.className='farm-visit-retry';retry.setAttribute('aria-label','确认上次互动结果');retry.title='确认上次互动结果';retry.style.visibility='hidden';feedback.append(status,retry)
 title.id='farm-social-title';dialog.setAttribute('aria-labelledby',title.id);status.setAttribute('role','status');status.setAttribute('aria-live','polite');head.append(title,close)
 dialog.addEventListener('close',async()=>{clearInterval(clockTimer);clockTimer=0;stopWorld();content.replaceChildren();await worldTask;if(!disposed)onClose()});let view='neighbors',farm=null,cursor=null,items=[],pending=null,busy=false,disposed=false,opening=false,sequence=0,world=null,worldOwner=null,worldLoading=false,worldTask=null,stage=null,visitPlace='home',clockAt=Date.now()
 const key='farm.visit.pending.v1:'+userId
 const neighbors=button('农友',()=>void load('neighbors')),logs=button('来访消息',()=>void load('visits')),refresh=button('刷新',()=>void load(view,view==='farm'?farm?.owner.id:null))
 nav.append(neighbors,logs,button('被偷榜',()=>void load('loss-ranking')),refresh);dialog.append(head,nav,content,feedback);parent.append(dialog)
 let moreFrame=0,loadFailed=false,onlyReady=false,mode='normal',selected=new Set(),clockTimer=0
 function loadMore(){if(dialog.open&&!disposed&&!busy&&!pending&&!loadFailed&&view==='neighbors'&&cursor!==null&&content.scrollHeight-content.scrollTop-content.clientHeight<120)void load(view,null,cursor)}
 content.addEventListener('scroll',loadMore,{passive:true})
 function message(text){if(!disposed)status.textContent=text}
 function cropName(id){return catalog.crops.find(c=>c.id===id)?.name||'作物'}
 function clearPending(){sessionStorage.removeItem(key);pending=null}
 function state(){for(const b of nav.children)b.disabled=busy||!!pending;retry.disabled=busy||!pending;retry.style.visibility=pending?'visible':'hidden';retry.title=busy?'正在确认互动…':'确认上次互动结果';neighbors.setAttribute('aria-pressed',String(view==='neighbors'));logs.setAttribute('aria-pressed',String(view==='visits'));draw()}

 function targets(){return visitPlace==='ranch'?farm?.ranch?.animals??[]:farm?.plots??[]}
 function eligible(x){return mode==='sneak'?!!x.sneak:x.status==='stealable'}
 function allTargets(actionMode){return [...(farm?.plots??[]).map(x=>({x,target:{plot:x.index,cycle:x.cycle}})),...(farm?.ranch?.animals??[]).map(x=>({x,target:{animal_id:x.id,cycle:x.cycle}}))].filter(({x})=>actionMode==='sneak'?!!x.sneak:x.status==='stealable')}
 function localTime(){return (farm?.server_time??0)+Math.floor((Date.now()-clockAt)/1000)}
 function remaining(){return Math.max(0,Math.max(farm?.cooldown?.global_until??0,farm?.cooldown?.pair_until??0)-localTime())}
 function sceneState(){return {plots:farm.plots.map(p=>({...p,visitStatus:p.status,visitSelected:visitPlace==='home'&&selected.has(p.index)})),trees:[],ranch:{...farm.ranch,animals:(farm.ranch?.animals??[]).map((a,i)=>({...a,visitSelected:visitPlace==='ranch'&&selected.has(i)}))}}}
 function pick(target,addOnly=false){
  const ranch=target.kind==='animal',x=ranch?farm.ranch?.animals[target.index]:farm.plots[target.index]
  if(!x||busy||pending)return
  if(!ranch&&x.status==='dry'&&mode==='normal'){if(!addOnly)void interact(x);return}
  if(!eligible(x)){message(mode==='sneak'?'尚不能潜入：需生长过半、未被摘过；牧场还须已有1份产物。旧绝对守护生效期间不可潜入。':x.sneak?'该目标可尝试潜入，切换行动方式查看费用和成功率。':'暂不可摘，等待新的产出。');return}
  if(remaining()>0){message('行动冷却还需 '+duration(remaining()));return}
  if(selected.has(target.index)){if(!addOnly)selected.delete(target.index)}else selected.add(target.index)
  world?.updateState(sceneState());refreshControls()
 }
 function refreshControls(){
  const box=dialog.querySelector('.farm-visit-plan');if(!box||!farm)return
  const chosen=[...selected].map(i=>({i,x:targets()[i]})).filter(v=>v.x&&eligible(v.x)),wait=remaining(),fee=mode==='sneak'?chosen.reduce((n,v)=>n+v.x.sneak.fee,0):0
  const details=box.querySelector('.farm-visit-selection');details.replaceChildren(...chosen.map(({i,x})=>{const n=el('span','',`${visitPlace==='ranch'?'动物':'田地'}${i+1} · ${mode==='sneak'?(x.sneak.early?'提前摘取':'穿过守护')+' '+Math.round(x.sneak.chance*100)+'%':'摘取1份'}`);return n}))
  box.hidden=!chosen.length
  box.querySelector('.farm-visit-fee').innerHTML=mode==='sneak'?'行动消耗 '+coin(fee)+' · 失败仍消耗':'普通摘取 · 不消耗D币'
  const submit=box.querySelector('.farm-visit-commit');submit.textContent=wait?'休整 '+duration(wait):mode==='sneak'?`确认潜入 ${chosen.length} 处`:`摘取 ${chosen.length} 处`;submit.disabled=busy||!!pending||!chosen.length||wait>0
  const select=content.querySelector('.farm-visit-mode');if(select){select.value=mode;select.disabled=busy||!!pending}
  for(const actionMode of ['normal','sneak']){const take=content.querySelector(`[data-visit-all="${actionMode}"]`);if(!take)continue;const all=allTargets(actionMode),cost=actionMode==='sneak'?all.reduce((n,v)=>n+v.x.sneak.fee,0):0,quote=all.length+':'+cost
   if(take.dataset.quote!==quote){take.dataset.quote=quote;take.innerHTML=`<strong>${actionMode==='sneak'?'一键潜入':'一键偷取'}</strong><span>${all.length} 处${actionMode==='sneak'?' · '+coin(cost):' · 免费'}</span>`}
   take.disabled=busy||!!pending||wait>0||!all.length;take.title=actionMode==='sneak'?'一次潜入当前农友农田与牧场的全部合格目标，失败也消耗显示的费用':'一次偷取当前农友农田与牧场的全部可摘物产'
  }
  const hint=content.querySelector('.farm-visit-all-hint');if(hint)hint.textContent=wait?'休整 '+duration(wait)+' · 同一农友间隔5分钟':'当前农友 · 农田＋牧场一起操作 · 潜入失败也扣费'
  box.querySelector('.farm-visit-cooldown').textContent=wait?'当前农友还需 '+duration(wait)+'；更换农友仍受1分钟全局冷却。':'每次行动后休整1分钟 · 同一农友间隔5分钟'
 }
 function stopWorld(){dialog.querySelector('.farm-visit-plan')?.remove();world?.destroy();world=null;worldOwner=null;worldLoading=false;stage=null}
 function draw(){
  if(disposed||!dialog.open)return;title.textContent=view==='farm'&&farm?farm.owner.name+(visitPlace==='ranch'?'的牧场':'的农场'):view==='visits'?'来访记录':view==='loss-ranking'?'被偷榜':'农友互访';dialog.classList.toggle('is-visiting',view==='farm')
  if(view==='farm'&&farm){
   if(worldOwner!==farm.owner.id||!stage){stopWorld();content.replaceChildren();worldOwner=farm.owner.id;const owner=worldOwner
    const tabs=el('nav','farm-visit-stage-nav'),field=iconButton('seed','农田',()=>{visitPlace='home';selected.clear();world?.travel('home');draw()}),ranch=iconButton('ranch','牧场',()=>{visitPlace='ranch';selected.clear();world?.travel('ranch');draw()});field.setAttribute('aria-label','查看好友农场');ranch.setAttribute('aria-label','查看好友牧场');const method=el('select','farm-visit-mode');method.setAttribute('aria-label','手动点选方式');method.append(new Option('手动点选：偷取','normal'),new Option('手动点选：潜入','sneak'));method.value=mode;method.onchange=()=>{mode=method.value;selected.clear();world?.updateState(sceneState());refreshControls()};tabs.append(field,ranch,method);content.append(tabs)
    const quick=el('div','farm-visit-quick');for(const actionMode of ['normal','sneak']){const all=button('',()=>void takeAll(actionMode));all.dataset.visitAll=actionMode;quick.append(all)}quick.append(el('small','farm-visit-all-hint'));content.append(quick)
    stage=el('div','farm-map farm-visit-stage');content.append(stage);const target=stage;worldLoading=true
    worldTask=Promise.resolve(worldTask).then(()=>{if(disposed||stage!==target||worldOwner!==owner)return null;return createFarmWorld(target,{state:sceneState(),catalog,visitor:true,now:()=>farm.server_time+Math.floor((Date.now()-clockAt)/1000),onMessage:message,onBrush:async targets=>{
     for(const target of targets){if(target.kind==='plot'||target.kind==='animal')pick(target,true)}
    },onPlace:p=>{if(visitPlace!==p)selected.clear();visitPlace=p;message(p==='ranch'?'点选动物旁的收成篮或潜入标记':'点选作物或潜入标记');draw()},onTarget:target=>{
     if(target.kind==='guardian'){message('守护拦截普通摘取，新守护将潜入成功率降低到40%；旧绝对保护履行到期。');return}
     pick(target)
    }})}).then(w=>{if(disposed||stage!==target||worldOwner!==owner){w?.destroy();return}world=w;worldLoading=false;w?.travel(visitPlace)}).catch(()=>{if(stage!==target)return;worldLoading=false;world?.destroy();world=null;target.replaceChildren(el('p','','场景加载失败，云存档仍然保留。'),button('重新加载场景',()=>{stopWorld();draw()}))})
    const plan=el('section','farm-visit-plan'),selection=el('div','farm-visit-selection'),cost=el('p','farm-visit-fee'),commit=button('摘取',()=>void sendSelected()),cooldown=el('small','farm-visit-cooldown');commit.className='farm-visit-commit';plan.append(selection,cost,commit,cooldown);dialog.insertBefore(plan,feedback)
    const guide=el('details','farm-visit-guide');guide.append(el('summary','','潜入规则'),el('p','','潜入可提前拿走生长过半的作物，或牧场下一份产物。每处按基础售价25%收取行动费；无守护70%、新守护40%成功率，市场出售不保证盈利。成功仍给主人保留收成。'));content.append(guide)
   }else world?.updateState(sceneState())
   const picker=content.querySelector('.farm-visit-picker');if(picker){picker.replaceChildren(new Option('⌖',''));(visitPlace==='ranch'?farm.ranch?.animals??[]:farm.plots).forEach((x,i)=>picker.add(new Option((visitPlace==='ranch'?'动物 ':'田地 ')+(i+1),String(i))))}
   refreshControls()
   for(const [i,b] of [...content.querySelectorAll('.farm-visit-stage-nav button')].slice(0,2).entries())b.setAttribute('aria-pressed',String(visitPlace===(i?'ranch':'home')))
   return
  }
  const scrollTop=content.scrollTop;stopWorld();content.replaceChildren()
  if(view==='loss-ranking')content.append(el('p','farm-small','累计被摘走的份数 · 前30位。包含上线时仍保留的历史互动，此后持续累计。'))
  if(!items.length&&!busy)content.append(el('p','farm-small',view==='visits'?(cursor?'本页行动已合并到上方记录，可继续查看较早记录。':'最近30天还没有来访互动。'):'还没有可互访的农场。'))
  if(view==='neighbors'){const controls=el('div','farm-neighbor-controls'),b=button(onlyReady?'显示全部农友':'只看可互动',()=>{onlyReady=!onlyReady;draw();loadMore()});b.setAttribute('aria-pressed',String(onlyReady));controls.append(el('span','farm-small','成熟与可潜入目标优先'),b);content.append(controls)}
  const displayed=view==='neighbors'?[...items].filter(x=>!onlyReady||x.available_crops+x.available_products+(x.sneak_crops||0)+(x.sneak_products||0)>0).sort((a,b)=>(b.available_crops+b.available_products+(b.sneak_crops||0)+(b.sneak_products||0))-(a.available_crops+a.available_products+(a.sneak_crops||0)+(a.sneak_products||0))||a.id-b.id):items
  for(const item of displayed){
   if(view==='neighbors'){const b=button('',()=>void load('farm',item.id));b.className='farm-neighbor';b.disabled=busy||!!pending;b.append(el('strong','',item.name),el('span','farm-small',[item.available_crops?`🌱 ${item.available_crops} 块可摘`:'',item.available_products?`🐔 ${item.available_products} 份可摘`:'',(item.sneak_crops||0)+(item.sneak_products||0)?`◇ ${(item.sneak_crops||0)+(item.sneak_products||0)} 处可潜入`:''].filter(Boolean).join(' · ')||'暂无可摘'));content.append(b)}
   else if(view==='loss-ranking'){const row=el('article','farm-visit-log');row.append(el('strong','',`${items.indexOf(item)+1}. ${item.name}`),el('p','',`被摘 ${item.total} 份 · 作物 ${item.crops} · 畜产 ${item.products}`));content.append(row)}
   else{const row=el('article','farm-visit-log'),when=new Date(item.created_at*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});row.append(el('strong','',item.actor_name||'农友'),el('p','',item.kind==='sneak'?intrusionLog(item):item.kind==='visit'?'来农场看了看':item.kind==='animal_steal'?`摘取${catalog.animals.find(x=>x.id===item.crop)?.product||'畜产'} ×${item.amount}`:item.kind==='steal'?`从田地${item.plot+1}摘取${cropName(item.crop)} ×${item.amount}`:`为田地${item.plot+1}的${cropName(item.crop)}浇水`),el('time','farm-small',when));content.append(row)}
  }
  if(cursor!==null){const more=button(loadFailed?'加载失败，点击重试':busy?'正在加载…':view==='visits'?'较早记录':'继续下拉加载',()=>{loadFailed=false;void load(view,null,cursor)});more.disabled=busy||!!pending;content.append(more)}
  content.scrollTop=scrollTop
 }

 function intrusionLog(item){try{const r=JSON.parse(item.result),won=r.outcomes.filter(x=>x.success);return `潜入${r.outcomes.length}处 · ${won.length?'带走 '+won.map(x=>x.name+' ×1').join('、'):'被发现，未带走物产'} · 对方消耗${r.fee} D币`}catch{return '尝试潜入农场'}}
 async function load(next,owner=null,page=null){
  if(disposed||busy||pending)return;busy=true;loadFailed=false;view=next;selected.clear();if(page===null){items=[];cursor=null;content.scrollTop=0}if(next==='farm'&&farm?.owner.id!==owner)farm=null;const seq=++sequence;state();message('正在读取…')
  const arriving=next==='farm'&&farm?.owner.id!==owner,path=next==='farm'?`visit/${owner}${arriving?'/arrive':''}`:(next==='visits'?'activity':next)+(page===null?'':`?${next==='neighbors'?'after':'before'}=${encodeURIComponent(page)}`)
  try{const r=await request('/api/farm/'+path,arriving?{}:undefined);if(disposed||seq!==sequence)return;if(!r.ok)throw Error(r.data?.error||'暂时无法读取');if(next==='farm'){farm=r.data;clockAt=Date.now()}else{const ids=new Set(items.map(x=>x.id));items=page===null||next==='visits'?r.data.items:[...items,...r.data.items.filter(x=>!ids.has(x.id))];cursor=r.data.next===page?null:r.data.next??null}message('')}
  catch(e){loadFailed=true;message(e.message||'读取失败，请刷新重试')}
  finally{if(!disposed&&seq===sequence){busy=false;state();cancelAnimationFrame(moreFrame);moreFrame=requestAnimationFrame(loadMore)}}
 }
 async function takeAll(actionMode){
  if(busy||pending||remaining()>0||!canAct())return message('请先完成自己的云存档同步，并等待冷却结束')
  const chosen=allTargets(actionMode);if(!chosen.length)return
  const fee=actionMode==='sneak'?chosen.reduce((n,v)=>n+v.x.sneak.fee,0):0
  const operation={owner:farm.owner.id,outing:true,body:{id:crypto.randomUUID(),place:visitPlace,all:true,mode:actionMode,revision:farm.revision,max_fee:fee,targets:chosen.map(v=>v.target)}}
  try{sessionStorage.setItem(key,JSON.stringify(operation));pending=operation}catch{return message('无法保存重试凭据，本次未发送')}
  return await submit()
 }
 async function sendSelected(){
  if(busy||pending||remaining()>0||!canAct())return message('请先完成自己的云存档同步，并等待冷却结束')
  const chosen=[...selected].map(i=>({i,x:targets()[i]})).filter(v=>v.x&&eligible(v.x));if(!chosen.length)return
  const ranch=visitPlace==='ranch',fee=mode==='sneak'?chosen.reduce((n,v)=>n+v.x.sneak.fee,0):0
  const operation={owner:farm.owner.id,outing:true,body:{id:crypto.randomUUID(),place:visitPlace,mode,revision:farm.revision,max_fee:fee,targets:chosen.map(({i,x})=>ranch?{animal_id:x.id,cycle:x.cycle}:{plot:x.index??i,cycle:x.cycle})}}
  try{sessionStorage.setItem(key,JSON.stringify(operation));pending=operation}catch{return message('无法保存重试凭据，本次未发送')}
  return await submit()
 }
 async function interact(plot){
  if(busy||pending||!canAct())return message('请先确认自己的云存档，再进行互动')
  const operation={owner:farm.owner.id,body:{id:crypto.randomUUID(),type:plot.status==='dry'?'water':'steal',plot:plot.index,cycle:plot.cycle,revision:farm.revision}}
  try{sessionStorage.setItem(key,JSON.stringify(operation));pending=operation}catch{return message('浏览器无法保存重试凭据，本次未发送')}
  return await submit()
 }
 async function submit(){
  if(disposed||busy||!pending)return;busy=true;state();message('正在确认互动…');const operation=pending
  try{
   const r=await request('/api/farm/visit/'+operation.owner+(operation.outing?'/outing':operation.batch?'/batch':''),operation.body)
   if(r.ok){const index=farm?.ranch?.animals.findIndex(a=>a.id===operation.body.animal_id);clearPending();selected.clear();if(r.data.farm){farm=r.data.farm;clockAt=Date.now();view='farm';world?.updateState(sceneState());world?.feedback(operation.outing?r.data.outcomes.map(x=>x.animal_id!==undefined?{type:x.success?'animal_steal':'sneak_failed',animal:farm.ranch.animals.findIndex(a=>a.id===x.animal_id)}:{type:x.success?'steal':'sneak_failed',plot:x.plot}):operation.batch?operation.body.targets.map(x=>operation.body.place==='ranch'?{type:'animal_steal',animal:farm.ranch.animals.findIndex(a=>a.id===x.animal_id)}:{type:'steal',plot:x.plot}):[{...operation.body,...operation.body.type==='animal_steal'?{animal:index}:{}}])}else{const fresh=await request('/api/farm/visit/'+operation.owner);if(fresh.ok){farm=fresh.data;clockAt=Date.now();view='farm'}}message(r.data.message||'互动完成');await onChanged()}
   else if([400,401,403,404,409].includes(r.status)||(r.status===429&&r.data.code==='visit_cooldown')){clearPending();const fresh=await request('/api/farm/visit/'+operation.owner);if(fresh.ok){farm=fresh.data;clockAt=Date.now()}message(r.data.error||'互动未完成，请刷新农场')}
   else message((r.data.error||'暂时无法确认')+'，请使用确认按钮重试同一次操作')
   return r.ok
  }catch{message('连接中断，请确认上次互动结果；重试不会重复结算')}
  finally{busy=false;if(!disposed)state()}
 }
 return {async open(){if(disposed||opening||dialog.open)return;opening=true;try{await worldTask;await onOpen();if(disposed)return;dialog.showModal();clockTimer=setInterval(()=>{if(dialog.open&&view==='farm'&&!document.hidden)refreshControls()},1000);try{pending=JSON.parse(sessionStorage.getItem(key)||'null')}catch{message('待确认记录无法读取，请联系管理员');return}if(pending){state();message('请先确认上次互动结果')}else await load('neighbors')}finally{opening=false}},destroy(){disposed=true;clearInterval(clockTimer);sequence++;cancelAnimationFrame(moreFrame);content.removeEventListener('scroll',loadMore);stopWorld();dialog.close();dialog.remove()}}
}
