import {farmBatchLimit} from './farm-plot-view.js?v=810c43bb'
// Keep an exact batch across lost responses. Per-tab storage prevents two tabs
// from replacing each other's recovery record; the server arbitrates revisions.
export function createFarmSession({userId,storage,request,onChange,onNotice,onCommit=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 const key='farm.pending.v1:'+userId
 let data=null,pending=null,status='loading',error='',timer=null,inflight=null,disposed=false
 const view=()=>({data,status,error,pending:pending?.actions??[]})
 const emit=()=>{if(!disposed)onChange(view())}
 const clearTimerNow=()=>{if(timer!==null){clearTimer(timer);timer=null}}
 const clearRecord=()=>{try{if(JSON.parse(storage.getItem(key)||'null')?.id===pending?.id)storage.removeItem(key)}catch{}pending=null}
 const valid=d=>d&&Number.isSafeInteger(d.revision)&&d.revision>=0&&d.state&&typeof d.state==='object'&&Number.isFinite(d.server_time)
 const accept=d=>{data={...d,catalog:d.catalog??data?.catalog,receivedAt:Date.now()}}
 async function load(){
  if(disposed||inflight)return
  status='loading';error='';emit()
  try{
   const response=await request('/api/farm/state')
   if(!response.ok||!valid(response.data))throw Error(response.data?.error||'农场进度暂时无法加载')
   accept(response.data)
   const raw=storage.getItem(key)
   if(raw){
    const p=JSON.parse(raw)
    if(!p||typeof p.id!=='string'||!Number.isSafeInteger(p.revision)||!Array.isArray(p.actions)||!p.actions.length||p.actions.length>farmBatchLimit(data))throw Error('浏览器中的待确认操作无法读取，请保留此页面并联系管理员')
    pending=p;status='uncertain';emit();await flush();return
   }
   status='ready';emit()
  }catch(e){status='error';error=e.message||'加载失败，请重试';emit()}
 }
 function enqueue(action){
  return enqueueActions([action])
 }
 function enqueueActions(actions){
  if(disposed||!data||!['ready','queued'].includes(status))return false
  if(!Array.isArray(actions)||!actions.length)return false
  if((pending?.actions.length??0)+actions.length>farmBatchLimit(data)){error='这一批操作已满，请稍候再操作';emit();return false}
  const merged=[...(pending?.actions??[]),...actions]
  if(new Set(merged.map(a=>JSON.stringify(a))).size!==merged.length)return false
  const next=pending?{...pending,actions:merged}:{id:crypto.randomUUID(),revision:data.revision,actions:merged}
  try{storage.setItem(key,JSON.stringify(next))}catch{error='浏览器无法保存待确认操作，请允许本站存储后重试';emit();return false}
  pending=next;status='queued';error='';emit()
  if(timer===null)timer=setTimer(()=>{timer=null;void flush()},180)
  return true
 }
 async function flush({keepalive=false}={}){
  clearTimerNow()
  if(inflight)return inflight
  if(!pending)return
  status='saving';error='';emit()
  const batch=pending
  inflight=(async()=>{
   try{
    const response=await request('/api/farm/actions',batch,{keepalive}),d=response.data
    if(response.ok&&valid(d)){
     accept(d);clearRecord();status='ready';if(!disposed){try{onCommit(batch.actions,d)}catch{console.warn('farm_feedback_failed')}const counts=new Map();for(const message of d.messages??[])counts.set(message,(counts.get(message)??0)+1);onNotice(counts.size?[...counts].map(([message,count])=>message+(count>1?`（${count}次）`:'')).join(' · '):d.duplicate?'操作已确认，未重复结算':'进度已保存')}
    }else if(response.status===400||response.status===409&&valid(d)){
     if(valid(d))accept(d)
     error=d?.error||'操作未完成，请根据当前进度重新操作';clearRecord();status='ready'
     if(!disposed)onNotice(error)
    }else{status='uncertain';error=d?.error||'尚未确认保存结果，请重试确认；不会重复获得或扣除物品'}
   }catch{status='uncertain';error='连接中断，尚未确认保存结果。重试会核对同一批操作，不会重复结算'}
   finally{inflight=null;emit()}
  })()
  return inflight
 }
 return {view,load,enqueue,enqueueBatch:actions=>!pending&&status==='ready'&&enqueueActions(actions),flush,retry:()=>pending?flush():load(),async dispose(){disposed=true;clearTimerNow();if(pending)return flush({keepalive:true})}}
}
