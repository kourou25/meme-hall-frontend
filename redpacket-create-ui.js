import {normalizePlatformCreate} from '/redpacket-create-core.js?v=98ddcc7d'

// 仅打开HB/Fish创建表单时加载；无定时器和后台监听。
export function platformCreateForm({provider,userId,groupId,h,bridge,win,onState}){
 const key=`platformPacketDraft:${userId}:${groupId}:${provider}`,label=provider==='hb'?'HB':'Fish'
 let draft=null,options=null,busy=false
 try{draft=JSON.parse(win.localStorage.getItem(key)||'null')}catch{}
 if(draft&&(!/^[a-f0-9-]{36}$/i.test(draft.operation||'')||draft.provider!==provider))draft=null
 let operation=draft?.operation||crypto.randomUUID()
 const input=(name,extra={})=>h('input',{class:'rpk-input','aria-label':label+' '+name,...extra})
 const select=(name,values)=>h('select',{class:'rpk-input','aria-label':label+' '+name},values.map(([value,text])=>h('option',{value},text)))
 const field=(text,node)=>h('label',{class:'rpk-field'},h('span',null,text),node)
 const kind=select('类型',provider==='hb'?[['random','拼手气'],['equal','普通红包'],['exclusive','专属红包'],['lottery','抽奖红包']]:[['random','拼手气'],['fixed','普通红包'],['custom','自定义每份金额'],['timed_draw','限时开奖']])
 const amount=input('总额',{inputmode:'decimal',placeholder:provider==='hb'?'1–2000 LDC':'每份至少0.01 LDC'}),count=input('份数',{type:'number',min:1,max:provider==='hb'?500:1000,step:1})
 const target=input('专属用户名',{placeholder:'Linux DO 用户名（不是显示昵称）',maxlength:60})
 const codeType=select('口令方式',provider==='hb'?[['numeric','自动生成数字口令'],['text','自定义文字口令']]:[['direct','点击直接参与'],['password','填写活动口令参与']])
 const code=input('活动口令',{placeholder:'6–18字中英文或数字',maxlength:36})
 const drawSeconds=input('开奖倒计时',{type:'number',min:provider==='hb'?40:1,max:provider==='hb'?300:8000000000000,value:60})
 const distribution=select('中奖金额', [['random','随机金额'],['equal','均分金额']])
 const algorithm=select('随机算法',[['double_mean_v1','二倍均值'],['bounded_mean_v1','有界均值']])
 const amounts=h('textarea',{class:'rpk-input','aria-label':'Fish 每份金额',rows:3,placeholder:'每份一个金额，用逗号或换行分开，如 1, 2, 3',maxlength:18000})
 const merchant=select('商户',[['','先检测账户']])
 const participantLimit=input('报名人数上限',{type:'number',min:1,placeholder:'不填表示不限人数'})
 const fullPool=h('input',{type:'checkbox',checked:true,'aria-label':'人数不足仍分完奖池'})
 const info=h('p',{class:'rpk-status',role:'status'}),account=h('p',{class:'rpk-help'},'使用当前浏览器的平台账号；点击检测后显示绑定状态。')
 const detect=h('button',{type:'button',class:'rpk-secondary',onclick:async()=>{
  if(busy)return;busy=true;sync()
  try{
   const connected=await bridge('ping')
   if(!connected.creationRecoveryV1 || provider==='fish'&&!connected.fishV2)throw Error('创建Fish需要1.5.0连接器，请打开顶部“连接器”更新')
   options=await bridge('creationOptions',{provider,operation})
   account.textContent=label+'：'+options.name+' · '+(options.ready?'已配置':'需在平台完成LDC绑定')
   if(provider==='fish'){
    merchant.replaceChildren(...options.merchants.map(m=>h('option',{value:m.id,disabled:!m.current},m.name+(!m.current?'（历史商户）':m.ready?'':'（开放时验证）'))))
    merchant.value=draft?.input?.merchantId||options.merchants.find(m=>m.current)?.id||options.merchants[0]?.id||''
   }
   if(options.pending&&!draft){
    operation=options.pending.operation
    draft={provider,operation,input:{...options.pending.form,account:options.account},status:options.pending.status}
    persist();restore()
   }
   if(draft&&options.pending?.operation===operation){draft.status=options.pending.status;persist()}
   if(draft?.input?.account&&draft.input.account!==options.account)throw Error('平台账户与待确认红包不一致，请切回原账户核对')
   if(draft&&!draft.result&&options.current?.operation===operation&&options.current.editable&&!options.current.id)resetDraft()
   info.textContent=options.pending?'已恢复待确认操作，请继续同一个红包。':options.ready?'账户已检测，可以填写红包。':'完成平台绑定后，回这里重新检测。'
  }catch(error){info.textContent=error.message}finally{busy=false;sync()}
 }},'检测 '+label+' 账户')
 const binding=h('a',{class:'rpk-secondary',href:provider==='hb'?'https://hb.unsnow.org/':'https://hb.lafi.sh/my/merchants',target:'_blank',rel:'noopener noreferrer'},provider==='hb'?'HB 配置与已发记录':'Fish 商户与已发记录')
 const release=h('button',{type:'button',class:'rpk-secondary',hidden:true,onclick:async()=>{
  if(busy||!options||!win.confirm('请先核对HB已发记录。清理只结束本站待确认状态，不会撤销已创建红包。之后提交将是一笔新的红包。确认已核对？'))return
  busy=true;sync()
  try{await bridge('releaseCreation',{provider,account:options.account,operation,ack:'checked-platform-history'});draft=null;operation=crypto.randomUUID();win.localStorage.removeItem(key);info.textContent='待确认流程已结束。可重新填写；提交将创建另一笔红包。'}catch(e){info.textContent=e.message}finally{busy=false;sync()}
 }},'已核对HB记录，结束待确认流程')
 const fields={kind:field('红包类型',kind),merchant:field('LDC 商户',merchant),amount:field('总额 · LDC',amount),count:field('份数 / 中奖名额',count),amounts:field('每份金额 · LDC',amounts),target:field('专属用户',target),codeType:field('领取方式',codeType),code:field('平台活动口令',code),drawSeconds:field('开奖倒计时 · 秒',drawSeconds),distribution:field('中奖金额分配',distribution),algorithm:field('随机金额算法',algorithm),participantLimit:field('报名人数上限',participantLimit),fullPool:field('人数不足仍分完奖池',fullPool)}
 const node=h('div',{class:'rpk-platform-create'},h('div',{class:'rpk-actions'},detect,binding),account,...Object.values(fields),info,release)
 const controls={kind,amount,count,amounts,target,codeType,code,drawSeconds,distribution,algorithm,merchant,participantLimit,fullPool}
 for(const control of Object.values(controls))control.addEventListener('change',sync)
 function persist(){win.localStorage.setItem(key,JSON.stringify(draft))}
 function resetDraft(){win.localStorage.removeItem(key);draft=null;operation=crypto.randomUUID()}
 function restore(){
  if(!draft?.input)return
  for(const [name,control]of Object.entries(controls)){
   const prop=name==='merchant'?'merchantId':name==='codeType'&&provider==='fish'?'participation':name==='fullPool'?'distributeFullPool':name
   if(draft.input[prop]!==undefined){if(name==='fullPool')control.checked=draft.input[prop];else control.value=String(draft.input[prop])}
  }
 }
 function sync(){
  const lottery=kind.value==='lottery',timed=kind.value==='timed_draw',custom=kind.value==='custom',exclusive=kind.value==='exclusive'
  fields.merchant.hidden=provider!=='fish';fields.target.hidden=!exclusive;fields.amount.hidden=custom;fields.count.hidden=custom||exclusive;fields.amounts.hidden=!custom
  fields.drawSeconds.hidden=!lottery&&!timed;fields.distribution.hidden=!lottery;fields.algorithm.hidden=provider!=='fish'||!['random','timed_draw'].includes(kind.value)
  fields.participantLimit.hidden=fields.fullPool.hidden=!timed;fields.codeType.hidden=exclusive;fields.code.hidden=exclusive||!['text','password'].includes(codeType.value)
  for(const control of Object.values(controls))control.disabled=busy||!!draft
  detect.disabled=busy
  release.hidden=provider!=='hb'||!['prepared','rejected','sent','unknown'].includes(draft?.status);release.disabled=busy
  onState?.({locked:!!draft,greeting:draft?.input?.greeting,busy})
 }
 restore();sync()
 return {node,get draft(){return draft},setBusy(value){busy=value;sync()},async execute(greeting){
  if(draft?.result)return draft.result
  if(!options)throw Error('请先点击“检测 '+label+' 账户”确认绑定状态')
  if(!options.ready)throw Error('请先在 '+label+' 完成LDC绑定，再回来检测')
  const selected=options.merchants?.find(m=>m.id===merchant.value)
  const input=draft?.input||{provider,operation,account:options.account,kind:kind.value,amount:amount.value,count:Number(count.value),greeting,target:target.value,codeType:codeType.value,code:code.value,drawSeconds:Number(drawSeconds.value),distribution:distribution.value,algorithm:algorithm.value,participation:codeType.value,merchantId:selected?.id,credentialVersion:selected?.credentialVersion,amounts:amounts.value,participantLimit:participantLimit.value,distributeFullPool:fullPool.checked}
  normalizePlatformCreate({...input,provider,operation})
  draft={provider,operation,input};persist();sync()
  let result
  try{result=await bridge('platformCreate',{...input,provider,operation})}catch(error){
   const outcome=error.creation
   if(outcome?.provider===provider&&outcome.operation===operation){
    if(outcome.editable===true&&!outcome.id){resetDraft();info.textContent='本次没有创建红包，已恢复编辑。修改后可重新提交。'}
    else {draft.status=outcome.status;persist()}
    sync()
   }
   throw error
  }
  if(typeof result?.id!=='string'||typeof result?.url!=='string')throw Error('创建结果无法确认，请继续原操作')
  draft.result={...result,operation};persist();return draft.result
 },published(){win.localStorage.removeItem(key)}}
}
