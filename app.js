// 尽欢前端：无构建、无框架
import { onRemoval, windowContent } from '/resource-memory.js?v=af516e27'
import { renderDmPage } from '/dm.js'
const S = { me: null, emojis: [], minPostTL: 1, bgKey: null, modal: null, wall: null, meSt: null, folders: null, viewer: null }
const main = document.getElementById('main')

// ---------- 基础工具 ----------

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue
      if (k === 'class') el.className = v
      else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, x) : (el.style[p] = x)
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v)
      else if (k === 'html') el.innerHTML = v // 仅用于内置图标
      else if (k === 'value') el.value = v
      // 只写 muted 属性不会真的静音（浏览器只在解析 HTML 时读它），不静音的视频会被拦下自动播放
      else if (k === 'muted') { el.muted = !!v; el.defaultMuted = !!v; if (v) el.setAttribute('muted', '') }
      else el.setAttribute(k, v === true ? '' : v)
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue
    el.append(kid instanceof Node ? kid : String(kid))
  }
  return el
}
// 原生 append / replaceChildren 会把 null、false 当文字插进去，先按 h() 的规则过滤
const nodes = (...kids) => kids.flat(Infinity).filter((k) => k != null && k !== false)

const ICON = {
  swap: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  zoom: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/></svg>',
  at: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>',
  popout: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0"/></svg>',
  bellOff: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8M10 20.5a2 2 0 0 0 4 0M4 4l16 16"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.2" r="1.2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/></svg>',
  apps: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></svg>',
  contacts: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>',
  reply: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5 5.5 5.5 0 0 1 14.5 20H11"/></svg>',
  at: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M9 3.5h6l-1 5.5 3.5 3.5v2h-11v-2L10 9z"/><path d="M12 14.5V21"/></svg>',
  anchor: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M4 13a8 8 0 0 0 16 0M8 11h8"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a15.6 15.6 0 0 1-3.2 3.7M6.6 7.6C4.4 9.2 3 12 3 12s4 6 9 6a8.7 8.7 0 0 0 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12Z"/></svg>',
  smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></svg>',
  emojiAdd: '<svg viewBox="0 0 24 24"><path d="M20.4 12.8A8.5 8.5 0 1 1 11.2 3.6"/><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01M18.5 2.5v6M15.5 5.5h6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.3s-7.8-4.7-7.8-10.5A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7.8 2.7c0 5.8-7.8 10.5-7.8 10.5Z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h11v17L12 16.4l-5.5 4.1Z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M4 12.2 20 4.5l-4.4 15-4-6.2Z"/><path d="m11.6 13.3 8.2-8.6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
  monitor: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  chevL: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  chevR: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  chevD: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  chevU: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M5 18c2.5-1 4-3.2 4-6V7H4v5h5M15 18c2.5-1 4-3.2 4-6V7h-5v5h5"/></svg>',
  heading: '<svg viewBox="0 0 24 24"><path d="M6 5v14M18 5v14M6 12h12"/></svg>',
  italic: '<svg viewBox="0 0 24 24"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg>',
  strike: '<svg viewBox="0 0 24 24"><path d="M4 12h16M16.5 7C15.6 5.8 14 5 12 5c-2.5 0-4.5 1.3-4.5 3.3 0 1.2.6 2.1 1.8 2.7M7.5 17c.9 1.2 2.5 2 4.5 2 2.6 0 4.5-1.3 4.5-3.4 0-.6-.2-1.2-.5-1.6"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="m9 8-4 4 4 4M15 8l4 4-4 4"/></svg>',
  codeBlock: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="m10 9.5-2.5 2.5 2.5 2.5M14 9.5l2.5 2.5-2.5 2.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9.5 6H20M9.5 12H20M9.5 18H20M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
  listOl: '<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.2c.4-.5 1-.8 1.6-.8.8 0 1.4.5 1.4 1.2 0 1.3-3 2-3 3.9h3"/></svg>',
  task: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="7" height="7" rx="1.5"/><path d="m5.3 8 1.3 1.3L8.8 6.9M14 8h6M3.5 15h7v5h-7zM14 17.5h6"/></svg>',
  hr: '<svg viewBox="0 0 24 24"><path d="M4 12h16M8 7h8M8 17h8" /></svg>',
  bold: '<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
  rocket: '<svg viewBox="0 0 24 24"><path d="M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5Z"/><path d="m8 10-3 1-2 3 4 1M14 16l-1 3-3 2-1-4M6 18c-1 1-1.5 2.5-1.5 2.5S6 20 7 19"/><circle cx="15.5" cy="8.5" r="1.3"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  redpack: '<svg viewBox="0 0 24 24"><path d="M4 8 5 3l4 4h6l4-4 1 5v11c0 2-3 3-8 3s-8-1-8-3Z"/><path d="m4 14 8 5 8-5M9 10v1m6-1v1m-4 2q1 1 2 0"/></svg>',
  packetBag: '<svg viewBox="0 0 24 24"><path d="M6 4h12l-3 5c5 3 7 7 5 10-2 3-14 3-16 0-2-3 0-7 5-10ZM8 9h8M10 14v1m4-1v1m-4 3q2 2 4 0"/></svg>',
}
const icon = (name, cls = 'i') => h('span', { class: cls, html: ICON[name], 'aria-hidden': 'true' })

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' }
  if (opts.body instanceof FormData) init.body = opts.body
  else if (opts.body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }
  const res = await fetch(path.startsWith('/auth/') ? path : '/api' + path, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `请求失败（${res.status}）`)
    err.status = res.status
    throw err
  }
  return data
}

let toastTimer
const PIPS = new Set() // 弹出的群聊小窗
// 发了慎点图但当前「隐藏敏感」：图廊里看不到，别让人以为没发出去
const postedHint = (sp) => { if (sp && S.content === 'hide') setTimeout(() => toast('已发布。你勾了「慎点」，当前「隐藏敏感」模式下图廊不显示，可在内容设置里切换', 'ok'), 2500) }
function toast(msg, kind = '') {
  // 群聊小窗在前台时提示显示在小窗里
  const el = (PIPS.size ? focusedDoc() : document).getElementById('toast') || document.getElementById('toast')
  el.textContent = msg
  el.className = `toast show ${kind}`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (el.className = 'toast'), 2400)
}

const pad = (n) => String(n).padStart(2, '0')
// 卡片上的时间：今天 14:32 / 昨天 18:06 / 3月2日 / 2023-03-02
function fmtTime(ts) {
  const s = Math.floor(Date.now() / 1000) - ts
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  const d = new Date(ts * 1000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d >= today) return `今天 ${hm}`
  if (d >= today - 86400000) return `昨天 ${hm}`
  return fmtDay(ts)
}
// 全站统一的日期写法：今年「10月8日」，往年「2025年10月8日」
function fmtDay(ts) {
  const d = new Date(ts * 1000)
  return (d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear() + '年') + `${d.getMonth() + 1}月${d.getDate()}日`
}
// 具体到分钟（也能用于将来的时间，比如解禁时间）
const fmtAt = (ts) => { const d = new Date(ts * 1000); return `${fmtDay(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
const timeAgo = fmtTime
const fmtDate = fmtDay
const snip = (t = '', n = 30) => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t }
const fmtN = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n || 0))

// ---------- 平台表情 ----------
// 形如 [bb:doge]，图片放在 /stickers/{pack}/{name}.{ext}
const STICKER_EXT = { bb: 'png', bm: 'png', tieba: 'png', weibo: 'png', qq: 'gif', alu: 'png', ld: 'png' }
const STICKER_RE = /\[([a-z]+):([a-z0-9_]+)\]/g
// 自建包（scripts/build_custom_stickers.py）的后缀从 packs.json 读；png / gif 混放时加载失败换另一个后缀再试一次
const sticker = (pack, name, cls = 'stk') => {
  const ext = STICKER_EXT[pack] || 'png'
  return h('img', {
    class: cls, src: `/stickers/${pack}/${name}.${ext}`, alt: `[${pack}:${name}]`, title: name, loading: 'lazy',
    onerror: (e) => {
      const alt = `/stickers/${pack}/${name}.${ext === 'png' ? 'gif' : 'png'}`
      if (!e.target.dataset.retry) { e.target.dataset.retry = 1; e.target.src = alt } else e.target.replaceWith(`[${pack}:${name}]`)
    },
  })
}
// 精选里的 Unicode 表情用和 linux.do 一样的 Fluent 图，和 L站表情风格、大小一致
const EMO_IMG = { '❤️': 'heart', '👍': 'thumbsup', '😆': 'laughing', '😮': 'open_mouth', '👏': 'clap', '🎊': 'confetti_ball', '🤗': 'hugs' }
// 回应表情的 key：带冒号是平台表情，否则是 Unicode
function emo(key) {
  if (key === '+1') return h('span', { class: 'emo emo-plus1' }, '+1')
  const i = key.indexOf(':')
  if (i > 0) return sticker(key.slice(0, i), key.slice(i + 1), 'stk emo')
  if (EMO_IMG[key]) return h('img', { class: 'stk emo', src: `/emoji/${EMO_IMG[key]}.png`, alt: key, title: key, loading: 'lazy', onerror: (e) => e.target.replaceWith(key) })
  return h('span', { class: 'emo' }, key)
}
const emoLabel = (key) => key === '+1' ? '+1' : S.emojis.find((e) => e.key === key)?.label || (key.includes(':') ? key.split(':')[1] : key)
const replyLen = (s) => [...s.replace(STICKER_RE, '□')].length
// 整条只有 1～3 个表情包（不带字）：按大图显示，像发了一张小贴纸
const stkOnly = (s = '') => /^\s*(\[[a-z]+:[a-z0-9_]+\]\s*){1,3}$/.test(s)

function linkify(text) {
  const out = []
  let last = 0
  // No.1234 = 引用帖子；#词 = 标签（群聊里点了搜这个群的聊天记录，别处点了去标签页）
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+|:([a-z0-9_+-]+):|\[([a-z]+):([a-z0-9_]+)\]|\*\*([^*\n]{1,200})\*\*|(?<![\w@.])@([A-Za-z0-9_][\w.-]{0,30}[\w])|(?<![\w.])No\.(\d{1,7})(?!\d)|(?<![\w#&/=])#([^\s#@，。、,.!！?？:：;；()（）[\]<>"'*`~]{1,16})/g)) {
    out.push(text.slice(last, m.index))
    if (m[6]) out.push(h('a', { class: 'post-ref', href: '/m/' + m[6], 'data-link': '', title: '看这个帖子' }, 'No.' + m[6]))
    else if (m[7]) {
      const t = m[7]
      out.push(h('a', { class: 'hashtag', href: '/t/' + encodeURIComponent(t), 'data-link': '', onclick: (e) => {
        const pane = [...CHAT.panes].find((p) => p.el.contains(e.currentTarget))
        if (!pane) return
        e.preventDefault(); e.stopPropagation()
        pane.search('#' + t)
      } }, '#' + t))
    } else if (m[5]) {
      const u = m[5]
      const nk = nickOf(u)
      out.push(h('button', { class: 'at' + (S.me && u.toLowerCase() === S.me.username.toLowerCase() ? ' me' : ''), type: 'button', 'data-pop': 'u' + u, 'data-at': u.toLowerCase(),
        onclick: (e) => { e.stopPropagation(); userCard(u, e.currentTarget) } }, nk ? `${nk}(@${u})` : '@' + u))
    } else if (m[4]) out.push(h('strong', null, linkify(m[4])))
    // 不认识的包也先当图片试一下（新加的包、旧缓存），加载不出来再显示原文
    else if (m[2]) out.push(sticker(m[2], m[3]))
    else if (m[1]) {
      // linux.do 表情短码，直接引用其 CDN
      out.push(h('img', { class: 'emoji', src: `https://cdn.ldstatic.com/images/emoji/twemoji/${m[1]}.png?v=15`, alt: m[0], title: m[0],
        referrerpolicy: 'no-referrer', loading: 'lazy', onerror: (e) => e.target.replaceWith(m[0]) }))
    } else if (m[0].startsWith(location.origin + '/')) {
      // 站内链接：不新开页，交给前端路由（伪装模式下会跳到对应的楼 / 消息）
      const path = m[0].slice(location.origin.length)
      out.push(h('a', { href: path, 'data-link': '' }, path.replace(/^\/m\/(\d+)$/, 'No.$1')))
    } else {
      out.push(h('a', { href: m[0], target: '_blank', rel: 'noopener noreferrer' }, m[0]))
    }
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

let packsP
// dupes.json 由 scripts/sticker-dupes.mjs 生成：{ 重复的代码: 保留的代码 }；只在选择器里隐藏，文件不删，老消息照常显示
let STICKER_DUPES = {}
const loadPacks = () => (packsP ||= Promise.all([
  fetch('/stickers/packs.json').then((r) => r.json()),
  fetch('/stickers/dupes.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
]).then(([ps, dupes]) => {
  ps.forEach((p) => { STICKER_EXT[p.key] ||= p.ext })
  STICKER_DUPES = dupes || {}
  return ps
}).catch(e => { packsP = null; throw e }))

// ---------- 表情面板 ----------
// 常用（最近用过 + 精选）/ Unicode 分组 / 各平台表情包；表情回应和输入框共用
const recentEmos = () => { try { return JSON.parse(localStorage.getItem('emo-recent')) || [] } catch { return [] } }
const pushRecent = (k) => localStorage.setItem('emo-recent', JSON.stringify([k, ...recentEmos().filter((x) => x !== k)].slice(0, 24)))

let emojiWordsP
const loadEmojiWords = () => emojiWordsP ||= fetch('/emoji-search.json?v=ca8246e7').then(r => {
  if (!r.ok) throw Error('词库加载失败')
  return r.json()
}).catch(e => { emojiWordsP = null; throw e })
const emojiSearchKey = s => s.normalize('NFKC').replaceAll('\ufe0f', '').toLowerCase()
function emojiBoard(onPick, { mine = new Set(), counts = {}, foot = null } = {}) {
  const uniTabs = h('div', { class: 'eb-row' })
  const pakTabs = h('div', { class: 'eb-row' })
  const tabs = h('div', { class: 'eb-tabs' }, uniTabs, pakTabs)
  const grid = h('div', { class: 'eb-grid' }, h('div', { class: 'spinner' }))
  const search = h('input', { type: 'search', class: 'eb-search', 'aria-label': '搜索表情', placeholder: '搜索表情', autocomplete: 'off' })
  const clear = h('button', { type: 'button', class: 'btn-icon', 'aria-label': '清空表情搜索', hidden: true, onclick: () => { search.value = ''; search.dispatchEvent(new Event('input')); search.focus() } }, icon('close'))
  const notice = h('div', { class: 'eb-notice', role: 'status', hidden: true })
  const board = h('div', { class: 'eb' }, h('div', { class: 'eb-search-row' }, icon('search'), search, clear), notice, tabs, grid, foot)
  board.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.isComposing) return
    e.preventDefault(); e.stopPropagation()
    if (search.value) { search.value = ''; search.dispatchEvent(new Event('input')); search.focus() }
    else { const anchor = POP?.anchor; closePop(); anchor?.focus?.({ preventScroll: true }) }
  })
  async function load() {
    const [packResult, wordResult] = await Promise.allSettled([loadPacks(), loadEmojiWords()])
    const packs = packResult.status === 'fulfilled' ? packResult.value : []
    const words = wordResult.status === 'fulfilled' ? wordResult.value : {}
    notice.hidden = packResult.status === 'fulfilled' && wordResult.status === 'fulfilled'
    notice.replaceChildren(...(notice.hidden ? [] : [h('span', null, '部分表情未加载'), h('button', { type: 'button', onclick: () => { notice.hidden = true; load() } }, '重试')]))
    const pages = [
      // 常用：最近用过的在前，后面固定跟上下左右箭头和精选
      { key: 'fav', label: '常用', items: () => [...new Set([...recentEmos(), ...ARROWS, ...pickedEmos()])] },
      { key: 'pick', label: '精选', items: pickedEmos },
      ...(S.emojiGroups || []).map((g) => ({ key: 'u:' + g.label, label: g.label, items: () => g.items })),
      ...packTabs(packs),
    ]
    let cur = localStorage.getItem('eb-tab') || (recentEmos().length ? 'fav' : 'pick')
    if (!pages.some((p) => p.key === cur)) cur = 'fav'
    const all = new Map()
    for (const p of pages) for (const k of p.items()) {
      const item = all.get(k) || { key: k, label: words[k] || emoLabel(k), search: '' }
      item.search += ' ' + emojiSearchKey(k + ' ' + item.label + ' ' + p.label)
      all.set(k, item)
    }
    let limit = 80
    const show = () => {
      const tokens = emojiSearchKey(search.value.trim()).split(/\s+/).filter(Boolean)
      clear.hidden = !search.value
      tabs.hidden = !!tokens.length
      const tab = (p) => h('button', { type: 'button', class: 'eb-tab' + (p.key === cur ? ' on' : ''),
        onclick: () => { cur = p.key; localStorage.setItem('eb-tab', cur); show() } }, p.label)
      uniTabs.replaceChildren(h('span', { class: 'eb-cap' }, '表情'), h('div', { class: 'eb-list' }, ...pages.filter((p) => !p.big).map(tab)))
      pakTabs.replaceChildren(h('span', { class: 'eb-cap' }, '表情包'), h('div', { class: 'eb-list' }, ...pages.filter((p) => p.big).map(tab)))
      const pg = pages.find((p) => p.key === cur)
      const matches = tokens.length ? [...all.values()].filter(item => tokens.every(t => /^[a-z0-9]+$/.test(t) ? new RegExp('(^|[^a-z0-9])' + t).test(item.search) : item.search.includes(t))).map(item => item.key) : pg.items()
      const keys = tokens.length ? matches.slice(0, limit) : matches
      grid.className = 'eb-grid' + (tokens.length ? ' searching' : pg.big ? ' big' : '')
      grid.replaceChildren(...keys.map((k) => h('button', { type: 'button', class: 'eb-btn' + (mine.has(k) ? ' on' : ''), title: all.get(k)?.label || emoLabel(k), 'aria-label': emoLabel(k), 'data-emoji': k,
        onclick: () => { pushRecent(k); onPick(k) } }, emo(k), counts[k] ? h('span', { class: 'n' }, counts[k]) : null)))
      if (!matches.length) grid.append(h('p', { class: 'eb-empty', role: 'status' }, '没找到，换个词试试'))
      if (tokens.length && keys.length < matches.length) grid.append(h('button', { class: 'eb-more', type: 'button', onclick: () => { const top = grid.scrollTop; limit += 80; show(); grid.scrollTop = top } }, `更多表情（${matches.length - keys.length}）`))
      grid.scrollTop = 0
    }
    search.oninput = () => { limit = 80; show() }
    show()
  }
  load()
  return board
}
// 表情包按来源合并成一个标签：L站转存的 B站 / 贴吧 和原版的放一起，都叫「B站」「贴吧」；表情代码不变，老消息照常显示
const PACK_MERGE = { 'ld-bili': 'B站', bb: 'B站', bm: 'B站', 'ld-tieba': '贴吧', tieba: '贴吧', 'ld-lark': '飞书', 'ld-xhs': '小红书' }
function packTabs(packs) {
  const tabs = new Map()
  for (const p of packs) {
    if (p.hidden) continue
    const label = PACK_MERGE[p.tab || p.key] || p.label.replace(/^L站·/, '')
    if (!tabs.has(label)) tabs.set(label, { key: 'p:' + label, label, big: true, list: [] })
    tabs.get(label).list.push(p)
  }
  return [...tabs.values()].map((t) => ({ ...t, items: () => {
    const seen = new Set()
    // 同一张图在几个包里都有（比如 ld:bili_040 和 bm:doge）：只留 dupes.json 指定的那一个
    return t.list.flatMap((p) => p.items.map((n) => `${p.key}:${n}`)).filter((k) => !STICKER_DUPES[k] && !seen.has(k) && seen.add(k))
  } })).filter((t) => t.items().length)
}
// 精选：照 linux.do 帖子底部那排回应，顺序也一样；不拿别的表情凑数
const PICKED = ['❤️', '👍', '😆', '😮', '👏', '🎊', '🤗', 'ld:distorted_face', 'ld:tieba_087', 'ld:bili_057']
const pickedEmos = () => PICKED
const ARROWS = ['⬆️', '⬇️', '⬅️', '➡️']
// 表情按钮的快捷栏：手机长按约 0.4 秒弹出，电脑鼠标悬停约 0.3 秒弹出、移开自动收起；
// 点一下快捷栏里的表情直接回应，点按钮本身照旧打开完整面板
// 和 linux.do 一样：固定就是精选那 10 个，两行五个
const quickEmos = pickedEmos
function longPressEmoji(btn, onPick, key) {
  const qkey = key + 'q'
  let timer = 0
  let leave = 0
  let fired = false
  const clear = () => { clearTimeout(timer); timer = 0 }
  const isOpen = () => POP?.key === qkey
  const open = (touch) => {
    if (POP && !isOpen()) return // 别的浮层（比如完整面板）开着就不打扰
    const bar = h('div', { class: 'eq-bar', role: 'toolbar', 'aria-label': '快捷表情' }, quickEmos().map((k) =>
      h('button', { type: 'button', class: 'eq-btn', title: emoLabel(k), 'aria-label': emoLabel(k), onclick: () => { closePop(); pushRecent(k); onPick(k) } }, emo(k))))
    const el = openPop(btn, bar, { key: qkey, cls: 'pop-quick' })
    if (!el) return
    if (touch) { navigator.vibrate?.(10); bar.querySelector('button')?.focus({ preventScroll: true }) }
    el.addEventListener('pointerenter', () => clearTimeout(leave))
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide() })
  }
  const hide = () => { clearTimeout(leave); leave = setTimeout(() => { if (isOpen()) closePop() }, 250) }
  btn.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !S.me) return
    clearTimeout(leave)
    clear()
    timer = setTimeout(() => open(false), 300)
  })
  btn.addEventListener('pointerleave', (e) => { clear(); if (e.pointerType === 'mouse' && isOpen()) hide() })
  btn.addEventListener('pointerdown', (e) => {
    clear()
    if (e.pointerType === 'mouse' || e.button || !S.me) return
    fired = false
    timer = setTimeout(() => { fired = true; open(true) }, 400)
  })
  for (const ev of ['pointerup', 'pointercancel']) btn.addEventListener(ev, clear)
  btn.addEventListener('contextmenu', (e) => { if (fired || timer) e.preventDefault() })
  // 长按松手后浏览器还会补一个 click，吞掉
  btn.addEventListener('click', (e) => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault() } }, true)
  return btn
}
// 输入框用：平台表情插入 [包:名]，Unicode 直接插入
const stickerPicker = (onPick) => emojiBoard((k) => onPick(k.includes(':') ? `[${k}]` : k))

function insertAtCursor(input, text) {
  const s = input.selectionStart ?? input.value.length
  const e = input.selectionEnd ?? s
  input.value = input.value.slice(0, s) + text + input.value.slice(e)
  input.selectionStart = input.selectionEnd = s + text.length
  input.dispatchEvent(new Event('input'))
  input.focus()
}

// 支持 [details="标题"]…[/details] 折叠和 [spoiler]…[/spoiler] 文字遮挡
// 常用 Markdown 子集，参考 GitHub / Discourse：# 标题、**粗** *斜* ~~删~~ `代码`、[文字](链接)、
// - 列表 / 1. 列表 / - [ ] 待办、> 引用、``` 代码块、--- 分割线；剩下的交给 linkify（链接、表情）
const spoilerSpan = (kids) => h('span', { class: 'spoiler-text', title: '点击显示', onclick: (e) => e.currentTarget.classList.add('shown') }, kids)
function mdInline(s) {
  const out = []
  let last = 0
  const re = /`([^`\n]+)`|\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)|~~([^~\n]{1,300})~~|(?<!\*)\*(?![*\s])([^*\n]{1,300}?)(?<!\s)\*(?!\*)|\[spoiler\]([^\n]*?)\[\/spoiler\]/g
  for (const m of s.matchAll(re)) {
    out.push(linkify(s.slice(last, m.index)))
    if (m[1] != null) out.push(h('code', { class: 'md-ic' }, m[1]))
    else if (m[2] != null) out.push(m[3].startsWith('/') ? h('a', { href: m[3], 'data-link': '' }, m[2]) : h('a', { href: m[3], target: '_blank', rel: 'noopener noreferrer' }, m[2]))
    else if (m[4] != null) out.push(h('del', null, mdInline(m[4])))
    else if (m[5] != null) out.push(h('em', null, mdInline(m[5])))
    else out.push(spoilerSpan(mdInline(m[6])))
    last = m.index + m[0].length
  }
  out.push(linkify(s.slice(last)))
  return out
}
const MD_LI = /^\s*([-*+]|\d{1,3}[.)])\s+(.*)$/
function mdBlocks(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out = []
  let para = []
  const flush = () => {
    if (para.length) out.push(h('p', null, para.map((l, i) => [i ? h('br') : null, mdInline(l)])))
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    let m
    if (/^```/.test(l)) {
      flush()
      const buf = []
      for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) buf.push(lines[i])
      out.push(h('pre', { class: 'md-code' }, h('code', null, buf.join('\n'))))
    } else if (!l.trim()) flush()
    else if ((m = l.match(/^(#{1,3})\s+(.+)$/))) { flush(); out.push(h('h' + (m[1].length + 2), { class: 'md-h' }, mdInline(m[2]))) }
    else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { flush(); out.push(h('hr', { class: 'md-hr' })) }
    else if (/^>/.test(l)) {
      flush()
      const buf = []
      for (; i < lines.length && /^>/.test(lines[i]); i++) buf.push(lines[i].replace(/^>\s?/, ''))
      i--
      out.push(h('blockquote', { class: 'md-quote' }, mdBlocks(buf.join('\n'))))
    } else if ((m = l.match(MD_LI))) {
      flush()
      const ordered = /\d/.test(m[1])
      const items = []
      for (; i < lines.length && (m = lines[i].match(MD_LI)) && /\d/.test(m[1]) === ordered; i++) {
        const t = m[2].match(/^\[([ xX])\]\s+(.*)$/)
        items.push(t
          ? h('li', { class: 'md-task' }, h('input', { type: 'checkbox', disabled: true, checked: t[1] !== ' ', 'aria-label': t[1] !== ' ' ? '已完成' : '未完成' }), ' ', mdInline(t[2]))
          : h('li', null, mdInline(m[2])))
      }
      i--
      out.push(h(ordered ? 'ol' : 'ul', { class: 'md-list' }, items))
    } else para.push(l)
  }
  flush()
  return out
}
// 群聊用的精简 Markdown：行内格式（粗 / 斜 / 删 / 代码 / 链接 / 剧透）+ ``` 代码块 + > 引用；换行原样保留（消息框是 pre-wrap）
function mdLite(text) {
  const out = []
  const parts = text.split(/^```[^\n]*\n([\s\S]*?)\n?```[ \t]*$/m)
  parts.forEach((part, pi) => {
    if (pi % 2) return out.push(h('pre', { class: 'md-code' }, h('code', null, part)))
    if (pi > 0) part = part.replace(/^\n/, '')
    if (pi < parts.length - 1) part = part.replace(/\n$/, '')
    const lines = part.split('\n')
    let q = []
    const flushQ = () => { if (q.length) { out.push(h('blockquote', { class: 'md-quote' }, mdInline(q.join('\n')))); q = [] } }
    lines.forEach((l, i) => {
      if (/^>\s?/.test(l)) { q.push(l.replace(/^>\s?/, '')); return }
      flushQ()
      out.push(mdInline(l))
      if (i < lines.length - 1) out.push('\n')
    })
    flushQ()
  })
  return out
}
// 卡片摘要里不渲染格式时，把标记去掉，免得露出 ## 和 ```
const mdPlain = (t = '') => t.replace(/^#{1,3}\s+/gm, '').replace(/^>\s?/gm, '').replace(/^```.*$/gm, '').replace(/~~|`/g, '')
  .replace(/\[([^\]\n]+)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, '$1').replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '· ').replace(/^\s*[-*+]\s+/gm, '· ')
function richText(text, { md = false } = {}) {
  const out = []
  // md 模式下单行剧透在行内处理，跨行的才整块切出来
  const SP = md === true ? /\[spoiler\]((?:(?!\[\/spoiler\])[^\n])*\n[\s\S]*?)\[\/spoiler\]/g : /\[spoiler\]([\s\S]*?)\[\/spoiler\]/g
  const body = md === 'lite' ? mdLite : md ? mdBlocks : linkify
  const withSpoilers = (s) => s.split(SP).map((part, i) =>
    i % 2 ? (md === true ? h('div', { class: 'spoiler-text block', title: '点击显示', onclick: (e) => e.currentTarget.classList.add('shown') }, mdBlocks(part)) : spoilerSpan((md ? mdLite : linkify)(part))) : body(part))
  let last = 0
  for (const m of text.matchAll(/\[details(?:="([^"]*)")?\]([\s\S]*?)\[\/details\]/g)) {
    out.push(withSpoilers(text.slice(last, m.index).replace(/^\n+|\n+$/g, '')))
    out.push(h('details', { class: 'fold' }, h('summary', null, m[1] || '展开'), h('div', md ? { class: 'md' } : null, withSpoilers(m[2].trim()))))
    last = m.index + m[0].length
  }
  out.push(withSpoilers(text.slice(last).replace(/^\n+/, '')))
  return out
}

// 外链图：直连失败时走边缘缓存代理，再失败显示占位
function memeImg(src, attrs = {}) {
  // 文字帖没配图
  if (!src) return h('span', { class: 'img-text' }, icon('doc'))
  const img = h('img', { referrerpolicy: 'no-referrer', decoding: 'async', alt: '', ...attrs })
  img.addEventListener('error', () => {
    if (!img.dataset.fallback && /^https?:\/\//.test(src)) {
      img.dataset.fallback = '1'
      img.src = '/ext?u=' + encodeURIComponent(src)
    } else {
      const ph = h('span', { class: 'img-broken', role: 'button', tabindex: '0', title: '重新加载这张',
        onclick: (e) => { e.stopPropagation(); ph.replaceWith(memeImg(src, attrs)) },
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ph.click() } } },
      icon('image'), h('span', null, '图片没加载出来 · 点这里重试'))
      img.replaceWith(ph)
    }
  })
  img.src = src
  return img
}

function avatar(url, name, size = 28) {
  return url
    ? h('img', { class: 'avatar', src: url, alt: name || '', width: size, height: size, referrerpolicy: 'no-referrer', loading: 'lazy' })
    : h('span', { class: 'avatar avatar-ph', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.44) + 'px', '--h': hueOf(name) } },
      [...(name || '?')][0].toUpperCase())
}
// 没头像时按名字取一个稳定的色相，免得一排回应全是灰点
const hueOf = (s = '') => [...s].reduce((a, ch) => (a * 31 + ch.codePointAt(0)) % 360, 7)

const loginHref = () => '/login?next=' + encodeURIComponent(location.pathname + location.search)
function requireLogin(why = '这个操作') {
  if (S.me) return true
  loginPanel(why)
  return false
}
// 为什么要登录 + 明确的登录按钮；登录完回到当前页
function loginPanel(why) {
  closePop()
  const back = S.modal
  const close = () => { root.remove(); if (!back) document.body.classList.remove('lock') }
  const root = h('div', { class: 'login-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'login-t',
    onclick: (e) => { if (e.target === root) close() }, onkeydown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } } },
    h('div', { class: 'login-card' },
      h('button', { class: 'btn-icon ghost sm modal-close', 'aria-label': '关闭', onclick: close }, icon('close')),
      h('h2', { id: 'login-t' }, '登录后才能' + why.replace(/^这个操作$/, '继续')),
      h('p', null, '登录后可以分享图片、回应、收藏、进群聊天，看过的记录也会跨设备同步。'),
      h('a', { class: 'btn btn-primary block', href: loginHref() }, '前往登录'),
      h('p', { class: 'muted' }, '登录完会回到这个页面。')))
  document.body.append(root)
  document.body.classList.add('lock')
  root.querySelector('a').focus()
}

// 小确认框：choices = [[值, 文字, 样式]]，点外面或 Esc 视为 null
function askChoice(title, text, choices) {
  return new Promise((done) => {
    const prev = document.activeElement
    const end = (v) => { root.remove(); prev?.focus?.(); done(v) }
    const root = h('div', { class: 'login-sheet ask-sheet', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'ask-t', 'aria-describedby': 'ask-d',
      onclick: (e) => { if (e.target === root) end(null) }, onkeydown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); end(null) } } },
      h('div', { class: 'login-card' },
        h('h2', { id: 'ask-t' }, title),
        h('p', { id: 'ask-d' }, text),
        h('div', { class: 'ask-acts' }, choices.map(([v, l, cls]) => h('button', { class: 'btn ' + (cls || 'btn-ghost'), type: 'button', onclick: () => end(v) }, l)))))
    document.body.append(root)
    root.querySelector('button').focus()
  })
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast('已复制', 'ok')
  } catch {
    toast('复制失败，请手动选择')
  }
}

const REWARD = {
  secret: { label: '隐藏口令', emoji: '🔐' },
  credit: { label: 'Credit 红包', emoji: '🧧' },
  cdk: { label: 'CDK 兑换', emoji: '🎟️' },
}

// ---------- 浮层 ----------
// 同一时刻只开一个；key 相同再点一次就是关闭
let POP = null
function closePop() {
  if (!POP) return
  POP.ro?.disconnect()
  POP.cleanup?.()
  POP.el.remove()
  POP = null
}
function openPop(anchor, content, { key, align = 'left', cls = '', up = false, focusScope = null } = {}) {
  if (POP && key && POP.key === key) return closePop()
  closePop()
  const el = h('div', { class: 'pop ' + cls, role: 'dialog' }, content)
  ;(anchor.ownerDocument || document).body.append(el)
  POP = { el, key, anchor, up, align }
  if (focusScope) {
    const doc = el.ownerDocument, win = doc.defaultView
    const inside = (node) => node && (el.contains(node) || focusScope.contains(node))
    let timer = 0
    const leave = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { if (win.innerWidth > 760 && POP?.el === el && !inside(doc.activeElement)) closePop() }, 0)
    }
    const blur = () => { if (win.innerWidth > 760 && POP?.el === el) closePop() }
    doc.addEventListener('focusout', leave)
    doc.addEventListener('focusin', leave)
    win.addEventListener('blur', blur)
    POP.cleanup = () => { clearTimeout(timer); doc.removeEventListener('focusout', leave); doc.removeEventListener('focusin', leave); win.removeEventListener('blur', blur) }
  }
  placePop(anchor, el, align, up)
  // 内容（表情图等）加载后会变高，重新摆一次，免得往下盖住输入框
  if (up || content.classList?.contains('eb')) {
    POP.ro = new ResizeObserver(() => { if (POP?.el === el) placePop(anchor, el, align, up) })
    POP.ro.observe(el)
  }
  return el
}
function placePop(anchor, el, align, up = false) {
  const win = anchor.ownerDocument?.defaultView || window
  const { innerWidth, scrollX, scrollY } = win
  // 手机弹出输入法时可见区域变矮（iOS 只缩 visualViewport），按看得见的那块摆，免得浮层被键盘盖住
  const vv = win.visualViewport
  const innerHeight = vv ? vv.height + vv.offsetTop : win.innerHeight
  const topEdge = (vv?.offsetTop || 0) + 8
  el.style.maxHeight = Math.max(100, innerHeight - topEdge - 8) + 'px'
  el.style.setProperty('--pop-height', Math.max(100, innerHeight - topEdge - 10) + 'px')
  const r = anchor.getBoundingClientRect()
  const w = el.offsetWidth
  const ht = el.offsetHeight
  let left = align === 'right' ? r.right - w : r.left
  left = Math.max(8, Math.min(left, innerWidth - w - 8))
  let top = r.bottom + 6
  if (up && r.top - ht - 6 > 8) top = r.top - ht - 6
  else if (top + ht > innerHeight - 8 && r.top - ht - 6 > 8) top = r.top - ht - 6
  top = Math.max(topEdge, Math.min(top, innerHeight - ht - 8))
  el.style.left = left + scrollX + 'px'
  el.style.top = top + scrollY + 'px'
}
function popOutside(e) {
  if (!POP || POP.el.contains(e.target)) return
  if (POP.el.classList.contains('pop-boost') && POP.anchor.closest?.('.rp-form')?.contains(e.target)) return
  const trig = e.target.closest('[data-pop]')
  if (trig && POP.key && trig.dataset.pop === POP.key) return
  closePop()
}
document.addEventListener('pointerdown', popOutside)
// 窗口变宽变窄就收起浮层；手机上只变高度（弹出 / 收起输入法、地址栏伸缩）不收，挪个位置——以前一弹输入法浮层就被关掉，输入框用不了
let popW = innerWidth
const popResize = () => {
  if (POP && innerWidth === popW) return placePop(POP.anchor, POP.el, POP.align, POP.up)
  popW = innerWidth
  closePop()
}
addEventListener('resize', popResize)
visualViewport?.addEventListener('resize', () => { if (POP && innerWidth === popW) placePop(POP.anchor, POP.el, POP.align, POP.up) })
visualViewport?.addEventListener('resize', () => document.body.classList.toggle('mobile-keyboard', innerWidth<=640 && innerHeight-visualViewport.height>150))

// ---------- 看过 ----------
// 卡片在视口里停留约 0.8 秒记为看过；登录用户上报服务器，游客只记在本地
const SEEN = {
  local: new Set(JSON.parse(localStorage.getItem('seen') || '[]')),
  queue: new Set(),
  timers: new Map(),
  flushT: 0,
  retryT: 0,
  inflight: null,
  owner: 0,
}
const seenPendingKey = (uid) => `seen-pending:${uid}`
function savePendingSeen() {
  if (!SEEN.owner) return
  try {
    if (SEEN.queue.size) localStorage.setItem(seenPendingKey(SEEN.owner), JSON.stringify([...SEEN.queue]))
    else localStorage.removeItem(seenPendingKey(SEEN.owner))
  } catch {}
}
function restorePendingSeen() {
  const uid = Number(S.me?.id) || 0
  if (!uid || SEEN.owner === uid) return
  savePendingSeen()
  SEEN.queue.clear()
  SEEN.owner = uid
  try {
    const ids = JSON.parse(localStorage.getItem(seenPendingKey(uid)) || '[]')
    if (Array.isArray(ids)) for (const id of ids) if (Number.isSafeInteger(id) && id > 0) SEEN.queue.add(id)
  } catch {}
}
const isSeen = (m) => (S.me ? !!m.seen_at || (SEEN.owner === S.me.id && SEEN.queue.has(m.id)) : SEEN.local.has(m.id))
function markSeen(m) {
  if (!(m.id > 0) || isSeen(m)) return
  if (S.me) {
    restorePendingSeen()
    SEEN.queue.add(m.id)
    savePendingSeen()
    clearTimeout(SEEN.flushT)
    SEEN.flushT = setTimeout(() => flushSeen().catch(() => {}), SEEN.queue.size >= 100 ? 0 : 1500)
    syncItem({ ...m, seen_at: Math.floor(Date.now() / 1000) })
  } else {
    SEEN.local.add(m.id)
    clearTimeout(SEEN.flushT)
    SEEN.flushT = setTimeout(flushSeen, 1500)
    syncItem(m)
  }
  S.wall?.onSeen?.(m)
  imSeen(m)
}
function retrySeenLater() {
  if (SEEN.retryT) return
  SEEN.retryT = setTimeout(() => {
    SEEN.retryT = 0
    flushSeen().catch(() => {})
  }, 5000)
}
function flushSeen() {
  clearTimeout(SEEN.flushT)
  if (!S.me) {
    const arr = [...SEEN.local]
    localStorage.setItem('seen', JSON.stringify(arr.slice(-20000)))
    return Promise.resolve()
  }
  restorePendingSeen()
  if (SEEN.inflight) return SEEN.inflight
  if (!SEEN.queue.size) return Promise.resolve()
  const uid = SEEN.owner
  SEEN.inflight = (async () => {
    while (SEEN.owner === uid && SEEN.queue.size) {
      const ids = [...SEEN.queue].slice(0, 100)
      const res = await fetch('/api/views', { method: 'POST', body: JSON.stringify({ ids }), credentials: 'same-origin', keepalive: true,
        headers: { 'content-type': 'text/plain' } })
      if (!res.ok || !(await res.json().catch(() => null))?.ok) throw new Error('已看记录尚未同步，请重试')
      if (SEEN.owner !== uid) break
      ids.forEach((id) => SEEN.queue.delete(id))
      savePendingSeen()
    }
  })().catch((error) => { retrySeenLater(); throw error }).finally(() => { SEEN.inflight = null })
  return SEEN.inflight
}
// 离页时 Beacon 只表示浏览器接收，不能当作 D1 已确认；保留队列供下次登录重发。
function flushSeenOnExit() {
  if (!S.me) return flushSeen()
  restorePendingSeen()
  savePendingSeen()
  const ids = [...SEEN.queue]
  for (let i = 0; i < ids.length; i += 100) {
    navigator.sendBeacon?.('/api/views', new Blob([JSON.stringify({ ids: ids.slice(i, i + 100) })], { type: 'text/plain' }))
  }
}
addEventListener('pagehide', flushSeenOnExit)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushSeenOnExit()
  else if (SEEN.queue.size) flushSeen().catch(() => {})
})

const seenIO = new IntersectionObserver((entries) => {
  for (const en of entries) {
    const el = en.target
    // 整张都在视野里才算看过；比屏幕还高的长图，占满大半屏也算
    const full = en.isIntersecting && (en.intersectionRatio >= 0.97 || en.intersectionRect.height >= (en.rootBounds?.height || innerHeight) * 0.85)
    if (full) {
      if (!SEEN.timers.has(el)) SEEN.timers.set(el, setTimeout(() => {
        SEEN.timers.delete(el)
        seenIO.unobserve(el)
        const m = ITEMS.get(Number(el.dataset.id))
        if (m && !(wantBlur(m) && el.querySelector('[data-blur].blur'))) markSeen(m)
      }, 800))
    } else {
      clearTimeout(SEEN.timers.get(el))
      SEEN.timers.delete(el)
    }
  }
}, { threshold: [0, 0.25, 0.5, 0.7, 0.85, 0.97, 1] })

// ---------- 同一张图的多处展示保持同步 ----------
const ITEMS = new Map()   // id -> 最新数据
const WATCH = new Map()   // id -> Set<fn>
function syncItem(next) {
  const cur = ITEMS.get(next.id)
  // 卡片版只带前几十条回应；已有完整版且回应数没变时保留完整列表
  if (cur?.full && !next.full && cur.reply_count === next.reply_count) {
    next = { ...next, full: true, replies: cur.replies, reply_list: cur.reply_list }
  }
  const merged = cur ? Object.assign(cur, next) : next
  ITEMS.set(next.id, merged)
  WATCH.get(next.id)?.forEach((fn) => fn(merged))
  return merged
}
function watchItem(id, fn) {
  if (!WATCH.has(id)) WATCH.set(id, new Set())
  WATCH.get(id).add(fn)
  return () => { const list = WATCH.get(id); list?.delete(fn); if (!list?.size) WATCH.delete(id) }
}
const PAGE_CLEAN = []
const onPageLeave = (fn) => PAGE_CLEAN.push(fn)

// 乐观更新：先改界面，失败就回滚
async function act(m, optimistic, req) {
  if (!requireLogin('回应和点赞')) return
  const snap = structuredClone({ ...m })
  if (optimistic) syncItem(optimistic(structuredClone({ ...m })))
  try {
    const { item } = await req()
    syncItem(item)
    return item
  } catch (e) {
    if (optimistic) syncItem(snap)
    toast(e.message, 'err')
  }
}

const toggleLike = (m) => act(m,
  (x) => ({ ...x, liked: !x.liked, like_count: x.like_count + (x.liked ? -1 : 1) }),
  () => api(`/memes/${m.id}/like`, { method: 'POST' }))

function toggleReaction(m, key) {
  return act(m, (x) => {
    const list = x.reactions.map((r) => ({ ...r }))
    let r = list.find((y) => y.emoji === key)
    if (!r) list.push((r = { emoji: key, count: 0, mine: false }))
    r.count += r.mine ? -1 : 1
    r.mine = !r.mine
    return { ...x, reactions: list }
  }, () => api(`/memes/${m.id}/reactions`, { method: 'POST', body: { emoji: key } }))
}

// ---------- 卡片 ----------

const memeHref = (m) => `/m/${m.id}`
const authorUser = (m) => ({ username: m.author_name, name: m.author_nick, fancy: m.author_fancy, deco: m.author_deco })
const authorLink = (m) => m.author_name
  ? uName('a', authorUser(m), { class: 'who-name', href: `/u/${encodeURIComponent(m.author_name)}`, 'data-link': '' }, m.author_nick || m.author_name, 'post')[0]
  : h('span', { class: 'who-name' }, '佚名')

function seenTag(m) {
  const seen = isSeen(m)
  return h('span', { class: 'when' + (seen ? ' seen' : ''), title: new Date(m.created_at * 1000).toLocaleString('zh-CN', { hour12: false }) },
    seen ? icon('check', 'i tiny') : h('i', { class: 'dot' }),
    fmtTime(m.created_at), !seen && h('span', { class: 'sr-only' }, '，未看'))
}

// stack：横向浏览时，同一帖的多张图上下排开（不用宫格 / 轮播）
function memeCard(m, { stack = false } = {}) {
  m = syncItem(m)
  const slot = 'c' + Math.random().toString(36).slice(2, 8)
  const status = h('span', null, seenTag(m))
  const comments = h('div', { class: 'card-comments', hidden: true })
  const bar = (x) => actionBar(x, slot, { onComment: toggleComments, commentsOpen: !comments.hidden })
  function toggleComments() {
    if (!comments.firstChild) comments.append(commentsSection(ITEMS.get(m.id) || m, { compact: true }))
    comments.hidden = !comments.hidden
    actions.replaceChildren(bar(ITEMS.get(m.id) || m))
    if (!comments.hidden) comments.querySelector('textarea')?.focus({ preventScroll: true })
  }
  const actions = h('div', { class: 'card-actions' }, bar(m))
  const replies = h('div', { class: 'card-replies' }, replyBlock(m, { compact: true }))
  const isText = m.kind === 'text'
  // 手机上一句回应默认收起，点这个才展开
  const rpN = h('span', null, m.reply_count || '')
  const rpBtn = h('button', { class: 'rp-toggle', type: 'button', 'aria-expanded': 'false', title: '一句回应',
    onclick: () => { const on = card.classList.toggle('rp-open'); rpBtn.setAttribute('aria-expanded', on ? 'true' : 'false') } },
  icon('rocket'), rpN)
  const card = h('article', { class: 'card' + (isText ? ' text-card wide' : '') + (ANCHORS.has(m.id) ? ' anchored' : ''), 'data-id': m.id, 'aria-label': m.title || m.text || '梗图' },
    h('div', { class: 'card-head' },
      avatar(m.author_avatar, m.author_name, 34),
      compactIdentity(authorUser(m), 'post', authorLink(m), status),
      isText && h('span', { class: 'badge text-badge' }, '文字'),
      h('span', { class: 'grow' }),
      h('span', { class: 'serial', title: '全站编号' }, h('span', { class: 'no' }, 'No.'), m.id),
      h('span', { class: 'anchor-badge', title: '我的锚点' }, icon('anchor', 'i tiny')),
      h('button', { class: 'btn-icon ghost sm', 'aria-label': '更多操作', 'data-pop': slot + 'm', onclick: (e) => moreMenu(m, e.currentTarget, slot + 'm') }, icon('more'))),
    cardText(m),
    m.tags?.length > 0 && h('nav', { class: 'card-tags', 'aria-label': '帖子标签' }, m.tags.map(t => h('a', { href: '/t/' + encodeURIComponent(t) + location.search, 'data-link': '' }, '#' + t))),
    isText ? textMedia(m) : cardMedia(m, { stack }),
    h('div', { class: 'card-bottom' }, actions, rpBtn,
      h('button', { class: 'btn-icon ghost sm card-share', 'aria-label': '分享帖子', type: 'button', onclick: () => copyText(location.origin + memeHref(m)) }, icon('send'))),
    replies,
    comments)
  onRemoval(card, watchItem(m.id, (x) => {
    status.replaceChildren(seenTag(x))
    rpN.textContent = x.reply_count || ''
    actions.replaceChildren(bar(x))
    // 输入框正在编辑时别打断
    if (!replies.contains(document.activeElement)) {
      const top = replies.querySelector('.rp-strip')?.scrollTop
      replies.replaceChildren(replyBlock(x, { compact: true }))
      const strip = replies.querySelector('.rp-strip')
      if (strip && top) strip.scrollTop = top
    }
  }))
  // 点卡片空白处（不是图、按钮、链接、输入框）进详情；选中文字时不跳
  card.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return
    if (e.target.closest('a, button, input, textarea, select, label, video, [contenteditable], .media, .card-comments, .pop')) return
    if (String(getSelection()).trim()) return
    navigate(memeHref(m))
  })
  if (!isSeen(m)) seenIO.observe(card)
  onRemoval(card, () => seenIO.unobserve(card))
  return card
}

function wallCard(m, options) {
  if (options?.stack) return memeCard(m, options)
  const render = () => [memeCard(ITEMS.get(m.id) || m, options)]
  const shell = h('div', { class: 'card-slot' + (m.kind === 'text' ? ' wide' : ''), 'data-id': m.id }, render())
  return windowContent(shell, render)
}
function removeRenderedMeme(id) {
  document.querySelectorAll(`.card-slot[data-id="${id}"], .card[data-id="${id}"], .im-msg[data-id="${id}"], .ld-post[data-id="${id}"]`).forEach(el => {
    el.dataset.removed = '1'; el.remove()
  })
}

// 标题 + 摘要；被截断或有折叠内容时可就地展开全文，不用进详情
function cardText(m) {
  if (!m.title && !m.text) return null
  const isText = m.kind === 'text'
  const desc = m.text && m.text !== m.title
    ? h('div', { class: 'card-desc' + (isText ? ' md' : '') }, isText ? richText(m.text, { md: true }) : linkify(mdPlain(m.text)))
    : null
  // 文字帖摘要按高度截：真的被截了才加底部渐隐
  if (isText && desc) requestAnimationFrame(() => desc.classList.toggle('clipped', desc.scrollHeight > desc.clientHeight + 2))
  let full = null
  const more = m.text_cut && h('button', { class: 'btn-text sm more-text', type: 'button', 'aria-expanded': 'false', onclick: async (e) => {
    const btn = e.currentTarget
    const card = btn.closest('.card')
    if (full?.isConnected) {
      // 收起：换回摘要
      if (desc) full.replaceWith(desc)
      else full.remove()
      btn.textContent = '展开全文'
      btn.setAttribute('aria-expanded', 'false')
      if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start' })
      return
    }
    btn.disabled = true
    try {
      if (!full) {
        const { meme } = await api(`/memes/${m.id}`)
        full = h('div', { class: 'card-desc full md' }, richText(meme.content, { md: true }))
      }
      if (desc) desc.replaceWith(full)
      else btn.before(full)
      btn.textContent = '收起'
      btn.setAttribute('aria-expanded', 'true')
    } catch (err) { toast(err.message, 'err') }
    btn.disabled = false
  } }, '展开全文')
  return h('div', { class: 'card-text' }, m.title && h('h3', { class: 'card-title' }, m.title), desc, more)
}

// 视频 / 实况 / 动图的角标
const KIND_LABEL = { v: '视频', l: '实况', g: 'GIF' }
const kindBadge = (im) => im?.k && h('span', { class: 'kind-badge' }, KIND_LABEL[im.k])
// 卡片里的实况：静音循环，滑出屏幕自动停（vidIO）；省流量模式下只放封面
const cellPic = (im, src, opts) => im?.k === 'l' && im.v && !navigator.connection?.saveData
  ? (() => { const v = liveOnce(h('video', { class: 'live-cell', src: im.v, poster: src, muted: true, playsinline: true, autoplay: true, preload: 'metadata', width: opts.width || null, height: opts.height || null, 'aria-label': opts.alt || '实况' })); vidIO.observe(v); return v })()
  : memeImg(src, opts)
// 局部打码且保留了原图的：点一下看原图，再点一下恢复（看大图走右键菜单）
function peekOrig(e, im) {
  if (!im?.o || maskTap() === 'view') return false
  const cell = e.currentTarget
  const img = cell.querySelector('img')
  if (!img) return false
  const on = !cell.classList.contains('peek')
  cell.classList.toggle('peek', on)
  img.src = on ? im.o : im.t || im.u
  const b = cell.querySelector('.mask-badge')
  if (b) b.textContent = on ? '原图 · 点一下恢复' : '已打码 · 点一下看原图'
  cell.setAttribute('aria-pressed', on ? 'true' : 'false')
  return true
}
const cellMark = (im) => nodes(kindBadge(im), im?.o && h('span', { class: 'mask-badge' }, maskTap() === 'view' ? '已打码 · 大图里可看原图' : '已打码 · 点一下看原图'), im?.k === 'v' && h('span', { class: 'play-mark' }, icon('play')))
// 轮播：横向滑动、圆点、左右键；高度按第一张定，夹在 3:4 和 16:9 之间
function carousel(m, imgs, { detail = false } = {}) {
  const n = imgs.length
  const r0 = imgs[0].w && imgs[0].h ? imgs[0].w / imgs[0].h : 1
  const ratio = Math.min(16 / 9, Math.max(3 / 4, r0))
  const track = h('div', { class: 'car-track', tabindex: '0', role: 'group', 'aria-roledescription': '轮播', 'aria-label': `${n} 张图，左右滑动` },
    imgs.map((im, i) => detail && im.v
      ? h('div', { class: 'cell car-cell', role: 'group', 'aria-label': `第 ${i + 1} 项，共 ${n} 项` },
        mediaVideo(im, { onOpen: () => openViewer(m, i) }),
        h('button', { class: 'stage-open', type: 'button', onclick: () => openViewer(m, i) }, icon('ext', 'i tiny'), '完整预览'))
      : h('button', { class: 'cell car-cell', type: 'button', onclick: (e) => peekOrig(e, im) || openViewer(m, i), 'aria-label': `查看第 ${i + 1} 张，共 ${n} 张` },
        cellPic(im, detail ? im.u : im.t || im.u, { loading: i < 2 ? null : 'lazy', alt: altOf(m, i, n) }), cellMark(im))))
  const count = h('span', { class: 'car-count' }, `1 / ${n}`)
  const dots = h('div', { class: 'car-dots', 'aria-hidden': 'true' }, imgs.slice(0, 12).map((_, i) => h('i', { class: i ? '' : 'on' })))
  const go = (d) => track.scrollBy({ left: d * track.clientWidth, behavior: REDUCED.matches ? 'auto' : 'smooth' })
  const prev = h('button', { class: 'car-nav prev', type: 'button', 'aria-label': '上一张', hidden: true, onclick: () => go(-1) }, icon('chevL'))
  const next = h('button', { class: 'car-nav next', type: 'button', 'aria-label': '下一张', onclick: () => go(1) }, icon('chevR'))
  let raf = 0
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
      count.textContent = `${i + 1} / ${n}`
      ;[...dots.children].forEach((d, j) => d.classList.toggle('on', j === i))
      prev.hidden = i <= 0
      next.hidden = i >= n - 1
    })
  }, { passive: true })
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); go(e.key === 'ArrowLeft' ? -1 : 1) }
  })
  return h('div', { class: detail ? 'stage carousel detail-carousel' : 'media carousel', style: { '--ratio': ratio } }, track, prev, next, count, dots)
}

// 图：单图按原比例完整展示，超长图（高是宽的 2.2 倍以上）先折叠；多图宫格；慎点先盖住
const LONG_RATIO = 2.2
const altOf = (m, i, n) => (m.title || m.text || '梗图').slice(0, 60) + (n > 1 ? `（第 ${i + 1} 张）` : '')
// 文字帖的配图：一排小方图，点开看大图
function textMedia(m) {
  const imgs = m.images || []
  if (!imgs.length) return null
  const show = imgs.slice(0, 6)
  const box = h('div', { class: 'media thumbs' }, show.map((im, i) => h('button', { class: 'cell', type: 'button', onclick: (e) => peekOrig(e, im) || openViewer(m, i), 'aria-label': `查看第 ${i + 1} 张` },
    cellPic(im, im.t || im.u, { loading: 'lazy', alt: altOf(m, i, imgs.length) }), cellMark(im),
    i === show.length - 1 && imgs.length > show.length && h('span', { class: 'more-n' }, '+' + (imgs.length - show.length)))))
  box.dataset.blur = m.id
  applyBlur(box)
  return box
}
function cardMedia(m, { stack = false } = {}) {
  if (m.kind === 'text') return textMedia(m)
  const imgs = m.images?.length ? m.images : [{ u: m.image, t: m.thumb, w: m.width, h: m.height }]
  let box
  if (stack && imgs.length > 1) {
    // 横向浏览：每张图按原比例上下排，帖子里上下滚动看
    box = h('div', { class: 'media stack' }, imgs.map((im, i) => h('button', { class: 'cell', type: 'button',
      style: im.w && im.h ? { aspectRatio: `${im.w} / ${im.h}` } : null,
      onclick: (e) => peekOrig(e, im) || openViewer(m, i), 'aria-label': `查看第 ${i + 1} 张，共 ${imgs.length} 张` },
    cellPic(im, im.t || im.u, { loading: i < 2 ? null : 'lazy', width: im.w || null, height: im.h || null, alt: altOf(m, i, imgs.length) }), cellMark(im))))
  } else if (m.layout === 'carousel' && imgs.length > 1) box = carousel(m, imgs)
  else if (m.image_count > 1 && imgs.length > 1) {
    const show = imgs.slice(0, 4)
    box = h('div', { class: 'media grid-' + show.length },
      show.map((im, i) => h('button', { class: 'cell', type: 'button', onclick: (e) => peekOrig(e, im) || openViewer(m, i), 'aria-label': `查看第 ${i + 1} 张` },
        cellPic(im, im.t || im.u, { loading: 'lazy', alt: altOf(m, i, m.image_count) }), cellMark(im),
        i === show.length - 1 && m.image_count > show.length && h('span', { class: 'more-n' }, '+' + (m.image_count - show.length)))))
  } else {
    const im = imgs[0]
    const tall = im.w && im.h && im.h / im.w > LONG_RATIO
    // 单张：按原比例缩进一个限高的框里，小图不放大；动图 / 视频 / 实况再矮一截，免得一刷出来满屏在动
    const anim = !!im.k || /\.gif(\?|$)/i.test(im.u || m.image || '')
    box = h('div', { class: 'media single' + (tall ? ' tall' : ' fit') + (anim ? ' anim' : ''),
      style: !tall && im.w && im.h ? { '--ar': (im.w / im.h).toFixed(4), '--nw': im.w + 'px' } : null },
      h('button', { class: 'cell', type: 'button', onclick: (e) => peekOrig(e, im) || openViewer(m, 0), 'aria-label': im.o ? '已打码，点一下看原图' : '查看大图' },
        cellPic(im, im.u || m.image, { loading: 'lazy', width: im.w || null, height: im.h || null, alt: altOf(m, 0, 1) }), cellMark(im)))
    if (tall) {
      box.append(h('span', { class: 'long-badge' }, '长图'),
        h('button', { class: 'expand', type: 'button', 'aria-expanded': 'false', onclick: (e) => {
          // 横向浏览：卡片高度就是一列，原地展开会撑出卡片里的滚动条，直接看大图
          if (box.closest('.wall.hz')) { e.stopPropagation(); return openViewer(m, 0) }
          const btn = e.currentTarget
          const open = box.classList.toggle('tall')
          btn.setAttribute('aria-expanded', String(!open))
          btn.classList.toggle('collapse', !open)
          btn.replaceChildren(open ? '展开完整图片' : '收起', icon(open ? 'chevD' : 'chevU', 'i tiny'))
          // 收起时把卡片顶部拉回视野，不然人会被留在下面一大截空白里
          if (open) { const card = box.closest('.card'); if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start' }) }
        } },
        '展开完整图片', icon('chevD', 'i tiny')))
    }
  }
  box.dataset.blur = m.id
  applyBlur(box)
  return box
}

// ---------- 内容显示 ----------
// NSFW 统称：慎点图 + 带番号/车牌、NSFW 等标签的图（服务端 SENSITIVE_TAGS）
// 一个设置管图廊、搜索、图集封面、群聊：hide 不出现（默认）/ blur 模糊，单张点开 / show 直接显示 / only 只看 NSFW（仍模糊）
// 另有一键模糊（快捷键 B）：所有图都先模糊，和上面的选择叠加
const CONTENT_MODES = [['hide', '隐藏敏感'], ['blur', '模糊显示'], ['show', '直接显示'], ['only', '只看 NSFW']]
S.content = localStorage.getItem('content') || (localStorage.getItem('nsfw') === '0' ? 'hide' : localStorage.getItem('nsfw') === 'only' ? 'only'
  : localStorage.getItem('blur') === 'off' ? 'show' : 'hide')
if (!CONTENT_MODES.some(([v]) => v === S.content)) S.content = 'hide'
S.blurAll = localStorage.getItem('blur') === 'all'
const isRisky = (m) => !!(m.sensitive ?? m.spoiler)
const UNBLUR = new Set((() => { try { return JSON.parse(localStorage.getItem('unblur')) || [] } catch { return [] } })())
const wantBlur = (m) => S.blurAll || (S.content !== 'show' && isRisky(m) && !UNBLUR.has(m.id))
function setUnblur(m, on) {
  on ? UNBLUR.add(m.id) : UNBLUR.delete(m.id)
  localStorage.setItem('unblur', JSON.stringify([...UNBLUR].slice(-3000)))
  refreshBlur()
  toast(on ? '这帖以后不再模糊（只对你自己）' : '这帖恢复模糊')
}
// 模糊 / 打码的图点一下怎么办：peek = 原地揭开、再点盖回；view = 不揭开，直接打开大图看（防止点一下当场社死）
const maskTap = () => localStorage.getItem('maskTap') === 'view' ? 'view' : 'peek'
// 离开期间的消息提醒：on 开关、sec 多少秒后自己消失（0 = 不消失）
const awayPrefs = () => { try { return { on: true, sec: 0, ...JSON.parse(localStorage.getItem('chatAway') || '{}') } } catch { return { on: true, sec: 0 } } }
const nsfwParam = () => (S.content === 'hide' ? { nsfw: '0' } : S.content === 'only' ? { nsfw: 'only' } : {})
Object.defineProperty(S, 'nsfw', { get: () => S.content !== 'hide' })

// 按当前设置盖住或揭开一块图区；只揭开这一张，右上角留「遮住」随时盖回去
function applyBlur(box) {
  const m = ITEMS.get(Number(box.dataset.blur))
  box.querySelectorAll(':scope > .veil, :scope > .recover').forEach((e) => e.remove())
  box._open = false
  if (!m || !wantBlur(m)) return box.classList.remove('blur')
  const risky = isRisky(m)
  const veil = h('button', { class: 'veil', type: 'button', onclick: (e) => {
    e.stopPropagation()
    // 设置成「点开看大图」：页面上一直盖着，只在大图里看
    if (maskTap() === 'view') { const i = Number(e.target.closest('[data-i]')?.dataset.i) || 0; return openViewer(ITEMS.get(m.id) || m, i) }
    box.classList.remove('blur'); veil.replaceWith(cover); box._open = true; markSeen(ITEMS.get(m.id) || m)
  } },
    h('strong', null, risky ? 'NSFW' : '一键模糊'),
    h('span', { class: 'veil-why' }, !risky ? '一键模糊已开，所有图都先模糊（按 B 关闭）'
      : m.spoiler ? '发布者标了「慎点」' : `带有 ${(m.tags || []).filter((t) => S.nsfwTags.includes(t)).map((t) => '#' + t).join(' ') || '敏感'} 标签`),
    h('span', null, maskTap() === 'view' ? '点一下打开大图看（页面上一直盖着）' : '点一下只看这张，再点一下盖回去'))
  const cover = h('button', { class: 'recover', type: 'button', title: '重新遮住（直接点图也行）', onclick: (e) => {
    e.stopPropagation(); box.classList.add('blur'); cover.replaceWith(veil); box._open = false
  } }, icon('eyeOff', 'i tiny'), '遮住')
  box._cover = cover
  // 揭开后再点图 = 盖回去；想看大图用右键菜单
  if (!box._bt) {
    box._bt = true
    box.addEventListener('click', (e) => {
      if (!box._open || e.target.closest('.recover, .car-nav, .expand')) return
      if (!e.target.closest('.cell, .stage-img, figure')) return
      e.preventDefault()
      e.stopPropagation()
      box._cover?.click()
    }, true)
  }
  box.classList.add('blur')
  box.append(veil)
}
const refreshBlur = () => {
  document.documentElement.toggleAttribute('data-blur-all', S.blurAll)
  document.querySelectorAll('[data-blur]').forEach(applyBlur)
  FISH?.pip?.document.querySelectorAll('[data-blur]').forEach(applyBlur)
  document.querySelectorAll('[data-risky]').forEach((el) => el.classList.toggle('blur', S.blurAll || (S.content !== 'show' && el.dataset.risky === '1')))
}
// 小缩略图（图集封面、锚点、我的）用：data-risky 标记，随设置刷新
const thumbBlur = (cls, risky) => ({ 'data-risky': risky ? '1' : '0', class: cls + (S.blurAll || (S.content !== 'show' && risky) ? ' blur' : '') })

function setContent(mode) {
  const before = nsfwParam().nsfw
  S.content = mode
  localStorage.setItem('content', mode)
  localStorage.removeItem('nsfw')
  toast({ hide: '已隐藏敏感内容：图廊、搜索、标签、图集里都不出现', blur: '敏感图先模糊，点一张看一张', show: '直接显示所有图', only: '只看 NSFW 内容' }[mode])
  document.querySelectorAll('.content-seg').forEach((el) => el.replaceWith(contentSeg()))
  if (nsfwParam().nsfw === before) return refreshBlur()
  S.bgKey = null
  route()
  if (IM) { imLoadConvs(); if (IM.cur) imOpen(IM.cur) }
  if (LD) { LD.metaP = ldMeta(); LD.handle = null; const last = Number(localStorage.getItem('ld-last')); ldJump(last ? { focus: last } : { bottom: true }) }
}
const nextContent = () => CONTENT_MODES[(CONTENT_MODES.findIndex(([v]) => v === S.content) + 1) % CONTENT_MODES.length][0]
const contentLabel = () => CONTENT_MODES.find(([v]) => v === S.content)[1]
function setBlurAll(on) {
  S.blurAll = on
  if (on) localStorage.setItem('blur', 'all')
  else localStorage.removeItem('blur')
  refreshBlur()
  toast(on ? '一键模糊：所有图都先模糊（再按 B 恢复）' : '一键模糊已关')
}
function contentSeg() {
  return h('div', { class: 'segs content-seg wrap', role: 'radiogroup', 'aria-label': '内容显示' },
    CONTENT_MODES.map(([v, l]) => h('button', { class: 'seg' + (S.content === v ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': S.content === v ? 'true' : 'false',
      onclick: () => S.content !== v && setContent(v) }, l)))
}

// 互动栏：喜欢 · 表情（前两个 + 选择器）· 评论 · 收藏
function actionBar(m, slot, { full = false, onComment = null, commentsOpen = false } = {}) {
  const likes = (m.ld_likes || 0) + (m.like_count || 0)
  const like = h('button', { class: 'act like' + (m.liked ? ' on' : ''), 'aria-pressed': m.liked ? 'true' : 'false',
    title: `喜欢${m.ld_likes ? `（含 linux.do 的 ${m.ld_likes} 个赞）` : ''}`,
    onclick: (e) => { if (!m.liked) e.currentTarget.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], 260); toggleLike(m) } },
  icon('heart'), h('span', { class: likes ? null : 'word' }, likes ? fmtN(likes) : '喜欢'))

  const used = m.reactions.filter((r) => r.count > 0).sort((a, b) => b.count - a.count || (b.mine - a.mine))
  const shown = full ? used : used.slice(0, 12)
  // 点表情 = 回应 / 取消；点数字 = 看是谁回应的
  const chips = shown.map((r) => h('button', { class: 'act rx' + (r.mine ? ' on' : ''), title: emoLabel(r.emoji) + ' · 点数字看是谁', 'data-pop': slot + 'w' + r.emoji,
    onclick: (e) => {
      if (e.target.closest('.rx-n')) return whoReacted(e.currentTarget, `/memes/${m.id}/who`, slot + 'w' + r.emoji, r.emoji)
      toggleReaction(m, r.emoji)
    } },
  emo(r.emoji), h('span', { class: 'rx-n' }, r.count)))
  const rest = used.length - shown.length
  const pick = h('button', { class: 'act icon-only pick', title: '表情回应', 'aria-label': '表情回应', 'data-pop': slot + 'e', 'data-rest': rest,
    onclick: (e) => { if (requireLogin()) openPop(e.currentTarget, emojiPanel(m), { key: slot + 'e', cls: 'pop-emo' }) } },
  icon('emojiAdd'), h('span', { class: 'n', hidden: rest <= 0 }, '+' + rest))
  longPressEmoji(pick, (k) => toggleReaction(ITEMS.get(m.id) || m, k), slot + 'e')

  const comment = onComment
    ? h('button', { class: 'act' + (commentsOpen ? ' on' : ''), type: 'button', title: commentsOpen ? '收起评论' : '展开评论',
      'aria-expanded': commentsOpen ? 'true' : 'false', onclick: onComment }, icon('chat'), h('span', { class: m.comment_count ? null : 'word' }, m.comment_count ? m.comment_count : '评论'))
    : h('a', { class: 'act', href: memeHref(m) + '#comments', 'data-link': '', title: '评论' }, icon('chat'), h('span', { class: m.comment_count ? null : 'word' }, m.comment_count ? m.comment_count : '评论'))
  // 发帖人 / 管理员：一键加上或去掉 NSFW（敏感标签 + 慎点一起清）
  const nsfwBtn = m.can_manage && h('button', { class: 'act nsfw-tg' + (isRisky(m) ? ' on' : ''), type: 'button', 'aria-pressed': isRisky(m) ? 'true' : 'false',
    title: isRisky(m) ? '去掉 NSFW（敏感标签和慎点一起去掉）' : '标成 NSFW（加 #NSFW 标签，默认模糊）', onclick: (e) => toggleNsfw(m, e.currentTarget) },
  h('span', { class: 'nsfw-tg-t' }, 'NSFW'), icon('swap', 'i tiny'))
  const faved = m.fav_folders?.length > 0
  const fav = h('button', { class: 'act fav' + (faved ? ' on' : ''), 'data-pop': slot + 'f', 'data-slot': slot, title: '收藏',
    onclick: (e) => doFav(m, e.currentTarget, slot) }, icon('bookmark'), h('span', null, faved ? '已收藏' : '收藏'))
  const row = h('div', { class: 'acts' + (full ? '' : ' fit') }, like, chips, pick, h('span', { class: 'grow' }), nsfwBtn, full ? null : comment, fav)
  if (!full) actsRO.observe(row)
  return row
}

async function toggleNsfw(m, btn) {
  const on = !isRisky(m)
  btn.disabled = true
  try {
    const { item } = await api(`/memes/${m.id}/nsfw`, { method: 'POST', body: { on } })
    syncItem(item)
    refreshBlur()
    // 标记会改变筛选结果；列表重新加载，已打开的详情保留。
    if ((S.content === 'hide' && isRisky(item)) || (S.content === 'only' && !isRisky(item))) {
      removeRenderedMeme(m.id)
      S.bgKey = null
      if (!S.modal) route()
    }
    toast(on ? '已标成 NSFW' : '已去掉 NSFW', 'ok')
  } catch (e) { toast(e.message, 'err') } finally { btn.disabled = false }
}
// 卡片上一行放不下时，从后往前把表情收进「+N」；卡片宽度变了会重新算
const actsRO = new ResizeObserver((es) => es.forEach((e) => fitActs(e.target)))
function fitActs(row) {
  if (!row.isConnected) return actsRO.unobserve(row)
  const chips = [...row.querySelectorAll(':scope > .rx')]
  const pick = row.querySelector(':scope > .pick')
  const n = pick.querySelector('.n')
  const base = Number(pick.dataset.rest) || 0
  chips.forEach((c) => { c.hidden = false })
  let hid = 0
  const draw = () => { n.textContent = '+' + (base + hid); n.hidden = base + hid <= 0 }
  draw()
  for (let i = chips.length - 1; i >= 0 && row.scrollWidth > row.clientWidth + 1; i--) {
    chips[i].hidden = true
    hid++
    draw()
  }
}

function emojiPanel(m) {
  const mine = new Set(m.reactions.filter((r) => r.mine).map((r) => r.emoji))
  const counts = Object.fromEntries(m.reactions.map((r) => [r.emoji, r.count]))
  return emojiBoard((k) => { closePop(); toggleReaction(ITEMS.get(m.id) || m, k) },
    { mine, counts })
}

// ---------- 收藏 ----------

async function getFolders(force) {
  if (!S.folders || force) S.folders = (await api('/folders')).folders
  return S.folders
}

async function doFav(m, btn, slot) {
  if (!requireLogin('收藏')) return
  const key = slot + 'f'
  if (POP?.key === key) return closePop()
  let folders
  try { folders = await getFolders() } catch (e) { return toast(e.message, 'err') }
  m = ITEMS.get(m.id) || m
  if (!m.fav_folders?.length) {
    // 一键收进第一个收藏夹，再弹出面板方便换位置
    const f = folders[0]
    const item = await act(m, (x) => ({ ...x, fav_folders: [f.id] }), () => api(`/memes/${m.id}/fav`, { method: 'POST', body: { folder_id: f.id } }))
    if (!item) return
    f.n++
    toast(`已加入「${f.name}」`, 'ok')
  }
  const anchor = document.querySelector(`.act.fav[data-slot="${slot}"]`) || btn
  openPop(anchor, favMenu(m.id), { key, align: 'right', cls: 'pop-fav' })
}

function favMenu(id) {
  const m = ITEMS.get(id)
  const box = h('div', { class: 'fav-menu' })
  const redraw = () => box.replaceWith(favMenu(id))
  const rows = S.folders.map((f) => {
    const cb = h('input', { type: 'checkbox', checked: m.fav_folders.includes(f.id) })
    cb.addEventListener('change', async () => {
      const on = cb.checked
      const item = await act(ITEMS.get(id), (x) => ({ ...x, fav_folders: on ? [...x.fav_folders, f.id] : x.fav_folders.filter((v) => v !== f.id) }),
        () => api(`/memes/${id}/fav`, { method: 'POST', body: { folder_id: f.id } }))
      if (!item) cb.checked = !on
      else f.n += on ? 1 : -1
    })
    return h('label', { class: 'fav-row' }, cb, h('span', { class: 'check' }, icon('check', 'i tiny')), h('span', { class: 'grow' }, f.name), h('span', { class: 'muted' }, f.n))
  })
  const name = h('input', { class: 'input sm', maxlength: 12, placeholder: '新收藏夹' })
  const form = h('form', { class: 'fav-new' }, name, h('button', { class: 'btn btn-ghost sm', type: 'submit' }, icon('plus', 'i tiny'), '新建'))
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!name.value.trim()) return name.focus()
    try {
      const res = await api('/folders', { method: 'POST', body: { name: name.value } })
      S.folders = res.folders
      const item = await act(ITEMS.get(id), null, () => api(`/memes/${id}/fav`, { method: 'POST', body: { folder_id: res.id } }))
      if (item) S.folders.find((f) => f.id === res.id).n++
      redraw()
    } catch (err) { toast(err.message, 'err') }
  })
  box.append(
    h('div', { class: 'pop-head' }, h('strong', null, m.fav_folders.length ? '已收藏' : '收藏到'), h('span', { class: 'muted' }, ' · 仅自己可见')),
    h('div', { class: 'fav-rows' }, rows),
    form,
    h('div', { class: 'pop-foot' },
      h('a', { href: '/me?tab=fav', 'data-link': '', onclick: closePop }, '管理收藏夹'),
      m.fav_folders.length > 0 && h('button', { class: 'btn-text danger sm', onclick: async () => {
        closePop()
        await act(ITEMS.get(id), (x) => ({ ...x, fav_folders: [] }), () => api(`/memes/${id}/fav`, { method: 'DELETE' }))
        S.folders = null
      } }, '取消收藏')))
  return box
}

// ---------- 一句回应 ----------
// 相同的话合并计数；点别人的回应 = 同感（我的回应改成这句）；每人每图一句
// 逐人展示：头像 + 一句，重复的话也各占一条，按时间从早到晚；点头像看资料，点文字 = 同感
// 卡片上固定约两行高，放不下就自动慢慢滚，也能手动滑
function replyBlock(m, { compact }) {
  // 后端给的是最近 N 条、已按时间正序；卡片上只留最后 30 条
  const list = (m.reply_list || []).slice(compact ? -30 : -200)
  // 我的那句不在返回范围里（刚发、或很早以前说的）就补在最后，不打乱顺序
  if (!list.some((r) => r.mine) && m.my_reply && S.me) list.push({ username: S.me.username, name: S.me.name, avatar: S.me.avatar, text: m.my_reply, n: 1, mine: true })
  const chips = list.map((r) => replyChip(m, r, !compact))
  const rest = (m.reply_count || 0) - list.length
  const strip = chips.length > 0 && h('div', { class: 'rp-list' + (compact ? ' rp-strip' : '') }, chips,
    rest > 0 && (compact ? h('a', { class: 'rp-more', href: memeHref(m) + '#replies', 'data-link': '' }, `还有 ${rest} 条`)
      : h('span', { class: 'rp-more muted' }, `更早的 ${rest} 条没显示`)))
  if (strip && compact) autoScroll(strip)
  const whoKey = 'rw' + m.id + (compact ? 'c' : '')
  const who = !compact && (m.reply_count || 0) > 0 && h('button', { class: 'btn-text sm rp-who', type: 'button', 'data-pop': whoKey,
    onclick: (e) => whoReacted(e.currentTarget, `/memes/${m.id}/who`, whoKey, 'reply') }, `谁回应了（${m.reply_count}）`)
  return h('div', { class: 'replies' + (compact ? ' compact' : '') }, strip, who, replyForm(m))
}

function replyChip(m, r, manage) {
  const who = r.name || r.username || '佚名'
  const face = h('button', { class: 'rp-face', type: 'button', title: who, 'aria-label': `看看 ${who}`, 'data-pop': 'u' + r.username,
    onclick: (e) => { e.stopPropagation(); if (r.username) userCard(r.username, e.currentTarget) } },
  avatar(r.avatar, who, 22))
  const text = h('button', { class: 'rp-t', type: 'button',
    title: r.mine ? '我的回应 · 点击撤回' : `${who}${r.n > 1 ? ` · ${r.n} 人都这么说` : ''} · 点击 +1 同感`,
    onclick: () => {
      if (r.mine) {
        if (confirm('撤回这句回应？')) act(m, null, () => api(`/memes/${m.id}/reply`, { method: 'DELETE' }))
      } else act(m, null, () => api(`/memes/${m.id}/reply`, { method: 'PUT', body: { text: r.text } }))
    } }, BOOST_PRESETS.includes(r.text) ? boostText(r.text) : linkify(r.text))
  const chip = h('span', { class: 'rp boost-sent' + officialFrame(r, 'post') + (r.mine ? ' mine' : '') }, face, text)
  // 管理删除按「这句话」删（同样的话一起删）
  if (manage && m.can_manage) {
    chip.append(h('button', { class: 'rp-del', type: 'button', title: `删除所有人的这句（${r.n || 1} 条）`, 'aria-label': '删除这句',
      onclick: () => { if (confirm(`删除所有人的「${r.text}」（${r.n || 1} 条）？`)) act(m, null, () => api(`/memes/${m.id}/replies?text=${encodeURIComponent(r.text)}`, { method: 'DELETE' })) } },
    icon('close', 'i tiny')))
  }
  return chip
}

// 自动滚动：进入视口才跑；悬停、触摸、滚轮、聚焦时暂停，手动滑过后停几秒再继续；到底停一下再回顶
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')
const stripIO = new IntersectionObserver((es) => es.forEach(({ target: el, isIntersecting: on }) => {
  el.classList.toggle('over', el.scrollHeight > el.clientHeight + 4) // 真放不下才加渐隐
  el._auto?.(on)
}))
function autoScroll(el) {
  stripIO.observe(el)
  el.addEventListener('scroll', () => el.classList.toggle('scrolled', el.scrollTop > 2), { passive: true })
  let raf = 0, last = 0, hold = 0, pos = 0, back = false, busy = false
  const pause = (ms = 2500) => { hold = Math.max(hold, performance.now() + ms) }
  for (const ev of ['pointerenter', 'pointerdown', 'touchstart', 'wheel', 'focusin']) el.addEventListener(ev, () => { busy = true; pause() }, { passive: true })
  for (const ev of ['pointerleave', 'touchend', 'focusout']) el.addEventListener(ev, () => { busy = false; pause() }, { passive: true })
  el.addEventListener('scroll', () => { if (Math.abs(el.scrollTop - pos) > 2) { pos = el.scrollTop; pause() } }, { passive: true })
  const step = (t) => {
    if (!el.isConnected) { raf = 0; return stripIO.unobserve(el) }
    raf = requestAnimationFrame(step)
    const dt = Math.min(t - last, 50)
    last = t
    const max = el.scrollHeight - el.clientHeight
    if (max < 4 || busy || t < hold) return
    if (back) { back = false; el.scrollTo({ top: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' }); hold = t + 2200; return }
    pos = Math.min(max, pos + dt * 0.014) // 约 14px/秒
    el.scrollTop = pos
    if (pos >= max) { back = true; hold = t + 1800 }
  }
  el._auto = (on) => {
    if (on && !raf) { pos = el.scrollTop; last = performance.now(); pause(1500); raf = requestAnimationFrame(step) }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0 }
  }
  onRemoval(el, () => { el._auto(false); stripIO.unobserve(el) })
}

// 用户名片：点回应里的头像弹出
const USERS = new Map()
// 名字样式：管理员 / 被授予炫彩名的（TL3 以上默认有，管理员可以单独开关）走流动渐变
const nameCls = (u, base = '') => (base + (decoHidden(u, 'fancy') ? '' : u?.is_admin ? ' admin-name fancy-name' : u?.fancy ? ' fancy-name' : '')).trim()
// ---------- 装扮：称号 / 炫彩名配色 / 消息气泡 ----------
// deco = { t 称号字, c 字色, c2 底色, bc 边框色, f 字体, sh 形状, fill 填充, fx 动效, fc 炫彩名配色[], bb 气泡, sc 生效范围 all|chat|post }
const DECO_FONT = [['', '默认'], ['kai', '楷体'], ['song', '宋体'], ['hei', '黑体'], ['round', '圆体'], ['xing', '行楷'], ['mono', '等宽']]
const DECO_SHAPE = [['pill', '胶囊'], ['oval', '椭圆'], ['rect', '方角'], ['tag', '标签'], ['blob', '不规则'], ['ribbon', '飘带'], ['seal', '印章'], ['none', '无边框']]
const DECO_FILL = [['solid', '实色'], ['soft', '浅底'], ['grad', '渐变'], ['outline', '描边'], ['glass', '毛玻璃'], ['none', '纯文字']]
const DECO_FX = [['none', '不动'], ['flow', '流光'], ['shine', '扫光'], ['pulse', '呼吸']]
// 气泡：新款在前（编辑器主推），老款保留（老数据照常显示，编辑器里折在「经典」里）
const DECO_BUBBLE_NEW = [['jelly', '果冻'], ['puff', '棉花云'], ['paw', '猫爪'], ['galaxy', '星河'], ['bit', '像素机'], ['petal', '樱吹雪'], ['boba', '奶茶'],
  ['cyber', '赛博'], ['prism', '幻彩描边'], ['mint', '薄荷'], ['bunny', '兔兔'], ['lemon', '柠檬汽水']]
const DECO_BUBBLE_OLD = [['laowu', '老吴'], ['cloud', '云朵'], ['candy', '糖果'], ['neon', '霓虹'], ['paper', '便签'], ['ink', '水墨'], ['pixel', '像素'], ['sakura', '樱花'], ['gold', '土豪金'], ['night', '星空']]
const DECO_BUBBLE = [['', '默认'], ...DECO_BUBBLE_NEW, ...DECO_BUBBLE_OLD]
const FANCY_PRESETS = [['默认彩虹', []], ['樱粉', ['#ff5fa2', '#ffb3d1', '#c86bff']], ['海盐', ['#00b4d8', '#48cae4', '#90e0ef']], ['日落', ['#ff6b35', '#f7c548', '#ff3864']],
  ['森林', ['#2d6a4f', '#52b788', '#b7e4c7']], ['赛博', ['#f72585', '#7209b7', '#4cc9f0']], ['黑金', ['#111111', '#d4a017', '#fff3b0']]]
// 别人的装扮我不想看：炫彩名 / 称号 / 徽章 / 气泡 / 自定义样式，几个开关（只影响自己看到的，自己的照常显示）
const decoHide = () => { try { return JSON.parse(localStorage.getItem('decoHide')) || {} } catch { return {} } }
const decoHidden = (u, k) => !!u && !!S.me && u.username !== S.me.username && !!decoHide()[k]
// 这个人的装扮在这里（chat 群聊 / post 帖子和评论 / card 名片）生不生效
function decoAt(u, where) {
  const d = u?.deco
  if (!d) return null
  if (where !== 'card' && d.sc && d.sc !== 'all' && d.sc !== where) return null
  return d
}
// 自定义样式（deco.cssb 气泡 / deco.csst 称号）：和服务端 cleanCss 同一套清洗。只收「属性: 值」，属性白名单，
// 值里不许 url / 定位 / 层级 / 变量 / calc / 视口单位，尺寸封顶；不认识的整条丢掉
const CSS_PROP_RE = /^(color|background|background-color|background-image|box-shadow|text-shadow|font-weight|font-style|letter-spacing|padding|opacity|filter|border(-(top|right|bottom|left))?(-(color|width|style))?|border(-(top|bottom)-(left|right))?-radius)$/
const CSS_BAD_RE = /url|expression|script|import|behavior|binding|attr|var|env|image-set|element|calc|fixed|absolute|sticky|z-index|content|\d(vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|ch|ex)\b/
const CSS_FN_COLOR = ['rgb', 'rgba', 'hsl', 'hsla']
const CSS_FN_GRAD = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient']
const CSS_FN_FILTER = ['hue-rotate', 'saturate', 'brightness']
function cleanCss(v) {
  if (typeof v !== 'string') return ''
  const s = v.slice(0, 600).replace(/\/\*[\s\S]*?(\*\/|$)/g, '').replace(/[{}<>\\@]/g, '')
  const out = []
  for (const part of s.split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const p = part.slice(0, i).trim().toLowerCase()
    const val = part.slice(i + 1).trim().replace(/\s+/g, ' ').toLowerCase()
    if (!CSS_PROP_RE.test(p) || !val || val.length > 240) continue
    if (!/^[a-z0-9#%., ()/+-]+$/.test(val) || CSS_BAD_RE.test(val)) continue
    const fns = [...val.matchAll(/([a-z-]+)\(/g)].map((m) => m[1])
    const okFn = p === 'filter' ? CSS_FN_FILTER : p === 'background' || p === 'background-image' ? [...CSS_FN_COLOR, ...CSS_FN_GRAD] : CSS_FN_COLOR
    if (!fns.every((f) => okFn.includes(f))) continue
    if (p === 'filter' && !/^((hue-rotate|saturate|brightness)\([0-9.]+(deg|%)?\) ?)+$/.test(val)) continue
    if (p === 'background-image' && !fns.some((f) => CSS_FN_GRAD.includes(f))) continue
    if (p === 'opacity' && !(/^[0-9.]+$/.test(val) && +val >= 0.6 && +val <= 1)) continue
    if ((p === 'padding' || p === 'letter-spacing' || /width$/.test(p)) && val.includes('%')) continue
    if ([...val.matchAll(/(\d*\.?\d+)(px|r?em)/g)].some((m) => +m[1] > (m[2] === 'px' ? 24 : 2))) continue
    out.push(`${p}: ${val}`)
    if (out.length >= 16) break
  }
  const r = out.join('; ')
  return r.length <= 600 ? r : ''
}
// 清洗后的声明挂成一条带 hash 类名的规则（两层类名 + !important，压得过预设气泡），同样的样式只插一次
const UCSS = new Map()
let ucssSheet = null
function ucssCls(css, base) {
  const c = cleanCss(css)
  if (!c) return ''
  const key = base + '|' + c
  if (!UCSS.has(key)) {
    let x = 5381
    for (let i = 0; i < key.length; i++) x = ((x << 5) + x + key.charCodeAt(i)) >>> 0
    const cls = 'ucss-' + x.toString(36)
    UCSS.set(key, cls)
    ucssSheet ||= document.head.appendChild(h('style', { id: 'ucss' }))
    ucssSheet.append(`.${base}.${cls}{${c.split('; ').map((d) => d + ' !important').join(';')}}\n`)
  }
  return ' ' + UCSS.get(key)
}
const userCss = (u, k, base, where) => { const d = decoAt(u, where); return d?.[k] && !decoHidden(u, 'css') ? ucssCls(d[k], base) : '' }
// 内置简笔徽章；仅目录中且由服务端返回的佩戴项生效。
const OFFICIAL_ART = {
  serene: '<ellipse cx="16" cy="6" rx="9" ry="3"/><path d="M7 16q9 14 18 0M9 15l4 1m6 0 4-1M16 23v4m-4-1h8"/>',
  gentleman: '<path d="M7 10 4 3l9 4m12 3 3-7-9 4M16 27S3 20 3 13c0-7 10-8 13-2 3-6 13-5 13 2 0 7-13 14-13 14Z"/><path d="m8 16 4 2m8 0 4-2m-12 6q4 2 8 0"/>',
  coder: '<rect x="3" y="5" width="26" height="22" rx="3"/><path d="M3 11h26M7 8h1m3 0h1m-1 7-4 4 4 4m10-8 4 4-4 4m-3-9-4 10"/>',
  banana: '<path d="M23 4C30 19 17 31 5 25c9-1 16-8 17-18l-1-3Zm-1 5C17 18 10 19 5 18m0 0 3 7M7 8 5 6m4-1V2"/><path d="m18 18 1 1m3-3 1 1m-5 5q3 2 5-2"/>',
  peach: '<path d="M16 10C7 4 1 13 5 22s15 9 21 1c7-9-1-17-10-13Z"/><path d="M16 10c-3 4-3 8 0 11M16 8c1-6 8-6 8-6-1 6-8 6-8 6M8 17h2m12 0h2m-13 7q5 3 10-1"/>',
  oracle: '<rect x="7" y="7" width="18" height="18" rx="5"/><path d="M11 2v5m10-5v5M11 25v5m10-5v5M2 11h5m-5 10h5m18-10h5m-5 10h5M16 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/>',
  whale: '<path d="M3 20c0-9 17-14 20-3l6-3-1 9-5-1C19 31 5 29 3 20ZM12 9V4m0 0L8 6m4-2 4 2"/><circle cx="8" cy="19" r="1"/><path d="M11 23q4 2 7-1"/>',
  diver: '<path d="M5 13h22v9a7 7 0 0 1-7 7h-8a7 7 0 0 1-7-7ZM20 13V5h7v5h-3v3M4 8l3-2m-5 6 3-1"/><rect x="8" y="16" width="16" height="7" rx="3"/><path d="M12 19h1m6 0h1"/>',
  reborn: '<path d="M5 11l5 4 6-10 6 10 5-4-2 15H7ZM8 22h16M12 18h1m6 0h1M3 5l2 2m22-2 2-2"/>',
}
const RAFFLE_TITLES = {
  mona: { name: '莫奈之王', mood: '睡莲色的画中主角', art: '<path d="M4 21q6-8 12 0 6-8 12 0M6 25q10 5 20 0M16 4v7m-5-3 5-4 5 4M9 15q7-5 14 0"/>' },
  lace: { name: '摸蕾丝紫奈', mood: '紫色蕾丝与小恶魔的心动', art: '<path d="M5 9q4-6 11 0 7-6 11 0v15H5Z M5 12l4 3 4-3 3 3 3-3 4 3 4-3M12 21q4-5 8 0m-4-3v8m-3-3 3 3 3-3"/>' },
  giant: { name: '一根巨物', mood: '气泡也装不下的大场面', art: '<path d="M8 10a4 4 0 1 1 5 4l6 6a4 4 0 1 1 4 5 4 4 0 1 1-5-4l-6-6a4 4 0 1 1-4-5Z"/>' },
  worship: { name: '寄吧几拜', mood: '一边吐槽，一边认真参拜', art: '<path d="M16 4l10 7-3 16H9L6 11ZM7 11h18M11 16l5 4 5-4M12 25h8m-10-5-3 3m15-3 3 3"/>' },
  muscle: { name: '筋肉欢欢', mood: '一拳打出今日份快乐', art: '<path d="M8 13q-5-4-5 4 0 8 9 10h9q8-2 8-10 0-8-5-4l-4 3-4-5-4 5ZM9 20h2m10 0h2m-12 3q5 4 10 0M8 7l-3-3m20 3 3-3"/>' },
}
const raffleOf = u => RAFFLE_TITLES[u?.deco?.ft] ? { ...RAFFLE_TITLES[u.deco.ft], id: u.deco.ft, n: Math.max(1, Number(u.deco.fn) || 1) } : null
const raffleArt = id => h('span', { class: 'rt-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RAFFLE_TITLES[id]?.art || ''}</svg>` })
const raffleChip = (t, mini) => h('span', { class: 'rt-badge rt-' + t.id, title: `群聊抽奖 · ${t.name} · Lv${t.n}`, 'aria-label': `${t.name} 徽章，等级 ${t.n}` }, raffleArt(t.id), !mini && h('span', null, t.name), !mini && t.n > 1 && h('small', { class: 'rt-level' }, `×${t.n}`))
const officialById = id => (S.officialTitles || []).find(t => t.id === id && OFFICIAL_ART[id])
const officialOf = (u, where) => officialById(decoAt(u, where)?.ot)
const officialArt = id => h('span', { class: 'ot-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${OFFICIAL_ART[id] || ''}</svg>` })
const officialFrame = (u, where) => { const forced=raffleOf(u); if(forced)return ' ot-frame rt-frame rt-' + forced.id; const t = officialOf(u, where); return t ? ' ot-frame ot-' + t.id : '' }
const officialChip = (t, mini = false) => h('span', { class: 'ot-badge ot-' + t.id, title: `站长授予 · ${t.name}`, 'aria-label': '官方徽章：' + t.name }, officialArt(t.id), !mini && h('span', null, t.name))
function titleEl(u, where) {
  const forced = raffleOf(u)
  if (forced) return h('span', { class: 'u-title rt-title rt-' + forced.id, title: `群聊抽奖 · ${forced.mood}` }, forced.name, forced.n > 1 && h('small', { class: 'rt-level' }, `Lv${forced.n}`))
  const d = decoAt(u, where)
  const official = officialOf(u, where)
  if (official && !decoHidden(u, 'title')) return h('span', { class: 'u-title ot-title ot-' + official.id, title: '站长授予 · ' + official.mood }, official.name)
  if(d?.rt==='guangjie'&&!decoHidden(u,'title'))return h('span',{class:'u-title reward-guangjie',title:'邀请奖励 · 广结善缘'},'✿ 广结善缘')
  if (!d?.t || decoHidden(u, 'title')) return null
  return h('span', { class: `u-title sh-${d.sh || 'pill'} fl-${d.fill || 'solid'} fx-${d.fx || 'none'}${d.f ? ' ft-' + d.f : ''}${userCss(u, 'csst', 'u-title', where)}`, title: '称号',
    style: { '--t1': d.c || '#ffffff', '--t2': d.c2 || '#16a34a', '--t3': d.bc || d.c2 || '#16a34a' } }, h('span', { class: 'u-title-t' }, d.t)) // 包一层，放不下时文字能出省略号
}
// ---------- 徽章 ----------
// tier 决定底色：legend 传说（金色流光）/ epic 史诗（紫）/ rare 稀有（蓝）/ fun 趣味（粉）。每日徽章次日结算，可以反复拿
const BADGES = {
  guide: {name:'引路人',tier:'rare',g:'🧭',desc:'邀请好友满 7 天并活跃互动；1 / 3 / 10 / 30 人升级'},
  newbie: { name: '初来乍到', tier: 'fun', g: '🌱', desc: '通过好友邀请加入尽欢' },
  elder: { name: '太上长老', tier: 'legend', g: '☯', desc: '2026-10-01 开站当天进站的元老' },
  moyu_god: { name: '摸鱼之神', tier: 'epic', g: '🐟', desc: '某天看图最多的人（至少 500 张）' },
  moyu_pro: { name: '摸鱼高手', tier: 'rare', g: '🎣', desc: '一天看了 200 张图以上' },
  post_god: { name: '发图之神', tier: 'epic', g: '🖼', desc: '某天发图最多的人（至少 10 张）' },
  post_pro: { name: '发图达人', tier: 'rare', g: '📸', desc: '一天发了 5 张图以上' },
  sese: { name: '色色冠军', tier: 'fun', g: '🍑', desc: '某天发 NSFW 最多的人（至少 3 张）' },
  chunse: { name: '纯色迷', tier: 'fun', g: '👀', desc: '某天看 NSFW 最多的人（至少 50 张）' },
  water: { name: '水群王', tier: 'rare', g: '💦', desc: '某天群聊发言最多的人（至少 50 条）' },
  react: { name: '回应达人', tier: 'rare', g: '💬', desc: '某天回应 / 表情最多的人（至少 30 次）' },
  night: { name: '夜猫子', tier: 'fun', g: '🌙', desc: '某天凌晨 1～4 点看图最多的人（至少 50 张）' },
}
const BADGE_ORDER = Object.keys(BADGES)
// 渐进等级：按拿过几次分 Lv1～Lv5，边框从铜 → 银 → 金 → 彩虹 → 传说。元老徽章只发一次，直接算传说
const BADGE_LV = [1, 3, 7, 15, 30]
const BADGE_LV_NAME = ['', '铜', '银', '金', '彩虹', '传说']
const badgeLv = (id, n) => id === 'elder' ? 5 : n > 0 ? (id==='guide'?[1,3,10,30]:BADGE_LV).filter((x) => n >= x).length : 0
const badgeLvText = (id, lv) => id === 'elder' ? '唯一' : lv ? `Lv${lv} ${BADGE_LV_NAME[lv]}` : '未获得'
// 佩戴的徽章：群聊里只显示小图标（不挤消息），别处图标 + 名字；鼠标悬停 / 长按看说明。等级用 deco.bn（服务端同步的次数）
function badgeEl(u, where, full) {
  const forced = raffleOf(u)
  if (forced) return raffleChip(forced, where !== 'card')
  const official = officialOf(u, where)
  if (official && !decoHidden(u, 'badge')) return officialChip(official, true)
  const d = u?.deco
  const b = d?.bd && BADGES[d.bd]
  if (!b || decoHidden(u, 'badge')) return null
  if (where !== 'card' && d.bs && d.bs !== 'all' && d.bs !== where) return null
  return badgeChip(d.bd, where !== 'card' && !full, d.bn || 1)
}
// 贴纸徽章：圆形贴纸（白描边 + 高光）+ 名字 + 等级角标；mini 只露贴纸
const badgeChip = (id, mini, n) => {
  const b = BADGES[id]
  if (!b) return null
  const lv = badgeLv(id, n || 1)
  return h('span', { class: `u-badge bt-${b.tier} lv-${lv}${mini ? ' mini' : ''}`, title: `${b.name} · ${badgeLvText(id, lv)}${n > 1 ? ` · ${id==='guide'?'合格邀请 '+n+' 人':'拿过 '+n+' 次'}` : ''}\n${b.desc}`,
    'aria-label': `徽章 ${b.name}，${badgeLvText(id, lv)}` },
  h('span', { class: 'ub-g', 'aria-hidden': 'true' }, b.g),
  !mini && h('span', { class: 'ub-n' }, b.name),
  !mini && h('span', { class: 'ub-lv', 'aria-hidden': 'true' }, id === 'elder' ? '★' : 'Lv' + lv))
}
// 徽章墙：卡片网格。大贴纸 + 名字 + 等级 + 次数 + 升级进度 + 获得方法 + 最近获得；没拿到的灰着
// 签名不变：list = [{ id, n, last_day }]，pick(id) 传了就能点选佩戴，cur 是当前戴着的
function badgeWall(list, pick, cur) {
  const own = new Map((list || []).map((x) => [x.id, x]))
  const got = BADGE_ORDER.filter((id) => own.has(id)).length
  const cards = BADGE_ORDER.map((id) => {
    const b = BADGES[id], o = own.get(id), n = o?.n || (o ? 1 : 0)
    const lv = badgeLv(id, n), on = !!o && cur === id
    const levels=id==='guide'?[1,3,10,30]:BADGE_LV
    const nextAt = id === 'elder' ? 0 : levels[lv] || 0 // 0 = 满级
    const prevAt = levels[lv - 1] || 0
    const pct = !o ? 0 : !nextAt ? 100 : Math.round(((n - prevAt) / (nextAt - prevAt)) * 100)
    const can = !!(pick && o)
    return h(can ? 'button' : 'div', { class: `bw-card${id==='guide'?' bw-guide':''} bt-${b.tier} lv-${lv}${o ? '' : ' off'}${on ? ' on' : ''}`, type: can ? 'button' : null,
      'aria-pressed': can ? String(on) : null, title: can ? (on ? '点一下摘下' : '点一下戴上') : b.desc, onclick: can ? () => pick(id) : null },
    on && h('span', { class: 'bw-wear' }, '佩戴中'),
    h('span', { class: 'bw-art', 'aria-hidden': 'true' }, h('span', { class: 'bw-g' }, b.g), lv >= 3 && h('span', { class: 'bw-spark' }, '✦')),
    h('span', { class: 'bw-name' }, b.name),
    h('span', { class: 'bw-lv' }, badgeLvText(id, lv), o && h('small', null, ` · ${id==='guide'?'合格邀请 '+n+' 人':'拿过 '+n+' 次'}`)),
    o && id !== 'elder' && h('span', { class: 'bw-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct),
      'aria-label': nextAt ? `升到 Lv${lv + 1} 的进度` : '已满级' }, h('i', { style: { width: pct + '%' } })),
    o && id !== 'elder' && h('span', { class: 'bw-next' }, nextAt ? id==='guide'?`再邀请 ${nextAt-n} 位合格好友升 Lv${lv+1}`:`再拿 ${nextAt - n} 次升 Lv${lv + 1}` : '已满级'),
    h('span', { class: 'bw-how' }, b.desc),
    h('span', { class: 'bw-date' }, o ? (o.last_day ? `最近 ${o.last_day}` : '已获得') : '还没拿到'))
  })
  return h('div', { class: 'badge-wall-box' },
    h('div', { class: 'bw-sum' }, `已点亮 ${got} / ${BADGE_ORDER.length}`, h('span', { class: 'muted' }, ' · 日常徽章：1 次 Lv1 铜 · 3 次银 · 7 次金 · 15 次彩虹 · 30 次传说')),
    h('div', { class: 'badge-wall' }, cards))
}
const badgeWallSection = (list, pick, cur) => badgeWall(list, pick, cur)
// 名字（带炫彩配色）+ 称号 + 徽章；h() 会把数组摊平，直接放进子节点里用
function uName(tag, u, attrs, text, where) {
  const d = decoAt(u, where)
  const fc = d?.fc?.length && (u.fancy || u.is_admin) && !decoHidden(u, 'fancy') ? d.fc : null
  const el = h(tag, { ...attrs, class: nameCls(u, attrs?.class || '') + (fc ? ' fancy-own' : '') }, text)
  if (fc) el.style.setProperty('--fc', `linear-gradient(90deg, ${[...fc, fc[0]].join(', ')})`)
  return [el, titleEl(u, where), badgeEl(u, where)]
}
// 身份信息按自然宽度同行排列，窄屏允许换行，保留完整文字。
function compactIdentity(u, where, name, ...meta) {
  const title = titleEl(u, where)
  return h('span', { class: 'identity' },
    h('span', { class: 'identity-main' }, name, title, badgeEl(u, where, true), meta))
}
// 气泡类名：预设气泡 + 自己写的气泡样式（只作用在这个人自己的 .cm-text 上）
const bubbleCls = (u) => {
  const forced = raffleOf(u)
  if (forced) return ' ot-bubble rt-bubble rt-' + forced.id
  const official = officialOf(u, 'chat')
  if (official && !decoHidden(u, 'bubble')) return ' ot-bubble ot-' + official.id
  const b = decoAt(u, 'chat')?.bb
  return (b && !decoHidden(u, 'bubble') ? ' bb bb-' + b : '') + userCss(u, 'cssb', 'cm-text', 'chat')
}
function decoHideSettings() {
  const p = decoHide()
  const box = (k, l) => h('label', { class: 'set-check' }, h('input', { type: 'checkbox', checked: !!p[k], onchange: (e) => {
    localStorage.setItem('decoHide', JSON.stringify({ ...decoHide(), [k]: e.target.checked }))
    toast('已保存，新加载的消息按这个显示', 'ok')
  } }), l)
  return h('div', { class: 'deco-hide' }, box('fancy', '不看别人的炫彩昵称'), box('title', '不看别人的称号'), box('badge', '不看别人的徽章'), box('bubble', '不看别人的消息气泡'),
    box('css', '不看别人的自定义样式'))
}
// 装扮编辑：称号文字 + 颜色 / 字体 / 形状 / 填充 / 动效，炫彩名配色，气泡，生效范围；边改边预览
function decoEditor() {
  const d = { sh: 'pill', fill: 'solid', fx: 'none', sc: 'all', bs: 'all', c: '#ffffff', c2: '#16a34a', bc: '#16a34a', ...(S.me.deco || {}) }
  const preview = h('div', { class: 'deco-preview' })
  const draw = () => {
    const bn = d.bd ? S.me.badges?.find((x) => x.id === d.bd)?.n || 1 : undefined
    const u = { ...S.me, deco: { ...d, bn }, fancy: S.me.fancy }
    preview.replaceChildren(
      h('div', { class: 'dp-row' }, avatar(S.me.avatar, S.me.name || S.me.username, 28), uName('strong', u, {}, S.me.name || S.me.username, 'card')),
      h('div', { class: 'dp-row dp-chat cm-head' }, h('span', { class: 'cm-name' }, S.me.name || S.me.username), titleEl(u, 'chat'), badgeEl(u, 'chat')),
      h('div', { class: 'dp-row' }, h('div', { class: 'cm-text' + bubbleCls(u) }, '来看看我的气泡 No.1 #梗图')),
      h('div', { class: 'rp-form' + officialFrame(u, 'post') }, icon('rocket'), h('input', { class: 'rp-input', placeholder: '回应框预览', 'aria-label': '回应框预览' })))
  }
  const seg = (k, opts) => {
    const box = h('div', { class: 'segs small wrap', role: 'radiogroup' })
    const paint = () => box.replaceChildren(...opts.map(([v, l]) => h('button', { class: 'seg' + ((d[k] || '') === v ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String((d[k] || '') === v),
      onclick: () => { d[k] = v; paint(); draw() } }, l)))
    paint()
    return box
  }
  const color = (k, label) => h('label', { class: 'deco-color' }, h('input', { type: 'color', value: d[k] || '#16a34a', 'aria-label': label, oninput: (e) => { d[k] = e.target.value; draw() } }), label)
  const t = h('input', { class: 'input', maxlength: 8, value: d.t || '', placeholder: '比如：摸鱼大师（8 个字以内，留空不显示）', oninput: () => { d.t = t.value; draw() } })
  const font = h('select', { class: 'input sm', 'aria-label': '字体', onchange: (e) => { d.f = e.target.value; draw() } }, DECO_FONT.map(([v, l]) => h('option', { value: v, selected: (d.f || '') === v }, l)))
  const fancyBox = h('div', { class: 'deco-fancy' })
  const drawFancy = () => fancyBox.replaceChildren(
    ...FANCY_PRESETS.map(([l, cols]) => h('button', { class: 'chip' + (JSON.stringify(d.fc || []) === JSON.stringify(cols) ? ' on' : ''), type: 'button',
      style: cols.length ? { background: `linear-gradient(90deg, ${cols.join(', ')})`, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.4)' } : null,
      onclick: () => { d.fc = cols.length ? [...cols] : undefined; drawFancy(); draw() } }, l)),
    h('span', { class: 'deco-own' }, '自定义', [0, 1, 2].map((i) => h('input', { type: 'color', value: d.fc?.[i] || ['#ff4d8d', '#ffb238', '#4b9bff'][i], 'aria-label': `第 ${i + 1} 个颜色`,
      oninput: (e) => { const fc = [...(d.fc?.length === 3 ? d.fc : ['#ff4d8d', '#ffb238', '#4b9bff'])]; fc[i] = e.target.value; d.fc = fc; draw() } }))))
  drawFancy()
  const bubbles = h('div', { class: 'deco-bubbles-box' })
  const bbBtn = ([v, l]) => h('button', { class: 'deco-bb' + ((d.bb || '') === v ? ' on' : ''), type: 'button', 'aria-pressed': String((d.bb || '') === v),
    onclick: () => { d.bb = v || undefined; drawB(); draw() } }, h('span', { class: 'cm-text' + (v ? ' bb bb-' + v : '') }, l))
  const oldOn = DECO_BUBBLE_OLD.some(([v]) => v === d.bb)
  const drawB = () => {
    const open = bubbles.querySelector('details')?.open ?? oldOn
    bubbles.replaceChildren(
      h('div', { class: 'deco-bubbles' }, bbBtn(['', '默认']), DECO_BUBBLE_NEW.map(bbBtn), (S.me.unlocks||[]).includes('bubble:yinlu')&&bbBtn(['yinlu','引路 · 同行'])),
      h('details', { class: 'deco-bb-old', open }, h('summary', null, '经典款'), h('div', { class: 'deco-bubbles' }, DECO_BUBBLE_OLD.map(bbBtn))))
  }
  drawB()
  // 自定义样式：只写「属性: 值;」，实时预览；下面显示清洗后真正生效的部分
  const cssBox = (k, ph) => {
    const out = h('code', { class: 'deco-css-out' })
    const sync = () => { const c = cleanCss(d[k] || ''); out.textContent = c ? '生效：' + c : (d[k] || '').trim() ? '没有能生效的声明（看看下面的说明）' : '' }
    const ta = h('textarea', { class: 'input deco-css', rows: 3, maxlength: 600, spellcheck: 'false', placeholder: ph, value: d[k] || '',
      'aria-label': k === 'cssb' ? '气泡自定义样式' : '称号自定义样式', oninput: () => { d[k] = ta.value.slice(0, 600) || undefined; sync(); draw() } })
    sync()
    return h('div', { class: 'deco-css-wrap' }, ta, out)
  }
  const cssHelp = h('details', { class: 'deco-css-help' }, h('summary', null, '能写什么'),
    h('p', null, '只写声明，一条一条用分号隔开，比如 background: linear-gradient(135deg, #fde68a, #f9a8d4); color: #7c2d12; border-radius: 16px'),
    h('p', null, '可用：color、background / background-color、background-image（只能是 linear- / radial- / conic-gradient 渐变）、border 系列、border-radius、box-shadow、text-shadow、font-weight、font-style、letter-spacing、padding、opacity（0.6～1）、filter（只能 hue-rotate / saturate / brightness）'),
    h('p', null, '不行：选择器和花括号、url / 图片、定位、z-index、动画、calc / var、vw / vh 之类单位；尺寸最大 24px（或 2em）。最多 600 字，不认识的那条会被丢掉。'),
    h('p', null, '字色和底色请拉开对比度，别人看不清的话他们可以一键关掉你的自定义样式。'))
  const wall = h('div')
  const drawW = () => wall.replaceChildren(badgeWall(S.me.badges, (id) => { d.bd = d.bd === id ? undefined : id; drawW(); draw() }, d.bd))
  drawW()
  const officialOptions = h('div', { class: 'ot-options' })
  const drawOfficial = () => officialOptions.replaceChildren(...nodes(
    h('button', { type: 'button', class: 'btn btn-ghost sm', 'aria-pressed': String(!d.ot), onclick: () => { delete d.ot; drawOfficial(); draw() } }, '不佩戴'),
    (S.me.official_titles || []).map(o => { const t = officialById(o.id); return t && h('button', { type: 'button', class: 'ot-option' + (d.ot === t.id ? ' on' : ''), 'aria-pressed': String(d.ot === t.id), onclick: () => { d.ot = t.id; delete d.rt; drawReward(); drawOfficial(); draw() } }, officialChip(t)) })))
  const rewardOptions = h('div', { class: 'ot-options' })
  const drawReward = () => rewardOptions.replaceChildren(h('button', {
    type: 'button', class: 'btn btn-ghost sm invite-title-toggle', 'aria-pressed': String(d.rt === 'guangjie'),
    onclick: () => { if (d.rt) delete d.rt; else { d.rt = 'guangjie'; delete d.ot } drawReward(); drawOfficial(); draw() },
  }, '✿ 广结善缘' + (d.rt ? ' · 佩戴中' : '')))
  drawReward()
  drawOfficial()
  draw()
  return h('section', { class: 'set-sec deco-sec' }, h('h3', null, '装扮'),
    preview,
    S.me.official_titles?.length > 0 && field('官方称号', officialOptions, '称号、徽章、气泡与回应框一起佩戴'),
    (S.me.unlocks||[]).includes('title:guangjie')&&field('邀请奖励称号',rewardOptions,'固定称号，点击佩戴或摘下'),
    field('称号', t, '显示在昵称后面'),
    field('徽章', wall, S.me.badges?.length ? '点亮着的戴上，再点一次摘下；群聊里只显示小图标' : '还没有徽章。每天看图、发图、水群够多，第二天就会发'),
    S.me.badges?.length > 0 && field('徽章在哪儿显示', seg('bs', [['all', '全站'], ['chat', '只在群聊'], ['post', '只在帖子和评论']])),
    h('div', { class: 'deco-grid' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '颜色'), h('div', { class: 'deco-colors' }, color('c', '字'), color('c2', '底'), color('bc', '边框'))),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '字体'), font)),
    field('形状', seg('sh', DECO_SHAPE)),
    field('填充', seg('fill', DECO_FILL)),
    field('动效', seg('fx', DECO_FX)),
    field('炫彩昵称配色', fancyBox, S.me.fancy ? '只换颜色，流动效果不变' : '你现在没有炫彩昵称（TL3 以上或管理员授予后才有），配色先存着，有了就生效'),
    field('消息气泡', bubbles, '群聊里你发的消息用这个气泡；经典款也还能用'),
    field('自定义气泡样式', cssBox('cssb', 'background: linear-gradient(135deg, #e0f2fe, #fce7f3); color: #1e3a8a; border: 2px solid #93c5fd; border-radius: 18px'),
      '只作用在你自己发的群聊消息上，可以叠在预设气泡上面'),
    field('自定义称号样式', cssBox('csst', 'background: linear-gradient(90deg, #f472b6, #a78bfa); color: #fff; box-shadow: 0 0 0 2px #fff'), '只作用在你的称号上'),
    cssHelp,
    field('在哪儿生效', seg('sc', [['all', '全站'], ['chat', '只在群聊'], ['post', '只在帖子和评论']])),
    h('div', { class: 'row-end' },
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: async () => {
        if (!confirm('清掉所有装扮？')) return
        try { const r = await api('/me/profile', { method: 'PATCH', body: { deco: null } }); S.me.deco = r.deco; USERS.delete(S.me.username); toast('已清掉', 'ok'); meSettings() } catch (e) { toast(e.message, 'err') }
      } }, '全部清掉'),
      h('button', { class: 'btn btn-primary sm', type: 'button', onclick: async () => {
        try {
          const r = await api('/me/profile', { method: 'PATCH', body: { deco: { ...d, t: (d.t || '').trim() } } })
          S.me.deco = r.deco
          USERS.delete(S.me.username)
          toast('装扮已保存，新加载的内容会用上', 'ok')
        } catch (e) { toast(e.message, 'err') }
      } }, '保存装扮')),
    h('h3', { class: 'deco-h2' }, '别人的装扮'),
    decoHideSettings())
}
// @ 显示「昵称(@用户名)」：从已加载的群成员、资料卡缓存里找昵称
const NICKS = new Map()
const nickOf = (u) => NICKS.get(u.toLowerCase()) || USERS.get(u)?.name || ''
const rememberNicks = (list) => (list || []).forEach((x) => { if (x?.username && x.name && x.name !== x.username) NICKS.set(x.username.toLowerCase(), x.name) })
const COARSE = matchMedia('(pointer: coarse)').matches
const fmtBytes = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
async function userCard(username, anchor) {
  const key = 'u' + username
  if (POP?.key === key) return closePop()
  const box = h('div', { class: 'ucard' }, h('div', { class: 'muted' }, '加载中…'))
  openPop(anchor, box, { key, cls: 'pop-user' })
  try {
    if (!USERS.has(username)) USERS.set(username, (await api('/users/' + encodeURIComponent(username))).user)
  } catch (e) {
    return box.replaceChildren(h('div', { class: 'muted' }, e.message))
  }
  if (POP?.key !== key) return
  const u = USERS.get(username)
  const stat = (n, l) => h('div', { class: 'ucard-stat' }, h('strong', null, fmtN(n)), h('span', null, l))
  box.replaceChildren(...nodes(
    h('div', { class: 'ucard-head' }, avatar(u.avatar, u.name || u.username, 44),
      h('div', { class: 'who' },
        h('span', { class: 'ucard-name' }, uName('strong', u, {}, u.name || u.username, 'card')),
        h('span', { class: 'muted' }, '@' + u.username,
          u.trust_level != null && h('span', { class: 'tl' }, 'TL' + u.trust_level),
          ))),
    h('div', { class: 'ucard-stats' }, stat(u.posts, '发布'), stat(u.replies, '回应'), stat(u.comments, '评论')),
    u.bio && h('div', { class: 'ucard-bio' }, u.bio),
    u.badges?.length > 0 && h('div', { class: 'ucard-badges' }, u.badges.map((b) => badgeChip(b.id, false, b.n))),
    u.official_titles?.length > 0 && h('div', { class: 'ucard-badges' }, u.official_titles.map(o => { const t = officialById(o.id); return t && officialChip(t) })),
    (u.joined_at || u.last_seen) && h('div', { class: 'muted ucard-join' }, u.joined_at && `${fmtTime(u.joined_at)} 加入尽欢`,
      u.last_seen && seenText(u.last_seen, Date.now() / 1000)[0] && ` · ${seenText(u.last_seen, Date.now() / 1000)[0]}`),
    h('div', { class: 'ucard-acts' },
      S.me && Number.isSafeInteger(u.id) && u.id !== S.me.id && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { closePop(); navigate('/dm/new/' + u.id) } }, '发私信'),
      S.me?.owner && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { closePop(); officialTitleManager(u.username) } }, '授予称号'),
      u.posts > 0 && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { closePop(); saveWallPrefs({ author: u.username }); navigate('/?author=' + encodeURIComponent(u.username)) } }, '看 TA 的图'),
      S.me?.is_admin && !u.is_admin && u.username !== S.me.username && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { closePop(); memberAdmin(u.username) } }, '管理'),
      u.linuxdo_username && h('a', { class: 'btn btn-ghost sm', href: `https://linux.do/u/${encodeURIComponent(u.linuxdo_username)}`, target: '_blank', rel: 'noopener' },
        'linux.do 主页', icon('ext', 'i tiny')))))
  placePop(anchor, POP.el, 'left')
}

function replyForm(m) {
  if (!S.me) return h('a', { class: 'rp-form ghost', href: loginHref() }, h('span', { class: 'rp-input' }, '登录后来一句回应'), icon('send', 'i rp-send'))
  const input = h('input', { class: 'rp-input', maxlength: 60, enterkeyhint: 'send', 'aria-label': '一句回应',
    placeholder: m.my_reply ? '改一句，12 字以内' : '一句回应，12 字以内' })
  const cnt = h('span', { class: 'rp-cnt' })
  const send = h('button', { class: 'rp-send', type: 'submit', 'aria-label': '发送', disabled: true }, icon('send'))
  const key = 'rs' + m.id + Math.random().toString(36).slice(2, 6)
  const stk = h('button', { class: 'rp-stk', type: 'button', 'aria-label': '插入表情', 'data-pop': key,
    onclick: (e) => openPop(e.currentTarget, stickerPicker((k) => { insertAtCursor(input, k); closePop() }), { key, cls: 'pop-stk' }) }, icon('smile'))
  input.addEventListener('input', () => {
    const n = replyLen(input.value.trim())
    cnt.textContent = n ? `${n}/12` : ''
    cnt.classList.toggle('over', n > 12)
    send.disabled = !n || n > 12
  })
  const quick = h('button', { class: 'rp-stk', type: 'button', 'aria-label': '选择 Boost 回应', 'data-pop': key + 'boost', onclick: e => {
    openPop(e.currentTarget, h('div', { class: 'boost-pop' }, boostChoices(text => {
      input.value = text; input.dispatchEvent(new Event('input')); closePop(); form.requestSubmit()
    }, m.my_reply)), { key: key + 'boost', cls: 'pop-boost', focusScope: form })
  } }, icon('rocket'))
  const form = h('form', { class: 'rp-form' }, stk, quick, input, cnt, send)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text || replyLen(text) > 12) return
    send.disabled = true
    input.blur()
    const item = await act(m, null, () => api(`/memes/${m.id}/reply`, { method: 'PUT', body: { text } }))
    if (!item) send.disabled = false
  })
  return form
}

// 删除自己发的（管理员可删任何人的）；在详情页删完回首页，在列表里就地拿掉卡片
async function deleteMeme(m) {
  if (!confirm(`确定删除「${m.title || m.text || ((m.kind === 'text') ? '这帖' : '这张图')}」？删了就找不回来了。`)) return false
  try {
    await api(`/memes/${m.id}`, { method: 'DELETE' })
  } catch (e) { toast(e.message, 'err'); return false }
  toast('已删除', 'ok')
  ITEMS.delete(m.id)
  if (location.pathname === memeHref(m)) {
    S.bgKey = null
    navigate('/', { replace: true })
  } else {
    removeRenderedMeme(m.id)
  }
  return true
}
function moreMenu(m, anchor, key) {
  const url = location.origin + memeHref(m)
  const item = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' },
    ANCHORS.has(m.id)
      ? item('移除锚点', 'anchor', () => removeAnchor(m.id))
      : item('在这里放锚点', 'anchor', () => addAnchor(m)),
    item('查看详情', 'chat', () => navigate(memeHref(m))),
    item('复制链接', 'copy', () => copyText(url)),
    S.me && item('转发到群聊', 'chat', () => forwardMeme(m, anchor)),
    m.image && item('打开原图', 'image', () => open(m.image, '_blank', 'noopener')),
    isRisky(m) && (UNBLUR.has(m.id) ? item('这帖恢复模糊', 'eyeOff', () => setUnblur(m, false)) : item('这帖不再模糊（只对我）', 'eye', () => setUnblur(m, true))),
    m.can_manage && m.spoiler && item('取消「慎点」（所有人都不再默认模糊）', 'eye', async () => {
      try {
        const r = await api(`/memes/${m.id}`, { method: 'PATCH', body: { spoiler: false } })
        if (r.item) syncItem(r.item)
        else syncItem({ ...m, spoiler: false, sensitive: m.tags?.some((t) => S.nsfwTags.includes(t)) || false })
        refreshBlur()
        toast('已取消慎点', 'ok')
      } catch (e) { toast(e.message, 'err') }
    }),
    m.source_url && h('a', { class: 'menu-item', href: m.source_url, target: '_blank', rel: 'noopener', onclick: closePop }, icon('ext'), '去 linux.do 原楼层'),
    m.can_manage && [h('hr', { class: 'menu-sep' }), item('编辑', 'pen', () => openEdit(m)),
      h('button', { class: 'menu-item danger', onclick: () => { closePop(); deleteMeme(m) } }, icon('trash'), '删除这张')]),
  { key, align: 'right' })
}

// ---------- 看大图 ----------

// 滑出屏幕的视频先停下；回到屏幕时只有本来在自动播的（实况 / 看大图）才接着放
const vidIO = new IntersectionObserver((es) => es.forEach(({ target: v, isIntersecting: on }) => {
  if (!v.isConnected) return vidIO.unobserve(v)
  if (!on) { if (!v.paused) { v._resume = true; v.pause() } }
  else if (v._resume || (v.autoplay && v.paused && v.dataset.live && !v._done)) { v._resume = false; v.play().catch(() => {}) }
}), { threshold: 0.2 })
// 实况只放一遍，放完回到封面；想再看就点一下
function liveOnce(v) {
  v.dataset.live = '1'
  v.addEventListener('ended', () => { v._done = true; v.autoplay = false; v.load() })
  return v
}
// 视频：带控件，不自动出声；实况：静音循环，点一下从头再放
function mediaVideo(im, { auto = false, onOpen = null } = {}) {
  const live = im.k === 'l'
  const v = h('video', { src: im.v, poster: im.u || null, playsinline: true, preload: 'metadata', width: im.w || null, height: im.h || null,
    controls: !live, muted: live, autoplay: auto || live })
  if (live) {
    liveOnce(v)
    // 详情里点实况：去看大图；看大图里点：从头再放一遍
    v.addEventListener('click', (e) => { e.stopPropagation(); if (onOpen) return onOpen(); v.currentTime = 0; v.play().catch(() => {}) })
  }
  vidIO.observe(v)
  onRemoval(v, () => { vidIO.unobserve(v); v.pause(); v.removeAttribute('src'); v.load() })
  return h('div', { class: 'vid' + (live ? ' live' : '') }, v, live && h('span', { class: 'kind-badge' }, '实况'))
}
// doc：弹出的聊天小窗里看图时传小窗的 document
function openViewer(m, start = 0, { doc = document } = {}) {
  // 全局只开一层：已经开着（分屏时群聊列还能点图）就把旧的那层直接换掉，不叠
  if (S.viewer) S.viewer.close(true)
  closePop()
  markSeen(m)
  let imgs = m.images?.length ? m.images.slice() : [{ u: m.image, w: m.width, h: m.height }]
  let i = start
  const img = h('div', { class: 'vw-img' })
  const count = h('span', { class: 'vw-count' })
  const openRaw = h('a', { class: 'btn-icon', target: '_blank', rel: 'noopener noreferrer', title: '原图', 'aria-label': '原图' }, icon('ext'))
  const prev = h('button', { class: 'vw-nav prev', 'aria-label': '上一张', onclick: (e) => { e.stopPropagation(); go(-1) } }, icon('chevL'))
  const next = h('button', { class: 'vw-nav next', 'aria-label': '下一张', onclick: (e) => { e.stopPropagation(); go(1) } }, icon('chevR'))
  let raw = false
  const origBtn = h('button', { class: 'btn btn-ghost sm vw-orig', type: 'button', hidden: true, onclick: (e) => { e.stopPropagation(); raw = !raw; show() } })
  // 放大：点放大镜 / 双击图片在「适应屏幕」和「原始大小」之间切换，放大后可以拖滚动条看细节
  let zoomed = false
  const zoomBtn = h('button', { class: 'btn-icon vw-zoom', type: 'button', title: '放大 / 还原（双击图片也行）', 'aria-label': '放大', 'aria-pressed': 'false', onclick: (e) => { e.stopPropagation(); zoom() } }, icon('zoom'))
  // 连续缩放：scale 是相对「适应屏幕」尺寸的倍数（0.2～8），放大后用滚动条 / 拖动看细节
  let scale = 1, fitW = 0, fitH = 0
  const SC_MIN = 0.2, SC_MAX = 8
  const setScale = (s, ev) => {
    const el = img.querySelector('img')
    if (!el || imgs[i].v) return
    if (!zoomed) { const r0 = el.getBoundingClientRect(); fitW = r0.width; fitH = r0.height }
    if (!fitW || !fitH) return
    s = Math.min(SC_MAX, Math.max(SC_MIN, s))
    const r = el.getBoundingClientRect()
    const box = img.getBoundingClientRect()
    // 缩放中心：鼠标位置（没有就用画面中心）
    const cx = ev ? ev.clientX : box.left + box.width / 2
    const cy = ev ? ev.clientY : box.top + box.height / 2
    const fx = Math.min(1, Math.max(0, (cx - r.left) / r.width))
    const fy = Math.min(1, Math.max(0, (cy - r.top) / r.height))
    scale = s
    zoomed = Math.abs(s - 1) > 0.01
    root.classList.toggle('zoomed', zoomed)
    zoomBtn.setAttribute('aria-pressed', String(zoomed))
    if (!zoomed) { el.style.width = el.style.height = ''; scale = 1; return }
    el.style.width = fitW * s + 'px'
    el.style.height = fitH * s + 'px'
    // 同步排版后把鼠标下的那个点挪回鼠标下面
    const r2 = el.getBoundingClientRect()
    img.scrollLeft += r2.left + r2.width * fx - cx
    img.scrollTop += r2.top + r2.height * fy - cy
  }
  // 双击 / 放大镜：在「适应屏幕」和「原始大小」（至少 2 倍）之间切换
  const zoom = (on = !zoomed, ev) => {
    if (!on) return setScale(1)
    const el = img.querySelector('img')
    if (!el || imgs[i].v) return
    const w = zoomed ? fitW : el.getBoundingClientRect().width
    setScale(Math.max(2, w ? (el.naturalWidth || 0) / w : 2), ev)
  }
  img.addEventListener('dblclick', (e) => { if (e.target.tagName === 'IMG') { e.preventDefault(); zoom(!zoomed, e) } })
  img.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey && !zoomed && e.deltaY < 0 && e.target.tagName === 'IMG') { e.preventDefault(); zoom(true, e) }
  }, { passive: false })
  // 鼠标拖动看细节（放大后）
  let drag = null, dragged = false
  img.addEventListener('pointerdown', (e) => {
    if (!zoomed || e.pointerType !== 'mouse' || e.button !== 0) return
    drag = { x: e.clientX, y: e.clientY, l: img.scrollLeft, t: img.scrollTop }
    dragged = false
  })
  img.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    if (!dragged && Math.hypot(dx, dy) < 4) return
    if (!dragged) { dragged = true; img.setPointerCapture?.(e.pointerId); img.classList.add('dragging') }
    img.scrollLeft = drag.l - dx
    img.scrollTop = drag.t - dy
  })
  const endDrag = () => { drag = null; img.classList.remove('dragging') }
  img.addEventListener('pointerup', endDrag)
  img.addEventListener('pointercancel', endDrag)
  img.addEventListener('dragstart', (e) => { if (zoomed) e.preventDefault() })
  // 拖完松手产生的 click 不算「点空白关闭」
  img.addEventListener('click', (e) => { if (dragged) { dragged = false; e.stopPropagation() } }, true)
  // 手机双指捏合
  let pinch = null
  img.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || imgs[i].v) { pinch = null; return }
    e.preventDefault()
    tx = null
    const [a, b] = e.touches
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const c = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }
    if (!pinch) { pinch = { d, s: scale }; return }
    setScale(pinch.s * d / pinch.d, c)
  }, { passive: false })
  img.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null })
  // 快捷键 + / - / 0（Ctrl+加减也拦下来，只缩图不缩网页）
  const zoomKey = (e) => {
    if (imgs[i].v) return false
    if (e.key === '+' || e.key === '=') setScale(scale * 1.25)
    else if (e.key === '-' || e.key === '_') setScale(scale / 1.25)
    else if (e.key === '0') setScale(1)
    else return false
    e.preventDefault()
    return true
  }
  const show = () => {
    // 翻页 / 换原图：缩放复位（新图会整个换掉，只需清状态）
    scale = 1
    zoomed = false
    root.classList.remove('zoomed')
    zoomBtn.setAttribute('aria-pressed', 'false')
    img.scrollLeft = img.scrollTop = 0
    const im = imgs[i]
    const src = raw && im.o ? im.o : im.u
    img.replaceChildren(im.v ? mediaVideo(im, { auto: true }) : memeImg(src, { width: im.w || null, height: im.h || null }))
    origBtn.hidden = !im.o
    origBtn.textContent = raw ? '看打码版' : '看原图'
    origBtn.setAttribute('aria-pressed', raw && im.o ? 'true' : 'false')
    openRaw.href = im.v || src
    const n = Math.max(imgs.length, m.image_count || 1)
    count.textContent = n > 1 ? `${i + 1} / ${n}` : ''
    prev.hidden = next.hidden = n <= 1
  }
  const go = (d) => {
    const n = imgs.length
    if (n > 1) { i = (i + d + n) % n; raw = false; show() }
  }
  // now：换图时立刻拿掉（不做淡出），免得新旧两层同时在
  const close = (now) => {
    if (doc.fullscreenElement === root) doc.exitFullscreen().catch(() => {})
    root.classList.remove('in')
    if (now === true) root.remove()
    else setTimeout(() => root.remove(), 160)
    if (!S.modal || doc !== document) doc.body.classList.remove('lock')
    if (S.viewer?.close === close) S.viewer = null
  }
  // 单击图片保持预览，双击只负责缩放；关闭不再依赖两次点击之间的时间。
  const tapClose = (e) => {
    if (e.target === root || e.target === img || e.target === frame || e.target.classList?.contains('vw-stage')) return true
    return false
  }
  // 工具条和翻页键都收在居中的框里，不贴着浏览器 / 屏幕边缘
  const frame = h('div', { class: 'vw-frame' },
    h('div', { class: 'vw-bar' },
      h('span', { class: 'vw-title' }, m.title || ''), count, h('span', { class: 'grow' }),
      origBtn, zoomBtn,
      !S.modal && m.id > 0 && h('a', { class: 'btn btn-ghost sm', href: memeHref(m), 'data-link': '', onclick: close }, '详情与评论'),
      openRaw,
      h('button', { class: 'btn-icon vw-close', 'aria-label': '关闭', onclick: close }, icon('close'))),
    h('div', { class: 'vw-stage' }, img, prev, next))
  const root = h('div', { class: 'viewer', role: 'dialog', 'aria-label': '看大图', onclick: (e) => { if (tapClose(e)) close() } }, frame)
  let tx = null
  root.addEventListener('touchstart', (e) => { tx = e.touches.length === 1 ? e.touches[0].clientX : null }, { passive: true })
  root.addEventListener('touchend', (e) => {
    if (tx == null) return
    const dx = e.changedTouches[0].clientX - tx
    if (Math.abs(dx) > 50 && !zoomed) go(dx < 0 ? 1 : -1)
    tx = null
  })
  // Ctrl / ⌘ + 滚轮（含触控板双指捏合）：只缩放图片，拦住浏览器整页缩放
  root.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const dy = Math.max(-100, Math.min(100, e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY))
    // 鼠标滚轮一格约 100，触控板捏合每帧只有几个单位，分开给灵敏度
    setScale(scale * Math.exp(-dy * (Math.abs(dy) < 50 ? 0.01 : 0.002)), e.target.closest?.('.vw-img') ? e : null)
  }, { passive: false })
  doc.body.append(root)
  doc.body.classList.add('lock')
  // 主页面在后台时动画帧可能暂停；小窗看图使用小窗自己的时钟。
  doc.defaultView.requestAnimationFrame(() => root.classList.add('in'))
  S.viewer = { close, go, root, zoom: () => zoom(), zoomKey, doc }
  show()
  if ((m.image_count || 1) > imgs.length) {
    api(`/memes/${m.id}`).then(({ meme }) => {
      if (S.viewer?.close !== close) return
      imgs = meme.images
      show()
    }).catch(() => {})
  }
}

// ---------- 详情 ----------

function renderDetail(panel, meme) {
  S.modal.clean?.forEach((fn) => fn())
  S.modal.clean = []
  const m = syncItem(meme)
  const slot = 'd' + m.id
  const side = h('aside', { class: 'side' })
  panel.classList.toggle('text-only', !m.images.length)
  // 单张超长图（高宽比 > 2.6）：不硬缩进框里（字会小到看不清），按宽度铺开、上下滚
  const im0 = m.images.length === 1 && !m.images[0].v ? m.images[0] : null
  const long = im0 && im0.w && im0.h / im0.w > 2.6
  const stage = !m.images.length ? null : m.layout === 'carousel' && m.images.length > 1 ? carousel(m, m.images, { detail: true }) : h('div', { class: 'stage' + (m.images.length > 1 ? ' multi' : long ? ' long' : ''), 'data-blur': m.id, style: long ? { '--lw': im0.w + 'px' } : null },
    m.images.map((im, i) => h('figure', null,
      im.v ? mediaVideo(im, { onOpen: () => openViewer(m, i) })
        : h('button', { class: 'stage-img', type: 'button', onclick: (e) => peekOrig(e, im) || openViewer(m, i), 'aria-label': im.o ? '已打码，点一下看原图' : '看大图' },
          memeImg(im.u, { loading: 'lazy', width: im.w, height: im.h }), cellMark(im)))))
  if (stage) { stage.dataset.blur = m.id; applyBlur(stage) }
  panel.replaceChildren(...nodes(stage, side))

  const actions = h('div', { class: 'detail-acts' }, actionBar(m, slot, { full: true }))
  const replies = h('section', { class: 'detail-replies', id: 'replies' })
  const drawReplies = (x) => replies.replaceChildren(
    h('h3', { 'aria-label': 'Boost 回应', title: 'Boost 回应' }, icon('rocket'), h('span', { class: 'muted' }, x.reply_count || ''),
      ),
    replyBlock(x, { compact: false }))
  drawReplies(m)
  S.modal.clean.push(watchItem(m.id, (x) => {
    actions.replaceChildren(actionBar(x, slot, { full: true }))
    if (!replies.contains(document.activeElement)) drawReplies(x)
  }))

  const author = m.author_name
  side.append(...nodes(
    h('header', { class: 'side-head' },
      avatar(m.author_avatar, author, 36),
      h('div', { class: 'who' }, compactIdentity(authorUser(m), 'post', authorLink(m)), h('span', { class: 'muted' }, fmtTime(m.created_at), ' · No.' + m.id)),
      closeBtn()),
    m.title && h('h2', { class: 'detail-title' }, m.title),
    m.content && h('div', { class: 'detail-content md' }, richText(m.content, { md: true })),
    m.tags.length > 0 && h('div', { class: 'detail-tags' },
      m.tags.map((t) => h('a', { class: 'chip', href: `/t/${encodeURIComponent(t)}`, 'data-link': '' }, '#' + t))),
    m.source_url && h('a', { class: 'origin', href: m.source_url, target: '_blank', rel: 'noopener' },
      h('span', { class: 'origin-mark' }, 'L'),
      h('span', { class: 'origin-text' },
        h('strong', null, m.series || 'linux.do 原帖'),
        h('span', null, m.ld_likes > 0 ? `在 linux.do 获得 ${m.ld_likes} 个赞 · 去原楼层` : '去 linux.do 原楼层')),
      icon('ext')),
    actions,
    replies,
    commentsSection(m),
    m.can_manage && h('div', { class: 'danger-zone' },
      h('button', { class: 'btn btn-ghost sm', onclick: () => openEdit(m) }, icon('pen', 'i tiny'), '编辑'),
      h('button', { class: 'btn-text danger', onclick: () => deleteMeme(m) }, (m.kind === 'text') ? '删除这帖' : '删除这帖（连同图片）'))))
  markSeen(m)
  if (location.hash) requestAnimationFrame(() => side.querySelector(location.hash)?.scrollIntoView({ block: 'start' }))
}

// ---------- 顶栏 ----------

function renderActions() {
  const nav = document.getElementById('actions')
  const mode = themeMode(), themeLabel = '主题：' + THEME_LABELS[mode] + '；点击切换'
  const themeBtn = h('button', { class: 'btn-icon theme-btn', title: themeLabel, 'aria-label': themeLabel, onclick: toggleTheme },
    icon(THEME_ICONS[mode]))
  const lookBtn = h('button', { class: 'btn-icon', title: '外观：背景 · 伪装', 'aria-label': '外观', 'data-pop': 'look', onclick: (e) => looksPanel(e.currentTarget) },
    icon('palette'))
  const kids = [moyuBtn(), lookBtn, themeBtn, h('button', { class: 'btn btn-primary share', onclick: openCompose }, icon('plus'), h('span', { class: 'lbl' }, '发帖'))]
  kids.slice(0,3).forEach(el=>el.classList.add('desktop-action'))
  kids.unshift(h('button',{class:'btn-icon mobile-action',type:'button','aria-label':'搜索帖子',onclick:e=>mobileSearch(e.currentTarget)},icon('search')))
  if (S.me) {
    const n = NOTIF.unread
    kids.splice(kids.length - 1, 0, h('button', { class: 'btn-icon notif-btn', title: '互动提醒', 'aria-label': n ? `互动提醒，${n} 条未读` : '互动提醒', 'data-pop': 'notif', onclick: (e) => notifPanel(e.currentTarget) },
      icon('bell'), h('i', { class: 'chat-badge notif-badge', 'data-notif-badge': '', hidden: !n }, n > 99 ? '99+' : n)))
    kids.push(h('a', { class: 'me-link', href: '/me', 'data-link': '', 'data-nav': 'me' },
      avatar(S.me.avatar, S.me.username, 30), h('span', { class: 'lbl' }, '我的')))
  } else {
    kids.push(h('a', { class: 'btn btn-ghost btn-login', href: loginHref() },
      h('span', { class: 'long' }, '登录'), h('span', { class: 'short' }, '登录')))
  }
  kids.push(h('button',{class:'btn-icon mobile-action',type:'button','aria-label':'更多功能','data-pop':'mobilemore',onclick:e=>mobileMore(e.currentTarget)},icon('more')))
  nav.replaceChildren(...kids)
  document.querySelectorAll('.mobile-nav [data-nav]').forEach(a=>a.querySelector('span').replaceChildren(icon(({wall:'image',series:'apps',chat:'chat',road:'pen',me:'contacts'})[a.dataset.nav])))
  markNav()
}
function mobileSearch(anchor) {
  const input=h('input',{class:'input',type:'search','aria-label':'搜索帖子和标签',placeholder:'搜索帖子和标签',value:new URLSearchParams(location.search).get('q') || ''})
  openPop(anchor,h('form',{class:'mobile-search',onsubmit:e=>{e.preventDefault();closePop();navigate('/?q='+encodeURIComponent(input.value.trim()))}},input,h('button',{class:'btn btn-primary sm',type:'submit'},'搜索')),{key:'mobsearch',cls:'sheet'})
}
function mobileMore(anchor) {
  const item=(label,ic,fn)=>h('button',{class:'mobile-more-item',type:'button',onclick:()=>{closePop();fn()}},icon(ic),label)
  openPop(anchor,h('div',{class:'mobile-more'},
    item('摸鱼日历','calendar',()=>moyuPanel(anchor)),
    item('外观与伪装','palette',()=>looksPanel(anchor)),
    item('主题：'+THEME_LABELS[themeMode()],THEME_ICONS[themeMode()],toggleTheme),
    item('设置','gear',()=>meSettings()),
    h('a',{class:'mobile-more-item',href:'/me','data-link':''},icon('contacts'),'我的主页')),{key:'mobilemore',align:'right',cls:'sheet'})
}

// 互动提醒：别人对我发的图点喜欢 / 表情 / 回应 / 评论；一分钟拉一次未读数，打开面板即标已读
const NOTIF = { unread: 0, items: null, at: 0, tab: 'all' }
let notifSequence = 0, notifWrites = 0, notifReload = false
const NOTIF_VERB = { like: '喜欢了', emoji: '回应了表情', reply: '回应了', comment: '评论了', creply: '回复了你在这帖的评论', post: '发了新帖',
  mention: '在评论里 @ 了你', chat_at: '在群聊里 @ 了你', chat_reply: '在群聊里回复了你', post_at: '在帖子里 @ 了你', join_req: '申请回到群聊', badge: '你获得了徽章' }
// 提醒分类
const NOTIF_TABS = [['all', '全部', null], ['like', '喜欢', ['like']], ['rx', '回应', ['emoji', 'reply']], ['cmt', '评论', ['comment', 'creply']],
  ['at', '@我', ['mention', 'chat_at', 'post_at']], ['chat', '群聊', ['chat_at', 'chat_reply', 'join_req']], ['post', '新帖', ['post']]]
const isChatNotif = (n) => n.kind === 'chat_at' || n.kind === 'chat_reply'
// 提醒设置：后端存，登录时随 /me 带回来
const NOTIF_PREFS = [['like', '有人喜欢我的图'], ['emoji', '有人给我的图回应表情'], ['reply', '有人给我的图一句回应'], ['comment', '有人评论我的图'], ['creply', '有人回复我的评论'], ['post', '有人发了新帖'], ['mention', '有人在评论里 @ 我'], ['chat_at', '有人在群聊里 @ 我'], ['chat_reply', '有人在群聊里回复我'],
  ['post_at', '有人在帖子里 @ 我'], ['badge', '我拿到了新徽章'], ['join_req', '有人申请回到群聊（群管理才有）']]
const notifOn = (k) => S.me?.notif_prefs?.[k] !== false
function syncNotifBadge() {
  const n = NOTIF.unread
  document.querySelectorAll('[data-notif-badge]').forEach((el) => { el.textContent = n > 99 ? '99+' : n; el.hidden = !n })
  document.querySelectorAll('.notif-btn').forEach((b) => b.setAttribute('aria-label', n ? `互动提醒，${n} 条未读` : '互动提醒'))
  syncTab()
}
// 标签页标题上的数：只算通知（群聊有自己的角标，不往铃铛里算）
const tabCount = () => (S.me ? NOTIF.unread : 0)
async function loadNotifs() {
  if (!S.me || notifWrites) return
  const sequence = ++notifSequence, uid = S.me.id
  NOTIF.at = Date.now()
  try {
    const d = await api('/notifs')
    if (sequence !== notifSequence || S.me?.id !== uid) return
    Object.assign(NOTIF, { unread: d.unread, items: d.items })
    syncNotifBadge()
    if (POP?.key === 'notif') NOTIF.draw?.()
  } catch {}
}
setInterval(() => { if (S.me && !document.hidden && Date.now() - NOTIF.at > 60000) loadNotifs() }, 15000)
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - NOTIF.at > 20000) loadNotifs() })
// 点哪条只标哪条已读；其它保持未读
async function persistNotifRead(body) {
  ++notifSequence; ++notifWrites
  try { await api('/notifs/read', { method: 'POST', body }) }
  catch { notifReload = true }
  finally { if (--notifWrites === 0 && notifReload) { notifReload = false; loadNotifs() } }
}
function readNotif(n) {
  if (!n.unread) return
  n.unread = false
  NOTIF.unread = Math.max(0, NOTIF.unread - 1)
  syncNotifBadge()
  return persistNotifRead({ item: { kind: n.kind, meme_id: n.meme_id, user_id: n.user_id, at: n.at, gid: n.gid } })
}
// 群里已经看到（已读游标推到 upto）的 @ / 回复提醒：本地直接标已读、刷角标；服务端按游标过滤，不用逐条发
function chatNotifSeen(gid, upto) {
  let n = 0
  NOTIF.items?.forEach((x) => { if (x.unread && isChatNotif(x) && x.gid === gid && x.meme_id <= upto) { x.unread = false; n++ } })
  if (!n) return
  ++notifSequence
  NOTIF.unread = Math.max(0, NOTIF.unread - n)
  syncNotifBadge()
  // 打开着的提醒面板也跟着变
  document.querySelectorAll('.notif-row.unread').forEach((r) => { if (r.dataset.gid == gid && Number(r.dataset.mid) <= upto) r.classList.remove('unread') })
  if (POP?.key === 'notif') NOTIF.draw?.()
}
// 群聊提醒：打开那个群并跳到那条消息（已经开着就直接跳）
function openChatMsg(gid, id) {
  const pane = [...CHAT.panes].find((p) => p.group.id === gid && p.el.isConnected && p.st.done)
  if (pane && (pane.el.offsetParent || pane.el.ownerDocument !== document)) return pane.jumpTo(id)
  CHAT.jump = { gid, id }
  if (!S.skin && DOCK.open && DOCK.pane?.group.id === gid) { CHAT.jump = null; return DOCK.pane.jumpTo(id) }
  openGroup(gid)
}
function notifRow(n) {
  const who = n.name || n.username || '有人'
  if(n.kind==='ai_alert'){
    const labels={cap:'今日 AI 请求已达上限',breaker:'AI 服务连续失败，已暂停',configuration:'AI 服务配置需要检查'}
    return h('a',{class:'notif-row'+(n.unread?' unread':''),href:'/admin/ai',onclick:async e=>{e.preventDefault();await readNotif(n);location.href='/admin/ai'}},
      h('i',{class:'notif-dot','aria-hidden':'true'}),h('span',{class:'notif-bd','aria-hidden':'true'},'✦'),
      h('div',{class:'notif-main'},h('div',{class:'notif-line'},h('strong',null,labels[n.val]||'AI 运行提醒')),h('div',{class:'notif-val muted'},'查看 AI 设置与运行状态'),h('time',{class:'muted'},fmtTime(n.at))))
  }
  // 徽章：系统发的，不跳页，点开设置看徽章墙
  if (n.kind === 'badge') {
    const b = BADGES[n.val]
    const guideN = Math.max(0, Number(n.badge_n) || 0)
    return h('button', { class: 'notif-row notif-badge' + (n.unread ? ' unread' : ''), type: 'button', onclick: () => { readNotif(n); closePop(); meSettings('badges') } },
      h('i', { class: 'notif-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'notif-bd' }, n.val==='guide'&&!guideN?'🧭':badgeChip(n.val, true,n.val==='guide'?guideN:undefined)),
      h('div', { class: 'notif-main' },
        h('div', { class: 'notif-line' }, n.val==='guide'?'邀请徽章已更新 ':'你获得了徽章 ', h('strong', null, b?.name || n.val)),
        b && h('div', { class: 'notif-val muted' }, (n.val==='guide'?(guideN?'当前 Lv'+badgeLv('guide',guideN)+' · 合格邀请 '+guideN+' 人':'邀请已作废，徽章暂未点亮'):b.desc) + ' · 查看徽章墙'),
        h('time', { class: 'muted' }, fmtTime(n.at))))
  }
  if (n.kind === 'join_req') {
    return h('a', { class: 'notif-row' + (n.unread ? ' unread' : ''), href: `/chat/${n.gid}`, onclick: (e) => { e.preventDefault(); readNotif(n); closePop(); groupPanel({ id: n.gid, name: n.group_name || '群聊' }, { outside: true }) } },
      h('i', { class: 'notif-dot', 'aria-hidden': 'true' }),
      avatar(n.avatar, who, 32),
      h('div', { class: 'notif-main' },
        h('div', { class: 'notif-line' }, h('strong', null, who), ' 申请回到 ', h('span', { class: 'muted' }, '「' + (n.group_name || '群聊') + '」')),
        h('div', { class: 'notif-val muted' }, (n.val === 'left' ? '之前自己退的群' : '之前被移出了') + ' · 点开处理'),
        h('time', { class: 'muted' }, fmtTime(n.at))))
  }
  const chat = isChatNotif(n)
  const href = chat ? `/chat/${n.gid}` : `/m/${n.meme_id}` + (n.kind === 'comment' || n.kind === 'creply' || n.kind === 'mention' ? '#comments' : n.kind === 'reply' ? '#replies' : '')
  const showVal = ['reply', 'comment', 'creply', 'mention', 'post_at'].includes(n.kind) || chat
  return h('a', { class: 'notif-row' + (n.unread ? ' unread' : ''), href, 'data-link': chat ? null : '', 'aria-label': n.unread ? '未读' : null,
    'data-gid': chat ? n.gid : null, 'data-mid': chat ? n.meme_id : null,
    onclick: (e) => {
      readNotif(n)
      closePop()
      if (chat) { e.preventDefault(); openChatMsg(n.gid, n.meme_id) }
    } },
    h('i', { class: 'notif-dot', title: n.unread ? '未读' : '已读', 'aria-hidden': 'true' }),
    avatar(n.avatar, who, 32),
    h('div', { class: 'notif-main' },
      h('div', { class: 'notif-line' }, h('strong', null, who), ' ', NOTIF_VERB[n.kind] || '互动了', ' ',
        n.kind === 'emoji' && n.val && [emo(n.val), ' '],
        h('span', { class: 'muted' }, chat ? '「' + (n.group_name || '群聊') + '」' : '「' + (n.title || (n.kind === 'post' ? '一帖' : n.kind === 'creply' || n.kind === 'mention' ? '这帖' : '你的帖')) + '」')),
      showVal && n.val && h('div', { class: 'notif-val clip' }, linkify(n.val)),
      h('time', { class: 'muted' }, fmtTime(n.at))),
    n.thumb && h('img', { class: 'notif-thumb', src: n.thumb, alt: '', loading: 'lazy' }))
}
async function notifPanel(anchor) {
  const list = h('div', { class: 'notif-list' }, h('p', { class: 'muted notif-empty' }, '加载中…'))
  const allRead = h('button', { class: 'btn-text sm', type: 'button', hidden: true, onclick: () => {
    NOTIF.unread = 0
    NOTIF.items?.forEach((n) => { n.unread = false })
    syncNotifBadge()
    draw()
    persistNotifRead()
  } }, '全部已读')
  const box = h('div', { class: 'notif-pop' },
    h('div', { class: 'notif-head' }, h('strong', null, '互动提醒'),
      h('span', { class: 'row-end' }, allRead,
        h('button', { class: 'btn-icon sm', type: 'button', title: '提醒设置', 'aria-label': '提醒设置', onclick: () => notifSettings(list, draw) }, icon('gear')))),
    h('div', { class: 'notif-tabs', role: 'tablist' }),
    h('div', { class: 'notif-read-filter segs small', role: 'group', 'aria-label': '已读状态' }), list)
  const tabsEl = box.querySelector('.notif-tabs')
  const readFilter = box.querySelector('.notif-read-filter')
  const draw = () => {
    if (!box.isConnected) return
    NOTIF.draw = draw
    const all = NOTIF.items || []
    const tab = NOTIF_TABS.find((t) => t[0] === NOTIF.tab) || NOTIF_TABS[0]
    const items = all.filter((n) => (!tab[2] || tab[2].includes(n.kind)) && (!NOTIF.onlyUnread || n.unread))
      .sort((a, b) => Number(b.unread) - Number(a.unread) || b.at - a.at)
    readFilter.hidden = false
    readFilter.replaceChildren(...[[false, '全部'], [true, '未读']].map(([v, label]) => h('button', {
      class: 'seg' + (!!NOTIF.onlyUnread === v ? ' on' : ''), type: 'button', 'aria-pressed': String(!!NOTIF.onlyUnread === v),
      onclick: () => { NOTIF.onlyUnread = v; draw() },
    }, label)))
    allRead.hidden = !all.some((n) => n.unread)
    tabsEl.hidden = false
    tabsEl.replaceChildren(...NOTIF_TABS.filter((t) => !t[2] || t[0] === NOTIF.tab || all.some((n) => t[2].includes(n.kind))).map(([k, label, kinds]) => {
      const un = all.filter((n) => n.unread && (!kinds || kinds.includes(n.kind))).length
      return h('button', { class: 'notif-tab' + (k === tab[0] ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(k === tab[0]),
        onclick: () => { NOTIF.tab = k; draw() } }, label, un > 0 && h('i', { class: 'notif-tab-n' }, un > 99 ? '99+' : un))
    }))
    list.replaceChildren(...(items.length ? items.map(notifRow) : [h('p', { class: 'muted notif-empty' }, NOTIF.items ? (NOTIF.onlyUnread ? '没有未读提醒' : tab[2] ? '这一类暂时没有提醒' : '暂无提醒') : '加载中…')]))
  }
  if (!openPop(anchor, box, { key: 'notif', align: 'right', cls: 'pop-notif' })) return
  if (NOTIF.items?.length) draw()
  await loadNotifs()
  if (POP?.key !== 'notif') return
  draw()
  placePop(anchor, POP.el, 'right')
}
// 提醒设置：在提醒面板里就地切换
function notifSettings(list, back) {
  NOTIF.draw = null
  const prefs = { ...(S.me.notif_prefs || {}) }
  const row = ([k, label]) => {
    const cb = h('input', { type: 'checkbox', checked: prefs[k] !== false })
    cb.addEventListener('change', async () => {
      try {
        const r = await api('/notifs/prefs', { method: 'PUT', body: { [k]: cb.checked } })
        S.me.notif_prefs = r.prefs
        if (k === 'chat') syncChatBadges()
        else loadNotifs()
      } catch (e) { cb.checked = !cb.checked; toast(e.message, 'err') }
    })
    return h('label', { class: 'switch notif-pref' }, cb, h('span', { class: 'switch-ui' }), h('span', null, label))
  }
  const box = list.closest('.notif-pop')
  box?.querySelectorAll('.notif-tabs, .notif-read-filter').forEach((x) => { x.hidden = true })
  list.replaceChildren(h('div', { class: 'notif-prefs' },
    h('div', { class: 'muted sm' }, '接收哪些提醒'),
    NOTIF_PREFS.map(row),
    h('div', { class: 'row-end' }, h('button', { class: 'btn-text sm', type: 'button', onclick: back }, '返回提醒'))))
}

function markNav() {
  const p = location.pathname
  const cur = p === '/' || p.startsWith('/t/') || p.startsWith('/u/') ? 'wall'
    : p.startsWith('/series') || p.startsWith('/s/') ? 'series'
      : p.startsWith('/chat') || p.startsWith('/dm') ? 'chat' : p.startsWith('/road') ? 'road' : p.startsWith('/me') ? 'me' : ''
  if (p.startsWith('/m/')) return
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === cur))
  const title=document.getElementById('mobile-page-title')
  if(title) title.textContent=p.startsWith('/dm')?'私信':({wall:'图廊',series:'图集',chat:'群聊',road:'鞭打',me:'我的'})[cur] || '尽欢'
}

document.getElementById('search').addEventListener('submit', (e) => {
  e.preventDefault()
  const q = e.target.q.value.trim()
  navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
})

// ---------- 图廊 ----------

// 按列高度追加，保持大致时间顺序
// 瀑布流：普通卡片按列摆；文字帖（.wide）单独占一整行，前后各起一段
class Columns {
  constructor(el) { this.el = el; this.cards = []; this.n = 0 }
  build(n) {
    this.n = n
    this.cols = null
    this.cards = this.cards.filter(c => !c.dataset.removed)
    this.el.replaceChildren()
    for (const c of this.cards) this.place(c)
  }
  place(card) {
    // 分隔条：后面的卡片另起一行，不再塞回上面较短的那一列
    if (card.classList.contains('feed-sep')) {
      this.cols = null
      this.el.append(card)
      return
    }
    if (card.classList.contains('wide')) {
      this.cols = null
      this.el.append(h('div', { class: 'feed-wide' }, card))
      return
    }
    if (!this.cols) {
      this.cols = Array.from({ length: this.n }, () => h('div', { class: 'col' }))
      this.el.append(h('div', { class: 'feed-row' }, this.cols))
    }
    let best = this.cols[0]
    for (const c of this.cols) if (c.offsetHeight < best.offsetHeight - 40) best = c
    best.append(card)
  }
  add(card) { this.cards.push(card); this.place(card) }
}
// 横向模式：一帖一列，直接排成一行（分隔条不要）；和 Columns 同样的 add / build 接口
class HzCols {
  constructor(el, onAdd) { this.el = el; this.cards = []; this.n = 1; this.onAdd = onAdd }
  build() { this.cards = this.cards.filter(c => !c.dataset.removed); this.el.replaceChildren(...this.cards.filter((c) => !c.classList.contains('feed-sep'))) }
  add(card) {
    this.cards.push(card)
    if (card.classList.contains('feed-sep')) return
    this.el.append(card)
    this.onAdd?.(card)
  }
}
// 横向浏览开关（帖子左右排、同一帖的图上下排）
const wallHz = () => localStorage.getItem('wallHz') === '1'
function setWallHz(on) {
  localStorage.setItem('wallHz', on ? '1' : '0')
  closePop()
  S.wallFresh = true
  S.bgKey = null
  route()
}
// 折叠起来的日期，刷新后保持
const DAY_FOLD = new Set((() => { try { return JSON.parse(localStorage.getItem('dayFold')) || [] } catch { return [] } })())
function saveDayFold(day, on) {
  on ? DAY_FOLD.add(day) : DAY_FOLD.delete(day)
  localStorage.setItem('dayFold', JSON.stringify([...DAY_FOLD].slice(-200)))
}
// 哨兵是不是快到眼前了（横向看左右，纵向看上下）
const nearEnd = (st) => {
  const r = st.sentinel.getBoundingClientRect()
  return st.hz ? r.left < innerWidth + 1500 : r.top < innerHeight + 1200
}

const wantCols = () => (localStorage.getItem('layout') !== 'single' && innerWidth >= 760 ? 2 : 1)
const SLOGAN = '摸鱼片刻，尽欢就好。'

function emptyState(title, desc, ...acts) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, title), desc && h('p', null, desc),
    acts.length > 0 && h('div', { class: 'empty-acts' }, acts))
}
const goHomeBtn = (label = '去图廊逛逛') => h('a', { class: 'btn btn-primary sm', href: '/', 'data-link': '' }, label)

function pageHead(title, sub, extra) {
  return h('section', { class: 'page-head' }, h('div', { class: 'ph-text' }, h('h1', null, title), sub && h('p', null, sub)), extra)
}

const DAY_FIRST = 12 // 每天先露几张
const DAY_STEP = 20 // 每次「再看」多少张
const WEEK = '日一二三四五六'
// 服务端按北京时间分天
const dayOf = (ts) => new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 10)
function dayLabel(d) {
  const [y, mo, da] = d.split('-').map(Number)
  const dt = new Date(y, mo - 1, da)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - dt) / 86400000)
  return {
    main: `${mo}月${da}日`,
    sub: (y !== today.getFullYear() ? y + '年 · ' : '') + (diff === 0 ? '今天' : diff === 1 ? '昨天' : '周' + WEEK[dt.getDay()]),
  }
}

// 当前筛选条件拼成查询串（图廊、按天加载、日期目录共用）
function listParams(st, extra = {}) {
  const p = new URLSearchParams({ sort: st.sort || 'new', ...nsfwParam(), ...extra })
  for (const k of ['q', 'tag', 'author', 'series', 'text']) if (st[k]) p.set(k, st[k])
  if (st.unseen) {
    p.set('unseen', '1')
    if (st.anchor) p.set('before', st.anchor)
  }
  return p
}
// 游客只读查询携带进入列表时的已看快照；POST 不保存快照或创建记录。
async function browseApi(path, st) {
  st.seenSnap ||= new Set(SEEN.local)
  const guest = !S.me && st.seenSnap.size
  if (S.me && st.unseen) await flushSeen()
  return api(guest ? '/browse' + path : path, guest ? { method: 'POST', body: { seen: [...st.seenSnap] } } : {})
}
const AUTHOR_CHOICES = new Map()
const authorNames = s => [...new Map((s || '').split(/[,，\s]+/).map(x => x.replace(/^@/, '').trim()).filter(Boolean).map(x => [x.toLowerCase(), x])).values()].slice(0, 20)
function authorChips(st) {
  return h('div', { class: 'author-chips' }, authorNames(st.author).map(n => {
    const u = AUTHOR_CHOICES.get(n.toLowerCase()) || { username: n }
    return h('button', { class: 'cond author-chip', type: 'button', 'aria-label': '去掉发图人 ' + n,
      onclick: () => st.setParam('author', authorNames(st.author).filter(x => x.toLowerCase() !== n.toLowerCase()).join(',')) },
    avatar(u.avatar, u.name || n, 22), h('span', { class: 'clip' }, u.name || n), icon('close', 'i tiny'))
  }))
}
function tagChips(st) {
  const tags = [...new Set((st.tag || '').split(',').filter(Boolean))]
  return tags.map(t => h('button', { class: 'cond tag-chip', type: 'button', 'aria-label': '去掉标签 ' + t,
    onclick: () => st.setParam('tag', tags.filter(x => x !== t).join(',')) }, '#' + t, icon('close', 'i tiny')))
}
function authorPicker(st, anchor) {
  if (POP?.key === 'authors') return closePop()
  const selected = new Map(authorNames(st.author).map(n => [n.toLowerCase(), n]))
  const input = h('input', { class: 'input', type: 'search', placeholder: '搜昵称或用户名', 'aria-label': '搜索发图人', autocomplete: 'off' })
  const list = h('div', { class: 'author-options' })
  const chosen = h('div', { class: 'author-selected' })
  const apply = h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => { closePop(); st.setParam('author', [...selected.values()].join(',')) } })
  let rows = [], generation = 0, timer
  const draw = () => {
    apply.textContent = selected.size ? `看这 ${selected.size} 位发图人的帖` : '看全部发图人'
    chosen.replaceChildren(...[...selected.values()].map(n => h('button', { class: 'cond', type: 'button', 'aria-label': '取消选择 ' + n,
      onclick: () => { selected.delete(n.toLowerCase()); draw() } }, AUTHOR_CHOICES.get(n.toLowerCase())?.name || n, icon('close', 'i tiny'))))
    list.replaceChildren(...(rows.length ? rows.map(u => h('label', { class: 'author-option' },
      h('input', { type: 'checkbox', checked: selected.has(u.username.toLowerCase()), onchange: e => {
        const key = u.username.toLowerCase()
        if (e.target.checked && selected.size >= 20) { e.target.checked = false; return toast('最多选择 20 位发图人') }
        e.target.checked ? selected.set(key,u.username) : selected.delete(key); draw()
      } }), avatar(u.avatar,u.name || u.username,32),
      h('span', { class: 'who grow' }, h('strong', { class: 'clip' }, u.name || u.username), h('small', { class: 'muted clip' }, '@' + u.username)),
      h('small', { class: 'muted' }, `${u.posts} 帖`))) : [h('p', { class: 'muted' }, '没有匹配的发图人')]))
  }
  const load = async () => {
    const id = ++generation
    list.replaceChildren(h('p', { class: 'muted', role: 'status' }, '加载中…'))
    try {
      const d = await api('/authors?' + new URLSearchParams({ ...nsfwParam(), q: input.value.trim() }))
      if (id !== generation || !list.isConnected) return
      rows = d.authors
      rows.forEach(u => AUTHOR_CHOICES.set(u.username.toLowerCase(),u))
      draw()
    } catch(e) {
      if (id !== generation || !list.isConnected) return
      list.replaceChildren(h('p', { class: 'muted' }, e.message),h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: load },'重试'))
    }
  }
  input.addEventListener('input', () => { generation++; clearTimeout(timer); timer = setTimeout(load,200) })
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); input.value=''; load() } })
  const box = h('div', { class: 'author-picker' },h('div', { class: 'pop-head' },h('strong', null,'发图人'),h('button', { class: 'btn-icon sm', type:'button','aria-label':'关闭发图人筛选',onclick:closePop },icon('close'))),
    input, chosen, list, h('div', { class: 'row-end' },h('button', { class:'btn btn-ghost sm',type:'button',onclick:()=>{selected.clear();draw()} },'清空'),apply))
  openPop(anchor,box,{key:'authors',align:'right',cls:'pop-authors sheet'})
  draw();load()
}
async function browseTagPicker(st, anchor) {
  const chosen = new Set((st.tag || '').split(',').filter(Boolean))
  const input = h('input', { class: 'input', type: 'search', placeholder: '搜索标签', 'aria-label': '搜索标签', autocomplete: 'off' })
  const list = h('div', { class: 'tag-options' }, '加载中…')
  let tags = []
  const draw = () => {
    const q = input.value.trim().replace(/^#/, '').toLocaleLowerCase()
    const rows = tags.filter(t => t.toLocaleLowerCase().includes(q))
    list.replaceChildren(...(rows.length ? rows.map(t => h('label', { class: 'set-check' }, h('input', { type: 'checkbox', checked: chosen.has(t), onchange: e => e.target.checked ? chosen.add(t) : chosen.delete(t) }), '#' + t)) : [h('p', { class: 'muted', role: 'status' }, '没有匹配的标签')]))
  }
  input.addEventListener('input', draw)
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; draw() } })
  openPop(anchor,h('div',{class:'author-picker'},h('div',{class:'pop-head'},h('strong',null,'标签，可多选'),h('button',{class:'btn-icon sm','aria-label':'关闭标签筛选',onclick:closePop},icon('close'))),input,list,
    h('div',{class:'row-end'},h('button',{class:'btn btn-ghost sm',onclick:()=>{closePop();st.setParam('tag','')}},'清空'),h('button',{class:'btn btn-primary sm',onclick:()=>{closePop();st.setParam('tag',[...chosen].join(','))}},'应用'))),{key:'tags',cls:'sheet',align:'right'})
  try {
    const d = await api('/tags?' + new URLSearchParams(nsfwParam()))
    if (!list.isConnected) return
    tags = [...new Set([...chosen,...d.tags.map(x=>x.tag)])]
    draw()
  } catch(e) { if(list.isConnected)list.textContent=e.message }
}
// 保留筛选、换一个起点（日期 / 锚点）
function wallHref(from, focus) {
  const p = new URLSearchParams(location.search)
  p.delete('from')
  p.delete('focus')
  if (from) p.set('from', from)
  if (focus) p.set('focus', focus)
  const qs = p.toString()
  return location.pathname + (qs ? '?' + qs : '')
}

async function renderWall(base) {
  const params = new URLSearchParams(location.search)
  const st = {
    ...base,
    author: base.author || (params.get('author') || '').split(/[,，\s]+/).filter(Boolean).slice(0, 20).join(','),
    tag: base.tag || params.get('tag') || '',
    q: params.get('q') || '',
    sort: params.get('sort') || 'new',
    unseen: params.get('unseen') === '1',
    text: ['only', '0'].includes(params.get('text')) ? params.get('text') : '',
    from: params.get('from') || '',
    focus: Number(params.get('focus')) || 0,
    page: 0, more: true, loading: false, ids: new Set(), unseenLeft: null, sections: [], seenSnap: new Set(SEEN.local),
  }
  st.plain = !st.q && !st.tag && !st.author && !st.series && !st.text
  st.byDay = st.sort !== 'hot' // 热门没有时间顺序，不分天
  st.hz = wallHz() // 横向浏览：帖子左右排，一帖一列
  S.wall = st

  const setParam = (k, v) => {
    const p = new URLSearchParams(location.search)
    if (base.tag) p.set('tag',st.tag)
    if (v) p.set(k, v)
    else p.delete(k)
    p.delete('from')
    p.delete('focus')
    if (['sort','unseen','text','author','tag'].includes(k)) saveWallPrefs({ [k]: v || '' })
    S.wallFresh = true
    const qs = p.toString()
    const path = (base.tag || (base.author && k === 'author')) ? '/' : location.pathname
    navigate(path + (qs ? '?' + qs : ''), { replace: true })
  }

  // 返回上一页时：从离开时屏幕顶上那张接着显示，不重新从头刷
  const fresh = S.wallFresh
  S.wallFresh = false
  const pos = !fresh && st.byDay && !st.from && !st.focus && WALL_POS.get(location.pathname + location.search)
  if (pos) { st.restore = pos; st.from = pos.day; st.focus = pos.id }
  st.ready = !pos
  if (pos) setTimeout(() => { st.ready = true }, 4000)
  let head
  if (base.author) {
    head = pageHead('@' + st.author, '发过的图', h('button', { class: 'btn btn-ghost sm', type:'button', onclick:e=>userCard(st.author,e.currentTarget) }, '作者资料'))
  } else if (st.series) {
    head = pageHead(st.series, h('span', null, h('a', { href: '/series', 'data-link': '' }, '← 全部图集'), ' · 同一期原帖里的图'))
  } else if (st.q) {
    st.qCount = h('span', null, '搜索中…')
    head = pageHead(`搜索“${st.q}”`, st.qCount, h('a', { class: 'btn btn-ghost sm', href: '/', 'data-link': '' }, icon('close', 'i tiny'), '清除搜索'))
  } else {
    head = h('section', { class: 'slogan' }, h('h1', { class: 'sr-only' }, st.tag ? `#${st.tag} 的梗图` : '尽欢 · 梗图图廊'), h('p', null, SLOGAN))
  }

  const countEl = h('span', { class: 'unseen-n' })
  st.drawCount = () => {
    const n = st.unseenLeft
    countEl.textContent = n == null ? '' : n > 0 ? fmtN(n) : ''
    countEl.title = n ? `还有 ${n} 张没看` : ''
  }
  st.onSeen = (m) => {
    if (st.unseenLeft > 0) { st.unseenLeft--; st.drawCount() }
    // 「上次看到这里」：最新排序下，记住这次看到的最早一张
    if (m && st.byDay && st.sort === 'new' && st.plain && !st.unseen && (!st.minSeen || m.created_at < st.minSeen)) {
      st.minSeen = m.created_at
      localStorage.setItem('resume', JSON.stringify({ id: m.id, day: dayOf(m.created_at), at: m.created_at }))
    }
  }

  const seg = (label, value) => h('button', { class: 'seg' + (st.sort === value ? ' on' : ''), 'aria-pressed': st.sort === value ? 'true' : 'false',
    onclick: () => setParam('sort', value === 'new' ? '' : value) }, label)
  const unseenBox = h('input', { type: 'checkbox', checked: st.unseen })
  unseenBox.addEventListener('change', () => setParam('unseen', unseenBox.checked ? '1' : ''))
  st.setParam = setParam
  st.applyLayout = () => applyLayout()
  const filterBtn = h('button', { class: 'tool-btn', 'aria-label': '筛选与浏览设置', 'data-pop': 'wallset', 'aria-haspopup': 'dialog',
    onclick: (e) => wallSettings(st, e.currentTarget) }, icon('menu', 'i tiny'), h('span', { class: 'lbl' }, '筛选'))
  // 当前生效的筛选条件：一眼看到、点 × 去掉
  const without = (k) => { const p = new URLSearchParams(location.search); p.delete(k); p.delete('from'); p.delete('focus'); const q = p.toString(); return location.pathname + (q ? '?' + q : '') }
  const cond = (label, href) => h('a', { class: 'cond', href, 'data-link': '', 'aria-label': `去掉条件：${label}` }, label, icon('close', 'i tiny'))
  const conds = [
    ...tagChips(st),
    st.unseen && cond('只看未看', without('unseen')),
    st.sort === 'old' && cond('最早在前', without('sort')),
    S.content === 'only' && h('button', { class: 'cond', type: 'button', onclick: () => setContent('hide') }, '只看 NSFW', icon('close', 'i tiny')),
    st.text === 'only' && cond('只看文字帖', without('text')),
    st.text === '0' && cond('不看文字帖', without('text')),
    S.content === 'hide' && h('span', { class: 'cond quiet', title: '在「筛选」里改' }, '已隐藏敏感内容'),
  ].filter(Boolean)
  const tagsRow = h('div', { class: 'tag-strip' })
  const days = h('div', { class: 'days' })
  const notice = h('div', { class: 'wall-notice' })
  const sentinel = h('div', { class: 'sentinel' })
  // 横向：日期标签条（点一下跳到那天）+ 左右翻帖按钮；哨兵放进横向滚动条的末尾
  const hzTabs = st.hz && st.byDay ? h('nav', { class: 'hz-tabs', 'aria-label': '按日期跳转' }) : null
  // 日期条：上一天 / 标签（可横滑）/ 下一天，吸顶
  const hzDates = hzTabs && h('div', { class: 'hz-dates' },
    h('button', { class: 'hz-day prev', type: 'button', 'aria-label': '上一天', title: '上一天（[）', onclick: () => hzDayStep(st, -1) }, icon('chevL', 'i tiny')),
    hzTabs,
    h('button', { class: 'hz-day next', type: 'button', 'aria-label': '下一天', title: '下一天（]）', onclick: () => hzDayStep(st, 1) }, icon('chevR', 'i tiny')))
  const hzStep = (d) => {
    const card = days.querySelector('.card')
    days.scrollBy({ left: d * ((card?.offsetWidth || days.clientWidth) + 16), behavior: REDUCED.matches ? 'auto' : 'smooth' })
  }
  st.hzTabs = hzTabs
  const wrap = h('div', { class: 'wall' + (st.hz ? ' hz' : '') },
    head,
    h('div', { class: 'toolbar' },
      h('div', { class: 'segs', role: 'group', 'aria-label': '排序' }, seg('最新', 'new'), seg('热门', 'hot')),
      h('label', { class: 'check-pill' }, unseenBox, h('span', { class: 'box' }, icon('check', 'i tiny')), '只看未看', countEl),
      h('span', { class: 'grow' }),
      h('button', { class:'tool-btn',type:'button','aria-label':'筛选发图人',onclick:e=>authorPicker(st,e.currentTarget) },icon('users','i tiny'),h('span',{class:'lbl'},'发图人')),
      filterBtn,
      !st.series && h('a', { class: 'tool-btn', href: '/series', 'data-link': '' }, icon('apps', 'i tiny'), h('span', { class: 'lbl' }, '全部图集'))),
    (conds.length > 0 || st.author) && h('div', { class: 'conds' }, authorChips(st), conds),
    tagsRow,
    notice, hzDates, days, !st.hz && sentinel,
    st.hz && [
      h('button', { class: 'hz-nav prev', type: 'button', 'aria-label': '上一帖', onclick: () => hzStep(-1) }, icon('chevL')),
      h('button', { class: 'hz-nav next', type: 'button', 'aria-label': '下一帖', onclick: () => hzStep(1) }, icon('chevR'))])
  if (st.hz) {
    days.append(sentinel)
    days.tabIndex = 0
    days.setAttribute('aria-label', '横向浏览：左右切换帖子')
    // ←/→ 翻帖：输入框里、看大图时、弹层开着时不抢
    const onKey = (e) => {
      if (S.viewer || POP || S.modal || e.altKey || e.ctrlKey || e.metaKey) return
      const day = e.key === '[' || e.key === ']'
      if (!day && (e.shiftKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight'))) return
      if (e.target.isContentEditable || e.target.closest?.('input, textarea, select, [contenteditable], .car-track')) return
      e.preventDefault()
      if (day) { if (hzTabs) hzDayStep(st, e.key === '[' ? -1 : 1) }
      else hzStep(e.key === 'ArrowLeft' ? -1 : 1)
    }
    document.addEventListener('keydown', onKey)
    onPageLeave(() => document.removeEventListener('keydown', onKey))
    // 横向一帖一帖地看：一帖露出 60% 以上、停留 800ms 才算看过
    // （点日期标签平滑跳转、快速横滑时途经的帖子只是一闪而过，不记）
    const hzTimers = new Map()
    const hzIO = new IntersectionObserver((es) => {
      for (const en of es) {
        const el = en.target
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          if (!hzTimers.has(el)) hzTimers.set(el, setTimeout(() => {
            hzTimers.delete(el)
            const m = ITEMS.get(Number(el.dataset.id))
            if (!m || (wantBlur(m) && el.querySelector('[data-blur].blur'))) return
            hzIO.unobserve(el)
            markSeen(m)
          }, 800))
        } else {
          clearTimeout(hzTimers.get(el))
          hzTimers.delete(el)
        }
      }
    }, { root: days, threshold: [0, 0.6] })
    st.hzSeen = (card) => { if (card.matches('.card[data-id]')) hzIO.observe(card) }
    onPageLeave(() => { hzIO.disconnect(); hzTimers.forEach((t) => clearTimeout(t)); hzTimers.clear() })
    // 标签条跟着横向位置高亮当天
    let raf = 0
    days.addEventListener('scroll', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        clearTimeout(wallPosT)
        wallPosT = setTimeout(saveWallPos, 400)
        if (!hzTabs) return
        const x = days.getBoundingClientRect().left + 40
        const cur = st.sections.find((s) => s.el.getBoundingClientRect().right > x)
        if (cur && !st.hzGoing) hzMarkDay(st, cur.day)
      })
    }, { passive: true })
    // 翻帖按钮是 fixed 的：按 #main 剩下的内容区定位（分屏时让开右边群聊列），拖分屏条时跟着走
    const place = () => {
      const r = main.getBoundingClientRect()
      wrap.style.setProperty('--hz-l', Math.max(0, r.left) + 'px')
      wrap.style.setProperty('--hz-r', Math.max(0, innerWidth - r.right) + 'px')
      wrap.style.setProperty('--hz-width', r.width + 'px')
    }
    const pro = new ResizeObserver(place)
    pro.observe(main)
    addEventListener('resize', place)
    onPageLeave(() => { pro.disconnect(); removeEventListener('resize', place) })
  }
  main.replaceChildren(wrap)
  // 每天的标题吸在工具栏下面；工具栏换行时高度会变，实时量一下
  const tb = wrap.querySelector('.toolbar')
  const ro = new ResizeObserver(() => wrap.style.setProperty('--tb-h', tb.offsetHeight + 'px'))
  ro.observe(tb)
  onPageLeave(() => ro.disconnect())
  st.days = days
  st.wrap = wrap
  st.notice = notice
  st.sentinel = sentinel

  {
    api('/tags?' + new URLSearchParams(nsfwParam())).then(({ tags }) => {
      if (S.wall !== st) return
      tagsRow.replaceChildren(
        h('button', { class: 'chip' + (!st.tag ? ' on' : ''), type:'button',onclick:()=>setParam('tag','') }, '全部'),
        ...tags.map((t) => h('button', { class: 'chip' + (st.tag.split(',').includes(t.tag) ? ' on' : ''), type:'button',onclick:()=>setParam('tag',t.tag) }, t.tag)),
        h('button',{class:'chip ghost',type:'button',onclick:e=>browseTagPicker(st,e.currentTarget)},'多选标签'))
    }).catch(() => {})
  }

  const applyLayout = () => {
    if (st.hz) return // 横向固定一帖一列
    const n = wantCols()
    wrap.classList.toggle('one', n === 1)
    for (const c of st.byDay ? st.sections.map((x) => x.cols) : [st.cols]) if (c && n !== c.n) c.build(n)
  }
  if (!st.byDay) {
    const grid = h('div', { class: 'feed' })
    if (st.hz) {
      sentinel.before(grid)
      st.cols = new HzCols(grid, st.hzSeen)
    } else {
      days.append(grid)
      st.cols = new Columns(grid)
      st.cols.build(wantCols())
    }
  }
  applyLayout()
  addEventListener('resize', applyLayout)
  onPageLeave(() => removeEventListener('resize', applyLayout))
  // 横向时哨兵在横向滚动条里：以它为根，左右各提前 1500px 开始加载
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) (st.byDay ? loadNextDay : loadMore)(st) },
    st.hz ? { root: days, rootMargin: '0px 1500px' } : { rootMargin: '1200px' })
  io.observe(sentinel)
  onPageLeave(() => io.disconnect())
  if (st.byDay) await initDays(st)
  else await loadMore(st)
}

// 按天：先拿日期目录，再一天一天往下接；每天先露 DAY_FIRST 张，其余折叠在「这天还有 N 张」里
// 空结果：说清楚是搜不到、筛完了，还是本来就没有；给出下一步
function wallEmpty(st) {
  const clear = h('a', { class: 'btn btn-ghost sm', href: '/', 'data-link': '' }, '清除筛选')
  const box = (title, desc, ...acts) => h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, title), desc && h('p', null, desc), acts.length > 0 && h('div', { class: 'empty-acts' }, acts))
  if (st.unseen) return box('全都看过了', '摸鱼摸到头了。', h('a', { class: 'btn btn-ghost sm', href: '/?sort=hot', 'data-link': '' }, '去热门逛逛'), clear)
  if (st.q) {
    return box(`没搜到“${st.q}”`, '标题、配文、标签都能搜，换个短一点的词更容易命中。',
      h('button', { class: 'btn btn-ghost sm', onclick: () => { const i = document.querySelector('#search input'); i.select(); i.focus() } }, '换个词'), clear)
  }
  if (!st.plain || S.content === 'only') return box('这个条件下没有图', null, clear)
  return box('还没有图', '分享第一张吧', S.me ? h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => openCompose() }, icon('plus', 'i tiny'), '发布') : h('a', { class: 'btn btn-primary sm', href: loginHref() }, '登录后发布'))
}
// 首屏加载：居中转圈
const loadingBox = () => h('div', { class: 'loading-box', role: 'status' }, h('div', { class: 'spinner' }), h('span', null, '加载中…'))

async function initDays(st) {
  st.sentinel.replaceChildren(loadingBox())
  let list
  try {
    list = (await browseApi('/days?' + listParams(st), st)).days
  } catch (e) {
    if (st.qCount) st.qCount.textContent = '搜索出错了'
    return st.sentinel.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '加载失败'),
      h('p', null, e.message),
      h('div', { class: 'empty-acts' }, h('button', { class: 'btn btn-primary sm', onclick: () => initDays(st) }, '重试'))))
  }
  if (S.wall !== st) return
  st.dayList = list
  const total = list.reduce((a, d) => a + d.n, 0)
  st.unseenLeft = st.unseen ? total : list.reduce((a, d) => a + (d.unseen || 0), 0)
  st.drawCount()
  if (st.qCount) st.qCount.textContent = total ? `找到 ${total} 张` : '没有结果'
  st.di = st.from ? Math.max(0, list.findIndex((d) => d.day === st.from)) : 0

  // 顶部提示：跳到某天 / 上次看到这里
  if (!S.nsfw && st.tag && (S.nsfwTags || []).includes(st.tag)) {
    st.notice.replaceChildren(h('div', { class: 'notice-bar' }, icon('eyeOff', 'i tiny'),
      h('span', null, `「${st.tag}」属于 NSFW，你设置了不显示`), h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-primary sm', onclick: () => setContent('blur') }, '模糊显示')))
  } else if (st.restore) {
    // 返回时静默恢复，不提示
  } else if (st.di > 0 || st.focus) {
    const lb = dayLabel(list[st.di]?.day || st.from)
    st.notice.replaceChildren(h('div', { class: 'notice-bar' }, icon(st.focus ? 'anchor' : 'calendar', 'i tiny'),
      h('span', null, st.focus ? `从锚点接着看 · ${lb.main}` : `从 ${lb.main} 开始看`),
      h('span', { class: 'grow' }),
      h('a', { class: 'btn-text sm', href: wallHref(), 'data-link': '' }, '回到最新')))
  } else if (st.plain && st.sort === 'new' && !st.unseen) {
    let r = null
    try { r = JSON.parse(localStorage.getItem('resume')) } catch {}
    if (r?.id && list[0] && r.day !== list[0].day && list.some((d) => d.day === r.day)) {
      const lb = dayLabel(r.day)
      const bar = h('div', { class: 'notice-bar resume' }, icon('anchor', 'i tiny'),
        h('span', null, `上次看到 ${lb.main} ${new Date(r.at * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 那张`),
        h('span', { class: 'grow' }),
        h('a', { class: 'btn btn-primary sm', href: wallHref(r.day, r.id), 'data-link': '' }, '接着看'),
        h('button', { class: 'btn-icon ghost sm', 'aria-label': '不用了', onclick: () => { localStorage.removeItem('resume'); bar.remove() } }, icon('close')))
      st.notice.replaceChildren(bar)
    }
  }
  if (!list.length) return st.sentinel.replaceChildren(wallEmpty(st))
  st.sentinel.replaceChildren()
  if (st.hzTabs) hzBuildTabs(st)
  await loadNextDay(st)
}

// 横向日期条：每天一个标签，没加载到的那天点了也能直接去（按需往后接着加载再定位）
function hzBuildTabs(st) {
  st.hzTabMap = new Map()
  st.hzTabs.replaceChildren(...st.dayList.map((d, i) => {
    const lb = dayLabel(d.day)
    const tab = h('button', { class: 'hz-tab' + (DAY_FOLD.has(d.day) ? ' folded' : ''), type: 'button', title: `${lb.main} ${lb.sub} · ${d.n} 张`, onclick: () => hzGoDay(st, i) },
      h('strong', null, lb.main), h('span', null, d.n),
      !st.unseen && S.me && d.unseen > 0 && h('i', { class: 'dot', 'aria-label': `${d.unseen} 未看` }))
    st.hzTabMap.set(d.day, tab)
    return tab
  }))
  hzMarkDay(st, st.dayList[st.di]?.day)
}
// 高亮当天标签，并把它滚到日期条的可见范围里
function hzMarkDay(st, day) {
  if (!st.hzTabMap || st.hzCur === day) return
  st.hzCur = day
  const index = st.dayList.findIndex((d) => d.day === day)
  st.wrap.querySelector('.hz-day.prev').disabled = index <= 0
  st.wrap.querySelector('.hz-day.next').disabled = index >= st.dayList.length - 1
  let on = null
  for (const [k, t] of st.hzTabMap) {
    t.classList.toggle('on', k === day)
    t.setAttribute('aria-current', k === day ? 'true' : 'false')
    if (k === day) on = t
  }
  if (!on) return
  const nr = st.hzTabs.getBoundingClientRect(), tr = on.getBoundingClientRect()
  if (tr.left < nr.left + 8 || tr.right > nr.right - 8) {
    st.hzTabs.scrollTo({ left: st.hzTabs.scrollLeft + tr.left - nr.left - (nr.width - tr.width) / 2, behavior: 'instant' })
  }
}
async function hzGoDay(st, i) {
  const d = st.dayList?.[i]
  if (!d || st.hzGoing) return
  st.hzGoing = true
  const tab = st.hzTabMap.get(d.day)
  tab?.classList.add('busy')
  st.hzTabs.setAttribute('aria-busy', 'true')
  try {
    const sec = await loadHzDay(st, i)
    if (!sec || S.wall !== st) return
    hzMarkDay(st, d.day)
    // 只滚动图廊，保持页面及分屏聊天的位置不动。
    const left = sec.el.getBoundingClientRect().left - st.days.getBoundingClientRect().left + st.days.scrollLeft
    st.days.scrollTo({ left: Math.max(0, left - (innerWidth <= 760 ? 10 : 24)), behavior: 'instant' })
    st.di = Math.max(st.di, i + 1)
  } finally {
    st.hzGoing = false
    tab?.classList.remove('busy')
    st.hzTabs.removeAttribute('aria-busy')
  }
}
async function loadHzDay(st, i) {
  const d = st.dayList[i]
  let sec = st.sections.find((s) => s.day === d.day)
  if (!sec) {
    sec = daySection(st, d)
    const next = st.sections.find((s) => s !== sec && s.day < d.day)
    st.days.insertBefore(sec.el, next?.el || st.sentinel)
    st.sections.sort((a, b) => b.day.localeCompare(a.day))
  }
  if (sec.pending) await sec.pending
  if (!sec.loaded) {
    sec.pending = loadDayChunk(st, sec, { first: true })
    await sec.pending
    sec.pending = null
  }
  return sec // 加载失败时仍定位到目标日的重试按钮。
}
function hzDayStep(st, dir) {
  if (!st.dayList) return
  const i = st.dayList.findIndex((d) => d.day === st.hzCur)
  const j = Math.min(st.dayList.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))
  if (j !== i) hzGoDay(st, j)
}

async function loadNextDay(st) {
  if (st.loading || S.wall !== st || !st.dayList || st.di >= st.dayList.length) return
  st.loading = true
  while (st.di < st.dayList.length && st.sections.some((s) => s.day === st.dayList[st.di].day)) st.di++
  if (st.di >= st.dayList.length) { st.loading = false; return }
  const d = st.dayList[st.di++]
  const sec = daySection(st, d)
  if (st.hz) st.sentinel.before(sec.el)
  else st.days.append(sec.el)
  try {
    sec.pending = loadDayChunk(st, sec, { first: true, focus: d.day === st.from ? st.focus : 0 })
    await sec.pending
    sec.pending = null
  } finally {
    st.loading = false
  }
  if (S.wall !== st) return
  if (st.di >= st.dayList.length) st.sentinel.replaceChildren(h('div', { class: 'end' }, '— 到底了，起来走两步 —'))
  else if (!st.hzGoing && nearEnd(st)) loadNextDay(st)
}

function daySection(st, d) {
  const lb = dayLabel(d.day)
  // 折叠状态记在 localStorage（DAY_FOLD），刷新、换横向 / 纵向都保持
  const sec = { day: d.day, n: d.n, offset: 0, collapsed: DAY_FOLD.has(d.day) }
  const grid = h('div', { class: 'feed' })
  if (st.hz) sec.cols = new HzCols(grid, st.hzSeen)
  else {
    sec.cols = new Columns(grid)
    sec.cols.build(wantCols())
  }
  sec.top = h('div', { class: 'day-top' })
  sec.more = h('div', { class: 'day-more' })
  const setFold = (on) => {
    sec.collapsed = on
    sec.el?.classList.toggle('collapsed', on)
    sec.tab?.classList.toggle('folded', on)
    toggle.setAttribute('aria-expanded', on ? 'false' : 'true')
    toggle.title = on ? '展开这一天' : '收起这一天' // 横向时只露一个小图标，靠 title 说明
    toggle.replaceChildren(on ? '展开' : '收起', icon('chevD', 'i tiny'))
  }
  sec.setFold = setFold
  const toggle = h('button', { class: 'day-toggle', type: 'button', onclick: () => {
    setFold(!sec.collapsed)
    saveDayFold(sec.day, sec.collapsed)
    if (st.hz) { if (sec.collapsed) sec.el.scrollIntoView({ inline: 'start', block: 'nearest' }) }
    else if (sec.collapsed && sec.head.getBoundingClientRect().top < 60) sec.head.scrollIntoView({ block: 'start' })
  } }, '收起', icon('chevD', 'i tiny'))
  sec.head = h('header', { class: 'day-head', id: 'd-' + d.day },
    h('strong', { class: 'day-date' }, lb.main),
    h('span', { class: 'day-week' }, lb.sub),
    h('span', { class: 'day-n' }, st.unseen ? `${d.n} 张没看` : `${d.n} 张`),
    !st.unseen && S.me && d.unseen > 0 && h('span', { class: 'day-unseen' }, h('i', { class: 'dot' }), `${d.unseen} 未看`),
    h('span', { class: 'grow' }),
    toggle)
  sec.el = h('section', { class: 'day' }, sec.head, h('div', { class: 'day-body' }, sec.top, grid, sec.more))
  // 横向的日期标签在拿到日期目录时就全建好了（hzBuildTabs），这里挂上
  sec.tab = st.hzTabMap?.get(d.day)
  setFold(sec.collapsed)
  st.sections.push(sec)
  return sec
}

async function loadDayChunk(st, sec, { first = false, focus = 0 } = {}) {
  sec.more.replaceChildren(h('div', { class: 'spinner' }))
  const p = listParams(st, { day: sec.day, limit: String(first ? DAY_FIRST : DAY_STEP), offset: String(sec.offset) })
  if (focus) p.set('focus', focus)
  try {
    const data = await browseApi('/memes?' + p, st)
    if (S.wall !== st) return
    if (!st.anchor && data.anchor) st.anchor = data.anchor
    if (focus && data.offset > 0) {
      sec.top.replaceChildren(h('a', { class: 'day-more-btn', href: wallHref(sec.day), 'data-link': '' },
        `这天前面还有 ${data.offset} 张`))
    }
    if (first && st.restore && sec === st.sections[0] && sec.day !== st.dayList[0]?.day) {
      sec.top.prepend(h('a', { class: 'day-more-btn', href: wallHref(), 'data-link': '' }, '回到最新'))
    }
    // 「再看」接着的这批另起一行，从按钮原来的位置往下排，不会跑到视野上方的短列里
    if (!first && data.items.length) {
      sec.cols.add(h('div', { class: 'feed-sep' }, h('span', null, `第 ${data.offset + 1}–${data.offset + data.items.length} 张 / 共 ${sec.n} 张`)))
    }
    sec.offset = data.offset + data.items.length
    sec.loaded = true
    for (const m of data.items) {
      if (st.ids.has(m.id) || (st.unseen && !S.me && st.seenSnap.has(m.id))) continue
      st.ids.add(m.id)
      const card = wallCard(m, { stack: st.hz })
      sec.cols.add(card)
      // 要定位的帖子在折叠起来的那天：临时展开（不写回 DAY_FOLD），不然卡片是隐藏的，定位和高亮都落空
      if (m.id === focus && sec.collapsed) sec.setFold(false)
      if (m.id === focus && st.restore) {
        const top = st.restore.top
        requestAnimationFrame(() => {
          if (st.hz) card.scrollIntoView({ inline: 'start', block: 'nearest' })
          else scrollTo(0, scrollY + card.getBoundingClientRect().top - top)
          setTimeout(() => { st.ready = true }, 300)
        })
      } else if (m.id === focus) {
        card.classList.add('focused')
        setTimeout(() => card.scrollIntoView({ block: st.hz ? 'nearest' : 'center', inline: 'start', behavior: 'smooth' }), 300)
      }
    }
    const left = Math.max(0, sec.n - sec.offset)
    sec.more.replaceChildren(data.more && left > 0
      ? h('button', { class: 'day-more-btn', type: 'button', onclick: () => loadDayChunk(st, sec) },
        `这天还有 ${left} 张`, h('span', { class: 'muted' }, ` · 再看 ${Math.min(DAY_STEP, left)} 张`), icon('chevD', 'i tiny'))
      : '')
  } catch (e) {
    sec.more.replaceChildren(h('button', { class: 'btn-text', onclick: () => st.hz && first
      ? hzGoDay(st, st.dayList.findIndex((d) => d.day === sec.day))
      : loadDayChunk(st, sec, { first, focus }) }, e.message + ' · 重试'))
  }
}

// 筛选与浏览设置：排序、只看未看、内容显示、跳日期、锚点、单双列、一键模糊
function wallSettings(st, anchor) {
  if (POP?.key === 'wallset') return closePop()
  const row = (label, ...kids) => h('div', { class: 'ws-row' }, h('span', { class: 'ws-label' }, label), h('div', { class: 'ws-ctl' }, kids))
  const segs = (items, cur, pick, label) => h('div', { class: 'segs wrap', role: 'group', 'aria-label': label },
    items.map(([v, l]) => h('button', { class: 'seg' + (cur === v ? ' on' : ''), type: 'button', 'aria-pressed': cur === v ? 'true' : 'false', onclick: () => pick(v) }, l)))
  const check = (on, label, fn) => h('label', { class: 'check-pill' }, h('input', { type: 'checkbox', checked: on, onchange: (e) => fn(e.target.checked) }),
    h('span', { class: 'box' }, icon('check', 'i tiny')), label)
  const layout = localStorage.getItem('layout') || 'double'
  const box = h('div', { class: 'wall-set' },
    h('div', { class: 'pop-head' }, h('strong', null, '筛选与浏览'),
      h('button', { class: 'btn-icon ghost sm ws-close', 'aria-label': '关闭', onclick: closePop }, icon('close'))),
    row('排序', segs([['new', '最新'], ['hot', '热门'], ['old', '最早']], st.sort, (v) => { closePop(); st.setParam('sort', v === 'new' ? '' : v) }, '排序')),
    row('范围', check(st.unseen, '只看没看过的', (on) => { closePop(); st.setParam('unseen', on ? '1' : '') })),
    row('发图人', h('button',{class:'btn btn-ghost sm',type:'button',onclick:e=>authorPicker(st,e.currentTarget)},st.author ? `已选 ${authorNames(st.author).length} 位 · 更改` : '搜索并选择')),
    row('标签',h('button',{class:'btn btn-ghost sm',type:'button',onclick:e=>browseTagPicker(st,e.currentTarget)},st.tag || '多选标签')),
    row('内容显示', contentSeg()),
    row('文字帖', segs([['', '都看'], ['only', '只看文字帖'], ['0', '不看文字帖']], st.text || '', (v) => { closePop(); st.setParam('text', v) }, '文字帖')),
    row('一键模糊', check(S.blurAll, '所有图先模糊（快捷键 B）', setBlurAll)),
    row('浏览方向', segs([['v', '纵向'], ['h', '横向']], st.hz ? 'h' : 'v', (v) => setWallHz(v === 'h'), '浏览方向')),
    innerWidth >= 760 && !st.hz && row('列数', segs([['double', '双列'], ['single', '单列']], layout, (v) => { localStorage.setItem('layout', v); closePop(); st.applyLayout() }, '列数')),
    row('跳转',
      st.byDay && h('button', { class: 'tool-btn', type: 'button', 'data-pop': 'days', onclick: (e) => daysMenu(st, e.currentTarget) }, icon('calendar', 'i tiny'), '跳到哪天'),
      h('button', { class: 'tool-btn', type: 'button', 'data-pop': 'anchors', onclick: (e) => anchorsMenu(e.currentTarget) }, icon('anchor', 'i tiny'), '我的锚点')))
  openPop(anchor, box, { key: 'wallset', align: 'right', cls: 'pop-wallset sheet' })
}

// 日期目录：按月分组，点一天就从那天开始看
function daysMenu(st, anchor) {
  if (POP?.key === 'days') return closePop()
  const list = st.dayList || []
  const byMonth = new Map()
  for (const d of list) {
    const k = d.day.slice(0, 7)
    if (!byMonth.has(k)) byMonth.set(k, [])
    byMonth.get(k).push(d)
  }
  const box = h('div', { class: 'days-menu' },
    h('div', { class: 'pop-head' }, h('strong', null, '跳到哪天'), h('span', { class: 'muted' }, ` · 共 ${list.length} 天`)),
    h('div', { class: 'days-scroll' }, [...byMonth].map(([mo, ds]) => h('div', { class: 'dm-month' },
      h('div', { class: 'dm-title' }, `${Number(mo.slice(0, 4))}年${Number(mo.slice(5))}月`),
      h('div', { class: 'dm-grid' }, ds.map((d) => {
        const lb = dayLabel(d.day)
        return h('a', { class: 'dm-day' + (d.day === (st.from || list[0]?.day) ? ' on' : ''), href: wallHref(d.day), 'data-link': '', onclick: closePop,
          title: `${lb.main} ${lb.sub} · ${d.n} 张` },
        h('strong', null, Number(d.day.slice(8))), h('span', null, d.n),
        S.me && d.unseen > 0 && !st.unseen && h('i', { class: 'dot' }))
      }))))))
  openPop(anchor, box, { key: 'days', align: 'right', cls: 'pop-days' })
}

// ---------- 锚点 ----------
const ANCHORS = new Map() // meme id -> 锚点
function setAnchors(list) {
  ANCHORS.clear()
  for (const a of list) ANCHORS.set(a.id, a)
  document.querySelectorAll('.card[data-id]').forEach((c) => c.classList.toggle('anchored', ANCHORS.has(Number(c.dataset.id))))
}
async function addAnchor(m) {
  if (!requireLogin('加锚点')) return
  const note = prompt('给这个锚点写句备注（可不填，20 字以内）', '')
  if (note === null) return
  try {
    setAnchors((await api(`/anchors/${m.id}`, { method: 'PUT', body: { note } })).anchors)
    toast('锚点放好了，工具栏「锚点」里随时跳回来', 'ok')
  } catch (e) { toast(e.message, 'err') }
}
async function removeAnchor(id) {
  try { setAnchors((await api(`/anchors/${id}`, { method: 'DELETE' })).anchors) } catch (e) { toast(e.message, 'err') }
}
function anchorsMenu(anchor) {
  if (POP?.key === 'anchors') return closePop()
  const list = [...ANCHORS.values()]
  const body = !S.me
    ? h('div', { class: 'pop-empty' }, h('p', null, '登录后可以在任意一张图上放锚点，下次一键跳回来。'), h('a', { class: 'btn btn-primary sm', href: loginHref() }, '前往登录'))
    : !list.length
      ? h('div', { class: 'pop-empty' }, h('p', null, '还没有锚点。'), h('p', { class: 'muted' }, '在图片右上角「···」里选「在这里放锚点」，想从哪接着看就放哪。'))
      : h('div', { class: 'anchor-list' }, list.map((a) => {
        const lb = dayLabel(a.day)
        return h('div', { class: 'anchor-row' },
          h('a', { class: 'anchor-go', href: `/?from=${a.day}&focus=${a.id}`, 'data-link': '', onclick: closePop },
            h('span', thumbBlur('anchor-thumb', a.spoiler), memeImg(a.thumb, { loading: 'lazy' })),
            h('span', { class: 'anchor-text' }, h('strong', null, a.note || a.title || '没写备注'), h('span', { class: 'muted' }, `${lb.main} ${lb.sub} 的图`))),
          h('button', { class: 'btn-icon ghost sm', title: '删除锚点', 'aria-label': '删除锚点', onclick: async () => { await removeAnchor(a.id); closePop(); anchorsMenu(anchor) } }, icon('close')))
      }))
  openPop(anchor, h('div', { class: 'anchors-menu' },
    h('div', { class: 'pop-head' }, h('strong', null, '我的锚点'), S.me && h('span', { class: 'muted' }, ` · ${list.length} / 30`)), body),
  { key: 'anchors', align: 'right', cls: 'pop-anchors' })
}

async function loadMore(st, { retry = false } = {}) {
  if (st.loading || !st.more || S.wall !== st || (st.loadFailed && !retry)) return
  st.loadFailed = false
  st.loading = true
  st.sentinel.replaceChildren(st.page ? h('div', { class: 'spinner' }) : loadingBox())
  try {
    const data = await browseApi('/memes?' + listParams(st, { page: String(st.page + 1) }), st)
    if (S.wall !== st) return
    st.page += 1
    st.more = data.more
    if (st.page === 1) {
      st.anchor = data.anchor
      st.unseenLeft = data.unseen_total ?? data.total
      st.drawCount()
    }
    for (const m of data.items) {
      // 热门排序翻页时可能重复；游客的「只看未看」在本地过滤
      if (st.ids.has(m.id) || (st.unseen && !S.me && st.seenSnap.has(m.id))) continue
      st.ids.add(m.id)
      st.cols.add(wallCard(m, { stack: st.hz }))
    }
    if (st.page === 1 && st.qCount) st.qCount.textContent = data.total ? `找到 ${data.total} 张` : st.ids.size ? '搜索结果' : '没有结果'
    if (!st.more && !st.ids.size) {
      st.sentinel.replaceChildren(wallEmpty(st))
    } else {
      st.sentinel.replaceChildren(st.more ? '' : h('div', { class: 'end' }, '— 到底了，起来走两步 —'))
    }
  } catch (e) {
    st.loadFailed = true
    st.sentinel.replaceChildren(h('div', { class: 'end' }, e.message, ' ', h('button', { class: 'btn-text', onclick: () => loadMore(st, { retry: true }) }, '重试')))
  } finally {
    st.loading = false
  }
  // 首屏不足一屏时继续加载
  if (!st.loadFailed && st.more && S.wall === st && nearEnd(st)) loadMore(st)
}

// ---------- 图集 ----------

const SERIES_SORT = [['last', '最近更新'], ['first', '最早一期'], ['n', '图最多'], ['likes', '最受欢迎']]
async function renderSeries() {
  const params = new URLSearchParams(location.search)
  const st = { author:params.get('author') || '',tag:params.get('tag') || '',q:params.get('q') || '',text:params.get('text') || '',unseen:params.get('unseen') === '1',seenSnap:new Set(SEEN.local) }
  st.setParam = (k,v) => {
    v ? params.set(k,v) : params.delete(k)
    if (['author','tag','unseen','text'].includes(k)) saveWallPrefs({[k]:v || ''})
    navigate('/series?' + params, {replace:true})
  }
  const list = loadingBox()
  let sort = localStorage.getItem('series-sort') || 'last'
  const sortRow = h('div', { class: 'segs', role: 'group', 'aria-label': '图集排序' })
  let data = null
  const draw = () => {
    sortRow.replaceChildren(...SERIES_SORT.map(([v, l]) => h('button', { class: 'seg' + (sort === v ? ' on' : ''), 'aria-pressed': sort === v ? 'true' : 'false',
      onclick: () => { sort = v; localStorage.setItem('series-sort', v); draw() } }, l)))
    if (!data) return
    const key = { last: (x) => -x.last_at, first: (x) => x.first_at, n: (x) => -x.n, likes: (x) => -(x.likes || 0) }[sort]
    const rows = [...data].sort((a, b) => key(a) - key(b))
    list.className = 'series-grid'
    list.removeAttribute('aria-hidden')
    list.replaceChildren(...rows.map((s) => h('a', { class: 'series-card', href: `/s/${encodeURIComponent(s.name)}${params.size ? '?' + params : ''}`, 'data-link': '' },
      h('div', { class: 'covers n' + Math.min(4, s.covers.length) },
        s.covers.map((c) => h('div', thumbBlur('cv', c.spoiler), memeImg(c.src, { loading: 'lazy', alt: '' })))),
      h('div', { class: 'series-body' },
        h('strong', null, s.name),
        s.desc && h('span', { class: 'series-desc' }, s.desc),
        h('span', { class: 'muted' }, `${s.n} 张 · 更新于 ${fmtDate(s.last_at)}`, s.likes > 0 && ` · ♥ ${fmtN(s.likes)}`)))))
  }
  main.replaceChildren(pageHead('图集', null, sortRow),
    h('div',{class:'toolbar series-toolbar'},h('button',{class:'tool-btn',type:'button','aria-label':'筛选发图人',onclick:e=>authorPicker(st,e.currentTarget)},icon('users','i tiny'),'发图人'),
      h('button',{class:'tool-btn',type:'button',onclick:e=>browseTagPicker(st,e.currentTarget)},'标签'),
      h('label',{class:'check-pill'},h('input',{type:'checkbox',checked:st.unseen,onchange:e=>st.setParam('unseen',e.target.checked?'1':'')}),h('span',{class:'box'},icon('check','i tiny')),'只看未看'),
      h('button',{class:'tool-btn',type:'button',onclick:e=>{openPop(e.currentTarget,h('div',{class:'author-picker'},contentSeg()),{key:'series-content',cls:'sheet'})}},'内容显示')),
    h('div',{class:'conds'},authorChips(st),...tagChips(st)),list)
  draw()
  try {
    data = (await browseApi('/series?' + listParams(st), st)).series
    if (!data.length) return list.replaceChildren(emptyState('还没有图集', null, goHomeBtn()))
    draw()
  } catch (e) {
    list.className = 'series-grid'
    list.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '加载失败'), h('p', null, e.message),
      h('div', { class: 'empty-acts' }, h('button', { class: 'btn btn-primary sm', onclick: renderSeries }, '重试'))))
  }
}

// ---------- 鞭打模块（原成长路线）：需求 / Bug / 改进意见，大家投票，管理员标状态；可以带图片 / 文件 ----------
// 附件：图片直接看，其他（含视频、日志、压缩包）当文件下载；选了马上在后台传
function roadAttach() {
  const input = h('input', { type: 'file', multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' })
  const list = h('div', { class: 'rd-att-list' })
  const a = { items: [] }
  const draw = () => list.replaceChildren(...a.items.map((it) => h('span', { class: 'rd-att-it ' + it.state, title: it.err || it.file.name },
    it.img ? h('img', { src: it.url, alt: '' }) : icon('doc', 'i tiny'),
    h('span', { class: 'rd-att-n' }, it.file.name), h('span', { class: 'muted' }, it.state === 'up' ? '上传中' : it.state === 'err' ? '失败' : fmtBytes(it.file.size)),
    h('button', { class: 'cm-x', type: 'button', 'aria-label': '移除 ' + it.file.name, onclick: () => { a.items = a.items.filter((x) => x !== it); draw() } }, icon('close', 'i tiny')))))
  a.add = (files) => {
    for (const f of files) {
      if (a.items.length >= 9) { toast('最多 9 个附件', 'err'); break }
      if (f.size > MAX_FILE) { toast(`「${f.name}」超过 20MB`, 'err'); continue }
      const img = /^image\/(png|jpeg|gif|webp)$/.test(f.type)
      const it = { file: f, img, url: img ? URL.createObjectURL(f) : '', state: 'up' }
      it.job = (async () => {
        const meta = img ? await probeMedia(f, it.url).catch(() => ({})) : {}
        const r = await uploadFile(f, 'chat', img ? undefined : 'file')
        it.out = { key: r.key, name: f.name, ...(meta.w ? { w: meta.w, h: meta.h } : {}) }
        it.state = 'ok'
      })().catch((e) => { it.state = 'err'; it.err = e.message }).finally(draw)
      a.items.push(it)
    }
    draw()
  }
  a.media = async () => {
    await Promise.all(a.items.map((it) => it.job))
    const bad = a.items.find((it) => it.state !== 'ok')
    if (bad) throw new Error(`「${bad.file.name}」没传上去：${bad.err || ''}`)
    return a.items.map((it) => it.out)
  }
  a.clear = () => { a.items = []; draw() }
  input.addEventListener('change', () => { a.add([...input.files]); input.value = '' })
  a.btn = h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => input.click() }, icon('image', 'i tiny'), '图片 / 文件')
  a.el = h('div', { class: 'rd-att' }, input, list)
  // 粘贴截图、拖文件进来也行
  a.bind = (zone) => {
    zone.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); a.add(fs) } })
    zone.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault() })
    zone.addEventListener('drop', (e) => { const fs = [...(e.dataTransfer.files || [])]; if (fs.length) { e.preventDefault(); a.add(fs) } })
  }
  return a
}
function roadMedia(media) {
  if (!media?.length) return null
  const pics = media.filter((x) => x.k !== 'f'), files = media.filter((x) => x.k === 'f')
  return h('div', { class: 'rd-media' },
    pics.length > 0 && h('div', { class: 'rd-pics' }, pics.map((im, i) => h('button', { class: 'rd-pic', type: 'button', 'aria-label': `看第 ${i + 1} 张图`,
      onclick: () => openViewer({ images: pics, image: pics[0].u }, i) }, h('img', { src: im.u, alt: '', loading: 'lazy', width: im.w || null, height: im.h || null })))),
    files.length > 0 && h('div', { class: 'cm-files' }, files.map((f) =>
      h('a', { class: 'cm-file', href: f.u + '?n=' + encodeURIComponent(f.n || '文件'), download: f.n || '文件', target: '_blank', rel: 'noopener' },
        h('span', { class: 'cm-file-ic' }, icon('doc')), h('span', { class: 'cm-file-main' }, h('strong', null, f.n || '文件'), h('span', { class: 'muted' }, fmtBytes(f.s || 0)))))))
}
const ROAD_KIND = { feature: ['需求', 'rocket'], bug: ['Bug', 'search'], idea: ['改进意见', 'pen'] }
const ROAD_ST = { open: '待评估', planned: '计划中', doing: '进行中', done: '已上线', declined: '暂不做' }
async function renderRoad() {
  const p = new URLSearchParams(location.search)
  const st = { kind: p.get('kind') || '', status: p.get('status') || '', sort: p.get('sort') === 'new' ? 'new' : 'hot', item: p.get('item') || '' }
  const list = loadingBox()
  const setQ = () => {
    const q = new URLSearchParams(Object.entries(st).filter(([k, v]) => v && !(k === 'sort' && v === 'hot')))
    history.replaceState(history.state, '', '/road' + (q.toString() ? '?' + q : ''))
    S.bgKey = location.pathname + location.search
  }
  const seg = (key, opts, label) => h('div', { class: 'segs small', role: 'group', 'aria-label': label },
    opts.map(([v, l]) => h('button', { class: 'seg' + (st[key] === v ? ' on' : ''), type: 'button', 'aria-pressed': String(st[key] === v),
      onclick: () => { st[key] = v; setQ(); bar(); load() } }, l)))
  const filters = h('div', { class: 'road-filters' })
  const bar = () => filters.replaceChildren(
    seg('kind', [['', '全部'], ...Object.entries(ROAD_KIND).map(([k, [l]]) => [k, l])], '类型'),
    seg('status', [['', '全部状态'], ...Object.entries(ROAD_ST)], '状态'),
    seg('sort', [['hot', '票多的'], ['new', '新提的']], '排序'))
  bar()
  const openForm = () => { if (requireLogin('提需求')) roadForm(load) }
  const backfillStatus = h('span', { class: 'muted sm', role: 'status', 'aria-live': 'polite' })
  let backfillAfter = 0, backfillUpto = null, scanned = 0, matched = 0
  const backfill = S.me?.is_admin && h('button', { class: 'btn btn-ghost sm road-backfill', type: 'button', onclick: async () => {
    if (!confirm('将群聊历史中带 #需求 / #bug 的消息转入鞭打，内容与图片会在鞭打公开显示。确认回填？')) return
    backfill.disabled = true
    try {
      let more
      do {
        const r = await api('/road/backfill-chat', { method: 'POST', body: { after: backfillAfter, ...(backfillUpto === null ? {} : { upto: backfillUpto }) } })
        backfillAfter = r.after; backfillUpto = r.upto; scanned += r.scanned; matched += r.matched; more = r.more
        backfillStatus.textContent = `已扫描 ${scanned} 条，匹配 ${matched} 条反馈${more ? '…' : '，回填完成'}`
      } while (more && backfill.isConnected)
      if (backfill.isConnected) await load()
    } catch (e) { backfillStatus.textContent = e.message + '；再次点击可从已完成位置继续' }
    finally { backfill.disabled = false }
  } }, '回填历史反馈')
  main.replaceChildren(...nodes(pageHead('鞭打模块', '想要什么功能、遇到什么 Bug、哪里用着别扭，都来鞭打站长；可以附截图和文件，大家投票，票多的先做',
    h('button', { class: 'btn btn-primary sm', type: 'button', onclick: openForm }, icon('plus', 'i tiny'), '提一条')), filters,
    st.item && h('div', { class: 'notice-bar' }, `正在查看鞭打 #${st.item}`, h('a', { class: 'btn-text', href: '/road', 'data-link': '' }, '查看全部')),
    backfill && h('div', { class: 'road-backfill-bar' }, backfill, backfillStatus), list))
  let seq = 0
  async function load() {
    const my = ++seq
    try {
      const { items } = await api('/road?' + new URLSearchParams(Object.entries(st).filter(([, v]) => v)))
      if (my !== seq || !list.isConnected) return
      list.className = 'road-list'
      list.removeAttribute('role')
      list.replaceChildren(...(items.length ? items.map((it) => roadCard(it, load))
        : [emptyState('这里还空着', '来提第一条吧', h('button', { class: 'btn btn-primary sm', type: 'button', onclick: openForm }, '提一条'))]))
    } catch (e) {
      if (my === seq) list.replaceChildren(emptyState('加载失败', e.message, h('button', { class: 'btn btn-primary sm', onclick: load }, '重试')))
    }
  }
  load()
}
function roadCard(it, reload) {
  const score = h('strong', { class: 'rd-score' }, String(it.score))
  const up = h('button', { class: 'rd-v rd-up', type: 'button', 'aria-label': '赞成', title: '赞成' }, '▲')
  const down = h('button', { class: 'rd-v rd-down', type: 'button', 'aria-label': '反对', title: '反对' }, '▼')
  const paint = () => {
    score.textContent = String(it.score)
    up.classList.toggle('on', it.my === 1); up.setAttribute('aria-pressed', String(it.my === 1))
    down.classList.toggle('on', it.my === -1); down.setAttribute('aria-pressed', String(it.my === -1))
  }
  const vote = async (v) => {
    if (!requireLogin('投票')) return
    const nv = it.my === v ? 0 : v
    try { Object.assign(it, await api(`/road/${it.id}/vote`, { method: 'POST', body: { v: nv } })); paint() } catch (e) { toast(e.message, 'err') }
  }
  up.onclick = () => vote(1)
  down.onclick = () => vote(-1)
  paint()
  const [kl, ki] = ROAD_KIND[it.kind] || ROAD_KIND.idea
  const cmt = h('div', { class: 'rd-cmts', hidden: true })
  const cmtN = h('span', null, `${it.comments || 0} 条讨论`)
  const cmtBtn = h('button', { class: 'btn-text sm', type: 'button', 'aria-expanded': 'false', onclick: () => roadComments(it, cmt, cmtBtn, cmtN) }, cmtN)
  const acts = []
  if (S.me?.is_admin) acts.push(h('button', { class: 'btn-text sm', type: 'button', onclick: (e) => roadAdmin(it, e.currentTarget, reload), 'data-pop': 'rda' + it.id }, '改状态 / 回复'))
  if (it.mine || S.me?.is_admin) acts.push(h('button', { class: 'btn-text sm danger', type: 'button', onclick: async () => {
    if (!confirm(`删除「${it.title}」？`)) return
    try { await api(`/road/${it.id}`, { method: 'DELETE' }); reload() } catch (e) { toast(e.message, 'err') }
  } }, '删除'))
  return h('article', { class: 'rd-card st-' + it.status, id: 'road-' + it.id },
    h('div', { class: 'rd-vote' }, up, score, down),
    h('div', { class: 'rd-main' },
      h('div', { class: 'rd-head' },
        h('span', { class: 'rd-kind k-' + it.kind }, icon(ki, 'i tiny'), kl),
        h('span', { class: 'rd-st s-' + it.status }, ROAD_ST[it.status] || it.status),
        h('h3', null, it.title)),
      it.body && h('div', { class: 'rd-body' }, richBody(it.body, { md: 'lite' })),
      it.source_msg_id && h('button', { class: 'rd-source', type: 'button', 'data-msg': it.source_msg_id, onclick: () => openChatMsg(it.source_group_id, it.source_msg_id) },
        icon('chat', 'i tiny'), `来自群聊 · 查看原消息 #${it.source_msg_id}`),
      roadMedia(it.media),
      it.reply && h('div', { class: 'rd-reply' }, h('strong', null, '站长回复：'), richText(it.reply)),
      h('div', { class: 'rd-foot muted sm' },
        avatar(it.user.avatar, it.user.name || it.user.username, 18),
        uName('button', it.user, { class: 'rd-who', type: 'button', 'data-pop': 'u' + it.user.username, onclick: (e) => userCard(it.user.username, e.currentTarget) }, it.user.name || it.user.username, 'post'),
        h('span', null, fmtTime(it.created_at)),
        h('span', { class: 'grow' }), cmtBtn, ...acts),
      cmt))
}
async function roadComments(it, box, btn, cnt) {
  if (!box.hidden) { box.hidden = true; btn.setAttribute('aria-expanded', 'false'); return }
  box.hidden = false
  btn.setAttribute('aria-expanded', 'true')
  box.replaceChildren(h('div', { class: 'spinner' }))
  try {
    const { comments } = await api(`/road/${it.id}/comments`)
    const ta = h('textarea', { class: 'input', rows: 2, maxlength: 1000, placeholder: S.me ? '说说你的看法…' : '登录后参与讨论', 'aria-label': '讨论' })
    const send = h('button', { class: 'btn btn-primary sm', type: 'submit' }, '发表')
    const att = roadAttach()
    att.bind(ta)
    const form = h('form', { class: 'rd-cform', onsubmit: async (e) => {
      e.preventDefault()
      if (!requireLogin('参与讨论') || (!ta.value.trim() && !att.items.length)) return
      send.disabled = true
      try {
        await api(`/road/${it.id}/comments`, { method: 'POST', body: { body: ta.value, media: await att.media() } })
        it.comments = (it.comments || 0) + 1
        cnt.textContent = `${it.comments} 条讨论`
        box.hidden = true
        roadComments(it, box, btn, cnt)
      } catch (err) { toast(err.message, 'err'); send.disabled = false }
    } }, ta, att.el, h('div', { class: 'row-end' }, att.btn, h('span', { class: 'grow' }), send))
    box.replaceChildren(...comments.map((c) => h('div', { class: 'rd-c' },
      avatar(c.user.avatar, c.user.name || c.user.username, 22),
      h('div', { class: 'rd-c-main' },
        h('div', { class: 'rd-c-head' }, uName('strong', c.user, {}, c.user.name || c.user.username, 'post'), h('span', { class: 'muted sm' }, fmtTime(c.created_at))),
        c.body && h('div', { class: 'rd-c-body' }, richBody(c.body, { md: 'lite' })), roadMedia(c.media)))), form)
  } catch (e) { box.replaceChildren(h('p', { class: 'muted sm' }, e.message)) }
}
function roadForm(done) {
  const panel = openModalShell('road-form')
  S.modal.kind = 'road-form'
  let kind = 'feature'
  const kinds = h('div', { class: 'segs', role: 'radiogroup', 'aria-label': '类型' })
  const drawK = () => kinds.replaceChildren(...Object.entries(ROAD_KIND).map(([k, [l, ic]]) =>
    h('button', { class: 'seg' + (k === kind ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === kind), onclick: () => { kind = k; drawK() } }, icon(ic, 'i tiny'), l)))
  drawK()
  const title = h('input', { class: 'input', maxlength: 60, placeholder: '一句话说清楚，比如「群聊支持语音消息」', required: true })
  const body = h('textarea', { class: 'input', rows: 6, maxlength: 2000, placeholder: '详细说说：想怎么用、在哪个页面、Bug 怎么复现（可选；支持部分 Markdown，写 No.1234 引用帖子；截图可以直接粘贴进来）' })
  const att = roadAttach()
  att.bind(body)
  const pub = h('button', { class: 'btn btn-primary', type: 'submit' }, '提交')
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, '提一条'), closeBtn()),
    h('form', { class: 'ma-body road-fbody', onsubmit: async (e) => {
      e.preventDefault()
      pub.disabled = true
      try {
        await api('/road', { method: 'POST', body: { kind, title: title.value, body: body.value, media: await att.media() } })
        closeModal()
        toast('提交了，感谢', 'ok')
        done()
      } catch (err) { toast(err.message, 'err'); pub.disabled = false }
    } }, field('类型', kinds), field('标题', title), field('详情', body), field('附件（图片 / 文件，单个 20MB 内）', h('div', null, att.el, att.btn)), h('div', { class: 'row-end' }, pub)))
  setTimeout(() => title.focus())
}
function roadAdmin(it, anchor, reload) {
  const sel = h('select', { class: 'input sm', 'aria-label': '状态' }, Object.entries(ROAD_ST).map(([k, l]) => h('option', { value: k, selected: k === it.status }, l)))
  const reply = h('textarea', { class: 'input', rows: 3, maxlength: 1000, placeholder: '回复（留空就是不回复）', 'aria-label': '回复' })
  reply.value = it.reply || ''
  openPop(anchor, h('form', { class: 'rd-admin', onsubmit: async (e) => {
    e.preventDefault()
    try {
      await api(`/road/${it.id}`, { method: 'PATCH', body: { status: sel.value, reply: reply.value } })
      closePop(); toast('改好了', 'ok'); reload()
    } catch (err) { toast(err.message, 'err') }
  } }, sel, reply, h('div', { class: 'row-end' }, h('button', { class: 'btn btn-primary sm', type: 'submit' }, '保存'))), { key: 'rda' + it.id, align: 'right' })
}

// ---------- 我的 ----------

const TABS = [['fav', '收藏'], ['like', '喜欢'], ['reply', '回应'], ['comment', '评论'], ['post', '我的发布'], ['seen', '最近看过']]
const TAB_SORT = { fav: '最近收藏', like: '最近喜欢', reply: '最近回应', comment: '最近评论', post: '最近发布', seen: '最近看过' }
const TAB_EMPTY = { fav: '还没收藏过', like: '还没喜欢过', reply: '还没回应过', comment: '还没评论过', post: '还没分享过图', seen: '还没有浏览记录' }

async function renderMe() {
  if (!S.me) {
    main.replaceChildren(pageHead('我的', '登录后能看到自己的收藏、回应和看过的图'),
      h('a', { class: 'btn btn-primary', href: loginHref() }, '前往登录'))
    return
  }
  const p = new URLSearchParams(location.search)
  const tab = TABS.some(([k]) => k === p.get('tab')) ? p.get('tab') : 'fav'
  const st = { tab, q: p.get('q') || '', sort: p.get('sort') === 'old' ? 'old' : 'new', folder: Number(p.get('folder')) || 0, page: 0, more: true }
  S.meSt = st
  const u = S.me
  const setQ = (obj) => {
    const q = new URLSearchParams(location.search)
    for (const [k, v] of Object.entries(obj)) v ? q.set(k, v) : q.delete(k)
    navigate('/me' + (q.toString() ? '?' + q : ''), { replace: true })
  }

  const tabs = h('nav', { class: 'me-tabs' }, TABS.map(([k, label]) =>
    h('a', { class: 'me-tab' + (k === tab ? ' on' : ''), href: k === 'fav' ? '/me' : `/me?tab=${k}`, 'data-link': '', 'data-tab': k },
      label, h('span', { class: 'n' }))))
  api('/me/stats').then((s) => tabs.querySelectorAll('[data-tab]').forEach((a) => { a.lastChild.textContent = fmtN(s[a.dataset.tab]) })).catch(() => {})

  const search = h('input', { class: 'input sm', type: 'search', name: 'q', placeholder: '搜标题或我写过的话', 'aria-label': '搜索我的内容', value: st.q })
  const sf = h('form', { class: 'me-search' }, icon('search'), search)
  sf.addEventListener('submit', (e) => { e.preventDefault(); setQ({ q: search.value.trim() }) })
  const sortSel = h('select', { class: 'input sm', 'aria-label': '排序' },
    h('option', { value: 'new' }, TAB_SORT[tab]), h('option', { value: 'old' }, '最早在前'))
  sortSel.value = st.sort
  sortSel.addEventListener('change', () => setQ({ sort: sortSel.value === 'old' ? 'old' : '' }))

  const folderRow = tab === 'fav' ? h('div', { class: 'folder-row' }) : null
  const drawFolders = async (force) => {
    const fs = await getFolders(force)
    const cur = fs.find((f) => f.id === st.folder)
    const edit = async (fn) => { try { S.folders = (await fn()).folders; drawFolders() } catch (e) { toast(e.message, 'err') } }
    folderRow.replaceChildren(...nodes(
      h('a', { class: 'chip' + (!st.folder ? ' on' : ''), href: '/me', 'data-link': '' }, '全部'),
      ...fs.map((f) => h('a', { class: 'chip' + (st.folder === f.id ? ' on' : ''), href: `/me?folder=${f.id}`, 'data-link': '' }, f.name, h('span', { class: 'n' }, f.n))),
      h('button', { class: 'chip ghost', onclick: () => {
        const name = prompt('新收藏夹的名字（12 字以内）')
        if (name?.trim()) edit(() => api('/folders', { method: 'POST', body: { name } }))
      } }, icon('plus', 'i tiny'), '新建'),
      cur && h('span', { class: 'folder-ops' },
        h('button', { class: 'btn-text sm', onclick: () => {
          const name = prompt('改个名字', cur.name)
          if (name?.trim() && name !== cur.name) edit(() => api(`/folders/${cur.id}`, { method: 'PATCH', body: { name } }))
        } }, '重命名'),
        h('button', { class: 'btn-text sm danger', onclick: async () => {
          if (!confirm(`删除收藏夹「${cur.name}」？里面的收藏会一起移除。`)) return
          try { await api(`/folders/${cur.id}`, { method: 'DELETE' }); S.folders = null; navigate('/me', { replace: true }) } catch (e) { toast(e.message, 'err') }
        } }, '删除'))))
  }

  st.list = h('div', { class: 'me-list' })
  st.moreBtn = h('button', { class: 'btn btn-ghost block', hidden: true, onclick: () => loadMe(st) }, '加载更多')
  st.totalEl = h('span', { class: 'muted' })
  main.replaceChildren(h('div', { class: 'me-page' },
    h('section', { class: 'me-head' },
      avatar(u.avatar, u.username, 60),
      h('div', { class: 'me-who' }, h('h1', null, u.name || u.username), h('span', { class: 'muted' }, `@${u.username} · TL${u.trust_level}`),
        u.bio && h('span', { class: 'me-bio' }, u.bio),
        S.limits?.length ? h('span', { class: 'me-limits' }, '你当前被限制：', ...S.limits.map((l) =>
          h('span', { class: 'badge danger' }, `${LIMIT_KINDS.find((k) => k[0] === l.kind)?.[1] || l.kind} ${untilText(l.until)}${l.reason ? `（${l.reason}）` : ''}`))) : null),
      h('span', { class: 'grow' }),
      u.linuxdo_username && h('a', { class: 'btn btn-ghost sm', href: `https://linux.do/u/${encodeURIComponent(u.linuxdo_username)}`, target: '_blank', rel: 'noopener' }, 'linux.do 主页', icon('ext', 'i tiny')),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: meSettings }, icon('gear', 'i tiny'), '设置'),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { location.href = '/me/invites' } }, icon('users', 'i tiny'), '邀请好友'),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { location.href = '/me/account' } }, icon('gear', 'i tiny'), '账号安全'),
      S.me?.owner && h('a', { class: 'btn btn-ghost sm', href: '/admin/ai' }, icon('gear', 'i tiny'), 'AI 接入与设置'),
      S.me?.is_admin ? h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: noticeAdmin }, icon('bell', 'i tiny'), '公告设置') : null,
      S.me?.is_admin ? h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => memberAdmin() }, icon('users', 'i tiny'), '成员管理') : null,
      h('button', { class: 'btn btn-ghost sm', onclick: async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/' } }, icon('logout', 'i tiny'), '退出')),
    tabs,
    h('div', { class: 'me-tools' }, h('h2', null, TABS.find(([k]) => k === tab)[1], ' ', st.totalEl), h('span', { class: 'grow' }), sf, sortSel),
    folderRow,
    st.list, st.moreBtn))
  await getFolders().catch(() => {})
  if (S.meSt !== st) return
  if (folderRow) drawFolders().catch(() => {})
  loadMe(st)
}

async function loadMe(st) {
  if (st.loading || !st.more || S.meSt !== st) return
  st.loading = true
  st.moreBtn.disabled = true
  st.moreBtn.textContent = '加载中…'
  try {
    const p = new URLSearchParams({ tab: st.tab, page: String(st.page + 1) })
    if (st.q) p.set('q', st.q)
    if (st.sort === 'old') p.set('sort', 'old')
    if (st.folder) p.set('folder', st.folder)
    const data = await api('/me/items?' + p)
    if (S.meSt !== st) return
    st.page++
    st.more = data.more
    st.totalEl.textContent = data.total
    for (const it of data.items) st.list.append(meRow(it))
    if (st.page === 1 && !data.items.length) st.list.append(st.q ? emptyState(TAB_EMPTY[st.tab], '换个关键词试试', h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => navigate('/me' + (st.tab === 'fav' ? '' : '?tab=' + st.tab)) }, '清除搜索'))
      : emptyState(TAB_EMPTY[st.tab], null, goHomeBtn()))
  } catch (e) {
    toast(e.message, 'err')
  } finally {
    st.loading = false
    st.moreBtn.hidden = !st.more
    st.moreBtn.disabled = false
    st.moreBtn.textContent = '加载更多'
  }
}

// ---------- 解密大厅 ----------

const puzzleName = (m) => m.title || `看图猜梗 · ${String(m.puzzle?.id ?? m.id).padStart(3, '0')}`
async function renderPuzzles() {
  S.wall = null
  const list = loadingBox()
  const head = pageHead('解密', null, h('div', { class: 'ph-acts' },
    h('a', { class: 'btn btn-ghost sm', href: '/tools', 'data-link': '' }, '解密工具箱'),
    h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => openCompose({ puzzle: true }) }, icon('plus'), '发解密图')))
  main.replaceChildren(head, list)
  let puzzles
  try {
    puzzles = (await api('/puzzles')).puzzles
  } catch (e) {
    list.className = 'puzzle-list'
    return list.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'empty-title' }, '加载失败'), h('p', null, e.message),
      h('div', { class: 'empty-acts' }, h('button', { class: 'btn btn-primary sm', onclick: renderPuzzles }, '重试'))))
  }
  // 回应、表情、评论数：和图廊卡片共用 ITEMS，详情里互动后这里跟着变
  const stats = (m) => {
    const rx = (m.reactions || []).filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 4)
    const likes = (m.ld_likes || 0) + (m.like_count || 0)
    const top = (m.replies || [])[0]
    return [
      likes > 0 && h('span', { class: 'pstat' }, icon('heart', 'i tiny'), fmtN(likes)),
      ...rx.map((r) => h('span', { class: 'pstat', title: emoLabel(r.emoji) }, emo(r.emoji), r.count)),
      m.reply_count > 0 && h('span', { class: 'pstat', title: '一句回应' }, icon('quote', 'i tiny'), m.reply_count),
      m.comment_count > 0 && h('span', { class: 'pstat', title: '评论' }, icon('chat', 'i tiny'), m.comment_count),
      top && h('span', { class: 'pstat preply' }, linkify(top.text)),
    ].filter(Boolean)
  }
  const card = (m) => {
    m = syncItem(m)
    const pz = m.puzzle
    const r = REWARD[pz.reward_kind] || REWARD.secret
    const open = pz.status === 'open'
    const st = h('div', { class: 'pcard-stats' }, stats(m))
    onPageLeave(watchItem(m.id, (x) => st.replaceChildren(...stats(x))))
    return h('a', { class: 'pcard' + (open ? '' : ' done'), href: `/m/${m.id}`, 'data-link': '' },
      h('div', thumbBlur('pcard-media', m.sensitive ?? m.spoiler), memeImg(m.thumb || m.image, { loading: 'lazy', alt: '' })),
      h('div', { class: 'pcard-body' },
        h('div', { class: 'pcard-top' }, statusPill(pz.status), h('span', { class: 'reward-tag' }, r.emoji, ' ', r.label)),
        h('div', { class: 'pcard-title' }, puzzleName(m)),
        pz.hint && h('div', { class: 'pcard-hint' }, '提示：', pz.hint),
        h('div', { class: 'pcard-meta' },
          pz.layer_count > 1 && h('span', null, `${pz.layer_count} 层连环`),
          h('span', null, `已解 ${pz.winners_count}${pz.max_winners ? ' / ' + pz.max_winners : ''}`),
          pz.ends_at && h('span', null, `${open ? '截止' : '截止于'} ${new Date(pz.ends_at * 1000).toLocaleString('zh-CN', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`)),
        st))
  }
  const live = puzzles.filter((m) => m.puzzle.status === 'open')
  const done = puzzles.filter((m) => m.puzzle.status !== 'open')
  list.className = 'puzzle-sections'
  list.removeAttribute('aria-hidden')
  list.replaceChildren(...[
    h('h2', { class: 'sec-title' }, '进行中', h('span', { class: 'muted' }, live.length || '')),
    live.length ? h('div', { class: 'puzzle-list' }, live.map(card))
      : emptyState('现在没有进行中的题', '在自己的梗图详情里可以挂一道题。'),
    done.length > 0 && h('h2', { class: 'sec-title' }, '已结束', h('span', { class: 'muted' }, done.length)),
    done.length > 0 && h('div', { class: 'puzzle-list' }, done.map(card))].filter(Boolean))
}

// 解密工具箱：出题解题都用，全在浏览器里算
async function renderTools() {
  main.replaceChildren(pageHead('解密工具箱'), h('div', { class: 'spinner' }))
  let C
  try { C = await loadCipher() } catch (e) { return main.replaceChildren(emptyState('工具箱没加载出来', e.message)) }
  let pre = {}
  try { pre = JSON.parse(sessionStorage.getItem('tools-prefill')) || {} } catch {}
  sessionStorage.removeItem('tools-prefill')
  const qs = new URLSearchParams(location.search)
  let cur = C.cipherById(qs.get('algo') || pre.algo) || C.CIPHERS.find((c) => c.id === 'base64')
  const input = h('textarea', { class: 'input mono', rows: 6, maxlength: 20000, placeholder: '粘贴密文，或者输入要加密的原文', 'aria-label': '原文或密文' })
  input.value = pre.text || ''
  const key = h('input', { class: 'input' })
  const out = h('pre', { class: 'tool-out mono', 'aria-live': 'polite' })
  const outBox = h('div', { class: 'tool-out-box', hidden: true })
  const panel = h('section', { class: 'tool-panel' })
  const sel = h('select', { class: 'input tool-sel', 'aria-label': '指定算法', onchange: () => pick(C.cipherById(sel.value)) },
    C.CIPHER_CATS.map((cat) => h('optgroup', { label: cat.name },
      C.CIPHERS.filter((c) => c.cat === cat.id).map((c) => h('option', { value: c.id }, c.name)))))
  const pick = (c) => {
    if (!c) return
    cur = c
    outBox.hidden = true
    history.replaceState(history.state, '', '/tools?algo=' + c.id)
    draw()
  }
  const show = (text, err = false) => {
    outBox.hidden = false
    out.classList.toggle('err', err)
    outBox.replaceChildren(...nodes(out, !err && h('div', { class: 'row-end' },
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { input.value = text; outBox.hidden = true } }, '放回输入框继续'),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => copyText(text) }, icon('copy'), '复制'))))
    out.textContent = text
  }
  const run = async (fn) => {
    try { show(await fn()) } catch (e) { show(e.message || String(e), true) }
  }
  // 自动识别：不要钥匙的解码器挨个试，留下看着像正常文字的；换位/替换类对任何字母都「解得通」，不参与
  const NO_GUESS = new Set(['reverse', 'rail', 'rot13', 'rot47', 'atbash', 'caesar', 'affine', 'qwerty', 'html'])
  const guess = async () => {
    const t = input.value.trim()
    if (!t) return input.focus()
    const hits = []
    for (const c of C.CIPHERS) {
      if (!c.dec || c.key?.required || c.image || NO_GUESS.has(c.id)) continue
      try {
        const r = String(await c.dec(t, ''))
        if (r && r !== t && !/[\u0000-\u0008�]/.test(r)) hits.push([c, r])
      } catch {}
    }
    outBox.hidden = false
    out.classList.remove('err')
    outBox.replaceChildren(hits.length
      ? h('div', { class: 'tool-guess' }, h('div', { class: 'muted' }, `有 ${hits.length} 种解得通：`), hits.map(([c, r]) =>
        h('button', { class: 'tool-hit', type: 'button', onclick: () => { pick(c); show(r) } }, h('b', null, c.name), h('span', { class: 'mono' }, snip(r, 80)))))
      : h('pre', { class: 'tool-out err' }, '不需要钥匙的那些都解不通。可能要钥匙（凯撒、维吉尼亚、AES），在下面选好算法、填钥匙再点解密。'))
  }
  // 图片藏字
  const img = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif' })
  const secret = h('textarea', { class: 'input', rows: 3, maxlength: 2000, placeholder: '要藏进去的话' })
  let stegoUrl = ''
  // 常用的几个直接点，其余在下拉里
  const QUICK = ['base64', 'hex', 'url', 'morse', 'caesar', 'shou', 'fo', 'aes', 'md5', 'stego']
  const quick = h('div', { class: 'tool-quick', role: 'group', 'aria-label': '常用算法' })
  function draw() {
    sel.value = cur.id
    quick.replaceChildren(...QUICK.map((id) => C.cipherById(id)).filter(Boolean).map((c) => h('button', {
      class: 'tool-chip' + (c === cur ? ' on' : ''), type: 'button', 'aria-pressed': String(c === cur), onclick: () => pick(c) }, c.name)))
    key.placeholder = cur.key ? cur.key.placeholder : ''
    key.setAttribute('aria-label', cur.key?.label || '钥匙')
    const keyField = cur.key && field(cur.key.label + (cur.key.required ? '' : '（选填）'), key)
    const picker = h('div', { class: 'tool-pick' }, h('label', { class: 'tool-pick-l' }, '算法', sel), quick)
    if (cur.image) {
      panel.replaceChildren(...nodes(picker, h('p', { class: 'muted' }, cur.desc),
        field('图片', img),
        field('要藏的话', secret, '只有「藏进去」用得到'), keyField,
        h('div', { class: 'tool-acts' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => run(async () => {
            const f = img.files[0]
            if (!f) throw Error('先选一张图')
            if (!secret.value) throw Error('先写要藏的话')
            const b = await C.stegoEncode(f, secret.value, key.value)
            if (stegoUrl) URL.revokeObjectURL(stegoUrl)
            stegoUrl = URL.createObjectURL(b)
            setTimeout(() => outBox.append(h('a', { class: 'btn btn-accent sm', href: stegoUrl, download: 'stego.png' }, '下载藏好字的 PNG')))
            return `藏好了，${Math.round(b.size / 1024)} KB。下载下来发帖或出题都行。`
          }) }, '藏进去'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => run(async () => {
            const f = img.files[0]
            if (!f) throw Error('先选一张图')
            return C.stegoDecode(f, key.value)
          }) }, '读出来')),
        outBox))
    } else {
      // 一个输入框：先「一键识别」，识别不了再指定算法
      panel.replaceChildren(...nodes(input,
        h('div', { class: 'tool-acts' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: guess }, icon('search'), '一键识别解密'),
          ),
        h('div', { class: 'tool-sep' }),
        picker, h('p', { class: 'muted' }, cur.desc), keyField,
        h('div', { class: 'tool-acts' },
          cur.enc && h('button', { class: cur.dec ? 'btn btn-ghost' : 'btn btn-accent', type: 'button', onclick: () => run(() => cur.enc(input.value, key.value)) }, cur.dec ? '加密' : '计算'),
          cur.dec && h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => run(() => cur.dec(input.value, key.value)) }, '解密')),
        outBox))
    }
  }
  draw()
  main.replaceChildren(pageHead('解密工具箱', null,
    h('a', { class: 'btn btn-ghost sm', href: '/puzzles', 'data-link': '' }, '去解题')),
  h('div', { class: 'tools-box' }, panel))
}

function statusPill(status) {
  const map = { open: ['进行中', 'open'], full: ['已结束 · 名额满', 'off'], ended: ['已结束', 'off'] }
  const [t, c] = map[status] || map.open
  return h('span', { class: `pill pill-${c}` }, t)
}

const ACT_VERB = { fav: '收藏于', like: '喜欢于', reply: '回应于', emoji: '回应于', comment: '评论于', post: '发布于', seen: '看过于' }

function meRow(raw) {
  const { act: a, ...rest } = raw
  const m = syncItem(rest)
  const slot = 'r' + Math.random().toString(36).slice(2, 8)
  let undone = false
  const row = h('article', { class: 'me-row' })
  const undo = (label, fn) => h('button', { class: 'btn-text sm', onclick: async () => {
    if (!(await fn())) return
    undone = true
    draw(ITEMS.get(m.id))
  } }, label)
  const draw = (x) => {
    const folders = (x.fav_folders || []).map((id) => S.folders?.find((f) => f.id === id)?.name).filter(Boolean)
    let chip = null
    let undoBtn = null
    if (a.kind === 'reply') {
      chip = h('span', { class: 'act-chip' }, h('em', null, '我的短句'), linkify(a.val))
      undoBtn = undo('撤回回应', async () => x.my_reply !== a.val || act(x, null, () => api(`/memes/${x.id}/reply`, { method: 'DELETE' })))
    } else if (a.kind === 'emoji') {
      const mine = x.reactions.find((r) => r.emoji === a.val)?.mine
      chip = h('span', { class: 'act-chip' }, h('em', null, '我的表情'), emo(a.val), emoLabel(a.val))
      undoBtn = undo('撤回表情', async () => !mine || toggleReaction(x, a.val))
    } else if (a.kind === 'comment') {
      chip = h('span', { class: 'act-chip wide' }, h('em', null, '我的评论'), h('span', { class: 'clip' }, linkify(a.val)))
      undoBtn = undo('删除评论', async () => {
        if (!confirm('删除这条评论？')) return false
        try {
          await api(`/comments/${a.ref}`, { method: 'DELETE' })
          syncItem({ ...x, comment_count: Math.max(0, x.comment_count - 1) })
          return true
        } catch (e) { toast(e.message, 'err'); return false }
      })
    } else if (a.kind === 'like') {
      undoBtn = undo('取消喜欢', async () => !x.liked || toggleLike(x))
    }
    const href = memeHref(x) + (a.kind === 'comment' ? '#comments' : a.kind === 'reply' ? '#replies' : '')
    row.classList.toggle('undone', undone)
    row.replaceChildren(
      h('a', { ...thumbBlur('me-thumb', x.sensitive ?? x.spoiler), href, 'data-link': '' }, memeImg(x.thumb || x.image, { loading: 'lazy' }),
        x.image_count > 1 && h('span', { class: 'n' }, x.image_count)),
      h('div', { class: 'me-main' },
        h('a', { class: 'me-title', href, 'data-link': '' }, x.title || x.text || '无题'),
        h('div', { class: 'me-meta muted' }, avatar(x.author_avatar, x.author_name, 18), x.author_name || '佚名', ' · 发布于 ', fmtTime(x.created_at)),
        h('div', { class: 'me-act' }, chip,
          h('span', { class: 'muted' }, undone ? '已撤回' : `${ACT_VERB[a.kind]} ${fmtTime(a.at)}`),
          !undone && undoBtn && [h('span', { class: 'sep' }, '·'), undoBtn])),
      h('div', { class: 'me-side' },
        h('button', { class: 'act fav' + (folders.length ? ' on' : ''), 'data-pop': slot + 'f', 'data-slot': slot, onclick: (e) => doFav(x, e.currentTarget, slot) },
          icon('bookmark'), h('span', { class: 'clip' }, folders.length ? '已收藏 · ' + folders.join('、') : '收藏')),
        h('button', { class: 'btn-icon ghost sm', 'aria-label': '更多', 'data-pop': slot + 'm', onclick: (e) => moreMenu(x, e.currentTarget, slot + 'm') }, icon('more'))))
  }
  draw(m)
  onPageLeave(watchItem(m.id, draw))
  return row
}

// ---------- 评论（可插平台表情） ----------

function commentsSection(meme, { compact = false } = {}) {
  const list = h('div', { class: 'comments-list' }, h('div', { class: 'spinner' }))
  const countEl = h('span', { class: 'muted' }, meme.comment_count || '')
  const sec = compact
    ? h('section', { class: 'comments compact' }, list)
    : h('section', { class: 'comments', id: 'comments' }, h('h3', null, '评论 ', countEl), list)
  const bump = (d) => {
    const x = ITEMS.get(meme.id) || meme
    syncItem({ ...x, comment_count: Math.max(0, x.comment_count + d) })
    countEl.textContent = x.comment_count || ''
  }

  let setReply = null // 登录后才有输入框
  const renderComment = (c) => {
    const r = c.reply_to
    const el = h('div', { class: 'comment', 'data-cid': c.id || null },
      avatar(c.avatar, c.username, 28),
      h('div', { class: 'comment-main' },
        h('div', { class: 'comment-head' },
          compactIdentity(c, 'post', uName('a', c, { href: `/u/${encodeURIComponent(c.username)}`, 'data-link': '' }, c.name || c.username, 'post')[0]),
          c.kind === 'bot' ? h('span', { class: 'comment-ai-label', title: 'AI 自动回应' }, 'AI') : h('span', { class: 'tl' }, 'TL' + c.trust_level),
          h('span', { class: 'muted' }, fmtTime(c.created_at)),
          setReply && c.id > 0 && h('button', { class: 'btn-text small', type: 'button', onclick: () => setReply(c) }, '回复'),
          c.can_delete && h('button', { class: 'btn-text small', onclick: async () => {
            if (!confirm('删除这条评论？')) return
            try {
              await api(`/comments/${c.id}`, { method: 'DELETE' })
              dropComment(el, c.id)
              bump(-1)
            } catch (e) { toast(e.message, 'err') }
          } }, '删除')),
        // 楼中楼：直接挂在被回复评论下面的，缩进已经表达了关系，不再画引用；平铺（超过层数 / 原评论不在列表里）的才显示「回复 @某人」
        r && !c._nested && h('button', { class: 'comment-quote', type: 'button', title: '跳到被回复的评论',
          onclick: () => { const t = list.querySelector(`[data-cid="${r.id}"]`); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash') } } },
        h('strong', null, '回复 @' + (r.name || r.username)), ' ', r.deleted ? h('span', { class: 'muted' }, '（原评论已删除）') : h('span', { class: 'clip' }, r.text)),
        h('div', { class: 'comment-body' + (stkOnly(c.body) ? ' stk-only' : '') }, richBody(c.body))))
    return el
  }

  // 层级：回复挂在被回复的评论下面，最多缩进 CMT_DEPTH 级；再深的平铺在第 CMT_DEPTH 级里，靠「回复 @某人」看关系
  const CMT_DEPTH = 2
  const tree = new Map() // 评论 id → { depth, kids（它的子回复容器）, box（它自己所在的容器）, node }
  const nodeOf = (c) => {
    const p = c.reply_to && tree.get(c.reply_to.id)
    const depth = p ? Math.min(p.depth + 1, CMT_DEPTH) : 0
    const flat = !!p && p.depth >= CMT_DEPTH // 已到最深一级：和父评论放在同一个容器里
    c._nested = !!p && !flat
    const kids = h('div', { class: 'cmt-kids' })
    const node = h('div', { class: 'cmt-node', 'data-depth': depth }, renderComment(c), kids)
    const box = p ? (flat ? p.box : p.kids) : null
    if (c.id) tree.set(c.id, { depth, kids, box: box || kids, node, root: p ? p.root : node })
    return { node, box }
  }
  // 删掉一条：底下还有回复就留个「已删除」占位，免得回复悬空
  const dropComment = (el, id) => {
    const t = tree.get(id)
    if (t?.kids.children.length) el.replaceWith(h('div', { class: 'comment gone muted', 'data-cid': id }, '这条评论已删除'))
    else (t?.node || el).remove()
  }

  api(`/memes/${meme.id}/comments`).then(({ comments }) => {
    if (!comments.length) return list.replaceChildren(h('div', { class: 'muted empty-line' }, '还没有人说话，来抢沙发'))
    // 按时间建树：父评论总在子回复前面（id 自增）
    const roots = []
    for (const c of [...comments].sort((a, b) => a.id - b.id)) {
      const { node, box } = nodeOf(c)
      if (box) box.append(node)
      else roots.push(node)
    }
    // 卡片里的精简版：只露最近 3 楼（连着各自的回复）
    const hide = compact ? Math.max(0, roots.length - 3) : 0
    list.replaceChildren(...nodes(
      hide > 0 && h('button', { class: 'btn-text sm older', type: 'button', onclick: (e) => {
        e.currentTarget.replaceWith(...roots.slice(0, hide))
      } }, `展开更早的 ${hide} 楼`),
      roots.slice(hide)))
  }).catch((e) => list.replaceChildren(h('div', { class: 'muted' }, e.message)))

  if (S.me) {
    const ta = h('textarea', { class: 'input', rows: 2, maxlength: 1000, placeholder: '说点什么…', 'aria-label': '写评论' })
    const send = h('button', { class: 'btn btn-primary sm', type: 'submit' }, '发送')
    const key = 'cs' + meme.id
    const stk = h('button', { class: 'btn-icon ghost sm', type: 'button', title: '平台表情', 'aria-label': '插入表情', 'data-pop': key,
      onclick: (e) => openPop(e.currentTarget, stickerPicker((k) => { closePop(); insertAtCursor(ta, k) }), { key, cls: 'pop-stk' }) }, icon('smile'))
    // 回复某条评论：输入框上面挂一条「回复 @谁」，× 取消
    let replyTo = null
    const chip = h('div', { class: 'reply-chip', hidden: true })
    setReply = (c) => {
      replyTo = c
      chip.hidden = !c
      if (!c) return chip.replaceChildren()
      chip.replaceChildren(h('span', { class: 'clip' }, '回复 @' + (c.name || c.username) + '：', h('span', { class: 'muted' }, snip(c.body, 40))),
        h('button', { class: 'btn-icon ghost sm', type: 'button', 'aria-label': '取消回复', onclick: () => setReply(null) }, icon('close', 'i tiny')))
      ta.focus()
    }
    // 输入 @ 弹成员列表
    const mention = mentionPicker(ta, null)
    const form = h('form', { class: 'comment-form' }, chip, mention.el, ta, h('div', { class: 'comment-tools' }, stk, h('span', { class: 'grow' }), send))
    const submit = async (e) => {
      e?.preventDefault()
      const body = ta.value.trim()
      if (!body) return
      const rt = replyTo
      setReply(null)
      // 先画出来，失败再撤回并把字放回输入框
      // 回复挂到被回复评论的下面（按层级），新楼接在最后
      const { node: temp, box } = nodeOf({ id: 0, username: S.me.username, name: S.me.name, avatar: S.me.avatar, trust_level: S.me.trust_level, created_at: Date.now() / 1000, body,
        reply_to: rt && { id: rt.id, username: rt.username, name: rt.name, text: snip(rt.body, 60) } })
      temp.classList.add('pending')
      list.querySelector('.empty-line')?.remove()
      ;(box || list).append(temp)
      bump(1)
      ta.value = ''
      closePop()
      try {
        const { comment } = await api(`/memes/${meme.id}/comments`, { method: 'POST', body: { body, reply_to: rt?.id || undefined } })
        temp.replaceWith(nodeOf(comment).node)
      } catch (err) {
        temp.remove()
        bump(-1)
        if (!ta.value) { ta.value = body; if (rt) setReply(rt) }
        toast('没发出去：' + err.message, 'err')
      }
    }
    form.addEventListener('submit', submit)
    sendOnModEnter(ta, submit)
    sec.append(form)
  } else {
    sec.append(h('a', { class: 'btn btn-ghost block', href: loginHref() }, '登录后参与讨论'))
  }
  return sec
}

function puzzleBox(meme) {
  const pz = meme.puzzle
  const r = REWARD[pz.reward_kind] || REWARD.secret
  const box = h('section', { class: 'puzzle' + (pz.solved ? ' solved' : '') })
  const rerender = (next) => {
    meme.puzzle = next
    box.replaceWith(puzzleBox(meme))
  }

  box.append(
    h('div', { class: 'puzzle-head' },
      h('span', { class: 'reward-tag' }, r.emoji, ' ', r.label),
      statusPill(pz.status)),
    pz.hint && h('blockquote', { class: 'puzzle-hint' }, pz.hint),
    h('div', { class: 'puzzle-meta' },
      h('span', null, `已解 ${pz.winners_count}${pz.max_winners ? ' / ' + pz.max_winners : ''}`),
      pz.codes_left != null && h('span', null, `剩余 ${pz.codes_left} 个码`),
      pz.ends_at && h('span', null, `截止 ${new Date(pz.ends_at * 1000).toLocaleString('zh-CN', { hour12: false })}`)))

  if (pz.layer_count > 1) box.append(layerSteps(pz))
  if (pz.all_layers) {
    box.append(h('details', { class: 'pz-layers' },
      h('summary', null, `题面预览 · ${pz.all_layers.length} 层`),
      pz.all_layers.map((l) => layerBlock(l, { hint: pz.hint, title: true }))))
  } else if (pz.passed?.length) {
    box.append(h('details', { class: 'pz-layers', open: pz.solved ? null : true },
      h('summary', null, pz.solved ? `回顾 ${pz.passed.length} 层` : `已过 ${pz.passed.length} 层`),
      pz.passed.map((l) => layerBlock(l, { hint: pz.hint, title: true }))))
  }

  if (pz.reward) {
    box.append(rewardView(pz, pz.solved ? '🎉 你解开了' : '奖励内容（仅你可见）'))
  } else if (pz.is_owner) {
    box.append(h('p', { class: 'puzzle-note' }, pz.reward_type === 'codes' ? '码池奖励：每位解开者领取一个兑换码。' : ''))
  } else if (pz.status !== 'open') {
    box.append(h('p', { class: 'puzzle-note' }, pz.status === 'full' ? '名额已经被抢完了。' : '这个谜题已经结束。'))
  } else if (!S.me) {
    box.append(h('a', { class: 'btn btn-accent block', href: loginHref() }, '登录后参与解密'))
  } else {
    const note = h('div', { class: 'puzzle-left', 'aria-live': 'polite' }, '')
    const input = h('input', { class: 'input', placeholder: '输入你的答案', maxlength: 100, autocomplete: 'off' })
    const btn = h('button', { class: 'btn btn-accent', type: 'submit' }, icon('unlock'), pz.layer_count > 1 ? '提交这一层' : '解密')
    const form = h('form', { class: 'puzzle-form' }, input, btn)
    let tries = pz.attempts_used || 0
    const solve = async (answer) => {
      btn.disabled = true
      try {
        const res = await api(`/puzzles/${pz.id}/solve`, { method: 'POST', body: { answer } })
        if (res.correct) {
          toast(res.next ? `第 ${res.puzzle.layer} 层过了${res.note ? '：' + res.note : '，继续'}` : '答对了！', 'ok')
          rerender(res.puzzle)
        } else {
          box.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], 240)
          tries++
          note.textContent = '不对，再想想'
          input.select()
        }
      } catch (err) {
        toast(err.message, 'err')
      } finally {
        btn.disabled = false
      }
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!input.value.trim()) return input.focus()
      solve(input.value)
    })
    const quiz = pz.current?.kind === 'quiz'
    const cur = pz.current ? layerBlock(pz.current, { hint: pz.hint, onPick: solve }) : h('div')
    box.append(cur, ...nodes(!quiz && form, note))
  }

  if (pz.winners.length) {
    box.append(h('div', { class: 'winners' },
      h('span', { class: 'muted' }, '解开的佬友'),
      h('div', { class: 'avatars' }, pz.winners.map((w) =>
        h('a', { href: `https://linux.do/u/${encodeURIComponent(w.username)}`, target: '_blank', rel: 'noopener', title: w.username },
          avatar(w.avatar, w.username, 24))))))
  }
  if (pz.is_owner) {
    box.append(h('button', { class: 'btn-text danger small', onclick: async () => {
      if (!confirm('撤下这个谜题？已发出的奖励不受影响。')) return
      try {
        await api(`/puzzles/${pz.id}`, { method: 'DELETE' })
        meme.puzzle = null
        box.replaceWith(addPuzzleEntry(meme))
      } catch (e) { toast(e.message, 'err') }
    } }, '撤下谜题'))
  }
  return box
}

// ---------- 连环解密：每一层怎么显示 ----------
const LAYER_KIND = { pass: '口令', cipher: '密文', quiz: '选择题', image: '看图', stego: '图里藏字' }
function layerSteps(pz) {
  const n = pz.layer_count
  const at = Math.min(pz.layer, n)
  return h('div', { class: 'pz-steps', 'aria-label': pz.solved ? `${n} 层全过` : `第 ${at + 1} 层，共 ${n} 层` },
    h('ol', null, Array.from({ length: n }, (_, i) => h('li', { class: i < at ? 'done' : i === at ? 'cur' : '' }, i < at ? icon('check', 'i tiny') : i + 1))),
    h('span', { class: 'muted' }, pz.solved ? `${n} 层全过` : `第 ${at + 1} / ${n} 层`))
}
const stillView = (u) => ({ id: -1, image: u, images: [{ u }], image_count: 1, title: '', seen_at: 1 })
function toToolbox(algo, text) {
  sessionStorage.setItem('tools-prefill', JSON.stringify({ algo, text }))
  navigate('/tools')
}
// 一层的题面。title：前面带「第 N 层 · 类型」；onPick：选择题点选项直接提交
function layerBlock(l, { hint = '', title = false, onPick = null } = {}) {
  const d = l.data || {}
  const kids = []
  if (title) kids.push(h('div', { class: 'layer-title' }, `第 ${l.idx + 1} 层 · ${LAYER_KIND[l.kind] || l.kind}`))
  if (l.prompt && l.prompt !== hint) kids.push(h('p', { class: 'layer-prompt' }, l.prompt))
  if (l.kind === 'cipher' && d.text) {
    kids.push(h('div', { class: 'cipher-box' },
      h('pre', { class: 'mono' }, d.text),
      h('div', { class: 'cipher-acts' },
        d.algo && h('span', { class: 'chip-mini' }, '算法：' + (CIPHER_NAME[d.algo] || d.algo)),
        d.key_hint && h('span', { class: 'chip-mini' }, '钥匙：' + d.key_hint),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn-text sm', type: 'button', onclick: () => copyText(d.text) }, icon('copy', 'i tiny'), '复制'),
        h('button', { class: 'btn-text sm', type: 'button', onclick: () => toToolbox(d.algo || '', d.text) }, '拿去工具箱解'))))
  }
  if ((l.kind === 'image' || l.kind === 'stego') && d.img) {
    kids.push(h('button', { class: 'layer-img', type: 'button', 'aria-label': '看大图', onclick: () => openViewer(stillView(d.img)) },
      h('img', { src: d.img, alt: '', loading: 'lazy' })))
    if (l.kind === 'stego') {
      kids.push(h('div', { class: 'cipher-acts' },
        h('span', { class: 'muted' }, d.pw ? '像素里藏了一句话，还加了密码' : '像素里藏了一句话'),
        h('span', { class: 'grow' }),
        h('a', { class: 'btn-text sm', href: d.img, download: 'puzzle.png' }, '下载原图'),
        h('button', { class: 'btn-text sm', type: 'button', onclick: () => toToolbox('stego', '') }, '去工具箱读')))
    }
  }
  if (l.kind === 'quiz' && d.options?.length) {
    kids.push(h('div', { class: 'quiz-opts' }, d.options.map((o, i) =>
      h('button', { class: 'quiz-opt', type: 'button', disabled: onPick ? null : true, onclick: () => onPick?.(o) },
        h('b', null, 'ABCDEF'[i]), h('span', null, o)))))
  }
  if (l.note) kids.push(h('div', { class: 'layer-note' }, '过关说明：', l.note))
  return h('div', { class: 'layer ' + l.kind }, kids)
}
// 工具箱里的算法名，懒得等 cipher.js，就在这儿抄一份常用的
const CIPHER_NAME = { shou: '兽音译者', fo: '与佛论禅', emoji: 'emoji 密码', reverse: '倒着念', t9: '九宫格按键', base64: 'Base64', base32: 'Base32',
  hex: '十六进制', binary: '二进制', url: 'URL 编码', unicode: 'Unicode 转义', morse: '摩斯电码', caesar: '凯撒密码', rot13: 'ROT13', atbash: '埃特巴什',
  rail: '栅栏密码', vigenere: '维吉尼亚', aes: 'AES', zwsp: '隐形字', stego: '图片藏字',
  base58: 'Base58', base62: 'Base62', base85: 'Ascii85', decimal: '十进制码点', html: 'HTML 实体', rot47: 'ROT47', affine: '仿射密码',
  bacon: '培根密码', polybius: '棋盘密码', qwerty: '键盘密码', autokey: '自动密钥', rc4: 'RC4', xor: 'XOR 异或' }
const loadCipher = () => import('/cipher.js?v=8acbc94b')

function rewardView(pz, label) {
  const isLink = pz.reward_type === 'link'
  return h('div', { class: 'reward' },
    h('div', { class: 'reward-label' }, label),
    h('div', { class: 'reward-value' }, pz.reward),
    h('div', { class: 'reward-actions' },
      h('button', { class: 'btn btn-ghost small', onclick: () => copyText(pz.reward) }, icon('copy'), '复制'),
      isLink && h('a', { class: 'btn btn-accent small', href: pz.reward, target: '_blank', rel: 'noopener' },
        pz.reward_kind === 'cdk' ? '去领取' : '打开', icon('ext'))))
}

function addPuzzleEntry(meme) {
  const wrap = h('div', { class: 'add-puzzle' })
  const btn = h('button', { class: 'btn btn-ghost block' }, icon('lock'), '给这张图挂一个解密')
  btn.addEventListener('click', () => {
    const pf = puzzleForm()
    const submit = h('button', { class: 'btn btn-accent' }, '发布谜题')
    submit.addEventListener('click', async () => {
      submit.disabled = true
      const body = await pf.value()
      if (!body) { submit.disabled = false; return }
      try {
        await api(`/memes/${meme.id}/puzzle`, { method: 'POST', body })
        toast('谜题已发布', 'ok')
        if (S.modal) S.modal.guard = null
        openMeme(meme.id)
      } catch (e) { toast(e.message, 'err'); submit.disabled = false }
    })
    const m = S.modal
    const guard = () => wrap.isConnected && pf.dirty() ? { text: '谜题还没发布，关掉的话填的内容就没了。' } : null
    if (m) m.guard = guard
    const cancel = async () => {
      if (pf.dirty() && (await askChoice('放弃这个谜题？', '填的内容会清掉。', [['drop', '放弃', 'btn-ghost danger'], ['stay', '继续编辑', 'btn-primary']])) !== 'drop') return
      if (m?.guard === guard) m.guard = null
      wrap.replaceWith(addPuzzleEntry(meme))
    }
    wrap.replaceChildren(h('div', { class: 'puzzle-editor' }, pf.el,
      h('div', { class: 'row-end' }, h('button', { class: 'btn btn-ghost', onclick: cancel }, '取消'), submit)))
  })
  wrap.append(btn)
  return wrap
}

// ---------- 谜题表单 ----------

// 控件是单个输入框就用 <label> 包起来；是一组按钮/工具栏+输入框时，<label> 会把名字安到第一个按钮上，
// 改成 group + aria-labelledby，里面的输入框单独挂名字
let fieldSeq = 0
function field(label, control, hint) {
  const simple = control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement
  if (simple) return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint && h('span', { class: 'field-hint' }, hint))
  const id = 'fl' + ++fieldSeq
  const inner = control?.querySelector?.('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')
  if (inner && !inner.hasAttribute('aria-label') && !inner.hasAttribute('aria-labelledby')) inner.setAttribute('aria-labelledby', id)
  if (control?.getAttribute?.('role') === 'radiogroup' || control?.getAttribute?.('role') === 'group') control.setAttribute('aria-labelledby', id)
  return h('div', { class: 'field', role: 'group', 'aria-labelledby': id }, h('span', { class: 'field-label', id }, label), control, hint && h('span', { class: 'field-hint' }, hint))
}
// 校验：在控件所在的格子下面挂一句红字；problems = [[控件, 说明]]，返回是否全部通过
function showFieldErrs(scope, problems) {
  scope.querySelectorAll('.field-err').forEach((x) => x.remove())
  scope.querySelectorAll('[aria-invalid]').forEach((x) => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby') })
  for (const [ctl, msg] of problems) {
    const id = 'fe' + ++fieldSeq
    const err = h('span', { class: 'field-err', id, role: 'alert' }, msg)
    ctl.setAttribute('aria-invalid', 'true')
    ctl.setAttribute('aria-describedby', id)
    const box = ctl.closest('.field')
    if (box) box.append(err)
    else ctl.after(err)
    // 改了就把这条红字去掉
    const off = () => { err.remove(); ctl.removeAttribute('aria-invalid'); ctl.removeAttribute('aria-describedby') }
    ctl.addEventListener('input', off, { once: true })
    ctl.addEventListener('change', off, { once: true })
    ctl.addEventListener('click', () => ctl.tagName === 'BUTTON' && off(), { once: true })
  }
  if (problems.length) {
    const first = problems[0][0]
    first.scrollIntoView({ block: 'center', behavior: 'smooth' })
    first.focus({ preventScroll: true })
  }
  return !problems.length
}

// 一层的编辑器：类型不同，要填的东西不同
const LAYER_PH = {
  pass: ['题面：比如「这张图出自哪位佬的哪句话？」', '答案'],
  cipher: ['题面：比如「这段话是什么意思？」', '答案（也就是密文解出来的原文）'],
  quiz: ['题目', ''],
  image: ['题面：看图回答什么', '答案'],
  stego: ['题面：比如「图里藏了口令」', '答案'],
}
function layerEditor(onRemove) {
  const st = { kind: 'pass', file: null }
  const kindRow = h('div', { class: 'segs small wrap', role: 'radiogroup' })
  const prompt = h('input', { class: 'input', maxlength: 300 })
  const answer = h('input', { class: 'input', maxlength: 300, placeholder: '' })
  const note = h('input', { class: 'input', maxlength: 200, placeholder: '选填：过关后给解题人看的一句话，比如下一层的线索' })
  const slot = h('div', { class: 'layer-extra' })
  // 密文
  const algo = h('select', { class: 'input' }, h('option', { value: 'base64' }, 'Base64'))
  const key = h('input', { class: 'input', maxlength: 100, placeholder: '这个算法不用钥匙', disabled: true })
  const showAlgo = h('input', { type: 'checkbox', checked: true })
  const keyHint = h('input', { class: 'input', maxlength: 100, placeholder: '选填：钥匙的提示，比如「站长的生日」' })
  const ctext = h('textarea', { class: 'input mono', rows: 3, maxlength: 4000, placeholder: '填好答案就自动生成；也可以自己贴一段' })
  // 密文默认跟着答案/算法/钥匙自动生成；手动改过就不再覆盖，点「重新生成」恢复
  let manual = false
  ctext.addEventListener('input', () => { manual = !!ctext.value.trim() })
  let ciphers = []
  loadCipher().then((C) => {
    ciphers = C.CIPHERS.filter((c) => c.enc && c.dec)
    algo.replaceChildren(...C.CIPHER_CATS.map((cat) => h('optgroup', { label: cat.name },
      ciphers.filter((c) => c.cat === cat.id).map((c) => h('option', { value: c.id }, c.name)))))
    algo.value = 'base64'
    syncKey()
  })
  let genT = 0
  const autoGen = () => {
    if (manual || st.kind !== 'cipher') return
    clearTimeout(genT)
    genT = setTimeout(async () => {
      const c = curCipher()
      if (!c || !firstAnswer() || (c.key?.required && !key.value)) { ctext.value = ''; return }
      try { ctext.value = await c.enc(firstAnswer(), key.value) } catch { ctext.value = '' }
    }, 250)
  }
  answer.addEventListener('input', autoGen)
  key.addEventListener('input', autoGen)
  algo.addEventListener('change', autoGen)
  const curCipher = () => ciphers.find((c) => c.id === algo.value)
  const syncKey = () => {
    const c = curCipher()
    key.disabled = !c?.key
    key.placeholder = c?.key ? `${c.key.label}${c.key.required ? '' : '（选填）'}：${c.key.placeholder}` : '这个算法不用钥匙'
    if (!c?.key) key.value = ''
  }
  algo.addEventListener('change', syncKey)
  const firstAnswer = () => answer.value.split('|')[0].trim()
  const gen = async () => {
    const c = curCipher()
    if (!c) return toast('工具箱还没加载好', 'err')
    if (!firstAnswer()) { toast('先填答案', 'err'); answer.focus(); return false }
    if (c.key?.required && !key.value) { toast(`要填${c.key.label}`, 'err'); key.focus(); return false }
    try { ctext.value = await c.enc(firstAnswer(), key.value); manual = false; return true } catch (e) { toast(e.message, 'err'); return false }
  }
  // 选择题
  const QUIZ_MAX = 6
  const quizList = () => opts.value.split('\n').map((x) => x.trim()).filter(Boolean)
  const opts = h('textarea', { class: 'input', rows: 4, placeholder: `一行一个选项，2 到 ${QUIZ_MAX} 个` })
  const optsCount = h('span', { class: 'opt-count', 'aria-live': 'polite' })
  const right = h('select', { class: 'input' })
  const syncOpts = () => {
    const list = quizList()
    const over = list.length - QUIZ_MAX
    optsCount.textContent = over > 0 ? `${list.length} / ${QUIZ_MAX}，多了 ${over} 个，最多 ${QUIZ_MAX} 个` : `${list.length} / ${QUIZ_MAX}`
    optsCount.classList.toggle('over', over > 0)
    const was = right.value
    right.replaceChildren(h('option', { value: '' }, '选出正确的那个'), ...list.map((o, i) => h('option', { value: o }, `${String.fromCharCode(65 + i)}. ${o}`)))
    if (list.includes(was)) right.value = was
  }
  opts.addEventListener('input', syncOpts)
  syncOpts()
  // 看图 / 图里藏字
  const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true })
  const pv = h('button', { class: 'layer-pick', type: 'button', onclick: () => fileIn.click() }, icon('image'), h('span', null, '选一张图'))
  fileIn.addEventListener('change', () => {
    const f = fileIn.files[0]
    if (!f) return
    const err = checkFile(f)
    if (err) return toast(err, 'err')
    st.file = f
    pv.replaceChildren(h('img', { src: URL.createObjectURL(f), alt: '' }), h('span', null, '换一张'))
  })
  const secret = h('input', { class: 'input', maxlength: 500, placeholder: '藏进图里的话，不填就藏答案本身' })
  const pw = h('input', { class: 'input', maxlength: 100, placeholder: '选填：读图要的密码（可以放在上一层的过关说明里）' })

  const draw = () => {
    const [pp, ap] = LAYER_PH[st.kind]
    prompt.placeholder = pp
    answer.placeholder = ap ? ap + '，多个用 | 隔开' : ''
    kindRow.replaceChildren(...Object.entries(LAYER_KIND).map(([k, l]) =>
      h('button', { type: 'button', class: 'seg' + (st.kind === k ? ' on' : ''), role: 'radio', 'aria-checked': st.kind === k ? 'true' : 'false',
        onclick: () => { st.kind = k; draw(); autoGen() } }, l)))
    slot.replaceChildren(...nodes(
      st.kind === 'cipher' && [
        h('div', { class: 'grid-2' }, field('算法', algo), field('钥匙', key)),
        field('密文', ctext),
        h('div', { class: 'row-gap' }, h('button', { class: 'btn-text sm', type: 'button', onclick: gen }, '重新生成')),
        h('div', { class: 'grid-2' },
          h('label', { class: 'switch' }, showAlgo, h('span', { class: 'switch-ui' }), h('span', null, '告诉解题人用的哪种算法')),
          field('钥匙提示', keyHint))],
      st.kind === 'quiz' && [field('选项', opts, optsCount), field('正确答案', right)],
      (st.kind === 'image' || st.kind === 'stego') && [field(st.kind === 'stego' ? '原图（藏完会转成 PNG）' : '图片', pv), fileIn],
      st.kind === 'stego' && h('div', { class: 'grid-2' }, field('藏的话', secret), field('密码', pw))))
    answerField.hidden = st.kind === 'quiz'
  }
  const answerField = field('答案', answer)
  const head = h('div', { class: 'layer-ed-head' }, h('strong', { class: 'layer-ed-n' }), h('span', { class: 'grow' }),
    h('button', { class: 'btn-text sm danger', type: 'button', onclick: () => onRemove(ed) }, '删掉这层'))
  const el = h('div', { class: 'layer-ed' }, head, field('类型', kindRow), field('题面', prompt), slot, answerField, field('过关说明', note))
  draw()
  const ed = {
    el,
    setIndex(i, n) {
      head.querySelector('.layer-ed-n').textContent = n > 1 ? `第 ${i + 1} 层` : '题目'
      head.querySelector('button').hidden = n <= 1
    },
    // 发布前的检查：每个问题标在对应的格子旁边，不传图、不改东西
    check() {
      const bad = []
      if (st.kind === 'quiz') {
        if (quizList().length < 2) bad.push([opts, '至少两个选项，一行一个'])
        else if (quizList().length > QUIZ_MAX) bad.push([opts, `最多 ${QUIZ_MAX} 个选项，现在有 ${quizList().length} 个`])
        else if (!right.value) bad.push([right, '选一下正确答案'])
      } else if (!answer.value.trim()) bad.push([answer, '答案不能空'])
      if (st.kind === 'cipher') {
        const c = curCipher()
        if (c?.key?.required && !key.value) bad.push([key, `这个算法要填${c.key.label}`])
        else if (!ctext.value.trim() && answer.value.trim()) bad.push([ctext, '密文没生成出来，点「重新生成」看看原因'])
      }
      if ((st.kind === 'image' || st.kind === 'stego') && !st.file) bad.push([pv, '还没选图'])
      return bad
    },
    dirty: () => !!(prompt.value.trim() || answer.value.trim() || note.value.trim() || opts.value.trim() || st.file),
    // 玩家视角预览用：和正式题面同样的数据，图用本地地址
    async preview(i) {
      const l = { idx: i, kind: st.kind, prompt: prompt.value.trim(), note: note.value.trim(), data: {}, answers: answer.value.split('|').map((x) => x.trim()).filter(Boolean) }
      if (st.kind === 'quiz') { l.data.options = quizList(); l.answers = right.value ? [right.value] : [] }
      if (st.kind === 'cipher') {
        l.data.text = ctext.value.trim()
        if (showAlgo.checked) l.data.algo = algo.value
        if (keyHint.value.trim()) l.data.key_hint = keyHint.value.trim()
      }
      if (st.file) {
        let f = st.file
        if (st.kind === 'stego') f = await (await loadCipher()).stegoEncode(f, secret.value.trim() || firstAnswer(), pw.value)
        l.data.img = URL.createObjectURL(f)
        if (st.kind === 'stego' && pw.value) l.data.pw = true
      }
      return l
    },
    // 校验 + 准备好这一层的数据；图要先传上去
    async value(i) {
      const where = `第 ${i + 1} 层`
      const out = { kind: st.kind, prompt: prompt.value.trim(), answer: answer.value, note: note.value.trim(), data: {} }
      if (st.kind === 'quiz') {
        const list = quizList()
        if (list.length < 2) throw Error(`${where}：选择题至少两个选项`)
        if (list.length > QUIZ_MAX) throw Error(`${where}：选择题最多 ${QUIZ_MAX} 个选项，现在有 ${list.length} 个`)
        if (!right.value) throw Error(`${where}：选一下正确答案`)
        out.answer = right.value
        out.data.options = list
      } else if (!answer.value.trim()) { answer.focus(); throw Error(`${where}：请填写答案`) }
      if (st.kind === 'cipher') {
        if (!ctext.value.trim() && !(await gen())) throw Error(`${where}：密文没生成出来`)
        out.data.text = ctext.value.trim()
        if (showAlgo.checked) out.data.algo = algo.value
        if (keyHint.value.trim()) out.data.key_hint = keyHint.value.trim()
      }
      if (st.kind === 'image' || st.kind === 'stego') {
        if (!st.file) throw Error(`${where}：还没选图`)
        let f = st.file
        if (st.kind === 'stego') {
          const C = await loadCipher()
          const b = await C.stegoEncode(f, secret.value.trim() || firstAnswer(), pw.value)
          if (b.size > MAX_FILE) throw Error(`${where}：藏完字的 PNG 超过 20MB，换张小点的图`)
          f = new File([b], 'stego.png', { type: 'image/png' })
          if (pw.value) out.data.pw = true
        }
        out.data.img = (await uploadFile(f, 'meme')).url
      }
      return out
    },
  }
  return ed
}

function puzzleForm() {
  const state = { kind: 'secret', type: 'text' }
  const hint = h('input', { class: 'input', maxlength: 300, placeholder: '选填：总提示，展示在图下方' })
  const rewardText = h('textarea', { class: 'input', rows: 2, maxlength: 2000 })
  const codes = h('textarea', { class: 'input mono', rows: 4, placeholder: '一行一个兑换码' })
  const winners = h('input', { class: 'input', type: 'number', min: 0, max: 10000, value: 0 })
  const ends = h('input', { class: 'input', type: 'datetime-local' })

  const typeRow = h('div', { class: 'segs small' })
  const rewardSlot = h('div')
  const winnersField = field('名额', winners, '0 表示不限')

  // 连环：最多 5 层，一层一层解
  const layers = []
  let onLayersChange = () => {}
  const layerBox = h('div', { class: 'layer-eds' })
  const addLayer = h('button', { class: 'btn btn-ghost block sm', type: 'button', onclick: () => { layers.push(layerEditor(removeLayer)); drawLayers() } },
    icon('plus'), '再加一层（连环解密）')
  const removeLayer = (ed) => { layers.splice(layers.indexOf(ed), 1); drawLayers() }
  const drawLayers = () => {
    layers.forEach((ed, i) => ed.setIndex(i, layers.length))
    layerBox.replaceChildren(...layers.map((ed) => ed.el))
    addLayer.hidden = layers.length >= 5
    onLayersChange()
  }
  layers.push(layerEditor(removeLayer))
  drawLayers()

  const TYPES = {
    secret: [['text', '文字']],
    credit: [['text', '红包口令'], ['link', '红包链接']],
    cdk: [['link', 'CDK 项目链接'], ['codes', '码池']],
  }
  const PLACEHOLDER = {
    text: { secret: '解开后展示的隐藏内容', credit: '在 LINUX DO Credit 创建的红包口令' },
    link: { credit: 'https://… Credit 红包链接', cdk: 'https://cdk.linux.do/… 分发项目链接' },
  }

  const renderType = () => {
    const opts = TYPES[state.kind]
    if (!opts.some(([v]) => v === state.type)) state.type = opts[0][0]
    typeRow.replaceChildren(...opts.map(([v, l]) =>
      h('button', { type: 'button', class: 'seg' + (state.type === v ? ' on' : ''), 'aria-pressed': String(state.type === v), onclick: () => { state.type = v; renderType() } }, l)))
    rewardText.placeholder = PLACEHOLDER[state.type]?.[state.kind] || ''
    rewardSlot.replaceChildren(state.type === 'codes'
      ? field('兑换码', codes, '每位解开者自动领取一个，名额 = 码的数量')
      : field(state.type === 'link' ? '链接' : '奖励内容', rewardText))
    winnersField.style.display = state.type === 'codes' ? 'none' : ''
  }
  const kindRow = h('div', { class: 'segs small' })
  const renderKind = () => {
    kindRow.replaceChildren(...Object.entries(REWARD).map(([k, r]) =>
      h('button', { type: 'button', class: 'seg' + (state.kind === k ? ' on' : ''), 'aria-pressed': String(state.kind === k), onclick: () => { state.kind = k; renderKind(); renderType() } },
        r.emoji, ' ', r.label)))
  }
  renderKind()
  renderType()

  const el = h('div', { class: 'puzzle-fields' },
    layerBox, addLayer,
    field('提示', hint),
    field('奖励', kindRow),
    field('发放方式', typeRow),
    rewardSlot,
    h('div', { class: 'grid-2' }, winnersField, field('截止时间', ends, '选填')),
    )

  // 全部检查一遍，问题标在各自格子旁边
  const check = () => {
    const bad = layers.flatMap((ed) => ed.check())
    if (state.type === 'codes' ? !codes.value.trim() : !rewardText.value.trim())
      bad.push(state.type === 'codes' ? [codes, '填至少一个兑换码'] : [rewardText, state.type === 'link' ? '填一下链接' : '填一下解开后给的奖励'])
    if (state.type === 'link' && rewardText.value.trim() && !/^https?:\/\/\S+$/i.test(rewardText.value.trim())) bad.push([rewardText, '链接要以 http:// 或 https:// 开头'])
    if (Number(winners.value) < 0) bad.push([winners, '不能是负数'])
    if (ends.value && new Date(ends.value).getTime() <= Date.now()) bad.push([ends, '截止时间已经过了'])
    const ok = showFieldErrs(el, bad)
    if (!ok) toast(`还有 ${bad.length} 处要改，已经标在旁边了`, 'err')
    return ok
  }

  // 玩家视角预览：本地对答案（和后端 normAnswer 同一套规则），不占机会、不发奖励、不传图
  const normAns = (s) => String(s).normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  const pvBox = h('div', { class: 'pz-preview', hidden: true })
  let pvAt = 0
  let pvSeq = 0
  // 按当前草稿重建预览；keep：内容改了自动刷新时，尽量停在原来那一层
  const buildPreview = async (keep) => {
    const seq = ++pvSeq
    const ls = []
    try { for (const [i, ed] of layers.entries()) ls.push(await ed.preview(i)) } catch (e) { if (!keep) toast(e.message, 'err'); return false }
    if (seq !== pvSeq) return false
    let at = keep ? Math.min(pvAt, ls.length) : 0
    const draw = (msg) => {
      const done = at >= ls.length
      const l = ls[at]
      const input = h('input', { class: 'input', 'aria-label': '你的答案', placeholder: '输入答案试试' })
      const submit = (v) => {
        const ok = l.answers.some((a) => normAns(a) === normAns(v))
        if (!ok) return draw({ err: l.answers.length ? '不对（预览不扣机会）' : '这一层还没设答案' })
        at++
        draw({ ok: l.note ? '过关！过关说明：' + l.note : '过关！' })
      }
      pvBox.replaceChildren(...nodes(
        h('div', { class: 'pz-preview-head' }, h('strong', null, '玩家视角预览')),
        hint.value.trim() && h('p', { class: 'muted' }, '提示：' + hint.value.trim()),
        ls.length > 1 && h('div', { class: 'muted sm' }, done ? `${ls.length} 层全过` : `第 ${at + 1} / ${ls.length} 层`),
        msg?.ok && h('div', { class: 'pz-pv-ok', role: 'status' }, msg.ok),
        msg?.err && h('div', { class: 'pz-pv-err', role: 'alert' }, msg.err),
        msg?.info && h('div', { class: 'muted sm', role: 'status' }, msg.info),
        done
          ? h('div', { class: 'reward' }, h('div', { class: 'reward-label' }, REWARD[state.kind].emoji + ' 解开后会看到'),
            h('div', { class: 'reward-value' }, state.type === 'codes' ? '（从码池里自动发一个兑换码）' : rewardText.value.trim() || '（还没填奖励）'))
          : [layerBlock({ ...l, note: '' }, { title: ls.length > 1, onPick: l.kind === 'quiz' ? submit : null }),
            l.kind !== 'quiz' && h('form', { class: 'pz-pv-form', onsubmit: (e) => { e.preventDefault(); submit(input.value) } },
              input, h('button', { class: 'btn btn-primary sm' }, '提交'))],
        h('div', { class: 'row-end' }, h('button', { class: 'btn-text sm', type: 'button', onclick: () => { at = 0; draw() } }, '从头再来'))))
      pvAt = at
    }
    draw(keep ? { info: '题目改了，预览已按最新内容更新' } : null)
    return true
  }
  const preview = async () => {
    if (!pvBox.hidden) { pvSeq++; pvBox.hidden = true; pvBtn.setAttribute('aria-expanded', 'false'); pvBtn.lastChild.textContent = '玩家视角预览'; return }
    if (!(await buildPreview(false))) return
    pvBox.hidden = false
    pvBtn.setAttribute('aria-expanded', 'true')
    pvBtn.lastChild.textContent = '收起预览'
  }
  let pvTimer = 0
  const refreshPreview = onLayersChange = () => {
    if (pvBox.hidden) return
    clearTimeout(pvTimer)
    pvTimer = setTimeout(() => buildPreview(true), 400)
  }
  const pvBtn = h('button', { class: 'btn btn-ghost sm', type: 'button', 'aria-expanded': 'false', onclick: preview }, icon('eye'), h('span', null, '玩家视角预览'))
  el.append(h('div', { class: 'row-end' }, h('button', { class: 'btn-text sm', type: 'button', onclick: check }, '检查一遍'), pvBtn), pvBox)
  // 预览开着时，题目有任何改动（输入、换类型、换图、加减层）都自动重建；预览自己里面的操作不算
  const onEdit = (e) => { if (!pvBox.contains(e.target) && !pvBtn.contains(e.target)) refreshPreview() }
  for (const ev of ['input', 'change']) el.addEventListener(ev, onEdit)
  layerBox.addEventListener('click', (e) => { if (e.target.closest('button')) onEdit(e) })

  return {
    el,
    dirty: () => layers.length > 1 || layers.some((ed) => ed.dirty()) || !!(hint.value.trim() || rewardText.value.trim() || codes.value.trim()),
    async value() {
      if (!check()) return null
      let ls
      try {
        ls = []
        for (const [i, ed] of layers.entries()) ls.push(await ed.value(i))
      } catch (e) { toast(e.message, 'err'); return null }
      return {
        layers: ls, hint: hint.value, reward_kind: state.kind, reward_type: state.type,
        reward_text: rewardText.value, codes: codes.value, max_winners: Number(winners.value) || 0,
        ends_at: ends.value ? Math.floor(new Date(ends.value).getTime() / 1000) : null,
      }
    },
  }
}

// ---------- 分享图片 ----------

// 图上右键：放大看 / 全屏看 / 原图 / 复制链接（按住 Shift 右键还是浏览器自己的菜单）
document.addEventListener('contextmenu', (e) => {
  if (e.shiftKey) return
  const cell = e.target.closest?.('.media .cell, .stage figure')
  const box = cell?.closest('[data-blur]')
  const m = box && ITEMS.get(Number(box.dataset.blur))
  if (!m) return
  e.preventDefault()
  const i = Math.max(0, [...box.querySelectorAll('.cell, figure')].indexOf(cell))
  imageMenu(m, i, e)
})
function imageMenu(m, i, e) {
  const doc = e.target.ownerDocument
  const anchor = { ownerDocument: doc, getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }) }
  const imgs = m.images?.length ? m.images : [{ u: m.image }]
  const im = imgs[i] || imgs[0]
  const url = im.v || im.o || im.u
  const item = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' },
    item('放大看图', 'search', () => openViewer(m, i)),
    item('全屏看图', 'image', () => { openViewer(m, i); S.viewer?.root.requestFullscreen?.().catch(() => {}) }),
    item('新标签页打开原图', 'ext', () => open(url, '_blank', 'noopener')),
    item('复制图片链接', 'copy', () => copyText(new URL(url, location.href).href)),
    !S.modal && item('查看详情', 'chat', () => navigate(memeHref(m)))))
}

function imageAiControl(off) {
  const input = h('input', { type: 'checkbox', class: 'ai-image-post', checked: off === undefined ? false : !off, disabled: true })
  let touched = false, baseline = input.checked
  input.addEventListener('change', () => { touched = true })
  const status = h('span', { class: 'muted sm', role: 'status' }, '读取中…')
  const retry = h('button', { class: 'btn-text small', type: 'button', hidden: true, onclick: load }, '重试')
  const el = h('div', { class: 'ai-image-control' }, h('label', { class: 'switch' }, input, h('span', { class: 'switch-ui' }), h('span', null, '让 AI 接个梗')), status, retry)
  async function load() {
    input.disabled = true; retry.hidden = true; status.textContent = '读取中…'
    try {
      const [config, prefs] = await Promise.all([api('/ai/config'), api('/me/ai-prefs')])
      if (off === undefined && !touched) { input.checked = !!config.img && !!prefs.img_reply; baseline = input.checked }
      input.disabled = !config.img || !prefs.img_reply
      status.textContent = !config.img ? '暂未开启' : !prefs.img_reply ? '个人设置已关闭' : '仅公开非慎点图'
    } catch { if (off === undefined) input.checked = false; status.textContent = '暂时无法读取'; retry.hidden = false }
  }
  load()
  return { el, input, changed: () => touched && input.checked !== baseline, off: () => input.disabled || !input.checked }
}

// 编辑已发的帖：图（留 / 删 / 换顺序 / 加新图 / 重新打码）、配文、描述、标签、慎点
async function openEdit(m0) {
  if (!requireLogin('编辑')) return
  let m
  try { m = (await api(`/memes/${m0.id}`)).meme } catch (e) { return toast(e.message, 'err') }
  if (!m.can_manage) return toast('只能编辑自己发的图', 'err')
  const shell = openModalShell('compose-panel' + (m.kind === 'text' ? ' text-compose' : ''))
  S.modal.clean?.forEach((fn) => fn())
  S.modal.clean = []
  S.modal.kind = 'edit'
  S.modal.memeId = null
  const panel = h('div', { class: 'compose-wrap' })
  shell.replaceChildren(panel)
  const tray = mediaTray()
  m.images.forEach((g) => tray.keep(g))
  const empty = h('button', { class: 'drop-empty', type: 'button', hidden: true, onclick: () => tray.pick() }, icon('image', 'drop-icon'),
    h('strong', null, '拖入、粘贴或点击选择'), h('span', null, m.kind === 'text' ? '配图（选填）' : '至少留一张图'))
  empty.hidden = m.images.length > 0
  const drop = h('div', { class: 'drop' + (m.images.length ? ' has' : '') }, empty, tray.el, tray.input)
  tray.onchange = () => { drop.classList.toggle('has', tray.items.length > 0); empty.hidden = tray.items.length > 0 }
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over') })
  drop.addEventListener('dragleave', () => drop.classList.remove('over'))
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); tray.add(e.dataTransfer.files) })
  panel.addEventListener('paste', (e) => {
    const fs = [...(e.clipboardData?.files || [])]
    if (fs.length) { e.preventDefault(); tray.add(fs) }
  })
  const isText = m.kind === 'text'
  const title = h('input', { class: 'input' + (isText ? ' title-input' : ''), maxlength: 80, placeholder: isText ? '起个标题（选填）' : '一句话配文（选填）', value: m.title || '' })
  const content = h('textarea', { class: 'input' + (isText ? ' text-editor' : ''), rows: isText ? 12 : 4, maxlength: isText ? 10000 : 2000, placeholder: isText ? '正文' : '出处、背景…（选填）' })
  content.value = m.content || ''
  const tags = tagPicker(m.tags || [])
  const spoiler = h('input', { type: 'checkbox' })
  spoiler.checked = !!m.spoiler
  const ai = imageAiControl(m.ai_off)
  const mediaSig = () => JSON.stringify(tray.items.map((it) => it.kept?.u || it.url))
  const snap = () => JSON.stringify([title.value, content.value, tags.value(), spoiler.checked, ai.input.checked, mediaSig()])
  const init = snap()
  const initMedia = mediaSig()
  const save = h('button', { class: 'btn btn-primary' }, '保存')
  save.addEventListener('click', async () => {
    if (!tray.items.length && !isText) return toast('至少留一张图', 'err')
    if (isText && !title.value.trim() && !content.value.trim()) return toast('写点什么吧', 'err')
    save.disabled = true
    save.textContent = tray.busy() ? '等上传完…' : '保存中…'
    try {
      const body = { title: title.value, content: content.value, tags: tags.value(), spoiler: spoiler.checked }
      if (ai.changed() && !ai.input.disabled) body.ai_off = !ai.input.checked
      if (mediaSig() !== initMedia) Object.assign(body, { items: await tray.media(), layout: 'carousel' })
      save.textContent = '保存中…'
      await api(`/memes/${m.id}`, { method: 'PATCH', body })
      toast('已保存', 'ok')
      S.bgKey = null
      closeModal(false)
    } catch (e) {
      toast(e.message, 'err')
      save.disabled = false
      save.textContent = '保存'
    }
  })
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, `编辑 No.${m.id}`), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: () => requestClose() }, icon('close'))),
    isText
      ? h('div', { class: 'compose-body text-body' },
        field('标题', title),
        field('正文', h('div', { class: 'fmt-wrap big' }, fmtBar(content), content)),
        h('div', { class: 'text-media' }, h('div', { class: 'text-media-head' },
          h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => tray.pick() }, icon('image', 'i tiny'), '配图'),
          h('span', { class: 'muted sm' }, '可以删图、换顺序、点笔重新打码')), drop),
        field('标签', tags.el),
        h('label', { class: 'switch' }, spoiler, h('span', { class: 'switch-ui' }), h('span', null, '慎点（默认模糊）')))
      : h('div', { class: 'compose-body' },
        h('div', { class: 'edit-media' }, drop, h('p', { class: 'muted sm' }, '可以删图、换顺序、点笔重新打码，或点 + 加新图 / 重新上传')),
        h('div', { class: 'compose-fields' },
          field('配文', title),
          field('描述', h('div', { class: 'fmt-wrap' }, fmtBar(content), content)),
          field('标签', tags.el),
          ai.el,
          h('label', { class: 'switch' }, spoiler, h('span', { class: 'switch-ui' }), h('span', null, '慎点（默认模糊）')))),
    h('footer', { class: 'compose-foot' },
      h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-ghost', onclick: () => requestClose() }, '取消'),
      save))
  S.modal.guard = () => (snap() === init ? null : { text: '改动还没保存，确定放弃吗？' })
  focusEditorOnOpen(title, panel)
}

// 挂解密只在「解密」页里发图时出现：openCompose({ puzzle: true })；别处直接当 onclick 用，参数是事件
function openCompose(opts) {
  const withPuzzle = opts?.puzzle === true
  if (!requireLogin('分享图片')) return
  if (S.me.trust_level < S.minPostTL) return toast(`发图需要 linux.do 信任等级 ≥ ${S.minPostTL}`, 'err')
  const shell = openModalShell('compose-panel')
  S.modal.kind = 'compose'
  // 上次点了「保留草稿」：整块 DOM 原样放回来，文件、上传进度、文字都还在
  if (S.composeDraft && S.composeDraft.puzzle === withPuzzle) {
    const d = S.composeDraft
    S.composeDraft = null
    shell.replaceChildren(d.el)
    S.modal.guard = d.guard
    d.focus()
    return
  }
  const panel = h('div', { class: 'compose-wrap' })
  shell.replaceChildren(panel)

  const tray = mediaTray()
  const empty = h('button', { class: 'drop-empty', type: 'button', onclick: () => tray.pick() }, icon('image', 'drop-icon'),
    h('strong', null, '拖入、粘贴或点击选择'),
    h('span', null, `图片、GIF、视频，单个 20MB 以内（大图自动压缩），一次最多 ${MAX_FILES} 个`),
    )
  tray.solo = true
  const submit = h('button', { class: 'btn btn-primary' }, '发布')
  let posted = [] // 发多帖时中途失败，重试跳过已经发出去的
  const modeRow = h('div', { class: 'send-mode', hidden: true })
  const footSum = h('span', { class: 'foot-sum muted' }) // 底栏常驻：发几帖、几个文件、还在传几个
  // 没标「单发」的合成一帖轮播（排在第一张的位置），标了的各发一帖
  const plan = (list) => {
    const bundle = list.filter((_, i) => !tray.items[i]?.solo)
    const groups = []
    list.forEach((x, i) => {
      if (tray.items[i]?.solo) groups.push([x])
      else if (x === bundle[0]) groups.push(bundle)
    })
    return groups
  }
  const submitLabel = () => { const n = plan(tray.items).length; return n > 1 ? `发布 ${n} 帖` : '发布' }
  const drawMode = () => {
    const n = tray.items.length
    if (!submit.disabled) submit.textContent = submitLabel()
    footSum.textContent = n ? `${n} 个文件 · 发 ${plan(tray.items).length} 帖` : '还没选图'
    modeRow.hidden = n < 2
    const solo = tray.items.filter((it) => it.solo).length
    const all = (v) => { tray.items.forEach((it) => { it.solo = v }); tray.redraw(); drawMode() }
    modeRow.replaceChildren(
      h('span', { class: 'send-sum' }, `将发布 ${plan(tray.items).length} 帖，包含 ${n} 个媒体`,
        h('span', { class: 'muted' }, solo === 0 ? '（全部合成一帖轮播）' : solo === n ? '（每个各发一帖）' : `（${n - solo} 个合成轮播 + ${solo} 个单发）`)),
      h('div', { class: 'segs small', role: 'group', 'aria-label': '多图怎么发' },
        h('button', { class: 'seg' + (solo === 0 ? ' on' : ''), type: 'button', 'aria-pressed': solo === 0 ? 'true' : 'false', onclick: () => all(false) }, '全部轮播'),
        h('button', { class: 'seg' + (solo === n ? ' on' : ''), type: 'button', 'aria-pressed': solo === n ? 'true' : 'false', onclick: () => all(true) }, '全部单发')),
      h('span', { class: 'muted sm' }, '点每张左上角的标签可单独切换'))
  }
  const drop = h('div', { class: 'drop' }, empty, tray.el, tray.input)
  tray.onchange = () => { drop.classList.toggle('has', tray.items.length > 0); empty.hidden = tray.items.length > 0; drawMode() }
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over') })
  drop.addEventListener('dragleave', () => drop.classList.remove('over'))
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); tray.add(e.dataTransfer.files) })
  panel.addEventListener('paste', (e) => {
    const fs = [...(e.clipboardData?.files || [])]
    if (fs.length) { e.preventDefault(); tray.add(fs) }
  })

  const title = h('input', { class: 'input', maxlength: 80, placeholder: '标题 / 一句话配文（选填）' })
  const content = h('textarea', { class: 'input', rows: 3, maxlength: 2000, placeholder: '出处、背景…（选填）' })
  const tags = tagPicker()
  const spoiler = h('input', { type: 'checkbox' })
  const ai = imageAiControl()
  const pf = puzzleForm()
  const puzzleWrap = h('div', { class: 'puzzle-editor', hidden: true }, pf.el)
  const toggle = h('input', { type: 'checkbox', checked: withPuzzle })
  puzzleWrap.hidden = !withPuzzle
  toggle.addEventListener('change', () => { puzzleWrap.hidden = !toggle.checked })

  submit.addEventListener('click', async () => {
    if (!tray.items.length) return toast('请选择图片或视频', 'err')
    submit.disabled = true
    const puzzle = toggle.checked ? await pf.value() : null
    if (toggle.checked && !puzzle) { submit.disabled = false; return }
    submit.textContent = tray.busy() ? '等上传完…' : '发布中…'
    try {
      const items = await tray.media()
      submit.textContent = '发布中…'
      // 每一帖记住是哪几个托盘项：发出去的那几张在托盘上标「已发 No.x」，失败重试只发没标的
      const its = plan(tray.items)
      const groups = plan(items)
      const base = { title: title.value, content: content.value, tags: tags.value(), spoiler: spoiler.checked, layout: 'carousel', ai_off: ai.off() }
      if (tray.items.every((it) => it.posted)) { tray.items.forEach((it) => { it.posted = 0 }); posted = [] }
      for (const [i, g] of groups.entries()) {
        if (its[i].every((it) => it.posted)) continue
        submit.textContent = groups.length > 1 ? `发布中 ${i + 1} / ${groups.length}…` : '发布中…'
        const r = await api('/memes', { method: 'POST', body: { ...base, items: g } })
        posted.push(r.id)
        its[i].forEach((it) => { it.posted = r.id })
        tray.redraw()
      }
      posted = [...new Set(tray.items.map((it) => it.posted).filter(Boolean))]
      const id = posted[0]
      toast(groups.length > 1 ? `已发布 ${groups.length} 帖` : '已发布', 'ok')
      postedHint(spoiler.checked)
      if (puzzle) {
        try { await api(`/memes/${id}/puzzle`, { method: 'POST', body: puzzle }) } catch (e) { toast('梗图已发布，但谜题失败：' + e.message, 'err') }
      }
      // 发完留在当前页，刷新一下就能看到新帖
      closeModal(false)
      S.bgKey = null
      S.wallFresh = true
      route()
    } catch (e) {
      const left = plan(tray.items).filter((g) => !g.every((it) => it.posted)).length
      toast(posted.length ? `已发出 ${posted.length} 帖（托盘里标了「已发」），还剩 ${left} 帖没发：${e.message}。再点一次只发剩下的` : e.message, 'err')
      submit.disabled = false
      submit.textContent = posted.length ? `继续发剩下 ${left} 帖` : submitLabel()
    }
  })

  panel.replaceChildren(
    h('header', { class: 'compose-head' }, withPuzzle ? h('h2', null, '发一张解密图') : composeKind('image', guard_), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: () => requestClose() }, icon('close'))),
    // 左：图和多图怎么发；右：标题 → 描述 → 标签 / 慎点。有图之后左边放宽，缩略图不挤
    h('div', { class: 'compose-body' },
      h('div', { class: 'compose-media' }, drop, modeRow),
      h('div', { class: 'compose-fields' },
        field('标题', title),
        field('描述', h('div', { class: 'fmt-wrap' }, fmtBar(content), content)),
        field('标签', tags.el),
        ai.el,
        h('label', { class: 'switch' }, spoiler, h('span', { class: 'switch-ui' }), h('span', null, '慎点'), h('span', { class: 'muted sm' }, '· 别人看到时先模糊')),
        withPuzzle && h('label', { class: 'switch' }, toggle, h('span', { class: 'switch-ui' }), h('span', null, '挂一个解密')),
        withPuzzle && puzzleWrap)),
    h('footer', { class: 'compose-foot' },
      footSum,
      h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-ghost', onclick: () => requestClose() }, '取消'),
      submit))
  drawMode()
  function guard_() { return guard() }
  const guard = () => {
    const n = tray.items.length
    const words = [title, content].some((x) => x.value.trim()) || tags.value().length > 0 || (toggle.checked && pf.dirty()) || ai.changed()
    if (!n && !words) return null
    const what = [n && `${n} 个文件`, words && '填好的文字'].filter(Boolean).join('和')
    return {
      text: `这里有${what}，要保留草稿吗？`,
      keep: () => { S.composeDraft = { el: panel, guard, puzzle: withPuzzle, focus: () => focusEditorOnOpen(title, panel) } },
    }
  }
  S.modal.guard = guard
  focusEditorOnOpen(title, panel)
}

// 发帖弹窗顶上的「发图 / 发文字」切换；有没发的内容先问一句
function composeKind(cur, dirty) {
  const go = (k) => {
    if (k === cur) return
    if (dirty() && !confirm('切换后这里填的内容会丢掉，确定吗？')) return
    S.modal.guard = null
    if (k === 'text') openTextCompose()
    else openCompose()
  }
  return h('div', { class: 'segs compose-kind', role: 'tablist', 'aria-label': '帖子类型' },
    [['image', '发图'], ['text', '发文字']].map(([k, label]) => h('button', { class: 'seg' + (k === cur ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => go(k) }, label)))
}
// 文字帖：标题 + 正文为主，可配几张图；在图廊里占满一整行
function openTextCompose() {
  if (!requireLogin('发帖')) return
  if (S.me.trust_level < S.minPostTL) return toast(`发帖需要 linux.do 信任等级 ≥ ${S.minPostTL}`, 'err')
  const shell = openModalShell('compose-panel text-compose')
  S.modal.kind = 'compose'
  if (S.textDraft) {
    const d = S.textDraft
    S.textDraft = null
    shell.replaceChildren(d.el)
    S.modal.guard = d.guard
    d.focus()
    return
  }
  const panel = h('div', { class: 'compose-wrap' })
  shell.replaceChildren(panel)
  const tray = mediaTray()
  const title = h('input', { class: 'input title-input', maxlength: 80, placeholder: '起个标题（选填）' })
  const content = h('textarea', { class: 'input text-editor', rows: 12, maxlength: 10000, placeholder: '想说的话…' })
  const count = h('span', { class: 'muted sm fmt-count' }, '0 / 10000')
  content.addEventListener('input', () => { count.textContent = `${content.value.length} / 10000` })
  const tags = tagPicker()
  const spoiler = h('input', { type: 'checkbox' })
  const pick = h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => tray.pick() }, icon('image', 'i tiny'), '配图')
  const drop = h('div', { class: 'drop text-drop' }, tray.el, tray.input)
  tray.onchange = () => { drop.classList.toggle('has', tray.items.length > 0) }
  panel.addEventListener('paste', (e) => {
    const fs = [...(e.clipboardData?.files || [])]
    if (fs.length) { e.preventDefault(); tray.add(fs) }
  })
  panel.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() })
  panel.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); tray.add(e.dataTransfer.files) } })
  const submit = h('button', { class: 'btn btn-primary' }, '发布')
  submit.addEventListener('click', async () => {
    if (!title.value.trim() && !content.value.trim()) return toast('写点什么吧', 'err')
    submit.disabled = true
    submit.textContent = tray.busy() ? '等上传完…' : '发布中…'
    try {
      const items = await tray.media()
      submit.textContent = '发布中…'
      await api('/memes', { method: 'POST', body: { kind: 'text', title: title.value, content: content.value, items, tags: tags.value(), spoiler: spoiler.checked, layout: 'grid' } })
      toast('已发布', 'ok')
      postedHint(spoiler.checked)
      closeModal(false)
      S.bgKey = null
      S.wallFresh = true
      route()
    } catch (e) {
      toast(e.message, 'err')
      submit.disabled = false
      submit.textContent = '发布'
    }
  })
  const guard = () => {
    const n = tray.items.length
    const words = [title, content].some((x) => x.value.trim()) || tags.value().length > 0
    if (!n && !words) return null
    return {
      text: '这里有没发出去的内容，要保留草稿吗？',
      keep: () => { S.textDraft = { el: panel, guard, focus: () => focusEditorOnOpen(content, panel) } },
    }
  }
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, composeKind('text', () => !!guard()), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: () => requestClose() }, icon('close'))),
    h('div', { class: 'compose-body text-body' },
      field('标题', title),
      field('正文', h('div', { class: 'fmt-wrap big' }, fmtBar(content), content,
        h('div', { class: 'fmt-foot' }, h('span', null, '支持 Markdown：## 标题、**粗体**、- 列表、> 引用、``` 代码'), count))),
      h('div', { class: 'text-media' }, h('div', { class: 'text-media-head' }, pick, h('span', { class: 'muted sm' }, '配图选填，也能直接粘贴或拖进来，最多 12 张')), drop),
      field('标签', tags.el),
      h('label', { class: 'switch' }, spoiler, h('span', { class: 'switch-ui' }), h('span', null, '慎点'))),
    h('footer', { class: 'compose-foot' },
      h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-ghost', onclick: () => requestClose() }, '取消'),
      submit))
  S.modal.guard = guard
  focusEditorOnOpen(content, panel)
}

const TAG_PRESETS = ['梗图', 'meme', '段子', 'NSFW', '打码', '番号', '短文', '吃瓜', '鸡汤']
const TAG_MAX = 5
// 站里已有的标签（标签栏那些），发帖、转帖都能直接点
let ALL_TAGS = null
async function allTags() {
  if (ALL_TAGS) return ALL_TAGS
  try {
    const { tags } = await api('/tags?' + new URLSearchParams(nsfwParam()))
    ALL_TAGS = tags.map((t) => t.tag).filter((t) => !TAG_PRESETS.includes(t))
  } catch { return [] }
  return ALL_TAGS
}
function tagPicker(initial = []) {
  const sel = [...initial].slice(0, TAG_MAX)
  let extra = []
  allTags().then((x) => { extra = x; draw() })
  const row = h('div', { class: 'tag-pick', role: 'group', 'aria-label': `标签，最多 ${TAG_MAX} 个` })
  const custom = h('input', { class: 'input tag-custom', maxlength: 12, placeholder: '自定义，回车添加', 'aria-label': '自定义标签', hidden: true })
  const note = h('div', { class: 'muted sm tag-note', 'aria-live': 'polite' })
  const isNsfw = () => sel.some((x) => (S.nsfwTags || ['NSFW', '番号']).includes(x))
  const toggle = (tag) => {
    const i = sel.indexOf(tag)
    if (i >= 0) sel.splice(i, 1)
    else if (sel.length >= TAG_MAX) return toast(`最多 ${TAG_MAX} 个标签`, 'err')
    else sel.push(tag)
    draw()
  }
  const addCustom = () => {
    const v = custom.value.replace(/[,，\s#]+/g, '').slice(0, 12)
    custom.value = ''
    if (!v) return
    if (!sel.includes(v)) toggle(v)
    custom.focus()
  }
  custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } })
  custom.addEventListener('blur', () => { if (custom.value.trim()) addCustom() })
  const chip = (tag, on) => h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: () => toggle(tag) },
    tag, on && !TAG_PRESETS.includes(tag) && icon('close', 'i tiny'))
  function draw() {
    row.replaceChildren(
      ...TAG_PRESETS.map((x) => chip(x, sel.includes(x))),
      ...extra.map((x) => chip(x, sel.includes(x))),
      ...sel.filter((x) => !TAG_PRESETS.includes(x) && !extra.includes(x)).map((x) => chip(x, true)),
      h('button', { class: 'chip' + (custom.hidden ? '' : ' on'), type: 'button', 'aria-expanded': custom.hidden ? 'false' : 'true',
        onclick: () => { custom.hidden = !custom.hidden; if (!custom.hidden) custom.focus() } }, icon('plus', 'i tiny'), '自定义'))
    note.textContent = `${sel.length} / ${TAG_MAX}` + (isNsfw() ? ' · 带 NSFW / 番号 标签的图默认会模糊' : '')
  }
  draw()
  return { el: h('div', { class: 'tag-picker' }, row, custom, note), value: () => sel.join(' ') }
}

// 文本框上方的格式按钮：粗体、剧透、折叠、表情（都是站里认的写法）
// 参考 GitHub 的 markdown-toolbar、EasyMDE、Discourse 编辑器：常用格式一键加，选中文字再点就包起来；
// Ctrl+B 粗体 / Ctrl+I 斜体 / Ctrl+K 链接；列表里回车自动续下一项，空项回车结束列表；「预览」看最终效果
function fmtBar(ta, { preview = true } = {}) {
  const changed = () => { ta.focus({ preventScroll: true }); ta.dispatchEvent(new Event('input')) }
  const wrap = (a, b, ph) => {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd
    const sel = ta.value.slice(s0, e0)
    // 已经包着同样的标记：再点一下就去掉
    if (sel && ta.value.slice(s0 - a.length, s0) === a && ta.value.slice(e0, e0 + b.length) === b) {
      ta.setRangeText(sel, s0 - a.length, e0 + b.length, 'select')
      return changed()
    }
    const t = sel || ph
    ta.setRangeText(a + t + b, s0, e0, 'end')
    ta.selectionStart = s0 + a.length
    ta.selectionEnd = s0 + a.length + t.length
    changed()
  }
  // 对选中的每一行加 / 去前缀
  const eachLine = (fn) => {
    const v = ta.value
    const s0 = ta.selectionStart, e0 = ta.selectionEnd
    const ls = v.lastIndexOf('\n', s0 - 1) + 1
    let le = v.indexOf('\n', e0 > s0 && v[e0 - 1] === '\n' ? e0 - 1 : e0)
    if (le < 0) le = v.length
    const next = fn(v.slice(ls, le).split('\n')).join('\n')
    ta.setRangeText(next, ls, le, 'end')
    if (e0 > s0) { ta.selectionStart = ls; ta.selectionEnd = ls + next.length }
    changed()
  }
  const prefix = (p, re) => eachLine((ls) => ls.every((l) => re.test(l)) ? ls.map((l) => l.replace(re, '')) : ls.map((l) => p + l.replace(/^(#{1,3}\s+|>\s?|\s*([-*+]|\d{1,3}[.)])\s+(\[[ xX]\]\s+)?)/, '')))
  const ordered = () => eachLine((ls) => ls.every((l) => /^\d{1,3}[.)]\s+/.test(l))
    ? ls.map((l) => l.replace(/^\d{1,3}[.)]\s+/, ''))
    : ls.map((l, i) => `${i + 1}. ` + l.replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/, '')))
  // 代码块、分割线要单独成行
  const block = (a, b, ph) => {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd
    const pre = s0 > 0 && ta.value[s0 - 1] !== '\n' ? '\n' : ''
    const post = ta.value[e0] && ta.value[e0] !== '\n' ? '\n' : ''
    const t = ta.value.slice(s0, e0) || ph
    ta.setRangeText(pre + a + t + b + post, s0, e0, 'end')
    ta.selectionStart = s0 + pre.length + a.length
    ta.selectionEnd = ta.selectionStart + t.length
    changed()
  }
  const link = () => {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd
    const sel = ta.value.slice(s0, e0)
    if (/^https?:\/\/\S+$/.test(sel)) {
      ta.setRangeText(`[链接文字](${sel})`, s0, e0, 'end')
      ta.selectionStart = s0 + 1; ta.selectionEnd = s0 + 5
    } else {
      const t = sel || '链接文字'
      ta.setRangeText(`[${t}](https://)`, s0, e0, 'end')
      ta.selectionStart = s0 + t.length + 3; ta.selectionEnd = s0 + t.length + 11
    }
    changed()
  }
  const b = (ic, label, fn, extra = {}) => h('button', { class: 'fmt-btn', type: 'button', title: label, 'aria-label': label, onclick: fn, ...extra }, icon(ic, 'i tiny'))
  const sep = () => h('span', { class: 'fmt-sep', 'aria-hidden': 'true' })
  const key = 'fmt' + Math.random().toString(36).slice(2, 7)
  const tools = [
    b('heading', '标题', () => prefix('## ', /^#{1,3}\s+/)),
    b('bold', '粗体（Ctrl+B）', () => wrap('**', '**', '粗体')),
    b('italic', '斜体（Ctrl+I）', () => wrap('*', '*', '斜体')),
    b('strike', '删除线', () => wrap('~~', '~~', '删除线')),
    sep(),
    b('list', '无序列表', () => prefix('- ', /^\s*[-*+]\s+(?!\[[ xX]\])/)),
    b('listOl', '有序列表', ordered),
    b('task', '待办清单', () => prefix('- [ ] ', /^\s*[-*+]\s+\[[ xX]\]\s+/)),
    b('quote', '引用', () => prefix('> ', /^>\s?/)),
    sep(),
    b('link', '链接（Ctrl+K）', link),
    b('code', '行内代码', () => wrap('`', '`', '代码')),
    b('codeBlock', '代码块', () => block('```\n', '\n```', '代码')),
    b('hr', '分割线', () => block('', '---', '')),
    sep(),
    b('eyeOff', '剧透遮挡（点一下才显示）', () => wrap('[spoiler]', '[/spoiler]', '剧透')),
    b('chevD', '折叠（车牌、长文放这里）', () => block('[details="展开"]\n', '\n[/details]', '折叠的内容')),
    b('smile', '表情', (e) => openPop(e.currentTarget, stickerPicker((k) => { closePop(); insertAtCursor(ta, k) }), { key, cls: 'pop-stk', up: true }), { 'data-pop': key }),
  ]
  const secondary = tools.filter(t => t.tagName === 'BUTTON' && !['粗体（Ctrl+B）', '表情'].includes(t.title))
  secondary.forEach(t => t.classList.add('fmt-secondary'))
  const more = b('more', '更多格式', e => openPop(e.currentTarget,
    h('div', { class: 'menu-list' }, secondary.map(t => h('button', { class: 'menu-item', type: 'button', disabled: t.disabled,
      onclick: () => { closePop(); t.click() } }, t.title.replace(/（Ctrl\+[BIK]）/, '')))),
    { key: key + '-more', up: true }), { class: 'fmt-btn fmt-mobile-more' })
  tools.push(more)
  // 写 / 预览
  let pv = null
  const pvBtn = preview && h('button', { class: 'fmt-tab', type: 'button', 'aria-pressed': 'false', onclick: () => {
    const on = !pv || pv.hidden
    if (!pv) { pv = h('div', { class: 'fmt-preview md', tabindex: '0', 'aria-label': '预览' }); ta.after(pv) }
    if (on) pv.replaceChildren(...nodes(ta.value.trim() ? richText(ta.value, { md: true }) : h('p', { class: 'muted' }, '还没写内容')))
    pv.style.minHeight = ta.offsetHeight + 'px'
    pv.hidden = !on
    ta.hidden = on
    pvBtn.setAttribute('aria-pressed', on ? 'true' : 'false')
    pvBtn.replaceChildren(icon(on ? 'pen' : 'eye', 'i tiny'), on ? '继续写' : '预览')
    for (const t of tools) if (t.tagName === 'BUTTON') t.disabled = on
    if (!on && innerWidth > 760) ta.focus({ preventScroll: true })
  } }, icon('eye', 'i tiny'), '预览')
  ta.addEventListener('keydown', (e) => {
    if (e.isComposing) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase()
      if (k === 'b') { e.preventDefault(); return wrap('**', '**', '粗体') }
      if (k === 'i') { e.preventDefault(); return wrap('*', '*', '斜体') }
      if (k === 'k') { e.preventDefault(); return link() }
    }
    // 列表续行
    if (e.key === 'Enter' && !mod && !e.shiftKey && !e.altKey && ta.selectionStart === ta.selectionEnd) {
      const v = ta.value, p = ta.selectionStart
      const ls = v.lastIndexOf('\n', p - 1) + 1
      const m = v.slice(ls, p).match(/^(\s*)([-*+]\s+(\[[ xX]\]\s+)?|(\d{1,3})([.)])\s+|>\s?)(.*)$/)
      if (!m) return
      e.preventDefault()
      if (!m[6].trim()) { ta.setRangeText('', ls, p, 'end'); return changed() }
      const next = m[4] ? `${+m[4] + 1}${m[5]} ` : m[3] ? m[2].replace(/\[[ xX]\]/, '[ ]') : m[2]
      ta.setRangeText('\n' + m[1] + next, p, p, 'end')
      changed()
    }
  })
  return h('div', { class: 'fmt-bar', role: 'toolbar', 'aria-label': '格式' }, h('div', { class: 'fmt-tools' }, tools), pvBtn)
}

// ---------- 弹窗 ----------

function focusEditorOnOpen(input, panel) {
  if (innerWidth > 760) input.focus({ preventScroll: true })
  else panel.querySelector('[aria-label="关闭"]')?.focus({ preventScroll: true })
}

function openModalShell(cls) {
  closePop()
  if (!S.modal) {
    const body = h('div', { class: 'modal-panel' })
    const root = h('div', { class: 'modal', onclick: (e) => { if (e.target === root) requestClose() } }, body)
    body.addEventListener('scroll', closePop, { passive: true })
    document.body.append(root)
    document.body.classList.add('lock')
    requestAnimationFrame(() => root.classList.add('in'))
    S.modal = { root, body }
  }
  S.modal.body.className = 'modal-panel ' + (cls || '')
  return S.modal.body
}

function closeModal(viaUser) {
  if (!S.modal) return
  const { root, kind } = S.modal
  if (viaUser && kind === 'meme') {
    // 从站内点进来的就后退，保留图廊滚动位置；直接打开链接的则回首页
    if (history.state?.inApp) history.back()
    else navigate('/', { replace: true })
    return
  }
  S.modal.clean?.forEach((fn) => fn())
  if (S.modal.prevTitle !== undefined) setTitle(S.modal.prevTitle)
  S.modal = null
  if (kind === 'edit') queueMicrotask(route)
  closePop()
  root.classList.remove('in')
  document.body.classList.remove('lock')
  setTimeout(() => root.remove(), 180)
}

// 用户想关弹窗（点外面、Esc、×）：有没发出去的东西就先问一下
// S.modal.guard() 返回 null 表示没东西；否则 { text, keep? }，keep 存在时多一个「保留草稿」
let asking = false
async function requestClose() {
  const m = S.modal
  if (!m) return
  const g = m.guard?.()
  if (!g) return closeModal(true)
  if (asking) return
  asking = true
  const v = await askChoice('还没发出去', g.text, [
    ...(g.keep ? [['keep', '保留草稿', 'btn-primary']] : []),
    ['drop', '放弃', 'btn-ghost danger'],
    ['stay', '继续编辑', 'btn-ghost']])
  asking = false
  if (S.modal !== m || !v || v === 'stay') return
  if (v === 'keep') g.keep()
  else g.drop?.()
  m.guard = null
  closeModal(true)
}

const closeBtn = () => h('button', { class: 'btn-icon modal-close', 'aria-label': '关闭', onclick: () => requestClose() }, icon('close'))

async function openMeme(id) {
  const panel = openModalShell('detail-panel')
  S.modal.kind = 'meme'
  S.modal.memeId = id
  panel.replaceChildren(h('div', { class: 'modal-loading' }, h('div', { class: 'spinner' })))
  let meme
  try {
    meme = (await api(`/memes/${id}`)).meme
  } catch (e) {
    panel.replaceChildren(closeBtn(), emptyState('打不开', e.message))
    return
  }
  if (!S.modal || S.modal.memeId !== id) return
  if (S.modal.prevTitle === undefined) S.modal.prevTitle = S.pageTitle
  setTitle(meme.title || snip(meme.content) || `第 ${meme.id} 张梗图`)
  renderDetail(panel, meme)
}

// ---------- 外观：背景 ----------
// 背景只存在本机浏览器：内置底纹 / 站内壁纸库（public/wallpapers）/ 自己的图片链接 / 本地上传（IndexedDB）
const BG_PRESETS = [['', '无'], ['dots', '点阵'], ['grid', '方格'], ['lines', '细线'], ['mist', '晨雾'], ['dusk', '暮色']]
const LOOK_DEFAULT = { kind: 'preset', id: '', blur: 0, dim: 55 }
const LOOK = (() => { try { return { ...LOOK_DEFAULT, ...JSON.parse(localStorage.getItem('look')) } } catch { return { ...LOOK_DEFAULT } } })()
const saveLook = () => localStorage.setItem('look', JSON.stringify(LOOK))
let wallsP
const loadWalls = () => (wallsP ||= fetch('/wallpapers/index.json').then((r) => r.json()).then((d) => (Array.isArray(d.items) ? d.items : [])).catch(() => []))

// 上传的背景图存 IndexedDB，localStorage 装不下
function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('jinhuan', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', mode)
      const r = fn(tx.objectStore('kv'))
      tx.oncomplete = () => resolve(r?.result)
      tx.onerror = () => reject(tx.error)
    }
  })
}
let bgBlobUrl = null
async function lookSrc() {
  if (LOOK.kind === 'url') return /^https?:\/\//.test(LOOK.url || '') ? LOOK.url : ''
  if (LOOK.kind === 'wall') return LOOK.src || ''
  if (LOOK.kind === 'file') {
    if (!bgBlobUrl) {
      const blob = await idb('readonly', (s) => s.get('bg')).catch(() => null)
      if (blob) bgBlobUrl = URL.createObjectURL(blob)
    }
    return bgBlobUrl || ''
  }
  return ''
}
function tuneLook() {
  const r = document.documentElement.style
  r.setProperty('--bg-blur', LOOK.blur + 'px')
  r.setProperty('--bg-dim', LOOK.dim / 100)
}
let lookSeq = 0
async function applyLook() {
  const seq = ++lookSeq
  const root = document.documentElement
  const img = document.querySelector('#bg .bg-img')
  if (LOOK.kind === 'preset') {
    if (LOOK.id) root.dataset.bg = LOOK.id
    else delete root.dataset.bg
    if (img) img.style.backgroundImage = ''
    return
  }
  const src = await lookSrc()
  if (seq !== lookSeq) return
  if (!src) { delete root.dataset.bg; return }
  root.dataset.bg = 'photo'
  if (img) img.style.backgroundImage = `url(${JSON.stringify(src)})`
}
function setLook(patch) {
  Object.assign(LOOK, patch)
  saveLook()
  tuneLook()
  applyLook()
  if (POP?.key === 'look') POP.redraw?.()
}

async function uploadBg(file) {
  if (!file || !file.type.startsWith('image/')) return toast('请选一张图片', 'err')
  try {
    // 缩到长边 2560 再存，原图十几 MB 也不会拖慢打开
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height))
    const cv = document.createElement('canvas')
    cv.width = Math.round(bmp.width * k)
    cv.height = Math.round(bmp.height * k)
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.86))
    await idb('readwrite', (s) => s.put(blob, 'bg'))
    if (bgBlobUrl) URL.revokeObjectURL(bgBlobUrl)
    bgBlobUrl = null
    setLook({ kind: 'file' })
    toast('背景换好了，只存在这台设备上', 'ok')
  } catch (e) { toast('这张图读不了：' + e.message, 'err') }
}

// 外观面板：深浅色 / 背景 / 伪装
function looksPanel(anchor) {
  if (POP?.key === 'look') return closePop()
  const box = h('div', { class: 'looks' })
  const draw = async () => {
    const walls = await loadWalls()
    const on = (kind, id) => LOOK.kind === kind && (kind !== 'preset' || LOOK.id === id) && (kind !== 'wall' || LOOK.src === id)
    const tile = (label, sel, onclick, thumb) => h('button', { class: 'lk-tile' + (sel ? ' on' : ''), type: 'button', title: label, onclick },
      thumb, h('span', null, label))
    const file = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', onchange: (e) => uploadBg(e.target.files[0]) })
    const photo = LOOK.kind !== 'preset'
    box.replaceChildren(...nodes(
      h('div', { class: 'lk-sec' },
        h('div', { class: 'lk-title' }, '深浅色'),
        themeControl()),
      !S.skin && h('div', { class: 'lk-sec' },
        h('div', { class: 'lk-title' }, '背景'),
        h('div', { class: 'lk-grid' },
          BG_PRESETS.map(([id, label]) => tile(label, on('preset', id), () => setLook({ kind: 'preset', id }),
            h('span', { class: 'lk-thumb', 'data-bg-swatch': id || 'none' }))),
          walls.map((w) => tile(w.name, on('wall', w.src), () => setLook({ kind: 'wall', src: w.src, dim: LOOK.kind === 'preset' ? 55 : LOOK.dim }),
            h('span', { class: 'lk-thumb' }, h('img', { src: w.thumb, alt: '', loading: 'lazy' })))),
          LOOK.kind === 'file' && tile('我的图片', true, () => {}, h('span', { class: 'lk-thumb', 'data-bg-swatch': 'photo' }, icon('image'))),
          LOOK.kind === 'url' && tile('图片链接', true, () => {}, h('span', { class: 'lk-thumb' }, h('img', { src: LOOK.url, alt: '', referrerpolicy: 'no-referrer' })))),
        h('div', { class: 'lk-row' },
          file,
          h('button', { class: 'btn btn-ghost sm', onclick: () => file.click() }, icon('image', 'i tiny'), '上传图片'),
          h('button', { class: 'btn btn-ghost sm', onclick: () => {
            const u = prompt('图片链接（https 开头）', LOOK.kind === 'url' ? LOOK.url : '')
            if (u == null) return
            if (!/^https?:\/\/\S+$/.test(u.trim())) return toast('链接要以 http(s):// 开头', 'err')
            setLook({ kind: 'url', url: u.trim() })
          } }, icon('ext', 'i tiny'), '图片链接')),
        photo && lookSlider('模糊', 'blur', 0, 24, 'px'),
        photo && lookSlider('遮罩', 'dim', 0, 90, '%')),
      h('div', { class: 'lk-sec' },
        h('div', { class: 'lk-title' }, '伪装'),
        disguiseBtn('feishu', FS_MARK, '飞书', '整站变成飞书聊天界面，看图、回应、评论、群聊照常用'),
        disguiseBtn('linuxdo', LD_MARK, ' LINUX DO 帖子', '整个图廊变成一篇论坛帖子，每张图一楼，聊天在右下角'),
        h('p', { class: 'lk-note' }, '老板键：连按两下 ', h('kbd', null, 'Esc'), ' 切到云文档')),
      FISH_OK() && h('div', { class: 'lk-sec' },
        h('div', { class: 'lk-title' }, '高级摸鱼'),
        h('button', { class: 'lk-disguise' + (FISH ? ' on' : ''), onclick: () => { closePop(); toggleFish() } },
          h('span', { class: 'lk-fs-mark', html: FISH_MARK }),
          h('span', { class: 'lk-dz-text' }, h('strong', null, FISH ? '关闭高级摸鱼' : '打开高级摸鱼'), h('span', null, '一贴一贴看的独立小窗，快捷键 M')),
          icon('chevR', 'i tiny')),
        h('p', { class: 'lk-note' }, '想让小窗真透明（透出后面的软件）、能置顶：下载 ',
          h('a', { class: 'dl-link', href: '/tools/jinhuan-moyu.cmd', download: 'jinhuan-moyu.cmd' }, icon('download', 'i tiny'), '摸鱼助手（Windows）'),
          '，双击运行，托盘里能退出。按住 ', h('kbd', null, 'Alt'), '+', h('kbd', null, '`'), ' 临时显示，',
          h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Alt'), '+', h('kbd', null, '`'), ' 隐身 / 恢复，',
          h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Alt'), '+', h('kbd', null, 'P'), ' 置顶 / 取消。'))))
    if (POP?.key === 'look') placePop(POP.anchor, POP.el, 'right')
  }
  openPop(anchor, box, { key: 'look', align: 'right', cls: 'pop-looks' })
  POP.redraw = draw
  draw()
}
function lookSlider(label, key, min, max, unit) {
  const val = h('span', { class: 'lk-val' }, LOOK[key] + unit)
  const input = h('input', { type: 'range', min, max, value: LOOK[key], 'aria-label': label })
  input.addEventListener('input', () => { LOOK[key] = Number(input.value); val.textContent = input.value + unit; tuneLook() })
  input.addEventListener('change', saveLook)
  return h('label', { class: 'lk-slider' }, h('span', null, label), input, val)
}

const THEME_MEDIA = matchMedia('(prefers-color-scheme: dark)')
const THEME_LABELS = { light:'浅色', dark:'深色', system:'跟随系统' }
const THEME_ICONS = { light:'sun', dark:'moon', system:'monitor' }
const themeMode = () => ['light','dark'].includes(localStorage.getItem('theme')) ? localStorage.getItem('theme') : 'system'
function applyTheme() {
  const mode = themeMode()
  document.documentElement.dataset.themeMode = mode
  const effective = mode === 'system' ? (THEME_MEDIA.matches ? 'dark' : 'light') : mode
  document.documentElement.dataset.theme = effective
  for (const w of PIPS) {
    try { if (!w.closed) w.document.documentElement.dataset.theme = effective } catch { /* 小窗已跳到其他来源，不影响主页面主题。 */ }
  }
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = effective==='dark'?'#14261F':'#F7F6F0' })
  syncThemeControls()
  renderActions()
  IM?.drawRail?.()
  if (POP?.key === 'look') POP.redraw?.()
}
function setTheme(mode) { localStorage.setItem('theme', mode); applyTheme() }
function toggleTheme() {
  const modes = ['light','dark','system']
  setTheme(modes[(modes.indexOf(themeMode())+1)%modes.length])
}
function themeControl() {
  const mode = themeMode()
  return h('div', { class:'segs small',role:'group','aria-label':'主题模式' },Object.entries(THEME_LABELS).map(([k,label]) =>
    h('button', { class:'seg'+(k===mode?' on':''),type:'button','data-theme-choice':k,'aria-pressed':String(k===mode),onclick:()=>setTheme(k) },icon(THEME_ICONS[k],'i tiny'),label)))
}
function syncThemeControls() {
  document.querySelectorAll('[data-theme-choice]').forEach(b => { const on = b.dataset.themeChoice === themeMode(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)) })
}
THEME_MEDIA.addEventListener('change', () => { if(themeMode()==='system')applyTheme() })
addEventListener('storage', e => { if(e.key==='theme')applyTheme() })

// ---------- 伪装：标签页标题和图标 ----------
const FISH_MARK = '<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#14866D"/><path d="M5.5 16c3.2-5.2 8.6-7 13.6-4.6L25 7v18l-5.9-4.4C14.1 23 8.7 21.2 5.5 16z" fill="#fff"/><circle cx="11" cy="15.2" r="1.5" fill="#14866D"/></svg>'
const FS_MARK = '<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#3370FF"/><path d="M7 15.5 24.5 8l-4.2 16.3-5.4-4.4-3.4 3.1.3-5z" fill="#fff"/><path d="m11.8 18 8.7-7.3-6 8.4" fill="#C2D4FF"/></svg>'
const TAB = {
  site: { title: '尽欢' },
  feishu: { title: '飞书', icon: '/disguise/feishu.svg' },
  doc: { icon: '/disguise/doc.svg' },
}
function syncTab() {
  const mode = BOSS ? 'doc' : S.skin || 'site'
  const title = mode === 'doc' ? bossTitle() + ' - 飞书云文档' : TAB[mode].title
  // 老板键（云文档）不带数字，免得露馅；其它伪装和原站都像正常网页一样显示 (N)
  const n = mode === 'doc' ? 0 : tabCount()
  document.title = n ? `(${n > 99 ? '99+' : n}) ${title}` : title
  document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
    if (l.dataset.origHref == null) { l.dataset.origHref = l.getAttribute('href'); l.dataset.origType = l.getAttribute('type') || '' }
    if (mode === 'site') {
      l.setAttribute('href', l.dataset.origHref)
      if (l.dataset.origType) l.setAttribute('type', l.dataset.origType)
      else l.removeAttribute('type')
    } else {
      l.setAttribute('href', TAB[mode].icon)
      l.setAttribute('type', 'image/svg+xml')
    }
  })
}

S.skin = ['feishu', 'linuxdo'].includes(document.documentElement.dataset.skin) ? document.documentElement.dataset.skin : ''
function setSkin(skin) {
  S.skin = skin
  if (skin) localStorage.setItem('skin', skin)
  else localStorage.removeItem('skin')
  if (skin) document.documentElement.dataset.skin = skin
  else delete document.documentElement.dataset.skin
  S.viewer?.close()
  closePop()
  closeModal(false)
  PAGE_CLEAN.splice(0).forEach((fn) => fn())
  S.wall = null
  if (skin !== 'feishu') imUnmount()
  if (skin !== 'linuxdo') ldUnmount()
  S.bgKey = null
  syncTab()
  applyLook()
  renderActions()
  route()
  toast(skin ? `已伪装成${skin === 'feishu' ? '飞书' : ' LINUX DO 帖子'} · 连按两下 Esc 切到云文档` : '已回到尽欢')
}

// ---------- 伪装：飞书聊天界面 ----------
// 每天的图是一个「群」，每张图是一条消息；回应 / 表情 / 评论 / 收藏都照常可用
const IM_GROUPS = ['产品需求评审', '研发周会', '设计走查', '增长数据复盘', '客户成功', '项目管理办公室', '技术委员会', '运营协同', '质量保障', '平台架构', '市场活动筹备', '效能改进']
const IM_COLORS = ['#3370FF', '#14B8A6', '#FF7D00', '#7B61FF', '#22C55E', '#00B4D8', '#F59E0B', '#EF4444', '#0FA0A8', '#8B5CF6']
let IM = null
const dayNo = (day) => Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000)
const clock = (ts) => { const d = new Date(ts * 1000); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
// 伪装飞书：搬运来的帖子发帖人都是同一个号，聊天里全是一个人说话不像样；按帖子编号固定配一个「同事」名字
const IM_NAMES = ['张伟', '王芳', '李静', '刘洋', '陈晨', '杨帆', '赵磊', '黄婷', '周宇', '吴昊', '徐蕾', '孙浩', '马超然', '朱琳', '胡斌', '郭佳', '何雨', '林峰', '罗敏', '高翔',
  '梁爽', '宋涛', '郑楠', '谢雯', '韩冰', '唐亮', '冯悦', '于洁', '董鹏', '萧然', '程诚', '曹露', '袁野', '邓可', '许诺', '傅航', '沈清', '曾凡', '彭博', '吕青']
const imFake = (seed) => IM_NAMES[((Number(seed) || 0) * 2654435761 >>> 0) % IM_NAMES.length]
const imWho = (m) => (m.source_url ? imFake(m.id) : m.author_name)
const imColor = (s) => IM_COLORS[[...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 997, 3) % IM_COLORS.length]
// 群头像统一用站标；伪装飞书时还是飞书那种「彩色方块 + 群名前两个字」，每个会话不一样
function groupAvatar(name, size = 40) {
  if (S.skin === 'feishu') {
    const t = [...name.replace(/[\s·#【】\[\]（）()]/g, '')].slice(0, 2).join('')
    return h('span', { class: 'im-gav', style: { width: size + 'px', height: size + 'px', background: imColor(name), fontSize: Math.round(size * 0.34) + 'px' } }, t)
  }
  return h('span', { class: 'im-gav logo', style: { width: size + 'px', height: size + 'px' } }, h('img', { src: '/group-logo.svg', alt: '', width: size, height: size }))
}
function convTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const t0 = new Date(); t0.setHours(0, 0, 0, 0)
  if (d >= t0) return clock(ts)
  if (d >= t0 - 86400000) return '昨天'
  if (d >= t0 - 6 * 86400000) return '周' + WEEK[d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
const previewText = (s = '') => s.replace(STICKER_RE, '[表情]').replace(/\s+/g, ' ').trim()

function imRoute() {
  S.viewer?.close()
  closePop()
  if (S.modal) closeModal(false)
  if (!IM) imMount()
  let path = location.pathname
  try { path = decodeURIComponent(path) } catch {}
  const q = new URLSearchParams(location.search).get('q')
  let m
  if ((m = path.match(/^\/m\/(\d+)$/))) imThread(Number(m[1]))
  else if ((m = path.match(/^\/t\/(.+)$/))) imOpen({ key: 't:' + m[1], title: '#' + m[1], params: { tag: m[1], sort: 'new' } })
  else if ((m = path.match(/^\/u\/(.+)$/))) imOpen({ key: 'u:' + m[1], title: m[1], person: true, params: { author: m[1], sort: 'new' } })
  else if (q) imOpen({ key: 'q:' + q, title: `搜索「${q}」`, params: { q, sort: 'new' } })
  else if ((m = path.match(/^\/chat(?:\/(\d+))?$/))) {
    const id = Number(m[1]) || 0
    const go = () => { const c = imGroupConvs().find((x) => !id || x.gid === id); if (c && IM) imOpen(c) }
    S.me && !CHAT.loaded ? loadGroups().then(go) : go()
  }
}

function imMount() {
  IM = { convs: [], tags: [], cur: null, tab: 'all', kw: '', clean: [], thread: null, threadClean: [], quote: null }
  const search = h('input', { type: 'search', placeholder: '搜索（Ctrl + K）', 'aria-label': '搜索', autocomplete: 'off' })
  search.addEventListener('input', () => { IM.kw = search.value.trim(); drawConvs() })
  search.addEventListener('keydown', (e) => {
    const q = search.value.trim()
    if (e.key === 'Enter' && q) imOpen({ key: 'q:' + q, title: `搜索「${q}」`, params: { q, sort: 'new' } })
  })
  IM.search = search
  IM.list = h('div', { class: 'im-convs' }, h('div', { class: 'spinner' }))
  IM.tabs = h('div', { class: 'im-tabs' })
  IM.rail = h('nav', { class: 'im-rail', 'aria-label': '导航' })
  IM.chat = h('section', { class: 'im-chat' }, h('div', { class: 'im-empty' }, h('span', { class: 'im-empty-mark', html: FS_MARK }), h('p', null, '选择一个会话开始聊天')))
  IM.threadEl = h('aside', { class: 'im-thread', hidden: true })
  IM.root = h('div', { class: 'im' },
    IM.rail,
    h('section', { class: 'im-list' },
      h('div', { class: 'im-list-head' },
        h('label', { class: 'im-search' }, icon('search', 'i tiny'), search),
        h('button', { class: 'im-ibtn', title: '发起', 'aria-label': '发图或建群', 'data-pop': 'implus', onclick: (e) => imPlus(e.currentTarget) }, icon('plus'))),
      IM.tabs, IM.list),
    IM.chat, IM.threadEl)
  document.body.append(IM.root)
  IM.drawRail = drawRail
  IM.offChat = onChat(() => { drawConvs(); drawRail() })
  drawRail()
  drawTabs()
  imLoadConvs()
}

function drawRail() {
  if (!IM) return
  const unread = IM.convs.reduce((a, c) => a + (c.unseen || 0), 0) + chatUnread()
  const item = (ic, label, { on, badge, onclick, pop } = {}) => h('button', { class: 'im-rail-item' + (on ? ' on' : ''), type: 'button', title: label, 'data-pop': pop || null, onclick },
    icon(ic), h('span', null, label), badge > 0 && h('i', { class: 'im-badge' }, badge > 99 ? '99+' : badge))
  IM.rail.replaceChildren(
    h('a', { class: 'im-rail-me', href: S.me ? null : loginHref(), title: S.me ? S.me.username : '登录',
      onclick: (e) => { if (S.me) { e.preventDefault(); userCard(S.me.username, e.currentTarget) } }, 'data-pop': S.me ? 'u' + S.me.username : null },
    S.me ? avatar(S.me.avatar, S.me.username, 34) : h('span', { class: 'avatar avatar-ph', style: { width: '34px', height: '34px' } }, '?')),
    item('chat', '消息', { on: true, badge: S.me ? unread : 0, onclick: () => IM.root.classList.remove('chat-open') }),
    item('calendar', '日历'),
    item('doc', '云文档', { onclick: toggleBoss }),
    item('video', '视频会议'),
    item('apps', '工作台'),
    item('contacts', '通讯录'),
    h('span', { class: 'grow' }),
    item('palette', '外观', { pop: 'look', onclick: (e) => looksPanel(e.currentTarget) }),
    item('gear', '设置', { pop: 'imset', onclick: (e) => imSettings(e.currentTarget) }))
}

function imSettings(anchor) {
  const it = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' },
    it(`内容显示：${contentLabel()}（点击切换）`, 'eye', () => setContent(nextContent())),
    it(S.blurAll ? '关闭一键模糊（B）' : '一键模糊：全部图先模糊（B）', 'eyeOff', () => setBlurAll(!S.blurAll)),
    FISH_OK() && it(FISH ? '关闭高级摸鱼（M）' : '高级摸鱼小窗（M）', 'apps', () => toggleFish()),
    it('切到云文档（老板键）', 'doc', toggleBoss),
    it('退出伪装', 'close', () => setSkin(''))),
  { key: 'imset', cls: 'pop-imset' })
}

async function imLoadConvs() {
  if (S.me && !CHAT.loaded) await loadGroups()
  const p = new URLSearchParams({ sort: 'new', ...nsfwParam() })
  try {
    const [{ days }, { tags }] = await Promise.all([api('/days?' + p), api('/tags?' + new URLSearchParams(nsfwParam()))])
    if (!IM) return
    IM.convs = days.map((d) => ({
      key: 'd:' + d.day, day: d.day, title: imGroupName(d.day), n: d.n, unseen: d.unseen,
      latest: d.latest, params: { day: d.day, sort: 'old' },
    }))
    IM.tags = tags.filter((t) => !(S.nsfwTags || []).includes(t.tag)).map((t) => ({
      key: 't:' + t.tag, title: '#' + t.tag, n: t.n, params: { tag: t.tag, sort: 'new' },
    }))
  } catch (e) {
    IM.list.replaceChildren(h('div', { class: 'im-hint' }, e.message))
    return
  }
  drawConvs()
  drawRail()
  if (!IM.cur && !location.pathname.match(/^\/(m|t|u|chat)\b/) && !new URLSearchParams(location.search).get('q')) {
    const all = [...imGroupConvs(), ...IM.convs]
    const last = all.find((c) => c.key === localStorage.getItem('im-last')) || IM.convs[0] || all[0]
    if (last && innerWidth > 760) imOpen(last)
  }
}
const imGroupName = (day) => {
  const lb = dayLabel(day)
  return `${IM_GROUPS[dayNo(day) % IM_GROUPS.length]} · ${lb.main}`
}

function drawTabs() {
  const tab = (id, label) => h('button', { class: 'im-tab' + (IM.tab === id ? ' on' : ''), onclick: () => { IM.tab = id; drawTabs(); drawConvs() } }, label)
  IM.tabs.replaceChildren(...nodes(tab('all', '消息'), S.me && tab('unread', '未读'), tab('tag', '话题')))
}

function drawConvs() {
  if (!IM) return
  let list = IM.tab === 'tag' ? IM.tags : [...imGroupConvs(), ...IM.convs]
  if (IM.tab === 'unread') list = list.filter((c) => c.unseen > 0)
  if (IM.kw) list = list.filter((c) => c.title.includes(IM.kw) || c.latest?.text?.includes(IM.kw))
  IM.list.replaceChildren(...(list.length ? list.map(convRow)
    : [h('div', { class: 'im-hint' }, IM.kw ? '回车搜索全部消息' : IM.tab === 'unread' ? '没有未读消息' : '暂无会话')]))
}

function convRow(c) {
  const sub = c.latest ? `${(c.latest.src ? imFake(c.latest.id) : c.latest.by) || ''}：${previewText(c.latest.text) || '[图片]'}` : c.sub || `${c.n} 条消息`
  return h('button', { class: 'im-conv' + (IM.cur?.key === c.key ? ' on' : ''), type: 'button', 'data-key': c.key, onclick: () => imOpen(c) },
    groupAvatar(c.title),
    h('span', { class: 'im-conv-main' },
      h('span', { class: 'im-conv-top' }, h('strong', null, c.title), h('time', null, convTime(c.latest?.at))),
      h('span', { class: 'im-conv-sub' }, h('span', null, sub), c.unseen > 0 && h('i', { class: 'im-badge' }, c.unseen > 99 ? '99+' : c.unseen))))
}

function imOpen(c) {
  if (c.gid) return imOpenGroup(c)
  IM.clean.splice(0).forEach((fn) => fn())
  IM.cur = c
  IM.quote = null
  if (c.day) localStorage.setItem('im-last', c.key)
  IM.list.querySelectorAll('.im-conv').forEach((el) => el.classList.toggle('on', el.dataset.key === c.key))
  const msgs = h('div', { class: 'im-msgs' })
  const sentinel = h('div', { class: 'im-sentinel' })
  const scroller = h('div', { class: 'im-scroll' }, msgs, sentinel)
  const st = { c, offset: 0, more: true, loading: false, msgs, sentinel, scroller, last: null }
  IM.st = st
  const count = h('span', { class: 'im-chat-n' }, c.n ? `${c.n} 条消息` : '')
  IM.chat.replaceChildren(
    h('header', { class: 'im-chat-head' },
      h('button', { class: 'im-ibtn im-back', 'aria-label': '返回', onclick: () => IM.root.classList.remove('chat-open') }, icon('chevL')),
      c.person ? avatar(null, c.title, 32) : groupAvatar(c.title, 32),
      h('span', { class: 'im-chat-title' }, h('strong', null, c.title), count),
      h('span', { class: 'grow' }),
      h('button', { class: 'im-ibtn', title: '搜索', onclick: () => IM.search.focus() }, icon('search')),
      h('button', { class: 'im-ibtn', title: '视频会议' }, icon('video')),
      h('button', { class: 'im-ibtn', title: '设置', 'data-pop': 'imset', onclick: (e) => imSettings(e.currentTarget) }, icon('more'))),
    scroller,
    imComposer(c))
  IM.root.classList.add('chat-open')
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) imLoad(st) }, { root: scroller, rootMargin: '600px' })
  io.observe(sentinel)
  IM.clean.push(() => io.disconnect())
  imLoad(st)
}

async function imLoad(st) {
  if (st.loading || !st.more || IM?.st !== st) return
  st.loading = true
  st.sentinel.replaceChildren(h('div', { class: 'spinner' }))
  try {
    const p = new URLSearchParams({ ...st.c.params, ...nsfwParam(), limit: '20', offset: String(st.offset) })
    const data = await api('/memes?' + p)
    if (IM?.st !== st) return
    st.offset = data.offset + data.items.length
    st.more = data.more
    for (const m of data.items) st.msgs.append(...imMessage(st, m))
    st.sentinel.replaceChildren(st.more ? '' : h('div', { class: 'im-sep' }, h('span', null, st.offset ? '没有更多消息了' : '暂无消息')))
  } catch (e) {
    st.sentinel.replaceChildren(h('button', { class: 'btn-text', onclick: () => { st.loading = false; imLoad(st) } }, e.message + ' · 重试'))
  } finally {
    st.loading = false
  }
  if (st.more && IM?.st === st && st.sentinel.getBoundingClientRect().top < st.scroller.getBoundingClientRect().bottom + 600) imLoad(st)
}

// 一条消息：头像 · 名字 时间 · 气泡（文字 / 图）· 表情 · 回复串；同一人 5 分钟内的连发合并头像
function imMessage(st, raw) {
  const m = syncItem(raw)
  const out = []
  const day = dayOf(m.created_at)
  if (st.last?.day !== day) {
    const lb = dayLabel(day)
    out.push(h('div', { class: 'im-sep' }, h('span', null, `${lb.main} ${lb.sub}`)))
  }
  const who = imWho(m)
  const fake = who !== m.author_name
  const cont = st.last && st.last.day === day && st.last.by === who && Math.abs(st.last.at - m.created_at) < 300
  st.last = { day, by: who, at: m.created_at }
  const slot = 'im' + m.id
  const rx = h('div', { class: 'im-rx' })
  const thread = h('div', { class: 'im-th' })
  const dot = h('i', { class: 'im-new', title: '未读' })
  const draw = (x) => {
    rx.replaceChildren(...imReactions(x, slot))
    thread.replaceChildren(...imThreadLink(x))
    dot.hidden = isSeen(x)
  }
  draw(m)
  const text = cardText(m)
  const media = cardMedia(m)
  const el = h('div', { class: 'im-msg' + (cont ? ' cont' : ''), 'data-id': m.id },
    h('div', { class: 'im-msg-side' }, cont ? h('time', null, clock(m.created_at)) : avatar(fake ? null : m.author_avatar, who, 36)),
    h('div', { class: 'im-msg-main' },
      !cont && h('div', { class: 'im-msg-head' },
        h('button', { class: 'im-name', type: 'button', 'data-pop': 'u' + m.author_name, onclick: (e) => !fake && userCard(m.author_name, e.currentTarget) }, who),
        h('time', { title: new Date(m.created_at * 1000).toLocaleString('zh-CN', { hour12: false }) }, clock(m.created_at)), dot),
      text && h('div', { class: 'im-bubble' }, text),
      media && h('div', { class: 'im-media' }, media),
      rx, thread),
    imTools(m, slot))
  IM.clean.push(watchItem(m.id, draw))
  if (!isSeen(m)) seenIO.observe(el)
  out.push(el)
  return out
}

// 看过一条：会话和导航栏的未读数跟着减
function imSeen(m) {
  if (!IM || !S.me) return
  const c = IM.convs.find((x) => x.day === dayOf(m.created_at))
  if (!c || !(c.unseen > 0)) return
  c.unseen--
  const row = IM.list.querySelector(`.im-conv[data-key="${CSS.escape(c.key)}"]`)
  if (row) row.replaceWith(convRow(c))
  drawRail()
}

function imReactions(m, slot) {
  const likes = (m.ld_likes || 0) + (m.like_count || 0)
  const chips = m.reactions.filter((r) => r.count > 0).slice(0, 10).map((r) =>
    h('button', { class: 'im-chip' + (r.mine ? ' on' : ''), title: emoLabel(r.emoji), onclick: () => { if (requireLogin()) toggleReaction(ITEMS.get(m.id) || m, r.emoji) } },
      emo(r.emoji), h('span', null, r.count)))
  return nodes(
    likes > 0 && h('button', { class: 'im-chip like' + (m.liked ? ' on' : ''), title: '点赞', onclick: () => { if (requireLogin()) toggleLike(ITEMS.get(m.id) || m) } },
      icon('heart', 'i tiny'), h('span', null, fmtN(likes))),
    chips,
    (likes > 0 || chips.length > 0) && h('button', { class: 'im-chip add', title: '添加表情', 'data-pop': slot + 'e',
      onclick: (e) => { if (requireLogin()) openPop(e.currentTarget, emojiPanel(ITEMS.get(m.id) || m), { key: slot + 'e', cls: 'pop-emo' }) } }, icon('emojiAdd', 'i tiny')))
}

function imThreadLink(m) {
  const n = (m.reply_count || 0) + (m.comment_count || 0)
  if (!n) return []
  const faces = (m.replies || []).slice(0, 3)
  return [h('button', { class: 'im-th-link', type: 'button', onclick: () => imThread(m.id) },
    h('span', { class: 'im-faces' }, faces.map((r) => avatar(r.avatar, r.name || r.username, 18))),
    `${n} 条回复`, h('span', { class: 'muted' }, m.comment_count ? ` · ${m.comment_count} 条评论` : ''), icon('chevR', 'i tiny'))]
}

function imTools(m, slot) {
  const b = (ic, title, onclick, extra = {}) => h('button', { class: 'im-tool', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  return h('div', { class: 'im-tools' },
    b('emojiAdd', '表情回复', (e) => { if (requireLogin()) openPop(e.currentTarget, emojiPanel(ITEMS.get(m.id) || m), { key: slot + 'e', cls: 'pop-emo' }) }, { 'data-pop': slot + 'e' }),
    b('heart', '点赞', () => { if (requireLogin()) toggleLike(ITEMS.get(m.id) || m) }),
    b('reply', '回复', () => imQuote(ITEMS.get(m.id) || m)),
    b('chat', '回复串', () => imThread(m.id)),
    b('bookmark', '收藏', (e) => doFav(ITEMS.get(m.id) || m, e.currentTarget, slot), { 'data-pop': slot + 'f', 'data-slot': slot }),
    b('more', '更多', (e) => moreMenu(ITEMS.get(m.id) || m, e.currentTarget, slot + 'm'), { 'data-pop': slot + 'm' }))
}

// 引用某条消息，底部输入框发出去就是这张图的评论
function imQuote(m) {
  IM.quote = m
  const q = IM.chat.querySelector('.im-quote')
  if (!q) return
  q.hidden = false
  q.replaceChildren(icon('reply', 'i tiny'), h('span', null, `回复 ${imWho(m)}：${previewText(m.title || m.text || '') || '[图片]'}`),
    h('button', { class: 'im-ibtn sm', 'aria-label': '取消回复', onclick: () => { IM.quote = null; q.hidden = true } }, icon('close')))
  IM.chat.querySelector('.im-compose textarea')?.focus()
}

// 输入框：带图 = 直接发一张梗图到今天的群；回复某条 = 那张图的评论
function imComposer(c) {
  const ta = h('textarea', { rows: 1, maxlength: 1000, placeholder: `发图到 ${c.title}，或先点消息上的「回复」再说话` })
  const quote = h('div', { class: 'im-quote', hidden: true })
  const att = attachSlot()
  const send = async () => {
    const body = ta.value.trim()
    if (!body && !att.file) return
    if (!requireLogin()) return
    try {
      if (att.file) {
        const id = await quickPost({ att, text: body, tags: c.params?.tag || '' })
        if (!id) return
        ta.value = ''
        att.clear()
        imAfterPost(id)
        return
      }
      const m = IM.quote
      if (!m) return toast('说点什么…', 'err')
      await api(`/memes/${m.id}/comments`, { method: 'POST', body: { body } })
      const x = ITEMS.get(m.id) || m
      syncItem({ ...x, comment_count: (x.comment_count || 0) + 1 })
      ta.value = ''
      IM.quote = null
      quote.hidden = true
      toast('已发送', 'ok')
      if (IM.thread === m.id) imThread(m.id)
    } catch (e) { toast(e.message, 'err') }
  }
  sendOnModEnter(ta, send)
  const tb = (ic, title, onclick, extra = {}) => h('button', { class: 'im-ibtn sm', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  const box = h('div', { class: 'im-compose' },
    quote, att.el, att.input, ta,
    h('div', { class: 'im-compose-bar' },
      tb('smile', '表情', (e) => openPop(e.currentTarget, stickerPicker((k) => { closePop(); insertAtCursor(ta, k) }), { key: 'imstk', cls: 'pop-stk', up: true }), { 'data-pop': 'imstk' }),
      tb('image', '发图片', att.pick),
      tb('more', '更多发图选项', openCompose),
      h('span', { class: 'grow' }),

      tb('send', '发送', send)))
  acceptImages(box, ta, att)
  return box
}

// 回复串：右侧抽屉，里面是一句回应和评论
async function imThread(id) {
  IM.threadClean.splice(0).forEach((fn) => fn())
  IM.thread = id
  const el = IM.threadEl
  el.hidden = false
  IM.root.classList.add('thread-open')
  el.replaceChildren(h('header', { class: 'im-thread-head' }, h('strong', null, '回复串'), h('span', { class: 'grow' }),
    h('button', { class: 'im-ibtn', 'aria-label': '关闭', onclick: imCloseThread }, icon('close'))), h('div', { class: 'spinner' }))
  try {
    const { meme } = await api(`/memes/${id}`)
    if (IM?.thread !== id) return
    const m = syncItem(meme)
    const replies = h('div', { class: 'im-thread-replies' })
    const draw = (x) => { if (!replies.contains(document.activeElement)) replies.replaceChildren(replyBlock(x, { compact: false })) }
    draw(m)
    IM.threadClean.push(watchItem(m.id, draw))
    const media = cardMedia(m)
    el.replaceChildren(
      el.firstChild,
      h('div', { class: 'im-thread-body' },
        h('div', { class: 'im-thread-root' },
          h('div', { class: 'im-msg-head' }, avatar(imWho(m) === m.author_name ? m.author_avatar : null, imWho(m), 28), h('strong', null, imWho(m)), h('time', null, fmtTime(m.created_at))),
          (m.title || m.text) && h('div', { class: 'im-bubble' }, cardText(m)),
          media && h('div', { class: 'im-media' }, media)),
        h('div', { class: 'im-thread-sec', 'aria-label': 'Boost 回应', title: 'Boost 回应' }, icon('rocket'), h('span', null, m.reply_count || 0)),
        replies,
        commentsSection(m)))
    markSeen(m)
  } catch (e) {
    el.append(h('div', { class: 'im-hint' }, e.message))
  }
}
function imCloseThread() {
  IM.threadClean.splice(0).forEach((fn) => fn())
  IM.thread = null
  IM.threadEl.hidden = true
  IM.root.classList.remove('thread-open')
  if (location.pathname.startsWith('/m/')) history.replaceState({ inApp: true }, '', '/')
}
function imUnmount() {
  if (!IM) return
  IM.offChat?.()
  IM.clean.splice(0).forEach((fn) => fn())
  IM.threadClean.splice(0).forEach((fn) => fn())
  IM.root.remove()
  IM = null
}

// ---------- 老板键：连按两下 Esc 切到一篇飞书云文档 ----------
let BOSS = null
let escAt = -Infinity
function bossTitle() {
  const d = new Date()
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1} 项目复盘与规划`
}
// ---------- 高级摸鱼：单贴悬浮窗（仅桌面） ----------
// 按图廊「最新」顺序一张张看；默认停在最新一张没看过的；滚轮 / 上下按钮切换；` 键全透明 ↔ 恢复上次设置的透明度
const FISH_OK = () => matchMedia('(min-width: 900px) and (pointer: fine)').matches
const fishPrefs = () => { try { return JSON.parse(localStorage.getItem('fish')) || {} } catch { return {} } }
const saveFish = (x) => localStorage.setItem('fish', JSON.stringify({ ...fishPrefs(), ...x }))
let FISH = null

function toggleFish(on = !FISH) {
  if (!on) {
    FISH?.close()
    saveFish({ open: false })
    return
  }
  if (FISH) return FISH.pip?.focus()
  if (!FISH_OK()) return toast('高级摸鱼只在电脑上可用', 'err')
  saveFish({ open: true })
  document.querySelector('.fish-resume')?.remove()
  openFish()
  // 还在这次点击 / 按键里，才允许弹窗口
  if (FISH.popOut()) return
  FISH.mountPage()
  toast('独立窗口被浏览器拦了，先放在页面里；地址栏右侧允许本站弹出窗口后，点小窗右上角的图钉再弹', 'err')
}
// 刷新后浏览器不让自动弹窗，留个按钮点一下接着摸
function fishResume() {
  const wrap = h('div', { class: 'fish-resume' },
    h('button', { class: 'fr-go', type: 'button', onclick: () => { wrap.remove(); toggleFish(true) } }, icon('apps', 'i tiny'), '继续高级摸鱼'),
    h('button', { class: 'fr-x', type: 'button', 'aria-label': '不用了', title: '不用了', onclick: () => { wrap.remove(); saveFish({ open: false }) } }, icon('close', 'i tiny')))
  document.body.append(wrap)
}

function openFish() {
  const pf = fishPrefs()
  const F = { list: [], i: 0, off: 0, more: true, ghost: false, op: pf.op ?? 0.92, side: false, unwatch: null, busy: false }
  FISH = F
  const no = h('span', { class: 'fish-no' })
  const status = h('span', { class: 'fish-st muted' })
  const body = h('div', { class: 'fish-body' })
  const side = h('aside', { class: 'fish-side', hidden: true })
  const jump = h('input', { class: 'input sm fish-jump', inputmode: 'numeric', placeholder: '跳到 No.', 'aria-label': '跳到第几号帖',
    onkeydown: (e) => { if (e.key === 'Enter') { const n = Number(jump.value.replace(/\D/g, '')); if (n) goId(n); jump.value = ''; jump.blur() } } })
  const btn = (ic, label, fn, cls = '') => h('button', { class: 'btn-icon ghost sm ' + cls, type: 'button', title: label, 'aria-label': label, onclick: fn }, icon(ic))
  const sideBtn = btn('chat', '展开评论', () => {
    F.side = !F.side
    drawSide()
    // 独立小窗：展开评论时把窗口拉宽，收起时还原
    if (F.pip) try { F.pip.resizeBy(F.side ? 308 : -308, 0) } catch {}
  }, 'fish-cbtn')
  F.top = !!pf.top
  // 独立窗口里：图钉切换置顶。浏览器自己做不到，状态写进窗口标题，本机的摸鱼助手看到后把窗口置顶 / 调透明
  // 页面里（弹窗被拦时）：图钉 = 弹成独立窗口
  const pinBtn = btn('pin', '', () => {
    if (!F.pip) {
      if (F.popOut()) return
      return say('还是被拦了：地址栏右侧允许本站弹出窗口后再点')
    }
    F.top = !F.top
    saveFish({ top: F.top })
    paint()
    say(F.top ? '已置顶（要开着摸鱼助手）' : '已取消置顶')
  }, 'fish-pin')
  const drawPin = () => {
    const lb = !F.pip ? '弹成独立窗口' : F.top ? '已置顶，点一下取消（要开着摸鱼助手）' : '没置顶，点一下置顶（要开着摸鱼助手）'
    pinBtn.title = pinBtn.ariaLabel = lb
    pinBtn.classList.toggle('on', !!F.pip && F.top)
  }
  drawPin()
  const note = h('div', { class: 'fish-note', role: 'status' })
  const say = (msg) => {
    if (!F.pip) return toast(msg)
    note.textContent = msg
    note.classList.add('show')
    clearTimeout(F.nt)
    F.nt = setTimeout(() => note.classList.remove('show'), 1800)
  }
  const range = h('input', { type: 'range', min: 0, max: 100, value: Math.round(F.op * 100), 'aria-label': '窗口不透明度，拉到最左完全看不见',
    oninput: () => { F.op = range.value / 100; F.ghost = false; saveFish({ op: F.op }); paint() } })
  const head = h('div', { class: 'fish-head' }, no, status, h('span', { class: 'grow' }), jump,
    btn('ext', '打开详情', () => { const m = F.list[F.i]; if (m) { navigate(memeHref(m)); window.focus() } }), sideBtn, pinBtn, btn('close', '关闭摸鱼窗', () => toggleFish(false)))
  const foot = h('div', { class: 'fish-foot' },
    btn('chevL', '上一贴（更新的）', () => step(-1), 'fish-up'), btn('chevR', '下一贴（更早的）', () => step(1), 'fish-down'),
    h('span', { class: 'fish-pos muted' }), h('span', { class: 'grow' }),
    h('label', { class: 'fish-op', title: '窗口不透明度，拉到最左完全看不见（独立窗口要开着摸鱼助手才能透出后面的软件）。` 键：隐身 / 恢复；按住 ` 键：临时完全显示' }, icon('eye', 'i tiny'), range))
  const main = h('div', { class: 'fish-main' }, head, body, foot, note)
  const root = h('div', { class: 'fish', role: 'dialog', 'aria-label': '摸鱼悬浮窗' }, main, side)
  const box = pf.box || { x: innerWidth - 400, y: innerHeight - 620, w: 360, h: 560 }
  const clamp = () => {
    box.x = Math.min(Math.max(0, box.x), innerWidth - 120)
    box.y = Math.min(Math.max(0, box.y), innerHeight - 60)
    Object.assign(root.style, { left: box.x + 'px', top: box.y + 'px' })
    Object.assign(main.style, { width: box.w + 'px', height: box.h + 'px' })
  }
  clamp()
  function paint() {
    const op = F.peek ? 1 : F.ghost ? 0 : F.op
    if (F.pip) {
      // 独立窗口：不改内容的透明度（那样只会发白），整扇窗口的透明交给摸鱼助手
      root.style.opacity = ''
      root.classList.remove('ghost')
      F.pip.document.title = `尽欢 · 摸鱼 · ${Math.round(op * 100)}%` + (F.top ? ' · 置顶' : '')
    } else {
      root.style.opacity = op
      root.classList.toggle('ghost', op === 0)
    }
    drawPin()
  }
  paint()
  F.toggleGhost = () => {
    // 已经拉到 0 了：点 ` 直接恢复成完全显示
    if (!F.ghost && F.op < 0.05) { F.op = 1; range.value = 100; saveFish({ op: 1 }) }
    else F.ghost = !F.ghost
    paint()
  }
  // ` 键：点一下隐身 / 恢复；按住不放临时完全显示，松开回到原来的透明度
  F.onKey = (e, down) => {
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return false
    e.preventDefault()
    if (down) {
      if (e.repeat && !F.peek) { F.peek = true; paint() }
      return true
    }
    if (F.peek) { F.peek = false; paint() }
    else F.toggleGhost()
    return true
  }
  const showErr = (msg) => body.replaceChildren(h('div', { class: 'fish-empty muted' }, msg))
  function draw(m) {
    const meta = h('div', { class: 'fish-meta' }, avatar(m.author_avatar, m.author_name, 20), authorLink(m),
      h('span', { class: 'muted' }, fmtTime(m.created_at)))
    body.replaceChildren(...nodes(cardMedia(m), cardText(m), meta,
      h('div', { class: 'fish-replies' }, replyBlock(m, { compact: true }))))
  }
  function drawSide() {
    const m = F.list[F.i]
    side.hidden = !F.side
    root.classList.toggle('side-left', !F.pip && box.x + main.offsetWidth + 340 > innerWidth)
    sideBtn.classList.toggle('on', F.side)
    sideBtn.title = F.side ? '收起评论' : '展开评论'
    if (F.side && m) side.replaceChildren(h('div', { class: 'fish-side-head' }, `评论 · No.${m.id}`), commentsSection(m, { compact: true }))
  }
  function show() {
    F.unwatch?.()
    root.classList.remove('zoom')
    const m0 = F.list[F.i]
    if (!m0) return showErr('这里没有图')
    const m = syncItem(m0)
    no.textContent = 'No.' + m.id
    status.textContent = isSeen(m) ? '看过' : '新'
    foot.querySelector('.fish-pos').textContent = F.total ? `第 ${F.off + F.i + 1} / ${F.total} 张` : ''
    draw(m)
    body.scrollTop = 0
    drawSide()
    markSeen(m)
    saveFish({ id: m.id })
    F.unwatch = watchItem(m.id, (x) => {
      if (F.list[F.i]?.id !== x.id) return
      const r = body.querySelector('.fish-replies')
      if (r && !r.contains(body.ownerDocument.activeElement)) r.replaceChildren(replyBlock(x, { compact: true }))
    })
    if (F.i >= F.list.length - 3) more()
  }
  const load = (extra) => api('/memes?' + new URLSearchParams({ sort: 'new', ...nsfwParam(), limit: 20, ...extra }))
  function take(data) {
    if (data.total != null) F.total = data.total
    return data.items
  }
  async function more() {
    if (F.busy || !F.more) return
    F.busy = true
    try {
      const data = await load({ offset: F.off + F.list.length })
      const have = new Set(F.list.map((x) => x.id))
      F.list.push(...take(data).filter((x) => !have.has(x.id)))
      F.more = data.more
    } catch {} finally { F.busy = false }
  }
  async function prepend() {
    if (F.busy || F.off <= 0) return false
    F.busy = true
    try {
      const n = Math.min(20, F.off)
      const data = await load({ offset: F.off - n, limit: n })
      const have = new Set(F.list.map((x) => x.id))
      const add = take(data).filter((x) => !have.has(x.id))
      F.list.unshift(...add)
      F.i += add.length
      F.off -= n
      return add.length > 0
    } catch { return false } finally { F.busy = false }
  }
  async function step(d) {
    if (d < 0 && F.i === 0) {
      if (!(await prepend())) return say('已经是最新一张了')
    }
    if (d > 0 && F.i >= F.list.length - 1) {
      await more()
      if (F.i >= F.list.length - 1) return say('已经到底了')
    }
    F.i += d
    show()
  }
  async function goId(id, quiet) {
    try {
      const data = await load({ focus: id })
      const items = take(data)
      const k = items.findIndex((x) => x.id === id)
      if (k < 0) { if (!quiet) say(`没有 No.${id}（可能被删了或被筛掉了）`, 'err'); return false }
      F.list = items
      F.off = data.offset
      F.more = data.more
      F.i = k
      show()
      return true
    } catch (e) { if (!quiet) say(e.message, 'err'); return false }
  }
  // 滚轮：内容滚到头再继续滚就切贴；触控板惯性要停一下才会切下一张
  let wheelAt = 0, wheelAcc = 0
  body.addEventListener('wheel', (e) => {
    const atTop = body.scrollTop <= 0, atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 2
    if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atTop)) { wheelAcc = 0; return }
    e.preventDefault()
    const t = performance.now()
    const quiet = t - wheelAt > 220
    wheelAt = t
    if (!quiet) return
    wheelAcc += e.deltaY
    if (Math.abs(wheelAcc) < 20) return
    step(wheelAcc > 0 ? 1 : -1)
    wheelAcc = 0
  }, { passive: false })
  // 拖标题栏移动，右下角拖改大小
  head.addEventListener('pointerdown', (e) => {
    if (F.pip || e.button !== 0 || e.target.closest('button, input, a')) return
    const sx = e.clientX - box.x, sy = e.clientY - box.y
    head.setPointerCapture(e.pointerId)
    // 触控板轻点拖动时 pointerup 偶尔丢：没按着键了（buttons = 0）、丢了捕获、被系统取消，都当松手，免得窗口一直跟着鼠标跑
    let done = false
    const up = () => {
      if (done) return
      done = true
      head.removeEventListener('pointermove', mv)
      head.removeEventListener('pointerup', up)
      head.removeEventListener('pointercancel', up)
      head.removeEventListener('lostpointercapture', up)
      try { head.releasePointerCapture(e.pointerId) } catch {}
      saveFish({ box })
    }
    const mv = (ev) => {
      if (ev.pointerId !== e.pointerId) return
      if (ev.pointerType === 'mouse' && ev.buttons === 0) return up()
      box.x = ev.clientX - sx; box.y = ev.clientY - sy; clamp()
    }
    head.addEventListener('pointermove', mv)
    head.addEventListener('pointerup', up)
    head.addEventListener('pointercancel', up)
    head.addEventListener('lostpointercapture', up)
  })
  const ro = new ResizeObserver(() => {
    if (!main.isConnected || F.pip) return
    box.w = main.offsetWidth
    box.h = main.offsetHeight
    clearTimeout(F.rt)
    F.rt = setTimeout(() => saveFish({ box }), 300)
  })
  ro.observe(main)
  const onResize = () => clamp()
  addEventListener('resize', onResize)
  // 独立窗口：普通弹出窗口，切网页、最小化浏览器都还在；窗口名固定，摸鱼助手按标题找它
  F.popOut = () => {
    if (F.pip) return true
    const pb = fishPrefs().pipBox || { w: box.w, h: box.h }
    const l = Math.max(0, screen.availWidth - pb.w - 40), t = Math.max(0, screen.availHeight - pb.h - 80)
    const pw = open('', 'jh-fish', `popup,width=${pb.w},height=${pb.h},left=${l},top=${t}`)
    if (!pw) return false
    const pd = pw.document
    pd.head.replaceChildren()
    pd.body.replaceChildren()
    for (const n of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
      const c = n.cloneNode(true)
      if (n.href) c.href = n.href
      pd.head.append(c)
    }
    // 主题、配色变量、模糊、老板键状态跟主页面同步
    const html = pd.documentElement
    const mirror = () => {
      for (const at of [...html.attributes]) html.removeAttribute(at.name)
      for (const at of document.documentElement.attributes) if (at.name !== 'data-skin') html.setAttribute(at.name, at.value)
      html.classList.add('fish-pip')
    }
    mirror()
    const mo = new MutationObserver(mirror)
    mo.observe(document.documentElement, { attributes: true })
    main.style.width = main.style.height = root.style.left = root.style.top = ''
    root.classList.add('in-pip')
    pd.body.append(root)
    F.pip = pw
    pd.addEventListener('pointerdown', popOutside)
    pd.addEventListener('click', (e) => {
      const cell = e.target.closest('.fish-body .cell')
      if (!cell) return
      e.stopPropagation()
      e.preventDefault()
      root.classList.toggle('zoom')
    }, true)
    pw.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && POP) return closePop()
      F.onKey(e, true)
    })
    pw.addEventListener('keyup', (e) => F.onKey(e, false))
    pw.addEventListener('blur', () => { if (F.peek) { F.peek = false; paint() } })
    pw.addEventListener('resize', () => { clearTimeout(F.pt); F.pt = setTimeout(() => saveFish({ pipBox: { w: pw.innerWidth - (F.side ? 308 : 0), h: pw.innerHeight } }), 300) })
    // 用户关掉窗口 = 关掉摸鱼；普通弹窗有时不发 pagehide，再轮询兜底
    let gone = false
    const onGone = () => {
      if (gone) return
      gone = true
      clearInterval(poll)
      mo.disconnect()
      if (F.pip !== pw) return
      F.pip = null
      if (F.closing || F.unloading || FISH !== F) return
      if (POP && (!POP.anchor.nodeType || root.contains(POP.anchor))) closePop()
      toggleFish(false)
    }
    const poll = setInterval(() => { if (pw.closed) onGone() }, 800)
    pw.addEventListener('pagehide', onGone)
    drawPin()
    drawSide()
    paint()
    return true
  }
  // 弹窗被拦时的退路：放在当前页面里
  F.mountPage = () => {
    document.body.append(root)
    clamp()
    paint()
    drawSide()
  }
  // 主页面刷新 / 关闭时，普通弹窗不会自己关，顺手关掉（里面的脚本已经跟着页面没了）
  const onUnload = () => { F.unloading = true; F.pip?.close() }
  addEventListener('pagehide', onUnload)
  F.close = () => {
    F.closing = true
    F.pip?.close()
    removeEventListener('pagehide', onUnload)
    F.unwatch?.()
    ro.disconnect()
    removeEventListener('resize', onResize)
    root.remove()
    FISH = null
  }
  showErr('加载中…')
  ;(async () => {
    try { F.total = (await load({ limit: 1 })).total } catch {}
    // 有上次的位置：接着它往下（更早的）看；没有就从最新一张没看过的开始
    if (pf.id && (await goId(pf.id, true))) {
      if (isSeen(F.list[F.i]) && F.i < F.list.length - 1) { F.i++; show() }
      return
    }
    if (S.me) {
      try {
        const u = (await load({ unseen: '1', limit: 1 })).items[0]
        if (u && (await goId(u.id, true))) return
      } catch {}
    }
    try {
      const data = await load({ offset: 0 })
      F.list = take(data)
      F.more = data.more
      F.off = 0
      const k = F.list.findIndex((x) => !isSeen(x))
      F.i = Math.max(0, k)
      show()
    } catch (e) { showErr('加载失败：' + e.message) }
  })()
}

function toggleBoss() {
  const url = !BOSS && localStorage.getItem('bossUrl')
  if (url && /^https?:\/\//i.test(url)) { location.replace(url); return }
  if (BOSS) {
    BOSS.remove()
    BOSS = null
    document.documentElement.classList.remove('bossing')
  } else {
    closePop()
    S.viewer?.close()
    BOSS = bossDoc()
    document.body.append(BOSS)
    document.documentElement.classList.add('bossing')
    BOSS.querySelector('.boss-main').scrollTop = 0
  }
  syncTab()
}
function bossDoc() {
  const d = new Date()
  const when = `${d.getMonth() + 1}月${d.getDate()}日 ${pad(Math.max(9, d.getHours() - 1))}:${pad((d.getMinutes() * 7) % 60)}`
  const title = bossTitle()
  const el = h('div', { class: 'boss', role: 'document' })
  el.innerHTML = `
  <header class="boss-top">
    <button class="boss-back" type="button" title="返回" aria-label="返回">‹</button>
    <img class="boss-ic" src="/disguise/doc.svg" alt="">
    <div class="boss-crumb"><span>知识库</span><i>/</i><span>项目管理办公室</span><i>/</i><strong>${title}</strong></div>
    <span class="boss-saved">已保存到云端</span>
    <span class="grow"></span>
    <span class="boss-faces"><i style="background:#3370FF">产</i><i style="background:#14B8A6">研</i><i style="background:#FF7D00">设</i></span>
    <button class="boss-share" type="button">分享</button>
  </header>
  <div class="boss-body">
    <nav class="boss-tree">
      <div class="boss-tree-h">目录</div>
      <a class="on" href="#b1">一、整体结论</a><a href="#b2">二、关键数据</a><a href="#b3">三、问题复盘</a>
      <a href="#b4">四、下阶段重点</a><a href="#b5">五、风险与依赖</a><a href="#b6">六、待确认事项</a>
    </nav>
    <main class="boss-main">
      <article class="boss-page">
        <h1>${title}</h1>
        <div class="boss-meta">创建者：项目管理办公室 · 最近修改：${when}</div>
        <div class="boss-callout">📌 本文档用于周五复盘会前对齐，请各模块负责人在周四 18:00 前补充本组内容。</div>
        <h2 id="b1">一、整体结论</h2>
        <p>本季度核心目标基本达成：主链路转化率较上季度提升 <b>3.2 个百分点</b>，新版工作台完成全量发布，平均响应时长下降 18%。遗留问题集中在数据看板口径不一致和跨团队排期冲突两方面，下文分别说明。</p>
        <ul><li>里程碑按期完成 7 / 9，延期 2 项已确认新时间点</li><li>线上 P1 故障 0 起，P2 故障 2 起，均在 SLA 内恢复</li><li>用户满意度调研 NPS 42，较上季度 +5</li></ul>
        <h2 id="b2">二、关键数据</h2>
        <table>
          <thead><tr><th>指标</th><th>目标</th><th>实际</th><th>达成率</th><th>负责人</th></tr></thead>
          <tbody>
            <tr><td>周活跃用户</td><td>120 万</td><td>126.4 万</td><td><span class="boss-tag ok">105%</span></td><td>增长组</td></tr>
            <tr><td>主链路转化率</td><td>21.0%</td><td>22.6%</td><td><span class="boss-tag ok">108%</span></td><td>产品组</td></tr>
            <tr><td>平均响应时长</td><td>≤ 320ms</td><td>286ms</td><td><span class="boss-tag ok">达成</span></td><td>平台架构</td></tr>
            <tr><td>需求交付准时率</td><td>90%</td><td>84%</td><td><span class="boss-tag warn">93%</span></td><td>项目管理办公室</td></tr>
            <tr><td>自动化测试覆盖率</td><td>70%</td><td>63%</td><td><span class="boss-tag warn">90%</span></td><td>质量保障</td></tr>
          </tbody>
        </table>
        <h2 id="b3">三、问题复盘</h2>
        <h3>3.1 数据口径不一致</h3>
        <p>运营看板与财务报表对「活跃」的定义不同，导致月中两次对数返工。已由数据中台牵头统一口径，新定义自下月 1 日起生效，历史数据回刷预计 3 个工作日。</p>
        <h3>3.2 跨团队排期冲突</h3>
        <p>设计走查与研发提测时间重叠，部分需求在提测后才发现交互问题。下阶段调整为「评审 → 走查 → 开发」三段式，走查结论作为提测前置条件。</p>
        <h2 id="b4">四、下阶段重点</h2>
        <ol><li>完成权限体系重构一期，支持按项目粒度授权</li><li>上线智能排期助手灰度版本，覆盖 3 个试点团队</li><li>核心接口 P99 时延降到 500ms 以内</li><li>补齐关键链路的自动化回归用例，覆盖率提升到 75%</li></ol>
        <h2 id="b5">五、风险与依赖</h2>
        <ul><li>权限重构依赖账号中心接口改造，需对方在第 2 周前提供联调环境</li><li>灰度期间需客户成功团队配合收集反馈，每周同步一次</li></ul>
        <h2 id="b6">六、待确认事项</h2>
        <ul class="boss-todo"><li>☐ Q4 预算拆分方案（财务 BP）</li><li>☐ 试点团队名单（运营协同）</li><li>☑ 复盘会议室与时间（已订 周五 14:00）</li></ul>
      </article>
    </main>
  </div>`
  el.querySelector('.boss-back').addEventListener('click', toggleBoss)
  el.querySelectorAll('.boss-tree a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault()
    el.querySelectorAll('.boss-tree a').forEach((x) => x.classList.toggle('on', x === a))
    el.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
  return el
}

// 消息工具栏：手机长按消息出，点别处收；电脑鼠标停 1 秒才出，移走就收。小窗的 document 也要挂一份
const TOOL_SEL = '.im-msg, .cm-msg:not(.pending):not(.gone)'
// 工具栏贴着消息内容的右边出（不再钉在整行最右边，宽屏上鼠标够不着）
function placeTools(msg) {
  const t = msg.querySelector(':scope > .cm-tools')
  const main = msg.querySelector(':scope > .cm-main')
  if (!t || !main) return
  const mr = msg.getBoundingClientRect()
  let right = 0
  for (const k of main.children) right = Math.max(right, k.getBoundingClientRect().right)
  const left = Math.max(48, Math.min(right - mr.left + 6, msg.clientWidth - t.offsetWidth - 8))
  t.style.left = left + 'px'
  t.style.right = 'auto'
  const ref = msg.querySelector(':scope > .cm-ref-row')
  t.style.top = ref ? ref.getBoundingClientRect().bottom - mr.top + 4 + 'px' : ''
}
function bindMsgTools(doc) {
  const clear = (keep) => doc.querySelectorAll('.im-msg.tools, .cm-msg.tools').forEach((x) => { if (x !== keep) x.classList.remove('tools') })
  doc.addEventListener('focusin', (e) => {
    if (e.target.closest?.('.cm-tools')) { const msg = e.target.closest(TOOL_SEL); if (msg) placeTools(msg) }
  })
  if (matchMedia('(hover: hover)').matches) {
    let cur = null, timer = 0
    doc.addEventListener('mouseover', (e) => {
      const msg = e.target.closest?.(TOOL_SEL)
      // 引用是跳转入口，停留在这里不应唤出消息操作条。
      if (e.target.closest?.('.cm-ref')) {
        clearTimeout(timer)
        if (cur && !cur.querySelector('.cm-tools:focus-within, .im-tools:focus-within')) cur.classList.remove('tools')
        cur = null
        return
      }
      if (msg === cur) return
      clearTimeout(timer)
      if (cur && !cur.querySelector('.cm-tools:focus-within, .im-tools:focus-within') && !POP?.anchor?.closest?.(TOOL_SEL)) cur.classList.remove('tools')
      cur = msg
      if (msg) timer = setTimeout(() => { clear(msg); msg.classList.add('tools'); placeTools(msg) }, 1000)
    })
    return
  }
  let lp = 0, sx = 0, sy = 0, fired = false
  doc.addEventListener('touchstart', (e) => {
    fired = false
    const msg = e.target.closest(TOOL_SEL)
    if (!msg || e.touches.length > 1) return
    sx = e.touches[0].clientX; sy = e.touches[0].clientY
    clearTimeout(lp)
    lp = setTimeout(() => { fired = true; clear(msg); msg.classList.add('tools'); placeTools(msg); navigator.vibrate?.(10) }, 480)
  }, { passive: true })
  doc.addEventListener('touchmove', (e) => { if (Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 10) clearTimeout(lp) }, { passive: true })
  doc.addEventListener('touchend', () => clearTimeout(lp), { passive: true })
  doc.addEventListener('touchcancel', () => clearTimeout(lp), { passive: true })
  // 长按后系统会弹选字 / 菜单，吞掉这一下
  doc.addEventListener('contextmenu', (e) => { if (fired && e.target.closest(TOOL_SEL) && !e.target.closest('img, .media, .cm-img')) e.preventDefault() })
  doc.addEventListener('click', (e) => {
    if (fired) { fired = false; if (!e.target.closest('.cm-tools, .im-tools')) { e.preventDefault(); e.stopPropagation() } return }
    if (!e.target.closest('.cm-tools, .im-tools')) clear(null)
  }, true)
}
bindMsgTools(document)

// ---------- 群聊 ----------
// 默认群「迷友」所有登录用户自动加入；建群、拉人只有管理员能做。打开的群 3 秒轮询一次，未读数 30 秒刷一次
const CHAT = { groups: [], canManage: false, loaded: false, subs: new Set(), panes: new Set(), at: 0 }
const onChat = (fn) => { CHAT.subs.add(fn); return () => CHAT.subs.delete(fn) }
// 免打扰的群只算 @ 我的
const chatUnread = () => CHAT.groups.reduce((a, g) => a + (g.muted ? (g.at_me || 0) : (g.unread || 0)), 0)
const findGroup = (id) => CHAT.groups.find((g) => g.id === id)
const findGone = (id) => (CHAT.gone || []).find((g) => g.id === id)
// 被移出 / 自己退了的群：不给看历史，只有一张卡片 + 申请回来。被移出的不说被移出，只说群聊临时关闭
function goneView(x, { onBack } = {}) {
  const box = h('div', { class: 'chat-gone' })
  const draw = () => {
    const left = x.kind === 'left'
    box.replaceChildren(...nodes(
      h('div', { class: 'cg-mark' + (left ? ' left' : '') }, icon(left ? 'logout' : 'lock')),
      h('h2', null, left ? '你已自行退出群聊，请保持看图的纯粹' : '群聊已临时关闭'),
      h('p', { class: 'muted' }, left ? '想回来聊天，可以申请，群管理同意后就能回来。看图不受影响。' : '暂时看不到群消息。看图、发图都不受影响。'),
      findGroup(x.id) ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openGroup(x.id) }, '你已经回到群里，进去看看')
        : x.req === 0 ? h('button', { class: 'btn btn-ghost', type: 'button', disabled: true }, '已申请，等管理员处理')
          : h('button', { class: 'btn btn-primary', type: 'button', onclick: async (e) => {
            const b = e.currentTarget
            b.disabled = true
            try {
              await api(`/chat/groups/${x.id}/join-req`, { method: 'POST' })
              x.req = 0
              toast('已申请，管理员会收到提醒', 'ok')
              draw()
            } catch (err) { b.disabled = false; toast(err.message, 'err') }
          } }, '申请加入群聊'),
      x.req === 2 && !findGroup(x.id) && h('p', { class: 'muted sm' }, '上次申请没通过，过一会儿可以再申请'),
      h('div', { class: 'cg-acts' },
        onBack && h('button', { class: 'btn-text', type: 'button', onclick: onBack }, '返回'),
        h('a', { class: 'btn-text', href: '/', 'data-link': '' }, '去看图'))))
  }
  draw()
  // 管理员同意了：群列表刷新后按钮变成「进去看看」
  const off = onChat(() => { if (!box.isConnected) return off(); const y = findGone(x.id); if (y) Object.assign(x, y); draw() })
  return box
}
const goneAsGroup = (x) => ({ id: x.id, name: x.kind === 'left' ? x.name : '群聊', gone: x, members: 0, latest: null, unread: 0 })
async function loadGroups() {
  if (!S.me) return CHAT.groups
  try {
    const d = await api('/chat/groups')
    Object.assign(CHAT, { groups: d.groups, gone: d.gone || [], canManage: d.can_manage, canCreate: !!d.can_create, loaded: true, at: Date.now() })
  } catch {}
  CHAT.subs.forEach((fn) => fn())
  return CHAT.groups
}
setInterval(() => {
  if (!S.me || document.hidden) return
  CHAT.panes.forEach((p) => { if (!p.st.ownPoll) p.poll() })
  if (Date.now() - CHAT.at > 30000) loadGroups()
}, 3000)
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !S.me) return
  CHAT.panes.forEach((p) => { if (!p.st.ownPoll) p.poll() })
  loadGroups()
})
function syncChatBadges() {
  const n = chatUnread()
  syncTab()
  document.querySelectorAll('[data-chat-badge]').forEach((el) => { el.textContent = n > 99 ? '99+' : n; el.hidden = !n })
}
onChat(syncChatBadges)
const chatBadge = (cls = 'chat-badge') => { const n = chatUnread(); return h('i', { class: cls, 'data-chat-badge': '', hidden: !n }, n > 99 ? '99+' : n) }

// 正文：[quote="名字, msg:id"]…[/quote] 引用块 + 折叠 / 遮挡 / 链接 / 表情；站内图片链接下面附一张预览卡
const QUOTE_RE = /\[quote(?:="([^"]*)")?\]([\s\S]*?)\[\/quote\]/g
function richBody(text = '', opts = {}) {
  const out = []
  let last = 0
  for (const m of text.matchAll(QUOTE_RE)) {
    out.push(richText(text.slice(last, m.index).replace(/^\n+|\n+$/g, ''), opts))
    const [who, ...rest] = (m[1] || '').split(',').map((s) => s.trim())
    const ref = rest.find((s) => /^(m|msg):\d+$/.test(s))
    const qg = Number(rest.find((s) => /^g:\d+$/.test(s))?.slice(2)) || 0
    if (opts.inlineRefs && ref) {
      out.push(inlineQuote(ref, qg || opts.groupId || 0))
      last = m.index + m[0].length
      continue
    }
    const jump = ref && (ref.startsWith('m:')
      ? h('a', { class: 'quote-jump', href: `/m/${ref.slice(2)}`, 'data-link': '', title: '跳到原文' }, icon('chevR', 'i tiny'))
      : h('a', { class: 'quote-jump', href: '#msg-' + ref.slice(4), title: '跳到原文', onclick: (e) => { e.preventDefault(); jumpMsg(Number(ref.slice(4)), e.currentTarget, qg) } }, icon('chevR', 'i tiny')))
    out.push(h('aside', { class: 'quote' },
      who && h('div', { class: 'quote-title' }, h('span', { class: 'quote-who' }, who, '：'), jump),
      h('blockquote', null, richText(m[2].trim(), opts))))
    last = m.index + m[0].length
  }
  out.push(richText(text.slice(last).replace(/^\n+/, ''), opts))
  // 站内链接和 No.1234 引用都带一张预览卡，最多两张
  const own = new RegExp(location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/m/(\\d+)|(?<![\\w.])No\\.(\\d{1,7})(?!\\d)', 'g')
  const ids = [...new Set([...text.replace(QUOTE_RE, '').matchAll(own)].map((x) => Number(x[1] || x[2])))].slice(0, 2)
  return [...out, ...ids.map((id) => opts.inlineRefs ? inlineQuote('m:' + id) : onebox(id))]
}
// 公告引用：不展示旧快照，不递归展开被引用内容里的引用。
function inlineQuote(ref, gid = 0) {
  const post = ref.startsWith('m:'), id = Number(ref.slice(post ? 2 : 4))
  const jump = h('a', { class: 'quote-jump', href: post ? `/m/${id}` : '#msg-' + id,
    ...(post ? { 'data-link': '' } : { onclick: (e) => { e.preventDefault(); jumpMsg(id, e.currentTarget, gid) } }) },
    post ? '查看原帖' : '定位消息', icon('chevR', 'i tiny'))
  const who = h('strong', { class: 'quote-who' }, post ? '引用帖子' : '引用消息')
  const content = h('div', { class: 'quote-content', 'aria-live': 'polite' })
  const box = h('aside', { class: 'quote quote-inline', tabindex: 0, role: 'link', 'aria-label': post ? '查看引用帖子' : '定位引用消息',
    onclick: (e) => {
      if (e.target.closest('a,button,input,video,audio') || box.ownerDocument.getSelection()?.toString()) return
      jump.click()
    }, onkeydown: (e) => { if (e.target === box && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jump.click() } } },
    h('div', { class: 'quote-title' }, who, jump), content)
  const load = async () => {
    box.dataset.state = 'loading'
    content.replaceChildren(h('span', { class: 'muted' }, '正在加载原文…'))
    try {
      if (!post && !gid) throw Object.assign(new Error('缺少来源群'), { status: 404 })
      const d = await api(post ? `/memes/${id}` : `/chat/groups/${gid}/messages/${id}`)
      const m = post ? d.meme : d.message
      if (m.deleted) throw Object.assign(new Error('已撤回'), { status: 410 })
      who.textContent = (post ? m.author_name : m.user?.name || m.user?.username) || '佚名'
      if (post && S.content === 'hide' && isRisky(m)) {
        box.dataset.state = 'hidden'
        content.replaceChildren(h('span', { class: 'muted' }, '已按内容设置隐藏敏感帖子'))
        return
      }
      const media = (post ? m.images : m.media) || (m.image ? [{ u: m.image, t: m.thumb, w: m.width, h: m.height }] : [])
      const pics = media.filter((im) => im.k !== 'f' && !(S.content === 'hide' && im.b))
      const view = post ? { ...m, images: pics } : { id: -m.id, image: pics[0]?.u, images: pics, title: '', seen_at: 1 }
      const gallery = pics.length && h('div', { class: 'quote-media' }, pics.map((im, i) => {
        const obscured = wantBlur(view) || !!im.b
        const button = h('button', { class: 'quote-image' + (obscured ? ' blur' : ''), type: 'button',
          'aria-label': obscured ? '敏感图片，点击显示' : `查看第 ${i + 1} 张图片`,
          onclick: (e) => {
            if (button.classList.contains('blur')) { button.classList.remove('blur'); button.setAttribute('aria-label', `查看第 ${i + 1} 张图片`); return }
            openViewer(view, i, { doc: e.currentTarget.ownerDocument })
          } }, im.t || im.u ? memeImg(im.t || im.u, { loading: 'lazy', alt: `引用图片 ${i + 1}` }) : icon('play'))
        return button
      }))
      content.replaceChildren(...[
        post && m.title && h('strong', { class: 'quote-subject' }, m.title),
        h('div', { class: 'quote-body' }, richText(post ? m.content ?? m.text ?? '' : m.body || '', { md: 'lite' })),
        gallery,
        media.some((im) => im.b) && S.content === 'hide' && h('span', { class: 'muted' }, '敏感附件已隐藏'),
        ...media.filter((im) => im.k === 'f').map((im) => h('a', { class: 'quote-file', href: im.u, target: '_blank', rel: 'noopener' }, icon('link', 'i tiny'), im.n || '下载附件'))].filter(Boolean))
      box.dataset.state = 'ready'
    } catch (e) {
      box.dataset.state = 'error'
      const unavailable = [401,403,404,410].includes(e.status)
      content.replaceChildren(...[h('span', { class: 'muted' }, e.status === 401 || e.status === 403 ? '当前无法查看来源群消息' : e.status === 410 ? '原消息已撤回' : e.status === 404 ? '原内容不存在或已删除' : '原文暂时加载失败'),
        !unavailable && h('button', { class: 'btn-text sm', type: 'button', onclick: load }, '重试')].filter(Boolean))
    }
  }
  load()
  return box
}
const quoteName = (s) => String(s || '佚名').replace(/[",\]\[]/g, '')
const stripQuotes = (s = '') => s.replace(QUOTE_RE, '').trim()

// from：点的那个元素，找它所在的消息区，原消息没加载就让那个消息区去翻历史
function jumpMsg(id, from, gid) {
  const pane = from && [...CHAT.panes].find((p) => p.el.contains(from))
  if (pane && (!gid || pane.group.id === gid)) return pane.jumpTo(id)
  const el = document.querySelector(`[data-msg="${id}"]`)
  if (!el && gid) { closeModal?.(false); return openChatMsg(gid, id) }
  if (!el) return toast('原消息找不到了')
  el.scrollIntoView({ block: 'center', behavior: REDUCED.matches ? 'auto' : 'smooth' })
  flashEl(el)
}
function flashEl(el) {
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}
// 跳到的那条：变色 2 秒，旁边贴一个完整日期，一眼看出跳到了哪天
function fullDate(ts) {
  const d = new Date(ts * 1000)
  const y = d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear() + '-'
  return `${y}${pad(d.getMonth() + 1)}-${pad(d.getDate())} 周${WEEK[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function flashMsg(el, m) {
  flashEl(el)
  el.querySelector('.cm-jump-date')?.remove()
  if (!m) return
  const chip = h('span', { class: 'cm-jump-date' }, fullDate(m.created_at))
  el.append(chip)
  setTimeout(() => chip.remove(), 2600)
}

// 站内图片链接的预览卡（像论坛的 onebox）
const MEMO = new Map()
function memeById(id) {
  if (!MEMO.has(id)) MEMO.set(id, api(`/memes/${id}`).then((d) => syncItem(d.meme)).catch((e) => { MEMO.delete(id); throw e }))
  return MEMO.get(id)
}
function onebox(id) {
  const box = h('a', { class: 'onebox', href: `/m/${id}`, 'data-link': '' }, h('span', { class: 'muted' }, '加载预览…'))
  memeById(id).then((m) => {
    const im = m.images?.[0] || { u: m.image, t: m.thumb }
    box.replaceChildren(
      h('span', { class: 'ob-thumb' + (wantBlur(m) ? ' blur' : '') }, memeImg(im.t || im.u, { loading: 'lazy' })),
      h('span', { class: 'ob-main' },
        h('strong', null, m.title || previewText(m.text || '') || '一张图'),
        h('span', { class: 'muted' }, `${m.author_name || '佚名'} · ${fmtTime(m.created_at)} · ♥ ${fmtN((m.ld_likes || 0) + (m.like_count || 0))} · 评论 ${m.comment_count || 0}`)))
  }).catch(() => box.replaceChildren(h('span', { class: 'muted' }, '图片不存在或已删除')))
  return box
}
// 聊天里的图借用看大图组件；负 id 不会被当成梗图记「看过」
const chatImg = (msg) => ({ id: -msg.id, image: msg.image, images: [{ u: msg.image, w: msg.width, h: msg.height }], image_count: 1, title: '', seen_at: 1 })

// ---------- 上传：先传后发 ----------
// 图片 / GIF / 视频 / 实况（iPhone 导出的同名 JPG + MOV），单个 20MB，一次最多 12 个
const MAX_FILES = 12
const MAX_FILE = 20 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm'
const isVid = (f) => /^video\//.test(f.type) || /\.(mov|mp4|webm)$/i.test(f.name || '')
const isJpg = (f) => /^image\/(jpeg|jpg|pjpeg)$/i.test(f.type) || (!/^image\/(png|gif|webp)$/.test(f.type) && /\.jpe?g$/i.test(f.name || ''))
function checkFile(f) {
  if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name || '')) return 'HEIC 浏览器看不了：iPhone 可在 设置 → 相机 → 格式 选「兼容性最佳」，或先转成 JPG'
  if (!/^image\/(png|gif|webp)$/.test(f.type) && !isJpg(f) && !isVid(f)) return `「${f.name || '文件'}」格式不支持`
  // 动态照片是 JPG + 视频，放宽到 40MB，切开后各自再按 20MB 算；普通大图会先压缩，原图大一点也收
  if (f.size > (isJpg(f) ? MAX_FILE * 2 : /^image\/(png|webp)$/.test(f.type) ? MAX_FILE * 2 : MAX_FILE)) return `「${f.name || '文件'}」超过 20MB`
  return ''
}
// 自动压缩：超过 4MB 或长边超过 4096 的静图（GIF / 动图不动），等比缩到长边 4096、按 0.9 质量重编码；
// 截图类的长图（高宽比 > 3）只限宽不限高，保证字看得清。压完反而更大就用原图
const SHRINK_AT = 4 * 1024 * 1024
const SHRINK_EDGE = 4096
async function shrinkImage(f, { edge = SHRINK_EDGE, threshold = SHRINK_AT, keepTall = true } = {}) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) && !isJpg(f)) return f
  let bmp
  try { bmp = await createImageBitmap(f) } catch { return f }
  const { width: w, height: hh } = bmp
  const tall = keepTall && (hh / w > 3 || w / hh > 3)
  const k = tall ? Math.min(1, 2048 / Math.min(w, hh)) : Math.min(1, edge / Math.max(w, hh))
  if (f.size <= threshold && k >= 1) { bmp.close?.(); return f }
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(hh * k))
  // 浏览器画布有上限（iOS 约 1600 万像素），太大就再缩一点
  const lim = Math.min(1, Math.sqrt(16e6 / (cw * ch)))
  const c = document.createElement('canvas')
  c.width = Math.round(cw * lim); c.height = Math.round(ch * lim)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  // PNG 截图转 WebP 体积小很多又不糊；照片走 JPEG
  const type = f.type === 'image/png' || f.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const b = await new Promise((r) => c.toBlob(r, type, 0.9))
  if (!b || (b.size >= f.size && k >= 1)) return f
  const name = (f.name || 'image').replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg')
  return new File([b], name, { type })
}
// 安卓动态照片（Pixel / 三星 / 小米等）：视频是直接接在 JPG 后面的 MP4，选出来只有一个 .jpg。
// 优先按 XMP 里写的长度切；没写就找 JPG 结束后第一个 MP4 头（ftyp）
async function splitMotion(file) {
  const buf = new Uint8Array(await file.arrayBuffer())
  const n = buf.length
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
  const head = new TextDecoder('latin1').decode(buf.subarray(0, Math.min(n, 256 * 1024)))
  const isFtyp = (i) => i >= 4 && buf[i] === 0x66 && buf[i + 1] === 0x74 && buf[i + 2] === 0x79 && buf[i + 3] === 0x70 &&
    ((buf[i - 4] << 24) | (buf[i - 3] << 16) | (buf[i - 2] << 8) | buf[i - 1]) >= 8 && ((buf[i - 4] << 24) | (buf[i - 3] << 16) | (buf[i - 2] << 8) | buf[i - 1]) <= 256
  let start = -1
  const off = head.match(/MicroVideoOffset="?(\d+)/)?.[1] // 老版 Pixel
  if (off && isFtyp(n - Number(off) + 4)) start = n - Number(off)
  if (start < 0) { // 新版 Motion Photo：Container 里 MotionPhoto 那一项的长度
    const len = head.match(/Semantic="MotionPhoto"[^>]*?Length="(\d+)"/)?.[1] || head.match(/Length="(\d+)"[^>]*?Semantic="MotionPhoto"/)?.[1]
    if (len) for (let i = n - Number(len); i < n - Number(len) + 64 && i < n; i++) if (isFtyp(i + 4)) { start = i; break }
  }
  if (start < 0) { // 三星等：直接找
    for (let i = 8; i < n - 8; i++) if (buf[i] === 0x66 && buf[i + 1] === 0x74 && isFtyp(i)) { start = i - 4; break }
  }
  if (start <= 0 || n - start < 4096) return null
  const base = (file.name || 'motion').replace(/\.[^.]+$/, '')
  return {
    still: new File([buf.subarray(0, start)], base + '.jpg', { type: 'image/jpeg' }),
    video: new File([buf.subarray(start)], base + '.mp4', { type: 'video/mp4' }),
  }
}
// 读尺寸；视频顺便截第一帧当封面
function probeMedia(f, url) {
  return new Promise((ok) => {
    if (!isVid(f)) {
      const img = new Image()
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => ok({})
      img.src = url
      return
    }
    const v = document.createElement('video')
    let done = false
    const finish = (r) => { if (!done) { done = true; v.removeAttribute('src'); v.load(); ok(r) } }
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadeddata = () => { v.currentTime = Math.min(0.1, (v.duration || 1) / 2) }
    v.onseeked = () => {
      const c = document.createElement('canvas')
      const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight, 1))
      c.width = Math.round(v.videoWidth * k) || 1
      c.height = Math.round(v.videoHeight * k) || 1
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
      c.toBlob((b) => finish({ w: v.videoWidth, h: v.videoHeight, dur: v.duration, poster: b && new File([b], 'poster.jpg', { type: 'image/jpeg' }) }), 'image/jpeg', 0.82)
    }
    v.onerror = () => finish({ bad: true })
    setTimeout(() => finish({ bad: true }), 8000)
    v.src = url
  })
}
async function uploadFile(file, forWhat, as) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('for', forWhat)
  if (as) fd.append('as', as)
  return api('/uploads', { method: 'POST', body: fd })
}

// 待发的媒体托盘：选完马上在后台上传，点发送时多半已经传好
function mediaTray({ forWhat = 'meme', max = MAX_FILES } = {}) {
  // 不用 hidden（display:none 的 input 在鸿蒙等浏览器里 click() 拉不起选择器），只是视觉上藏起来；
  // 手机上 accept 放宽成 image/*,video/*，具体格式交给 checkFile 把关，不然有的系统找不到能打开的图库
  const input = h('input', { type: 'file', accept: matchMedia('(pointer: coarse)').matches ? 'image/*,video/*' : ACCEPT, multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' })
  const el = h('div', { class: 'tray', hidden: true })
  const t = { items: [], input, el, onchange: null }
  const changed = () => { draw(); t.onchange?.() }
  function start(it) {
    it.state = 'up'
    const gen = it.gen = (it.gen || 0) + 1
    const stale = () => it.gen !== gen
    it.job = (async () => {
      if (!it.split && !it.video && isJpg(it.file)) {
        it.split = true
        const mp = await splitMotion(it.file).catch(() => null)
        if (mp) Object.assign(it, { file: mp.video, still: mp.still, video: true, motion: true })
        draw()
      }
      // 大图先压一下（打过码的、GIF 不动）；托盘上显示压完的大小
      if (!it.video && !it.shrunk && !it.orig) {
        it.shrunk = true
        const before = it.file.size
        const f2 = await shrinkImage(it.file).catch(() => it.file)
        if (stale()) return
        if (f2 !== it.file) { URL.revokeObjectURL(it.url); it.file = f2; it.url = URL.createObjectURL(f2); it.from = before; it.meta = null }
      }
      if (it.file.size > MAX_FILE || it.still?.size > MAX_FILE) throw new Error('超过 20MB')
      if (!it.meta) {
        // 实况 / 动态照片的 it.url 是静图，读视频要用视频自己的地址
        const vu = it.still ? URL.createObjectURL(it.file) : it.url
        it.meta = await probeMedia(it.file, vu)
        if (vu !== it.url) URL.revokeObjectURL(vu)
      }
      if (it.meta.bad) throw new Error('这个视频读不出来，换成 MP4 试试')
      draw()
      if (it.video) {
        const still = it.still || it.meta.poster
        if (!still) throw new Error('视频截不到封面')
        const [pv, vd] = await Promise.all([uploadFile(still, forWhat), uploadFile(it.file, forWhat)])
        it.out = { key: vd.key, poster: pv.key, w: it.meta.w, h: it.meta.h, ...(it.still ? { kind: 'l' } : {}) }
      } else {
        const [r, o] = await Promise.all([uploadFile(it.file, forWhat), it.keepOrig && it.orig ? uploadFile(it.orig, forWhat) : null])
        if (stale()) return
        it.out = { key: r.key, w: it.meta.w, h: it.meta.h, ...(o ? { orig: o.key } : {}) }
      }
      if (it.blur) it.out.blur = 1
      if (!stale()) it.state = 'ok'
    })().catch((e) => { if (!stale()) { it.state = 'err'; it.err = e.message } }).finally(() => { if (!stale()) changed() })
  }
  // 局部打码后换成新文件重新传
  // 再打一次码从原图开始；勾了「保留原图」就把原图一起传上去，别人能点「看原图」
  t.edit = async (it) => {
    let src = it.orig || it.file
    // 已发出去的图：先取回来（打过码的从原图开始）
    if (it.kept) {
      try {
        const b = await (await fetch(it.kept.o || it.kept.u)).blob()
        if (!b.type.startsWith('image/')) throw 0
        src = new File([b], 'image.' + (b.type.split('/')[1] || 'png'), { type: b.type })
      } catch { return toast('这张图取不回来（可能是 linux.do 的外链图），删掉重新上传吧', 'err') }
    }
    openMasker(src, (f, o) => onMasked(it, src, f, o))
  }
  const onMasked = (it, src, f, { keep }) => {
    if (it.kept) Object.assign(it, { kept: null, orig: src, split: true, video: false })
    URL.revokeObjectURL(it.url)
    it.orig ||= it.file
    it.keepOrig = keep
    it.file = f
    it.url = URL.createObjectURL(f)
    it.meta = null
    it.out = null
    start(it)
    changed()
  }
  // 编辑帖子时，原来的图直接留着，不用重传
  t.keep = (g) => {
    t.items.push({ kept: g, url: g.u, video: !!g.v, state: 'ok', out: { keep: g.u } })
    changed()
  }
  t.redraw = () => draw()
  t.add = (files) => {
    files = [...files]
    const errs = files.map(checkFile).filter(Boolean)
    files = files.filter((f) => !checkFile(f))
    // 同名的图 + 视频当成一张实况
    const base = (f) => (f.name || '').replace(/\.[^.]+$/, '').toLowerCase()
    const vids = new Map(files.filter(isVid).map((f) => [base(f), f]))
    const used = new Set()
    for (const f of files) {
      if (used.has(f)) continue
      if (t.items.length >= max) { errs.push(`一次最多 ${max} 个`); break }
      const pair = !isVid(f) && base(f) && vids.get(base(f))
      if (isVid(f) && files.some((x) => x !== f && !isVid(x) && base(x) === base(f))) continue
      const it = pair
        ? { file: pair, still: f, video: true, url: URL.createObjectURL(f) }
        : { file: f, video: isVid(f), url: URL.createObjectURL(f) }
      if (pair) used.add(pair)
      t.items.push(it)
      start(it)
    }
    if (errs.length) toast(errs[0], 'err')
    changed()
  }
  t.remove = (it) => { URL.revokeObjectURL(it.url); t.items = t.items.filter((x) => x !== it); changed() }
  t.move = (it, d) => {
    const i = t.items.indexOf(it)
    const j = i + d
    if (j < 0 || j >= t.items.length) return
    ;[t.items[i], t.items[j]] = [t.items[j], t.items[i]]
    changed()
  }
  t.clear = () => { t.items.forEach((it) => URL.revokeObjectURL(it.url)); t.items = []; input.value = ''; changed() }
  t.busy = () => t.items.some((it) => it.state === 'up')
  // 发送时：失败的再试一次，等全部传完，返回给接口的 [{key, poster, w, h, kind}]
  t.media = async () => {
    t.items.filter((it) => it.state === 'err').forEach(start)
    draw()
    await Promise.all(t.items.map((it) => it.job))
    const bad = t.items.find((it) => it.state !== 'ok')
    if (bad) throw new Error(bad.err || '有文件没传上去')
    return t.items.map((it) => ({ ...it.out, ...(it.blur ? { blur: 1 } : {}), ...(t.car && t.items.length > 1 ? { car: 1 } : {}) }))
  }
  // 乐观显示用：本地预览地址
  t.local = () => t.items.map((it) => ({ u: it.video ? (it.still ? it.url : null) : it.url, v: it.video ? URL.createObjectURL(it.file) : undefined, w: it.meta?.w, h: it.meta?.h, k: it.still ? 'l' : it.video ? 'v' : it.file.type === 'image/gif' ? 'g' : undefined,
    ...(it.blur ? { b: 1 } : {}), ...(t.car && t.items.length > 1 ? { c: 1 } : {}) }))
  t.pick = () => input.click()
  input.addEventListener('change', () => { t.add(input.files); input.value = '' })
  // 格式 · 大小 · 尺寸 / 时长，鼠标停上去或读屏都能看到
  const fmtSize = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'
  const fmtDur = (d) => `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`
  const info = (it) => {
    if (it.kept) return [KIND_LABEL[it.kept.k] || '已发', it.kept.w && `${it.kept.w}×${it.kept.h}`].filter(Boolean).join(' · ')
    const ext = (it.file.type.split('/')[1] || it.file.name.split('.').pop() || '').replace('quicktime', 'mov').replace('jpeg', 'jpg').toUpperCase()
    const size = (it.file.size || 0) + (it.still?.size || 0)
    return [it.still ? '实况' : ext, it.from ? `${fmtSize(it.from)}→${fmtSize(size)}` : fmtSize(size), it.meta?.w && `${it.meta.w}×${it.meta.h}`, it.meta?.dur > 0 && isFinite(it.meta.dur) && fmtDur(it.meta.dur)].filter(Boolean).join(' · ')
  }
  function draw() {
    el.hidden = !t.items.length
    el.replaceChildren(...nodes(t.items.map((it, i) => {
      const thumb = it.video && !it.still && !it.kept
        ? h('video', { src: it.url, muted: true, playsinline: true, preload: 'metadata' })
        : h('img', { src: it.url, alt: '' })
      const gif = it.kept ? it.kept.k === 'g' : it.file.type === 'image/gif'
      const badge = it.kept ? KIND_LABEL[it.kept.k] : it.video ? (it.still ? '实况' : '视频') : null
      const st = it.state === 'up' ? '上传中' : it.state === 'ok' ? '已上传' : it.state === 'err' ? '上传失败：' + (it.err || '未知原因') : ''
      return h('div', { class: 'tray-it ' + (it.state || '') + (it.posted ? ' posted' : ''), title: [it.file?.name, info(it), st].filter(Boolean).join('\n'), 'aria-label': `第 ${i + 1} 个，${info(it)}，${st || '等待上传'}`, role: 'group' },
        thumb,
        badge && h('span', { class: 'kind-badge' }, badge),
        it.posted && h('span', { class: 'tray-posted' }, icon('check', 'i tiny'), '已发 No.' + it.posted),
        t.solo && t.items.length > 1 && h('button', { class: 'tray-solo' + (it.solo ? ' on' : ''), type: 'button', 'aria-pressed': it.solo ? 'true' : 'false',
          title: it.solo ? '这张单独发一帖，点一下改回合进轮播' : '这张合进轮播，点一下改成单独发一帖',
          onclick: () => { it.solo = !it.solo; changed() } }, it.solo ? '单发' : '轮播'),
        it.state === 'up' && h('span', { class: 'tray-st' }, h('span', { class: 'spinner sm' }), h('span', { class: 'tray-st-t' }, '上传中')),
        it.state === 'ok' && h('span', { class: 'tray-ok', 'aria-hidden': 'true' }, icon('check', 'i tiny')),
        it.state === 'err' && h('button', { class: 'tray-st err', type: 'button', 'aria-label': `重试，失败原因：${it.err || '未知'}`, onclick: () => { start(it); draw() } },
          h('strong', null, '失败 · 点此重试'), h('span', { class: 'tray-err-r' }, it.err || '')),
        h('span', { class: 'tray-info' }, info(it)),
        h('div', { class: 'tray-ops' },
          t.items.length > 1 && i > 0 && h('button', { type: 'button', 'aria-label': '往前挪', onclick: () => t.move(it, -1) }, icon('chevL', 'i tiny')),
          t.items.length > 1 && i < t.items.length - 1 && h('button', { type: 'button', 'aria-label': '往后挪', onclick: () => t.move(it, 1) }, icon('chevR', 'i tiny')),
          !it.video && !gif
            ? h('button', { type: 'button', 'aria-label': it.orig ? '重新打码' : '局部打码', title: it.orig ? (it.keepOrig ? '重新打码（已保留原图）' : '重新打码') : '局部打码', onclick: () => t.edit(it) }, icon('pen', 'i tiny'))
            : null,
          // 群聊：这张发出去先糊住，别人点了才看
          t.blurable && h('button', { type: 'button', class: it.blur ? 'on' : '', 'aria-pressed': it.blur ? 'true' : 'false', 'aria-label': it.blur ? '取消模糊' : '发出去先模糊',
            title: it.blur ? '已设成模糊发送，点一下取消' : '发出去先模糊（别人点了才看）', onclick: () => { it.blur = !it.blur; changed() } }, icon(it.blur ? 'eyeOff' : 'eye', 'i tiny')),
          it.motion && h('button', { type: 'button', 'aria-label': '只发照片', title: '只发照片', onclick: () => {
            Object.assign(it, { file: it.still, still: null, video: false, motion: false, meta: null, out: null })
            start(it); changed()
          } }, icon('image', 'i tiny')),
          h('button', { type: 'button', 'aria-label': '移除', onclick: () => t.remove(it) }, icon('close', 'i tiny'))))
    }), t.items.length < max && h('button', { class: 'tray-add', type: 'button', 'aria-label': '继续添加', onclick: t.pick }, icon('plus')),
    // 群聊多图：合成轮播还是平铺
    t.blurable && t.items.length > 1 && h('button', { class: 'tray-car' + (t.car ? ' on' : ''), type: 'button', 'aria-pressed': t.car ? 'true' : 'false',
      title: t.car ? '现在合成轮播发，点一下改回平铺' : '现在平铺发，点一下合成一个左右滑的轮播', onclick: () => { t.car = !t.car; changed() } }, t.car ? '轮播' : '平铺')))
  }
  return t
}
// 局部打码：在图上拖出框，选马赛克 / 模糊 / 涂黑，导出新图（原图不上传）
async function openMasker(file, onDone) {
  let bmp
  try { bmp = await createImageBitmap(file) } catch { return toast('这张图打不开', 'err') }
  const W = bmp.width, H = bmp.height
  const cv = h('canvas', { class: 'mk-cv', width: W, height: H })
  const ctx = cv.getContext('2d')
  const boxes = []
  let mode = 'mosaic'
  let drag = null
  const MODES = [['mosaic', '马赛克'], ['blur', '模糊'], ['fill', '涂黑']]
  // 按框的模式把那块画糊
  const paint = (c, b) => {
    const [x, y, w, hh] = [Math.round(b.x), Math.round(b.y), Math.max(1, Math.round(b.w)), Math.max(1, Math.round(b.h))]
    if (b.mode === 'fill') { c.fillStyle = '#111'; c.fillRect(x, y, w, hh); return }
    if (b.mode === 'mosaic') {
      // 格子大一点：长边约 18 格，小框里也至少 3×3 格以内看不出细节
      const cell = Math.max(16, Math.round(Math.max(W, H) / 18), Math.round(Math.min(w, hh) / 3))
      const sw = Math.max(1, Math.ceil(w / cell)), sh = Math.max(1, Math.ceil(hh / cell))
      const tmp = new OffscreenCanvas(sw, sh)
      const tc = tmp.getContext('2d')
      tc.drawImage(bmp, x, y, w, hh, 0, 0, sw, sh)
      c.save(); c.imageSmoothingEnabled = false
      c.drawImage(tmp, 0, 0, sw, sh, x, y, w, hh)
      c.restore()
      return
    }
    // 模糊：缩小再平滑放大（ctx.filter Safari 不认），往外多取一圈边缘不发白
    // 缩到只剩几个像素再分两级放大：比原来糊得多，也不会出现马赛克那样的方块
    const pad = Math.round(Math.min(w, hh) / 2)
    const sx = Math.max(0, x - pad), sy = Math.max(0, y - pad)
    const ex = Math.min(W, x + w + pad), ey = Math.min(H, y + hh + pad)
    const k = Math.max(32, Math.round(Math.min(w, hh) / 4))
    const tw = Math.max(1, Math.round((ex - sx) / k)), th = Math.max(1, Math.round((ey - sy) / k))
    const tiny = new OffscreenCanvas(tw, th)
    const t1 = tiny.getContext('2d')
    t1.imageSmoothingQuality = 'high'
    t1.drawImage(bmp, sx, sy, ex - sx, ey - sy, 0, 0, tw, th)
    const mid = new OffscreenCanvas(tw * 6, th * 6)
    const t2 = mid.getContext('2d')
    t2.imageSmoothingQuality = 'high'
    t2.drawImage(tiny, 0, 0, tw * 6, th * 6)
    c.save()
    c.beginPath(); c.rect(x, y, w, hh); c.clip()
    c.imageSmoothingQuality = 'high'
    c.drawImage(mid, 0, 0, mid.width, mid.height, sx, sy, ex - sx, ey - sy)
    c.restore()
  }
  const render = () => {
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(bmp, 0, 0)
    boxes.forEach((b) => paint(ctx, b))
    if (drag?.box) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, W / 400); ctx.setLineDash([8, 6])
      ctx.strokeRect(drag.box.x, drag.box.y, drag.box.w, drag.box.h); ctx.restore()
    }
    undo.disabled = !boxes.length
    done.disabled = !boxes.length
  }
  const pt = (e) => {
    const r = cv.getBoundingClientRect()
    return { x: Math.min(W, Math.max(0, (e.clientX - r.left) * W / r.width)), y: Math.min(H, Math.max(0, (e.clientY - r.top) * H / r.height)) }
  }
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); drag = { a: pt(e) } })
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return
    const b = pt(e)
    drag.box = { x: Math.min(drag.a.x, b.x), y: Math.min(drag.a.y, b.y), w: Math.abs(b.x - drag.a.x), h: Math.abs(b.y - drag.a.y), mode }
    render()
  })
  const end = () => {
    if (drag?.box && drag.box.w > 4 && drag.box.h > 4) boxes.push(drag.box)
    drag = null
    render()
  }
  cv.addEventListener('pointerup', end)
  cv.addEventListener('pointercancel', end)
  const segs = h('div', { class: 'segs small', role: 'radiogroup', 'aria-label': '打码方式' })
  const drawSegs = () => segs.replaceChildren(...MODES.map(([v, l]) => h('button', { type: 'button', class: 'seg' + (mode === v ? ' on' : ''), role: 'radio',
    'aria-checked': mode === v ? 'true' : 'false', onclick: () => { mode = v; drawSegs() } }, l)))
  drawSegs()
  const undo = h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { boxes.pop(); render() } }, '撤销')
  const done = h('button', { class: 'btn btn-primary sm', type: 'button' }, '用这张')
  const keep = h('input', { type: 'checkbox' })
  keep.checked = localStorage.getItem('maskKeep') !== '0'
  keep.addEventListener('change', () => localStorage.setItem('maskKeep', keep.checked ? '1' : '0'))
  const keepRow = h('label', { class: 'mk-keep', title: '勾上：发出去后点一下图能看原图，再点恢复打码；不勾：原图不上传，谁都看不到' }, keep, '保留原图（点一下可看）')
  const close = () => { root.remove(); bmp.close?.(); document.removeEventListener('keydown', onKey, true) }
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); boxes.pop(); render() }
  }
  document.addEventListener('keydown', onKey, true)
  done.addEventListener('click', async () => {
    drag = null
    render()
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const b = await new Promise((r) => cv.toBlob(r, type, 0.9))
    if (!b) return toast('导出失败', 'err')
    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg')
    close()
    onDone(new File([b], name, { type }), { keep: keep.checked })
  })
  const root = h('div', { class: 'masker', role: 'dialog', 'aria-modal': 'true', 'aria-label': '局部打码' },
    h('div', { class: 'mk-bar' }, h('strong', null, '局部打码'), h('span', { class: 'grow' }),
      segs, keepRow, undo, h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: close }, '取消'), done),
    h('div', { class: 'mk-stage' }, cv))
  document.body.append(root)
  render()
  done.focus()
}

// 输入框旁边的附件：聊天、飞书伪装、LINUX DO 回复共用
function attachSlot(forWhat = 'meme') {
  const t = mediaTray({ forWhat })
  t.blurable = forWhat === 'chat'
  Object.defineProperty(t, 'file', { get: () => t.items[0]?.file || null })
  Object.defineProperty(t, 'url', { get: () => t.items[0]?.url || null })
  t.set = (f) => t.add([f])
  return t
}
// 粘贴 / 拖拽图片、视频进输入区
function acceptImages(zone, input, att) {
  const pick = (list) => [...(list || [])].filter((x) => /^(image|video)\//.test(x.type) || isVid(x))
  input.addEventListener('paste', (e) => {
    const fs = pick(e.clipboardData?.files)
    if (fs.length) { e.preventDefault(); att.add(fs) }
  })
  zone.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); zone.classList.add('over') } })
  zone.addEventListener('dragleave', () => zone.classList.remove('over'))
  zone.addEventListener('drop', (e) => {
    const fs = pick(e.dataTransfer.files)
    if (!fs.length) return
    e.preventDefault()
    zone.classList.remove('over')
    att.add(fs)
  })
}

// 直接发一帖到图廊（飞书 / LINUX DO 伪装里发图都走这里）：一行短字当配文，长文当描述
async function quickPost({ att, text = '', spoiler = false, tags = '' }) {
  if (!requireLogin('发图')) return null
  if (S.me.trust_level < S.minPostTL) throw new Error(`发图需要 linux.do 信任等级 ≥ ${S.minPostTL}`)
  const one = !text.includes('\n') && text.length <= 80
  const items = await att.media()
  const { id } = await api('/memes', { method: 'POST', body: { items, title: one ? text : '', content: one ? '' : text, tags, spoiler } })
  S.bgKey = null
  return id
}

// 发送键：Enter 换行，Ctrl / ⌘ + Enter 发送（手机上点按钮）
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
const SEND_HINT = `${MOD} + Enter 发送`
const sendOnModEnter = (ta, fn) => ta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); fn() }
})
// 只有群聊反过来：Enter 发送，Ctrl / ⌘ / Shift + Enter 换行（输入法选词时的回车不算）
// 群聊输入框：表情包代码 [bb:doge] 直接显示成小图，文字照常打。对外装成 textarea（value / selectionStart / setRangeText…），
// 原来围着 textarea 写的 @ 补全、插入表情、引用、编辑都不用改
function richInput({ placeholder, label }) {
  const el = h('div', { class: 'rich-input', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, 'data-ph': placeholder, spellcheck: 'false' })
  const tail = () => h('br', { 'data-tail': '' })
  const STK1 = /\[([a-z]+):([a-z0-9_]+)\]/g
  const stkImg = (code, pack, name) => {
    const img = sticker(pack, name, 'stk ri-stk')
    img.dataset.code = code
    img.loading = 'eager'
    img.draggable = false
    return img
  }
  const textOf = (n) => n.nodeType === 3 ? n.nodeValue : n.dataset?.code ? n.dataset.code : n.nodeName === 'BR' ? (n.dataset.tail != null ? '' : '\n')
    : [...n.childNodes].map(textOf).join('') + (/^(DIV|P)$/.test(n.nodeName) && n.nextSibling ? '\n' : '')
  const read = () => [...el.childNodes].map(textOf).join('')
  // 光标位置 ↔ 字符下标
  const offsetOf = (node, off) => {
    let n = 0, done = false
    const walk = (p) => {
      for (let i = 0; i < p.childNodes.length && !done; i++) {
        if (p === node && i === off) { done = true; return }
        const c = p.childNodes[i]
        if (c === node && c.nodeType === 3) { n += off; done = true; return }
        if (c.nodeType === 3 || c.dataset?.code || c.nodeName === 'BR') n += textOf(c).length
        else { walk(c); if (!done && /^(DIV|P)$/.test(c.nodeName) && c.nextSibling) n += 1 }
      }
      if (p === node && !done) done = true
    }
    walk(el)
    return n
  }
  const pointAt = (idx) => {
    let left = idx
    for (let i = 0; i < el.childNodes.length; i++) {
      const c = el.childNodes[i]
      const len = textOf(c).length
      if (c.nodeType === 3 && left <= len) return [c, left]
      if (c.nodeType !== 3 && left < len) return [el, i + 1]
      if (c.nodeType !== 3 && left === len && c.dataset?.tail == null) return [el, i + 1]
      left -= len
    }
    const n = el.lastChild?.dataset?.tail != null ? el.childNodes.length - 1 : el.childNodes.length
    return [el, Math.max(0, n)]
  }
  let sel = [0, 0]
  const saveSel = () => {
    const s = el.ownerDocument.getSelection()
    if (!s?.rangeCount || !el.contains(s.anchorNode)) return
    const r = s.getRangeAt(0)
    sel = [offsetOf(r.startContainer, r.startOffset), offsetOf(r.endContainer, r.endOffset)]
  }
  const applySel = () => {
    if (el.ownerDocument.activeElement !== el) return
    const s = el.ownerDocument.getSelection()
    const r = el.ownerDocument.createRange()
    const [a, ao] = pointAt(sel[0]), [b, bo] = pointAt(sel[1])
    try { r.setStart(a, ao); r.setEnd(b, bo); s.removeAllRanges(); s.addRange(r) } catch {}
  }
  const render = (v) => {
    const kids = []
    let last = 0
    for (const m of v.matchAll(STK1)) {
      if (m.index > last) kids.push(v.slice(last, m.index))
      kids.push(stkImg(m[0], m[1], m[2]))
      last = m.index + m[0].length
    }
    if (last < v.length) kids.push(v.slice(last))
    el.replaceChildren(...kids, tail())
    el.classList.toggle('empty', !v)
  }
  const set = (v, caret = v.length) => { render(v); sel = [caret, caret]; applySel() }
  Object.defineProperties(el, {
    value: { get: read, set: (v) => set(String(v ?? '')) },
    selectionStart: { get: () => { if (el.ownerDocument.activeElement === el) saveSel(); return sel[0] }, set: (v) => { sel = [v, Math.max(v, sel[1])]; applySel() } },
    selectionEnd: { get: () => { if (el.ownerDocument.activeElement === el) saveSel(); return sel[1] }, set: (v) => { sel = [Math.min(sel[0], v), v]; applySel() } },
  })
  el.setSelectionRange = (a, b) => { sel = [a, b]; applySel() }
  el.setRangeText = (text, a = sel[0], b = sel[1], mode) => {
    const v = read()
    const nv = v.slice(0, a) + text + v.slice(b)
    const caret = mode === 'start' ? a : mode === 'select' ? a : a + text.length
    set(nv, caret)
    if (mode === 'select') { sel = [a, a + text.length]; applySel() }
  }
  // 程序插入完再 focus()：光标回到插入点，不跳到开头
  el.addEventListener('focus', () => requestAnimationFrame(applySel))
  // 弹出小窗时节点会换 document，不挂 document 级监听，在元素上随时记
  for (const ev of ['keyup', 'pointerup', 'touchend', 'blur']) el.addEventListener(ev, saveSel)
  // 只收纯文字：换行、粘贴、拖放都自己处理，不让浏览器塞 <div> / 样式进来
  el.addEventListener('beforeinput', (e) => {
    const t = e.inputType
    // 有些手机输入法回车发的是 insertText "\n"，一样按换行处理；不可取消的（组字中）交给 input 里的 raw 兜底重画
    const nl = t === 'insertParagraph' || t === 'insertLineBreak' || (t === 'insertText' && e.data === '\n')
    if (nl && e.cancelable) { e.preventDefault(); saveSel(); el.setRangeText('\n', sel[0], sel[1], 'end'); el.dispatchEvent(new Event('input')) }
    else if (t === 'insertFromDrop' || t.startsWith('format')) e.preventDefault()
  })
  el.addEventListener('paste', (e) => {
    if (e.defaultPrevented || e.clipboardData?.files?.length) return
    e.preventDefault()
    const text = (e.clipboardData?.getData('text/plain') || '').replace(/\r\n?/g, '\n')
    if (!text) return
    saveSel()
    el.setRangeText(text, sel[0], sel[1], 'end')
    el.dispatchEvent(new Event('input'))
  })
  // 手打的 [bb:doge] 也变成图；输入法组字时不动
  // 提示文字跟着实际内容走：输入法组字时也要立刻藏掉，不然拼音和提示叠在一起
  const syncEmpty = () => el.classList.toggle('empty', !el.textContent && !el.querySelector('img'))
  el.addEventListener('compositionstart', () => el.classList.remove('empty'))
  el.addEventListener('compositionend', syncEmpty)
  el.addEventListener('input', (e) => {
    syncEmpty()
    if (e.isComposing) return
    const v = read()
    const raw = [...el.childNodes].some((n) => n.nodeType === 3 && /\[[a-z]+:[a-z0-9_]+\]/.test(n.nodeValue)) || [...el.childNodes].some((n) => n.nodeType === 1 && !n.dataset.code && n.nodeName !== 'BR')
    if (raw) { saveSel(); const c = sel[1]; set(v, Math.min(c, v.length)) }
    else if (el.lastChild?.dataset?.tail == null) el.append(tail())
  })
  render('')
  return el
}
// 电脑：回车发送，Ctrl / Shift + 回车换行。手机（COARSE）：回车就是换行（编辑消息也一样），点发送按钮才发——
// 这里什么都不拦，换行交给 richInput 的 beforeinput（insertParagraph / insertLineBreak）或 textarea 自己
const sendOnEnter = (ta, fn) => {
  if (COARSE) { ta.setAttribute('enterkeyhint', 'enter'); return }
  ta.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    ta.setRangeText('\n', ta.selectionStart, ta.selectionEnd, 'end')
    ta.dispatchEvent(new Event('input'))
  } else fn()
  })
}

// 输入 @ 弹出群成员（群里没有的再去全站搜），↑↓ 选、回车 / Tab 补全，Esc 关
const MEMBERS = new Map()
function groupMembers(gid) {
  const c = MEMBERS.get(gid)
  if (c && (c.pending || Date.now() - c.at < 300000)) return c.p
  const entry = { at: Date.now(), pending: true, data: c?.data, p: null }
  entry.p = api(`/chat/groups/${gid}/members?view=mention`).then((d) => {
    entry.data = d.members; entry.at = Date.now(); rememberNicks(d.members); return d.members
  }).catch(() => { if (MEMBERS.get(gid) === entry) MEMBERS.delete(gid); return null }).finally(() => { entry.pending = false })
  MEMBERS.set(gid, entry)
  return entry.p
}
function mentionPicker(ta, g, recent = () => []) {
  const box = h('div', { class: 'cm-mention', role: 'listbox', hidden: true })
  let opts = []
  let sel = 0
  let at = -1
  let endAt = -1
  let token = ''
  let seq = 0
  let t = 0
  const close = () => { ++seq; clearTimeout(t); box.hidden = true; opts = []; at = -1 }
  const pick = (u) => {
    const end = ta.selectionStart
    // 键盘或脚本移动光标不会触发 input，不能沿用之前的替换范围。
    if (at < 0 || end !== endAt || ta.selectionEnd !== end || ta.value.slice(at, end) !== token) return close()
    ta.setRangeText('@' + u.username + ' ', at, end, 'end')
    close()
    ta.dispatchEvent(new Event('input'))
    ta.focus()
  }
  const draw = (status = '', retry = false) => {
    box.replaceChildren(...opts.map((u, i) => h('button', { class: 'cm-mopt' + (i === sel ? ' on' : ''), type: 'button', role: 'option', 'aria-selected': String(i === sel),
      onpointerdown: (e) => e.preventDefault(), onclick: () => pick(u) },
    avatar(u.avatar, u.name || u.username, 22), h('strong', null, u.name || u.username), h('span', { class: 'muted' }, '@' + u.username))))
    if (!opts.length && status) box.append(retry
      ? h('button', { class: 'cm-mopt', type: 'button', onpointerdown: (e) => e.preventDefault(), onclick: refresh }, status)
      : h('div', { class: 'cm-mstatus muted', role: 'status' }, status))
    box.hidden = !opts.length && !status
  }
  const refresh = (e) => {
    clearTimeout(t)
    const my = ++seq
    if (e?.isComposing) return close()
    const before = ta.value.slice(0, ta.selectionStart)
    const m = before.match(/(?:^|[\s(（，。,.!！?？:：])[@＠]([\w.\-一-龥]{0,20})$/)
    if (!m) return close()
    at = ta.selectionStart - m[1].length - 1
    endAt = ta.selectionStart
    token = ta.value.slice(at, endAt)
    const q = m[1].toLowerCase()
    const hit = (u) => !q || u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)
    // 帖子评论里没有群：用默认群的成员，再不够就全站搜
    const gid = g?.id || CHAT.groups.find((x) => x.is_default)?.id || CHAT.groups[0]?.id
    // 已到达的成员/消息作者同步显示；慢成员请求不阻塞全站搜索。
    let members = (gid && MEMBERS.get(gid)?.data) || recent()
    let users = [], memberPending = !!gid, searchPending = false, failed = false
    sel = 0
    const render = () => {
      if (my !== seq || at < 0 || !ta.isConnected) return
      const selected = opts[sel]?.username
      const unique = new Map()
      for (const u of [...members, ...users]) if (u.username && u.username !== S.me?.username && hit(u) && !unique.has(u.username)) unique.set(u.username, u)
      const list = [...unique.values()].sort((a, b) => Number(b.username.toLowerCase().startsWith(q)) - Number(a.username.toLowerCase().startsWith(q)))
      opts = list.slice(0, 8)
      sel = Math.max(0, opts.findIndex((u) => u.username === selected))
      draw(memberPending || searchPending ? '正在找人…' : failed ? '加载失败，点此重试' : '没有匹配的用户', failed && !memberPending && !searchPending)
    }
    render()
    if (gid) groupMembers(gid).then((list) => {
      if (my !== seq) return
      memberPending = false
      if (list) members = list
      else failed = true
      render()
    })
    if ((q || !gid) && opts.length < 3) {
      searchPending = true
      render()
      t = setTimeout(async () => {
        if (my !== seq) return
        if (opts.length >= 3) { searchPending = false; render(); return }
        try { users = (await api('/chat/users?q=' + encodeURIComponent(q || 'a'))).users }
        catch { failed = true }
        searchPending = false
        render()
      }, 120)
    }
  }
  ta.addEventListener('focus', () => { const gid = g?.id || CHAT.groups.find((x) => x.is_default)?.id; if (gid) groupMembers(gid) })
  ta.addEventListener('compositionstart', close)
  ta.addEventListener('compositionend', refresh)
  ta.addEventListener('input', refresh)
  ta.addEventListener('click', refresh)
  ta.addEventListener('blur', () => setTimeout(() => { if (ta.ownerDocument.activeElement !== ta) close() }, 150))
  // 比回车发送先注册，弹层开着时吃掉方向键 / 回车 / Tab / Esc
  ta.addEventListener('keydown', (e) => {
    if (box.hidden || e.isComposing || e.keyCode === 229) return
    if (!opts.length) {
      if (e.key === 'Escape' || e.key === 'Tab') close()
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation() }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; draw() }
    else if (e.key === 'Enter' || e.key === 'Tab') pick(opts[sel])
    else if (e.key === 'Escape') close()
    else return
    e.preventDefault()
    e.stopImmediatePropagation()
  })
  return { el: box, close }
}

// 一个群的消息区 + 输入框：站内群聊页、飞书伪装、LINUX DO 聊天抽屉共用，外观由各自的 CSS 决定
function chatPane(g, { onHead } = {}) {
  const st = { first: 0, last: 0, more: true, busy: false, since: 0, items: [], unreadAt: null, sentRead: 0, stick: true, done: false }
  let aiPanel, aiLoading
  async function openAi(anchor, mode = 'summary', range = '200') {
    try {
      aiLoading ||= import('/ai-chat.js?v=3fa586bb').then(({ createAiChat }) => {
        if (!st.destroyed) aiPanel = createAiChat({ pane: el, gid: g.id, h, icon, api })
      }).catch(error => { aiLoading = null; throw error })
      await aiLoading
      if (!st.destroyed) { closePop(); aiPanel.open(anchor, mode, range) }
    } catch (error) { if (!st.destroyed) toast(error.message, 'err') }
  }
  const rows = new Map()
  const list = h('div', { class: 'cm-list' })
  const topSpin = h('div', { class: 'cm-top' }, h('div', { class: 'spinner' }))
  const scroller = h('div', { class: 'cm-scroll' }, topSpin, list)
  // 消息区：历史消息层只盖这一块，输入框露在外面（在历史层里点回复 / 引用 / 编辑 / @ 看得见）
  const stage = h('div', { class: 'cm-stage' }, scroller)
  // 消息列表视图：主列表和历史消息层各一个，共用 renderRow 渲染和 pane 根上的事件委托（按消息所在的列表找视图）
  // 以后再加一种消息列表，只要 VIEWS.set(容器, 视图)，右键 / 左滑 / 操作条就都有了
  const VIEWS = new WeakMap()
  let histEl = null // 历史消息层（historyView）
  let histView = null
  const viewOf = (node) => VIEWS.get(node?.closest?.('.cm-list, .cm-hist-rows'))
  const mainView = { box: list, scrollRoot: scroller, get items() { return st.items }, rows, pane: null, unreadAt: () => st.unreadAt, find: (id) => st.items.find((x) => x.id === id) }
  VIEWS.set(list, mainView)
  const pendingSlot = () => scroller.append(pending)
  // 新消息提示：有「以下是新消息」分隔线且还没看到就先跳到分隔线，否则到底部
  const pill = h('button', { class: 'cm-pill', type: 'button', hidden: true, onclick: () => {
    closeHist()
    const mark = list.querySelector('.cm-unread')
    if (mark && mark.offsetTop - 40 > scroller.scrollTop + 4) {
      scroller.scrollTo({ top: mark.offsetTop - 40, behavior: REDUCED.matches ? 'auto' : 'smooth' })
      pill.hidden = true
      st.newN = 0
    } else toBottom(true)
  } })
  const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
  // 「N 条新消息」：记住是哪几条，往下滑看到一条就减一条，全看到了就收起
  st.newIds = []
  const recount = () => {
    if (!st.newIds.length) { pill.hidden = true; st.newN = 0; return }
    const edge = scroller.scrollTop + scroller.clientHeight
    const live = new Set(st.items.filter((m) => !m.deleted).map((m) => m.id))
    st.newIds = [...new Set(st.newIds)].filter((id) => { const r = rows.get(id); return live.has(id) && r?.isConnected && r.offsetTop + Math.min(r.offsetHeight, 40) > edge })
    st.newN = st.newIds.length
    pill.hidden = !st.newN
    if (st.newN) pill.textContent = `${st.newN} 条待阅读 ↓`
    drawDown()
  }
  // 滚动跟随（主列表、历史层、/chat、抽屉、小窗、飞书 / LD 皮肤共用这一个 pane）：
  // 只有「页面看得见、没失焦、没开历史层、贴着底部」时来新消息才跟着滚；否则只记数，右下角给「回到底部」
  const downN = h('i', { class: 'cm-down-n', hidden: true })
  const downBtn = h('button', { class: 'cm-down', type: 'button', hidden: true, title: '回到底部', 'aria-label': '回到底部',
    onclick: () => { closeHist(); toBottom(true) } }, icon('chevD', 'i tiny'), h('span', null, '回到底部'), downN)
  stage.append(downBtn)
  function drawDown() {
    const n = st.newIds.length
    // 跳转窗口（下面还有没加载的）用「回到最新消息」；历史层里有新消息才出（点了回到当前聊天的底部）
    downBtn.hidden = st.after || (histEl ? !n : nearBottom())
    downN.hidden = !n
    downN.textContent = n > 99 ? '99+' : n
    downBtn.setAttribute('aria-label', n ? `回到底部，${n} 条新消息` : '回到底部')
  }
  const toBottom = (smooth) => {
    // 跳转窗口里（往下还有没加载的）：先回到最新
    if (st.after) return backToLatest()
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth && !REDUCED.matches ? 'smooth' : 'auto' })
    pill.hidden = true
    st.newN = 0
    st.newIds = []
    st.stick = true
    drawDown()
    markRead()
  }
  // 标签页切走期间、以及切回来那一下拉到的消息：不自动滚到底，免得漏看
  const doc = scroller.ownerDocument
  // 切走（标签页隐藏，或主窗口失焦——切到别的软件）期间、以及切回来 4 秒内那次轮询拉到的，都算「人不在」。
  // 以前要离开 5 秒以上才算，切走一小会儿回来照样被拽到底部
  const away = () => doc.hidden || st.blur || (st.backAt && Date.now() - st.backAt < 4000 && st.backAt - st.hiddenAt > 1000)
  const back = () => {
    st.backAt = Date.now()
    st.awayEnd = st.backAt / 1000
    if (st.backAt - st.hiddenAt > 60000) setTimeout(showAway, 1500) // 等切回来那次轮询拉完
  }
  const onVis = () => {
    if (doc.hidden) { if (!st.blur) { st.hiddenAt = Date.now(); st.awayEnd = 0; dropAway(); st.awayDismissed = false } return }
    if (st.blur && doc.hasFocus()) st.blur = false // 有的浏览器切回标签页不发 focus
    if (!st.blur) back()
  }
  // 失焦只看主窗口：弹出的小窗本来就是给「切到别处也一直看得到」用的，照常跟着滚
  const win = doc === document ? doc.defaultView : null
  const onBlur = () => { if (st.blur || doc.hidden) return; st.blur = true; st.hiddenAt = Date.now(); st.awayEnd = 0; dropAway(); st.awayDismissed = false }
  const onFocus = () => { if (!st.blur) return; st.blur = false; if (!doc.hidden) back() }
  win?.addEventListener('blur', onBlur)
  win?.addEventListener('focus', onFocus)
  // 「你离开的 x 分钟里有 N 条新消息」：速览 / 从第一条看 / 导出
  st.awayIds = []
  let awayEl = null
  const awayMsgs = () => { const ids = new Set(st.awayIds); return st.items.filter((m) => ids.has(m.id) && !m.deleted) }
  const dropAway = () => { awayEl?.remove(); awayEl = null; st.awayIds = []; st.awayMark = false; st.awayDismissed = true }
  const meRe = () => S.me && new RegExp('@' + S.me.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w.-])', 'i')
  let awayT = 0
  function showAway() {
    const ms = awayMsgs()
    const ap = awayPrefs()
    if (!ap.on) return
    if (ms.length < 3) { awayEl?.remove(); awayEl = null; return }
    if (doc.hidden || !scroller.isConnected) return
    clearTimeout(awayT)
    if (ap.sec > 0) awayT = setTimeout(() => { awayEl?.remove(); awayEl = null }, ap.sec * 1000)
    const mins = Math.max(1, Math.round(((st.awayEnd ? st.awayEnd * 1000 : Date.now()) - (st.awayStart || st.hiddenAt)) / 60000))
    const people = new Set(ms.filter((m) => !m.system_kind).map((m) => m.user.id)).size
    const pics = ms.reduce((n, m) => n + (m.media?.length || (m.image ? 1 : 0)), 0)
    const re = meRe()
    // @ 和回复分开数：回复里带 @ 只算回复
    const repMe = ms.filter((m) => S.me && m.reply_to?.username === S.me.username)
    const atMe = ms.filter((m) => !repMe.includes(m) && re && re.test(stripQuotes(m.body || '')))
    awayEl?.remove()
    awayEl = h('div', { class: 'cm-away', role: 'status' },
      h('span', { class: 'cm-away-t' }, `你离开的 ${mins} 分钟里有 `, h('strong', null, ms.length), ' 条新消息',
        h('span', { class: 'muted' }, ` · ${people} 人说话${pics ? ` · ${pics} 张图` : ''}`),
        atMe.length > 0 && h('span', { class: 'cm-away-at' }, ` · @你 ${atMe.length} 次`),
        repMe.length > 0 && h('span', { class: 'cm-away-at' }, ` · 回复你 ${repMe.length} 次`)),
      h('span', { class: 'cm-away-acts' },
        h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: (e) => openAi(e.currentTarget, 'summary', 'away') }, 'AI 摘要'),
        h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => digest(ms, atMe, repMe, `离开的 ${mins} 分钟`, true) }, '速览'),
        h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { jumpTo(ms[0].id); dropAway() } }, '从第一条看'),
        h('button', { class: 'cm-x', type: 'button', 'aria-label': '知道了', onclick: dropAway }, icon('close', 'i tiny'))))
    el.append(awayEl)
  }
  // 速览：谁说得多、哪几条最热、@我的、有图的；点一条跳过去。也能复制成文本 / 导出 JSON 拿去让 AI 总结
  function digest(ms, atMe, repMe, title, fromAway) {
    const by = new Map()
    ms.forEach((m) => { const k = m.user.username; by.set(k, { u: m.user, n: (by.get(k)?.n || 0) + 1 }) })
    const top = [...by.values()].sort((a, b) => b.n - a.n).slice(0, 6)
    const hot = ms.map((m) => ({ m, n: (m.reactions || []).reduce((s, r) => s + r.count, 0) + ms.filter((x) => x.reply_to?.id === m.id).length }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 8)
    const withPic = ms.filter((m) => m.media?.length || m.image)
    let only = 'all'
    const out = h('div', { class: 'cms-list' })
    const msgRow = (m, note) => h('button', { class: 'cms-row', type: 'button', onclick: () => { close(); jumpTo(m.id) } },
      avatar(m.user.avatar, m.user.name || m.user.username, 28),
      h('span', { class: 'cms-main' },
        h('span', { class: 'cms-top' }, h('strong', null, m.user.name || m.user.username), h('time', null, clock(m.created_at)), note && h('span', { class: 'cm-away-at' }, note)),
        h('span', { class: 'cms-text' }, previewText(stripQuotes(m.body || '')) || ((m.media?.length || m.image) ? '[图片]' : ''))),
      (m.media?.[0]?.u || m.image) && h('img', { class: 'cms-pic', src: m.media?.[0]?.u || m.image, alt: '', loading: 'lazy' }))
    const tab = (k, label, n) => n > 0 && h('button', { class: 'notif-tab', type: 'button', 'data-k': k, onclick: () => { only = k; draw() } }, label, h('i', { class: 'notif-tab-n' }, n))
    const tabs = h('div', { class: 'notif-tabs' }, tab('all', '全部', ms.length), tab('at', '@我', atMe.length), tab('rep', '回复我', repMe.length), tab('hot', '热门', hot.length), tab('pic', '有图', withPic.length))
    const draw = () => {
      const pick = only === 'at' ? atMe : only === 'rep' ? repMe : only === 'pic' ? withPic : only === 'hot' ? hot.map((x) => x.m) : ms
      out.replaceChildren(...(pick.length ? pick.map((m) => msgRow(m, only === 'hot' ? `${hot.find((x) => x.m === m).n} 个回应` : null)) : [h('p', { class: 'muted cms-empty' }, '这一类没有')]))
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === only))
    }
    const plain = () => ms.map((m) => `[${clock(m.created_at)}] ${m.user.name || m.user.username}${m.reply_to ? ` 回复 ${m.reply_to.name || m.reply_to.username}` : ''}：${stripQuotes(m.body || '').replace(/\s+/g, ' ') || '[图片]'}`).join('\n')
    const copyAll = () => navigator.clipboard.writeText(`以下是群「${g.name}」的 ${ms.length} 条聊天记录，帮我概括聊了什么：\n\n` + plain())
      .then(() => toast('已复制，可以直接贴给 AI 让它总结', 'ok'), () => toast('复制失败', 'err'))
    const jsonData = () => {
      const data = { group: g.name, from: new Date(ms[0].created_at * 1000).toISOString(), to: new Date(ms[ms.length - 1].created_at * 1000).toISOString(), count: ms.length,
        messages: ms.map((m) => ({ id: m.id, at: new Date(m.created_at * 1000).toISOString(), user: m.user.username, name: m.user.name || m.user.username,
          text: m.body || '', images: (m.media?.length ? m.media : m.image ? [{ u: m.image }] : []).map((x) => new URL(x.u, location.origin).href),
          reply_to: m.reply_to ? { id: m.reply_to.id, user: m.reply_to.username, text: m.reply_to.text || '' } : null,
          reactions: (m.reactions || []).map((r) => ({ emoji: r.emoji, count: r.count })) })) }
      return data
    }
    // 手机上下载文件不好找，再给一个直接复制 JSON
    const copyJson = () => navigator.clipboard.writeText(JSON.stringify(jsonData(), null, 2))
      .then(() => toast('JSON 已复制', 'ok'), () => toast('复制失败', 'err'))
    const exportJson = () => {
      const data = jsonData()
      const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: `${g.name}-${ms.length}条.json` })
      doc.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    }
    const close = () => { box.remove(); if (fromAway) dropAway() }
    el.querySelector('.cm-digest')?.remove()
    const box = h('div', { class: 'cm-search cm-digest' },
      h('div', { class: 'cms-head' }, h('strong', null, `${title} · ${ms.length} 条`), h('span', { class: 'grow' }),
        h('button', { class: 'btn-text sm', type: 'button', title: '复制成纯文本，带一句让 AI 总结的提示', onclick: copyAll }, '复制给 AI'),
        h('button', { class: 'btn-text sm', type: 'button', title: '复制结构化数据，适合给自己的 AI / 脚本分析', onclick: copyJson }, '复制 JSON'),
        h('button', { class: 'btn-text sm', type: 'button', onclick: exportJson }, '下载 JSON'),
        h('button', { class: 'cm-x', type: 'button', 'aria-label': '关闭', onclick: close }, icon('close', 'i tiny'))),
      h('div', { class: 'cmd-who' }, top.map((x) => h('span', { class: 'cmd-p' }, avatar(x.u.avatar, x.u.name || x.u.username, 18), x.u.name || x.u.username, h('b', null, x.n)))),
      tabs, out)
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
    el.append(box)
    draw()
  }
  doc.addEventListener('visibilitychange', onVis)

  // 常驻入口：选一段聊天记录 → 速览 / 复制给 AI / 导出 JSON。不够就往前多翻几页（最多 1000 条）
  async function pickRange(anchor) {
    if (POP?.key === 'cmrange') return closePop()
    const re = meRe()
    const isRep = (m) => S.me && m.reply_to?.username === S.me.username
    const isAt = (m) => !isRep(m) && re && re.test(stripQuotes(m.body || ''))
    const live = () => st.items.filter((m) => !m.deleted && m.id > 0)
    const go = async (title, test, need) => {
      closePop()
      // 往前翻到覆盖这个范围为止
      for (let i = 0; i < 12 && st.more && live().length < 1000 && need(live()); i++) {
        const n = st.items.length
        await older()
        if (st.items.length === n) break
      }
      const ms = live().filter(test)
      if (!ms.length) return toast('这个范围里没有消息')
      digest(ms, ms.filter(isAt), ms.filter(isRep), title)
    }
    const since = (sec) => { const t = Date.now() / 1000 - sec; return [(m) => m.created_at >= t, (l) => !l.length || l[0].created_at >= t] }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const t0 = today / 1000
    const lr = st.unreadAt > 0 ? st.unreadAt : 0
    // 最近 N 条：翻够页之后再算从哪条开始
    const last = (n) => [(m) => m.id >= (live()[Math.max(0, live().length - n)]?.id || 0), (l) => l.length < n]
    const opts = [
      st.awayIds.length > 0 && ['我离开后的', (m) => st.awayIds.includes(m.id), () => false],
      lr > 0 && ['从「以下是新消息」开始', (m) => m.id >= lr, () => false],
      ['最近 1 小时', ...since(3600)],
      ['最近 3 小时', ...since(3 * 3600)],
      ['今天', (m) => m.created_at >= t0, (l) => !l.length || l[0].created_at >= t0],
      ['最近 100 条', ...last(100)],
      ['最近 300 条', ...last(300)],
    ].filter(Boolean)
    const box = h('div', { class: 'menu-list cm-range' },
      h('div', { class: 'pop-head' }, h('strong', null, '导出聊天记录'), h('span', { class: 'muted' }, ' · 速览，或交给你自己的 AI')),
      opts.map(([label, test, need]) => h('button', { class: 'menu-item', type: 'button', onclick: () => go(label, test, need) }, label)))
    openPop(anchor, box, { key: 'cmrange', up: true })
  }

  // 每条消息一行：日期分隔、「以下是新消息」和消息本体包在一起，换的时候整行换。主列表、历史层都用这一个
  const renderRowContent = (view, m, prev) => {
    // 回复别人的消息总是带头像和名字，免得看着像接在上一条后面
    const cont = prev && !prev.deleted && !m.deleted && !prev.system_kind && !m.system_kind && !m.reply_to && prev.user.id === m.user.id && m.created_at - prev.created_at < 300 && dayOf(prev.created_at) === dayOf(m.created_at)
    const kids = []
    if (!prev || dayOf(prev.created_at) !== dayOf(m.created_at)) {
      const lb = dayLabel(dayOf(m.created_at))
      kids.push(h('div', { class: 'cm-sep' }, h('span', null, `${lb.main} ${lb.sub}`)))
    }
    if (view.unreadAt?.() === m.id) kids.push(h('div', { class: 'cm-unread' }, h('span', null, '以下是新消息')))
    kids.push(chatMsg(m, { cont, pane: view.pane }))
    return kids
  }
  const renderRow = (view, m, prev) => {
    const kids = renderRowContent(view, m, prev)
    const el = h('div', { class: 'cm-row', 'data-row': m.id }, kids)
    view.rows.set(m.id, el)
    if (m.at_read) queueMicrotask(() => paintReads(view, m))
    return windowContent(el, () => {
      const current = view.find(m.id) || m
      if (current.at_read) queueMicrotask(() => paintReads(view, current))
      return renderRowContent(view, current, prev)
    }, { scrollRoot: view.scrollRoot })
  }
  const row = (m, prev) => renderRow(mainView, m, prev)
  const redrawIn = (view, i) => {
    const m = view.items[i]
    const old = view.rows.get(m?.id)
    if (old) old.replaceWith(renderRow(view, m, view.items[i - 1]))
  }
  const redraw = (i) => redrawIn(mainView, i)
  const add = (items, where) => {
    items = items.filter((m) => !rows.has(m.id))
    if (!items.length) return
    rememberNicks(items.map((m) => m.user))
    if (where === 'top') {
      const h0 = scroller.scrollHeight
      const top0 = scroller.scrollTop
      st.items = [...items, ...st.items]
      list.prepend(...items.map((m, i) => row(m, items[i - 1])))
      redraw(items.length)
      scroller.scrollTop = top0 + scroller.scrollHeight - h0
    } else {
      const was = st.items.length
      st.items = [...st.items, ...items]
      list.append(...items.map((m, i) => row(m, i ? items[i - 1] : st.items[was - 1])))
    }
    st.first = st.items[0].id
    st.last = Math.max(st.last, st.items[st.items.length - 1].id)
    // 新到的回复（轮询 / 自己刚发的）：已加载的原消息「N 条回复」跟着 +1；历史批次服务端已经算好，不用加
    if (where === 'live') items.forEach((m) => {
      // 原消息开在历史层里的也一样 +1
      const hi = m.reply_to && !m.deleted && histView ? histView.items.findIndex((x) => x.id === m.reply_to.id) : -1
      if (hi >= 0) { histView.items[hi] = { ...histView.items[hi], reply_count: (histView.items[hi].reply_count || 0) + 1 }; redrawIn(histView, hi) }
      const i = m.reply_to && !m.deleted ? st.items.findIndex((x) => x.id === m.reply_to.id) : -1
      if (i < 0) return
      st.items[i] = { ...st.items[i], reply_count: (st.items[i].reply_count || 0) + 1 }
      redraw(i)
    })
  }
  // 编辑 / 撤回 / 表情 / 回应 / 转帖 / 轮询 changed：主列表和历史层里有这条的都重画
  const update = (m) => {
    histView?.apply(m)
    const i = st.items.findIndex((x) => x.id === m.id)
    if (i < 0) return
    st.items[i] = { ...m, floor: m.floor ?? st.items[i].floor }
    redraw(i)
    redraw(i + 1)
  }

  async function older() {
    if (st.busy || !st.more) return
    st.busy = true
    try {
      const d = await api(`/chat/groups/${g.id}/messages` + (st.first ? `?before=${st.first}` : ''))
      if (st.destroyed) return
      if (!scroller.isConnected && st.first) return
      const initial = !st.first && !st.done
      if (initial) {
        st.since = d.now
        const lr = d.last_read || 0
        st.unreadAt = d.items.find((m) => m.id > lr && !m.mine)?.id ?? -1
        if (st.unreadAt === d.items[0]?.id && d.more) st.unreadAt = -1 // 未读比一页还多，就不画分隔线了
      }
      st.more = d.more
      add(d.items, initial ? 'bottom' : 'top')
      topSpin.replaceChildren(st.more ? h('div', { class: 'spinner' }) : h('div', { class: 'cm-begin' }, d.items.length || st.items.length ? `这是「${g.name}」最早的消息` : `「${g.name}」还没有消息，来说第一句`))
      if (initial) {
        const mark = list.querySelector('.cm-unread')
        if (mark) scroller.scrollTop = mark.offsetTop - 40
        else toBottom(false)
        st.done = true
        refreshReads()
        onHead?.(d.group, d.total)
        // 从提醒 / 搜索点进来的：首屏加载完再跳到那条
        if (CHAT.jump?.gid === g.id) { const id = CHAT.jump.id; CHAT.jump = null; setTimeout(() => jumpTo(id)) }
      }
    } catch (e) {
      if (e.status === 403 && !st.first) { st.busy = false; return lost(e) }
      topSpin.replaceChildren(h('button', { class: 'btn-text', onclick: () => older() }, e.message + ' · 重试'))
    } finally {
      st.busy = false
    }
    if (st.more && scroller.scrollTop < 300 && scroller.isConnected) requestAnimationFrame(() => older())
  }

  async function poll() {
    if (!st.done || st.polling) return
    if (!scroller.isConnected) return destroy()
    st.polling = true
    let more = false
    try {
      // 每轮最多追5页，其余短暂让出主线程后继续，不等下一次3秒轮询。
      for (let batch = 0; batch < 5 && scroller.isConnected && st.done; batch++) {
      const d = await api(`/chat/groups/${g.id}/messages?after=${st.last}&since=${st.since}`)
      if (st.destroyed || !scroller.isConnected) { more = false; return }
      more = !!d.more && d.items.length > 0
      st.since = d.now
      d.changed.forEach(update)
      if (st.after) { more = false; return } // 在跳转窗口里，最新的消息等回到底部再拉
      if (d.items.length) {
        const others = d.items.filter((m) => !m.mine && !m.deleted && !rows.has(m.id))
        const duringAway = others.filter((m) => !st.awayDismissed && st.hiddenAt && m.created_at >= Math.floor(st.hiddenAt / 1000) && (!st.awayEnd || m.created_at <= st.awayEnd))
        const gone = others.length > 0 && (away() || duringAway.length > 0)
        // 来新消息要不要跟着滚：在底部时跟（默认）/ 总是滚到最新 / 不自动滚（只出按钮）
        const ap = chatAuto()
        // 开着历史层：正在看旧消息，主列表也不动，只记数
        const stick = !gone && !histEl && (ap === 'always' ? true : ap === 'off' ? false : nearBottom())
        // 人不在：从第一条没看的开始画「以下是新消息」（这次离开期间已经画过就不挪）
        if (gone && !st.awayMark) {
          list.querySelectorAll('.cm-unread').forEach((el) => el.remove())
          st.unreadAt = others[0].id
          st.awayMark = true
          st.awayStart = st.hiddenAt || Date.now()
        }
        if (duringAway.length) st.awayIds = [...new Set([...st.awayIds, ...duringAway.map((m) => m.id)])]
        // 手机网络抖动时 POST 已经到了服务器、回包丢了：轮询拿到同内容的自己的消息，就把「发送中 / 没发出去」那条收掉
        d.items.forEach((m) => m.mine && inflight.find((j) => !j.done && j.body === (m.body || '') && !!j.tray === !!(m.media?.length || m.image))?.settle(m))
        add(d.items, 'live')
        if (stick) toBottom(true)
        else {
          if (gone || ap === 'off' || histEl) st.stick = false // 图片晚加载也别把人拽到底
          // 往上翻着看的时候来了新消息：一样出按钮（以前只在离开时才出）
          st.newIds.push(...others.map((m) => m.id))
          recount()
        }
      }
      if (d.changed.length) recount()
      if ((d.items.length || d.changed.length) && !doc.hidden && (awayEl || st.backAt - st.hiddenAt > 60000)) showAway()
      if (!more) break
      }
    } catch (e) { more = false; if (e.status === 403) lost(e) } finally {
      st.polling = false
      if (more && !st.destroyed && scroller.isConnected) { clearTimeout(st.catchupT); st.catchupT = setTimeout(poll, 250) }
    }
  }
  // 群里待着的时候被移出 / 在别处退了群：停掉轮询，整块换成「群聊已临时关闭」那张卡
  async function lost(e) {
    if (st.lost) return
    st.lost = true
    st.done = false
    destroy()
    await loadGroups()
    const x = findGone(g.id)
    el.replaceChildren(x ? goneView(x) : h('div', { class: 'chat-empty' }, icon('chat'), h('p', null, e.message)))
  }

  // 跳到某条消息：不在已加载的范围里，就把中间的历史一次拉下来再跳
  // 搜索结果 / 回复原文：就在当前列表里的，滚过去高亮 2 秒并标出日期；不在的，另开「历史消息」层只看那附近一段，当前聊天不动
  // 所有入口（搜索、引用条、N 条回复、公告 / 正文里的引用、提醒、历史层里再点）都走这一个：
  // 历史层开着且层里有 → 层里滚过去；主列表有 → 先收起历史层再滚主列表；都没有 → 开历史层
  async function jumpTo(id) {
    const hitIn = (view) => {
      const el = view?.rows.get(id)?.querySelector('.cm-msg')
      if (!el) return false
      if (view !== histView) closeHist()
      el.scrollIntoView({ block: 'center', behavior: REDUCED.matches ? 'auto' : 'smooth' })
      flashMsg(el, view.find(id))
      return true
    }
    const hit = () => hitIn(histView) || hitIn(mainView)
    if (hit()) return
    if (st.items.length && id > st.last && !st.after) return toast('这条消息还没加载出来')
    while (st.busy) await new Promise((r) => setTimeout(r, 80))
    if (hit()) return
    return historyView(id)
  }
  // 历史消息层：盖在消息列表上，前后各 25 条，要看更多点「更早 / 更晚」，不会无限往上翻
  function closeHist() { if (!histEl) return; histEl.remove(); histEl = null; histView = null; drawDown() }
  async function historyView(id) {
    closeHist()
    const box = h('div', { class: 'cm-hist-list' }, h('div', { class: 'spinner' }))
    const title = h('span', { class: 'cm-hist-t' }, '历史消息')
    const close = closeHist
    histEl = h('div', { class: 'cm-hist', role: 'region', 'aria-label': '历史消息' },
      h('header', { class: 'cm-hist-head' }, icon('calendar', 'i tiny'), title, h('span', { class: 'grow' }),
        h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: close }, '回到当前聊天')),
      box)
    stage.append(histEl)
    drawDown()
    // 历史层也是一个视图：同一个 renderRow、同一套委托；动作沿用主 pane 的（jumpTo / update 本来就两边都管），看大图在这一段里串
    const rowsBox = h('div', { class: 'cm-hist-rows' })
    const hv = histView = { box: rowsBox, scrollRoot: box, items: [], rows: new Map(), more: false, after: false, pane: null,
      find: (rid) => hv.items.find((x) => x.id === rid),
      apply: (m) => {
        const i = hv.items.findIndex((x) => x.id === m.id)
        if (i < 0) return
        hv.items[i] = { ...m, floor: m.floor ?? hv.items[i].floor }
        redrawIn(hv, i)
        redrawIn(hv, i + 1)
      } }
    hv.pane = { ...api_, gallery: (m, i) => galleryOf(hv.items, m, i) }
    VIEWS.set(rowsBox, hv)
    const draw = () => {
      hv.rows.clear()
      rowsBox.replaceChildren(...hv.items.map((m, i) => renderRow(hv, m, hv.items[i - 1])))
      box.replaceChildren(
        hv.more ? h('button', { class: 'btn-text cm-hist-more', type: 'button', onclick: () => extend('up') }, '↑ 更早的 25 条')
          : h('div', { class: 'cm-begin' }, `这是「${g.name}」最早的消息`),
        rowsBox,
        hv.after ? h('button', { class: 'btn-text cm-hist-more', type: 'button', onclick: () => extend('down') }, '↓ 更晚的 25 条')
          : h('button', { class: 'btn-text cm-hist-more', type: 'button', onclick: close }, '已经到最新了 · 回到当前聊天'))
    }
    const extend = async (dir) => {
      const edge = dir === 'up' ? hv.items[0]?.id : hv.items[hv.items.length - 1]?.id
      try {
        const d = await api(`/chat/groups/${g.id}/messages?around=${edge}`)
        if (histView !== hv) return
        const have = new Set(hv.items.map((m) => m.id))
        const fresh = d.items.filter((m) => !have.has(m.id))
        if (dir === 'up') {
          const h0 = box.scrollHeight, t0 = box.scrollTop
          hv.items = [...fresh.filter((m) => m.id < edge), ...hv.items]
          hv.more = d.more
          draw()
          box.scrollTop = t0 + box.scrollHeight - h0
        } else {
          hv.items = [...hv.items, ...fresh.filter((m) => m.id > edge)]
          hv.after = !!d.more_after
          draw()
        }
      } catch (e) { toast(e.message, 'err') }
    }
    try {
      const d = await api(`/chat/groups/${g.id}/messages?around=${id}`)
      if (histView !== hv) return
      hv.items = d.items
      hv.more = d.more
      hv.after = !!d.more_after
      const t = d.items.find((m) => m.id === id)
      if (!t) { close(); return toast('原消息找不到了') }
      title.textContent = '历史消息 · ' + fullDate(t.created_at)
      draw()
      const r = hv.rows.get(id)?.querySelector('.cm-msg')
      r?.scrollIntoView({ block: 'center' })
      if (r) flashMsg(r, t)
    } catch (e) { if (histView === hv) close(); toast(e.message, 'err') }
  }
  // 跳转窗口：清空列表，只放 id 前后各 25 条
  const resetList = () => { rows.clear(); list.replaceChildren(); st.items = []; st.first = 0; st.newIds = []; pill.hidden = true; st.unreadAt = -1 }
  async function openWindow(id) {
    st.busy = true
    try {
      const d = await api(`/chat/groups/${g.id}/messages?around=${id}`)
      resetList()
      st.more = d.more
      st.after = d.more_after ? d.items[d.items.length - 1]?.id || 0 : 0
      st.last = Math.max(st.last, d.items[d.items.length - 1]?.id || 0)
      add(d.items, 'bottom')
      topSpin.replaceChildren(st.more ? h('div', { class: 'spinner' }) : h('div', { class: 'cm-begin' }, `这是「${g.name}」最早的消息`))
      drawLatest()
    } catch (e) { toast(e.message, 'err') } finally { st.busy = false }
  }
  // 跳转窗口里往下翻：接着要后面的
  async function newer() {
    if (!st.after || st.busy) return
    st.busy = true
    try {
      const d = await api(`/chat/groups/${g.id}/messages?around=${st.after}`)
      const items = d.items.filter((m) => m.id > st.after)
      add(items, 'bottom')
      st.after = d.more_after ? items[items.length - 1]?.id || 0 : 0
      drawLatest()
    } catch {} finally { st.busy = false }
  }
  async function backToLatest() {
    st.after = 0
    st.more = true
    resetList()
    drawLatest()
    st.busy = false
    st.done = false
    await older()
  }
  const latestBtn = h('button', { class: 'cm-pill cm-latest', type: 'button', hidden: true, onclick: () => backToLatest() }, '回到最新消息 ↓')
  const drawLatest = () => { latestBtn.hidden = !st.after }
  // 看大图：整个群已加载的图串成一组，左右键能一直翻（历史层传它那一段）
  function gallery(m, i) { return galleryOf(st.items, m, i) }
  function galleryOf(items, m, i) {
    const all = []
    let start = -1
    for (const x of items) {
      if (x.deleted) continue
      const media = x.media?.length ? x.media : x.image ? [{ u: x.image, w: x.width, h: x.height }] : []
      if (x.id === m.id) start = all.length + i
      all.push(...media)
    }
    if (start < 0) {
      const media = m.media?.length ? m.media : [{ u: m.image, w: m.width, h: m.height }]
      return openViewer({ id: -1, image: media[0].u, images: media, image_count: media.length, title: '', seen_at: 1 }, i, { doc: scroller.ownerDocument })
    }
    openViewer({ id: -1, image: all[0].u, images: all, image_count: all.length, title: g.name, seen_at: 1 }, start, { doc: scroller.ownerDocument })
  }
  // @ 已读：自己发的、@ 了人的消息，名字后面一个点；隔 20 秒问一次还有谁没读的那几条
  const paintReads = (view, m) => {
    const el = view.rows.get(m.id)?.querySelector('.cm-text')
    if (!el || !m.at_read) return
    el.querySelectorAll('.at[data-at]').forEach((b) => {
      const k = b.dataset.at
      if (!(k in m.at_read)) return
      // @ 的是我自己：我正看着这条，就是已读
      if (k === S.me?.username?.toLowerCase() && !m.at_read[k] && scroller.offsetParent && !doc.hidden) m.at_read[k] = true
      let dot = b.nextElementSibling?.classList.contains('at-dot') ? b.nextElementSibling : null
      if (!dot) { dot = h('i', { class: 'at-dot' }); b.after(dot) }
      dot.classList.toggle('read', !!m.at_read[k])
      dot.title = m.at_read[k] ? '已读' : '还没看'
    })
  }
  st.paintReads = (m) => paintReads(mainView, m)
  async function refreshReads() {
    // 不只是自己发的：别人 @ 别人的，点也要跟着变绿
    const ids = st.items.filter((m) => m.at_read && Object.values(m.at_read).some((v) => !v) && Date.now() / 1000 - m.created_at < 7 * 86400).map((m) => m.id).slice(-100)
    if (!ids.length || doc.hidden) return
    try {
      const { reads } = await api(`/chat/groups/${g.id}/reads?ids=${ids.join(',')}`)
      for (const [id, r] of Object.entries(reads)) {
        const m = st.items.find((x) => x.id === Number(id))
        if (m) { m.at_read = r; paintReads(mainView, m) }
      }
    } catch {}
  }
  st.readT = setInterval(() => { if (scroller.isConnected) refreshReads() }, 20000)
  // @ 显示昵称：成员列表到了以后，把已经画出来的「@用户名」补成「昵称(@用户名)」
  groupMembers(g.id).then(() => list.querySelectorAll('.at[data-at]').forEach((b) => {
    const nk = NICKS.get(b.dataset.at)
    if (nk && b.textContent.startsWith('@')) b.textContent = `${nk}(${b.textContent})`
  })).catch(() => {})
  async function markRead() {
    if (!S.me || scroller.ownerDocument.hidden || !scroller.offsetParent || histEl || st.after || !nearBottom() || st.reading || st.last <= st.sentRead) return
    const upto = st.last
    st.reading = true
    try {
      await api(`/chat/groups/${g.id}/read`, { method: 'POST', body: { id: upto } })
      st.sentRead = upto
      const gg = findGroup(g.id)
      if (gg) {
        const left = st.items.filter((m) => !m.mine && !m.deleted && m.id > upto)
        gg.last_read = Math.max(gg.last_read || 0, upto)
        gg.unread = left.length
        gg.at_me = left.filter((m) => meRe()?.test(stripQuotes(m.body || ''))).length
        CHAT.subs.forEach((fn) => fn())
      }
      chatNotifSeen(g.id, upto)
    } catch {} finally { st.reading = false }
  }
  scroller.addEventListener('scroll', () => {
    const delta=scroller.scrollTop-(st.lastHeadScroll ?? scroller.scrollTop)
    const header=scroller.closest('.chat-body')?.querySelector('.chat-head')
    if(header && innerWidth<=640) {
      if(scroller.scrollTop<80 || delta<-8) header.classList.remove('compact')
      else if(delta>8) header.classList.add('compact')
    }
    st.lastHeadScroll=scroller.scrollTop
    st.stick = nearBottom() && !st.after
    if (st.stick) { pill.hidden = true; st.newN = 0; st.newIds = []; if (!awayEl) st.awayMark = false; markRead() }
    else if (st.newIds.length) recount()
    if (st.after && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 300) newer()
    if (scroller.scrollTop < 300) older()
    drawDown()
  }, { passive: true })
  // 图片晚加载会把内容往下顶：原本贴着底部就继续贴着
  scroller.addEventListener('load', () => { if (st.stick) scroller.scrollTop = scroller.scrollHeight }, true)
  // 输入框
  const reply = h('div', { class: 'cm-reply', hidden: true })
  const setReply = (m) => {
    if (m && st.editing) setEdit(null)
    st.reply = m
    reply.hidden = !m
    if (!m) return reply.replaceChildren()
    const text = previewText(stripQuotes(m.body || '')).slice(0, 300)
    const f0 = m.media?.[0]
    const file = f0?.k === 'f' ? f0 : null
    const pic = file ? null : f0?.u || m.image
    // 一行：↩ 谁：内容…  [小图] ×
    reply.replaceChildren(...nodes(icon('reply', 'i tiny'),
      h('span', { class: 'cm-reply-main' }, h('strong', null, `${m.user.name || m.user.username}：`), h('span', { class: 'cm-reply-text' }, text || (file ? `[文件] ${file.n}` : pic ? '[图片]' : ''))),
      pic && h('img', { class: 'cm-reply-pic', src: pic, alt: '' }),
      h('button', { class: 'cm-x', type: 'button', 'aria-label': '取消回复', onclick: () => setReply(null) }, icon('close', 'i tiny'))))
    // 手机上不自动弹键盘，想打字自己点输入框
    if (!COARSE) ta.focus()
  }
  // 编辑自己的消息：正文放进输入框，回车保存；Esc 或 × 取消，原来没发的草稿放回去
  const setEdit = (m) => {
    if (m) {
      if (!st.editing) st.draft = ta.value
      setReply(null)
      st.editing = m
      reply.hidden = false
      reply.replaceChildren(icon('pen', 'i tiny'), h('span', null, '编辑消息'),
        h('button', { class: 'cm-x', type: 'button', 'aria-label': '取消编辑', onclick: () => setEdit(null) }, icon('close', 'i tiny')))
      ta.value = m.body
    } else {
      if (!st.editing) return
      st.editing = null
      reply.hidden = true
      reply.replaceChildren()
      ta.value = st.draft || ''
      st.draft = ''
    }
    grow()
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }
  async function saveEdit() {
    const m = st.editing
    const body = ta.value.trim()
    if (body === m.body.trim()) return setEdit(null)
    if (!body && !m.image && !m.media?.length) return toast('内容不能为空，不想要了可以撤回', 'err')
    try {
      const { message } = await api(`/chat/messages/${m.id}`, { method: 'PATCH', body: { body } })
      setEdit(null)
      update(message)
    } catch (e) { toast(e.message, 'err') }
  }
  // 撤回后把原文放回输入框，可以改完直接再发
  const recalled = (m) => {
    if (!m.body) return
    if (st.editing) setEdit(null)
    const cur = ta.value.trim()
    ta.value = cur ? cur + '\n' + m.body : m.body
    grow()
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
    toast('已撤回', 'ok')
  }
  const ta = richInput({ placeholder: `发消息到 ${g.name}`, label: '消息' })
  let att = attachSlot('chat')
  // 发文件（压缩包、文档…）：选了直接传、直接发，一个文件一条消息
  const fileIn = h('input', { type: 'file', multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' })
  fileIn.addEventListener('change', async () => {
    const fs = [...fileIn.files]
    fileIn.value = ''
    for (const f of fs) {
      if (f.size > MAX_FILE) { toast(`「${f.name}」超过 20MB`, 'err'); continue }
      const tip = toast(`正在上传 ${f.name}…`)
      try {
        const r = await uploadFile(f, 'chat', 'file')
        const { message } = await api(`/chat/groups/${g.id}/messages`, { method: 'POST', body: { body: '', reply_to: st.reply?.id || 0, media: [{ key: r.key, name: f.name }] } })
        setReply(null)
        closeHist()
        add([message], 'live')
        toBottom(false)
      } catch (e) { toast(`「${f.name}」没发出去：${e.message}`, 'err') }
      void tip
    }
  })
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px' }
  ta.addEventListener('input', grow)
  // 乐观发送：先在底部画一条「发送中」，输入框立刻清空可以接着打字；失败了给重试 / 撤回
  // only：直接发这段内容（表情包），不动输入框里写了一半的字和待发的图
  async function send(only) {
    const body = only || ta.value.trim()
    if (!body && !att.items.length) return
    if (!requireLogin('聊天')) return
    // 在历史层里发（回车 / +1 复读 / 表情包）：回到当前聊天，看得见自己刚发的
    closeHist()
    const job = { body, reply: st.reply, tray: !only && att.items.length ? att : null, done: false, tries: 0 }
    const fake = { id: 0, user: { id: S.me.id, username: S.me.username, name: S.me.name, avatar: S.me.avatar, is_admin: S.me.is_admin, fancy: S.me.fancy },
      body, media: job.tray ? att.local() : null, created_at: Date.now() / 1000, reactions: [], mine: true,
      reply_to: job.reply ? { id: job.reply.id, username: job.reply.user.username, name: job.reply.user.name, avatar: job.reply.user.avatar,
        text: stripQuotes(job.reply.body || '').slice(0, 200), fancy: job.reply.user.fancy, file: job.reply.media?.[0]?.k === 'f' ? job.reply.media[0].n : null,
        image: !!(job.reply.media?.[0]?.u && job.reply.media[0].k !== 'f') || !!job.reply.image, thumb: job.reply.media?.[0]?.k === 'f' ? null : job.reply.media?.[0]?.u || job.reply.image || null } : null }
    const el = chatMsg(fake, { pending: true })
    el.classList.add('pending')
    const state = h('div', { class: 'cm-state' }, '发送中…')
    el.querySelector('.cm-main').append(state)
    pending.append(el)
    // 发出去了（不管是回包还是轮询先看到）：收掉占位
    job.settle = (message) => {
      if (job.done) return
      job.done = true
      el.remove()
      job.tray?.clear()
      inflight.splice(inflight.indexOf(job) >>> 0, 1)
      if (message && !st.destroyed) matchRedpackMessage(message, g, api_)
    }
    inflight.push(job)
    // 托盘交给这条消息，输入框换一个新的
    if (job.tray) swapTray()
    if (!only) { ta.value = ''; grow() }
    setReply(null)
    toBottom(false)
    const go = async () => {
      if (job.done || job.busy) return
      job.busy = true
      state.textContent = '发送中…'
      state.classList.remove('err')
      try {
        const media = job.tray ? await job.tray.media() : undefined
        // 第二次起带上 retry：服务器在 2 分钟内认出同一条，不会重复入库
        const { message } = await api(`/chat/groups/${g.id}/messages`, { method: 'POST', body: { body, reply_to: job.reply?.id || 0, media, retry: job.tries++ > 0 || undefined } })
        if (!job.done) job.settle(message)
        const stick = nearBottom()
        add([message], 'live')
        if (stick) toBottom(false)
      } catch (e) {
        if (job.done) return
        state.classList.add('err')
        state.replaceChildren('没发出去：' + e.message + ' ',
          h('button', { class: 'btn-text', type: 'button', onclick: go }, '重试'),
          h('button', { class: 'btn-text', type: 'button', onclick: () => {
            job.settle()
            if (!ta.value) { ta.value = body; grow() }
          } }, '撤回到输入框'))
      } finally { job.busy = false }
    }
    go()
  }
  const inflight = []
  const pending = h('div', { class: 'cm-pending' })
  function swapTray() {
    const old = att
    att = attachSlot('chat')
    old.el.replaceWith(att.el)
    old.input.replaceWith(att.input)
  }
  const mention = S.me ? mentionPicker(ta, g, () => st.items.slice().reverse().map((m) => m.user)) : null
  sendOnEnter(ta, () => st.editing ? saveEdit() : send())
  ta.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.editing) { e.stopPropagation(); setEdit(null) } })
  const tb = (ic, title, onclick, extra = {}) => h('button', { class: 'cm-ibtn', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  const sendBtn = tb('send', '发送', () => st.editing ? saveEdit() : send())
  const key = 'cmstk' + g.id
  const compose = S.me
    ? h('div', { class: 'cm-compose' }, reply, att.el, att.input, fileIn, ta,
      h('div', { class: 'cm-bar' },
        // 贴着整个输入框上沿弹出，不挡正在打的字
        tb('smile', '表情', (e) => openPop(e.currentTarget.closest('.cm-compose') || e.currentTarget, emojiBoard((k) => {
          // 表情包和普通表情一样先放进输入框，自己点发送
          closePop()
          insertAtCursor(ta, k.includes(':') ? `[${k}]` : k)
        }), { key, cls: 'pop-stk', up: true }), { 'data-pop': key }),
        tb('image', '发图片 / 视频', () => att.pick()),
        tb('redpack', '发红包', (e) => redpackDialog(e.currentTarget.getClientRects().length ? e.currentTarget : compose.querySelector('.cm-mobile-more'), { group: g, onSent: (message) => { closeHist(); add([message], 'live'); toBottom(false) } }), { class: 'cm-ibtn cm-redpack-btn' }),
        tb('packetBag', '群红包袋', (e) => redpackDialog(e.currentTarget.getClientRects().length ? e.currentTarget : compose.querySelector('.cm-mobile-more'), { archiveGroup:g, onUpdate:update })),
        tb('packetBag', '称号抽奖', (e) => titleRaffleDialog(e.currentTarget)),
        tb('doc', '发文件（20MB 以内）', () => fileIn.click()),
        tb('at', '@ 某人', () => { insertAtCursor(ta, (/\S$/.test(ta.value.slice(0, ta.selectionStart)) ? ' ' : '') + '@') }),
        tb('quote', '引用', () => { const m = st.reply || st.items[st.items.length - 1]; if (m) quoteMsg(m) }),
        tb('link', '引用帖子（插入 No.编号，会带预览卡）', (e) => postPicker(e.currentTarget.closest('.cm-compose') || e.currentTarget, (m) => {
          insertAtCursor(ta, (/\S$/.test(ta.value.slice(0, ta.selectionStart)) ? ' ' : '') + `No.${m.id} `)
        }, 'cmpost' + g.id), { 'data-pop': 'cmpost' + g.id }),
        tb('search', '搜索聊天记录', () => search()),
        tb('smile', 'AI 小伙伴', (e) => openAi(e.currentTarget.getClientRects().length ? e.currentTarget : compose.querySelector('.cm-mobile-more')), { class: 'cm-ibtn cm-ai-open' }),
        tb('download', '导出 / 让 AI 总结', (e) => pickRange(e.currentTarget), { 'data-pop': 'cmrange' }),
        h('span', { class: 'grow' }),
        sendBtn), mention.el)
    : h('a', { class: 'cm-compose ghost', href: loginHref() }, '登录 Linux.DO 后加入「迷友」聊天')
  if (S.me) acceptImages(compose, ta, { add: (fs) => att.add(fs) })
  if (S.me) {
    const bar = compose.querySelector('.cm-bar')
    const extras = [...bar.querySelectorAll('button')].filter(b => ['发红包', '群红包袋', '称号抽奖', '发文件（20MB 以内）', '@ 某人', '引用', '引用帖子（插入 No.编号，会带预览卡）', '搜索聊天记录', 'AI 小伙伴'].includes(b.title))
    extras.forEach(b => b.classList.add('cm-secondary'))
    bar.querySelector('[data-pop="cmrange"]')?.classList.add('desktop-only')
    const more = tb('more', '更多聊天操作', e => openPop(e.currentTarget,
      h('div', { class: 'menu-list' }, extras.map(b => h('button', { class: 'menu-item', type: 'button', onclick: () => { closePop(); b.click() } }, b.title))),
      { key: 'cm-more' + g.id, up: true }), { class: 'cm-ibtn cm-mobile-more' })
    bar.insertBefore(more, sendBtn)
  }

  function quoteMsg(m) {
    const doc = scroller.ownerDocument
    const sel = String(doc.getSelection() || '').trim()
    const text = sel && selMsgId(doc) === String(m.id) ? sel : stripQuotes(m.body).slice(0, 300)
    insertAtCursor(ta, `[quote="${quoteName(m.user.name || m.user.username)}, msg:${m.id}"]\n${text || '[图片]'}\n[/quote]\n`)
    grow()
  }
  // 搜聊天记录：盖在消息区上面的一层，点结果跳过去
  let searchEl = null
  function search(q0 = '') {
    if (searchEl) {
      const i = searchEl.querySelector('input')
      if (q0) { i.value = q0; i.dispatchEvent(new Event('input')) }
      i.focus()
      return
    }
    const input = h('input', { class: 'input', type: 'search', placeholder: '搜索消息内容，@用户名 只看某人', 'aria-label': '搜索聊天记录' })
    const onlyImg = h('input', { type: 'checkbox' })
    const out = h('div', { class: 'cms-list' }, h('p', { class: 'muted cms-empty' }, '输入关键词搜索这个群的聊天记录'))
    const close = () => { searchEl?.remove(); searchEl = null; (win.innerWidth <= 760 ? compose.querySelector('.cm-mobile-more') : ta)?.focus({ preventScroll: true }) }
    let t = 0
    let seq = 0
    const run = async (before = 0) => {
      const raw = input.value.trim()
      const user = (raw.match(/(?:^|\s)@(\S+)/) || [])[1] || ''
      const q = raw.replace(/(?:^|\s)@\S+/, '').trim()
      if (!q && !user && !onlyImg.checked) { out.replaceChildren(h('p', { class: 'muted cms-empty' }, '输入关键词搜索这个群的聊天记录')); return }
      const my = ++seq
      if (!before) out.replaceChildren(h('div', { class: 'spinner' }))
      try {
        const d = await api(`/chat/groups/${g.id}/search?` + new URLSearchParams({ q, user, ...(onlyImg.checked ? { img: '1' } : {}), ...(before ? { before } : {}) }))
        if (my !== seq) return
        out.querySelector('.cms-more')?.remove()
        if (!before) out.replaceChildren()
        if (!before && !d.items.length) out.append(h('p', { class: 'muted cms-empty' }, '没有找到相关消息'))
        out.append(...d.items.map((m) => h('button', { class: 'cms-row', type: 'button', onclick: () => { close(); jumpTo(m.id) } },
          avatar(m.user.avatar, m.user.name || m.user.username, 28),
          h('span', { class: 'cms-main' },
            h('span', { class: 'cms-top' }, h('strong', null, m.user.name || m.user.username), h('time', null, fmtTime(m.created_at))),
            h('span', { class: 'cms-text' }, previewText(stripQuotes(m.body || '')) || ((m.media?.length || m.image) ? '[图片]' : ''))),
          (m.media?.[0]?.u || m.image) && h('img', { class: 'cms-pic', src: m.media?.[0]?.u || m.image, alt: '', loading: 'lazy' }))))
        if (d.more) out.append(h('button', { class: 'btn-text cms-more', type: 'button', onclick: () => run(d.items[d.items.length - 1].id) }, '更多结果'))
      } catch (e) { if (my === seq) out.replaceChildren(h('p', { class: 'muted cms-empty' }, e.message)) }
    }
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(), 300) })
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
    onlyImg.addEventListener('change', () => run())
    searchEl = h('div', { class: 'cm-search' },
      h('div', { class: 'cms-head' }, icon('search', 'i tiny'), input,
        h('label', { class: 'cms-img' }, onlyImg, '只看图'),
        h('button', { class: 'cm-x', type: 'button', 'aria-label': '关闭搜索', onclick: close }, icon('close', 'i tiny'))),
      out)
    el.append(searchEl)
    input.focus()
    if (q0) { input.value = q0; run() }
  }
  function destroy() { st.destroyed = true; aiPanel?.destroy(); st.done = false; CHAT.panes.delete(api_); clearTimeout(st.catchupT); clearInterval(st.ownPoll); clearInterval(st.readT); doc.removeEventListener('visibilitychange', onVis); win?.removeEventListener('blur', onBlur); win?.removeEventListener('focus', onFocus); offNotice() }

  // 群公告：顶上一条，点 × 收起（记住这一版），右上角留个小「公告」随时再打开；公告改了会重新弹出来
  const noticeEl = h('div', { class: 'cm-notice-wrap' })
  let noticeOpen = false
  let noticeRenderKey = ''
  const drawNotice = () => {
    const x = findGroup(g.id) || g
    const key = 'noticeSeen:' + g.id
    const seen = Number(localStorage.getItem(key)) >= (x.notice_at || 0)
    const renderKey = JSON.stringify([x.notice, x.notice_at, seen, noticeOpen, S.content, S.blurAll])
    if (noticeRenderKey === renderKey) return
    noticeRenderKey = renderKey
    if (!x.notice) return noticeEl.replaceChildren()
    if (seen && !noticeOpen) return noticeEl.replaceChildren(h('button', { class: 'cm-notice-mini', type: 'button', title: '看群公告', onclick: () => { noticeOpen = true; drawNotice() } }, icon('pin', 'i tiny'), '公告'))
    const hasRefs = /\[quote[^\]]*(?:msg|m):\d+|No\.\d+|\/m\/\d+/.test(x.notice)
    const text = h('div', { class: 'cm-notice-t' + (hasRefs ? ' has-refs' : ' clip2'), title: hasRefs ? '' : '点开看全部', onclick: (e) => { if (!hasRefs && !e.target.closest('a, button, .onebox')) text.classList.toggle('clip2') } }, richBody(x.notice, { md: 'lite', inlineRefs: true, groupId: g.id }))
    noticeEl.replaceChildren(h('div', { class: 'cm-notice', role: 'note' },
      icon('pin', 'i tiny cm-notice-i'),
      h('div', { class: 'cm-notice-main' }, h('strong', null, '群公告'), x.notice_at && h('span', { class: 'muted sm' }, ' · ' + fmtTime(x.notice_at)), text),
      h('button', { class: 'btn-icon ghost sm', type: 'button', title: '收起', 'aria-label': '收起公告', onclick: () => { localStorage.setItem(key, String(x.notice_at || 1)); noticeOpen = false; drawNotice() } }, icon('close'))))
  }
  const offNotice = onChat(drawNotice)
  drawNotice()

  pendingSlot()
  const el = h('div', { class: 'cm-pane' }, noticeEl, stage, pill, latestBtn, compose)
  // 在光标处插入 @用户名，前面不是空白就补一个空格；刚插过同一个人不重复插
  const atUser = (username) => {
    const before = ta.value.slice(0, ta.selectionStart ?? ta.value.length)
    if (before.endsWith('@' + username + ' ')) return ta.focus()
    insertAtCursor(ta, (/\S$/.test(before) ? ' ' : '') + '@' + username + ' ')
  }
  const api_ = { el, poll, destroy, update, setReply, setEdit, recalled, quoteMsg, jumpTo, gallery, search, atUser, send: (t) => send(t), focus: () => ta.focus(), group: g, st }
  mainView.pane = api_
  // 消息上的右键 / 左滑：委托在整个 pane 上（跟着 pane 进小窗 document），按消息所在列表找视图和消息。
  // 发送中的占位不在任何列表里，自然不管
  const msgAt = (t) => {
    const msg = t?.closest?.('.cm-msg')
    const v = msg && viewOf(msg)
    const id = Number(msg?.dataset.msg)
    const m = v && id > 0 ? v.find(id) : null
    return m ? { msg, v, m } : null
  }
  // 右键（安卓长按）消息：自己的操作菜单盖掉浏览器的；按住 Shift 还是浏览器菜单
  el.addEventListener('contextmenu', (e) => {
    const x = msgAt(e.target)
    if (!x) return
    const { msg, v, m } = x
    // 打码 / 模糊的图：右键直接看大图，不出菜单
    const cell = e.target.closest('.cm-img[data-mask]')
    if (cell) { e.preventDefault(); v.pane.gallery(m, Number(cell.dataset.mi)); return }
    // 右键（长按）头像 = @TA，消息菜单照样出
    if (e.target.closest('.cm-face') && S.me && !m.mine) { e.preventDefault(); v.pane.atUser(m.user.username) }
    if (e.shiftKey || !S.me) return
    if (m.deleted || msg.classList.contains('pending')) return
    e.preventDefault()
    chatMenu(m, v.pane, e)
  })
  // 手机上消息往左滑：回复这条
  let sw = null
  el.addEventListener('touchstart', (e) => {
    const msg = e.touches.length === 1 && S.me && e.target.closest('.cm-msg:not(.gone):not(.pending)')
    sw = msg ? { el: msg, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, on: false } : null
  }, { passive: true })
  el.addEventListener('touchmove', (e) => {
    if (!sw) return
    const dx = e.touches[0].clientX - sw.x
    const dy = e.touches[0].clientY - sw.y
    if (!sw.on) {
      // 严一点：先竖着动了就算滚动；横向要明显（> 28px 且是竖向的 2 倍）才算左滑回复
      if (Math.abs(dy) > 8 && Math.abs(dy) * 2 > Math.abs(dx)) { sw = null; return }
      if (dx > -28 || Math.abs(dx) < Math.abs(dy) * 2) return
      sw.on = true
      sw.el.classList.add('swiping')
    }
    sw.dx = Math.max(-90, Math.min(0, dx))
    sw.el.style.setProperty('--sw', sw.dx + 'px')
    sw.el.classList.toggle('sw-ready', sw.dx <= -60)
  }, { passive: true })
  const swEnd = () => {
    if (!sw?.on) { sw = null; return }
    const { el: msg, dx } = sw
    sw = null
    msg.classList.remove('swiping', 'sw-ready')
    msg.style.removeProperty('--sw')
    const x = msgAt(msg)
    if (dx <= -60 && x) { navigator.vibrate?.(10); x.v.pane.setReply(x.m) }
  }
  el.addEventListener('touchend', swEnd)
  el.addEventListener('touchcancel', swEnd)
  CHAT.panes.add(api_)
  older()
  return api_
}

// 群聊正文里的图片直链：.png/.jpg/.jpeg/.gif/.webp、站内 /img/、linux.do / ldstatic 的上传图。只认第一个
// only = 整条（去掉空白）就是这个链接
const LINK_IMG_RE = /(?:https?:\/\/[^\s<>"')\]]+|(?<![\w/.])\/img\/[^\s<>"')\]]+)/gi
const LD_HOST = /(^|\.)(linux\.do|ldstatic\.com)$/i
function bodyImgUrl(body) {
  const text = stripQuotes(body)
  for (const m of text.matchAll(LINK_IMG_RE)) {
    const raw = m[0].replace(/[.,，。!！?？;；:：]+$/, '')
    let u
    try { u = new URL(raw, location.origin) } catch { continue }
    const same = u.origin === location.origin
    const ok = /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) || (same && u.pathname.startsWith('/img/'))
      || (LD_HOST.test(u.hostname) && /^\/(uploads|original|optimized)\//.test(u.pathname))
    if (!ok || !/^https?:$/.test(u.protocol)) continue
    return { url: same ? u.pathname + u.search : u.href, only: text.trim() === m[0].trim() }
  }
  return null
}
// 直链图预览：站内直接加载；linux.do / ldstatic 先直连，不行走 /ext 代理（服务端 EXT_HOSTS 白名单）；
// 其它外站直连 + no-referrer，加载失败就退回成一个普通链接。点开看大图
function linkImg(url, extra) {
  const ext = /^https?:\/\//.test(url)
  const proxy = ext && url.startsWith('https://') && LD_HOST.test(new URL(url).hostname)
  let b = null
  const img = h('img', { src: url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async',
    onerror: () => {
      if (proxy && !img.dataset.fallback) { img.dataset.fallback = '1'; img.src = '/ext?u=' + encodeURIComponent(url); return }
      // 失败也保留预览高度，原链接仍能打开，避免后面的消息突然上移。
      b.replaceWith(h('a', { class: 'cm-linkimg-failed', href: url, target: '_blank', rel: 'noopener noreferrer', title: url }, icon('image'), '打开原图'))
    } })
  b = h('button', { class: 'cm-img sized', type: 'button', 'aria-label': '查看大图',
    onclick: (e) => {
      const src = img.currentSrc || img.src
      openViewer({ id: -1, image: src, images: [{ u: src, w: img.naturalWidth || null, h: img.naturalHeight || null }], image_count: 1, title: '', seen_at: 1 }, 0, { doc: e.currentTarget.ownerDocument })
    } },
  img, h('span', { class: 'cm-zoom', 'aria-hidden': 'true' }, icon('zoom')))
  const wrap = h('div', { class: 'cm-linkimg' }, b,
    ext && h('a', { class: 'cm-linkimg-src', href: url, target: '_blank', rel: 'noopener noreferrer', title: url }, new URL(url).hostname), extra)
  return wrap
}

// 群聊单图的占位尺寸：按原图宽高等比收进 320×320（宽再被 max-width:100% 收，aspect-ratio 保证高跟着缩）
function cmImgBox(w, h, max = 320) {
  w = Number(w) || 0; h = Number(h) || 0
  if (w <= 0 || h <= 0) return null
  const k = Math.min(1, max / w, max / h)
  return { w: Math.max(40, Math.round(w * k)), h: Math.max(40, Math.round(h * k)) }
}

// 一条消息（参考 Discord）：回复的原文在最上面一行，左边一根弯线从头像那一列接上来；下面头像 · 名字 时间 · 正文 / 图 · 表情 · 悬停工具
async function redpackDialog(anchor, options) {
  try {
    closePop()
    const { openRedpacket } = await import('/redpacket.js?v=a6b159ef')
    if (anchor.isConnected) openRedpacket({ anchor, ...options, h, icon, api, openTitleRaffle: titleRaffleDialog, uploadCover: async file => {
      const error=checkFile(file)
      if(error || isVid(file))throw Error(error || '封面请选择图片')
      const compact=await shrinkImage(file,{edge:1280,threshold:1024*1024,keepTall:false})
      if(compact.size>MAX_FILE)throw Error('封面超过20MB')
      const url=URL.createObjectURL(compact)
      try {const size=await probeMedia(compact,url);if(!size.w || !size.h)throw Error('无法读取这张图片');return await uploadFile(compact,'chat')}
      finally {URL.revokeObjectURL(url)}
    } })
  } catch (e) { toast(e.message, 'err') }
}
async function titleRaffleDialog(anchor, packetId = null) {
  try {
    closePop()
    const { openTitleRaffle } = await import('/title-raffle.js?v=20261013')
    openTitleRaffle({ anchor, packetId, api, h, icon })
  } catch (e) { toast(e.message, 'err') }
}
const REDPACK_AUTO = { queue: [], active: false, seen: new Set(), timer: 0 }
async function matchRedpackMessage(message,g,pane,attempt=0) {
  const key=(S.me?.id || 0)+':'+message.id
  if(REDPACK_AUTO.seen.has(key))return
  REDPACK_AUTO.seen.add(key)
  if(REDPACK_AUTO.seen.size>200)REDPACK_AUTO.seen.delete(REDPACK_AUTO.seen.values().next().value)
  try {
    const d=await api(`/chat/groups/${g.id}/redpacks/matches?message_id=${message.id}`)
    if(!pane.el.isConnected || !d.items.length)return
    const enqueue=()=>{
      let seen=[];try{seen=JSON.parse(localStorage.getItem('redpackAutoSeen') || '[]')}catch{}
      if(seen.includes(key))return
      localStorage.setItem('redpackAutoSeen',JSON.stringify([...seen.slice(-79),key]))
      REDPACK_AUTO.queue.push(...d.items.map(m=>({message:m,pane,at:Date.now()})));drainRedpackAuto()
    }
    if(navigator.locks)await navigator.locks.request('redpack-auto',enqueue)
    else enqueue()
  } catch {
    REDPACK_AUTO.seen.delete(key)
    if(attempt<2 && pane.el.isConnected)setTimeout(()=>{if(pane.el.isConnected)matchRedpackMessage(message,g,pane,attempt+1)},1000*(attempt+1))
  }
}
function drainRedpackAuto() {
  clearTimeout(REDPACK_AUTO.timer);REDPACK_AUTO.timer=0
  if(REDPACK_AUTO.active)return
  const next=REDPACK_AUTO.queue[0]
  if(!next)return
  if(!next.pane.el.isConnected || Date.now()-next.at>120000){REDPACK_AUTO.queue.shift();return drainRedpackAuto()}
  const doc=next.pane.el.ownerDocument
  if(doc.hidden || doc.querySelector('dialog[open]')){REDPACK_AUTO.timer=setTimeout(drainRedpackAuto,500);return}
  REDPACK_AUTO.queue.shift();REDPACK_AUTO.active=true
  const anchor=next.pane.el.querySelector('[aria-label="发红包"]') || next.pane.el
  redpackDialog(anchor,{message:next.message,autoOpen:true,onUpdate:next.pane.update,onClose:()=>{REDPACK_AUTO.active=false;drainRedpackAuto()}})
    .then(()=>{if(!doc.querySelector('.rpk-dialog')){REDPACK_AUTO.active=false;drainRedpackAuto()}})
}
function chatMsg(m, { cont, pane, pending } = {}) {
  const who = m.user.name || m.user.username
  if(m.system_kind==='title_raffle')return h('div',{class:'cm-welcome cm-title-raffle',role:'note'},
    h('span',{class:'cm-welcome-star','aria-hidden':'true'},'✦'),
    h('span',{class:'cm-welcome-copy'},h('strong',null,m.deleted?'称号抽奖已撤回':m.body)),
    !m.deleted && h('button',{class:'btn btn-primary sm',type:'button',onclick:e=>titleRaffleDialog(e.currentTarget)},'看结果'))
  if(m.system_kind==='redpack_due')return h('div',{class:'cm-welcome cm-redpack-due',role:'note'},icon('redpack'),
    h('span',{class:'cm-welcome-copy'},h('strong',null,m.deleted?'红包提醒已撤回':'红包到点啦！'),!m.deleted && h('span',null,'开奖与领取状态以原站为准')),
    !m.deleted && h('button',{class:'btn btn-primary sm',type:'button',onclick:e=>redpackDialog(e.currentTarget,{message:{id:Number(m.system_ref)},onUpdate:fresh=>pane?.update(fresh)})},'去看看'))
  if (m.system_kind === 'join') return h('div', { class: 'cm-welcome' + (m.deleted ? ' gone' : ''), role: 'note', 'aria-label': m.deleted ? '入群提醒已撤回' : `欢迎 ${who} 加入群聊` },
    m.deleted ? h('span', null, '入群提醒已撤回') : [
      h('span', { class: 'cm-welcome-star', 'aria-hidden': 'true' }, '✦'),
      h('button', { class: 'cm-welcome-face', type: 'button', 'data-pop': 'u' + m.user.username, title: '查看 ' + who,
        onclick: (e) => userCard(m.user.username, e.currentTarget) }, avatar(m.user.avatar, who, 36)),
      h('span', { class: 'cm-welcome-copy' }, h('span', { class: 'cm-welcome-hello' }, '欢迎新伙伴！'),
        h('span', null, h('button', { type: 'button', class: 'cm-welcome-name', 'data-pop': 'u' + m.user.username,
          onclick: (e) => userCard(m.user.username, e.currentTarget) }, who), ' 加入了群聊')),
      h('span', { class: 'cm-welcome-spark', 'aria-hidden': 'true' }, '✧'),
    ])
  // 点头像看资料卡；点名字、右键（手机长按）头像 = 在输入框里 @TA。自己的名字点了还是看资料
  const canAt = !!(pane?.atUser && S.me && !m.mine)
  const card = (e) => userCard(m.user.username, e.currentTarget)
  const at = (e) => { if (!canAt) return card(e); e.preventDefault(); pane.atUser(m.user.username) }
  // 右键 / 长按头像 @TA 在 chatPane 的委托里做（主列表、历史层一样）
  const face = h('button', { class: 'cm-face', type: 'button', title: canAt ? `${who} · 右键或长按 @TA` : who, 'data-pop': 'u' + m.user.username, onclick: card }, avatar(m.user.avatar, who, 36))
  const body = []
  let ref = null
  if (m.deleted) body.push(h('div', { class: 'cm-gone' }, `${m.mine ? '你' : who} 撤回了一条消息`))
  else {
    if (m.reply_to) {
      const r = m.reply_to
      const rn = r.name || r.username || '佚名'
      const text = r.deleted ? '消息已撤回' : previewText(stripQuotes(r.text || '')) || ''
      ref = h('button', { class: 'cm-ref' + (S.me && r.username === S.me.username ? ' me' : ''), type: 'button', title: text ? `${rn}：${text}` : '跳到原消息',
        onclick: () => pane ? pane.jumpTo(r.id) : jumpMsg(r.id) },
        avatar(r.avatar, rn, 16), uName('strong', r, {}, (r.username ? '@' : '') + rn, 'chat')[0],
        h('span', { class: 'cm-ref-text' }, text || (r.file || r.image ? '' : '…')),
        !r.deleted && r.file && h('span', { class: 'cm-ref-pic' }, icon('doc', 'i tiny'), r.file),
        !r.deleted && !r.file && r.image && (r.thumb ? h('img', { class: 'cm-ref-thumb', src: r.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'cm-ref-pic' }, icon('image', 'i tiny'), '图片')))
    }
    // 正文里贴了图片直链：显示成图；整条只有这个链接时就不再画文字气泡
    const lnk = m.body ? bodyImgUrl(m.body) : null
    const edited = m.edited_at && h('span', { class: 'cm-edited', title: '编辑于 ' + new Date(m.edited_at * 1000).toLocaleString('zh-CN', { hour12: false }) }, '（已编辑）')
    if (m.road_id) body.push(h('a', { class: 'cm-road', href: `/road?item=${m.road_id}`, 'data-link': '' }, `已转到鞭打 #${m.road_id}`))
    if (m.redpack) body.push(h('button', { type: 'button', class: 'cm-redpack' + (m.redpack.solved ? ' is-open' : ''), 'aria-label': '打开红包',
      onclick: (e) => redpackDialog(e.currentTarget, { message: m, onUpdate: (fresh) => pane?.update(fresh) }) },
      m.redpack.cover && h('img',{class:'cm-redpack-cover',src:m.redpack.cover,alt:'红包封面',loading:'lazy',onerror:e=>e.currentTarget.remove()}),
      h('span', { class: 'cm-redpack-seal', 'aria-hidden': 'true' }, icon('redpack')),
      h('span', { class: 'cm-redpack-copy' }, h('strong', null, m.redpack.prompt || '给你一个红包'),
        h('span', null, `${({hb:'HB · ',credit:'Credit · ',fish:'fish · '})[m.redpack.provider] || ''}${({ open: '直接开', phrase: '对暗号', cipher: '解个谜', image: '猜张图' })[m.redpack.mode]}${m.redpack.solved ? ' · 已拆封' : ''}`)),
      h('span', { class: 'cm-redpack-foot' }, m.redpack.snapshot?.claimed ? '已领取' : ({exhausted:'被抢光啦',expired:'已过期',cancelled:'已取消',registered:'等待开奖',drawing:'正在开奖',not_won:'未中奖',payment_pending:'等待发放',simulation:'模拟奖励',draft:'尚未开放'})[m.redpack.snapshot?.state] || (m.redpack.solved ? '查看红包' : '戳我拆开'), h('span', null, `${m.redpack.opened} 人拆过${m.redpack.provider && m.redpack.provider!=='native'?'包装':''}`))))
    if ((!m.redpack || m.redpack.shared) && m.body && !lnk?.only) body.push(h('div', { class: 'cm-text' + (stkOnly(m.body) ? ' stk-only' : bubbleCls(m.user)) }, richBody(m.body, { md: 'lite' }), edited))
    if (lnk) body.push(linkImg(lnk.url, lnk.only && edited))
    const all = m.redpack && !m.redpack.shared ? [] : m.media?.length ? m.media : m.image ? [{ u: m.image, w: m.width, h: m.height }] : []
    const files = all.filter((x) => x.k === 'f')
    const media = all.filter((x) => x.k !== 'f')
    if (media.length) {
      const view = { id: -(m.id || 1), image: media[0].u, images: media, image_count: media.length, title: '', seen_at: 1 }
      const open = (e, i) => pane?.gallery ? pane.gallery(m, i) : openViewer(view, i, { doc: e.currentTarget.ownerDocument })
      // 单张按 w/h 预占位；旧图没有尺寸时保留固定缩略框，完整比例交给看图器。
      const solo = media.length === 1
      const cell = (it, i, cls = 'cm-img') => {
        const sz = solo && cls === 'cm-img' ? cmImgBox(it.w, it.h) || { w: 240, h: 180 } : null
        const b = h('button', { class: cls + (it.b ? ' cm-blur blur' : '') + (sz ? ' sized' : ''), type: 'button', 'aria-label': it.b ? '已模糊，点一下看' : it.v ? '播放视频' : '查看大图',
          style: sz ? { width: sz.w + 'px', aspectRatio: `${sz.w} / ${sz.h}` } : null,
          onclick: (e) => {
            // 发的人选了「模糊」：按设置，点一下揭开 / 再点盖回；或者直接看大图
            if (it.b && maskTap() === 'peek') { e.stopPropagation(); b.classList.toggle('blur'); return }
            if (maskTap() === 'peek' && peekOrig(e, it)) return
            open(e, i)
          },
          // 打码 / 模糊的图右键直接看图：列表里的消息由 chatPane 委托处理（data-mask / data-mi），发送中的占位没有 pane，还是自己管
          'data-mi': i, 'data-mask': (it.b || it.o) && pane ? '' : null,
          oncontextmenu: (it.b || it.o) && !pane ? (e) => { e.preventDefault(); e.stopPropagation(); open(e, i) } : null },
        it.u ? h('img', { src: it.u, alt: '', loading: 'lazy', width: it.w || null, height: it.h || null })
          : h('video', { src: it.v, muted: true, playsinline: true, preload: 'metadata' }),
        kindBadge(it), it.o && h('span', { class: 'mask-badge' }, maskTap() === 'peek' ? '已打码 · 点一下看原图' : '已打码'),
        it.b && h('span', { class: 'cm-veil' }, icon('eyeOff', 'i tiny'), maskTap() === 'peek' ? '点一下看' : '点开看'),
        it.k === 'v' ? h('span', { class: 'play-mark' }, icon('play')) : h('span', { class: 'cm-zoom', 'aria-hidden': 'true' }, icon('zoom')))
        return b
      }
      // 发的人选了「轮播」：多张合成一个左右滑的轮播
      if (media.length > 1 && media.some((x) => x.c)) {
        const track = h('div', { class: 'cm-car-track' }, media.map((it, i) => cell(it, i, 'cm-img cm-car-cell')))
        const cnt = h('span', { class: 'car-count' }, `1 / ${media.length}`)
        track.addEventListener('scroll', () => { cnt.textContent = `${Math.round(track.scrollLeft / Math.max(1, track.clientWidth)) + 1} / ${media.length}` }, { passive: true })
        const dots = h('span', { class: 'car-dots' }, media.map((_, i) => h('i', { class: i ? '' : 'on' })))
        track.addEventListener('scroll', () => { const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); [...dots.children].forEach((d, i) => d.classList.toggle('on', i === k)) }, { passive: true })
        const go = (d) => track.scrollBy({ left: d * track.clientWidth, behavior: 'smooth' })
        // 电脑上也能像微信那样按住左右拖；拖过了就不算点开大图
        let dx = null
        track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button) return; dx = { x: e.clientX, s: track.scrollLeft, moved: false } })
        track.addEventListener('pointermove', (e) => {
          if (!dx) return
          const d = e.clientX - dx.x
          if (Math.abs(d) > 5 && !dx.moved) { dx.moved = true; track.style.scrollSnapType = 'none'; track.setPointerCapture(e.pointerId) }
          if (dx.moved) track.scrollLeft = dx.s - d
        })
        const end = (e) => {
          if (!dx) return
          const { moved, x, s } = dx
          dx = null
          if (!moved) return
          const w = Math.max(1, track.clientWidth), d = e.clientX - x
          const k = Math.round(s / w) + (Math.abs(d) > w * 0.15 ? (d < 0 ? 1 : -1) : 0)
          track.style.scrollSnapType = ''
          track.scrollTo({ left: Math.max(0, Math.min(media.length - 1, k)) * w, behavior: 'smooth' })
          track.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault() }, { capture: true, once: true })
        }
        track.addEventListener('pointerup', end)
        track.addEventListener('pointercancel', end)
        track.addEventListener('dragstart', (e) => e.preventDefault())
        body.push(h('div', { class: 'cm-car' }, track, cnt, dots,
          h('button', { class: 'car-nav prev', type: 'button', 'aria-label': '上一张', onclick: () => go(-1) }, icon('chevL')),
          h('button', { class: 'car-nav next', type: 'button', 'aria-label': '下一张', onclick: () => go(1) }, icon('chevR'))))
      } else body.push(h('div', { class: 'cm-media n' + Math.min(media.length, 3) }, media.map((it, i) => cell(it, i))))
    }
    if (files.length) body.push(h('div', { class: 'cm-files' }, files.map((f) =>
      h('a', { class: 'cm-file', href: f.u + '?n=' + encodeURIComponent(f.n || '文件'), download: f.n || '文件', target: '_blank', rel: 'noopener' },
        h('span', { class: 'cm-file-ic' }, icon('doc')), h('span', { class: 'cm-file-main' }, h('strong', null, f.n || '文件'), h('span', { class: 'muted' }, fmtBytes(f.s || 0))),
        icon('download', 'i tiny')))))
    if (m.boosts?.length) body.push(h('div', { class: 'cm-boosts' }, m.boosts.map((b) =>
      h('button', { class: 'cm-boost boost-sent' + officialFrame(b, 'chat') + (b.mine ? ' mine' : ''), type: 'button', title: `${b.name || b.username} · ${clock(b.at)}${b.mine ? ' · 点一下撤掉' : ''}`,
        onclick: (e) => b.mine && pane ? chatBoost(m, pane, '') : userCard(b.username, e.currentTarget) }, avatar(b.avatar, b.name || b.username, 16), boostText(b.text)))))
    if (m.reactions.length) body.push(h('div', { class: 'cm-rx' }, m.reactions.map((r) => rxChip(m, r, pane))))
    // 反向引用：有人回复过这条，显示「N 条回复」，点开列出回复人 + 摘要，点一条跳过去
    if (m.reply_count > 0 && m.id > 0) body.push(h('button', { class: 'cm-replies', type: 'button', 'data-pop': 'rpl' + m.id, 'aria-haspopup': 'true',
      onclick: (e) => chatReplies(e.currentTarget, m, pane) }, icon('reply', 'i tiny'), `${m.reply_count} 条回复`))
  }
  const atMe = S.me && !m.mine && !m.deleted && m.body && new RegExp('@' + S.me.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w.-])', 'i').test(stripQuotes(m.body))
  return h('div', { class: 'cm-msg' + (cont ? ' cont' : '') + (m.mine ? ' mine' : '') + (m.deleted ? ' gone' : '') + (ref ? ' has-ref' : '') + (atMe || ref?.classList.contains('me') ? ' at-me' : ''),
    'data-msg': m.id, id: 'msg-' + m.id },
  h('div', { class: 'cm-side' }, cont ? h('time', null, clock(m.created_at)) : face),
  h('div', { class: 'cm-main' },
    !cont && h('div', { class: 'cm-head' },
      compactIdentity(m.user, 'chat', uName('button', m.user, { class: 'cm-name', type: 'button', title: canAt ? `@${m.user.username}` : who, 'data-pop': 'u' + m.user.username, onclick: at }, who, 'chat')[0]),
      h('time', { title: new Date(m.created_at * 1000).toLocaleString('zh-CN', { hour12: false }) }, clock(m.created_at)),
      m.floor && h('span', { class: 'cm-floor' }, m.floor + '楼')),
    ref && h('div', { class: 'cm-ref-row' }, ref),
    body),
  !m.deleted && S.me && !pending && chatTools(m, pane),
  !m.deleted && S.me && !pending && h('span', { class: 'cm-sw', 'aria-hidden': 'true' }, icon('reply')))
}

// 「N 条回复」弹层：服务端按 reply_to 查（不受当前只加载了多少条的限制），点一条用 jumpTo 跳过去
function chatReplies(anchor, m, pane) {
  const key = 'rpl' + m.id
  const box = h('div', { class: 'who-pop cm-rpl-pop' }, h('div', { class: 'spinner' }))
  if (!openPop(anchor, box, { key, cls: 'pop-who' })) return
  api(`/chat/messages/${m.id}/replies`).then((d) => {
    if (POP?.key !== key) return
    const items = d.items || []
    box.replaceChildren(
      h('div', { class: 'pop-head' }, h('strong', null, `${items.length} 条回复`)),
      h('div', { class: 'who-list' }, items.length ? items.map((x) => h('button', { class: 'who-row cm-rpl-row', type: 'button',
        onclick: () => { closePop(); pane ? pane.jumpTo(x.id) : jumpMsg(x.id) } },
        avatar(x.avatar, x.name || x.username, 28),
        h('span', { class: 'who-main' }, h('strong', null, x.name || x.username, h('time', { class: 'muted' }, ' ' + clock(x.at))),
          h('span', { class: 'muted cm-rpl-text' }, x.text || (x.image ? '[图片]' : '…'))))) : h('p', { class: 'muted who-none' }, '回复都撤回了')))
    placePop(anchor, POP.el, 'left')
  }).catch((e) => box.replaceChildren(h('p', { class: 'muted who-none' }, e.message)))
}

// 表情回应：表情 + 最多 3 个回应人的头像 + 人数；点表情切换自己的回应，点头像看完整名单
function rxChip(m, r, pane) {
  const names = (r.who || []).map((u) => u.name || u.username)
  const title = names.length ? `${names.join('、')}${r.count > names.length ? ` 等 ${r.count} 人` : ''}回应了 ${emoLabel(r.emoji)}` : emoLabel(r.emoji)
  return h('span', { class: 'cm-chip' + (r.mine ? ' on' : ''), title },
    h('button', { class: 'cm-chip-emo', type: 'button', 'aria-label': (r.mine ? '取消回应 ' : '回应 ') + emoLabel(r.emoji), onclick: () => chatReact(m, r.emoji, pane) },
      emo(r.emoji), h('span', null, r.count)),
    r.who?.length > 0 && h('button', { class: 'cm-chip-who', type: 'button', 'aria-label': '看谁回应了', 'data-pop': 'rxw' + m.id,
      onclick: (e) => whoReacted(e.currentTarget, `/chat/messages/${m.id}/reactions`, 'rxw' + m.id, r.emoji) },
    r.who.map((u) => avatar(u.avatar, u.name || u.username, 18))))
}

// 谁回应了：按表情分组的名单（帖子的表情 / 一句回应也用这个）
function whoReacted(anchor, path, key, focus) {
  const box = h('div', { class: 'who-pop' }, h('div', { class: 'spinner' }))
  if (!openPop(anchor, box, { key, cls: 'pop-who' })) return
  api(path).then((d) => {
    if (POP?.key !== key) return
    const rx = d.items || d.reactions || []
    const rp = d.replies || []
    const groups = new Map()
    rx.forEach((x) => { if (!groups.has(x.emoji)) groups.set(x.emoji, []); groups.get(x.emoji).push(x) })
    const tabs = [['all', h('span', null, '全部 ' + (rx.length + rp.length))], ...[...groups].map(([k, l]) => [k, h('span', null, emo(k), ' ' + l.length)])]
    if (rp.length) tabs.push(['reply', h('span', null, '一句回应 ' + rp.length)])
    let cur = focus && (groups.has(focus) || (focus === 'reply' && rp.length)) ? focus : 'all'
    const list = h('div', { class: 'who-list' })
    const row = (x, mark) => h('button', { class: 'who-row', type: 'button', onclick: (e) => userCard(x.username, e.currentTarget) },
      avatar(x.avatar, x.name || x.username, 28),
      h('span', { class: 'who-main' }, h('strong', null, x.name || x.username), h('span', { class: 'muted' }, '@' + x.username)),
      h('span', { class: 'who-mark' }, mark))
    const tabBar = h('div', { class: 'who-tabs', role: 'tablist' })
    const draw = () => {
      tabBar.replaceChildren(...tabs.map(([k, label]) => h('button', { class: 'who-tab' + (k === cur ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(k === cur),
        onclick: () => { cur = k; draw() } }, label)))
      const items = cur === 'all' ? [...rx.map((x) => [x, emo(x.emoji)]), ...rp.map((x) => [x, h('span', { class: 'who-reply' }, x.text)])]
        : cur === 'reply' ? rp.map((x) => [x, h('span', { class: 'who-reply' }, x.text)]) : (groups.get(cur) || []).map((x) => [x, emo(x.emoji)])
      list.replaceChildren(...(items.length ? items.map(([x, mk]) => row(x, mk)) : [h('p', { class: 'muted who-none' }, '还没有人')]))
    }
    draw()
    box.replaceChildren(...nodes(tabs.length > 2 && tabBar, list))
    placePop(anchor, POP.el, 'left')
  }).catch((e) => box.replaceChildren(h('p', { class: 'muted who-none' }, e.message)))
}

// 消息操作：悬停工具条、右键菜单共用
const chatCopy = (m) => copyText(m.body || (m.media?.[0]?.u || m.image) && location.origin + (m.media?.[0]?.u || m.image) || '')
async function chatDelete(m, pane) {
  if (!m.mine && !confirm(`删除 ${m.user.username} 的这条消息？`)) return
  try {
    await api(`/chat/messages/${m.id}`, { method: 'DELETE' })
    pane.update({ ...m, deleted: true, body: '', image: null, media: null, reactions: [], can_delete: false, can_edit: false })
    if (m.mine) pane.recalled(m)
  } catch (e) { toast(e.message, 'err') }
}
const QUICK_RX = () => [...new Set(['+1', ...quickEmos()])].slice(0, 6)
function chatTools(m, pane) {
  const key = 'cmt' + m.id
  const b = (ic, title, onclick, extra = {}) => h('button', { class: 'cm-tool', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  const mine = new Set(m.reactions.filter((r) => r.mine).map((r) => r.emoji))
  return h('div', { class: 'cm-tools' },
    // 悬停直接点的几个快捷表情，+1 打头
    h('span', { class: 'cm-quick' }, QUICK_RX().slice(0, 3).map((k) =>
      h('button', { class: 'cm-tool cm-q' + (mine.has(k) ? ' on' : ''), type: 'button', title: emoLabel(k), 'aria-label': '回应 ' + emoLabel(k), onclick: () => chatReact(m, k, pane) }, emo(k)))),
    longPressEmoji(b('emojiAdd', '表情回应', (e) => openPop(e.currentTarget, emojiBoard((k) => { closePop(); chatReact(m, k, pane) },
      { mine }), { key: key + 'e', cls: 'pop-emo' }), { 'data-pop': key + 'e' }),
    (k) => chatReact(m, k, pane), key + 'e'),
    b('reply', '回复', () => pane.setReply(m)),
    m.body && !m.mine && b('plus', '+1 跟着复读这句', () => pane.send?.(m.body)),
    b('rocket', '回应', (e) => boostPrompt(m, pane, e.currentTarget), { 'data-pop': 'cmb' + m.id }),
    b('more', '更多（也可以右键消息）', (e) => chatMenu(m, pane, e), { 'data-pop': 'cmm' + m.id }))
}
// 选区落在哪条消息里：按选区所在的那份元素算，不按 id 去文档里找第一份
const selMsgId = (doc) => {
  const n = doc.getSelection()?.anchorNode
  return (n?.nodeType === 1 ? n : n?.parentElement)?.closest?.('[data-msg]')?.dataset.msg
}
// 右键菜单：顶上一排快捷表情，下面是全部操作
function chatMenu(m, pane, e) {
  const doc = e.target.ownerDocument
  const btn = e.type === 'click' ? e.currentTarget : null
  // 位置当场记下来：菜单里点「转成帖子 / 加速」再开第二个弹层时，工具条已经收起，按钮量出来是 0,0（会跑到左上角）
  const r0 = btn ? btn.getBoundingClientRect() : { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }
  const box0 = { left: r0.left, right: r0.right, top: r0.top, bottom: r0.bottom }
  const anchor = { ownerDocument: doc, getBoundingClientRect: () => box0 }
  // 触发菜单的那一份消息（同一条可能同时在主列表和历史层里）
  const host = e.target.closest?.(`[data-msg="${m.id}"]`) || doc.querySelector(`[data-msg="${m.id}"]`)
  const sel = String(doc.getSelection() || '').trim()
  const selIn = sel && selMsgId(doc) === String(m.id)
  const item = (label, ic, fn, cls = '') => h('button', { class: 'menu-item ' + cls, type: 'button', onclick: () => { closePop(); fn() } }, icon(ic), label)
  const mine = new Set(m.reactions.filter((r) => r.mine).map((r) => r.emoji))
  const pic = m.media?.[0]?.u || m.image
  const key = 'cmm' + m.id
  openPop(anchor, h('div', { class: 'menu-list cm-menu' },
    h('div', { class: 'cm-menu-rx' }, QUICK_RX().map((k) =>
      h('button', { class: 'eq-btn' + (mine.has(k) ? ' on' : ''), type: 'button', title: emoLabel(k), onclick: () => { closePop(); chatReact(m, k, pane) } }, emo(k))),
    h('button', { class: 'eq-btn', type: 'button', title: '更多表情', 'aria-label': '更多表情', onclick: () => {
      openPop(anchor, emojiBoard((k) => { closePop(); chatReact(m, k, pane) }, { mine }), { key: key + 'e', cls: 'pop-emo' })
    } }, icon('emojiAdd'))),
    item('回复', 'reply', () => pane.setReply(m)),
    item('引用', 'quote', () => { pane.setReply(m); pane.quoteMsg(m) }),
    m.body && item('+1 复读', 'plus', () => pane.send?.(m.body)),
    item('回应', 'rocket', () => boostPrompt(m, pane, anchor)),
    selIn ? item('复制选中的文字', 'copy', () => copyText(sel)) : item('复制', 'copy', () => chatCopy(m)),
    m.body && !selIn && item('选择文字', 'quote', () => {
      // 选中整条，手机上会出系统的选择柄，可以再拖着调范围
      const t = host?.querySelector('.cm-text, .im-text')
      if (t) setTimeout(() => doc.getSelection().selectAllChildren(t), 50)
    }),
    pic && item('复制图片链接', 'image', () => copyText(location.origin + pic)),
    m.reactions.length > 0 && item('谁回应了', 'users', () => whoReacted(anchor, `/chat/messages/${m.id}/reactions`, 'rxw' + m.id)),
    (m.image || m.media?.length) && (m.meme_id
      ? item('看转成的帖子', 'ext', () => navigate('/m/' + m.meme_id))
      : item('转成帖子', 'send', () => chatToPost(m, pane, anchor, key + 'p'))),
    m.can_edit && m.body && item('编辑', 'pen', () => pane.setEdit(m)),
    m.can_delete && item(m.mine ? '撤回' : '删除', 'trash', () => chatDelete(m, pane), 'danger')),
  { key, cls: 'pop-menu', align: btn ? 'right' : 'left' })
}
// 二级只选标签，点了就发；图会复制一份，聊天里撤回也不影响帖子
function chatToPost(m, pane, anchor, key) {
  if (!requireLogin('发帖')) return
  // 发帖人：别人的消息默认记在原发言人名下，也可以记在自己名下
  let as = 'author'
  const go = async (tags) => {
    closePop()
    try {
      const r = await api(`/chat/messages/${m.id}/to-post`, { method: 'POST', body: { tags, as } })
      pane.update({ ...m, meme_id: r.id })
      toast(r.existed ? `已经转过了：No.${r.id}` : `已发成帖子 No.${r.id}`, 'ok')
      S.bgKey = null
      S.wallFresh = true
    } catch (e) { toast(e.message, 'err') }
  }
  const segBox = h('div', { class: 'segs small', role: 'radiogroup', 'aria-label': '发帖人' })
  const drawSeg = () => segBox.replaceChildren(...[['author', '记在 ' + (m.user?.name || m.user?.username || '原发言人') + ' 名下'], ['me', '记在我名下']].map(([k, l]) =>
    h('button', { class: 'seg' + (k === as ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === as), onclick: () => { as = k; drawSeg() } }, l)))
  drawSeg()
  const chips = h('div', { class: 'tag-pick' })
  const drawChips = (extra = []) => chips.replaceChildren(
    ...[...TAG_PRESETS, ...extra].map((t) => h('button', { class: 'chip', type: 'button', onclick: () => go([t]) }, '#' + t)),
    h('button', { class: 'chip ghost', type: 'button', onclick: () => go([]) }, '不加标签'))
  drawChips()
  allTags().then(drawChips)
  openPop(anchor, h('div', { class: 'to-post' },
    !m.mine && segBox,
    h('div', { class: 'muted sm' }, '选个标签就直接发布'),
    chips),
  { key, cls: 'pop-to-post' })
}
// 选群消息：先选群，再搜关键词 / 发言人；选中后插入一段引用（带群号，在公告里点也能跳回群里那条）
function msgPicker(anchor, onPick, key, gid0) {
  if (POP?.key === key) return closePop()
  const groups = CHAT.groups || []
  if (!groups.length) { loadGroups(); return toast('群列表还没加载好，稍后再点一次') }
  let gid = gid0 || groups[0].id
  const sel = h('select', { class: 'input sm', 'aria-label': '哪个群', onchange: () => { gid = Number(sel.value); run() } },
    groups.map((g) => h('option', { value: g.id, selected: g.id === gid }, g.name)))
  const input = h('input', { class: 'input', type: 'search', placeholder: '搜消息内容，或 @某人 看 TA 说过的', 'aria-label': '搜群消息' })
  const out = h('div', { class: 'pp-list' })
  let t = 0, seq = 0
  const run = async () => {
    const raw = input.value.trim()
    const who = raw.startsWith('@') ? raw.slice(1).split(/\s+/)[0] : ''
    const q = who ? raw.slice(who.length + 1).trim() : raw
    const my = ++seq
    out.replaceChildren(h('div', { class: 'spinner' }))
    try {
      // 什么都没输就看最近的
      const d = q || who ? await api(`/chat/groups/${gid}/search?` + new URLSearchParams({ q, user: who }))
        : { items: (await api(`/chat/groups/${gid}/messages`)).items.slice(-12).reverse() }
      if (my !== seq) return
      const items = d.items.filter((m) => !m.deleted)
      out.replaceChildren(...(items.length ? items.map((m) => {
        const text = previewText(stripQuotes(m.body || '')) || (m.media?.length ? '[图片]' : '')
        return h('button', { class: 'pp-row', type: 'button', onclick: () => { closePop(); onPick(m, gid, text) } },
          avatar(m.user.avatar, m.user.name || m.user.username, 28),
          h('span', { class: 'pp-main' }, h('strong', null, text.slice(0, 60) || '…'),
            h('span', { class: 'muted' }, `${m.user.name || m.user.username} · ${fmtTime(m.created_at)}`)))
      }) : [h('p', { class: 'muted sm' }, '没找到')]))
    } catch (e) { if (my === seq) out.replaceChildren(h('p', { class: 'muted sm' }, e.message)) }
  }
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 300) })
  openPop(anchor, h('div', { class: 'post-pick' }, h('div', { class: 'row' }, sel, input), out), { key, cls: 'pop-post' })
  run()
  setTimeout(() => input.focus())
}
const msgQuote = (m, gid, text) => `[quote="${quoteName(m.user.name || m.user.username)}, msg:${m.id}, g:${gid}"]
${(text || '[图片]').slice(0, 200)}
[/quote]
`
// 选帖子：搜标题 / 标签，或直接输编号；选中后交给 onPick（群聊里插入 No.编号）
function postPicker(anchor, onPick, key) {
  if (POP?.key === key) return closePop()
  const input = h('input', { class: 'input', type: 'search', placeholder: '搜帖子标题 / 标签，或直接输编号', 'aria-label': '搜帖子' })
  const out = h('div', { class: 'pp-list' })
  let t = 0
  let seq = 0
  const run = async () => {
    const q = input.value.trim().replace(/^No\.?\s*/i, '')
    const my = ++seq
    out.replaceChildren(h('div', { class: 'spinner' }))
    try {
      const items = /^\d+$/.test(q) ? [await memeById(Number(q))]
        : (await api('/memes?' + new URLSearchParams({ ...nsfwParam(), ...(q ? { q } : {}), limit: '8' }))).items
      if (my !== seq) return
      out.replaceChildren(...(items.length ? items.map((m) => {
        const im = m.images?.[0] || { u: m.image, t: m.thumb }
        return h('button', { class: 'pp-row', type: 'button', onclick: () => { closePop(); onPick(m) } },
          h('span', { class: 'pp-thumb' + (wantBlur(m) ? ' blur' : '') }, memeImg(im.t || im.u, { loading: 'lazy' })),
          h('span', { class: 'pp-main' }, h('strong', null, h('span', { class: 'post-ref' }, 'No.' + m.id), ' ', m.title || previewText(m.text || '') || '一张图'),
            h('span', { class: 'muted' }, `${m.author_name || '佚名'} · ${fmtTime(m.created_at)}`)))
      }) : [h('p', { class: 'muted sm pp-empty' }, '没找到')]))
    } catch (e) { if (my === seq) out.replaceChildren(h('p', { class: 'muted sm pp-empty' }, e.message)) }
  }
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 250) })
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); out.querySelector('.pp-row')?.click() } })
  openPop(anchor, h('div', { class: 'post-pick' }, input, out), { key, cls: 'pop-post', up: true })
  run()
  setTimeout(() => input.focus())
}
// 回应：每人在一条消息下面挂一句 ≤12 字的短回复（再挂一次就是改，清空就是撤）
const BOOST_MAX = 12
// 预设回应各有一套艺术字样式（.bz-0 ~ .bz-11）；自己打的字不加样式
const BOOST_PRESETS = ['善', '甚好', '欢欢', '妈妈', '666', '太地狱了', '神！', '挂！', '我去~', '大大大', '电！！', '不讲不讲', '魔了']
const boostText = (t) => { const i = BOOST_PRESETS.indexOf(t); return i < 0 ? h('span', null, t) : h('span', { class: 'bz bz-' + i }, t) }
function boostChoices(pick, current) {
  return h('div', { class: 'boost-quick' }, BOOST_PRESETS.map(t => h('button', {
    class: 'chip bz-chip' + (t === current ? ' on' : ''), type: 'button', onclick: () => pick(t)
  }, boostText(t))))
}
async function chatBoost(m, pane, text) {
  if (!requireLogin()) return
  try {
    const { message } = await api(`/chat/messages/${m.id}/boosts`, { method: 'POST', body: { text } })
    pane.update(message)
  } catch (e) { toast(e.message, 'err') }
}
function boostPrompt(m, pane, anchor) {
  const key = 'cmb' + m.id
  if (POP?.key === key) return closePop()
  // 手机上点了「回应」工具条会收起，按钮量不到位置；当场记下来
  if (anchor instanceof (anchor.ownerDocument?.defaultView || window).Element) {
    const anchor0 = anchor
    const r = anchor.getBoundingClientRect()
    const box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    anchor = { ownerDocument: anchor.ownerDocument, getBoundingClientRect: () => (anchor0.isConnected && anchor0.offsetParent ? anchor0.getBoundingClientRect() : box) }
  }
  const old = m.boosts?.find((b) => b.mine)?.text || ''
  const input = h('input', { class: 'input', maxlength: BOOST_MAX, value: old, placeholder: `自己写一句（${BOOST_MAX} 字内）`, enterkeyhint: 'send', 'aria-label': '回应' })
  const go = () => { closePop(); chatBoost(m, pane, input.value.trim()) }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go() } })
  openPop(anchor, h('div', { class: 'boost-pop' },
    h('div', { class: 'boost-row' }, icon('rocket', 'i tiny'), input, h('button', { class: 'btn btn-primary sm', type: 'button', onclick: go }, old ? '改' : '挂上')),
    boostChoices(t => { input.value = t; go() }, old),
    old && h('button', { class: 'chip ghost', type: 'button', onclick: () => { input.value = ''; go() } }, '撤掉我的')), { key, cls: 'pop-boost', focusScope: input })
  if ((input.ownerDocument.defaultView?.innerWidth || innerWidth) > 760) setTimeout(() => { if (input.isConnected) input.focus() })
}
async function chatReact(m, emoji, pane) {
  if (!requireLogin()) return
  try {
    const { message } = await api(`/chat/messages/${m.id}/reactions`, { method: 'POST', body: { emoji } })
    pushRecent(emoji)
    pane.update(message)
  } catch (e) { toast(e.message, 'err') }
}

// ---------- 站内群聊页 /chat ----------
async function renderChat(gid) {
  document.body.classList.add('chat-mode')
  onPageLeave(() => document.body.classList.remove('chat-mode', 'chat-open'))
  if (!S.me) {
    main.replaceChildren(h('div', { class: 'chat-login' },
      h('div', { class: 'chat-login-mark' }, icon('users')),
      h('h1', null, '迷友群'),
      h('p', null, '聊梗图、接龙、转发好图，群里的人都来自 linux.do。'),
      h('a', { class: 'btn btn-primary', href: loginHref() }, '前往登录')))
    return
  }
  const side = h('aside', { class: 'chat-side' })
  const body = h('section', { class: 'chat-body' }, h('div', { class: 'spinner' }))
  const page = h('div', { class: 'chat-page' }, side, body)
  main.replaceChildren(page)
  // 高度按实际剩下的空间算：上面有公告条、手机键盘弹起时都不会把输入框挤出屏幕
  const fit = () => {
    if (!page.isConnected) return
    const vh = visualViewport?.height || innerHeight
    const top = page.getBoundingClientRect().top + scrollY
    const bottom=innerWidth<=640 ? (document.querySelector('.mobile-nav')?.getBoundingClientRect().height || 0) : 0
    page.style.height = Math.max(200, vh - top - bottom - (innerWidth > 760 ? 12 : 0)) + 'px'
    // 手机点输入框弹出输入法：浏览器会先把整页往上推，页面变矮之后下面就空出一截白底。输入框本来就在可见区底部，推回原位
    if (innerWidth <= 760 && (scrollY > 0 || visualViewport?.offsetTop > 0)) requestAnimationFrame(() => { if (page.isConnected) scrollTo(0, 0) })
  }
  const ro = new ResizeObserver(fit)
  ro.observe(document.body)
  const nb = document.getElementById('notice-bar')
  if (nb) ro.observe(nb)
  visualViewport?.addEventListener('resize', fit)
  visualViewport?.addEventListener('scroll', fit)
  addEventListener('resize', fit)
  requestAnimationFrame(fit)
  onPageLeave(() => { ro.disconnect(); visualViewport?.removeEventListener('resize', fit); visualViewport?.removeEventListener('scroll', fit); removeEventListener('resize', fit) })
  const drawSide = () => side.replaceChildren(
    h('div', { class: 'chat-side-head' }, h('strong', null, '迷友群'), h('span', { class: 'grow' }),
      h('a', { class: 'btn btn-ghost sm', href: '/dm', 'data-link': true }, '私信')),
    h('div', { class: 'chat-groups' }, CHAT.groups.map((g) => groupRow(g, g.id === gid, () => navigate('/chat/' + g.id))),
      (CHAT.gone || []).map((x) => groupRow(goneAsGroup(x), x.id === gid, () => navigate('/chat/' + x.id)))))
  onPageLeave(onChat(drawSide))
  if (!CHAT.loaded) await loadGroups()
  // 只有一个群：不要群列表这一层，直接进
  const solo = CHAT.groups.length + (CHAT.gone?.length || 0) === 1 && !CHAT.canManage
  main.firstChild.classList.toggle('solo', solo)
  const g = findGroup(gid) || (!gid && (solo || innerWidth > 760) ? CHAT.groups[0] : null)
  drawSide()
  const gx = !g && (findGone(gid) || (!gid && !CHAT.groups.length && CHAT.gone?.[0]))
  if (gx) {
    body.replaceChildren(goneView(gx, { onBack: solo ? null : () => navigate('/chat') }))
    return
  }
  if (!g) {
    body.replaceChildren(h('div', { class: 'chat-empty' }, icon('chat'), h('p', null, gid ? '这个群不存在，或者你不在群里' : '选一个群开始聊天')))
    return
  }
  if (g.id !== gid) { history.replaceState({ inApp: true }, '', '/chat/' + g.id); S.bgKey = '/chat/' + g.id; gid = g.id; drawSide() }
  document.body.classList.add('chat-open')
  const pane = chatPane(g)
  onPageLeave(pane.destroy)
  body.replaceChildren(chatHead(g, { back: solo ? null : () => navigate('/chat'), pane }), pane.el)
  if (innerWidth > 760) pane.focus()
}

function groupRow(g, on, onclick) {
  const sub = g.gone ? (g.gone.kind === 'left' ? '你已退出' : '暂时关闭') + (g.gone.req === 0 ? ' · 已申请' : '')
    : g.latest ? `${g.latest.by || ''}：${g.latest.text}` : g.is_default ? '所有登录的佬友都在这里' : '还没有消息'
  return h('button', { class: 'chat-gr' + (on ? ' on' : '') + (g.gone ? ' gone' : ''), type: 'button', onclick },
    groupAvatar(g.name, 40),
    h('span', { class: 'chat-gr-main' },
      h('span', { class: 'chat-gr-top' }, h('strong', null, g.name), h('time', null, convTime(g.latest?.at))),
      h('span', { class: 'chat-gr-sub' }, h('span', null, sub),
        g.muted && icon('bellOff', 'i tiny muted'),
        (g.muted ? g.at_me > 0 : g.unread > 0) && h('i', { class: 'chat-badge' + (g.muted ? ' at' : '') }, g.muted ? '@' + g.at_me : g.unread > 99 ? '99+' : g.unread))))
}
// 群头部：人数跟着群列表（30 秒刷一次、进退群立即刷）动态变
function memberCount(g, fmt, cls = 'muted') {
  const el = h('span', { class: cls }, fmt(g))
  const off = onChat(() => {
    if (!el.isConnected) return off()
    const x = findGroup(g.id)
    if (x) el.textContent = fmt(x)
  })
  return el
}
function chatHead(g, { back, pane } = {}) {
  return h('header', { class: 'chat-head' },
    back && h('button', { class: 'btn-icon ghost chat-back', 'aria-label': '返回', onclick: back }, icon('chevL')),
    groupAvatar(g.name, 34),
    h('span', { class: 'chat-head-title' }, h('strong', { title:g.name }, g.name), memberCount(g, (x) => `${x.members} 人${x.online ? ` · ${x.online} 人在线` : ''}${x.is_default && innerWidth>640 ? ' · 登录即入群' : ''}`)),
    pane && h('button', { class: 'btn-icon ghost', title: '搜索聊天记录', 'aria-label': '搜索聊天记录', onclick: () => pane.search() }, icon('search')),
    h('a', { class: 'btn-icon ghost', href: '/dm', 'data-link': true, title: '私信', 'aria-label': '私信' }, icon('chat')),
    pane && h('button', { class: 'btn-icon ghost', title: '弹出小窗', 'aria-label': '弹出小窗', onclick: () => chatPopout(g) }, icon('popout')),
    h('button', { class: 'btn btn-ghost sm chat-members', 'aria-label':CHAT.canManage ? '成员与设置' : '成员',title:CHAT.canManage ? '成员与设置' : '成员', onclick: () => groupPanel(g) }, icon('users', 'i tiny'), h('span',{class:'lbl'},CHAT.canManage ? '成员与设置' : '成员'),
      CHAT.canManage && findGroup(g.id)?.reqs > 0 && h('i', { class: 'chat-badge', title: '有人申请回群' }, findGroup(g.id).reqs)))
}

// 「x 分钟前在线」：3 分钟内有动静算在线
function seenText(ts, now) {
  if (!ts) return ['', false]
  const s = now - ts
  if (s < 180) return ['在线', true]
  if (s < 3600) return [`${Math.floor(s / 60)} 分钟前在线`, false]
  if (s < 86400) return [`${Math.floor(s / 3600)} 小时前在线`, false]
  return [`${fmtTime(ts)}在线`, false]
}

// 成员与设置：所有人能看成员、退群；管理员能改名、拉人、移出、解散（默认群也能拉人、移人，只是不能解散）
async function groupPanel(g, { outside } = {}) {
  const panel = openModalShell('group-panel')
  S.modal.kind = 'group'
  const close = () => closeModal(false)
  panel.replaceChildren(h('div', { class: 'modal-loading' }, h('div', { class: 'spinner' })))
  let d
  const load = async () => { d = await api(`/chat/groups/${g.id}/members`); MEMBERS.delete(g.id) }
  try { await load() } catch (e) { toast(e.message, 'err'); return close() }
  if (S.modal?.kind !== 'group') return
  const admin = CHAT.canManage
  const changed = async () => { await load(); if (S.modal?.kind === 'group') draw(); loadGroups() }
  const leave = async () => {
    if (!confirm(`退出「${d.group.name}」？${d.group.is_default ? '默认群退了之后，管理员可以再把你拉回来。' : ''}`)) return
    try {
      await api(`/chat/groups/${g.id}/members/${S.me.id}`, { method: 'DELETE' })
      toast('已退出群聊')
      close()
      await loadGroups()
      afterGroupGone(g.id)
    } catch (e) { toast(e.message, 'err') }
  }
  // 不在群里的人（被移出的 / 自己退的）：只有群管理看得到，可以拉回、同意或拒绝申请
  let out = null, outOpen = !!outside
  const loadOut = async () => { try { out = await api(`/chat/groups/${g.id}/outside`) } catch (e) { out = { error: e.message } } if (S.modal?.kind === 'group') draw() }
  if (admin && outOpen) await loadOut()
  const outSec = () => {
    if (!admin) return null
    const head = h('button', { class: 'gp-h gp-fold', type: 'button', 'aria-expanded': String(outOpen), onclick: () => { outOpen = !outOpen; if (outOpen && !out) loadOut(); draw() } },
      icon(outOpen ? 'chevD' : 'chevR', 'i tiny'), '不在群里的人', h('span', { class: 'muted sm' }, ' · 只有管理能看到'),
      findGroup(g.id)?.reqs > 0 && h('i', { class: 'chat-badge' }, findGroup(g.id).reqs + ' 个申请'))
    if (!outOpen) return h('div', { class: 'gp-sec' }, head)
    const act = (u, ok, label, cls) => h('button', { class: `btn-text sm ${cls || ''}`, type: 'button', onclick: async () => {
      try {
        await api(`/chat/groups/${g.id}/join-req/${u.id}`, { method: 'POST', body: { ok } })
        toast(ok ? `${u.username} 回到群里了` : '已拒绝', 'ok')
        out = null
        await load(); await loadOut(); loadGroups()
      } catch (e) { toast(e.message, 'err') }
    } }, label)
    const list = !out ? [h('div', { class: 'spinner' })] : out.error ? [h('p', { class: 'muted' }, out.error)] : !out.users.length ? [h('p', { class: 'muted sm' }, '没有人')]
      : out.users.map((u) => h('div', { class: 'gp-row' + (u.req === 0 ? ' req' : '') },
        h('button', { class: 'gp-face', type: 'button', 'data-pop': 'u' + u.username, onclick: (e) => userCard(u.username, e.currentTarget) }, avatar(u.avatar, u.name || u.username, 32)),
        h('span', { class: 'gp-who' }, h('strong', null, u.name || u.username),
          h('span', { class: 'muted' }, '@' + u.username, ' · ', u.kind === 'left' ? '自己退出' : '被移出', u.gone_at ? ` · ${fmtTime(u.gone_at)}` : ''),
          u.req === 0 && h('span', { class: 'gp-req' }, `申请回群 · ${fmtTime(u.req_at)}`)),
        u.req === 0 ? [act(u, true, '同意'), act(u, false, '拒绝', 'danger')] : act(u, true, '拉回')))
    return h('div', { class: 'gp-sec' }, head, h('div', { class: 'gp-list gp-out' }, list))
  }
  const noticeSec = () => {
    const x = findGroup(g.id) || {}
    if (!admin) return x.notice ? h('div', { class: 'gp-sec' }, h('h3', { class: 'gp-h' }, '群公告'), h('div', { class: 'gp-notice' }, richBody(x.notice, { md: 'lite', inlineRefs: true, groupId: g.id }))) : null
    const ta = h('textarea', { class: 'input', rows: 4, maxlength: 1000, placeholder: '写点群规、活动、提醒…（留空就是不要公告）；写 No.1234 引用帖子' }, x.notice || '')
    return h('div', { class: 'gp-sec' }, field('群公告', ta, '改了之后，所有人进群都会在顶上看到一次'),
      h('div', { class: 'row-end' },
        h('button', { class: 'btn-text sm', type: 'button', 'data-pop': 'gnpost', onclick: (e) => postPicker(e.currentTarget, (m) => insertAtCursor(ta, `No.${m.id} `), 'gnpost') }, icon('link', 'i tiny'), '引用帖子'),
        h('button', { class: 'btn-text sm', type: 'button', 'data-pop': 'gnmsg', onclick: (e) => msgPicker(e.currentTarget, (m, gid, t) => insertAtCursor(ta, msgQuote(m, gid, t)), 'gnmsg', g.id) }, icon('reply', 'i tiny'), '引用群消息'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: async () => {
        try {
          const r = await api(`/chat/groups/${g.id}/notice`, { method: 'PUT', body: { notice: ta.value } })
          const y = findGroup(g.id)
          if (y) Object.assign(y, r)
          CHAT.subs.forEach((fn) => fn())
          toast(r.notice ? '公告已发布' : '公告已清空', 'ok')
        } catch (e) { toast(e.message, 'err') }
      } }, '保存公告')))
  }
  const roleTag = (u) => u.is_admin ? h('span', { class: 'role-tag admin' }, '管理员') : u.role === 'gadmin' ? h('span', { class: 'role-tag gadmin' }, '群管') : null
  const canKick = (u) => admin && u.id !== S.me.id && !u.is_admin && (u.role !== 'gadmin' || S.me.is_admin)
  const canLimit = (u) => S.me?.is_admin && u.id !== S.me.id && !u.is_admin
  const kick = async (u) => {
    if (!confirm(`把 ${u.username} 移出「${d.group.name}」？${d.group.is_default ? '移出后不会再被自动拉回默认群，除非管理员重新拉人。' : ''}`)) return
    try {
      await api(`/chat/groups/${g.id}/members/${u.id}`, { method: 'DELETE' })
      toast(`已移出 ${u.username}`)
      changed()
    } catch (e) { toast(e.message, 'err') }
  }
  // 成员分三组：群主（建群的人；默认群没有建群人，算站长）/ 管理（管理员、群管）/ 成员；组内保持接口给的顺序（在线的在前）
  const TIERS = ['群主', '管理', '成员']
  const tier = (u) => (u.creator || u.owner ? 0 : u.is_admin || u.role === 'gadmin' ? 1 : 2)
  // 搜索框和列表只建一次：搜的时候只重画列表，输入框不丢焦点
  let mq = ''
  const listBox = h('div', { class: 'gp-list gp-members' })
  const msearch = h('input', { class: 'input sm gp-msearch', type: 'search', placeholder: '搜昵称 / 用户名', 'aria-label': '搜索群成员',
    oninput: (e) => { mq = e.target.value; drawList() } })
  const memberRow = (u) => {
    const [seen, on] = seenText(u.last_seen, d.now)
    const who = u.name || u.username
    const acts = nodes(
      canLimit(u) && h('button', { class: 'btn-text sm', type: 'button', onclick: () => memberAdmin(u.username) }, '限制'),
      canKick(u) && h('button', { class: 'btn-text danger sm', type: 'button', onclick: () => kick(u) }, '移出'))
    // 手机上右侧按钮组收起，换成「⋯」菜单（CSS 控制显示哪一个）
    const key = 'gpm' + u.id
    const item = (label, ic, fn, cls = '') => h('button', { class: 'menu-item ' + cls, type: 'button', role: 'menuitem', onclick: () => { closePop(); fn() } }, icon(ic), label)
    const more = acts.length > 0 && h('button', { class: 'btn-icon ghost sm gp-more', type: 'button', title: '更多操作', 'aria-label': `${who} 的更多操作`, 'aria-haspopup': 'menu', 'data-pop': key,
      onclick: (e) => openPop(e.currentTarget, h('div', { class: 'menu-list', role: 'menu' },
        item('查看资料', 'user', () => userCard(u.username, more)),
        canLimit(u) && item('限制…', 'lock', () => memberAdmin(u.username)),
        canKick(u) && item('移出群聊', 'trash', () => kick(u), 'danger')), { key, align: 'right' }) }, icon('more'))
    return h('div', { class: 'gp-row gp-mem', title: u.bio || null },
      h('button', { class: 'gp-face', type: 'button', 'aria-label': `${who} 的资料`, 'data-pop': 'u' + u.username, onclick: (e) => userCard(u.username, e.currentTarget) },
        avatar(u.avatar, who, 36), h('i', { class: 'gp-dot' + (on ? ' on' : ''), title: seen || '没有记录' })),
      h('span', { class: 'gp-who' },
        h('span', { class: 'gp-name' }, uName('strong', u, {}, who, 'chat')),
        h('span', { class: 'muted gp-sub' }, '@' + u.username, ' · TL', u.trust_level, u.joined_at ? ` · ${fmtDay(u.joined_at)}进群` : '')),
      h('span', { class: 'gp-tags' }, tier(u) === 0 && h('span', { class: 'role-tag admin' }, '群主'), roleTag(u)),
      h('span', { class: 'gp-seen' + (on ? ' on' : '') }, seen || '—'),
      acts.length > 0 && h('span', { class: 'gp-acts' }, acts),
      more)
  }
  const drawList = () => {
    const k = mq.trim().toLowerCase()
    const hit = k ? d.members.filter((u) => [u.name, u.username, u.bio].some((s) => s && String(s).toLowerCase().includes(k))) : d.members
    const out = []
    TIERS.forEach((label, t) => {
      const us = hit.filter((u) => tier(u) === t)
      if (us.length) out.push(h('h4', { class: 'gp-group' }, label, h('span', null, us.length)), ...us.map(memberRow))
    })
    listBox.replaceChildren(...(out.length ? out : [h('p', { class: 'muted gp-empty' }, k ? `没有叫「${mq.trim()}」的成员` : '还没有成员')]))
  }
  const draw = () => {
    const online = d.members.filter((u) => seenText(u.last_seen, d.now)[1]).length
    drawList()
    const name = h('input', { class: 'input', maxlength: 20, value: d.group.name })
    const picker = userPicker()
    panel.replaceChildren(...nodes(
      h('header', { class: 'compose-head' }, h('h2', null, d.group.name, h('span', { class: 'muted' }, ` · ${d.total} 人 · ${online} 人在线`)),
        h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: close }, icon('close'))),
      h('div', { class: 'gp-body' },
        noticeSec(),
        admin && h('div', { class: 'gp-sec' },
          field('群名', h('div', { class: 'gp-inline' }, name, h('button', { class: 'btn btn-ghost sm', onclick: async () => {
            try {
              await api(`/chat/groups/${g.id}`, { method: 'PATCH', body: { name: name.value } })
              d.group.name = name.value.trim()
              toast('已改名', 'ok')
              draw()
              loadGroups()
            } catch (e) { toast(e.message, 'err') }
          } }, '保存')))),
        admin && h('div', { class: 'gp-sec' },
          field('拉人进群', h('div', { class: 'gp-inline' }, picker.el, h('button', { class: 'btn btn-primary sm', onclick: async () => {
            const names = picker.value()
            if (!names.length) return toast('先搜索并选几个人')
            try {
              const r = await api(`/chat/groups/${g.id}/members`, { method: 'POST', body: { usernames: names } })
              toast(`拉进 ${r.added} 人${r.missing.length ? `，没找到：${r.missing.join('、')}` : ''}`, r.added ? 'ok' : '')
              changed()
            } catch (e) { toast(e.message, 'err') }
          } }, '拉进群')), d.group.is_default ? '被移出或自己退群的人，也可以在这里拉回来' : '只能拉登录过本站的人')),
        outSec(),
        h('div', { class: 'gp-sec' }, h('h3', { class: 'gp-h' }, '我的设置'),
          h('label', { class: 'set-check' }, h('input', { type: 'checkbox', checked: !!findGroup(g.id)?.muted, onchange: async (e) => {
            const muted = e.target.checked
            try {
              await api(`/chat/groups/${g.id}/mute`, { method: 'PUT', body: { muted } })
              const x = findGroup(g.id)
              if (x) x.muted = muted
              syncChatBadges()
              loadGroups()
              toast(muted ? '已开免打扰：只有 @ 你的消息才算未读' : '已取消免打扰', 'ok')
            } catch (err) { e.target.checked = !muted; toast(err.message, 'err') }
          } }), '消息免打扰（只有 @ 我的才计数、才提醒）'),
          awaySettings(),
          chatAutoSettings(),
          decoHideSettings()),
        h('div', { class: 'gp-sec gp-msec' },
          h('div', { class: 'gp-mhead' }, h('h3', { class: 'gp-h' }, '群成员', h('span', { class: 'muted' }, ` ${d.total} 人 · ${online} 在线`)), msearch),
          listBox),
        d.total > d.members.length && h('p', { class: 'gp-note muted' }, `只显示前 ${d.members.length} 位（在线的排前面）`),
        h('div', { class: 'gp-danger' },
          h('button', { class: 'btn-text danger', onclick: leave }, '退出群聊'),
          S.me.is_admin && !d.group.is_default && h('button', { class: 'btn-text danger', onclick: async () => {
            if (!confirm(`解散「${d.group.name}」？聊天记录和图片会一起删除，不能恢复。`)) return
            try {
              await api(`/chat/groups/${g.id}`, { method: 'DELETE' })
              toast('群已解散')
              close()
              await loadGroups()
              afterGroupGone(g.id)
            } catch (e) { toast(e.message, 'err') }
          } }, '解散这个群')))))
  }
  draw()
}

// 搜用户名选人：回车也能直接加一个名字
function userPicker() {
  const chosen = new Map()
  const input = h('input', { class: 'input', placeholder: '输入用户名搜索', autocomplete: 'off' })
  const chips = h('span', { class: 'up-chips' })
  const sug = h('div', { class: 'up-sug', hidden: true })
  const drawChips = () => chips.replaceChildren(...[...chosen.values()].map((u) => h('span', { class: 'up-chip' }, u.username,
    h('button', { type: 'button', 'aria-label': '移除', onclick: () => { chosen.delete(u.username); drawChips() } }, icon('close', 'i tiny')))))
  const pick = (u) => { chosen.set(u.username, u); drawChips(); input.value = ''; sug.hidden = true; input.focus() }
  let t = 0
  input.addEventListener('input', () => {
    clearTimeout(t)
    const q = input.value.trim()
    if (!q) { sug.hidden = true; return }
    t = setTimeout(async () => {
      try {
        const { users } = await api('/chat/users?q=' + encodeURIComponent(q))
        if (input.value.trim() !== q) return
        sug.replaceChildren(...(users.length ? users.map((u) => h('button', { class: 'up-opt', type: 'button', onclick: () => pick(u) },
          avatar(u.avatar, u.name || u.username, 22), h('strong', null, u.username), u.name && h('span', { class: 'muted' }, u.name)))
          : [h('div', { class: 'muted up-none' }, '没找到，对方需要先登录过本站')]))
        sug.hidden = false
      } catch {}
    }, 220)
  })
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return
    e.preventDefault()
    const first = sug.querySelector('.up-opt')
    if (first && !sug.hidden) first.click()
    else if (input.value.trim()) pick({ username: input.value.trim().replace(/^@/, '') })
  })
  return { el: h('div', { class: 'up' }, chips, input, sug), value: () => [...chosen.keys()] }
}

function groupCreate() {
  if (!CHAT.canCreate) return toast('只有管理员能建群')
  const panel = openModalShell('group-panel')
  S.modal.kind = 'group'
  const name = h('input', { class: 'input', maxlength: 20, placeholder: '比如：摸鱼小分队' })
  const picker = userPicker()
  const submit = h('button', { class: 'btn btn-primary' }, '创建')
  submit.addEventListener('click', async () => {
    if (!name.value.trim()) return name.focus()
    submit.disabled = true
    try {
      const r = await api('/chat/groups', { method: 'POST', body: { name: name.value, members: picker.value() } })
      if (r.missing.length) toast(`没找到：${r.missing.join('、')}`)
      closeModal(false)
      await loadGroups()
      openGroup(r.id)
    } catch (e) { toast(e.message, 'err'); submit.disabled = false }
  })
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, '新建群组'), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: () => closeModal(false) }, icon('close'))),
    h('div', { class: 'gp-body' }, field('群名', name), field('成员', picker.el)),
    h('footer', { class: 'compose-foot' }, h('span', { class: 'grow' }),
      h('button', { class: 'btn btn-ghost', onclick: () => closeModal(false) }, '取消'), submit))
  name.focus()
}

// 打开某个群：各个外观各自的入口
function openGroup(id) {
  if (S.skin === 'feishu' && IM) { const c = imGroupConvs().find((x) => x.gid === id); if (c) imOpen(c) }
  else if (S.skin === 'linuxdo' && LD) ldChat(id)
  else navigate('/chat/' + id)
}
function afterGroupGone(id) {
  if (S.skin === 'feishu' && IM?.cur?.gid === id) { const c = imGroupConvs()[0]; if (c) imOpen(c) }
  else if (S.skin === 'linuxdo' && LD) ldChat()
  else if (!S.skin && location.pathname === '/chat/' + id) navigate('/chat')
}

// 转发一张图到群聊：发一条带站内链接的消息，群里会显示预览卡
async function forwardMeme(m, anchor) {
  if (!requireLogin()) return
  if (!CHAT.loaded) await loadGroups()
  const it = (g) => h('button', { class: 'menu-item', onclick: async () => {
    closePop()
    try {
      await api(`/chat/groups/${g.id}/messages`, { method: 'POST', body: { body: `${m.title || '分享一张图'}\n${location.origin}/m/${m.id}` } })
      toast(`已转发到「${g.name}」`, 'ok')
      CHAT.panes.forEach((p) => p.group.id === g.id && p.poll())
    } catch (e) { toast(e.message, 'err') }
  } }, icon('chat'), g.name)
  openPop(anchor, h('div', { class: 'menu-list' }, h('div', { class: 'pop-head muted' }, '转发到群聊'), CHAT.groups.map(it)), { key: 'fwd' + m.id, align: 'right' })
}

// ---------- 群聊小窗 ----------
// 弹出：单独一个浏览器小窗口，只有消息区，标题就是群名；和主页面共用登录、表情、看图等
const focusedDoc = () => [...PIPS].find((w) => !w.closed && w.document.hasFocus())?.document || document
// 画中画：Chrome / Edge 116+ 的「文档画中画」窗口永远浮在最上面，切到别的网页、别的软件都看得见
const canPip = () => 'documentPictureInPicture' in window
async function chatPopout(g0, { pip = false } = {}) {
  const g = findGroup(g0.id) || g0
  const name = 'jhchat' + g.id
  const w = Math.min(420, screen.availWidth - 40)
  const ht = Math.min(680, screen.availHeight - 80)
  let win
  if (pip && canPip()) {
    if (documentPictureInPicture.window) { documentPictureInPicture.window.close() }
    try { win = await documentPictureInPicture.requestWindow({ width: w, height: Math.min(ht, 560) }) } catch (e) { return toast('浮窗没打开：' + e.message, 'err') }
    win.document.documentElement.lang = 'zh-CN'
    win.document.body.className = 'chat-pip'
  } else {
    win = open('', name, `popup=yes,width=${w},height=${ht},left=${screen.availWidth - w - 24},top=${Math.max(0, screen.availHeight - ht - 60)}`)
    if (!win) return toast('浏览器拦住了弹窗，允许本站弹出窗口后再试', 'err')
    if (win.__jh && !win.closed) { win.focus(); return }
    const d = win.document
    d.open()
    d.write('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="chat-pip"></body></html>')
    d.close()
  }
  const doc = win.document
  win.__jh = true
  // 小窗顶上一条：不透明度 + 置顶。浏览器自己做不到，跟摸鱼窗一样把状态写进标题，本机的摸鱼助手按标题去调透明 / 置顶
  const cp = (() => { try { return { op: 0.95, top: false, ...JSON.parse(localStorage.getItem('chatPip') || '{}') } } catch { return { op: 0.95, top: false } } })()
  const gname = () => findGroup(g.id)?.name || g.name
  const setTitle = () => { doc.title = `尽欢 · 摸鱼 · ${Math.round(cp.op * 100)}%${cp.top ? ' · 置顶' : ''} · ${gname()}` }
  const saveCp = () => { localStorage.setItem('chatPip', JSON.stringify(cp)); setTitle(); pin.classList.toggle('on', cp.top); pin.title = cp.top ? '已置顶，点一下取消（要开着摸鱼助手）' : '置顶（要开着摸鱼助手）' }
  const opR = h('input', { type: 'range', min: 10, max: 100, value: Math.round(cp.op * 100), 'aria-label': '小窗不透明度', title: '不透明度（要开着摸鱼助手才能透出后面的软件）',
    oninput: () => { cp.op = opR.value / 100; opN.textContent = opR.value + '%'; saveCp() } })
  const opN = h('span', { class: 'pip-op-n' }, Math.round(cp.op * 100) + '%')
  const pin = h('button', { class: 'pip-btn', type: 'button', 'aria-label': '置顶', onclick: () => { cp.top = !cp.top; saveCp() } }, icon('pin', 'i tiny'))
  const bar = h('div', { class: 'pip-bar' }, h('strong', { class: 'pip-name' }, gname()), h('span', { class: 'grow' }),
    h('label', { class: 'pip-op' }, icon('eye', 'i tiny'), opR, opN), pin,
    h('a', { class: 'pip-btn', href: '/tools/jinhuan-moyu.cmd', download: 'jinhuan-moyu.cmd', title: '下载摸鱼助手（Windows）：透明和置顶靠它', 'aria-label': '下载摸鱼助手' }, icon('download', 'i tiny')))
  for (const a of ['data-theme', 'data-skin', 'data-blur-all']) {
    const v = document.documentElement.getAttribute(a)
    if (v != null) doc.documentElement.setAttribute(a, v)
  }
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((l) => doc.head.append(l.cloneNode(true)))
  const icoEl = document.querySelector('link[rel~="icon"]')
  if (icoEl) doc.head.append(icoEl.cloneNode(true))
  const pane = chatPane(g)
  doc.body.append(bar, pane.el, h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }))
  saveCp()
  bindMsgTools(doc)
  PIPS.add(win)
  // 自己轮询：主页面在后台时浏览器会压它的计时器，小窗不受影响
  pane.st.ownPoll = win.setInterval(() => {
    if (doc.hidden) return
    pane.poll()
    if (Date.now() - CHAT.at > 30000) loadGroups()
  }, 3000)
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) pane.poll() })
  doc.addEventListener('pointerdown', popOutside)
  win.addEventListener('resize', closePop)
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]')
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    window.focus()
    navigate(a.getAttribute('href'))
  })
  doc.addEventListener('keydown', (e) => {
    if (S.viewer?.doc === doc) {
      if (e.key !== 'Escape' && e.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (S.viewer.zoomKey?.(e)) return
      if (e.key === 'Escape') S.viewer.close()
      else if (e.key === 'z' || e.key === 'Z') S.viewer.zoom()
      else if (e.key === 'ArrowLeft') S.viewer.go(-1)
      else if (e.key === 'ArrowRight') S.viewer.go(1)
      return
    }
    if (e.key === 'Escape' && POP) closePop()
  })
  // 群名改了跟着改标题；被移出 / 群没了就提示
  const off = onChat(() => {
    if (win.closed) return off()
    const x = findGroup(g.id)
    if (x) { setTitle(); bar.querySelector('.pip-name').textContent = x.name }
    else if (CHAT.loaded) bar.querySelector('.pip-name').textContent = g.name + '（已不在群里）'
  })
  win.addEventListener('pagehide', () => { if (S.viewer?.doc === doc) S.viewer.close(true); pane.destroy(); PIPS.delete(win); off() })
  win.focus()
  pane.focus()
  dockMin()
}
addEventListener('pagehide', () => PIPS.forEach((w) => w.close()))

// ---------- 站内悬浮群聊 ----------
// 右下角一个气泡（带未读数），点开是一个小聊天框；换页面不断开。/chat 页、伪装、老板键时不显示
const DOCK = { el: null, pane: null, open: false }
matchMedia('(max-width: 760px)').addEventListener('change', () => dockSync())
const dockPrefs = () => { try { return { on: true, ...JSON.parse(localStorage.getItem('chatDock')) } } catch { return { on: true } } }
const saveDock = (x) => localStorage.setItem('chatDock', JSON.stringify({ ...dockPrefs(), ...x }))
function dockSync() {
  const want = innerWidth > 760 && S.me && dockPrefs().on && !S.skin && !location.pathname.startsWith('/chat')
  if (!want) {
    if (DOCK.el) { DOCK.pane?.destroy(); DOCK.el.remove(); Object.assign(DOCK, { el: null, pane: null, open: false }) }
    dockSplit()
    return
  }
  if (!DOCK.el) {
    DOCK.el = h('div', { class: 'chat-dock' })
    dockDraggable(DOCK.el)
    document.body.append(DOCK.el)
    dockDraw(dockPrefs().open)
  }
}
function dockMin() { if (DOCK.open) dockDraw(false) }
function dockPosition(position = dockPrefs().position) {
  const el = DOCK.el
  if (!el) return
  const floating = DOCK.open && !el.classList.contains('split')
  const head = el.querySelector('.cd-head')
  if (head) {
    head.tabIndex = floating ? 0 : -1
    head.title = floating ? '拖动移动；方向键微调；双击恢复位置' : ''
    head.setAttribute('aria-label', floating ? '移动群聊窗口' : '群聊窗口')
  }
  if (!floating || !Number.isFinite(position?.x) || !Number.isFinite(position?.y)) {
    for (const key of ['left','top','right','bottom']) el.style[key] = ''
    return
  }
  const rect = el.getBoundingClientRect()
  const x = Math.max(8, Math.min(position.x, innerWidth - rect.width - 8))
  const y = Math.max(8, Math.min(position.y, innerHeight - rect.height - 8))
  Object.assign(el.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' })
}
function dockDraggable(el) {
  let drag = null
  const handle = target => DOCK.open && !el.classList.contains('split') && target.closest('.cd-head') && !target.closest('button,a,input,select,textarea')
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !handle(e.target)) return
    const rect = el.getBoundingClientRect()
    drag = { id:e.pointerId, x:e.clientX, y:e.clientY, left:rect.left, top:rect.top }
    el.setPointerCapture(e.pointerId); el.classList.add('cd-dragging'); e.preventDefault()
  })
  el.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return
    dockPosition({ x:drag.left + e.clientX - drag.x, y:drag.top + e.clientY - drag.y })
  })
  el.addEventListener('pointerup', e => {
    if (drag?.id !== e.pointerId) return
    const rect = el.getBoundingClientRect()
    saveDock({ position:{x:rect.left,y:rect.top} }); drag = null; el.classList.remove('cd-dragging')
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  })
  const cancel = () => { if (drag) { drag = null; el.classList.remove('cd-dragging'); dockPosition() } }
  el.addEventListener('pointercancel', cancel); el.addEventListener('lostpointercapture', cancel)
  el.addEventListener('dblclick', e => { if (handle(e.target)) { saveDock({position:null}); dockPosition() } })
  el.addEventListener('keydown', e => {
    if (!e.target.matches('.cd-head') || !handle(e.target)) return
    const delta = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key]
    if (!delta) return
    e.preventDefault(); const rect = el.getBoundingClientRect(), step = e.shiftKey ? 40 : 10
    const position = {x:rect.left + delta[0]*step,y:rect.top + delta[1]*step}
    dockPosition(position); const clamped = el.getBoundingClientRect(); saveDock({position:{x:clamped.left,y:clamped.top}})
  })
}
// 分屏：群聊钉在右边一整列，网页（图廊、详情、看大图）都让到左边
function dockSplit() {
  const on = !!(DOCK.el && DOCK.open && dockPrefs().split && innerWidth > 900)
  document.body.classList.toggle('chat-split', on)
  DOCK.el?.classList.toggle('split', on)
  splitHandle(on)
  dockPosition()
}
addEventListener('resize', () => dockSplit())
// 分屏宽度：左右分界处的拖动条。范围 280px ~ 60vw，存在 dockPrefs().splitW（px）；双击 / Enter 恢复默认（CSS 里的 clamp(340px, 30vw, 460px)）
// 键盘：← 变宽、→ 变窄（每次 16px，按住 Shift 64px），Home 最窄、End 最宽
const SPLIT_MIN = 280
const splitMax = () => Math.max(SPLIT_MIN, Math.round(innerWidth * 0.6))
const splitDef = () => Math.round(Math.min(460, Math.max(340, innerWidth * 0.3)))
const splitClamp = (w) => Math.round(Math.min(splitMax(), Math.max(SPLIT_MIN, w)))
let SPLIT_EL = null
function splitApply(w) {
  const b = document.body.style
  if (w == null) b.removeProperty('--split-w')
  else b.setProperty('--split-w', splitClamp(w) + 'px')
  if (!SPLIT_EL) return
  const cur = w == null ? splitDef() : splitClamp(w)
  SPLIT_EL.setAttribute('aria-valuemin', SPLIT_MIN)
  SPLIT_EL.setAttribute('aria-valuemax', splitMax())
  SPLIT_EL.setAttribute('aria-valuenow', cur)
  SPLIT_EL.setAttribute('aria-valuetext', `群聊宽 ${cur} 像素`)
}
function splitHandle(on) {
  if (!on) {
    SPLIT_EL?.remove()
    SPLIT_EL = null
    document.body.style.removeProperty('--split-w')
    return
  }
  if (!SPLIT_EL) {
    const save = (w) => { saveDock({ splitW: w == null ? null : splitClamp(w) }); splitApply(dockPrefs().splitW) }
    const cur = () => dockPrefs().splitW ?? splitDef()
    let drag = null
    SPLIT_EL = h('div', { class: 'split-handle', role: 'separator', tabindex: 0, 'aria-orientation': 'vertical', 'aria-label': '调整群聊宽度',
      title: '拖动调整群聊宽度，双击恢复默认',
      onpointerdown: (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        SPLIT_EL.setPointerCapture(e.pointerId)
        drag = { id: e.pointerId, w: cur() }
        document.body.classList.add('split-drag')
      },
      onpointermove: (e) => {
        if (!drag || e.pointerId !== drag.id) return
        drag.w = splitClamp(innerWidth - e.clientX)
        splitApply(drag.w)
      },
      onpointerup: (e) => {
        if (!drag || e.pointerId !== drag.id) return
        document.body.classList.remove('split-drag')
        save(drag.w)
        drag = null
      },
      onpointercancel: () => { if (drag) { document.body.classList.remove('split-drag'); splitApply(dockPrefs().splitW); drag = null } },
      ondblclick: () => { save(null); toast('群聊宽度已恢复默认') },
      onkeydown: (e) => {
        const step = e.shiftKey ? 64 : 16
        const k = e.key
        if (k === 'ArrowLeft') save(cur() + step)
        else if (k === 'ArrowRight') save(cur() - step)
        else if (k === 'Home') save(SPLIT_MIN)
        else if (k === 'End') save(splitMax())
        else if (k === 'Enter') save(null)
        else return
        e.preventDefault()
      } })
    document.body.append(SPLIT_EL)
  }
  splitApply(dockPrefs().splitW)
}
function dockDraw(open) {
  DOCK.open = !!open
  saveDock({ open: DOCK.open })
  DOCK.el.classList.toggle('open', DOCK.open)
  dockSplit()
  if (!DOCK.open) {
    DOCK.pane?.destroy()
    DOCK.pane = null
    DOCK.el.replaceChildren(h('button', { class: 'cd-bubble', type: 'button', title: '群聊', 'aria-label': '打开群聊', onclick: () => dockDraw(true) },
      icon('chat'), chatBadge('chat-badge cd-badge')))
    return
  }
  if (!CHAT.loaded) {
    DOCK.el.replaceChildren(h('div', { class: 'cd-panel' }, h('div', { class: 'spinner' })))
    loadGroups().then(() => DOCK.open && dockDraw(true))
    return
  }
  const g = findGroup(dockPrefs().gid) || CHAT.groups[0]
  const ib = (ic, title, onclick) => h('button', { class: 'btn-icon ghost sm', type: 'button', title, 'aria-label': title, onclick }, icon(ic))
  if (!g) {
    DOCK.pane?.destroy()
    DOCK.pane = null
    const gx = findGone(dockPrefs().gid) || CHAT.gone?.[0]
    DOCK.el.replaceChildren(h('div', { class: 'cd-panel' },
      h('header', { class: 'cd-head' }, h('strong', null, '群聊'), h('span', { class: 'grow' }), ib('minus', '收起', () => dockDraw(false))),
      gx ? goneView(gx) : h('div', { class: 'chat-empty' }, icon('chat'), h('p', null, '你还不在任何群里'))))
    dockPosition()
    return
  }
  DOCK.pane?.destroy()
  const pane = chatPane(g)
  DOCK.pane = pane
  const pick = CHAT.groups.length > 1
    ? h('select', { class: 'cd-pick', 'aria-label': '切换群', onchange: (e) => { saveDock({ gid: Number(e.target.value) }); dockDraw(true) } },
      CHAT.groups.map((x) => h('option', { value: x.id }, x.name + (x.unread ? ` (${x.unread})` : ''))))
    : h('strong', { class: 'cd-title' }, g.name)
  if (pick.tagName === 'SELECT') pick.value = String(g.id)
  DOCK.el.replaceChildren(h('div', { class: 'cd-panel' },
    h('header', { class: 'cd-head' }, groupAvatar(g.name, 24), pick, memberCount(g, (x) => `${x.members} 人`, 'muted cd-n'), h('span', { class: 'grow' }),
      ib('search', '搜索聊天记录', () => pane.search()),
      canPip() && ib('pin', '置顶浮窗：切到别的网页 / 软件也一直看得到', () => chatPopout(g, { pip: true })),
      ib('popout', '弹出小窗', () => chatPopout(g)),
      innerWidth > 900 && h('button', { class: 'btn-icon ghost sm' + (dockPrefs().split ? ' on' : ''), type: 'button', title: dockPrefs().split ? '退出分屏' : '分屏：左边看图，右边聊天', 'aria-label': '分屏',
        'aria-pressed': String(!!dockPrefs().split), onclick: () => { saveDock({ split: !dockPrefs().split }); dockSplit(); dockDraw(true) } }, icon('apps')),
      ib('chat', '去群聊页', () => navigate('/chat/' + g.id)),
      ib('minus', '收起', () => dockDraw(false))),
    pane.el))
  dockPosition()
  pane.focus()
}
onChat(() => {
  if (!DOCK.el || !DOCK.open) return
  if (DOCK.pane ? !findGroup(DOCK.pane.group.id) : CHAT.groups.length && DOCK.el.querySelector('.chat-gone')) dockDraw(true)
})

// ---------- 飞书伪装：群聊会话 ----------
const imGroupConvs = () => [...CHAT.groups.map((g) => ({
  key: 'g:' + g.id, gid: g.id, title: g.name, unseen: g.unread, latest: g.latest,
  sub: g.latest ? null : g.is_default ? '全员群 · 来说第一句吧' : '暂无消息',
})), ...(CHAT.gone || []).map((x) => ({ key: 'g:' + x.id, gid: x.id, title: goneAsGroup(x).name, unseen: 0, latest: null, sub: x.kind === 'left' ? '你已退出' : '暂时关闭' }))]
function imOpenGroup(c) {
  IM.clean.splice(0).forEach((fn) => fn())
  IM.cur = c
  IM.st = null
  IM.quote = null
  localStorage.setItem('im-last', c.key)
  IM.list.querySelectorAll('.im-conv').forEach((el) => el.classList.toggle('on', el.dataset.key === c.key))
  const g = findGroup(c.gid)
  if (!g) {
    const gx = findGone(c.gid)
    if (gx) {
      IM.chat.replaceChildren(h('header', { class: 'im-chat-head' },
        h('button', { class: 'im-ibtn im-back', 'aria-label': '返回', onclick: () => IM.root.classList.remove('chat-open') }, icon('chevL')),
        h('span', { class: 'im-chat-title' }, h('strong', null, c.title))), goneView(gx))
      IM.root.classList.add('chat-open')
    }
    return
  }
  const pane = chatPane(g)
  IM.clean.push(pane.destroy)
  IM.chat.replaceChildren(
    h('header', { class: 'im-chat-head' },
      h('button', { class: 'im-ibtn im-back', 'aria-label': '返回', onclick: () => IM.root.classList.remove('chat-open') }, icon('chevL')),
      groupAvatar(g.name, 32),
      h('span', { class: 'im-chat-title' }, h('strong', null, g.name), memberCount(g, (x) => `${x.members} 位成员`, 'im-chat-n')),
      h('span', { class: 'grow' }),
      h('button', { class: 'im-ibtn', title: '搜索聊天记录', onclick: () => pane.search() }, icon('search')),
      h('button', { class: 'im-ibtn', title: '群成员', onclick: () => groupPanel(g) }, icon('users')),
      h('button', { class: 'im-ibtn', title: '设置', 'data-pop': 'imset', onclick: (e) => imSettings(e.currentTarget) }, icon('more'))),
    pane.el)
  IM.root.classList.add('chat-open')
  if (innerWidth > 760) pane.focus()
}
function imPlus(anchor) {
  if (!CHAT.canCreate) return openCompose()
  const it = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' }, it('发图片', 'image', openCompose)), { key: 'implus', align: 'right' })
}
// 在某天的群里直接发图：发完刷新会话列表；正好在看今天且已经翻到底，就把新图接在最后
async function imAfterPost(id) {
  await imLoadConvs()
  const today = dayOf(Math.floor(Date.now() / 1000))
  const st = IM?.st
  if (st && st.c.day === today && !st.more) {
    try {
      const { meme } = await api(`/memes/${id}`)
      st.msgs.append(...imMessage(st, meme))
      st.scroller.scrollTo({ top: st.scroller.scrollHeight, behavior: 'smooth' })
    } catch {}
  }
  toast(`已发到「${IM?.convs.find((x) => x.day === today)?.title || '今天的群'}」`, 'ok')
}

// ---------- 伪装：LINUX DO（Discourse）帖子 ----------
// 整个图廊是一个帖子：每张图是一楼，评论是楼里的回复，一句回应像「助推」；右下角是论坛聊天，里面是迷友群
const LD_TOPIC = { title: '【持续更新】每天摸鱼时收集的图，欢迎佬友补充', cat: '搞七捻三', color: '#25AAE2', tags: ['纯水', '日常'] }
const LD_CATS = [['开发调优', '#3AB54A'], ['资源荟萃', '#F7941D'], ['文档共建', '#9EB83B'], ['搞七捻三', '#25AAE2'], ['跳蚤市场', '#ED207B'], ['运营反馈', '#808281']]
const LD_MARK = '<svg viewBox="0 0 120 120"><clipPath id="ldc"><circle cx="60" cy="60" r="47"/></clipPath><circle cx="60" cy="60" r="50" fill="#F0F0F0"/><g clip-path="url(#ldc)"><rect x="10" y="10" width="100" height="30" fill="#1C1C1E"/><rect x="10" y="40" width="100" height="40" fill="#F0F0F0"/><rect x="10" y="80" width="100" height="30" fill="#FFB003"/></g></svg>'
const LD_PAGE = 20
TAB.linuxdo = { title: `${LD_TOPIC.title} - ${LD_TOPIC.cat} - LINUX DO`, icon: '/disguise/linuxdo.svg' }
let LD = null

function ldMount() {
  LD = { posts: new Map(), lo: 0, hi: 0, moreUp: false, moreDown: false, busy: false, gen: 0, total: 0, days: [], q: '', ac: new AbortController(), chat: null, clean: [] }
  const sig = { signal: LD.ac.signal }
  LD.stream = h('div', { class: 'ld-stream' })
  LD.top = h('div', { class: 'ld-sentinel' })
  LD.bottom = h('div', { class: 'ld-sentinel' })
  LD.notice = h('div', { class: 'ld-notice', hidden: true })
  LD.timeline = h('div', { class: 'ld-timeline' })
  LD.progress = h('button', { class: 'ld-progress', type: 'button', onclick: ldJumpPrompt })
  LD.header = h('header', { class: 'ld-header' })
  LD.side = h('nav', { class: 'ld-side', 'aria-label': '侧边栏' })
  LD.footer = h('div', { class: 'ld-foot', hidden: true },
    h('button', { class: 'ld-btn primary', onclick: () => ldCompose() }, icon('reply', 'i tiny'), '回复'),
    h('button', { class: 'ld-btn', onclick: () => ldShare(location.origin + '/', LD_TOPIC.title) }, icon('link', 'i tiny'), '分享'),
    h('button', { class: 'ld-btn', onclick: () => toast('已加入书签') }, icon('bookmark', 'i tiny'), '书签'))
  LD.titleEl = h('div', { class: 'ld-title' },
    h('h1', null, LD_TOPIC.title),
    h('div', { class: 'ld-title-meta' },
      h('span', { class: 'ld-cat' }, h('i', { style: { background: LD_TOPIC.color } }), LD_TOPIC.cat),
      LD_TOPIC.tags.map((t) => h('span', { class: 'ld-tag' }, t))))
  LD.root = h('div', { class: 'ld' },
    LD.header,
    h('div', { class: 'ld-wrap' },
      LD.side,
      h('main', { class: 'ld-main' },
        LD.titleEl, LD.notice,
        h('div', { class: 'ld-cols' },
          h('div', { class: 'ld-posts' }, LD.top, LD.stream, LD.bottom, LD.footer),
          h('aside', { class: 'ld-tl-wrap' }, LD.timeline)))),
    LD.progress)
  document.body.append(LD.root)
  ldHeader()
  ldSide()
  LD.clean.push(onChat(() => { ldSide(); syncChatBadges() }))
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    if (e.target === LD.top) ldMore(-1)
    else ldMore(1)
  }), { rootMargin: '900px 0px' })
  io.observe(LD.top)
  io.observe(LD.bottom)
  LD.io = io
  addEventListener('scroll', () => { if (!LD.raf) LD.raf = requestAnimationFrame(() => { LD.raf = 0; ldSync() }) }, { passive: true, ...sig })
  addEventListener('resize', ldSync, sig)
  document.addEventListener('mouseup', ldSelQuote, sig)
  if (S.me && !CHAT.loaded) loadGroups()
  LD.metaP = ldMeta()
}

// 每天多少楼：算总楼层数和时间轴
async function ldMeta() {
  try {
    const p = new URLSearchParams({ sort: 'old', ...nsfwParam(), ...(LD.q ? { q: LD.q } : {}) })
    const { days } = await api('/days?' + p)
    if (!LD) return
    LD.days = days
    LD.total = days.reduce((a, d) => a + d.n, 0)
  } catch (e) { toast(e.message, 'err') }
}

// 跳到某一楼：清空后从那里开始加载，上下滚动再接着加载
async function ldJump({ offset = null, focus = 0, bottom = false } = {}) {
  await LD.metaP
  if (!LD) return
  const gen = ++LD.gen
  LD.posts.forEach((p) => p.destroy())
  LD.posts.clear()
  LD.stream.replaceChildren(h('div', { class: 'ld-loading' }, h('div', { class: 'spinner' })))
  let off = offset ?? 0
  if (bottom) off = Math.max(0, LD.total - LD_PAGE)
  const p = new URLSearchParams({ sort: 'old', limit: String(LD_PAGE), ...nsfwParam(), ...(LD.q ? { q: LD.q } : {}) })
  if (focus) p.set('focus', focus)
  else p.set('offset', off)
  let d
  try { d = await api('/memes?' + p) } catch (e) {
    LD.stream.replaceChildren(h('div', { class: 'ld-loading' }, h('button', { class: 'ld-btn', onclick: () => ldJump({ offset, focus, bottom }) }, e.message + ' · 重试')))
    return
  }
  if (gen !== LD.gen) return
  LD.lo = d.offset
  LD.hi = d.offset + d.items.length
  LD.moreUp = LD.lo > 0
  LD.moreDown = d.more
  LD.stream.replaceChildren(...(d.items.length ? ldBuild(d.items, LD.lo) : [h('div', { class: 'ld-loading muted' }, LD.q ? '没有找到相关的楼层' : '还没有楼层')]))
  ldEdges()
  const all = [...LD.posts.values()]
  const target = (focus && LD.posts.get(focus)) || (bottom ? all[all.length - 1] : off || focus ? all[0] : null)
  requestAnimationFrame(() => {
    if (target) {
      window.scrollTo(0, target.el.getBoundingClientRect().top + scrollY - 70)
      if (focus && target.id === focus) target.el.classList.add('flash')
    } else window.scrollTo(0, 0)
    ldSync()
    ldCheck()
  })
}
// 哨兵在视口附近就加载（跳楼后 IntersectionObserver 不一定会再触发，手动查一次）
function ldCheck() {
  if (!LD) return
  for (const [el, dir] of [[LD.top, -1], [LD.bottom, 1]]) {
    const r = el.getBoundingClientRect()
    if (r.bottom > -900 && r.top < innerHeight + 900) ldMore(dir)
  }
}

async function ldMore(dir) {
  if (!LD || LD.busy || (dir < 0 ? !LD.moreUp : !LD.moreDown) || !LD.posts.size) return
  LD.busy = true
  const gen = LD.gen
  const off = dir < 0 ? Math.max(0, LD.lo - LD_PAGE) : LD.hi
  const limit = dir < 0 ? LD.lo - off : LD_PAGE
  try {
    const p = new URLSearchParams({ sort: 'old', limit: String(limit), offset: String(off), ...nsfwParam(), ...(LD.q ? { q: LD.q } : {}) })
    const d = await api('/memes?' + p)
    if (!LD || gen !== LD.gen) return
    if (dir < 0) {
      const anchor = LD.stream.firstElementChild
      const y0 = anchor.getBoundingClientRect().top
      LD.stream.prepend(...ldBuild(d.items, off))
      window.scrollBy(0, anchor.getBoundingClientRect().top - y0) // 往上接楼时保持当前看到的位置不动
      LD.lo = off
      LD.moreUp = off > 0
    } else {
      LD.stream.append(...ldBuild(d.items, off))
      LD.hi = off + d.items.length
      LD.moreDown = d.more
    }
  } catch (e) { toast(e.message, 'err') } finally { if (LD) LD.busy = false }
  if (!LD) return
  ldEdges()
  requestAnimationFrame(ldCheck)
}
function ldEdges() {
  LD.top.replaceChildren(LD.moreUp ? h('div', { class: 'spinner' }) : '')
  LD.bottom.replaceChildren(LD.moreDown ? h('div', { class: 'spinner' }) : '')
  LD.footer.hidden = LD.moreDown
}

// 相邻两楼隔得久就插一条「N 天后」，和论坛一样
function ldGap(a, b) {
  const d = Math.floor((b - a) / 86400)
  if (d < 7) return null
  return h('div', { class: 'ld-gap' }, h('span', null, d < 30 ? `${d} 天后` : d < 365 ? `${Math.floor(d / 30)} 个月后` : `${Math.floor(d / 365)} 年后`))
}
function ldBuild(items, offset) {
  const out = []
  items.forEach((m, i) => {
    if (LD.posts.has(m.id)) return
    if (i > 0) { const g = ldGap(items[i - 1].created_at, m.created_at); if (g) out.push(g) }
    const p = ldPost(m, offset + i + 1)
    LD.posts.set(m.id, p)
    out.push(p.el)
  })
  return out
}

// 一楼：头像 · 用户名 时间 · 图和配文 · 助推（一句回应）· 底部按钮 · 展开的回复（评论）
function ldPost(raw, floor) {
  const m = syncItem(raw)
  const slot = 'ld' + m.id
  const p = { id: m.id, floor, boosting: false, open: false }
  const nav = h('nav', { class: 'ld-ctl' })
  const boosts = h('div', { class: 'ld-boosts' })
  const replies = h('section', { class: 'ld-replies', hidden: true })
  const draw = (x) => {
    nav.replaceChildren(...ldControls(x, p, slot))
    if (!boosts.contains(document.activeElement)) {
      const show = x.reply_count > 0 || p.boosting
      boosts.hidden = !show
      boosts.classList.toggle('boosting', p.boosting)
      boosts.replaceChildren(show ? replyBlock(x, { compact: !p.boosting }) : '')
    }
  }
  p.toggleReplies = (force) => {
    p.open = force ?? !p.open
    replies.hidden = !p.open
    if (p.open) replies.replaceChildren(commentsSection(ITEMS.get(m.id) || m, { compact: true }))
    draw(ITEMS.get(m.id) || m)
  }
  p.boost = () => {
    if (!requireLogin()) return
    p.boosting = !p.boosting
    draw(ITEMS.get(m.id) || m)
    if (p.boosting && innerWidth > 760) boosts.querySelector('.rp-input')?.focus()
  }
  draw(m)
  const who = m.author_name || '佚名'
  p.el = h('article', { class: 'ld-post', 'data-id': m.id, 'data-floor': floor, id: 'post_' + floor },
    h('div', { class: 'ld-av' }, h('button', { type: 'button', 'data-pop': 'u' + who, onclick: (e) => m.author_name && userCard(m.author_name, e.currentTarget) }, avatar(m.author_avatar, who, 45))),
    h('div', { class: 'ld-body' },
      h('div', { class: 'ld-meta' },
        h('button', { class: 'ld-user', type: 'button', 'data-pop': 'u' + who + 'n', onclick: (e) => m.author_name && userCard(m.author_name, e.currentTarget) }, who),
        h('span', { class: 'grow' }),
        h('a', { class: 'ld-date', href: `/m/${m.id}`, title: new Date(m.created_at * 1000).toLocaleString('zh-CN', { hour12: false }),
          onclick: (e) => { e.preventDefault(); ldShare(location.origin + `/m/${m.id}`, `#${floor}`) } }, ldAgo(m.created_at))),
      h('div', { class: 'ld-cooked' }, cardText(m), cardMedia(m)),
      boosts, nav, replies))
  const off = watchItem(m.id, draw)
  p.destroy = off
  if (!isSeen(m)) seenIO.observe(p.el)
  return p
}

function ldControls(m, p, slot) {
  const likes = (m.ld_likes || 0) + (m.like_count || 0)
  const b = (ic, title, onclick, extra = {}) => h('button', { class: 'ld-ib', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  const rx = m.reactions.filter((r) => r.count > 0).sort((a, z) => z.count - a.count)
  const rxN = rx.reduce((a, r) => a + r.count, 0)
  const faved = m.fav_folders?.length > 0
  return nodes(
    m.comment_count > 0 && h('button', { class: 'ld-show-replies' + (p.open ? ' open' : ''), type: 'button', onclick: () => p.toggleReplies() },
      `${m.comment_count} 条回复`, icon('chevD', 'i tiny')),
    h('span', { class: 'grow' }),
    rxN > 0 && h('button', { class: 'ld-rx-sum', type: 'button', title: rx.map((r) => `${emoLabel(r.emoji)} ${r.count}`).join('  '), 'data-pop': slot + 'e',
      onclick: (e) => { if (requireLogin()) openPop(e.currentTarget, emojiPanel(m), { key: slot + 'e', cls: 'pop-emo' }) } },
    rx.slice(0, 3).map((r) => h('span', { class: 'ld-rx-one' + (r.mine ? ' mine' : '') }, emo(r.emoji))), h('span', null, rxN)),
    h('button', { class: 'ld-like' + (m.liked ? ' on' : ''), type: 'button', title: '点赞', onclick: () => toggleLike(m) },
      likes > 0 && h('span', null, fmtN(likes)), icon('heart')),
    b('emojiAdd', '添加表情回应', (e) => { if (requireLogin()) openPop(e.currentTarget, emojiPanel(m), { key: slot + 'e', cls: 'pop-emo' }) }, { 'data-pop': slot + 'e' }),
    b('rocket', '助推（一句话回应）', p.boost, { class: 'ld-ib' + (p.boosting ? ' on' : '') }),
    b('link', '分享链接', () => ldShare(location.origin + `/m/${m.id}`, `#${p.floor}`)),
    b('bookmark', faved ? '已收藏' : '收藏', (e) => doFav(m, e.currentTarget, slot), { class: 'ld-ib fav' + (faved ? ' on' : ''), 'data-pop': slot + 'f', 'data-slot': slot }),
    b('more', '更多', (e) => ldMoreMenu(m, e.currentTarget, slot), { 'data-pop': slot + 'm' }),
    h('button', { class: 'ld-reply', type: 'button', onclick: () => ldCompose({ m, floor: p.floor }) }, icon('reply', 'i tiny'), '回复'))
}

function ldMoreMenu(m, anchor, slot) {
  const it = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' },
    it('引用这一楼', 'quote', () => { const p = LD.posts.get(m.id); ldCompose({ m, floor: p?.floor, quote: m.title || m.text || '[图片]' }) }),
    it('转发到聊天', 'chat', () => forwardMeme(m, anchor)),
    ANCHORS.has(m.id) ? it('移除锚点', 'anchor', () => removeAnchor(m.id)) : it('在这里放锚点', 'anchor', () => addAnchor(m)),
    it('打开原图', 'image', () => open(m.image, '_blank', 'noopener')),
    m.source_url && h('a', { class: 'menu-item', href: m.source_url, target: '_blank', rel: 'noopener', onclick: closePop }, icon('ext'), '原帖楼层')),
  { key: slot + 'm', align: 'right' })
}

function ldShare(url, label) {
  const input = h('input', { class: 'input', value: url, readonly: true })
  openPop(document.activeElement?.closest?.('button, a') || LD.header, h('div', { class: 'ld-share' },
    h('div', { class: 'pop-head' }, h('strong', null, '分享 ', label)),
    h('div', { class: 'ld-share-row' }, input, h('button', { class: 'ld-btn primary', onclick: () => { copyText(url); closePop() } }, icon('copy', 'i tiny'), '复制'))),
  { key: 'ldshare', align: 'right' })
  input.select()
}

// 论坛式时间：几分钟 / 几小时 / 几天，再久就写日期
function ldAgo(ts) {
  const s = Math.floor(Date.now() / 1000) - ts
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天`
  const d = new Date(ts * 1000)
  return d.getFullYear() === new Date().getFullYear() ? `${d.getMonth() + 1}月 ${d.getDate()}日` : `${d.getFullYear()}年${d.getMonth() + 1}月`
}

// 底部回复框：带图 = 发新一楼；回复某一楼 = 那楼的回复（评论）；纯文字不指定楼就提示去回复某楼或聊天
function ldCompose({ m = null, floor = 0, quote = '' } = {}) {
  if (!requireLogin()) return
  if (!LD.comp) LD.comp = ldComposer()
  const c = LD.comp
  c.setTarget(m ? { m, floor } : null)
  if (quote) c.insert(`[quote="${quoteName(m?.author_name)}, post:${floor}, m:${m?.id}"]\n${quote.trim()}\n[/quote]\n`)
  c.show()
}
function ldComposer() {
  const ta = h('textarea', { class: 'ld-ta', placeholder: '在这里输入…', maxlength: 2000 })
  const att = attachSlot()
  const spoiler = h('input', { type: 'checkbox' })
  const preview = h('div', { class: 'ld-preview' })
  const head = h('div', { class: 'ld-c-title' })
  const hint = h('span', { class: 'ld-c-hint' })
  const send = h('button', { class: 'ld-btn primary', type: 'button' }, icon('reply', 'i tiny'), '回复')
  let target = null
  let t = 0
  const render = () => {
    preview.replaceChildren(...richBody(ta.value), ...att.items.filter((it) => !it.video || it.still).map((it) => h('img', { class: 'ld-pv-img', src: it.url, alt: '' })))
    hint.textContent = att.file ? (att.items.length > 1 ? `带 ${att.items.length} 个文件，发成新的一楼` : '带图会发成新的一楼') : target ? `回复 #${target.floor}` : '发新一楼需要带图'
  }
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 150) })
  att.onchange = render
  const wrap = (a, b, ph) => {
    const s = ta.selectionStart, e = ta.selectionEnd
    const sel = ta.value.slice(s, e) || ph
    ta.setRangeText(a + sel + b, s, e, 'select')
    ta.focus()
    render()
  }
  const tb = (ic, title, fn) => h('button', { class: 'ld-ib', type: 'button', title, 'aria-label': title, onclick: fn }, icon(ic))
  const el = h('div', { class: 'ld-composer', hidden: true },
    h('div', { class: 'ld-grip' }),
    h('div', { class: 'ld-c-head' }, head, h('span', { class: 'grow' }),
      tb('chevD', '收起', () => el.classList.toggle('min')),
      tb('close', '关闭', () => hide())),
    h('div', { class: 'ld-c-bar' },
      tb('quote', '引用', () => { if (target) ta.setRangeText(`[quote="${quoteName(target.m.author_name)}, post:${target.floor}, m:${target.m.id}"]\n${(target.m.title || target.m.text || '[图片]').trim()}\n[/quote]\n`, ta.selectionStart, ta.selectionEnd, 'end'); else wrap('[quote]\n', '\n[/quote]', '引用的内容'); render() }),
      tb('bold', '粗体', () => wrap('**', '**', '粗体')),
      tb('link', '链接', () => { const u = prompt('链接地址', 'https://'); if (u && /^https?:\/\/\S+$/.test(u)) { ta.setRangeText(u, ta.selectionStart, ta.selectionEnd, 'end'); render() } }),
      tb('eyeOff', '剧透遮挡', () => wrap('[spoiler]', '[/spoiler]', '剧透')),
      tb('image', '上传图片', att.pick),
      tb('smile', '表情', (e) => openPop(e.currentTarget, stickerPicker((k) => { closePop(); insertAtCursor(ta, k); render() }), { key: 'ldstk', cls: 'pop-stk', up: true }))),
    h('div', { class: 'ld-c-main' }, h('div', { class: 'ld-c-edit' }, ta, att.el, att.input), preview),
    h('div', { class: 'ld-c-foot' }, send,
      h('button', { class: 'ld-btn flat', type: 'button', onclick: () => hide() }, '取消'),
      h('label', { class: 'ld-c-spoiler' }, spoiler, '图片默认模糊'),
      h('span', { class: 'grow' }), hint))
  acceptImages(el, ta, att)
  sendOnModEnter(ta, submit)
  async function submit() {
    const text = ta.value.trim()
    if (!att.file && !text) return ta.focus()
    if (!att.file && !target) return toast('发新一楼需要带张图；只想说话就点某一楼的「回复」，或者去右上角聊天', 'err')
    send.disabled = true
    try {
      if (att.file) {
        const id = await quickPost({ att, text, spoiler: spoiler.checked })
        if (!id) return
        reset()
        hide()
        toast('已发出新的一楼', 'ok')
        ldAfterPost(id)
      } else {
        await api(`/memes/${target.m.id}/comments`, { method: 'POST', body: { body: text } })
        const x = ITEMS.get(target.m.id) || target.m
        syncItem({ ...x, comment_count: (x.comment_count || 0) + 1 })
        LD.posts.get(target.m.id)?.toggleReplies(true)
        reset()
        hide()
        toast('已回复', 'ok')
      }
    } catch (e) { toast(e.message, 'err') } finally { send.disabled = false }
  }
  send.addEventListener('click', submit)
  const reset = () => { ta.value = ''; att.clear(); spoiler.checked = false; render() }
  const hide = () => { el.hidden = true; document.body.classList.remove('ld-composing') }
  const c = {
    el,
    setTarget(x) {
      target = x
      ta.maxLength = x ? 1000 : 2000
      head.replaceChildren(...(x
        ? [icon('reply', 'i tiny'), h('span', null, '回复 '), avatar(x.m.author_avatar, x.m.author_name, 20), h('strong', null, x.m.author_name || '佚名'), h('span', { class: 'muted' }, ` #${x.floor}`)]
        : [icon('reply', 'i tiny'), h('strong', null, LD_TOPIC.title)]))
      render()
    },
    insert(s) { ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end'); render() },
    show() { el.hidden = false; el.classList.remove('min'); document.body.classList.add('ld-composing'); ta.focus() },
    hide,
  }
  LD.root.append(el)
  return c
}
async function ldAfterPost(id) {
  LD.metaP = ldMeta()
  await LD.metaP
  if (!LD.moreDown) {
    try {
      const { meme } = await api(`/memes/${id}`)
      LD.stream.append(...ldBuild([meme], LD.hi))
      LD.hi++
      LD.posts.get(id)?.el.scrollIntoView({ block: 'center', behavior: REDUCED.matches ? 'auto' : 'smooth' })
      ldSync()
      return
    } catch {}
  }
  ldJump({ focus: id })
}

// 选中楼里的文字 → 浮出「引用」
function ldSelQuote(e) {
  if (e.target.closest?.('.ld-quote-btn')) return
  document.querySelector('.ld-quote-btn')?.remove()
  const sel = getSelection()
  const text = String(sel || '').trim()
  if (!text || !LD) return
  const post = sel.anchorNode?.parentElement?.closest('.ld-post')
  if (!post || !post.contains(sel.focusNode)) return
  const id = Number(post.dataset.id)
  const r = sel.getRangeAt(0).getBoundingClientRect()
  const btn = h('button', { class: 'ld-quote-btn', type: 'button', style: { left: r.left + scrollX + 'px', top: r.top + scrollY - 40 + 'px' },
    onclick: () => { btn.remove(); const m = ITEMS.get(id); ldCompose({ m, floor: Number(post.dataset.floor), quote: text }) } }, icon('quote', 'i tiny'), '引用')
  document.body.append(btn)
}

// 右侧时间轴：当前楼 / 总楼数，拖动或点轨道跳楼
function ldTimeline() {
  const first = LD.days[0]?.day
  const last = LD.days[LD.days.length - 1]?.day
  const fmt = (d) => { if (!d) return ''; const [y, mo, da] = d.split('-').map(Number); return y === new Date().getFullYear() ? `${mo}月 ${da}日` : `${y}年${mo}月` }
  LD.handle = h('div', { class: 'ld-tl-handle' }, h('strong'), h('span'))
  LD.track = h('div', { class: 'ld-tl-track' }, LD.handle)
  const ratioAt = (y) => { const r = LD.track.getBoundingClientRect(); return Math.min(1, Math.max(0, (y - r.top) / r.height)) }
  const label = (ratio) => {
    const n = Math.max(1, Math.round(ratio * (LD.total - 1)) + 1)
    LD.handle.style.top = ratio * 100 + '%'
    LD.handle.firstChild.textContent = `${n} / ${LD.total}`
    return n
  }
  LD.track.addEventListener('pointerdown', (e) => {
    LD.dragging = true
    LD.track.setPointerCapture(e.pointerId)
    label(ratioAt(e.clientY))
  })
  LD.track.addEventListener('pointermove', (e) => { if (LD.dragging) label(ratioAt(e.clientY)) })
  LD.track.addEventListener('pointerup', (e) => {
    if (!LD.dragging) return
    LD.dragging = false
    const n = label(ratioAt(e.clientY))
    ldJump({ offset: Math.max(0, n - 3) })
  })
  LD.timeline.replaceChildren(
    h('button', { class: 'ld-btn primary block', onclick: () => ldCompose() }, icon('reply', 'i tiny'), '回复'),
    h('button', { class: 'ld-tl-date', onclick: () => ldJump({ offset: 0 }) }, fmt(first)),
    LD.track,
    h('button', { class: 'ld-tl-date', onclick: () => ldJump({ bottom: true }) }, fmt(last)))
}
function ldSync() {
  if (!LD) return
  if (!LD.handle && LD.days.length) ldTimeline()
  // 找到视口顶部那一楼：按页面顺序二分（往上接的楼在 Map 里排在后面）
  const posts = [...LD.stream.querySelectorAll(':scope > .ld-post')]
  let lo = 0, hi = posts.length - 1, top = posts[0]
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (posts[mid].getBoundingClientRect().bottom > 80) { top = posts[mid]; hi = mid - 1 } else lo = mid + 1
  }
  LD.header.classList.toggle('scrolled', LD.titleEl.getBoundingClientRect().bottom < 60)
  if (!top) return
  const n = Number(top.dataset.floor)
  const id = Number(top.dataset.id)
  LD.progress.textContent = `${n} / ${LD.total}`
  if (LD.handle && !LD.dragging) {
    LD.handle.style.top = (LD.total > 1 ? (n - 1) / (LD.total - 1) : 0) * 100 + '%'
    LD.handle.firstChild.textContent = `${n} / ${LD.total}`
    LD.handle.lastChild.textContent = ldAgo(ITEMS.get(id)?.created_at || 0)
  }
  if (!LD.q) localStorage.setItem('ld-last', id)
}
function ldJumpPrompt() {
  const v = prompt(`跳到第几楼？（1 - ${LD.total}）`)
  const n = Number.parseInt(v, 10)
  if (n >= 1) ldJump({ offset: Math.min(LD.total, n) - 1 })
}

// 顶栏：logo（滚过标题后换成帖子标题）· 搜索 · 聊天 · 菜单 · 头像
function ldHeader() {
  const b = (ic, title, onclick, extra = {}) => h('button', { class: 'ld-hb', type: 'button', title, 'aria-label': title, onclick, ...extra }, icon(ic))
  LD.header.replaceChildren(
    h('div', { class: 'ld-h-in' },
      b('menu', '侧边栏', () => document.documentElement.classList.toggle('ld-side-open'), { class: 'ld-hb ld-burger' }),
      h('a', { class: 'ld-logo', href: '/', onclick: (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }) } },
        h('span', { class: 'ld-logo-mark', html: LD_MARK }), h('span', { class: 'ld-logo-text' }, 'LINUX DO')),
      h('div', { class: 'ld-h-topic' }, h('strong', null, LD_TOPIC.title),
        h('span', { class: 'ld-cat sm' }, h('i', { style: { background: LD_TOPIC.color } }), LD_TOPIC.cat)),
      h('span', { class: 'grow' }),
      b('search', '搜索（Ctrl + K）', ldSearch, { 'data-pop': 'ldsearch' }),
      h('button', { class: 'ld-hb', type: 'button', title: '聊天', 'aria-label': '聊天', onclick: () => ldChat(LD.chat ? undefined : null) }, icon('chat'), chatBadge('ld-hbadge')),
      b('more', '菜单', (e) => ldMenu(e.currentTarget), { 'data-pop': 'ldmenu' }),
      S.me
        ? h('button', { class: 'ld-hb ld-me', type: 'button', title: S.me.username, 'data-pop': 'u' + S.me.username, onclick: (e) => userCard(S.me.username, e.currentTarget) }, avatar(S.me.avatar, S.me.username, 32))
        : h('a', { class: 'ld-btn primary sm', href: loginHref() }, '登录')))
}
function ldMenu(anchor) {
  const it = (label, ic, fn) => h('button', { class: 'menu-item', onclick: () => { closePop(); fn() } }, icon(ic), label)
  openPop(anchor, h('div', { class: 'menu-list' },
    it('外观与背景', 'palette', () => looksPanel(anchor)),
    it(`内容显示：${contentLabel()}（点击切换）`, 'eye', () => setContent(nextContent())),
    it(S.blurAll ? '关闭一键模糊（B）' : '一键模糊：全部图先模糊（B）', 'eyeOff', () => setBlurAll(!S.blurAll)),
    it('跳到某一楼', 'chevD', ldJumpPrompt),
    FISH_OK() && it(FISH ? '关闭高级摸鱼（M）' : '高级摸鱼小窗（M）', 'apps', () => toggleFish()),
    it('切到云文档（老板键）', 'doc', toggleBoss),
    it('退出伪装', 'close', () => setSkin(''))),
  { key: 'ldmenu', align: 'right' })
}
function ldSearch() {
  const input = h('input', { class: 'input', type: 'search', placeholder: '在本帖中搜索', value: LD.q })
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { closePop(); ldSetQuery(input.value.trim()) } })
  openPop(LD.header.querySelector('[data-pop="ldsearch"]'), h('div', { class: 'ld-search' }, input,
    h('div', { class: 'muted' }, '回车搜索配文、描述和标签')), { key: 'ldsearch', align: 'right' })
  input.focus()
}
async function ldSetQuery(q) {
  LD.q = q
  LD.notice.hidden = !q
  LD.notice.replaceChildren(...(q ? [icon('search', 'i tiny'), h('span', null, `本帖中搜索「${q}」`), h('button', { class: 'ld-btn flat sm', onclick: () => ldSetQuery('') }, '清除')] : []))
  LD.metaP = ldMeta()
  LD.handle = null
  await ldJump(q ? { offset: 0 } : { focus: Number(localStorage.getItem('ld-last')) || 0, bottom: !localStorage.getItem('ld-last') })
}

// 左侧边栏：话题 / 分类 / 聊天频道（就是群聊）
function ldSide() {
  const a = (ic, label, onclick, extra = null) => h('button', { class: 'ld-s-link', type: 'button', onclick }, icon(ic), h('span', null, label), extra)
  const toTop = () => { document.documentElement.classList.remove('ld-side-open'); scrollTo({ top: 0, behavior: 'smooth' }) }
  LD.side.replaceChildren(
    h('div', { class: 'ld-s-sec' }, a('chat', '话题', toTop), a('reply', '我的帖子', toTop), a('bookmark', '书签', toTop)),
    h('div', { class: 'ld-s-sec' }, h('div', { class: 'ld-s-h' }, '类别'),
      LD_CATS.map(([n, c]) => h('button', { class: 'ld-s-link' + (n === LD_TOPIC.cat ? ' on' : ''), type: 'button', onclick: toTop },
        h('i', { class: 'ld-sq', style: { background: c } }), h('span', null, n)))),
    h('div', { class: 'ld-s-sec' }, h('div', { class: 'ld-s-h' }, '频道'),
      S.me
        ? CHAT.groups.map((g) => a('chat', g.name, () => { document.documentElement.classList.remove('ld-side-open'); ldChat(g.id) },
          g.unread > 0 && h('i', { class: 'ld-s-n' }, g.unread > 99 ? '99+' : g.unread)))
        : h('a', { class: 'ld-s-link muted', href: loginHref() }, '登录后加入迷友群')))
}

// 右下角聊天抽屉：先是频道列表，点进去是群聊（和站内群聊同一套）
function ldChat(gid) {
  if (gid === undefined) return ldChatClose()
  if (!requireLogin()) return
  if (!LD.chatEl) {
    LD.chatEl = h('div', { class: 'ld-chat' })
    LD.root.append(LD.chatEl)
  }
  LD.chatPane?.destroy()
  LD.chatPane = null
  LD.chat = true
  LD.chatEl.hidden = false
  const g = gid ? findGroup(gid) : CHAT.groups.length === 1 ? CHAT.groups[0] : null
  const head = (title, back, extra) => h('header', { class: 'ld-chat-head' },
    back && h('button', { class: 'ld-ib', type: 'button', 'aria-label': '返回', onclick: back }, icon('chevL')),
    h('strong', null, title), h('span', { class: 'grow' }), extra,
    h('button', { class: 'ld-ib', type: 'button', 'aria-label': '关闭', onclick: ldChatClose }, icon('close')))
  const gx = !g && gid && findGone(gid)
  if (gx) {
    LD.chatEl.replaceChildren(head(goneAsGroup(gx).name, () => ldChat(null)), goneView(gx))
    return
  }
  if (!g) {
    if (!CHAT.loaded) loadGroups().then(() => LD?.chat && !LD.chatPane && ldChat(null))
    LD.chatEl.replaceChildren(head('聊天', null),
      h('div', { class: 'ld-chat-list' }, CHAT.groups.map((x) => groupRow(x, false, () => ldChat(x.id))),
        (CHAT.gone || []).map((x) => groupRow(goneAsGroup(x), false, () => ldChat(x.id)))))
    return
  }
  const pane = chatPane(g)
  LD.chatPane = pane
  LD.chatEl.replaceChildren(head('# ' + g.name, CHAT.groups.length > 1 ? () => ldChat(null) : null,
    [h('button', { class: 'ld-ib', type: 'button', title: '搜索聊天记录', onclick: () => pane.search() }, icon('search')), h('button', { class: 'ld-ib', type: 'button', title: '成员', onclick: () => groupPanel(g) }, icon('users'))]), pane.el)
  pane.focus()
}
function ldChatClose() {
  LD.chat = false
  LD.chatPane?.destroy()
  LD.chatPane = null
  if (LD.chatEl) { LD.chatEl.hidden = true; LD.chatEl.replaceChildren() }
}

function ldRoute() {
  S.viewer?.close()
  closePop()
  if (S.modal) closeModal(false)
  const first = !LD
  if (first) ldMount()
  let path = location.pathname
  try { path = decodeURIComponent(path) } catch {}
  const q = new URLSearchParams(location.search).get('q')
  let m
  if ((m = path.match(/^\/m\/(\d+)$/))) ldGoto(Number(m[1]))
  else if (q && q !== LD.q) ldSetQuery(q)
  else if (first) {
    const last = Number(localStorage.getItem('ld-last'))
    ldJump(last ? { focus: last } : { bottom: true })
  }
  if ((m = path.match(/^\/chat(?:\/(\d+))?$/))) {
    const go = () => ldChat(m[1] ? Number(m[1]) : null)
    S.me && !CHAT.loaded ? loadGroups().then(go) : go()
  }
}
function ldGoto(id) {
  const p = LD.posts.get(id)
  if (!p) return ldJump({ focus: id })
  p.el.scrollIntoView({ block: 'start', behavior: REDUCED.matches ? 'auto' : 'smooth' })
  p.el.classList.remove('flash')
  void p.el.offsetWidth
  p.el.classList.add('flash')
}
function ldUnmount() {
  if (!LD) return
  LD.ac.abort()
  LD.io.disconnect()
  LD.clean.forEach((fn) => fn())
  LD.posts.forEach((p) => p.destroy())
  LD.chatPane?.destroy()
  document.querySelector('.ld-quote-btn')?.remove()
  document.documentElement.classList.remove('ld-side-open')
  document.body.classList.remove('ld-composing')
  LD.root.remove()
  LD = null
}

// 外观面板里的伪装开关
function disguiseBtn(skin, mark, name, desc) {
  const on = S.skin === skin
  return h('button', { class: 'lk-disguise' + (on ? ' on' : ''), onclick: () => { closePop(); setSkin(on ? '' : skin) } },
    h('span', { class: 'lk-fs-mark', html: mark }),
    h('span', { class: 'lk-dz-text' }, h('strong', null, on ? `退出${name}伪装` : `伪装成${name}`), h('span', null, on ? '回到尽欢原本的样子' : desc)),
    icon('chevR', 'i tiny'))
}

// ---------- 路由 ----------

const ROUTES = [
  [/^\/$/, () => renderWall({})],
  [/^\/series$/, () => renderSeries()],
  [/^\/s\/(.+)$/, (m) => renderWall({ series: decodeURIComponent(m[1]) })],
  [/^\/(puzzles|tools)$/, () => navigate('/', { replace: true })],
  [/^\/me$/, () => renderMe()],
  [/^\/road$/, () => renderRoad()],
  [/^\/dm(?:\/(?:\d+|new\/-?\d+))?$/, () => renderDmPage(main,{path:location.pathname,me:S.me,navigate,onLeave:onPageLeave})],
  [/^\/chat(?:\/(\d+))?$/, (m) => renderChat(Number(m[1]) || 0)],
  [/^\/u\/(.+)$/, (m) => renderWall({ author: decodeURIComponent(m[1]) })],
  [/^\/t\/(.+)$/, (m) => renderWall({ tag: decodeURIComponent(m[1]) })],
]

function navigate(path, { replace = false } = {}) {
  // 点当前页面的链接（如「回到最新」、再点一次「图廊」）：重新从头显示
  if (!replace && path === location.pathname + location.search) { S.wallFresh = true; S.bgKey = null }
  history[replace ? 'replaceState' : 'pushState']({ inApp: true }, '', path)
  route()
}

function route() {
  dockSync()
  if (location.pathname.startsWith('/dm') && S.skin) {
    sessionStorage.setItem('dmReturnSkin',S.skin)
    setSkin('')
    return
  }
  if (!location.pathname.startsWith('/dm') && !S.skin) {
    const previousSkin=sessionStorage.getItem('dmReturnSkin')
    if (previousSkin) { sessionStorage.removeItem('dmReturnSkin'); setSkin(previousSkin); return }
  }
  if (S.skin === 'feishu') return imRoute()
  if (S.skin === 'linuxdo') return ldRoute()
  S.viewer?.close()
  closePop()
  const path = location.pathname
  const memeMatch = path.match(/^\/m\/(\d+)$/)
  if (memeMatch) {
    if (!S.bgKey) renderPage('/', '')
    if (S.modal?.memeId !== Number(memeMatch[1]) || S.modal?.kind !== 'meme') openMeme(Number(memeMatch[1]))
    return
  }
  closeModal(false)
  if ((path === '/' || path === '/series') && !location.search) {
    const qs = new URLSearchParams(Object.entries(wallPrefs()).filter(([k, v]) => v && !(k === 'sort' && v === 'new'))).toString()
    if (qs) history.replaceState(history.state, '', path + '?' + qs)
  }
  const key = path + location.search
  if (key !== S.bgKey) renderPage(path, location.search)
  markNav()
}

// 记住的图廊筛选：刷新、点「图廊」回来都保持
function wallPrefs() { try { return JSON.parse(localStorage.getItem('wallPrefs')) || {} } catch { return {} } }
function saveWallPrefs(x) { localStorage.setItem('wallPrefs', JSON.stringify({ ...wallPrefs(), ...x })) }
// 图廊离开时屏幕顶上那张图，返回 / 刷新 / 点导航回来时从它接着显示
const WALL_POS = {
  all() { try { return JSON.parse(localStorage.getItem('wallPos')) || {} } catch { return {} } },
  get(k) { return this.all()[k] },
  set(k, v) { const a = this.all(); delete a[k]; a[k] = v; const ks = Object.keys(a); ks.slice(0, Math.max(0, ks.length - 30)).forEach((x) => delete a[x]); localStorage.setItem('wallPos', JSON.stringify(a)) },
  delete(k) { const a = this.all(); if (k in a) { delete a[k]; localStorage.setItem('wallPos', JSON.stringify(a)) } },
}
let wallPosT = 0
addEventListener('scroll', () => { clearTimeout(wallPosT); wallPosT = setTimeout(saveWallPos, 400) }, { passive: true })
addEventListener('pagehide', () => saveWallPos())
function saveWallPos() {
  // 还没恢复到上次的位置前别覆盖
  if (!S.wall?.byDay || !S.bgKey || !S.wall.ready) return
  if (S.wall.hz) {
    // 横向：记住横向滚动条里最左边露出来的那一帖
    const box = S.wall.days
    if (!box || box.scrollLeft < 200) return WALL_POS.delete(S.bgKey)
    const x = box.getBoundingClientRect().left + 20
    const card = [...box.querySelectorAll('.card[data-id]')].find((c) => c.getBoundingClientRect().right > x)
    const m = card && ITEMS.get(Number(card.dataset.id))
    if (m) WALL_POS.set(S.bgKey, { id: m.id, day: dayOf(m.created_at), top: 0 })
    return
  }
  if (scrollY < 200) return WALL_POS.delete(S.bgKey)
  const bar = (S.wall.wrap?.querySelector('.toolbar')?.getBoundingClientRect().bottom || 120) + 40
  const card = [...document.querySelectorAll('.wall .card[data-id]')].find((c) => c.getBoundingClientRect().bottom > bar)
  const m = card && ITEMS.get(Number(card.dataset.id))
  if (m) WALL_POS.set(S.bgKey, { id: m.id, day: dayOf(m.created_at), top: card.getBoundingClientRect().top })
}
// 浏览器标签页标题：每个页面不一样
function pageTitle(path, search) {
  const q = new URLSearchParams(search).get('q')
  const dec = (x) => { try { return decodeURIComponent(x) } catch { return x } }
  if (q) return `搜索：${q}`
  if (path.startsWith('/series')) return '图集'
  if (path.startsWith('/s/')) return dec(path.slice(3)) + ' · 图集'
  if (path.startsWith('/puzzles')) return '解密'
  if (path.startsWith('/tools')) return '解密工具箱'
  if (path.startsWith('/chat')) return '群聊'
  if (path.startsWith('/dm')) return '私信'
  if (path.startsWith('/me')) return '我的'
  if (path.startsWith('/road')) return '鞭打模块'
  if (path.startsWith('/u/')) return '@' + dec(path.slice(3))
  if (path.startsWith('/t/')) return '#' + dec(path.slice(3))
  return ''
}
function setTitle(t) {
  S.pageTitle = t
  syncTab()
}

function renderPage(path, search) {
  saveWallPos()
  S.bgKey = path + search
  setTitle(pageTitle(path, search))
  PAGE_CLEAN.splice(0).forEach((fn) => fn())
  SEEN.timers.forEach((t) => clearTimeout(t))
  SEEN.timers.clear()
  seenIO.disconnect()
  ITEMS.clear()
  S.wall = null
  S.meSt = null
  const hit = ROUTES.find(([re]) => re.test(path))
  window.scrollTo(0, 0)
  if (hit) hit[1](path.match(hit[0]))
  else main.replaceChildren(emptyState('这里什么都没有', '页面不存在', goHomeBtn('回首页')))
  document.querySelector('#search input').value = new URLSearchParams(search).get('q') || ''
  markNav()
}

window.addEventListener('popstate', () => { S.popNav = true; try { route() } finally { S.popNav = false } })
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]')
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  navigate(a.getAttribute('href'))
})
document.addEventListener('keyup', (e) => { FISH?.onKey(e, false) })
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const t = performance.now()
    if (t - escAt < 450) { escAt = -Infinity; toggleBoss(); e.preventDefault(); return }
    escAt = t
  }
  if (BOSS) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (LD) ldSearch()
    else (IM ? IM.search : document.querySelector('#search input'))?.focus()
    return
  }
  if (S.viewer) {
    // 焦点在输入框里（分屏时看着图还能打字）：方向键 / + - 0 / z 留给输入框，只有 Esc 关图
    if (e.key !== 'Escape' && e.target.closest?.('input, textarea, select, [contenteditable]')) return
    if (S.viewer.zoomKey?.(e)) return
    if (e.key === 'Escape') S.viewer.close()
    else if (e.key === 'z' || e.key === 'Z') S.viewer.zoom()
    else if (e.key === 'ArrowLeft') S.viewer.go(-1)
    else if (e.key === 'ArrowRight') S.viewer.go(1)
    return
  }
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]')
  if (FISH?.onKey(e, true)) return
  if ((e.key === 'b' || e.key === 'B') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    setBlurAll(!S.blurAll)
    return
  }
  if ((e.key === 'm' || e.key === 'M') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && FISH_OK()) {
    toggleFish()
    return
  }
  if (e.key !== 'Escape') return
  if (POP) closePop()
  else if (S.modal) requestClose()
  else if (IM?.thread) imCloseThread()
  else if (LD?.comp && !LD.comp.el.hidden) LD.comp.hide()
  else if (LD?.chat) ldChatClose()
})

// ---------- 公告 ----------
const NOTICE_OFF = () => { try { return JSON.parse(localStorage.getItem('noticeOff')) || [] } catch { return [] } }
async function loadNotices() {
  let bar = document.getElementById('notice-bar')
  try {
    const { notices } = await api('/notices')
    const off = NOTICE_OFF()
    const show = notices.filter((n) => !off.includes(n.id))
    if (!show.length) return bar?.remove()
    if (!bar) { bar = h('div', { id: 'notice-bar', class: 'site-notice', role: 'region', 'aria-label': '公告' }); main.before(bar) }
    bar.replaceChildren(...show.map((n) => {
      // 走马灯是一行：去掉 Markdown 标记，换行换成全角空格；点一下看完整的（带格式、帖子预览卡）
      const oneLine = mdPlain(n.body).replace(/\*\*/g, '').replace(/\s*\n\s*/g, '　')
      const row = h('div', { class: 'notice ' + n.kind },
        h('span', { class: 'notice-tag' }, icon(n.kind === 'daily' ? 'calendar' : 'bell', 'i tiny'), n.kind === 'daily' ? '今日' : '公告'),
        // 文字框里走马灯：内容放两份首尾相接，滚到一半正好接上；鼠标放上去暂停
        h('div', { class: 'notice-body', title: '点一下看完整公告', role: 'button', tabindex: '0', style: { '--dur': Math.max(10, Math.round(oneLine.length * 0.35)) + 's' },
          onclick: (e) => { if (!e.target.closest('a, button')) noticeDetail(n) },
          onkeydown: (e) => { if (e.key === 'Enter') noticeDetail(n) } },
          // 占位的一份撑出文字框宽度（短公告框就短），真正滚动的那条叠在上面
          h('span', { class: 'nt-text nt-size', 'aria-hidden': 'true' }, oneLine),
          h('div', { class: 'nt-track' },
            h('span', { class: 'nt-text' }, linkify(oneLine)),
            h('span', { class: 'nt-text', 'aria-hidden': 'true' }, linkify(oneLine)))),
        h('button', { class: 'btn-icon ghost sm', type: 'button', 'aria-label': '关闭这条公告', title: '不再显示这条', onclick: () => {
          localStorage.setItem('noticeOff', JSON.stringify([...NOTICE_OFF(), n.id].slice(-50)))
          row.remove()
          if (!bar.childElementCount) bar.remove()
        } }, icon('close', 'i tiny')))
      return row
    }))
  } catch {}
}
function noticeDetail(n) {
  const panel = openModalShell('notice-detail')
  S.modal.kind = 'notice-detail'
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, n.kind === 'daily' ? '今日公告' : '网站公告', n.created_at && h('span', { class: 'muted' }, ' · ' + fmtTime(n.created_at))), closeBtn()),
    h('div', { class: 'ma-body notice-detail-body md' }, richBody(n.body, { md: true, inlineRefs: true })))
}
async function noticeAdmin() {
  const shell = openModalShell('notice-admin')
  S.modal.kind = 'notice'
  let kind = 'site'
  const day = pickDate(h('input', { class: 'input', type: 'date', 'aria-label': '哪一天' }))
  const dayField = field('日期（只在这一天显示，北京时间）', day)
  const body = h('textarea', { class: 'input', rows: 6, maxlength: 2000, placeholder: '公告内容。支持 Markdown；写 No.1234 引用帖子（带预览卡）；链接会自动变成可点的' })
  const list = h('div', { class: 'notice-list' }, h('div', { class: 'spinner' }))
  const seg = h('div', { class: 'segs small', role: 'radiogroup', 'aria-label': '公告类型' })
  const drawSeg = () => {
    dayField.hidden = kind !== 'daily'
    seg.replaceChildren(...[['site', '网站公告'], ['daily', '每日公告']].map(([k, l]) =>
      h('button', { class: 'seg' + (k === kind ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': k === kind ? 'true' : 'false', onclick: () => { kind = k; drawSeg() } }, l)))
  }
  drawSeg()
  const load = async () => {
    try {
      const r = await api('/admin/notices')
      if (!day.value) { day.value = r.today; day.setPick(r.today) }
      if (!r.notices.length) return list.replaceChildren(h('p', { class: 'muted' }, '还没有公告'))
      list.replaceChildren(...r.notices.map((n) => h('div', { class: 'notice-item' + (n.active ? '' : ' off') },
        h('span', { class: 'badge' }, n.kind === 'daily' ? n.day + (n.day === r.today ? '（今天）' : '') : '网站公告'),
        h('div', { class: 'notice-item-body' }, n.body),
        h('button', { class: 'btn-text small', type: 'button', onclick: async () => {
          try { await api(`/admin/notices/${n.id}`, { method: 'PATCH', body: { active: !n.active } }); load(); loadNotices() } catch (e) { toast(e.message, 'err') }
        } }, n.active ? '停用' : '启用'),
        h('button', { class: 'btn-text small danger', type: 'button', onclick: async () => {
          if (!confirm('删除这条公告？')) return
          try { await api(`/admin/notices/${n.id}`, { method: 'DELETE' }); load(); loadNotices() } catch (e) { toast(e.message, 'err') }
        } }, '删除'))))
    } catch (e) { list.replaceChildren(h('p', { class: 'muted' }, e.message)) }
  }
  const pub = h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
    if (!body.value.trim()) return toast('写点内容', 'err')
    pub.disabled = true
    try {
      await api('/admin/notices', { method: 'POST', body: { kind, day: day.value, body: body.value } })
      toast(kind === 'daily' ? `已设为 ${day.value} 的每日公告` : '网站公告已发布', 'ok')
      body.value = ''
      load()
      loadNotices()
    } catch (e) { toast(e.message, 'err') }
    pub.disabled = false
  } }, '发布')
  shell.replaceChildren(h('div', { class: 'compose-wrap' },
    h('header', { class: 'compose-head' }, h('h2', null, '公告设置'), closeBtn()),
    h('div', { class: 'notice-form' },
      seg,
      h('p', { class: 'muted sm' }, '网站公告：一直显示最新启用的那条。每日公告：只在选的那天显示，同一天再发会覆盖。用户关掉某条后不再看到它。'),
      dayField,
      field('内容', h('div', { class: 'fmt-wrap' }, fmtBar(body), body)),
      h('div', { class: 'row-end' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: (e) => postPicker(e.currentTarget, (m) => insertAtCursor(body, `No.${m.id} `), 'ntpost') , 'data-pop': 'ntpost' }, icon('link', 'i tiny'), '引用帖子'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: (e) => msgPicker(e.currentTarget, (m, gid, t) => insertAtCursor(body, msgQuote(m, gid, t)), 'ntmsg'), 'data-pop': 'ntmsg' }, icon('reply', 'i tiny'), '引用群消息'),
        pub),
      h('h3', null, '已有公告'),
      list)))
  load()
}


// ---------- 日期 / 时间选择器（flatpickr 4.6.13，MIT，自托管在 /vendor/flatpickr-4.6.13/，第一次用到时才加载） ----------
// pickTime(input, opts) / pickDate(input, opts)
//   input：任意 <input>（可以已经是 type=time / date，会被换成 text + readonly）
//   opts.onChange(value, input)：选好后回调；value 是字符串，时间 'HH:MM'（24 小时制），日期 'YYYY-MM-DD'，清空时是 ''
//          —— 与原生 input.value 的格式一致；同时 input 上照样会派发 'change' 和 'input' 事件，原来写的 onchange 不用改
//   opts.minuteStep（仅时间，默认 5）/ opts.min / opts.max（'HH:MM' 或 'YYYY-MM-DD'）/ opts.placeholder
//   返回值：传进来的同一个 input（可以直接写在 h(...) 里）；input.picker 是一个 Promise<flatpickr 实例 | null>，
//          库加载失败时为 null，input 退回成原生 type=time / date，onChange 仍然会被调用
//   改值：input.value = 'HH:MM' 之后调用 input.setPick('HH:MM') 才能同步到面板（setPick 不会触发 onChange）
const FP_BASE = '/vendor/flatpickr-4.6.13/'
let fpP = null
const fpLoad = () => (fpP ||= new Promise((ok, no) => {
  if (!document.querySelector(`link[href="${FP_BASE}flatpickr.min.css"]`)) document.head.append(h('link', { rel: 'stylesheet', href: FP_BASE + 'flatpickr.min.css' }))
  const js = (src) => new Promise((a, b) => document.head.append(h('script', { src, onload: a, onerror: () => b(new Error('日期组件加载失败')) })))
  js(FP_BASE + 'flatpickr.min.js').then(() => js(FP_BASE + 'zh.js')).then(() => ok(window.flatpickr), no)
}).catch((e) => { fpP = null; throw e }))
// 面板开着时按 Esc 只收起面板，不要连弹窗一起关、也不算老板键的一次
const FP_OPEN = new Set()
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !FP_OPEN.size) return
  FP_OPEN.forEach((fp) => fp.close())
  e.stopImmediatePropagation()
  e.preventDefault()
}, true)
// 输入框被移出页面（弹窗关掉、设置页重画）后，把挂在 body 上的面板也销毁：所有实例共用一个观察者，没有实例就断开
const FP_ALL = new Set()
let fpMo = null
function fpTrack(fp) {
  FP_ALL.add(fp)
  fpMo ||= new MutationObserver(() => {
    FP_ALL.forEach((f) => { if (!f.input.isConnected) { FP_ALL.delete(f); FP_OPEN.delete(f); f.destroy() } })
    if (!FP_ALL.size) { fpMo.disconnect(); fpMo = null }
  })
  fpMo.observe(document.body, { childList: true, subtree: true })
}
function fpAttach(input, kind, opts = {}) {
  const native = kind === 'time' ? 'time' : 'date'
  const coarse = matchMedia('(pointer: coarse)').matches
  input.classList.add('fp-input', 'fp-' + kind)
  input.type = 'text'
  input.readOnly = true // 不弹出手机键盘
  input.setAttribute('inputmode', 'none')
  if (opts.placeholder || !input.placeholder) input.placeholder = opts.placeholder || (kind === 'time' ? '选时间' : '选日期')
  input.picker = fpLoad().then((flatpickr) => {
    const locale = { ...flatpickr.l10ns.zh, firstDayOfWeek: 1 }
    const fp = flatpickr(input, {
      locale,
      disableMobile: true, // 手机上也用这个面板，不退回系统原生控件
      allowInput: false,
      appendTo: document.body,
      position: 'auto center',
      monthSelectorType: 'static',
      ...(kind === 'time'
        ? { enableTime: true, noCalendar: true, time_24hr: true, dateFormat: 'H:i', minuteIncrement: opts.minuteStep || 5, minTime: opts.min, maxTime: opts.max }
        : { dateFormat: 'Y-m-d', minDate: opts.min, maxDate: opts.max }),
      onOpen: (_, __, f) => {
        FP_OPEN.add(f)
        const box = f.calendarContainer
        box.classList.toggle('fp-touch', coarse)
        // 输入框靠屏幕边时，居中对齐的面板会伸出屏幕：往里挪回来，左右各留 8px
        requestAnimationFrame(() => {
          const r = box.getBoundingClientRect()
          const dx = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0
          if (dx) { box.style.left = (box.offsetLeft + dx) + 'px'; box.style.right = 'auto' }
        })
      },
      onClose: (_, __, f) => FP_OPEN.delete(f),
      onChange: (_, str) => opts.onChange?.(str, input),
    })
    fp.calendarContainer.classList.add('fp-jh', 'fp-jh-' + kind)
    input.setPick = (v) => fp.setDate(v || null, false)
    fpTrack(fp)
    return fp
  }).catch(() => {
    input.classList.remove('fp-input', 'fp-' + kind)
    input.type = native
    input.readOnly = false
    input.removeAttribute('inputmode')
    if (opts.min) input.min = opts.min
    if (opts.max) input.max = opts.max
    input.setPick = (v) => { input.value = v || '' }
    if (opts.onChange) input.addEventListener('change', () => opts.onChange(input.value, input))
    return null
  })
  input.setPick = (v) => { input.value = v || '' } // 库还没加载好时的临时版本
  return input
}
const pickTime = (input, opts) => fpAttach(input, 'time', opts)
const pickDate = (input, opts) => fpAttach(input, 'date', opts)

// ---------- 成员管理（管理员） ----------
// 禁群聊发言 / 禁评论 / 禁发帖 / 禁回应，可以限时也可以永久；管理员本人不受限制
const LIMIT_KINDS = [['chat', '禁言', '群聊发消息'], ['comment', '禁评', '评论'], ['post', '禁发帖', '发帖、转帖'], ['react', '禁回应', '表情、喜欢、一句回应']]
const LIMIT_SPANS = [[60, '1 小时'], [1440, '1 天'], [10080, '7 天'], [43200, '30 天'], [0, '永久']]
const untilText = (t) => (t ? `到 ${fmtAt(t)}` : '永久')
function limitTags(limits) {
  return (limits || []).map((l) => h('span', { class: 'badge danger', title: (l.reason ? `原因：${l.reason}，` : '') + untilText(l.until) },
    LIMIT_KINDS.find((k) => k[0] === l.kind)?.[1] || l.kind))
}
async function officialTitleManager(username) {
  if (!S.me?.owner) return
  const panel = openModalShell('official-title-manager')
  S.modal.kind = 'official-titles'
  const status = h('p', { class: 'muted', role: 'status' }, '加载中…')
  const grid = h('div', { class: 'ot-grid' })
  panel.replaceChildren(h('div', { class: 'modal-head' }, h('h2', null, '授予称号'), h('button', { class: 'btn-icon ghost modal-close', type: 'button', 'aria-label': '关闭', onclick: () => closeModal(false) }, icon('close'))),
    h('p', { class: 'ot-recipient' }, '@' + username), status, grid)
  let owned = new Set(), busy = false
  const draw = () => grid.replaceChildren(...(S.officialTitles || []).map(t => {
    const has = owned.has(t.id)
    return h('article', { class: 'ot-card ot-' + t.id },
      h('div', { class: 'ot-card-heading' }, officialArt(t.id), h('div', null, h('strong', null, t.name), h('p', null, t.mood))),
      h('div', { class: 'ot-demo' }, h('span', { class: 'cm-text ot-bubble ot-' + t.id }, '今天也要开心呀'),
        h('div', { class: 'ot-demo-field ot-frame ot-' + t.id }, icon('rocket', 'i tiny'), '回应一下')),
      h('button', { class: 'btn btn-ghost sm ot-grant', type: 'button', disabled: busy, 'data-title': t.id, 'aria-label': (has ? '收回' : '授予') + t.name, onclick: async () => {
        if (busy) return
        busy = true; status.textContent = '正在' + (has ? '收回' : '授予') + t.name; draw()
        try {
          const r = await api('/admin/official-titles/' + encodeURIComponent(username) + '/' + t.id, { method: has ? 'DELETE' : 'PUT', body: has ? undefined : {} })
          owned = new Set(r.official_titles.map(o => o.id)); USERS.delete(username)
          if (username.toLowerCase() === S.me.username.toLowerCase()) S.me = (await api('/me')).user
          status.textContent = (has ? '已收回 ' : '已授予 ') + t.name
        } catch (e) { status.textContent = e.message }
        finally { busy = false; if (grid.isConnected) draw() }
      } }, has ? '已授予 · 收回' : '授予'))
  }))
  try { const u = (await api('/users/' + encodeURIComponent(username))).user; owned = new Set((u.official_titles || []).map(o => o.id)); status.textContent = '仅站长可授予'; if (grid.isConnected) draw() }
  catch (e) { status.textContent = e.message }
}
async function memberAdmin(q0 = '') {
  const panel = openModalShell('member-admin')
  S.modal.kind = 'members'
  const close = () => closeModal(false)
  const q = h('input', { class: 'input', type: 'search', placeholder: '搜用户名 / 名字，留空看最近活跃', value: q0, 'aria-label': '搜索成员' })
  const only = h('input', { type: 'checkbox' })
  const list = h('div', { class: 'ma-list' }, h('div', { class: 'spinner' }))
  let seq = 0
  const load = async () => {
    const my = ++seq
    try {
      const p = new URLSearchParams({ q: q.value.trim() })
      if (only.checked) p.set('limited', '1')
      const d = await api('/admin/users?' + p)
      if (my !== seq || S.modal?.kind !== 'members') return
      // 分组：站长 / 管理（管理员、群管）/ 成员，组内保持接口顺序
      const tierOf = (u) => (u.owner ? 0 : u.is_admin || u.role === 'gadmin' ? 1 : 2)
      const out = []
      ;['站长', '管理', '成员'].forEach((label, t) => {
        const us = d.users.filter((u) => tierOf(u) === t)
        if (us.length) out.push(h('h4', { class: 'gp-group' }, label, h('span', null, us.length)), ...us.map((u) => row(u, d.now, d.owner)))
      })
      list.replaceChildren(...(out.length ? out : [h('p', { class: 'muted ma-empty' }, only.checked ? '没有被限制的人' : '没找到')]))
    } catch (e) { list.replaceChildren(h('p', { class: 'muted ma-empty' }, e.message)) }
  }
  // 身份：只有站长能设。管理员 = 全站管理；群管 = 只管群聊（改名、拉人、移人、公告、处理申请、删消息）
  const roleSel = (u, draw, open) => h('select', { class: 'input sm ma-role', 'aria-label': '身份', title: '身份', onchange: async (e) => {
    const v = e.target.value
    const what = v === 'admin' ? '管理员（全站管理）' : v === 'gadmin' ? '群管（只管群聊）' : '普通成员'
    if (!confirm(`把 ${u.username} 设成${what}？`)) { e.target.value = u.role || ''; return }
    try {
      const r = await api(`/admin/users/${u.id}/role`, { method: 'PUT', body: { role: v || null } })
      u.role = r.role ?? (v || null); u.is_admin = v === 'admin'
      USERS.delete(u.username)
      toast(`${u.username} 现在是${what}`, 'ok')
      draw(open)
    } catch (err) { e.target.value = u.role || ''; toast(err.message, 'err') }
  } }, [['', '身份：普通'], ['gadmin', '身份：群管'], ['admin', '身份：管理员']].map(([v, l]) => h('option', { value: v, selected: (u.role || '') === v }, l)))
  const row = (u, now, owner) => {
    const box = h('div', { class: 'ma-row' })
    const [seen, on] = seenText(u.last_seen, now)
    // 手机上右侧的下拉框收起来，点「⋯」再展开
    let actsOpen = false
    const draw = (open) => {
      box.classList.toggle('acts-open', actsOpen)
      box.replaceChildren(...nodes(
        h('div', { class: 'ma-top' },
          h('button', { class: 'gp-face', type: 'button', 'aria-label': `${u.name || u.username} 的资料`, 'data-pop': 'u' + u.username, onclick: (e) => userCard(u.username, e.currentTarget) },
            avatar(u.avatar, u.name || u.username, 36), h('i', { class: 'gp-dot' + (on ? ' on' : '') })),
          h('span', { class: 'gp-who' },
            h('strong', { class: nameCls(u) }, u.name || u.username),
            h('span', { class: 'muted' }, `@${u.username} · TL${u.trust_level} · ${u.posts} 帖 · ${u.comments} 评论`),
            u.methods?.length ? h('span', { class: 'muted' }, u.methods.map(m => ({ email: '邮箱', google: 'Google', linuxdo: 'Linux.DO', dev: '测试账号' }[m] || m)).join(' / '), u.inviter ? ` · 邀请人 @${u.inviter}` : '') : null),
          h('span', { class: 'ma-tags' }, u.owner ? h('span', { class: 'role-tag admin' }, '站长') : u.is_admin ? h('span', { class: 'role-tag admin' }, '管理员') : u.role === 'gadmin' ? h('span', { class: 'role-tag gadmin' }, '群管') : null,
            u.disabled ? h('span', { class: 'badge danger' }, '已停用') : null,
            u.silenced ? h('span', { class: 'badge' }, 'L站禁言') : null, ...limitTags(u.limits)),
          h('span', { class: 'gp-seen' + (on ? ' on' : '') }, seen || '—'),
          h('button', { class: 'btn-icon ghost sm ma-more', type: 'button', title: '更多操作', 'aria-label': '更多操作', 'aria-expanded': String(actsOpen),
            onclick: () => { actsOpen = !actsOpen; draw(open) } }, icon('more')),
          h('span', { class: 'ma-acts' },
          // 炫彩名：默认（管理员 / TL3+）、强制开、强制关
          h('select', { class: 'input sm ma-fancy', 'aria-label': '炫彩名', title: '炫彩名字', onchange: async (e) => {
            const v = e.target.value
            try {
              const r = await api(`/admin/users/${u.id}/fancy`, { method: 'PUT', body: { fancy: v === '' ? null : Number(v) } })
              u.fancy_set = r.fancy_set; u.fancy = r.fancy
              toast(r.fancy ? '名字炫彩了' : '名字不炫彩', 'ok')
              draw(open)
            } catch (err) { toast(err.message, 'err') }
          } }, [['', '炫彩：默认'], ['1', '炫彩：开'], ['0', '炫彩：关']].map(([v, l]) => h('option', { value: v, selected: String(u.fancy_set ?? '') === v }, l))),
          owner && !u.owner && roleSel(u, draw, open),
          owner && !u.owner && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: async (e) => {
            const disabled = !u.disabled
            if (!confirm(disabled ? `停用 ${u.username}？该用户的所有登录设备将退出，API 令牌将撤销。内容会保留。` : `重新启用 ${u.username}？用户需要重新登录。`)) return
            const button = e.currentTarget; button.disabled = true
            try {
              const result = await api(`/admin/users/${u.id}/disabled`, { method: 'PUT', body: { disabled } })
              u.disabled = result.disabled; USERS.delete(u.username); draw(open)
              toast(disabled ? '账号已停用' : '账号已启用', 'ok')
            } catch (error) { button.disabled = false; toast(error.message, 'err') }
          } }, u.disabled ? '启用账号' : '停用账号'),
          owner && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => officialTitleManager(u.username) }, '授予称号'),
          !u.is_admin && u.id !== S.me.id && h('button', { class: 'btn btn-ghost sm', type: 'button', 'aria-expanded': String(!!open), onclick: () => draw(!open) }, open ? '收起' : '限制'))),
        open && h('div', { class: 'ma-edit' }, LIMIT_KINDS.map(([k, label, what]) => {
          const cur = u.limits.find((l) => l.kind === k)
          const span = h('select', { class: 'input sm', 'aria-label': label + '时长' }, LIMIT_SPANS.map(([m, l]) => h('option', { value: m }, l)))
          span.value = '1440'
          const reason = h('input', { class: 'input sm', maxlength: 100, placeholder: '原因（会告诉对方，可不填）', value: cur?.reason || '' })
          return h('div', { class: 'ma-kind' + (cur ? ' on' : '') },
            h('span', { class: 'ma-kind-name' }, h('strong', null, label), h('span', { class: 'muted' }, what)),
            cur ? h('span', { class: 'ma-cur' }, untilText(cur.until), cur.reason ? `（${cur.reason}）` : '') : h('span', { class: 'ma-cur muted' }, '未限制'),
            span, reason,
            h('button', { class: 'btn btn-primary sm', type: 'button', onclick: async () => {
              const minutes = Number(span.value)
              if (!minutes && !confirm(`永久${label} ${u.username}？之后可以随时解除。`)) return
              try {
                const r = await api(`/admin/users/${u.id}/limits`, { method: 'PUT', body: { kind: k, minutes, reason: reason.value } })
                u.limits = [...u.limits.filter((l) => l.kind !== k), { kind: k, until: r.until, reason: reason.value.trim() || null }]
                toast(`已${label} ${u.username}（${untilText(r.until)}）`, 'ok')
                draw(true)
              } catch (e) { toast(e.message, 'err') }
            } }, cur ? '改' : label),
            cur && h('button', { class: 'btn-text sm', type: 'button', onclick: async () => {
              try {
                await api(`/admin/users/${u.id}/limits/${k}`, { method: 'DELETE' })
                u.limits = u.limits.filter((l) => l.kind !== k)
                toast(`已解除${label}`, 'ok')
                draw(true)
              } catch (e) { toast(e.message, 'err') }
            } }, '解除'))
        }))))
    }
    draw(q0 && u.username.toLowerCase() === q0.toLowerCase())
    return box
  }
  let t
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250) })
  only.addEventListener('change', load)
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, '成员管理'), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: close }, icon('close'))),
    h('div', { class: 'ma-body' },
      h('div', { class: 'ma-search' }, q, h('label', { class: 'cms-img' }, only, '只看被限制的')),
      h('p', { class: 'muted ma-note' }, '禁言只管群聊发消息；禁回应包括表情、喜欢和一句回应。到期自动解除，管理员不受限制。站长可以给人设「管理员」（全站管理）或「群管」（只管群聊）。'),
      list))
  load()
  focusEditorOnOpen(q, panel)
}

// ---------- 我的设置 ----------
// 设置页导航用的几个图标
Object.assign(ICON, {
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 3v4M17 5h4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/></svg>',
  fish: '<svg viewBox="0 0 24 24"><path d="M3 12c3-5 9-6 13-3l4-3v12l-4-3c-4 3-10 2-13-3z"/><circle cx="8" cy="11" r=".8"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
})
function imageAiSettings() {
  const input = h('input', { id: 'ai-image-pref', type: 'checkbox', disabled: true })
  const status = h('p', { class: 'ai-pref-status muted', role: 'status' }, '读取中…')
  const save = h('button', { class: 'btn btn-primary sm', type: 'button', disabled: true, onclick: async () => {
    input.disabled = save.disabled = true; status.textContent = '保存中…'
    try { await api('/me/ai-prefs', { method: 'PATCH', body: { img_reply: input.checked } }); status.textContent = '已保存' }
    catch (e) { status.textContent = e.message }
    finally { input.disabled = save.disabled = false }
  } }, '保存偏好')
  const retry = h('button', { class: 'btn btn-ghost sm', type: 'button', hidden: true, onclick: load }, '重新读取')
  async function load() {
    retry.hidden = true; input.disabled = save.disabled = true; status.textContent = '读取中…'
    try { const prefs = await api('/me/ai-prefs'); input.checked = prefs.img_reply; input.disabled = save.disabled = false; status.textContent = '' }
    catch (e) { status.textContent = e.message; retry.hidden = false }
  }
  load()
  return h('section', { class: 'set-sec' }, h('h3', null, 'AI 小伙伴'), h('label', { class: 'set-check' }, input, '让 AI 回应我发的图'),
    h('p', { class: 'muted' }, '开启后，新发的公开非慎点图片会交给模型看图回应。每张图也可以单独关闭。'),
    h('div', { class: 'set-save' }, save, retry), status)
}

function meSettings(section) {
  const panel = openModalShell('me-settings')
  S.modal.kind = 'settings'
  const close = () => closeModal(false)
  const nick = h('input', { class: 'input', maxlength: 20, value: S.me.nick || '', placeholder: S.me.username })
  const bio = h('textarea', { class: 'input', rows: 2, maxlength: 80, placeholder: '一句话介绍自己（80 字以内）' }, S.me.bio || '')
  const boss = h('input', { class: 'input', type: 'url', value: localStorage.getItem('bossUrl') || '', placeholder: '留空就用站内的假文档，比如 https://www.baidu.com' })
  const dock = h('input', { type: 'checkbox', checked: dockPrefs().on })
  const seg = (name, opts, cur, on) => {
    const box = h('div', { class: 'segs small', role: 'radiogroup', 'aria-label': name })
    const draw = (v) => box.replaceChildren(...opts.map(([k, l]) => h('button', { class: 'seg' + (k === v ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === v),
      onclick: () => { on(k); draw(k) } }, l)))
    draw(cur)
    return box
  }
  const mask = seg('模糊图点一下', [['peek', '原地揭开，再点盖回'], ['view', '打开大图看']], maskTap(), (v) => {
    localStorage.setItem('maskTap', v); refreshBlur(); toast(v === 'view' ? '模糊 / 打码的图点了直接开大图，页面上一直盖着' : '点一下原地揭开，再点一下盖回去', 'ok')
  })
  // 左边导航、右边一次只看一块；手机上导航变成顶上一排可横滑的标签
  const secs = [
    ['profile', '资料', 'user', () => h('section', { class: 'set-sec' }, h('h3', null, '资料'),
      field('站内昵称', nick, '留空就用 linux.do 的名字'),
      field('个签', bio),
      h('div', { class: 'set-save' }, h('button', { class: 'btn btn-primary sm', type: 'button', onclick: async () => {
        try {
          const r = await api('/me/profile', { method: 'PATCH', body: { nick: nick.value, bio: bio.value } })
          Object.assign(S.me, { nick: r.nick, bio: r.bio, name: r.name || S.me.name })
          USERS.delete(S.me.username)
          toast('资料已保存', 'ok')
        } catch (e) { toast(e.message, 'err') }
      } }, '保存资料')))],
    ['deco', '装扮', 'sparkle', () => decoEditor()],
    ['appearance', '外观', 'palette', () => h('section', { class: 'set-sec' }, h('h3', null, '深浅色'), themeControl())],
    ['ai', 'AI 小伙伴', 'sparkle', () => imageAiSettings()],
    ['badges', '徽章墙', 'trophy', () => h('section', { class: 'set-sec' }, h('h3', null, '徽章墙'),
      h('p', { class: 'muted sm' }, '每日徽章次日结算，可以反复拿，拿得越多等级越高；想佩戴哪个去「装扮」里选'),
      badgeWall(S.me.badges))],
    ['moyu', '摸鱼助手', 'fish', () => moyuSettings()],
    ['remind', '下班 / 提醒', 'clock', () => offworkSettings()],
    ['boss', '老板键', 'eyeOff', () => h('section', { class: 'set-sec' }, h('h3', null, '老板键'),
      field('按老板键时跳到', boss, '设了网址就直接跳过去（回不来，适合真着急）；不设就盖一层假文档，再按一次回来'),
      h('div', { class: 'set-save' }, h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => {
        const v = boss.value.trim()
        if (v && !/^https?:\/\//i.test(v)) return toast('网址要以 http:// 或 https:// 开头', 'err')
        v ? localStorage.setItem('bossUrl', v) : localStorage.removeItem('bossUrl')
        toast('已保存', 'ok')
      } }, '保存')))],
    ['blur', '模糊 / 群聊', 'image', () => h('section', { class: 'set-sec' }, h('h3', null, '模糊 / 打码的图'),
      field('点一下的时候', mask, '帖子和群聊都按这个来；选「打开大图看」就不会在页面上当场揭开，防社死'),
      awaySettings(),
      chatAutoSettings())],
    ['other', '其他', 'more', () => h('section', { class: 'set-sec' }, h('h3', null, '其他'),
      h('label', { class: 'set-check' }, dock, '右下角显示悬浮群聊'),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { close(); startGuide(true) } }, '重新看一遍新手引导'))],
  ]
  const body = h('div', { class: 'ma-body set-body' })
  const nav = h('nav', { class: 'set-nav', 'aria-label': '设置分类' })
  const built = new Map()
  const go = (k) => {
    localStorage.setItem('setTab', k)
    // 切走再切回来不丢没保存的改动：每块只建一次
    if (!built.has(k)) built.set(k, secs.find((x) => x[0] === k)[3]())
    body.replaceChildren(built.get(k))
    syncThemeControls()
    body.scrollTop = 0
    nav.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false') })
  }
  nav.replaceChildren(...secs.map(([k, l, ic]) => h('button', { type: 'button', 'data-k': k, onclick: () => go(k) }, ICON[ic] ? icon(ic, 'i tiny') : null, h('span', null, l))))
  panel.replaceChildren(
    h('header', { class: 'compose-head' }, h('h2', null, '设置'), h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: close }, icon('close'))),
    h('div', { class: 'set-wrap' }, nav, body))
  const want = typeof section === 'string' ? section : localStorage.getItem('setTab')
  go(secs.some((x) => x[0] === want) ? want : 'profile')
  dock.addEventListener('change', () => { saveDock({ on: dock.checked }); dockSync() })
}

// 来新消息时要不要自动滚到最新
const chatAuto = () => localStorage.getItem('chatAuto') || 'near'
function chatAutoSettings() {
  const box = h('div', { class: 'segs small', role: 'radiogroup', 'aria-label': '来新消息时自动滚动' })
  const opts = [['near', '在底部时跟着滚'], ['always', '总是滚到最新'], ['off', '不自动滚']]
  const draw = (v) => box.replaceChildren(...opts.map(([k, l]) => h('button', { class: 'seg' + (k === v ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(k === v),
    onclick: () => { localStorage.setItem('chatAuto', k); draw(k) } }, l)))
  draw(chatAuto())
  return field('群聊来新消息时', box, '「总是」= 往上翻着看也会被拉到最新；「不自动滚」= 只出「N 条新消息」按钮')
}
// 群聊「你离开的 x 分钟里有 N 条新消息」横条：开关 + 几秒后自动收起。设置页和群设置里共用
function awaySettings() {
  const p = awayPrefs()
  const on = h('input', { type: 'checkbox', checked: p.on })
  const sec = h('input', { class: 'input sm-num', type: 'number', min: 0, max: 600, step: 5, value: p.sec || 0, 'aria-label': '几秒后消失' })
  const save = () => {
    localStorage.setItem('chatAway', JSON.stringify({ on: on.checked, sec: Math.max(0, Math.min(600, Number(sec.value) || 0)) }))
    sec.disabled = !on.checked
  }
  sec.disabled = !p.on
  on.addEventListener('change', save)
  sec.addEventListener('change', save)
  return h('div', { class: 'away-set' },
    h('label', { class: 'set-check' }, on, '群聊离开一会儿回来，显示「离开期间有 N 条新消息」'),
    h('label', { class: 'set-check sub' }, '显示', sec, '秒后自动收起', h('span', { class: 'muted sm' }, '（0 = 一直留着，自己点 × 关）')))
}

// 新手引导：第一次登录弹一次，设置里能再看
const GUIDE = [
  ['刷梗图', '首页是瀑布流，点图看大图，双击或滚轮放大。上面的标签和作者可以多选筛选。'],
  ['回应', '每帖都能点表情、喜欢，或者来一句 12 字以内的回应；点回应上的数字能看是谁回的。'],
  ['发帖', '右上角「发布」，能一次发多张图、视频或纯文字，局部打码会自动打上「打码」标签。'],
  ['群聊', '登录就在默认群里。右下角是悬浮群聊，能弹出成小窗；PC 右键消息、手机左滑消息都能快速回复。'],
  ['摸鱼', '连按两下 Esc 是老板键；在「我的 → 设置」里能改成直接跳到别的网址。'],
]
function startGuide(force) {
  if (!force && (localStorage.getItem('guideDone') || !S.me)) return
  const panel = openModalShell('guide')
  S.modal.kind = 'guide'
  let i = 0
  const done = () => { localStorage.setItem('guideDone', '1'); closeModal(false); nsfwHint() }
  if (!force) welcomeFx()
  const draw = () => {
    const [t, d] = GUIDE[i]
    panel.replaceChildren(
      h('header', { class: 'compose-head' }, h('h2', null, '欢迎来尽欢', h('span', { class: 'muted' }, ` · ${i + 1}/${GUIDE.length}`)),
        h('button', { class: 'btn-icon', 'aria-label': '关闭', onclick: done }, icon('close'))),
      h('div', { class: 'guide-body' }, h('h3', null, t), h('p', null, d),
        h('div', { class: 'guide-dots' }, GUIDE.map((_, k) => h('i', { class: k === i ? 'on' : '' })))),
      h('footer', { class: 'guide-foot' },
        h('button', { class: 'btn-text', type: 'button', onclick: done }, '跳过'),
        h('span', { class: 'grow' }),
        i > 0 && h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => { i--; draw() } }, '上一步'),
        h('button', { class: 'btn btn-primary sm', type: 'button', onclick: () => { if (++i >= GUIDE.length) done(); else draw() } }, i === GUIDE.length - 1 ? '开始' : '下一步')))
  }
  draw()
}

// ---------- 下班提醒：到点全屏飘过一行巨大的炫彩「到点下班啦~」 ----------
const offPrefs = () => { try { return { on: false, at: '18:00', work: true, ...JSON.parse(localStorage.getItem('offwork')) } } catch { return { on: false, at: '18:00', work: true } } }
function offworkSettings() {
  const p = offPrefs()
  const on = h('input', { type: 'checkbox', checked: p.on })
  const at = pickTime(h('input', { class: 'input sm', type: 'time', value: p.at, 'aria-label': '下班时间' }), { minuteStep: 1, onChange: () => save() })
  const work = h('input', { type: 'checkbox', checked: p.work })
  const save = () => { localStorage.setItem('offwork', JSON.stringify({ on: on.checked, at: at.value || '18:00', work: work.checked })); localStorage.removeItem('offworkDay') }
  ;[on, work].forEach((x) => x.addEventListener('change', save))
  return h('section', { class: 'set-sec' }, h('h3', null, '下班提醒'),
    h('label', { class: 'set-check' }, on, '到点了全屏提醒我下班'),
    h('div', { class: 'off-row' }, h('span', null, '下班时间'), at,
      h('label', { class: 'set-check' }, work, '只在周一到周五'),
      h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: () => offworkFx() }, '预览一下')),
    h('p', { class: 'muted sm' }, '网页开着才会提醒（任意页面都行），一天只提醒一次'),
    remindSettings())
}
// 自定义提醒：3 条，各自的时间和文字（喝水、站起来走走、开会…），到点和下班提醒一样全屏飘过
const REMIND_N = 3
const remindPrefs = () => {
  let a = []
  try { a = JSON.parse(localStorage.getItem('reminds')) || [] } catch {}
  return Array.from({ length: REMIND_N }, (_, i) => ({ on: false, at: '', text: '', work: true, ...(a[i] || {}) }))
}
function remindSettings() {
  const list = remindPrefs()
  const save = () => { localStorage.setItem('reminds', JSON.stringify(list)); localStorage.removeItem('remindDay') }
  return h('div', { class: 'remind-set' }, h('h4', null, '自定义提醒'),
    list.map((r, i) => {
      const on = h('input', { type: 'checkbox', checked: r.on, 'aria-label': `开启提醒 ${i + 1}`, onchange: (e) => { r.on = e.target.checked; save() } })
      const at = pickTime(h('input', { class: 'input sm', type: 'time', value: r.at, 'aria-label': `提醒 ${i + 1} 的时间` }),
        { minuteStep: 1, onChange: (v) => { r.at = v; if (r.at && r.text) { r.on = true; on.checked = true }; save() } })
      const text = h('input', { class: 'input sm', maxlength: 20, value: r.text, placeholder: ['起来喝口水~', '站起来走两步', '准备开会了'][i], 'aria-label': `提醒 ${i + 1} 的文字`,
        onchange: (e) => { r.text = e.target.value.trim(); save() } })
      const work = h('input', { type: 'checkbox', checked: r.work, onchange: (e) => { r.work = e.target.checked; save() } })
      return h('div', { class: 'remind-row' }, on, at, text,
        h('label', { class: 'set-check' }, work, '仅工作日'),
        h('button', { class: 'btn-text sm', type: 'button', onclick: () => offworkFx(text.value.trim() || text.placeholder, '点一下关掉') }, '预览'))
    }),
    h('p', { class: 'muted sm' }, '最多 20 个字；填了时间和文字就自动打开，每条每天提醒一次'))
}
function offworkFx(word = '到点下班啦~', sub = '收拾收拾，走了走了（点一下关掉）') {
  if (document.querySelector('.offwork-fx')) return
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const fx = h('div', { class: 'offwork-fx' + (still ? ' still' : ''), role: 'alert', onclick: () => fx.remove() },
    h('div', { class: 'ow-word' }, word),
    h('div', { class: 'ow-word two', 'aria-hidden': 'true' }, word),
    h('div', { class: 'ow-sub' }, sub))
  document.body.append(fx)
  setTimeout(() => fx.remove(), 9000)
}
setInterval(() => {
  const d = new Date()
  const day = d.toDateString()
  const due = (at) => { const [hh, mm] = at.split(':').map(Number); const k = d.getHours() * 60 + d.getMinutes() - (hh * 60 + mm); return k >= 0 && k <= 10 }
  // 自定义提醒：记下今天哪几条已经提醒过
  let done = {}
  try { done = JSON.parse(localStorage.getItem('remindDay')) || {} } catch {}
  if (done.day !== day) done = { day, ids: [] }
  for (const [i, r] of remindPrefs().entries()) {
    if (!r.on || !r.at || done.ids.includes(i) || (r.work && (d.getDay() === 0 || d.getDay() === 6)) || !due(r.at)) continue
    done.ids.push(i)
    localStorage.setItem('remindDay', JSON.stringify(done))
    if (!document.querySelector('.offwork-fx')) { offworkFx(r.text || '叮~ 到点了', '点一下关掉'); break }
  }
  const p = offPrefs()
  if (!p.on) return
  if (p.work && (d.getDay() === 0 || d.getDay() === 6)) return
  const [hh, mm] = (p.at || '18:00').split(':').map(Number)
  const mins = d.getHours() * 60 + d.getMinutes() - (hh * 60 + mm)
  // 到点后 10 分钟内打开网页也算，过了就不补
  if (mins < 0 || mins > 10 || localStorage.getItem('offworkDay') === day) return
  localStorage.setItem('offworkDay', day)
  offworkFx()
}, 15000)

// ---------- 摸鱼助手：下班 / 发工资 / 周末 / 节日倒计时 + 摸鱼计时器（按时薪算摸了多少钱）。全存本地 ----------
// 法定节日（农历的按公历写死到 2028 年），用户还能自己加纪念日：MM-DD 每年重复，YYYY-MM-DD 只算一次
const FESTS = [['元旦', '01-01'], ['劳动节', '05-01'], ['国庆节', '10-01'], ['圣诞节', '12-25'],
  ['春节', '2027-02-06'], ['春节', '2028-01-26'], ['清明', '2027-04-05'], ['清明', '2028-04-04'],
  ['端午', '2027-06-09'], ['端午', '2028-05-28'], ['中秋', '2027-09-15'], ['中秋', '2028-10-03']]
const MOYU_DEF = { start: '09:00', pay: 15, salary: 0, days: 21.75, hours: 8, fests: [], bar: true, fx: true }
const moyuPrefs = () => { try { return { ...MOYU_DEF, ...JSON.parse(localStorage.getItem('moyu')) } } catch { return { ...MOYU_DEF } } }
const saveMoyu = (x) => localStorage.setItem('moyu', JSON.stringify({ ...moyuPrefs(), ...x }))
const moyuT = () => { try { return { day: '', sec: 0, total: 0, last: 0, ...JSON.parse(localStorage.getItem('moyuT')) } } catch { return { day: '', sec: 0, total: 0, last: 0 } } }
const hourly = (p = moyuPrefs()) => (p.salary > 0 && p.days > 0 && p.hours > 0 ? p.salary / (p.days * p.hours) : 0)
const money = (v) => '¥' + (v >= 100 ? v.toFixed(1) : v.toFixed(2))
const hms = (s) => { s = Math.max(0, Math.floor(s)); const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60; return (hh ? hh + ' 小时 ' : '') + (hh || mm ? mm + ' 分 ' : '') + ss + ' 秒' }
const atToday = (hm, base = new Date()) => { const [a, b] = String(hm || '0:0').split(':').map(Number); const d = new Date(base); d.setHours(a || 0, b || 0, 0, 0); return d }
const dayDiff = (a, b) => Math.round((new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / 86400000)
function nextFests(now = new Date(), n = 4) {
  const out = []
  for (const [name, d] of [...FESTS, ...moyuPrefs().fests.map((f) => [f.n, f.d])]) {
    let t
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) t = new Date(d + 'T00:00:00')
    else if (/^\d{2}-\d{2}$/.test(d)) {
      t = new Date(`${now.getFullYear()}-${d}T00:00:00`)
      if (dayDiff(t, now) < 0) t = new Date(`${now.getFullYear() + 1}-${d}T00:00:00`)
    } else continue
    const left = dayDiff(t, now)
    if (left >= 0 && !isNaN(left)) out.push({ name, t, left })
  }
  const seen = new Set()
  return out.sort((a, b) => a.left - b.left).filter((f) => !seen.has(f.name) && seen.add(f.name)).slice(0, n)
}
function nextPay(now = new Date(), day = moyuPrefs().pay) {
  const at = (y, m) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()))
  let t = at(now.getFullYear(), now.getMonth())
  if (dayDiff(t, now) < 0) t = at(now.getFullYear(), now.getMonth() + 1)
  return dayDiff(t, now)
}
// 计时：页面在前台就算在摸鱼；多个标签页同时开着只算一份（看谁上一秒已经记过）
setInterval(() => {
  if (document.hidden) return
  const t = moyuT()
  const now = Date.now()
  if (now - t.last < 800) return
  const day = new Date().toDateString()
  if (t.day !== day) Object.assign(t, { day, sec: 0 })
  t.sec++; t.total++; t.last = now
  localStorage.setItem('moyuT', JSON.stringify(t))
  const p = moyuPrefs()
  const earn = hourly(p) * t.sec / 3600
  document.querySelectorAll('[data-moyu-earn]').forEach((el) => { el.textContent = p.bar && p.salary > 0 ? money(earn) : ''; el.hidden = !(p.bar && p.salary > 0) })
  MOYU_TICK?.()
}, 1000)
let MOYU_TICK = null
function moyuBtn() {
  const p = moyuPrefs()
  return h('button', { class: 'btn-icon moyu-btn', type: 'button', title: '摸鱼助手', 'aria-label': '摸鱼助手', 'data-pop': 'moyu', onclick: (e) => moyuPanel(e.currentTarget) },
    icon('calendar'), h('span', { class: 'moyu-earn', 'data-moyu-earn': '', hidden: !(p.bar && p.salary > 0) }))
}
// 今天在站里干了啥：服务器算，一分钟拉一次
const TODAY = { at: 0, d: null, busy: false, error: false }
async function loadToday(force) {
  if (!S.me || TODAY.busy || (!force && Date.now() - TODAY.at < 60000)) return
  TODAY.busy = true
  try { TODAY.d = await api('/me/today'); TODAY.at = Date.now(); TODAY.error = false } catch { TODAY.error = true } finally { TODAY.busy = false }
}
function todayBlock(variant = 0, retry) {
  const t = TODAY.d
  if (!S.me) return null
  if (!t) return h('div', { class: 'my-today muted sm' }, TODAY.error ? '日报暂时没取到' : '正在统计今天的战绩…',
    TODAY.error && h('button', { class: 'btn-text sm', type: 'button', onclick: retry }, '重试'))
  const titles = ['今日摸鱼小报', '本日摸鱼结算', '尽欢营业记录']
  const lines = ['把快乐攒成一页。', '今天的梗，也算精神食粮。', '人间很忙，这里歇一会儿。']
  const stats = [['seen', '看过的图'], ['posts', '发出的图'], ['msgs', '群聊发言'], ['browsed', '浏览消息'], ['post_reacts', '帖子回应'], ['reacts', '群聊互动'], ['seen_nsfw', '慎点图']]
  return h('section', { class: 'my-today my-report', 'data-variant': variant, 'aria-label': '今日统计' },
    h('h3', null, titles[variant]), h('p', { class: 'my-report-intro' }, lines[variant]),
    h('div', { class: 'my-report-stats' }, stats.map(([k, label]) => h('div', { class: 'my-report-stat' }, h('b', { 'data-stat': k }, fmtN(t[k] || 0)), h('span', null, label)))),
    h('p', { class: 'muted sm' }, todayHint(t)), TODAY.error && h('p', { class: 'muted sm' }, '暂未刷新，显示上次统计'))
}
// 离今天能拿的徽章还差多少（只提示门槛型的，冠军型要看别人）
function todayHint(t) {
  if (t.seen < 200) return `再看 ${200 - t.seen} 张图，明天就能拿到「摸鱼高手」徽章`
  if (t.posts < 5) return `已经达到「摸鱼高手」；再发 ${5 - t.posts} 张图，还能拿「发图达人」`
  return '今天的门槛徽章都拿稳了，冠军徽章要看谁最多，明天揭晓'
}
function moyuPanel(anchor) {
  let variant = Math.floor(Math.random() * 3), reportData, reportError
  const live = h('div', { class: 'moyu-live' }), report = h('div')
  const redrawReport = () => { reportData = TODAY.d; reportError = TODAY.error; report.replaceChildren(...[todayBlock(variant, () => loadToday(true).then(redrawReport))].filter(Boolean)) }
  const body = h('div', { class: 'moyu' }, live, report,
    h('div', { class: 'my-report-foot' },
      h('button', { class: 'btn-text sm my-shuffle', type: 'button', onclick: () => { variant = (variant + 1) % 3; redrawReport() } }, icon('swap', 'i tiny'), '换张日报'),
      h('button', { class: 'btn-text sm', type: 'button', onclick: () => { MOYU_TICK = null; closePop(); moyuEdit() } }, icon('gear', 'i tiny'), '设置')))
  redrawReport()
  loadToday().then(() => MOYU_TICK?.())
  const draw = () => {
    const p = moyuPrefs(), t = moyuT(), now = new Date()
    const st = atToday(p.start, now), off = atToday(offPrefs().at, now)
    const wd = now.getDay(), weekend = wd === 0 || wd === 6
    let offLine, pct = 0
    if (weekend) offLine = '今天周末，不用上班'
    else if (now < st) offLine = `还没上班，${hms((st - now) / 1000)}后开工`
    else if (now >= off) offLine = '已经下班啦'
    else { offLine = `还有 ${hms((off - now) / 1000)}`; pct = Math.min(100, ((now - st) / (off - st)) * 100) }
    // 周五下班就算周末开始
    const fri = atToday(offPrefs().at, now); fri.setDate(fri.getDate() + ((5 - wd + 7) % 7))
    const wkLine = weekend ? '周末进行中，好好玩' : now >= fri ? '周末已经开始了' : `还有 ${dayDiff(fri, now) ? dayDiff(fri, now) + ' 天 ' : ''}${dayDiff(fri, now) ? '' : hms((fri - now) / 1000)}`.trim()
    const pay = nextPay(now, p.pay)
    const hr = hourly(p)
    const row = (k, v, cls = '') => h('div', { class: 'my-row ' + cls }, h('span', { class: 'my-k' }, k), h('strong', { class: 'my-v' }, v))
    live.replaceChildren(
      h('div', { class: 'my-big' }, h('span', null, '距离下班'), h('strong', null, offLine),
        pct > 0 && h('div', { class: 'my-bar', role: 'progressbar', 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': '今天上班进度' }, h('i', { style: { width: pct + '%' } })),
        pct > 0 && h('span', { class: 'muted sm' }, `今天已经熬过 ${pct.toFixed(1)}%`)),
      row('距离周末', wkLine),
      row('距离发工资', pay === 0 ? '就是今天！' : `${pay} 天（每月 ${p.pay} 号）`, pay === 0 ? 'hot' : ''),
      ...nextFests(now).map((f) => row('距离' + f.name, f.left === 0 ? '就是今天！' : `${f.left} 天`, f.left === 0 ? 'hot' : '')),
      h('div', { class: 'my-fish' },
        h('div', { class: 'my-fish-h' }, '今天在尽欢摸了'),
        h('strong', { class: 'my-time' }, hms(t.day === now.toDateString() ? t.sec : 0)),
        hr ? h('div', { class: 'my-earn' }, '带薪赚了 ', h('b', null, money(hr * (t.day === now.toDateString() ? t.sec : 0) / 3600)), h('span', { class: 'muted sm' }, ` · 时薪 ${money(hr)}`))
          : h('div', { class: 'muted sm' }, '填一下月薪，就能算出摸鱼赚了多少钱'),
        h('div', { class: 'muted sm' }, `累计摸鱼 ${hms(t.total)}` + (hr ? `，约 ${money(hr * t.total / 3600)}` : ''))))
    if (reportData !== TODAY.d || reportError !== TODAY.error) redrawReport()
  }
  draw()
  const el = openPop(anchor, body, { key: 'moyu', align: 'right', cls: 'pop-moyu' })
  MOYU_TICK = el ? () => { if (!el.isConnected) { MOYU_TICK = null; return } draw() } : null
}
function moyuSettings() {
  const p = moyuPrefs()
  const num = (k, attrs) => h('input', { class: 'input sm', type: 'number', value: p[k] || '', ...attrs, onchange: (e) => saveMoyu({ [k]: Math.max(0, Number(e.target.value) || 0) }) })
  const time = (get, set, label) => pickTime(h('input', { class: 'input sm', type: 'time', value: get, 'aria-label': label }), { minuteStep: 1, onChange: (v) => set(v) })
  const fl = h('div', { class: 'my-fests' })
  const drawF = () => fl.replaceChildren(...moyuPrefs().fests.map((f, i) => h('span', { class: 'chip' }, `${f.n} ${f.d}`,
    h('button', { class: 'chip-x', type: 'button', 'aria-label': '删掉' + f.n, onclick: () => { const fs = moyuPrefs().fests; fs.splice(i, 1); saveMoyu({ fests: fs }); drawF() } }, '×'))))
  drawF()
  const fn = h('input', { class: 'input sm', maxlength: 10, placeholder: '名字，比如：生日', 'aria-label': '纪念日名字' })
  const fd = h('input', { class: 'input sm', placeholder: 'MM-DD 或 YYYY-MM-DD', 'aria-label': '日期' })
  const addF = () => {
    const d = fd.value.trim().replace(/\//g, '-'), n = fn.value.trim()
    if (!n || !/^(\d{4}-)?\d{2}-\d{2}$/.test(d)) return toast('名字和日期都要填，日期写成 05-20 或 2027-05-20', 'err')
    saveMoyu({ fests: [...moyuPrefs().fests, { n, d }].slice(0, 20) }); fn.value = fd.value = ''; drawF()
  }
  const chk = (k, l) => h('label', { class: 'set-check' }, h('input', { type: 'checkbox', checked: !!p[k], onchange: (e) => { saveMoyu({ [k]: e.target.checked }); document.querySelectorAll('[data-moyu-earn]').forEach((x) => { x.hidden = !(moyuPrefs().bar && moyuPrefs().salary > 0) }) } }), l)
  return h('section', { class: 'set-sec' }, h('h3', null, '摸鱼助手'),
    h('div', { class: 'my-grid' },
      h('label', null, '上班时间', time(p.start, (v) => saveMoyu({ start: v || '09:00' }), '上班时间')),
      h('label', null, '下班时间', time(offPrefs().at, (v) => { localStorage.setItem('offwork', JSON.stringify({ ...offPrefs(), at: v || '18:00' })); localStorage.removeItem('offworkDay') }, '下班时间')),
      h('label', null, '每月几号发工资', num('pay', { min: 1, max: 31, 'aria-label': '发工资日' })),
      h('label', null, '月薪（元）', num('salary', { min: 0, step: 100, placeholder: '只存在本机', 'aria-label': '月薪' })),
      h('label', null, '每月上班天数', num('days', { min: 1, max: 31, step: 0.25, 'aria-label': '每月上班天数' })),
      h('label', null, '每天工时', num('hours', { min: 1, max: 24, step: 0.5, 'aria-label': '每天工时' }))),
    chk('bar', '顶栏显示今天摸鱼赚了多少钱'),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, '自己的纪念日 / 节日'), fl,
      h('div', { class: 'my-addf' }, fn, fd, h('button', { class: 'btn btn-ghost sm', type: 'button', onclick: addF }, '加上'))),
    h('div', { class: 'row-end' }, h('button', { class: 'btn-text sm danger', type: 'button', onclick: () => {
      if (!confirm('摸鱼计时清零？')) return
      localStorage.removeItem('moyuT'); toast('清零了', 'ok')
    } }, '计时清零')),
    h('p', { class: 'muted sm' }, '这些数据（包括月薪）只存在这台设备的浏览器里，不会上传。网页在前台就算在摸鱼，开几个标签页也只算一份。'))
}
function moyuEdit() {
  const panel = openModalShell('moyu-set')
  S.modal.kind = 'moyu-set'
  panel.replaceChildren(h('header', { class: 'compose-head' }, h('h2', null, '摸鱼助手设置'), closeBtn()),
    h('div', { class: 'ma-body' }, moyuSettings(), offworkSettings()))
}

// 文字选择：群消息、帖子正文、评论里能长按 / 拖选复制；Ctrl+A 和手机上的「全选」只选当前这段，不把整个网页选上
const TEXT_SEL = '.cm-text, .im-bubble, .card-desc, .detail-content, .comment-body, .rd-body, .rd-c-body, .notice-detail-body, .card-title, .detail-title'
let LAST_TEXT = null
function textGuard(doc) {
  doc.addEventListener('pointerdown', (e) => { LAST_TEXT = e.target.closest?.(TEXT_SEL) || null }, true)
  doc.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'a' || e.altKey || e.shiftKey) return
    const t = e.target
    if (t.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return
    e.preventDefault()
    const sel = doc.getSelection()
    const block = sel.anchorNode?.parentElement?.closest(TEXT_SEL) || (LAST_TEXT?.isConnected && LAST_TEXT)
    if (block) sel.selectAllChildren(block)
  })
  // 手机上点「全选」会把整页选上：选区跨了好几段 / 跑出正文，就收回到起点那一段
  let busy = false
  doc.addEventListener('selectionchange', () => {
    if (busy) return
    const sel = doc.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    if (doc.activeElement?.closest?.('input, textarea, [contenteditable]')) return
    const a = sel.anchorNode?.parentElement?.closest?.(TEXT_SEL) || (sel.anchorNode?.closest?.(TEXT_SEL))
    const f = sel.focusNode?.parentElement?.closest?.(TEXT_SEL) || (sel.focusNode?.closest?.(TEXT_SEL))
    if (a && a === f) return
    const r = sel.getRangeAt(0)
    const anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement
    // 只在一小块普通文字里选（标题、简介等）不管；一下罩住一大片（含两段以上正文或整个主区）才收
    if (!a && !f && anc && anc.querySelectorAll(TEXT_SEL).length < 2 && !anc.matches('body, main, #main')) return
    const keep = a || f || (LAST_TEXT?.isConnected && LAST_TEXT)
    busy = true
    if (keep) sel.selectAllChildren(keep)
    else sel.removeAllRanges()
    setTimeout(() => { busy = false })
  })
}
textGuard(document)

// 新人欢迎：一阵彩纸 + 「欢迎来尽欢」大字，2 秒多自己散掉；减少动态效果时不放
function welcomeFx() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const cols = ['#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6']
  const bits = Array.from({ length: 70 }, (_, i) => h('i', { style: {
    '--x': (Math.random() * 100).toFixed(1) + 'vw', '--dx': ((Math.random() - .5) * 30).toFixed(1) + 'vw', '--r': Math.round(Math.random() * 720 - 360) + 'deg',
    '--d': (1.6 + Math.random() * 1.4).toFixed(2) + 's', '--delay': (Math.random() * .5).toFixed(2) + 's', background: cols[i % cols.length],
    width: (6 + Math.random() * 6).toFixed(0) + 'px', height: (8 + Math.random() * 10).toFixed(0) + 'px', borderRadius: i % 3 ? '2px' : '50%' } }))
  const fx = h('div', { class: 'welcome-fx', 'aria-hidden': 'true' }, bits, h('div', { class: 'wf-word' }, h('span', null, '欢迎来'), h('strong', null, '尽欢')))
  document.body.append(fx)
  setTimeout(() => fx.remove(), 3600)
}
// 提示一次：默认没打开 NSFW，箭头指着「筛选」按钮
function nsfwHint(tries = 0) {
  if (localStorage.getItem('nsfwHint') || S.content !== 'hide') return
  const btn = document.querySelector('.tool-btn[data-pop="wallset"]')
  const r = btn?.getBoundingClientRect()
  if (!btn || !r.width || S.modal) { if (tries < 40) setTimeout(() => nsfwHint(tries + 1), 500); return }
  localStorage.setItem('nsfwHint', '1')
  btn.scrollIntoView({ block: 'nearest' })
  const b = btn.getBoundingClientRect()
  const close = () => { tip.remove(); ring.remove(); removeEventListener('scroll', close); removeEventListener('resize', close) }
  const ring = h('div', { class: 'nh-ring', 'aria-hidden': 'true', style: { left: b.left - 6 + 'px', top: b.top - 6 + 'px', width: b.width + 12 + 'px', height: b.height + 12 + 'px' } })
  const left = Math.max(12, Math.min(b.left + b.width / 2 - 140, innerWidth - 292))
  const tip = h('div', { class: 'nh-tip', role: 'status', style: { left: left + 'px', top: b.bottom + 34 + 'px', '--ax': (b.left + b.width / 2 - left) + 'px' } },
    h('span', { class: 'nh-arrow', 'aria-hidden': 'true' }, '⬆'),
    h('p', null, h('strong', null, '默认没打开 NSFW 内容'), h('br'), '想看的话，点这个「筛选」按钮，在「内容显示」里打开'),
    h('button', { class: 'btn btn-primary sm', type: 'button', onclick: close }, '知道了'))
  document.body.append(ring, tip)
  setTimeout(() => { addEventListener('scroll', close, { passive: true }); addEventListener('resize', close) }, 300)
  setTimeout(close, 15000)
}

// ---------- 启动 ----------

// 表情、贴纸、图片走 Service Worker 缓存（Cache Storage），第二次起直接从本地读
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) navigator.serviceWorker.register('/sw.js').catch(() => {})
;(async () => {
  try {
    const me = await api('/me')
    S.me = me.user
    if (S.me) {
      restorePendingSeen()
      if (SEEN.queue.size) flushSeen().catch(() => {})
    }
    S.officialTitles = me.official_titles || []
    S.limits = me.limits || []
    S.emojis = me.emojis
    S.emojiGroups = me.emoji_groups
    S.nsfwTags = me.nsfw_tags || []
    if (S.me) api('/anchors').then(({ anchors }) => setAnchors(anchors)).catch(() => {})
    if (S.me) loadGroups()
    if (S.me) loadNotifs()
    if (S.me) setTimeout(() => !S.modal && startGuide(), 1200)
    // 没登录的新访客：放一下欢迎彩纸，再指一下「筛选」
    else if (!localStorage.getItem('nsfwHint')) setTimeout(() => { welcomeFx(); setTimeout(nsfwHint, 1800) }, 800)
    S.minPostTL = me.min_post_trust_level
  } catch {}
  document.documentElement.toggleAttribute('data-blur-all', S.blurAll)
  syncTab()
  tuneLook()
  applyLook()
  renderActions()
  route()
  loadNotices()
  if (fishPrefs().open && FISH_OK() && !S.skin) fishResume()
})()
