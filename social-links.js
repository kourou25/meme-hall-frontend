// 前后端共用对象地址解析；普通主页、任意域名及红包地址不进入预览链路。
export function socialLink(input) {
  let u; try { u=new URL(input) } catch { return null }
  if(u.protocol!=='https:'||u.username||u.password||u.port||input.length>2048)return null
  const host=u.hostname,path=u.pathname
  let m,provider,id,url,short=false
  if(['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com'].includes(host)&&(m=path.match(/^\/(?:[A-Za-z0-9_]{1,30}|i\/web)\/status\/(\d{5,25})(?:\/(?:photo|video)\/\d)?\/?$/))){provider='x';id=m[1];url=`https://x.com/i/web/status/${id}`}
  else if(['www.tiktok.com','tiktok.com'].includes(host)&&(m=path.match(/^\/@[\w.-]+\/(?:video|photo)\/(\d{5,25})\/?$/))){provider='tiktok';id=m[1];url='https://www.tiktok.com'+path.replace(/\/$/,'')}
  else if(['www.instagram.com','instagram.com','instagr.am'].includes(host)&&(m=path.match(/^\/(?:[A-Za-z0-9_.]{1,30}\/)?(p|reels?|tv)\/([A-Za-z0-9_-]{5,40})\/?$/))){provider='instagram';id=m[2];url=`https://www.instagram.com/${m[1]==='reels'?'reel':m[1]}/${id}/`}
  else if(['www.douyin.com','douyin.com','jingxuan.douyin.com','www.iesdouyin.com'].includes(host)&&(m=path.match(/^\/(?:m\/|share\/)?(?:video|note)\/(\d{5,25})\/?$/))){provider='douyin';id=m[1];url=u.origin+path}
  else if(host==='v.douyin.com'&&(m=path.match(/^\/([A-Za-z0-9_-]{4,40})\/?$/))){provider='douyin';id=m[1];url=u.origin+path;short=true}
  else if(['weibo.com','www.weibo.com'].includes(host)&&(m=path.match(/^\/\d{4,20}\/([A-Za-z0-9]{5,25})\/?$/))){provider='weibo';id=m[1];url='https://weibo.com'+path}
  else if(['weibo.com','www.weibo.com'].includes(host)&&(m=path.match(/^\/2\/detail\/(\d{5,25})\/?$/))){provider='weibo';id=m[1];url='https://weibo.com'+path}
  else if(['m.weibo.cn','m.weibo.com'].includes(host)&&(m=path.match(/^\/(?:detail|status)\/([A-Za-z0-9]{5,25})\/?$/))){provider='weibo';id=m[1];url=u.origin+path}
  else return null
  return {provider,id,url,short,label:({x:'X / Twitter',tiktok:'TikTok',instagram:'Instagram',douyin:'抖音',weibo:'微博'})[provider]}
}
export function socialLinks(text='') {
  const found=[],seen=new Set()
  for(const m of text.matchAll(/https:\/\/[^\s<>"'）)\]，。！？]+/g)){
    const link=socialLink(m[0]);if(!link||seen.has(link.url))continue
    seen.add(link.url);found.push(link);if(found.length===2)break
  }
  return found
}
export const canSocialPost = provider => ['x','douyin','weibo','instagram','tiktok'].includes(provider)
export const isOfficialEmbed = provider => provider==='instagram'||provider==='tiktok'
// 仅用于外站抓取的配文：保留正文，去掉话题标记和平台分享尾文。
export function socialCaption(text=''){
 return String(text).replace(/(?:复制此链接|复制链接，?打开抖音|打开抖音搜索)[\s\S]*$/,'')
  .replace(/(^|[\s，,。！？!?])#[\p{L}\p{N}_][\p{L}\p{N}_-]*#?/gu,'$1')
  .replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim()
}
// 标准分享口令整行隐藏；用户单独输入的评论保留。原文仍可从消息菜单复制。
export function socialMessageText(text=''){
 if(!socialLinks(text).length)return text
 return text.split('\n').filter(line=>!(/https:\/\/v\.douyin\.com\//.test(line)&&/复制此链接|打开抖音/.test(line))).map(line=>line.replace(/https:\/\/[^\s<>"'）)\]，。！？]+/g,url=>socialLink(url)?'':url)).join('\n').trim()
}
