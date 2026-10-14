// 页面级资源随节点生命周期释放；WeakMap 不额外保留已经离开的页面。
const removals = new WeakMap(), documents = new WeakSet()
export function onRemoval(node, cleanup) {
  const list = removals.get(node) || []
  list.push(cleanup); removals.set(node, list)
  const doc = node.ownerDocument
  if (documents.has(doc)) return
  documents.add(doc)
  new MutationObserver(records => {
    for (const record of records) for (const root of record.removedNodes) {
      if (root.isConnected || root.nodeType !== 1) continue
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const fns = removals.get(el)
        removals.delete(el)
        fns?.forEach(fn => fn())
      }
    }
  }).observe(doc, { childList: true, subtree: true })
}

// 只保留附近的完整内容；占位高度保留滚动位置，回看时由最新数据重建。
const windows = new WeakMap()
const viewport = new IntersectionObserver(entries => {
  entries.forEach(entry => windows.get(entry.target)?.visible(entry.isIntersecting))
}, { rootMargin: '1000px' })
const sizes = new ResizeObserver(entries => entries.forEach(entry => windows.get(entry.target)?.resize()))
const scrollIntents = new WeakMap()
function scrollIntent(root) {
  let intent = scrollIntents.get(root)
  if (intent) return intent
  intent = { upAt: 0, touchY: null }
  const wheel = event => { if (event.deltaY < 0) intent.upAt = Date.now() }
  const touchStart = event => { intent.touchY = event.touches[0]?.clientY ?? null }
  const touchMove = event => {
    const y = event.touches[0]?.clientY
    if (intent.touchY != null && y != null && y > intent.touchY + 4) intent.upAt = Date.now()
  }
  const touchEnd = () => { intent.touchY = null }
  const keydown = event => { if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) intent.upAt = Date.now() }
  root.addEventListener('wheel', wheel, { passive: true })
  root.addEventListener('touchstart', touchStart, { passive: true })
  root.addEventListener('touchmove', touchMove, { passive: true })
  root.addEventListener('touchend', touchEnd, { passive: true })
  root.addEventListener('keydown', keydown)
  scrollIntents.set(root, intent)
  onRemoval(root, () => {
    root.removeEventListener('wheel', wheel)
    root.removeEventListener('touchstart', touchStart)
    root.removeEventListener('touchmove', touchMove)
    root.removeEventListener('touchend', touchEnd)
    root.removeEventListener('keydown', keydown)
    scrollIntents.delete(root)
  })
  return intent
}
export function windowContent(shell, render, { scrollRoot } = {}) {
  let mounted = true, height = 0, width = 0, draft = false
  const doc = shell.ownerDocument
  const initial = shell.getBoundingClientRect()
  height = initial.height; width = initial.width
  const intent = scrollRoot && scrollIntent(scrollRoot)
  const preserveScroll = (before, delta, oldHeight = before.height) => {
    if (!scrollRoot?.isConnected || !delta) return
    const top = scrollRoot.getBoundingClientRect().top
    if (before.top >= top) return
    // 静止时保持下一条消息的位置；正在向上滑时，半露出的行不反向推滚动条。
    if (before.top + oldHeight > top && Date.now() - intent.upAt < 500) return
    scrollRoot.scrollTop += delta
  }
  const mount = () => {
    if (mounted) return
    const before = shell.getBoundingClientRect()
    shell.style.height = ''; shell.classList.remove('memory-sleep')
    shell.replaceChildren(...render()); mounted = true
    const after = shell.getBoundingClientRect()
    height = after.height; width = after.width
    preserveScroll(before, after.height - before.height)
  }
  windows.set(shell, {
    visible(isIntersecting) {
      if (isIntersecting) { mount(); return }
      if (!mounted || !shell.isConnected || !shell.getClientRects().length) return
      // 正在编辑或展开的评论保留原控件与草稿。
      draft = shell.contains(doc.activeElement) || [...shell.querySelectorAll('input,textarea')].some(e => e.value)
      if (draft || shell.querySelector('.card-comments:not([hidden])')) return
      const rect = shell.getBoundingClientRect()
      if (!rect.height || !rect.width) return
      height = rect.height; width = rect.width
      shell.style.height = height + 'px'; shell.classList.add('memory-sleep')
      shell.replaceChildren(); mounted = false
    },
    resize() {
      if (mounted) {
        const before = shell.getBoundingClientRect()
        const next = before.height
        // 初次观察时节点刚从脱离文档状态插入，0 并不是旧内容高度。
        if (height > 0) preserveScroll(before, next - height, height)
        height = next; width = before.width
      } else if (width && shell.clientWidth && shell.clientWidth !== width) {
        height *= shell.clientWidth / width; width = shell.clientWidth
        shell.style.height = height + 'px'
      }
    }
  })
  viewport.observe(shell); sizes.observe(shell)
  onRemoval(shell, () => { viewport.unobserve(shell); sizes.unobserve(shell); windows.delete(shell) })
  return shell
}
