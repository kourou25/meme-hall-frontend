const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
const uuid=()=>crypto.randomUUID();
const MIN_GAP=30000;
export async function startCloud(){
 const bar=document.getElementById('slime-cloudbar'),status=document.getElementById('slime-cloud-status'),gate=document.getElementById('slime-cloud-gate');
 let uid,key,metaKey,backupKey,revision=0,confirmed=null,current=null,pending=null,inflight=null,timer=0,lastSent=0,locked=false,block=()=>{},leaving=false;
 const say=text=>{status.textContent=text;status.title=text};
 const download=raw=>{const blob=new Blob([raw??'null'],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`史莱姆深渊-${uid??'local'}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const backup=()=>{if(current)localStorage.setItem(backupKey,current)};
 const persist=()=>localStorage.setItem(metaKey,JSON.stringify({revision,confirmed,current,pending}));
 const request=async(method,body)=>{
  const response=await fetch('/api/slime/state',{method,credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({error:'服务返回了异常响应'}));
  if(!response.ok){const error=Object.assign(Error(data.error||'云存档暂时无法连接'),{status:response.status,code:data.code,retry:Number(response.headers.get('retry-after'))||30});throw error}return data;
 };
 const conflict=message=>{
  locked=true;clearTimeout(timer);block(message);say('进度冲突 · 本地副本保留');
  gate.replaceChildren(el('h2','进度需要确认'),el('p',message),el('p','可以下载本机副本，或重新载入另一设备的云存档。本机副本会保留，不会覆盖云端。'));
  const exportButton=el('button','下载本机副本'),reload=el('button','载入云端进度');exportButton.onclick=()=>download(current);
  reload.onclick=()=>{try{backup();localStorage.removeItem(metaKey);localStorage.removeItem(key);location.reload()}catch{say('无法保留本机副本，请先下载备份')}};
  gate.append(exportButton,reload);gate.hidden=false;
 };
 async function flush(){
  clearTimeout(timer);timer=0;if(locked)return false;if(inflight)return inflight;
  if(!pending&&current===confirmed){say('云端已同步');return true}
  if(!current)return true;
  if(!pending){pending={operation:uuid(),revision,raw:current};try{persist()}catch{say('本机存储不可用 · 请保留页面并下载备份');pending=null;return false}}
  const sent=pending;lastSent=Date.now();say('正在同步…');
  inflight=(async()=>{
   try{
    const result=await request('POST',{user_id:uid,revision:sent.revision,operation:sent.operation,state:JSON.parse(sent.raw)});
    if(!Number.isSafeInteger(result.revision)||result.revision!==sent.revision+1||result.operation!==sent.operation)throw Error('保存确认异常，进度仍保留在本机');
    revision=result.revision;confirmed=sent.raw;pending=null;persist();say(current===confirmed?'云端已同步':'已保存在本机 · 等待同步');return true;
   }catch(error){
    if([401,403,409].includes(error.status))conflict(error.message);
    else{say(error.status===400||error.status===413?'云端校验未通过 · 请下载备份':'已保存在本机 · 云端待同步');if([400,413,415].includes(error.status)){locked=true;block(error.message);gate.replaceChildren(el('h2','存档暂时无法同步'),el('p',error.message));const b=el('button','下载本机副本');b.onclick=()=>download(current);gate.append(b);gate.hidden=false}}
    return false;
   }finally{inflight=null;if(!locked&&!leaving&&current!==confirmed)schedule()}
  })();return inflight;
 }
 function schedule(){if(timer||locked||leaving||document.hidden)return;timer=setTimeout(()=>{timer=0;void flush()},Math.max(MIN_GAP-(Date.now()-lastSent),1000))}
 function commit(raw){
  if(locked)throw Error('存档已锁定');current=raw;
  try{persist();localStorage.setItem(key,raw)}catch(error){say('本机存储不可用 · 请保留页面并下载备份');throw error}
  say('已保存在本机 · 等待同步');schedule();
 }
 async function leave(url){
  if(leaving)return;leaving=true;block('正在保存并离开');say('正在保存并离开…');
  let ok=await flush();if(ok&&current!==confirmed)ok=await flush();
  if(ok){location.assign(url);return}
  leaving=false;gate.replaceChildren(el('h2','进度尚未同步'),el('p','本机已有恢复副本。可以重试保存，或下载备份后离开。'));
  const retry=el('button','重试保存并离开'),exit=el('button','保留本机进度并离开'),exportButton=el('button','下载备份');retry.onclick=()=>leave(url);exit.onclick=()=>{backup();location.assign(url)};exportButton.onclick=()=>download(current);gate.append(retry,exportButton,exit);gate.hidden=false;
 }
 document.getElementById('slime-exit').onclick=e=>{e.preventDefault();void leave('/')};
 document.getElementById('slime-farm').onclick=e=>{e.preventDefault();void leave('/farm')};
 document.getElementById('slime-save').onclick=()=>void flush();
 document.getElementById('slime-backup').onclick=()=>download(current);
 window.addEventListener('beforeunload',e=>{if(!leaving&&current!==confirmed){e.preventDefault();e.returnValue=''}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=0;void flush()}else if(current!==confirmed)schedule()});
 window.addEventListener('online',()=>{if(!locked)void flush()});
 window.addEventListener('storage',event=>{if(metaKey&&event.key===metaKey&&!locked)conflict('另一个标签页正在使用此账号的进度。本页已暂停，请只保留一个游戏窗口。')});
 try{
  const cloud=await request('GET');
  if(!Number.isSafeInteger(cloud.user_id)||cloud.user_id<=0||!Number.isSafeInteger(cloud.revision)||cloud.revision<0||(cloud.revision===0?cloud.state!==null:!cloud.state||typeof cloud.state!=='object'))throw Error('云存档响应不完整，未启动空档，请重新连接');
  uid=cloud.user_id;key='jinhuan.slime.v1:'+uid;metaKey=key+':sync';backupKey=key+':recovery';revision=cloud.revision;confirmed=cloud.state?JSON.stringify(cloud.state):null;current=confirmed;
  let cached=null;try{cached=JSON.parse(localStorage.getItem(metaKey)||'null')}catch{throw Error('本机同步记录损坏，请先保留浏览器数据，不要清空存档')}
  if(cached&&(!Number.isSafeInteger(cached.revision)||cached.revision<0||![cached.current,cached.confirmed].every(x=>x===null||typeof x==='string')))throw Error('本机同步记录格式异常，请先下载保留本机数据');
  if(cached?.pending?.operation===cloud.operation&&cloud.operation){
   if(cached.pending.raw!==confirmed){current=cached.current;conflict('操作编号对应的云端内容发生变化，已保留本机进度等待确认。');return {key,locked:true}}
   cached.revision=revision;cached.confirmed=cached.pending.raw;cached.pending=null;
  }
  if(cached&&cached.current!==cached.confirmed){
   current=cached.current;
   if(cached.revision!==revision){conflict('另一设备保存了新进度。本机尚有未同步内容，已暂停载入。');return {key,locked:true,setBlocker(fn){block=fn;fn('进度冲突')},commit,flush}}
   pending=cached.pending;confirmed=cached.confirmed;
  }
  persist();if(current)localStorage.setItem(key,current);else localStorage.removeItem(key);
  say(current===confirmed?'云端已同步':'已恢复本机待同步进度');gate.hidden=true;document.body.classList.remove('slime-loading');
  return {key,get locked(){return locked||leaving},setBlocker(fn){block=fn},commit,flush,backup};
 }catch(error){
  say('云存档未连接');gate.replaceChildren(el('h2','暂时无法读取进度'),el('p',error.message));const retry=el('button','重新连接'),back=el('a','返回站点');retry.onclick=()=>location.reload();back.href='/';gate.append(retry,back);gate.hidden=false;throw error;
 }
}
