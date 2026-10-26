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
        const enabled = titles.get(r.title)?.enabled !== false
        const active = enabled && r.status === 'open' && r.closes_at > Date.now() / 1000
        const mutate = async (path, method, bodyData) => {
          if (busy) return; busy = true
          try { await api(path, { method, ...(bodyData ? { body: bodyData } : {}) }); changed(); await load() }
          catch (e) { const note = row.querySelector('.tr-error'); note.textContent = e.message || '操作失败' }
          finally { busy = false }
        }
        const row = h('article', { class: 'tr-card tr-' + r.title },
          h('div', { class: 'tr-row' }, h('strong', { class: 'tr-name' }, name), h('span', { class:'tr-rarity' },titles.get(r.title)?.rarity==='SSR'?'SSR':'普通'),h('span', { class: 'tr-status' }, !enabled && r.status === 'open' ? '已暂停' : STATE[r.status] || r.status)),
          h('div', { class: 'tr-meta' },
            r.packet_id ? '红包限定 · 报名开奖' : r.entry_mode === 'all' ? '最近 24 小时活跃群友参与' : `${r.entries} 人已报名`,
            ' · ', new Date(r.closes_at * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })),
          r.paid_version===1 && h('p',{class:'tr-meta'},`每人独立开奖 · 基础5% · 每追加100 D币 +1个百分点 · 最高25%${r.joined?'。你已付 '+r.my_paid+' D币，中奖率 '+(5+r.my_boosts)+'%。':''}`),
          r.paid_version===1 && h('p',{class:'tr-meta'},'报名后不支持退出，未中奖不退款；整场取消或开奖时资格失效，全额退回。重复中奖使称号升一级，鲸伴最高20级。'),
          r.paid_version===1 && (r.status==='drawn'||r.status==='cancelled') && h('div',{class:'tr-winner'},r.status==='cancelled'?'已取消，报名与追加费用已退回':`${r.winner_count} 人中奖 · ${r.my_result===1?'你已中奖，可到装扮佩戴':r.my_result===2?'参与资格失效，费用已退回':r.my_result===0?'本次未中奖':'你未参与'}`),
          r.paid_version!==1 && r.status === 'drawn' && h('div', { class: 'tr-winner' }, '✦ ', r.winner_name || r.winner_username || '群友', ' 获得称号', r.level > 1 && ` · Lv${r.level}`,h('small',null,' · 可在「我的 → 装扮」自行佩戴')),
          h('div', { class: 'tr-actions' },
            active && r.entry_mode === 'optin' && r.paid_version!==1 && h('button', { type: 'button', class: 'tr-action primary', onclick: () => mutate(BASE + '/' + r.id + '/join', r.joined ? 'DELETE' : 'POST') }, r.joined ? '已报名 · 退出' : '报名抽取'),
            active && data.can_create && h('button', { type: 'button', class: 'tr-action primary', onclick: () => mutate(BASE + '/' + r.id + '/draw', 'POST') }, '立即开奖'),
            active && data.can_create && h('button', { type: 'button', class: 'tr-action', onclick: () => mutate(BASE + '/' + r.id + '/cancel', 'POST') }, '取消抽奖')),
          h('span', { class: 'tr-error', role: 'alert' }))
        const records=h('div'),details=h('details',null,h('summary',null,'参与明细 · 投入与开奖结果'),records)
        let recordsLoaded=false
        const loadRecords=async(before=null)=>{records.textContent='正在读取…';try{const d=await api(BASE+'/'+r.id+'/participants'+(before?'?before='+before:''));records.replaceChildren(...d.participants.map(x=>h('div',{class:'tr-participant'},h('strong',null,x.name||x.username||'已注销用户'),h('span',null,x.paid+' D币'),h('span',null,x.result===1?'中奖':x.result===0?'未中奖':x.result===2?(x.refunded?'已退款':'已取消'):'待开奖'))),d.next?h('button',{class:'tr-action',onclick:()=>loadRecords(d.next)},'下一页'):h('span'),before?h('button',{class:'tr-action',onclick:()=>loadRecords()},'返回最新'):h('span'));recordsLoaded=true}catch(e){records.replaceChildren(h('p',{class:'tr-error'},e.message),h('button',{class:'tr-action',onclick:()=>loadRecords(before)},'重试'))}}
        details.ontoggle=()=>{if(details.open&&!recordsLoaded)loadRecords()};row.append(details)
        return row
      })
      const controls = h('div', { class: 'tr-controls' },
        !packetId && !raffleId && h('button', { type: 'button', class: 'tr-action', 'aria-pressed': String(history), onclick: () => { history = !history; before = null; load() } }, history ? '只看今天' : '查看历史'),
        before && h('button', { type: 'button', class: 'tr-action', onclick: () => { before = null; load() } }, '返回最新'),
        data.next && h('button', { type: 'button', class: 'tr-action', onclick: () => { before = data.next; load() } }, '更早抽奖'),
        h('button', { type: 'button', class: 'tr-action', onclick: load }, '刷新'))
      const create = h('p',{class:'tr-info'},'旧场次保留原结算与退款规则；新参与请使用独立「抽卡」。')
      body.replaceChildren(controls, create || '', rows.length ? h('div', { class: 'tr-list' }, rows) : h('p', { class: 'tr-empty' }, packetId ? '这个红包还没有称号抽奖' : '今天还没有称号抽奖'))
    } catch (e) { body.replaceChildren(h('p', { class: 'tr-error', role: 'alert' }, e.message || '加载失败'), h('button', { class: 'tr-action', onclick: load }, '重试')) }
  }
  load()
}

