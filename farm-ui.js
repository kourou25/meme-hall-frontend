import {farmArt} from './farm-assets.js?v=97fd912d'
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const paths={
  seed:'M12 21v-9M12 15C2 16 2 7 3 4c7-1 11 3 9 8M12 12c0-7 5-10 10-8 1 7-3 10-10 8',
  ranch:'M5 10 3 6l5 1M19 10l2-4-5 1M7 8c-3 2-3 9-1 11 3 3 9 3 12 0 2-2 2-9-1-11M8 13h.1M16 13h.1M8 19v-2h8v2',
  tree:'m12 2-6 7h3l-6 7h7v6h4v-6h7l-6-7h3Z',
  friends:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3c0-5 14-5 14 0v3ZM17 4c5 0 5 7 0 7M18 15c4 0 5 2 5 6',
  wood:'M4 5h16v14H4ZM4 10h16M4 14h16M7 5v5m10 4v5',
  heart:'M12 21C-5 10 3-2 12 7c9-9 17 3 0 14Z',
  star:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  basket:'m3 10 3 11h12l3-11ZM6 10 10 3M18 10 14 3M9 13v5M15 13v5',
  water:'M12 2C8 9 4 12 4 16a8 8 0 0 0 16 0c0-4-4-7-8-14Z',
  book:'M12 5c-3-2-7-3-10-2v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-7 0-10 2Zm0 0v16',
  axe:'m5 22 9-16M8 7 11 2l10 6-3 6Z',
  bag:'M7 7V5c0-6 10-6 10 0v2M4 7h16l2 15H2Z',
  clock:'M12 8v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  back:'m9 4-8 8 8 8M2 12h20',
  plus:'M12 3v18M3 12h18',
  shield:'M12 2 3 6v6c0 5 5 9 9 10 4-1 9-5 9-10V6ZM8 12l3 3 5-6',
  refresh:'M20 7v5h-5M4 17v-5h5M19 11a7 7 0 0 0-12-6L4 8m1 5a7 7 0 0 0 12 6l3-3',
}
export const icon=name=>`<svg class="farm-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="${paths[name]||paths.seed}"/></svg>`
export const coin=n=>`<span class="farm-currency" aria-label="${escape(n)}枚D币"><i class="farm-coin52 dcoin" aria-hidden="true"></i>${escape(n)}</span>`
export function art(frame,ranch=false){
  const a=farmArt(frame,ranch),[x,y,w,h]=a.rect
  return `<span class="farm-sprite" aria-hidden="true" style="background-image:url('${a.url}');background-size:${a.width/w*100}% ${a.height/h*100}%;background-position:${x/(a.width-w)*100}% ${y/(a.height-h)*100}%"></span>`
}

export const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
export const button=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b}
export const duration=n=>n<=0?'已就绪':n<60?Math.ceil(n)+'秒':n<3600?Math.ceil(n/60)+'分钟':Math.floor(n/3600)+'小时'+Math.floor(n%3600/60)+'分'
export const sprite=(frame,ranch=false)=>{const wrapper=el('span');wrapper.innerHTML=art(frame,ranch);return wrapper.firstElementChild}
export const iconButton=(name,label,fn,cls='')=>{const b=button('',fn,cls);b.innerHTML=icon(name)+'<span>'+escape(label)+'</span>';return b}
