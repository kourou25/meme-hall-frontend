import {FISH_SETUP_URL,FISH_SETUP_MESSAGE,needsFishSetup} from '/fish-recipient.js';
export function winnerChatText(data){
 const coin=data.payment_provider==='coin52',unit=coin?'D币':'LDC',platform=coin?'本站 D币钱包':data.payment_provider==='fish'?'Fish 余额':'Linux DO Credit';
 const money=cents=>coin&&cents%100===0?String(cents/100):(cents/100).toFixed(2);
 const amount=data.amount_cents===null?'奖励核定中':`${money(data.amount_cents)} ${unit}`;
 const status=data.amount_cents===null?'名额已锁定':data.state==='accepted'?(data.payment_provider==='credit'?'平台已受理，到账以 Credit 为准':'已到账'):data.state==='rejected'?'发放失败，中奖名额保留':data.state==='unknown'?'到账状态待核对':'发放处理中';
 const remaining=data.remaining_cents===null?'剩余奖金核定中':`剩余 ${money(data.remaining_cents)} ${unit}`;
 return {title:`第 ${data.rank} 位猜中`,reward:amount,platform,status,remaining:`中奖后剩余 ${data.remaining_slots} 个名额 · ${remaining}`};
}
export function renderWinnerChat(h,message){
 const d=message.system;if(d?.kind!=='guess_winner')return null;
 const text=winnerChatText(d),user=message.user||{};
 return h('article',{class:'gm-system-win','data-system-message':'guess_winner','aria-label':'系统中奖消息'},
  h('header',null,h('span',{class:'gm-system-source'},'✓ 系统'),user.avatar&&h('img',{src:user.avatar,alt:'',width:24,height:24,loading:'lazy'}),h('strong',null,user.name||'玩家'),h('time',null,new Date(message.created_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))),
  h('p',{class:'gm-system-reward'},h('span',null,text.title+' · '),h('strong',null,text.reward)),
  h('p',null,text.platform+' · '+text.status),needsFishSetup(d.payment_provider,d)&&h('div',{class:'gm-fish-setup',role:'status'},h('span',null,FISH_SETUP_MESSAGE),h('a',{href:FISH_SETUP_URL,target:'_blank',rel:'noopener noreferrer'},'去 Fish 配置收款')),h('p',{class:'gm-system-remaining'},text.remaining));
}
