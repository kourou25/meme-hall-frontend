// 分类切换只隐藏面板，保留输入、异步状态与事件；搜索只使用显式功能目录。
export function settingsSections({h,sections,label='设置分类',initial,onSelect}){
 const id='settings-'+crypto.randomUUID(),panels=new Map(),buttons=new Map()
 let selected=initial||sections[0]?.id
 const available=s=>s.available?.()!==false
 const search=h('input',{type:'search',class:'input settings-search','aria-label':'查找设置项',placeholder:'查找设置项',autocomplete:'off'})
 const empty=h('p',{class:'settings-search-empty',role:'status',hidden:true},'没有匹配的设置项，请换个关键词。')
 const nav=h('nav',{class:'settings-category-nav','aria-label':label})
 const body=h('div',{class:'settings-category-body'})
 const element=h('div',{class:'settings-categories'},search,nav,empty,body)
 function refresh(){
  if(!sections.some(s=>s.id===selected&&available(s)))selected=sections.find(available)?.id
  const query=search.value.trim().toLocaleLowerCase()
  let matches=0
  for(const s of sections){
   const button=buttons.get(s.id),panel=panels.get(s.id),enabled=available(s)
   const match=enabled&&(!query||`${s.label} ${s.keywords||''}`.toLocaleLowerCase().includes(query))
   button.hidden=!match;button.setAttribute('aria-pressed',String(s.id===selected));matches+=Number(match)
   panel.hidden=!enabled||s.id!==selected
  }
  empty.hidden=matches>0
 }
 function select(key){if(!sections.some(s=>s.id===key&&available(s)))return;selected=key;search.value='';refresh();onSelect?.(key)}
 for(const s of sections){
  const button=h('button',{type:'button',id:id+'-'+s.id,class:'settings-category-button','aria-controls':id+'-panel-'+s.id,onclick:()=>select(s.id)},s.label)
  const panel=h('section',{id:id+'-panel-'+s.id,class:'settings-category-panel','aria-labelledby':button.id},h('h3',null,s.label),...s.nodes)
  buttons.set(s.id,button);panels.set(s.id,panel);nav.append(button);body.append(panel)
 }
 search.addEventListener('input',refresh)
 // 原生表单验证会先触发 invalid：同步展开所在分类，让浏览器能聚焦该字段。
 element.addEventListener('invalid',e=>{for(const [key,panel]of panels)if(panel.contains(e.target)){select(key);break}},true)
 refresh()
 return {element,refresh,select}
}
