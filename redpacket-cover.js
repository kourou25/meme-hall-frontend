// Only loaded while cropping a cover. No observers, timers or decoded images survive close.
const clamp = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback
export function packetCoverRect(width, height, zoom=1, x=.5, y=.5) {
  if (![width,height].every(v=>Number.isFinite(v)&&v>0)) throw Error('图片尺寸无效')
  zoom=clamp(zoom,1,3,1);x=clamp(x,0,1,.5);y=clamp(y,0,1,.5)
  const w=Math.min(width,height*1.5)/zoom, h=w/1.5
  return {x:(width-w)*x,y:(height-h)*y,w,h}
}

export async function cropPacketCover(file,{host,form,doc,h,signal}) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw Error('封面请选择 PNG、JPEG、WebP 或 GIF 图片')
  if (file.size>20*1024*1024) throw Error('封面超过 20 MB，请先压缩图片')
  if (signal.aborted) return null
  const win=doc.defaultView, image=new win.Image(), url=win.URL.createObjectURL(file)
  const source=doc.createElement('canvas')
  try {
    await new Promise((resolve,reject)=>{
      const finish=error=>{win.clearTimeout(timer);image.onload=image.onerror=null;signal.removeEventListener('abort',abort);error?reject(error):resolve()}
      const abort=()=>finish(new Error('裁剪已取消'))
      const timer=win.setTimeout(()=>finish(Error('图片读取超时，请换一张图片')),10000)
      image.onload=()=>finish();image.onerror=()=>finish(Error('无法读取这张图片'))
      signal.addEventListener('abort',abort,{once:true});image.src=url
    })
    if (signal.aborted) return null
    const w=image.naturalWidth,h=image.naturalHeight
    if (!w||!h||w*h>50000000||Math.max(w,h)>20000) throw Error('图片尺寸过大，请先缩小到 5000 万像素以内')
    const scale=Math.min(1,1600/Math.max(w,h))
    source.width=Math.max(1,Math.round(w*scale));source.height=Math.max(1,Math.round(h*scale))
    const ctx=source.getContext('2d')
    if(!ctx)throw Error('当前浏览器无法裁剪图片')
    ctx.drawImage(image,0,0,source.width,source.height)
  } catch(error) { source.width=source.height=1;if(signal.aborted)return null;throw error }
  finally { image.src='';win.URL.revokeObjectURL(url) }
  if(signal.aborted){source.width=source.height=1;return null}
  return new Promise((resolve,reject)=>{
    let zoom=1,x=.5,y=.5,drag=null,raf=0,done=false,working=false
    const canvas=doc.createElement('canvas');canvas.width=720;canvas.height=480
    canvas.className='rpk-crop-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','拖动调整封面，方向键移动图片')
    const ctx=canvas.getContext('2d')
    if(!ctx){source.width=source.height=1;reject(Error('当前浏览器无法预览裁剪'));return}
    const draw=()=>{raf=0;if(done)return;const r=packetCoverRect(source.width,source.height,zoom,x,y);ctx.clearRect(0,0,720,480);ctx.drawImage(source,r.x,r.y,r.w,r.h,0,0,720,480)}
    const schedule=()=>{if(!raf)raf=win.requestAnimationFrame(draw)}
    const slider=(label,min,max,step,value,onInput)=>h('label',{class:'rpk-crop-range'},h('span',null,label),h('input',{type:'range',min,max,step,value,'aria-label':label,oninput:e=>{onInput(Number(e.target.value));schedule()}}))
    const size=slider('缩放',1,3,.01,1,v=>zoom=v),horizontal=slider('左右位置',0,1,.01,.5,v=>x=v),vertical=slider('上下位置',0,1,.01,.5,v=>y=v)
    const controls=()=>{size.querySelector('input').value=zoom;horizontal.querySelector('input').value=x;vertical.querySelector('input').value=y}
    const abort=()=>finish(null)
    const finish=(result,error)=>{
      if(done)return;done=true;signal.removeEventListener('abort',abort);win.cancelAnimationFrame(raf)
      source.width=source.height=canvas.width=canvas.height=1;section.remove();form.hidden=false
      error?reject(error):resolve(result)
    }
    const button=(name,fn,cls='rpk-secondary')=>h('button',{type:'button',class:cls,onclick:fn},name)
    const confirm=button('使用此封面',()=>{
      if(working||done)return;working=true;confirm.disabled=true
      const output=doc.createElement('canvas'),r=packetCoverRect(source.width,source.height,zoom,x,y)
      // Avoid enlarging small inputs. Even heights keep the exported ratio exactly 3:2.
      output.height=Math.max(2,Math.floor(Math.min(800,r.h)/2)*2);output.width=output.height*1.5
      const out=output.getContext('2d')
      if(!out){finish(null,Error('封面生成失败'));return}
      try {
        out.drawImage(source,r.x,r.y,r.w,r.h,0,0,output.width,output.height)
        output.toBlob(blob=>{output.width=output.height=1;if(done)return;if(!blob){finish(null,Error('封面生成失败'));return}finish(new win.File([blob],'redpack-cover.'+(blob.type==='image/webp'?'webp':'png'),{type:blob.type}))},'image/webp',.84)
      } catch {output.width=output.height=1;finish(null,Error('封面生成失败，请重新选择图片'))}
    },'rpk-primary')
    const section=h('section',{class:'rpk-crop','aria-label':'裁剪红包封面'},h('h3',null,'裁剪红包封面'),
      h('p',{class:'rpk-help'},'拖动图片调整位置，滑动缩放。预览即群聊中显示的 3:2 封面。'),canvas,size,horizontal,vertical,
      file.type==='image/gif'&&h('p',{class:'rpk-help'},'动图裁剪后保存为静态封面，避免聊天中持续播放。'),
      h('div',{class:'rpk-actions'},button('取消裁剪',()=>finish(null)),button('重置位置',()=>{zoom=1;x=y=.5;controls();schedule()})),confirm)
    canvas.addEventListener('pointerdown',e=>{if(working||!e.isPrimary||e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.focus({preventScroll:true})})
    canvas.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId||working)return
      const box=canvas.getBoundingClientRect(),r=packetCoverRect(source.width,source.height,zoom,x,y)
      x=clamp(x-(e.clientX-drag.x)*r.w/box.width/Math.max(1,source.width-r.w),0,1,.5)
      y=clamp(y-(e.clientY-drag.y)*r.h/box.height/Math.max(1,source.height-r.h),0,1,.5)
      drag.x=e.clientX;drag.y=e.clientY;controls();schedule()
    })
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null)
    canvas.addEventListener('keydown',e=>{if(working||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();x=clamp(x+(e.key==='ArrowLeft'?.02:e.key==='ArrowRight'?-.02:0),0,1,.5);y=clamp(y+(e.key==='ArrowUp'?.02:e.key==='ArrowDown'?-.02:0),0,1,.5);controls();schedule()})
    signal.addEventListener('abort',abort,{once:true})
    form.hidden=true;host.append(section);draw();canvas.focus({preventScroll:true})
  })
}
