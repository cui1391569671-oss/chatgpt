import {test} from 'node:test';import assert from 'node:assert/strict';import {validCheckin,setDailyCheckin} from './checkin-records.mjs';import {validWorkspace} from './worker.mjs';
test('manual daily check-ins are idempotent, reversible and separate by day and type',()=>{const now='2026-10-23T01:00:00Z';let rows=setDailyCheckin([],'english','2026-10-23',true,now);rows=setDailyCheckin(rows,'english','2026-10-23',true,now);assert.equal(rows.length,1);rows=setDailyCheckin(rows,'fitness','2026-10-23',true,now);rows=setDailyCheckin(rows,'english','2026-10-24',true,now);rows=setDailyCheckin(rows,'english','2026-10-23',false,now);assert.equal(rows.length,2);assert.ok(rows.every(validCheckin));assert.equal(validCheckin({...rows[0],date:'2026-02-30'}),false);assert.ok(validWorkspace({tasks:[],notes:[],events:[],checkins:rows}));assert.equal(validWorkspace({tasks:[],notes:[],events:[],checkins:[rows[0],rows[0]]}),false);});

import worker from './tests/helpers/session-worker.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS} from './cloud-records.mjs';
const plan={id:'2026-10-23:english',kind:'english',date:'2026-10-23',completedAt:'2026-10-23T01:00:00Z'};
test('manual check-ins persist privately, reject work writes and preserve field conflict checks',async()=>{
 let payload=JSON.stringify({data:[],archive:[],priorities:{},projects:[],workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]}}),version=1;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...v){args=v;return this;},async first(){return {payload,version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=args[0];version++;return {meta:{changes:1}};}};}}};
 const request=(scope,body)=>new Request('https://test.local/api/workspace'+(body?'/patch':'')+'?scope='+scope,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const base={tasks:[],notes:[],events:[]},next={...base,checkins:[plan]},operations=recordChanges(base,next,WORKSPACE_COLLECTIONS);
 assert.equal((await worker.fetch(request('work',{operations}),env)).status,400);
 assert.equal((await worker.fetch(request('personal',{operations}),env)).status,200);
 assert.deepEqual((await (await worker.fetch(request('personal'),env)).json()).workspace.checkins,[plan]);
 assert.equal((await (await worker.fetch(request('work'),env)).json()).workspace.checkins,undefined);
 const a=structuredClone(next),b=structuredClone(next);a.checkins[0].completedAt='2026-10-23T02:00:00Z';b.checkins[0].completedAt='2026-10-23T03:00:00Z';
 assert.equal((await worker.fetch(request('personal',{operations:recordChanges(next,a,WORKSPACE_COLLECTIONS)}),env)).status,200);
 assert.equal((await worker.fetch(request('personal',{operations:recordChanges(next,b,WORKSPACE_COLLECTIONS)}),env)).status,409);
 const deleted={...a,checkins:[]};assert.equal((await worker.fetch(request('personal',{operations:recordChanges(a,deleted,WORKSPACE_COLLECTIONS)}),env)).status,200);
});
