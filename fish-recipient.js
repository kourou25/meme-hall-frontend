export const FISH_SETUP_URL='https://hb.lafi.sh/';
export const FISH_SETUP_MESSAGE='请先用同一 Linux.DO 账号登录 Fish，完成收款配置。中奖名额保留，完成后请发起者沿原单重试。';
export function needsFishSetup(provider,reward){return provider==='fish'&&reward?.state==='rejected'&&reward.needs_fish_setup===true}
export function fishSetupNotice(doc){
 const node=doc.createElement('div');node.className='gm-fish-setup';node.setAttribute('role','status');
 const text=doc.createElement('span');text.textContent=FISH_SETUP_MESSAGE;
 const link=doc.createElement('a');link.href=FISH_SETUP_URL;link.target='_blank';link.rel='noopener noreferrer';link.textContent='去 Fish 配置收款';
 node.append(text,link);return node;
}
