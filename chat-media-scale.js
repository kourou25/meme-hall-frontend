const sizes={normal:1,quarter:.5,eighth:Math.SQRT1_2/2},key=uid=>'chat-media-size:'+Number(uid||0),event='chat-media-size-change';
export function chatMediaSize(uid){try{const value=localStorage.getItem(key(uid));return Object.hasOwn(sizes,value)?value:'normal'}catch{return'normal'}}
export function attachChatMediaScale(pane,{uid,scroller,list}){
 const doc=pane.ownerDocument;if(!doc.querySelector('link[href*="/chat-media-scale.css?v=97fd912d"]')){const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./chat-media-scale.css?v=97fd912d',import.meta.url).href;doc.head.append(css)}
 let value='';const update=e=>{if(e?.type==='storage'&&e.key!==key(uid))return;if(e?.detail&&e.detail.uid!==uid)return;const next=chatMediaSize(uid);if(next===value)return;
  const rect=scroller.getBoundingClientRect(),bottom=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<4;
  const rows=list.children;let lo=0,hi=rows.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].getBoundingClientRect().bottom<=rect.top)lo=mid+1;else hi=mid}const anchor=rows[lo],before=anchor?.getBoundingClientRect().top;
  value=next;pane.dataset.mediaSize=next;pane.style.setProperty('--chat-media-scale',String(sizes[next]));
  if(bottom)scroller.scrollTop=scroller.scrollHeight;else if(anchor&&Number.isFinite(before))scroller.scrollTop+=anchor.getBoundingClientRect().top-before;
 };update();window.addEventListener(event,update);window.addEventListener('storage',update);return()=>{window.removeEventListener(event,update);window.removeEventListener('storage',update)}
}
export function chatMediaScaleSettings({uid,h,onRemoval}){
 const select=h('select',{'aria-label':'群聊图片和视频显示尺寸'},Object.entries({normal:'默认大小',quarter:'缩小至 1/4 面积',eighth:'缩小至 1/8 面积'}).map(([value,text])=>h('option',{value},text)));
 const note=h('small',{class:'muted'},'仅改变本账号在当前浏览器的群聊图片、视频和多图框大小；点击查看仍为正常尺寸，表情包与帖子预览不变。');select.value=chatMediaSize(uid);
 const root=h('div',{class:'chat-media-size-settings'},h('h4',null,'媒体显示尺寸'),select,note);
 select.onchange=()=>{try{localStorage.setItem(key(uid),select.value);window.dispatchEvent(new CustomEvent(event,{detail:{uid}}))}catch{select.value=chatMediaSize(uid);note.textContent='无法保存，请检查浏览器存储权限。'}};
 const sync=e=>{if(e.type==='storage'&&e.key!==key(uid))return;select.value=chatMediaSize(uid)};window.addEventListener(event,sync);window.addEventListener('storage',sync);onRemoval(root,()=>{window.removeEventListener(event,sync);window.removeEventListener('storage',sync)});return root;
}
