const decode=s=>s.replace(/<[^>]*>/g,' ').replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export const PS_SOURCE='https://www.playstation.com/zh-hans-hk/ps5/games/';
const chinese=s=>/[\u3400-\u9fff]/.test(s);
const canonical=s=>s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\u3400-\u9fff]/g,'');
export function parsePlayStationGames(html){
 const headings=[...html.matchAll(/<h([35])\b[^>]*>([\s\S]*?)<\/h\1>/g)],games=[];
 for(let i=0;i<headings.length;i++){
  const h=headings[i],chunk=html.slice(h.index,headings[i+1]?.index||html.length),text=decode(chunk),date=text.match(/发布日期\s*[：:]\s*(\d{4}年(?:(\d{1,2})月(?:(\d{1,2})日)?)?|待定)/);
  if(!date)continue;
  const button=[...chunk.matchAll(/<a\b[^>]*>/g)].find(([tag])=>/class="[^"]*btn--cta/.test(tag));
  const link=button?.[0].match(/href="(\/zh-hans-hk\/games\/[^"?#]+)"/);if(!link)continue;
  const slug=link[1].split('/').filter(Boolean).at(-1),title=decode(h[2]);
  const releaseDate=date[2]&&date[3]?date[1].slice(0,4)+'-'+date[2].padStart(2,'0')+'-'+date[3].padStart(2,'0'):'';
  const before=html.slice(Math.max(0,h.index-25000),h.index),images=[...before.matchAll(/(?:src|data-src)="(https:\/\/gmedia\.playstation\.com\/[^"<>]+)"/g)];
  games.push({id:'ps:'+slug,title,originalTitle:slug.replace(/-/g,' '),releaseDate,releaseLabel:date[1],coverUrl:images.length?decode(images.at(-1)[1]).replace('$100px$','$native$'):'',platform:'PS5',url:'https://www.playstation.com'+link[1],source:'PlayStation 官方精选'});
 }
 return games;
}
export function mergeReleaseGames(steam,ps,mode){
 const result=steam.map(g=>({...g,platformReleases:[{platform:g.platform,releaseDate:g.releaseDate,releaseLabel:g.releaseLabel,url:g.url}]}));
 for(const g of ps){
  const key=canonical(g.originalTitle),match=result.find(x=>canonical(x.originalTitle||x.title)===key||canonical(x.title)===canonical(g.title));
  if(match){if(chinese(g.title)&&!chinese(match.title))match.title=g.title;match.platform+=' / PS5';match.platformReleases.push({platform:'PS5',releaseDate:g.releaseDate,releaseLabel:g.releaseLabel,url:g.url});if(mode==='released'&&g.releaseDate>match.releaseDate)match.releaseDate=g.releaseDate;}
  else result.push({...g,platformReleases:[{platform:g.platform,releaseDate:g.releaseDate,releaseLabel:g.releaseLabel,url:g.url}]});
 }
 result.sort((a,b)=>mode==='released'?b.releaseDate.localeCompare(a.releaseDate):(a.releaseDate||'9999').localeCompare(b.releaseDate||'9999'));
 if(mode!=='upcoming')return result;
 const selected=result.slice(0,5);if(ps.length&&!selected.some(g=>g.platform.includes('PS5'))){const firstPS=result.find(g=>g.platform.includes('PS5'));if(firstPS)selected.splice(Math.min(4,selected.length),1,firstPS);}return selected;
}
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
export async function getSteamReleases(mode,fetcher=fetch,now=new Date()){
 const today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),year=Number(today.slice(0,4)),key=mode+today;
 const upcoming=mode==='upcoming',items=new Map();let complete=false;
 for(let page=0;page<(upcoming?1:10);page++){
  const params=new URLSearchParams({start:String(page*100),count:upcoming?'20':'100',filter:upcoming?'popularcomingsoon':'popularnew',category1:'998',infinite:'1',l:'english'});
  if(!upcoming)params.set('sort_by','Released_DESC');
  const r=await fetcher('https://store.steampowered.com/search/results/?'+params,{signal:AbortSignal.timeout(12000),cf:{cacheTtl:3600,cacheEverything:true}});
  if(!r.ok)throw Error('Steam 游戏榜暂时无法读取');
  const data=await r.json();if(data.success!==1||typeof data.results_html!=='string')throw Error('Steam 返回了无效数据');
  const games=parseSteamGames(data.results_html);
  try{
   params.set('l','schinese');const zhResponse=await fetcher('https://store.steampowered.com/search/results/?'+params,{signal:AbortSignal.timeout(12000),cf:{cacheTtl:3600,cacheEverything:true}});
   if(zhResponse.ok){const zh=await zhResponse.json(),names=new Map(parseSteamGames(zh.results_html||'').map(g=>[g.id,g.title]));for(const g of games){g.originalTitle=g.title;const name=names.get(g.id);if(name&&chinese(name)){const pieces=name.split(/ \/ | - /),zh=pieces.filter(chinese);g.title=zh.length&&pieces.length>1?zh.join(' / '):name;}}}
  }catch{/* Keep original titles if localization is temporarily unavailable. */}
  if(!games.length&&Number(data.total_count)>page*100)throw Error('Steam 游戏榜格式已变化');
  for(const g of games)if(upcoming?(!g.releaseDate||g.releaseDate>=today):(g.releaseDate>=year+'-01-01'&&g.releaseDate<=today))items.set(g.id,g);
  if(upcoming||(page+1)*100>=Number(data.total_count)||!games.length){complete=true;break;}
 }
 const list=[...items.values()];if(!upcoming)list.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));
 return {items:list,year,complete,updatedAt:now.toISOString(),source:'Steam '+(upcoming?'热门即将推出':'热门新品'),sourceUrl:'https://store.steampowered.com/search/?filter='+(upcoming?'popularcomingsoon':'popularnew')};
}
export async function getGameReleases(mode,fetcher=fetch,now=new Date()){
 const today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),year=Number(today.slice(0,4)),key=mode+today;
 if(fetcher===fetch&&cache.get(key)?.expires>Date.now())return cache.get(key).data;
 const [steamResult,psResult]=await Promise.allSettled([getSteamReleases(mode,fetcher,now),(async()=>{const r=await fetcher(PS_SOURCE,{signal:AbortSignal.timeout(12000),cf:{cacheTtl:3600,cacheEverything:true}});if(!r.ok)throw Error('PlayStation 读取失败');const games=parsePlayStationGames(await r.text());if(!games.length)throw Error('PlayStation 页面格式已变化');return games.filter(g=>mode==='upcoming'?(!g.releaseDate||g.releaseDate>today):(g.releaseDate>=year+'-01-01'&&g.releaseDate<=today));})()]);
 if(steamResult.status==='rejected'&&psResult.status==='rejected')throw Error('游戏榜暂时无法读取');
 const steam=steamResult.status==='fulfilled'?steamResult.value:null,ps=psResult.status==='fulfilled'?psResult.value:[];
 const warnings=[];if(!steam)warnings.push('Steam 数据暂不可用');if(psResult.status==='rejected')warnings.push('PlayStation 数据暂不可用');
 const data={items:mergeReleaseGames(steam?.items||[],ps,mode),year,complete:!!steam?.complete&&psResult.status==='fulfilled',updatedAt:now.toISOString(),warnings,source:'Steam 热门榜 + PlayStation 官方精选',sourceUrl:steam?.sourceUrl||PS_SOURCE,psSourceUrl:PS_SOURCE};
 if(fetcher===fetch&&!warnings.length){for(const [k,v] of cache)if(v.expires<=Date.now())cache.delete(k);cache.set(key,{data,expires:Date.now()+3600000});}return data;
}
