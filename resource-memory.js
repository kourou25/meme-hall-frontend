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
export function windowContent(shell, render) {
  let mounted = true, height = 0, width = 0, draft = false
  const doc = shell.ownerDocument
  const mount = () => {
    if (mounted) return
    shell.style.height = ''; shell.classList.remove('memory-sleep')
    shell.replaceChildren(...render()); mounted = true
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
    if (!mounted && width && shell.clientWidth && shell.clientWidth !== width) {
      height *= shell.clientWidth / width; width = shell.clientWidth
      shell.style.height = height + 'px'
    }
    }
  })
  viewport.observe(shell); sizes.observe(shell)
  onRemoval(shell, () => { viewport.unobserve(shell); sizes.unobserve(shell); windows.delete(shell) })
  return shell
}
