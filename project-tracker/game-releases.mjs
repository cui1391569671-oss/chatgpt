const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).trim();
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
const cache=new Map();
export async function getGameReleases(mode,fetcher=fetch,now=new Date()){
 const today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),year=Number(today.slice(0,4)),key=mode+today;
 if(fetcher===fetch&&cache.get(key)?.expires>Date.now())return cache.get(key).data;
 const upcoming=mode==='upcoming',items=new Map();let complete=false;
 for(let page=0;page<(upcoming?1:10);page++){
  const params=new URLSearchParams({start:String(page*100),count:upcoming?'20':'100',filter:upcoming?'popularcomingsoon':'popularnew',category1:'998',infinite:'1',l:'english'});
  if(!upcoming)params.set('sort_by','Released_DESC');
  const r=await fetcher('https://store.steampowered.com/search/results/?'+params,{signal:AbortSignal.timeout(12000),cf:{cacheTtl:3600,cacheEverything:true}});
  if(!r.ok)throw Error('Steam 游戏榜暂时无法读取');
  const data=await r.json();if(data.success!==1||typeof data.results_html!=='string')throw Error('Steam 返回了无效数据');
  const games=parseSteamGames(data.results_html);
  if(!games.length&&Number(data.total_count)>page*100)throw Error('Steam 游戏榜格式已变化');
  for(const g of games)if(upcoming?(!g.releaseDate||g.releaseDate>=today):(g.releaseDate>=year+'-01-01'&&g.releaseDate<=today))items.set(g.id,g);
  if(upcoming||(page+1)*100>=Number(data.total_count)||!games.length){complete=true;break;}
 }
 const list=[...items.values()];if(!upcoming)list.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));
 const data={items:list.slice(0,upcoming?5:Infinity),year,complete,updatedAt:now.toISOString(),source:'Steam '+(upcoming?'热门即将推出':'热门新品'),sourceUrl:'https://store.steampowered.com/search/?filter='+(upcoming?'popularcomingsoon':'popularnew')};
 if(fetcher===fetch){for(const [k,v] of cache)if(v.expires<=Date.now())cache.delete(k);cache.set(key,{data,expires:Date.now()+3600000});}return data;
}
