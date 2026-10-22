import test from 'node:test';import assert from 'node:assert/strict';
import {migrateGameTasks,gameRecords} from '../game-task-links.mjs';
import worker,{validWorkspace,reminderTasks} from './helpers/session-worker.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS,applyRecordChanges} from '../cloud-records.mjs';
const task=(id,extra={})=>({id,title:'同名游戏',taskType:'game',gamePlatform:'PC',dueDate:'2026-10-20',priority:'high',detail:'保留说明',done:false,...extra});
const game={id:'existing',title:'同名游戏',mediaType:'game',trackingStatus:'in_progress',platform:'PS5',completedDate:'',rating:null,detail:'现有进度',progress:12};
const base=()=>({tasks:[task('a'),task('b',{done:true})],notes:[],events:[],completedGames:[game]});
test('game migration requires explicit choices, preserves reminders and never guesses completion dates',()=>{
 const original=base(),snapshot=structuredClone(original),next=migrateGameTasks(original,[{taskId:'a',targetId:'existing'},{taskId:'b',newId:'new-game'}]);
 assert.deepEqual(original,snapshot);assert.equal(next.tasks.length,2);assert.deepEqual(next.tasks[0],{id:'a',title:'同名游戏',taskType:'task',dueDate:'2026-10-20',priority:'high',detail:'保留说明',done:false,mediaRecordId:'existing'});
 assert.equal(next.tasks[1].done,true);assert.equal(next.tasks[1].dueDate,'2026-10-20');assert.deepEqual(next.completedGames[0],game);assert.equal(next.completedGames[1].trackingStatus,'planned');assert.equal(next.completedGames[1].completedDate,'');assert.equal(validWorkspace(next),true);
 assert.equal(gameRecords({...next,completedGames:[...next.completedGames,{id:'movie',mediaType:'movie'}]}).length,2);
});
test('migration rejects stale and ambiguous operations without mutating originals',()=>{
 const original=base(),snapshot=structuredClone(original);
 for(const choices of [[],[{taskId:'gone',newId:'n'}],[{taskId:'a',targetId:'gone'}],[{taskId:'a',newId:'existing'}],[{taskId:'a',newId:'n'},{taskId:'a',targetId:'existing'}]])assert.throws(()=>migrateGameTasks(original,choices));
 assert.deepEqual(original,snapshot);
});
test('game+reminder migration patches are atomic and idempotent; concurrent fields survive and conflicts cannot half-create games',()=>{
 const original=base(),next=migrateGameTasks(original,[{taskId:'a',newId:'stable-game'}]),ops=recordChanges(original,next,WORKSPACE_COLLECTIONS),concurrent=structuredClone(original);concurrent.tasks[1].detail='另一设备更新';
 const saved=applyRecordChanges(concurrent,ops,WORKSPACE_COLLECTIONS);assert.equal(saved.tasks[1].detail,'另一设备更新');assert.equal(saved.completedGames.length,2);assert.deepEqual(applyRecordChanges(saved,ops,WORKSPACE_COLLECTIONS),saved);
 const conflict=structuredClone(original);conflict.tasks[0].mediaRecordId='another-game';assert.throws(()=>applyRecordChanges(conflict,ops,WORKSPACE_COLLECTIONS));assert.equal(conflict.completedGames.length,1);
});
test('migration uses the protected record API and leaves work scope and calendar sources intact',async()=>{
 let payload={data:[],archive:[],priorities:{},projects:[],deletedProjects:[],workspace:base(),workWorkspace:{tasks:[task('work',{taskType:'task'})],notes:[],events:[]},workspaceVersions:{personal:1,work:1}},version=1;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let a;return {bind(...args){a=args;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(a[1]!==version)return {meta:{changes:0}};payload=JSON.parse(a[0]);version++;return {meta:{changes:1}};}};}}};
 const next=migrateGameTasks(base(),[{taskId:'a',targetId:'existing'}]),operations=recordChanges(base(),next,WORKSPACE_COLLECTIONS);
 const req=auth=>new Request('https://test.local/api/workspace/patch?scope=personal',{method:'POST',headers:{Origin:'https://test.local','Content-Type':'application/json',...(auth?{Authorization:'Basic '+btoa('u:p')}:{})},body:JSON.stringify({operations})});
 assert.equal((await worker.fetch(req(false),env)).status,401);
 for(let i=0;i<2;i++)assert.equal((await worker.fetch(req(true),env)).status,200);
 assert.equal(payload.workspace.tasks[0].mediaRecordId,'existing');assert.equal(payload.workspace.tasks[0].dueDate,'2026-10-20');assert.equal(payload.workspace.completedGames.length,1);assert.equal(payload.workWorkspace.tasks[0].id,'work');assert.equal(reminderTasks(payload,'personal').length,1);
 const workBefore=structuredClone(payload.workWorkspace),workAfter=structuredClone(workBefore);workAfter.tasks[0].mediaRecordId='existing';const workRequest=new Request('https://test.local/api/workspace/patch?scope=work',{method:'POST',headers:{Origin:'https://test.local','Content-Type':'application/json',Authorization:'Basic '+btoa('u:p')},body:JSON.stringify({operations:recordChanges(workBefore,workAfter,WORKSPACE_COLLECTIONS)})});assert.equal((await worker.fetch(workRequest,env)).status,400);assert.deepEqual(payload.workWorkspace,workBefore);
 const invalid=base();invalid.tasks[0].mediaRecordId={id:'bad'};assert.equal(validWorkspace(invalid),false);
});
