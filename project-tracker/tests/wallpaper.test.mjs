import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';
test('workspace wallpaper is authenticated WebP with correct HEAD and method behavior',async()=>{
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p'},url='https://test.local/assets/workspace-wallpaper.webp',headers={Authorization:'Basic '+btoa('u:p')};
 assert.equal((await worker.fetch(new Request(url),env)).status,401);
 const image=await worker.fetch(new Request(url,{headers}),env);
 assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/webp');
 const bytes=new Uint8Array(await image.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(8,12)),'WEBP');
 assert.ok(bytes.length<100000,'Wallpaper should remain lightweight');
 const head=await worker.fetch(new Request(url,{headers,method:'HEAD'}),env);assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
 assert.equal((await worker.fetch(new Request(url,{headers,method:'POST'}),env)).status,405);
});
