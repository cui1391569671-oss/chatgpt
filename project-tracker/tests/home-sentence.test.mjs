import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function page(fetch){
 const heading={textContent:'',classList:{toggle(){}}},status={textContent:''},time={};
 const context=vm.createContext({view:'home',ready:true,date:'2026-11-12',day:()=>context.date,AbortController,fetch,window:{addEventListener(){}},document:{hidden:false,querySelector:selector=>selector==='[data-home-sentence]'?heading:selector==='[data-home-sentence-status]'?status:time}});
 vm.runInContext(readFileSync(new URL('../home-sentence-adapter.js',import.meta.url),'utf8'),context);
 return {context,heading,status,time,run:code=>vm.runInContext(code,context)};
}
test('home caches each day and rolls over date and sentence without rebuilding the page',async()=>{
 let calls=0;const p=page(async()=>{calls++;return {ok:true,json:async()=>({date:p.context.date,sentence:calls===1?'Today’s example.':'Tomorrow’s example.'})};});
 await p.run('refreshHomeSentence()');await p.run('refreshHomeSentence()');assert.equal(calls,1);assert.equal(p.heading.textContent,'Today’s example.');assert.equal(p.heading.lang,'en');
 p.context.date='2026-11-13';await p.run('refreshHomeSentence()');assert.equal(calls,2);assert.equal(p.heading.textContent,'Tomorrow’s example.');assert.equal(p.time.dateTime,'2026-11-13');
});
test('empty and failed reads are honest and failure can recover on the next poll',async()=>{
 let fail=true;const p=page(async()=>({ok:!fail,json:async()=>({date:p.context.date,sentence:null})}));
 await p.run('refreshHomeSentence()');assert.match(p.status.textContent,/无法读取/);fail=false;await p.run('refreshHomeSentence()');assert.match(p.status.textContent,/暂无英文例句/);assert.equal(p.heading.lang,'zh-CN');
});
test('cancelled or stale requests cannot replace the current home sentence',async()=>{
 let resolve,signal;const p=page((_url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r;});});
 const pending=p.run('refreshHomeSentence()');p.context.view='notes';p.run('cancelHomeSentence()');assert(signal.aborted);
 resolve({ok:true,json:async()=>({date:'2026-11-12',sentence:'Stale.'})});await pending;assert.notEqual(p.heading.textContent,'Stale.');
 p.context.view='home';p.context.document.hidden=true;await p.run('refreshHomeSentence()');
});
