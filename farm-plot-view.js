import {cropMaxSeconds} from './farm-crop-care.js?v=98ddcc7d'

// This is a display projection. Never persist appended plots to farm_saves.
export function farmSceneState(data){
 const state=data.state
 return {...state,ownedPlotCount:state.plots.length,plots:[...state.plots.map(p=>p.leaseCrop?{...p,...p.leaseCrop,leaseUntil:p.leaseUntil,leaseTenant:p.leaseTenant}:p),...(data.rentedPlots??[]).map(l=>({...l.crop_state,leaseId:l.id,leaseOwner:l.owner_name,leasePlot:l.plot,leaseEnds:l.expires_at}))]}
}
export const farmBatchLimit=data=>Math.min(120,Math.max(20,data.state.plots.length+(data.rentedPlots?.length??0),(data.state.ranch?.animals.length??0)+(data.state.pigs?.animals.length??0)))
export const plotTarget=(state,index)=>({kind:'plot',index,...state.plots[index]?.leaseId?{leaseId:state.plots[index].leaseId}:{}})
export const plotIdentity=state=>state.plots.map(p=>p.leaseId??'').join('|')
export const plotLabel=(p,index)=>p.leaseId?`租入 · ${p.leaseOwner}的田地 ${p.leasePlot+1}`:`田地 ${index+1}`
export const plotLocked=(p,t)=>(p.leaseUntil??0)>t||!!p.leaseId&&p.leaseEnds<=t
export function plotWork(p,index,type,extra={}){
 if(!p.leaseId)return {type,plot:index,...extra}
 return ['plant','pest','harvest'].includes(type)?{type:'lease_'+type,leaseId:p.leaseId,...extra}:null
}
export const leaseCanPlant=(p,c,t)=>!p.leaseId||!!c&&t+cropMaxSeconds(c.seconds)<=p.leaseEnds
export function plotTargetValid(state,target){
 const p=state.plots[target.index]
 return !!p&&(p.leaseId??null)===(target.leaseId??null)
}
