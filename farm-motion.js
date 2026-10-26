// Presentation only: no timers, requests, currency, or save mutations.
export function animalPose(time,index,{dead=false,hungry=false,reduced=false,reaction=0}={}){
 if(dead||reduced)return {x:0,z:0,y:0,yaw:0,head:0,tail:0,stride:0}
 const phase=(time+index*1.73)%12,walking=!hungry&&phase<4
 const step=walking?Math.sin(phase*7):0
 return {
  x:walking?Math.sin(phase*Math.PI/2)*.18:0,
  z:walking?Math.sin(phase*Math.PI)*.08:0,
  y:Math.abs(step)*.025+Math.sin(Math.min(1,reaction)*Math.PI)*.12,
  yaw:walking?Math.sin(phase*Math.PI/2)*.35:Math.sin(time*.35+index)*.12,
  head:reaction>0?Math.sin(reaction*Math.PI*4)*.18:hungry?.22+Math.sin(time*1.5+index)*.06:Math.sin(time+index)*.08,
  tail:Math.sin(time*2.2+index)*.3,
  stride:step*.32,
 }
}
export function productMotion(time,index,reduced=false){
 return reduced?{lift:0,scale:1}:{lift:Math.sin(time*2+index)*.035,scale:1+Math.sin(time*2+index)*.035}
}
