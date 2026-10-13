// 一对一私信：仅在页面可见时轮询，离开页面即释放定时器和请求。
export function renderDmPage(root,{path,me,navigate,onLeave}) {
  const state={threadId:Number(path.match(/^\/dm\/(\d+)$/)?.[1]||0),peer:null,draft:null,newest:0,oldest:0,loading:false,closed:false}
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  const button=(label,cls,fn)=>{const e=node('button',cls,label);e.type='button';e.addEventListener('click',fn);return e}
  const api=async(path,options={})=>{
    const response=await fetch('/api'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'content-type':'application/json',...(options.headers||{})}})
    const data=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(data.error||'请求失败')
    return data
  }
  const post=(path,body,method='POST')=>api(path,{method,body:JSON.stringify(body)})
  const report=(error)=>{notice.textContent=error?.message||String(error);notice.hidden=false}
  const shell=node('section','dm-page'),top=node('header','dm-top'),layout=node('div','dm-layout')
  const back=node('a','dm-back','← 迷友群');back.href='/chat/1';back.dataset.link=''
  const title=node('h1','','私信'),notice=node('p','dm-notice');notice.hidden=true
  top.append(back,title)
  const side=node('aside','dm-side'),search=node('input','dm-search'),results=node('div','dm-search-results'),threads=node('div','dm-threads')
  search.type='search';search.placeholder='找人发私信';search.autocomplete='off';search.setAttribute('aria-label','搜索私信对象')
  side.append(node('h2','','会话'),search,results,threads)
  const pane=node('section','dm-pane'),head=node('header','dm-pane-head'),feed=node('div','dm-feed'),older=button('查看更早的消息','dm-older',loadOlder)
  const form=node('form','dm-compose'),input=node('textarea','dm-input'),send=button('发送','dm-send',()=>form.requestSubmit())
  input.placeholder='发一条私信';input.maxLength=2000;input.rows=2
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}})
  form.append(input,send);pane.append(head,older,feed,form);layout.append(side,pane);shell.append(top,notice,layout);root.replaceChildren(shell)
  const fit=()=>{if(!shell.isConnected)return;const vh=visualViewport?.height||innerHeight
    const bottom=innerWidth<=760?(document.querySelector('.mobile-nav')?.getBoundingClientRect().height||0):0
    shell.style.height=Math.max(260,vh-shell.getBoundingClientRect().top-bottom-8)+'px'}
  visualViewport?.addEventListener('resize',fit);addEventListener('resize',fit);requestAnimationFrame(fit)
  let searchTimer=0,searchAbort=null,threadTimer=0,listTimer=0,nonce=null,nonceBody=''
  function cleanup(){state.closed=true;clearTimeout(searchTimer);clearInterval(threadTimer);clearInterval(listTimer);searchAbort?.abort();document.removeEventListener('visibilitychange',onVisible);visualViewport?.removeEventListener('resize',fit);removeEventListener('resize',fit)}
  onLeave(cleanup)
  if(!me){side.replaceChildren(node('p','dm-empty','登录后可以与其他成员私信'));pane.replaceChildren();return cleanup}
  function label(peer){return peer?.name||peer?.username||'成员'}
  function messageRow(m){const row=node('article','dm-message'+(m.sender_id===me.id?' mine':''));row.dataset.id=m.id
    const bubble=node('div','dm-bubble',m.body),time=node('small','dm-time',new Date(m.created_at*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))
    row.append(bubble,time);return row}
  function showPeer(peer){state.peer=peer;notice.hidden=true;input.disabled=false;send.disabled=false;head.replaceChildren(button('←','dm-pane-back',()=>{state.draft=null;navigate('/dm')}),node('strong','',label(peer)))
    shell.classList.add('thread-open')}
  function clearPeer(){state.peer=null;state.draft=null;state.threadId=0;state.newest=0;state.oldest=0;shell.classList.remove('thread-open');head.replaceChildren(node('strong','','选一个会话，或搜索成员'));feed.replaceChildren();older.hidden=true;input.disabled=true;send.disabled=true}
  function appendMessages(items,prepend=false){if(!items.length)return
    const atBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<90,oldHeight=feed.scrollHeight
    const frag=document.createDocumentFragment();items.forEach(m=>frag.append(messageRow(m)))
    if(prepend){feed.prepend(frag);feed.scrollTop+=feed.scrollHeight-oldHeight}else{feed.append(frag);if(atBottom)feed.scrollTop=feed.scrollHeight}
    while(feed.children.length>200){if(prepend)feed.lastChild.remove();else feed.firstChild.remove()}
  }
  async function openThread(id){state.draft=null;state.threadId=id;state.newest=0;state.oldest=0;feed.replaceChildren();older.hidden=true
    try{const data=await api(`/dm/threads/${id}/messages`);if(state.closed||state.threadId!==id)return
      showPeer(data.thread.peer);appendMessages(data.messages);state.oldest=data.messages[0]?.id||0;state.newest=data.messages.at(-1)?.id||0;older.hidden=!data.has_more
      feed.scrollTop=feed.scrollHeight;await markRead();loadThreads()}catch(error){report(error);clearPeer()}}
  async function markRead(){if(!state.threadId||document.visibilityState!=='visible')return
    try{await post(`/dm/threads/${state.threadId}/read`,{},'PUT')}catch{} }
  async function loadOlder(){if(!state.threadId||!state.oldest||state.loading)return
    state.loading=true;older.disabled=true
    try{const id=state.threadId,data=await api(`/dm/threads/${id}/messages?before=${state.oldest}`);if(state.closed||state.threadId!==id)return
      appendMessages(data.messages,true);state.oldest=data.messages[0]?.id||state.oldest;older.hidden=!data.has_more}
    catch(error){report(error)}finally{state.loading=false;older.disabled=false}}
  async function pollThread(){if(state.closed||!state.threadId||document.visibilityState!=='visible')return
    try{const id=state.threadId,data=await api(`/dm/threads/${id}/messages?after=${state.newest}`);if(state.closed||state.threadId!==id)return
      const fresh=data.messages.filter(m=>m.id>state.newest&&!feed.querySelector(`[data-id="${m.id}"]`));appendMessages(fresh);state.newest=Math.max(state.newest,data.messages.at(-1)?.id||0)
      if(fresh.length){await markRead();loadThreads()}}
    catch(error){report(error)}}
  async function loadThreads(){if(state.closed||document.visibilityState!=='visible')return
    try{const data=await api('/dm/threads');if(state.closed)return
      threads.replaceChildren(...(data.threads.length?data.threads.map(t=>{
        const row=button('', 'dm-thread'+(t.id===state.threadId?' on':''),()=>navigate('/dm/'+t.id))
        row.append(node('strong','',t.peer_name||t.peer_username),node('span','dm-thread-last',t.last_body||'开始聊天'))
        if(t.unread)row.append(node('i','dm-unread',String(Math.min(99,t.unread))))
        return row}):[node('p','dm-empty','还没有私信，搜索一个成员开始聊天')]))}
    catch(error){report(error)}}
  search.addEventListener('input',()=>{clearTimeout(searchTimer);searchAbort?.abort();const q=search.value.trim();if(!q){results.replaceChildren();return}
    searchTimer=setTimeout(async()=>{searchAbort=new AbortController();try{const data=await api('/dm/users?q='+encodeURIComponent(q),{signal:searchAbort.signal});if(state.closed||search.value.trim()!==q)return
      results.replaceChildren(...data.users.map(u=>button(label(u)+' · @'+u.username,'dm-user',()=>{state.draft=u;state.threadId=0;feed.replaceChildren();showPeer(u);older.hidden=true;results.replaceChildren();search.value='';input.focus()})))}catch(error){if(error.name!=='AbortError')report(error)}},220)})
  input.addEventListener('input',()=>{if(input.value.trim()!==nonceBody)nonce=null})
  form.addEventListener('submit',async e=>{e.preventDefault();const body=input.value.trim();if(!body||(!state.threadId&&!state.draft))return
    send.disabled=true;nonceBody=body;const key=nonce||(nonce=crypto.randomUUID().replaceAll('-',''))
    try{const data=await post(state.threadId?`/dm/threads/${state.threadId}/messages`:`/dm/users/${state.draft.id}/messages`,{body,nonce:key});if(state.closed)return
      input.value='';nonce=null;if(!state.threadId){navigate('/dm/'+data.thread_id);return}
      if(!feed.querySelector(`[data-id="${data.message.id}"]`))appendMessages([data.message]);state.newest=Math.max(state.newest,data.message.id);await markRead();loadThreads()}
    catch(error){report(error)}finally{send.disabled=false}})
  function onVisible(){if(document.visibilityState==='visible'){loadThreads();pollThread()}}
  document.addEventListener('visibilitychange',onVisible)
  const initialThread=state.threadId,draftId=Number(path.match(/^\/dm\/new\/(-?\d+)$/)?.[1]||0)
  clearPeer();loadThreads();if(initialThread)openThread(initialThread)
  else if(draftId)api('/dm/users/'+draftId).then(data=>{if(!state.closed){state.draft=data.user;showPeer(data.user);input.focus()}}).catch(report)
  threadTimer=setInterval(pollThread,5000);listTimer=setInterval(loadThreads,15000)
  return cleanup
}
