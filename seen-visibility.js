// A long card is judged against its clipped scroll viewport, not its full area.
function coverage(el) {
  if (!el.isConnected || !el.getClientRects().length) return false
  const win = el.ownerDocument.defaultView, rect = el.getBoundingClientRect()
  let left = 0, top = 0, right = win.innerWidth, bottom = win.innerHeight
  for (let p = el.parentElement; p; p = p.parentElement) {
    const style = win.getComputedStyle(p)
    const clipX = /auto|scroll|hidden|clip/.test(style.overflowX)
    const clipY = /auto|scroll|hidden|clip/.test(style.overflowY)
    if (!clipX && !clipY) continue
    const r = p.getBoundingClientRect()
    if (clipX) { left = Math.max(left, r.left + p.clientLeft); right = Math.min(right, r.left + p.clientLeft + p.clientWidth) }
    if (clipY) { top = Math.max(top, r.top + p.clientTop); bottom = Math.min(bottom, r.top + p.clientTop + p.clientHeight) }
  }
  const width = Math.max(0, Math.min(rect.right, right) - Math.max(rect.left, left))
  const height = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top))
  const expectedWidth = Math.min(rect.width, right - left), expectedHeight = Math.min(rect.height, bottom - top)
  if (expectedWidth <= 0 || expectedHeight <= 0) return false
  return {width,height,expectedWidth,expectedHeight,long:rect.height>bottom-top}
}
export function seenCoverage(el){const c=coverage(el);return !!c&&c.width>=c.expectedWidth*.97&&c.height>=c.expectedHeight*(c.long ? .85 : .97)}
export function seenIntersects(el){const c=coverage(el);return !!c&&c.width>0&&c.height>0}
// The artwork is the reading target. A long caption/footer must not force a
// fully viewed collage to be opened in a separate viewer before it is marked.
export function seenPostCoverage(el){
 const media=[...el.querySelectorAll('.media,.im-media')].filter(x=>x.getClientRects().length)
 return media.length?media.some(seenCoverage):seenCoverage(el)
}
