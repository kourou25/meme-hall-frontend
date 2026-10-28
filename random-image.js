function ui(doc){
 if(!doc.getElementById('random-image-css')){const css=doc.createElement('link');css.id='random-image-css';css.rel='stylesheet';css.href='/random-image.css?v=afbdffbc';doc.head.append(css)}
 const h=(tag,attrs={},...children)=>{const e=doc.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='class')e.className=v;else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)}for(const child of children.flat())if(child!=null)e.append(child);return e}
 const dialog=h('dialog',{class:'random-image-dialog'}),body=h('div',{class:'random-image-body'}),close=h('button',{type:'button',class:'ri-close','aria-label':'关闭',onclick:()=>dialog.close()},'×');dialog.append(close,body);doc.body.append(dialog);dialog.showModal();return{h,dialog,body}
}
async function json(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options}),data=await r.json();if(!r.ok)throw Error(data.error||'请求失败');return data}
export async function openRandomImage({doc=document,groupId,signal,onPick}){
 const {h,dialog,body}=ui(doc),controller=new AbortController();let url='',blob=null,busy=false,closed=false,until=0
 const status=h('p',{role:'status','aria-live':'polite'}),tag=h('input',{placeholder:'标签（可留空）',maxlength:64,'aria-label':'筛选标签'}),img=h('img',{alt:'随机图片预览',class:'ri-preview blurred'}),preview=h('div',{class:'ri-preview-wrap'},img),reveal=h('button',{type:'button',disabled:true,onclick:()=>{img.classList.toggle('blurred');reveal.textContent=img.classList.contains('blurred')?'查看清晰预览':'恢复模糊'}},'查看清晰预览')
 const pick=h('button',{type:'button',disabled:true,onclick:async()=>{if(!blob||closed)return;pick.disabled=true;try{await onPick(new File([blob],'随机图片.'+blob.type.split('/')[1],{type:blob.type}));dialog.close()}catch(e){status.textContent=e.message;pick.disabled=false}}},'加入群聊发送框')
 const roll=h('button',{type:'submit'},'摇一张'),form=h('form',{onsubmit:async e=>{
  e.preventDefault();if(busy)return;if(Date.now()<until){status.textContent='请等待 '+Math.ceil((until-Date.now())/1000)+' 秒后再试';return}
  busy=true;roll.disabled=true;pick.disabled=true;reveal.disabled=true;blob=null;img.removeAttribute('src');img.classList.add('blurred');reveal.textContent='查看清晰预览';if(url){URL.revokeObjectURL(url);url=''}status.textContent='正在获取图片…'
  try{const r=await fetch('/api/chat/groups/'+groupId+'/random-image',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({tag:tag.value}),signal:controller.signal});if(!r.ok){const seconds=Number(r.headers.get('retry-after'));if(seconds>0)until=Date.now()+seconds*1000;const data=await r.json();throw Error(data.error||'图片来源暂不可用')}
   const value=await r.blob();if(closed)return;if(!/^image\/(jpeg|png|gif|webp)$/.test(value.type)||value.size>8*1024*1024)throw Error('图片格式或大小不可用');url=URL.createObjectURL(value);img.src=url;await img.decode();if(closed)return;blob=value;reveal.disabled=false;pick.disabled=false;status.textContent='图片仅在此预览。确认内容合适后加入发送框，群内默认模糊。';until=Date.now()+5000
  }catch(e){if(!closed){status.textContent=e.message||'获取失败';if(url){URL.revokeObjectURL(url);url=''}img.removeAttribute('src')}}finally{busy=false;if(!closed)roll.disabled=false}
 }},tag,roll)
 const cleanup=()=>{if(closed)return;closed=true;controller.abort();if(url)URL.revokeObjectURL(url);blob=null;signal?.removeEventListener('abort',abort);dialog.remove()};const abort=()=>dialog.close();dialog.addEventListener('close',cleanup,{once:true});signal?.addEventListener('abort',abort,{once:true})
 body.append(h('h2',{},'随机摇图'),form,preview,status,h('div',{class:'ri-actions'},reveal,pick));if(signal?.aborted){abort();return}
 try{const config=await json('/api/random-image/config',{signal:controller.signal});if(!closed&&!config.enabled){roll.disabled=true;status.textContent='随机摇图已由站长暂停'}}catch(e){if(!closed){roll.disabled=true;status.textContent=e.message}}
}
export async function openRandomImageSettings({doc=document}){
 const {h,dialog,body}=ui(doc),controller=new AbortController();dialog.addEventListener('close',()=>{controller.abort();dialog.remove()},{once:true})
 const enabled=h('input',{type:'checkbox'}),tags=h('textarea',{rows:6,'aria-label':'禁用标签',placeholder:'每行一个标签'}),status=h('p',{role:'status'}),save=h('button',{type:'submit',disabled:true},'保存设置'),form=h('form',{onsubmit:async e=>{e.preventDefault();save.disabled=true;try{const blockedTags=tags.value.split(/[\n,，]/).map(x=>x.trim()).filter(Boolean);await json('/api/admin/random-image',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:enabled.checked,blockedTags}),signal:controller.signal});status.textContent='设置已保存，后续请求立即应用。'}catch(e){status.textContent=e.message}finally{save.disabled=false}}},h('label',{},enabled,'启用随机摇图'),h('label',{},'禁用标签（每行一个，最多80个）',tags),h('p',{},'服务端会阻止指定禁用标签，并将全部禁用标签作为 exclude_tag 传给上游。标签过滤不能替代人工确认。'),save,status)
 body.append(h('h2',{},'随机图片设置'),form)
 try{const data=await json('/api/admin/random-image',{signal:controller.signal});enabled.checked=data.enabled;tags.value=data.blockedTags.join('\n');save.disabled=false;if(data.gate.paused_until*1000>Date.now())status.textContent='来源冷却至 '+new Date(data.gate.paused_until*1000).toLocaleString()}catch(e){status.textContent=e.message}
}
