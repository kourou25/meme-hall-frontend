// 尽欢解密模块：加解密工具箱（纯浏览器 ES module，无依赖）

// ---------- 基础工具 ----------

const te = new TextEncoder()
const utf8 = (s) => te.encode(String(s))
const unutf8 = (b) => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { throw Error('解出来不是正常文字，密文可能抄错了') }
}

const b64enc = (bytes) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const b64dec = (str) => {
  let s = String(str).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  if (s.length % 4 === 1) throw Error('base64 长度不对')
  s += '='.repeat((4 - (s.length % 4)) % 4)
  let bin
  try { bin = atob(s) } catch { throw Error('不是合法的 base64') }
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => {
  const s = String(hex).replace(/0x/gi, '').replace(/[\s,:]+/g, '')
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) throw Error('不是合法的十六进制')
  const out = new Uint8Array(s.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16)
  return out
}

// 按字素切分（emoji 组合不拆开），没有 Segmenter 就按码点
const graphemes = (s) => typeof Intl !== 'undefined' && Intl.Segmenter
  ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment)
  : Array.from(s)

const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0))
  let o = 0
  for (const a of arrs) { out.set(a, o); o += a.length }
  return out
}

// ---------- AES-GCM（PBKDF2-SHA256 10 万次）----------

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
// 输出 salt(16)|iv(12)|ct
async function aesEncrypt(bytes, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes))
  return concat(salt, iv, ct)
}
async function aesDecrypt(data, password) {
  if (data.length < 16 + 12 + 16) throw Error('密文不完整')
  const key = await deriveKey(password, data.subarray(0, 16))
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(16, 28) }, key, data.subarray(28)))
  } catch { throw Error('密码不对') }
}

// ---------- 趣味编码 ----------

// 兽音译者：兼容流行实现
const SHOU = ['嗷', '呜', '啊', '~']
function shouEnc(text) {
  const [a, b, c, d] = SHOU
  let hex = ''
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, '0')
  let out = ''
  for (let i = 0; i < hex.length; i++) {
    const k = (parseInt(hex[i], 16) + (i % 16)) % 16
    out += SHOU[k >> 2] + SHOU[k & 3]
  }
  return d + b + a + out + c
}
function shouDec(text) {
  const s = String(text).trim()
  if (!s.startsWith('~呜嗷') || !s.endsWith('啊')) throw Error('这不像兽语：要以「~呜嗷」开头、「啊」结尾')
  const body = s.slice(3, -1)
  if (body.length % 2) throw Error('兽语长度不对')
  let hex = ''
  for (let i = 0; i < body.length / 2; i++) {
    const x = SHOU.indexOf(body[i * 2]), y = SHOU.indexOf(body[i * 2 + 1])
    if (x < 0 || y < 0) throw Error('兽语里混进了奇怪的字')
    hex += ((x * 4 + y - (i % 16) + 16) % 16).toString(16)
  }
  if (hex.length % 4) throw Error('兽语长度不对')
  let out = ''
  for (let i = 0; i < hex.length; i += 4) out += String.fromCharCode(parseInt(hex.substr(i, 4), 16))
  return out
}

// 与佛论禅风：16 字表，两字一字节
const FO = '南无阿弥陀佛般若波罗蜜多心经菩萨'
const foEnc = (text) => '佛曰：' + Array.from(utf8(text), (b) => FO[b >> 4] + FO[b & 15]).join('')
function foDec(text) {
  const s = String(text).trim().replace(/^佛曰[：:]?/, '').replace(/\s+/g, '')
  if (!s || s.length % 2) throw Error('佛曰不全，少了字')
  const out = new Uint8Array(s.length / 2)
  for (let i = 0; i < out.length; i++) {
    const x = FO.indexOf(s[i * 2]), y = FO.indexOf(s[i * 2 + 1])
    if (x < 0 || y < 0) throw Error('佛曰里混进了凡字')
    out[i] = x * 16 + y
  }
  return unutf8(out)
}

// emoji 密码：base64 字母表 → U+1F600 起 64 个表情
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const EMOJI0 = 0x1f600
const emojiEnc = (text) => Array.from(b64enc(utf8(text)).replace(/=+$/, ''), (c) => String.fromCodePoint(EMOJI0 + B64.indexOf(c))).join('')
function emojiDec(text) {
  let s = ''
  for (const ch of String(text)) {
    const k = ch.codePointAt(0) - EMOJI0
    if (k >= 0 && k < 64) s += B64[k]
  }
  if (!s) throw Error('没找到能解的表情')
  return unutf8(b64dec(s))
}

const reverseText = (text) => graphemes(String(text)).reverse().join('')

// 九宫格：a→21 b→22 … 空格→0，大小写不区分
const T9 = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']
const T9_ENC = {}
T9.forEach((ls, k) => [...ls].forEach((c, i) => { T9_ENC[c] = `${k}${i + 1}` }))
const T9_DEC = Object.fromEntries(Object.entries(T9_ENC).map(([c, v]) => [v, c]))
function t9Enc(text) {
  const out = []
  let lit = ''
  for (const ch of String(text)) {
    const code = ch === ' ' ? '0' : T9_ENC[ch.toLowerCase()]
    if (code) { if (lit) { out.push(lit); lit = '' } out.push(code) } else lit += ch
  }
  if (lit) out.push(lit)
  return out.join(' ')
}
const t9Dec = (text) => String(text).trim().split(/ +/).map((t) => t === '0' ? ' ' : T9_DEC[t] ?? t).join('')

// ---------- 技术编码 ----------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32Enc(text) {
  const bytes = utf8(text)
  let out = '', buf = 0, bits = 0
  for (const b of bytes) {
    buf = ((buf << 8) | b) & 0xffff; bits += 8
    while (bits >= 5) { out += B32[(buf >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits) out += B32[(buf << (5 - bits)) & 31]
  return out + '='.repeat((8 - (out.length % 8)) % 8)
}
function b32Dec(text) {
  const s = String(text).toUpperCase().replace(/[\s=]+/g, '')
  const out = []
  let buf = 0, bits = 0
  for (const c of s) {
    const k = B32.indexOf(c)
    if (k < 0) throw Error('不是合法的 base32')
    buf = ((buf << 5) | k) & 0xffff; bits += 5
    if (bits >= 8) { out.push((buf >>> (bits - 8)) & 255); bits -= 8 }
  }
  return unutf8(new Uint8Array(out))
}

const binEnc = (text) => Array.from(utf8(text), (b) => b.toString(2).padStart(8, '0')).join(' ')
function binDec(text) {
  const s = String(text).replace(/[^01]/g, '')
  if (!s || s.length % 8) throw Error('二进制位数不是 8 的倍数')
  const out = new Uint8Array(s.length / 8)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 8, 8), 2)
  return unutf8(out)
}

const uniEnc = (text) => Array.from(String(text), (c) => {
  let r = ''
  for (let i = 0; i < c.length; i++) r += '\\u' + c.charCodeAt(i).toString(16).padStart(4, '0')
  return r
}).join('')
// 支持 \uXXXX、\u{...}、&#x..;、&#..;
const uniDec = (text) => String(text).replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|&#x([0-9a-f]+);|&#(\d+);/gi, (m, a, b, c, d) =>
  b ? String.fromCharCode(parseInt(b, 16)) : String.fromCodePoint(parseInt(a || c || d, a || c ? 16 : 10)))

// 摩斯：非表内字符用 「-.-.-.-」 引导 + 码点十六进制（每位一个摩斯码）+ 「.-.-.-.」 收尾
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
  ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
}
const MORSE_DEC = Object.fromEntries(Object.entries(MORSE).map(([c, m]) => [m, c]))
const M_OPEN = '-.-.-.-', M_CLOSE = '.-.-.-.'
function morseEnc(text) {
  const words = String(text).split(' ').map((w) => Array.from(w, (ch) => {
    const m = MORSE[ch.toUpperCase()]
    if (m) return m
    const hex = ch.codePointAt(0).toString(16).toUpperCase()
    return [M_OPEN, ...Array.from(hex, (d) => MORSE[d]), M_CLOSE].join(' ')
  }).join(' '))
  return words.join(' / ')
}
function morseDec(text) {
  const toks = String(text).replace(/[·•]/g, '.').replace(/[—–_]/g, '-').trim().split(/\s+/)
  let out = '', hex = null
  for (const t of toks) {
    if (!t) continue
    if (t === '/' || t === '|') { out += ' '; continue }
    if (t === M_OPEN) { hex = ''; continue }
    if (t === M_CLOSE && hex != null) { out += String.fromCodePoint(parseInt(hex || '0', 16)); hex = null; continue }
    const c = MORSE_DEC[t]
    if (c == null) throw Error(`认不出这个摩斯码：${t}`)
    if (hex != null) hex += c
    else out += c
  }
  return out
}

// 字母位移（只动 A-Z a-z，大小写保持）
const shiftCh = (c, n) => {
  const x = c.charCodeAt(0)
  if (x >= 65 && x <= 90) return String.fromCharCode(((x - 65 + n) % 26 + 26) % 26 + 65)
  if (x >= 97 && x <= 122) return String.fromCharCode(((x - 97 + n) % 26 + 26) % 26 + 97)
  return c
}
const caesarKey = (k) => { const n = parseInt(k, 10); return Number.isFinite(n) ? n : 3 }
const caesar = (text, n) => String(text).replace(/[a-z]/gi, (c) => shiftCh(c, n))
const atbash = (text) => String(text).replace(/[a-z]/gi, (c) => {
  const x = c.charCodeAt(0), base = x < 97 ? 65 : 97
  return String.fromCharCode(base + 25 - (x - base))
})

// 栅栏：按码点排，emoji 不会被劈开
const railKey = (k) => Math.max(2, parseInt(k, 10) || 2)
const railRows = (len, rails) => {
  const rows = []
  let r = 0, d = 1
  for (let i = 0; i < len; i++) {
    rows.push(r)
    if (r === 0) d = 1
    else if (r === rails - 1) d = -1
    r += d
  }
  return rows
}
function railEnc(text, key) {
  const cs = Array.from(String(text)), rows = railRows(cs.length, railKey(key))
  const order = cs.map((_, i) => i).sort((a, b) => rows[a] - rows[b] || a - b)
  return order.map((i) => cs[i]).join('')
}
function railDec(text, key) {
  const cs = Array.from(String(text)), rows = railRows(cs.length, railKey(key))
  const order = cs.map((_, i) => i).sort((a, b) => rows[a] - rows[b] || a - b)
  const out = []
  order.forEach((pos, j) => { out[pos] = cs[j] })
  return out.join('')
}

// 维吉尼亚：只有字母推进密钥
function vigenere(text, key, sign) {
  const ks = Array.from(String(key || '').toLowerCase().replace(/[^a-z]/g, ''), (c) => c.charCodeAt(0) - 97)
  if (!ks.length) throw Error('密钥里至少要有一个英文字母')
  let j = 0
  return String(text).replace(/[a-z]/gi, (c) => shiftCh(c, sign * ks[j++ % ks.length]))
}

async function sha256(text) {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text))))
}

// ---------- 更多编码 ----------

// 大数进制转换（Base58 / Base62 共用）
function baseXEnc(bytes, abc) {
  const B = abc.length, digits = []
  for (const b of bytes) {
    let carry = b
    for (let i = 0; i < digits.length; i++) { carry += digits[i] * 256; digits[i] = carry % B; carry = Math.floor(carry / B) }
    while (carry) { digits.push(carry % B); carry = Math.floor(carry / B) }
  }
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  return abc[0].repeat(zeros) + digits.reverse().map((d) => abc[d]).join('')
}
function baseXDec(str, abc, name) {
  const s = String(str).replace(/\s+/g, ''), B = abc.length, bytes = []
  for (const ch of s) {
    let carry = abc.indexOf(ch)
    if (carry < 0) throw Error(`不是合法的 ${name}`)
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * B; bytes[i] = carry & 255; carry >>= 8 }
    while (carry) { bytes.push(carry & 255); carry >>= 8 }
  }
  let zeros = 0
  while (zeros < s.length && s[zeros] === abc[0]) zeros++
  return new Uint8Array([...new Array(zeros).fill(0), ...bytes.reverse()])
}
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Ascii85（Adobe 变体，可带 <~ ~>）
function a85Enc(text) {
  const b = utf8(text)
  let out = ''
  for (let i = 0; i < b.length; i += 4) {
    const n = Math.min(4, b.length - i)
    const v = ((b[i] << 24) | ((b[i + 1] || 0) << 16) | ((b[i + 2] || 0) << 8) | (b[i + 3] || 0)) >>> 0
    if (v === 0 && n === 4) { out += 'z'; continue }
    let chunk = ''
    for (let j = 0, x = v; j < 5; j++) { chunk = String.fromCharCode(33 + (x % 85)) + chunk; x = Math.floor(x / 85) }
    out += chunk.slice(0, n + 1)
  }
  return out
}
function a85Dec(text) {
  const s = String(text).replace(/^\s*<~|~>\s*$/g, '').replace(/\s+/g, '').replace(/z/g, '!!!!!')
  if (/[^!-u]/.test(s)) throw Error('不是合法的 Ascii85')
  const out = []
  for (let i = 0; i < s.length; i += 5) {
    const chunk = s.slice(i, i + 5)
    if (chunk.length === 1) throw Error('Ascii85 长度不对')
    const padded = chunk.padEnd(5, 'u')
    let v = 0
    for (const c of padded) v = v * 85 + c.charCodeAt(0) - 33
    if (v > 0xffffffff) throw Error('不是合法的 Ascii85')
    const bytes = [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]
    out.push(...bytes.slice(0, chunk.length - 1))
  }
  return unutf8(new Uint8Array(out))
}

// 十进制 ASCII / 码点：65 66 67
const decEnc = (text) => Array.from(String(text), (c) => c.codePointAt(0)).join(' ')
function decDec(text) {
  const parts = String(text).trim().split(/[\s,]+/).filter(Boolean)
  if (!parts.length || parts.some((p) => !/^\d{1,7}$/.test(p) || +p > 0x10ffff)) throw Error('要一串用空格隔开的数字')
  return parts.map((p) => String.fromCodePoint(+p)).join('')
}

// HTML 实体：全部转成 &#x..;
const htmlEnc = (text) => Array.from(String(text), (c) => /[a-z0-9 ]/i.test(c) ? c : `&#x${c.codePointAt(0).toString(16)};`).join('')
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const htmlDec = (text) => uniDec(text).replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)

// ---------- 更多古典密码 ----------

// ROT47：可见 ASCII 整体挪 47 位
const rot47 = (text) => String(text).replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)))

// 仿射：E(x) = a*x + b (mod 26)，钥匙写「a,b」
function affineKey(k) {
  const [a = 5, b = 8] = String(k || '').split(/[\s,，]+/).filter(Boolean).map((x) => parseInt(x, 10))
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw Error('钥匙写成「5,8」这样')
  const inv = [...Array(26).keys()].find((x) => ((a % 26 + 26) * x) % 26 === 1)
  if (inv === undefined) throw Error('a 必须和 26 互质（1 3 5 7 9 11 15 17 19 21 23 25）')
  return { a: ((a % 26) + 26) % 26, b: ((b % 26) + 26) % 26, inv }
}
const affineMap = (text, f) => String(text).replace(/[a-z]/gi, (c) => {
  const base = c < 'a' ? 65 : 97
  return String.fromCharCode(base + ((f(c.charCodeAt(0) - base) % 26) + 26) % 26)
})
const affineEnc = (t, k) => { const { a, b } = affineKey(k); return affineMap(t, (x) => a * x + b) }
const affineDec = (t, k) => { const { b, inv } = affineKey(k); return affineMap(t, (y) => inv * (y - b)) }

// 培根：每个字母 5 位 A/B（26 字母版）
const baconEnc = (text) => {
  const s = String(text).toLowerCase().replace(/[^a-z]/g, '')
  if (!s) throw Error('培根密码只认英文字母')
  return Array.from(s, (c) => (c.charCodeAt(0) - 97).toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B')).join(' ')
}
function baconDec(text) {
  const s = String(text).toUpperCase().replace(/[^AB]/g, '')
  if (!s || s.length % 5) throw Error('要 5 个一组的 A/B')
  return s.match(/.{5}/g).map((g) => {
    const n = parseInt(g.replace(/A/g, '0').replace(/B/g, '1'), 2)
    if (n > 25) throw Error('有一组超出了字母表')
    return String.fromCharCode(97 + n)
  }).join('')
}

// 棋盘密码（Polybius 5x5，I/J 合一）：每个字母两位数字
const POLY = 'abcdefghiklmnopqrstuvwxyz'
const polyEnc = (text) => {
  const s = String(text).toLowerCase().replace(/j/g, 'i').replace(/[^a-z]/g, '')
  if (!s) throw Error('棋盘密码只认英文字母')
  return Array.from(s, (c) => { const i = POLY.indexOf(c); return `${(i / 5 | 0) + 1}${i % 5 + 1}` }).join(' ')
}
function polyDec(text) {
  const s = String(text).replace(/\s+/g, '')
  if (!s || s.length % 2 || /[^1-5]/.test(s)) throw Error('要两位一组、每位 1-5 的数字')
  return s.match(/../g).map((p) => POLY[(p[0] - 1) * 5 + (p[1] - 1)]).join('')
}

// 键盘密码：QWERTY 顺序对应 ABC 顺序
const QWERTY = 'qwertyuiopasdfghjklzxcvbnm', ABC = 'abcdefghijklmnopqrstuvwxyz'
const subst = (from, to) => (text) => String(text).replace(/[a-z]/gi, (c) => {
  const i = from.indexOf(c.toLowerCase())
  return c === c.toLowerCase() ? to[i] : to[i].toUpperCase()
})
const qwertyEnc = subst(ABC, QWERTY), qwertyDec = subst(QWERTY, ABC)

// 自动密钥（Autokey）：密钥用完后接着用明文
function autokey(text, key, sign) {
  const ks = Array.from(String(key || '').toLowerCase().replace(/[^a-z]/g, ''), (c) => c.charCodeAt(0) - 97)
  if (!ks.length) throw Error('密钥里至少要有一个英文字母')
  let j = 0
  return String(text).replace(/[a-z]/gi, (c) => {
    const out = shiftCh(c, sign * ks[j++])
    ks.push((sign > 0 ? c : out).toLowerCase().charCodeAt(0) - 97)
    return out
  })
}

// ---------- 带钥匙的字节加密 ----------

// XOR：钥匙循环异或，结果用十六进制
function xorBytes(data, key) {
  const k = utf8(key)
  if (!k.length) throw Error('要填钥匙')
  return data.map((b, i) => b ^ k[i % k.length])
}
const xorEnc = (t, k) => toHex(xorBytes(utf8(t), k))
const xorDec = (t, k) => unutf8(xorBytes(fromHex(t), k))

// RC4：结果用 Base64
function rc4(data, key) {
  const k = utf8(key)
  if (!k.length) throw Error('要填钥匙')
  const s = [...Array(256).keys()]
  for (let i = 0, j = 0; i < 256; i++) { j = (j + s[i] + k[i % k.length]) & 255;[s[i], s[j]] = [s[j], s[i]] }
  const out = new Uint8Array(data.length)
  for (let n = 0, i = 0, j = 0; n < data.length; n++) {
    i = (i + 1) & 255; j = (j + s[i]) & 255;[s[i], s[j]] = [s[j], s[i]]
    out[n] = data[n] ^ s[(s[i] + s[j]) & 255]
  }
  return out
}
const rc4Enc = (t, k) => b64enc(rc4(utf8(t), k))
const rc4Dec = (t, k) => unutf8(rc4(b64dec(t), k))

// ---------- 摘要 ----------

const digest = (alg) => async (text) => toHex(new Uint8Array(await crypto.subtle.digest(alg, utf8(text))))
async function hmac(text, key) {
  if (!key) throw Error('要填钥匙')
  const k = await crypto.subtle.importKey('raw', utf8(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', k, utf8(text))))
}
let CRC_T
function crc32(text) {
  CRC_T ||= Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  let c = 0xffffffff
  for (const b of utf8(text)) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8)
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}
// MD5（WebCrypto 没有，手写一份）
function md5(text) {
  const msg = utf8(text), len = msg.length
  const n = (((len + 8) >> 6) + 1) * 16, w = new Uint32Array(n)
  for (let i = 0; i < len; i++) w[i >> 2] |= msg[i] << ((i % 4) * 8)
  w[len >> 2] |= 0x80 << ((len % 4) * 8)
  w[n - 2] = (len * 8) >>> 0; w[n - 1] = Math.floor(len / 0x20000000)
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  for (let o = 0; o < n; o += 16) {
    let a = a0, b = b0, c = c0, d = d0
    for (let i = 0; i < 64; i++) {
      const r = i >> 4
      let f, g
      if (r === 0) { f = (b & c) | (~b & d); g = i }
      else if (r === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16 }
      else if (r === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16 }
      else { f = c ^ (b | ~d); g = (7 * i) % 16 }
      const t = d; d = c; c = b
      const x = (a + f + K[i] + w[o + g]) >>> 0, s = S[r * 4 + (i % 4)]
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0
      a = t
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0
  }
  return [a0, b0, c0, d0].map((v) => Array.from({ length: 4 }, (_, i) => ((v >>> (i * 8)) & 255).toString(16).padStart(2, '0')).join('')).join('')
}

// ---------- 隐形字（零宽字符）----------

// 每字节 4 个零宽字符（2bit 一个），首尾加标记
const ZW = ['\u200b', '\u200c', '\u200d', '\u2060']
const ZW_MARK = '\ufeff'
function zwspEnc(text, cover) {
  if (!cover) throw Error('要先写一句掩护文本')
  let hid = ZW_MARK
  for (const b of utf8(text)) for (let s = 6; s >= 0; s -= 2) hid += ZW[(b >> s) & 3]
  hid += ZW_MARK
  const gs = graphemes(String(cover))
  return gs[0] + hid + gs.slice(1).join('')
}
function zwspDec(text) {
  const s = String(text)
  const a = s.indexOf(ZW_MARK), b = s.indexOf(ZW_MARK, a + 1)
  const body = a >= 0 && b > a ? s.slice(a + 1, b) : s
  const bits = Array.from(body).map((c) => ZW.indexOf(c)).filter((k) => k >= 0)
  if (!bits.length || bits.length % 4) throw Error('这段话里没藏东西')
  const out = new Uint8Array(bits.length / 4)
  for (let i = 0; i < out.length; i++) out[i] = (bits[i * 4] << 6) | (bits[i * 4 + 1] << 4) | (bits[i * 4 + 2] << 2) | bits[i * 4 + 3]
  return unutf8(out)
}

// ---------- 图片藏字（RGB 最低位）----------

// 头：魔数 'JH'(2) + 标志(1，bit0=加密) + 长度(4，大端) + 载荷
const MAGIC = [0x4a, 0x48]
const HEAD = 7
export const stegoCapacity = (width, height) => Math.max(0, Math.floor((width * height * 3) / 8) - HEAD)

// 只操作像素数组，不依赖 canvas（测试也用它）
function writeBits(px, bytes) {
  let bit = 0
  for (let p = 0; p < px.length; p += 4) px[p + 3] = 255
  for (const b of bytes) {
    for (let s = 7; s >= 0; s--, bit++) {
      const i = Math.floor(bit / 3) * 4 + (bit % 3)
      px[i] = (px[i] & 0xfe) | ((b >> s) & 1)
    }
  }
}
function readBits(px, offset, n) {
  const out = new Uint8Array(n)
  for (let k = 0; k < n * 8; k++) {
    const bit = offset * 8 + k
    const i = Math.floor(bit / 3) * 4 + (bit % 3)
    out[k >> 3] = (out[k >> 3] << 1) | (px[i] & 1)
  }
  return out
}
async function embed(px, width, height, text, password = '') {
  if (!String(text)) throw Error('先写点要藏的话')
  let payload = utf8(text)
  if (password) payload = await aesEncrypt(payload, password)
  if (payload.length > stegoCapacity(width, height)) throw Error('图片太小，装不下这么多字')
  const n = payload.length
  writeBits(px, concat(new Uint8Array([...MAGIC, password ? 1 : 0, n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]), payload))
  return px
}
async function extract(px, width, height, password = '') {
  const cap = stegoCapacity(width, height)
  if (cap <= 0) throw Error('这张图里没有藏东西')
  const head = readBits(px, 0, HEAD)
  const n = ((head[3] << 24) | (head[4] << 16) | (head[5] << 8) | head[6]) >>> 0
  if (head[0] !== MAGIC[0] || head[1] !== MAGIC[1] || head[2] > 1 || n === 0 || n > cap) throw Error('这张图里没有藏东西')
  let payload = readBits(px, HEAD, n)
  if (head[2] & 1) {
    if (!password) throw Error('这张图加了密码，先填密码')
    payload = await aesDecrypt(payload, password)
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(payload) } catch { throw Error('这张图里没有藏东西') }
}
export const _stegoBits = { embed, extract, writeBits, readBits }

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}
// 读像素：关掉色彩管理和预乘，保证最低位不被改
async function loadPixels(blob, bg) {
  let bmp
  try { bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }) } catch { throw Error('这不是能打开的图片') }
  const { width, height } = bmp
  const cv = makeCanvas(width, height)
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height) } // 透明处垫白底
  ctx.drawImage(bmp, 0, 0)
  bmp.close?.()
  return { cv, ctx, width, height, img: ctx.getImageData(0, 0, width, height) }
}
const toPng = (cv) => cv.convertToBlob
  ? cv.convertToBlob({ type: 'image/png' })
  : new Promise((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(Error('导出 PNG 失败'))), 'image/png'))

export async function stegoEncode(imageBlob, text, password = '') {
  const { cv, ctx, width, height, img } = await loadPixels(imageBlob, '#fff')
  await embed(img.data, width, height, text, password)
  ctx.putImageData(img, 0, 0)
  return toPng(cv)
}
export async function stegoDecode(imageBlob, password = '') {
  const { width, height, img } = await loadPixels(imageBlob)
  return extract(img.data, width, height, password)
}

const urlDec = (t) => { try { return decodeURIComponent(String(t).trim()) } catch { throw Error('不是合法的 URL 编码') } }
const aesEnc = async (t, k) => { if (!k) throw Error('要填密码'); return b64enc(await aesEncrypt(utf8(t), k)) }
const aesDec = async (t, k) => { if (!k) throw Error('要填密码'); return unutf8(await aesDecrypt(b64dec(t), k)) }

// ---------- 清单 ----------

export const CIPHER_CATS = [{ id: 'fun', name: '趣味' }, { id: 'code', name: '编码' }, { id: 'classic', name: '古典密码' },
  { id: 'crypto', name: '带钥匙加密' }, { id: 'hash', name: '摘要校验' }, { id: 'meme', name: '藏字' }]

const need = (label, placeholder) => ({ label, placeholder, required: true })
const opt = (label, placeholder) => ({ label, placeholder, required: false })

export const CIPHERS = [
  // 趣味
  { id: 'shou', name: '兽音译者', cat: 'fun', desc: '嗷呜嗷呜~ 把话变成一串兽叫，和网上的兽音译者互通，适合出「听懂这只兽在说啥」。', key: null, enc: shouEnc, dec: shouDec },
  { id: 'fo', name: '与佛论禅', cat: 'fun', desc: '佛曰：一串经文其实是你的话，适合出「参透这段佛经」的禅意题。', key: null, enc: foEnc, dec: foDec },
  { id: 'emoji', name: 'emoji 密码', cat: 'fun', desc: '一排小黄脸就是一句话，表情包大战里偷偷递纸条。', key: null, enc: emojiEnc, dec: emojiDec },
  { id: 'reverse', name: '倒着念', cat: 'fun', desc: '整句倒过来写，最简单的入门题，适合热身。', key: null, enc: reverseText, dec: reverseText },
  { id: 't9', name: '九宫格按键', cat: 'fun', desc: '老诺基亚打字法：21 是 a、0 是空格，只认英文字母，适合怀旧题。', key: null, enc: t9Enc, dec: t9Dec },
  // 编码
  { id: 'base64', name: 'Base64', cat: 'code', desc: '程序员的老朋友，结尾带 = 的就该想到它，适合当套娃第一层。', key: null, enc: (t) => b64enc(utf8(t)), dec: (t) => unutf8(b64dec(t)) },
  { id: 'base32', name: 'Base32', cat: 'code', desc: '全大写字母加 2-7，比 Base64 长一截，适合当第二层套娃。', key: null, enc: b32Enc, dec: b32Dec },
  { id: 'base58', name: 'Base58', cat: 'code', desc: '去掉了 0 O I l 这些易混字符，钱包地址常用。', key: null, enc: (t) => baseXEnc(utf8(t), B58), dec: (t) => unutf8(baseXDec(t, B58, 'Base58')) },
  { id: 'base62', name: 'Base62', cat: 'code', desc: '只有数字和大小写字母，短链接常用。', key: null, enc: (t) => baseXEnc(utf8(t), B62), dec: (t) => unutf8(baseXDec(t, B62, 'Base62')) },
  { id: 'base85', name: 'Ascii85', cat: 'code', desc: '比 Base64 更紧凑，满屏标点符号，PDF 里见得到。', key: null, enc: a85Enc, dec: a85Dec },
  { id: 'hex', name: '十六进制', cat: 'code', desc: '每个字节两位 0-f，一眼就是机器语言，解码时空格随意。', key: null, enc: (t) => toHex(utf8(t)).replace(/(..)(?!$)/g, '$1 '), dec: (t) => unutf8(fromHex(t)) },
  { id: 'binary', name: '二进制', cat: 'code', desc: '满屏 0 和 1，黑客电影既视感，适合吓唬萌新。', key: null, enc: binEnc, dec: binDec },
  { id: 'decimal', name: '十进制码点', cat: 'code', desc: '每个字写成一个数字，如 72 105，英文就是 ASCII 码。', key: null, enc: decEnc, dec: decDec },
  { id: 'url', name: 'URL 编码', cat: 'code', desc: '一堆 %E4%BD%A0，链接里常见，粘进地址栏就现原形。', key: null, enc: (t) => encodeURIComponent(t), dec: urlDec },
  { id: 'unicode', name: 'Unicode 转义', cat: 'code', desc: '\\u4f60\\u597d 这种写法，解码也认 &#x..; 和 &#..;，适合藏在代码里。', key: null, enc: uniEnc, dec: uniDec },
  { id: 'html', name: 'HTML 实体', cat: 'code', desc: '&#x4f60; 和 &amp; 这类网页转义。', key: null, enc: htmlEnc, dec: htmlDec },
  { id: 'morse', name: '摩斯电码', cat: 'code', desc: '嘀嘀嗒嗒，英文数字直接发报，中文按码点也能发，不分大小写。', key: null, enc: morseEnc, dec: morseDec },
  // 古典密码
  { id: 'caesar', name: '凯撒密码', cat: 'classic', desc: '每个字母往后挪几位，最古老的加密，适合配「挪了几步」的提示。', key: opt('位移', '默认 3'), enc: (t, k) => caesar(t, caesarKey(k)), dec: (t, k) => caesar(t, -caesarKey(k)) },
  { id: 'rot13', name: 'ROT13', cat: 'classic', desc: '凯撒挪 13 位，再挪一次就回来了，论坛防剧透神器。', key: null, enc: (t) => caesar(t, 13), dec: (t) => caesar(t, 13) },
  { id: 'rot47', name: 'ROT47', cat: 'classic', desc: '连数字和符号一起挪，再挪一次就回来了。', key: null, enc: rot47, dec: rot47 },
  { id: 'atbash', name: '埃特巴什', cat: 'classic', desc: 'a 换 z、b 换 y，字母表对折，加密解密是同一招。', key: null, enc: atbash, dec: atbash },
  { id: 'affine', name: '仿射密码', cat: 'classic', desc: '字母先乘再加：a×x+b，钥匙写成「5,8」。', key: opt('钥匙 a,b', '默认 5,8'), enc: affineEnc, dec: affineDec },
  { id: 'bacon', name: '培根密码', cat: 'classic', desc: '每个字母变成 5 个 A/B，只认英文字母。', key: null, enc: baconEnc, dec: baconDec },
  { id: 'polybius', name: '棋盘密码', cat: 'classic', desc: '5×5 方阵，每个字母变成行列两位数，I 和 J 同格。', key: null, enc: polyEnc, dec: polyDec },
  { id: 'qwerty', name: '键盘密码', cat: 'classic', desc: '按键盘 QWERTY 顺序替换字母：a→q、b→w。', key: null, enc: qwertyEnc, dec: qwertyDec },
  { id: 'rail', name: '栅栏密码', cat: 'classic', desc: '把字按 Z 字形排成几栏再横着读，字都在只是乱了序，适合考眼力。', key: opt('栏数', '默认 2'), enc: railEnc, dec: railDec },
  { id: 'vigenere', name: '维吉尼亚', cat: 'classic', desc: '用一个英文单词当钥匙轮流挪字母，适合配一道猜钥匙的谜语。', key: need('密钥', '英文单词，如 linuxdo'), enc: (t, k) => vigenere(t, k, 1), dec: (t, k) => vigenere(t, k, -1) },
  { id: 'autokey', name: '自动密钥', cat: 'classic', desc: '维吉尼亚的加强版，钥匙用完接着用明文本身。', key: need('密钥', '英文单词'), enc: (t, k) => autokey(t, k, 1), dec: (t, k) => autokey(t, k, -1) },
  // 带钥匙加密
  { id: 'aes', name: 'AES 加密', cat: 'crypto', desc: '正经的强加密，没密码神仙也解不开，适合「密码藏在别处」的连环题。', key: need('密码', '解密时要填一样的'), enc: aesEnc, dec: aesDec },
  { id: 'rc4', name: 'RC4', cat: 'crypto', desc: '老牌流密码，结果是 Base64。只适合出题，别拿来保密。', key: need('钥匙', '解密时要填一样的'), enc: rc4Enc, dec: rc4Dec },
  { id: 'xor', name: 'XOR 异或', cat: 'crypto', desc: '每个字节和钥匙异或，结果是十六进制，再异或一次就回来。', key: need('钥匙', '任意文字'), enc: xorEnc, dec: xorDec },
  // 摘要校验（只能算，不能还原）
  { id: 'md5', name: 'MD5', cat: 'hash', desc: '32 位十六进制指纹，只能算不能还原。', key: null, enc: md5, dec: null },
  { id: 'sha1', name: 'SHA-1', cat: 'hash', desc: '40 位十六进制指纹，只能算不能还原。', key: null, enc: digest('SHA-1'), dec: null },
  { id: 'sha256', name: 'SHA-256', cat: 'hash', desc: '只能算不能还原，适合出「猜中原文就对得上」的验证题。', key: null, enc: sha256, dec: null },
  { id: 'sha512', name: 'SHA-512', cat: 'hash', desc: '128 位十六进制指纹，只能算不能还原。', key: null, enc: digest('SHA-512'), dec: null },
  { id: 'hmac', name: 'HMAC-SHA256', cat: 'hash', desc: '带钥匙的指纹，钥匙不同结果就不同。', key: need('钥匙', '任意文字'), enc: hmac, dec: null },
  { id: 'crc32', name: 'CRC32', cat: 'hash', desc: '8 位校验码，文件校验常用。', key: null, enc: crc32, dec: null },
  // 梗图
  { id: 'stego', name: '图片藏字', cat: 'meme', desc: '把一句话藏进梗图像素里，看起来和原图一样', image: true, key: { label: '密码（可选）', placeholder: '不填就不加密', required: false }, enc: null, dec: null },
  { id: 'zwsp', name: '隐形字', cat: 'meme', desc: '把秘密塞进一句普通的话里，肉眼只看到掩护文本，适合「这句话不简单」的题。', key: need('掩护文本', '大家看到的那句话'), enc: zwspEnc, dec: zwspDec },
]

export const cipherById = (id) => CIPHERS.find((c) => c.id === id) || null
