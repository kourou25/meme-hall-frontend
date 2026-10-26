import {createGuessTip} from '/guess-tip.js?v=98ddcc7d'
import {createGuessCloseControls} from '/guess-close-controls.js?v=98ddcc7d'
import {createRewardFeedback} from '/guess-reward-feedback.js?v=98ddcc7d'
import {captureChatScroll} from '/chat-scroll-anchor.js?v=98ddcc7d'
import {avatarImage} from '/avatar-view.js?v=98ddcc7d'
// 猜词总览按需加载，复用群消息变更信号，不新增定时轮询。
import {formatGuessDeadline,createGuessView} from '/shared-games/guess-view.js';
export {formatGuessDeadline};
export function createGuessRoom({ pane, chat, scroller, opener, gid, userId, h, api, create, onMode }) {
  const doc=pane.ownerDocument,win=doc.defaultView,key=`guessSplit:${userId||0}:${gid}`
  for(const href of ['/shared-games/session.css',...(onMode?['/game-panel.css?v=98ddcc7d']:[])])if(!doc.querySelector('link[href="'+href+'"]'))doc.head.append(h('link',{rel:'stylesheet',href}))
  const desktop=win.matchMedia('(min-width:641px)')
  let width=520
  try{width=Math.max(320,Math.min(760,Number(win.localStorage.getItem(key))||520))}catch{}
  let opened=false,dead=false,round=null,selected=0,controller,revision=0,dirty=false,queued=0,busy=false,attempt=null,receiptId=0,sendError='',restoreMain=null
  const drafts=new Map(),signals=new Map()
  let modeValue='guess',historyOpen=false,historyController=null,historyCursor=null,historyNext=null,expanded=null,people='avatar',latestValue=null,factsLayout='columns',extraOpen=false
  let statsOpen=false,statsPeriod='today',statsMetric='wins',statsController=null,statsDirty=false,extraLayout='rows'
  try{const saved=win.localStorage.getItem('guessPeople:'+userId);if(['avatar','hidden'].includes(saved))people=saved}catch{}
  try{if(win.localStorage.getItem('guessFactsLayout:'+userId)==='rows')factsLayout='rows'}catch{}
  try{if(win.localStorage.getItem('guessExtraLayout:'+userId)==='columns')extraLayout='columns'}catch{}
  let expiryTimer=0,expiryKey=''
  let deadlineTimer=0,clockServer=Date.now()/1000,clockStarted=win.performance.now()
  const deadlineLabel=h('span',{class:'gr-deadline',title:'截止时间按设备本地时区显示'})
  function updateDeadline(){
    win.clearTimeout(deadlineTimer)
    if(!opened||dead||doc.hidden||!round)return
    const current=clockServer+(win.performance.now()-clockStarted)/1000
    deadlineLabel.textContent=formatGuessDeadline(round.ends_at,current,round.state)
    if(round.state==='open'&&round.ends_at>current)deadlineTimer=win.setTimeout(updateDeadline,Math.min(60000,Math.max(1000,(round.ends_at-current)*1000)))
  }
  doc.addEventListener('visibilitychange',updateDeadline)
  const historyPages=[]
  const button=(text,fn,attrs={})=>h('button',{type:'button',onclick:fn,...attrs},text)
  const toolPaths={stats:'M5 20V12M12 20V4M19 20V8',queue:'M8 6h12M8 12h12M8 18h12M3 6h1M3 12h1M3 18h1',history:'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',refresh:'M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5',close:'M6 6l12 12M18 6L6 18',display:'M4 7h16M4 17h16M8 4v6M16 14v6'}
  function tool(node,key,label){node.replaceChildren(h('span',{'aria-hidden':'true',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${toolPaths[key]}"/></svg>`}));node.classList.add('gr-tool');node.title=label;node.setAttribute('aria-label',label)}
  function toolLabel(node,label){node.title=label;node.setAttribute('aria-label',label)}
  const status=h('p',{class:'gr-status',role:'status','aria-live':'polite'}),meta=h('div',{class:'gr-meta'}),hints=h('div',{class:'gr-hints','aria-label':'已公开线索'})
  const escalationNotice=h('p',{class:'gr-escalation',hidden:true})
  const latestReply=h('p',{class:'gr-latest-reply',role:'status','aria-live':'polite'},'最新回答将在这里显示')
  const layoutButton=button('',()=>{factsLayout=factsLayout==='columns'?'rows':'columns';setFactsLayout();try{win.localStorage.setItem('guessFactsLayout:'+userId,factsLayout)}catch{}},{class:'gr-layout-toggle','aria-label':'切换是非列表排列'})
  function setFactsLayout(){section.dataset.factsLayout=factsLayout;layoutButton.textContent=factsLayout==='columns'?'▥':'▤';layoutButton.setAttribute('aria-pressed',String(factsLayout==='columns'));layoutButton.title=factsLayout==='columns'?'切换为上下排列':'切换为左右排列'}
  const {avatar,participants,renderSummary,resetPages,page}=createGuessView({h,button,avatarImage,load,getSummaries:()=>summaries});
  function summary(kind,label,reload){
    const state={kind,cursor:null,next:null,history:[],count:h('small'),list:h('div'),fresh:false,reload}
    state.back=button('上一页',()=>page(state,false),{class:'gr-more',hidden:true})
    state.more=button('下一页',()=>page(state,true),{class:'gr-more',hidden:true})
    state.feed=h('div',{class:'gr-summary-scroll',tabindex:0,'aria-label':label+'列表'},state.list,h('div',{class:'gr-paging'},state.back,state.more))
    state.section=h('section',{class:'gr-block '+(kind==='guesses'?'gr-rank':kind==='negative'?'gr-facts gr-negative':'gr-facts'),'aria-label':label},h('h3',null,label,state.count),state.feed)
    return state
  }
  const ranking=summary('guesses','高相关答案'),facts=summary('facts','已确认「是」'),negative=summary('negative','已确认「否」'),unknown=summary('unknown','无法判断'),notQuestion=summary('not_question','不是问题'),summaries=[ranking,facts,negative,unknown,notQuestion]
  const extras=h('div',{class:'gr-extra-verdicts',hidden:true},unknown.section,notQuestion.section)
  const extraButton=button('其他判断',()=>{extraOpen=!extraOpen;section.dataset.extraOpen=String(extraOpen);extras.hidden=!extraOpen;extraButton.setAttribute('aria-expanded',String(extraOpen));extraButton.textContent=extraOpen?'收起判断':'其他判断';setExtraLayout();load({restart:true})},{class:'gr-extra-toggle','aria-expanded':'false',title:'展开无法判断和不是问题两栏'})
  const extraLayoutButton=button('',()=>{extraLayout=extraLayout==='columns'?'rows':'columns';setExtraLayout();try{win.localStorage.setItem('guessExtraLayout:'+userId,extraLayout)}catch{}},{class:'gr-layout-toggle gr-extra-layout',hidden:true})
  function setExtraLayout(){
    section.dataset.extraLayout=extraLayout;extraLayoutButton.hidden=!extraOpen
    const columns=extraLayout==='columns',label=columns?'其他判断移回下方':'五栏并排显示'
    extraLayoutButton.textContent=columns?'▤':'▥';extraLayoutButton.title=label;extraLayoutButton.setAttribute('aria-label',label);extraLayoutButton.setAttribute('aria-pressed',String(columns))
    layoutButton.hidden=extraOpen&&columns
  }
  const guessMode=button('猜答案',()=>setMode('guess',true),{class:'gr-mode','aria-pressed':'true'}),questionMode=button('问是非',()=>setMode('question',true),{class:'gr-mode','aria-pressed':'false'})
  const mode=h('div',{class:'gr-modes',role:'group','aria-label':'专区发言方式'},guessMode,questionMode)
  const input=h('textarea',{class:'gr-input',rows:2,maxlength:990,'aria-label':'猜词专区消息',placeholder:'直接输入答案，无需打提示符',onkeydown:e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}}})
  function setMode(value,focus=false){modeValue=value;guessMode.setAttribute('aria-pressed',String(value==='guess'));questionMode.setAttribute('aria-pressed',String(value==='question'));input.placeholder=value==='guess'?'直接输入答案，无需打提示符':'输入是非问题，如：第一个字是水吗';input.title=value==='question'?'可直接问“有水字吗”“第二个字是水吗”“答案有三个字吗”，服务器核验主答案，不消耗 AI。':'';if(focus)input.focus({preventScroll:true})}
  const sendButton=button('发送',()=>send(),{class:'gr-send'}),hintButton=button('要线索',()=>send('@欢欢 线索'),{class:'gr-link'})
  const closure=createGuessCloseControls({h,api,getRound:()=>round,refresh:()=>load({restart:true})})
  const cancelButton=button('流局',()=>closure.open(),{class:'gr-link',hidden:true})
  let hintBusy=false,hintAttempt=null
  const hintInput=h('input',{class:'gr-input',maxlength:160,required:true,enterkeyhint:'send','aria-label':'追加公开线索',placeholder:'提供一条真实线索，最多160字',onkeydown:e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault()}})
  const hintStatus=h('p',{class:'gr-status',role:'status'},'直接公开，不调用 AI；每轮最多追加60条。')
  async function appendHint(){
    const text=hintInput.value.trim(),mid=round?.message_id;if(hintBusy||!round?.owner||round.state!=='open')return
    if(!text){hintStatus.setAttribute('role','alert');hintStatus.textContent='请先输入线索。';hintInput.focus({preventScroll:true});return}
    if(hintAttempt?.mid!==mid||hintAttempt.text!==text)hintAttempt={mid,text,nonce:crypto.randomUUID()}
    hintBusy=true;hintStatus.setAttribute('role','status');hintStatus.textContent='正在发布…';syncControls()
    try{await api(`/chat/messages/${mid}/guess-hints`,{method:'POST',body:hintAttempt});if(!dead&&round?.message_id===mid){hintAttempt=null;hintInput.value='';hintStatus.textContent='已向本轮所有参与者公开';await load({restart:true})}}catch(e){if(!dead&&round?.message_id===mid){hintStatus.setAttribute('role','alert');hintStatus.textContent=e.message+'；内容已保留。'}}finally{hintBusy=false;if(!dead)syncControls()}
  }
  const appendHintButton=h('button',{type:'submit',class:'gr-send gr-hint-submit'},'发布线索')
  const hintForm=h('form',{class:'gr-hint-form','aria-label':'追加线索',onsubmit:e=>{e.preventDefault();appendHint()}},hintInput,appendHintButton)
  const manualHints=h('details',{class:'gr-manual-hints',hidden:true},h('summary',null,'发题者追加线索'),hintForm,hintStatus)
  const ownerAnswerText=h('p',{class:'gr-revealed'})
  const ownerAnswer=h('details',{class:'gr-owner-answer',hidden:true},h('summary',null,'查看答案 · 仅你可见'),ownerAnswerText)
  manualHints.append(ownerAnswer)
  const fresh=button('发起猜词',e=>create(e.currentTarget),{class:'gr-link'}),closeButton=button('返回群聊',()=>close(),{class:'gr-link'}),refreshButton=button('刷新',()=>refresh(),{class:'gr-link','aria-label':'刷新猜词专区'})
  const historyButton=button('历史轮次',()=>showHistory(!historyOpen),{class:'gr-link','aria-expanded':'false'})
  const queueRows=h('div'),queueStatus=h('p',{class:'gr-status',role:'status'})
  const queuePanel=h('div',{class:'gr-queue',hidden:true},queueStatus,queueRows,button('更新队列',()=>loadQueue(),{class:'gr-link'}),button('发起 / 管理草稿',e=>create(e.currentTarget),{class:'gr-link'}))
  async function loadQueue(){
    queueStatus.textContent='正在读取等候队列…'
    try{const d=await api(`/chat/groups/${gid}/guess-queue`);if(dead)return;queueStatus.textContent=d.queue.length?`等候 ${d.queue.length} 局 · 上一局结束后自动发出，通常在1分钟内`:'暂无等候中的猜词';queueRows.replaceChildren(...d.queue.map((r,i)=>h('p',null,`${i+1}. ${r.owner_name} · ${r.reward_type==='none'?'无奖励':(r.amount_cents/100).toFixed(r.payment_provider==='coin52'?0:2)+(r.payment_provider==='coin52'?' D币':' LDC')} · ${r.state==='starting'?'正在开局':'等候中'}`)))}catch(e){queueStatus.textContent=e.message}
  }
  const queueButton=button('等候',()=>{queuePanel.hidden=!queuePanel.hidden;queueButton.setAttribute('aria-expanded',String(!queuePanel.hidden));if(!queuePanel.hidden)loadQueue()},{class:'gr-link','aria-label':'等候队列','aria-expanded':'false'})
  const statsButton=button('战绩榜',()=>showStats(!statsOpen),{class:'gr-link gr-stats-button','aria-expanded':'false'})
  const statsToday=button('今日',()=>{statsPeriod='today';loadStats()},{class:'gr-mode','aria-pressed':'true'})
  const statsAll=button('开站以来',()=>{statsPeriod='all';loadStats()},{class:'gr-mode','aria-pressed':'false'})
  const statsStatus=h('p',{class:'gr-history-status',role:'status'}),statsTotals=h('div',{class:'gr-stats-totals'}),statsSummary=h('p',{class:'gr-stats-summary'}),statsMine=h('p',{class:'gr-stats-mine'}),statsList=h('ol',{class:'gr-stats-list'})
  const statsWins=button('猜中榜',()=>{statsMetric='wins';loadStats()},{class:'gr-mode','aria-pressed':'true'}),statsRate=button('胜率榜',()=>{statsMetric='rate';loadStats()},{class:'gr-mode','aria-pressed':'false'})
  const statsHeading=h('h3',null,'猜中榜'),statsRules=h('p',{class:'gr-stats-rules'})
  const statsPane=h('div',{class:'gr-stats',hidden:true},h('div',{class:'gr-stats-tools'},h('div',{class:'gr-modes',role:'group','aria-label':'排行榜时间范围'},statsToday,statsAll),button('更新榜单',()=>loadStats(),{class:'gr-link'})),h('div',{class:'gr-modes',role:'group','aria-label':'排行榜指标'},statsWins,statsRate),statsStatus,statsTotals,statsSummary,statsMine,statsHeading,statsList,statsRules)
  const peopleButtons=['avatar','hidden'].map((value,i)=>button(['仅头像','隐藏头像'][i],()=>{people=value;section.dataset.people=value;for(const b of peopleButtons)b.setAttribute('aria-pressed',String(b.dataset.value===value));drawLatest();try{win.localStorage.setItem('guessPeople:'+userId,value)}catch{}},{class:'gr-people-choice','data-value':value,'aria-pressed':String(people===value)}))
  const display=h('details',{class:'gr-display'},h('summary',null,'显示'),h('div',{class:'gr-display-menu',role:'group','aria-label':'答题者显示方式'},...peopleButtons))
  for(const [node,key,label] of [[display.querySelector('summary'),'display','显示设置'],[statsButton,'stats','战绩榜'],[queueButton,'queue','等候队列'],[historyButton,'history','历史轮次'],[refreshButton,'refresh','刷新猜词专区'],[closeButton,'close','关闭分屏']])tool(node,key,label)
  const historyStatus=h('p',{class:'gr-history-status',role:'status'}),historyList=h('div',{class:'gr-history-list'})
  const historyPrev=button('上一页',()=>{historyCursor=historyPages.pop()||null;loadHistory()},{class:'gr-more',hidden:true}),historyMore=button('下一页',()=>{historyPages.push(historyCursor);historyCursor=historyNext;loadHistory()},{class:'gr-more',hidden:true})
  const historyPane=h('div',{class:'gr-history',hidden:true},historyStatus,historyList,h('div',{class:'gr-paging'},historyPrev,historyMore))
  const roundSummaryText=h('span'),hintSummaryText=h('span')
  const roundSummary=h('summary',{'aria-label':'展开本轮信息'},roundSummaryText),hintSummary=h('summary',{'aria-label':'展开全部线索'},hintSummaryText)
  const roundDetails=h('details',{class:'gr-round-details'},roundSummary,meta,escalationNotice,manualHints)
  const hintDetails=h('details',{class:'gr-hint-details'},hintSummary,hints)
  for(const [details,summary,label] of [[roundDetails,roundSummary,'本轮信息'],[hintDetails,hintSummary,'全部线索']])details.addEventListener('toggle',()=>{const action=(details.open?'收起':'展开')+label;summary.setAttribute('aria-label',action);summary.title=action})
  const tip=createGuessTip({h,api,userId})
  const revealed=h('div',{class:'gr-result',hidden:true})
  const moreTools=h('details',{class:'gr-tools'},h('summary',{class:'gr-tool',title:'更多操作','aria-label':'更多操作'},'⋯'),h('div',{class:'gr-tools-menu'},statsButton,queueButton,historyButton,refreshButton))
  moreTools.addEventListener('click',e=>{if(e.target.closest('button'))moreTools.open=false})
  moreTools.addEventListener('keydown',e=>{if(e.key==='Escape'){moreTools.open=false;moreTools.querySelector('summary').focus()}})
  const live=h('div',{class:'gr-current'},roundDetails,hintDetails,revealed,h('div',{class:'gr-overview-tools'},latestReply,extraButton,extraLayoutButton,layoutButton),
    h('div',{class:'gr-summary-area',tabindex:0,'aria-label':'猜词汇总，可横向滚动查看并排列表'},h('div',{class:'gr-dashboard'},ranking.section,h('div',{class:'gr-boolean'},facts.section,negative.section)),extras),
    h('form',{class:'gr-compose',onsubmit:e=>{e.preventDefault();send()}},closure.vote,closure.panel,tip.element,h('div',{class:'gr-actions'},mode,h('span',{class:'grow'}),hintButton,cancelButton,fresh),input,h('div',{class:'gr-send-row'},status,sendButton)))
  const section=h('section',{class:'gr-panel','data-people':people,'aria-label':'猜词专区',hidden:true},
    h('header',{class:'gr-head'},h('strong',null,h('img',{src:'/ai-avatar.svg',alt:'',width:24,height:24}),'欢欢猜词屋'),onMode?h('select',{class:'gr-game-switch','aria-label':'切换玩法',onchange:e=>{const mode=e.target.value;e.target.value='guess';onMode(mode)}},...[[ 'guess','普通猜词'],['arena','AI 对抗'],['drawing','卧底画家'],['outside','VIP聊天']].map(([value,label])=>h('option',{value},label))):null,h('span',{class:'grow'}),display,moreTools,closeButton),queuePanel,live,historyPane,statsPane)
  const divider=h('div',{class:'gr-divider',role:'separator',tabindex:0,'aria-label':'调整群聊和猜词专区宽度','aria-orientation':'vertical','aria-valuemin':'320',hidden:true})
  pane.append(divider,section)
  const rewardFeedback=createRewardFeedback(doc,()=>opened&&!dead&&!statsOpen&&!historyOpen)
  function anchor(){
    return captureChatScroll(scroller)
  }
  function layout(){
    const wide=pane.clientWidth>=720,actual=Math.max(320,Math.min(width,pane.clientWidth-320)),hideChat=opened&&!wide,wasHidden=chat.inert
    if(hideChat&&!wasHidden)restoreMain=anchor()
    pane.classList.toggle('gr-open',opened);pane.classList.toggle('gr-wide',opened&&wide);section.hidden=!opened;divider.hidden=!opened||!wide;if(opened||!pane.matches('.hc-open,.gp-open'))chat.inert=hideChat
    pane.style.setProperty('--guess-w',actual+'px');divider.setAttribute('aria-valuenow',String(Math.round(actual)));divider.setAttribute('aria-valuemax',String(Math.max(320,pane.clientWidth-320)))
    opener.setAttribute('aria-expanded',String(opened));const label=opener.querySelector('.cm-guess-label');if(label)label.textContent=opened?'猜词专区已打开':'猜词专区 / 分屏';toolLabel(closeButton,wide?'关闭分屏':'返回群聊')
    if(wasHidden&&!hideChat){restoreMain?.();restoreMain=null}
  }
  function resize(value,save=true){const restore=anchor();width=Math.max(320,Math.min(value,pane.clientWidth-320));layout();restore();if(save)try{win.localStorage.setItem(key,String(Math.round(width)))}catch{}}
  divider.addEventListener('keydown',e=>{let value=width;if(e.key==='ArrowLeft')value+=20;else if(e.key==='ArrowRight')value-=20;else if(e.key==='Home')value=320;else if(e.key==='End')value=pane.clientWidth-320;else if(e.key==='Enter')value=520;else return;e.preventDefault();resize(value)})
  divider.addEventListener('dblclick',()=>resize(520))
  divider.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();divider.setPointerCapture(e.pointerId);divider.dataset.drag=String(e.pointerId)})
  divider.addEventListener('pointermove',e=>{if(divider.dataset.drag===String(e.pointerId))resize(pane.getBoundingClientRect().right-e.clientX,false)})
  const stopDrag=()=>{if(divider.dataset.drag){delete divider.dataset.drag;try{win.localStorage.setItem(key,String(Math.round(width)))}catch{}}}
  divider.addEventListener('lostpointercapture',stopDrag);divider.addEventListener('pointerup',e=>{stopDrag();if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId)})
  const observer=new ResizeObserver(()=>{if(!dead)layout()});observer.observe(pane)
  function syncControls(){const active=round?.state==='open';input.disabled=guessMode.disabled=questionMode.disabled=sendButton.disabled=busy||!active||round?.can_play===false;hintButton.disabled=cancelButton.disabled=busy||!active;cancelButton.hidden=!active||!round?.owner;manualHints.hidden=!active||!round?.owner;hintInput.disabled=appendHintButton.disabled=hintBusy||!active;appendHintButton.textContent=hintBusy?'发布中…':'发布线索';fresh.hidden=!!active;sendButton.textContent=busy?'发送中…':'发送'}
  function drawMeta(){
    closure.update(round);tip.update(round)
    const active=round?.state==='open',label=!round?'暂无猜词':active?'进行中':round.close_kind?'已流局':round.recipients?.length?'已猜中':'已流局'
    roundSummaryText.textContent=!round?'暂无猜词':`${label} · ${round.reward_type==='none'?'无奖励':round.total+' '+(round.currency||'LDC')}${round.answer_length!=null?' · '+round.answer_length+'字':''}${round.count>1?' · 猜中 '+round.claimed_count+'/'+round.count:''} · AI ${round.ai_count}/${round.ai_limit}`
    roundSummary.title=roundSummary.textContent+'（点击查看奖励、截止时间与本轮规则）'
    hintSummaryText.textContent=round?.hints?.length?`线索 ${round.hints.length} · ${round.hints.at(-1)}`:'线索 · 尚未公开'
    hintSummary.title='展开全部线索与解锁条件';hintDetails.hidden=!round
    revealed.hidden=!round?.answer
    const explanation=typeof round?.explanation==='string'?round.explanation.trim():''
    revealed.replaceChildren(...(round?.answer?[h('strong',null,'答案：'+round.answer),...(explanation?[h('span',null,explanation)]:[])]:[]))
    ownerAnswer.hidden=!round?.owner_answers?.length;ownerAnswerText.textContent=round?.owner_answers?.join(' / ')||''
    const escalation=round?.escalation;escalationNotice.hidden=!escalation
    if(escalation)escalationNotice.textContent=`累计追加 ${escalation.added} / ${escalation.cap} ${round.currency||'LDC'} · 每 ${escalation.every} 次 AI 调用追加 ${escalation.step} ${round.currency||'LDC'} · ${escalation.frozen?'首位已猜中，追加奖励已停止':Number(escalation.added)>=Number(escalation.cap)?'已达追加上限':`下一档第 ${(Math.ceil(Number(escalation.added)/Number(escalation.step))+1)*escalation.every} 次调用`}`
    hints.replaceChildren(h('strong',null,'线索'),...(round?.hints?.length?round.hints.map((text,i)=>h('span',null,`${i+1}. ${text}`)):[h('span',{class:'muted'},round?.hint_source==='ai'||round?.ai_generated?(round.auto_hint_every?'阶段线索尚未解锁':'本轮未开启 AI 阶段线索'):'尚未公开，可点击下方“要线索”')]))
    if(round?.hint_source==='preset')hints.append(h('span',{class:'muted'},round.preset_hints_remaining===0?'预设线索已全部公开':round.preset_hint_trigger==='guesses'?`${round.auto_hint_increment?`首间隔 ${round.auto_hint_every} 次，逐阶段加 ${round.auto_hint_increment} 次`:`每 ${round.auto_hint_every} 次作答`}揭示预设线索 · 下一条第 ${round.next_hint_guess} 次${round.hint_progress<round.next_hint_guess?`，还差 ${round.next_hint_guess-round.hint_progress} 次`:''} · 猜答案和是非提问均计入`:`仅用预设线索 · 索要冷却 ${round.hint_cooldown_seconds} 秒`))
    else if(round?.auto_hint_every)hints.append(h('span',{class:'muted'},round.next_hint_guess?`${round.auto_hint_increment?`首间隔 ${round.auto_hint_every} 次，逐阶段加 ${round.auto_hint_increment} 次`:`每 ${round.auto_hint_every} 次作答`}${round.ai_generated?'解锁一条':'自动给线索'} · ${round.ai_generated?'下一条':'下次自动提示'}第 ${round.next_hint_guess} 次${round.hint_progress<round.next_hint_guess?`，还差 ${round.next_hint_guess-round.hint_progress} 次`:'，可点“要线索”重试'} · 猜答案和是非提问均计入`:`每 ${round.auto_hint_every} 次作答自动给线索 · 使用现有 AI 额度`))
    if(!round){meta.replaceChildren(h('p',null,'当前没有猜词局，可以发起新一轮。'));syncControls();return}
    updateDeadline()
    meta.replaceChildren(h('div',{class:'gr-round'},h('strong',null,round.state==='open'?'进行中':round.close_kind?'已流局':round.recipients?.length?'已猜中':'已流局'),h('span',null,round.reward_type==='none'?'无奖励':`${round.total} ${round.currency||'LDC'}`),round.answer_length!=null&&h('span',null,`${round.answer_length} 字`),deadlineLabel),h('p',null,`${round.owner_name} 发起 · 猜测 ${round.guess_count} · 提问 ${round.question_count} · AI ${round.ai_count}/${round.ai_limit}`));syncControls()
  }
  function drawLatest(){const value=JSON.stringify([latestValue,people]);if(latestReply.dataset.value===value)return;latestReply.dataset.value=value;const r=latestValue;latestReply.replaceChildren(...(r?[h('span',null,'最新回答'),...(people==='avatar'?[avatar(r)]:[]),h('span',null,`${r.question} → ${r.text}`)]:[h('span',null,'最新回答将在这里显示')]))}
  function drawStatus(receipt){
    if(sendError){status.setAttribute('role','alert');status.textContent=sendError;return}
    const reply=receipt?.reply;status.setAttribute('role',reply?.status==='error'?'alert':'status')
    status.textContent=reply?(reply.text?'欢欢：'+reply.text:'欢欢正在判断…'):round?.state==='open'&&round.can_play===false?'你已知道谜底，可提供线索或主动流局。':round?.state==='open'?'仅在专区参与 · Enter 发送，Shift+Enter 换行':round?'本轮已结束，结果可继续查看。':'主群仅接收开局及结果通知。'
  }
  function showStats(value){
    rewardFeedback.reset();statsOpen=value;statsPane.hidden=!value;live.hidden=value;historyPane.hidden=true
    if(value){historyOpen=false;toolLabel(historyButton,'历史轮次');historyButton.setAttribute('aria-expanded','false');historyController?.abort();expanded?.controller?.abort();controller?.abort();controller=null;revision++;loadStats()}
    else{statsController?.abort();load({latestRound:true,restart:true})}
    toolLabel(statsButton,value?'返回本轮':'战绩榜');statsButton.setAttribute('aria-expanded',String(value))
  }
  async function loadStats(){
    if(!statsOpen||!opened||dead)return
    statsController?.abort();const request=new AbortController();statsController=request
    statsToday.setAttribute('aria-pressed',String(statsPeriod==='today'));statsAll.setAttribute('aria-pressed',String(statsPeriod==='all'))
    statsWins.setAttribute('aria-pressed',String(statsMetric==='wins'));statsRate.setAttribute('aria-pressed',String(statsMetric==='rate'))
    statsStatus.textContent='正在整理战绩…'
    try{
      const data=await api(`/chat/groups/${gid}/guess-stats?period=${statsPeriod}`,{signal:request.signal})
      if(dead||request.signal.aborted||!statsOpen)return
      const totals=data.totals?.[statsPeriod]||{rounds:0,wins:0}
      statsStatus.textContent=statsPeriod==='today'?`北京时间 ${data.today} · 本群今日战绩`:'本群开站以来战绩'
      statsTotals.replaceChildren(h('div',null,h('strong',null,String(totals.rounds)),h('span',null,'已开轮次')),h('div',null,h('strong',null,String(totals.wins)),h('span',null,'猜中次数')))
      const champion=data.leaders?.[0]
      statsSummary.textContent=`${statsPeriod==='today'?'本日':'开站以来'}已开 ${totals.rounds} 轮、猜中 ${totals.wins} 次。${champion?`${champion.name||'群成员'}猜中 ${champion.wins} 次，位列${statsPeriod==='today'?'日榜':'总榜'}第一。`:''}`
      statsMine.textContent=`我猜中 ${data.mine||0} 次${data.mineRank?` · ${statsPeriod==='today'?'日榜':'总榜'}第 ${data.mineRank} 名`:''}`
      statsList.replaceChildren(...(data.leaders?.length?data.leaders.map((person,index)=>h('li',{class:index<3?'gr-stats-podium':''},h('span',{class:'gr-stats-place'},index+1),avatar(person),h('span',{class:'gr-stats-name'},person.name||'群成员'),h('strong',null,person.wins+' 次'))):[h('li',{class:'gr-stats-empty'},'这一段时间还没有人猜中。')]))
      statsHeading.textContent=statsMetric==='rate'?'参与胜率榜':'猜中次数榜'
      statsRules.textContent='日榜、总榜每天分别结算：第一 +3、第二 +2、第三 +1 经验；累计 1 / 3 / 10 / 30 / 100 经验升级称号、徽章与气泡。'
      if(statsMetric==='rate'){
        const w=data.winrate,pct=n=>(100*Number(n||0)).toFixed(1)+'%'
        if(!w)throw new Error('胜率统计暂时不可用')
        statsTotals.replaceChildren(h('div',null,h('strong',null,String(w.mine.rounds)),h('span',null,'我参与的已结束轮次')),h('div',null,h('strong',null,pct(w.mine.rate)),h('span',null,'我的胜率')))
        statsSummary.textContent=`猜中轮数 ÷ 有效参与的已结束轮数；至少参与 ${w.minimum} 轮入榜。相同胜率按参与轮数、用户编号排序。`
        statsMine.textContent=`我猜中 ${w.mine.wins} / ${w.mine.rounds} 轮 · ${w.mineRank?'第 '+w.mineRank+' 名':'还差 '+Math.max(0,w.minimum-w.mine.rounds)+' 轮入榜'}`
        statsList.replaceChildren(...(w.leaders.length?w.leaders.map((p,i)=>h('li',{class:i<3?'gr-stats-podium':''},h('span',{class:'gr-stats-place'},i+1),avatar(p),h('span',{class:'gr-stats-name'},p.name,h('small',null,`${p.wins} / ${p.rounds} 轮`)),h('strong',null,pct(p.rate)))):[h('li',{class:'gr-stats-empty'},`暂无达到 ${w.minimum} 轮门槛的参与者。`)]))
        statsRules.textContent+=` 已核验历史自 ${w.coverage?.since?new Date(w.coverage.since*1000).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}):'暂无数据'} 起；${w.excluded} 轮历史记录不完整，未纳入。`
      }
      statsDirty=false
    }catch(error){if(error.name!=='AbortError'&&!dead)statsStatus.textContent=error.message+'；可点击更新榜单重试。'}
    finally{if(statsController===request)statsController=null}
  }
  async function load({latestRound=false,restart=false}={}){
    if(!opened||dead||doc.hidden||historyOpen||statsOpen)return
    if(controller&&!restart&&!latestRound){dirty=true;return}
    controller?.abort();controller=new AbortController();const request=controller,rev=++revision,priorRound=round?.message_id
    const query=new URLSearchParams({view:'overview'});if(extraOpen)query.set('extra','1')
    if(!latestRound&&(selected||round))query.set('message_id',String(selected||round.message_id))
    if(!latestRound){for(const state of summaries)if(state.cursor&&(extraOpen||!['unknown','not_question'].includes(state.kind)))query.set(state.kind+'_cursor',state.cursor);if(receiptId)query.set('receipt_id',String(receiptId))}
    refreshButton.disabled=true;if(!round)status.textContent='正在读取…'
    try{
      const data=await api(`/chat/groups/${gid}/guess-room?${query}`,{signal:request.signal})
      if(dead||rev!==revision)return
      clockServer=Number.isFinite(data.now)?data.now:Date.now()/1000;clockStarted=win.performance.now()
      if(priorRound!==data.round?.message_id){if(priorRound)drafts.set(priorRound,{value:input.value,mode:modeValue});round=data.round;hintInput.value='';hintAttempt=null;hintStatus.textContent='直接公开，不调用 AI；每轮最多追加60条。';manualHints.open=desktop.matches;input.value=drafts.get(round?.message_id)?.value||'';setMode(drafts.get(round?.message_id)?.mode||'guess');resetPages();receiptId=0;attempt=null;sendError='';cancelButton.textContent='流局'}else round=data.round
      const deadline=round?.state==='open'?round.message_id+':'+round.ends_at:''
      if(deadline!==expiryKey){win.clearTimeout(expiryTimer);expiryKey=deadline;if(deadline)expiryTimer=win.setTimeout(()=>load({restart:true}),Math.max(100,(round.ends_at-data.now)*1000+100))}
      drawMeta();rewardFeedback.update(round,meta);for(const state of summaries)if(extraOpen||!['unknown','not_question'].includes(state.kind))renderSummary(state,data[state.kind]);if(!busy)drawStatus(data.receipt)
      latestValue=data.latest;drawLatest()
    }catch(error){if(error.name!=='AbortError'&&!dead){status.textContent=error.message+'；可点击刷新重试。';status.setAttribute('role','alert')}}
    finally{if(rev===revision){controller=null;refreshButton.disabled=false;for(const state of summaries)state.back.disabled=state.more.disabled=false;if(dirty){dirty=false;queue()}}}
  }
  function queue(){if(queued||!opened||doc.hidden||statsOpen)return;queued=win.setTimeout(()=>{queued=0;load()},500)}
  function refresh(latestRound=false){if(!opened||dead)return;if(statsOpen)return loadStats();if(historyOpen)return expanded?.details.open?loadHistoryRound(expanded):loadHistory();if(latestRound){selected=0;resetPages()}return load({latestRound})}
  function signal(messages){
    if(dead)return
    let changed=false,newer=false
    for(const m of messages){if(!['guess','clues'].includes(m.redpack?.ldc_mode)&&!['ldc_winner','ldc_cancel','ldc_expired','guess_level'].includes(m.system_kind))continue;const value=`${m.updated_at}:${m.redpack?.guess_revision}:${m.deleted}:${m.body}`;if(signals.get(m.id)===value)continue;signals.set(m.id,value);changed=true;if(m.redpack&&(!round||m.id>round.message_id))newer=true}
    if(signals.size>200)signals.delete(signals.keys().next().value)
    if(changed&&opened&&statsOpen){statsDirty=true;statsStatus.textContent='有新结果，点击“更新榜单”查看。'}
    else if(changed&&opened&&!historyOpen){if(newer&&!busy){selected=0;resetPages();load({latestRound:true})}else queue()}
  }
  async function send(command){
    if(busy||round?.state!=='open')return
    const text=command||input.value.trim();if(!text)return
    const body=command||(/^(?:[!！?？]|[@＠]欢欢)/.test(text)?text:(modeValue==='guess'?'!':'?')+text),mid=round.message_id
    if(!attempt||attempt.body!==body||attempt.mid!==mid)attempt={mid,body,nonce:crypto.randomUUID()}
    busy=true;sendError='';status.textContent='正在发送…';status.setAttribute('role','status');syncControls()
    try{
      const data=await api(`/chat/messages/${mid}/guess-room`,{method:'POST',body:{body,nonce:attempt.nonce}})
      if(dead)return
      attempt=null;if(round?.message_id===mid){receiptId=data.entry.id;if(!command){input.value='';drafts.delete(mid)}}
      status.textContent='已发送，等待欢欢回应…';busy=false;await load({restart:true})
    }catch(error){if(!dead){sendError=error.message+'；输入已保留。';status.textContent=sendError;status.setAttribute('role','alert')}}
    finally{busy=false;if(!dead)syncControls()}
  }
  function showHistory(value){
    if(value&&statsOpen){statsOpen=false;statsPane.hidden=true;toolLabel(statsButton,'战绩榜');statsButton.setAttribute('aria-expanded','false');statsController?.abort()}
    rewardFeedback.reset();historyOpen=value;historyPane.hidden=!value;live.hidden=value;toolLabel(historyButton,value?'返回本轮':'历史轮次');historyButton.setAttribute('aria-expanded',String(value))
    controller?.abort();controller=null;revision++;historyController?.abort();expanded?.controller?.abort();refreshButton.disabled=false
    if(value){historyCursor=null;historyPages.length=0;loadHistory()}else load({latestRound:true,restart:true})
  }
  async function loadHistory(){
    if(!opened||!historyOpen||dead)return
    historyController?.abort();expanded?.controller?.abort();expanded=null;const request=new AbortController();historyController=request
    historyStatus.textContent='正在读取历史轮次…';historyPrev.disabled=historyMore.disabled=true;refreshButton.disabled=true
    try{
      const data=await api(`/chat/groups/${gid}/guess-room?view=history${historyCursor?'&cursor='+encodeURIComponent(historyCursor):''}`,{signal:request.signal})
      if(dead||request.signal.aborted||!historyOpen)return
      historyStatus.textContent=data.items.length?'点击轮次查看正确答案与结果。':'暂无已结束的轮次。';historyNext=data.next
      historyList.replaceChildren(...data.items.map(item=>{
        const stamp=new Date(item.created_at*1000).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
        const content=h('div',{class:'gr-history-content'}),details=h('details',{class:'gr-history-round'},h('summary',null,h('strong',null,item.owner_name+' 的猜词'),h('span',null,stamp+' · '+(item.reward_type==='none'?'无 LDC 奖励':item.total+' '+(item.currency||'LDC')))),content)
        const context={details,content,mid:item.message_id,controller:null}
        details.addEventListener('toggle',()=>{if(details.open){if(expanded&&expanded!==context){expanded.controller?.abort();expanded.details.open=false}expanded=context;loadHistoryRound(context)}else{context.controller?.abort();if(expanded===context)expanded=null}})
        return details
      }));historyPrev.hidden=!historyPages.length;historyMore.hidden=!historyNext
    }catch(error){if(error.name!=='AbortError'&&!dead)historyStatus.textContent=error.message+'；点击顶部刷新重试。'}
    finally{if(historyController===request){historyController=null;historyPrev.disabled=historyMore.disabled=false;refreshButton.disabled=false}}
  }
  async function loadHistoryRound(context){
    if(!opened||!historyOpen||dead||!context.details.open)return
    context.controller?.abort();const request=new AbortController();context.controller=request
    const query=new URLSearchParams({view:'result',message_id:String(context.mid)})
    if(!context.ready)context.content.replaceChildren(h('p',{class:'gr-history-status'},'正在读取本轮结果…'))
    try{
      const data=await api(`/chat/groups/${gid}/guess-room?${query}`,{signal:request.signal})
      if(dead||request.signal.aborted||!historyOpen||!context.details.open)return
      const r=data.round
      if(!r){context.content.replaceChildren(h('p',{class:'gr-empty'},'该轮记录已不可见。'));return}
      const result=h('div',{class:'gr-history-result'},h('p',{class:'gr-revealed'},'正确答案：',h('strong',null,r.answer||'尚未公布')),r.explanation&&h('p',{class:'gr-answer-meaning'},r.explanation),h('p',null,`猜测 ${r.guess_count} 次 · 提问 ${r.question_count} 次`),
        ...(r.recipients?.length?r.recipients.map(w=>h('p',null,r.reward_type==='none'?`${w.name||'群成员'} 猜中 · 胜利已计入等级`:`${w.name||'群成员'} ${r.close_kind==='force'?'流局补偿':'猜中 · 奖励'} ${w.amount} ${r.currency||'LDC'}（${({accepted:'平台已受理',rejected:'发放失败待核对',sent:'发放处理中',unknown:'到账待核对',reserved:'名额已锁定'})[w.state]||'待发放'}）`)):[h('p',null,'本轮无人猜中')]))
      context.content.replaceChildren(result);context.ready=true
    }catch(error){if(error.name!=='AbortError'&&!dead){context.ready=false;context.content.replaceChildren(h('p',{class:'gr-empty',role:'alert'},error.message),button('重新读取',()=>loadHistoryRound(context),{class:'gr-more'}))}}
    finally{if(context.controller===request)context.controller=null}
  }
  function open(mid=0){if(dead)return;if(!opened)collapseAuxiliary();const restore=anchor();opened=true;if(historyOpen)showHistory(false);layout();restore();if(statsOpen){loadStats();return}if(mid&&mid!==round?.message_id){selected=mid;resetPages();receiptId=0;load({restart:true})}else if(!round||!mid){selected=0;resetPages();load({latestRound:true})}else load()}
  function close(){tip.close();rewardFeedback.reset();win.clearTimeout(expiryTimer);win.clearTimeout(deadlineTimer);expiryKey='';const restore=anchor();opened=false;controller?.abort();historyController?.abort();statsController?.abort();expanded?.controller?.abort();controller=null;revision++;win.clearTimeout(queued);queued=0;layout();restore();opener.focus({preventScroll:true})}
  function destroy(){tip.close();desktop.removeEventListener('change',responsiveDefaults);rewardFeedback.destroy();win.clearTimeout(expiryTimer);win.clearTimeout(deadlineTimer);doc.removeEventListener('visibilitychange',updateDeadline);dead=true;controller?.abort();historyController?.abort();statsController?.abort();expanded?.controller?.abort();win.clearTimeout(queued);observer.disconnect();divider.remove();section.remove();chat.inert=false}
  function collapseAuxiliary(){
    extraOpen=false;extras.hidden=true;section.dataset.extraOpen='false'
    extraButton.setAttribute('aria-expanded','false');extraButton.textContent='其他判断';setExtraLayout()
    queuePanel.hidden=true;queueButton.setAttribute('aria-expanded','false')
  }
  function responsiveDefaults(){
    roundDetails.open=hintDetails.open=manualHints.open=desktop.matches
    collapseAuxiliary()
    if(opened)load({restart:true})
  }
  desktop.addEventListener('change',responsiveDefaults);responsiveDefaults()
  setFactsLayout();setExtraLayout();syncControls();return{open,close,destroy,signal,refresh}
}
