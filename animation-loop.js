// Only edit animation loop metadata; image payloads, frame timing and pixels stay intact.
const text=(b,p,n)=>String.fromCharCode(...b.subarray(p,p+n))
const pngSignature=b=>b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)
let crcTable
function pngCrc(bytes,start,end){
 if(!crcTable){crcTable=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[i]=c>>>0}}
 let c=0xffffffff
 for(let i=start;i<end;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8)
 return (c^0xffffffff)>>>0
}
function normalizePng(bytes){
 const unchanged={bytes,animated:false},view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 let p=8,control=-1,frames=0,expected=0,sequence=0,idat=false,frameData=false
 while(p+12<=bytes.length){
  const n=view.getUint32(p),type=text(bytes,p+4,4),end=p+12+n
  if(end>bytes.length||p===8&&(type!=='IHDR'||n!==13))return unchanged
  if(type==='acTL'){
   if(n!==8||control>=0||idat||!view.getUint32(p+8)||pngCrc(bytes,p+4,p+8+n)!==view.getUint32(p+8+n))return unchanged
   control=p;expected=view.getUint32(p+8)
  }else if(type==='fcTL'){
   if(control<0||n!==26||frames>0&&!frameData||view.getUint32(p+8)!==sequence++||pngCrc(bytes,p+4,p+8+n)!==view.getUint32(p+8+n))return unchanged
   frames++;frameData=false
  }else if(type==='fdAT'){
   if(!idat||!frames||n<4||view.getUint32(p+8)!==sequence++)return unchanged
   if(n>4)frameData=true
  }else if(type==='IDAT'){
   if(control<0)return unchanged // acTL must precede IDAT; ordinary PNG needs no payload scan.
   idat=true;if(frames&&n)frameData=true
  }else if(type==='IEND'){
   if(n||control<0||!idat||!frameData||frames!==expected)return unchanged
   if(view.getUint32(control+12)===0)return {bytes,animated:true}
   const out=Uint8Array.from(bytes),patched=new DataView(out.buffer)
   patched.setUint32(control+12,0)
   patched.setUint32(control+16,pngCrc(out,control+4,control+16))
   return {bytes:out,animated:true}
  }
  p=end
 }
 return unchanged
}
// Read bounded header windows and jump over ancillary payloads. Most static PNGs
// stop at the first IDAT without reading the full image; unusual headers fall back to full parsing.
async function mayAnimatePng(file){
 let start=0,head=new Uint8Array(await file.slice(0,4096).arrayBuffer()),p=8
 if(!pngSignature(head))return false
 for(let i=0;i<256&&p+12<=file.size;i++){
  if(p+8>start+head.length){start=p;head=new Uint8Array(await file.slice(p,p+4096).arrayBuffer())}
  if(head.length<p-start+8)return false
  const n=new DataView(head.buffer,head.byteOffset,head.byteLength).getUint32(p-start),type=text(head,p-start+4,4)
  if(p+12+n>file.size)return false
  if(type==='acTL')return n===8
  if(type==='IDAT'||type==='IEND')return false
  p+=n+12
 }
 return p+12<=file.size
}
export function normalizeAnimationBytes(bytes){
 if(pngSignature(bytes))return normalizePng(bytes)
 const unchanged={bytes,animated:false},patches=[]
 let frames=0,insert=-1
 if(bytes.length>=13&&/^GIF8[79]a$/.test(text(bytes,0,6))){
  let p=13+(bytes[10]&128?3*(1<<((bytes[10]&7)+1)):0),ended=false
  if(p>bytes.length)return unchanged
  insert=p
  const blocks=(loop=false)=>{
   while(p<bytes.length){const n=bytes[p++];if(!n)return true;if(p+n>bytes.length)return false
    if(loop&&n===3&&bytes[p]===1)patches.push(p+1)
    p+=n
   }return false
  }
  while(p<bytes.length){
   const kind=bytes[p++]
   if(kind===0x3b){ended=true;break}
   if(kind===0x21){
    if(p>=bytes.length)return unchanged
    const label=bytes[p++]
    if(label===0xff){
     if(p>=bytes.length)return unchanged
     const n=bytes[p++];if(p+n>bytes.length)return unchanged
     const app=text(bytes,p,n);p+=n
     if(!blocks(n===11&&(app==='NETSCAPE2.0'||app==='ANIMEXTS1.0')))return unchanged
    }else if(!blocks())return unchanged
   }else if(kind===0x2c){
    if(p+9>bytes.length)return unchanged
    const flags=bytes[p+8];p+=9
    if(flags&128)p+=3*(1<<((flags&7)+1))
    if(p>=bytes.length)return unchanged
    p++ // LZW minimum code size; following sub-blocks contain compressed pixels.
    if(!blocks())return unchanged
    frames++
   }else return unchanged
  }
  if(!ended||frames<2)return unchanged
 }else if(bytes.length>=12&&text(bytes,0,4)==='RIFF'&&text(bytes,8,4)==='WEBP'){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=view.getUint32(4,true)+8
  if(end>bytes.length||end<12)return unchanged
  let p=12
  while(p+8<=end){
   const type=text(bytes,p,4),n=view.getUint32(p+4,true),next=p+8+n+(n%2)
   if(next>end)return unchanged
   if(type==='ANIM'&&n===6)patches.push(p+12)
   if(type==='ANMF')frames++
   p=next
  }
  if(p!==end||frames<2||!patches.length)return unchanged
 }else return unchanged
 const changes=patches.filter(p=>bytes[p]!==0||bytes[p+1]!==0)
 if(!patches.length&&insert>=0){
  const extension=new Uint8Array([0x21,0xff,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0])
  const out=new Uint8Array(bytes.length+extension.length)
  out.set(bytes.subarray(0,insert));out.set(extension,insert);out.set(bytes.subarray(insert),insert+extension.length)
  // The application extension is a GIF89a feature.
  out[4]=0x39
  return {bytes:out,animated:true}
 }
 if(!changes.length)return {bytes,animated:true}
 const out=Uint8Array.from(bytes)
 for(const p of changes){out[p]=0;out[p+1]=0}
 return {bytes:out,animated:true}
}

export async function normalizeAnimationFile(file){
 if(!/^image\/(gif|webp|png|apng)$/.test(file.type))return {file,animated:false}
 const pngCandidate=/^image\/(png|apng)$/.test(file.type)&&await mayAnimatePng(file)
 if(/^image\/(png|apng)$/.test(file.type)&&!pngCandidate)return {file,animated:false}
 if(file.type==='image/webp'){
  const head=new Uint8Array(await file.slice(0,32).arrayBuffer())
  if(text(head,12,4)!=='VP8X'||!(head[20]&2))return {file,animated:false}
 }
 const original=new Uint8Array(await file.arrayBuffer()),result=normalizeAnimationBytes(original)
 // An unrecognized animation must not fall through to a destructive static canvas conversion.
 return {animated:result.animated||pngCandidate,file:result.bytes===original?file:new File([result.bytes],file.name,{type:file.type,lastModified:file.lastModified})}
}
