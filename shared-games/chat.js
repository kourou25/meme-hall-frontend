import {renderWinnerChat} from './winner-chat.js';
// Both hosts use guess_sidebar_messages. Never use main-group message IDs here.
export function createGameChat({h,api,base='/guess-sidebar/messages',renderMessage,renderBody,emojiPicker,onSignal=()=>{},onDestroy=()=>{},openGuess=()=>{},group={id:1},panes,destination='VIP'}){
 const list=h('div',{class:'cm-list sc-list'}),scroller=h('div',{class:'cm-scroll sc-scroll'},list),status=h('span',{role:'status',class:'sc-status'}),input=h('textarea',{'aria-label':destination+'聊天消息',placeholder:destination?'发送到'+destination+'聊天…':'发送消息…',rows:2,maxlength:4000});
 const doc=input.ownerDocument,win=doc.defaultView,life=new win.AbortController();let dead=false,visible=true,polling=false,pollTimer=0,pollController=null,retry=2500,last=0,since=0,day=0,editing=null,reply=null,attempt=null;
 const rows=new Map(),values=new Map(),st={ownPoll:true},button=(text,run,props={})=>h('button',{type:'button',onclick:run,...props},text);
 const cancel=button('取消',()=>{editing=reply=attempt=null;input.value='';context.hidden=true});
 const contextText=h('span'),context=h('div',{class:'sc-context',hidden:true},contextText,cancel);
 const sendButton=button(destination?'发送到'+destination:'发送',()=>send(),{class:'btn btn-primary'});
 const emoji=button('☺',e=>emojiPicker?.(e.currentTarget,text=>{input.value+=text.includes(':')?'['+text+']':text;focus()}),{'aria-label':'选择表情',hidden:!emojiPicker});
 const chat=h('div',{class:'cm-chat-column sc-column'},scroller,h('form',{class:'sc-compose',onsubmit:e=>{e.preventDefault();send()}},context,input,h('div',{class:'sc-bar'},emoji,status,sendButton)));
 const el=h('div',{class:'cm-pane shared-chat'},chat);
 const live=()=>!dead&&visible&&!doc.hidden&&el.isConnected;
 const request=async(path,options={})=>{const data=await api(path,{signal:life.signal,...options});if(dead)throw new win.DOMException('聊天已关闭','AbortError');return data};
 const pane={simple:true,el,chat,scroller,st,group,poll,destroy,update,openGuess,send,focus,setReply,setEdit,recalled:()=>poll(),jumpTo:()=>{},search:()=>{},setVisible};
 function focus(){input.focus({preventScroll:true})}
 function setEdit(m){if(!m.can_edit)return;editing=m;reply=attempt=null;input.value=m.body;context.hidden=false;contextText.textContent='编辑'+destination+'消息';focus()}
 function setReply(m){if(m.deleted)return;reply=m;editing=attempt=null;context.hidden=false;contextText.textContent='回复 '+m.user.name+'：'+m.body.slice(0,100);focus()}
 function defaultMessage(m){return h('article',{class:'sc-message'},h('header',{},m.user.avatar&&h('img',{src:m.user.avatar,alt:'',width:26,height:26,loading:'lazy'}),h('strong',{},m.user.name),h('time',{},new Date(m.created_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))),h('div',{class:'sc-text'},m.deleted?'消息已撤回':renderBody?renderBody(m.body):m.body))}
 function update(m){const prior=values.get(m.id);if(prior&&JSON.stringify(prior)===JSON.stringify(m))return;const old=rows.get(m.id),node=h('div',{class:'sc-entry'},renderWinnerChat(h,m)||(renderMessage?renderMessage(m,pane):defaultMessage(m)));
  if(!m.deleted&&!m.system)node.append(h('div',{class:'sc-message-actions'},button('回复',()=>setReply(m)),m.can_edit&&button('编辑',()=>setEdit(m))));
  if(old)old.replaceWith(node);else list.append(node);rows.set(m.id,node);values.set(m.id,m);last=Math.max(last,m.id);
  while(rows.size>100){const[id,n]=rows.entries().next().value;n.remove();rows.delete(id);values.delete(id)}
 }
 function schedule(delay){win.clearTimeout(pollTimer);if(live())pollTimer=win.setTimeout(poll,delay)}
 async function poll(){if(!live()||polling)return;polling=true;win.clearTimeout(pollTimer);const controller=new win.AbortController();pollController=controller;const timeout=win.setTimeout(()=>controller.abort(),15000);let next=retry;
  try{const d=await request(`${base}?after=${last}&since=${since}`,{signal:controller.signal});if(!live())return;
   if(day&&d.day!==day){rows.clear();values.clear();list.replaceChildren();last=0;editing=reply=attempt=null;context.hidden=true}day=d.day;
   const follow=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<100;
   d.changed.forEach(update);d.items.forEach(update);since=d.now;if(d.signal)onSignal(d.signal);status.textContent='';if(follow)scroller.scrollTop=scroller.scrollHeight;retry=2500;next=d.more?0:retry;
  }catch(e){if(live()){status.textContent=(e.name==='AbortError'?'连接超时':e.message)+'；自动重试';retry=Math.min(30000,retry*2);next=retry}}finally{win.clearTimeout(timeout);pollController=null;polling=false;schedule(next)}
 }
 async function send(text){if(dead||sendButton.disabled)return;const draft=text||input.value.trim();if(!draft)return;const body=reply?`> ${reply.user.name}：${reply.body.replace(/\s+/g,' ').slice(0,200)}\n\n${draft}`:draft;
  if(body.length>4000){status.textContent='含引用最多4000字，请缩短内容';return}
  const id=editing?.id;if(!attempt||attempt.body!==body||attempt.id!==id)attempt={body,id,nonce:crypto.randomUUID()};sendButton.disabled=true;status.textContent='发送中…';
  try{const d=await request(id?base+'/'+id:base,{method:id?'PATCH':'POST',body:attempt});update(d.message);editing=reply=attempt=null;input.value='';context.hidden=true;status.textContent=destination?'已发送到'+destination:'已发送';scroller.scrollTop=scroller.scrollHeight}
  catch(e){if(!dead)status.textContent=e.message+'；内容已保留，可重试'}finally{if(!dead)sendButton.disabled=false}
 }
 function setVisible(value){visible=value;win.clearTimeout(pollTimer);if(!live())pollController?.abort();else poll()}
 function destroy(){if(dead)return;dead=true;life.abort();win.clearTimeout(pollTimer);pollController?.abort();panes?.delete(pane);rows.clear();values.clear();onDestroy();el.remove()}
 doc.addEventListener('visibilitychange',()=>setVisible(visible),{signal:life.signal});win.addEventListener('online',()=>poll(),{signal:life.signal});win.addEventListener('pagehide',destroy,{once:true,signal:life.signal});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}},{signal:life.signal});
 panes?.add(pane);queueMicrotask(poll);return pane;
}
