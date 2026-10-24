import {getSteamPortrait,isSteamPortrait} from './steam-artwork.mjs';
import {parseSteamGames} from './game-releases.mjs';
const ALIASES=[['黑神话悟空','Black Myth: Wukong'],['剑星','Stellar Blade'],['33号远征队','Clair Obscur: Expedition 33'],['光与影33号远征队','Clair Obscur: Expedition 33'],['博德之门3','Baldur’s Gate 3'],['艾尔登法环','Elden Ring'],['传送门2','Portal 2'],['无主之地1','Borderlands'],['无主之地2','Borderlands 2'],['无主之地3','Borderlands 3'],['无主之地4','Borderlands 4']];
export function gameSearchTerms(title){
 const text=title.normalize('NFKC').trim(),match=text.match(/^(?:最终幻想|最終幻想|final\s*fantasy)\s*(\d{1,2}|[ivx]+)?\s*(.*)$/i);
 if(match){const roman=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];const value=match[1]||'',n=/^\d+$/.test(value)?Number(value):roman.indexOf(value.toUpperCase());const suffix=match[2].replace(/重制版|重製版|重制|重製/g,' Remake').replace(/重生/g,' Rebirth').trim();const prefix='Final Fantasy'+(n>0&&n<roman.length?' '+roman[n]:value?' '+value.toUpperCase():'');return [...new Set([(prefix+' '+suffix).trim(),n>0?('Final Fantasy '+n+' '+suffix).trim():text,text])];}
 const alias=ALIASES.find(group=>group.some(x=>normalizeGameName(x)===normalizeGameName(text)));
 return [...new Set([...(alias||[]).filter(x=>/[a-z]/i.test(x)),text,...(alias||[])])];
}
export const normalizeGameName=s=>s.normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/\b(viii|vii|vi|iv|iii|ii|ix|v|x|i)\b/g,n=>({i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10}[n])).replace(/[^a-z0-9\u3400-\u9fff]/g,'');
export const isOfficialPortraitUrl=isSteamPortrait;
const KNOWN_STEAM_GAMES=[
 {id:'1285190',title:'Borderlands 4',names:['无主之地4','Borderlands 4','Borderlands IV']},
 {id:'8980',title:'Borderlands Game of the Year',names:['无主之地','无主之地1','无主之地 1','Borderlands','Borderlands 1','Borderlands I','Borderlands GOTY','Borderlands Game of the Year','Borderlands Game of the Year Edition','无主之地1年度版']},
 {id:'729040',title:'Borderlands Game of the Year Enhanced',names:['Borderlands Game of the Year Enhanced','Borderlands GOTY Enhanced','无主之地1增强版','无主之地1年度增强版','无主之地年度版增强版']}
];
export async function findGameCover(title,fetcher=fetch){
 const known=KNOWN_STEAM_GAMES.find(g=>g.names.some(n=>normalizeGameName(n)===normalizeGameName(title.trim())));if(known)return {coverUrl:await getSteamPortrait(known.id,fetcher),matchedTitle:known.title,sourceUrl:'https://store.steampowered.com/app/'+known.id+'/'};
 const original=title.trim(),alias=ALIASES.find(group=>group.some(x=>normalizeGameName(x)===normalizeGameName(original))),queries=[...new Set([original,...(alias||[])])],wanted=new Set(queries.map(normalizeGameName));const candidates=new Map();
 for(const term of queries){await Promise.all(['schinese','english'].map(async lang=>{try{const params=new URLSearchParams({term,category1:'998',infinite:'1',l:lang,count:'25',start:'0'});const r=await fetcher('https://store.steampowered.com/search/results/?'+params,{signal:AbortSignal.timeout(7000)});if(!r.ok)return;const data=await r.json();for(const g of parseSteamGames(data.results_html||'')){if(g.title.split(/ \/ | - /).some(t=>wanted.has(normalizeGameName(t))))candidates.set(g.id,g);}}catch{/* This optional provider failed; continue the existing fallback search. */}}));if(candidates.size)break;}
 if(candidates.size===1){const game=[...candidates.values()][0];return {coverUrl:await getSteamPortrait(game.id,fetcher),matchedTitle:game.title,sourceUrl:game.url};}
 return {coverUrl:'',matchedTitle:'',sourceUrl:'',reason:candidates.size>1?'ambiguous':'not_found'};
}
export async function findMovieCovers(title,fetcher=fetch){
 const candidates=new Map();let available=false;
 await Promise.all(['zh','en'].map(async lang=>{try{
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrsearch:'intitle:'+JSON.stringify(title.trim())+' '+(lang==='zh'?'电影':'film'),gsrlimit:'30',prop:'pageimages|extracts|categories',piprop:'thumbnail',pithumbsize:'600',pilicense:'any',pilimit:'50',exintro:'1',explaintext:'1',exsentences:'2',exlimit:'max',cllimit:'30'});
  const r=await fetcher('https://'+lang+'.wikipedia.org/w/api.php?'+params,{signal:AbortSignal.timeout(8000)});if(!r.ok)return;available=true;
  const found=(await r.json()).query?.pages||[];const exactParams=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:title.trim(),prop:'pageimages|extracts|categories',piprop:'thumbnail',pithumbsize:'600',pilicense:'any',exintro:'1',explaintext:'1',exsentences:'2',cllimit:'30'});try{const exact=await fetcher('https://'+lang+'.wikipedia.org/w/api.php?'+exactParams,{signal:AbortSignal.timeout(7000)});if(exact.ok)found.unshift(...((await exact.json()).query?.pages||[]));}catch{/* This optional provider failed; continue the existing fallback search. */}
  for(const p of found){const description=p.extract||'',categories=(p.categories||[]).map(x=>x.title).join(' '),coverUrl=p.thumbnail?.source||'';
   if(!/^https:\/\/upload\.wikimedia\.org\//.test(coverUrl)||!(/(电影|電影|\bfilms?\b)/i.test(categories+' '+p.title)||/(?:是|为|為).{0,80}(?:电影|電影)|(?:is|was) (?:a|an) .{0,100}film\b/i.test(description)))continue;
   if(p.thumbnail.width&&p.thumbnail.height&&p.thumbnail.width>=p.thumbnail.height)continue;
   candidates.set(coverUrl,{matchedTitle:p.title,coverUrl,date:(description.match(/(?:19|20)\d{2}/)||p.title.match(/(?:19|20)\d{2}/)||[])[0]||'',sourceUrl:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),index:p.index||0});
  }
 }catch{/* This optional provider failed; continue the existing fallback search. */}}));
 const results=[...candidates.values()].sort((a,b)=>a.index-b.index);
 return {coverUrl:'',matchedTitle:'',sourceUrl:'',candidates:results,reason:results.length?'selection_required':available?'not_found':'unavailable'};
}
export async function findMediaCover(title,fetcher=fetch){
 for(const lang of ['zh','en']){try{const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'600',pilicense:'any',titles:title});const r=await fetcher('https://'+lang+'.wikipedia.org/w/api.php?'+params,{signal:AbortSignal.timeout(7000)});if(!r.ok)continue;const data=await r.json(),page=(data.query?.pages||[]).find(p=>p.thumbnail?.source&&!p.missing);if(page&&/^https:\/\/upload\.wikimedia\.org\//.test(page.thumbnail.source))return {coverUrl:page.thumbnail.source,matchedTitle:page.title,sourceUrl:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)};}catch{/* This optional provider failed; continue the existing fallback search. */}}
 return {coverUrl:'',matchedTitle:'',sourceUrl:''};
}

export async function findAnimeCover(title,fetcher=fetch){
 const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const keyword=title.trim().replace(/\s*(?:第[一二三四五六七八九十百\d]+[季期部]|season\s*\d+)\s*$/i,'').trim()||title.trim();
 const subjects=new Map();let truncated=false;
 try{
  for(let offset=0;offset<200;offset+=50){
   const r=await fetcher('https://api.bgm.tv/v0/search/subjects?limit=50&offset='+offset,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Workbench/1.0 (https://github.com/cui1391569671-oss/chatgpt)'},body:JSON.stringify({keyword,filter:{type:[2]}}),signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error();const data=await r.json(),rows=data.data||[];
   for(const x of rows){const coverUrl=x.images?.large||x.images?.common||'';if(x.type===2&&[x.name,x.name_cn].some(n=>normalize(n).startsWith(normalize(keyword)))&&/^https:\/\/lain\.bgm\.tv\//.test(coverUrl))subjects.set(x.id,{id:x.id,matchedTitle:x.name_cn||x.name,originalTitle:x.name||'',coverUrl,date:x.date||'',sourceUrl:'https://bgm.tv/subject/'+x.id});}
   truncated=Number(data.total)>offset+rows.length;if(!truncated||rows.length<50)break;
  }
  const candidates=[...subjects.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.matchedTitle.localeCompare(b.matchedTitle));
  const exact=candidates.filter(x=>[x.matchedTitle,x.originalTitle].some(n=>normalize(n)===normalize(title)));
  return {...(exact.length===1?exact[0]:{coverUrl:'',matchedTitle:'',sourceUrl:'',reason:exact.length>1?'ambiguous':'not_found'}),candidates,truncated};
 }catch{return {coverUrl:'',matchedTitle:'',sourceUrl:'',candidates:[],reason:'unavailable'};}
}
