import test from 'node:test';
import assert from 'node:assert/strict';
import {dailySentence} from '../daily-sentence.mjs';
import worker from './helpers/session-worker.mjs';
const words=[{example:'Keep moving forward.\nTake your time.'},{example:'We can do this.'}];
test('Beijing midnight rotates the sentence, while refresh and input order stay stable',()=>{
 const before=dailySentence(words,'2026-11-12T15:59:59Z'),after=dailySentence(words,'2026-11-12T16:00:00Z');
 assert.equal(before.date,'2026-11-12');assert.equal(after.date,'2026-11-13');assert.notEqual(before.sentence,after.sentence);
 assert.deepEqual(before,dailySentence([...words].reverse(),'2026-11-12T00:01:00Z'));
 assert.equal(new Set([12,13,14].map(day=>dailySentence(words,`2026-11-${day}T00:00:00Z`).sentence)).size,3);
});
test('examples are deduplicated without requiring translations or changing learning records',()=>{
 const input=[{example:'  Keep moving forward.\nKEEP moving forward! ',mastered:true},{example:'只有中文'},{example:7},null];const snapshot=JSON.stringify(input);
 assert.equal(dailySentence(input).sentence,'KEEP moving forward!');assert.equal(JSON.stringify(input),snapshot);
 for(const value of [[],null,[{word:'forward',meaning:'向前'}]])assert.equal(dailySentence(value).sentence,null);
});
test('daily sentence is authenticated, read-only and exposes only one personal vocabulary example',async()=>{
 let reads=0;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){return {async first(){reads++;return {version:1,payload:JSON.stringify({data:[],archive:[],projects:[],workspace:{vocabulary:[{word:'secret-word',example:'A useful sentence.',notes:'private-notes'}],notes:['private-notes']},workWorkspace:{vocabulary:[{example:'Wrong source.'}]}})};}};}}};
 const request=(method='GET',auth=true)=>new Request('https://test.local/api/daily-sentence',{method,headers:auth?{Authorization:'Basic '+btoa('u:p')}:undefined});
 assert.equal((await worker.fetch(request('GET',false),env)).status,401);assert.equal(reads,0);
 assert.equal((await worker.fetch(request('POST'),env)).status,405);assert.equal(reads,0);
 const response=await worker.fetch(request(),env);assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);
 const data=await response.json();assert.deepEqual(Object.keys(data).sort(),['date','sentence']);assert.equal(data.sentence,'A useful sentence.');assert.equal(reads,1);
});
