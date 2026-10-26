// 只比较已取得的专区快照；不发请求、不补播历史追加。
export function createRewardTracker(){
 let id=null,high=0
 return {reset(){id=null;high=0},update(round){
  const next=round?.message_id,value=Math.round(Number(round?.escalation?.added)*100)
  if(!next||!Number.isSafeInteger(value)||value<0){id=null;high=0;return 0}
  if(id!==next){id=next;high=value;return 0}
  const delta=Math.max(0,value-high);high=Math.max(high,value)
  return round.state==='open'?delta:0
 }}
}
export function createRewardFeedback(doc,visible){
 const win=doc.defaultView,tracker=createRewardTracker(),node=doc.createElement('span')
 node.className='gr-reward-gain';node.setAttribute('role','status');node.setAttribute('aria-live','polite')
 if(!doc.getElementById('gr-reward-feedback-style')){
  const style=doc.createElement('style');style.id='gr-reward-feedback-style';style.textContent=`
  .gr-round .gr-reward-value{position:relative;isolation:isolate}
  .gr-reward-gain{display:inline-flex;align-items:center;gap:3px;margin-left:6px;white-space:nowrap;color:#916016;font-weight:650;pointer-events:none;font-variant-numeric:tabular-nums;animation:gr-reward-rise 1.8s ease-out both}
  .gr-reward-gain::before{content:'+';display:inline-grid;place-items:center;width:15px;height:15px;border:1px solid #b88a3f;border-radius:50%;background:#fff6d9;color:#916016;line-height:1;font-size:11px;box-shadow:inset 0 0 0 2px #fffdf4}
  [data-theme=dark] .gr-reward-gain{color:#e9c16f}[data-theme=dark] .gr-reward-gain::before{background:#3a3325;color:#f4d78e;box-shadow:inset 0 0 0 2px #29271f}
  @keyframes gr-reward-rise{0%{opacity:0;transform:translateY(5px)}18%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-5px)}}
  @media(prefers-reduced-motion:reduce){.gr-reward-gain{animation:none}}
  `;doc.head.append(style)
 }
 let timer=0,pending=0
 function clear(){win.clearTimeout(timer);timer=0;pending=0;node.remove()}
 function reset(){clear();tracker.reset()}
 function visibility(){if(doc.hidden)reset()}
 doc.addEventListener('visibilitychange',visibility)
 return {update(round,meta){
  if(!visible()||doc.hidden){reset();return}
  const delta=tracker.update(round),target=meta.querySelector('.gr-round')
  if(delta){pending+=delta;node.textContent=`${(pending/100).toFixed(2)} LDC`;node.setAttribute('aria-label',`奖励增加 ${(pending/100).toFixed(2)} LDC`);win.clearTimeout(timer);timer=win.setTimeout(clear,1800)}
  if(pending&&target){target.append(node);if(delta)for(const animation of node.getAnimations())animation.currentTime=0}
 },reset,destroy(){reset();doc.removeEventListener('visibilitychange',visibility)}}
}
