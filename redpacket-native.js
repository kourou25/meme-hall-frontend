import {fishAccountPanel,creditAccountPanel,packetSections,fundingState} from '/packet-funding.js?v=c8639d55'
import {packetRecords,packetAmount} from '/packet-records.js?v=c8639d55'
import {packetPreferences} from '/packet-preferences.js?v=c8639d55'
// 按需加载；无轮询、常驻监听或浏览器端凭据存储。
const labels={fixed:'普通红包',random:'拼手气',guess:'欢欢猜词',clues:'逐步线索'}
const states={reserved:'奖励已锁定，等待发放',sent:'正在发放，请稍后核对',accepted:'平台已受理，到账以 Credit 为准',unknown:'结果待核对，不会重复发放',rejected:'发放失败，名额保留待发包者核对'}
export function nativeCreateForm({h,api,group,userId,host,signal,uploadCover,onSent,onBack,onBusy,accountOnly=false,autoGuess=null,initialMode=null,compact=false,timedDraw=false,paymentProvider='fish',fundingControl=null}){
 let coin=paymentProvider==='coin52',unit=coin?'D币':'LDC'
 const doc=host.ownerDocument,field=(name,node,help)=>h('label',{class:'rpk-field'},h('span',null,name),node,help&&h('small',null,help)),input=(name,extra={})=>h('input',{class:'rpk-input','aria-label':name,...extra}),button=(name,fn)=>h('button',{type:'button',class:'rpk-secondary',onclick:fn},name)
 const info=h('p',{class:'rpk-status',role:'status'})
 let account=null,busy=false,cover=null,nonce=crypto.randomUUID(),autoDraft=null,reward='ldc',queueChoice='now',queueState=null,queueNonce=crypto.randomUUID()
 const funding=fishAccountPanel({h,api,signal,onBusy:v=>lock(v),onChange:a=>{account=a}}),binding=funding.element,bindingInfo=funding.status
 const mode=h('select',{class:'rpk-input','aria-label':'站内LDC玩法'},Object.entries(labels).filter(([v])=>v!=='clues').map(([v,label])=>h('option',{value:v},label)))
 const rewardButtons=['ldc','none'].map((value,i)=>button([unit+' 奖励','无奖励'][i],()=>{reward=value;info.textContent='';modeChange()}))
 const rewardField=h('div',{class:'rpk-field'},h('span',null,'奖励方式'),h('div',{class:'rpk-platforms',role:'group','aria-label':'猜词奖励方式'},...rewardButtons))
 const isFree=()=>mode.value==='guess'&&reward==='none'
 const responseMode=h('select',{class:'rpk-input','aria-label':'猜词回答模式'},h('option',{value:'similarity'},'相关度 · 公布字数与百分比'),h('option',{value:'yesno'},'是非问答 · 只回答是 / 不是'))
 const responseField=field('猜词模式',responseMode,'相关度是提示分数；答案完全匹配才能中奖。')
 let hintSourceValue='preset',presetTriggerValue='cooldown',hintScheduleValue='fixed'
 const autoHint=h('input',{type:'checkbox','aria-label':'按作答次数自动给线索'}),hintEvery=input('每多少次作答给线索',{type:'number',min:1,max:1000,value:20,disabled:true})
 const autoHintState=h('strong',{class:'rpk-setting-value'},'关闭')
 const hintSourceButtons=['preset','ai'].map((value,i)=>button(['仅用预设线索','AI 生成线索'][i],()=>{hintSourceValue=value;syncHintControls()}))
 const triggerButtons=['cooldown','guesses'].map((value,i)=>button(['按索要冷却','按作答次数'][i],()=>{presetTriggerValue=value;syncHintControls()}))
 const hintSourceField=h('div',{class:'rpk-field'},h('span',null,'阶段线索来源'),h('div',{class:'rpk-platforms',role:'group','aria-label':'阶段线索来源'},...hintSourceButtons))
 const presetTriggerField=h('div',{class:'rpk-field'},h('span',null,'预设线索触发方式'),h('div',{class:'rpk-platforms',role:'group','aria-label':'预设线索触发方式'},...triggerButtons))
 const hintCooldown=input('预设线索冷却秒数',{type:'number',min:1,max:86400,value:30})
 const cooldownField=field('冷却时间 · 秒',hintCooldown,'首次索要立即揭示第一条；之后冷却结束，再点“要线索”揭示下一条。不会自动调用 AI。')
 const autoHintToggle=h('label',{class:'rpk-setting-toggle'},autoHint,h('span',null,'启用 AI 阶段线索'),autoHintState)
 const scheduleButtons=['fixed','increasing'].map((value,i)=>button(['固定间隔','等差递增'][i],()=>{hintScheduleValue=value;syncHintControls()}))
 const scheduleField=h('div',{class:'rpk-field'},h('span',null,'阶段间隔'),h('div',{class:'rpk-platforms',role:'group','aria-label':'阶段间隔'},...scheduleButtons))
 const hintIncrement=input('每阶段增加猜测次数',{type:'number',min:1,max:1000,value:10})
 const incrementField=field('每阶段增加 · 次',hintIncrement)
 const everyField=field('每 N 次作答',hintEvery)
 const thresholdPreview=h('small',{class:'rpk-help','aria-live':'polite'})
 const hintHelp=h('small')
 const autoHintField=h('div',{class:'rpk-field'},hintSourceField,presetTriggerField,autoHintToggle,scheduleField,everyField,incrementField,thresholdPreview,cooldownField,hintHelp)
 autoHint.addEventListener('change',syncHintControls)
 hintEvery.addEventListener('input',syncHintControls);hintIncrement.addEventListener('input',syncHintControls)
 function syncHintControls(){
  const game=mode.value==='guess',automatic=answerSource.value==='auto',preset=!automatic&&hintSourceValue==='preset',counts=preset?presetTriggerValue==='guesses':autoHint.checked
  hintSourceField.hidden=!game||automatic;presetTriggerField.hidden=!game||!preset;autoHintToggle.hidden=!game||preset
  everyField.hidden=!game||!counts;cooldownField.hidden=!game||!preset||counts
  const increasing=hintScheduleValue==='increasing'
  scheduleField.hidden=thresholdPreview.hidden=!game||!counts;incrementField.hidden=!game||!counts||!increasing
  hintIncrement.disabled=busy||incrementField.hidden;hintIncrement.required=!incrementField.hidden
  everyField.firstChild.textContent=increasing?'首次间隔 · 次作答':'每 N 次作答'
  scheduleButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(hintScheduleValue===['fixed','increasing'][i])))
  const first=Number(hintEvery.value),step=increasing?Number(hintIncrement.value):0
  thresholdPreview.textContent=Number.isInteger(first)&&first>0&&first<=1000&&Number.isInteger(step)&&step>=0&&step<=1000?`累计第 ${first}、${first*2+step}、${first*3+step*3} 次作答依次给线索。猜答案和是非提问均计入，提前索要不能跳过阶段。`:'请填写1–1000的整数间隔。'
  hintEvery.disabled=busy||!game||!counts;hintEvery.required=game&&counts
  hintCooldown.disabled=busy||!game||!preset||counts;hintCooldown.required=game&&preset&&!counts
  hintField.hidden=!game||!preset;hints.placeholder='每行一条，最多6条；按所选规则依次公开。可留空，由发起者手动追加。'
  autoHintState.textContent=autoHint.checked?'开启':'关闭'
  hintSourceButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(hintSourceValue===['preset','ai'][i])))
  triggerButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(presetTriggerValue===['cooldown','guesses'][i])))
  hintHelp.textContent=preset?'仅揭示你填写的预设线索，用完即止，不使用 AI 生成；发起者仍可随时手动追加。':'AI 线索受全站额度和服务状态限制；关闭后不提供 AI 阶段线索，发起者仍可手动追加。'
 }
 const answerSource=h('select',{class:'rpk-input','aria-label':'出词方式'},h('option',{value:'manual'},'我来出词'),h('option',{value:'auto'},'欢欢自动出词'))
 const sourceField=field('出词方式',answerSource,'自动题目中等偏难，同群历史答案去重。阶段线索默认关闭，开启后按设置的猜测次数逐条解锁。')
 const wordLength=h('select',{class:'rpk-input','aria-label':'AI答案字数'},h('option',{value:''},'不限 · 2–8字'),...[2,3,4,5,6,7,8].map(n=>h('option',{value:String(n)},`${n} 字`)))
 const lengthField=field('AI 答案字数',wordLength,'AI 线索前两条各2字，之后逐步增加，最多5字。')
 const participate=h('input',{type:'checkbox','aria-label':'本人参与本轮猜词'})
 const participateState=h('strong',{class:'rpk-setting-value'},'不参与')
 const participateField=h('div',{class:'rpk-field'},h('label',{class:'rpk-setting-toggle'},participate,h('span',null,'本人参与本轮猜词'),participateState),h('small',null,'参与：不显示答案；不参与：可私下查看答案并补充线索。开局后不能更改。'))
 const judgeContext=h('textarea',{class:'rpk-input','aria-label':'仅AI可见的出题说明',rows:3,maxlength:1000,placeholder:'可补充具体含义、背景和判定边界。例如：水星指太阳系行星，不是神话人物。'})
 const contextField=field('出题说明 · 仅 AI 可见',judgeContext,'选填，最多1000字。仅辅助相关度和是非判断，不作为公开线索，开局后不可修改。')
 const amount=input('本站LDC总额',{inputmode:'decimal',placeholder:coin?'1–20000 整数':'0.01–2000',required:true}),count=input('本站LDC份数',{type:'number',min:1,max:100,value:1}),minutes=input('本站LDC有效分钟',{type:'number',min:1,max:1440,value:1440})
 const answers=h('textarea',{class:'rpk-input','aria-label':'猜词答案及同义答案',rows:2,maxlength:400,placeholder:'每行一个，最多6个；中奖前不公开'}),hints=h('textarea',{class:'rpk-input','aria-label':'猜词线索',rows:2,maxlength:1000,placeholder:'可不填，每行一条；@欢欢 索要时揭示一条，冷却30秒'})
 const wish=input('本站LDC祝福语',{maxlength:120,placeholder:'写一句祝福或游戏介绍'}),answerField=field('答案 / 同义答案',answers),hintField=field('提示',hints),countField=field('份数',count)
 const exclusiveOn=h('input',{type:'checkbox','aria-label':'专属红包'}),recipient=h('select',{class:'rpk-input','aria-label':'指定领取成员'},h('option',{value:''},'请选择群成员'))
 const memberSearch=input('搜索领取成员',{type:'search',placeholder:'搜索昵称或账号'}),recipientStatus=h('small',{role:'status'})
 let members=null,membersLoading=false
 const exclusiveActive=()=>exclusiveOn.checked&&!timedDraw&&['fixed','random'].includes(mode.value)
 const recipientFields=h('div',null,field('指定领取成员',recipient),memberSearch,recipientStatus)
 const exclusiveField=h('div',{class:'rpk-field'},h('label',{class:'rpk-setting-toggle'},exclusiveOn,h('span',null,'专属红包 · 仅指定成员领取')),recipientFields)
 function renderMembers(){const selected=recipient.value,q=memberSearch.value.trim().toLocaleLowerCase();recipient.replaceChildren(h('option',{value:''},membersLoading?'正在读取群成员…':'请选择群成员'),...(members||[]).filter(m=>String(m.id)!==String(userId)&&(String(m.id)===selected||[m.name,m.username].some(v=>String(v||'').toLocaleLowerCase().includes(q)))).map(m=>h('option',{value:String(m.id)},`${m.name||m.username} (@${m.username})`)));recipient.value=selected;recipientStatus.textContent=membersLoading?'正在读取群成员…':members?.length?'其他成员仍可查看红包，只有指定成员可领取；奖励全部发给这一人。':'暂未找到其他可选群成员。'}
 async function loadRecipients(){if(members||membersLoading||signal.aborted)return;membersLoading=true;syncExclusive();try{const data=await api(`/chat/groups/${group.id}/members`);if(signal.aborted)return;members=(data.members||[]).filter(m=>String(m.id)!==String(userId));membersLoading=false;renderMembers()}catch(e){if(!signal.aborted)recipientStatus.textContent=e.message}finally{membersLoading=false;if(!signal.aborted)syncExclusive()}}
 function syncExclusive(){const available=!timedDraw&&['fixed','random'].includes(mode.value),active=exclusiveActive();exclusiveField.hidden=!available;recipientFields.hidden=!active;exclusiveOn.disabled=busy;recipient.required=active;recipient.disabled=busy||!active||membersLoading;memberSearch.disabled=busy||!active||membersLoading;countField.hidden=mode.value==='guess'||active;count.disabled=busy||active;count.required=!active&&mode.value!=='guess'}
 exclusiveOn.addEventListener('change',()=>{syncExclusive();if(exclusiveActive())loadRecipients()});memberSearch.addEventListener('input',renderMembers)
 const multiOn=h('input',{type:'checkbox','aria-label':'多人中奖'}),winnerCount=input('猜词中奖人数',{type:'number',min:2,max:10,value:3}),hiddenWinners=input('隐藏前几位中奖答案',{type:'number',min:0,max:9,value:2})
 const multiPreview=h('small',{class:'rpk-help','aria-live':'polite'}),multiInputs=h('div',null,h('div',{class:'rpk-inline-fields'},field('中奖人数',winnerCount),field('隐藏前几位答案',hiddenWinners)),multiPreview)
 const multiField=h('div',{class:'rpk-field'},h('label',{class:'rpk-setting-toggle'},multiOn,h('span',null,'多人中奖')),multiInputs)
 function syncMulti(){
  const enabled=mode.value==='guess'&&!isFree()&&multiOn.checked,n=Number(winnerCount.value)
  multiField.hidden=mode.value!=='guess'||isFree();multiInputs.hidden=!enabled;winnerCount.required=hiddenWinners.required=enabled
  winnerCount.disabled=hiddenWinners.disabled=busy||!enabled;multiOn.disabled=busy||isFree()
  hiddenWinners.max=String(n-1)
  if(Number(hiddenWinners.value)>=n)hiddenWinners.value=String(n-1)
  const ratios=n===2?'70% / 30%':n===3?'60% / 25% / 15%':n===4?'50% / 25% / 15% / 10%':'首位40%，其余60%按名次递减分配'
  multiPreview.textContent=`${ratios}；按最小货币单位取整，尾差归首位。第 ${Number(hiddenWinners.value)+1} 人猜中后公布答案，每人一份；首次中奖后冻结追加奖励，剩余名额继续开放。`
 }
 multiOn.addEventListener('change',syncMulti);winnerCount.addEventListener('input',syncMulti);hiddenWinners.addEventListener('input',syncMulti)
 const escalationOn=h('input',{type:'checkbox','aria-label':'启用累计追加奖励'})
 const escalationEvery=input('追加奖励调用间隔',{type:'number',min:1,max:300,value:100}),escalationAmount=input('每次追加LDC',{inputmode:'decimal',value:'10.00'}),escalationCap=input('累计追加上限LDC',{inputmode:'decimal',value:'30.00'})
 const escalationEveryField=field('每 N 次 AI 调用',escalationEvery),forcedInterval=h('p',{class:'rpk-help',hidden:true},'固定每 100 次 AI 调用追加；下方金额与累计上限可修改。')
 const escalationAmountField=field('单次追加 · '+unit,escalationAmount),escalationCapField=field('累计追加上限 · '+unit,escalationCap)
 const escalationInputs=h('div',null,forcedInterval,escalationEveryField,escalationAmountField,escalationCapField),escalationHelp=h('small',{class:'rpk-help'}),authorRuleInfo=h('p',{class:'rpk-help',role:'status',hidden:true})
 const escalationToggle=h('label',{class:'rpk-setting-toggle'},escalationOn,h('span',null,'未猜中时累计追加奖励'))
 const escalationField=h('div',{class:'rpk-field'},authorRuleInfo,escalationToggle,escalationInputs,escalationHelp)
 let wasForced=false
 function syncEscalation(){
  const game=mode.value==='guess',forced=game&&!!queueState?.author_policy?.restricted,enabled=game&&!isFree()&&(escalationOn.checked||forced)
  if(forced&&!wasForced){escalationOn.checked=true;escalationEvery.value=100;if(Number(escalationAmount.value)<10)escalationAmount.value='10.00';if(Number(escalationCap.value)<Number(escalationAmount.value))escalationCap.value=escalationAmount.value}
  wasForced=forced
  escalationToggle.hidden=forced;escalationEveryField.hidden=forced;forcedInterval.hidden=!forced
  escalationField.hidden=!game||isFree();escalationInputs.hidden=!enabled;escalationOn.disabled=busy||forced||isFree();escalationEvery.disabled=busy||!enabled||forced;escalationAmount.disabled=escalationCap.disabled=busy||!enabled
  escalationAmount.required=escalationCap.required=enabled;escalationEvery.required=enabled
  const initial=Number(amount.value),cap=Number(escalationCap.value),step=Number(escalationAmount.value),limit=coin?20000:2000
  escalationAmount.setCustomValidity(enabled&&(!Number.isFinite(step)||step<(forced?10:coin?1:0.01)||step>limit||(coin&&!Number.isInteger(step)))?`单次追加需为${forced?10:coin?1:0.01}–${limit} ${unit}${coin?'整数':''}`:'')
  escalationCap.setCustomValidity(enabled&&(!Number.isFinite(cap)||cap<step||initial+cap>limit||(coin&&!Number.isInteger(cap)))?`累计上限不能低于单次追加，初始奖励加累计上限最多${limit} ${unit}`:'')
  escalationHelp.textContent=enabled?`按页面 AI 总调用次数触发，含线索和计入次数的失败请求。每 ${escalationEvery.value} 次仍未猜中，追加 ${escalationAmount.value} ${unit}；最多额外追加 ${escalationCap.value} ${unit}${Number.isFinite(initial+cap)?`，最高承诺 ${(initial+cap).toFixed(2)} ${unit}`:''}。${coin?'创建时预留初始奖励及追加上限，结算后退回未用部分。':'不预扣托管，中奖后按总额发放。'}`:'可配置追加间隔、单次金额和累计上限；关闭时奖励固定。'
  authorRuleInfo.hidden=!forced;authorRuleInfo.textContent=forced?`强制追加已启用：连续两轮达到100次调用未猜中，暂不能关闭或更改100次间隔。每次至少10 ${unit}；连续两轮在100次前猜中后解除，当前 ${queueState.author_policy.good_streak}/2。`:''
  rewardButtons[1].disabled=busy||forced
 }
 escalationOn.addEventListener('change',syncEscalation);for(const el of [escalationEvery,escalationAmount,escalationCap])el.addEventListener('input',syncEscalation)
 const drawTime=input('开奖时间',{type:'datetime-local',required:timedDraw,value:new Date(Date.now()+3600000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}),drawField=field('开奖时间',drawTime,'到点自动抽取；报名不扣参与者余额，结果分别通知。');drawField.hidden=!timedDraw
 const remind=h('input',{type:'checkbox','aria-label':'到期通知群成员'}),remindField=h('label',{class:'rpk-setting-toggle'},remind,h('span',null,'到期后通知群成员'));remindField.hidden=timedDraw
 const amountField=field('总额 · '+unit,amount),ledger=nativeLedger({h,api}),rules=h('p',{class:'rpk-help'})
 const coverPreview=h('div',{class:'rpk-cover-preview'}),file=input('本站LDC封面',{type:'file',class:'sr-only',accept:'image/png,image/jpeg,image/webp,image/gif'})
 const pick=button('选择封面',()=>file.click())
 const submit=h('button',{class:'rpk-primary',type:'submit'},'发到群里')
 mode.value='guess';answerSource.value='auto'
 let storage;try{storage=doc.defaultView.localStorage}catch{}
 const preferences=packetPreferences(storage,userId,group?.id)
 const preferencesInfo=h('small',{class:'rpk-help',role:'status'},'自动记住玩法、线索及追加奖励规则；初始奖励、答案、图片和密钥不保存。')
 const forgetPreferences=button('清除已记住设置',()=>{preferencesInfo.textContent=preferences.clear()?'已清除，下次使用默认配置；本次填写保持不变。':'浏览器暂时无法清除设置。'})
 function preferenceSnapshot(){return {multi_enabled:multiOn.checked,guess_winners:Number(winnerCount.value),hidden_winners:Number(hiddenWinners.value),mode:mode.value,reward,response_mode:responseMode.value,answer_source:answerSource.value,answer_length:Number(wordLength.value),minutes:Number(minutes.value),count:Number(count.value),owner_participates:participate.checked,hint_source:hintSourceValue,preset_hint_trigger:presetTriggerValue,auto_hint_enabled:autoHint.checked,hint_every:Number(hintEvery.value),hint_increment:Number(hintIncrement.value),hint_schedule:hintScheduleValue,hint_cooldown:Number(hintCooldown.value),escalation_enabled:escalationOn.checked,escalation_every:Number(escalationEvery.value),escalation_amount:escalationAmount.value.trim(),escalation_cap:escalationCap.value.trim()}}
 function rememberPreferences(){if(!accountOnly&&!preferences.save(preferenceSnapshot()))preferencesInfo.textContent='浏览器无法保存设置；本次仍可正常发包。'}
 function applyPreferences(p){
  if(!p)return
  multiOn.checked=!!p.multi_enabled;winnerCount.value=p.guess_winners||3;hiddenWinners.value=p.hidden_winners??2;
  mode.value=p.mode||'guess';reward=p.reward||'ldc';responseMode.value=p.response_mode||'similarity';answerSource.value=p.answer_source||'auto';wordLength.value=p.answer_length?String(p.answer_length):''
  minutes.value=p.minutes||1440;count.value=p.count||1;participate.checked=!!p.owner_participates;hintSourceValue=p.hint_source||'preset';presetTriggerValue=p.preset_hint_trigger||'cooldown';autoHint.checked=!!p.auto_hint_enabled;hintEvery.value=p.hint_every||20;hintIncrement.value=p.hint_increment||10;hintScheduleValue=p.hint_schedule||'fixed';hintCooldown.value=p.hint_cooldown||30
  escalationOn.checked=!!p.escalation_enabled;escalationEvery.value=p.escalation_every||100;escalationAmount.value=p.escalation_amount||'10.00';escalationCap.value=p.escalation_cap||'30.00'
  preferencesInfo.textContent='已沿用上次玩法与追加奖励配置。初始奖励和题目内容需重新填写。'
 }
 const categories=packetSections({h,label:'发包设置分类',sections:[
  {id:'question',label:'题目',primary:true,keywords:'猜词 模式 相关度 是非 AI 自动 手动 答案 字数 参与 说明',available:()=>mode.value==='guess',nodes:[responseField,sourceField,lengthField,participateField,answerField,contextField]},
  {id:'reward',label:'奖励',primary:true,keywords:'金额 LDC 总额 份数 多人 隐藏 有效期 截止 分钟 追加 加奖 调用 上限 限制',nodes:[h('div',{class:'rpk-inline-fields'},amountField,countField),exclusiveField,multiField,drawField,escalationField]},
  {id:'hint',label:'阶段线索',keywords:'提示 自动 每次 次数 间隔',available:()=>mode.value==='guess',nodes:[autoHintField,hintField]},
  {id:'cover',label:'祝福、封面与时限',keywords:'图片 裁剪 封面 祝福 介绍',nodes:[field('祝福 / 介绍',wish),timedDraw?null:field('有效期 · 分钟',minutes),remindField,file,pick,coverPreview]},
  {id:'account',label:'账户与发放记录',keywords:'绑定 应用 密钥 Client 领取 发放 记录 停用',available:()=>!fundingControl&&!coin&&!isFree(),nodes:[bindingInfo,binding,ledger]},
 ]})

 function creationBody(automatic,free){return {...(exclusiveActive()?{exclusive_user_id:Number(recipient.value)}:{}),...(mode.value==='guess'&&!free?{guess_winners:multiOn.checked?Number(winnerCount.value):1,hidden_winners:multiOn.checked?Number(hiddenWinners.value):0}:{}),payment_provider:paymentProvider,...(timedDraw?{draw_at:Math.floor(new Date(drawTime.value).getTime()/1000)}:remind.checked?{notify_at:Math.floor(Date.now()/1000)+Number(minutes.value)*60}:{}),escalation_every:mode.value==='guess'&&!free&&escalationOn.checked?Number(escalationEvery.value):0,...(mode.value==='guess'&&!free&&escalationOn.checked?{escalation_amount:escalationAmount.value.trim(),escalation_cap:escalationCap.value.trim()}:{}),provider:free?'free_guess':'ldc',nonce,mode:mode.value,response_mode:responseMode.value,auto_hint_every:mode.value==='guess'&&((automatic||hintSourceValue==='ai')?autoHint.checked:presetTriggerValue==='guesses')?Number(hintEvery.value):0,auto_hint_increment:mode.value==='guess'&&((automatic||hintSourceValue==='ai')?autoHint.checked:presetTriggerValue==='guesses')&&hintScheduleValue==='increasing'?Number(hintIncrement.value):0,...(mode.value==='guess'?{hint_source:automatic?'ai':hintSourceValue,preset_hint_trigger:presetTriggerValue,hint_cooldown_seconds:!automatic&&hintSourceValue==='preset'&&presetTriggerValue==='cooldown'?Number(hintCooldown.value):30}:{}),...(free?{}:{amount:amount.value.trim(),count:exclusiveActive()?1:Number(count.value)}),minutes:Number(minutes.value),...(automatic?{...(autoDraft?{auto_word:autoDraft.auto_word}:{}),owner_participates:free&&participate.checked}:{answers:answers.value,hints:hintSourceValue==='preset'?hints.value:'',...(mode.value==='guess'?{judge_context:judgeContext.value}:{})}),prompt:wish.value||(exclusiveActive()?`给 ${members?.find(m=>String(m.id)===recipient.value)?.name||'指定成员'} 的专属红包`:''),cover_key:cover?.key||null}}
 const queueButtons=[['now','立即发起'],['draft','保存草稿'],['queue','参与排队']].map(([value,label])=>button(label,()=>{queueChoice=value;info.textContent='';modeChange()}))
 const queueHelp=h('small'),queueField=h('div',{class:'rpk-field'},h('span',null,'发起方式'),h('div',{class:'rpk-platforms',role:'group','aria-label':'猜词发起方式'},...queueButtons),queueHelp)
 const queueList=h('details',{class:'rpk-options'},h('summary',null,'等候队列 / 我的草稿')),queueContent=h('div',{class:'rpk-queue-list'})
 queueList.append(queueContent,button('刷新队列',()=>loadQueue().catch(e=>{info.textContent=e.message})))
 function syncQueue(){
  queueField.hidden=queueList.hidden=mode.value!=='guess'
  queueButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(queueChoice===['now','draft','queue'][i]));b.disabled=busy||(i===0&&(queueState?.active||queueState?.queue?.length>0))})
  queueHelp.textContent=queueState?.active?'群内已有猜词进行中，可保存配置，或排队等待自动发出。':'排队按先后顺序自动开局；AI到开局时才出题，不预扣奖池。'
  if(mode.value==='guess'&&queueChoice!=='now')submit.textContent=queueChoice==='draft'?'保存私有草稿':queueChoice==='queue'?'确认加入等候队列':'请选择保存草稿或排队'
 }
 async function loadQueue(){
  queueState=await api(`/chat/groups/${group.id}/guess-queue`)
  if(signal.aborted)return
  if((queueState.active||queueState.queue?.length)&&queueChoice==='now')queueChoice='select'
  const cancel=id=>async()=>{if(busy)return;lock(true);try{await api(`/chat/groups/${group.id}/guess-queue/${id}`,{method:'DELETE'});await loadQueue()}catch(e){info.textContent=e.message}finally{lock(false)}}
  const rows=(queueState.queue||[]).map((r,i)=>h('div',{class:'rpk-queue-row'},h('span',null,`${i+1}. ${r.owner_name} · ${r.reward_type==='none'?'无奖励':(r.amount_cents/100).toFixed(r.payment_provider==='coin52'?0:2)+(r.payment_provider==='coin52'?' D币':' LDC')} · ${r.state==='starting'?'正在开局':'等候中'}`),r.mine&&r.state==='queued'?button('退出排队',cancel(r.id)):null))
  const mine=(queueState.mine||[]).map(r=>h('div',{class:'rpk-queue-row'},h('span',null,`${r.state==='failed'?'开局失败':'草稿'} · ${r.reward_type==='none'?'无奖励':(r.amount_cents/100).toFixed(r.payment_provider==='coin52'?0:2)+(r.payment_provider==='coin52'?' D币':' LDC')}${r.error?' · '+r.error:''}`),button('载入配置',async()=>{if(busy)return;lock(true);try{const d=await api(`/chat/groups/${group.id}/guess-queue/${r.id}`);restoreQueueConfig(d.config)}catch(e){info.textContent=e.message}finally{lock(false)}}),button('删除',cancel(r.id))))
  queueContent.replaceChildren(h('strong',null,'等候队列'),...(rows.length?rows:[h('p',{class:'rpk-help'},'暂无排队中的猜词')]),h('strong',null,'我的草稿与失败记录'),...(mine.length?mine:[h('p',{class:'rpk-help'},'暂无草稿')]))
  modeChange()
 }
 function restoreQueueConfig(b){
  if(b.provider!=='free_guess')fundingControl?.setProvider(b.payment_provider||'credit')
  mode.value='guess';reward=b.provider==='free_guess'?'none':'ldc';answerSource.value=b.answer_source||'manual';responseMode.value=b.response_mode||'similarity';wordLength.value=b.answer_length?String(b.answer_length):''
  multiOn.checked=Number(b.guess_winners)>1;winnerCount.value=b.guess_winners||3;hiddenWinners.value=b.hidden_winners??2;amount.value=b.amount||'';count.value=1;minutes.value=b.minutes||1440;answers.value=b.answers||'';hints.value=b.hints||'';wish.value=b.prompt||'';judgeContext.value=b.judge_context||'';participate.checked=!!b.owner_participates
  hintSourceValue=b.hint_source||'preset';presetTriggerValue=b.preset_hint_trigger||'cooldown';autoHint.checked=!!b.auto_hint_every;hintEvery.value=b.auto_hint_every||20;hintIncrement.value=b.auto_hint_increment||10;hintScheduleValue=b.auto_hint_increment?'increasing':'fixed';hintCooldown.value=b.hint_cooldown_seconds||30
  escalationOn.checked=!!b.escalation_every;escalationEvery.value=b.escalation_every||100;escalationAmount.value=b.escalation_amount||'10.00';escalationCap.value=b.escalation_cap||'30.00'
  cover=b.cover_key?{key:b.cover_key}:null;nonce=crypto.randomUUID();queueNonce=crypto.randomUUID();autoDraft=null;queueChoice=queueState?.active||queueState?.queue?.length?'select':'now';modeChange();categories.select('question');info.textContent='已载入配置，请核对后选择发起方式。'
 }
 const form=h('form',{id:'rpk-form-'+crypto.randomUUID(),class:'rpk-form rpk-create-categories',onsubmit:async e=>{
  e.preventDefault();if(busy||accountOnly)return
  const free=isFree()
  if(timedDraw&&!Number.isFinite(new Date(drawTime.value).getTime())){info.textContent='请选择开奖时间';return}
  if(!free&&(fundingControl?!fundingControl.requireReady():!coin&&!account?.enabled)){info.textContent='请先在渠道设置中完成账户绑定';if(!fundingControl){binding.open=true;categories.select('account')}return}
  lock(true)
  try{
   const automatic=mode.value==='guess'&&answerSource.value==='auto',draftKey=JSON.stringify([paymentProvider,free?'none':'ldc',free?'':amount.value.trim(),responseMode.value,wordLength.value])
   if(mode.value==='guess'&&queueChoice!=='now'){
    if(queueChoice==='select'){info.textContent='当前已有猜词，请选择保存草稿或参与排队。';return}
    const config={...creationBody(automatic,free),answer_source:automatic?'auto':'manual',...(wordLength.value?{answer_length:Number(wordLength.value)}:{})};delete config.auto_word;delete config.nonce
    const saved=await api(`/chat/groups/${group.id}/guess-queue`,{method:'POST',body:{action:queueChoice,nonce:queueNonce,config}})
    queueNonce=crypto.randomUUID();await loadQueue();info.textContent=saved.state==='draft'?'草稿已私密保存，可从下方载入。':'已加入等候队列；上一局结束后自动发出，通常在1分钟内。';return
   }
   if(automatic&&(!autoDraft||autoDraft.key!==draftKey||autoDraft.expires_at<=Date.now()/1000)){
    info.textContent=free?'欢欢正在出词，答案会保密…':'欢欢正在出词，尚未创建红包、未扣款…'
    autoDraft={...await api(`/chat/groups/${group.id}/ldc/auto-word`,{method:'POST',body:{nonce,...(escalationOn.checked?{escalation_every:Number(escalationEvery.value),escalation_amount:escalationAmount.value.trim(),escalation_cap:escalationCap.value.trim()}:{}),payment_provider:paymentProvider,reward_type:free?'none':'ldc',...(free?{}:{amount:amount.value.trim()}),response_mode:responseMode.value,...(wordLength.value?{answer_length:Number(wordLength.value)}:{})}}),key:draftKey}
   }
   if(signal.aborted)return
   info.textContent=mode.value==='guess'&&!automatic?'正在整理题意，完成后创建猜词…':free?'正在发起猜词…':'正在创建红包…'
   const d=await api(`/chat/groups/${group.id}/redpacks`,{method:'POST',body:creationBody(automatic,free)})
   onSent(d.message)
  }catch(e){if(/题目.*重复|自动题目已失效/.test(e.message))autoDraft=null;info.textContent=e.message}finally{lock(false)}
 }},
  h('div',{class:'rpk-create-basics'},compact&&initialMode==='guess'?null:field(compact?'分配方式':'玩法',mode),rewardField),categories.element,h('details',{class:'rpk-options'},h('summary',null,'复用设置'),preferencesInfo,forgetPreferences),
  h('details',{class:'rpk-options rpk-create-rules'},h('summary',null,'本次发起规则'),rules),
  queueField,h('div',{class:'rpk-create-footer'},info,submit),queueList,compact?null:button('返回',onBack))
 function lock(value){busy=value;submit.disabled=value;onBusy?.(value);for(const el of form.querySelectorAll('button,input,textarea,select'))el.disabled=value;syncHintControls();syncQueue();syncEscalation();syncMulti();syncExclusive()}
 function modeChange(){minutes.max=mode.value==='guess'?30:1440;if(mode.value==='guess'&&Number(minutes.value)>30)minutes.value=30;if(mode.value==='guess'&&queueState?.author_policy?.restricted)reward='ldc';const game=mode.value==='guess',automatic=game&&answerSource.value==='auto',free=isFree();responseField.hidden=sourceField.hidden=rewardField.hidden=autoHintField.hidden=!game;answerField.hidden=hintField.hidden=contextField.hidden=!game||automatic;lengthField.hidden=!automatic;participateField.hidden=!automatic||!free;countField.hidden=game;answers.required=game&&!automatic;hints.required=false;amount.required=!free;amountField.hidden=free;bindingInfo.hidden=binding.hidden=coin||free;ledger.hidden=free;rewardButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(reward===['ldc','none'][i])));submit.textContent=free?'发起无奖励猜词':automatic?`确认发起 · ${/^\d{1,5}(?:\.\d{1,2})?$/.test(amount.value.trim())?Number(amount.value).toFixed(2):'填写金额'} ${unit} 奖励`:'发到群里';rules.textContent=free?`无需绑定 LDC 应用，不扣积分。${automatic&&participate.checked?'AI 保密出词，你可以参与，但不能查看答案。':'你不参与本轮猜词，可私下查看答案并提供线索。'}首位答对计入猜词等级；每群同时一局。答案交给本站 AI 判题，结束后公布；发起人可在专区流局。`:coin?'创建时预留 D币奖池及追加上限，中奖后入账本站钱包，未用部分结算退回。300 次 AI 调用后自动流局。':paymentProvider==='credit'?'通过本人 Credit 应用发放；到账与手续费以 Credit 为准。整包不预扣，已有红包按原渠道结算。':'领取时从本人 Fish 余额转入收款人的 🐟额，1:1 LDC，无手续费；整包不预扣。收款人需先登录过 Fish。猜词每群同时一局，300 次 AI 调用后自动流局并公布答案。';participateState.textContent=participate.checked?'参与':'不参与';syncHintControls();syncQueue();syncEscalation();syncMulti();syncExclusive();categories.refresh()}

 form.addEventListener('invalid',e=>{for(let d=e.target.closest('details');d;d=d.parentElement.closest('details'))d.open=true},true)
 if(!accountOnly)applyPreferences(preferences.read())
 if(initialMode){mode.value=initialMode;if(compact){mode.options[0].textContent='均分';mode.options[1].textContent='拼手气'}for(const option of mode.options)option.hidden=compact&&option.value==='guess'&&initialMode!=='guess'}
 if(autoGuess){mode.value='guess';reward='ldc';answerSource.value='auto';responseMode.value='similarity';amount.value=autoGuess.amount||''}
 form.addEventListener('change',rememberPreferences)
 form.addEventListener('click',e=>{const target=e.target.closest?.('button');if(target&&target!==forgetPreferences&&[...rewardButtons,...hintSourceButtons,...triggerButtons,...scheduleButtons].includes(target))rememberPreferences()})
 mode.addEventListener('change',modeChange);answerSource.addEventListener('change',modeChange);participate.addEventListener('change',modeChange);amount.addEventListener('input',modeChange);modeChange()
 file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||busy)return;lock(true);try{const {cropPacketCover}=await import('/redpacket-cover.js?v=c8639d55');const cropped=await cropPacketCover(f,{host,form,doc,h,signal});if(!cropped||signal.aborted)return;cover=await uploadCover(cropped,signal);coverPreview.replaceChildren(h('img',{class:'rpk-cover',src:cover.url,alt:'红包封面'}),button('移除封面',()=>{cover=null;coverPreview.replaceChildren()}))}catch(e){info.textContent=e.message}finally{lock(false);file.value=''}})
 async function loadAccount(){return funding.load()}
 if(!fundingControl&&!coin)loadAccount().catch(e=>{bindingInfo.textContent=e.message})
 if(!accountOnly&&(initialMode==='guess'||!compact))loadQueue().catch(()=>{queueList.textContent='暂时无法读取等候队列，可稍后刷新。'})
 if(accountOnly){const credit=creditAccountPanel({h,api,signal,onBusy:v=>lock(v)});bindingInfo.hidden=binding.hidden=false;form.replaceChildren(bindingInfo,binding,credit.element,nativeLedger({h,api}),info,button('关闭',onBack));credit.load().catch(e=>{info.textContent=e.message})}
 form.setFunding=provider=>{paymentProvider=provider;coin=provider==='coin52';unit=coin?'D币':'LDC';amountField.firstChild.textContent='总额 · '+unit;amount.setAttribute('aria-label','红包总额');amount.placeholder=coin?'1–20000 整数':'0.01–2000';rewardButtons[0].textContent=unit+' 奖励';escalationAmountField.firstChild.textContent='单次追加 · '+unit;escalationCapField.firstChild.textContent='累计追加上限 · '+unit;modeChange()}
 form.footer=form.querySelector('.rpk-create-footer');submit.setAttribute('form',form.id)
 if(fundingControl)form.setFunding(fundingControl.provider())
 return form
}
export function nativePacketDetail({h,api,messageId,packet,host,onRefresh,onBusy,onPosted}){
 const p=packet.ldc,free=p.reward_type==='none',game=['guess','clues'].includes(p.mode),info=h('p',{class:'rpk-status',role:'status'}),field=(name,node)=>h('label',{class:'rpk-field'},h('span',null,name),node),btn=(text,fn)=>h('button',{type:'button',class:'rpk-secondary',onclick:fn},text)
 let busy=false
 const run=async(path,body)=>{if(busy)return;busy=true;onBusy?.(true);for(const el of box.querySelectorAll('button,input'))el.disabled=true;info.textContent='正在处理…';try{const r=await api(`/chat/messages/${messageId}/ldc/${path}`,{method:'POST',body});onRefresh({...packet,ldc:r.ldc})}catch(e){info.textContent=e.message}finally{busy=false;onBusy?.(false);for(const el of box.querySelectorAll('button,input'))el.disabled=false}}
 const answer=h('input',{class:'rpk-input','aria-label':'我的猜词答案',maxlength:80,autocomplete:'off',placeholder:'输入完整答案，最多40字'}),question=h('input',{class:'rpk-input','aria-label':'问欢欢一个是非问题',maxlength:160,placeholder:'例如：它是动物吗？',autocomplete:'off'})
 const send=async(prefix,value)=>{if(busy||!value.trim())return;busy=true;onBusy?.(true);try{await api(`/chat/messages/${messageId}/guess-room`,{method:'POST',body:{body:prefix+value.trim(),nonce:crypto.randomUUID()}});info.textContent='已发送到猜词专区，欢欢会在那里回答。';onPosted?.()}catch(e){info.textContent=e.message}finally{busy=false;onBusy?.(false)}}
 const guess=h('form',{class:'rpk-form',onsubmit:e=>{e.preventDefault();if(game){const normalized=answer.value.normalize('NFKC').replace(/[\s\p{P}\p{Z}]/gu,'');if(!normalized||[...normalized].length>40){info.textContent='请输入答案，最多40字';answer.focus();return}send('! ',answer.value)}else run('claim',{})}},game&&field('我的答案',answer),h('button',{class:'rpk-primary',type:'submit'},game?'发到专区猜答案':p.payment_provider==='coin52'?'领取 D币':'领取 LDC'))
 const ask=h('form',{class:'rpk-form',onsubmit:e=>{e.preventDefault();send('? ',question.value)}},field('问欢欢 · 是 / 不是',question),h('p',{class:'rpk-help'},'问题对群成员公开，回答显示在原消息下方。'),h('button',{class:'rpk-secondary',type:'submit'},'发到专区提问'))
 const box=h('div',{class:'rpk-form'},packet.cover&&h('img',{class:'rpk-cover',src:packet.cover,alt:'红包封面'}),h('div',{class:'rpk-reward-hero'},h('h3',null,p.exclusive?'专属红包':p.draw?'限时抽奖':labels[p.mode]),free?h('p',null,'无奖励猜词'):packetAmount(h,p.total,p.payment_provider,'rpk-hero-amount')),packet.prompt&&h('p',null,packet.prompt),h('p',{class:'rpk-help'},`已锁定 ${p.claimed_count} / ${p.count} 份 · ${p.state==='open'?'进行中':'已结束'} · 截止 ${new Date(p.ends_at*1000).toLocaleString('zh-CN')}`),
  p.exclusive&&h('p',{class:'rpk-help'},`指定领取：${p.exclusive.name} · 仅此成员可领取全部奖励`),
  game&&h('p',{class:'rpk-help'},'在猜词专区选择“猜答案”或“问是非”参与；线索按本轮阶段与冷却设置揭示。'),
  p.hints.length>0&&h('ul',{class:'rpk-native-hints'},p.hints.map(x=>h('li',null,x))),
  p.owner_answers?.length>0&&h('details',{class:'rpk-options'},h('summary',null,'查看答案 · 仅你可见'),h('p',null,p.owner_answers.join(' / ')),h('small',null,'你不参与本轮，可到猜词专区追加公开线索。')),
  p.mine&&h('p',{class:'rpk-status'},free?'你已猜中本轮，胜利已计入等级。':`你的奖励：${p.mine.amount} ${p.currency||'LDC'} · ${fundingState(p.mine.state,p.payment_provider)}`),
  !p.draw&&(p.can_play??!p.owner)&&!p.mine&&p.state==='open'&&p.claimed_count<p.count&&guess,
  game&&(p.can_play??!p.owner)&&p.state==='open'&&!p.mine&&ask,
  p.draw&&h('p',{class:'rpk-help'},p.draw.settled_at?(p.draw.settled_at<p.draw.draw_at?'已取消 · 本轮未开奖 · ':'已开奖 · ')+p.draw.participant_count+' 人参与':'开奖时间 '+new Date(p.draw.draw_at*1000).toLocaleString('zh-CN')+' · '+p.draw.participant_count+' 人参与'),
  p.draw&&!p.owner&&!p.draw.settled_at&&p.state==='open'&&!p.draw.joined&&btn('参与抽奖',()=>run('enter',{})),
  p.draw?.joined&&!p.draw.settled_at&&h('p',{class:'rpk-status'},'已参与 · 等待开奖'),
  !free&&packetRecords({h,api,p}),info,
  h('div',{class:'rpk-actions'},btn('刷新状态 / 线索',async()=>{if(busy)return;try{const d=await api(`/chat/messages/${messageId}/redpack`);if(host.isConnected)onRefresh(d.packet)}catch(e){info.textContent=e.message}}),
   !free&&(p.mine||p.owner)&&btn('核对发放结果',()=>run('reconcile',{})),p.owner&&p.recipients.some(r=>r.state==='rejected')&&btn('重试失败发放（沿用原单）',()=>run('reconcile',{retry:true})),p.owner&&p.state==='open'&&btn(free?'主动流局':'关闭未领取名额',()=>free?send('@欢欢 ','流局'):run('close',{}))),
  !free&&h('p',{class:'rpk-help'},p.payment_provider==='coin52'?'D币已预留在本站奖池；奖励到账本站钱包，未用部分退回。':p.payment_provider==='fish'?'奖励到账 Fish 🐟额；网络结果未知时只查原单，不另发一笔。':'平台已受理与实际到账不同；手续费及到账时间以 Credit 为准。网络结果未知时只查询原单，不另发一笔。'),p.mine?.error&&h('p',{class:'rpk-status',role:'status'},p.mine.error),p.payment_provider==='fish'&&h('a',{href:'https://hb.lafi.sh/',target:'_blank',rel:'noopener noreferrer'},'前往 Fish 查看余额 / 登录'))
 return box
}
function nativeLedger({h,api}){
 const list=h('div'),info=h('p',{class:'rpk-help',role:'status'}),more=h('button',{type:'button',class:'rpk-secondary'},'加载发放 / 领取记录')
 const box=h('details',{class:'rpk-options'},h('summary',null,'我的发放 / 领取记录'),h('p',{class:'rpk-help'},'这里只显示与你有关的奖励。未确认的发放只查询原订单；只有发包者能重试明确失败的原单。'),list,info,more)
 let cursor=null,busy=false
 more.onclick=async()=>{if(busy)return;busy=true;more.disabled=true;try{const d=await api('/me/ldc/awards'+(cursor?'?before='+cursor:''));for(const r of d.items){const state=h('p',null,`${r.owner?'发给 '+r.recipient:'我领取'} · ${r.amount} ${r.currency||'LDC'} · ${fundingState(r.state,r.payment_provider)}`),check=h('button',{type:'button',class:'rpk-secondary'},r.owner&&r.state==='rejected'?'重试失败原单':'核对原单');check.onclick=async()=>{if(check.disabled)return;check.disabled=true;try{const v=await api('/me/ldc/awards/'+r.id+'/reconcile',{method:'POST',body:{retry:r.owner&&r.state==='rejected'}});r.state=v.state;state.textContent=`${r.owner?'发给 '+r.recipient:'我领取'} · ${r.amount} ${r.currency||'LDC'} · ${fundingState(v.state,r.payment_provider)}`;check.textContent=r.owner&&r.state==='rejected'?'重试失败原单':'核对原单';check.hidden=v.state==='accepted'}catch(e){info.textContent=e.message}finally{check.disabled=false}};check.hidden=r.state==='accepted';list.append(h('div',null,state,check))}cursor=d.next;more.hidden=!cursor;more.textContent='更多记录';info.textContent=list.children.length?'':'暂无发放或领取记录'}catch(e){info.textContent=e.message}finally{busy=false;more.disabled=false}}
 return box
}
