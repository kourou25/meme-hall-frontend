// 只缓存图片类静态资源：表情、贴纸、壁纸、伪装图标、用户上传的图（/img，文件名带哈希不会变）
// 页面、脚本、接口一律不碰，照常走网络，免得发版后用到旧代码
const STATIC = 'jh-static-v1' // 表情 / 贴纸 / 壁纸：数量有限，全留着
const IMG = 'jh-img-v1' // 用户图：只留最近的一批
const IMG_MAX = 400
const STATIC_RE = /^\/(stickers|emoji|wallpapers|disguise)\/.+\.(png|jpe?g|gif|webp|svg|avif)$/i // packs.json 之类不缓存
const IMG_RE = /^\/img\//

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
