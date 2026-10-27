import {nativeCreateForm} from '/redpacket-native.js?v=c8639d55'
import {packetFundingPanel} from '/packet-funding.js?v=c8639d55'
import {dcoinIcon} from '/dcoin.js?v=c8639d55'

export function createPacketComposer(options){
 const {h,api,group,userId,host,signal,uploadCover,onSent,onBusy,autoGuess,preview,makeClue,uploadClue}=options
 const doc=host.ownerDocument,button=(text,fn)=>h('button',{type:'button',class:'rpk-secondary',onclick:fn},text)
 let busy=false,play=autoGuess?'guess':'ordinary',currency='ldc'
 const plays=[['ordinary','普通'],['guess','猜词'],['phrase','复读'],['image','识图'],['draw','抽奖']],cache=new Map(),slot=h('div',{class:'rpk-composer-slot'}),footer=h('div',{class:'rpk-composer-actions'})
 const tabs=plays.map(([key,label])=>button(label,()=>{if(!busy){play=key;show()}}))
 const currencies=[button('LDC',()=>switchCurrency('ldc')),button([dcoinIcon(h),' D币'],()=>switchCurrency('coin'))]
 currencies[1].setAttribute('aria-label','D币红包')
 const funding=packetFundingPanel({h,api,signal,onBusy:lock,onChange:provider=>{currency=provider==='coin52'?'coin':'ldc';currencies.forEach((b,i)=>b.setAttribute('aria-pressed',String(currency===(i?'coin':'ldc'))));cache.get(play)?.setFunding?.(provider)}})
 const rewardBar=h('div',{class:'rpk-currency'},h('strong',null,'奖励'),h('div',{class:'rpk-platforms',role:'group','aria-label':'奖励币种'},...currencies))
 const scroll=h('div',{class:'rpk-composer-scroll'},rewardBar,funding.line,slot,funding.element)
 const element=h('div',{class:'rpk-composer'},h('div',{class:'rpk-play-tabs',role:'group','aria-label':'红包玩法'},...tabs),scroll,footer)
 function lock(v){busy=v;onBusy?.(v);for(const b of [...tabs,...currencies])b.disabled=v;slot.inert=v}
 function switchCurrency(value){if(busy)return;currency=value;currencies.forEach((b,i)=>b.setAttribute('aria-pressed',String(currency===(i?'coin':'ldc'))));funding.setCurrency(currency)}
 function show(){
  tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(play===plays[i][0])))
  if(!cache.has(play)){
   const common={paymentProvider:funding.provider(),fundingControl:funding,h,api,group,userId,host,signal,uploadCover,onSent,onBusy:lock,onBack:()=>{play='ordinary';show()}}
   cache.set(play,play==='ordinary'||play==='guess'||play==='draw'?nativeCreateForm({...common,compact:true,timedDraw:play==='draw',initialMode:play==='guess'?'guess':'random',autoGuess:play==='guess'?autoGuess:null}):puzzleForm(play))
  }
  const current=cache.get(play);slot.replaceChildren(current);footer.replaceChildren(current.footer);current.setFunding(funding.provider());scroll.scrollTop=0
 }
 function puzzleForm(mode){
  let paymentProvider=funding.provider(),coin=paymentProvider==='coin52',unit=coin?'D币':'LDC'
  const field=(name,node,help)=>h('label',{class:'rpk-field'},h('span',null,name),node,help&&h('small',null,help)),input=(name,props={})=>h('input',{class:'rpk-input','aria-label':name,...props})
  const nonce=crypto.randomUUID(),info=h('p',{class:'rpk-status',role:'status'})
  const amount=input('奖励总额 · '+unit,{inputmode:'decimal',placeholder:coin?'1–20000 整数':'0.01–2000',required:true}),count=input('奖励份数',{type:'number',min:1,max:100,value:1,required:true}),minutes=input('有效期 · 分钟',{type:'number',min:1,max:1440,value:1440})
  const kind=h('select',{class:'rpk-input','aria-label':'分配方式'},h('option',{value:'random'},'拼手气'),h('option',{value:'fixed'},'均分'))
  const phrase=h('textarea',{class:'rpk-input','aria-label':'复读内容',rows:3,maxlength:2000,required:mode==='phrase',placeholder:'1–1000字；领取者在群里发送完整复读内容'}),phraseCount=h('small',{class:'rpk-count'},'0 / 1000')
  phrase.addEventListener('input',()=>{phraseCount.textContent=[...phrase.value.normalize('NFC').trim()].length+' / 1000'})
  const answer=input('图中是什么',{maxlength:80,required:mode==='image',placeholder:'填写图片答案，1–40字'}),prompt=input(mode==='image'?'图片提示':'祝福语',{maxlength:120,required:mode==='image',placeholder:mode==='image'?'给大家一点提示':'写一句祝福（选填）'})
  let selected=null,selectedIndex=0,maskBits=16,searchSeq=0,cover=null,clue=null,clueFor='',formBusy=false
  const results=h('div',{class:'rpk-post-results'}),chosen=h('div',{class:'rpk-chosen'}),search=input('搜索帖子',{placeholder:'帖子编号或关键词',inputmode:'search'}),find=button('找图',findPosts)
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findPosts()}})
  const coverPreview=h('div',{class:'rpk-cover-preview'}),file=input('红包封面',{type:'file',class:'sr-only',accept:'image/png,image/jpeg,image/webp,image/gif'}),pick=button('选择封面',()=>file.click())
  const extra=h('details',{class:'rpk-options'},h('summary',null,'祝福、封面与时限'),mode==='image'?null:field('祝福语',prompt),field('有效期 · 分钟',minutes),file,pick,coverPreview)
  const submit=h('button',{type:'submit',class:'rpk-primary'},'发到群里')
  function locked(v){formBusy=v;lock(v);submit.disabled=v;for(const el of form.querySelectorAll('button,input,select,textarea'))el.disabled=v}
  const amountField=field('总额 · '+unit,amount)
  const form=h('form',{id:'rpk-form-'+crypto.randomUUID(),class:'rpk-form rpk-composer-form',onsubmit:async e=>{
   e.preventDefault();if(formBusy)return
   const text=phrase.value.normalize('NFC').trim(),solution=answer.value.normalize('NFC').trim()
   if(mode==='phrase'&&(!text||[...text].length>1000||/[\p{Cc}\p{Cf}]/u.test(text))){info.textContent='复读内容需为1–1000字，不包含换行或控制字符。';phrase.focus();return}
   if(mode==='image'&&(!selected||!solution||[...solution].length>40)){info.textContent='请选择图片并填写1–40字的图片答案。';return}
   if(!funding.requireReady()){info.textContent='请先在渠道设置中完成账户绑定';return}
   locked(true);info.textContent='正在创建红包…'
   try{
    if(mode==='image'){
     const source=`${selected.id}:${selectedIndex}:${maskBits}`
     if(source!==clueFor||!clue){info.textContent='正在制作图片线索…';clue=await uploadClue(await makeClue(selected.images[selectedIndex].u,maskBits,doc));clueFor=source}
    }
    if(signal.aborted)return
    const r=await api(`/chat/groups/${group.id}/redpacks`,{method:'POST',body:{provider:'native',payment_provider:paymentProvider,nonce,mode,secret:mode==='image'?solution:undefined,phrase:mode==='phrase'?text:undefined,prompt:prompt.value,post_id:selected?.id,image_index:selectedIndex,mask:Math.floor(Math.log2(maskBits&-maskBits)),mask_bits:mode==='image'?maskBits:undefined,clue_key:mode==='image'?clue?.key:undefined,cover_key:cover?.key,ldc_reward:true,ldc_amount:amount.value.trim(),ldc_count:Number(count.value),ldc_kind:kind.value,ldc_minutes:Number(minutes.value)}})
    onSent(r.message)
   }catch(e){info.textContent=e.message}finally{locked(false)}
  }},mode==='phrase'?field('复读内容',phrase,'在群里发送完整复读内容后领取。'):h('div',null,field('选张图',h('div',{class:'rpk-search-row'},search,find)),results,chosen,field('图中是什么',answer,'这就是领取条件，答对后获得本包奖励。'),field('给参与者的提示',prompt)),mode==='phrase'?phraseCount:null,
   h('div',{class:'rpk-inline-fields'},amountField,field('份数',count)),field('分配方式',kind),extra,h('div',{class:'rpk-create-footer'},info,submit))
  file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||formBusy)return;locked(true);try{const {cropPacketCover}=await import('/redpacket-cover.js?v=c8639d55');const cropped=await cropPacketCover(f,{host,form,doc,h,signal});if(cropped&&!signal.aborted){cover=await uploadCover(cropped,signal);coverPreview.replaceChildren(h('img',{class:'rpk-cover',src:cover.url,alt:'红包封面'}),button('移除封面',()=>{cover=null;coverPreview.replaceChildren()}))}}catch(e){info.textContent=e.message}finally{locked(false);file.value=''}})
  async function findPosts(){
   const ticket=++searchSeq,q=search.value.trim();if(!q){results.textContent='输入帖子编号或关键词后找图';return}find.disabled=true;results.textContent='正在找图…'
   try{const id=q.match(/^(?:No\.|#)?(\d+)$/i),d=await api(id?`/memes/${id[1]}`:`/memes?q=${encodeURIComponent(q)}&limit=6&nsfw=0`);if(ticket!==searchSeq||signal.aborted)return
    const items=d.meme?[d.meme]:d.items
    results.replaceChildren(...items.map(m=>button(`No.${m.id} · ${m.title||m.text?.slice(0,38)||'未命名图片'}`,async()=>{const pickTicket=++searchSeq;try{const full=d.meme||(await api(`/memes/${m.id}`)).meme;if(pickTicket!==searchSeq||signal.aborted)return;if(!full.images?.some(im=>im.u&&im.k!=='v'&&im.k!=='f'))throw Error('这个帖子没有可用图片');selected=full;selectedIndex=full.images.findIndex(im=>im.u&&im.k!=='v'&&im.k!=='f');results.replaceChildren();drawChosen()}catch(e){results.textContent=e.message}})))
    if(!items.length)results.textContent='没有找到帖子'
   }catch(e){results.textContent=e.message}finally{find.disabled=false}
  }
  function drawChosen(){
   const images=h('select',{class:'rpk-input','aria-label':'选择帖子图片',onchange:e=>{selectedIndex=Number(e.target.value);drawChosen()}},...selected.images.map((im,i)=>im.u&&im.k!=='v'&&im.k!=='f'?h('option',{value:i,selected:i===selectedIndex},`第 ${i+1} 张`):null))
   const windows=h('div',{class:'rpk-windows',role:'group','aria-label':'选择清晰窗口'},...Array.from({length:9},(_,i)=>{const b=button(String(i+1),()=>{const next=maskBits^(1<<i);if(next){maskBits=next;drawChosen()}});b.setAttribute('aria-pressed',String(!!(maskBits&(1<<i))));b.setAttribute('aria-label',`清晰区域 ${i+1}`);return b}))
   chosen.replaceChildren(h('strong',null,`已选 No.${selected.id}`),images,preview({u:selected.images[selectedIndex].u,nsfw:selected.sensitive||selected.spoiler,bits:maskBits,creator:true}),h('div',{class:'rpk-window-row'},h('p',{class:'rpk-help'},'点选清晰区域'),windows))
  }
  form.setFunding=provider=>{paymentProvider=provider;coin=provider==='coin52';unit=coin?'D币':'LDC';amountField.firstChild.textContent='总额 · '+unit;amount.setAttribute('aria-label','红包总额');amount.placeholder=coin?'1–20000 整数':'0.01–2000'}
  form.footer=form.querySelector('.rpk-create-footer');submit.setAttribute('form',form.id)
  return form
 }
 show();switchCurrency(currency);funding.load();return element
}
