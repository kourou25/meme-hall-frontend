import {packetRecords,packetAmount} from '/packet-records.js?v=97fd912d'
import {fundingState} from '/packet-funding.js?v=97fd912d'
import {dcoinIcon} from '/dcoin.js?v=97fd912d'
import {packetLuckRanks} from '/packet-luck.js?v=97fd912d'
export {packetLuckRanks}
import {avatarImage} from '/avatar-view.js?v=97fd912d'
// 按需加载。所有 DOM 挂到入口所在文档，普通群聊 / 分屏 / 小窗共用。
const MODES = { open: '直接开', phrase: '复读红包', cipher: '解个谜', image: '猜张图' }
const GAMES = {
  rails: ['双轨密码', '上下两行交替取字，先上后下。上行从左往右，下行从右往左。'],
  stairs: ['回廊字阵', '从最下面一行的左边出发，读完往上一行，换个方向继续读。空格跳过。'],
  radio: ['两步电台', '先把末尾两个字搬到最前，再将每两个字交换位置；落单的字不动。'],
  reverse: ['倒放咒语 · 入门', '从右往左读。'], pairs: ['错位电波 · 入门', '每两个字交换，落单的字不动。'], tiles: ['弹幕拼字', '点字块，拼出谜底。'],
}
const PROVIDERS = { native: '站内解谜', hb: 'HB 红包', credit: 'Credit 红包', fish:'Fish 红包' }
const STATES = { active: '可领取', exhausted: '被抢光啦', expired: '已过期', cancelled: '已取消', drawn: '已开奖', unmatched:'口令待匹配',registered:'已报名，等待开奖',drawing:'正在开奖',not_won:'这次未中奖',payment_pending:'奖励等待发放',simulation:'模拟奖励，不产生真实转账',draft:'还没开放',unconfirmed:'上次领取结果待核对' }
const KINDS = { fixed: '普通', equal: '普通', random: '拼手气', exclusive: '专属', lottery: '抽奖', custom:'自定义金额',timed_draw:'限时开奖',password:'口令兑奖',text:'文本 / CDK' }
export function packetCountdown(snapshot,at=Date.now()/1000){
  if(!['lottery','timed_draw'].includes(snapshot?.kind))return null
  if(snapshot.draw_complete)return '已开奖'
  const end=snapshot.draw_at
  if(!Number.isFinite(end)||end<=0)return null
  const seconds=Math.max(0,Math.ceil(end-at))
  if(!seconds)return '时间已到，等待开奖结果'
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60)
  return (snapshot.draw_deadline?'距最晚开奖 ':'距开奖 ')+(days?days+'天 ':'')+(hours?hours+'小时 ':'')+minutes+'分 '+String(seconds%60).padStart(2,'0')+'秒'
}
export function canClaimExternalPacket(provider, external, snapshot) {
  if (!snapshot) return true
  if (snapshot.claimed || snapshot.blocked) return false
  if (provider === 'fish' && external?.ref_kind === 'text' && snapshot.state === 'unmatched' && snapshot.kind === 'password') return true
  if (snapshot.state !== 'active') return false
  const supported = provider === 'fish' ? ['fixed', 'random', 'custom', 'timed_draw'] : provider==='hb'?['fixed','equal','random','exclusive','lottery']:['fixed', 'equal', 'random', 'exclusive']
  return ['hb', 'credit', 'fish'].includes(provider) && supported.includes(snapshot.kind)
}
export function packetBridge(action, external, signal) {
  return new Promise((resolve,reject) => {
    if(signal?.aborted){reject(Error('操作已取消'));return}
    const timeout=action==='ping'?3000:action==='awaitCreate'?190000:action==='claim'&&external?.provider==='fish'&&external.ref_kind==='text'?120000:external?.provider==='fish'?90000:external?.provider==='hb'?75000:45000
    const id=crypto.randomUUID(), timer=setTimeout(()=>finish(Error(action==='ping' ? '尚未连接，请点击顶部“连接器”安装或检测' : '结果尚未确认，请刷新状态或打开红包平台核对')),timeout)
    const receive=e=>{if(e.source===window && e.origin===location.origin && e.data?.type==='meme-redpacket-result' && e.data.id===id)finish(e.data.error?Object.assign(Error(e.data.error),{creation:e.data.creation}):null,e.data.result)}
    const abort=()=>finish(Error('操作已取消'))
    const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value)}
    window.addEventListener('message',receive)
    signal?.addEventListener('abort',abort,{once:true})
    window.postMessage({type:'meme-redpacket-request',id,action,external},location.origin)
  })
}
// 收到到点提醒时只查一次，多窗口由服务端租约合并；不会领取或报名。
export async function syncPacketDraw({id,api,signal,onUpdate}) {
  if(signal.aborted)return
  try {
    const ready=await packetBridge('ping',undefined,signal)
    if(!ready.packetDetailsV1||signal.aborted)return
    const lease=await api(`/chat/messages/${id}/redpack/draw-lease`,{method:'POST',body:{}})
    if(!lease.acquired||signal.aborted)return
    const result=await packetBridge('query',{...lease.packet.external,password:lease.packet.external.code},signal)
    if(signal.aborted)return
    const saved=await api(`/chat/messages/${id}/redpack/sync`,{method:'POST',body:result})
    if(!signal.aborted&&saved.message)onUpdate?.(saved.message)
  }catch{ /* 无登录或平台失败保留待同步，打开红包可再次查询。 */ }
}
// 自绘简笔图标：同一只信封小猫贯穿发包、消息与拆包。
const DOODLES = {
  open: '<path d="M7 15 8 6l8 6a25 25 0 0 1 16 0l8-6 1 9v19c0 5-6 8-17 8S7 39 7 34Z" fill="var(--rpk-paper)"/><path d="m8 24 16 10 16-10M13 29l-5 7m27-7 5 7"/><path d="M17 19v2m14-2v2m-10 3q3 3 6 0"/><path d="m11 23-4-1m30 1 4-1"/>',
  phrase: '<path d="M8 8q16-5 31 0l1 22q-10 4-21 1l-9 8 1-10-5-2Z" fill="var(--rpk-paper)"/><path d="M16 17v3m14-3v3m-10 4q3 3 6 0M15 8l2-5m13 5-1-5"/>',
  cipher: '<path d="m12 15 4-7 7 5 8-3 6 8-1 18-9 5-16-6-3-11Z" fill="var(--rpk-paper)"/><path d="M20 20q1-7 7-4t-2 9v3m0 6h.1M7 10l-3-3m36 25 4 2"/>',
  image: '<rect x="7" y="8" width="34" height="30" rx="5" fill="var(--rpk-paper)" transform="rotate(-5 24 23)"/><path d="m9 32 10-12 8 9 7-6 6 9M30 15h.1"/><path d="m16 21 1-6 5 5m9 13 1-4 4 3"/>',
  happy: '<path d="M8 18 10 5l10 8h9L39 5l1 14v13q-1 11-16 11T8 32Z" fill="var(--rpk-paper)"/><path d="m14 24 5-2m-4 0 4 2m10 0 5-2m-5 0 5 2m-14 6q4 6 8 0m-14-1-5-1m25 1 5-1M4 15l-3-3m42 0 3-3"/>',
  defeat: '<path d="m7 22 4-12 10 9h10l8-9 2 13v10q-1 9-17 9T7 33Z" fill="var(--rpk-paper)"/><path d="m14 27 6 4m-6 0 6-4m9 0 6 4m-6 0 6-4m-9 9 3-2 3 2M8 43H2m43 0h-7M25 5v6m-7-4 3 5m11-5-3 5"/>',
}
const catFace = face => '<path d="M8 20 10 7l10 9h9L38 7l2 14v12q0 10-16 10T8 33Z" fill="var(--rpk-paper)"/>' + face
const DEFEATS = [
  ['来晚一步，猫猫空手而归', DOODLES.defeat],
  ['人生就是这样的', catFace('<path d="M13 26h7m9 0h7m-15 9h6M3 34l4-2m34 0 4 2"/>')],
  ['遗憾总是贯穿人生始终', catFace('<path d="m14 26 6-2m9 0 6 2m-14 9q3-2 6 0M16 31v5m17-5v5"/><path d="M25 3q8-4 12 1"/>')],
  ['我来过，只是手慢了', catFace('<path d="M15 25v3m17-3v3m-12 7h8M8 38q-6 5-6 0m38 0q6 5 6 0"/>')],
  ['差一点，也是没赶上', catFace('<path d="m14 24 6 3-6 3m20-6-6 3 6 3m-13 5h6M3 15l-2 6m42-6 2 6"/>')],
  ['红包会有的，下一个会有的', catFace('<path d="m14 28 3-3 3 3m9 0 3-3 3 3m-14 7q3 3 6 0M38 36l5-4 2 6-6 3"/>')],
  ['风吹过，红包也吹走了', catFace('<path d="M14 26h6m9 0h6m-14 9q3-3 6 0M2 16h11m22-13h10m-9 3h6M1 39h9"/>')],
  ['红包已经没有了，看个欢欢缓一缓吧~', catFace('<path d="m13 25 8 2-5 2m19-4-8 2 5 2m-12 6q7 6 11-2m-16-2-2 2m23-2-2 2"/>')],
  ['红包已经没有了，看个meme通透一下吧~', catFace('<ellipse cx="24" cy="5" rx="10" ry="3"/><path d="m14 26 3 2 3-2m9 0 3 2 3-2m-14 9q3 2 6 0M10 40l-5 2m33-2 5 2"/>')],
  ['红包已经没有了，看个梗图放松一下吧~', catFace('<path d="m13 25 7 3-7 2m19-5v3m-12 6q4 7 9 0Z M39 17l4-5m-1 8 5-1"/>')],
  ['红包已空，江湖再见', catFace('<path d="M13 26h8m7 0h8m-15 10h6M4 44l38-5"/>'), '空'],
  ['迟来一步，也算赴约', catFace('<path d="m14 25 6 4m9-4 6 4m-14 7h6M4 6l3 4m33-4-3 4"/>'), '迟'],
  ['此番落败，下包再战', catFace('<path d="m13 25 8 3m7 0 8-3m-14 9q3-4 6 0M8 38l-4 4m36-4 4 4"/>'), '败'],
].map(([text, art, word], i) => { DOODLES['defeat-'+i] = art; return { text, art:'defeat-'+i, word } })

// 合成后的线索文件只含马赛克和选中的清晰格；领取者不能靠改 CSS 复原红包里的原图。
export async function makePacketClue(url, bits, doc = document) {
  if (!Number.isInteger(bits) || bits < 1 || bits > 511) throw Error('至少选择一个清晰区域')
  const win = doc.defaultView
  const image = new win.Image()
  image.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    const timer = win.setTimeout(() => { image.src = ''; reject(Error('图片读取超时，请换一张本站图片')) }, 10000)
    image.onload = () => { win.clearTimeout(timer); resolve() }
    image.onerror = () => { win.clearTimeout(timer); reject(Error('这张图片不能制作线索，请换一张本站图片')) }
    image.src = url
  })
  const original = Math.max(image.naturalWidth, image.naturalHeight)
  if (!original) throw Error('图片无法读取')
  const scale = Math.min(1, 1200 / original)
  const w = Math.max(1, Math.round(image.naturalWidth * scale)), h = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = doc.createElement('canvas'), mini = doc.createElement('canvas')
  canvas.width = w; canvas.height = h
  mini.width = Math.max(1, Math.ceil(w / 40)); mini.height = Math.max(1, Math.ceil(h / 40))
  const ctx = canvas.getContext('2d'), tiny = mini.getContext('2d')
  if (!ctx || !tiny) throw Error('当前浏览器无法制作图片线索')
  tiny.drawImage(image, 0, 0, mini.width, mini.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(mini, 0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  for (let i = 0; i < 9; i++) if (bits & (1 << i)) {
    const x = Math.floor(i % 3 * w / 3), y = Math.floor(Math.floor(i / 3) * h / 3)
    const x2 = Math.ceil((i % 3 + 1) * w / 3), y2 = Math.ceil((Math.floor(i / 3) + 1) * h / 3)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, x2 - x, y2 - y); ctx.clip()
    ctx.drawImage(image, 0, 0, w, h); ctx.restore()
  }
  let blob
  try { blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82)) }
  catch { throw Error('图片来源不允许安全合成，请换一张本站图片') }
  if (!blob) throw Error('图片线索生成失败')
  if (blob.size > 3 * 1024 * 1024) throw Error('图片线索超过 3 MB，请换一张图片')
  return new win.File([blob], 'redpack-clue.' + (blob.type === 'image/webp' ? 'webp' : 'png'), { type: blob.type })
}

export function openRedpacket({ anchor, group, archiveGroup, userId, message, accountOnly = false, autoGuess = null, autoOpen = false, claimOnOpen = false, onSent, onUpdate, onClose, h, icon, api, uploadCover, uploadClue, bagReminderSettings }) {
  const initialArchive=!!archiveGroup, initialCreate=!!group
  group=group||archiveGroup
  archiveGroup=archiveGroup||group
  let currentView=initialArchive?'archive':initialCreate?'create':'detail',createForm=null,nativeForm=null,navigationBusy=false
  let autoInspect=autoOpen
  let externalInspected=false
  let defeatScene
  let detailSeq=0
  let clockTimer=null
  const clocks=new Set(),passwords=new Map()
  const doc = anchor.ownerDocument, win = doc.defaultView
  if (doc.querySelector('.rpk-dialog')) return
  const lifetime=new win.AbortController()
  const bridge=(action,external)=>packetBridge(action,external,lifetime.signal)
  const content = h('div', { class: 'rpk-content' })
  const connectorPanel=h('div',{class:'rpk-content rpk-connector',hidden:true})
  let connectorReady=false
  const connectorButton=h('button',{type:'button',class:'rpk-connector-toggle','aria-label':'红包连接器','aria-pressed':'false',onclick:()=>showConnector(connectorPanel.hidden)},'连接器')
  const doodle = (name, cls = '') => h('span', { class: 'rpk-doodle ' + cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DOODLES[name]}</svg>` })
  const title = h('h2', { id: 'rpk-dialog-title' }, archiveGroup ? '群红包袋' : group ? '发红包' : '拆红包')
  const back = h('button', { type: 'button', class: 'rpk-back', 'aria-label': '返回红包列表', hidden: true,
    onclick: () => navigate(currentView==='open'?'open':archiveGroup?'archive':'open') }, '←')
  const close = h('button', { type: 'button', class: 'rpk-close', 'aria-label': '关闭红包', autofocus: true, onclick: () => dialog.close() }, icon('close'))
  const dialog = h('dialog', { class: 'rpk-dialog', 'aria-labelledby': 'rpk-dialog-title' },
    h('header', { class: 'rpk-head' }, back, doodle('open', 'rpk-mascot'), h('div',{class:'rpk-heading'}, title, group && h('p', null, '给「' + group.name + '」')), connectorButton, close), content,connectorPanel)
  const resize = () => {
    const vv = win.visualViewport
    dialog.style.setProperty('--rpk-height', Math.max(120, (vv?.height || win.innerHeight) - 16) + 'px')
    dialog.style.top = ((vv?.offsetTop || 0) + 8) + 'px'
  }
  dialog.addEventListener('keydown', e => {
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); dialog.close(); return }
    if (e.key !== 'Tab') return
    const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary')].filter(el => el.getClientRects().length)
    const first = items[0], last = items.at(-1)
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first?.focus() }
  })
  dialog.addEventListener('close', () => {
    lifetime.abort()
    clearClocks()
    win.removeEventListener('resize', resize); win.visualViewport?.removeEventListener('resize', resize); win.visualViewport?.removeEventListener('scroll', resize)
    dialog.remove(); if (anchor.isConnected) anchor.focus({ preventScroll: true }); onClose?.()
  }, { once: true })
  doc.body.append(dialog)
  resize(); win.addEventListener('resize', resize); win.visualViewport?.addEventListener('resize', resize); win.visualViewport?.addEventListener('scroll', resize)
  dialog.showModal(); close.focus({ preventScroll: true })
  const btn = (text, fn, cls = 'rpk-secondary') => h('button', { type: 'button', class: cls, onclick: fn }, text)
  const field = (label, input, help) => h('label', { class: 'rpk-field' }, h('span', null, label), input, help && h('small', null, help))
  const status = () => h('p', { class: 'rpk-status', role: 'status', 'aria-live': 'polite' })
  function clearClocks(){if(clockTimer!==null)win.clearInterval(clockTimer);clockTimer=null;clocks.clear()}
  function countdown(snapshot){
    if(packetCountdown(snapshot)===null)return null
    const node=h('time',{class:'rpk-countdown'})
    const update=()=>{node.textContent=packetCountdown(snapshot)}
    update();clocks.add(update)
    if(clockTimer===null)clockTimer=win.setInterval(()=>{for(const fn of clocks)fn()},1000)
    return node
  }
  const input = (label, extra = {}) => h('input', { class: 'rpk-input', type: 'text', 'aria-label': label, autocomplete: 'off', ...extra })
  const coverImage = url => url && h('img',{class:'rpk-cover',src:url,alt:'红包封面',onerror:e=>e.currentTarget.remove()})
  const medal = p => {
    const labels=[['桂','桂冠到手'],['挂','这手速，佩服'],['神','神速出击'],['稳','稳稳拿下'],['巧','好运正巧']]
    const label=labels[p.rank-1]
    return label && h('div',{class:'rpk-medal rpk-medal-'+p.rank},h('span',{class:'rpk-medal-mark','aria-hidden':'true'},label[0]),h('strong',null,label[1]),h('span',null,`${p.rank_scope || '开包次序'} · 第 ${p.rank} 名`))
  }
  const preview = (image, solved = false) => {
    const box = h('div', { class: 'rpk-image' + (solved ? ' revealed' : '') + (image.creator ? ' creator' : '') })
    const draw = () => {
      if (!image.u) { box.replaceChildren(h('p', { class: 'rpk-status' }, '旧红包没有安全图片线索，可根据文字提示猜谜底')); return }
      const failed = () => box.replaceChildren(h('p', { class: 'rpk-status' }, '图片加载失败，请关闭后重试'))
      const base = h('img', { src: image.u, alt: solved ? '完整的帖子图片' : '马赛克图片线索', onerror: failed, draggable: false })
      const peeks = image.creator && !solved ? Array.from({ length: 9 }, (_, i) => {
        if (!(image.bits & (1 << i))) return null
        const r = Math.floor(i / 3), c = i % 3
        return h('img', { class: 'rpk-image-peek', src: image.u, alt: '', draggable: false,
          style: { clipPath: `inset(${r * 100 / 3}% ${100 - (c + 1) * 100 / 3}% ${100 - (r + 1) * 100 / 3}% ${c * 100 / 3}%)` } })
      }).filter(Boolean) : []
      box.replaceChildren(base, ...peeks)
    }
    if (image.nsfw) box.append(btn('敏感图片 · 点击查看线索', draw))
    else draw()
    return box
  }

  const navigation=h('nav',{class:'rpk-flow-nav','aria-label':'红包操作'},[['open','开红包'],...(group?[['create','发红包'],['archive','群红包袋']]:[])].map(([key,label])=>btn(label,()=>navigate(key))))
  dialog.insertBefore(navigation,content)
  function navigate(view){
    if(navigationBusy)return
    showConnector(false);clearClocks();detailSeq++;message=null;externalInspected=false;defeatScene=null;currentView=view
    back.hidden=true;dialog.classList.remove('rpk-archive')
    for(const [i,b]of [...navigation.children].entries())b.setAttribute('aria-pressed',String(['open','create','archive'][i]===view))
    if(view==='create'){title.textContent='发红包';if(createForm)content.replaceChildren(createForm);else create()}
    else if(view==='archive')archive()
    else openExisting()
  }
  if(accountOnly){title.textContent='红包账户与发放记录';navigation.hidden=true;connectorButton.hidden=true;import('/redpacket-native.js?v=97fd912d').then(({nativeCreateForm})=>{if(dialog.isConnected)content.replaceChildren(nativeCreateForm({h,api,host:content,signal:lifetime.signal,accountOnly:true,onBack:()=>dialog.close()}))}).catch(e=>{if(dialog.isConnected)content.replaceChildren(h('p',{class:'rpk-status'},e.message))})}
  else if (initialArchive) navigate('archive')
  else if (initialCreate) navigate('create')
  else load()

  function openExisting(){
    title.textContent='开红包'
    const provider=h('select',{class:'rpk-input','aria-label':'已有红包平台'},[['auto','自动识别分享内容'],['hb','HB 红包'],['credit','Credit 红包'],['fish','Fish 红包']].map(([key,label])=>h('option',{value:key},label)))
    const reference=h('textarea',{class:'rpk-input',rows:3,maxlength:2000,'aria-label':'红包分享内容',placeholder:'粘贴整段分享消息或官方红包链接；只有口令时，先选平台'})
    const info=status(),submit=h('button',{class:'rpk-primary',type:'submit'},'查看并开红包')
    content.replaceChildren(h('form',{class:'rpk-form',onsubmit:async e=>{
      e.preventDefault();if(submit.disabled)return;submit.disabled=true;const seq=detailSeq
      try{
        const {parsePacketReference,packetReferenceUrl}=await import('/redpacket-reference.js?v=97fd912d')
        const parsed=parsePacketReference(reference.value,provider.value)
        if(!dialog.isConnected||seq!==detailSeq)return
        message=null;back.hidden=false;externalInspected=false;claimOnOpen=true
        renderExternal({provider:parsed.provider,external:{provider:parsed.provider,ref:parsed.external_ref,ref_kind:parsed.external_kind,url:packetReferenceUrl(parsed)}})
      }catch(e){info.textContent=e.message}finally{submit.disabled=false}
    }},field('所属平台',provider),field('分享内容 / 链接 / 口令',reference),h('p',{class:'rpk-help'},'点击后按平台规则领取或报名；不会向群里发送消息。'),info,submit))
  }

  function showConnector(open=true){
    content.hidden=open;connectorPanel.hidden=!open
    connectorButton.setAttribute('aria-pressed',String(open))
    if(!open){connectorButton.focus({preventScroll:true});return}
    if(!connectorReady){
      connectorReady=true
      const info=status()
      const check=btn('检测连接',async()=>{
        check.disabled=true;info.textContent='正在检测…'
        try{const state=await bridge('ping');info.textContent=state.fishErrorsV1?'已连接 · '+state.version+'。领取时使用当前浏览器登录的 HB、Credit 或 Fish 账号。':'已连接旧版 '+state.version+'。请复制下方新版脚本，覆盖保存后刷新本站。'}
        catch(e){info.textContent=e.message+'。已安装仍无法连接时，请更新到 1.5.2 并刷新本站。'}
        finally{check.disabled=false}
      },'rpk-primary')
      const copy=btn('复制连接器脚本',async()=>{
        copy.disabled=true
        try{const r=await win.fetch('/meme-redpacket.user.js',{cache:'no-store',signal:lifetime.signal}),source=await r.text();if(!r.ok||!source.startsWith('// ==UserScript=='))throw Error('脚本获取失败，请重试');await win.navigator.clipboard.writeText(source);info.textContent='已复制。已安装的用户请打开原“尽欢红包连接器”，全选覆盖保存，再刷新本站；首次安装才需新建脚本。'}
        catch(e){info.textContent=e.message||'复制失败，请下载脚本文件'}finally{copy.disabled=false}
      })
      connectorPanel.append(h('h3',null,'红包连接器 1.5.2'),h('p',{class:'rpk-help'},'查询、领取 HB / Credit / Fish 红包，并使用已绑定的平台账户创建红包。只在你打开红包或点击操作时请求，不自动抢包。'),check,info,
        h('p',{class:'rpk-help'},'已安装：点击下方“复制连接器脚本”，覆盖原脚本后保存并刷新本站。无需重复安装扩展。'),
        h('h4',null,'首次安装'),h('a',{class:'rpk-secondary',href:'https://www.tampermonkey.net/index.php?browser=chrome',target:'_blank',rel:'noopener noreferrer'},'1. 安装 Tampermonkey'),
        h('p',{class:'rpk-help'},'2. Chrome → 扩展程序 → Tampermonkey → 详情，开启“允许用户脚本”，允许访问本站。'),copy,
        h('p',{class:'rpk-help'},'3. Tampermonkey → 添加新脚本，粘贴并保存；刷新本站，再点击“检测连接”。如果下载后只看到一页代码，使用上面的复制方式。'),
        h('div',{class:'rpk-actions'},h('a',{class:'rpk-secondary',href:'/meme-redpacket.user.js',download:'meme-redpacket.user.js'},'下载脚本'),h('a',{class:'rpk-secondary',href:'/meme-redpacket.user.js',target:'_blank',rel:'noopener'},'查看源码')),
        h('h4',null,'登录红包平台'),h('p',{class:'rpk-help'},'在同一个浏览器登录自己要使用的平台；连接器不会保存平台密码或密钥。'),
        h('div',{class:'rpk-actions'},...Object.entries({HB:'https://hb.unsnow.org/',Credit:'https://credit.linux.do/',Fish:'https://hb.lafi.sh/'}).map(([name,url])=>h('a',{class:'rpk-secondary',href:url,target:'_blank',rel:'noopener noreferrer'},name))),
        btn('返回红包',()=>showConnector(false)))
    }
    connectorPanel.scrollTop=0
  }

  async function create() {
    const seq=detailSeq
    content.replaceChildren(h('p',{class:'rpk-help'},'正在加载发包设置…'))
    try{
      const {createPacketComposer}=await import('/packet-composer.js?v=97fd912d')
      if(!dialog.isConnected||seq!==detailSeq)return
      createForm=createPacketComposer({h,api,group,userId,host:content,signal:lifetime.signal,uploadCover,uploadClue,preview,makeClue:makePacketClue,autoGuess,onBusy:v=>{navigationBusy=v},onSent:m=>{onSent?.(m);dialog.close()}})
      autoGuess=null;content.replaceChildren(createForm)
      try{const previous=JSON.parse(win.localStorage.getItem(`creditPacketDraft:${userId}:${group.id}`)||'null');if(previous)createForm.querySelector('.rpk-composer-scroll').append(h('details',{class:'rpk-options'},h('summary',null,'旧 Credit 待确认订单'),h('p',{class:'rpk-help'},'旧草稿仍保留。请到 Credit 已发红包列表核对，已有红包可从“开红包”入口继续。'),h('a',{href:'https://credit.linux.do/home',target:'_blank',rel:'noopener noreferrer'},'核对原订单')))}catch{}
    }catch(e){if(dialog.isConnected)content.replaceChildren(h('p',{class:'rpk-status'},e.message),btn('重试',create))}
  }

  async function load() {
    clearClocks()
    const id=message.id, seq=++detailSeq
    content.replaceChildren(h('p', { class: 'rpk-help' }, '加载中…'))
    try {
      const d = await api(`/chat/messages/${id}/redpack`)
      if (!dialog.isConnected || seq!==detailSeq) return
      if (autoOpen && !d.packet.external && d.packet.mode==='phrase' && !d.packet.solved) {
        autoOpen=false
        const opened=await api(`/chat/messages/${id}/redpack/open`,{method:'POST',body:{}})
        if(dialog.isConnected && seq===detailSeq){onUpdate?.(opened.message);render(opened.packet)}
      } else render(d.packet)
    }
    catch (e) { if (dialog.isConnected && seq===detailSeq) content.replaceChildren(h('p', { class: 'rpk-status', role: 'alert' }, e.message), btn('重试', load)) }
  }
  function render(p,{celebrate=false}={}) {
    if(p.coin52){
      const seq=detailSeq,id=message.id;claimOnOpen=false;title.replaceChildren(dcoinIcon(h),' 红包')
      import('/coin52-packets.js?v=97fd912d').then(({coin52Detail})=>{if(!dialog.isConnected||seq!==detailSeq)return;content.replaceChildren(coin52Detail({h,api,packet:p,messageId:id,celebrate,onRefresh:(next,options)=>{if(dialog.isConnected&&seq===detailSeq)render(next,options)},onUpdate,onBusy:v=>{navigationBusy=v}}))}).catch(e=>content.replaceChildren(h('p',{class:'rpk-status'},e.message),btn('重试',load)))
      return
    }
    if(p.ldc){
      const seq=detailSeq,id=message.id,claimNow=claimOnOpen;claimOnOpen=false;title.textContent=p.ldc.draw?'红包抽奖':p.ldc.payment_provider==='coin52'?'D币红包':'LDC 红包'
      import('/redpacket-native.js?v=97fd912d').then(({nativePacketDetail})=>{
        if(!dialog.isConnected||seq!==detailSeq)return
        const show=packet=>{if(dialog.isConnected&&seq===detailSeq)render(packet)}
        content.replaceChildren(nativePacketDetail({h,api,messageId:id,packet:p,host:content,onRefresh:show,onBusy:value=>{navigationBusy=value},onPosted:()=>dialog.close()}))
        if(claimNow&&p.ldc.can_play!==false&&!p.ldc.draw&&!p.ldc.owner&&!p.ldc.mine&&['fixed','random'].includes(p.ldc.mode)&&p.ldc.state==='open'&&p.ldc.claimed_count<p.ldc.count){
          navigationBusy=true;api(`/chat/messages/${id}/ldc/claim`,{method:'POST',body:{}}).then(d=>show({...p,ldc:d.ldc})).catch(e=>{if(dialog.isConnected&&seq===detailSeq)content.append(h('p',{class:'rpk-status',role:'status'},e.message))}).finally(()=>{navigationBusy=false})
        }
      }).catch(e=>{if(dialog.isConnected&&seq===detailSeq)content.replaceChildren(h('p',{class:'rpk-status'},e.message),btn('重试',load))})
      return
    }
    if (p.external) return renderExternal(p)
    const id=message.id, seq=detailSeq
    title.textContent = p.solved ? '拆到啦！' : MODES[p.mode]
    const tagline = p.prompt ? h('p', { class: 'rpk-tagline' }, p.prompt) : null
    const reward=p.reward
    const rewardStatus=h('p',{class:'rpk-status',role:'status'},p.reward_error||reward?.mine?.error||'')
    const rewardSummary=reward&&h('div',{class:'rpk-credit'},
      packetAmount(h,reward.total,reward.payment_provider,'rpk-hero-amount'),
      h('p',{class:'rpk-help'},`奖励${reward.state==='open'?'进行中':'已结束'} · 截止 ${new Date(reward.ends_at*1000).toLocaleString('zh-CN')}`),
      reward.mine&&h('p',{class:'rpk-help'},`我的奖励：${reward.mine.amount} ${reward.currency||'LDC'} · ${fundingState(reward.mine.state,reward.payment_provider)}`),
      packetRecords({h,api,p:reward})
    )
    const claimReward=reward&&p.solved&&!reward.owner&&!reward.mine&&reward.state==='open'&&reward.claimed_count<reward.count&&btn('领取 '+(reward.currency||'LDC')+' 奖励',async()=>{
      if(navigationBusy)return
      navigationBusy=true;rewardStatus.textContent='正在核对解谜记录并锁定奖励…'
      try{const d=await api(`/chat/messages/${id}/ldc/claim`,{method:'POST',body:{}});if(dialog.isConnected&&seq===detailSeq)render({...p,reward:d.ldc,reward_error:''})}
      catch(e){rewardStatus.textContent=e.message}finally{navigationBusy=false}
    },'rpk-primary')
    const reconcileReward=(retry=false)=>async()=>{
      if(navigationBusy)return
      navigationBusy=true;rewardStatus.textContent='正在核对原单…'
      try{const d=await api(`/chat/messages/${id}/ldc/reconcile`,{method:'POST',body:{retry}});if(dialog.isConnected&&seq===detailSeq)render({...p,reward:d.ldc,reward_error:''})}
      catch(e){rewardStatus.textContent=e.message}finally{navigationBusy=false}
    }
    const rewardPending=reward?.mine&&['reserved','sent','unknown','rejected'].includes(reward.mine.state)||reward?.owner&&reward.recipients?.some(r=>['reserved','sent','unknown','rejected'].includes(r.state))
    if (p.solved) {
      content.replaceChildren(...[coverImage(p.cover),medal(p),h('div', { class: 'rpk-win' }, doodle('happy', 'rpk-celebrate'),
        p.secret&&h('div', { class: 'rpk-secret' }, p.secret), h('p', null, `${p.opened} 人拆过`)),
        rewardSummary,claimReward,rewardPending&&btn('核对发放结果',reconcileReward()),reward?.owner&&reward.recipients?.some(r=>r.state==='rejected')&&btn('重试明确失败的原单',reconcileReward(true)),reward&&btn('刷新奖励状态',async()=>{try{const d=await api(`/chat/messages/${id}/redpack`);if(dialog.isConnected&&seq===detailSeq)render(d.packet)}catch(e){rewardStatus.textContent=e.message}}),reward&&rewardStatus,
        p.image && preview(p.image, true), p.post_id && h('a', { class: 'rpk-secondary rpk-source', href: `/m/${p.post_id}`, target: '_blank', rel: 'noopener' }, `查看原帖 No.${p.post_id}`), btn('收好红包', () => dialog.close(), 'rpk-primary')].filter(Boolean))
      return
    }
    if (p.unavailable) { content.replaceChildren(h('p', { class: 'rpk-status' }, '图片暂不可用，请联系发包人。')); return }
    const info = status(), answer = input('输入谜底', { placeholder: `${p.length} 个字符，输入完整谜底`, maxlength: 72 })
    const submit = h('button', { type: 'submit', class: 'rpk-primary' }, p.mode === 'open' ? '拆！' : p.mode === 'phrase' ? '说好了，开！' : '就这个！')
    const extras = []
    if (p.mode === 'open') extras.push(doodle('open', 'rpk-waiting'))
    if (p.mode === 'phrase') extras.push(h('p', { class: 'rpk-help' }, '先在群里说出这段复读内容：'),
      h('blockquote', { class: 'rpk-cipher' }, p.phrase), btn('回群里复读', () => dialog.close()))
    if (p.mode === 'cipher') {
      extras.push(h('h3', { class: 'rpk-game-title' }, GAMES[p.game]?.[0] || '解个谜'), h('p', { class: 'rpk-help' }, GAMES[p.game]?.[1] || '根据提示输入谜底。'))
      if (p.clue.text) extras.push(h('div', { class: 'rpk-cipher' }, p.clue.text))
      if (p.clue.rows) extras.push(h('div',{class:'rpk-puzzle-rows','aria-label':GAMES[p.game][0]},p.clue.rows.map(row=>h('div',{class:'rpk-puzzle-row',style:{'--rpk-columns':row.length}},row.map(ch=>h('span',{class:ch===null?'is-empty':''},ch??''))))))
      if (p.clue.tiles) {
        const picked = [], slots = h('div', { class: 'rpk-slots', 'aria-live': 'polite' }, '谜底拼在这里')
        const tiles = h('div', { class: 'rpk-tiles' })
        const refresh = () => { answer.value = picked.map(i => p.clue.tiles[i]).join(''); slots.textContent = answer.value || '谜底拼在这里'; [...tiles.children].forEach((b, i) => { b.disabled = picked.includes(i) }) }
        tiles.append(...p.clue.tiles.map((ch, i) => btn(ch === ' ' ? '␣' : ch, () => { picked.push(i); refresh() }, 'rpk-tile')))
        extras.push(slots, tiles, h('div', { class: 'rpk-game-tools' }, btn('退一个字', () => { picked.pop(); refresh() }), btn('重新拼', () => { picked.length = 0; refresh() })))
        answer.readOnly = true
      }
    }
    if (p.mode === 'image') extras.push(preview(p.image))
    let busy = false
    const form = h('form', { class: 'rpk-form', onsubmit: async e => {
      e.preventDefault(); if (busy) return
      busy = true; submit.disabled = true; info.textContent = '正在开包…'
      try {
        const d = await api(`/chat/messages/${id}/redpack/open`, { method: 'POST', body: { answer: answer.value } })
        onUpdate?.(d.message); if (dialog.isConnected && seq===detailSeq) render(d.packet)
      } catch (e) { if(seq===detailSeq)info.textContent = e.message }
      finally { busy = false; submit.disabled = false }
    } }, coverImage(p.cover),tagline,rewardSummary, extras, !['open', 'phrase'].includes(p.mode) && p.game !== 'tiles' && field('谜底', answer), info, submit)
    content.replaceChildren(form)
  }

  function renderExternal(p) {
    clearClocks()
    const id=message?.id, seq=detailSeq
    const platform=({hb:'HB',credit:'Credit',fish:'Fish'})[p.provider]||'红包平台'
    title.textContent=PROVIDERS[p.provider] || '平台红包'
    const snapshot=p.snapshot, draw=p.draw||snapshot, won=snapshot?.claimed, lost=!won && snapshot?.state==='exhausted'
    if(lost && !defeatScene)defeatScene=DEFEATS[Math.floor(Math.random()*DEFEATS.length)]
    const scene=lost?defeatScene:null
    const state=won?'拆到啦！':scene?scene.text:({login:'请先登录 '+platform,own:'这是你发出的红包',exclusive:'这是指定用户的专属红包'})[snapshot?.blocked]||STATES[snapshot?.state] || '领取 '+platform+' 红包'
    const info=status(), visual=h('div',{class:'rpk-win'+(lost?' rpk-defeat':'')+(scene?.word?' rpk-ink-defeat':'')},
      scene?.word && h('span',{class:'rpk-defeat-word','aria-hidden':'true'},scene.word),doodle(won?'happy':scene?scene.art:'open','rpk-celebrate'),
      h('strong',{class:'rpk-result-title'},state),won && snapshot.amount!==null && h('div',{class:'rpk-secret'},'+'+snapshot.amount+' LDC'),
      snapshot && h('p',null,[KINDS[snapshot.kind] || platform+' 红包',snapshot.claimed_count!=null?`已领 ${snapshot.claimed_count} / ${snapshot.total ?? '?'} 份`:snapshot.remaining!=null?`剩 ${snapshot.remaining} / ${snapshot.total ?? '?'} 个`:null,
        snapshot.participant_count!=null?`${snapshot.participant_count} 人报名`:null,snapshot.winner_count!=null?`${snapshot.winner_count} 人中奖`:null].filter(Boolean).join(' · ')))
    const queried=h('div',{class:'rpk-help'},h('p',null,p.synced_at?'个人查询 · '+new Date(p.synced_at*1000).toLocaleString('zh-CN',{hour12:false}):'使用当前浏览器的 '+platform+' 登录账号'),
      countdown(draw),
      snapshot?.expires_at && h('p',null,(snapshot.kind==='lottery'?'开奖时间 ':snapshot.kind==='timed_draw'?'报名截止 / 最晚开奖 ':'截止 ')+new Date(snapshot.expires_at*1000).toLocaleString('zh-CN',{hour12:false})),
      p.notify_at && h('p',null,'到点提醒 '+new Date(p.notify_at*1000).toLocaleString('zh-CN',{hour12:false})))
    const query=btn('刷新状态',()=>connect('query')), claim=btn('领取 '+platform+' 红包',()=>connect('claim'),'rpk-primary')
    const canClaim=canClaimExternalPacket(p.provider,p.external,snapshot)
    claim.hidden=!canClaim
    if(p.provider==='fish'&&p.external.ref_kind==='text'&&snapshot?.state==='unmatched'){
      query.hidden=true
      claim.textContent='核对口令并拆包'
    }
    if(['timed_draw','lottery'].includes(snapshot?.kind))claim.textContent='参与 '+platform+' 抽奖'
    const unsupported=snapshot?.state==='active'&&!won&&!canClaim&&!snapshot.blocked ? h('p',{class:'rpk-help'},'请打开 '+platform+' 参与这个玩法。') : null
    const passwordKey=p.provider+':'+p.external.ref
    const packetPassword=input(platform+' 活动口令',{placeholder:'粘贴 '+platform+' 活动口令',maxlength:18,value:passwords.get(passwordKey)||p.external.code||''})
    packetPassword.addEventListener('input',()=>passwords.set(passwordKey,packetPassword.value))
    const passwordField=p.external.ref_kind==='id'&&['hb','fish'].includes(p.provider)?field('活动口令',packetPassword,p.provider==='hb'?'有口令可粘贴核对当前红包；查询不会报名。':'口令活动在此填写；直接参与的红包可留空。'):null
    packetPassword.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();connect('claim')}})
    const link=h('a',{class:'rpk-secondary rpk-source',href:p.external.url,target:'_blank',rel:'noopener noreferrer'},'打开 '+platform)
    const copy=btn('复制 '+platform+' 口令',async()=>{try{await win.navigator.clipboard.writeText(p.external.ref);info.textContent='已复制'}catch{info.textContent='请手动复制：'+p.external.ref}})
    const connectorHint=btn('安装 / 检测红包连接器',()=>showConnector(true));connectorHint.hidden=true
    const roster=(label,list)=>{
      if(!Array.isArray(list)||!list.length)return null
      const ranks=label==='领取记录'?packetLuckRanks(list,['exhausted','expired','drawn'].includes(snapshot?.state)&&!snapshot?.roster_more&&!snapshot?.roster_error):[]
      const rows=list.map((person,index)=>{const rank=label==='领取记录'&&p.provider==='fish'&&['king','last'].includes(person.luck)?person.luck:ranks[index];return h('li',null,h('span',null,person.name||person.username||'匿名用户',rank&&h('b',{class:'rpk-luck '+rank},rank==='king'?'手气王':'手气亡')),h('span',null,
        [person.amount!=null?person.amount+' LDC':null,person.payout==='paid'?'已发放':person.payout==='pending'?'发放中':({won:'中奖',not_won:'未中奖',registered:'已报名',drawing:'开奖中'})[person.result]].filter(Boolean).join(' · ')))})
      return h('details',{class:'rpk-roster'},h('summary',null,label+'（'+list.length+'）'),h('ul',null,rows))
    }
    content.replaceChildren(...[coverImage(p.cover),p.prompt&&h('p',{class:'rpk-tagline'},p.prompt),won&&medal(p),visual,queried,passwordField,claim,unsupported,
      roster('中奖名单',snapshot?.winners||draw?.winners),roster('参与名单',snapshot?.participants),roster('领取记录',snapshot?.recipients),
      snapshot?.roster_more&&h('p',{class:'rpk-help'},'当前显示 '+Math.max(snapshot?.recipients?.length||0,snapshot?.winners?.length||0,snapshot?.participants?.length||0)+' 条，完整名单可在 '+platform+' 查看。'),snapshot?.roster_error&&h('p',{class:'rpk-help'},'名单暂未读取成功，可刷新重试。'),
      h('div',{class:'rpk-actions'},query,link),...(['hb','fish'].includes(p.provider)&&p.external.ref_kind!=='id'?[h('blockquote',{class:'rpk-cipher'},p.external.ref),copy]:[]),info,connectorHint].filter(Boolean))
    let busy=false
    async function connect(action) {
      if(busy)return;busy=true;query.disabled=claim.disabled=true;info.textContent=action==='claim'?(p.provider==='fish'&&p.external.ref_kind==='text'?'正在向 fish 核对口令与领取结果…':'正在核对并领取…'):'正在查询…'
      try {
        const connected=await bridge('ping')
        if(!connected.participationV2 || p.provider==='fish'&&!connected.fishV2)throw Error('请打开顶部“连接器”，复制并更新脚本，再刷新本站')
        const result=await bridge(action,{...p.external,password:passwordField?packetPassword.value:undefined})
        const saved=id?await api(`/chat/messages/${id}/redpack/sync`,{method:'POST',body:result}):{packet:{...p,snapshot:result,synced_at:Math.floor(Date.now()/1000)}}
        if(saved.message)onUpdate?.(saved.message)
        if(dialog.isConnected && seq===detailSeq)renderExternal(saved.packet)
      } catch(e) {if(dialog.isConnected && seq===detailSeq){info.textContent=e.message;connectorHint.hidden=false}}
      finally {busy=false;query.disabled=claim.disabled=false}
    }
    if(autoInspect || !externalInspected){
      autoInspect=false;externalInspected=true
      const claimNow=claimOnOpen;claimOnOpen=false
      if(claimNow)connect('claim');else connect('query')
    }
  }

  function archive() {
    title.textContent='群红包袋'
    dialog.classList.add('rpk-archive')
    back.hidden=true
    let view='pending',before=null,loading=false,ticket=0,scanBefore=null,scanned=false
    const list=h('div',{class:'rpk-archive-list'}),info=status(),scopeNote=h('p',{class:'rpk-hint'})
    const categories=[['pending','待拆'],['check','待确认'],['puzzle','猜谜'],['mine','我发的'],['history','历史']]
    const tabs=categories.map(([key,label])=>btn(label,()=>change(key)))
    const refresh=btn('刷新',()=>change(view)),more=btn('再翻一页',()=>draw(false))
    const scan=btn('整理旧分享',async()=>{
      if(loading)return
      try{await importShares();await draw(true)}catch(e){info.textContent='旧分享暂未整理：'+e.message}
    })
    const controls=h('div',{class:'rpk-archive-tabs','aria-label':'群红包袋分类'},...tabs)
    content.replaceChildren(...[bagReminderSettings?.(archiveGroup.id),controls,scopeNote,h('div',{class:'rpk-actions'},btn('发包榜',senderBoard),refresh,scan),list,info,more].filter(Boolean))
    function change(next){if(loading)return;view=next;before=null;draw(true)}
    async function importShares(){
      scan.disabled=true
      try {
        const d=await api(`/chat/groups/${archiveGroup.id}/redpacks/import`,{method:'POST',body:{scope:'all',before:scanBefore}})
        scanBefore=d.next;scanned=true;scan.textContent=d.next?'继续整理旧分享':'旧分享已整理至此'
      } finally {scan.disabled=scanned&&!scanBefore}
    }
    async function draw(reset){
      if(loading)return;loading=true;const mine=++ticket;info.textContent='正在装进红包袋…';more.disabled=true
      tabs.forEach((button,index)=>button.setAttribute('aria-pressed',String(categories[index][0]===view)))
      scopeNote.textContent=view==='history'?'往日红包与今日已结束的记录。归档不影响原红包领取。':'仅显示北京时间今天发布的红包，往日红包请到“历史”查看。'
      if(reset){clearClocks();list.replaceChildren()}
      try {
        if(reset)before=null
        const d=await api(`/chat/groups/${archiveGroup.id}/redpacks?view=${view}${before?'&before='+before:''}`)
        if(mine!==ticket || !dialog.isConnected)return
        list.append(...d.items.map(m=>{
          const p=m.redpack,s=p?.snapshot,label=m.deleted?'已撤回':view==='check'?'状态待确认，点开查询':p?.game==='free_guess'?'点击查看猜词结果':p?.game==='ldc'?view==='pending'?'有 LDC 待领':'点击查看领取结果':s?.claimed?'已领取':s?.state==='expired'?'已过期':s?.remaining===0||s?.total!=null&&s?.claimed_count>=s.total?'已领完':STATES[s?.state] || (p?.provider==='native' ? p.solved?'已拆':'待拆' : '状态待确认')
          return btn([p?.cover?h('img',{class:'rpk-archive-cover',src:p.cover,alt:'',loading:'lazy'}):h('span',{class:'rpk-archive-icon'},p?.provider==='coin52'?dcoinIcon(h):icon('redpack')),h('span',{class:'rpk-archive-copy'},h('strong',null,p?.prompt || `${m.user.name || m.user.username}的红包`),
            h('span',null,`${p?.game==='free_guess'?'无奖励猜词':p?.game==='ldc'?'本站 LDC':p?.provider==='coin52'?'红包':PROVIDERS[p?.provider] || '红包'} · ${label}`),view==='history'&&h('time',null,'发布于 '+new Date(m.created_at*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）'),p?.notify_at && h('time',null,'到点提醒 '+new Date(p.notify_at*1000).toLocaleString('zh-CN',{hour12:false})),
            countdown(p?.draw||s),s?.expires_at&&!['lottery','timed_draw'].includes(s.kind) && h('time',null,'截止 '+new Date(s.expires_at*1000).toLocaleString('zh-CN',{hour12:false})))],()=>{
              if(m.deleted)return
              message=m
              externalInspected=false;claimOnOpen=view==='pending'
              back.hidden=false
              dialog.classList.remove('rpk-archive')
              load()
            },'rpk-archive-item'+(m.deleted?' is-gone':''))
        }))
        list.querySelectorAll('.is-gone').forEach(b=>b.disabled=true)
        before=d.next;more.hidden=!d.more;info.textContent=list.children.length?'':'这一类暂时没有红包'
      }catch(e){if(mine===ticket)info.textContent=e.message}
      finally{if(mine===ticket){loading=false;more.disabled=false}}
    }
    draw(true)
  }

  function senderBoard(){
    clearClocks();title.textContent='本群发包榜';back.hidden=false
    let period='today',metric='count',ticket=0,request=null
    const list=h('ol',{class:'rpk-rank-list'}),info=status(),mine=h('p',{class:'rpk-rank-mine'}),note=h('p',{class:'rpk-hint'})
    info.classList.add('rpk-rank-status')
    const periods=[['today','今日'],['all','总榜']],metrics=[['count','发包次数'],['paid','确认发放'],['declared','创建奖池']]
    const periodButtons=periods.map(([key,label])=>btn(label,()=>{period=key;draw()}))
    const metricButtons=metrics.map(([key,label])=>btn(label,()=>{metric=key;draw()}))
    const refresh=btn('更新榜单',draw)
    content.replaceChildren(h('div',{class:'rpk-rank-tabs','aria-label':'发包榜周期'},...periodButtons),h('div',{class:'rpk-rank-tabs','aria-label':'发包榜口径'},...metricButtons),note,mine,list,info,refresh)
    async function draw(){
      request?.abort();request=new AbortController();const current=request,seq=++ticket
      periodButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(periods[i][0]===period)))
      metricButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(metrics[i][0]===metric)))
      info.classList.remove('is-error');info.textContent='正在读取榜单…';mine.textContent='';list.replaceChildren();refresh.disabled=true
      note.textContent='仅统计本站原生 LDC 红包；转发的 HB / Fish / Credit 链接不计。'+(metric==='paid'?'金额按平台确认发放的日期累计，待核对或失败订单不计。此榜每日结算前三奖励；到账以 Credit 为准。':metric==='declared'?'奖池是创建时承诺的额度，包含尚未领取部分，不代表实际发出，不参与额度奖励。':'按成功创建的日期累计次数，包含尚未领完的红包；无奖励猜词不计。此榜每日结算前三奖励。')
      try{
        const data=await api(`/chat/groups/${archiveGroup.id}/sender-stats?period=${period}&metric=${metric}`,{signal:current.signal})
        if(seq!==ticket||!list.isConnected)return
        const value=n=>metric==='count'?n+' 次':(n/100).toFixed(2)+' LDC'
        mine.textContent='我：'+value(data.mine.value)+(data.mineRank?' · 第 '+data.mineRank+' 名':' · 暂未上榜')
        list.replaceChildren(...(data.leaders.length?data.leaders.map((p,i)=>h('li',{class:i<3?'is-podium':''},h('span',{class:'rpk-rank-place'},i+1),p.avatar?avatarImage(h,p.avatar,'',28):h('span',{class:'rpk-rank-avatar','aria-hidden':'true'},(p.name||'群')[0]),h('span',{class:'rpk-rank-name'},p.name||'群成员'),h('strong',null,value(p.value)))):[h('li',null,'这段时间还没有对应记录')]))
        info.textContent=(period==='today'?'北京时间 '+data.today:'本站累计记录')+' · 前20名 · 同分按较早达成、用户编号排序'
      }catch(error){if(error.name!=='AbortError'&&seq===ticket&&list.isConnected){info.classList.add('is-error');info.textContent='榜单读取失败：'+error.message+'；可以更新重试。'}}
      finally{if(seq===ticket)refresh.disabled=false}
    }
    draw()
  }
}
