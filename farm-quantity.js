import {el,button} from './farm-ui.js?v=98ddcc7d'
export function quantityStepper(value,{label,min=1,max=99,onChange}){
 const group=el('div','farm-quantity'),input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';input.inputMode='numeric';input.value=String(value);input.setAttribute('aria-label',label)
 const change=()=>{const n=Number(input.value),valid=input.value!==''&&Number.isSafeInteger(n)&&n>=min&&n<=max;input.setCustomValidity(valid?'':`请输入${min}至${max}的整数`);minus.disabled=valid&&n===min;plus.disabled=valid&&n===max;onChange(valid?n:null)}
 const step=delta=>{input.value=String(Math.max(min,Math.min(max,(Number(input.value)||min)+delta)));change()}
 const minus=button('−',()=>step(-1)),plus=button('+',()=>step(1));minus.setAttribute('aria-label','减少'+label);plus.setAttribute('aria-label','增加'+label);minus.disabled=value===min;plus.disabled=value===max;input.oninput=change
 group.append(el('span','',label),minus,input,plus);return group
}
