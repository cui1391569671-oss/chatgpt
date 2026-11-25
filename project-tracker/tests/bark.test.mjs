import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {barkCandidates,barkDeviceKey,sealBarkKey,unsealBarkKey,deliverBark,BARK_DEFAULTS} from '../bark-notifications.mjs';
import {barkRoute,ensureBark,flushBark,runBark} from '../bark.mjs';
import {safeNext,loginPage} from '../auth.mjs';
import worker from '../worker.mjs';
function environment(){const sqlite=new DatabaseSync(':memory:');return {TRACKER_USER:'owner',TRACKER_PASSWORD:'synthetic',BARK_ENCRYPTION_KEY:'synthetic-encryption-key-not-for-production',DB:{prepare(sql){const statement=sqlite.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async run(){return {meta:statement.run(...args)};},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};}};}}};}
const request=(method='GET',body,path='',origin='https://test.local')=>new Request('https://test.local/api/account/bark'+path,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const settings={version:0,address:'https://api.day.app/synthetic-device',label:'测试手机',enabled:true,preferences:BARK_DEFAULTS};
async function bind(env){assert.equal((await barkRoute(request('PUT',settings),env)).status,200);}
test('Bark secrets accept only official device URLs and use randomized owner-bound encryption',async()=>{
 assert.equal(barkDeviceKey(settings.address),'synthetic-device');
 for(const value of ['http://api.day.app/secret123','https://evil.local/secret123','https://api.day.app@evil.local/secret123','https://api.day.app/secret123?x=1','https://api.day.app/secret123/extra','https://api.day.app:8443/secret123'])assert.throws(()=>barkDeviceKey(value));
 const a=await sealBarkKey('synthetic-device','x'.repeat(32),'a'),b=await sealBarkKey('synthetic-device','x'.repeat(32),'a');assert.notEqual(a,b);assert.ok(!a.includes('synthetic-device'));assert.equal(await unsealBarkKey(a,'x'.repeat(32),'a'),'synthetic-device');await assert.rejects(unsealBarkKey(a,'x'.repeat(32),'b'));await assert.rejects(unsealBarkKey(a,'y'.repeat(32),'a'));
});
test('Bark candidates select Beijing due tasks, daily summaries, recurrences and upcoming meetings with stable deep links',()=>{
 const now=Date.parse('2026-11-25T09:05:00+08:00'),state={workspace:{tasks:[{id:'p',title:'私人',dueDate:'2026-11-25'}],events:[]},workWorkspace:{tasks:[{id:'w',title:'工作',dueDate:'2026-11-25'},{id:'old',title:'旧待办',dueDate:'2025-01-01'},{id:'done',title:'已完成',done:true,dueDate:'2026-11-25'}],events:[{id:'daily',title:'重复',start:'2026-11-24T09:20',end:'2026-11-24T10:00',recurrence:{frequency:'daily',weekdays:[],until:''}},{id:'all',title:'全天',start:'2026-11-25T00:00',end:'2026-11-26T00:00',allDay:true}]},data:[{id:'issue',project:'测试',task:'异常',status:'暂停',plannedDate:''}]};
 const list=barkCandidates(state,[{id:'meeting',title:'钉钉会议',start:'2026-11-25T09:20',end:'2026-11-25T10:20'}],now);
 assert.equal(list.length,7);assert.equal(new Set(list.map(x=>x.key)).size,7);assert.ok(!list.some(x=>x.body==='已完成'));assert.equal(list.find(x=>x.kind==='projects').path,'/projects?issue=issue');assert.match(list.find(x=>x.body==='重复').path,/date=2026-11-25/);assert.match(list.find(x=>x.body==='钉钉会议').path,/source=dingtalk/);assert.equal(barkCandidates(state,[],now+3600000).length,0);
 state.workWorkspace.events[0].completedDates=['2026-11-25'];assert.ok(!barkCandidates(state,[],now).some(x=>x.body==='重复'));
});
test('Account routes require login/origin, reject oversized input, isolate owners and never return device secrets',async()=>{
 const env=environment();assert.equal((await worker.fetch(request(),env)).status,401);assert.equal((await barkRoute(request('PUT',settings,'','https://evil.local'),env)).status,403);assert.equal((await barkRoute(request('PUT',{...settings,address:'x'.repeat(5000)}),env)).status,413);
 await bind(env);const result=await (await barkRoute(request(),env)).json();assert.equal(result.bound,true);assert.equal(result.version,1);assert.ok(!JSON.stringify(result).includes('synthetic-device'));assert.equal((await barkRoute(request('PUT',settings),env)).status,409);
 assert.equal((await (await barkRoute(request(),{...env,TRACKER_USER:'other'})).json()).bound,false);
 const missing=environment();delete missing.BARK_ENCRYPTION_KEY;assert.equal((await barkRoute(request('PUT',settings),missing)).status,503);
});
async function queue(env,item={}){await ensureBark(env.DB);const now=Date.now();await env.DB.prepare('INSERT INTO bark_deliveries(id,owner,binding_version,dedup_key,due_at,payload) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'owner',(await env.DB.prepare('SELECT activated_at FROM bark_bindings').first()).activated_at,crypto.randomUUID(),now-1,JSON.stringify({kind:'test',scope:'work',title:'测试',body:'测试',path:'/work?view=home',...item})).run();return now;}
test('Concurrent background workers claim one delivery and track accepted/opened separately',async()=>{
 const env=environment();await bind(env);const now=await queue(env);let calls=0;
 const send=async(url,options)=>{calls++;assert.equal(url,'https://api.day.app/push');const data=JSON.parse(options.body);assert.equal(data.device_key,'synthetic-device');assert.match(data.url,/https:\/\/tracker.managementplatformlee.com\/work\?view=home&push=/);assert.ok(!data.url.includes('synthetic-device'));await new Promise(r=>setTimeout(r,5));return Response.json({code:200});};
 await Promise.all([flushBark(env,[],now,false,send),flushBark(env,[],now,false,send)]);assert.equal(calls,1);const row=await env.DB.prepare('SELECT * FROM bark_deliveries').first();assert.equal(row.status,'sent');assert.equal(row.opened_at,null);
 await barkRoute(request('POST',{id:row.id},'/opened'),{...env,TRACKER_USER:'other'});assert.equal((await env.DB.prepare('SELECT opened_at FROM bark_deliveries').first()).opened_at,null);
 await barkRoute(request('POST',{id:row.id},'/opened'),env);assert.ok((await env.DB.prepare('SELECT opened_at FROM bark_deliveries').first()).opened_at);
});
test('Uncertain sends and abandoned leases are not retried; definitive throttles retry at most three times',async()=>{
 const env=environment();await bind(env);const now=await queue(env);let calls=0;const failure=async()=>{calls++;throw Error('synthetic timeout');};await flushBark(env,[],now,false,failure);await flushBark(env,[],now+300000,false,failure);assert.equal(calls,1);assert.equal((await env.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'uncertain');
 const second=environment();await bind(second);await queue(second);let retries=0;const throttle=async()=>{retries++;return Response.json({code:429},{status:429});};for(let i=0;i<4;i++)await flushBark(second,[],now+i*300000,false,throttle);assert.equal(retries,3);assert.equal((await second.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'failed');
 const stale=environment();await bind(stale);await queue(stale);await stale.DB.prepare("UPDATE bark_deliveries SET status='sending',lease_at=?").bind(now-70000).run();await flushBark(stale,[],now,false,failure);assert.equal(calls,1);assert.equal((await stale.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'uncertain');
});
test('Unbinding and changing settings cancels old queued jobs and removes encrypted device key',async()=>{
 const env=environment();await bind(env);const now=await queue(env);assert.equal((await barkRoute(request('DELETE',{version:1}),env)).status,200);assert.equal((await env.DB.prepare('SELECT envelope FROM bark_bindings').first()).envelope,null);let calls=0;await flushBark(env,[],now,false,async()=>{calls++;});assert.equal(calls,0);
 await barkRoute(request('PUT',{...settings,version:2}),env);await flushBark(env,[],now+1,false,async()=>{calls++;});assert.equal(calls,0);assert.equal((await env.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'cancelled');
});
test('Binding activation and disabled categories prevent historical push floods',async()=>{
 const env=environment();await bind(env);const now=Date.now(),date=new Date(now+28800000).toISOString().slice(0,10);await runBark(env,{workspace:{tasks:[{id:'old',dueDate:date,title:'old'}]},data:[]},[],now);assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM bark_deliveries').first()).n,0);
});
test('Deep links survive login without opening redirects or HTML injection',()=>{
 const path='/work?view=tasks&task=a%26b&push=123';assert.equal(safeNext(path),path);assert.match(loginPage(path),/name="next" value="\/work\?view=tasks&task=a%26b&push=123"/);
 for(const path of ['//evil.local/work','https://evil.local/work','/\\evil.local','/auth/logout'])assert.equal(safeNext(path),'/work');assert.ok(!safeNext('/work?event=" onfocus="evil').includes('"'));
});
test('Changing a device label preserves a queued retry and uses current binding CAS on claim',async()=>{
 const env=environment();await bind(env);const now=await queue(env);let calls=0;
 await flushBark(env,[],now,false,async()=>Response.json({code:429},{status:429}));
 assert.equal((await barkRoute(request('PUT',{...settings,address:'',version:1,label:'新名称'}),env)).status,200);
 await flushBark(env,[],now+300000,false,async()=>{calls++;return Response.json({code:200});});assert.equal(calls,1);assert.equal((await env.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'sent');
});
test('Scheduled cron processes notifications without any browser request and preserves daily archive separation',async()=>{
 const env=environment();await bind(env);await queue(env);
 await env.DB.prepare('CREATE TABLE tracker_state(id INTEGER PRIMARY KEY,payload TEXT,version INTEGER)').run();const state={data:[{id:'done',done:true}],archive:[],workspace:{},workWorkspace:{}};
 await env.DB.prepare('INSERT INTO tracker_state VALUES(1,?,1)').bind(JSON.stringify(state)).run();let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({code:200});};
 try{const jobs=[];await worker.scheduled({cron:'*/5 * * * *'},env,{waitUntil:job=>jobs.push(job)});await Promise.all(jobs);assert.equal(calls,1);assert.equal((await env.DB.prepare('SELECT status FROM bark_deliveries').first()).status,'sent');assert.equal(JSON.parse((await env.DB.prepare('SELECT payload FROM tracker_state').first()).payload).data.length,1);}finally{globalThis.fetch=original;}
});
test('Bark reports only explicit success as accepted and never follows upstream redirects',async()=>{
 assert.equal(await deliverBark('synthetic',{},async(_url,options)=>{assert.equal(options.redirect,'manual');return Response.json({code:200});}),'sent');assert.equal(await deliverBark('synthetic',{},async()=>new Response('invalid')),'uncertain');assert.equal(await deliverBark('synthetic',{},async()=>Response.json({code:400},{status:400})),'failed');assert.equal(await deliverBark('synthetic',{},async()=>Response.json({code:500},{status:500})),'uncertain');
});
