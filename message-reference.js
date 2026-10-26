// 复用现有消息更新事件，只更新同一会话里的引用，不增加请求或持久缓存。
export function refreshMessageReference(message, source, kind = 'chat') {
  const ref = message.reply_to
  if (message.deleted || !ref || ref.id !== source.id) return message
  const scope = kind === 'dm' ? 'thread_id' : 'group_id'
  if (message[scope] == null || message[scope] !== source[scope]) return message
  let next
  if (kind === 'dm') {
    next = { ...ref, body: source.deleted ? '消息已撤回' : source.body || '[附件]' }
  } else {
    const first = source.media?.[0], file = first?.k === 'f' ? first : null
    const thumb = !source.deleted && !file ? source.image || first?.u || null : null
    let text = (source.body || '').replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/g, '').replace(/\n{3,}/g, '\n\n').trim()
    if (text.length > 600) text = text.slice(0, 600) + '…'
    next = { ...ref, deleted: !!source.deleted, text: source.deleted ? '' : text,
      image: !!thumb, thumb, file: !source.deleted && file ? file.n ?? '文件' : null }
  }
  return Object.keys(next).every(key => next[key] === ref[key]) ? message : { ...message, reply_to: next }
}
