import test from 'node:test';
import assert from 'node:assert/strict';
import {validBeautyRecord,validBeautyRecords,beautyRecordPage} from '../beauty-records.mjs';
import {validWorkspace} from '../worker.mjs';
import {recordChanges,applyRecordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
import {workspaceSiteNavigation,workspaceNavigation} from '../tasks-ui/src/workspace-page-meta.mjs';
import worker from './helpers/session-worker.mjs';
const row={id:'beauty-1',title:'日常淡妆',category:'makeup',date:'2026-11-08',products:'粉底、防晒',detail:'轻薄自然'};
test('beauty records validate dates, types, limits, duplicate ids and legacy workspaces',()=>{
 assert(validBeautyRecord(row));assert(validBeautyRecords([row]));assert(!validBeautyRecords([row,row]));
 for(const patch of [{title:' '},{category:'other'},{date:'2026-02-30'},{products:'x'.repeat(2001)},{detail:null},{id:''}])assert(!validBeautyRecord({...row,...patch}));
 const base={tasks:[],notes:[],events:[]};assert(validWorkspace(base));assert(validWorkspace({...base,beautyRecords:[row]}));assert(!validWorkspace({...base,beautyRecords:[{...row,date:'bad'}]}));
});
test('beauty search and category filtering retain deterministic date ordering and clamp pages',()=>{
 const rows=Array.from({length:43},(_,i)=>({...row,id:String(i).padStart(3,'0'),category:i===0?'skincare':'makeup'}));
 assert.equal(beautyRecordPage(rows,{page:2}).items.length,20);assert.equal(beautyRecordPage(rows,{page:999}).page,3);
 assert.equal(beautyRecordPage(rows,{query:'淡妆 防晒'}).total,43);assert.equal(beautyRecordPage(rows,{category:'skincare'}).total,1);
 assert.equal(beautyRecordPage(rows,{query:'不存在',page:3}).page,1);
 assert.equal(beautyRecordPage([{...row,date:'2026-11-07'},{...row,id:'new',date:'2026-11-09'}]).items[0].id,'new');
});
test('beauty record writes share field merge, idempotency and conflict checks without touching wardrobe',()=>{
 const base={tasks:[],notes:[],events:[],wardrobe:[{id:'shirt'}]},next={...base,beautyRecords:[row]};
 const ops=recordChanges(base,next,WORKSPACE_COLLECTIONS),saved=applyRecordChanges(base,ops,WORKSPACE_COLLECTIONS);assert.deepEqual(saved,next);assert.deepEqual(applyRecordChanges(saved,ops,WORKSPACE_COLLECTIONS),next);
 const a=structuredClone(saved),b=structuredClone(saved);a.beautyRecords[0].title='新名称';b.beautyRecords[0].detail='新感受';
 const merged=applyRecordChanges(a,recordChanges(saved,b,WORKSPACE_COLLECTIONS),WORKSPACE_COLLECTIONS);assert.equal(merged.beautyRecords[0].title,'新名称');assert.equal(merged.beautyRecords[0].detail,'新感受');
 b.beautyRecords[0].title='冲突名称';assert.throws(()=>applyRecordChanges(a,recordChanges(saved,b,WORKSPACE_COLLECTIONS),WORKSPACE_COLLECTIONS),/同一字段/);
});
test('image management owns wardrobe and beauty exactly once and stays private',()=>{
 const groups=workspaceSiteNavigation('personal'),group=groups.find(group=>group.title==='形象管理');assert.deepEqual(group.items,[['personal','wardrobe'],['personal','beauty']]);
 for(const id of ['wardrobe','beauty'])assert.equal(groups.flatMap(g=>g.items).filter(([,view])=>view===id).length,1);
 assert(!workspaceSiteNavigation('work').some(g=>g.title==='形象管理'));assert(workspaceNavigation('personal').some(g=>g.views.includes('beauty')));
});
test('authenticated beauty API enforces private scope, validates writes and retains work data',async()=>{
 let payload={data:[],archive:[],projects:[],priorities:{},deletedProjects:[],workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}},version=1;
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...values){args=values;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}};
 const call=(path,body,authenticated=true)=>worker.fetch(new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{...(authenticated?{Authorization:'Basic '+btoa('u:p')}:{}),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
 const operation={operations:[{collection:'beautyRecords',id:row.id,action:'create',record:row}]};
 assert.equal((await call('/api/workspace/patch?scope=personal',operation,false)).status,401);
 assert.equal((await call('/api/workspace/patch?scope=work',operation)).status,400);
 assert.equal((await call('/api/workspace?scope=work',{version:1,workspace:{tasks:[],notes:[],events:[],beautyRecords:[row]}})).status,400);
 assert.equal((await call('/api/workspace/patch?scope=personal',{operations:[{...operation.operations[0],record:{...row,date:'bad'}}]})).status,400);
 assert.equal((await call('/api/workspace/patch?scope=personal',operation)).status,200);
 assert.deepEqual((await (await call('/api/workspace?scope=personal')).json()).workspace.beautyRecords,[row]);
 assert.equal((await (await call('/api/workspace?scope=work')).json()).workspace.beautyRecords,undefined);
 assert.equal((await call('/api/workspace/patch?scope=personal',{operations:[{collection:'beautyRecords',id:row.id,action:'delete',before:row}]})).status,200);
});
