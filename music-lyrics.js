// Leading timestamps repeat a line later; interleaved timestamps mark its words.
export function parseMusicLyrics(raw){
 const result=[],seen=new Set();
 for(const line of String(raw||'').split(/\r?\n/)){
  const stamps=[...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];if(!stamps.length)continue;
  const clean=s=>s.replace(/\[[^\]]*\]|<\d+:\d+(?:\.\d+)?>/g,'').trim();
  const text=clean(line);if(!text)continue;
  const first=stamps[0],last=stamps[stamps.length-1];
  const wordTimed=stamps.length>1&&!!clean(line.slice(first.index+first[0].length,last.index));
  for(const stamp of wordTimed?[first]:stamps){
   const at=Number(stamp[1])*60+Number(stamp[2]);if(!Number.isFinite(at))continue;
   const identity=at+'\0'+text;if(seen.has(identity))continue;seen.add(identity);result.push({at,text});
   if(result.length>=3000)break;
  }
  if(result.length>=3000)break;
 }
 return result.sort((a,b)=>a.at-b.at);
}
