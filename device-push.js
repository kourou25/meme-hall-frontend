// Device permission is independent of in-site notification categories.
export function devicePushSettings({api,h,userId}){
 const text=h('p',{class:'muted sm',role:'status'},'正在检查设备通知…')
 const button=h('button',{class:'btn sm',type:'button',disabled:true},'开启此设备通知')
 const box=h('section',{class:'device-push-settings'},h('strong',null,'此设备的后台群消息通知'),
  h('p',{class:'muted sm'},'只显示“群聊有新消息”，合并所有群，5 分钟内最多一条；遵循群免打扰和互动提醒开关。'),text,button)
 let registration,subscription,config,enabled=false
 const ownerKey='jh-push-owner'
 const describe=()=>{button.textContent=enabled?'关闭此设备通知':'开启此设备通知';button.disabled=false}
 async function init(){
  if(!globalThis.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
   text.textContent='当前浏览器不支持后台通知。iPhone / iPad 可将本站添加到主屏幕后，从主屏幕打开。';return
  }
  if(Notification.permission==='denied'){text.textContent='浏览器已禁止通知，请在浏览器或系统设置中允许后重试。';return}
  try{
   config=await api('/push/config')
   if(!config.available){text.textContent='后台通知尚未配置，请稍后再试。';return}
   await navigator.serviceWorker.register('/sw.js')
   registration=await navigator.serviceWorker.ready
   subscription=await registration.pushManager.getSubscription()
   if(subscription){const state=await api('/push/status',{method:'POST',body:{endpoint:subscription.endpoint}});enabled=state.enabled;text.textContent=state.failed?'推送近期失败；可关闭后重新开启。':enabled?'已开启，退出当前登录会话后自动解绑。':'此设备尚未为当前登录会话开启通知。'}
   else text.textContent='开启后，即使离开页面，也可接收群消息提醒。'
   describe()
  }catch(error){text.textContent='检查失败：'+error.message;button.textContent='重新检查';button.disabled=false;config=null}
 }
 button.onclick=async()=>{
  button.disabled=true
  if(!config){await init();return}
  try{
   if(enabled){
    await api('/push/subscription',{method:'DELETE',body:{endpoint:subscription.endpoint}})
    enabled=false
    try{await subscription.unsubscribe();subscription=null}catch{throw Error('服务端通知已关闭；浏览器订阅清理失败，重新开启时会再次清理。')}
    try{localStorage.removeItem(ownerKey)}catch{}
    for(const n of await registration.getNotifications({tag:'jh-group-message'}))n.close()
    text.textContent='此设备已关闭后台通知。'
   }else{
    if(await Notification.requestPermission()!=='granted')throw Error('未获通知权限，请在浏览器设置中允许通知。')
    const raw=atob(config.public_key.replaceAll('-','+').replaceAll('_','/')),key=Uint8Array.from(raw,c=>c.charCodeAt(0))
    // A subscription from a revoked session or another account is replaced only on explicit enable.
    if(subscription){await subscription.unsubscribe();subscription=null}
    subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})
    try{await api('/push/subscription',{method:'POST',body:subscription.toJSON()})}catch(error){await subscription.unsubscribe().catch(()=>{});subscription=null;throw error}
    enabled=true;try{localStorage.setItem(ownerKey,String(userId))}catch{}
    text.textContent='已开启，退出当前登录会话后自动解绑。'
   }
  }catch(error){text.textContent=error.message}
  describe()
 }
 init()
 return box
}
