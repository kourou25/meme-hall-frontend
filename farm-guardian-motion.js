// A tiny presentation state machine. It never reads or writes gameplay state.
export function createGuardianMotion(){
 let action='idle',started=0,until=0,offset=0,last=0,facing=1
 const trigger=(kind,t)=>{action=kind;started=t;until=t+(kind==='greet'?2300:3600)}
 return {trigger,sample(t,reduced=false){
  const dt=last?Math.min(50,Math.max(0,t-last)):0;last=t
  if(reduced)return {frame:0,offset:0,facing:1}
  if(t<until){const elapsed=t-started;return {frame:action==='greet'?(elapsed<1800?2:7):elapsed<700?5:elapsed<2700?6:7,offset,facing:1}}
  const phase=t%28000
  const goal=phase<12000?0:phase<17000?(phase-12000)/5000*25:phase<21000?25:phase<26000?25-(phase-21000)/5000*25:0
  const delta=Math.max(-dt*.012,Math.min(dt*.012,goal-offset));offset+=delta
  if(Math.abs(delta)>.001){facing=delta>0?1:-1;return {frame:Math.floor(t/260)%2?3:4,offset,facing}}
  return {frame:phase>8000&&phase<8300?1:phase>=26000?7:0,offset,facing:1}
 }}
}
export const guardianSheet=id=>'/assets/raffle/anime-v6/'+id+'-poses.webp'
