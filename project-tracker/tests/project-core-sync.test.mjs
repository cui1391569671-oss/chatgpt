import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProjectCoreSheets,PROJECT_CORE_SOURCE_ID} from '../project-core-sheet.mjs';
import {summarizeProjectCore} from '../project-core-summary.mjs';
import {projectLabel} from '../project-labels.mjs';
import {projectCorePushRoute} from '../project-core-sync.mjs';
import worker from './helpers/session-worker.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash,createHmac} from 'node:crypto';
const sheet=(code='QA001')=>({id:1,name:code+' 示例项目',rows:[['项目编号',code,'','','项目名称','示例项目'],['信息更新日期','2026-10-21'],['运输方式','CIF'],['05  供货范围'],['序号','系统/模块','','供货内容','','','数量','单位','供货方','','','备注'],['1','四向车','','车体1000×900 mm，适配1200×800 mm托盘，额载800 kg','','','4','台','乙方','','','载荷存在版本差异，待确认'],['2','提升机','','提升机额载1300 kg','','','2','台','乙方','','','含车'],['06  项目核心预算'],['合同总金额','9000000'],['联系人','PRIVATE CONTACT'],['项目目标/验收标准','设计效率：入库50＋出库24托/小时。\n效率不作为验收依据；测试条件须双方确认。']]});
const source=sheets=>({spreadsheetId:PROJECT_CORE_SOURCE_ID,title:'项目信息表汇总',sheets});
const payload=()=>({...parseProjectCoreSheets(source([sheet()]),'2026-10-21'),automationInstalled:true});
const secret='isolated-unit-test-secret-32-characters';
async function signed(body,stamp=Date.now(),headers={}){const raw=typeof body==='string'?body:JSON.stringify(body),timestamp=String(stamp);const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)))].map(v=>v.toString(16).padStart(2,'0')).join('');return new Request('https://test.local/api/project-core-information/push',{method:'POST',headers:{'Content-Type':'application/json','X-Project-Core-Timestamp':timestamp,'X-Project-Core-Signature':signature,...headers},body:raw});}
function database(){let stored=null,writes=0,conflict=false,fail=false;return {get stored(){return stored&&JSON.parse(stored)},get writes(){return writes},set conflict(value){conflict=value},set fail(value){fail=value},seed(value){stored=JSON.stringify(value)},prepare(sql){let args;return {bind(...a){args=a;return this},async first(){return stored?{payload:stored}:null},async run(){if(sql.startsWith('CREATE'))return {};if(fail)throw Error('DB unavailable');if(conflict||stored&&(stored!==args[1]||(JSON.parse(stored).syncVersion||0)>=args[2]))return {meta:{changes:0}};stored=args[0];writes++;return {meta:{changes:1}}}}}}}
test('source aliases survive signed sync and follow project renumbering',async()=>{
 const tab=sheet('PM021');
 tab.rows.splice(1,0,['项目问题别名','旧项目名称； 旧简称\n旧项目名称']);
 const parse=()=>({...parseProjectCoreSheets(source([tab]),'2026-11-09'),automationInstalled:true});
 const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret},at=Date.now()-1000;
 const oldIssueProject='P099 旧项目名称';
 assert.equal((await projectCorePushRoute(await signed(parse(),at),env)).status,200);
 assert.deepEqual(DB.stored.items[0].aliases,['旧项目名称','旧简称']);
 assert.equal(projectLabel(oldIssueProject,DB.stored.items),'PM021 旧项目名称');
 tab.rows[0][1]='PM022';
 assert.equal((await projectCorePushRoute(await signed(parse(),at+1),env)).status,200);
 assert.equal(projectLabel(oldIssueProject,DB.stored.items),'PM022 旧项目名称');
 const invalid=parse();
 invalid.items[0].aliases=['   '];
 assert.equal((await projectCorePushRoute(await signed(invalid,at+2),env)).status,400);
 assert.equal(projectLabel(oldIssueProject,DB.stored.items),'PM022 旧项目名称');
 tab.rows.splice(1,1);
 assert.equal((await projectCorePushRoute(await signed(parse(),at+3),env)).status,200);
 assert.equal(projectLabel(oldIssueProject,DB.stored.items),'旧项目名称');
});
test('template parser preserves units, per-device loads, efficiency conditions and excludes private fields',()=>{const result=payload(),item=result.items[0];assert.match(item.supplyScope,/表列数量：4台/);assert.match(item.transport,/贸易条件/);assert.match(item.palletSize,/1200×800 mm托盘/);assert.match(item.equipmentLoad,/800 kg/);assert.match(item.equipmentLoad,/1300 kg/);assert.match(item.equipmentLoad,/待确认/);assert.match(item.efficiency,/效率不作为验收依据/);assert(!JSON.stringify(result).includes('PRIVATE CONTACT'));assert(!JSON.stringify(result).includes('9000000'));const extra=sheet();extra.rows.splice(0,0,['自定义说明','可以插行']);assert.equal(parseProjectCoreSheets(source([extra]),'2026-10-21').items[0].projectCode,'QA001');});
test('ten-category source rows survive parsing and signed storage through the page summary',async()=>{
 const names=['货架系统','四向车系统','提升机系统','输送线系统','电气控制系统','软件系统（RMS/WMS/WCS）','网络及 IT 设备','安装调试及培训','备品备件及工具','其他'],tab=sheet();
 const start=tab.rows.findIndex(row=>row[0]==='1'),end=tab.rows.findIndex(row=>row[0]==='06  项目核心预算');
 tab.rows.splice(start,end-start,...names.map((name,i)=>[String(i+1),name,'',i===9?'运输1项\n保险1项':'示例供货内容','','',String(i+1),'套','示例供方','','','示例备注'+i]));
 const parsed={...parseProjectCoreSheets(source([tab]),'2026-11-03'),automationInstalled:true},DB=database();
 assert.equal((await projectCorePushRoute(await signed(parsed),{DB,PROJECT_CORE_SYNC_SECRET:secret})).status,200);
 const summary=summarizeProjectCore(DB.stored.items[0]);assert.deepEqual(summary.supplyScope.map(x=>x.category),names);
 for(let i=0;i<10;i++){assert.equal(summary.supplyScope[i].value,(i+1)+' 套');assert.match(summary.supplyDetails[i].value,new RegExp('示例备注'+i));}
 assert.match(summary.supplyDetails[9].value,/运输1项\n保险1项/);assert(!JSON.stringify(DB.stored).includes('PRIVATE CONTACT'));
});
test('contract amount comes only from the commercial section and survives signed storage',async()=>{
 const contractRow=(amount,currency='',tax='')=>['合同总金额',amount,'','','币种',currency,'','','含税/未税',tax];
 const tabs=['QA001','QA002','QA003','QA004'].map((code,i)=>({...sheet(code),id:i+1}));
 for(const [i,row] of [contractRow('1,250.00','USD','含税'),contractRow('0'),contractRow('','CNY')].entries()){
  tabs[i].rows.splice(2,0,['02  商务与金额'],row,['03  项目要求']);
 }
 const parsed={...parseProjectCoreSheets(source(tabs),'2026-11-09'),automationInstalled:true};
 const expected=['1,250.00 USD（含税）','0（币种待确认）','',''];
 assert.deepEqual(parsed.items.map(item=>item.contractAmount),expected);
 const DB=database(),env={DB,TRACKER_USER:'u',TRACKER_PASSWORD:'p',PROJECT_CORE_SYNC_SECRET:secret},stamp=Date.now()-1000;
 assert.equal((await projectCorePushRoute(await signed(parsed,stamp),env)).status,200);
 const request=new Request('https://test.local/api/project-core-information',{headers:{Authorization:'Basic '+btoa('u:p')}});
 const saved=await (await worker.fetch(request,env)).json();
 assert.deepEqual(saved.items.map(item=>item.contractAmount),expected);
 parsed.items[0].contractAmount=1250;
 assert.equal((await projectCorePushRoute(await signed(parsed,stamp+1),env)).status,400);
 assert.equal(DB.stored.items[0].contractAmount,expected[0]);
});
test('malformed, empty, duplicate or incomplete source sheets cannot clear a snapshot',()=>{for(const s of [source([]),source([sheet(),sheet()]),source([{...sheet(),rows:[['项目编号','QA001']]}]),{...source([sheet()]),spreadsheetId:'wrong'}])assert.throws(()=>parseProjectCoreSheets(s,'2026-10-21'));const s=sheet();s.rows.push(['项目编号','different']);assert.throws(()=>parseProjectCoreSheets(source([s]),'2026-10-21'));});
test('push requires configured secret, valid signature, timestamp, bounded JSON and verified source',async()=>{const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret};assert.equal((await projectCorePushRoute(await signed(payload()),{DB})).status,503);assert.equal((await projectCorePushRoute(new Request('https://test.local',{method:'GET'}),env)).status,405);for(const req of [await signed(payload(),Date.now()-400000),await signed(payload(),Date.now(),{'X-Project-Core-Signature':'0'.repeat(64)}),await signed(payload(),Date.now(),{'X-Project-Core-Timestamp':'bad'})])assert.equal((await projectCorePushRoute(req,env)).status,401);assert.equal((await projectCorePushRoute(await signed(payload(),Date.now(),{'Content-Type':'text/plain'}),env)).status,415);for(const p of ['{',{}, {...payload(),sourceSpreadsheetId:'wrong'}, {...payload(),items:[]},{...payload(),items:[{...payload().items[0],efficiency:7}]}])assert.equal((await projectCorePushRoute(await signed(p),env)).status,400);assert.equal((await projectCorePushRoute(await signed(' '.repeat(1000001)),env)).status,413);assert.equal(DB.writes,0);});
test('atomic signed push handles retries, stale requests, removed projects, conflicts and storage failures',async()=>{const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret},at=Date.now()-5000,first=payload();assert.equal((await worker.fetch(await signed(first,at),env)).status,200,'push uses its own signature before login');assert.equal(DB.stored.items[0].efficiency,first.items[0].efficiency);assert.equal(DB.stored.syncVersion,at);assert.equal((await projectCorePushRoute(await signed(first,at),env)).status,200);assert.equal(DB.writes,1);assert.equal((await projectCorePushRoute(await signed(first,at-1),env)).status,409);const next={...first,items:[{...first.items[0],efficiency:'入库99托/小时'}]};assert.equal((await projectCorePushRoute(await signed(next,at+1),env)).status,200);assert.equal(DB.stored.items[0].efficiency,'入库99托/小时');const removed={...first,items:[{...first.items[0],projectCode:'QA002',sourceSheetId:2}]};assert.equal((await projectCorePushRoute(await signed(removed,at+2),env)).status,409);DB.conflict=true;assert.equal((await projectCorePushRoute(await signed(first,at+3),env)).status,409);DB.conflict=false;DB.fail=true;assert.equal((await projectCorePushRoute(await signed(first,at+4),env)).status,503);assert.equal(DB.stored.items[0].efficiency,'入库99托/小时');assert.equal(DB.writes,2);});
test('configured sync disables manual replacement and reports activation without exposing keys',async()=>{const DB=database(),env={DB,TRACKER_USER:'u',TRACKER_PASSWORD:'p',PROJECT_CORE_SYNC_SECRET:secret};const req=method=>new Request('https://test.local/api/project-core-information',{method,headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local'}});let r=await worker.fetch(req('GET'),env),j=await r.json();assert.equal(j.sync.configured,true);assert.equal(j.sync.connected,false);assert(!JSON.stringify(j).includes(secret));assert.equal((await worker.fetch(req('PUT'),env)).status,409);await projectCorePushRoute(await signed(payload()),env);j=await(await worker.fetch(req('GET'),env)).json();assert.equal(j.sync.automationInstalled,true);assert(j.sync.lastSyncedAt);});
test('generated Apps Script parser matches canonical source',()=>{const script=readFileSync(new URL('../google-apps-script/project-core-sync.gs',import.meta.url),'utf8'),context={};vm.createContext(context);vm.runInContext(script,context);assert.deepEqual(JSON.parse(JSON.stringify(context.parseProjectCoreSheets(source([sheet()]),'2026-10-21'))),parseProjectCoreSheets(source([sheet()]),'2026-10-21'));const parser=readFileSync(new URL('../project-budget.mjs',import.meta.url),'utf8').replace(/export /g,'')+'\n'+readFileSync(new URL('../project-core-sheet.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/export /g,'');assert(script.replace(/\r\n/g,'\n').includes(parser.replace(/\r\n/g,'\n')));});

test('Apps Script only records successful pushes, retries failures, signs exact body and skips unchanged data',async()=>{
 const script=readFileSync(new URL('../google-apps-script/project-core-sync.gs',import.meta.url),'utf8'),properties={PROJECT_CORE_SYNC_SECRET:secret};let responseCode=500,calls=0,lastOptions,released=0;
 const toSigned=b=>Array.from(b,v=>v>127?v-256:v);
 const tab={getName:()=> 'PM001 示例项目',getSheetId:()=>1,getLastRow:()=>sheet().rows.length,getLastColumn:()=>12,getRange:()=>({getDisplayValues:()=>sheet().rows})};
 const spreadsheet={getId:()=>PROJECT_CORE_SOURCE_ID,getName:()=> '示例表',getSheets:()=>[tab],toast:()=>{}};
 const context={console:{log:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k],setProperties:values=>Object.assign(properties,values)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released++})},SpreadsheetApp:{openById:()=>spreadsheet},ScriptApp:{getProjectTriggers:()=>['projectCoreEdited','projectCoreChanged','projectCoreTimer'].map(name=>({getHandlerFunction:()=>name}))},Utilities:{formatDate:()=> '2026-10-21',Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,body)=>toSigned(createHash('sha256').update(body).digest()),computeHmacSha256Signature:(value,key)=>toSigned(createHmac('sha256',key).update(value).digest())},UrlFetchApp:{fetch:(_,options)=>{calls++;lastOptions=options;return {getResponseCode:()=>responseCode,getContentText:()=>JSON.stringify(responseCode===200?{ok:true}:{error:'隔离测试失败'})}}}};
 vm.createContext(context);vm.runInContext(script,context);
 assert.throws(()=>context.pushProjectCore_(false),/隔离测试失败/);assert.equal(properties.PROJECT_CORE_LAST_SUCCESS_HASH,undefined);assert.equal(calls,1);
 responseCode=200;context.pushProjectCore_(false);assert(properties.PROJECT_CORE_LAST_SUCCESS_HASH);assert.equal(calls,2);context.pushProjectCore_(false);assert.equal(calls,2);assert.equal(released,3);
 const request=new Request('https://test.local/api/project-core-information/push',{method:'POST',headers:{'Content-Type':lastOptions.contentType,...lastOptions.headers},body:lastOptions.payload});
 const DB=database();assert.equal((await projectCorePushRoute(request,{DB,PROJECT_CORE_SYNC_SECRET:secret})).status,200);assert.equal(DB.stored.automationInstalled,true);assert(!lastOptions.payload.includes('PRIVATE CONTACT'));
});

// Installing from the script editor has no spreadsheet UI context.
test('Apps Script installer completes without invoking spreadsheet UI',()=>{
 const script=readFileSync(new URL('../google-apps-script/project-core-sync.gs',import.meta.url),'utf8');
 let pushes=0,toasts=0;const created=[];
 const spreadsheet={getId:()=>PROJECT_CORE_SOURCE_ID,toast:()=>toasts++};
 const context={SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,getUi:()=>{throw Error('Cannot call SpreadsheetApp.getUi() from this context.')}},ScriptApp:{getProjectTriggers:()=>[],newTrigger:name=>{const trigger={forSpreadsheet:()=>trigger,onEdit:()=>trigger,onChange:()=>trigger,onOpen:()=>trigger,timeBased:()=>trigger,everyMinutes:()=>trigger,create:()=>{created.push(name);return trigger}};return trigger}}};
 vm.createContext(context);vm.runInContext(script,context);context.syncProjectCoreNow=()=>pushes++;
 context.installProjectCoreSync();assert.equal(pushes,2);assert.equal(toasts,1);assert.deepEqual(created,['projectCoreEdited','projectCoreChanged','projectCoreTimer','projectCoreOpened']);
});

test('stable sheet identity accepts source renumbering and rejects replacement even with the same code',async()=>{const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret},at=Date.now()-1000,first=payload();assert.equal((await projectCorePushRoute(await signed(first,at),env)).status,200);const renamed={...first,items:[{...first.items[0],projectCode:'QA099'}]};assert.equal((await projectCorePushRoute(await signed(renamed,at+1),env)).status,200);assert.equal(DB.stored.items[0].projectCode,'QA099');const replacement={...renamed,items:[{...renamed.items[0],sourceSheetId:999}]};assert.equal((await projectCorePushRoute(await signed(replacement,at+2),env)).status,409);assert.equal(DB.stored.items[0].sourceSheetId,1);const duplicate={...renamed,items:[renamed.items[0],{...renamed.items[0],projectCode:'QA100'}]};assert.equal((await projectCorePushRoute(await signed(duplicate,at+3),env)).status,400);});

test('budget extracts only the approved section, preserves zero and unknowns, and ignores unrelated financial/contact data',()=>{
 const tab=sheet();tab.rows.push(['06 项目核心预算']);
 // Replace the existing empty budget section, keeping the rest of the sample unchanged.
 const start=tab.rows.findIndex(row=>row[0]==='06  项目核心预算');tab.rows=tab.rows.slice(0,start);
 tab.rows.push(['06 项目核心预算'],['预算币种','待确认','','','金额口径','未税元值｜五类核心费用；非项目总成本'],['安装费用','30,000.00','','','运输费用','0.00','','','质保费用','待确认'],['实施费用','100,000.00','','','风险金','7,936.33','','','已识别小计','137,936.33'],['五类合计','待确认','','','复核状态','质保未单列'],['预算说明','四类小计，非完整成本'],['预算来源','源表预算区块'],['联系人','PRIVATE CONTACT'],['合同总金额','9000000'],['07 关键日期'],['安装费用','不得读取后续区块']);
 const parsed=parseProjectCoreSheets(source([tab]),'2026-10-31'),budget=parsed.items[0].budget;
 assert.equal(budget.transport,'0.00');assert.equal(budget.warranty,'待确认');assert.equal(budget.installation,'30,000.00');assert.equal(budget.total,'待确认');assert.equal(budget.currency,'待确认');assert(!JSON.stringify(budget).includes('PRIVATE CONTACT'));assert(!JSON.stringify(budget).includes('9000000'));
 tab.rows.splice(start+2,0,['安装费用','重复']);assert.throws(()=>parseProjectCoreSheets(source([tab]),'2026-10-31'),/重复字段/);
});
test('budget nested under commerce syncs the current template without mixing contract and budget amounts',async()=>{
 const tab=sheet();
 tab.rows=tab.rows.filter(row=>row[0]!=='06  项目核心预算');
 tab.rows.splice(3,0,
  ['02  商务与金额'],
  ['合同金额','9,876.00','','','币种','USD','','','含税/未税','含税'],
  ['付款方式','示例付款方式'],
  ['核心预算'],
  ['预算币种','CNY','','','金额口径','未税'],
  ['安装费用','1,234.00','','','运输费用','0.00','','','质保费用','待确认'],
  ['实施费用','100.00','','','风险金','内含未拆分','','','已识别小计','1,334.00'],
  ['五类合计','待确认','','','复核状态','质保待复核'],
  ['03  项目地址与现场条件'],
  ['预算说明','后续区块的内容不得进入预算']
 );
 const parsed={...parseProjectCoreSheets(source([tab]),'2026-11-10'),automationInstalled:true};
 const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret};
 assert.equal((await projectCorePushRoute(await signed(parsed),env)).status,200);
 const item=DB.stored.items[0];
 assert.equal(item.contractAmount,'9,876.00 USD（含税）');
 assert.deepEqual(item.budget,{
  currency:'CNY',basis:'未税',installation:'1,234.00',transport:'0.00',warranty:'待确认',
  implementation:'100.00',risk:'内含未拆分',identifiedSubtotal:'1,334.00',total:'待确认',
  review:'质保待复核',note:'',source:''
 });
});
test('signed budget updates persist all fields atomically and invalid data preserves the last successful budget',async()=>{
 const {PROJECT_BUDGET_FIELDS}=await import('../project-budget.mjs');const DB=database(),env={DB,PROJECT_CORE_SYNC_SECRET:secret},at=Date.now()-5000;
 const budget=Object.fromEntries(PROJECT_BUDGET_FIELDS.map(([key])=>[key,'待确认']));budget.transport='0.00';
 const first=payload();first.items[0].budget=budget;assert.equal((await projectCorePushRoute(await signed(first,at),env)).status,200);assert.deepEqual(DB.stored.items[0].budget,budget);
 const next=structuredClone(first);next.items[0].budget.installation='30,000.00';assert.equal((await projectCorePushRoute(await signed(next,at+1),env)).status,200);assert.equal(DB.stored.items[0].budget.installation,'30,000.00');
 const invalid=structuredClone(next);invalid.items[0].budget.recipient='PRIVATE CONTACT';assert.equal((await projectCorePushRoute(await signed(invalid,at+2),env)).status,400);assert.deepEqual(DB.stored.items[0].budget,next.items[0].budget);
});
