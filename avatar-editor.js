import {avatarGeometry,paintAvatarImage,avatarImage} from './avatar-view.js?v=98ddcc7d'
import {normalizeAnimationFile} from './animation-loop.js?v=98ddcc7d'

export function createAvatarEditor({h,api,current,name,onSaved,signal}){
 const doc=signal?.ownerDocument||document,win=doc.defaultView
 let file=null,image=null,url='',animated=false,state={},generation=0,busy=false,disposed=false,prepared=null,receipt=null,nonce='',drag=null,loadCancel=null
 const status=h('p',{class:'avatar-editor-status',role:'status','aria-live':'polite'})
 const currentBox=h('div',{class:'avatar-current'},current?avatarImage(h,current,name,64):h('span',{class:'avatar avatar-ph',style:{width:'64px',height:'64px'}},[...(name||'?')][0]))
 const choose=h('input',{type:'file',accept:'image/png,image/jpeg,image/gif,image/webp,image/apng','aria-label':'选择头像图片'})
 const frame=h('div',{class:'avatar-edit-frame',tabindex:0,role:'group','aria-label':'裁剪区域，拖动或使用方向键移动图片'})
 const preview=h('div',{class:'avatar-edit-preview','aria-label':'圆形头像预览'})
 const stage=h('div',{class:'avatar-edit-stage'},frame,h('div',{class:'avatar-preview-side'},preview,h('span',null,'头像预览')))
 const range=(label,min,max,step,value,key)=>h('label',{class:'avatar-edit-range'},h('span',null,label),h('input',{type:'range',min,max,step,value,'aria-label':label,oninput:e=>{state[key]=Number(e.target.value);changed()}}))
 const zoom=range('缩放',1,3,.01,1,'zoom'),horizontal=range('左右位置',0,1,.01,.5,'x'),vertical=range('上下位置',0,1,.01,.5,'y')
 const button=(text,fn)=>h('button',{type:'button',class:'btn btn-ghost sm',onclick:fn},text)
 const rotate=d=>{state.rotation=((state.rotation+d)%360+360)%360;state.x=state.y=.5;changed()}
 const cancel=button('取消修改',()=>{clear();status.textContent='已取消，当前头像未更改'})
 const save=h('button',{type:'button',class:'btn btn-primary sm',onclick:saveAvatar},'保存头像')
 const editor=h('div',{class:'avatar-edit-body',hidden:true},stage,
  h('p',{class:'muted sm'},'拖动图片调整位置；圆形预览即显示效果。'),
  h('div',{class:'avatar-edit-tools'},button('↶ 左转',()=>rotate(-90)),button('↷ 右转',()=>rotate(90)),button('重置',()=>{state={rotation:0,zoom:1,x:.5,y:.5};changed()})),
  zoom,horizontal,vertical,h('div',{class:'avatar-edit-actions'},cancel,save))
 const root=h('div',{class:'avatar-settings'},h('h4',null,'个人头像'),h('div',{class:'avatar-select-row'},currentBox,h('div',null,choose,h('p',{class:'muted sm'},'支持 JPG、PNG、WebP 和 GIF 动图，最大 5 MB。'))),editor,status)
 function clear(){generation++;loadCancel?.();loadCancel=null;if(image)image.src='';if(url)win.URL.revokeObjectURL(url);url='';file=image=prepared=receipt=null;frame.replaceChildren();preview.replaceChildren();editor.hidden=true;drag=null}
 function dispose(){if(disposed)return;disposed=true;clear();signal?.removeEventListener('abort',dispose)}
 signal?.addEventListener('abort',dispose,{once:true})
 function changed(){prepared=receipt=null;nonce=win.crypto.randomUUID();draw()}
 function draw(){
  if(!image)return
  const g=avatarGeometry(image.naturalWidth,image.naturalHeight,state)
  for(const box of [frame,preview])paintAvatarImage(box.firstChild,g)
  zoom.querySelector('input').value=state.zoom;horizontal.querySelector('input').value=state.x;vertical.querySelector('input').value=state.y
 }
 function disabled(value){busy=value;for(const e of root.querySelectorAll('button,input'))e.disabled=value;frame.tabIndex=value?-1:0;save.textContent=value?'正在保存…':'保存头像'}
 choose.onchange=async()=>{
  const picked=choose.files?.[0];choose.value='';if(!picked||busy||disposed)return
  clear();const version=generation
  status.textContent='正在读取图片…'
  try{
   if(!/^image\/(png|apng|jpeg|gif|webp)$/.test(picked.type))throw Error('请选择 JPG、PNG、WebP 或 GIF 图片')
   if(picked.size>5*1024*1024)throw Error('头像不能超过 5 MB，请先缩小图片')
   const normalized=await normalizeAnimationFile(picked)
   if(disposed||version!==generation)return
   // All GIFs bypass canvas, including malformed/unknown multi-frame metadata.
   file=normalized.file;animated=normalized.animated||picked.type==='image/gif'
   url=win.URL.createObjectURL(file);image=new win.Image()
   const loaded=image
   await new Promise((resolve,reject)=>{
    const finish=error=>{win.clearTimeout(timer);loaded.onload=loaded.onerror=null;loadCancel=null;error?reject(error):resolve()}
    const timer=win.setTimeout(()=>finish(Error('图片读取超时，请换一张图片')),10000)
    loadCancel=()=>finish(Error('图片读取已取消'));loaded.onload=()=>finish();loaded.onerror=()=>finish(Error('图片无法读取，请换一张图片'));loaded.src=url
   })
   if(disposed||version!==generation)return
   if(image.naturalWidth>4096||image.naturalHeight>4096||!image.naturalWidth||!image.naturalHeight)throw Error('头像边长不能超过 4096 像素，请先缩小图片')
   state={rotation:0,zoom:1,x:.5,y:.5}
   frame.replaceChildren(h('img',{src:url,alt:'',draggable:false}));preview.replaceChildren(h('img',{src:url,alt:'',draggable:false}))
   editor.hidden=false;changed()
   status.textContent=animated?'动图将循环播放。本站保存裁剪显示范围，原图仍包含未裁剪区域。':'调整完成后点击“保存头像”。'
  }catch(e){if(version!==generation||disposed)return;clear();status.textContent=e.message}
 }
 frame.onpointerdown=e=>{if(!image||busy||e.button!==0)return;e.preventDefault();frame.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:state.x,sy:state.y};frame.focus({preventScroll:true})}
 frame.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId||busy)return
  const g=avatarGeometry(image.naturalWidth,image.naturalHeight,state),size=frame.getBoundingClientRect().width
  state.x=g.bw>1?Math.max(0,Math.min(1,drag.sx-(e.clientX-drag.x)/((g.bw-1)*size))):.5
  state.y=g.bh>1?Math.max(0,Math.min(1,drag.sy-(e.clientY-drag.y)/((g.bh-1)*size))):.5
  changed()
 }
 frame.onpointerup=frame.onpointercancel=frame.onlostpointercapture=()=>{drag=null}
 frame.onkeydown=e=>{if(!image||busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const key=['ArrowLeft','ArrowRight'].includes(e.key)?'x':'y';state[key]=Math.max(0,Math.min(1,state[key]+(['ArrowLeft','ArrowUp'].includes(e.key)?.02:-.02)));changed()}
 async function saveAvatar(){
  if(!file||busy||disposed)return
  disabled(true);status.textContent='正在保存头像…'
  try{
   const g=avatarGeometry(image.naturalWidth,image.naturalHeight,state)
   if(!prepared){
    if(animated)prepared=file
    else{
     const canvas=doc.createElement('canvas');canvas.width=canvas.height=g.output
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法裁剪图片')
     ctx.translate(g.output*(.5+g.tx),g.output*(.5+g.ty));ctx.rotate(g.rotation*Math.PI/180)
     ctx.drawImage(image,-g.width*g.scale*g.output/2,-g.height*g.scale*g.output/2,g.width*g.scale*g.output,g.height*g.scale*g.output)
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));canvas.width=canvas.height=1
     if(!blob)throw Error('头像裁剪失败，请重试')
     prepared=new win.File([blob],blob.type==='image/webp'?'avatar.webp':'avatar.png',{type:blob.type})
    }
   }
   if(disposed)return
   if(!receipt){const body=new win.FormData();body.set('file',prepared);body.set('for','avatar');body.set('nonce',nonce);receipt=await api('/uploads',{method:'POST',body,signal})}
   if(disposed)return
   const crop=animated?{width:g.width,height:g.height,rotation:g.rotation,zoom:g.zoom,x:g.x,y:g.y}:undefined
   const result=await api('/me/avatar',{method:'PATCH',body:{key:receipt.key,...(crop?{crop}:{})},signal})
   if(disposed)return
   onSaved(result.avatar);currentBox.replaceChildren(avatarImage(h,result.avatar,name,64));clear();status.textContent='头像已保存';choose.focus({preventScroll:true})
  }catch(e){if(!disposed)status.textContent=e.name==='AbortError'?'保存已取消':e.message+'；可以点击“保存头像”重试。'}
  finally{if(!disposed)disabled(false)}
 }
 return {element:root,dispose}
}
