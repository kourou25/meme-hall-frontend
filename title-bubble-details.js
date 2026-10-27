import {installBubbleBursts} from '/title-bubble-bursts.js?v=c8639d55'
const motifs={oldfarmer:'garden',newcomer:'leaf',mona:'lotus',lace:'ribbon',giant:'banana',worship:'banana',muscle:'glove',deepseek:'fin',deepseekupgrade:'fin',maid:'ribbon',whalepunch:'glove',nightdevil:'horns',gpt:'dragon',claude:'flower',gemini:'twin',whitedragon:'dragon',rascal:'horns',weirdo:'mask',blacksilk:'ribbon',loli:'bunny',electric:'bolt',railcannon:'cannon',chickengun:'meme',blade:'blade',spear:'spear',sword:'blade',halberd:'halberd',snow:'snow',moon:'moon',wind:'wind',flower:'flower',sun:'sun',star:'star',cloud:'cloud'}
function ensureWeaponFilter(doc){
 if(doc.getElementById('rt-weapon-ink'))return
 // Inline once per document: external SVG filter references are not reliable
 // across browsers, which otherwise exposes the meme's white rectangle.
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg')
 svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;pointer-events:none'
 svg.innerHTML='<defs><filter id="rt-weapon-ink" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" result="ink" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 -10 -2 0 -.12"/><feMorphology in="ink" result="outline" operator="dilate" radius=".7"/><feComposite in="SourceGraphic" in2="outline" operator="in"/></filter></defs>'
 doc.body.append(svg)
}
export function appendBubbleDetail(el){
 if(el.classList.contains('rt-bubble')&&el.classList.contains('rt-whalebuddy')){
  if(!el.querySelector(':scope > .rt-whale-frame')){const frame=el.ownerDocument.createElement('span');frame.className='rt-whale-frame';frame.setAttribute('aria-hidden','true');el.append(frame)}
  return
 }
 if(!el.classList.contains('rt-bubble')||!el.classList.contains('rt-anime')||el.querySelector(':scope > .rt-detail'))return
 const id=Object.keys(motifs).find(id=>el.classList.contains('rt-'+id));if(!id)return
 if(id==='chickengun')ensureWeaponFilter(el.ownerDocument)
 const portrait=['gpt','claude','gemini','deepseek','deepseekupgrade','maid','nightdevil','whitedragon'].includes(id)
 el.classList.toggle('rt-portrait',portrait)
 const doc=el.ownerDocument,detail=doc.createElement('span');detail.className='rt-detail rt-detail-'+motifs[id];detail.setAttribute('aria-hidden','true')
 const parts=id==='oldfarmer'?['frame','garden','coins']:['frame','finish',...(portrait?['portrait-rim','portrait-left','portrait-right']:[]),'spark','spark','spark',...(id==='railcannon'?['cannon','muzzle']:[]),...(id==='chickengun'?['meme']:[])];
 for(const part of parts){
  const node=doc.createElement('i');node.className='rt-trim-'+part
  if(part==='spark')node.style.setProperty('--rt-i',String(detail.querySelectorAll('.rt-trim-spark').length))
  detail.append(node)
 }
 el.append(detail)
 if(id==='railcannon'||id==='chickengun')installBubbleBursts(doc)
}
