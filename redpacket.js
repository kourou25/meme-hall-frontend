// 按需加载。所有 DOM 挂到入口所在文档，普通群聊 / 分屏 / 小窗共用。
const MODES = { open: '直接开', phrase: '对暗号', cipher: '解个谜', image: '猜张图' }
const GAMES = { reverse: ['倒放咒语', '从右往左读。'], pairs: ['错位电波', '每两个字交换，落单的字不动。'], tiles: ['弹幕拼字', '点字块，拼出谜底。'] }
const PROVIDERS = { native: '谜底红包', hb: 'HB 红包', credit: 'Credit 红包', fish:'fish 红包' }
const STATES = { active: '可领取', exhausted: '被抢光啦', expired: '已过期', cancelled: '已取消', drawn: '已开奖', unmatched:'口令待匹配',registered:'已报名，等待开奖',drawing:'正在开奖',not_won:'这次未中奖',payment_pending:'奖励已锁定，等待发放',simulation:'模拟奖励，不产生真实转账',draft:'还没开放' }
const KINDS = { fixed: '普通', equal: '普通', random: '拼手气', exclusive: '专属', lottery: '抽奖', custom:'自定义金额',timed_draw:'限时开奖',password:'口令兑奖',text:'文本 / CDK' }
function packetBridge(action, external) {
  return new Promise((resolve,reject) => {
    const id=crypto.randomUUID(), timer=setTimeout(()=>finish(Error(action==='ping' ? '尚未连接辅助脚本' : '结果尚未确认，请重新查询或到原站核对')),action==='ping'?700:40000)
    const receive=e=>{if(e.source===window && e.origin===location.origin && e.data?.type==='meme-redpacket-result' && e.data.id===id)finish(e.data.error?Error(e.data.error):null,e.data.result)}
    const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',receive);error?reject(error):resolve(value)}
    window.addEventListener('message',receive)
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

export function openRedpacket({ anchor, group, archiveGroup, message, autoOpen = false, onSent, onUpdate, onClose, h, icon, api, uploadCover }) {
  let autoInspect=autoOpen
  let externalInspected=false
  let defeatScene
  const doc = anchor.ownerDocument, win = doc.defaultView
  if (doc.querySelector('.rpk-dialog')) return
  const content = h('div', { class: 'rpk-content' })
  const doodle = (name, cls = '') => h('span', { class: 'rpk-doodle ' + cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DOODLES[name]}</svg>` })
  const title = h('h2', { id: 'rpk-dialog-title' }, archiveGroup ? '群红包袋' : group ? '发红包' : '拆红包')
  const close = h('button', { type: 'button', class: 'rpk-close', 'aria-label': '关闭红包', autofocus: true, onclick: () => dialog.close() }, icon('close'))
  const dialog = h('dialog', { class: 'rpk-dialog', 'aria-labelledby': 'rpk-dialog-title' },
    h('header', { class: 'rpk-head' }, doodle('open', 'rpk-mascot'), h('div', null, title, group && h('p', null, '给「' + group.name + '」')), close), content)
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
    const box = h('div', { class: 'rpk-image' + (solved ? ' revealed' : '') })
    const draw = () => {
      const r = Math.floor(image.mask / 3), c = image.mask % 3
      const failed = () => box.replaceChildren(h('p', { class: 'rpk-status' }, '图片加载失败，请关闭后重试'))
      box.replaceChildren(...[h('img', { src: image.u, alt: solved ? '完整的帖子图片' : '模糊的图片线索', onerror: failed, draggable: false }),
        !solved && h('img', { class: 'rpk-image-peek', src: image.u, alt: '', draggable: false, style: { clipPath: `inset(${r * 100 / 3}% ${100 - (c + 1) * 100 / 3}% ${100 - (r + 1) * 100 / 3}% ${c * 100 / 3}%)` } })].filter(Boolean))
    }
    if (image.nsfw) box.append(btn('敏感图片 · 点击查看线索', draw))
    else draw()
    return box
  }

  if (archiveGroup) archive()
  else if (group) create()
  else load()

  function create() {
    let mode = 'open', selected = null, selectedIndex = 0, mask = 4, searchSeq = 0, busy = false, cover=null, coverBusy=false
    const nonce = crypto.randomUUID()
    const provider = h('select',{class:'rpk-input','aria-label':'红包平台'},Object.entries(PROVIDERS).map(([k,v])=>h('option',{value:k},v)))
    const externalRef = input('外站红包链接或口令',{placeholder:'粘贴 HB 口令',maxlength:200})
    const externalField = field('原站红包',externalRef)
    const notifyAt = input('到点提醒',{type:'datetime-local'})
    const reminder = h('details',{class:'rpk-options'},h('summary',null,'加个到点提醒'),field('提醒时间',notifyAt))
    const secret = input('红包谜底', { placeholder: '藏点什么？6–18 个字', maxlength: 72 })
    const secretField = field('谜底',secret)
    const count = h('span', { class: 'rpk-count' })
    secret.addEventListener('input', () => { const n = [...secret.value.normalize('NFC').trim()].length; count.textContent = n ? `${n} / 18` : '' })
    const hint = input('红包线索', { placeholder: '给个提示（可不填）', maxlength: 240 })
    const phrase = input('群聊口令', { placeholder: '在群里说哪句？', maxlength: 160 })
    const game = h('select', { class: 'rpk-input', 'aria-label': '解密玩法' }, Object.entries(GAMES).map(([key, v]) => h('option', { value: key }, v[0])))
    const gameHelp = h('p', { class: 'rpk-help' }, GAMES.reverse[1])
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
      try{cover=await uploadCover(file);if(dialog.isConnected){coverPreview.replaceChildren(coverImage(cover.url),btn('移除封面',()=>{cover=null;coverPreview.replaceChildren()}));msg.textContent=''}}
      catch(e){msg.textContent=e.message}
      finally{coverBusy=false;submit.disabled=busy;coverButton.disabled=false;coverInput.value=''}
    }})
    const coverButton=btn('上传 / 更换封面',()=>coverInput.click())
    const form = h('form', { class: 'rpk-form', onsubmit: async e => {
      e.preventDefault(); if (busy || coverBusy) return
      const value = secret.value.normalize('NFC').trim(), n = [...value].length
      if (!secretField.hidden && (n < 6 || n > 18)) { msg.textContent = '谜底需要 6–18 个字符'; return }
      if (mode === 'image' && !selected) { msg.textContent = '先选一张帖子的图片'; return }
      busy = true; submit.disabled = true; msg.textContent = '正在封装…'
      try {
        const d = await api(`/chat/groups/${group.id}/redpacks`, { method: 'POST', body: {
          nonce, secret: value, mode, prompt: hint.value, phrase: phrase.value, game: game.value,
          post_id: selected?.id, image_index: selectedIndex, mask,
          provider:provider.value,external_ref:externalRef.value,notify_at:notifyAt.value?Math.floor(new Date(notifyAt.value).getTime()/1000):null,
          cover_key:cover?.key,
        } })
        onSent?.(d.message); dialog.close()
      } catch (e) { msg.textContent = e.message }
      finally { busy = false; submit.disabled = false }
    } }, field('红包平台',provider),externalField,coverInput,coverButton,coverPreview,modes,secretField,count,field('提示', hint), phraseField, gameField, sourceField,reminder,msg,submit)
    provider.addEventListener('change',sync)
    content.replaceChildren(form); sync()
    function sync() {
      [...modes.children].forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(MODES)[i] === mode)))
      phraseField.hidden = mode !== 'phrase'; gameField.hidden = mode !== 'cipher'; sourceField.hidden = mode !== 'image'
      externalField.hidden = provider.value === 'native'
      secretField.hidden = provider.value !== 'native' && ['open','phrase'].includes(mode)
      count.hidden = secretField.hidden
      externalRef.placeholder = provider.value === 'credit' ? '粘贴 Credit 红包分享链接' : provider.value==='fish'?'活动链接 / UUID / 6–18字口令':'8位数字口令 / 6–18字文字口令'
      const needed = mode === 'image' || (mode === 'cipher' && game.value === 'tiles')
      hint.placeholder = needed ? '给个提示，让大家有迹可循' : '给个提示（可不填）'
      hint.setAttribute('aria-required', String(needed))
      msg.textContent = ''
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
        const b = btn(String(i + 1), () => { mask = i; drawChosen() }); b.setAttribute('aria-pressed', String(mask === i)); b.setAttribute('aria-label', `清晰窗口 ${i + 1}`); return b
      }))
      chosen.replaceChildren(h('strong', null, `已选 No.${selected.id}`), images,
        preview({ u: selected.images[selectedIndex].u, nsfw: selected.sensitive || selected.spoiler, mask }),
        h('div', { class: 'rpk-window-row' }, h('p', { class: 'rpk-help' }, '露出哪一格？'), windows))
    }
  }

  async function load() {
    content.replaceChildren(h('p', { class: 'rpk-help' }, '加载中…'))
    try {
      const d = await api(`/chat/messages/${message.id}/redpack`)
      if (!dialog.isConnected) return
      if (autoOpen && d.packet.mode==='phrase' && !d.packet.solved) {
        autoOpen=false
        const opened=await api(`/chat/messages/${message.id}/redpack/open`,{method:'POST',body:{}})
        onUpdate?.(opened.message);if(dialog.isConnected)render(opened.packet)
      } else render(d.packet)
    }
    catch (e) { if (dialog.isConnected) content.replaceChildren(h('p', { class: 'rpk-status', role: 'alert' }, e.message), btn('重试', load)) }
  }
  function render(p) {
    if (p.solved && p.external) return renderExternal(p)
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
      extras.push(h('h3', { class: 'rpk-game-title' }, GAMES[p.game][0]), h('p', { class: 'rpk-help' }, GAMES[p.game][1]))
      if (p.clue.text) extras.push(h('div', { class: 'rpk-cipher' }, p.clue.text))
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
        const d = await api(`/chat/messages/${message.id}/redpack/open`, { method: 'POST', body: { answer: answer.value } })
        onUpdate?.(d.message); if (dialog.isConnected) render(d.packet)
      } catch (e) { info.textContent = e.message }
      finally { busy = false; submit.disabled = false }
    } }, coverImage(p.cover),tagline, extras, !['open', 'phrase'].includes(p.mode) && p.game !== 'tiles' && field('谜底', answer), info, submit)
    content.replaceChildren(form)
  }

  function renderExternal(p) {
    title.textContent=PROVIDERS[p.provider] || '外站红包'
    const snapshot=p.snapshot, won=snapshot?.claimed, lost=!won && snapshot?.state==='exhausted'
    if(lost && !defeatScene)defeatScene=DEFEATS[Math.floor(Math.random()*DEFEATS.length)]
    const scene=lost?defeatScene:null
    const state=won?'拆到啦！':scene?scene.text:STATES[snapshot?.state] || '拆开外站的惊喜'
    const info=status(), visual=h('div',{class:'rpk-win'+(lost?' rpk-defeat':'')+(scene?.word?' rpk-ink-defeat':'')},
      scene?.word && h('span',{class:'rpk-defeat-word','aria-hidden':'true'},scene.word),doodle(won?'happy':scene?scene.art:'open','rpk-celebrate'),
      h('strong',{class:'rpk-result-title'},state),won && snapshot.amount!==null && h('div',{class:'rpk-secret'},'+'+snapshot.amount+' LDC'),
      snapshot && h('p',null,[KINDS[snapshot.kind] || '外站红包',snapshot.remaining!=null?`剩 ${snapshot.remaining} / ${snapshot.total ?? '?'} 个`:null].filter(Boolean).join(' · ')))
    const queried=h('div',{class:'rpk-help'},h('p',null,p.synced_at?'个人查询 · '+new Date(p.synced_at*1000).toLocaleString('zh-CN',{hour12:false}):'使用自己在原站的登录账号领取'),
      snapshot?.expires_at && h('p',null,'截止 '+new Date(snapshot.expires_at*1000).toLocaleString('zh-CN',{hour12:false})),
      p.notify_at && h('p',null,'到点提醒 '+new Date(p.notify_at*1000).toLocaleString('zh-CN',{hour12:false})))
    const query=btn('刷新状态',()=>connect('query')), claim=btn('连接并拆红包',()=>connect('claim'),'rpk-primary')
    claim.hidden=!!won || !!snapshot && (!['active','unmatched'].includes(snapshot.state) || !['fixed','equal','random','exclusive','custom','timed_draw','password'].includes(snapshot.kind))
    if(snapshot?.kind==='timed_draw')claim.textContent='参加开奖'
    const fishPassword=input('fish 领取口令',{placeholder:'填写原站活动口令',maxlength:18})
    const fishPasswordField=p.provider==='fish'&&p.external.ref_kind==='id'&&snapshot?.requires_password?field('原站口令',fishPassword):null
    const link=h('a',{class:'rpk-secondary rpk-source',href:p.external.url,target:'_blank',rel:'noopener noreferrer'},'去原站领取')
    const helper=h('details',{class:'rpk-options'},h('summary',null,'辅助脚本'),
      h('p',{class:'rpk-help'},'首次使用：先装脚本管理器，再安装连接脚本，最后刷新本站。仅看到代码表示尚未进入安装界面。'),
      h('a',{class:'rpk-secondary',href:'https://www.tampermonkey.net/index.php?browser=chrome',target:'_blank',rel:'noopener noreferrer'},'1. 获取 Tampermonkey'),
      h('p',{class:'rpk-help'},'Chrome：扩展程序 → Tampermonkey → 详情，检查“允许用户脚本”以及本站的访问权限。脚本管理器中启用“尽欢红包连接器”，刷新本站后点“检查连接”。'),
      h('a',{href:'https://www.tampermonkey.net/faq.php?locale=zh&q=Q209',target:'_blank',rel:'noopener noreferrer'},'Chrome 官方脚本权限说明'),
      h('a',{class:'rpk-secondary rpk-source',href:'/meme-redpacket.user.js',target:'_blank',rel:'noopener'},'2. 安装 / 更新连接脚本'),
      h('p',{class:'rpk-help'},'仍只显示代码：点下方“复制脚本”，在 Tampermonkey 中新建脚本，替换全部内容并保存。先在对应红包站登录自己的账号；不支持脚本的手机浏览器使用“去原站领取”。'),
      h('a',{class:'rpk-secondary',href:'/meme-redpacket.user.js',download:'meme-redpacket.user.js'},'下载脚本文件'),
      btn('复制脚本',async()=>{try{const r=await win.fetch('/meme-redpacket.user.js',{cache:'no-store'});const source=await r.text();if(!r.ok||!source.startsWith('// ==UserScript=='))throw Error('脚本获取失败，请重试');await win.navigator.clipboard.writeText(source);info.textContent='已复制。在脚本管理器中新建脚本、粘贴保存，然后刷新本站。'}catch(e){info.textContent=e.message||'复制失败，请下载脚本文件'}}),
      btn('检查连接',async()=>{try{const state=await packetBridge('ping');info.textContent='连接器已运行 · '+state.version+'。若原站返回未登录，请在这个浏览器中登录原站。'}catch(e){info.textContent=e.message+'。请确认脚本已启用、允许在本站运行，并刷新页面。'}}))
    const copy=btn('复制原站口令',async()=>{try{await win.navigator.clipboard.writeText(p.external.ref);info.textContent='已复制'}catch{info.textContent='请手动复制：'+p.external.ref}})
    content.replaceChildren(...[coverImage(p.cover),won&&medal(p),visual,queried,fishPasswordField,claim,h('div',{class:'rpk-actions'},query,link),...(['hb','fish'].includes(p.provider)&&p.external.ref_kind!=='id'?[h('blockquote',{class:'rpk-cipher'},p.external.ref),copy]:[]),info,helper].filter(Boolean))
    let busy=false
    async function connect(action) {
      if(busy)return;busy=true;query.disabled=claim.disabled=true;info.textContent=action==='claim'?'正在核对并领取…':'正在查询…'
      try {
        await packetBridge('ping')
        const result=await packetBridge(action,{...p.external,password:fishPasswordField?fishPassword.value:undefined})
        const saved=await api(`/chat/messages/${message.id}/redpack/sync`,{method:'POST',body:result})
        if(saved.message)onUpdate?.(saved.message)
        if(dialog.isConnected)renderExternal(saved.packet)
      } catch(e) {if(dialog.isConnected){info.textContent=e.message;helper.open=true}}
      finally {busy=false;query.disabled=claim.disabled=false}
    }
    if(autoInspect || !snapshot && !externalInspected){autoInspect=false;externalInspected=true;connect('query')}
  }

  function archive() {
    title.textContent='群红包袋'
    dialog.classList.add('rpk-archive')
    let view='all',scope='today',before=null,loading=false,ticket=0
    const list=h('div',{class:'rpk-archive-list'}),info=status()
    const pending=btn('今天',()=>change('today')),history=btn('历史',()=>change('all')),refresh=btn('刷新',()=>change(scope)),more=btn('再翻一页',()=>draw(false))
    const filter=h('select',{class:'rpk-input','aria-label':'红包状态',onchange:e=>{view=e.target.value;change(scope)}},[['all','全部状态'],['pending','待拆'],['history','已领 / 已结束']].map(([k,v])=>h('option',{value:k},v)))
    const tabs=h('div',{class:'rpk-actions'},pending,history,refresh)
    content.replaceChildren(tabs,filter,list,info,more)
    function change(next){scope=next;before=null;ticket++;loading=false;draw(true)}
    async function draw(reset){
      if(loading)return;loading=true;const mine=++ticket;info.textContent='正在装进红包袋…';more.disabled=true
      pending.setAttribute('aria-pressed',String(scope==='today'));history.setAttribute('aria-pressed',String(scope==='all'))
      if(reset)list.replaceChildren()
      try {
        const d=await api(`/chat/groups/${archiveGroup.id}/redpacks?view=${view}&scope=${scope}${before?'&before='+before:''}`)
        if(mine!==ticket || !dialog.isConnected)return
        list.append(...d.items.map(m=>{
          const p=m.redpack,s=p?.snapshot,label=m.deleted?'已撤回':s?.claimed?'已领取':STATES[s?.state] || (p?.provider==='native' ? p.solved?'已拆':'待拆' : '状态待同步')
          return btn([p?.cover?h('img',{class:'rpk-archive-cover',src:p.cover,alt:'',loading:'lazy'}):h('span',{class:'rpk-archive-icon'},icon('redpack')),h('span',{class:'rpk-archive-copy'},h('strong',null,p?.prompt || `${m.user.name || m.user.username}的红包`),
            h('span',null,`${PROVIDERS[p?.provider] || '红包'} · ${label}`),p?.notify_at && h('time',null,'到点提醒 '+new Date(p.notify_at*1000).toLocaleString('zh-CN',{hour12:false})),
            s?.expires_at && h('time',null,'截止 '+new Date(s.expires_at*1000).toLocaleString('zh-CN',{hour12:false})))],()=>{
              if(m.deleted)return
              // close 事件异步派发；等旧对话框移除后再打开，避免被单实例守卫拦住。
              dialog.addEventListener('close',()=>openRedpacket({anchor,message:m,onUpdate,h,icon,api}),{once:true})
              dialog.close()
            },'rpk-archive-item'+(m.deleted?' is-gone':''))
        }))
        list.querySelectorAll('.is-gone').forEach(b=>b.disabled=true)
        before=d.next;more.hidden=!d.more;info.textContent=list.children.length?'':'红包袋还是空的'
      }catch(e){if(mine===ticket)info.textContent=e.message}
      finally{if(mine===ticket){loading=false;more.disabled=false}}
    }
    draw(true)
  }
}
