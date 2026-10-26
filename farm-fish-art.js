export const fishAtlas='/assets/farm/pixel-v3/fish-v6.webp'
export const fishRect=index=>[(index%4)*160,Math.floor(index/4)*160,160,160]
export function fishSprite(index){const n=document.createElement('span');n.className='fl-fish-sprite';n.setAttribute('aria-hidden','true');n.style.backgroundImage=`url('${fishAtlas}')`;n.style.backgroundSize='400% 600%';n.style.backgroundPosition=`${index%4/3*100}% ${Math.floor(index/4)/5*100}%`;return n}
