// 按需加载；无轮询、常驻监听或浏览器端凭据存储。
const labels={fixed:'普通红包',random:'拼手气',guess:'欢欢猜词',clues:'逐步线索'}
const states={reserved:'奖励已锁定，等待发放',sent:'正在发放，请稍后核对',accepted:'平台已受理，到账以 Credit 为准',unknown:'结果待核对，不会重复发放',rejected:'发放失败，名额保留待发包者核对'}
const verdicts={yes:'是',no:'不是',unknown:'无法判断，换个是非问题',unavailable:'欢欢暂不可用，仍可直接猜答案',pending:'回答处理中，请稍后刷新'}
export function nativeCreateForm({h,api,group,host,signal,uploadCover,onSent,onBack,onBusy,accountOnly=false}){
 const doc=host.ownerDocument,field=(name,node,help)=>h('label',{class:'rpk-field'},h('span',null,name),node,help&&h('small',null,help)),input=(name,extra={})=>h('input',{class:'rpk-input','aria-label':name,...extra}),button=(name,fn)=>h('button',{type:'button',class:'rpk-secondary',onclick:fn},name)
 const info=h('p',{class:'rpk-status',role:'status'}),bindingInfo=h('p',{class:'rpk-help',role:'status'},'正在读取绑定状态…')
 const client=input('Client ID',{autocomplete:'off'}),secret=input('Client Secret',{type:'password',autocomplete:'new-password'}),own=h('input',{type:'checkbox','aria-label':'确认本人应用并授权按红包规则分发'})
 let account=null,busy=false,cover=null,nonce=crypto.randomUUID()
 const save=button('验证并保存绑定',async()=>{if(busy)return;lock(true);try{await api('/me/ldc',{method:'POST',body:{client_id:client.value.trim(),client_secret:secret.value,own_application:own.checked}});secret.value='';client.value='';own.checked=false;await loadAccount();binding.open=false;info.textContent='应用已绑定，可以创建红包。'}catch(e){info.textContent=e.message}finally{lock(false)}})
 const disable=button('停用本站发包',async()=>{if(busy)return;lock(true);try{await api('/me/ldc/disable',{method:'POST',body:{}});await loadAccount();info.textContent='已停止新领取；已开始提交的平台请求仍可能完成。奖励与原单保留，可从发放记录核对。'}catch(e){info.textContent=e.message}finally{lock(false)}})
 const binding=h('details',{class:'rpk-options'},h('summary',null,'绑定 / 管理本人 LDC 应用'),field('Client ID',client),field('Client Secret',secret),h('p',{class:'rpk-help'},'密钥经加密保存在本站服务端，不回显、不保存在浏览器。平台可核验凭据有效，但不提供应用所属身份核验；请只绑定自己的应用。'),h('label',{class:'rpk-help'},own,'这是本人应用，同意按我创建的红包规则分发 LDC。'),h('div',{class:'rpk-actions'},save,disable),h('a',{href:'https://credit.linux.do',target:'_blank',rel:'noopener noreferrer'},'前往 Credit 管理应用'))
 const mode=h('select',{class:'rpk-input','aria-label':'站内LDC玩法'},Object.entries(labels).map(([v,label])=>h('option',{value:v},label)))
 const amount=input('本站LDC总额',{inputmode:'decimal',placeholder:'0.01–2000',required:true}),count=input('本站LDC份数',{type:'number',min:1,max:100,value:1}),minutes=input('本站LDC有效分钟',{type:'number',min:1,max:1440,value:1440})
 const answers=h('textarea',{class:'rpk-input','aria-label':'猜词答案及同义答案',rows:2,maxlength:400,placeholder:'每行一个，最多6个；不会发到群里'}),hints=h('textarea',{class:'rpk-input','aria-label':'猜词线索',rows:2,maxlength:1000,placeholder:'可不填；逐步线索每分钟显示下一条，每行一条'})
 const wish=input('本站LDC祝福语',{maxlength:120,placeholder:'写一句祝福或游戏介绍'}),answerField=field('答案 / 同义答案',answers),hintField=field('提示',hints),countField=field('份数',count)
 const coverPreview=h('div',{class:'rpk-cover-preview'}),file=input('本站LDC封面',{type:'file',class:'sr-only',accept:'image/png,image/jpeg,image/webp,image/gif'})
 const pick=button('选择图片并裁剪封面',()=>file.click())
 const submit=h('button',{class:'rpk-primary',type:'submit'},'发到群里')
 const form=h('form',{class:'rpk-form',onsubmit:async e=>{e.preventDefault();if(busy||accountOnly)return;if(!account?.enabled){info.textContent='请先绑定并启用自己的 LDC 应用';binding.open=true;return}lock(true);info.textContent='正在创建红包…';try{const d=await api(`/chat/groups/${group.id}/redpacks`,{method:'POST',body:{provider:'ldc',nonce,mode:mode.value,amount:amount.value.trim(),count:Number(count.value),minutes:Number(minutes.value),answers:answers.value,hints:hints.value,prompt:wish.value,cover_key:cover?.key||null}});onSent(d.message)}catch(e){info.textContent=e.message}finally{lock(false)}}},
  h('h3',null,'本站 LDC 红包'),bindingInfo,binding,nativeLedger({h,api}),field('玩法',mode),field('总额 · LDC',amount),countField,answerField,hintField,field('有效期 · 分钟',minutes),field('祝福 / 介绍',wish),file,pick,coverPreview,
  h('p',{class:'rpk-help'},'按实际领取从应用账户扣分，整包不预扣托管。请保留足够余额；手续费、限额和实际到账时间以 Credit 为准。红包发出后不能编辑或撤回。猜词只有一份，最先成功锁定正确答案的人中奖；答案会交给本站配置的 AI 判断问题，提问和回答在红包内公开。'),info,submit,button('返回其他红包方式',onBack))
 function lock(value){busy=value;onBusy?.(value);for(const el of form.querySelectorAll('button,input,textarea,select'))el.disabled=value}
 function modeChange(){const game=['guess','clues'].includes(mode.value);answerField.hidden=hintField.hidden=!game;countField.hidden=game;answers.required=game;hints.required=mode.value==='clues'}
 mode.addEventListener('change',modeChange);modeChange()
 file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||busy)return;lock(true);try{const {cropPacketCover}=await import('/redpacket-cover.js?v=910a70bc');const cropped=await cropPacketCover(f,{host,form,doc,h,signal});if(!cropped||signal.aborted)return;cover=await uploadCover(cropped,signal);coverPreview.replaceChildren(h('img',{class:'rpk-cover',src:cover.url,alt:'红包封面'}),button('移除封面',()=>{cover=null;coverPreview.replaceChildren()}))}catch(e){info.textContent=e.message}finally{lock(false);file.value=''}})
 async function loadAccount(){account=await api('/me/ldc');bindingInfo.textContent=!account.configured?'站内LDC尚未开启':account.bound?`已绑定 ${account.client_mask} · ${account.enabled?'可发包':'已停用'}`:'首次使用请绑定自己的 Credit 应用';disable.hidden=!account.bound;binding.open=!account.bound}
 loadAccount().catch(e=>{bindingInfo.textContent=e.message})
 if(accountOnly)form.replaceChildren(bindingInfo,binding,nativeLedger({h,api}),info,button('关闭',onBack))
 return form
}
export function nativePacketDetail({h,api,messageId,packet,host,onRefresh,onBusy}){
 const p=packet.ldc,game=['guess','clues'].includes(p.mode),info=h('p',{class:'rpk-status',role:'status'}),field=(name,node)=>h('label',{class:'rpk-field'},h('span',null,name),node),btn=(text,fn)=>h('button',{type:'button',class:'rpk-secondary',onclick:fn},text)
 let busy=false
 const run=async(path,body)=>{if(busy)return;busy=true;onBusy?.(true);for(const el of box.querySelectorAll('button,input'))el.disabled=true;info.textContent='正在处理…';try{const r=await api(`/chat/messages/${messageId}/ldc/${path}`,{method:'POST',body});onRefresh({...packet,ldc:r.ldc})}catch(e){info.textContent=e.message}finally{busy=false;onBusy?.(false);for(const el of box.querySelectorAll('button,input'))el.disabled=false}}
 const answer=h('input',{class:'rpk-input','aria-label':'我的猜词答案',maxlength:80,autocomplete:'off',placeholder:'输入完整答案，最多40字'}),question=h('input',{class:'rpk-input','aria-label':'问欢欢一个是非问题',maxlength:160,placeholder:'例如：它是动物吗？',autocomplete:'off'})
 const guess=h('form',{class:'rpk-form',onsubmit:e=>{e.preventDefault();run('claim',{answer:answer.value})}},game&&field('我的答案',answer),h('button',{class:'rpk-primary',type:'submit'},game?'提交答案，抢首位奖励':'领取 LDC'))
 const ask=h('form',{class:'rpk-form',onsubmit:e=>{e.preventDefault();if(!question.value.trim())return;run('ask',{question:question.value,nonce:crypto.randomUUID()})}},field('问欢欢 · 是 / 不是',question),h('p',{class:'rpk-help'},'提问和回答会在红包内公开。'),h('button',{class:'rpk-secondary',type:'submit'},'向欢欢提问'))
 const box=h('div',{class:'rpk-form'},packet.cover&&h('img',{class:'rpk-cover',src:packet.cover,alt:'红包封面'}),h('h3',null,labels[p.mode]+' · '+p.total+' LDC'),packet.prompt&&h('p',null,packet.prompt),h('p',{class:'rpk-help'},`已锁定 ${p.claimed_count} / ${p.count} 份 · ${p.state==='open'?'进行中':'已结束'} · 截止 ${new Date(p.ends_at*1000).toLocaleString('zh-CN')}`),
  game&&h('p',{class:'rpk-help'},'群内发送“猜：答案”即可答题并自动领奖；“问：它是动物吗？”或“@欢欢 它是动物吗？”可提问。默认最近进行中的猜词红包，回复某个红包可指定。'),
  p.hints.length>0&&h('ul',{class:'rpk-native-hints'},p.hints.map(x=>h('li',null,x))),p.mode==='clues'&&h('p',{class:'rpk-help'},'每分钟解锁一条新线索，点击刷新查看。'),
  p.mine&&h('p',{class:'rpk-status'},`你的奖励：${p.mine.amount} LDC · ${states[p.mine.state]||'待核对'}`),
  !p.owner&&!p.mine&&p.state==='open'&&p.claimed_count<p.count&&guess,
  game&&!p.owner&&p.state==='open'&&p.claimed_count===0&&ask,
  p.questions.length>0&&h('details',{class:'rpk-roster',open:true},h('summary',null,'最近的提问'),p.questions.map(q=>h('p',null,`${q.username}：${q.question} → 欢欢：${verdicts[q.verdict]||'待核对'}`))),
  p.recipients.length>0&&h('details',{class:'rpk-roster',open:true},h('summary',null,'领取 / 中奖记录'),p.recipients.map(r=>h('p',null,`${r.name} · ${r.amount} LDC · ${states[r.state]||'待核对'}`))),info,
  h('div',{class:'rpk-actions'},btn('刷新状态 / 线索',async()=>{if(busy)return;try{const d=await api(`/chat/messages/${messageId}/redpack`);if(host.isConnected)onRefresh(d.packet)}catch(e){info.textContent=e.message}}),
   (p.mine||p.owner)&&btn('核对发放结果',()=>run('reconcile',{})),p.owner&&p.recipients.some(r=>r.state==='rejected')&&btn('重试失败发放（沿用原单）',()=>run('reconcile',{retry:true})),p.owner&&p.state==='open'&&btn('关闭未领取名额',()=>run('close',{}))),
  h('p',{class:'rpk-help'},'平台已受理与实际到账不同；手续费及到账时间以 Credit 为准。网络结果未知时只查询原单，不另发一笔。'))
 return box
}
function nativeLedger({h,api}){
 const list=h('div'),info=h('p',{class:'rpk-help',role:'status'}),more=h('button',{type:'button',class:'rpk-secondary'},'加载发放 / 领取记录')
 const box=h('details',{class:'rpk-options'},h('summary',null,'我的发放 / 领取记录'),h('p',{class:'rpk-help'},'这里只显示与你有关的奖励。未确认的发放只查询原订单；只有发包者能重试明确失败的原单。'),list,info,more)
 let cursor=null,busy=false
 more.onclick=async()=>{if(busy)return;busy=true;more.disabled=true;try{const d=await api('/me/ldc/awards'+(cursor?'?before='+cursor:''));for(const r of d.items){const state=h('p',null,`${r.owner?'发给 '+r.recipient:'我领取'} · ${r.amount} LDC · ${states[r.state]||'待核对'}`),check=h('button',{type:'button',class:'rpk-secondary'},r.owner&&r.state==='rejected'?'重试失败原单':'核对原单');check.onclick=async()=>{if(check.disabled)return;check.disabled=true;try{const v=await api('/me/ldc/awards/'+r.id+'/reconcile',{method:'POST',body:{retry:r.owner&&r.state==='rejected'}});r.state=v.state;state.textContent=`${r.owner?'发给 '+r.recipient:'我领取'} · ${r.amount} LDC · ${states[v.state]||'待核对'}`;check.textContent=r.owner&&r.state==='rejected'?'重试失败原单':'核对原单';check.hidden=v.state==='accepted'}catch(e){info.textContent=e.message}finally{check.disabled=false}};check.hidden=r.state==='accepted';list.append(h('div',null,state,check))}cursor=d.next;more.hidden=!cursor;more.textContent='更多记录';info.textContent=list.children.length?'':'暂无发放或领取记录'}catch(e){info.textContent=e.message}finally{busy=false;more.disabled=false}}
 return box
}
