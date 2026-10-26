import {RECENT_UPDATES} from './recent-updates-data.js?v=98ddcc7d'

export function openRecentUpdates(anchor){
 const doc=anchor.ownerDocument,existing=doc.querySelector('.recent-updates-dialog')
 if(existing){existing.focus();return}
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el}
 const dialog=make('dialog','recent-updates-dialog'),head=make('header'),heading=make('h2','','最近更新'),close=make('button','btn-icon','×')
 heading.id='recent-updates-title';dialog.setAttribute('aria-labelledby',heading.id);close.type='button';close.setAttribute('aria-label','关闭最近更新');close.onclick=()=>dialog.close()
 head.append(heading,close)
 const filters=make('nav','recent-updates-filters'),body=make('div','recent-updates-body'),buttons=[]
 filters.setAttribute('aria-label','更新类型');body.tabIndex=0
 const draw=filter=>{
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.textContent===filter))
  body.replaceChildren()
  for(const entry of RECENT_UPDATES){
   const groups=entry.groups.filter(([kind])=>filter==='全部'||kind===filter);if(!groups.length)continue
   const article=make('article'),time=make('time','',entry.date),title=make('h3','',entry.title);time.dateTime=entry.date;article.append(time,title)
   for(const [kind,items] of groups){const section=make('section'),label=make('h4','',kind),list=make('ul');for(const text of items)list.append(make('li','',text));section.append(label,list);article.append(section)}
   body.append(article)
  }
  body.scrollTop=0
 }
 for(const label of ['全部','功能','优化','修复']){const b=make('button','',label);b.type='button';b.onclick=()=>draw(label);buttons.push(b);filters.append(b)}
 dialog.append(head,filters,body);doc.body.append(dialog);draw('全部')
 dialog.addEventListener('close',()=>{dialog.remove();if(anchor.isConnected)anchor.focus({preventScroll:true})},{once:true})
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()})
 dialog.showModal()
}
