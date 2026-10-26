const defaults={autoBuy:false,batch:false,ranchBatch:false,buyQuantity:1,sellQuantity:1}
export function createFarmPreferences(storage,userId){
 const key='farm.preferences.v1:'+userId
 let saved;try{saved=JSON.parse(storage.getItem(key)||'null')}catch{}
 const value={...defaults}
 if(saved&&typeof saved==='object')for(const [k,v] of Object.entries(saved)){
  if(['autoBuy','batch','ranchBatch'].includes(k)&&typeof v==='boolean')value[k]=v
  if(['buyQuantity','sellQuantity'].includes(k)&&(v==='plots'||Number.isInteger(v)&&v>=1&&v<=99))value[k]=v
 }
 return {value,set(k,v){if(!(k in defaults))return false;const old=value[k];value[k]=v;try{storage.setItem(key,JSON.stringify(value));return true}catch{value[k]=old;return false}}}
}
export const sortFarmSeeds=(crops,seeds)=>[...crops].sort((a,b)=>(seeds[b.id]??0)-(seeds[a.id]??0))
export const farmQuantity=(value,state)=>value==='plots'?state.plots.length:value
