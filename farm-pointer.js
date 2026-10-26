// One gesture owns one target set. Sampling also catches fields crossed by fast moves.
export function bindFarmPointer(canvas,{hit,onClick,onBrushStart=()=>{},onBrush=()=>{},onBrushEnd=()=>{}}){
 let press=null;const pointers=new Set()
 const sweep=(x,y)=>{const target=hit(x,y);if(!target)return;const key=target.kind+':'+target.index
  if(press.seen.has(key))return;press.seen.add(key);onBrush(target)}
 const down=e=>{pointers.add(e.pointerId);if(pointers.size>1){cancel();return}
  if(e.pointerType==='mouse'&&e.button!==0)return
  press={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,mouse:e.pointerType==='mouse',moved:false,seen:new Set()}
  canvas.setPointerCapture(e.pointerId)}
 const move=e=>{if(!press||press.id!==e.pointerId)return
  if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>7&&!press.moved){press.moved=true;if(press.mouse){onBrushStart();sweep(press.x,press.y)}}
  if(press.moved&&press.mouse){const n=Math.max(1,Math.ceil(Math.hypot(e.clientX-press.lastX,e.clientY-press.lastY)/8))
   for(let i=1;i<=n;i++)sweep(press.lastX+(e.clientX-press.lastX)*i/n,press.lastY+(e.clientY-press.lastY)*i/n)}
  press.lastX=e.clientX;press.lastY=e.clientY}
 const up=e=>{pointers.delete(e.pointerId);if(!press||press.id!==e.pointerId)return
  move(e);const p=press;press=null
  if(p.moved){if(p.mouse)onBrushEnd(false)}else{const target=hit(e.clientX,e.clientY);if(target)onClick(target)}}
 function cancel(){if(press?.moved&&press.mouse)onBrushEnd(true);press=null}
 const cancelPointer=e=>{pointers.delete(e.pointerId);cancel()},blur=()=>{pointers.clear();cancel()},key=e=>{if(e.key==='Escape')cancel()}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelPointer)
 window.addEventListener('blur',blur);window.addEventListener('keydown',key)
 return()=>{blur();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancelPointer);window.removeEventListener('blur',blur);window.removeEventListener('keydown',key)}
}
