import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import {validProjectCoreInfo} from '../project-core-info.mjs';
const snapshot={sourceSpreadsheetId:'1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM',sourceTitle:'项目信息表汇总',syncedAt:'2026-10-15',items:[{projectCode:'P001',projectName:'示例项目',supplyScope:'四向车4台',transport:'待确认',palletSize:'1200 × 1000 mm',equipmentLoad:'1000 kg',sourceSheet:'示例项目',sourceSheetId:1,sourceUpdatedAt:'2026-10-15'}]};
test('core info validates bounded fields, source and unique project identifiers',()=>{
 assert.equal(validProjectCoreInfo(snapshot),true);
 for(const patch of [{sourceSpreadsheetId:'wrong'},{items:[snapshot.items[0],snapshot.items[0]]},{items:[{...snapshot.items[0],equipmentLoad:123}]},{items:[{...snapshot.items[0],supplyScope:'x'.repeat(5001)}]}])assert.equal(!!validProjectCoreInfo({...snapshot,...patch}),false);
});
test('core information stays behind authentication and imports separately from project/workspace records',async()=>{
 let stored=null,reads=0;const env={TRACKER_USER:'preview',TRACKER_PASSWORD:'preview',DB:{prepare(sql){let args;return {bind(...values){args=values;return this;},async run(){if(sql.startsWith('INSERT'))stored=args[0];return {};},async first(){reads++;return stored?{payload:stored}:null;}};}}};
 const request=(method,body,auth=true,origin='https://test.local')=>new Request('https://test.local/api/project-core-information',{method,headers:{...(auth?{Authorization:'Basic '+btoa('preview:preview')}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await worker.fetch(request('GET',null,false),env)).status,401);assert.equal(reads,0);
 assert.deepEqual((await (await worker.fetch(request('GET'),env)).json()).items,[]);
 assert.equal((await worker.fetch(request('PUT',snapshot,true,'https://elsewhere.local'),env)).status,403);
 assert.equal((await worker.fetch(request('PUT',{...snapshot,items:[{}]}),env)).status,400);
 assert.equal((await worker.fetch(request('PUT',snapshot),env)).status,200);
 assert.deepEqual(await (await worker.fetch(request('GET'),env)).json(),snapshot);
 assert.equal((await worker.fetch(request('DELETE'),env)).status,405);
});
