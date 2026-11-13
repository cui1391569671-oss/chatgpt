// Shared Steam search result parser for entertainment cover selection.
const decode=s=>s.replace(/<[^>]*>/g,' ').replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function parseSteamGames(html){
 return [...html.matchAll(/<a\b[^>]*data-ds-appid="(\d+)"[\s\S]*?<\/a>/g)].map(([row,id])=>{
  const title=decode(row.match(/class="title">([\s\S]*?)<\/span>/)?.[1]||'');
  const releaseLabel=decode(row.match(/class="search_released[^"]*">([\s\S]*?)<\/div>/)?.[1]||'待定');
  const parts=releaseLabel.match(/^(\d{1,2}) ([A-Za-z]{3}), (\d{4})$/),month=parts?['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[2]):-1;
  const releaseDate=parts&&month>=0?parts[3]+'-'+String(month+1).padStart(2,'0')+'-'+parts[1].padStart(2,'0'):'';
  const image=row.match(/<img\b[^>]*src="([^"]+)"/)?.[1]||'';
  return {id,title,releaseDate,releaseLabel,coverUrl:/^https:\/\/[a-z0-9.-]+\.steamstatic\.com\//.test(image)?decode(image):'',platform:['win','mac','linux'].filter(p=>row.includes('platform_img '+p)).map(p=>({win:'Windows',mac:'macOS',linux:'Linux'}[p])).join(' / '),url:'https://store.steampowered.com/app/'+id+'/'};
 }).filter(g=>g.title);
}
