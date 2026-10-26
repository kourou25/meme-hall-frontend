// One bounded, decorative burst per document. No requests, canvas or per-row timers.
const controllers=new WeakMap()
const reduced=doc=>doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches
const allowed=doc=>!doc.hidden&&doc.hasFocus()&&doc.getSelection()?.isCollapsed!==false&&!reduced(doc)&&doc.documentElement.dataset.bubbleMotion!=='pause'&&doc.documentElement.dataset.pageHidden!=='true'&&![...doc.querySelectorAll('dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"],.modal,.pop')].some(el=>el.getClientRects().length)
const stageOf=b=>Math.max(1,Math.min(10,Number(b.className.match(/\brt-growth-(\d+)\b/)?.[1]||1)))
const current=b=>!b.closest('.cm-row')||b.closest('.cm-row').dataset.bubbleLive==='true'
const eligible=b=>current(b)&&(b.classList.contains('rt-chickengun')?stageOf(b)>1&&b.dataset.cgFire!=='off':b.classList.contains('rt-railcannon')&&stageOf(b)>=2)
const cooldown=b=>b.classList.contains('rt-chickengun')?([12000,12000,11000,10000,9000,8500,8000,7500,7000,6500][stageOf(b)-1]):([14000,14000,13000,12000,10000,9000,8000,7000,6000,5500][stageOf(b)-1])
function visible(el){
 if(!el?.isConnected||!el.getClientRects().length)return false
 const r=el.getBoundingClientRect(),w=el.ownerDocument.defaultView
 if(r.width<=0||r.height<=0||r.bottom<0||r.top>w.innerHeight||r.right<0||r.left>w.innerWidth)return false
 for(let p=el.parentElement;p&&p!==el.ownerDocument.body;p=p.parentElement){const s=w.getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(s.overflowY+s.overflowX)){const b=p.getBoundingClientRect();if(r.bottom<=b.top||r.top>=b.bottom||r.right<=b.left||r.left>=b.right)return false}}
 return true
}
function nextFace(bubble){
 const row=bubble.closest('.cm-row')||bubble.closest('.cm-msg');let own=row?.querySelector('.cm-face')?.dataset.pop
 if(!own){for(let n=row?.previousElementSibling,count=0;n&&count<8;n=n.previousElementSibling,count++){own=n.querySelector('.cm-face')?.dataset.pop;if(own)break}}
 for(let n=row?.nextElementSibling,count=0;n&&count<8;n=n.nextElementSibling,count++){
  if(!n.matches('.cm-row,.cm-msg'))continue
  const face=n.querySelector('.cm-face');if(face&&face.dataset.pop!==own&&visible(face))return face
 }
 return null
}
export function fireBubbleBurst(bubble){
 const doc=bubble?.ownerDocument,state=doc&&controllers.get(doc)
 if(!state||state.active||Date.now()<state.resumeAt||!allowed(doc)||!eligible(bubble)||!visible(bubble))return false
 const stamp=Date.now();if(stamp-(state.last.get(bubble)||0)<cooldown(bubble))return false
 const gun=bubble.classList.contains('rt-chickengun'),stage=stageOf(bubble)
 const r=bubble.getBoundingClientRect(),face=nextFace(bubble),f=face?.getBoundingClientRect()
 const a=bubble.querySelector(gun?'.rt-trim-meme':'.rt-trim-cannon')?.getBoundingClientRect()
 const start=a?{x:a.left+a.width*.2,y:gun?Math.min(a.top+a.height*.25,f?f.top+f.height*.15:r.bottom+28):a.top+a.height*.8}:{x:r.left,y:r.bottom+6}
 const target=f&&f.left<=start.x&&f.top>=r.top&&f.top-start.y<240?{x:f.left+f.width*.45,y:f.top+f.height*.4}:null
 const end=target||{x:Math.max(4,start.x-15),y:start.y+16},dx=end.x-start.x,dy=end.y-start.y
 const layer=doc.createElement('span');layer.className='rt-shot-layer'+(gun?' is-chickengun':'');layer.setAttribute('aria-hidden','true');doc.body.append(layer)
 const animations=[];bubble.classList.add('rt-is-firing');state.last.set(bubble,stamp)
 const cancel=()=>{for(const a of animations)a.cancel();layer.remove();bubble.classList.remove('rt-is-firing');if(state.active?.layer===layer)state.active=null}
 state.active={layer,cancel,bubble}
 layer.dataset.stage=String(stage)
 const shots=gun?(stage>=7?3:stage>=4?2:1):(stage>=9?4:stage>=7?3:stage>=4?2:1)
 for(let i=0;i<shots;i++){
  const drop=doc.createElement('i');drop.className='rt-shot-drop';const port=!gun&&i%2?6:0;drop.style.left=(start.x+port)+'px';drop.style.top=(start.y+port*.5)+'px';layer.append(drop)
  // Reach the avatar gutter before descending, so the next message stays clear.
  const bend=Math.min(-12,dx*.9)-i*2
  animations.push(drop.animate([
   {transform:'translate(0,0) scale(.2)',opacity:0},
   {transform:`translate(${bend}px,${Math.max(2,dy*.08)}px) rotate(28deg) scale(1,.9)`,opacity:.95,offset:.32},
   {transform:`translate(${dx-port+i*.7}px,${dy}px) rotate(65deg) scale(.75,1)`,opacity:.9,offset:.86},
   {transform:`translate(${dx+i}px,${dy+3}px) scale(.2)`,opacity:0}
  ],{duration:target?760:550,delay:i*(gun?220:180),easing:'ease-in',fill:'both'}))
 }
 if(target)for(let i=0;i<(stage>=7?2:1);i++){
  const dot=doc.createElement('i');dot.className='rt-shot-splash';dot.style.left=(end.x+(i%2)*4)+'px';dot.style.top=(end.y+(i-1)*5)+'px';layer.append(dot)
  animations.push(dot.animate([{opacity:0,transform:'scale(.1)'},{opacity:1,transform:'scale(1.25)',offset:.15},{opacity:.6,transform:'translateY(3px) scale(.85)',offset:.65},{opacity:0,transform:'translateY(7px) scale(.4)'}],{duration:900,delay:540+i*25,fill:'both',easing:'ease-out'}))
 }
 if(target){const hit=doc.createElement('i');hit.className='rt-shot-hit';Object.assign(hit.style,{left:f.left+'px',top:f.top+'px',width:f.width+'px',height:f.height+'px'});layer.append(hit);animations.push(hit.animate([{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1.05)',offset:.15},{opacity:.78,transform:'scale(1)',offset:.55},{opacity:0,transform:'scale(1.06)'}],{duration:1050,delay:530,fill:'both',easing:'ease-out'}))}
 Promise.allSettled(animations.map(a=>a.finished)).then(cancel)
 return true
}
export function installBubbleBursts(doc){
 if(controllers.has(doc)||!doc.defaultView)return
 const win=doc.defaultView,state={active:null,last:new WeakMap(),timer:null,resumeAt:0};controllers.set(doc,state)
 let candidates=[]
 const stop=()=>state.active?.cancel()
 const tick=()=>{
  if(!allowed(doc)){shutdown();return}
  if(state.active&&(!state.active.bubble.isConnected||!eligible(state.active.bubble)))stop()
  const selected=candidates.filter(b=>eligible(b)&&visible(b)&&Date.now()-(state.last.get(b)||0)>=cooldown(b)).sort((a,b)=>(state.last.get(a)||0)-(state.last.get(b)||0))[0]
  if(selected)fireBubbleBurst(selected)
 }
 const start=()=>{if(candidates.length&&allowed(doc)&&state.timer==null)state.timer=win.setInterval(tick,1200)}
 const shutdown=()=>{stop();win.clearInterval(state.timer);state.timer=null}
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)shutdown();else start()})
 win.addEventListener('pagehide',shutdown);win.addEventListener('pageshow',start)
 win.addEventListener('blur',shutdown);win.addEventListener('focus',start)
 const interrupt=()=>{state.resumeAt=Date.now()+1600;stop()}
 doc.addEventListener('pointerdown',interrupt,{passive:true});doc.addEventListener('scroll',interrupt,{capture:true,passive:true});win.addEventListener('resize',interrupt,{passive:true})
 doc.addEventListener('bubbleeffectreset',()=>{interrupt();shutdown();candidates=[]})
 doc.addEventListener('beforetoggle',e=>{if(e.target.matches?.('dialog')&&e.newState==='open')shutdown()},true)
 doc.addEventListener('toggle',e=>{if(e.target.matches?.('dialog'))refreshCandidates()},true)
 doc.addEventListener('selectionchange',()=>{if(doc.getSelection()?.isCollapsed===false)stop()})
 const refreshCandidates=()=>{candidates=[...doc.querySelectorAll('.cm-row[data-bubble-live=true] .cm-text:is(.rt-chickengun,.rt-railcannon)')];if(!allowed(doc)){shutdown();return}if(state.active&&(!state.active.bubble.isConnected||!eligible(state.active.bubble)))stop();if(candidates.length)start();else shutdown()}
 doc.addEventListener('bubblevisibilitychange',refreshCandidates)
 doc.addEventListener('pointerover',e=>{const b=e.target.closest?.('.rt-chickengun,.rt-railcannon');if(b&&!b.contains(e.relatedTarget))fireBubbleBurst(b)},{passive:true})
 const prefs=win.matchMedia('(prefers-reduced-motion: reduce)');prefs.addEventListener('change',()=>{if(prefs.matches)stop()})
 new win.MutationObserver(refreshCandidates).observe(doc.documentElement,{attributes:true,attributeFilter:['data-bubble-motion','data-page-hidden']})
 new win.MutationObserver(refreshCandidates).observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','aria-modal']})
 // Legacy overlays attach to body; do not observe every message/particle mutation.
 new win.MutationObserver(entries=>{if(entries.some(e=>[...e.addedNodes,...e.removedNodes].some(n=>n.nodeType===1&&!n.classList.contains('rt-shot-layer'))))refreshCandidates()}).observe(doc.body,{childList:true})
 refreshCandidates()
}
