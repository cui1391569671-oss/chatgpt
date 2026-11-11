import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {PROJECT_PLAN_SOURCE_ID,projectPlanEditingFromGrid,projectPlanPreviewFromGrid,parseProjectPlanSheets,projectPlanUpdateRequests,validateProjectPlanEdit} from '../project-plan-sheet.mjs';
import {projectPlanWrite} from '../project-plan-write.mjs';

const source=()=>{
 const text=value=>({formattedValue:value,userEnteredValue:{stringValue:value}});
 const columns=['完成','阶段','模块','标准任务','是否适用','责任部门','计划开始时间','计划完成日期','状态','交付证据','备注'];
 const task=[{formattedValue:'FALSE',userEnteredValue:{boolValue:false},effectiveValue:{boolValue:false},dataValidation:{condition:{type:'BOOLEAN'}}},...['实施','通用','设备联调','是','项目部','2026-12-01','2026-12-08'].map(text),
  {formattedValue:'未开始',userEnteredValue:{formulaValue:'=IF(A5,"已完成","未开始")'}},text('联调记录'),text('')];
 return {properties:{sheetId:17,title:'PM001-演示标准任务清单',gridProperties:{rowCount:6,columnCount:11,frozenRowCount:4}},data:[{rowData:[{values:[text('隔离任务表')]},{values:[text('仅用于隔离测试')]},{values:[]},{values:columns.map(text)},{values:task},{values:structuredClone(task).map((cell,c)=>c===3?text('发货关闭任务'):c===0?{...cell,note:'发货关闭：检查到账、审批及实际发出'}:cell)}]}]};
};
const edit=(changes=[{key:'note',before:'',value:'已核对'}])=>({requestId:'synthetic-request-0001',sheetId:17,row:5,identity:{title:'设备联调',phase:'实施',module:'通用'},changes});
function snapshot(grid){const preview=projectPlanPreviewFromGrid(grid),editing=projectPlanEditingFromGrid(grid);return parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[{sheetId:17,name:grid.properties.title,rows:preview.cells.map(row=>row.map(cell=>cell[0])),preview,editing}]);}

test('writeback respects source formulas, shipping closure rules, dates, identity and per-field concurrency',()=>{
 const grid=source(),fields=projectPlanEditingFromGrid(grid);
 assert.deepEqual(fields[0].fields.map(field=>field.key),['done','start','end','evidence','note']);
 assert(!fields[1].fields.some(field=>field.key==='done'));
 const shipment=source();delete shipment.data[0].rowData[5].values[0].note;
 shipment.data[0].rowData[3].values.push({formattedValue:'阶段显示'},{formattedValue:'发货款已到账'});
 assert(!projectPlanEditingFromGrid(shipment)[1].fields.some(field=>field.key==='done'));
 assert.throws(()=>projectPlanUpdateRequests(grid,edit([{key:'status',before:'未开始',value:'进行中'}])),/公式/);
 assert.throws(()=>projectPlanUpdateRequests(grid,{...edit(),identity:{...edit().identity,title:'另一任务'}}),/任务行/);
 assert.throws(()=>projectPlanUpdateRequests(grid,edit([{key:'note',before:'已变更',value:'其他'}])),/未覆盖/);
 assert.throws(()=>validateProjectPlanEdit(edit([{key:'start',before:'',value:'2026-02-30'}])));
 assert.throws(()=>validateProjectPlanEdit(edit([{key:'unknown',before:'',value:'x'}])));
 assert.throws(()=>projectPlanUpdateRequests(grid,edit([{key:'start',before:'2026-12-01',value:'2026-12-10'}])),/晚于/);
 const request=projectPlanUpdateRequests(grid,edit([{key:'start',before:'2026-12-01',value:'2026-12-02'},{key:'evidence',before:'联调记录',value:'=IMPORTDATA("https://example.com")'}]));
 assert.equal(request[0].updateCells.rows[0].values[0].userEnteredValue.numberValue,46358);
 assert.deepEqual(request[1].updateCells.rows[0].values[0].userEnteredValue,{stringValue:'=IMPORTDATA("https://example.com")'});
 const done=projectPlanUpdateRequests(grid,edit([{key:'done',before:false,value:true}]));
 assert.deepEqual(done[0].updateCells.rows[0].values[0].userEnteredValue,{boolValue:true});
 assert.deepEqual(projectPlanUpdateRequests(grid,edit([{key:'note',before:'old value',value:''}])),[]);
});

test('authenticated gateway checks origin, configuration and editable row scope; signs bounded requests and preserves uncertain results',async()=>{
 const data=snapshot(source()),env={PROJECT_PLAN_WRITE_URL:'https://script.google.com/macros/s/SYNTHETIC/exec',PROJECT_PLAN_SYNC_SECRET:'synthetic-sync-secret-only-32-characters',DB:{prepare(){return {async first(){return {payload:JSON.stringify(data)};}};}}};
 const request=(body=edit(),origin='https://workbench.test')=>new Request('https://workbench.test/api/project-plan/edit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await projectPlanWrite(request(),{},()=>{throw Error('must not call');})).status,503);
 assert.equal((await projectPlanWrite(request(edit(),'https://other.test'),env)).status,403);
 assert.equal((await projectPlanWrite(request(edit([{key:'status',before:'未开始',value:'进行中'}])),env)).status,400);
 const response=await projectPlanWrite(request(),env,async(url,options)=>{
  assert.equal(url,env.PROJECT_PLAN_WRITE_URL);const envelope=JSON.parse(options.body);
  assert.equal(envelope.signature,createHmac('sha256',env.PROJECT_PLAN_SYNC_SECRET).update(envelope.timestamp+'.'+envelope.payload).digest('hex'));
  return Response.json({ok:true,requestId:edit().requestId,project:data.projects[0],synced:true});
 });
 assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
 const conflict=await projectPlanWrite(request(),env,async()=>Response.json({ok:false,requestId:edit().requestId,status:409,error:'原表已被修改'}));
 assert.equal(conflict.status,409);
 const uncertain=await projectPlanWrite(request(),env,async()=>{throw Error('network');});assert.equal(uncertain.status,503);
 assert.match((await uncertain.json()).error,/未能确认/);
});

test('confirmed writes persist the project for refresh without replacing a concurrent snapshot or other projects',async()=>{
 const data=snapshot(source());data.projects.push({...structuredClone(data.projects[0]),sheetId:18,code:'PM002',name:'另一个隔离项目'});
 let saved,version=7,cacheFailure=false;
 const env={PROJECT_PLAN_WRITE_URL:'https://script.google.com/macros/s/SYNTHETIC/exec',PROJECT_PLAN_SYNC_SECRET:'synthetic-sync-secret-only-32-characters',DB:{prepare(){return {
  first:async()=>({payload:JSON.stringify(data),sync_version:7}),
  bind(payload,stamp,before){return {async run(){if(cacheFailure)throw Error('cache unavailable');if(before!==version)return {meta:{changes:0}};saved=JSON.parse(payload);version=stamp;return {meta:{changes:1}};}};}
 };}}};
 const project=structuredClone(data.projects[0]);project.editing[0].fields.find(field=>field.key==='note').value='已核对';
 const send=async()=>Response.json({ok:true,requestId:edit().requestId,project,synced:false});
 const request=()=>new Request('https://workbench.test/api/project-plan/edit',{method:'POST',headers:{Origin:'https://workbench.test','Content-Type':'application/json'},body:JSON.stringify(edit())});
 const success=await (await projectPlanWrite(request(),env,send)).json();assert.equal(success.ok,true);assert.equal(success.synced,true);
 assert.equal(saved.projects[0].editing[0].fields.find(field=>field.key==='note').value,'已核对');
 assert.deepEqual(saved.projects[1],data.projects[1]);assert.equal(Date.parse(success.lastSyncedAt),version);
 saved=undefined;const concurrent=await (await projectPlanWrite(request(),env,send)).json();
 assert.equal(concurrent.ok,true);assert.equal(concurrent.synced,false);assert.equal(saved,undefined);
 cacheFailure=true;const unavailable=await (await projectPlanWrite(request(),env,send)).json();
 assert.equal(unavailable.ok,true);assert.equal(unavailable.synced,false);
});

function scriptHarness(){
 let grid=source(),writes=0,sourceReads=0,heldReads=0,pushes=0,held=false,allowLock=true,nextRead;
 const secret='synthetic-sync-secret-only-32-characters',properties=new Map([['PROJECT_PLAN_SYNC_SECRET',secret]]);
 const script=readFileSync(new URL('../google-apps-script/project-plan-sync.gs',import.meta.url),'utf8');
 const context={
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput(value){return {value,setMimeType(){return this;}};}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},
  LockService:{getScriptLock:()=>({tryLock(){held=allowLock;return held;},hasLock:()=>held,releaseLock(){held=false;}})},
  Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},newBlob:value=>({getBytes:()=>[...Buffer.from(value)]}),
   computeHmacSha256Signature:(value,key)=>[...createHmac('sha256',key).update(value).digest()],computeDigest:(_,value)=>[...createHash('sha256').update(value).digest()]},
  UrlFetchApp:{fetch:()=>{pushes++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,count:1})};}},
  Sheets:{Spreadsheets:{get(id,{ranges}){assert.equal(id,PROJECT_PLAN_SOURCE_ID);sourceReads++;if(held)heldReads++;const callback=nextRead;nextRead=undefined;callback?.();return {sheets:ranges?[grid]:[{properties:grid.properties}]};},batchUpdate({requests},id){
   assert.equal(id,PROJECT_PLAN_SOURCE_ID);writes++;
   for(const {updateCells:{range,rows}} of requests){
    const cell=grid.data[0].rowData[range.startRowIndex].values[range.startColumnIndex],value=rows[0].values[0].userEnteredValue;
    cell.userEnteredValue=structuredClone(value);cell.formattedValue=value.stringValue??(value.boolValue===undefined?(value.numberValue===undefined?'':new Date(Date.UTC(1899,11,30)+value.numberValue*86400000).toISOString().slice(0,10)):String(value.boolValue).toUpperCase());
    if(value.boolValue!==undefined)cell.effectiveValue={boolValue:value.boolValue};
   }
  }}},console:{log(){}}
 };
 runInNewContext(script,context);
 const call=(editValue=edit(),signatureOverride)=>{
  const timestamp=String(Date.now()),payload=JSON.stringify(editValue),signature=signatureOverride||createHmac('sha256',secret).update(timestamp+'.'+payload).digest('hex');
  return JSON.parse(context.doPost({postData:{contents:JSON.stringify({timestamp,signature,payload})}}).value);
 };
 return {call,sync:(force=true)=>context.pushProjectPlan_(force),duringNextRead:callback=>{nextRead=callback;},grid:()=>grid,counts:()=>({writes,sourceReads,heldReads,pushes}),block:()=>{allowLock=false;}};
}

test('Apps Script validates HMAC before source access and serializes source writes, reads back values and handles retries safely',()=>{
 const harness=scriptHarness();assert.equal(harness.call(edit(),'a'.repeat(64)).ok,false);assert.equal(harness.counts().sourceReads,0);
 const success=harness.call();assert.equal(success.ok,true);assert.equal(success.synced,false);assert.equal(harness.counts().writes,1);
 assert.equal(harness.counts().sourceReads,4,'saving reads only the target project before and after the write');
 assert.equal(harness.grid().data[0].rowData[4].values[10].formattedValue,'已核对');
 assert.equal(harness.call().ok,true);assert.equal(harness.counts().writes,1);
 const changed=harness.call(edit([{key:'note',before:'',value:'另一个改动'}]));assert.equal(changed.status,409);assert.equal(harness.counts().writes,1);
 harness.block();assert.equal(harness.call().status,503);
});

test('full snapshot reads leave task writes available and discard a snapshot spanning a concurrent write',()=>{
 const fresh=scriptHarness();fresh.sync();
 assert.equal(fresh.counts().heldReads,0);
 assert.equal(fresh.counts().pushes,1);
 fresh.sync(false);assert.equal(fresh.counts().pushes,1);
 const concurrent=scriptHarness();
 concurrent.duringNextRead(()=>assert.equal(concurrent.call().ok,true));
 assert.throws(()=>concurrent.sync(),/读取期间任务已修改/);
 assert.equal(concurrent.counts().writes,1);
 assert.equal(concurrent.counts().pushes,0);
});
