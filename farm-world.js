import {plotTarget,plotIdentity,plotLabel,plotLocked} from './farm-plot-view.js?v=98ddcc7d'
import {cropMatureAt,cropHasPests,cropProgress} from './farm-crop-care.js?v=98ddcc7d'
import {farmFrames as atlasFrames,cuteFarmFrames,siteFarmFrames,modelFarmFrames,themeFarmFrames,farmArt} from './farm-assets.js?v=98ddcc7d'
import {ranchAnimalStatus} from './farm-ranch.js?v=98ddcc7d'

// Retained for existing path consumers; the management view has no avatar.
export function farmPath(start,goals,blocked,width=32,height=24){
 const key=([x,y])=>y*width+x,targets=new Set(goals.filter(([x,y])=>x>=0&&y>=0&&x<width&&y<height&&!blocked.has(y*width+x)).map(key))
 const queue=[start],parents=new Map([[key(start),null]])
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],id=key([x,y])
  if(targets.has(id)){const path=[];let cursor=id;while(parents.get(cursor)!==null){path.unshift([cursor%width,Math.floor(cursor/width)]);cursor=parents.get(cursor)}return path}
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
   const next=ny*width+nx
   if(nx<0||ny<0||nx>=width||ny>=height||blocked.has(next)||parents.has(next))continue
   parents.set(next,id);queue.push([nx,ny])
  }
 }
 return null
}
const clock=n=>n<60?Math.max(1,Math.ceil(n))+'秒':n<3600?Math.ceil(n/60)+'分':Math.ceil(n/3600)+'小时'
export async function createFarmWorld(parent,options){
 if(!['0','1'].includes(new URLSearchParams(location.search).get('farm3d'))){
  let world
  try{const {createPixelFarmWorld}=await import('./farm-world-pixel.js?v=98ddcc7d');world=await createPixelFarmWorld(parent,options);if(!world)return null;await world.ready;return world}
  catch{world?.destroy();options.onMessage?.('像素场景暂未加载成功，正在切换兼容场景。')}
 }
 if(new URLSearchParams(location.search).get('farm3d')!=='0'){
  let world
  try{
   const {createVoxelFarmWorld}=await import('./farm-world-voxel.js?v=98ddcc7d')
   world=await createVoxelFarmWorld(parent,options)
   if(!world)return null
   await world.ready
   world.renderer='voxel'
   return world
  }catch{
   world?.destroy()
   parent.replaceChildren();parent.classList.remove('farm-voxel')
   options.onMessage?.('此设备暂时无法加载3D，已切换为平面经营。')
  }
 }
 const world=await createFlatFarmWorld(parent,options)
 if(world)world.renderer='flat'
 return world
}
async function createFlatFarmWorld(parent,{state,catalog,onTarget,onPlace,onSelection=()=>{},now,visitor=false}){
 const {default:Phaser}=await import('/assets/farm/phaser-4.2.1.js')
 if(!parent.isConnected)return null
 let save=state,game,scene,disposed=false,place='home',page=0,selected={kind:'plot',index:0},resolveReady,rejectReady
 const reduced=matchMedia('(prefers-reduced-motion: reduce)')
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject})
 const loadTimeout=setTimeout(()=>rejectReady(Error('地图资源加载超时')),20000)
 ready.then(()=>clearTimeout(loadTimeout),()=>clearTimeout(loadTimeout))
 const overlay=document.createElement('div');overlay.className='farm-world-targets'
 const pages=document.createElement('nav');pages.className='farm-world-pagination';pages.setAttribute('aria-label','切换田区')
 const prev=document.createElement('button'),next=document.createElement('button'),pageText=document.createElement('span')
 prev.type=next.type='button';prev.textContent='‹';next.textContent='›';prev.setAttribute('aria-label','上一个田区');next.setAttribute('aria-label','下一个田区')
 pages.append(prev,pageText,next);parent.append(overlay,pages)
 const compact=()=>matchMedia('(max-width:760px)').matches||parent.clientWidth<600
 const total=()=>place==='home'?save.plots.length:save.ranch?.animals.length??0
 const pageSize=()=>place==='ranch'||compact()?6:24
 const setPage=n=>{page=Math.max(0,Math.min(Math.ceil(total()/pageSize())-1,n));selected={kind:place==='home'?'plot':'animal',index:page*pageSize()};scene?.rebuild();onSelection(selected)}
 prev.onclick=()=>setPage(page-1);next.onclick=()=>setPage(page+1)
 class Field extends Phaser.Scene{
  constructor(){super('field')}
  preload(){
   if(!this.textures.exists('farm-community'))this.load.image('farm-community','/assets/farm/community-v5.webp')
   if(!this.textures.exists('farm-theme'))this.load.image('farm-theme','/assets/farm/theme-species-v1.svg')
   this.load.once('loaderror',()=>rejectReady(Error('地图图集加载失败')))
   for(const [key,file] of [['farm-atlas','atlas-v1'],['farm-cute','cute-resources-v2'],['farm-site','site-species-v2'],['farm-model','model-species-v1'],['farm-soil','soil-gameplay-v1']])
    if(!this.textures.exists(key))this.load.image(key,`/assets/farm/${file}.webp`)
  }
  create(){
   scene=this
   for(const [key,frames] of [['farm-atlas',atlasFrames],['farm-cute',cuteFarmFrames],['farm-site',siteFarmFrames],['farm-model',modelFarmFrames],['farm-theme',themeFarmFrames],['farm-community',Array.from({length:12},(_,i)=>[i%4*128,Math.floor(i/4)*128,128,128])]]){
    const atlas=this.textures.get(key);frames.forEach((r,i)=>{if(!atlas.has('item'+i))atlas.add('item'+i,0,...r)})
   }
   this.targets=[];this.build();this.scale.on('resize',this.rebuild,this)
   this.events.once('shutdown',()=>this.scale.off('resize',this.rebuild,this))
   onPlace(place);resolveReady()
  }
  rebuild(){
   if(disposed)return
   const focused=overlay.contains(document.activeElement)?Number(document.activeElement.dataset.index):null
   this.tweens.killAll();this.children.removeAll(true);this.targets=[];this.build()
   if(focused!==null)overlay.querySelector(`[data-index="${focused}"]`)?.focus({preventScroll:true})
  }
  build(){
   const width=parent.clientWidth,height=parent.clientHeight,n=total(),small=compact()
   const size=pageSize();if(this.signature?.split(':')[2]!==String(small)&&selected)page=Math.floor(selected.index/size);page=Math.max(0,Math.min(page,Math.ceil(n/size)-1))
   const offset=page*size,count=Math.min(size,n-offset),cols=count<=6?3:count<=12?4:6,rows=Math.ceil(count/cols)
   const logicalHeight=rows>=4?465:430,scale=Math.min(width/760,(height-(small&&n>6?32:0))/logicalHeight)
   const ox=(width-760*scale)/2,oy=Math.max(0,(height-(small&&n>6?32:0)-logicalHeight*scale)/2)
   const X=x=>ox+x*scale,Y=y=>oy+y*scale
   this.signature=[place,n,small,page,plotIdentity(save)].join(':');this.unit=scale
   const grass=this.add.graphics(),points=[[32,126]]
   const curve=(cx,cy,ex,ey)=>{const [sx,sy]=points.at(-1);for(let i=1;i<=10;i++){const t=i/10,u=1-t;points.push([u*u*sx+2*u*t*cx+t*t*ex,u*u*sy+2*u*t*cy+t*t*ey])}}
   curve(29,82,82,80);points.push([642,47]);curve(699,47,715,103);points.push([745,logicalHeight-99]);curve(749,logicalHeight-44,687,logicalHeight-29);points.push([96,logicalHeight-13]);curve(40,logicalHeight-12,35,logicalHeight-69)
   grass.fillStyle(0x9cb46a).fillPoints(points.map(([x,y])=>({x:X(x),y:Y(y+7)})),true)
   grass.fillStyle(place==='ranch'?0xabc682:0xb1c87c).fillPoints(points.map(([x,y])=>({x:X(x),y:Y(y)})),true)
   if(place==='ranch'){
    grass.lineStyle(7*scale,0xb99b66)
    for(const [x1,y1,x2,y2] of [[70,105,70,150],[70,119,163,113],[163,94,163,136],[570,358,570,316],[570,339,687,327],[687,302,687,344]])grass.lineBetween(X(x1),Y(y1),X(x2),Y(y2))
    if(!n)this.add.text(X(380),Y(210),visitor?'牧场暂时没有动物':'迎来你的第一只动物\n添好饲料，离线也会生产',{fontFamily:'sans-serif',fontSize:small?'14px':'20px',align:'center',lineSpacing:10,color:'#4f623a'}).setOrigin(.5)
   }
   overlay.replaceChildren()
   for(let j=0;j<count;j++){
    const index=offset+j,s=(cols===3?1.03:cols===4?.8:.57)*scale
    let x,y
    if(place==='ranch'){x=X(175+j%3*210);y=Y(205+Math.floor(j/3)*135)}
    else{
     const stepX=cols===3?190:cols===4?151:105,stepY=cols===3?132:cols===4?99:83
     x=X((760-(cols-1)*stepX-rows*12)/2+j%cols*stepX+Math.floor(j/cols)*12)
     y=Y((rows<=2?151:rows===3?120:105)+Math.floor(j/cols)*stepY)
    }
    const kind=place==='home'?'plot':'animal',ground=this.add.graphics()
    const soil=this.add.image(x,y,'farm-soil').setDisplaySize(228*s,142*s).setVisible(false)
    const image=this.add.image(x,y,'farm-cute','item0'),second=this.add.image(x,y,'farm-cute','item0').setVisible(false),sprout=this.add.graphics()
    const badge=this.add.text(x+8*s,y-(kind==='animal'?92:83)*s,'',{fontFamily:'sans-serif',fontSize:small?'12px':'13px',color:'#fffef5',backgroundColor:'#4f7339',padding:{x:6,y:4}}).setOrigin(.5).setDepth(5)
    const empty=this.add.text(x,y+5*s,'',{fontFamily:'sans-serif',fontSize:small?'13px':'16px',color:'#fff8dc',stroke:'#785231',strokeThickness:3}).setOrigin(.5).setDepth(4)
    const hit=document.createElement('button');hit.type='button';hit.className='farm-world-hit';hit.dataset.index=String(index);hit.dataset.kind=kind
    hit.style.left=x+'px';hit.style.top=(y-(kind==='plot'?0:15)*s)+'px';hit.style.width=Math.max(44,175*s)+'px';hit.style.height=Math.max(44,kind==='plot'?108*s:145*s)+'px'
    hit.onclick=()=>this.choose(item);hit.addEventListener('focus',()=>{selected=kind==='plot'?plotTarget(save,index):{kind,index};this.highlight();onSelection(selected)})
    // Keep soil below all plants; sort plants by their ground contact, including after reload.
    ground.setDepth(0);soil.setDepth(1);image.setDepth(10+y-.01);second.setDepth(10+y+.01);sprout.setDepth(10+y);badge.setDepth(2000);empty.setDepth(2000);
    const item={...(kind==='plot'?plotTarget(save,index):{kind,index}),x,y,s,ground,soil,image,second,sprout,badge,empty,hit}
    this.targets.push(item);overlay.append(hit)
   }
   pages.hidden=n<=size;pages.setAttribute('aria-label','切换田区')
   pageText.textContent=`${offset+1}–${Math.min(offset+size,n)} / ${n}`;prev.disabled=page===0;next.disabled=(page+1)*size>=n
   this.selectionRing=this.add.graphics().setDepth(4);this.refresh();this.highlight()
  }
  highlight(){
   this.selectionRing?.clear()
   for(const item of this.targets){
    const active=selected?.kind===item.kind&&selected.index===item.index;item.hit.setAttribute('aria-pressed',String(active))
    if(active){const {x,y,s}=item;this.selectionRing?.lineStyle(3,0xffefb3);if(item.kind==='plot')this.selectionRing?.strokePoints([{x:x-110*s,y:y+4*s},{x:x+25*s,y:y-60*s},{x:x+112*s,y:y+4*s},{x:x-25*s,y:y+69*s}],true);else this.selectionRing?.strokeEllipse(x,y+30*s,130*s,40*s)}
   }
  }
  choose(item){
   selected={kind:item.kind,index:item.index,...item.leaseId?{leaseId:item.leaseId}:{}};this.highlight()
   if(!reduced.matches&&!document.hidden&&item.image.visible)this.tweens.add({targets:item.image,angle:{from:-3,to:3},duration:100,yoyo:true,onComplete:()=>item.image.setAngle(0)})
   onTarget(selected)
  }
  picture(image,frame,x,y,size,ranch=false){
   const a=farmArt(frame,ranch),[, ,w,h]=a.rect
   image.setTexture(a.key,'item'+a.index).setPosition(x,y).setDisplaySize(size*w/Math.max(w,h),size*h/Math.max(w,h)).setVisible(true)
  }
  refresh(){
   const t=now()
   for(const item of this.targets){
    const {kind,index,x,y,s,ground,soil,image,second,sprout,badge,empty,hit}=item
    ground.clear();sprout.clear();image.setVisible(false);second.setVisible(false);soil.setVisible(false);empty.setText('');let label='',name=''
    if(kind==='plot'){
     const p=save.plots[index],c=catalog.crops.find(c=>c.id===p.crop),progress=c?cropProgress(p,c,t):0
     name=plotLabel(p,index)+` ${c?.name||'空地'}`
     if(p.tilled)soil.setVisible(true).setTint(c&&p.wateredAt!==null?0xe3d9c8:0xffffff)
     else ground.fillStyle(0x9db86d).lineStyle(1.5,0x7e9958).fillPoints([{x:x-106*s,y:y+4*s},{x:x+25*s,y:y-55*s},{x:x+106*s,y:y+4*s},{x:x-25*s,y:y+64*s}],true).strokePath()
     if(c){
      ground.fillStyle(0x513c28,.16).fillEllipse(x,y+15*s,100*s,26*s)
      if(progress>.35){this.picture(image,c.frame,x-24*s,y-38*s,85*s);this.picture(second,c.frame,x+28*s,y-15*s,74*s)}
      else for(const [dx,dy,ratio] of [[-22,-2,.7],[30,12,.65]]){
       const cx=x+dx*s,cy=y+dy*s,r=ratio*s
       sprout.lineStyle(3*r,0x5a8339).lineBetween(cx,cy,cx,cy-24*r).fillStyle(0x749c43).fillEllipse(cx-10*r,cy-21*r,27*r,14*r).fillStyle(0x91b956).fillEllipse(cx+10*r,cy-29*r,27*r,16*r)
      }
      label=visitor?(p.visitSelected?'✓':p.sneak?'◇':p.visitStatus==='stealable'?'✧':''):p.wateredAt===null?'浇水':progress>=1?'✧':cropHasPests(p,c,t)?'驱虫':clock(cropMatureAt(p,c)-t)
      badge.setBackgroundColor(p.wateredAt===null?'#538894':progress>=1?'#4d7438':'#6f7954')
     }else{label=visitor?'':plotLocked(p,t)?'已锁定':p.tilled?'播种':'开垦';empty.setText(label).setColor(p.tilled?'#fff8dc':'#314825').setStroke(p.tilled?'#785231':'#d3e5a8',3)}
     if(plotLocked(p,t)){label='已锁定';soil.setTint(0xaab5a1)}
     badge.setVisible(!!c&&!!label)
    }else if(kind==='animal'){
     const a=save.ranch.animals[index],spec=catalog.animals.find(c=>c.id===a.kind),status=ranchAnimalStatus(a,spec,t,catalog.ranch.capacity,catalog.ranch.starvationSeconds)
     name=`动物 ${index+1} ${spec.name}`;ground.fillStyle(0x9eb978).fillEllipse(x,y+44*s,130*s,40*s);this.picture(image,spec.frame,x,y-12*s,132*s,true);image.setAlpha(status.dead?.4:1)
     label=visitor?(a.visitSelected?'✓':a.sneak?'◇':a.status==='stealable'?'✧':''):status.stored?`${spec.product} ×${status.stored}`:status.dead?'已死亡':status.hungry?'需要添粮':clock(status.nextAt-t)
     badge.setBackgroundColor(status.dead||status.hungry?'#a66d40':'#4e743b').setVisible(!!label)
    }
    badge.setText(label);hit.setAttribute('aria-label',label?`${name}，${label}`:name);hit.title=label?`${name} · ${label}`:name
   }
  }
  feedback(actions){
   if(document.hidden)return
   for(const a of actions){
    const item=this.targets.find(x=>x.kind===(a.plot!==undefined?'plot':a.animal!==undefined?'animal':'tree')&&x.index===(a.plot??a.animal??a.tree))
    if(!item)continue
    const label=({sneak_failed:'被发现',water:'浇水 ✓',harvest:'收成入仓',steal:'＋1',animal_steal:'＋1',animal_collect:'畜产入仓',animal_feed:'添粮 ✓',till:'开垦 ✓',plant:'播种 ✓',chop:'采集 ✓'})[a.type]||'✓'
    const text=this.add.text(item.x,item.y,label,{fontFamily:'sans-serif',fontSize:'16px',color:'#27624a',stroke:'#fffaf0',strokeThickness:4}).setOrigin(.5).setDepth(20)
    if(reduced.matches){this.time.delayedCall(600,()=>text.destroy());continue}
    this.tweens.add({targets:text,y:item.y-35,alpha:0,duration:900,ease:'Cubic.easeOut',onComplete:()=>text.destroy()})
    for(let k=0;k<5;k++){const dot=this.add.circle(item.x+(k-2)*7,item.y,3,a.type==='water'?0x5badd4:0xeab44f).setDepth(19);this.tweens.add({targets:dot,x:item.x+(k-2)*20,y:item.y-20-(k%3)*16,alpha:0,duration:600,onComplete:()=>dot.destroy()})}
   }
  }
 }
 game=new Phaser.Game({type:Phaser.AUTO,parent,width:parent.clientWidth,height:parent.clientHeight,backgroundColor:'#d8e2ae',scene:Field,scale:{mode:Phaser.Scale.RESIZE},render:{antialias:true},fps:{target:30},audio:{noAudio:true},input:{touch:{capture:false},mouse:{preventDefaultWheel:false}}})
 game.canvas.setAttribute('aria-hidden','true')
 return {
  ready,
  updateState(next){save=next;if(scene?.targets){const signature=[place,total(),compact(),page,plotIdentity(save)].join(':');if(signature!==scene.signature)scene.rebuild();else scene.refresh()}},
  feedback(actions){scene?.feedback(actions)},
  select(kind,index){if(Math.floor(index/pageSize())!==page)setPage(Math.floor(index/pageSize()));const item=scene?.targets.find(x=>x.kind===kind&&x.index===index);if(item)scene.choose(item)},
  getTargetRect(kind,index){return scene?.targets.find(x=>x.kind===kind&&x.index===index)?.hit.getBoundingClientRect()},
  getPlace:()=>place,
  travel(destination){const next=destination??(place==='home'?'ranch':'home');if(['home','ranch'].includes(next)&&place!==next&&scene){place=next;page=0;selected=place==='ranch'?null:{kind:'plot',index:0};scene.rebuild();onPlace(place)}},
  destroy(){disposed=true;clearTimeout(loadTimeout);rejectReady(Error('地图已关闭'));game.destroy(true);overlay.remove();pages.remove();scene=null}
 }
}
