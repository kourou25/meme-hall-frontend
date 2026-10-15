// 按需加载。所有 DOM 挂到入口所在文档，普通群聊 / 分屏 / 小窗共用。
const MODES = { open: '直接开', phrase: '对暗号', cipher: '解个谜', image: '猜张图' }
const GAMES = {
  rails: ['双轨密码', '上下两行交替取字，先上后下。上行从左往右，下行从右往左。'],
  stairs: ['回廊字阵', '从最下面一行的左边出发，读完往上一行，换个方向继续读。空格跳过。'],
  radio: ['两步电台', '先把末尾两个字搬到最前，再将每两个字交换位置；落单的字不动。'],
  reverse: ['倒放咒语 · 入门', '从右往左读。'], pairs: ['错位电波 · 入门', '每两个字交换，落单的字不动。'], tiles: ['弹幕拼字', '点字块，拼出谜底。'],
}
const PROVIDERS = { native: '站内解谜', hb: 'HB 红包', credit: 'Credit 红包', fish:'Fish 红包' }
const STATES = { active: '可领取', exhausted: '被抢光啦', expired: '已过期', cancelled: '已取消', drawn: '已开奖', unmatched:'口令待匹配',registered:'已报名，等待开奖',drawing:'正在开奖',not_won:'这次未中奖',payment_pending:'奖励等待发放',simulation:'模拟奖励，不产生真实转账',draft:'还没开放',unconfirmed:'上次领取结果待核对' }
const KINDS = { fixed: '普通', equal: '普通', random: '拼手气', exclusive: '专属', lottery: '抽奖', custom:'自定义金额',timed_draw:'限时开奖',password:'口令兑奖',text:'文本 / CDK' }
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
    const receive=e=>{if(e.source===window && e.origin===location.origin && e.data?.type==='meme-redpacket-result' && e.data.id===id)finish(e.data.error?Error(e.data.error):null,e.data.result)}
    const abort=()=>finish(Error('操作已取消'))
    const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value)}
    window.addEventListener('message',receive)
    signal?.addEventListener('abort',abort,{once:true})
    window.postMessage({type:'meme-redpacket-request',id,action,external},location.origin)
  })
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

export function openRedpacket({ anchor, group, archiveGroup, userId, message, autoOpen = false, onSent, onUpdate, onClose, h, icon, api, uploadCover, uploadClue }) {
  const initialArchive=!!archiveGroup, initialCreate=!!group
  group=group||archiveGroup
  archiveGroup=archiveGroup||group
  let currentView=initialArchive?'archive':initialCreate?'create':'detail',createForm=null,navigationBusy=false
  let autoInspect=autoOpen
  let externalInspected=false
  let defeatScene
  let detailSeq=0
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
    const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')].filter(el => el.getClientRects().length)
    const first = items[0], last = items.at(-1)
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first?.focus() }
  })
  dialog.addEventListener('close', () => {
    lifetime.abort()
    win.removeEventListener('resize', resize); win.visualViewport?.removeEventListener('resize', resize); win.visualViewport?.removeEventListener('scroll', resize)
    dialog.remove(); if (anchor.isConnected) anchor.focus({ preventScroll: true }); onClose?.()
  }, { once: true })
  doc.body.append(dialog)
  resize(); win.addEventListener('resize', resize); win.visualViewport?.addEventListener('resize', resize); win.visualViewport?.addEventListener('scroll', resize)
  dialog.showModal(); close.focus({ preventScroll: true })
  const btn = (text, fn, cls = 'rpk-secondary') => h('button', { type: 'button', class: cls, onclick: fn }, text)
  const field = (label, input, help) => h('label', { class: 'rpk-field' }, h('span', null, label), input, help && h('small', null, help))
  const status = () => h('p', { class: 'rpk-status', role: 'status', 'aria-live': 'polite' })
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
    showConnector(false);detailSeq++;message=null;externalInspected=false;defeatScene=null;currentView=view
    back.hidden=true;dialog.classList.remove('rpk-archive')
    for(const [i,b]of [...navigation.children].entries())b.setAttribute('aria-pressed',String(['open','create','archive'][i]===view))
    if(view==='create'){title.textContent='发红包';if(createForm)content.replaceChildren(createForm);else create()}
    else if(view==='archive')archive()
    else openExisting()
  }
  if (initialArchive) navigate('archive')
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
        const {parsePacketReference,packetReferenceUrl}=await import('/redpacket-reference.js?v=66598537')
        const parsed=parsePacketReference(reference.value,provider.value)
        if(!dialog.isConnected||seq!==detailSeq)return
        message=null;back.hidden=false;externalInspected=false
        renderExternal({provider:parsed.provider,external:{provider:parsed.provider,ref:parsed.external_ref,ref_kind:parsed.external_kind,url:packetReferenceUrl(parsed)}})
      }catch(e){info.textContent=e.message}finally{submit.disabled=false}
    }},field('所属平台',provider),field('分享内容 / 链接 / 口令',reference),h('p',{class:'rpk-help'},'先查看红包状态，点击领取或报名后才参与；不会向群里发送消息。'),info,submit))
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
        try{const state=await bridge('ping');info.textContent=state.participationV2?'已连接 · '+state.version+'。领取时使用当前浏览器登录的 HB、Credit 或 Fish 账号。':'已连接旧版 '+state.version+'。请复制下方新版脚本，覆盖保存后刷新本站。'}
        catch(e){info.textContent=e.message+'。已安装仍无法连接时，请更新到 1.3.0 并刷新本站。'}
        finally{check.disabled=false}
      },'rpk-primary')
      const copy=btn('复制连接器脚本',async()=>{
        copy.disabled=true
        try{const r=await win.fetch('/meme-redpacket.user.js',{cache:'no-store',signal:lifetime.signal}),source=await r.text();if(!r.ok||!source.startsWith('// ==UserScript=='))throw Error('脚本获取失败，请重试');await win.navigator.clipboard.writeText(source);info.textContent='已复制。已安装的用户请打开原“尽欢红包连接器”，全选覆盖保存，再刷新本站；首次安装才需新建脚本。'}
        catch(e){info.textContent=e.message||'复制失败，请下载脚本文件'}finally{copy.disabled=false}
      })
      connectorPanel.append(h('h3',null,'红包连接器 1.3.0'),h('p',{class:'rpk-help'},'查询、领取 HB / Credit / Fish 红包，并使用已绑定的平台账户创建红包。只在你打开红包或点击操作时请求，不自动抢包。'),check,info,
        h('p',{class:'rpk-help'},'已安装：点击下方“复制连接器脚本”，覆盖原脚本后保存并刷新本站。无需重复安装扩展。'),
        h('h4',null,'首次安装'),h('a',{class:'rpk-secondary',href:'https://www.tampermonkey.net/index.php?browser=chrome',target:'_blank',rel:'noopener noreferrer'},'1. 安装 Tampermonkey'),
        h('p',{class:'rpk-help'},'2. Chrome → 扩展程序 → Tampermonkey → 详情，开启“允许用户脚本”，允许访问本站。'),copy,
        h('p',{class:'rpk-help'},'3. Tampermonkey → 添加新脚本，粘贴并保存；刷新本站，再点击“检测连接”。如果下载后只看到一页代码，使用上面的复制方式。'),
        h('div',{class:'rpk-actions'},h('a',{class:'rpk-secondary',href:'/meme-redpacket.user.js',download:'meme-redpacket.user.js'},'下载脚本'),h('a',{class:'rpk-secondary',href:'/meme-redpacket.user.js',target:'_blank',rel:'noopener'},'查看源码')),
        h('h4',null,'登录红包平台'),h('p',{class:'rpk-help'},'在同一个浏览器登录自己要使用的平台；连接器不会保存平台密码或密钥。'),
        h('div',{class:'rpk-actions'},...Object.entries({HB:'https://hb.unsnow.org/',Credit:'https://credit.linux.do/',Fish:'https://meme.442224.xyz/'}).map(([name,url])=>h('a',{class:'rpk-secondary',href:url,target:'_blank',rel:'noopener noreferrer'},name))),
        btn('返回红包',()=>showConnector(false)))
    }
    connectorPanel.scrollTop=0
  }

  function create() {
    let mode = 'open', selected = null, selectedIndex = 0, maskBits = 1 << 4, searchSeq = 0, busy = false, cover=null, coverBusy=false, clueUpload=null, clueFor=''
    const draftKey=`creditPacketDraft:${userId}:${group.id}`
    let draft=null
    try{draft=JSON.parse(win.localStorage.getItem(draftKey)||'null')}catch{}
    if(!/^[a-f0-9-]{36}$/i.test(draft?.nonce||'') || draft?.id && !/^[1-9]\d{0,19}$/.test(draft.id))draft=null
    const creditNonce=draft?.nonce || crypto.randomUUID()
    const packetNonces=Object.fromEntries(Object.keys(PROVIDERS).map(key=>[key,crypto.randomUUID()]))
    let createdId=draft?.id || null
    const provider = h('input',{type:'hidden',value:'native'})
    const platforms = h('div',{class:'rpk-platforms',role:'group','aria-label':'红包方式'},Object.entries(PROVIDERS).map(([key,name])=>btn(name,()=>{provider.value=key;sync()},'rpk-secondary')))
    const externalHelp = h('div',{class:'rpk-help'})
    const creditChoice=h('select',{class:'rpk-input','aria-label':'LDC 红包来源'},h('option',{value:'new'},'创建新红包'),h('option',{value:'existing'},'分享已有红包到群里'))
    const platformSlot=h('div',{}),platformWidgets=new Map(),platformLoading=new Map()
    async function ensurePlatform(key){
      if(platformWidgets.has(key))return platformWidgets.get(key)
      if(!platformLoading.has(key))platformLoading.set(key,(async()=>{
        const {platformCreateForm}=await import('/redpacket-create-ui.js?v=86223c40')
        const widget=platformCreateForm({provider:key,userId,groupId:group.id,h,bridge,win,onState:state=>{
          if(provider.value===key&&creditChoice.value==='new'){hint.disabled=busy||state.locked;if(state.greeting!==undefined)hint.value=state.greeting}
        }})
        platformWidgets.set(key,widget);return widget
      })().catch(e=>{platformLoading.delete(key);throw e}))
      return platformLoading.get(key)
    }
    const creditKind=h('select',{class:'rpk-input','aria-label':'LDC 红包类型'},h('option',{value:'random'},'拼手气'),h('option',{value:'fixed'},'普通红包'))
    const creditAmount=input('LDC 总额',{inputmode:'decimal',placeholder:'至少 1 LDC'})
    const creditCount=input('红包份数',{type:'number',min:1,max:10000,step:1,placeholder:'发给几个人？'})
    if(['fixed','random'].includes(draft?.params?.kind))creditKind.value=draft.params.kind
    if(typeof draft?.params?.amount==='string')creditAmount.value=draft.params.amount
    if(Number.isSafeInteger(draft?.params?.count))creditCount.value=String(draft.params.count)
    const creditFields=h('div',{class:'rpk-credit'},field('类型',creditKind),field('总额 · LDC',creditAmount),field('份数',creditCount),h('p',{class:'rpk-help'},'支付口令只在 Credit 来源窗口输入。'))
    const externalRef = input('红包链接或口令',{placeholder:'粘贴完整分享内容或官方链接',maxlength:2000})
    const externalField = field('分享已有红包到群里',externalRef,'整段分享文案也可以；链接用于定位红包，活动口令按平台规则填写。')
    const notifyAt = input('到点提醒',{type:'datetime-local'})
    const reminder = h('details',{class:'rpk-options'},h('summary',null,'加个到点提醒'),field('提醒时间',notifyAt))
    const secret = input('红包谜底', { placeholder: '藏点什么？6–18 个字', maxlength: 72 })
    const secretField = field('谜底',secret)
    const count = h('span', { class: 'rpk-count' })
    secret.addEventListener('input', () => { const n = [...secret.value.normalize('NFC').trim()].length; count.textContent = n ? `${n} / 18` : '' })
    const hint = input('红包线索', { placeholder: '给个提示（可不填）', maxlength: 240 })
    if(typeof draft?.params?.greeting==='string')hint.value=draft.params.greeting
    const phrase = input('群聊口令', { placeholder: '在群里说哪句？', maxlength: 160 })
    const game = h('select', { class: 'rpk-input', 'aria-label': '解密玩法' }, Object.entries(GAMES).map(([key, v]) => h('option', { value: key }, v[0])))
    const gameHelp = h('p', { class: 'rpk-help' }, GAMES.rails[1])
    game.addEventListener('change', () => { gameHelp.textContent = GAMES[game.value][1]; sync() })
    const phraseField = field('暗号', phrase)
    const gameField = h('div', null, field('玩法', game), gameHelp)
    const results = h('div', { class: 'rpk-post-results' }), chosen = h('div', { class: 'rpk-chosen' })
    const search = input('搜索帖子', { placeholder: '输入帖子编号或关键词', inputmode: 'search' })
    const searchBtn = btn('找图', findPosts)
    search.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findPosts() } })
    const sourceField = h('div', null, field('选张图', h('div', { class: 'rpk-search-row' }, search, searchBtn)), results, chosen)
    const modes = h('div', { class: 'rpk-modes', role: 'group', 'aria-label': '开包方式' }, Object.entries(MODES).map(([key, v]) => btn(
      [doodle(key), h('strong', null, v)], () => { mode = key; sync() }, 'rpk-mode')))
    const msg = status()
    const submit = h('button', { class: 'rpk-primary', type: 'submit' }, '塞好，发出去！')
    const coverPreview=h('div',{class:'rpk-cover-preview'})
    const coverInput=h('input',{type:'file',class:'sr-only',accept:'image/png,image/jpeg,image/gif,image/webp','aria-label':'选择红包封面',onchange:async()=>{
      const file=coverInput.files?.[0];if(!file || coverBusy)return
      coverBusy=true;submit.disabled=true;coverButton.disabled=true;msg.textContent='正在准备封面…'
      try{
        const {cropPacketCover}=await import('/redpacket-cover.js?v=910a70bc')
        const cropped=await cropPacketCover(file,{host:content,form,doc,h,signal:lifetime.signal})
        if(!cropped||!dialog.isConnected){msg.textContent='';return}
        msg.textContent='正在上传裁剪后的封面…'
        const uploaded=await uploadCover(cropped,lifetime.signal)
        if(dialog.isConnected){cover=uploaded;coverPreview.replaceChildren(coverImage(cover.url),btn('移除封面',()=>{cover=null;coverPreview.replaceChildren()}));msg.textContent=''}
      }
      catch(e){msg.textContent=e.message}
      finally{coverBusy=false;submit.disabled=busy;coverButton.disabled=false;coverInput.value='';if(dialog.isConnected)coverButton.focus({preventScroll:true})}
    }})
    const coverButton=btn('选择图片并裁剪封面',()=>coverInput.click())
    const form = h('form', { class: 'rpk-form', onsubmit: async e => {
      e.preventDefault(); if (busy || coverBusy) return
      const packetMode=provider.value==='native'?mode:'open'
      const value = secret.value.normalize('NFC').trim(), n = [...value].length
      if (!secretField.hidden && (n < 6 || n > 18)) { msg.textContent = '谜底需要 6–18 个字符'; return }
      if (packetMode === 'image' && !selected) { msg.textContent = '先选一张帖子的图片'; return }
      const direct=provider.value==='credit' && creditChoice.value==='new'
      const platformDirect=['hb','fish'].includes(provider.value)&&creditChoice.value==='new'
      const packetProvider=provider.value
      let nonce=direct?creditNonce:packetNonces[packetProvider],platformResult=null,platformWidget=null
      // 未确认的 Credit 操作保留原参数和幂等标识，但不能锁住其他红包方式。
      const createParams=direct?{...(draft?.params || {kind:creditKind.value,amount:creditAmount.value.trim(),count:Number(creditCount.value),greeting:hint.value.trim()}),provider:'credit',operation:creditNonce}:null
      if(direct && !createdId){
        const total=createParams.amount,pieces=createParams.count
        if(!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(total)||Number(total)<1||!Number.isSafeInteger(pieces)||pieces<1||pieces>10000||Math.round(Number(total)*100)<pieces){msg.textContent='填写至少 1 LDC 的总额，每份至少 0.01 LDC，最多 10000 份';return}
        if([...hint.value.trim()].length>100){msg.textContent='祝福语最多 100 字';return}
      }
      // 保留用户手势打开窗口；先确认连接器收到了参数，再进入 Credit 扣款页。
      const popup=direct && !createdId ? win.open('about:blank','jh-credit-'+nonce,'popup,width=500,height=720') : null
      if(direct && !createdId && !popup){msg.textContent='Chrome 拦截了 Credit 确认窗口；允许本站弹窗后再试';return}
      if(popup)try{
        popup.opener=null
        popup.document.title='正在连接 Credit 红包'
        popup.document.body.textContent='正在连接红包脚本，请回群聊窗口查看进度…'
      }catch{}
      busy = true; navigationBusy=true; sync(false); msg.textContent = '正在封装…'
      let creditNavigated=false
      try {
        if(platformDirect){
          platformWidget=await ensurePlatform(packetProvider)
          const connected=await bridge('ping')
          if(!connected.platformCreateV1)throw Error('请更新到1.3.0红包连接器后创建HB/Fish红包')
          platformResult=await platformWidget.execute(hint.value.trim())
          nonce=platformResult.operation
          if(!dialog.isConnected)return
          msg.textContent=PROVIDERS[packetProvider]+'已创建，正在发到群里…'
        }
        if (packetMode === 'image') {
          const source = `${selected.id}:${selectedIndex}:${maskBits}`
          if (clueFor !== source || !clueUpload) {
            msg.textContent = '正在制作图片线索…'
            const file = await makePacketClue(selected.images[selectedIndex].u, maskBits, doc)
            clueUpload = await uploadClue(file); clueFor = source
          }
        }
        if(direct && !createdId){
          const connected=await bridge('ping')
          if(!connected.creditCreate)throw Error('请更新到 1.2.1 红包连接器，刷新本站后重试')
          const pending={nonce:creditNonce,status:'pending',params:createParams}
          try{win.localStorage.setItem(draftKey,JSON.stringify(pending))}catch{throw Error('此浏览器无法保存待发红包，请启用站点存储后再试')}
          draft=pending;sync(false)
          const prepared=await bridge('prepareCreate',createParams)
          if(!prepared.id){
            if(popup.closed)throw Error('Credit 确认窗口已关闭，请重新点击发红包')
            popup.location.replace('https://credit.linux.do/home?jh-credit='+encodeURIComponent(nonce))
            creditNavigated=true
          }else popup.close()
          const result=prepared.id?prepared:await bridge('awaitCreate',{provider:'credit',operation:nonce})
          if(!/^[1-9]\d{0,19}$/.test(result?.id||''))throw Error('Credit 创建结果未确认，请到已发送记录核对')
          createdId=result.id
          draft={nonce:creditNonce,id:createdId,params:createParams}
          win.localStorage.setItem(draftKey,JSON.stringify(draft))
          sync(false)
          if(!dialog.isConnected)return
          msg.textContent='Credit 已创建，正在发到群聊…'
        }
        const d = await api(`/chat/groups/${group.id}/redpacks`, { method: 'POST', body: {
          nonce, secret: packetProvider==='native'?value:undefined, mode:packetMode, prompt: hint.value, phrase: phrase.value, game: game.value,
          post_id: selected?.id, image_index: selectedIndex, mask: Math.floor(Math.log2(maskBits & -maskBits)),
          mask_bits: packetMode === 'image' ? maskBits : undefined, clue_key: packetMode === 'image' ? clueUpload?.key : undefined,
          provider:packetProvider,external_ref:direct?createdId:platformDirect?platformResult.url:externalRef.value,notify_at:notifyAt.value?Math.floor(new Date(notifyAt.value).getTime()/1000):null,
          cover_key:cover?.key,
        } })
        if(direct && createdId)try{win.localStorage.removeItem(draftKey)}catch{}
        if(platformDirect)platformWidget.published()
        onSent?.(d.message); dialog.close()
      } catch (e) { if(popup && !creditNavigated && !popup.closed)popup.close();msg.textContent = (direct && createdId?'LDC 已创建，编号 '+createdId+'；重试只发布群消息，不再扣款。':platformResult?'红包已创建；重试只发布群消息，不再创建。':'')+e.message }
      finally { busy = false; navigationBusy=false; sync(false) }
    } }, platforms,externalHelp,creditChoice,creditFields,platformSlot,externalField,coverInput,coverButton,coverPreview,modes,secretField,count,field('祝福 / 提示', hint), phraseField, gameField, sourceField,reminder,msg,submit)
    creditChoice.addEventListener('change',sync)
    if(draft){provider.value='credit';creditChoice.value='new'}
    createForm=form;content.replaceChildren(form); sync()
    function sync(clearStatus=true) {
      const native=provider.value==='native'
      ;[...platforms.children].forEach((b,i)=>{b.setAttribute('aria-pressed',String(Object.keys(PROVIDERS)[i]===provider.value));b.disabled=busy||coverBusy})
      modes.hidden=!native
      ;[...modes.children].forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(MODES)[i] === mode)))
      phraseField.hidden = !native || mode !== 'phrase'; gameField.hidden = !native || mode !== 'cipher'; sourceField.hidden = !native || mode !== 'image'
      const direct=provider.value==='credit'&&creditChoice.value==='new'
      const platformDirect=['hb','fish'].includes(provider.value)&&creditChoice.value==='new'
      creditChoice.disabled=busy
      ;[creditKind,creditAmount,creditCount].forEach(el=>el.disabled=busy||!!draft)
      const widget=platformWidgets.get(provider.value)
      if(widget)widget.setBusy(busy)
      hint.disabled=busy||(direct&&!!draft)||(platformDirect&&!!widget?.draft)
      if(platformDirect&&widget?.draft?.input?.greeting!==undefined)hint.value=widget.draft.input.greeting
      if(direct&&draft)hint.value=draft.params?.greeting||''
      submit.disabled=busy||coverBusy
      creditChoice.hidden=native;creditFields.hidden=!direct||!!createdId
      platformSlot.hidden=!platformDirect
      if(platformDirect){const key=provider.value;ensurePlatform(key).then(w=>{if(provider.value===key&&creditChoice.value==='new')platformSlot.replaceChildren(w.node)}).catch(e=>{msg.textContent=e.message})}
      externalField.hidden = native||direct||platformDirect
      secretField.hidden = !native
      count.hidden = secretField.hidden
      externalHelp.hidden=native
      externalHelp.replaceChildren(h('p',null,platformDirect?'使用已绑定的平台账户创建LDC红包，创建成功后发到当前群。':creditChoice.value==='existing'?'此处仅分享已有红包；领取请切到上方“开红包”。':'填写后由本人在Credit确认支付口令，完成后自动发到群里。'))
      submit.textContent=direct&&createdId||platformDirect&&widget?.draft?.result?'将已创建的红包发到群里':direct?'到 Credit 确认扣款':platformDirect?'确认创建并发到群里':native?'塞好，发出去！':'分享这个红包到群里'
      externalRef.placeholder = provider.value === 'credit' ? '粘贴 Credit 红包分享链接' : provider.value==='fish'?'活动链接 / UUID / 6–18字口令':'HB 分享链接 / 数字或文字口令'
      const needed = native && (mode === 'image' || (mode === 'cipher' && game.value === 'tiles'))
      hint.placeholder = needed ? '给个提示，让大家有迹可循' : native ? '给个提示（可不填）' : '写一句祝福（可不填）'
      hint.setAttribute('aria-required', String(needed))
      if(clearStatus)msg.textContent = direct&&createdId?'已创建 LDC 红包 '+createdId+'，等待发到群里；不会再次扣款。':direct&&draft?'有一笔待确认的 Credit 红包，继续时沿用原参数核对。也可以切换其他红包方式。':''
    }
    async function findPosts() {
      const ticket = ++searchSeq, q = search.value.trim()
      if (!q) { results.textContent = '输入帖子编号或关键词后找图'; return }
      searchBtn.disabled = true; results.textContent = '正在找图…'
      try {
        const id = q.match(/^(?:No\.|#)?(\d+)$/i)
        const d = await api(id ? `/memes/${id[1]}` : `/memes?q=${encodeURIComponent(q)}&limit=6&nsfw=0`)
        if (ticket !== searchSeq || !dialog.isConnected) return
        const items = d.meme ? [d.meme] : d.items
        results.replaceChildren(...items.map(m => btn(`No.${m.id} · ${m.title || m.text?.slice(0, 38) || '未命名图片'}`, async () => {
          const pickTicket = ++searchSeq
          results.textContent = '加载帖子图片…'
          try {
            const full = d.meme || (await api(`/memes/${m.id}`)).meme
            if (pickTicket !== searchSeq || !dialog.isConnected) return
            if (!full.images?.some(im => im.u && im.k !== 'v' && im.k !== 'f')) { results.textContent = '这个帖子没有可用的图片'; return }
            selected = full; selectedIndex = full.images.findIndex(im => im.u && im.k !== 'v' && im.k !== 'f'); results.replaceChildren(); drawChosen()
          } catch (e) { if (pickTicket === searchSeq) results.textContent = e.message }
        }, 'rpk-post')))
        if (!items.length) results.textContent = '没找到帖子，试试编号或别的关键词'
      } catch (e) { if (ticket === searchSeq) results.textContent = e.message }
      finally { searchBtn.disabled = false }
    }
    function drawChosen() {
      const images = h('select', { class: 'rpk-input', 'aria-label': '选择帖子图片', onchange: e => { selectedIndex = Number(e.target.value); drawChosen() } }, selected.images.map((im, i) => im.u && im.k !== 'v' && im.k !== 'f' ? h('option', { value: i, selected: i === selectedIndex }, `第 ${i + 1} 张图片`) : null))
      const windows = h('div', { class: 'rpk-windows', role: 'group', 'aria-label': '选择清晰窗口' }, Array.from({ length: 9 }, (_, i) => {
        const b = btn(String(i + 1), () => { const next = maskBits ^ (1 << i); if (next) { maskBits = next; drawChosen() } }); b.setAttribute('aria-pressed', String(!!(maskBits & (1 << i)))); b.setAttribute('aria-label', `清晰区域 ${i + 1}`); return b
      }))
      chosen.replaceChildren(h('strong', null, `已选 No.${selected.id}`), images,
        preview({ u: selected.images[selectedIndex].u, nsfw: selected.sensitive || selected.spoiler, bits: maskBits, creator: true }),
        h('div', { class: 'rpk-window-row' }, h('p', { class: 'rpk-help' }, '选择清晰区域，可多选'), windows),
        h('p', { class: 'rpk-help' }, '公开帖子本身仍可查看原图；请勿用公开图藏保密答案。'))
    }
  }

  async function load() {
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
  function render(p) {
    if (p.external) return renderExternal(p)
    const id=message.id, seq=detailSeq
    title.textContent = p.solved ? '拆到啦！' : MODES[p.mode]
    const tagline = p.prompt ? h('p', { class: 'rpk-tagline' }, p.prompt) : null
    if (p.solved) {
      content.replaceChildren(...[coverImage(p.cover),medal(p),h('div', { class: 'rpk-win' }, doodle('happy', 'rpk-celebrate'),
        h('div', { class: 'rpk-secret' }, p.secret), h('p', null, `${p.opened} 人拆过`)),
        p.image && preview(p.image, true), p.post_id && h('a', { class: 'rpk-secondary rpk-source', href: `/m/${p.post_id}`, target: '_blank', rel: 'noopener' }, `查看原帖 No.${p.post_id}`), btn('收好红包', () => dialog.close(), 'rpk-primary')].filter(Boolean))
      return
    }
    if (p.unavailable) { content.replaceChildren(h('p', { class: 'rpk-status' }, '图片暂不可用，请联系发包人。')); return }
    const info = status(), answer = input('输入谜底', { placeholder: `${p.length} 个字符，输入完整谜底`, maxlength: 72 })
    const submit = h('button', { type: 'submit', class: 'rpk-primary' }, p.mode === 'open' ? '拆！' : p.mode === 'phrase' ? '说好了，开！' : '就这个！')
    const extras = []
    if (p.mode === 'open') extras.push(doodle('open', 'rpk-waiting'))
    if (p.mode === 'phrase') extras.push(h('p', { class: 'rpk-help' }, '先在群里说出这句暗号：'),
      h('blockquote', { class: 'rpk-cipher' }, p.phrase), btn('回群里说口令', () => dialog.close()))
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
    } }, coverImage(p.cover),tagline, extras, !['open', 'phrase'].includes(p.mode) && p.game !== 'tiles' && field('谜底', answer), info, submit)
    content.replaceChildren(form)
  }

  function renderExternal(p) {
    const id=message?.id, seq=detailSeq
    const platform=({hb:'HB',credit:'Credit',fish:'Fish'})[p.provider]||'红包平台'
    title.textContent=PROVIDERS[p.provider] || '平台红包'
    const snapshot=p.snapshot, won=snapshot?.claimed, lost=!won && snapshot?.state==='exhausted'
    if(lost && !defeatScene)defeatScene=DEFEATS[Math.floor(Math.random()*DEFEATS.length)]
    const scene=lost?defeatScene:null
    const state=won?'拆到啦！':scene?scene.text:({login:'请先登录 '+platform,own:'这是你发出的红包',exclusive:'这是指定用户的专属红包'})[snapshot?.blocked]||STATES[snapshot?.state] || '领取 '+platform+' 红包'
    const info=status(), visual=h('div',{class:'rpk-win'+(lost?' rpk-defeat':'')+(scene?.word?' rpk-ink-defeat':'')},
      scene?.word && h('span',{class:'rpk-defeat-word','aria-hidden':'true'},scene.word),doodle(won?'happy':scene?scene.art:'open','rpk-celebrate'),
      h('strong',{class:'rpk-result-title'},state),won && snapshot.amount!==null && h('div',{class:'rpk-secret'},'+'+snapshot.amount+' LDC'),
      snapshot && h('p',null,[KINDS[snapshot.kind] || platform+' 红包',snapshot.remaining!=null?`剩 ${snapshot.remaining} / ${snapshot.total ?? '?'} 个`:null].filter(Boolean).join(' · ')))
    const queried=h('div',{class:'rpk-help'},h('p',null,p.synced_at?'个人查询 · '+new Date(p.synced_at*1000).toLocaleString('zh-CN',{hour12:false}):'使用当前浏览器的 '+platform+' 登录账号'),
      snapshot?.expires_at && h('p',null,(['lottery','timed_draw'].includes(snapshot.kind)?'开奖时间 ':'截止 ')+new Date(snapshot.expires_at*1000).toLocaleString('zh-CN',{hour12:false})),
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
    const fishPassword=input('Fish 领取口令',{placeholder:'填写 Fish 活动口令',maxlength:18})
    const fishPasswordField=p.provider==='fish'&&p.external.ref_kind==='id'&&snapshot?.requires_password?field('活动口令',fishPassword):null
    const link=h('a',{class:'rpk-secondary rpk-source',href:p.external.url,target:'_blank',rel:'noopener noreferrer'},'打开 '+platform)
    const copy=btn('复制 '+platform+' 口令',async()=>{try{await win.navigator.clipboard.writeText(p.external.ref);info.textContent='已复制'}catch{info.textContent='请手动复制：'+p.external.ref}})
    const connectorHint=btn('安装 / 检测红包连接器',()=>showConnector(true));connectorHint.hidden=true
    content.replaceChildren(...[coverImage(p.cover),p.prompt&&h('p',{class:'rpk-tagline'},p.prompt),won&&medal(p),visual,queried,fishPasswordField,claim,unsupported,h('div',{class:'rpk-actions'},query,link),...(['hb','fish'].includes(p.provider)&&p.external.ref_kind!=='id'?[h('blockquote',{class:'rpk-cipher'},p.external.ref),copy]:[]),info,connectorHint].filter(Boolean))
    let busy=false
    async function connect(action) {
      if(busy)return;busy=true;query.disabled=claim.disabled=true;info.textContent=action==='claim'?(p.provider==='fish'&&p.external.ref_kind==='text'?'正在向 fish 核对口令与领取结果…':'正在核对并领取…'):'正在查询…'
      try {
        const connected=await bridge('ping')
        if(!connected.participationV2)throw Error('请打开顶部“连接器”，复制并更新脚本，再刷新本站')
        const result=await bridge(action,{...p.external,password:fishPasswordField?fishPassword.value:undefined})
        const saved=id?await api(`/chat/messages/${id}/redpack/sync`,{method:'POST',body:result}):{packet:{...p,snapshot:result,synced_at:Math.floor(Date.now()/1000)}}
        if(saved.message)onUpdate?.(saved.message)
        if(dialog.isConnected && seq===detailSeq)renderExternal(saved.packet)
      } catch(e) {if(dialog.isConnected && seq===detailSeq){info.textContent=e.message;connectorHint.hidden=false}}
      finally {busy=false;query.disabled=claim.disabled=false}
    }
    if(autoInspect || !externalInspected){autoInspect=false;externalInspected=true;connect('query')}
  }

  function archive() {
    title.textContent='群红包袋'
    dialog.classList.add('rpk-archive')
    back.hidden=true
    let view='all',scope='today',before=null,loading=false,ticket=0,scanBefore=null
    const list=h('div',{class:'rpk-archive-list'}),info=status()
    const pending=btn('今天',()=>change('today')),history=btn('历史',()=>change('all')),refresh=btn('刷新',()=>change(scope)),more=btn('再翻一页',()=>draw(false))
    const filter=h('select',{class:'rpk-input','aria-label':'红包状态',onchange:e=>{view=e.target.value;change(scope)}},[['all','全部状态'],['pending','待拆'],['history','已领 / 已结束']].map(([k,v])=>h('option',{value:k},v)))
    const scan=btn('继续整理旧分享',()=>draw(true))
    scan.hidden=true
    const tabs=h('div',{class:'rpk-actions'},pending,history,refresh,scan)
    content.replaceChildren(tabs,filter,list,info,more)
    function change(next){if(loading)return;scope=next;before=null;scanBefore=null;draw(true)}
    async function importShares(){
      scan.disabled=true
      try {
        const d=await api(`/chat/groups/${archiveGroup.id}/redpacks/import`,{method:'POST',body:{scope,before:scanBefore}})
        scanBefore=d.next;scan.hidden=!d.next
      } finally {scan.disabled=false}
    }
    async function draw(reset){
      if(loading)return;loading=true;const mine=++ticket;info.textContent='正在装进红包袋…';more.disabled=true
      pending.setAttribute('aria-pressed',String(scope==='today'));history.setAttribute('aria-pressed',String(scope==='all'))
      if(reset)list.replaceChildren()
      try {
        let importError=''
        if(reset){before=null;try{await importShares()}catch(e){importError='旧分享暂未整理：'+e.message}}
        const d=await api(`/chat/groups/${archiveGroup.id}/redpacks?view=${view}&scope=${scope}${before?'&before='+before:''}`)
        if(mine!==ticket || !dialog.isConnected)return
        list.append(...d.items.map(m=>{
          const p=m.redpack,s=p?.snapshot,label=m.deleted?'已撤回':s?.claimed?'已领取':STATES[s?.state] || (p?.provider==='native' ? p.solved?'已拆':'待拆' : '状态待同步')
          return btn([p?.cover?h('img',{class:'rpk-archive-cover',src:p.cover,alt:'',loading:'lazy'}):h('span',{class:'rpk-archive-icon'},icon('redpack')),h('span',{class:'rpk-archive-copy'},h('strong',null,p?.prompt || `${m.user.name || m.user.username}的红包`),
            h('span',null,`${PROVIDERS[p?.provider] || '红包'} · ${label}`),p?.notify_at && h('time',null,'到点提醒 '+new Date(p.notify_at*1000).toLocaleString('zh-CN',{hour12:false})),
            s?.expires_at && h('time',null,'截止 '+new Date(s.expires_at*1000).toLocaleString('zh-CN',{hour12:false})))],()=>{
              if(m.deleted)return
              message=m
              externalInspected=false
              back.hidden=false
              dialog.classList.remove('rpk-archive')
              load()
            },'rpk-archive-item'+(m.deleted?' is-gone':''))
        }))
        list.querySelectorAll('.is-gone').forEach(b=>b.disabled=true)
        before=d.next;more.hidden=!d.more;info.textContent=importError || (list.children.length?'':'红包袋还是空的')
      }catch(e){if(mine===ticket)info.textContent=e.message}
      finally{if(mine===ticket){loading=false;more.disabled=false}}
    }
    draw(true)
  }
}
