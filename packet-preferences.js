// Reusable rules include explicit escalation amounts; never persist base reward, questions, credentials or payment state.
const choices={mode:['guess','fixed','random'],reward:['ldc','none'],response_mode:['similarity','yesno'],answer_source:['auto','manual'],hint_source:['preset','ai'],preset_hint_trigger:['cooldown','guesses'],hint_schedule:['fixed','increasing']}
const ranges={guess_winners:[1,10],hidden_winners:[0,9],answer_length:[2,8],minutes:[1,1440],count:[1,100],hint_every:[1,1000],hint_increment:[1,1000],hint_cooldown:[1,86400],escalation_every:[1,300]}
const flags=['multi_enabled','owner_participates','auto_hint_enabled','escalation_enabled']
function clean(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const out={}
 for(const [key,allowed] of Object.entries(choices))if(allowed.includes(value[key]))out[key]=value[key]
 for(const [key,[min,max]] of Object.entries(ranges))if(Number.isInteger(value[key])&&value[key]>=min&&value[key]<=max)out[key]=value[key]
 for(const key of flags)if(typeof value[key]==='boolean')out[key]=value[key]
 for(const key of ['escalation_amount','escalation_cap']){const v=String(value[key]??'');if(/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(v)&&Number(v)>=0.01&&Number(v)<=20000)out[key]=Number(v).toFixed(2)}
 return out
}
export function packetPreferences(storage,userId,groupId){
 const valid=id=>/^[1-9]\d{0,19}$/.test(String(id)),key=valid(userId)&&valid(groupId)?`nativePacketPreferences:v1:${userId}:${groupId}`:null
 return {
  read(){if(!key)return null;try{const raw=storage?.getItem(key);return raw&&raw.length<=4096?clean(JSON.parse(raw)):null}catch{return null}},
  save(value){if(!key)return false;try{if(!storage)return false;storage.setItem(key,JSON.stringify(clean(value)||{}));return true}catch{return false}},
  clear(){if(!key)return false;try{if(!storage)return false;storage.removeItem(key);return true}catch{return false}},
 }
}
