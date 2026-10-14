const BASE = '/chat/1/title-raffles'
const STATE = { open: '报名中', drawn: '已开奖', empty: '无人参与', cancelled: '已取消', closing: '开奖中' }
const WHEN = { 60: '1 分钟后', 600: '10 分钟后', 3600: '1 小时后', 86400: '明天此时', 604800: '7 天后' }

export function openTitleRaffle({ anchor, api, h, icon, packetId = null, raffleId = null }) {
  const doc = anchor.ownerDocument
  if (doc.querySelector('.tr-dialog')) return
  const title = h('h2', { id: 'tr-title' }, packetId ? '红包抽称号' : raffleId ? '称号抽奖详情' : '称号抽奖')
  const close = h('button', { class: 'tr-close', type: 'button', 'aria-label': '关闭', onclick: () => dialog.close() }, icon('close'))
  const body = h('div', { class: 'tr-body' })
  const dialog = h('dialog', { class: 'tr-dialog', 'aria-labelledby': 'tr-title' },
    h('header', { class: 'tr-head' }, h('span', { class: 'tr-spark', 'aria-hidden': 'true' }, '✦'), title, close), body)
  const trigger = anchor.getClientRects().length ? anchor : doc.activeElement
  doc.body.append(dialog)
  dialog.addEventListener('close', () => { dialog.remove(); trigger?.focus?.({ preventScroll: true }) }, { once: true })
  dialog.showModal()
  let history = false, before = null, busy = false
  const changed = () => doc.defaultView?.dispatchEvent(new doc.defaultView.Event('title-raffle-update'))
  const load = async () => {
    body.replaceChildren(h('p', { class: 'tr-info', role: 'status' }, '正在整理抽奖券…'))
    try {
      const params = new URLSearchParams()
      if (history || packetId) params.set('history', '1')
      if (packetId) params.set('packet_id', packetId)
      if (before) params.set('before', before)
      const data = await api(raffleId ? BASE + '/' + encodeURIComponent(raffleId) : BASE + (params.size ? '?' + params : ''))
      if (!dialog.isConnected) return
      const titles = new Map(data.titles.map(t => [t.id, t]))
      const list = data.raffles
      const rows = list.map(r => {
        const name = titles.get(r.title)?.name || '神秘称号'
        const active = r.status === 'open' && r.closes_at > Date.now() / 1000
        const mutate = async (path, method, bodyData) => {
          if (busy) return; busy = true
          try { await api(path, { method, ...(bodyData ? { body: bodyData } : {}) }); changed(); await load() }
          catch (e) { const note = row.querySelector('.tr-error'); note.textContent = e.message || '操作失败' }
          finally { busy = false }
        }
        const row = h('article', { class: 'tr-card tr-' + r.title },
          h('div', { class: 'tr-row' }, h('strong', { class: 'tr-name' }, name), h('span', { class: 'tr-status' }, STATE[r.status] || r.status)),
          h('div', { class: 'tr-meta' },
            r.packet_id ? '红包限定 · 报名开奖' : r.entry_mode === 'all' ? '最近 24 小时活跃群友参与' : `${r.entries} 人已报名`,
            ' · ', new Date(r.closes_at * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })),
          r.status === 'drawn' && h('div', { class: 'tr-winner' }, '✦ ', r.winner_name || r.winner_username || '群友', ' 获得称号', r.level > 1 && ` · Lv${r.level}`),
          h('div', { class: 'tr-actions' },
            active && r.entry_mode === 'optin' && h('button', { type: 'button', class: 'tr-action primary', onclick: () => mutate(BASE + '/' + r.id + '/join', r.joined ? 'DELETE' : 'POST') }, r.joined ? '已报名 · 退出' : '报名抽取'),
            active && data.can_create && h('button', { type: 'button', class: 'tr-action primary', onclick: () => mutate(BASE + '/' + r.id + '/draw', 'POST') }, '立即开奖'),
            active && data.can_create && h('button', { type: 'button', class: 'tr-action', onclick: () => mutate(BASE + '/' + r.id + '/cancel', 'POST') }, '取消抽奖')),
          h('span', { class: 'tr-error', role: 'alert' }))
        return row
      })
      const controls = h('div', { class: 'tr-controls' },
        !packetId && !raffleId && h('button', { type: 'button', class: 'tr-action', 'aria-pressed': String(history), onclick: () => { history = !history; before = null; load() } }, history ? '只看今天' : '查看历史'),
        before && h('button', { type: 'button', class: 'tr-action', onclick: () => { before = null; load() } }, '返回最新'),
        data.next && h('button', { type: 'button', class: 'tr-action', onclick: () => { before = data.next; load() } }, '更早抽奖'),
        h('button', { type: 'button', class: 'tr-action', onclick: load }, '刷新'))
      const create = data.can_create && !raffleId ? createForm(data.titles) : null
      body.replaceChildren(controls, create || '', rows.length ? h('div', { class: 'tr-list' }, rows) : h('p', { class: 'tr-empty' }, packetId ? '这个红包还没有称号抽奖' : '今天还没有称号抽奖'))
    } catch (e) { body.replaceChildren(h('p', { class: 'tr-error', role: 'alert' }, e.message || '加载失败'), h('button', { class: 'tr-action', onclick: load }, '重试')) }
  }
  function createForm(titles) {
    const titleSelect = h('select', { class: 'tr-input', 'aria-label': '抽取称号' }, titles.map(t => h('option', { value: t.id }, t.name)))
    const mode = h('select', { class: 'tr-input', 'aria-label': '参与方式' },
      h('option', { value: 'optin' }, '报名参与'), !packetId && h('option', { value: 'all' }, '全员参与（24 小时活跃）'))
    const duration = h('select', { class: 'tr-input', 'aria-label': '开奖时间' }, Object.entries(WHEN).map(([n, label]) => h('option', { value: n }, label)))
    const feedback = h('span', { class: 'tr-error', role: 'alert' })
    const submit = h('button', { class: 'tr-action primary', type: 'submit' }, '发起抽奖')
    return h('form', { class: 'tr-create', onsubmit: async e => {
      e.preventDefault(); if (busy) return; busy = true; submit.disabled = true; feedback.textContent = ''
      try { await api(BASE, { method: 'POST', body: { title: titleSelect.value, entry_mode: mode.value, duration_seconds: Number(duration.value), packet_id: packetId } }); changed(); await load() }
      catch (err) { feedback.textContent = err.message || '发起失败' }
      finally { busy = false; submit.disabled = false }
    } }, h('strong', null, packetId ? '给这个红包挂一个称号' : '群主发起'),
    h('div', { class: 'tr-create-fields' }, titleSelect, mode, duration, submit), feedback)
  }
  load()
}
