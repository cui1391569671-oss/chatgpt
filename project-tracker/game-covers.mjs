export async function findGameCover(title,fetcher=fetch){
 for(const lang of ['zh','en']){
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'600',pilicense:'any',titles:title});
  try{const r=await fetcher('https://'+lang+'.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':'WorkbenchGameCover/1.0 (personal game library)'},signal:AbortSignal.timeout(7000)});if(!r.ok)continue;const data=await r.json();const page=(data.query?.pages||[]).find(p=>p.thumbnail?.source&&!p.missing);
   if(page&&/^https:\/\/upload\.wikimedia\.org\//.test(page.thumbnail.source))return {coverUrl:page.thumbnail.source,matchedTitle:page.title,sourceUrl:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)};
  }catch{}
 }
 return {coverUrl:'',matchedTitle:'',sourceUrl:''};
}
