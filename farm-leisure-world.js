import * as T from '/assets/farm/three-0.186.1/three.module.js'
import {OrbitControls} from '/assets/farm/three-0.186.1/OrbitControls.js'
import {createModelKit} from '/farm-voxel-models.js?v=c8639d55'

export function createLeisureWorld(host,{onPond,onPig}){
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setClearColor('#c7d7a1');host.append(renderer.domElement)
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,80),controls=new OrbitControls(camera,renderer.domElement),kit=createModelKit(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),ray=new T.Raycaster(),point=new T.Vector2()
 scene.add(new T.HemisphereLight(0xfff9e3,0x849469,2.4));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(-6,12,9);scene.add(sun)
 controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.8;controls.maxZoom=1.8;controls.minPolarAngle=.3;controls.maxPolarAngle=1.2;controls.mouseButtons={LEFT:null,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE}
 controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=T.TOUCH.DOLLY_PAN
 let mode='pond',group=null,targets=[],animals=[],fishes=[],rod=[],line=null,bobber=null,ripple=null,frame=0,disposed=false,lastState=null,snapshot=null,down=null,lastDraw=0,castId=null,castStart=0
 const base=new T.Vector3(3.7,1.05,3.05),tip=new T.Vector3(2.5,2.7,1.55),landing=new T.Vector3(.3,.26,-.2),axis=new T.Vector3(0,1,0)
 function release(g){if(!g)return;const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry&&o.geometry!==kit.sharedGeometry)geos.add(o.geometry);if(o.material&&o.userData.privateMaterial)mats.add(o.material)});geos.forEach(x=>x.dispose());mats.forEach(x=>x.dispose());scene.remove(g)}
 function block(g,x,y,z,w,h,d,color){return kit.box(g,x,y,z,w,h,d,color)}
 function pond(){
  block(group,0,-.22,0,10,.4,8,0x91ae72);block(group,0,.01,0,8,.15,6,0x509caf)
  for(const z of [-3.15,3.15])block(group,0,.15,z,8.4,.2,.35,0xaca981)
  for(const x of [-4.15,4.15])block(group,x,.15,0,.35,.2,6.7,0xaca981)
  for(let n=0;n<6;n++)block(group,3.6,.43,1.5+n*.4,2.1,.18,.35,0xc49d69)
  for(const x of [2.6,4.6])for(const z of [1.3,3.7])block(group,x,.4,z,.17,.9,.17,0x98784e)
  block(group,3.7,.7,3.05,.2,.7,.2,0x946e43);kit.merge(group)
  const water=block(group,0,.18,0,8,.04,6,0x65adba);water.userData.pond=true;targets.push(water)
  rod=[];for(let i=0;i<6;i++)rod.push(block(group,0,0,0,.07-i*.006,1,.07-i*.006,i%2?0xaa8355:0x805e3e))
  line=new T.Line(new T.BufferGeometry().setFromPoints([tip,landing]),new T.LineBasicMaterial({color:0xfff8e3}));line.userData.privateMaterial=true;group.add(line)
  bobber=new T.Group();block(bobber,0,0,0,.15,.2,.15,0xfff5dd);block(bobber,0,.09,0,.16,.09,.16,0xdb6859);group.add(bobber)
  ripple=new T.Mesh(new T.RingGeometry(.2,.23,20),new T.MeshBasicMaterial({color:0xe9f7dc,transparent:true,side:T.DoubleSide}));ripple.userData.privateMaterial=true;ripple.rotation.x=-Math.PI/2;group.add(ripple)
  fishes=[];for(let i=0;i<5;i++){const fish=new T.Group(),color=[0xd6ac65,0x367a8a,0x91bdaf,0xcb8e83,0x67859c][i];block(fish,0,0,0,.28,.15,.65,color);block(fish,0,0,-.4,.43,.1,.18,color);block(fish,.08,.03,.29,.035,.04,.04,0x294f55);kit.merge(fish);group.add(fish);fishes.push(fish)}
 }
 function pigModel(color){
  const root=new T.Group(),body=new T.Group(),head=new T.Group(),legs=[],tail=new T.Group();root.add(body)
  // Rounded voxel silhouette: wide back, short legs, folded ears, distinct snout.
  block(body,0,.66,0,1.05,.7,1.4,color);block(body,0,1.04,0,.82,.13,1.12,color);head.position.set(0,.78,.7);body.add(head)
  block(head,0,0,0,.75,.55,.6,color);block(head,0,-.1,.36,.4,.22,.16,0xd99298)
  for(const s of [-1,1]){block(head,s*.23,.07,.31,.07,.085,.02,0x45464a);block(head,s*.09,-.09,.45,.05,.05,.025,0x905d66);const ear=block(head,s*.3,.31,-.03,.21,.3,.18,color);ear.rotation.z=-s*.35}
  for(const x of [-.33,.33])for(const z of [-.42,.42]){const leg=new T.Group();leg.position.set(x,.33,z);block(leg,0,-.1,0,.22,.27,.22,color);block(leg,0,-.23,.03,.22,.07,.25,0x765e5e);body.add(leg);legs.push(leg)}
  tail.position.set(0,.78,-.77);block(tail,0,0,0,.08,.2,.08,color);block(tail,.07,.1,0,.2,.07,.08,color);body.add(tail);kit.merge(head);kit.merge(body);return {root,body,head,legs,tail}
 }
 function pigpen(){
  block(group,0,-.12,0,10,.2,7.5,0x9dbb7b)
  for(let i=0;i<6;i++){
   const x=(i%3-1)*3.1,z=(Math.floor(i/3)-.5)*3.2
   const floor=block(group,x,.03,z,2.85,.12,2.9,0xc7ab7b);floor.userData.slot=i;targets.push(floor)
   for(const dx of [-1.43,1.43]){block(group,x+dx,.5,z,.08,.7,2.9,0xb18a56);for(const dz of [-1.4,1.4])block(group,x+dx,.6,z+dz,.16,1.1,.16,0xa27b4b)}
   block(group,x,.5,z-1.4,2.9,.09,.1,0xc49c66);block(group,x,.2,z+1.1,.85,.22,.45,0x8b7960)
   const p=snapshot?.state.pigs.animals[i];if(!p)continue
   const spec=snapshot.catalog.pigs.find(a=>a.id===p.kind),m=pigModel(spec.color);m.root.position.set(x,0,z);m.root.userData.pig=p.id;group.add(m.root);targets.push(m.root);animals.push({...m,pig:p,spec,x,z})
  }
 }
 function build(){release(group);group=new T.Group();scene.add(group);targets=[];animals=[];fishes=[];line=bobber=ripple=null;if(mode==='pond')pond();else pigpen();fit()}
 function fit(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),aspect=w/h,span=aspect<1?6/aspect:5.5;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 function reset(){controls.target.set(0,0,0);camera.position.set(10,12,14);camera.zoom=1;camera.updateProjectionMatrix();controls.update()}
 function setMode(next){mode=next;reset();build()}
 function pointerDown(e){if(e.button===0)down={x:e.clientX,y:e.clientY}}
 function pointerUp(e){if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7){down=null;return}down=null;const rect=renderer.domElement.getBoundingClientRect();point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(point,camera);const hit=ray.intersectObjects(targets,true)[0];if(!hit)return;if(mode==='pond'){onPond();return}let o=hit.object;while(o&&!o.userData.pig)o=o.parent;if(o)onPig(o.userData.pig);else if(hit.object.userData.slot!==undefined){const p=snapshot?.state.pigs.animals[hit.object.userData.slot];if(p)onPig(p.id)}}
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp)
 function draw(ms){
  frame=0;if(disposed||document.hidden)return;frame=requestAnimationFrame(draw);if(ms-lastDraw<33)return;lastDraw=ms
  controls.update();const t=snapshot?.now??0,moving=!reduced.matches,phase=moving?ms/1000:0
  if(mode==='pond'){
   const f=snapshot?.state.fishing,cast=f?.cast,active=!!f?.idle||!!cast&&t<=cast.expires,biting=cast&&t>=cast.biteAt,reeling=cast?.reelAt&&t<=cast.expires
   const end=tip.clone(),float=landing.clone();if(moving&&active){end.y-=reeling?.35:biting?.1:0;end.x+=reeling?Math.sin(ms/110)*.08:0;float.y+=biting?Math.sin(ms/90)*.07:Math.sin(ms/600)*.025}
   if(cast&&castId!==cast.started){castId=cast.started;castStart=ms}
   if(active&&cast&&t-cast.started<=1&&ms-castStart<800){const f=(ms-castStart)/800;float.lerpVectors(tip,landing,f);float.y+=Math.sin(f*Math.PI)*1.3}
   const bend=base.clone().lerp(end,.5);if(reeling)bend.y-=.3;const curve=new T.QuadraticBezierCurve3(base,bend,end)
   rod.forEach((s,i)=>{const a=curve.getPoint(i/rod.length),b=curve.getPoint((i+1)/rod.length),d=b.clone().sub(a);s.position.copy(a).addScaledVector(d,.5);s.scale.y=d.length();s.quaternion.setFromUnitVectors(axis,d.normalize())})
   line.visible=bobber.visible=ripple.visible=active;if(active){bobber.position.copy(float);const attr=line.geometry.attributes.position;attr.setXYZ(0,end.x,end.y,end.z);attr.setXYZ(1,float.x,float.y,float.z);attr.needsUpdate=true;line.geometry.computeBoundingSphere();ripple.position.set(float.x,.25,float.z);ripple.scale.setScalar(1+(phase%1)*2);ripple.material.opacity=moving?1-phase%1:.5}
   fishes.forEach((f,i)=>{const a=phase*.25+i*1.3;f.position.set(Math.sin(a)*2.5,.21,Math.cos(a*.8)*1.9);f.rotation.y=-a})
  }else animals.forEach((m,i)=>{const p=m.pig,growth=Math.min(m.spec.seconds,p.growth+Math.max(0,Math.min(t,p.fedUntil)-p.updatedAt)),dead=p.deadAt||t>=p.fedUntil+172800,fed=t<p.fedUntil,a=phase*.6+i*2
   m.root.scale.setScalar(.6+.4*growth/m.spec.seconds);m.root.position.set(m.x+(moving&&!dead?Math.sin(a)*.22:0),dead?.45:0,m.z+(moving&&!dead?Math.cos(a)*.15:0));m.root.rotation.set(0,Math.sin(a)*.25,dead?Math.PI/2:0);m.head.rotation.x=moving&&fed&&!dead?Math.sin(phase*2)*.12:0;m.tail.rotation.z=moving&&!dead?Math.sin(phase*4)*.3:0;m.legs.forEach((l,j)=>l.rotation.x=moving&&!dead?Math.sin(phase*3+j*Math.PI)*.09:0)
  })
  renderer.render(scene,camera)
 }
 const resize=new ResizeObserver(fit);resize.observe(host);const visibility=()=>{cancelAnimationFrame(frame);frame=0;if(!document.hidden&&!disposed)frame=requestAnimationFrame(draw)};document.addEventListener('visibilitychange',visibility);reset();build();visibility()
 return {setMode,update(s,c){snapshot={...snapshot,state:s,catalog:c};if(s===lastState)return;lastState=s;if(mode==='pigs')build()},state(value){snapshot=value},destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);controls.dispose();release(group);kit.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}}
}
