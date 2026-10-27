import {mountSession} from '/shared-games/session.js';
import {gameDom} from '/shared-games/dom.js';
import {createGameChat} from '/shared-games/chat.js';
import {captureChatScroll} from '/chat-scroll-anchor.js?v=8f410db6';
export function createGamePanel({pane,chat,scroller,opener,user,api,onMode,emojiPicker,renderBody}){
 const doc=pane.ownerDocument,win=doc.defaultView,{h,...dom}=gameDom(doc);
 for(const href of ['/game-panel.css?v=8f410db6','/shared-games/session.css','/shared-games/chat.css?v=8f410db6'])if(!doc.querySelector(`link[href="${href}"]`))doc.head.append(h('link',{rel:'stylesheet',href}));
 let opened=false,dead=false,session=null,outside=null,mode='',restore=null;
 const choice=h('select',{'aria-label':'切换游戏与聊天',onchange:()=>{const value=choice.value;choice.value=mode;onMode(value)}},...[['guess','普通猜词'],['arena','AI 对抗'],['drawing','卧底画家'],['outside','VIP聊天']].map(([value,label])=>h('option',{value},label)));
 const body=h('div',{class:'gp-body'}),link=h('a',{target:'_blank',rel:'noopener',href:'https://cc.52dmeme.com/chat/1'},'VIP 打开 ↗');
 const panel=h('section',{class:'gp-panel',hidden:true,'aria-label':'SP / VIP 游戏分屏'},h('header',{class:'gp-head'},choice,link,h('button',{type:'button','aria-label':'关闭分屏',onclick:close},'×')),body);pane.append(panel);
 function layout(){if(dead)return;const wide=pane.clientWidth>=800;pane.classList.toggle('gp-open',opened);pane.classList.toggle('gp-wide',opened&&wide);panel.hidden=!opened;if(opened||!pane.matches('.gr-open,.hc-open'))chat.inert=opened&&!wide;opener?.setAttribute('aria-expanded',String(opened))}
 const observer=new win.ResizeObserver(layout);observer.observe(pane);
 function clear(){session?.destroy();outside?.destroy();session=outside=null;body.replaceChildren()}
 function open(value,roomId=''){
  if(dead)return;if(!['arena','drawing','outside'].includes(value))return;
  if(opened&&mode===value&&!roomId){return}
  if(!opened)restore=captureChatScroll(scroller);opened=true;mode=value;choice.value=mode;clear();body.classList.toggle('gp-chat-body',mode==='outside');layout();
  if(mode==='outside'){
   link.href='https://cc.52dmeme.com/chat/1';
   body.append(h('p',{class:'gp-notice'},'VIP聊天 · 与主群聊分别保存，每日零点清空'));
   outside=createGameChat({h,api,base:'/game-chat',emojiPicker,renderBody});body.append(outside.el);outside.poll();
  }else{
   const main=h('div');body.append(main);link.href='https://cc.52dmeme.com/games/'+mode+(roomId?'?room='+encodeURIComponent(roomId):'');
   session=mountSession({main,me:user,mode,h,api,...dom,initialRoomId:roomId,socketUrl:id=>(win.location.protocol==='https:'?'wss://':'ws://')+win.location.host+'/api/game-rooms/'+id+'/socket',inviteUrl:id=>win.location.origin+'/chat/1?game='+mode+'&room='+id,onRoomChange:id=>{link.href='https://cc.52dmeme.com/games/'+mode+'?room='+id}});
  }
  restore?.();
 }
 function close(){if(!opened)return;opened=false;clear();layout();restore?.();restore=null;opener?.focus({preventScroll:true})}
 function destroy(){if(dead)return;close();dead=true;observer.disconnect();panel.remove();pane.classList.remove('gp-open','gp-wide')}
 return {open,close,destroy};
}
