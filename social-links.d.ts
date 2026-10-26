export type SocialLink={provider:'x'|'tiktok'|'instagram'|'douyin'|'weibo';id:string;url:string;short:boolean;label:string}
export function socialLink(input:string):SocialLink|null
export function socialLinks(text?:string):SocialLink[]
export function socialMessageText(text?:string):string
export function socialCaption(text?:string):string
export function canSocialPost(provider:string):boolean
export function isOfficialEmbed(provider:string):boolean
