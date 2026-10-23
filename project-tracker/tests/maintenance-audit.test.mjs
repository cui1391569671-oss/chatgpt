import test from 'node:test';import assert from 'node:assert/strict';
import {auditState,previewImageCleanup,maintenanceAudit} from '../maintenance-audit.mjs';
const id='12345678-1234-1234-1234-123456789012';
const state={data:[],archive:[],deletedProjects:[],workspace:{tasks:[],notes:[{id:'note',title:'Sensitive title',body:'Sensitive body'}],events:[{images:['/api/calendar-images/personal/'+id]}],wardrobe:[]},workWorkspace:{tasks:[],notes:[],events:[]}};
test('maintenance audits return counts and validation paths without business content',()=>{
 const report=auditState(state);assert.equal(report.counts.personal.notes,1);assert.equal(report.counts.work.notes,0);assert.equal(report.automaticChanges,false);assert.doesNotMatch(JSON.stringify(report),/Sensitive/);
});
test('image cleanup previews retain nested references and never authorize deletion for undated images',()=>{
 const data=structuredClone(state);data.workspace.events[0].exceptions=[{images:['/api/wardrobe-images/'+id]}];
 const result=previewImageCleanup(data,[{kind:'calendar',id,scope:'personal',bytes:20},{kind:'wardrobe',id,bytes:10},{kind:'wardrobe',id:'orphan',bytes:30}]);
 assert.equal(result.unreferencedCount,1);assert.equal(result.unreferencedBytes,30);assert.equal(result.candidates[0].eligibleForDeletion,false);assert.equal(result.automaticDeletion,false);assert.equal(result.missingReferences.length,0);
});
test('maintenance routes only issue SELECT queries and reject mutation methods',async()=>{
 const db={prepare(sql){assert.match(sql,/^SELECT /);return{async all(){return{results:[]}}}}};
 const result=await maintenanceAudit(new Request('https://test.local/api/maintenance/images'),db,state);assert.equal(result.status,200);
 const rejected=await maintenanceAudit(new Request('https://test.local/api/maintenance/images',{method:'DELETE'}),db,state);assert.equal(rejected.status,405);
});
