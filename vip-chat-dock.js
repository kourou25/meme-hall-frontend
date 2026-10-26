import {createGameChat} from '/shared-games/chat.js';
import {gameDom} from '/shared-games/dom.js';
import {captureChatScroll} from '/chat-scroll-anchor.js?v=98ddcc7d';

export function createVipChatDock({pane,scroller,opener,api,emojiPicker,renderBody}){
 const doc=pane.ownerDocument,win=doc.defaultView,{h}=gameDom(doc),desktop=win.matchMedia('(min-width:761px)');
 const stylesReady=Promise.all(['/vip-chat-dock.css?v=98ddcc7d','/shared-games/chat.css?v=98ddcc7d'].map(href=>{
  const existing=doc.querySelector(`link[href="${href}"]`);if(existing?.sheet)return;
  const link=existing||h('link',{rel:'stylesheet',href});return new Promise(resolve=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});if(!existing)doc.head.append(link)});
 }));
 let opened=false,dead=false,client=null,workspace=null,draft='',opening=0;
 const body=h('div',{class:'vc-body'}),closeButton=h('button',{type:'button','aria-label':'关闭VIP聊天',title:'关闭VIP聊天',onclick:close},'×');
 const panel=h('aside',{class:'vc-panel',hidden:true,'aria-label':'VIP聊天小屏'},
  h('header',{class:'vc-head'},h('strong',{},'VIP聊天'),h('a',{href:'https://cc.52dmeme.com/chat/1',target:'_blank',rel:'noopener','aria-label':'在VIP打开聊天'},'打开 ↗'),closeButton),
  h('p',{class:'vc-note'},'独立聊天 · 每日零点清空'),body);
 // The sibling SP pane owns the viewport calculation, including announcements.
 // Give this panel a definite height so its messages cannot size the grid row.
 const sizeObserver=new win.ResizeObserver(syncSize);
 function syncSize(){
  const reference=opened&&desktop.matches&&workspace?.querySelector(':scope>.chat-page');
  const height=reference?reference.getBoundingClientRect().height+'px':'';
  if(panel.style.height!==height)panel.style.height=height;
 }
 function layout(){
  if(dead||!opened)return;
  const anchor=captureChatScroll(scroller),wide=desktop.matches;
  workspace?.classList.remove('vip-open');workspace=pane.closest('.chat-workspace');
  const host=wide?(workspace||doc.body):pane;
  if(panel.parentElement!==host)host.append(panel);
  workspace?.classList.toggle('vip-open',wide);
  panel.classList.toggle('vc-floating',wide&&!workspace);
  pane.classList.add('vc-open');pane.classList.toggle('vc-mobile-open',!wide);
  sizeObserver.disconnect();const reference=wide&&workspace?.querySelector(':scope>.chat-page');if(reference)sizeObserver.observe(reference);syncSize();
  anchor();
 }
 async function open(){
  if(dead)return;if(opened){client?.focus();return}
  opened=true;const turn=++opening;await stylesReady;if(dead||!opened||turn!==opening)return;
  const restore=captureChatScroll(scroller);panel.hidden=false;layout();
  client=createGameChat({h,api,base:'/game-chat',emojiPicker,renderBody});body.append(client.el);
  client.el.querySelector('textarea').value=draft;client.poll();opener?.setAttribute('aria-expanded','true');restore();
 }
 function close(focus=true){
  if(!opened)return;const restore=captureChatScroll(scroller);if(client)draft=client.el.querySelector('textarea')?.value||'';client?.destroy();client=null;body.replaceChildren();opened=false;opening++;sizeObserver.disconnect();panel.hidden=true;panel.remove();
  workspace?.classList.remove('vip-open');workspace=null;pane.classList.remove('vc-open','vc-mobile-open');opener?.setAttribute('aria-expanded','false');restore();
  if(focus)opener?.focus({preventScroll:true});
 }
 function destroy(){if(dead)return;close(false);dead=true;sizeObserver.disconnect();desktop.removeEventListener('change',layout);panel.remove()}
 desktop.addEventListener('change',layout);
 return {open,close,destroy};
}
