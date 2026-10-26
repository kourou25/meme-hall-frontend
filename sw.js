// 只缓存图片类静态资源：表情、贴纸、壁纸、伪装图标、用户上传的图（/img，文件名带哈希不会变）
// 页面、脚本、接口一律不碰，照常走网络，免得发版后用到旧代码
const STATIC = 'jh-static-v1' // 表情 / 贴纸 / 壁纸：数量有限，全留着
const IMG = 'jh-img-v1' // 用户图：只留最近的一批
const IMG_MAX = 400
const STATIC_RE = /^\/(stickers|emoji|wallpapers|disguise)\/.+\.(png|jpe?g|gif|webp|svg|avif)$/i // packs.json 之类不缓存
const IMG_RE = /^\/img\//

self.addEventListener('push',e=>{
 e.waitUntil((async()=>{
  let data;try{data=e.data?.json()}catch{return}
  if(!data||typeof data.binding!=='string')return
  const sub=await self.registration.pushManager.getSubscription()
  if(!sub)return
  // A logged-out/rebound browser must not show an old account's queued notification.
  let state
  try{const res=await fetch('/api/push/status',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint}),signal:AbortSignal.timeout(5000)});if(!res.ok)return;state=await res.json()}catch{return}
  if(!state.enabled||state.binding!==data.binding)return
  const url=typeof data.url==='string'&&/^\/chat\/\d+$/.test(data.url)?data.url:'/chat'
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  if(windows.some(w=>w.visibilityState==='visible'&&new URL(w.url).pathname===url))return
  await self.registration.showNotification('尽欢',{body:'群聊有新消息',tag:'jh-group-message',renotify:false,data:{url},icon:'/favicon.svg'})
 })())
})
self.addEventListener('notificationclick',e=>{
 e.notification.close()
 e.waitUntil((async()=>{
  const value=e.notification.data?.url,url=typeof value==='string'&&/^\/chat\/\d+$/.test(value)?value:'/chat'
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  const same=windows.find(w=>new URL(w.url).origin===location.origin&&new URL(w.url).pathname===url)
  if(same){await same.focus();return}
  // Existing chat startup restores this account's saved reading position.
  await self.clients.openWindow(url)
 })())
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([STATIC, IMG])
    for (const k of await caches.keys()) if (k.startsWith('jh-') && !keep.has(k)) await caches.delete(k)
    await self.clients.claim()
  })())
})

let trimming = null
async function trim() {
  const c = await caches.open(IMG)
  const keys = await c.keys()
  for (let i = 0; i < keys.length - IMG_MAX; i++) await c.delete(keys[i]) // 最早放进去的先删
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || req.headers.has('range')) return // 视频拖进度条走网络
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  const name = STATIC_RE.test(url.pathname) ? STATIC : IMG_RE.test(url.pathname) ? IMG : null
  if (!name) return
  e.respondWith((async () => {
    const c = await caches.open(name)
    const hit = await c.match(req, { ignoreVary: true })
    if (hit) return hit
    const res = await fetch(req)
    const type = res.headers.get('content-type') || ''
    // 只存完整的图片（视频太大不存）
    if (res.ok && res.status === 200 && type.startsWith('image/')) {
      e.waitUntil(c.put(req, res.clone()).then(() => {
        if (name === IMG) trimming ||= trim().finally(() => { trimming = null })
      }).catch(() => {}))
    }
    return res
  })())
})
