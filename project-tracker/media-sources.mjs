import {validMediaIdentity} from './media-tracking.mjs';
import {findAnimeCover,findGameCover,gameSearchTerms} from './game-covers.mjs';
import {getSteamPortrait} from './steam-artwork.mjs';
const tokenCache=new Map(),responseCache=new Map();
const numeric=id=>/^\d{1,12}$/.test(String(id));
const safeImage=(value,hosts)=>{try{const u=new URL(value);return u.protocol==='https:'&&hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:'';}catch{return '';}};
const poster=path=>typeof path==='string'&&/^\/[a-zA-Z0-9._-]+$/.test(path)?'https://image.tmdb.org/t/p/w500'+path:'';
const timestamp=value=>Number.isFinite(value)&&value>0?new Date(value*1000).toISOString().slice(0,10):'';
const userAgent='Workbench/1.0 (https://github.com/cui1391569671-oss/chatgpt)';
const tmdbToken=env=>env.TMDB_API_TOKEN||env.TMDB_API||env.TMDB_API_KEY;
const igdbId=env=>env.IGDB_CLIENT_ID||env.IGDB_ID;
const malId=env=>env.MAL_CLIENT_ID||env.MAL_API;
async function jsonFetch(url,options,fetcher){const r=await fetcher(url,{...options,signal:AbortSignal.timeout(10000)});if(!r.ok){const error=Error('Provider unavailable');error.status=r.status;throw error;}return r.json();}
async function tmdb(path,query,env,fetcher){
 const credential=tmdbToken(env);if(!credential)throw Error('Not configured');const url=new URL('https://api.themoviedb.org/3/'+path);url.search=new URLSearchParams({language:'zh-CN',...query});
 const headers={Accept:'application/json'};if(/^[a-f\d]{32}$/i.test(credential))url.searchParams.set('api_key',credential);else headers.Authorization='Bearer '+credential;
 return jsonFetch(url.href,{headers},fetcher);
}
function tmdbCandidate(x,type){return {source:'tmdb',sourceId:String(x.id),mediaType:type,matchedTitle:x.title||x.name||'',originalTitle:x.original_title||x.original_name||'',date:x.release_date||x.first_air_date||'',coverUrl:poster(x.poster_path),sourceUrl:'https://www.themoviedb.org/'+(type==='movie'?'movie':'tv')+'/'+x.id,total:type==='tv'?x.number_of_episodes||0:0};}
async function igdbToken(env,fetcher,refresh=false){
 const id=igdbId(env),secret=env.IGDB_CLIENT_SECRET||env.IGDB_SECRET;if(!id||!secret)throw Error('Not configured');
 const cacheKey=id+':'+secret,hit=tokenCache.get(cacheKey);if(!refresh&&hit&&hit.expires>Date.now()+60000)return hit.token;
 const data=await jsonFetch('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,client_secret:secret,grant_type:'client_credentials'}).toString()},fetcher);
 if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in))throw Error('Invalid token');
 if(tokenCache.size>10)tokenCache.clear();tokenCache.set(cacheKey,{token:data.access_token,expires:Date.now()+data.expires_in*1000});return data.access_token;
}
async function igdb(body,env,fetcher){
 for(let retry=0;retry<2;retry++){const token=await igdbToken(env,fetcher,!!retry);try{return await jsonFetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':igdbId(env),Authorization:'Bearer '+token,'Content-Type':'text/plain'},body},fetcher);}catch(e){if(e.status!==401||retry)throw e;}}
}
function igdbCandidate(x){
 const image=x.cover?.image_id;const steam=(x.websites||[]).map(w=>String(w.url||'').match(/^https?:\/\/store\.steampowered\.com\/app\/(\d{1,10})(?:\/|$)/)).find(Boolean);
 return {source:'igdb',sourceId:String(x.id),mediaType:'game',matchedTitle:x.name||'',originalTitle:x.name||'',date:timestamp(x.first_release_date),coverUrl:typeof image==='string'&&/^[a-zA-Z\d_-]+$/.test(image)?'https://images.igdb.com/igdb/image/upload/t_cover_big/'+image+'.jpg':'',platforms:(x.platforms||[]).map(p=>p.name).filter(Boolean).join(' / '),steamAppId:steam?.[1]||'',sourceUrl:x.slug?'https://www.igdb.com/games/'+encodeURIComponent(x.slug):'https://www.igdb.com'};
}
function malCandidate(x){return {source:'mal',sourceId:String(x.id),mediaType:'anime',matchedTitle:x.title||'',originalTitle:x.alternative_titles?.ja||x.title||'',date:x.start_date||'',coverUrl:safeImage(x.main_picture?.large||x.main_picture?.medium,['cdn.myanimelist.net']),sourceUrl:'https://myanimelist.net/anime/'+x.id,total:x.num_episodes||0};}
function bangumiCandidate(x){return {source:'bangumi',sourceId:String(x.id),mediaType:'anime',matchedTitle:x.name_cn||x.name||x.matchedTitle||'',originalTitle:x.name||x.originalTitle||'',date:x.date||'',coverUrl:safeImage(x.images?.large||x.images?.common||x.coverUrl,['lain.bgm.tv']),sourceUrl:'https://bgm.tv/subject/'+x.id,total:x.eps||0};}
function steamCandidate(x){const id=String(x.sourceUrl||'').match(/\/app\/(\d+)/)?.[1];return id?{source:'steam',sourceId:id,mediaType:'game',matchedTitle:x.matchedTitle,originalTitle:x.matchedTitle,date:'',coverUrl:x.coverUrl||'',sourceUrl:x.sourceUrl,steamAppId:id}:null;}
const igdbFields='fields name,slug,cover.image_id,first_release_date,platforms.name,websites.url;';
export async function searchMediaSources(type,title,env,fetcher=fetch){
 const candidates=[],warnings=[];const task=async(name,enabled,fn)=>{if(!enabled){warnings.push(name+' 尚未配置');return;}try{candidates.push(...await fn());}catch{warnings.push(name+' 暂时不可用');}};
 if(['movie','tv'].includes(type))await task('TMDB',!!tmdbToken(env),async()=>((await tmdb('search/'+type,{query:title,include_adult:'false'},env,fetcher)).results||[]).slice(0,20).map(x=>tmdbCandidate(x,type)));
 if(type==='game'){
  const terms=gameSearchTerms(title);
  await task('IGDB',!!igdbId(env)&&!!(env.IGDB_CLIENT_SECRET||env.IGDB_SECRET),async()=>{for(const term of terms.slice(0,3)){const rows=await igdb(igdbFields+' search '+JSON.stringify(term)+'; limit 20;',env,fetcher);if(rows.length)return rows.map(igdbCandidate);}return [];});
  if(!candidates.some(x=>x.coverUrl))await task('Steam',true,async()=>{for(const term of [...new Set([title,...terms])].slice(0,4)){const x=steamCandidate(await findGameCover(term,fetcher));if(x?.coverUrl)return [x];}return [];});
 }
 if(type==='anime')await Promise.all([
  task('Bangumi',true,async()=>{const result=await findAnimeCover(title,fetcher);if(result.reason==='unavailable')throw Error();return (result.candidates||[]).map(bangumiCandidate);}),
  task('MyAnimeList',!!malId(env),async()=>((await jsonFetch('https://api.myanimelist.net/v2/anime?'+new URLSearchParams({q:title,limit:'20',fields:'start_date,num_episodes,alternative_titles'}),{headers:{'X-MAL-CLIENT-ID':malId(env)}},fetcher)).data||[]).map(x=>malCandidate(x.node)))
 ]);
 const seen=new Set();return {candidates:candidates.filter(x=>numeric(x.sourceId)&&x.matchedTitle&&!seen.has(x.source+':'+x.sourceId)&&(seen.add(x.source+':'+x.sourceId),true)).slice(0,40),warnings};
}
export async function mediaSourceDetails(source,id,type,season,env,fetcher=fetch){
 if(!validMediaIdentity({mediaSource:source,mediaSourceId:id,mediaType:type}))throw Error('Invalid source');let result;
 if(source==='tmdb'){
  result=tmdbCandidate(await tmdb(type+'/'+id,{},env,fetcher),type);
  if(type==='tv'&&season>0){const row=await tmdb('tv/'+id+'/season/'+season,{},env,fetcher);result={...result,coverUrl:poster(row.poster_path)||result.coverUrl,total:row.episodes?.length||0,season};}
 }else if(source==='igdb'){const rows=await igdb(igdbFields+' where id = '+id+'; limit 1;',env,fetcher);if(!rows[0])throw Error('Not found');result=igdbCandidate(rows[0]);}
 else if(source==='mal')result=malCandidate(await jsonFetch('https://api.myanimelist.net/v2/anime/'+id+'?fields=start_date,num_episodes,alternative_titles',{headers:{'X-MAL-CLIENT-ID':malId(env)||''}},fetcher));
 else if(source==='bangumi'){const row=await jsonFetch('https://api.bgm.tv/v0/subjects/'+id,{headers:{'User-Agent':userAgent}},fetcher);if(row.type!==2)throw Error('Wrong media type');result=bangumiCandidate(row);}
 else if(source==='steam')result={source,sourceId:id,mediaType:type,coverUrl:await getSteamPortrait(id,fetcher),steamAppId:id,sourceUrl:'https://store.steampowered.com/app/'+id+'/'};
 if(!result||result.sourceId!==id)throw Error('Wrong media ID');return result;
}
export async function mediaSourcesRoute(request,env){
 const url=new URL(request.url),type=url.searchParams.get('type'),reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return reply({error:'不支持的操作'},405);
 if(!['movie','tv','game','anime'].includes(type))return reply({error:'作品类型不正确'},400);
 const title=(url.searchParams.get('q')||'').trim(),source=url.searchParams.get('source'),id=url.searchParams.get('id'),season=Number(url.searchParams.get('season')||0),details=url.pathname.endsWith('/details');
 if(details?(!validMediaIdentity({mediaSource:source,mediaSourceId:id,mediaType:type})||!Number.isInteger(season)||season<0||season>100000):(!title||title.length>200))return reply({error:'查询条件不正确'},400);
 const credentials=JSON.stringify([tmdbToken(env),igdbId(env),env.IGDB_CLIENT_SECRET||env.IGDB_SECRET,malId(env)]),key=credentials+'|'+url.pathname+'|'+url.search;
 const cached=responseCache.get(key);if(cached?.expires>Date.now())return reply(cached.data);
 try{const data=details?await mediaSourceDetails(source,id,type,season,env):await searchMediaSources(type,title,env);if(responseCache.size>200)responseCache.clear();if(details||!data.warnings.length)responseCache.set(key,{data,expires:Date.now()+300000});return reply(data);}catch{return reply({error:'作品资料暂时无法读取，请稍后重试。'},502);}
}
