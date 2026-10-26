export const DCOIN_ICON_HTML='<i class="dcoin" aria-hidden="true"></i>'
export const dcoinIcon=(h,className='')=>h('i',{class:'dcoin '+className,'aria-hidden':'true'})
export const dcoinAmount=(h,amount,className='')=>h('span',{class:'dcoin-amount '+className,'aria-label':`${amount}枚D币`},dcoinIcon(h),h('strong',null,String(amount)))
