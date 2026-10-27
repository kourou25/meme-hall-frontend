import {el,button,coin,duration,icon} from './farm-ui.js?v=8f410db6'
import {quantityStepper} from './farm-quantity.js?v=8f410db6'
import {goodsArt,metric,marketStyles} from './farm-market-visuals.js?v=8f410db6'
import {conflictChance,conflictLoot,CONFLICT_RULES as R} from './farm-conflict-rules.js?v=8f410db6'
import {panelClock} from './farm-panel-clock.js?v=8f410db6'
const stances=[['patrol','巡逻 · 克制潜入'],['barrier','路障 · 克制强攻'],['decoy','诱饵 · 克制诱敌']]
const tactics=[['sneak','潜入'],['rush','强攻'],['lure','诱敌']]
const states={preparing:'准备中',failed:'进攻被阻止',escrow:'战利品托管',uprising:'起义招募中',claimable:'等待仓库空位',claimed:'战利品已领取',recovered:'追索成功'}
export function createFarmConflict(root,{request,userId,onChanged}){
 marketStyles()
 const dialog=el('dialog','farm-social farm-market farm-conflict'),head=el('header'),title=el('h2','','货仓攻防'),note=el('p','farm-market-notice'),body=el('div','farm-social-body');title.id='farm-conflict-title';dialog.setAttribute('aria-labelledby',title.id);note.setAttribute('role','status');head.append(title,button('关闭',()=>dialog.close()));dialog.append(head,note,body);root.append(dialog)
 let disposed=false,busy=false,data=null,inventory=null,tab='scout',target='',generation=0,pending=null,activityFilter='active',draft={target:'',lot:'',tools:0,tactic:'sneak'},live=[],characters=null,actor=''
 try{actor=localStorage.getItem('farm.conflict.actor:'+userId)||''}catch{}
 const clock=panelClock(dialog,()=>{for(const update of live)update()})
 const key='farm.conflict.pending:'+userId
 try{const stored=JSON.parse(sessionStorage.getItem(key)||'null');if(stored?.id&&stored?.payload)pending=stored}catch{}
 const name=item=>data?.catalog.find(c=>c.key===item)?.name??item
 const select=(choices,value,label)=>{const s=el('select');s.setAttribute('aria-label',label);for(const [id,text] of choices)s.add(new Option(text,id));s.value=value;return s}
 const action=(label,payload,disabled=false)=>{const b=button(label,()=>void send(typeof payload==='function'?payload():payload));b.disabled=busy||disabled;return b}
 function strategies(choices,value,help,changed){const row=el('div','fc-strategies');let selected=value;for(const [id,text] of choices){const b=button('',()=>{selected=id;for(const x of row.children)x.setAttribute('aria-pressed',String(x.dataset.id===id));changed(id)},'fc-strategy');b.dataset.id=id;b.setAttribute('aria-pressed',String(id===selected));b.disabled=busy;b.innerHTML=icon({patrol:'shield',barrier:'wood',decoy:'seed',sneak:'water',rush:'axe',lure:'star'}[id]);b.append(el('strong','',text.split(' · ')[0]),el('small','',help[id]));row.append(b)}return row}
 async function load(before){const seq=++generation;note.textContent='正在读取攻防状态…';try{
  if(characters===null){const r=await request('/api/me/raffle-titles');characters=r.ok?(r.data.titles??[]).filter(t=>t.level>0||t.owned):[];if(!characters.some(c=>c.id===actor))actor=characters[0]?.id??''}
  const query=new URLSearchParams();if(target)query.set('target',target);if(before)query.set('before',String(before))
  const [r,m]=await Promise.all([request('/api/farm/conflict?'+query),request('/api/farm/market')]);if(disposed||seq!==generation)return
  if(!r.ok)throw Error(r.data.error||'攻防状态暂不可用');if(!m.ok)throw Error(m.data.error||'批次仓库暂不可用');data={...r.data,targets:before?[...(data?.targets??[]),...r.data.targets].slice(-120):r.data.targets};clock.sync(data.server_time);inventory=m.data;note.textContent='';draw()
 }catch(e){if(!disposed&&seq===generation){note.dataset.state='error';note.textContent=e.message;if(!data)body.replaceChildren(button('重新读取',()=>load()))}}}
 async function send(payload){if(busy||disposed)return
  if(pending&&JSON.stringify(pending.payload)!==JSON.stringify(payload)){note.textContent='上一笔操作结果尚未确认，请先重新确认。';return}
  pending??={id:crypto.randomUUID(),payload};try{sessionStorage.setItem(key,JSON.stringify(pending))}catch{pending=null;note.textContent='无法保存操作编号，请允许本站会话存储。';return}
  busy=true;draw();note.dataset.state='pending';note.textContent='正在确认…'
  try{const r=await request('/api/farm/conflict',{...pending.payload,id:pending.id});if(disposed)return;if(!r.ok){if(r.status<500){pending=null;sessionStorage.removeItem(key);await load()}throw Error(r.data.error||'结果尚未确认，请使用原编号重试')}
   pending=null;sessionStorage.removeItem(key);if(payload.kind==='raid'){tab='activity';activityFilter='all';body.scrollTop=0;}await onChanged?.();await load();if(!disposed){note.dataset.state='success';note.textContent=r.data.message||(r.data.claimable?'仓库空间不足，请出售部分库存后重新领取。':'操作已确认')}
  }catch(e){if(!disposed){note.dataset.state='error';note.textContent=e.message}}finally{busy=false;if(!disposed)draw()}
 }
 function draw(){const scroll=body.scrollTop;live=[];body.replaceChildren();if(!data)return
  if(characters?.length){const crew=el('section','fc-crew'),portrait=el('img'),copy=el('div'),who=characters.find(c=>c.id===actor)??characters[0],choose=select(characters.map(c=>[c.id,(c.name??c.id)+' · Lv'+c.level]),who.id,'备战人物');portrait.src=who.id==='muscle'?'/assets/raffle/muscle-tail.webp':who.id==='whalebuddy'?'/assets/raffle/whale-motion/person-still.webp':`/assets/raffle/anime-v6/${who.id}-still.webp`;portrait.alt=who.name;portrait.width=96;portrait.height=96;portrait.decoding='async';choose.disabled=busy;choose.onchange=()=>{actor=choose.value;try{localStorage.setItem('farm.conflict.actor:'+userId,actor)}catch{}draw()};copy.append(el('strong','','备战伙伴'),choose,el('small','','使用已拥有的称号形象。攻防结果由策略、道具与守护状态决定。'));crew.append(portrait,copy);body.append(crew)}
  const tabs=el('nav','farm-market-tabs');tabs.setAttribute('aria-label','攻防内容')
  for(const [id,text] of [['activity','战报预警'],['warehouse','我的货仓'],['scout','侦察行动']]){const b=button(text,()=>{tab=id;body.scrollTop=0;draw()});b.setAttribute('aria-pressed',String(tab===id));b.disabled=busy;tabs.append(b)}const refresh=button('',()=>void load(),'fm-refresh');refresh.innerHTML=icon('refresh');refresh.title='刷新';refresh.setAttribute('aria-label','刷新');refresh.disabled=busy;tabs.append(refresh);body.append(tabs)
  if(pending)body.append(action('重新确认上次操作',pending.payload))
  if(!data.enabled)body.append(el('p','farm-small','新行动暂未开放；已开始的攻防与追索仍会正常结算。'))
  if(!data.me?.enabled&&tab==='warehouse'){entry();return}
  const overview=el('section','fc-overview'),stats=el('div','fm-summary'),waiting=data.battles.filter(b=>b.status==='preparing'),value=data.stakes.filter(l=>l.expires_at>data.server_time).reduce((n,l)=>n+l.pledged*l.price_cents,0)/100
  overview.append(el('h3','',waiting.some(b=>b.defender_id===userId)?'有行动接近，部署防守':'货仓与守护'),el('p','',waiting.some(b=>b.defender_id===userId)?'在准备期内调整阵型、投入道具或封仓，改变这场攻防的结果。':'只让主动划入的物资参与攻防，普通仓库与红包奖励保持独立。'));stats.append(metric('货仓估值',value.toFixed(2),'只计算新鲜物资'),metric('待结算行动',String(waiting.length),'突袭即时结算 · 准备战3分钟'),metric('当前阵型',stances.find(x=>x[0]===data.me?.stance)?.[1].split(' · ')[0]||'巡逻',data.me?.protected_until>data.server_time?'保护剩余 '+duration(data.me?.protected_until-data.server_time):'已准备自动防守'));overview.append(stats);if(tab!=='scout')body.append(overview)
  if(tab==='warehouse')warehouse();else if(tab==='scout')scout();else activity();clock.tick();if(busy)for(const n of body.querySelectorAll('button,input,select'))n.disabled=true;body.scrollTop=scroll
 }
 function entry(){
  const joined=!!data.me?.enabled,box=el('section','fc-entry');box.append(el('h3','',joined?'放入少量物资即可开始':'先选择愿意参与对抗的物资'),el('p','farm-small','只有主动划入的物资会承担损失。普通仓库和钱包余额不会被抢走。新行动基础费1D＋押金，可不买道具；取回物资、处理完行动即可退出。'))
  if(!inventory.active){const enroll=button('免费开通行情仓库',async()=>{if(busy)return;busy=true;enroll.disabled=true;try{const r=await request('/api/farm/market',{id:crypto.randomUUID(),kind:'enroll'});if(!r.ok)throw Error(r.data.error||'开通失败');await onChanged?.();await load()}catch(e){note.textContent=e.message}finally{busy=false;draw()}});box.append(el('p','farm-small','历史收成按原数量迁入，获得7天新鲜保护期；随后可选择入仓物资。'),enroll);body.append(box);return}
  const lots=inventory.lots.filter(l=>l.quantity>l.locked_quantity&&l.expires_at>data.server_time&&l.cooldown_until<=data.server_time).sort((a,b)=>a.price_cents-b.price_cents||b.quantity-a.quantity)
  if(!lots.length){box.append(el('p','farm-small','没有可划入的新鲜物资。可先收获、去集市购买，或等待购入批次冷却结束。'));if(!joined)box.append(action('先加入，稍后再入仓',{kind:'join'},!data.enabled));body.append(box);return}
  const choose=select(lots.map(l=>[l.id,name(l.item)+' · 可用 '+(l.quantity-l.locked_quantity)+'份']),lots[0].id,'入仓物资'),controls=el('div','fc-entry-controls'),review=el('p','farm-small');let n=1
  const put=action(joined?'划入并开始侦察':'同意参与 · 加入并划入',()=>({kind:joined?'pledge':'join_pledge',lot:choose.value,quantity:n}),!data.enabled)
  const update=()=>{const l=lots.find(x=>x.id===choose.value);review.textContent=n?'本次仅划入 '+n+' 份'+name(l.item)+'，估值 '+(n*l.price_cents/100).toFixed(2)+' D币。':'请输入有效数量';put.disabled=busy||!data.enabled||!n}
  const quantity=()=>{const l=lots.find(x=>x.id===choose.value),max=Math.min(10000,l.quantity-l.locked_quantity);n=Math.min(5,max);controls.replaceChildren(quantityStepper(n,{label:'入仓数量',max,onChange:v=>{n=v;update()}}),put);update()};choose.onchange=quantity;choose.disabled=busy;quantity();box.append(choose,controls,review);body.append(box)
 }
 function warehouse(){
  let stance=data.me?.stance;const save=action('保存默认策略',()=>({kind:'stance',stance}));body.append(el('h3','','守护部署'),strategies(stances,stance,{patrol:'巡视来路 · 克制潜入',barrier:'稳固入口 · 克制强攻',decoy:'识破伪装 · 克制诱敌'},v=>{stance=v}),save,el('p','farm-small','默认策略在行动发起时生效。收到预警后还可调整本场策略、投入道具或封仓减半损失。'))
  const choices=new Map([...inventory.lots,...data.stakes].map(l=>[l.id,l]))
  for(const l of choices.values()){
   const stake=data.stakes.find(s=>s.id===l.id),pledged=stake?.pledged??0,free=l.quantity-l.locked_quantity,card=el('article','farm-market-lot'),desc=el('div'),controls=el('div','farm-conflict-controls');let n=1
   desc.append(el('h3','',name(l.item)),el('p','farm-small',`对抗仓 ${pledged} · 未划入 ${free} · ${l.expires_at<=data.server_time?'已过期':duration(l.expires_at-data.server_time)+'后过期'}`))
   const take=action('取回',()=>({kind:'withdraw',lot:l.id,quantity:n}),!pledged),put=action('划入',()=>({kind:'pledge',lot:l.id,quantity:n}),!data.enabled||!free||l.expires_at<=data.server_time||l.cooldown_until>data.server_time)
   const update=()=>{take.disabled=busy||!n||n>pledged;put.disabled=busy||!data.enabled||!n||n>free||l.expires_at<=data.server_time||l.cooldown_until>data.server_time}
   controls.append(quantityStepper(1,{label:'划入或取回数量',max:Math.max(1,free,pledged),onChange:v=>{n=v;update()}}),put,take);update();card.classList.add('fc-stock-row');card.append(goodsArt(data.catalog.find(c=>c.key===l.item)),desc,controls);body.append(card)
  }
  if(!choices.size)body.append(el('p','farm-empty','收获新批次后可在此划入。'))
  body.append(el('p','farm-small','行动准备或战利品托管期间，货仓保持冻结。保质期继续流逝，不因划入、取回或追索重置。'),action('退出对抗玩法',{kind:'leave'},data.stakes.length>0))
 }
 function scout(){
  const rules=el('details','fc-rules');rules.append(el('summary','','投入与保护规则'),el('p','farm-small','每日最多3次，同一目标间隔2小时。通常最多取货仓10%；小货仓在每日20%预算内可取1份，单次不超过50D。守方每天最多承受2次；胜后保护2小时。突袭立即判定、15分钟追索；原准备战规则保留，不重置物产保质期。'));body.append(rules)
  if(!inventory.active){entry();return}
  if(!data.targets.length)body.append(el('p','farm-empty','暂时没有开放货仓的农友。可以先部署守护，等待农友主动加入。'),button('管理我的货仓',()=>{tab='warehouse';draw()}))
  const options=data.targets.map(t=>[String(t.user_id),(t.name||t.username)+(t.protected_until>data.server_time?' · 保护中':' · 查看物资')]);if(data.scout&&!options.some(o=>o[0]===target))options.unshift([target,data.scout.username]);const s=select([['','选择已加入的农友'],...options],target,'侦察目标');s.disabled=busy;s.onchange=()=>{target=s.value;void load()};body.append(s);if(data.next)body.append(button('更多农友',()=>void load(data.next)))
  const targets=el('div','fc-targets');for(const t of data.targets){const b=button(t.name||t.username,()=>{target=String(t.user_id);void load()});b.setAttribute('aria-pressed',String(target===String(t.user_id)));b.append(el('small','',t.protected_until>data.server_time?'保护中':'侦察并突袭'));b.disabled=busy;targets.append(b)}body.append(targets);const p=data.scout;if(!p)return
  body.append(el('p','farm-small','对方默认防守：'+stances.find(s=>s[0]===p.stance)?.[1]+(p.guardian?' · 守护兽在岗':'')))
  if(p.protected_until>data.server_time)body.append(el('p','farm-small','战后保护还剩 '+duration(p.protected_until-data.server_time)))
  if(!p.lots.length){body.append(el('p','farm-empty','没有可攻击的新鲜物资。'));return}
  if(draft.target!==target)draft={target,lot:(p.lots.find(l=>l.max_quantity>0)||p.lots[0]).id,tools:0,tactic:'sneak'};if(!p.lots.some(l=>l.id===draft.lot))draft.lot=p.lots[0].id
  const lot=select(p.lots.map(l=>[l.id,`${name(l.item)} · ${l.quantity}份`]),draft.lot,'目标批次'),plan=el('div','fc-plan'),controls=el('div'),cost=el('aside','fc-cost'),estimate=el('div'),preview=el('div','fc-loot-preview'),reason=el('p','fc-block-reason');let {tools,tactic}=draft
  lot.disabled=busy;const launch=action('立即突袭',()=>({kind:'raid',target:p.user_id,lot:lot.value,tools,tactic})),ownValue=data.stakes.reduce((n,l)=>n+(l.expires_at>data.server_time?l.pledged*l.price_cents:0),0)
  const update=()=>{
   const l=p.lots.find(x=>x.id===lot.value),value=p.lots.reduce((n,l)=>n+l.quantity*l.price_cents,0),n=l.max_quantity??conflictLoot(l.quantity,l.price_cents,value,p.remaining_cents??R.maxLootCents),cents=n*l.price_cents,bond=n?Math.max(1,Math.ceil(cents/500)):0,total=R.fee+R.toolCost*(tools??0)+bond
   const chances=[conflictChance({attack_tools:tools??0,defense_tools:0,tactic,stance:p.stance,guardian:p.guardian??0})],min=Math.min(...chances),max=Math.max(...chances)
   estimate.replaceChildren(el('span','fc-cost-label','预计胜率'),el('strong','fc-chance-value',`${Math.round(max*100)}%`));const meter=el('div','fc-chance'),bar=el('i');bar.style.left='0';bar.style.width=max*100+'%';meter.append(bar);estimate.append(meter,el('p','','默认阵型与守护兽立即应战；投入道具可以提高成功率。胜率以提交时的守护状态为准。'))
   preview.replaceChildren(goodsArt(data.catalog.find(c=>c.key===l.item)));const copy=el('div');copy.append(el('strong','',`最多 ${n} 份${name(l.item)}`),el('small','',`估值 ${(cents/100).toFixed(2)} · 估值不超过每日损失额度`));preview.append(copy)
   const dl=el('dl');for(const [label,amount]of [['行动费',R.fee],['消耗道具',R.toolCost*(tools??0)],['冻结押金',bond],['本次合计',total]]){const row=el('div'),dd=el('dd');dd.innerHTML=coin(amount);row.append(el('dt','',label),dd);dl.append(row)}estimate.append(dl)
   reason.textContent=p.blocked||(!data.enabled?'新行动暂未开放':!n?'今日可掠额度不足一份商品':data.balance<total?'可用D币不足以支付本次投入':'');reason.hidden=!reason.textContent;launch.disabled=busy||tools===null||!!reason.textContent
  }
  lot.onchange=()=>{draft.lot=lot.value;update()};controls.append(el('h3','','选择战术'),lot,preview,strategies(tactics,tactic,{sneak:'轻装潜入 · 巡逻可反制',rush:'集中突破 · 路障可反制',lure:'诱敌离位 · 诱饵可反制'},v=>{draft.tactic=tactic=v;update()}),quantityStepper(tools??0,{label:'进攻道具档位',min:0,max:5,onChange:v=>{draft.tools=tools=v;update()}}));cost.append(estimate,reason,launch,button('补充我的货仓',()=>{tab='warehouse';draw()}),el('p','','无需先加入或划入物资。基础1D＋押金，零档道具也可突袭；立即出结果，成功退押金，15分钟后领取。失败押金补给守方。'));plan.append(controls,cost);body.append(plan);update()
 }
 function activity(){
  const active=b=>['preparing','escrow','uprising','claimable'].includes(b.status),filters=el('div','fm-kind-tabs fc-activity-filter');for(const [id,label]of [['active','进行中'],['all','最近战报']]){const b=button(label+' '+data.battles.filter(x=>id==='all'||active(x)).length,()=>{activityFilter=id;draw()});b.setAttribute('aria-pressed',String(activityFilter===id));filters.append(b)}body.append(filters)
  const battles=data.battles.filter(b=>activityFilter==='all'||active(b));if(!battles.length)body.append(el('p','farm-empty',activityFilter==='active'?'当前没有待处理行动，可在“最近战报”查看结算。':'暂无攻防记录。收到行动预警后，可在这里部署防守。'))
  for(const b of battles){const card=el('article','farm-conflict-battle'),defender=b.defender_id===userId,rules=b.rules||R
   card.dataset.state=b.status;const heading=el('div','fc-battle-heading');heading.append(el('h3','',`${b.attacker_name} → ${b.defender_name}`),el('strong','',states[b.status]||b.status));card.append(heading,el('p','farm-small',`${name(b.item)} · 最多 ${b.quantity}份 · 押金 ${b.bond}D`));const line=el('ol','fc-timeline'),step=b.status==='preparing'?0:['escrow','uprising','claimable'].includes(b.status)?1:2;for(const [i,text]of [b.starts_at===b.resolves_at?'突袭发起':'准备与预警','攻防结算','追索与收尾'].entries()){const li=el('li','',text);li.dataset.done=String(i<=step);line.append(li)}card.append(line)
   if(b.status==='preparing'){
    const countdown=el('p','fc-countdown');card.append(countdown);live.push(()=>{const left=Math.max(0,b.resolves_at-clock.now());countdown.textContent=left?'准备期还剩 '+Math.floor(left/60)+'分'+String(left%60).padStart(2,'0')+'秒':'准备期已结束，等待结算。可刷新查看结果。'})
    if(defender){let tools=b.defense_tools;const stance=select(stances,b.stance,'本场防守策略'),sealed=el('input');sealed.type='checkbox';sealed.checked=!!b.sealed;sealed.disabled=!!b.sealed;const label=el('label');label.append(sealed,document.createTextNode('封仓：可掠数量减半，确认后本场不能取消'))
     const save=action('确认防守',()=>({kind:'defend',battle:b.id,tools,stance:stance.value,sealed:sealed.checked})),fee=el('p','farm-small'),update=()=>{fee.textContent=tools===null?'请输入有效的道具档位':`新增道具花费 ${(tools-b.defense_tools)*rules.toolCost}D`;save.disabled=busy||tools===null||clock.now()>=b.resolves_at},row=el('div','farm-conflict-controls');row.append(stance,quantityStepper(tools,{label:'防守道具档位',min:b.defense_tools,max:5,onChange:v=>{tools=v;update()}}));live.push(update);card.append(row,label,fee,save)
    }
   }else if(b.chance!==null)card.append(el('p','farm-small',`本场进攻成功率 ${(b.chance*100).toFixed(1)}%`))
   if(['escrow','uprising','claimable'].includes(b.status))card.append(el('p','farm-small','追索截止：'+new Date(b.release_at*1000).toLocaleString('zh-CN')))
   const up=data.uprisings.find(u=>u.battle_id===b.id)
   if(defender&&b.status==='escrow'&&!up)card.append(action(`投入${rules.uprisingCost}D发起追索`,{kind:'uprising',battle:b.id},data.server_time+rules.uprisingSeconds>b.release_at))
   if(!defender&&['escrow','claimable'].includes(b.status)&&data.server_time>=b.release_at)card.append(action('领取战利品',{kind:'claim',battle:b.id}))
   if(up)card.append(el('p','farm-small',`起义 ${up.members}/4人 · ${up.status==='forming'?duration(up.closes_at-data.server_time)+'后结算':{won:'追索成功',lost:'追索失败',insufficient:'人数不足，补给已消耗'}[up.status]}`))
   const audit=el('details'),summary=el('summary','','结算校验');audit.append(summary,el('p','farm-small','承诺值：'+b.commitment));if(b.roll_nonce)audit.append(el('p','farm-small',`结算随机值 ${(b.roll/10000).toFixed(2)}%`),el('p','farm-small',`校验输入：${b.id}:${b.roll}:${b.roll_nonce}`));card.append(audit);body.append(card)
  }
  if(data.allies.length)body.append(el('h3','','共同追索'))
  for(const a of data.allies){const row=el('article','farm-conflict-battle');row.append(el('p','',`${a.defender_name} 正在追索 ${a.attacker_name} 的战利品`),action(`投入${(a.rules||R).uprisingCost}D加入追索`,{kind:'uprising',battle:a.id}));body.append(row)}
  body.append(el('p','farm-small','突袭允许原主人1D发起单人追索，2分钟结算；准备战仍10分钟；1/2/3/4人机会35%/45%/55%/65%。其他同一攻击方近期受损者可加入，只追回本次托管物资。旧行动保持原30分钟、至少2人及2D规则。'))
 }
 return {open(){if(disposed)return;if(!dialog.open)dialog.showModal();clock.start();void load()},destroy(){disposed=true;clock.destroy();live=[];generation++;dialog.remove()}}
}
