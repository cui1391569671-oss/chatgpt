import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';

test('authenticated static assets revalidate without retransmitting unchanged bundles',async()=>{
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p'};
 for(const path of ['/assets/tasks.js','/assets/tasks.css','/assets/tasks.LICENSE.txt','/assets/ilamy-3.2.1.js','/assets/ilamy-3.2.1.css','/assets/calendar.js.LEGAL.txt']){
  const url='https://test.local'+path,headers={Authorization:'Basic '+btoa('u:p')};
  const first=await worker.fetch(new Request(url,{headers}),env);
  assert.equal(first.status,200);
  const etag=first.headers.get('ETag');assert.match(etag,/^"[a-f0-9]{64}"$/);
  assert.ok((await first.text()).length>0);
  const cached=await worker.fetch(new Request(url,{headers:{...headers,'If-None-Match':'"old", W/'+etag}}),env);
  assert.equal(cached.status,304);assert.equal(await cached.text(),'');
  assert.equal(cached.headers.get('Cache-Control'),'private, max-age=0, must-revalidate');
  assert.equal((await worker.fetch(new Request(url,{headers:{'If-None-Match':etag}}),env)).status,401);
  const stale=await worker.fetch(new Request(url,{headers:{...headers,'If-None-Match':'"stale"'}}),env);
  assert.equal(stale.status,200);assert.equal(stale.headers.get('ETag'),etag);
  const head=await worker.fetch(new Request(url,{method:'HEAD',headers}),env);
  assert.equal(head.status,200);assert.equal(head.headers.get('ETag'),etag);assert.equal(await head.text(),'');
 }
});
