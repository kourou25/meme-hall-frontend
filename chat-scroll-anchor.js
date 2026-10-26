const layouts = new WeakMap()
function snapshot(root) {
  if (!root.clientHeight) return null
  const top = root.getBoundingClientRect().top
  const row = [...root.querySelectorAll('[data-row]')].find(el => el.getBoundingClientRect().bottom > top)
  return {bottom:root.scrollHeight-root.scrollTop-root.clientHeight<3, row, id:row?.dataset.row, offset:row ? row.getBoundingClientRect().top-top : 0, scroll:root.scrollTop}
}
function apply(root, saved) {
  if (!root.isConnected || !root.clientHeight || !saved) return
  if (saved.bottom) { root.scrollTop = root.scrollHeight; return }
  const row = saved.row?.isConnected ? saved.row : [...root.querySelectorAll('[data-row]')].find(el=>el.dataset.row===saved.id)
  if (row) root.scrollTop += row.getBoundingClientRect().top-root.getBoundingClientRect().top-saved.offset
  else root.scrollTop = saved.scroll
}
function controller(root) {
  if (layouts.has(root)) return layouts.get(root)
  const win=root.ownerDocument.defaultView
  let saved=snapshot(root), width=root.clientWidth, height=root.clientHeight, frame=0, locked=false
  const remember=()=>{if(!locked&&root.clientHeight&&root.clientWidth===width&&root.clientHeight===height)saved=snapshot(root)}
  const cancel=()=>{win.cancelAnimationFrame(frame);frame=0;locked=false}
  const restore=value=>{
    cancel();if(!value)return
    locked=true;saved=value;apply(root,value)
    // ResizeObserver and sleeping rows settle after the synchronous reflow.
    frame=win.requestAnimationFrame(()=>{apply(root,value);frame=win.requestAnimationFrame(()=>{apply(root,value);frame=0;locked=false;saved=snapshot(root)})})
  }
  const resize=new win.ResizeObserver(()=>{
    const w=root.clientWidth,h=root.clientHeight
    if(w===width&&h===height)return
    width=w;height=h
    if(h)restore(saved)
  })
  const intent=()=>{cancel();saved=snapshot(root)}
  root.addEventListener('scroll',remember,{passive:true})
  for(const event of ['wheel','touchstart','pointerdown','keydown'])root.addEventListener(event,intent,{passive:true})
  resize.observe(root)
  const state={capture:()=>{const value=locked?saved:snapshot(root)||saved;return()=>restore(value)},position(fn){cancel();fn();saved=snapshot(root)},locked:()=>locked,dispose(){
    cancel();resize.disconnect();root.removeEventListener('scroll',remember)
    for(const event of ['wheel','touchstart','pointerdown','keydown'])root.removeEventListener(event,intent)
    layouts.delete(root)
  }}
  layouts.set(root,state);return state
}
export const captureChatScroll=root=>!layouts.has(root)&&!root.querySelectorAll('[data-row]').length?()=>{}:controller(root).capture()
export const chatLayoutRestoring=root=>layouts.get(root)?.locked()||false
export const observeChatScroll=root=>{const c=controller(root);return()=>c.dispose()}
// Explicit navigation supersedes a pending layout restore; never scroll the page outside the chat.
export function focusChatMessage(root,el){
  controller(root).position(()=>{const r=el.getBoundingClientRect(),top=root.getBoundingClientRect().top;root.scrollTop+=r.top-top-Math.max(0,(root.clientHeight-r.height)/2)})
}
