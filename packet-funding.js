// Permanent invitation confirmed by the site owner; one address for every setup guide.
export const FISH_INVITE_URL='https://hb.lafi.sh/invite/UPIm-HstJM4K1zC7DAvGzMORRrrFbYxtcTv5Jr1jBug'
export const fundingState=(state,provider)=>state==='accepted'&&provider==='coin52'?'已到账本站钱包':state==='accepted'&&provider==='fish'?'已到账 Fish 🐟额':({reserved:'奖励已锁定，等待发放',sent:'正在发放，请稍后核对',accepted:'平台已受理，到账以 Credit 为准',unknown:'结果待核对，不会重复发放',rejected:'发放失败，名额保留待核对'})[state]||'待核对'
export function fishAccountPanel({h,api,signal,onBusy=()=>{},onChange=()=>{}}){
 const status=h('p',{class:'rpk-funding-status',role:'status'},'正在读取 Fish 绑定…'),feedback=h('p',{class:'rpk-status',role:'status'})
 const key=h('input',{class:'rpk-input',type:'password',autocomplete:'new-password',spellcheck:false,'aria-label':'Fish API Key',placeholder:'hbk_…，仅在首次绑定或更换时填写',maxlength:244})
 const authorize=h('input',{type:'checkbox','aria-label':'授权本人 Fish 余额发放红包'})
 const link=(text,url)=>h('a',{class:'rpk-secondary',href:url,target:'_blank',rel:'noopener noreferrer'},text)
 let account=null,busy=false
 const refreshBalance=h('button',{type:'button',class:'rpk-text-button','aria-label':'刷新 Fish 余额',onclick:async()=>{refreshBalance.disabled=true;try{await load()}catch(e){feedback.textContent=e.message}finally{refreshBalance.disabled=false}}},'刷新余额')
 async function load(){const a=await api('/me/fish');if(signal?.aborted)return a;account=a;const b=a.balance;status.replaceChildren(h('span',null,!a.configured?'Fish 服务尚未配置':a.enabled?`已绑定 ${a.username} · ${b?`🐟额 ${b.available} · 可新增 ${b.capacity} LDC${b.daily_remaining===null?'':` · 今日剩余 ${b.daily_remaining}`} · 本站待发 ${b.committed}${b.can_transfer?'':` · ${b.reason||'转账不可用'}`}`:`余额读取失败：${a.balance_error||'请刷新重试'}`}`:a.bound?'Fish 发包已停用':'首次发包需绑定本人 Fish API Key'),refreshBalance);refreshBalance.hidden=!a.enabled;disable.hidden=!a.bound;onChange(a);return a}
 async function run(action){if(busy)return;busy=true;onBusy(true);save.disabled=disable.disabled=key.disabled=authorize.disabled=true;feedback.textContent='正在验证…';try{await action()}catch(e){feedback.textContent=e.message}finally{busy=false;save.disabled=disable.disabled=key.disabled=authorize.disabled=false;onBusy(false)}}
 const save=h('button',{type:'button',class:'rpk-primary',onclick:()=>run(async()=>{if(!authorize.checked)throw Error('请先勾选本人余额发放授权');await api('/me/fish',{method:'POST',body:{api_key:key.value.trim(),authorize:true}});key.value='';authorize.checked=false;await load();element.open=false;feedback.textContent='绑定成功，可以发红包。'})},'验证并绑定')
 const disable=h('button',{type:'button',class:'rpk-secondary',hidden:true,onclick:()=>run(async()=>{await api('/me/fish/disable',{method:'POST',body:{}});await load();feedback.textContent='已停用新发放，并关闭未领取名额；已提交的原单仍可核对。'})},'停用 Fish 发包')
 const element=h('details',{class:'rpk-options rpk-fish-binding'},h('summary',null,'Fish 账户与绑定'),
  h('ol',{class:'rpk-setup-steps'},h('li',null,h('strong',null,'接受邀请'),h('p',null,'用自己的 Linux.DO 账号登录 Fish，接受邀请后创建 Key。'),link('前往接受邀请',FISH_INVITE_URL)),h('li',null,h('strong',null,'创建 API Key'),h('p',null,'在 Fish 的开放 API 页面创建 Key，并按需要设置每日额度。'),link('打开 Fish 创建 Key','https://hb.lafi.sh/balance#api-keys')),h('li',null,h('strong',null,'回到这里绑定'),h('p',null,'填入 hbk_ 开头的 Key；本站会验证它是否属于当前账号。'))),
  h('label',{class:'rpk-field'},h('span',null,'Fish API Key'),key),h('label',{class:'rpk-setting-toggle'},authorize,h('span',null,'授权用本人 Fish 余额按红包规则发放')),
  h('p',{class:'rpk-help'},'可新增额度已扣除本站待发红包及追加上限，不冻结 Fish 账户。外部消费会改变余额，发包时重新核验。'),h('p',{class:'rpk-help'},'Key 仅加密保存在服务端，不回显。已有 Credit 的 Client ID／密钥可继续用于备用渠道；Fish 开放接口另需 API Key。'),h('div',{class:'rpk-actions'},save,disable),feedback)
 return {element,status,load,get account(){return account}}
}
export function creditAccountPanel({h,api,signal,onBusy=()=>{},onChange=()=>{}}){
 let account=null,busy=false
 const status=h('p',{class:'rpk-funding-status',role:'status'}),feedback=h('p',{class:'rpk-status',role:'status'})
 const client=h('input',{class:'rpk-input',autocomplete:'off','aria-label':'Credit Client ID',placeholder:'填写本人 Credit 应用 Client ID'}),secret=h('input',{class:'rpk-input',type:'password',autocomplete:'new-password','aria-label':'Credit Client 密钥',placeholder:'仅绑定或更换时填写'})
 const authorize=h('input',{type:'checkbox','aria-label':'授权本人 Credit 应用发放奖励'})
 const toggle=h('input',{type:'checkbox',role:'switch','aria-label':'启用 Credit 备用渠道',onchange:()=>run(async()=>{const enabled=toggle.checked;if(enabled&&!account?.bound){binding.open=true;throw Error('请先绑定本人 Credit 应用')}await api('/me/ldc/channel',{method:'POST',body:{enabled}});await load();feedback.textContent=enabled?'Credit 备用渠道已开启。':'Credit 新发包已关闭，原红包继续按原渠道结算。'})})
 const save=h('button',{type:'button',class:'rpk-secondary',onclick:()=>run(async()=>{if(!authorize.checked)throw Error('请勾选本人应用授权');await api('/me/ldc',{method:'POST',body:{client_id:client.value.trim(),client_secret:secret.value.trim(),own_application:true}});client.value=secret.value='';authorize.checked=false;await load();binding.open=false;feedback.textContent='Credit 应用已绑定，备用渠道已开启。'})},'验证并保存')
 const binding=h('details',{class:'rpk-options'},h('summary',null,'绑定或更换 Credit 应用'),h('label',{class:'rpk-field'},h('span',null,'Client ID'),client),h('label',{class:'rpk-field'},h('span',null,'Client 密钥'),secret),h('label',{class:'rpk-setting-toggle'},authorize,h('span',null,'这是本人应用，授权按红包规则发放')),save)
 const element=h('section',{class:'rpk-credit-settings','aria-label':'Credit 备用渠道'},h('label',{class:'rpk-setting-toggle'},h('span',null,'Credit 备用渠道'),toggle),status,h('p',{class:'rpk-help'},'关闭只停止新建 Credit 红包；不删除凭据，不影响原红包发放和原单核对。'),binding,feedback)
 async function load(){const a=await api('/me/ldc');if(signal?.aborted)return a;account=a;toggle.checked=!!(a.enabled&&a.create_enabled);status.textContent=a.bound?`已保存应用 ${a.client_mask} · ${toggle.checked?'可用于新发包':'新发包已关闭'}`:'可选渠道；已有应用凭据可继续使用';onChange(a);return a}
 async function run(action){if(busy)return;busy=true;onBusy(true);for(const el of [toggle,client,secret,authorize,save])el.disabled=true;try{await action()}catch(e){toggle.checked=!!(account?.enabled&&account?.create_enabled);feedback.textContent=e.message}finally{busy=false;for(const el of [toggle,client,secret,authorize,save])el.disabled=false;onBusy(false)}}
 return {element,status,load,get account(){return account}}
}
export function packetFundingPanel({h,api,signal,onBusy,onChange=()=>{}}){
 let currency='ldc',channel='fish'
 const status=h('span',{class:'rpk-funding-summary',role:'status'}),fish=fishAccountPanel({h,api,signal,onBusy,onChange:refresh}),credit=creditAccountPanel({h,api,signal,onBusy,onChange:refresh})
 const select=h('select',{class:'rpk-input','aria-label':'LDC 发放渠道',onchange:()=>{channel=select.value;refresh()}},h('option',{value:'fish'},'Fish · 到 🐟额'),h('option',{value:'credit'},'Credit · 备用渠道'))
 const element=h('details',{class:'rpk-options rpk-funding-settings'},h('summary',null,'支付渠道与账户'),h('label',{class:'rpk-field'},h('span',null,'LDC 发放渠道'),select),fish.status,fish.element,credit.element)
 const open=h('button',{type:'button',class:'rpk-text-button',onclick:()=>{element.open=!element.open;if(element.open)element.scrollIntoView({block:'nearest'})}},'渠道设置')
 const line=h('div',{class:'rpk-funding-line'},status,open)
 function refresh(){select.value=channel;select.options[1].disabled=!(credit.account?.enabled&&credit.account?.create_enabled);select.disabled=currency==='coin';status.textContent=currency==='coin'?'本站钱包 · 创建时预留，未用部分退回':channel==='credit'?(credit.account?.enabled&&credit.account?.create_enabled?'Credit 备用 · 到账与手续费以平台为准':'Credit 新发包已关闭，请在渠道设置中开启'):fish.account?.enabled?(fish.account.balance?`🐟额 ${fish.account.balance.available} · 可新增 ${fish.account.balance.capacity} LDC`:'Fish 余额暂不可用，请刷新渠道设置'):'Fish 🐟额 · 首次使用需绑定 Key';onChange(provider())}
 function provider(){return currency==='coin'?'coin52':channel}
 function ready(){return currency==='coin'||(channel==='credit'?!!(credit.account?.enabled&&credit.account?.create_enabled):!!fish.account?.enabled)}
 function requireReady(){if(ready())return true;element.open=true;if(channel==='fish')fish.element.open=true;element.scrollIntoView({block:'nearest'});return false}
 function setCurrency(value){currency=value;refresh()}
 function setProvider(value){currency=value==='coin52'?'coin':'ldc';if(value!=='coin52')channel=value==='credit'?'credit':'fish';refresh()}
 async function load(){await Promise.allSettled([fish.load(),credit.load()]);refresh()}
 return {element,line,load,provider,ready,requireReady,setCurrency,setProvider}
}
// Required fields stay visible; optional sections use native disclosure controls.
export function packetSections({h,sections}){
 const entries=sections.map((s,i)=>{const body=h('div',{class:'rpk-section-body'},...s.nodes),node=s.primary?h('section',{class:'rpk-form-section','aria-label':s.label},h('h3',null,s.label),body):h('details',{class:'rpk-options'},h('summary',null,s.label),body);return {...s,node}})
 return {element:h('div',{class:'rpk-composer-fields'},...entries.map(s=>s.node)),refresh(){for(const s of entries)s.node.hidden=s.available?!s.available():false},select(id){const s=entries.find(s=>s.id===id);if(s){s.node.hidden=false;if(s.node.tagName==='DETAILS')s.node.open=true;s.node.scrollIntoView({block:'nearest'})}}}
}
