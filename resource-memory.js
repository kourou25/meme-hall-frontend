import {observeChatScroll,chatLayoutRestoring} from '/chat-scroll-anchor.js?v=98ddcc7d'
// 页面级资源随节点生命周期释放；WeakMap 不额外保留已经离开的页面。
const removals = new WeakMap(), documents = new WeakMap()
function releaseTree(root) {
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const fns = removals.get(el)
    removals.delete(el)
    fns?.forEach(fn => fn())
  }
}
export function onRemoval(node, cleanup) {
  const list = removals.get(node) || []
  list.push(cleanup); removals.set(node, list)
  observeResourceDocument(node.ownerDocument)
}
// 节点可由主窗口创建后移入小窗，目标文档也必须观察删除事件。
export function observeResourceDocument(doc) {
  if (documents.has(doc)) return documents.get(doc)
  const releaseRemoved = records => {
    for (const record of records) for (const root of record.removedNodes) {
      if (root.isConnected || root.nodeType !== 1) continue
      releaseTree(root)
    }
  }
  const observer = new MutationObserver(releaseRemoved)
  observer.observe(doc, { childList: true, subtree: true })
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    // 同一事件中先删除查看器再关闭窗口，删除通知可能尚未派发。
    // disconnect 会丢弃这批记录，而这些媒体已不在 doc 子树中。
    releaseRemoved(observer.takeRecords())
    observer.disconnect()
    documents.delete(doc)
    releaseTree(doc)
  }
  documents.set(doc, dispose)
  return dispose
}

// 只保留附近的完整内容；占位高度保留滚动位置，回看时由最新数据重建。
const windows = new WeakMap()
export const wakeWindowContent=shell=>windows.get(shell)?.mount()
const viewport = new IntersectionObserver(entries => {
  entries.forEach(entry => windows.get(entry.target)?.visible(entry.isIntersecting))
}, { rootMargin: '1000px' })
const sizes = new ResizeObserver(entries => entries.forEach(entry => windows.get(entry.target)?.resize()))
const scrollIntents = new WeakMap()
function scrollIntent(root) {
  let intent = scrollIntents.get(root)
  if (intent) return intent
  intent = { upAt: 0, touchY: null }
  const releaseLayout = observeChatScroll(root)
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
    releaseLayout()
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
  const initial = shell.getBoundingClientRect()
  height = initial.height; width = initial.width
  const intent = scrollRoot && scrollIntent(scrollRoot)
  const preserveScroll = (before, delta, oldHeight = before.height) => {
    if (!scrollRoot?.isConnected || !delta || chatLayoutRestoring(scrollRoot)) return
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
    mount,
    visible(isIntersecting) {
      if (isIntersecting) { mount(); return }
      if (!mounted || !shell.isConnected || !shell.getClientRects().length) return
      // 正在编辑或展开的评论保留原控件与草稿。
      draft = shell.contains(shell.ownerDocument.activeElement) || [...shell.querySelectorAll('input,textarea')].some(e => e.value)
      if (draft || shell.querySelector('.card-comments:not([hidden])') || [...shell.querySelectorAll('video')].some(v=>!v.paused&&!v.ended)) return
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
        if (height > 0 && before.width === width) preserveScroll(before, next - height, height)
        height = next; width = before.width
      } else if (width && shell.clientWidth && shell.clientWidth !== width) {
        // Its content is absent, so a width ratio cannot predict its height.
        // Keep the placeholder stable; mount() measures the real wrapped content.
        width = shell.clientWidth
      }
    }
  })
  viewport.observe(shell); sizes.observe(shell)
  onRemoval(shell, () => { viewport.unobserve(shell); sizes.unobserve(shell); windows.delete(shell) })
  return shell
}
