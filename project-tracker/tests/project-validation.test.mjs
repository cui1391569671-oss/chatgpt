import test from 'node:test';
import assert from 'node:assert/strict';
import {projectValidationIssues,assertProjectChanges} from '../project-validation.mjs';
const row={id:'x',project:'p',task:'Task',reason:'',note:'',status:'进行中',done:false,plannedDate:''};
const state=()=>({data:[{...row}],archive:[],deletedProjects:[]});
test('project validation rejects impossible dates, excessive text and malformed recycle-bin rows',()=>{
 for(const change of [{plannedDate:'2026-02-30'},{note:'a'.repeat(20001)},{done:true}]){
  const value=state();Object.assign(value.data[0],change);assert.ok(projectValidationIssues(value).length);
 }
 const value=state();value.deletedProjects=[{id:'deleted',name:'p',data:[{...row,status:'unknown'}],archive:[]}];assert.throws(()=>assertProjectChanges(state(),value),/deletedProjects/);
});
test('unchanged legacy violations survive unrelated edits but cannot be replaced by another invalid value',()=>{
 const before=state();before.data[0].plannedDate='2026-02-30';before.data[0].note='a'.repeat(20001);
 const next=structuredClone(before);next.data[0].reason='Updated explanation';assert.doesNotThrow(()=>assertProjectChanges(before,next));
 next.data[0].plannedDate='2026-04-31';assert.throws(()=>assertProjectChanges(before,next),/plannedDate/);
 next.data[0].plannedDate='2026-02-28';assert.doesNotThrow(()=>assertProjectChanges(before,next));
});
test('reordering records does not make historical violations new and strict preflight still reports them',()=>{
 const before=state();before.data.push({...row,id:'y',plannedDate:'2026-02-30'});const next=structuredClone(before);next.data.reverse();
 assert.doesNotThrow(()=>assertProjectChanges(before,next));assert.equal(projectValidationIssues(next).length,1);
});
test('restoring or archiving an unchanged legacy issue preserves its historical fields',()=>{
 const legacy={...row,plannedDate:'2026-02-30'};
 const before={data:[],archive:[],deletedProjects:[{id:'bin',name:'p',data:[legacy],archive:[]}]};
 const restored={data:[legacy],archive:[],deletedProjects:[]};assert.doesNotThrow(()=>assertProjectChanges(before,restored));
 const archived={data:[],archive:[{...legacy,archivedAt:new Date().toISOString()}],deletedProjects:[]};assert.doesNotThrow(()=>assertProjectChanges(restored,archived));
});
test('assigning an ID while restoring an unchanged ID-less legacy row remains compatible',()=>{
 const {id:_id,...legacy}={...row,plannedDate:'2026-02-30'};
 const before={data:[],archive:[],deletedProjects:[{name:'p',data:[legacy],archive:[]}]};
 assert.doesNotThrow(()=>assertProjectChanges(before,{data:[{...legacy,id:'restored-id'}],archive:[],deletedProjects:[]}));
});
