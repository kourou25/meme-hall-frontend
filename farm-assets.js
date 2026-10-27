import {blockCropFrame} from './farm-block-crops.js?v=810c43bb'
// Source atlas uses hand-painted rows with different heights, not a square grid.
export const farmFrames=[
 [0,0,305,390],[305,0,325,390],[646,38,310,352],[958,8,285,383],
 [0,390,313,285],[313,390,313,285],[626,390,314,285],[940,390,314,285],
 [0,675,313,285],[313,675,313,285],[626,675,314,285],[940,675,314,285],
 [0,960,313,294],[313,960,313,294],[626,960,314,294],[940,960,314,294],
]
// Generated atlas has unequal row heights; explicit bounds prevent neighbouring sprites bleeding in.
const cuteX=[0,325,643,957,1265],cuteY=[0,350,663,961,1244]
export const cuteFarmFrames=Array.from({length:16},(_,i)=>{const x=i%4,y=Math.floor(i/4);return [cuteX[x],cuteY[y],cuteX[x+1]-cuteX[x],cuteY[y+1]-cuteY[y]]})
// Artwork rows and columns are not uniform; measured bounds exclude adjacent characters.
export const siteFarmFrames=[
 [12,15,335,365],[360,0,370,378],[735,40,355,345],[1095,20,350,365],
 [8,400,402,327],[402,378,330,377],[733,395,362,360],[1095,395,345,360],
 [5,731,370,345],[373,755,360,325],[736,752,350,330],[1086,752,360,330],
]
export const modelFarmFrames=[
 [20,40,355,343],[390,20,325,363],[730,75,350,310],[1090,50,355,335],
 [15,392,360,305],[385,395,335,300],[735,392,345,305],[1095,395,345,302],
 [15,714,360,340],[390,695,320,365],[730,710,350,345],[1080,700,365,355],
]
export const themeFarmFrames=Array.from({length:101},(_,i)=>[(i%10)*128,Math.floor(i/10)*128,128,128])
export function farmArt(frame,ranch=false){
 if(!ranch){const block=blockCropFrame(frame);if(block)return block}
 if(frame>=600&&frame<612){const index=frame-600;return {key:'farm-community',url:'/assets/farm/community-v5.webp',index,rect:[index%4*128,Math.floor(index/4)*128,128,128],width:512,height:384}}
 if(frame>=100&&frame<200){const index=frame%100;return {key:'farm-site-pixel',url:'/assets/farm/pixel-v3/site.webp',index,rect:[index%4*160,Math.floor(index/4)*160,160,160],width:640,height:480}}
 if(frame>=200&&frame<212){const index=frame-200;return {key:'farm-model-pixel',url:'/assets/farm/pixel-v3/model.webp',index,rect:[index%4*128,Math.floor(index/4)*128,128,128],width:512,height:384}}
 if(frame>=300&&frame<360){const animal=frame>=330,index=frame-(animal?330:300),kind=animal?'animals-theme':'crops-theme';return {key:'farm-'+kind,url:'/assets/farm/pixel-v3/'+kind+'.webp',index,rect:[index%5*128,Math.floor(index/5)*128,128,128],width:640,height:768}}
 if(frame>=300){const index=frame>=400?60+frame-400:frame-300;return {key:'farm-theme',url:'/assets/farm/theme-species-v1.svg',index,rect:themeFarmFrames[index],width:1280,height:1408}}
 if(frame>=100)return {key:frame>=200?'farm-model':'farm-site',url:frame>=200?'/assets/farm/model-species-v1.webp':'/assets/farm/site-species-v2.webp',index:frame%100,rect:(frame>=200?modelFarmFrames:siteFarmFrames)[frame%100],width:1448,height:1086}
 const cute=ranch||frame>=4&&frame<=9,index=ranch?frame:frame-4
 return {key:cute?'farm-cute':'farm-atlas',url:cute?'/assets/farm/cute-resources-v2.webp':'/assets/farm/atlas-v1.webp',index:cute?index:frame,rect:cute?cuteFarmFrames[index]:farmFrames[frame],width:cute?1265:1254,height:cute?1244:1254}
}
