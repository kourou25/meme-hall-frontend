import {fishAtlas,fishRect} from './farm-fish-art.js?v=810c43bb'
// Rendering is local; server settlement replays the same bounded input history.
export function createLeisureWorld(host,{onCast,onHook,onControl,getPlay=()=>null}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');if(!ctx)throw Error('池塘画布不可用')
 canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','池塘：拖向水面松手抛竿；咬钩后按住收线、松开放线；空格也可操作');host.append(canvas);host.classList.add('fl-pixel-pond')
 let snapshot=null,disposed=false,visible=true,raf=0,received=0,castId=null,castStart=0,down=null,holding=false,aim=null,view={s:1,x:0,y:0},lastPaint=-Infinity,size=host.getBoundingClientRect()
 const atlas=new Image();atlas.src=fishAtlas;atlas.onload=()=>schedule()
 const polygon=(points,fill,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
 const pixelLine=(a,b,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(a.x),Math.round(a.y));ctx.lineTo(Math.round(b.x),Math.round(b.y));ctx.stroke()}
 function fish(x,y,scale=1,facing=1,index=0,phase=0,underwater=false){if(!atlas.complete||!atlas.naturalWidth)return;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale*facing,scale);ctx.rotate(Math.sin(phase)*.06);if(underwater)ctx.globalAlpha=.35;ctx.drawImage(atlas,...fishRect(index),-22,-22,44,44);ctx.restore()}
 function phase(t){const f=snapshot?.state.fishing;if(!f)return'rest';if(f.idle)return'idle';if(!f.cast)return'rest';if(t>f.cast.expires)return'miss';if(f.cast.reelAt)return'reel';return t>=f.cast.biteAt?'bite':'waiting'}
 function draw(perf){raf=0;if(disposed||!visible||document.hidden)return
  if(!reduced.matches&&perf-lastPaint<1000/30-1){raf=requestAnimationFrame(draw);return}lastPaint=perf
  const w=Math.max(1,size.width),h=Math.max(1,size.height),dpr=Math.min(devicePixelRatio||1,1.35)
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false
  const scale=Math.min(w/760,h/530);view={s:scale,x:(w-760*scale)/2,y:(h-530*scale)/2};ctx.translate(view.x,view.y);ctx.scale(scale,scale)
  const seconds=reduced.matches?0:perf/1000,t=(snapshot?.now??Date.now()/1000)+Math.min(1.5,(perf-received)/1000),stage=phase(t),active=['waiting','bite','reel','idle'].includes(stage),play=getPlay()
  polygon([[370,131],[669,289],[375,465],[72,302]],'#96a78d','#82977d');polygon([[370,146],[648,292],[375,449],[91,302]],'#72999b','#62878a');polygon([[370,158],[632,293],[375,437],[106,302]],'#8aafb0')
  // Water texture stays clipped to the pond; fish cannot pass through the dock or bank.
  ctx.save();ctx.beginPath();[[370,158],[632,293],[375,437],[106,302]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip()
  for(let i=0;i<23;i++){const x=123+(i*83)%490,y=177+(i*67)%245;ctx.fillStyle=i%2?'#a6c2bd80':'#719c9d70';ctx.fillRect(x+Math.sin(seconds*.35+i)*4,y,15+i%5*4,2)}
  for(let i=0;i<7;i++){const angle=seconds*.12+i*1.8,x=370+Math.cos(angle)*145,y=298+Math.sin(angle)*66;fish(x,y,.85,Math.sin(angle)>0?-1:1,[0,5,9,11,13,14,15][i],seconds*3+i,true)}ctx.restore()
  // The pier sits on the bank; the rod tip, line and bobber share the same endpoints.
  polygon([[579,325],[660,369],[571,420],[493,377]],'#907c60');for(let i=0;i<7;i++)polygon([[580-i*12,330+i*7],[651-i*12,370+i*7],[642-i*12,375+i*7],[571-i*12,335+i*7]],i%2?'#bba584':'#b09b7d','#9c876d')
  for(const [x,y] of [[579,328],[651,369],[568,414]]){ctx.fillStyle='#8b775e';ctx.fillRect(x-3,y-9,6,24);ctx.fillStyle='#c8b495';ctx.fillRect(x-4,y-11,8,4)}
  const casting=active&&stage!=='idle'?Math.max(0,Math.min(1,(perf-castStart)/800)):1,reeling=stage==='reel'?(play?.progress??0)/100:0,point=snapshot?.state.fishing.cast?.point??{x:.54,y:.48}
  const base={x:589,y:374},tip={x:active?510-reeling*32:aim?555:529,y:active?245-reeling*35:aim?225:269};tip.y-=Math.sin(casting*Math.PI)*16
  const target={x:370+(point.x-.5)*520,y:298+(point.y-.5)*280},landing={x:active?target.x+(tip.x-target.x)*reeling:tip.x,y:active?target.y+(tip.y+28-target.y)*reeling:tip.y+28}
  if(stage==='reel'&&play){landing.x+=Math.sin(seconds*4)*10*(play.force+.2)*(1-reeling);landing.y+=Math.cos(seconds*3)*4*(1-reeling)}
  if(casting<1){landing.x=base.x+(landing.x-base.x)*casting;landing.y=base.y+(landing.y-base.y)*casting-Math.sin(casting*Math.PI)*80}
  const bite=stage==='bite'?Math.sin(seconds*12)*4:active?Math.sin(seconds*2)*1.5:0;landing.y+=bite
  const bend={x:(base.x+tip.x)/2+8+(play?.tension??0)/10,y:(base.y+tip.y)/2-8};pixelLine(base,bend,'#77674f',5);pixelLine(bend,tip,'#9e8c69',3)
  ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.quadraticCurveTo((tip.x+landing.x)/2,(tip.y+landing.y)/2+(stage==='reel'?(100-(play?.tension??40))*.3:18),landing.x,landing.y);ctx.strokeStyle=(play?.tension??0)>78?'#c48470':'#f1ead4';ctx.lineWidth=1.6;ctx.stroke()
  if(aim){const x=370+(aim.x-.5)*520,y=298+(aim.y-.5)*280;ctx.strokeStyle='#f0e5b8';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.quadraticCurveTo((tip.x+x)/2,Math.min(tip.y,y)-80,x,y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(x,y,12,6,0,0,Math.PI*2);ctx.stroke()}
  if(active&&reeling<.95){ctx.strokeStyle='#c7dcd1';ctx.lineWidth=2;for(let i=0;i<2;i++){const radius=6+((seconds*(stage==='bite'?17:7)+i*12)%24);ctx.globalAlpha=(1-radius/32)*.7;ctx.beginPath();ctx.ellipse(landing.x,landing.y+4,radius,radius*.45,0,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1}
  ctx.fillStyle='#ede6d0';ctx.fillRect(Math.round(landing.x)-3,Math.round(landing.y)-6,6,8);ctx.fillStyle='#bc7863';ctx.fillRect(Math.round(landing.x)-3,Math.round(landing.y)-8,6,4)
  if(stage==='reel')fish(landing.x,landing.y+9,1.1,-1,5,seconds*8,true)
  const rods=snapshot?.state.fishing.cast?.rods??1
  if(active&&stage!=='idle')for(let i=1;i<rods;i++){
   const offset=(i%2?1:-1)*Math.ceil(i/2)*24
   let ox=(target.x+offset-370)/520,oy=(target.y+Math.abs(offset)*.22-298)/280
   const edge=Math.abs(ox)+Math.abs(oy);if(edge>.45){ox*=.45/edge;oy*=.45/edge}
   const blend=(1-reeling)*casting,x=landing.x+(370+ox*520-target.x)*blend,y=landing.y+(298+oy*280-target.y)*blend
   pixelLine({x:base.x+i*5,y:base.y+i*3},{x:tip.x+offset*.32,y:tip.y+i*2},'#927d59',3)
   ctx.strokeStyle=play?.tension>78?'#ad5d4b':'#fff5d6';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(tip.x+offset*.32,tip.y+i*2);ctx.quadraticCurveTo((tip.x+x)/2,(tip.y+y)/2+12,x,y);ctx.stroke()
   ctx.fillStyle=i%2?'#d9956a':'#507f97';ctx.fillRect(Math.round(x)-3,Math.round(y)-7,6,5);ctx.fillStyle='#fff3ce';ctx.fillRect(Math.round(x)-3,Math.round(y)-2,6,4)
   if(stage==='reel')fish(x,y+10,.8,-1,[0,9,11,13][i-1],seconds*7+i,true)
  }
  const last=snapshot?.state.fishing.lastOutcome;if(last?.ok&&last.kind==='fish'&&t-last.at>=0&&t-last.at<2.5){const q=(t-last.at)/2.5,index=snapshot.catalog.fish.find(c=>c.id===last.item)?.frame??0;fish(590+q*38,368-Math.sin(q*Math.PI)*45,1.5,1,index,seconds*8)}
  ctx.fillStyle='#546e58';for(const [x,y] of [[127,319],[630,301],[323,172],[366,442]])for(let i=0;i<4;i++)ctx.fillRect(x+i*5,y-8-i%3*3,2,12+i%3*3)
  if(play){ctx.fillStyle='#f5ebd8d9';ctx.fillRect(264,102,212,6);ctx.fillStyle=play.tension>78?'#b97b67':'#83a8a0';ctx.fillRect(265,103,210*Math.min(1,play.tension/100),4)}
  if(!reduced.matches)raf=requestAnimationFrame(draw)
 }
 function schedule(){if(!raf&&!disposed&&visible&&!document.hidden)raf=requestAnimationFrame(draw)}
 const waterPoint=e=>{const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left-view.x)/view.s,y=(e.clientY-b.top-view.y)/view.s;let dx=(x-370)/520,dy=(y-298)/280;const length=Math.abs(dx)+Math.abs(dy);if(length>.47){dx*=.47/length;dy*=.47/length}return{x:.5+dx,y:.5+dy}}
 const downEvent=e=>{if(e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});down={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);const stage=phase(snapshot?.now??0);if(['bite','reel'].includes(stage)){holding=true;onControl(true);if(stage==='bite')onHook()}else if(['rest','miss'].includes(stage)){aim=waterPoint(e);schedule()}}
 const move=e=>{if(down&&aim){aim=waterPoint(e);schedule()}}
 const up=()=>{if(!down)return;down=null;if(holding){holding=false;onControl(false)}else if(aim){const target=aim;aim=null;onCast(target);schedule()}}
 const cancel=()=>{down=null;aim=null;if(holding){holding=false;onControl(false)}}
 const keydown=e=>{if(![' ','Enter'].includes(e.key)||e.repeat)return;e.preventDefault();const stage=phase(snapshot?.now??0);if(['bite','reel'].includes(stage)){holding=true;onControl(true);if(stage==='bite')onHook()}else if(['rest','miss'].includes(stage))onCast({x:.54,y:.48})}
 const keyup=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();cancel()}}
 const listeners=[['pointerdown',downEvent],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['blur',cancel],['keydown',keydown],['keyup',keyup]];for(const [event,fn] of listeners)canvas.addEventListener(event,fn)
 const resize=new ResizeObserver(([entry])=>{size=entry.contentRect;lastPaint=-Infinity;schedule()});resize.observe(host)
 const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;cancel()}else schedule()});observer.observe(host)
 const visibility=()=>{cancelAnimationFrame(raf);raf=0;cancel();schedule()};document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',visibility);schedule()
 return {state(next){if(disposed)return;const id=next.state.fishing.cast?.started;if(id!==castId){castId=id;castStart=performance.now()}if(!snapshot||snapshot.now!==next.now)received=performance.now();snapshot=next;schedule()},destroy(){if(disposed)return;disposed=true;cancel();cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',visibility);for(const [event,fn] of listeners)canvas.removeEventListener(event,fn);atlas.onload=null;atlas.src='';canvas.width=canvas.height=1;canvas.remove();host.classList.remove('fl-pixel-pond');snapshot=null}}
}
