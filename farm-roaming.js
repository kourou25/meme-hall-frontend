// Visual movement only. Each animal owns a safe area inside the shared pasture.
export function newRanchWalker(index){return {x:0,z:0,yaw:(index%3-1)*.6,wait:index*.37,step:0,target:null,moving:false}}
export function advanceRanchWalker(w,index,dt,paused=false){
 w.moving=false
 if(paused)return w
 dt=Math.max(0,Math.min(.05,dt))
 if(w.wait>0){w.wait=Math.max(0,w.wait-dt);return w}
 if(!w.target){
  const angle=(index*2.399+w.step*1.91),radius=.35+(w.step%3)*.1
  w.target={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};w.step++
 }
 const dx=w.target.x-w.x,dz=w.target.z-w.z,distance=Math.hypot(dx,dz)
 const desired=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(desired-w.yaw),Math.cos(desired-w.yaw))
 w.yaw+=Math.max(-dt*2,Math.min(dt*2,turn))
 if(Math.abs(turn)>.25)return w
 const travel=Math.min(distance,dt*.28)
 if(distance>0){w.x+=dx/distance*travel;w.z+=dz/distance*travel;w.moving=true}
 if(distance<=.015){w.target=null;w.wait=1.5+(index+w.step)%4;w.moving=false}
 return w
}
