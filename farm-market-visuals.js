import {el,sprite,coin} from './farm-ui.js?v=8f410db6'
import {fishSprite} from './farm-fish-art.js?v=8f410db6'
export function marketStyles(){if(document.querySelector('link[data-farm-market]'))return;const link=el('link');link.rel='stylesheet';link.href='/farm-market.css?v=8f410db6';link.dataset.farmMarket='1';document.head.append(link)}
export function goodsArt(spec){const wrap=el('span','fm-goods-art');if(spec)wrap.append(spec.kind==='fish'?fishSprite(spec.frame):sprite(spec.frame,spec.kind==='animal'));return wrap}
export function metric(label,value,detail){const n=el('div','fm-metric');n.append(el('span','',label),el('strong','',value));if(detail)n.append(el('small','',detail));return n}
const date=t=>new Date(t*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
// Small bounded SVG: no chart runtime, no per-frame or hover network requests.
export function priceChart(points,spec){
 const host=el('div','fm-chart');if(!points.length){host.append(el('p','fm-chart-empty','还没有已结算的行情。新收成与交易发生后，这里会记录真实价格。'));return host}
 const ns='http://www.w3.org/2000/svg',node=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e},svg=node('svg',{viewBox:'0 0 660 192',preserveAspectRatio:'none',role:'img','aria-label':spec.name+'价格走势'}),plot=el('div','fm-chart-plot'),top=16,bottom=149,left=12,right=648,base=spec.price*100,first=points[0].tick_at,last=points.at(-1).tick_at
 const values=points.map(p=>p.price_cents),low=Math.min(...values,base),high=Math.max(...values,base),pad=Math.max(2,(high-low)*.15),min=Math.max(0,low-pad),max=high+pad,x=i=>left+(right-left)*(first===last?.5:(points[i].tick_at-first)/(last-first)),y=v=>bottom-(v-min)/(max-min)*(bottom-top)
 for(let i=0;i<4;i++){const value=min+(max-min)*i/3,py=y(value);svg.append(node('line',{x1:left,x2:right,y1:py,y2:py,class:'fm-chart-grid','vector-effect':'non-scaling-stroke'}));const label=el('span','fm-chart-axis',(value/100).toFixed(2));label.style.top=py/192*100+'%';plot.append(label)}
 svg.append(node('line',{x1:left,x2:right,y1:y(base),y2:y(base),class:'fm-chart-base'}));const path=points.map((p,i)=>(i?'L':'M')+x(i)+','+y(p.price_cents)).join(' ')
 svg.append(node('path',{d:path+` L${x(points.length-1)},${bottom} L${x(0)},${bottom} Z`,class:'fm-chart-area'}),node('path',{d:path,class:'fm-chart-line'}))
 const volumeMax=Math.max(1,...points.map(p=>p.sold+p.bought));points.forEach((p,i)=>svg.append(node('rect',{x:x(i)-1,y:183-(p.sold+p.bought)/volumeMax*21,width:Math.max(2,Math.min(10,(right-left)/points.length-1)),height:(p.sold+p.bought)/volumeMax*21,class:'fm-chart-volume'})))
 const cursor=node('line',{y1:top,y2:184,class:'fm-chart-cursor'}),dot=node('circle',{r:4,class:'fm-chart-dot'});svg.append(cursor,dot)
 const readout=el('div','fm-chart-readout'),input=el('input','fm-chart-range');input.type='range';input.min='0';input.max=String(points.length-1);input.value=input.max;input.setAttribute('aria-label','选择行情时间点')
 let shown=-1
 const show=i=>{if(shown===i)return;shown=i;const p=points[i];cursor.setAttribute('x1',x(i));cursor.setAttribute('x2',x(i));dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(p.price_cents));readout.replaceChildren(el('span','',date(p.tick_at)));const price=el('strong');price.innerHTML=coin((p.price_cents/100).toFixed(2));readout.append(price,el('span','',`成交 ${p.sold+p.bought} · ${p.effective_qty==null?'账面库存 '+p.fresh_qty:'折算库存 '+p.effective_qty}`));input.setAttribute('aria-valuetext',date(p.tick_at)+'，'+(p.price_cents/100).toFixed(2)+'D币');input.value=String(i)}
 input.oninput=()=>show(Number(input.value));svg.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const b=svg.getBoundingClientRect(),px=(e.clientX-b.left)/b.width*660;let nearest=0;for(let i=1;i<points.length;i++)if(Math.abs(x(i)-px)<Math.abs(x(nearest)-px))nearest=i;show(nearest)})
 const times=el('div','fm-chart-times');for(const t of [first,last])times.append(el('span','',date(t)))
 show(points.length-1);plot.prepend(svg);host.append(plot,times,input,readout);return host
}
