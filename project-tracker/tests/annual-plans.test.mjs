import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validWorkspace} from './helpers/session-worker.mjs';
import {validAnnualPlans,planIntersectsYear,shiftPlanDate} from '../annual-plans.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
const plan={id:'learn',title:'英语学习',startDate:'2026-01-01',endDate:'2026-12-31',category:'learning',progress:35,detail:''};
test('annual dates, progress, duplicate IDs and cross-year visibility are validated',()=>{
 assert.equal(validAnnualPlans([plan]),true);assert.equal(validWorkspace({tasks:[],notes:[],events:[],annualPlans:[plan]}),true);
 for(const patch of [{startDate:'2026-02-30'},{endDate:'2025-12-31'},{progress:101},{progress:2.5},{category:'invalid'},{title:' '},{detail:'x'.repeat(5001)}])assert.equal(validAnnualPlans([{...plan,...patch}]),false);
 assert.equal(validAnnualPlans([plan,plan]),false);assert.equal(planIntersectsYear({...plan,startDate:'2025-12-01'},2026),true);assert.equal(planIntersectsYear(plan,2027),false);
 assert.equal(shiftPlanDate('2028-02-28',1),'2028-02-29');assert.equal(shiftPlanDate('2026-12-31',1),'2027-01-01');
});
test('annual plans persist privately, reject work writes and preserve field conflict checks',async()=>{
 let payload=JSON.stringify({data:[],archive:[],priorities:{},projects:[],workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]}}),version=1;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...v){args=v;return this;},async first(){return {payload,version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=args[0];version++;return {meta:{changes:1}};}};}}};
 const request=(scope,body)=>new Request('https://test.local/api/workspace'+(body?'/patch':'')+'?scope='+scope,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const base={tasks:[],notes:[],events:[]},next={...base,annualPlans:[plan]},operations=recordChanges(base,next,WORKSPACE_COLLECTIONS);
 assert.equal((await worker.fetch(request('work',{operations}),env)).status,400);
 assert.equal((await worker.fetch(request('personal',{operations}),env)).status,200);
 assert.deepEqual((await (await worker.fetch(request('personal'),env)).json()).workspace.annualPlans,[plan]);
 assert.equal((await (await worker.fetch(request('work'),env)).json()).workspace.annualPlans,undefined);
 const a=structuredClone(next),b=structuredClone(next);a.annualPlans[0].progress=50;b.annualPlans[0].progress=75;
 assert.equal((await worker.fetch(request('personal',{operations:recordChanges(next,a,WORKSPACE_COLLECTIONS)}),env)).status,200);
 assert.equal((await worker.fetch(request('personal',{operations:recordChanges(next,b,WORKSPACE_COLLECTIONS)}),env)).status,409);
 const deleted={...a,annualPlans:[]};assert.equal((await worker.fetch(request('personal',{operations:recordChanges(a,deleted,WORKSPACE_COLLECTIONS)}),env)).status,200);
});
