import {plotTarget,plotIdentity,plotLabel,plotLocked} from './farm-plot-view.js?v=98ddcc7d'
import {cropMatureAt,cropHasPests,cropProgress} from './farm-crop-care.js?v=98ddcc7d'
import * as T from '/assets/farm/three-0.186.1/three.module.js'
import {OrbitControls} from '/assets/farm/three-0.186.1/OrbitControls.js'
import {createModelKit} from './farm-voxel-models.js?v=98ddcc7d'
import {bindFarmPointer} from './farm-pointer.js?v=98ddcc7d'
import {ranchAnimalStatus} from './farm-ranch.js?v=98ddcc7d'
import {animalPose,productMotion} from './farm-motion.js?v=98ddcc7d'
import {newRanchWalker,advanceRanchWalker} from './farm-roaming.js?v=98ddcc7d'

const clock=n=>n<60?Math.max(1,Math.ceil(n))+'秒':n<3600?Math.ceil(n/60)+'分':Math.ceil(n/3600)+'小时'
export async function createVoxelFarmWorld(parent,{state,catalog,now,onTarget,onPlace,onSelection=()=>{},onBrush=()=>{},visitor=false,characters=[]}){
 if(!parent.isConnected)return null
 let save=state,place='home',page=0,selection=null,signature='',disposed=false,frame=0,last=0,elapsed=0,brush=[],entities=[],hits=[],fx=[]
 const cleanup=[]
 function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);for(const fn of cleanup.reverse()){try{fn()}catch{}}entities=[];hits=[];fx=[];brush=[]}
 try{
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false})
 cleanup.push(()=>{renderer.dispose();renderer.forceContextLoss()})
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),kit=createModelKit();cleanup.push(()=>kit.dispose())
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xc3d4a1);renderer.outputColorSpace=T.SRGBColorSpace
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
 const canvas=renderer.domElement;canvas.className='farm-voxel-canvas';canvas.setAttribute('aria-label','左键按住划过照料，右键拖动旋转，滚轮缩放；触屏单指旋转、双指缩放')
 parent.classList.add('farm-voxel');parent.append(canvas)
 cleanup.push(()=>{canvas.remove();parent.classList.remove('farm-voxel')})
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-12,12,9,-9,.1,100)
 cleanup.push(()=>{scene.traverse(m=>{m.geometry?.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose()});scene.clear()})
 const targetMaterial=new T.MeshBasicMaterial({visible:false})
 cleanup.push(()=>targetMaterial.dispose())
 const controls=new OrbitControls(camera,canvas);controls.enablePan=true;controls.screenSpacePanning=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minPolarAngle=.2;controls.maxPolarAngle=1.1;controls.minZoom=.7;controls.maxZoom=4
 cleanup.push(()=>controls.dispose())
 controls.mouseButtons.LEFT=-1;controls.mouseButtons.RIGHT=T.MOUSE.ROTATE;controls.mouseButtons.MIDDLE=T.MOUSE.DOLLY
 const light=new T.DirectionalLight(0xffedcd,2.3);light.position.set(-8,18,10);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-18,right:18,top:18,bottom:-18});light.shadow.normalBias=.04
 cleanup.push(()=>light.shadow.dispose())
 scene.add(light,new T.HemisphereLight(0xfffae8,0x798854,2.1))
 const ground=new T.Group(),objects=new T.Group();scene.add(ground,objects)
 const labels=document.createElement('div');labels.className='farm-voxel-labels';parent.append(labels)
 cleanup.push(()=>labels.remove())
 const keyboard=document.createElement('div');keyboard.className='farm-voxel-keyboard';keyboard.setAttribute('aria-label','田地与动物快捷操作');parent.append(keyboard)
 cleanup.push(()=>keyboard.remove())
 const hud=document.createElement('nav');hud.className='farm-voxel-camera';hud.setAttribute('aria-label','场景镜头')
 cleanup.push(()=>hud.remove())
 function button(label,text,fn){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.textContent=text;b.onclick=fn;hud.append(b);return b}
 button('恢复默认斜俯视','⌂',resetCamera);button('放大场景','＋',()=>zoom(1.2));button('缩小场景','−',()=>zoom(1/1.2));button('旋转场景','↻',()=>{const p=camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4);camera.position.copy(controls.target).add(p);controls.update()})
 const pages=document.createElement('span');hud.append(pages)
 const prev=button('上一个田区','‹',()=>changePage(-1)),next=button('下一个田区','›',()=>changePage(1));parent.append(hud)
 const cursor=new T.Mesh(new T.RingGeometry(.8,.86,4,1,Math.PI/4),new T.MeshBasicMaterial({color:0xffe5a2,side:T.DoubleSide,depthWrite:false}));cursor.rotation.x=-Math.PI/2;cursor.visible=false;scene.add(cursor)
 const ray=new T.Raycaster(),pointer=new T.Vector2()
 function hit(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera)
  const result=ray.intersectObjects(hits,true)[0];return result?{...result.object.userData}:null}
 function choose(target){selection=target;onSelection(target);highlight();const e=entities.find(e=>e.kind===target.kind&&e.index===target.index);if(e)e.reaction=1;onTarget(target)}
 const unbind=bindFarmPointer(canvas,{hit,onClick:choose,onBrushStart(){brush=[]},
  onBrush(target){if(target.kind==='character')return;brush.push(target);const e=entities.find(e=>e.kind===target.kind&&e.index===target.index);e?.label.classList.add('is-brushed')},
  onBrushEnd(cancelled){entities.forEach(e=>e.label.classList.remove('is-brushed'));const targets=brush;brush=[];if(!cancelled&&targets.length)onBrush(targets)}})
 cleanup.push(unbind)
 // Only the active district owns meshes and DOM labels; expanding storage does not multiply rendering memory.
 function compact(){return parent.clientWidth<600}
 function pageSize(){return place==='home'?(compact()?12:24):(compact()?6:12)}
 function total(){return place==='home'?save.plots.length:save.ranch?.animals.length??0}
 function changePage(delta){page=Math.max(0,Math.min(Math.ceil(total()/pageSize())-1,page+delta));rebuild()}
 function free(group){group.traverse(m=>{if(m.isMesh&&m.geometry!==kit.sharedGeometry)m.geometry.dispose();if(m.isSprite)m.material.dispose()});group.clear()}
 function rebuild(){
  clearParticles()
  free(ground);free(objects);labels.replaceChildren();keyboard.replaceChildren();entities=[];hits=[];selection=null;cursor.visible=false
  const small=compact(),size=pageSize();page=Math.max(0,Math.min(page,Math.ceil(total()/size)-1));const offset=page*size,count=Math.min(size,total()-offset),cols=Math.min(8,Math.max(3,Math.ceil(Math.sqrt(count*1.5)))),rows=Math.max(2,Math.ceil(count/cols))
  const pitchX=place==='home'?3.02:3.8,pitchZ=place==='home'?2.8:3.8
  const width=cols*pitchX+1.4,depth=rows*pitchZ+1.4+(place==='ranch'&&characters.length?3:0)
  kit.box(ground,0,-.12,0,width,.24,depth,0x93b66b);kit.box(ground,0,-.27,0,width+.08,.06,depth+.08,0x8b704e)
  if(place==='ranch'){
   kit.box(ground,-width*.22,.005,0,width*.43,.02,depth-1.6,0xc8b17b)
   for(const z of [-depth/2+.35,depth/2-.35]){
    kit.box(ground,0,.45,z,width-.5,.12,.12,0xb0905c);kit.box(ground,0,.8,z,width-.5,.12,.12,0xb0905c)
    for(let x=-width/2+.4;x<width/2;x+=1.5)kit.box(ground,x,.47,z,.17,.96,.17,0x947747)
   }
   for(const x of [-width/2+.35,width/2-.35]){
    for(const y of [.45,.8])kit.box(ground,x,y,0,.12,.12,depth-.5,0xb0905c)
    for(let z=-depth/2+.4;z<depth/2;z+=1.5)kit.box(ground,x,.47,z,.17,.96,.17,0x947747)
   }
   kit.box(ground,0,.18,-depth/2+1,width*.4,.32,.65,0xb08850);kit.box(ground,0,.36,-depth/2+1,width*.4-.2,.05,.45,0xe0bd63)
  }
  kit.merge(ground)
  for(let j=0;j<count;j++){
   const index=offset+j,kind=place==='home'?'plot':'animal',x=(j%cols-(cols-1)/2)*pitchX,z=(Math.floor(j/cols)-(rows-1)/2)*pitchZ
   const root=new T.Group();root.position.set(x,0,z);objects.add(root)
   const visual=new T.Group();root.add(visual)
   if(kind==='plot'){kit.box(root,0,.02,0,2.94,.12,2.7,0x98784e);for(const dz of [-.8,0,.8])kit.box(root,0,.09,dz,2.75,.04,.12,0x80603e)}
   const target=new T.Mesh(new T.BoxGeometry(kind==='plot'?2.94:2.2,kind==='plot'?1:2.5,kind==='plot'?2.7:2.2),targetMaterial);target.position.y=kind==='plot'?.5:1;target.userData=kind==='plot'?plotTarget(save,index):{kind,index};root.add(target);hits.push(target)
   const label=document.createElement('span');label.className='farm-voxel-status';labels.append(label)
   const key=document.createElement('button');key.type='button';key.dataset.kind=kind;key.dataset.index=index;key.onclick=()=>choose(target.userData);key.onfocus=()=>{selection=target.userData;onSelection(selection);highlight()};keyboard.append(key)
   const products=new T.Group();root.add(products)
   entities.push({kind,index,root,visual,products,target,label,key,anchor:{x,z},walker:newRanchWalker(index),cache:null,animal:null,productCount:-1,reaction:0})
  }
  if(place==='ranch'&&characters.length)characters.forEach((c,i)=>addCharacter(c,(i-(characters.length-1)/2)*2.1,depth/2-1.3))
  prev.hidden=next.hidden=pages.hidden=total()<=size;prev.disabled=page===0;next.disabled=(page+1)*size>=total();pages.textContent=`${place==='home'?'田区':'牧区'} ${page+1}/${Math.max(1,Math.ceil(total()/size))} · ${offset+1}–${offset+count}`
  signature=[place,total(),small,page,plotIdentity(save)].join(':');scene.userData.extent={width,depth};refresh();resetCamera()
  selection=count?(place==='home'?plotTarget(save,offset):{kind:'animal',index:offset}):null;highlight();onSelection(selection)
 }
 const characterTextures=new Map()
 cleanup.push(()=>{characterTextures.forEach(t=>t.dispose());characterTextures.clear()})
 function addCharacter(c,x,z){
  let texture=characterTextures.get(c.id)
  if(!texture){texture=new T.TextureLoader().load(c.url,()=>{if(disposed){texture.dispose();return}objects.children.filter(o=>o.userData.character===c.id).forEach(o=>o.visible=true)},undefined,()=>{});texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;characterTextures.set(c.id,texture)}
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,alphaTest:.25,depthWrite:true}));sprite.visible=!!texture.image;sprite.position.set(x,1.25,z);sprite.scale.set(2.2,2.7,1);sprite.userData={kind:'character',index:c.id,character:c.id};objects.add(sprite);hits.push(sprite)
  const key=document.createElement('button');key.type='button';key.textContent=c.name;key.onclick=()=>onTarget({kind:'character',index:c.id,name:c.name});keyboard.append(key)
 }
 function refresh(){
  const t=now()
  for(const e of entities){
   let name,label='',cache
   if(e.kind==='plot'){
    const p=save.plots[e.index],c=catalog.crops.find(c=>c.id===p.crop),progress=c?cropProgress(p,c,t):0
    name=plotLabel(p,e.index)+` ${c?.name||'空地'}`
    label=visitor?(p.visitSelected?'✓':p.sneak?'◇':p.visitStatus==='stealable'?'✧':p.visitStatus==='dry'?'浇水':''):c?(p.wateredAt===null?'浇水':progress>=1?'✧':cropHasPests(p,c,t)?'驱虫':clock(cropMatureAt(p,c)-t)):p.tilled?'播种':'开垦'
    if(!visitor&&plotLocked(p,t))label=p.leaseId?'已到期':'已出租'
    e.available=visitor?!!p.sneak||['stealable','dry'].includes(p.visitStatus):!plotLocked(p,t)&&!!c&&(p.wateredAt===null||progress>=1||cropHasPests(p,c,t))
    cache=[p.crop,progress<.3?0:progress<.7?1:2,p.tilled].join(':')
    if(cache!==e.cache){free(e.visual);if(c)e.visual.add(kit.crop(c.id,progress));else if(!p.tilled)kit.box(e.visual,0,.15,0,2.9,.15,2.65,0x8cab60);e.cache=cache}
   }else{
    const a=save.ranch.animals[e.index],spec=catalog.animals.find(c=>c.id===a.kind),s=ranchAnimalStatus(a,spec,t,catalog.ranch.capacity,catalog.ranch.starvationSeconds);name=`动物 ${e.index+1} ${spec.name}`
    label=visitor?(a.visitSelected?'✓':a.sneak?'◇':a.status==='stealable'?'🧺 1':''):s.stored?`🧺 ${s.stored}`:s.dead?'已死亡':s.hungry?'添粮':clock(s.nextAt-t)
    e.available=visitor?!!a.sneak||a.status==='stealable':s.stored>0||s.hungry&&!s.dead
    e.label.title=s.stored?`${spec.product} ×${s.stored}`:name
    cache=a.kind
    if(cache!==e.cache){free(e.visual);e.animal=kit.animal(a.kind);e.visual.add(e.animal.root);e.cache=cache}
    e.dead=s.dead;e.hungry=s.hungry;e.visual.rotation.z=s.dead?Math.PI/2:0;e.visual.position.y=s.dead?.65:0
    // Stored produce remains visible even after death, matching the ranch rules.
    const shown=visitor?(a.status==='stealable'?1:0):Math.min(3,s.stored)
    if(shown!==e.productCount){free(e.products);for(let n=0;n<shown;n++){
     const p=kit.product(a.kind);p.position.set(.75+(n%2)*.2,.16+n*.14,.45);e.products.add(p)
    }e.productCount=shown}
   }
   e.label.textContent=label;e.label.hidden=!label;e.key.textContent=name+(label?'，'+label:'');e.key.setAttribute('aria-pressed',String(selection?.kind===e.kind&&selection.index===e.index))
  }
 }
 function highlight(){const e=entities.find(e=>selection?.kind===e.kind&&selection.index===e.index);cursor.visible=!!e;if(e){cursor.position.set(e.root.position.x,.2,e.root.position.z);cursor.scale.setScalar(e.kind==='plot'?1.9:1.3)}}
 function resetCamera(){controls.target.set(0,.5,0);camera.position.set(18,18.5,18);camera.zoom=1;controls.update();resize()}
 function zoom(f){camera.zoom=T.MathUtils.clamp(camera.zoom*f,.7,4);camera.updateProjectionMatrix()}
 function resize(){const w=parent.clientWidth,h=parent.clientHeight;if(!w||!h)return
  const extent=scene.userData.extent||{width:12,depth:9},ratio=w/h;camera.updateMatrixWorld()
  let half=1
  for(const x of [-extent.width/2,extent.width/2])for(const z of [-extent.depth/2,extent.depth/2])for(const y of [0,2.7]){
   const p=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);half=Math.max(half,Math.abs(p.y),Math.abs(p.x)/ratio)}
  half*=1.07
  camera.left=-half*ratio;camera.right=half*ratio;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h)
  if(signature&&signature!==[place,total(),compact(),page,plotIdentity(save)].join(':'))rebuild()}
 function project(e){const v=e.root.position.clone();v.y=e.kind==='plot'?1.05:2.1;v.project(camera);return {x:(v.x+1)*parent.clientWidth/2,y:(1-v.y)*parent.clientHeight/2}}
 const particles=[]
 function clearParticles(){for(const p of particles)scene.remove(p.mesh);particles.length=0}
 function burst(e,type){
  if(reduced.matches)return
  const color=type==='water'?0x86cde8:type==='animal_feed'?0xe6c77d:0xffdc70
  for(let n=0;n<6;n++){const mesh=kit.box(scene,e.root.position.x,.6,e.root.position.z,.07,.07,.07,color);mesh.castShadow=false
   particles.push({mesh,age:0,x:e.root.position.x,z:e.root.position.z,angle:n*Math.PI/3,type})}
 }
 function draw(t){frame=0;if(disposed||document.hidden)return;const dt=last?Math.min(.05,(t-last)/1000):0;last=t;elapsed+=dt;controls.update()
  const pixelsPerCell=parent.clientWidth/(camera.right-camera.left)*camera.zoom*2.4
  for(const e of entities){
   if(e.animal){const w=advanceRanchWalker(e.walker,e.index,dt,e.dead||e.hungry||reduced.matches||e.reaction>0);e.root.position.set(e.anchor.x+w.x,0,e.anchor.z+w.z)}
   const p=project(e);e.label.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`
   const overview=pixelsPerCell<42&&!(selection?.kind===e.kind&&selection.index===e.index)
   e.label.classList.toggle('is-overview',overview);e.label.classList.toggle('is-available',!!e.available)
   e.reaction=Math.max(0,e.reaction-dt)
   if(e.animal){
    const pose=animalPose(elapsed,e.index,{dead:e.dead,hungry:e.hungry,reduced:reduced.matches,reaction:e.reaction})
    e.animal.head.rotation.x=pose.head;e.animal.tail.rotation.y=pose.tail
    const stride=e.walker.moving?Math.sin(elapsed*8+e.index)*.3:0
    e.visual.position.set(0,e.dead?.65:pose.y,0);e.visual.rotation.y=e.walker.yaw
    e.animal.legs.forEach((leg,i)=>leg.rotation.x=stride*(i%2?1:-1))
    const flying=['bat','moth','whale','fish'].includes(e.animal.form),moving=!e.dead&&!reduced.matches
    e.animal.wings.forEach(wing=>wing.rotation.z=moving?Math.sin(elapsed*(flying?5:1.5)+e.index)*wing.userData.side*(flying?.35:.08):0)
    if(flying&&!e.dead)e.visual.position.y+=.35+(moving?Math.sin(elapsed*1.4+e.index)*.09:0)
    if(e.animal.form==='rabbit'&&moving&&stride)e.visual.position.y+=Math.abs(stride)*.25
   }else{e.visual.rotation.z=reduced.matches?0:Math.sin(elapsed*.9+e.index)*.018}
   const product=productMotion(elapsed,e.index,reduced.matches);e.products.position.y=product.lift;e.products.scale.setScalar(product.scale)
  }
  if(selection)highlight()
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=.85||reduced.matches){scene.remove(p.mesh);particles.splice(i,1);continue}
   const v=p.age/.85;p.mesh.position.set(p.x+Math.cos(p.angle)*v*.7,.5+Math.sin(v*Math.PI)*.9,p.z+Math.sin(p.angle)*v*.7);p.mesh.scale.setScalar(.07*(1-v));p.mesh.rotation.x+=dt*3}
  fx=fx.filter(f=>{f.life-=dt;if(f.life<=0){f.node.remove();return false}f.node.style.opacity=String(Math.min(1,f.life));return true})
  renderer.render(scene,camera);frame=requestAnimationFrame(draw)}
 function start(){if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(draw)}
 const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0}else start()}
 document.addEventListener('visibilitychange',visibility);cleanup.push(()=>document.removeEventListener('visibilitychange',visibility))
 const observer=new ResizeObserver(resize);cleanup.push(()=>observer.disconnect());observer.observe(parent);rebuild();start()
 return {ready:Promise.resolve(),
  updateState(nextState){save=nextState;const maxPage=Math.max(0,Math.ceil(total()/pageSize())-1);page=Math.min(page,maxPage);if(signature!==[place,total(),compact(),page,plotIdentity(save)].join(':'))rebuild();else refresh()},
  select(kind,index){if(Number.isInteger(index)&&index>=0&&index<total()){const targetPage=Math.floor(index/pageSize());if(targetPage!==page){page=targetPage;rebuild()}}const e=entities.find(e=>e.kind===kind&&e.index===index);if(e){const delta=e.root.position.clone().sub(controls.target);controls.target.add(delta);camera.position.add(delta);choose(e.target.userData)}},
  getPlace:()=>place,travel(destination){const nextPlace=destination??(place==='home'?'ranch':'home');if(!['home','ranch'].includes(nextPlace)||nextPlace===place)return;place=nextPlace;page=0;rebuild();onPlace(place)},
  getTargetRect(kind,index){const e=entities.find(e=>e.kind===kind&&e.index===index);if(!e)return;const p=project(e),r=parent.getBoundingClientRect();return {x:r.x+p.x-25,y:r.y+p.y,width:50,height:50}},
  feedback(actions){if(document.hidden)return;for(const a of actions){const e=entities.find(e=>e.kind===(a.plot!==undefined?'plot':'animal')&&e.index===(a.plot??a.animal));if(!e)continue;e.reaction=1;if(a.type!=='sneak_failed')burst(e,a.type);const p=project(e),node=document.createElement('span');node.className='farm-voxel-feedback';node.textContent=({sneak_failed:'被发现',water:'💧',plant:'🌱',till:'✓',harvest:'收成入仓',steal:'收成入仓',animal_steal:'畜产入仓',animal_collect:'畜产入仓',animal_feed:'添粮 ✓'})[a.type]||'＋1';node.style.left=p.x+'px';node.style.top=p.y+'px';labels.append(node);fx.push({node,life:1.2})}},
  destroy
 }
 }catch(error){destroy();throw error}
}
