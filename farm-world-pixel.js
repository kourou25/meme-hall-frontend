import {plotTarget,plotIdentity,plotLabel,plotLocked} from './farm-plot-view.js?v=8f410db6'
import {cropMatureAt,cropHasPests,cropProgress} from './farm-crop-care.js?v=8f410db6'
import {farmArt} from './farm-assets.js?v=8f410db6'
import {blockCropArt} from './farm-block-crops.js?v=8f410db6'
import {bindFarmPointer} from './farm-pointer.js?v=8f410db6'
import {ranchAnimalStatus} from './farm-ranch.js?v=8f410db6'
import {createHerd,project,PEN_SIZE} from './farm-herd.js?v=8f410db6'
import {guardianStatus} from './farm-guardian.js?v=8f410db6'
import {createGuardianMotion,guardianSheet} from './farm-guardian-motion.js?v=8f410db6'
import {pigStatus} from './farm-pigs.js?v=8f410db6'

const root='/assets/farm/pixel-v3/',clock=n=>n<60?Math.max(1,Math.ceil(n))+'秒':n<3600?Math.ceil(n/60)+'分':Math.ceil(n/3600)+'小时'
const animalType=id=>/chicken|duck|bird|雀|鸡/.test(id)?'chicken':/sheep|llama/.test(id)?'sheep':/pig/.test(id)?'pig':'cow'
// One scene, one canvas and bounded decoded atlases. No gameplay clock or wallet writes here.
export async function createPixelFarmWorld(parent,{state,catalog,now,onTarget,onPlace,onSelection=()=>{},onBrush=()=>{},visitor=false}){
 if(!parent.isConnected)return null
 let save=state,place='home',selection=null,disposed=false,raf=0,last=0,visible=true,zoom=1,pan={x:0,y:0},view={s:1,x:0,y:0},brush=[],effects=[],entries=[],animals=[],herd=createHerd([]),signature='',panDrag=null
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true})
 if(!ctx)throw Error('平面场景暂不可用')
 parent.classList.add('farm-pixel');canvas.className='farm-pixel-canvas';canvas.setAttribute('aria-label','点按照料；鼠标左键划过连续照料，右键拖动平移；使用镜头按钮缩放')
 const background=document.createElement('div');background.className='farm-pixel-background'
 const controls=document.createElement('nav');controls.className='farm-pixel-camera';controls.setAttribute('aria-label','场景镜头')
 const keyboard=document.createElement('div');keyboard.className='farm-voxel-keyboard';keyboard.setAttribute('aria-label','田地与动物快捷操作')
 parent.append(background,canvas,controls,keyboard)
 const clean=[],atlases=new Map(),guardianMotion=createGuardianMotion();let loadTail=Promise.resolve(),guardianTarget=null,fieldBounds={left:150,right:630,top:100,bottom:470},guardianAnchor={x:195,y:430}
 function load(url){
  if(atlases.has(url))return atlases.get(url).promise
  const entry={image:null,width:0,height:0,promise:null};atlases.set(url,entry)
  // Decode serially to avoid holding several full-resolution temporary images at once.
  entry.promise=loadTail.then(async()=>{
   if(disposed)return
   const image=new Image();image.src=url
   try{await image.decode();if(disposed)return;entry.width=image.naturalWidth;entry.height=image.naturalHeight
    if(typeof createImageBitmap==='function'){const width=Math.min(768,image.naturalWidth);entry.image=await createImageBitmap(image,{resizeWidth:width,resizeHeight:Math.round(image.naturalHeight*width/image.naturalWidth),resizeQuality:'pixelated'})}
    else entry.image=image
    if(disposed){entry.image?.close?.();entry.image=null}else schedule()
   }finally{if(entry.image!==image)image.src=''}
  })
  loadTail=entry.promise.catch(()=>{});return entry.promise
 }
 function sprite(url,rect,x,y,width,face=1,angle=0){
  const a=atlases.get(url);if(!a?.image){void load(url).catch(()=>{});return}
  const [sx,sy,sw,sh]=rect,k=a.image.width/a.width,height=width*sh/sw
  ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.rotate(angle);ctx.drawImage(a.image,sx*k,sy*k,sw*k,sh*k,-width/2,-height,width,height);ctx.restore()
 }
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
 function poly(points,color,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}}
 function fence(a,b){ctx.lineWidth=4;for(const [dy,color] of [[19,'#a79272'],[30,'#c2ae8a']]){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(a.x,a.y-dy);ctx.lineTo(b.x,b.y-dy);ctx.stroke()}const n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/45);for(let i=0;i<=n;i++)rect(a.x+(b.x-a.x)*i/n-2,a.y+(b.y-a.y)*i/n-36,5,37,'#a08c6c')}
 function label(text,x,y,color='#53684b'){if(!text)return;ctx.font='11px sans-serif';ctx.textAlign='center';const width=ctx.measureText(text).width+10;rect(x-width/2,y-12,width,17,'#fcf9e9e8');ctx.fillStyle=color;ctx.fillText(text,x,y)}
 // In-world status is a small ground-level object, never a floating text badge.
 function marker(kind,x,y){
  ctx.save();ctx.translate(Math.round(x),Math.round(y))
  if(kind==='ripe'){poly([[0,-7],[2,-2],[7,0],[2,2],[0,7],[-2,2],[-7,0],[-2,-2]],'#e1c57d','#a89562');rect(-1,-2,2,4,'#fff1be')}
  else if(kind==='water'){poly([[0,-8],[5,-1],[4,4],[0,6],[-4,4],[-5,-1]],'#89b0b7','#668e99');rect(-2,0,2,3,'#cee1d3')}
  else if(kind==='pest'){poly([[-7,1],[-2,-5],[6,-5],[3,2],[-3,5]],'#92a06b','#738458');rect(-2,-1,6,3,'#ba9976');rect(2,-2,2,2,'#695d4e');rect(-3,3,2,1,'#695d4e')}
  else if(kind==='product'){poly([[-8,-4],[8,-4],[6,6],[-6,6]],'#b79b72','#897451');rect(-6,-1,12,2,'#dfc292');ctx.fillStyle='#f2e7c8';ctx.beginPath();ctx.ellipse(-2,-5,3,4,0,0,Math.PI*2);ctx.ellipse(4,-4,3,4,0,0,Math.PI*2);ctx.fill()}
  else if(kind==='feed'){rect(-1,-7,2,13,'#9c9560');for(let i=0;i<3;i++){rect(-5,-6+i*4,4,3,'#d0b77e');rect(1,-4+i*4,4,3,'#c2aa71')}}
  else if(kind==='lock'){ctx.strokeStyle='#52665d';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-4,4,Math.PI,0);ctx.stroke();rect(-6,-4,12,10,'#e6d6aa');rect(-1,0,2,3,'#52665d')}
  else if(kind==='remove'){rect(-5,-2,10,3,'#ae8679');rect(-1,-6,3,11,'#ae8679')}
  else if(kind==='sneak'){poly([[0,-8],[8,0],[0,8],[-8,0]],'#b49c7b','#755f49');rect(-4,-2,8,4,'#5e6261');rect(-3,-1,2,1,'#f7e9c5');rect(2,-1,2,1,'#f7e9c5')}
  else if(kind==='chosen'){ctx.strokeStyle='#245f48';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(-1,3);ctx.lineTo(5,-4);ctx.stroke()}
  ctx.restore()
 }
 function specs(){return [...(save.ranch?.animals??[]).map((a,i)=>({kind:'animal',index:i,id:'animal:'+a.id,spec:catalog.animals.find(c=>c.id===a.kind),value:a})),...(!visitor?(save.pigs?.animals??[]).map(a=>({kind:'pig',index:a.id,id:'pig:'+a.id,spec:catalog.pigs.find(c=>c.id===a.kind),value:a})):[])]}
 function motionRecords(){return animals.map(a=>({id:a.id,type:a.kind==='pig'?'pig':animalType(a.spec.id),growth:a.kind==='pig'?Math.min(2,2*a.value.growth/a.spec.seconds):2,sold:false,dead:!!a.value.deadAt||now()>=a.value.fedUntil+172800}))}
 function rebuild(){
  animals=specs().filter(a=>a.spec)
  herd.sync(motionRecords())
  const own=save.ownedPlotCount??save.plots.length,cols=Math.min(10,Math.max(3,Math.ceil(Math.sqrt(own*1.4)))),rows=Math.ceil(own/cols)
  const top=292-(cols+rows-2)*11,rentCols=Math.min(cols,Math.max(2,Math.ceil(Math.sqrt(save.plots.length-own))))
  if(selection?.leaseId){const index=save.plots.findIndex(p=>p.leaseId===selection.leaseId);selection=index<0?null:{...selection,index}}
  entries=place==='home'?save.plots.map((p,i)=>{const n=i<own?i:i-own,u=i<own?n%cols:cols+.55+n%rentCols,v=Math.floor(n/(i<own?cols:rentCols));return {...plotTarget(save,i),x:390+(u-(cols-1)/2-v+(rows-1)/2)*44,y:top+(u+v)*22}}):animals.map(a=>({kind:a.kind,index:a.index}))
  if(place==='home'&&entries.length){fieldBounds={left:Math.min(...entries.map(e=>e.x))-45,right:Math.max(...entries.map(e=>e.x))+45,top:Math.min(...entries.map(e=>e.y))-66,bottom:Math.max(...entries.map(e=>e.y))+80};guardianAnchor={x:fieldBounds.left+44,y:fieldBounds.bottom-31}}
  keyboard.replaceChildren(...entries.map(e=>{const b=document.createElement('button');b.type='button';b.dataset.index=e.index;b.dataset.kind=e.kind;b.textContent=e.kind==='plot'?plotLabel(save.plots[e.index],e.index):animals.find(a=>a.kind===e.kind&&a.index===e.index)?.spec.name;b.onclick=()=>choose(e);return b}))
  signature=place+':'+save.plots.length+':'+plotIdentity(save)+':'+animals.map(a=>a.id).join(',');schedule()
 }
 function choose(target){if(target.kind==='guardian'){guardianMotion.trigger('greet',performance.now());onTarget({kind:'guardian',index:save.guardian?.id});schedule();return}selection=target.kind==='plot'?plotTarget(save,target.index):{kind:target.kind,index:target.index};onSelection(selection);onTarget(selection);schedule()}
 function positions(){return place==='home'?entries:herd.positions().map((p,i)=>({...p,...animals[i]}))}
 function transform(){
  const w=parent.clientWidth,h=parent.clientHeight,home=place==='home',bounds=home?fieldBounds:{left:75,right:665,top:135,bottom:495},sceneWidth=bounds.right-bounds.left,sceneHeight=bounds.bottom-bounds.top,spaceW=Math.max(1,w-32),spaceH=Math.max(1,h-68),centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2,s=Math.min(spaceW/sceneWidth,spaceH/sceneHeight,1.1)*zoom
  // A fitted scene stays centred. Panning only exposes the area that zooming
  // actually put outside the viewport, never a screenful of empty background.
  const limitX=Math.max(0,(sceneWidth*s-spaceW)/2),limitY=Math.max(0,(sceneHeight*s-spaceH)/2)
  pan.x=Math.max(-limitX,Math.min(limitX,pan.x));pan.y=Math.max(-limitY,Math.min(limitY,pan.y))
  view={s,x:w/2-centerX*s+pan.x,y:44+spaceH/2-centerY*s+pan.y};return {w,h}
 }
 function draw(t){
  raf=0;if(disposed||document.hidden||!visible)return
  const dt=last?Math.min(.05,(t-last)/1000):0;last=t
  const moving=place==='ranch'&&!reduced.matches&&animals.length>0
  const guardian=guardianStatus(save,now()),guardianMoving=!!guardian&&!reduced.matches
  if(moving)herd.step(dt)
  const {w,h}=transform(),dpr=Math.min(devicePixelRatio||1,1.35)
  if(!w||!h)return
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.setTransform(dpr*view.s,0,0,dpr*view.s,dpr*view.x,dpr*view.y)
  const time=now(),points=positions()
  if(place==='home'){
   for(const e of [...points].sort((a,b)=>a.y-b.y)){
    const p=save.plots[e.index],c=catalog.crops.find(c=>c.id===p.crop),active=selection?.kind==='plot'&&selection.index===e.index
    poly([[e.x-41,e.y],[e.x,e.y+21],[e.x+41,e.y],[e.x+41,e.y+5],[e.x,e.y+26],[e.x-41,e.y+5]],'#a18d72')
    poly([[e.x,e.y-21],[e.x+41,e.y],[e.x,e.y+21],[e.x-41,e.y]],plotLocked(p,time)?'#aab5a1':p.tilled?'#b7a286':'#bac9a0',active?'#f0db9c':p.leaseId?'#559785':'#c6b79c')
    if(c){
     const progress=cropProgress(p,c,time),art=blockCropArt(c.id,progress)
     sprite(art.url,art.rect,e.x,e.y+37,94)
     const status=plotLocked(p,time)?'lock':visitor?(p.visitSelected?'chosen':p.sneak?'sneak':p.visitStatus==='stealable'?'ripe':p.visitStatus==='dry'?'water':''):p.wateredAt===null?'water':progress===1?'ripe':cropHasPests(p,c,time)?'pest':''
     if(status)marker(status,e.x+27,e.y+9)
     if(active&&!status)label(clock(cropMatureAt(p,c)-time),e.x,e.y-32)
    }else if(plotLocked(p,time)){marker('lock',e.x,e.y);if(active)label(p.leaseId?'已到期':'出租中',e.x,e.y-25)}else if(active)label(p.leaseId?'租入 · 播种':p.tilled?'播种':'开垦',e.x,e.y)
    if(p.leaseId){rect(e.x-5,e.y+18,10,3,'#559785');if(e.index===(save.ownedPlotCount??save.plots.length))label('租入田地',e.x,e.y-28,'#376f60')}
   }
  }else{
   const corners=[[0,0],[PEN_SIZE,0],[PEN_SIZE,PEN_SIZE],[0,PEN_SIZE]].map(([u,v])=>project(u,v))
   poly(corners.map(p=>[p.x,p.y]),'#c4cfa7');for(let i=0;i<85;i++){const p=project(10+i*47%260,10+i*71%260);rect(p.x,p.y,3+i%4,2,i%3?'#bdc89f':'#d0d9b8')}
   fence(corners[3],corners[0]);fence(corners[0],corners[1])
   const food=project(145,22),ordered=points.map(p=>({y:p.y,paint:()=>drawAnimal(p,time)}))
   ordered.push({y:food.y,paint:()=>{poly([[food.x-26,food.y-14],[food.x+18,food.y-25],[food.x+30,food.y-14],[food.x-15,food.y-3]],'#c9bb91');poly([[food.x-15,food.y-3],[food.x+30,food.y-14],[food.x+30,food.y],[food.x-15,food.y+11]],'#aa9571')}})
   ordered.sort((a,b)=>a.y-b.y).forEach(o=>o.paint());fence(corners[1],corners[2]);fence(corners[2],corners[3])
   if(!points.length)label(visitor?'牧场暂时没有动物':'在动物小铺领养第一只动物',370,310)
  }
  guardianTarget=null
  if(guardian){const def=catalog.guardians?.find(g=>g.id===guardian.id);if(def){const pose=guardianMotion.sample(t,reduced.matches),x=(place==='home'?guardianAnchor.x:120)+pose.offset,y=place==='home'?guardianAnchor.y:385,width=Math.min(104,Math.max(76,46/view.s)),height=width*1.25,url=guardianSheet(def.id);ctx.fillStyle='#5f705125';ctx.beginPath();ctx.ellipse(x,y,width*.26,5,0,0,Math.PI*2);ctx.fill();sprite(url,[(pose.frame%4)*128,Math.floor(pose.frame/4)*160,128,160],x,y,width,pose.facing);guardianTarget={kind:'guardian',index:def.id,x,y,width,height};if(guardian.protected){ctx.strokeStyle='#81b8dba6';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y-3,width*.42,9,0,0,Math.PI*2);ctx.stroke()}label(guardian.protected?'守护中':def.name,x,y+19)}}
  effects=effects.filter(e=>t-e.at<800);for(const e of effects){const age=(t-e.at)/800;ctx.globalAlpha=1-age;label(e.text,e.x,e.y-20-age*18);ctx.globalAlpha=1}
  if(moving||guardianMoving||effects.length)schedule()
 }
 function drawAnimal(p,time){
  const {spec:a,value:v}=p,active=selection?.kind===p.kind&&selection.index===p.index
  const dead=!!v.deadAt||time>=v.fedUntil+172800
  const dirt=p.kind==='pig'?pigStatus(v,a,time).manure:ranchAnimalStatus(v,a,time,catalog.ranch.capacity,catalog.ranch.starvationSeconds).manure
  if(dirt){rect(p.x-p.radius-8,p.y+3,6,3,'#988468');rect(p.x-p.radius-6,p.y+1,3,3,'#ad9574');if(dirt>3)rect(p.x-p.radius-2,p.y+6,5,3,'#988468')}
  ctx.fillStyle=active?'#e2d19f88':'#5f705125';ctx.beginPath();ctx.ellipse(p.x,p.y+2,p.radius*1.4,p.radius*.6,0,0,Math.PI*2);ctx.fill()
  const base=p.kind==='pig'?'pig':a.id,basic={cow:0,chicken:1,sheep:2,pig:3}[base],step=p.moving&&!reduced.matches&&!dead?Math.floor(p.distance/3)%4:0
  ctx.globalAlpha=dead?.45:1
  if(basic!==undefined){const bounds=[[80,250],[395,223],[650,265],[955,240]][basic],size=base==='chicken'?41:base==='pig'?40+14*Math.min(1,v.growth/a.seconds):62;sprite(root+'animals-walk.png',[step*320,bounds[0],320,bounds[1]],p.x,p.y+5,size,p.facing)}
  else{const art=farmArt(a.frame,true),bob=p.moving&&!reduced.matches&&!dead?Math.sin(p.distance*.6)*.8:0;sprite(art.url,art.rect,p.x,p.y+3+bob,55,p.facing,p.moving&&!dead&&!reduced.matches?Math.sin(p.distance*.3)*.018:0)}
  ctx.globalAlpha=1
  const ready=p.kind==='pig'?v.growth+Math.max(0,Math.min(time,v.fedUntil)-v.updatedAt)>=a.seconds:ranchAnimalStatus(v,a,time,catalog.ranch.capacity,catalog.ranch.starvationSeconds).stored>0
  const status=visitor?(v.visitSelected?'chosen':v.sneak?'sneak':v.status==='stealable'?'product':''):ready?(p.kind==='pig'?'ripe':'product'):dead?'remove':v.fedUntil<=time?'feed':''
  if(status)marker(status,p.x+p.radius+7,p.y+2)
 }
 function schedule(){if(!disposed&&!raf&&!document.hidden&&visible)raf=requestAnimationFrame(draw)}
 function hit(clientX,clientY){const b=canvas.getBoundingClientRect(),x=(clientX-b.left-view.x)/view.s,y=(clientY-b.top-view.y)/view.s
  if(guardianTarget&&Math.abs(x-guardianTarget.x)<guardianTarget.width*.4&&y>guardianTarget.y-guardianTarget.height&&y<guardianTarget.y+5)return guardianTarget
  return [...positions()].sort((a,b)=>b.y-a.y).find(p=>place==='home'?Math.abs(x-p.x)/41+Math.abs(y-p.y)/21<=1.12:Math.abs(x-p.x)<p.radius*2.2&&y>p.y-p.radius*3.5&&y<p.y+8)
 }
 const detach=bindFarmPointer(canvas,{hit,onClick:choose,onBrushStart:()=>{brush=[]},onBrush:t=>{if(t.kind!=='guardian')brush.push(t.kind==='plot'?plotTarget(save,t.index):{kind:t.kind,index:t.index})},onBrushEnd:cancelled=>{if(!cancelled&&brush.length)onBrush(brush);brush=[]}});clean.push(detach)
 function cameraButton(label,text,fn){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.textContent=text;b.onclick=fn;controls.append(b)}
 cameraButton('恢复默认斜俯视','⌂',()=>{zoom=1;pan={x:0,y:0};schedule()});cameraButton('放大场景','＋',()=>{zoom=Math.min(2.6,zoom*1.2);schedule()});cameraButton('缩小场景','−',()=>{zoom=Math.max(.7,zoom/1.2);schedule()})
 const context=e=>e.preventDefault()
 // Keep client origin separate from camera offsets.
 const panDown=e=>{if(e.button===2){panDrag={id:e.pointerId,cx:e.clientX,cy:e.clientY,px:pan.x,py:pan.y};canvas.setPointerCapture(e.pointerId)}},panMove=e=>{if(panDrag?.id===e.pointerId){pan={x:Math.max(-parent.clientWidth,Math.min(parent.clientWidth,panDrag.px+e.clientX-panDrag.cx)),y:Math.max(-parent.clientHeight,Math.min(parent.clientHeight,panDrag.py+e.clientY-panDrag.cy))};schedule()}},up=()=>{panDrag=null}
 for(const [event,fn] of [['contextmenu',context],['pointerdown',panDown],['pointermove',panMove],['pointerup',up],['pointercancel',up]]){canvas.addEventListener(event,fn);clean.push(()=>canvas.removeEventListener(event,fn))}
 let previousSize={w:parent.clientWidth,h:parent.clientHeight}
 const resize=new ResizeObserver(()=>{const w=parent.clientWidth,h=parent.clientHeight;if(previousSize.w&&previousSize.h&&(Math.abs(w/previousSize.w-1)>.15||Math.abs(w/h-previousSize.w/previousSize.h)>.2)){zoom=1;pan={x:0,y:0}}previousSize={w,h};schedule()});resize.observe(parent);clean.push(()=>resize.disconnect())
 const visibleObserver=new IntersectionObserver(([e])=>{visible=e.isIntersecting;last=0;if(!visible){cancelAnimationFrame(raf);raf=0}else schedule()});visibleObserver.observe(parent);clean.push(()=>visibleObserver.disconnect())
 const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0}else schedule()};document.addEventListener('visibilitychange',visibility);clean.push(()=>document.removeEventListener('visibilitychange',visibility))
 reduced.addEventListener('change',visibility);clean.push(()=>reduced.removeEventListener('change',visibility))
 rebuild();onPlace(place)
 const ready=Promise.all([...new Set(save.plots.filter(p=>p.crop).map(p=>blockCropArt(p.crop).url))].map(url=>load(url))).then(()=>schedule())
 return {ready,renderer:'pixel',updateState(next){const changed=save!==next;save=next;if(changed){const key=place+':'+save.plots.length+':'+plotIdentity(save)+':'+specs().filter(a=>a.spec).map(a=>a.id).join(',');if(key!==signature)rebuild();else{animals=specs().filter(a=>a.spec);herd.sync(motionRecords())}}else if(place==='ranch')herd.sync(motionRecords());schedule()},
  feedback(actions){const t=performance.now();for(const a of actions){if(a.type==='guardian_skill')guardianMotion.trigger(a.skill,t);else if(a.type==='guardian_select')guardianMotion.trigger('greet',t);const kind=a.plot!==undefined?'plot':a.animal!==undefined?'animal':a.pig!==undefined?'pig':null,index=a.plot??a.animal??a.pig,p=positions().find(p=>p.kind===kind&&p.index===index);if(p){effects.push({x:p.x,y:p.y,at:t,text:a.type==='sneak_failed'?'被发现':/harvest|collect|steal/.test(a.type)?'入仓 ✓':a.type==='pest'?'✧':'✓'});if(a.type==='animal_feed'||a.type==='pig_feed'||a.type==='pig_feed_stock'){const i=animals.findIndex(e=>e.kind===kind&&e.index===index);if(i>=0)herd.gather(i)}}}effects=effects.slice(-12);schedule()},
  select(kind,index){const p=positions().find(e=>e.kind===kind&&e.index===index);if(p)choose(p)},getPlace:()=>place,
  getTargetRect(kind,index){const p=kind==='guardian'?guardianTarget:positions().find(e=>e.kind===kind&&e.index===index);if(!p)return;const b=canvas.getBoundingClientRect(),width=kind==='guardian'?p.width:kind==='plot'?82:62,height=kind==='guardian'?p.height:kind==='plot'?95:70,bottom=kind==='plot'?26:5;return {x:b.x+view.x+(p.x-width/2)*view.s,y:b.y+view.y+(p.y-height+bottom)*view.s,width:width*view.s,height:height*view.s}},
  travel(destination){const next=destination??(place==='home'?'ranch':'home');if(!['home','ranch'].includes(next)||next===place)return;place=next;selection=null;last=0;zoom=1;pan={x:0,y:0};rebuild();if(place==='ranch')void load(root+'animals-walk.png').catch(()=>{});onPlace(place)},
  destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clean.forEach(fn=>fn());for(const a of atlases.values())a.image?.close?.();atlases.clear();canvas.width=canvas.height=1;canvas.remove();background.remove();controls.remove();keyboard.remove();parent.classList.remove('farm-pixel');entries=[];animals=[];effects=[];herd=createHerd([])}
 }
}
