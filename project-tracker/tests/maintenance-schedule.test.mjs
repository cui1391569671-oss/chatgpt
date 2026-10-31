import test from 'node:test';
import assert from 'node:assert/strict';
import {MAINTENANCE_FREQUENCIES,validMaintenanceFrequency,nextMaintenanceDate} from '../maintenance-schedule.mjs';
import worker,{validWorkspace} from './helpers/session-worker.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
const device={id:'device-1',title:'演示设备',location:'',detail:'',lastDate:'2026-10-31',nextDate:'2026-11-30'};
test('maintenance day/week/month calculation preserves valid dates across month ends and leap years',()=>{
 assert.equal(nextMaintenanceDate('2026-12-31','daily'),'2027-01-01');
 assert.equal(nextMaintenanceDate('2026-10-31','weekly'),'2026-11-07');
 assert.equal(nextMaintenanceDate('2026-01-31','monthly'),'2026-02-28');
 assert.equal(nextMaintenanceDate('2028-01-31','monthly'),'2028-02-29');
 assert.equal(nextMaintenanceDate('2026-10-31','monthly'),'2026-11-30');
 assert.equal(nextMaintenanceDate('2026-12-15','monthly'),'2027-01-15');
 for(const date of ['2026-02-30','not-a-date','2026-2-01',''])assert.equal(nextMaintenanceDate(date,'monthly'),'');
 assert.equal(nextMaintenanceDate('2026-10-31','none'),'');
 assert.equal(nextMaintenanceDate('9999-12-31','daily'),'');
});
test('maintenance accepts legacy records and only the four supported optional frequency values',()=>{
 const blank={tasks:[],notes:[],events:[]};assert(validWorkspace({...blank,maintenance:[device]}));
 for(const frequency of Object.keys(MAINTENANCE_FREQUENCIES))assert(validWorkspace({...blank,maintenance:[{...device,frequency}]}));
 for(const frequency of [null,42,'yearly','constructor',{},[]]){assert(!validMaintenanceFrequency(frequency));assert(!validWorkspace({...blank,maintenance:[{...device,frequency}]}));}
});
function setup(){let payload={data:[],archive:[],priorities:{},projects:[],workWorkspace:{tasks:[],notes:[],events:[]},workspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}},version=1;return {TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...values){args=values;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}};}
const request=(path,operations)=>new Request('https://test.local'+path,{method:operations?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(operations?{body:JSON.stringify({operations})}:{})});
test('maintenance frequency persists through patch/readback with field conflict protection and scope isolation',async()=>{
 const env=setup(),path='/api/workspace/patch?scope=personal',blank={tasks:[],notes:[],events:[]},initial={...blank,maintenance:[{...device,frequency:'monthly'}]};
 const create=recordChanges(blank,initial,WORKSPACE_COLLECTIONS);for(let i=0;i<2;i++)assert.equal((await worker.fetch(request(path,create),env)).status,200);
 const saved=(await(await worker.fetch(request('/api/workspace?scope=personal'),env)).json()).workspace;assert.equal(saved.maintenance[0].frequency,'monthly');
 const changed=structuredClone(saved);changed.maintenance[0].frequency='weekly';changed.maintenance[0].nextDate='2026-11-07';assert.equal((await worker.fetch(request(path,recordChanges(saved,changed,WORKSPACE_COLLECTIONS)),env)).status,200);
 const concurrent=structuredClone(saved);concurrent.maintenance[0].location='新位置';assert.equal((await worker.fetch(request(path,recordChanges(saved,concurrent,WORKSPACE_COLLECTIONS)),env)).status,200);
 const stale=structuredClone(saved);stale.maintenance[0].frequency='daily';assert.equal((await worker.fetch(request(path,recordChanges(saved,stale,WORKSPACE_COLLECTIONS)),env)).status,409);
 const result=(await(await worker.fetch(request('/api/workspace?scope=personal'),env)).json()).workspace;assert.equal(result.maintenance[0].frequency,'weekly');assert.equal(result.maintenance[0].location,'新位置');
 const other=(await(await worker.fetch(request('/api/workspace?scope=work'),env)).json()).workspace;assert.equal(other.maintenance,undefined);
 const invalid=structuredClone(result);invalid.maintenance[0].frequency='yearly';assert.equal((await worker.fetch(request(path,recordChanges(result,invalid,WORKSPACE_COLLECTIONS)),env)).status,400);
});
