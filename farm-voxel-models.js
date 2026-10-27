import * as T from '/assets/farm/three-0.186.1/three.module.js'
import {mergeGeometries} from '/assets/farm/three-0.186.1/BufferGeometryUtils.js'

// Models are original editable geometry. Keys are the existing authoritative catalog IDs.
import {CROP_LOOKS,ANIMAL_LOOKS} from './farm-voxel-catalog.js?v=810c43bb'
export function createModelKit({blocky=false}={}){
 const cube=new T.BoxGeometry(1,1,1),organic=new T.SphereGeometry(1,8,5),mats=new Map()
 const mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshLambertMaterial({color:c}));return mats.get(c)}
 function box(g,x,y,z,w,h,d,c){const m=new T.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m}
 function bud(g,x,y,z,w,h,d,c){if(blocky)return box(g,x,y,z,w,h,d,c);const m=new T.Mesh(organic,mat(c));m.position.set(x,y,z);m.scale.set(w/2,h/2,d/2);m.castShadow=m.receiveShadow=true;g.add(m);return m}
 function merge(g){const by=new Map();for(const m of [...g.children]){if(!m.isMesh)continue;m.updateMatrix();const geo=m.geometry.clone().applyMatrix4(m.matrix);if(!by.has(m.material))by.set(m.material,[]);by.get(m.material).push(geo);g.remove(m)}
  for(const [material,list] of by){const mesh=new T.Mesh(mergeGeometries(list),material);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);list.forEach(g=>g.dispose())}}
 function flatten(g){const by=new Map();g.updateMatrixWorld(true);g.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.clone().applyMatrix4(m.matrixWorld);if(!by.has(m.material))by.set(m.material,[]);by.get(m.material).push(geo);if(m.geometry!==cube)m.geometry.dispose()});g.clear()
  for(const [material,list] of by){const mesh=new T.Mesh(mergeGeometries(list),material);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);list.forEach(a=>a.dispose())}}
 function emblem(g,motif,x,y,z,size=.14){
  if(!motif)return
  const c=0xffe4a3,d=0x62586a
  // Compact voxel emblems identify the theme without floating text labels.
  if(['moon','sleep','tear','wave'].includes(motif)){
   box(g,x-size/3,y,z,size*.5,size*1.6,.05,c);box(g,x+size/4,y-size*.65,z,size,size*.35,.05,c)
  }else if(['horn','ear','cat','penguin','tail','capy'].includes(motif)){
   for(const s of [-1,1])box(g,x+s*size*.6,y+size*.4,z,size*.4,size,.07,c);box(g,x,y-size*.3,z,size,size*.6,.07,c)
  }else if(['grid','dice','bracket','steps','gear','clock'].includes(motif)){
   box(g,x,y,z,size*1.7,size*1.7,.05,c);for(const s of [-1,1])box(g,x+s*size*.4,y+s*size*.4,z+.03,size*.3,size*.3,.025,d)
  }else if(['star','sun','bolt','crown','clover','orange','coin','banana'].includes(motif)){
   box(g,x,y,z,size*.6,size*2,.05,c);box(g,x,y,z,size*1.7,size*.6,.06,c)
  }else{box(g,x,y,z,size*1.5,size*.5,.05,c);box(g,x+size*.5,y-size*.3,z,size*.4,size,.06,c);box(g,x-size*.4,y-size*.7,z,size*.4,size*.4,.06,c)}
 }
 function crop(id,progress,thumbnail=false){
  const [form,color,leaf,motif]=CROP_LOOKS[id]??CROP_LOOKS.carrot,g=new T.Group()
  const span=thumbnail?0:1
  for(let r=-span;r<=span;r++)for(let c=-span;c<=span;c++){
   const p=new T.Group();p.position.set(c*.72,0,r*.72);p.rotation.y=blocky?0:(c+r)*.21;g.add(p)
   if(progress<.3){box(p,0,.16,0,.055,.32,.055,leaf);bud(p,-.1,.21,0,.27,.09,.16,leaf);bud(p,.1,.28,0,.24,.09,.15,leaf);merge(p);continue}
   if(progress<.7){
    p.scale.setScalar(.55+progress*.7)
    const height=['grain','bamboo','flower'].includes(form)?.65:.42
    box(p,0,height/2,0,.065,height,.065,leaf)
    for(let n=0;n<4;n++){const a=n*Math.PI*.5,foliage=bud(p,Math.sin(a)*.12,.18+n*.09,Math.cos(a)*.12,.36,.1,.2,leaf);foliage.rotation.y=-a}
    if(form==='flower')bud(p,0,height,0,.14,.2,.14,leaf)
    merge(p);continue
   }
   if(['grain','bamboo'].includes(form)){
    for(let k=-1;k<=1;k++){const x=k*.14,h=form==='bamboo'?.9:.6+Math.abs(k)*.15;box(p,x,h/2,0,.08,h,.08,leaf)
     if(form==='grain'){for(let n=0;n<3;n++)box(p,x+(n%2?.07:-.07),h-.15+n*.13,0,.15,.14,.12,color)}
     else for(let n=1;n<4;n++){box(p,x,n*.23,0,.12,.035,.12,color);box(p,x+.12,n*.23,.03,.25,.07,.12,leaf)}}
   }else if(['cabbage','knot'].includes(form)){
    bud(p,0,.26,0,.63,.48,.6,leaf);bud(p,0,.43,0,.4,.27,.4,color)
    for(let k=0;k<4;k++){const a=k*Math.PI/2;bud(p,Math.sin(a)*.22,.3,Math.cos(a)*.22,.26,.22,.26,color)}
   }else if(form==='mushroom'){
    box(p,0,.25,0,.16,.5,.18,leaf);bud(p,0,.53,0,.69,.34,.65,color)
    box(p,-.14,.63,.13,.1,.04,.09,0xe4c9e8);box(p,.13,.63,-.1,.09,.04,.08,0xe4c9e8)
   }else if(form==='flower'){
    box(p,0,.4,0,.07,.8,.07,leaf)
    for(let n=0;n<6;n++){const a=n*Math.PI/3;bud(p,Math.cos(a)*.19,.8,Math.sin(a)*.19,.3,.14,.3,color)}
    bud(p,0,.85,0,.23,.15,.23,0xf0c95e)
    for(const s of [-1,1])bud(p,s*.15,.38,0,.37,.11,.2,leaf)
   }else if(['banana','pepper','eggplant','bean'].includes(form)){
    box(p,0,.35,0,.08,.7,.08,leaf);box(p,0,.64,0,.55,.09,.15,leaf)
    for(const s of [-1,1]){box(p,s*.16,.42,0,.16,.36,.18,color);if(form==='banana')box(p,s*.23,.25,0,.2,.13,.18,color)}
   }else if(form==='whale'){
    box(p,0,.3,0,.07,.6,.08,leaf);box(p,0,.6,0,.48,.28,.3,color)
    box(p,-.27,.65,0,.18,.1,.4,color);box(p,.17,.64,.16,.04,.04,.02,0x304d69)
   }else if(form==='cotton'){
    box(p,0,.3,0,.07,.6,.07,leaf);for(const [x,y,z] of [[-.15,.48,0],[.16,.58,0],[0,.65,.14]])box(p,x,y,z,.3,.28,.28,color)
   }else if(['fruit','berry','peach'].includes(form)){
    box(p,0,.3,0,.09,.6,.09,leaf);bud(p,0,.58,0,.65,.25,.43,leaf)
    for(const s of [-1,1]){bud(p,s*.19,.36,.08,.32,.33,.3,color);if(form==='peach')bud(p,s*.19,.45,.16,.18,.16,.12,0xf8c3b3)}
   }else if(form==='pumpkin'){
    bud(p,0,.27,0,.64,.47,.6,color);box(p,0,.53,0,.08,.18,.08,leaf)
    for(const s of [-1,1])bud(p,s*.21,.26,.1,.23,.4,.42,color)
    bud(p,-.29,.13,-.1,.4,.1,.26,leaf)
   }else {box(p,0,.18,0,.23,.33,.23,color);box(p,0,.46,0,.08,.4,.1,leaf);box(p,0,.5,0,.42,.09,.12,leaf)}
   if(c===0&&r===0&&progress>=.7)emblem(p,motif,0,.6,.3,.1)
   merge(p)
  }
  flatten(g);return g
 }
 function animal(id){
  const [form,color,accent,motif]=ANIMAL_LOOKS[id]??ANIMAL_LOOKS.cow,g=new T.Group(),body=new T.Group();g.add(body)
  const bird=['bird','swan','crane','owl','penguin','peacock'].includes(form),cat=['cat','fox'].includes(form),tall=['llama','deer','crane'].includes(form),head=new T.Group(),wings=[]
  box(body,0,bird?.6:.65,0,bird?.72:.95,bird?.62:.62,bird?.73:1.2,color)
  if(form==='sheep')for(const x of [-.36,0,.36])box(body,x,.95,0,.35,.25,.9,color)
  head.position.set(0,tall?1.2:bird?.92:.8,.57);body.add(head)
  if(tall||form==='swan')box(body,0,.94,.43,.32,.8,.35,color)
  box(head,0,0,0,bird?.4:.6,bird?.4:.55,.55,color)
  box(head,0,-.13,.32,bird?.24:.34,.17,bird?.25:.15,accent)
  for(const s of [-1,1]){
   box(head,s*(bird?.13:.18),.06,.282,.055,.075,.02,0x3d3a36)
   if(!bird&&!['whale','fish','slug','turtle','moth','bat'].includes(form)){box(head,s*.23,.34,0,.15,form==='rabbit'?.65:cat?.31:.2,.14,accent)}
   if(form==='deer'){box(head,s*.26,.65,-.05,.08,.52,.08,accent);box(head,s*.34,.73,-.05,.23,.07,.08,accent)}
   if(form==='cow')box(head,s*.29,.46,-.08,.13,.2,.15,0xe0c386)
   if(bird){const wing=new T.Group();wing.position.set(s*.39,.8,0);wing.userData.side=s;body.add(wing);box(wing,0,-.15,0,.15,.4,.5,accent);wings.push(wing)}
  }
  if(form==='bird')box(head,0,.28,.03,.12,.2,.22,0xc96c53)
  if(id==='meme_chicken')for(const s of [-1,1])box(head,s*.13,.08,.3,.12,.03,.02,0x3d3a36)
  if(id==='turbo_bull'){box(body,.49,.69,0,.02,.18,.49,0xf3dd77);box(body,-.49,.69,0,.02,.18,.49,0xf3dd77)}
  if(id==='holy_deer')box(head,0,.4,.15,.13,.13,.1,0xffec9e)
  const legs=[]
  for(const x of [-.26,.26])for(const z of bird?[0]:[-.38,.38]){const leg=new T.Group();leg.position.set(x,.35,z);body.add(leg);box(leg,0,-.15,0,bird?.09:.18,.33,.18,accent);legs.push(leg)}
  const tail=new T.Group();tail.position.set(0,.7,-.65);body.add(tail);box(tail,0,cat?.2:0,-.12,.12,cat?.6:.12,.34,accent)
  if(['bat','moth','whale','fish'].includes(form)){
   for(const s of [-1,1]){const wing=new T.Group();wing.position.set(s*.4,.75,0);wing.userData.side=s;body.add(wing);box(wing,s*.32,0,0,.55,form==='moth'?.8:.12,.65,accent);if(form==='bat')box(wing,s*.59,-.09,-.1,.2,.26,.42,color);wings.push(wing)}
   legs.forEach(l=>l.visible=false);box(tail,0,.1,-.25,.62,.12,.26,accent)
  }
  if(form==='slug'){legs.forEach(l=>l.visible=false);body.scale.set(1,.6,1.4);for(const s of [-1,1])box(head,s*.24,.48,.15,.08,.45,.08,accent)}
  if(form==='turtle'){box(body,0,1,0,1.12,.35,1.18,accent);box(body,0,1.23,0,.7,.13,.75,color);head.scale.setScalar(.75)}
  if(form==='elephant'){box(head,0,-.35,.39,.19,.65,.2,accent);for(const s of [-1,1])box(head,s*.4,.05,-.06,.3,.65,.16,accent)}
  if(form==='owl'){for(const s of [-1,1]){box(head,s*.15,.07,.29,.23,.24,.06,accent);box(head,s*.15,.08,.33,.07,.1,.02,0x333333)}}
  if(form==='penguin'){box(body,0,.65,.39,.49,.66,.04,0xf8efd9);body.scale.set(.8,1.2,.8)}
  if(form==='raccoon'){box(head,0,.04,.29,.55,.17,.03,0x555e62);for(const s of [-1,1])box(head,s*.18,.06,.32,.05,.07,.02,0xffe4a3)}
  if(['hamster','capy','otter'].includes(form)){head.scale.set(1.2,1,1.15);body.scale.set(1,form==='hamster'?.8:1,1);box(head,0,-.07,.31,.34,.12,.09,accent)}
  if(form==='monkey'){box(head,0,0,.29,.4,.39,.05,accent);tail.rotation.x=-.65;box(tail,0,.28,-.27,.13,.6,.13,accent)}
  if(form==='peacock'){for(let n=-2;n<=2;n++)box(tail,n*.25,.55-Math.abs(n)*.08,-.17,.26,1.15,.12,n%2?accent:color)}
  if(form==='fox')box(tail,0,.2,-.32,.38,.45,.65,accent)
  if(id==='holy_unicorn')box(head,0,.55,.18,.14,.5,.14,0xffe4a3)
  emblem(body,motif,.49,.78,.2)
  merge(head);merge(body);return {root:g,body,head,legs,tail,wings,form}
 }
 function product(id){
  const [form,color,accent]=ANIMAL_LOOKS[id]??ANIMAL_LOOKS.cow,g=new T.Group()
  if(['cow','elephant'].includes(form)){box(g,0,.04,0,.19,.28,.18,0xf7efd9);box(g,0,.22,0,.1,.08,.1,accent)}
  else if(['bird','penguin'].includes(form)){box(g,0,.04,0,.2,.22,.18,0xffefd2);box(g,0,.19,0,.12,.08,.12,0xffefd2)}
  else if(['swan','crane','owl','peacock','bat','moth'].includes(form)){box(g,0,.08,0,.06,.38,.06,accent);box(g,.06,.1,0,.15,.24,.06,color)}
  else if(['whale','fish','turtle','slug','otter'].includes(form)){box(g,0,.1,0,.22,.22,.2,accent);box(g,-.055,.16,.105,.07,.07,.02,0xfff6dc)}
  else{box(g,0,.09,0,.27,.23,.25,color);box(g,-.08,.22,0,.13,.08,.13,accent)}
  merge(g);return g
 }
 return {box,merge,crop,animal,product,sharedGeometry:cube,dispose(){cube.dispose();organic.dispose();mats.forEach(m=>m.dispose())}}
}

