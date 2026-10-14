import {parseSteamGames} from './game-releases.mjs';
const ALIASES=[['黑神话悟空','Black Myth: Wukong'],['剑星','Stellar Blade'],['33号远征队','Clair Obscur: Expedition 33'],['光与影33号远征队','Clair Obscur: Expedition 33'],['博德之门3','Baldur’s Gate 3'],['艾尔登法环','Elden Ring'],['传送门2','Portal 2'],['无主之地1','Borderlands'],['无主之地2','Borderlands 2'],['无主之地3','Borderlands 3'],['无主之地4','Borderlands 4']];
export const normalizeGameName=s=>s.normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/\b(viii|vii|vi|iv|iii|ii|ix|v|x|i)\b/g,n=>({i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10}[n])).replace(/[^a-z0-9\u3400-\u9fff]/g,'');
export function isOfficialPortraitUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&(/(^|\.)steamstatic\.com$/.test(u.hostname)&&/\/\d+\/library_600x900\.(jpg|png)$/.test(u.pathname));}catch{return false;}}
const KNOWN_STEAM_GAMES=[
 {id:'8980',title:'Borderlands Game of the Year',names:['无主之地','无主之地1','无主之地 1','Borderlands','Borderlands 1','Borderlands I','Borderlands GOTY','Borderlands Game of the Year','Borderlands Game of the Year Edition','无主之地1年度版']},
 {id:'729040',title:'Borderlands Game of the Year Enhanced',names:['Borderlands Game of the Year Enhanced','Borderlands GOTY Enhanced','无主之地1增强版','无主之地1年度增强版','无主之地年度版增强版']}
];
export async function findGameCover(title,fetcher=fetch){
 const known=KNOWN_STEAM_GAMES.find(g=>g.names.some(n=>normalizeGameName(n)===normalizeGameName(title.trim())));if(known)return {coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/'+known.id+'/library_600x900.jpg',matchedTitle:known.title,sourceUrl:'https://store.steampowered.com/app/'+known.id+'/'};
 const original=title.trim(),alias=ALIASES.find(group=>group.some(x=>normalizeGameName(x)===normalizeGameName(original))),queries=[...new Set([original,...(alias||[])])],wanted=new Set(queries.map(normalizeGameName));const candidates=new Map();
 for(const term of queries){await Promise.all(['schinese','english'].map(async lang=>{try{const params=new URLSearchParams({term,category1:'998',infinite:'1',l:lang,count:'25',start:'0'});const r=await fetcher('https://store.steampowered.com/search/results/?'+params,{signal:AbortSignal.timeout(7000)});if(!r.ok)return;const data=await r.json();for(const g of parseSteamGames(data.results_html||'')){if(g.title.split(/ \/ | - /).some(t=>wanted.has(normalizeGameName(t))))candidates.set(g.id,g);}}catch{}}));if(candidates.size)break;}
 if(candidates.size===1){const game=[...candidates.values()][0];return {coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/'+game.id+'/library_600x900.jpg',matchedTitle:game.title,sourceUrl:game.url};}
 return {coverUrl:'',matchedTitle:'',sourceUrl:'',reason:candidates.size>1?'ambiguous':'not_found'};
}
export async function findMediaCover(title,fetcher=fetch){
 for(const lang of ['zh','en']){try{const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'600',pilicense:'any',titles:title});const r=await fetcher('https://'+lang+'.wikipedia.org/w/api.php?'+params,{signal:AbortSignal.timeout(7000)});if(!r.ok)continue;const data=await r.json(),page=(data.query?.pages||[]).find(p=>p.thumbnail?.source&&!p.missing);if(page&&/^https:\/\/upload\.wikimedia\.org\//.test(page.thumbnail.source))return {coverUrl:page.thumbnail.source,matchedTitle:page.title,sourceUrl:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)};}catch{}}
 return {coverUrl:'',matchedTitle:'',sourceUrl:''};
}
