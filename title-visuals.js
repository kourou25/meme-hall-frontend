import {appendBubbleDetail} from '/title-bubble-details.js?v=8f410db6'
export {installBubbleBursts as initializeTitleEffects} from '/title-bubble-bursts.js?v=8f410db6'
// Visual identity is independent of ownership, pool availability and level rules.
const families={court:['lace','blacksilk','whitedragon'],ocean:['deepseek','deepseekupgrade','maid','whalepunch','whalebuddy'],weapon:['blade','spear','sword','halberd','muscle','railcannon','chickengun'],arcane:['gpt','gemini','electric','moon','star'],meadow:['newcomer','mona','claude','snow','wind','flower','sun','cloud'],prank:['giant','worship','nightdevil','rascal','weirdo','loli']}
const family=id=>Object.entries(families).find(([,ids])=>ids.includes(id))?.[0]||'meadow'
export function titleVisualClass(id, stage = 1) {
 stage=Math.min(10,Math.max(1,Math.trunc(Number(stage)||1)))
 const base=id==='whalebuddy'?'rt-restored rt-collection':'rt-anime'
 return `${base} rt-nameplate rt-${family(id)} rt-${id} rt-growth-${stage}` + (id === 'whalebuddy' ? ` whale-stage-${stage}` : '')
}
export function titleBadgeSource(id) {
 if(id==='oldfarmer')return '/assets/farm-memorial/atlas.png'
 if(id==='chickengun')return '/assets/raffle/bubble-growth-v8/chickengun-badge.webp'
 if(id==='muscle')return '/assets/raffle/muscle-tail-still.webp'
 return id==='whalebuddy'?'/assets/raffle/collection/whalebuddy-badge.webp':`/assets/raffle/anime-v6/${id}-badge.webp`
}
// The message is the subject. Only a small edge ornament is appended; artwork
// remains in badges and collection views. Repeated calls are idempotent.
export function attachTitleMotion(el){
 appendBubbleDetail(el)
}
