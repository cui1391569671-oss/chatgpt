// Authenticated image delivery; only public artwork from fixed providers is cached.
const hosts=new Set(['shared.fastly.steamstatic.com','shared.akamai.steamstatic.com','cdn.akamai.steamstatic.com','cdn.cloudflare.steamstatic.com','images.igdb.com','upload.wikimedia.org','images.launchbox-app.com','cdn.wikimg.net']);
export function allowedCoverImage(value){
 try{const u=new URL(value);return u.protocol==='https:'&&hosts.has(u.hostname)&&!u.username&&!u.password&&!u.port&&/\.(jpe?g|png|webp)$/i.test(u.pathname)?u:null;}catch{return null;}
}
export async function mediaImageRoute(request,{fetcher=fetch,cache=globalThis.caches?.default}={}){
 const fail=status=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
 if(!['GET','HEAD'].includes(request.method))return fail(405);
 const source=allowedCoverImage(new URL(request.url).searchParams.get('url'));if(!source)return fail(400);
 // Tracking query strings are not artwork identities and would fragment the cache.
 const version=source.hostname.endsWith('.steamstatic.com')?source.searchParams.get('t'):null;
 source.search='';source.hash='';if(version&&/^\d{1,16}$/.test(version))source.searchParams.set('t',version);
 if(source.hostname==='shared.fastly.steamstatic.com')source.hostname='shared.akamai.steamstatic.com';
 const key=new Request(new URL('/__cover-cache/v1/'+encodeURIComponent(source.href),request.url));
 const deliver=response=>{const headers=new Headers(response.headers);headers.set('Cache-Control','private, max-age=604800');return new Response(request.method==='HEAD'?null:response.body,{headers});};
 try{
  let hit;try{hit=await cache?.match(key);}catch{/* Cache availability must not prevent an upstream read. */}if(hit)return deliver(hit);
  const response=await fetcher(source.href,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Accept:'image/jpeg,image/png,image/webp'}});
  const type=(response.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
  if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(type)||Number(response.headers.get('Content-Length'))>2500000){await response.body?.cancel();return fail(502);}
  const reader=response.body?.getReader();if(!reader)return fail(502);let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000){await reader.cancel();return fail(502);}chunks.push(value);}
  if(!size)return fail(502);const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const image=new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=604800','X-Content-Type-Options':'nosniff'}});
  try{await cache?.put(key,image.clone());}catch{/* A cache write failure must not hide valid artwork. */}return deliver(image);
 }catch{return fail(502);}
}
