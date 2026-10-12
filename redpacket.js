// 按需加载。所有 DOM 挂到入口所在文档，普通群聊 / 分屏 / 小窗共用。
const MODES = { open: '直接开', phrase: '对暗号', cipher: '解个谜', image: '猜张图' }
const GAMES = { reverse: ['倒放咒语', '从右往左读。'], pairs: ['错位电波', '每两个字交换，落单的字不动。'], tiles: ['弹幕拼字', '点字块，拼出谜底。'] }
// 自绘简笔图标：同一只信封小猫贯穿发包、消息与拆包。
const DOODLES = {
  open: '<path d="M7 15 8 6l8 6a25 25 0 0 1 16 0l8-6 1 9v19c0 5-6 8-17 8S7 39 7 34Z" fill="var(--rpk-paper)"/><path d="m8 24 16 10 16-10M13 29l-5 7m27-7 5 7"/><path d="M17 19v2m14-2v2m-10 3q3 3 6 0"/><path d="m11 23-4-1m30 1 4-1"/>',
  phrase: '<path d="M8 8q16-5 31 0l1 22q-10 4-21 1l-9 8 1-10-5-2Z" fill="var(--rpk-paper)"/><path d="M16 17v3m14-3v3m-10 4q3 3 6 0M15 8l2-5m13 5-1-5"/>',
  cipher: '<path d="m12 15 4-7 7 5 8-3 6 8-1 18-9 5-16-6-3-11Z" fill="var(--rpk-paper)"/><path d="M20 20q1-7 7-4t-2 9v3m0 6h.1M7 10l-3-3m36 25 4 2"/>',
  image: '<rect x="7" y="8" width="34" height="30" rx="5" fill="var(--rpk-paper)" transform="rotate(-5 24 23)"/><path d="m9 32 10-12 8 9 7-6 6 9M30 15h.1"/><path d="m16 21 1-6 5 5m9 13 1-4 4 3"/>',
  happy: '<path d="M8 18 10 5l10 8h9L39 5l1 14v13q-1 11-16 11T8 32Z" fill="var(--rpk-paper)"/><path d="m14 24 5-2m-4 0 4 2m10 0 5-2m-5 0 5 2m-14 6q4 6 8 0m-14-1-5-1m25 1 5-1M4 15l-3-3m42 0 3-3"/>',
}

export function openRedpacket({ anchor, group, message, onSent, onUpdate, h, icon, api }) {
  const doc = anchor.ownerDocument, win = doc.defaultView
  if (doc.querySelector('.rpk-dialog')) return
  const content = h('div', { class: 'rpk-content' })
  const doodle = (name, cls = '') => h('span', { class: 'rpk-doodle ' + cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DOODLES[name]}</svg>` })
  const title = h('h2', { id: 'rpk-dialog-title' }, group ? '发红包' : '拆红包')
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
    dialog.remove(); if (anchor.isConnected) anchor.focus({ preventScroll: true })
  }, { once: true })
  doc.body.append(dialog)
  resize(); win.addEventListener('resize', resize); win.visualViewport?.addEventListener('resize', resize); win.visualViewport?.addEventListener('scroll', resize)
  dialog.showModal(); close.focus({ preventScroll: true })
  const btn = (text, fn, cls = 'rpk-secondary') => h('button', { type: 'button', class: cls, onclick: fn }, text)
  const field = (label, input, help) => h('label', { class: 'rpk-field' }, h('span', null, label), input, help && h('small', null, help))
  const status = () => h('p', { class: 'rpk-status', role: 'status', 'aria-live': 'polite' })
  const input = (label, extra = {}) => h('input', { class: 'rpk-input', type: 'text', 'aria-label': label, autocomplete: 'off', ...extra })
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

  if (group) create()
  else load()

  function create() {
    let mode = 'open', selected = null, selectedIndex = 0, mask = 4, searchSeq = 0, busy = false
    const nonce = crypto.randomUUID()
    const secret = input('红包谜底', { placeholder: '藏点什么？6–18 个字', maxlength: 72 })
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
    const form = h('form', { class: 'rpk-form', onsubmit: async e => {
      e.preventDefault(); if (busy) return
      const value = secret.value.normalize('NFC').trim(), n = [...value].length
      if (n < 6 || n > 18) { msg.textContent = '谜底需要 6–18 个字符'; return }
      if (mode === 'image' && !selected) { msg.textContent = '先选一张帖子的图片'; return }
      busy = true; submit.disabled = true; msg.textContent = '正在封装…'
      try {
        const d = await api(`/chat/groups/${group.id}/redpacks`, { method: 'POST', body: {
          nonce, secret: value, mode, prompt: hint.value, phrase: phrase.value, game: game.value,
          post_id: selected?.id, image_index: selectedIndex, mask,
        } })
        onSent?.(d.message); dialog.close()
      } catch (e) { msg.textContent = e.message }
      finally { busy = false; submit.disabled = false }
    } }, modes, field(['谜底', count], secret), field('提示', hint), phraseField, gameField, sourceField, msg, submit)
    content.replaceChildren(form); sync()
    function sync() {
      [...modes.children].forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(MODES)[i] === mode)))
      phraseField.hidden = mode !== 'phrase'; gameField.hidden = mode !== 'cipher'; sourceField.hidden = mode !== 'image'
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
    try { const d = await api(`/chat/messages/${message.id}/redpack`); if (dialog.isConnected) render(d.packet) }
    catch (e) { if (dialog.isConnected) content.replaceChildren(h('p', { class: 'rpk-status', role: 'alert' }, e.message), btn('重试', load)) }
  }
  function render(p) {
    title.textContent = p.solved ? '拆到啦！' : MODES[p.mode]
    const tagline = p.prompt ? h('p', { class: 'rpk-tagline' }, p.prompt) : null
    if (p.solved) {
      content.replaceChildren(...[h('div', { class: 'rpk-win' }, doodle('happy', 'rpk-celebrate'),
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
    } }, tagline, extras, !['open', 'phrase'].includes(p.mode) && p.game !== 'tiles' && field('谜底', answer), info, submit)
    content.replaceChildren(form)
  }
}
