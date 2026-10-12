// 按需加载。结果只进入当前群面板内存；模型文本永不作为 HTML 渲染。
export async function readAiStream(response, { onText = () => {}, onMeta = () => {} }) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `请求失败（${response.status}）`)
  }
  if (!response.body) throw new Error('响应中断，请重试')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = '', event = '', data = [], done = false, size = 0
  const dispatch = () => {
    if (!data.length) { event = ''; return }
    const raw = data.join('\n'); data = []
    if (raw === '[DONE]') { done = true; return }
    let value
    try { value = JSON.parse(raw) } catch { throw new Error('响应格式不正确，请重试') }
    if (event === 'meta') onMeta(value)
    else {
      if (value.error) throw new Error('生成中断，请重试')
      const text = value.choices?.[0]?.delta?.content
      if (typeof text === 'string') { size += text.length; if (size > 20000) throw new Error('回复太长，已停止'); onText(text) }
    }
    event = ''
  }
  try {
    while (!done) {
      const part = await reader.read()
      if (part.done) throw new Error('响应中断，请重试')
      buffer += decoder.decode(part.value, { stream: true })
      if (buffer.length > 2 * 1024 * 1024) throw new Error('响应太长，已停止')
      let end
      while (!done && (end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, ''); buffer = buffer.slice(end + 1)
        if (!line) dispatch()
        else if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export function createAiChat({ pane, gid, h, icon, api }) {
  let box, opener, controller, generation = 0, destroyed = false, mode = 'summary'
  let history = [], summary = '', config = null
  const close = () => { generation++; controller?.abort(); controller = null; box?.remove(); box = null; if (opener?.isConnected) opener.focus() }
  const destroy = () => { destroyed = true; close(); history = []; summary = '' }
  const open = async (anchor, initialMode = 'summary', initialRange = '200') => {
    close(); if (destroyed) return
    opener = anchor; mode = initialMode; config = null
    const myOpen = generation
    const status = h('p', { class: 'cm-ai-status', role: 'status', 'aria-live': 'polite' }, '正在读取设置…')
    const output = h('div', { class: 'cm-ai-output', tabindex: '0', 'aria-label': 'AI 回复' })
    const range = h('select', { 'aria-label': '摘要范围' }, ...[['50','最近 50 条'],['200','最近 200 条'],['500','最近 500 条'],['away','我离开后']].map(([value,label])=>h('option',{value},label)))
    range.value = initialRange
    const context = h('select', { 'aria-label': '对话背景' }, h('option', { value: 'none' }, '不带群记录'), h('option', { value: 'recent' }, '带最近 50 条'))
    const input = h('textarea', { class: 'cm-ai-input', rows: '2', maxlength: '1000', placeholder: '想聊点什么？', 'aria-label': '给 AI 的消息' })
    const start = h('button', { class: 'btn btn-primary sm', type: 'button', disabled: true, onclick: () => run() }, '生成摘要')
    const stop = h('button', { class: 'btn btn-ghost sm', type: 'button', hidden: true, onclick: () => controller?.abort() }, '停止')
    const fresh = h('button', { class: 'btn-text sm', type: 'button', onclick: () => { history = []; output.replaceChildren(); status.textContent = '新话题，开始吧'; input.focus() } }, '新话题')
    const copy = h('button', { class: 'btn-text sm', type: 'button', disabled: true, onclick: async () => {
      try { await pane.ownerDocument.defaultView.navigator.clipboard.writeText(output.innerText); status.textContent = '已复制' } catch { status.textContent = '复制失败，可选中文字复制' }
    } }, '复制')
    const summaryTab = h('button', { class: 'notif-tab', type: 'button', onclick: () => switchMode('summary') }, '群摘要')
    const assistantTab = h('button', { class: 'notif-tab', type: 'button', onclick: () => switchMode('assistant') }, '聊一会')
    const controls = h('div', { class: 'cm-ai-controls' }, range, context, fresh, copy)
    const footer = h('div', { class: 'cm-ai-footer' }, input, h('div', { class: 'cm-ai-actions' }, status, stop, start))
    const view = box = h('section', { class: 'cm-ai', 'aria-label': 'AI 小伙伴' },
      h('div', { class: 'cms-head' }, icon('smile', 'i'), h('strong', null, 'AI 小伙伴'), h('span', { class: 'grow' }),
        h('button', { class: 'cm-x', type: 'button', 'aria-label': '关闭 AI 小伙伴', onclick: close }, icon('close', 'i tiny'))),
      h('div', { class: 'notif-tabs' }, summaryTab, assistantTab), controls, output, footer)
    const valid = () => box === view && generation === myOpen && !destroyed
    const render = () => {
      output.replaceChildren()
      if (mode === 'summary') output.textContent = summary
      else for (const message of history) output.append(h('div', { class: 'cm-ai-line ' + message.role }, h('strong', null, message.role === 'user' ? '你' : 'AI'), h('p', null, message.content)))
      copy.disabled = !output.textContent
    }
    const available = () => !!config?.[mode]
    const sync = () => {
      const busy = !!controller
      start.disabled = busy || !available(); stop.hidden = !busy
      fresh.disabled = range.disabled = context.disabled = input.disabled = summaryTab.disabled = assistantTab.disabled = busy
      start.textContent = mode === 'summary' ? '生成摘要' : '发送'
      summaryTab.classList.toggle('on', mode === 'summary'); assistantTab.classList.toggle('on', mode === 'assistant')
      summaryTab.setAttribute('aria-pressed', String(mode === 'summary')); assistantTab.setAttribute('aria-pressed', String(mode === 'assistant'))
      range.hidden = mode !== 'summary'; context.hidden = input.hidden = fresh.hidden = mode !== 'assistant'
    }
    function switchMode(next) {
      if (controller) return
      mode = next; render(); sync(); status.textContent = available() ? '仅你可见' : '此功能暂未开放'
      if (next === 'assistant') input.focus()
    }
    async function run() {
      if (controller || !available()) return
      const question = input.value.trim()
      if (mode === 'assistant' && (!question || Array.from(question).length > 1000)) { status.textContent = '请输入 1～1000 字'; input.focus(); return }
      if (mode === 'assistant' && history.length >= 20) { status.textContent = '这个话题有点长了，开个新话题吧'; return }
      const requestHistory = [...history, { role: 'user', content: question }]
      controller = new AbortController(); const activeController = controller
      sync(); status.textContent = '正在生成…'; status.setAttribute('role', 'status')
      let text = '', meta = null, answer
      if (mode === 'summary') { summary = ''; output.replaceChildren(); answer = output }
      else { render(); output.append(h('div', { class: 'cm-ai-line user' }, h('strong', null, '你'), h('p', null, question))); answer = h('p'); output.append(h('div', { class: 'cm-ai-line assistant' }, h('strong', null, 'AI'), answer)) }
      copy.disabled = true
      try {
        const body = mode === 'summary' ? { mode: range.value === 'away' ? 'away' : 'recent', n: range.value === 'away' ? 500 : Number(range.value) } : { gid, ctx: context.value, messages: requestHistory }
        const response = await fetch(mode === 'summary' ? `/api/ai/chat/${gid}/summary` : '/api/ai/assistant', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: activeController.signal })
        await readAiStream(response, { onMeta: value => { meta = value }, onText: part => { if (!valid()) return; text += part; answer.textContent = text; output.scrollTop = output.scrollHeight } })
        if (!valid()) return
        if (!text.trim()) throw new Error('没有生成内容，请重试')
        if (mode === 'summary') summary = text
        else { history = [...requestHistory, { role: 'assistant', content: Array.from(text).slice(0, 1000).join('') }]; input.value = '' }
        status.textContent = `${meta?.count ? `参考 ${meta.count} 条消息 · ` : ''}仅你可见${Number.isFinite(meta?.quota_left) ? ` · 今日还可用 ${meta.quota_left} 次` : ''}`
      } catch (error) {
        if (!valid()) return
        status.textContent = activeController.signal.aborted ? '已停止，未完成的回复不加入对话' : error.message
        status.setAttribute('role', activeController.signal.aborted ? 'status' : 'alert')
      } finally { if (valid()) { controller = null; sync(); copy.disabled = !text; if (mode === 'assistant') input.focus() } }
    }
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); run() } })
    view.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close() } })
    pane.append(view); render(); sync(); view.querySelector('.cm-x').focus()
    try { config = await api('/ai/config'); if (valid()) { sync(); status.textContent = available() ? '仅你可见' : '此功能暂未开放' } }
    catch (error) { if (valid()) { status.textContent = error.message; status.setAttribute('role','alert') } }
  }
  return { open, destroy }
}
