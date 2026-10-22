import test from 'node:test';
import assert from 'node:assert/strict';
import {readBoundedText,RequestBodyLimitError} from '../request-body.mjs';
test('bounded reader enforces UTF-8 byte size and cancels chunked uploads',async()=>{
 assert.equal(await readBoundedText(new Request('https://test.local',{method:'POST',body:'中文'}),6),'中文');
 await assert.rejects(()=>readBoundedText(new Request('https://test.local',{method:'POST',body:'中文'}),5),RequestBodyLimitError);
 let cancelled=false;const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}});
 await assert.rejects(()=>readBoundedText(new Request('https://test.local',{method:'POST',body,duplex:'half'}),5),RequestBodyLimitError);assert.equal(cancelled,true);
});

test('authenticated JSON and image routes return 413 before parsing or persistence',async()=>{
 const {default:worker}=await import('./helpers/session-worker.mjs');
 const env={TRACKER_USER:'synthetic',TRACKER_PASSWORD:'test'};
 const post=(path,body,type)=>new Request('https://test.local'+path,{method:'POST',headers:{Origin:'https://test.local',Authorization:'Basic '+btoa('synthetic:test'),'Content-Type':type},body});
 assert.equal((await worker.fetch(post('/api/workspace/patch?scope=work',' '.repeat(1500001),'application/json'),env)).status,413);
 assert.equal((await worker.fetch(post('/api/wardrobe-images',new Uint8Array(180001),'image/jpeg'),env)).status,413);
 assert.equal((await worker.fetch(post('/api/calendar-images/work',new Uint8Array(240001),'image/jpeg'),env)).status,413);
});
