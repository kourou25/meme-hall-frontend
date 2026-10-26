// 单页20条纯文本摘要；不开启视频/GIF预览，不轮询，不保留离屏页。
export function openChatFavorites(anchor,{h,icon,api,openPop,closePop,send,toast}){
 const list=h('div',{class:'cm-favorites-list'}),status=h('p',{class:'muted',role:'status'}),prev=h('button',{class:'btn',type:'button'},'上一页'),next=h('button',{class:'btn',type:'button'},'下一页')
 const root=h('section',{class:'cm-favorites','aria-label':'消息收藏'},h('header',null,h('strong',null,'消息收藏'),h('button',{type:'button',class:'cm-ibtn','aria-label':'关闭消息收藏',onclick:closePop},icon('close'))),list,status,h('footer',null,prev,next))
 openPop(anchor,root,{key:'chat-favorites',up:true})
 let cursor='',nextCursor=null,history=[],loading=false
 const labels={image:'图片',g:'动图',v:'视频',l:'实况',f:'文件'}
 function draw(item){
  const counts={};for(const k of item.attachments||[])counts[k]=(counts[k]||0)+1
  const summary=Object.entries(counts).map(([k,n])=>`${labels[k]||'附件'}×${n}`).join(' · ')
  const row=h('article',{class:'cm-favorite-row'}),text=h('div',{class:'cm-favorite-text'},h('p',null,item.unavailable?'来源已撤回或不可查看':item.body||'附件消息'),h('small',null,summary))
  let job={id:item.id,nonce:crypto.randomUUID(),tries:0},busy=false
  const sendButton=h('button',{class:'btn',type:'button',disabled:!!item.unavailable,onclick:async()=>{
   if(busy)return;busy=true;sendButton.disabled=true;sendButton.textContent='发送中…'
   try{await send(job);if(!root.isConnected)return;toast('已发送','ok');job={id:item.id,nonce:crypto.randomUUID(),tries:0};sendButton.textContent='发送'}
   catch(e){if(root.isConnected){status.textContent=e.message;sendButton.textContent='重试'}}
   finally{busy=false;if(root.isConnected)sendButton.disabled=!!item.unavailable}
  }},'发送')
  const remove=h('button',{class:'cm-ibtn',type:'button',title:'移除收藏','aria-label':'移除收藏',onclick:async()=>{
   if(busy)return;remove.disabled=true
   try{await api(`/chat/favorites/${item.id}`,{method:'DELETE'});if(root.isConnected){row.remove();if(!list.children.length)await load()}}
   catch(e){if(root.isConnected)status.textContent=e.message}
   finally{remove.disabled=false}
  }},icon('trash'))
  row.append(text,sendButton,remove);return row
 }
 async function load(){
  if(loading||!root.isConnected)return
  loading=true;prev.disabled=next.disabled=true;status.textContent='加载中…'
  try{const data=await api('/chat/favorites'+(cursor?'?before='+encodeURIComponent(cursor):''));if(!root.isConnected)return
   nextCursor=data.next;list.replaceChildren(...data.items.map(draw));status.textContent=data.items.length?'最多收藏100条；点击发送到当前群。':'暂无收藏。在消息菜单中选择「收藏消息」。'
  }catch(e){if(root.isConnected)status.replaceChildren(e.message+' ',h('button',{class:'btn-text',type:'button',onclick:load},'重试'))}
  finally{loading=false;if(root.isConnected){prev.disabled=!history.length;next.disabled=!nextCursor}}
 }
 prev.onclick=()=>{if(loading)return;cursor=history.pop()||'';load()}
 next.onclick=()=>{if(loading||!nextCursor)return;history.push(cursor);cursor=nextCursor;load()}
 load()
}
