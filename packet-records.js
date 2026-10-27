import {dcoinIcon} from '/dcoin.js?v=97fd912d'
import {fundingState} from '/packet-funding.js?v=97fd912d'
import {avatarImage} from '/avatar-view.js?v=97fd912d'
export function packetAmount(h,value,provider,extra=''){
 return h('span',{class:'rpk-amount '+extra},provider==='coin52'?dcoinIcon(h):null,h('strong',null,provider==='coin52'?String(Number(value)):value),provider==='coin52'?null:h('small',null,'LDC'))
}
export function packetRecords({h,api,p}){
 const box=h('section',{class:'rpk-claim-records','aria-label':'领取记录'}),board=h('div',{class:'rpk-luck-board',hidden:true}),list=h('ol',{class:'rpk-record-list'})
 const claimed=p.recipients||[],luck=new Map((p.luck||[]).map(w=>[w.user_id,w.badge]))
 for(const r of claimed){const badge=luck.get(r.user_id);list.append(h('li',{class:'rpk-record-row '+(badge||'')},avatarImage(h,r.avatar||'/favicon.svg','领取者头像',28,'rpk-record-avatar'),h('div',{class:'rpk-record-person'},h('strong',null,r.name||'用户'),h('small',null,fundingState(r.state,p.payment_provider)),badge&&h('b',{class:'rpk-luck '+(badge==='luck_king'?'king':'last')},badge==='luck_king'?'手气王':'手气亡')),packetAmount(h,r.amount,p.payment_provider)))}
 if(!claimed.length)list.append(h('li',{class:'rpk-record-empty'},p.draw?'开奖后在此显示中奖和发放记录':'还没有人领取'))
 let period='today',badge='luck_king',seq=0
 const status=h('p',{class:'rpk-help',role:'status'}),rankList=h('ol',{class:'rpk-record-list'}),buttons=[['today','日榜'],['all','总榜']].map(([v,label])=>h('button',{type:'button',class:'rpk-secondary',onclick:()=>{period=v;load()}},label)),kinds=[['luck_king','手气王'],['luck_last','手气亡']].map(([v,label])=>h('button',{type:'button',class:'rpk-secondary',onclick:()=>{badge=v;load()}},label))
 board.append(h('div',{class:'rpk-luck-filters'},h('div',{class:'rpk-platforms'},...buttons),h('div',{class:'rpk-platforms'},...kinds)),status,rankList)
 async function load(){const ticket=++seq;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(period===['today','all'][i])));kinds.forEach((b,i)=>b.setAttribute('aria-pressed',String(badge===['luck_king','luck_last'][i])));status.textContent='正在读取榜单…';try{const d=await api(`/chat/groups/${p.group_id}/packet-luck-stats?period=${period}&badge=${badge}`);if(ticket!==seq||!board.isConnected)return;rankList.replaceChildren(...d.leaders.map((r,i)=>h('li',{class:'rpk-record-row'},h('span',{class:'rpk-rank-number'},i+1),avatarImage(h,r.avatar||'/favicon.svg','榜单头像',28,'rpk-record-avatar'),h('strong',{class:'rpk-record-name'},r.name),h('span',null,r.wins+' 次'))));status.textContent=d.leaders.length?d.scope:'当前还没有已结算的手气记录'}catch(e){if(ticket===seq)status.textContent=e.message}}
 const toggle=h('button',{type:'button',class:'rpk-text-button','aria-expanded':'false',onclick:()=>{board.hidden=!board.hidden;toggle.setAttribute('aria-expanded',String(!board.hidden));if(!board.hidden)load()}},'手气榜 ↗')
 box.append(h('header',{class:'rpk-record-head'},h('h4',null,p.close_kind==='force'?'流局补偿记录':'领取记录'),h('span',null,p.close_kind==='force'?claimed.length+' 人':claimed.length+' / '+p.count),toggle),list,board)
 if(p.draw){const d=p.draw,cancelled=d.settled_at!=null&&d.settled_at<d.draw_at; if(cancelled&&!claimed.length)list.replaceChildren(h('li',{class:'rpk-record-empty'},'本轮已取消，没有开奖或发放奖励'));const people=h('details',{class:'rpk-options'},h('summary',null,`参与名单 · ${d.participant_count} 人`),h('ul',{class:'rpk-draw-people'},...d.participants.map(r=>h('li',null,avatarImage(h,r.avatar||'/favicon.svg','参与者头像',28,'rpk-record-avatar'),h('span',null,r.name),h('small',null,cancelled?'已取消':!d.settled_at?'已报名':r.amount_cents!=null?'已中奖':'未抽中')))),d.more&&h('p',{class:'rpk-help'},'显示前100位参与者；本人结果会单独通知。'));box.append(people)}
 return box
}
