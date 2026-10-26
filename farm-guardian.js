import {el,button,duration} from './farm-ui.js?v=98ddcc7d'
export function guardianStatus(s,t){
 const g=s.guardian;if(!g)return null
 const charges=Math.min(3,g.charges+Math.max(0,Math.floor((t-g.chargedAt)/21600)))
 return {...g,charges,level:Math.min(20,1+Math.floor(g.careCount/20)),cooldown:Math.max(0,g.skillAt+1800-t),protected:g.protectionUntil>t}
}
export function drawGuardianPanel(details,{state,catalog,time,actionButton}){
 const g=guardianStatus(state,time()),list=el('div','farm-guardian-list')
 details.append(el('h3','','AI 守护兽'),el('p','farm-small','四个形象共用成长、专注值和冷却，切换不会恢复次数。每6小时恢复1点专注，最多3点；技能共用30分钟冷却。'))
 for(const def of catalog.guardians??[]){const card=el('article','farm-guardian-card'),art=el('img');art.src=def.image;art.alt=def.name;art.width=80;art.height=96;art.loading='lazy';art.decoding='async';const pick=actionButton(g?.id===def.id?'已到岗':'选择',{type:'guardian_select',id:def.id},g?.id===def.id);card.append(art,el('strong','',def.name),pick);list.append(card)}details.append(list)
 if(!g)return
 details.append(el('h3','',`Lv.${g.level} · 专注 ${g.charges}/3`),el('p','farm-small',g.cooldown?'技能还需 '+duration(g.cooldown):'技能就绪'))
 const actions=el('div','farm-shop-actions');actions.append(actionButton('警戒15分钟 · 1专注',{type:'guardian_skill',skill:'ward'},g.charges<1||g.cooldown>0||g.protected),actionButton('协助照料 · 1专注',{type:'guardian_skill',skill:'care'},g.charges<1||g.cooldown>0));details.append(actions,el('p','farm-small','新警戒拦截普通摘取，将付费潜入成功率降至40%；旧绝对保护履行至到期。协助照料依次处理浇水/驱虫、缺粮动物与清洁，最多6处。产物动物用1份库存饲料，育肥猪用2份；不自动花币，无合适目标不消耗专注。'))
 if(g.protected)details.append(el('p','',`警戒中 · ${duration(g.protectionUntil-time())}后结束`))
 details.append(el('p','farm-small','每20次有效技能升1级，最高20级；成长不增加永久免偷。'))
}
