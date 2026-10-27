import {cropMatureAt,cropHasPests} from './farm-crop-care.js?v=c8639d55'
import {ranchAnimalStatus} from './farm-ranch.js?v=c8639d55'
import {pigStatus} from './farm-pigs.js?v=c8639d55'
import {plotLocked,plotWork,leaseCanPlant,plotTargetValid} from './farm-plot-view.js?v=c8639d55'
// Auto-purchase is opt-in and is settled atomically by the plant action.
export function farmBrushAction(state,catalog,target,tool,seed,now,{autoBuy=false}={}){
 if(target.kind==='plot'){
  const p=state.plots[target.index];if(!plotTargetValid(state,target)||plotLocked(p,now))return null
  const work=(type,extra)=>plotWork(p,target.index,type,extra)
  const c=catalog.crops.find(c=>c.id===p.crop)
  if((tool==='smart'||tool==='harvest')&&c&&p.wateredAt!==null&&now>=cropMatureAt(p,c))return work('harvest')
  if((tool==='smart'||tool==='pest')&&c&&cropHasPests(p,c,now))return work('pest')
  if((tool==='smart'||tool==='water')&&c&&p.wateredAt===null)return work('water')
  if(tool==='till'&&!p.tilled)return work('till')
  const crop=catalog.crops.find(c=>c.id===seed)
  if(tool==='plant'&&p.tilled&&!p.crop&&crop&&leaseCanPlant(p,crop,now)&&(catalog.allUnlocked||state.xp>=crop.unlock)&&((state.seeds[seed]??0)>0||autoBuy&&state.coins>=crop.seedPrice))return work('plant',{crop:seed,...autoBuy?{autoBuy:true}:{}})
 }else if(target.kind==='animal'){
  const a=state.ranch?.animals[target.index];if(!a)return null
  // Stored is projected by the server; per-animal UI may estimate newly produced units.
  if((tool==='smart'||tool==='harvest')&&a.stored>0)return {type:'animal_collect',animal:target.index}
  if(tool==='feed'&&!a.deadAt&&now<a.fedUntil+(catalog.ranch?.starvationSeconds??172800)&&a.fedUntil<=now&&(state.ranch.feed??0)>0)return {type:'animal_feed',animal:target.index,count:1}
  if((tool==='clean'||tool==='smart')&&ranchAnimalStatus(a,catalog.animals.find(c=>c.id===a.kind),now,catalog.ranch.capacity).manure)return {type:'animal_clean',animal:target.index}
 }else if(target.kind==='pig'){
  const p=state.pigs?.animals.find(p=>p.id===target.index),spec=catalog.pigs?.find(c=>c.id===p?.kind)
  if(p&&spec&&tool==='feed'&&!pigStatus(p,spec,now).dead&&!pigStatus(p,spec,now).adult&&p.fedUntil<=now&&(state.ranch.feed??0)>=(catalog.leisure.pigFeedUnits??2))return {type:'pig_feed_stock',pig:p.id,count:1}
  if(p&&spec&&(tool==='clean'||tool==='smart')&&pigStatus(p,spec,now).manure)return {type:'pig_clean',pig:p.id}
 }
 return null
}
