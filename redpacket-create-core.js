// 站内表单与连接器使用同一字段校验；所有金额按整数分计算。
const platformUuid=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value||''))
const platformCode=value=>[...value].length>=6&&[...value].length<=18&&/^[\p{Script=Han}A-Za-z0-9]+$/u.test(value)
function platformCents(value){
 const s=String(value??'').trim()
 if(!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(s))throw Error('金额需为正数，最多两位小数')
 const [whole,fraction='']=s.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))
 if(cents<1n||cents>BigInt(Number.MAX_SAFE_INTEGER))throw Error('金额超出有效范围')
 return Number(cents)
}
const platformMoney=cents=>(BigInt(cents)/100n).toString()+'.'+(BigInt(cents)%100n).toString().padStart(2,'0')
export function normalizePlatformCreate(input){
 const provider=input.provider,operation=String(input.operation||''),account=String(input.account||'')
 if(!['hb','fish'].includes(provider)||!platformUuid(operation)||!account||account.length>128||/[\p{Cc}\p{Cf}]/u.test(account))throw Error('请重新检测平台账户后创建')
 const kind=String(input.kind),greeting=String(input.greeting||'').normalize('NFC').trim()
 if([...greeting].length>100||/[\p{Cc}\p{Cf}]/u.test(greeting))throw Error('祝福语最多100字，不能含控制字符')
 const code=String(input.code||'').normalize('NFC').trim()
 const count=provider==='hb'&&kind==='exclusive'?1:Number(input.count)
 if(kind!=='custom'&&(!Number.isInteger(count)||count<1||count>(provider==='hb'?500:1000)))throw Error('红包份数超出平台范围')
 const cents=kind==='custom'?0:platformCents(input.amount)
 if(kind!=='custom'&&cents<count)throw Error('每份至少需要0.01 LDC')
 if(provider==='hb'){
  if(!['equal','random','exclusive','lottery'].includes(kind))throw Error('请选择HB支持的红包类型')
  if(cents<100||cents>(kind==='exclusive'?80000:200000))throw Error(kind==='exclusive'?'HB专属红包总额为1–800 LDC':'HB红包总额为1–2000 LDC')
  const distribution=kind==='lottery'?String(input.distribution||'random'):kind
  if(kind==='lottery'&&!['equal','random'].includes(distribution))throw Error('请选择抽奖的金额分配方式')
  if(distribution==='equal'&&(cents%count!==0||cents/count<100))throw Error('HB普通红包总额需可均分，每份至少1 LDC')
  const drawSeconds=kind==='lottery'?Number(input.drawSeconds):null
  if(kind==='lottery'&&(!Number.isInteger(drawSeconds)||drawSeconds<40||drawSeconds>300))throw Error('HB开奖倒计时需为40–300秒')
  const target=kind==='exclusive'?String(input.target||'').trim().replace(/^@/,''):''
  if(kind==='exclusive'&&(!target||target.length>60||/[\s\p{Cc}\p{Cf}]/u.test(target)))throw Error('请填写专属用户的Linux DO用户名')
  const codeType=kind==='exclusive'?'numeric':String(input.codeType||'numeric')
  if(!['numeric','text'].includes(codeType)||codeType==='text'&&!platformCode(code))throw Error('文字口令需为6–18字中英文或数字')
  return {provider,operation,account,payload:{total:platformMoney(cents),count,wish:greeting||'恭喜发财，大吉大利',type:kind,target_username:target,code_type:codeType,text_code:codeType==='text'?code:'',...(kind==='lottery'?{distribution_type:distribution}:{}),draw_seconds:drawSeconds}}
 }
 const merchantId=String(input.merchantId||''),credentialVersion=Number(input.credentialVersion)
 if(!platformUuid(merchantId)||!Number.isSafeInteger(credentialVersion)||credentialVersion<1)throw Error('请检测并选择已绑定的Fish真实商户')
 if(!['fixed','random','custom','timed_draw'].includes(kind))throw Error('请选择Fish支持的红包类型')
 const participation=String(input.participation||'direct')
 if(!['direct','password'].includes(participation)||participation==='password'&&!platformCode(code))throw Error('Fish活动口令需为6–18字中英文或数字')
 if(kind==='fixed'&&cents%count!==0)throw Error('普通红包总额必须可以精确均分到分')
 const algorithm=String(input.algorithm||'double_mean_v1')
 if(!['double_mean_v1','bounded_mean_v1'].includes(algorithm))throw Error('Fish金额分配算法无效')
 let money={mode:kind,totalAmount:platformMoney(cents),count}
 if(kind==='custom'){
  const amounts=String(input.amounts||'').split(/[\s,，;；]+/).filter(Boolean).map(platformCents)
  if(!amounts.length||amounts.length>1000||amounts.reduce((s,n)=>s+BigInt(n),0n)>BigInt(Number.MAX_SAFE_INTEGER))throw Error('自定义金额需为1–1000份有效金额')
  money={mode:kind,amounts:amounts.map(platformMoney)}
 }
 if(['random','timed_draw'].includes(kind))money.algorithm=algorithm
 if(kind==='timed_draw'){
  const seconds=Number(input.drawSeconds),limit=String(input.participantLimit||'').trim()===''?null:Number(input.participantLimit)
  if(!Number.isSafeInteger(seconds)||seconds<1||seconds>8e12||limit!==null&&(!Number.isSafeInteger(limit)||limit<1))throw Error('开奖秒数和人数上限需为有效正整数')
  money={...money,countdownSeconds:seconds,participantLimit:limit,distributeFullPool:input.distributeFullPool!==false}
 }
 return {provider,operation,account,merchantId,credentialVersion,payload:{title:greeting||'恭喜发财，大吉大利',topicUrl:'',forceDedicated:false,joinSquare:false,deadline:{mode:'duration'},allocation:['random','timed_draw'].includes(kind)?'random':'sequential',passwords:participation==='password'?[code]:[],quantityVisibility:'exact',showRecipientList:true,showRecipientUsername:true,showRecipientTime:true,showRecipientAmount:true,beforeInfo:'',afterClaimInfo:'',afterEndInfo:'',participationMode:participation,rewardType:'ldc',merchantId,money}}
}
