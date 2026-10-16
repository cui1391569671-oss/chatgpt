import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validWorkspace} from '../worker.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
import {mediaTrackingStatus,mediaTrackingHistory,mediaProgressUnit,mediaTrackingStats} from '../media-tracking.mjs';
const base={id:'a',title:'作品',platform:'',completedDate:'2026-10-10',rating:null,detail:''};
const valid=item=>validWorkspace({tasks:[],notes:[],events:[],completedGames:[item]});
test('legacy media stays completed; planned and active media can be saved without completion dates',()=>{
 assert.equal(mediaTrackingStatus(base),'completed');assert.equal(valid(base),true);
 for(const trackingStatus of ['planned','in_progress','on_hold','dropped'])assert.equal(valid({...base,trackingStatus,completedDate:'',progress:3,total:12,season:1,repeats:0}),true);
 assert.equal(valid({...base,trackingStatus:'completed',completedDate:''}),false);
 assert.equal(valid({...base,completedDate:''}),false);
 assert.equal(valid({...base,trackingStatus:'bogus'}),false);
});
test('progress, seasons, repeats, dates and history reject malformed or contradictory data',()=>{
 for(const change of [{progress:-1},{progress:.5},{total:2,progress:3},{repeats:-1},{season:'1'},{startedDate:'2026-10-11'},{completedDate:'2026-02-31'},{history:[{at:'not-a-date'}]}])assert.equal(valid({...base,...change}),false,JSON.stringify(change));
 const item={...base,mediaType:'anime',trackingStatus:'in_progress',completedDate:'',progress:1,total:12,season:1,repeats:0};item.history=mediaTrackingHistory(null,item,'2026-10-16T12:00:00Z');assert.equal(valid(item),true);
 assert.equal(mediaTrackingHistory(item,item).length,1);
 const next={...item,progress:2};next.history=mediaTrackingHistory(item,next);assert.equal(next.history.length,2);assert.equal(next.history[1].progress,2);assert.equal(item.history.length,1);
 const full={...item,history:Array(100).fill(item.history[0])};assert.equal(mediaTrackingHistory(full,{...full,progress:3}).length,100);
 assert.equal(mediaProgressUnit(item),'集');assert.equal(mediaProgressUnit({...item,mediaType:'game'}),'小时');
});
test('yearly completion stats exclude planned and active records and keep legacy history',()=>{
 assert.deepEqual(mediaTrackingStats([base,{...base,trackingStatus:'planned'},{...base,trackingStatus:'in_progress'},{...base,completedDate:'2025-01-01'}],2026),{total:4,active:1,planned:1,completed:1});
});
test('new tracking fields round-trip through real record patches, preserve other spaces, and reject stale edits',async()=>{
 let payload={data:[],archive:[],priorities:{},projects:[],workspace:{tasks:[],notes:[],events:[],completedGames:[base]},workWorkspace:{tasks:[],notes:[{id:'work-note',title:'工作笔记',body:'保留',updatedAt:'2026-10-16T00:00:00Z'}],events:[]},workspaceVersions:{personal:1,work:1}},version=1;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...v){args=v;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}};
 const req=(path,body)=>new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const before=(await(await worker.fetch(req('/api/workspace?scope=personal'),env)).json()).workspace,next=structuredClone(before);
 const planned={...base,id:'new',mediaType:'anime',trackingStatus:'planned',completedDate:'',progress:0,total:12,season:1,repeats:0};planned.history=mediaTrackingHistory(null,planned);next.completedGames.push(planned);
 const operations=recordChanges(before,next,WORKSPACE_COLLECTIONS),endpoint='/api/workspace/patch?scope=personal';assert.equal((await worker.fetch(req(endpoint,{operations}),env)).status,200);
 const saved=(await(await worker.fetch(req('/api/workspace?scope=personal'),env)).json()).workspace;assert.deepEqual(saved.completedGames,next.completedGames);assert.equal(payload.workWorkspace.notes[0].body,'保留');
 const changed=structuredClone(saved);changed.completedGames[1].progress=1;changed.completedGames[1].trackingStatus='in_progress';assert.equal((await worker.fetch(req(endpoint,{operations:recordChanges(saved,changed,WORKSPACE_COLLECTIONS)}),env)).status,200);
 const stale=structuredClone(saved);stale.completedGames[1].progress=2;assert.equal((await worker.fetch(req(endpoint,{operations:recordChanges(saved,stale,WORKSPACE_COLLECTIONS)}),env)).status,409);
});
