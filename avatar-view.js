// A URL fragment carries presentation only; the original animation stays cacheable.
const clamp=(v,a,b,d)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):d
export function avatarGeometry(width,height,{rotation=0,zoom=1,x=.5,y=.5}={}){
 if(![width,height].every(v=>Number.isFinite(v)&&v>0&&v<=16384))throw Error('图片尺寸无效')
 rotation=((Math.round(rotation/90)*90)%360+360)%360
 zoom=clamp(zoom,1,3,1);x=clamp(x,0,1,.5);y=clamp(y,0,1,.5)
 const rw=rotation%180?height:width,rh=rotation%180?width:height,scale=zoom/Math.min(rw,rh),bw=rw*scale,bh=rh*scale
 return {width,height,rotation,zoom,x,y,scale,bw,bh,tx:(1-bw)*(x-.5),ty:(1-bh)*(y-.5),output:Math.max(1,Math.floor(Math.min(512,Math.min(rw,rh)/zoom)))}
}
export function parseAvatar(url){
 const m=typeof url==='string'&&url.match(/^(\/img\/a\/\d{4}\/\d{2}\/[a-f0-9]{24}\.(?:gif|webp|png|jpg))#av=([\d.,]+)$/)
 if(!m)return null
 const a=m[2].split(',').map(Number)
 if(a.length!==6||a.some(v=>!Number.isFinite(v))||a[0]<1||a[1]<1||a[0]>4096||a[1]>4096||![0,90,180,270].includes(a[2])||a[3]<1||a[3]>3||a[4]<0||a[4]>1||a[5]<0||a[5]>1)return null
 return {src:m[1],...avatarGeometry(a[0],a[1],{rotation:a[2],zoom:a[3],x:a[4],y:a[5]})}
}
export function paintAvatarImage(img,g){
 Object.assign(img.style,{position:'absolute',maxWidth:'none',maxHeight:'none',width:(g.width*g.scale*100)+'%',height:(g.height*g.scale*100)+'%',left:((.5+g.tx)*100)+'%',top:((.5+g.ty)*100)+'%',transform:`translate(-50%, -50%) rotate(${g.rotation}deg)`,objectFit:'fill',borderRadius:'0',pointerEvents:'none'})
}
const replacements=new Map()
export function avatarImage(h,url,name='',size=28,cls='avatar'){
 url=replacements.get(url)||url
 const g=parseAvatar(url)
 const img=h('img',{src:g?.src||url,alt:g?'':name,width:size,height:size,referrerpolicy:'no-referrer',loading:'lazy',decoding:'async'})
 if(!g){img.className=cls;img.dataset.avatarUrl=url;return img}
 const box=h('span',{class:cls+' avatar-cropped',role:'img','aria-label':name||'头像','data-avatar-url':url,style:{display:'inline-block',position:'relative',overflow:'hidden',verticalAlign:'middle',borderRadius:'50%',flexShrink:'0'}},img)
 box.style.setProperty('--avatar-size',size+'px')
 paintAvatarImage(img,g)
 return box
}
export function refreshAvatar(h,oldUrl,newUrl,name,doc=document){
 // External default avatars may be shared by many accounts; only owned keys are unique.
 if(typeof oldUrl!=='string'||!oldUrl.startsWith('/img/a/'))return
 for(const [key,value] of replacements)if(value===oldUrl)replacements.set(key,newUrl)
 replacements.set(oldUrl,newUrl)
 for(const node of doc.querySelectorAll('[data-avatar-url]')){
  if(node.dataset.avatarUrl!==oldUrl)continue
  const size=node.getBoundingClientRect().width||28,cls=node.className.replace(' avatar-cropped','')
  node.replaceWith(avatarImage(h,newUrl,name,size,cls))
 }
}
