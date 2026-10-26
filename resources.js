const labels={project:'开源项目',film:'番号影片',link:'链接分享'}
const signs={project:'⌘',film:'▶',link:'↗'}
export async function mountResources(host,{user,api,h,onLeave,navigate,mediaTray,toast,icon}){
 let dead=false,dispose=()=>{},request=new AbortController();onLeave(()=>{dead=true;request.abort();dispose();host.classList.remove('resources-host')})
 host.classList.add('resources-host')
 const link=(text,url,external=false)=>h('a',{href:url,...external?{target:'_blank',rel:'noopener noreferrer'}:{'data-link':''}},text)
 const btn=(text,fn,attrs={})=>h('button',{type:'button',class:'btn',onclick:fn,...attrs},text)
 const status=h('p',{class:'rs-status',role:'status','aria-live':'polite'})
 const field=(name,el,note)=>h('label',{class:'rs-field'},h('span',null,name),el,note&&h('small',null,note))
 const date=t=>new Date(t*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
 const get=url=>api(url,{signal:request.signal})
 const login=()=>{if(user)return true;toast('请先登录后操作');return false}
 const route=location.pathname.split('/')[2]||''
 host.replaceChildren(status);status.textContent='正在加载资源…'
 function header(title,actions=[]){return h('header',{class:'rs-head'},h('div',null,link('RZP 资源社区','/nsfw'),h('h1',null,title)),h('div',{class:'rs-head-actions'},actions))}
 function marks(p){
  const box=h('div',{class:'rs-marks'}),count=h('span',{class:'rs-approval-count'},p.approvals+' 认可')
  for(const [key,text,ic]of [['checked','已查阅','check'],['favorite','收藏','star'],['approved','认可','check']]){
   const input=h('input',{type:'checkbox',checked:!!p[key],disabled:key==='approved'&&p.user_id===user?.id,'aria-label':text})
   input.onchange=async()=>{if(!login()){input.checked=!!p[key];return}input.disabled=true;try{const r=await api('/resources/'+p.id+'/mark',{method:'PUT',body:{key,value:input.checked}});Object.assign(p,r.mark,{approvals:r.approvals});count.textContent=r.approvals+' 认可'}catch(e){input.checked=!!p[key];toast(e.message,'err')}finally{input.disabled=false}}
   box.append(h('label',{title:key==='checked'?'由你手动勾选，浏览不会自动标记':key==='approved'?'认可这位作者的分享':text},input,icon(ic),h('span',null,text)))
  }
  box.append(count);return box
 }
 function attachments(p,detail=false){
  const media=p.media||[],items=p.cover_url?[{k:null,cover:p.cover_url},...media]:media
  if(!items.length)return null
  return h('div',{class:'rs-media'+(detail?' rs-media-detail':'')},items.slice(0,detail?13:3).map(m=>{
   const src=m.cover||'/img/'+(m.p||m.k)
   if(detail&&m.kind==='v'||detail&&m.kind==='l')return h('video',{controls:true,preload:'none',playsinline:true,poster:src,src:'/img/'+m.k})
   return h('a',{href:detail?src:'/nsfw/'+p.id,...detail?{target:'_blank',rel:'noopener noreferrer'}:{'data-link':''},class:m.p?'rs-video-thumb':''},h('img',{src,alt:detail?p.title:'',loading:'lazy',decoding:'async'}),m.p&&h('span',{'aria-label':'视频'},'▶'))
  }),!detail&&items.length>3?h('small',null,'+'+(items.length-3)):null)
 }
 async function list(){
  const q=new URLSearchParams(location.search),cat=q.get('category')||'',filter=q.get('filter')||'',query=q.get('q')||''
  const toolbar=h('nav',{class:'rs-categories','aria-label':'资源分类'},[['','全部'],...Object.entries(labels)].map(([id,name])=>link(name,'/nsfw?'+new URLSearchParams({category:id,filter,q:query}))))
  for(const a of toolbar.children)a.setAttribute('aria-current',new URL(a.href).searchParams.get('category')===cat?'page':'false')
  const f=h('select',{'aria-label':'浏览范围'},[['','全部分享'],['unread','未查阅'],['checked','已查阅'],['favorite','我的收藏'],['mine','我的发布']].map(([v,n])=>h('option',{value:v,selected:filter===v},n)))
  const search=h('input',{type:'search',placeholder:'搜索标题或番号',value:query,maxlength:80,'aria-label':'搜索标题或番号'})
  const apply=()=>navigate('/nsfw?'+new URLSearchParams({category:cat,filter:f.value,q:search.value.trim()}))
  f.onchange=apply
  const content=h('div',{class:'rs-list'}),next=btn('加载更多',()=>load(true)),head=header('分享值得发现的内容',[btn('＋ 发布分享',()=>{if(login())navigate('/nsfw/new')},{class:'btn btn-primary'})])
  host.replaceChildren(head,toolbar,h('form',{class:'rs-filters',onsubmit:e=>{e.preventDefault();apply()}},search,btn('搜索',apply),f),h('p',{class:'rs-note'},'已查阅由你勾选，打开帖子不会自动标记。认可优质分享，支持作者成长。'),content,status,next)
  let cursor=null,busy=false,rendered=0
  async function load(more=false){if(busy)return;busy=true;next.disabled=true;status.textContent='正在加载…'
   try{const r=await get('/resources?'+new URLSearchParams({category:cat,filter,q:query,...more&&cursor?{before:cursor}:{}}));if(dead)return
    if(!more){content.replaceChildren();rendered=0;if(r.can_configure&&!head.querySelector('.rs-config-link'))head.lastChild.append(link('刮削设置','/nsfw/settings'));status.textContent=''}
    for(const p of r.items){const row=h('article',{class:'rs-row'},h('div',{class:'rs-row-main'},h('div',{class:'rs-meta'},h('span',null,signs[p.category]+' '+labels[p.category]),h('span',null,p.author+' · '+date(p.created_at)),p.film_code&&h('code',null,p.film_code)),h('h2',null,link(p.title,'/nsfw/'+p.id)),h('p',{class:'rs-excerpt'},p.body),attachments(p),h('div',{class:'rs-row-actions'},marks(p),link('评论 '+p.comments,'/nsfw/'+p.id+'#comments'),p.share_url&&link('打开链接 ↗',p.share_url,true))));content.append(row);rendered++}
    cursor=r.next;next.hidden=!cursor||rendered>=100;status.textContent=rendered?'':query||filter?'没有符合筛选的分享。':'还没有分享，从发布第一篇开始。'
    if(rendered>=100&&cursor)status.replaceChildren('本页已展示100篇。',link('继续浏览下一页','/nsfw?'+new URLSearchParams({category:cat,filter,q:query,before:cursor})))
   }catch(e){if(!dead)status.textContent=e.message}finally{busy=false;next.disabled=false}}
  cursor=q.get('before');await load(!!cursor)
 }
 async function detail(id){
  const {post:p,reactions}=await get('/resources/'+id);if(dead)return
  const body=h('section',{class:'rs-detail'},h('p',{class:'rs-meta'},labels[p.category]+' · '+p.author+' · '+date(p.created_at)),h('h1',null,p.title),p.film_code&&h('p',null,'番号 ',h('code',null,p.film_code)),h('p',{class:'rs-body'},p.body),attachments(p,true),p.share_url&&link('打开分享链接 ↗',p.share_url,true),marks(p))
  const react=h('div',{class:'rs-reactions','aria-label':'回应'})
  const emojis=['👍','❤️','😂','🤔','🔥'];let reacting=false
  for(const emoji of emojis)react.append(btn(emoji+' '+(reactions.find(x=>x.reaction===emoji)?.n||0),async()=>{if(!login()||reacting)return;reacting=true;for(const el of react.children)el.disabled=true;const previous=p.reaction,value=previous===emoji?'':emoji;try{await api('/resources/'+id+'/mark',{method:'PUT',body:{key:'reaction',value}});p.reaction=value;for(const symbol of [previous,value]){if(!symbol)continue;let entry=reactions.find(x=>x.reaction===symbol);if(!entry){entry={reaction:symbol,n:0};reactions.push(entry)}entry.n=Math.max(0,entry.n+(symbol===value?1:-1))}for(const [i,el]of [...react.children].entries()){el.textContent=emojis[i]+' '+(reactions.find(x=>x.reaction===emojis[i])?.n||0);el.setAttribute('aria-pressed',String(value===emojis[i]))}}catch(error){toast(error.message,'err')}finally{reacting=false;for(const el of react.children)el.disabled=false}},{'aria-label':emoji+' 回应','aria-pressed':p.reaction===emoji}))
  body.append(react)
  if(user&&(user.id===p.user_id||user.is_admin))body.append(h('div',{class:'rs-owner-actions'},btn('编辑',()=>editor(p)),btn('删除帖子',async()=>{if(!confirm('确定删除这篇分享？'))return;try{await api('/resources/'+id,{method:'DELETE'});navigate('/nsfw')}catch(e){toast(e.message,'err')}})))
  const comments=h('section',{id:'comments',class:'rs-comments'},h('h2',null,'评论 '+p.comments)),rows=h('div'),more=btn('更多评论',()=>loadComments()),textarea=h('textarea',{rows:3,maxlength:2000,placeholder:'分享你的使用体验或补充信息','aria-label':'评论内容'}),send=btn('发表评论',async()=>{
   if(!login()||!textarea.value.trim())return;send.disabled=true;try{await api('/resources/'+id+'/comments',{method:'POST',body:{request_id:commentId,body:textarea.value}});commentId=crypto.randomUUID();textarea.value='';rows.replaceChildren();after=0;await loadComments();toast('评论已发布')}catch(e){toast(e.message,'err')}finally{send.disabled=false}
  },{class:'btn btn-primary'});let after=0,commentId=crypto.randomUUID()
  comments.append(textarea,send,rows,more);host.replaceChildren(link('← 返回资源社区','/nsfw'),body,comments,status);status.textContent=''
  async function loadComments(){more.disabled=true;try{const r=await get('/resources/'+id+'/comments'+(after?'?after='+after:''));if(dead)return;for(const x of r.items){let honor='';try{const gr=JSON.parse(x.deco||'{}').gr;if(/^resource_respect[1-5]$/.test(gr))honor=' resource_respect gr-'+gr.slice(-1)}catch{};const item=h('article',{class:'rs-comment'+honor},h('div',{class:'rs-meta'},x.author+' · '+date(x.created_at)),h('p',{class:'rs-body'},x.body));if(user&&(user.id===x.user_id||user.is_admin))item.append(btn('删除',async()=>{try{await api('/resources/'+id+'/comments/'+x.id,{method:'DELETE'});item.remove()}catch(e){toast(e.message,'err')}}));rows.append(item)}after=r.next;more.hidden=!after}catch(e){status.textContent=e.message}finally{more.disabled=false}}
  await loadComments()
 }
 async function editor(p=null){
  if(!login()){navigate('/nsfw');return}dispose();const tray=mediaTray({forWhat:'meme',max:12});dispose=()=>tray.clear()
  const requestId=crypto.randomUUID(),category=h('select',{'aria-label':'分享分类',disabled:!!p},Object.entries(labels).map(([v,n])=>h('option',{value:v,selected:p?.category===v},n))),title=h('input',{maxlength:120,required:true,value:p?.title||'',placeholder:'为分享写一个清楚的标题'}),body=h('textarea',{rows:8,maxlength:10000,required:true,value:p?.body||'',placeholder:'内容介绍、使用方式和推荐理由'}),url=h('input',{type:'url',maxlength:2048,value:p?.share_url||'',placeholder:'https://'}),code=h('input',{maxlength:40,value:p?.film_code||'',placeholder:'例如 ABC-123',disabled:!!p}),notice=h('p',{class:'rs-status',role:'status'});let cover=p?.cover_url||'',busy=false,lookupCode='',revision=0
  const coverPreview=h('div',{class:'rs-cover-preview'}),lookup=btn('获取介绍与封面',()=>scrape()),film=h('div',{class:'rs-film-fields'},field('番号',code),lookup,h('small',null,'未配置刮削服务时可手动填写，并在下方上传封面。'))
  function sync(){film.hidden=category.value!=='film';url.required=category.value!=='film';urlLabel.firstChild.textContent=category.value==='film'?'在线链接（可选）':'分享链接';if(category.value!=='film'){cover='';coverPreview.replaceChildren()}}
  const urlLabel=field('分享链接',url),save=btn(p?'保存修改':'发布分享',async()=>{
   if(busy||!title.reportValidity()||!body.reportValidity()||!url.reportValidity())return;busy=true;save.disabled=true;notice.textContent='正在保存…'
   try{const payload={request_id:requestId,category:category.value,title:title.value,body:body.value,share_url:url.value,film_code:code.value,cover_url:cover,items:await tray.media(),revision:p?.revision};const r=await api('/resources'+(p?'/'+p.id:''),{method:p?'PATCH':'POST',body:payload});if(dead)return;tray.clear();navigate('/nsfw/'+(p?.id||r.id))}catch(e){notice.textContent=e.message}finally{busy=false;save.disabled=false}
  },{class:'btn btn-primary'})
  async function scrape(){if(p||busy||category.value!=='film'||!code.value.trim())return;const current=code.value.trim(),seq=++revision;lookup.disabled=true;notice.textContent='正在获取元数据…';const initialTitle=title.value,initialBody=body.value
   try{const r=await api('/resources/metadata',{method:'POST',body:{code:current}});if(dead||seq!==revision||code.value.trim()!==current)return;if(title.value===initialTitle&&!title.value.trim())title.value=r.title;if(body.value===initialBody&&!body.value.trim())body.value=r.body;cover=r.cover_url;coverPreview.replaceChildren(...cover?[h('img',{src:cover,alt:'刮削封面'}),btn('移除封面',()=>{cover='';coverPreview.replaceChildren()})]:[]);notice.textContent='已获取元数据，请检查内容后发布。已有文字保留。';lookupCode=current}catch(e){if(!dead)notice.textContent=e.message}finally{lookup.disabled=false}}
  code.onblur=()=>{if(code.value.trim()!==lookupCode){lookupCode=code.value.trim();scrape()}};category.onchange=sync
  host.replaceChildren(header(p?'编辑分享':'发布分享',[link('返回社区','/nsfw')]),h('div',{class:'rs-editor'},field('分类',category),film,field('标题',title),field('内容介绍',body),urlLabel,coverPreview,p?h('p',{class:'rs-note'},'本次编辑保留原附件。'):h('div',{class:'rs-upload'},h('p',null,'图片与视频 · 每个文件不超过20MB，最多12个'),tray.input,tray.el,btn('添加图片 / 视频',tray.pick)),notice,save));sync()
 }
 async function settings(){
  const cfg=await get('/resources/config');if(dead)return
  const endpoint=h('input',{type:'url',value:cfg.endpoint,placeholder:'https://你的服务/graphql'}),scraper=h('input',{value:cfg.scraper,placeholder:'Stash 中安装的刮削器 ID'}),key=h('input',{type:'password',autocomplete:'new-password',placeholder:cfg.has_key?'已配置，留空保留':'API 密钥'}),enabled=h('input',{type:'checkbox',checked:cfg.enabled}),save=btn('保存配置',async()=>{save.disabled=true;try{await api('/resources/config',{method:'PUT',body:{endpoint:endpoint.value,scraper:scraper.value,key:key.value,enabled:enabled.checked}});key.value='';status.textContent='配置已保存。可到发布页用番号验证。'}catch(e){status.textContent=e.message}finally{save.disabled=false}},{class:'btn btn-primary'})
  host.replaceChildren(header('影片元数据设置',[link('返回社区','/nsfw')]),h('div',{class:'rs-editor'},h('p',null,'连接已有 Stash 服务及已安装的刮削器。密钥加密保存，仅用于服务端请求。未启用时保留手动发布。'),field('GraphQL 接口地址',endpoint),field('刮削器 ID',scraper),field('API 密钥',key),h('label',{class:'set-check'},enabled,'启用自动获取元数据'),save,status));status.textContent=''
 }
 try{if(route==='new')await editor();else if(route==='settings')await settings();else if(/^\d+$/.test(route))await detail(route);else await list()}catch(e){if(!dead){status.textContent=e.message;host.replaceChildren(link('返回资源社区','/nsfw'),status,btn('重试',()=>navigate(location.pathname+location.search)))}}
}
