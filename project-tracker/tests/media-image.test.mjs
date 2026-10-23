import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedCoverImage,mediaImageRoute} from '../media-image.mjs';
import worker from './helpers/session-worker.mjs';
const url='https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1/library_600x900.jpg';
const request=(source=url,method='GET')=>new Request('https://site.test/api/media/image?'+new URLSearchParams({url:source}),{method});
test('cover image delivery rejects arbitrary hosts, credentials, ports, SVG and unauthenticated access',async()=>{
 for(const bad of ['http://shared.fastly.steamstatic.com/a.jpg','https://127.0.0.1/a.jpg','https://images.igdb.com.evil.test/a.jpg','https://u:p@images.igdb.com/a.jpg','https://images.igdb.com:444/a.jpg','https://images.igdb.com/a.svg'])assert.equal(allowedCoverImage(bad),null);
 assert.equal((await mediaImageRoute(request('https://127.0.0.1/a.jpg'))).status,400);
 assert.equal((await worker.fetch(request(),{TRACKER_USER:'u',TRACKER_PASSWORD:'p'})).status,401);
});
test('image cache survives repeat visits, normalizes tracking strings and never forwards session headers',async()=>{
 const entries=new Map();let calls=0;
 const cache={match:async key=>entries.get(key.url)?.clone(),put:async(key,response)=>entries.set(key.url,response)};
 const fetcher=async(source,options)=>{calls++;assert.equal(source,url.replace('shared.fastly.','shared.akamai.'));assert.equal(options.redirect,'manual');assert.equal(options.headers.Cookie,undefined);return new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}});};
 for(const suffix of ['?utm_source=one','?utm_source=two']){const r=await mediaImageRoute(request(url+suffix),{fetcher,cache});assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/^private/);assert.equal((await r.arrayBuffer()).byteLength,4);}
 assert.equal(calls,1);assert.equal((await mediaImageRoute(request(url,'HEAD'),{fetcher,cache})).body,null);
});
test('redirects, HTML, oversized images and upstream failures are not cached',async()=>{
 let writes=0;const cache={match:async()=>null,put:async()=>{writes++;}};
 for(const response of [new Response(null,{status:302,headers:{Location:'http://127.0.0.1'}}),new Response('<html>',{headers:{'Content-Type':'text/html'}}),new Response('x',{headers:{'Content-Type':'image/jpeg','Content-Length':'2500001'}}),new Response(new Uint8Array(2500001),{headers:{'Content-Type':'image/jpeg'}})]){
  const result=await mediaImageRoute(request(),{cache,fetcher:async()=>response});assert.equal(result.status,502);assert.equal(result.headers.get('Cache-Control'),'no-store');
 }
 assert.equal(writes,0);assert.equal((await mediaImageRoute(request(),{cache,fetcher:async()=>{throw Error();}})).status,502);
});

test('unavailable cache still serves artwork and Steam artwork versions remain distinct',async()=>{
 const seen=[];const fetcher=async url=>{seen.push(url);return new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}});};const cache={match:async()=>{throw Error();},put:async()=>{throw Error();}};
 for(const version of ['1','2'])assert.equal((await mediaImageRoute(request(url+'?t='+version),{fetcher,cache})).status,200);
 assert.ok(seen[0].endsWith('?t=1'));assert.ok(seen[1].endsWith('?t=2'));
});
