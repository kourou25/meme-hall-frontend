export function packetLuckRanks(list,complete=true){
 const ranks=Array.from({length:list?.length||0},()=> '')
 if(!complete||ranks.length<2)return ranks
 if(list.some(person=>person.amount==null||person.amount===''))return ranks
 const amounts=list.map(person=>Number(person.amount))
 if(amounts.some(amount=>!Number.isFinite(amount)||amount<0))return ranks
 const high=Math.max(...amounts),low=Math.min(...amounts)
 if(high===low)return ranks
 return amounts.map(amount=>amount===high?'king':amount===low?'last':'')
}
