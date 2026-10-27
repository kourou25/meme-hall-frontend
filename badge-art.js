import {GROWTH_V5} from '/growth-v5.js?v=8f410db6'
// Each achievement series owns a distinct new illustration. IDs and awards stay stable.
const tiles={farm_plant:12,farm_steal:11,guess_pressure:38,guess_tormentor:39,guess_firstshot:40,guess_easy:41,guess:0,luck_king:1,luck_last:2,guide:3,newbie:4,elder:17,moyu_god:5,moyu_pro:20,post_god:18,post_pro:19,sese:6,chunse:43,water:7,react:8,night:9,farm_harvest:10,farm_wood:15,farm_discovery:14}
const boards=['guess','guess_winrate','sender_count','sender_paid','chat_count','chat_early','chat_late']
export function badgeVisual(id,level){
 const match=/^rank_(guess_winrate|guess|sender_count|sender_paid|chat_count|chat_early|chat_late)_(day|all)$/.exec(String(id)),tile=match?(match[2]==='all'?24:31)+boards.indexOf(match[1]):tiles[id]??44
 return {tile,level:Math.max(1,Math.min(5,Math.trunc(Number(level))||1)),honor:match?.[2]==='all',day:match?.[2]==='day',style:tile<12?'anime':tile<24?'ink':tile<36?'enamel':'pixel'}
}
export function badgeArt(h,id,level){
 if(id==='resource_respect')return h('span',{class:'resource-honor-badge','data-level':Math.max(1,Math.min(5,Number(level)||1)),'aria-hidden':'true'},h('img',{src:'/assets/badges/resource-respect.svg',alt:'',width:36,height:36,loading:'lazy'}))
 if(GROWTH_V5.includes(id))return h('span',{class:'badge-art-v5 badge-art-lv'+Math.max(1,Math.min(5,Number(level)||1)),'aria-hidden':'true'},h('img',{src:'/assets/badges/v5/'+id+'.svg',alt:'',width:32,height:32,loading:'lazy'}),h('small',null,'✦'.repeat(Math.max(1,Math.min(5,Number(level)||1)))))
 const v=badgeVisual(id,level)
 return h('span',{class:`badge-art-v4 badge-art-lv${v.level} badge-style-${v.style}${v.honor?' badge-honor':v.day?' badge-day':''}`,'aria-hidden':'true'},
  h('span',{class:'badge-v4-sprite',style:{backgroundPosition:`${v.tile%6/5*100}% ${Math.floor(v.tile/6)/7*100}%`}}),
  h('span',{class:'badge-v4-level'},...Array.from({length:v.level},()=>h('i'))))
}
