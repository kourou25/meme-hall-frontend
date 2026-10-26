// One observer per chat viewport. Historical windows stay static; previews are
// independent. No polling or database work is needed to manage decorative motion.
export function createChatBubbleVisibility({list,scrollRoot,document:doc=list.ownerDocument,isLive}){
 const win=doc.defaultView,visible=new Set(),active=new Set(),observed=new Set();let frame=0,closed=false,changed=false
 const sync=()=>{frame=0;if(closed)return;const live=!doc.hidden&&list.isConnected&&isLive()
  for(const row of active)if(!live||!visible.has(row)||!row.isConnected){delete row.dataset.bubbleLive;active.delete(row);changed=true}
  if(live)for(const row of visible)if(row.isConnected&&!active.has(row)){row.dataset.bubbleLive='true';active.add(row);changed=true}
  if(changed){changed=false;doc.dispatchEvent(new win.Event('bubblevisibilitychange'))}
 }
 const refresh=()=>{if(!closed&&!frame)frame=win.requestAnimationFrame(sync)}
 const io=new win.IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?visible.add(e.target):visible.delete(e.target);refresh()},{root:scrollRoot,threshold:0})
 const watch=()=>{for(const row of observed)if(row.parentElement!==list){io.unobserve(row);observed.delete(row);visible.delete(row);if(active.delete(row))changed=true;delete row.dataset.bubbleLive}
  for(const row of list.children)if(row.matches('.cm-row')&&!observed.has(row)){observed.add(row);io.observe(row)}refresh()}
 const mo=new win.MutationObserver(entries=>{changed ||=entries.some(e=>e.target!==list);watch()});mo.observe(list,{childList:true,subtree:true});watch()
 const visibility=()=>{if(doc.hidden){win.cancelAnimationFrame(frame);sync()}else refresh()}
 scrollRoot.addEventListener('scroll',refresh,{passive:true});win.addEventListener('resize',refresh,{passive:true});doc.addEventListener('visibilitychange',visibility)
 return {refresh,destroy(){closed=true;win.cancelAnimationFrame(frame);io.disconnect();mo.disconnect();scrollRoot.removeEventListener('scroll',refresh);win.removeEventListener('resize',refresh);doc.removeEventListener('visibilitychange',visibility);for(const row of active)delete row.dataset.bubbleLive;active.clear();visible.clear();observed.clear();doc.dispatchEvent(new win.Event('bubblevisibilitychange'))}}
}
