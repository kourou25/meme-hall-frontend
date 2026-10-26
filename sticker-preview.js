// 面板只解码可见的小动画；切页、隐藏页面和关闭面板均释放动画。
export function stickerPreviews(grid) {
  const doc = grid.ownerDocument
  const Observer = doc.defaultView.IntersectionObserver
  const visible = new Set()
  let images = [], stopped = false
  const paint = img => {
    const src = !stopped && !doc.hidden && visible.has(img) ? img.dataset.animation : img.dataset.poster
    if (img.getAttribute('src') !== src) img.setAttribute('src', src)
  }
  const observer = new Observer(entries => {
    for (const entry of entries) {
      if (!images.includes(entry.target)) continue
      if (entry.isIntersecting && entry.intersectionRatio > 0) visible.add(entry.target)
      else visible.delete(entry.target)
      paint(entry.target)
    }
  }, { root: grid, rootMargin: '0px', threshold: [0, 0.01] })
  const visibility = () => images.forEach(paint)
  doc.addEventListener('visibilitychange', visibility)
  const clear = () => {
    observer.disconnect()
    visible.clear()
    images.forEach(paint)
    images = []
  }
  return {
    reset() {
      clear()
      if (stopped) return
      images = [...grid.querySelectorAll('img[data-animation]')]
      images.forEach(img => observer.observe(img))
    },
    dispose() {
      stopped = true
      clear()
      doc.removeEventListener('visibilitychange', visibility)
    },
  }
}
