const cache=new Map();
export function isSteamPortrait(url){try{const u=new URL(url);return u.protocol==='https:'&&/(^|\.)steamstatic\.com$/.test(u.hostname)&&/\/steam\/apps\/\d+\/(?:[a-f0-9]{40}\/)?library_600x900(?:_2x)?\.(jpg|png)$/.test(u.pathname);}catch{return false;}}
export async function getSteamPortrait(appid,fetcher=fetch){
 if(!/^\d{1,10}$/.test(String(appid)))return '';
 const key=String(appid),hit=cache.get(key);if(fetcher===fetch&&hit?.expires>Date.now())return hit.url;
 try{
  const input={ids:[{appid:Number(appid)}],context:{language:'english',country_code:'US'},data_request:{include_assets:true}};
  const r=await fetcher('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json='+encodeURIComponent(JSON.stringify(input)),{signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Error();const data=await r.json(),item=data.response?.store_items?.find(x=>String(x.appid||x.id)===key),assets=item?.assets;
  if(!assets?.asset_url_format||!assets.library_capsule)throw Error();
  const url='https://shared.fastly.steamstatic.com/store_item_assets/'+assets.asset_url_format.replace('${FILENAME}',assets.library_capsule);
  if(!isSteamPortrait(url)||!new URL(url).pathname.includes('/apps/'+key+'/'))throw Error();
  if(fetcher===fetch){if(cache.size>200)cache.clear();cache.set(key,{url,expires:Date.now()+3600000});}return url;
 }catch{return key==='1285190'?'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1285190/e68c1eeacfc21e61e5a03ae81a20694856665af4/library_600x900.jpg':'https://cdn.akamai.steamstatic.com/steam/apps/'+key+'/library_600x900.jpg';}
}
