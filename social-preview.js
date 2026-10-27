import {socialLinks,canSocialPost,socialCaption} from './social-links.js?v=8f410db6'
const scripts=new WeakMap()
function loadScript(doc,provider){
 let cache=scripts.get(doc);if(!cache){cache=new Map();scripts.set(doc,cache)}
 if(cache.has(provider))return cache.get(provider)
 const work=new Promise((resolve,reject)=>{
  const script=doc.createElement('script');script.async=true;script.referrerPolicy='no-referrer'
  script.src=provider==='x'?'https://platform.x.com/widgets.js':'https://www.instagram.com/embed.js'
  const timer=setTimeout(()=>{script.remove();reject(Error('加载超时'))},12000)
  script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('无法连接原站'))}
  doc.head.append(script)
 }).catch(error=>{cache.delete(provider);throw error})
 cache.set(provider,work);return work
}
export function socialCards(message,{h,api,onRemoval,onPost,onOpenMedia,renderVideo,post=false}){
 if(message.redpack||!message.id||message.deleted)return []
 return socialLinks(message.body||'').map((link,index)=>{
  const shell=h('section',{class:'cm-social'+(post?' social-post':''),'aria-label':'分享内容预览'})
  const status=h('p',{class:'cm-social-status',role:'status'},'进入视野后加载内容')
  const origin=h('a',{href:link.url,target:'_blank',rel:'noopener noreferrer',hidden:true},'打开原链接 ↗')
  const area=h('div',{class:'cm-social-area'})
  let state='idle',version=0,abort,timeout,observer,visibleObserver,disposePlayer=()=>{}
  const clear=()=>{version++;abort?.abort();clearTimeout(timeout);observer?.disconnect();disposePlayer();disposePlayer=()=>{};area.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load()});area.replaceChildren()}
  const retry=h('button',{type:'button',class:'btn sm',hidden:true,onclick:()=>{if(state==='error'){state='idle';return load()}}},'重试加载')
  async function load(){
   if(state!=='idle'||shell.classList.contains('blur'))return
   clear();state='loading';const run=++version;retry.hidden=true;origin.hidden=true;status.textContent='正在加载内容…'
   const current=()=>run===version&&shell.isConnected
   const failed=()=>{if(current()){clear();state='error';status.textContent='内容暂未加载或原站限制访问';origin.hidden=false;retry.hidden=false}}
   const loaded=()=>{if(current()){clearTimeout(timeout);state='ready';status.textContent=''}}
   // 短链解析与备用公开端点串行时可能超过15秒；不可在服务端预算内提前销毁播放器。
   timeout=setTimeout(failed,link.provider==='douyin'?35000:20000)
   try{
    const doc=shell.ownerDocument,win=doc.defaultView
    if(['x','douyin','weibo','instagram'].includes(link.provider)){
     abort=new AbortController();const data=await api(post?'/social/preview?share='+encodeURIComponent(link.url):`/chat/messages/${message.id}/preview?index=${index}`,{signal:abort.signal})
     if(!current())return;clearTimeout(timeout)
     area.classList.add('is-summary');area.replaceChildren();const caption=socialCaption(data.description);if(caption)area.append(h('p',{},caption))
     if(data.available&&data.media?.length){
      const mediaBox=h('div',{class:'cm-social-media'})
      const gallery=data.media.map((it,i)=>{const url=post?it.url:`/api/chat/messages/${message.id}/preview/media/${i}?index=${index}`;return {u:it.kind==='video'?(it.poster?(post?it.poster:url+'&poster=1'):null):url,...(it.kind==='video'?{k:'v',v:url}:{}),w:it.width,h:it.height}})
      for(const [i,it]of(data.media||[]).entries()){
       const src=post?it.url:`/api/chat/messages/${message.id}/preview/media/${i}?index=${index}`,poster=it.poster?(post?it.poster:src+'&poster=1'):undefined
       const mediaFailed=()=>{if(current()){state='error';status.textContent='媒体暂未加载，可重试';retry.hidden=false;origin.hidden=false}}
       const picture=it.kind==='image'?h('img',{src,alt:'分享图片 '+(i+1),loading:'lazy',onerror:mediaFailed}):null
       mediaBox.append(it.kind==='video'?(renderVideo?renderVideo({k:'v',v:src,u:poster,w:it.width,h:it.height}):h('video',{src,poster,controls:true,playsinline:true,preload:'metadata',onerror:mediaFailed})):(onOpenMedia?h('button',{type:'button',class:'cm-social-image','aria-label':'查看分享大图',onclick:e=>onOpenMedia(gallery,i,e.currentTarget.ownerDocument)},picture):picture))
      }
      area.append(mediaBox)
      loaded();return
     }
     if(data.embed&&link.provider==='instagram'){area.replaceChildren();area.classList.remove('is-summary');timeout=setTimeout(failed,15000)}else{
     if(data.image){const img=h('img',{src:data.image,alt:'分享封面',loading:'lazy',referrerpolicy:'no-referrer',onerror:e=>e.currentTarget.remove()});area.append(img)}
     if(!data.available){failed();return}
     loaded();if(data.image){origin.hidden=false;status.textContent='原站仅返回封面，未提供可播放媒体'}return
     }
    }
    area.classList.add('is-embed')
    if(link.provider==='tiktok'){
     const frame=doc.createElement('iframe');frame.src=`https://www.tiktok.com/player/v1/${link.id}?autoplay=0&description=0&music_info=0&rel=0`;frame.title='分享视频';frame.allow='fullscreen';frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');frame.addEventListener('load',loaded);frame.addEventListener('error',failed)
     const receive=e=>{if(e.source!==frame.contentWindow||e.origin!=='https://www.tiktok.com'||!e.data?.['x-tiktok-player'])return;if(e.data.type==='onPlayerError')failed();else if(e.data.type==='onPlayerReady')loaded()}
     win.addEventListener('message',receive);disposePlayer=()=>win.removeEventListener('message',receive);area.append(frame)
    }else{
     await loadScript(doc,link.provider);if(!current())return
     if(link.provider==='x'){
      if(!win.twttr?.widgets?.createTweet)throw Error('暂不可用')
      const result=await win.twttr.widgets.createTweet(link.id,area,{theme:doc.documentElement.dataset.theme==='dark'?'dark':'light',dnt:true,width:320,conversation:'none'})
      if(result)loaded();else failed()
     }else{
      if(!win.instgrm?.Embeds?.process)throw Error('暂不可用')
      const quote=doc.createElement('blockquote');quote.className='instagram-media';quote.dataset.instgrmPermalink=link.url;quote.dataset.instgrmVersion='14';area.append(quote)
      observer=new win.MutationObserver(()=>{if(area.querySelector('iframe')){observer.disconnect();loaded()}});observer.observe(area,{childList:true,subtree:true});win.instgrm.Embeds.process()
     }
    }
   }catch(error){if(error.name!=='AbortError')failed()}
  }
  const postButton=canSocialPost(link.provider)&&onPost?h('button',{type:'button',class:'btn sm cm-social-post-action',onclick:e=>onPost(e.currentTarget,index)},message.meme_id?'查看帖子':'转成帖子'):null
  shell.append(area,status,h('div',{class:'cm-social-head'},postButton,retry,origin))
  if(post){shell._onMask=()=>{clear();state='idle'};shell._onReveal=()=>load()}
  {
   status.textContent='进入视野后自动读取内容'
   const IO=shell.ownerDocument.defaultView.IntersectionObserver||IntersectionObserver
   visibleObserver=new IO(entries=>{if(entries.some(e=>e.isIntersecting)&&!shell.classList.contains('blur')){visibleObserver.disconnect();load()}},{rootMargin:'100px'})
   visibleObserver.observe(shell)
  }
  onRemoval(shell,()=>{state='disposed';visibleObserver?.disconnect();clear()});return shell
 })
}
