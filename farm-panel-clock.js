// Local labels only. No polling: opening/refreshing the panel supplies server time.
export function panelClock(dialog,onTick){
 let serverAt=0,clientAt=performance.now(),timer=null
 const stop=()=>{clearInterval(timer);timer=null}
 const now=()=>serverAt+Math.max(0,Math.floor((performance.now()-clientAt)/1000))
 const tick=()=>{if(dialog.open&&!document.hidden)onTick(now())}
 const start=()=>{stop();if(dialog.open&&!document.hidden)timer=setInterval(tick,1000)}
 const visibility=()=>{if(document.hidden)stop();else{start();tick()}}
 dialog.addEventListener('close',stop);document.addEventListener('visibilitychange',visibility)
 return {now,tick,start,sync(t){serverAt=t;clientAt=performance.now()},destroy(){stop();dialog.removeEventListener('close',stop);document.removeEventListener('visibilitychange',visibility)}}
}
