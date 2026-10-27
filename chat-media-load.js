import {onRemoval} from '/resource-memory.js?v=c8639d55'

// Public media has its own origin; private attachments and development keep their URL.
export function mediaUrl(value, base = location.href) {
  if (typeof value !== 'string' || !value) return value
  try {
    const page = new URL(base), url = new URL(value, page)
    if (!['52dmeme.com', 'cc.52dmeme.com'].includes(page.hostname) ||
        !['52dmeme.com', 'cc.52dmeme.com'].includes(url.hostname) || !url.pathname.startsWith('/img/')) return value
    const key = decodeURIComponent(url.pathname.slice(5))
    if (!key || key.startsWith('d/') || key.includes('\\') || key.split('/').some(p => p === '..' || p === '.')) return value
    url.protocol = 'https:'; url.host = 'img.52dmeme.com'; url.port = ''
    return url.href
  } catch { return value }
}

const queues = new Set(), jobs = new WeakMap()
let messageRequests = 0
export function beginChatMessageFetch() {
  messageRequests++
  let ended = false
  return () => {
    if (ended) return
    ended = true; messageRequests--
    for (const queue of queues) queue.pump()
  }
}

function queueFor(doc) {
  for (const queue of queues) if (queue.doc === doc) return queue
  const win = doc.defaultView, items = new Set(), active = new Set()
  let scheduled = 0
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) {
      const job = jobs.get(entry.target)
      if (job?.queue === queue) job.near = entry.isIntersecting
    }
    pump()
  }, {rootMargin: '120px'})
  function pump() {
    if (scheduled || !items.size) return
    scheduled = win.requestAnimationFrame(() => {
      scheduled = 0
      if (doc.hidden || messageRequests) return
      for (const job of items) {
        if (active.size >= 2) break
        if (!job.near || job.state !== 'waiting' || !job.img.isConnected) continue
        job.state = 'loading'; active.add(job)
        job.img.loading = 'eager'; job.img.fetchPriority = 'low'; job.img.decoding = 'async'
        const source = mediaUrl(job.source, doc.location.href)
        if (source !== job.source) job.img.crossOrigin = 'anonymous'
        job.img.src = source
      }
    })
  }
  function remove(job) {
    items.delete(job); active.delete(job); observer.unobserve(job.img)
    if (!items.size) {
      observer.disconnect(); win.cancelAnimationFrame(scheduled)
      doc.removeEventListener('visibilitychange', pump); queues.delete(queue)
    } else pump()
  }
  const queue = {doc, pump, remove, add(job) {items.add(job); observer.observe(job.img)}, settled(job) {active.delete(job); observer.unobserve(job.img); pump()}}
  doc.addEventListener('visibilitychange', pump)
  queues.add(queue)
  return queue
}

// Do not assign src until the actual scroll viewport is near this image.
// Keep browser caching/decoding native; never duplicate large files in JS blobs.
export function deferChatImage(img, source) {
  jobs.get(img)?.dispose()
  const job = {img, source, state: 'waiting', near: false, queue: null, disposed: false}
  const settled = () => {
    if (job.disposed || job.state !== 'loading') return
    job.state = 'done'; job.queue.settled(job)
    img.removeEventListener('load', settled); img.removeEventListener('error', settled)
  }
  job.dispose = () => {
    if (job.disposed) return
    job.disposed = true
    img.removeEventListener('load', settled); img.removeEventListener('error', settled)
    job.queue?.remove(job)
    if (job.state === 'loading') img.removeAttribute('src')
    if (jobs.get(img) === job) jobs.delete(img)
  }
  jobs.set(img, job)
  img.setAttribute('data-chat-image', '')
  img.addEventListener('load', settled); img.addEventListener('error', settled)
  onRemoval(img, job.dispose)
  // chat nodes can be created in the main document and adopted by a pop-out.
  queueMicrotask(() => {
    if (job.disposed) return
    if (!img.isConnected) { job.dispose(); return }
    job.queue = queueFor(img.ownerDocument); job.queue.add(job)
  })
  return img
}
