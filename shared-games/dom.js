import {gameRules} from './rules-data.js';
export function gameDom(doc){
 const h=(tag,props={},...children)=>{const e=doc.createElement(tag);for(const[k,v]of Object.entries(props||{})){if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='class')e.className=v;else if(['disabled','checked','hidden'].includes(k))e[k]=!!v;else if(v!==null&&v!==undefined)e.setAttribute(k,v)}for(const c of children.flat(Infinity))if(c!==null&&c!==undefined&&c!==false)e.append(c?.nodeType?c:doc.createTextNode(String(c)));return e};
 const button=(text,fn,props={})=>h('button',{type:'button',onclick:fn,...props},text),input=(label,props={})=>h('input',{'aria-label':label,...props}),select=(label,choices)=>h('select',{'aria-label':label},choices.map(([value,text])=>h('option',{value},text))),field=(label,node,help)=>h('label',{class:'game-field'},h('span',{},label),node,help&&h('small',{},help));
 const ruleHelp=mode=>{const r=gameRules.find(x=>x[0]===mode);return h('details',{class:'game-rules'},h('summary',{},'规则'),...(r?.[2]||[]).map(([title,text])=>h('p',{},h('strong',{},title+'：'),text)))};
 return {h,button,input,select,field,ruleHelp};
}
