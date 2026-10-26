const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
export function farewellPanel(data,{reload,onLeave}){
 const box=el('section');box.className='farm-farewell';box.style.cssText='padding:20px 24px;margin:0 0 20px;border-left:4px solid #ba9148;background:linear-gradient(100deg,#fff8df,#edf3e9);color:#344934;border-radius:6px';
 box.append(el('h2',data.closed?'田园暂别，收获长存':'农场暂别 · 10月28日（周三）12:00'));
 box.append(el('p',data.closed?'农场已结束本期经营。你的存档保留，所有结算自动入账。':'暂时还没有找到更好的玩法，农场将暂别。前后端代码和可公开的数据将整理开源，感谢每一次播种、照料与来访。'));
 if(data.closed){const r=data.receipt;box.append(el('strong',r?.status==='paid'?`已到账 ${(r.asset_coins+r.bonus).toLocaleString()} D币 · 资产 ${r.asset_coins.toLocaleString()} + 纪念补偿 ${r.bonus.toLocaleString()}`:r?.status==='skipped'?'当前账号不符合本次补偿条件':'结算正在分批进行，无需手动领取。'));if(r?.status==='paid'){const list=el('details'),summary=el('summary','查看资产结算明细');list.append(summary);for(const line of r.details?.lines??[])list.append(el('p',`${line.label} × ${line.quantity}：${(line.cents/100).toFixed(2)} D币`));list.append(el('small','合计不足1 D币的尾数向上补足。'));box.append(list)}else{const b=el('button','刷新结算状态');b.className='btn';b.onclick=reload;box.append(b)}}
 else{const timer=setTimeout(reload,Math.max(0,(data.closes_at-data.server_time)*1000+1000));onLeave(()=>clearTimeout(timer));box.append(el('p','截止时未成熟作物、库存、已投入的经营资产统一结算；每位正常用户另获 100,000 D币。'))}
 const details=el('details');details.append(el('summary','结算规则'));for(const line of data.rules)details.append(el('p',line));box.append(details,el('p','永久纪念 · 老农民 Lv5200：称号、徽章、气泡与回应框，全套留存。'));return box;
}
