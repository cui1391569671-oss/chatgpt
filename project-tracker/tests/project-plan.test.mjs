import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {PROJECT_PLAN_SOURCE_ID,parseProjectPlanSheets,normalizeProjectPlanSnapshot} from '../project-plan-sheet.mjs';
import {projectPlanSheetUrls} from '../tasks-ui/src/project-plan-embed.mjs';
import {workspaceSiteNavigation} from '../tasks-ui/src/workspace-page-meta.mjs';

const sheet={
 sheetId:17,name:'PM001-演示标准任务清单',
 rows:[['演示标题'],['备注'],['标准任务','计划完成日期','状态','阶段','是否适用','模块','计划开始时间','责任部门','其他信息'],
  ['设备试运行','2027-01-01','进行中','实施','是','输送线','2026-12-31','项目部','不要同步'],
  ['联调确认','待定','未开始','实施','是','通用','2027-01-05','项目部'],
  [''],['预验收','','未开始','验收','是','通用','','项目部'],
  ['选配项目','2027-01-11','不适用','验收','否','通用','2027-01-08','项目部']]
};

test('project plan extracts fields by header, retains row numbers and pending tasks, and whitelists source data',()=>{
 const snapshot=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[sheet]);
 assert.equal(snapshot.projects[0].code,'PM001');
 assert.deepEqual(snapshot.projects[0].tasks.map(row=>row.row),[4,5,7,8]);
 assert.deepEqual(snapshot.projects[0].tasks.map(({start,end})=>[start,end]),[['2026-12-31','2027-01-01'],['2027-01-05','待定'],['',''],['2027-01-08','2027-01-11']]);
 assert.deepEqual(normalizeProjectPlanSnapshot(snapshot),snapshot);
 assert(!JSON.stringify(snapshot).includes('不要同步'));
 assert.throws(()=>parseProjectPlanSheets('wrong',[sheet]));
 assert.throws(()=>parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[sheet,sheet]));
 assert.throws(()=>parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[{...sheet,rows:[['missing']]}]));
});

test('embedded original sheet keeps the verified workbook and numeric worksheet deep links',()=>{
 const urls=projectPlanSheetUrls('2074887405'),source=new URL(urls.source),embed=new URL(urls.embed);
 assert.equal(source.origin,'https://docs.google.com');
 assert.equal(source.pathname,'/spreadsheets/d/'+PROJECT_PLAN_SOURCE_ID+'/edit');
 assert.equal(source.hash,'#gid=2074887405');
 assert.equal(embed.pathname,source.pathname);
 assert.equal(embed.searchParams.get('rm'),'minimal');
 assert.equal(embed.hash,source.hash);
 for(const input of [null,'','-1','1.5','9007199254740992','https://example.com','17&usp=sharing']){
  const result=projectPlanSheetUrls(input);
  assert.equal(new URL(result.embed).hash,'');
  assert.equal(new URL(result.embed).origin,source.origin);
 }
});

test('project plan is a work-only navigation route and Apps Script uses the same parser',()=>{
 const group=workspaceSiteNavigation('work').find(group=>group.title==='项目计划');
 assert.equal(group.direct,true);assert.deepEqual(group.items,[['work','projectPlan']]);
 assert(!workspaceSiteNavigation('personal').some(group=>group.items.some(([,view])=>view==='projectPlan')));
 const script=readFileSync(new URL('../google-apps-script/project-plan-sync.gs',import.meta.url),'utf8');
 const parser=readFileSync(new URL('../project-plan-sheet.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
 assert(script.includes(parser));
});

test('Apps Script inventories all source sheet IDs and rejects a partial task read',()=>{
 const script=readFileSync(new URL('../google-apps-script/project-plan-sync.gs',import.meta.url),'utf8');
 const gridProperties={rowCount:20,columnCount:9};
 const tabs=[{sheetId:17,title:sheet.name,gridProperties},{sheetId:18,title:'已改名的项目页',gridProperties}];
 let valueRanges=[{values:sheet.rows}];
 const spreadsheetApi={
  get(id){assert.equal(id,PROJECT_PLAN_SOURCE_ID);return {sheets:tabs.map(properties=>({properties}))};},
  Values:{batchGet(id,{ranges}){
   assert.equal(id,PROJECT_PLAN_SOURCE_ID);
   assert.deepEqual(Array.from(ranges),["'"+sheet.name+"'!A1:I20"]);
   return {valueRanges};
  }}
 };
 const context={Sheets:{Spreadsheets:spreadsheetApi}};
 runInNewContext(script,context);
 const result=JSON.parse(JSON.stringify(context.readProjectPlanSheets_()));
 assert.deepEqual(result,{sheets:[sheet],sourceSheetIds:[17,18]});
 valueRanges=[];
 assert.throws(()=>context.readProjectPlanSheets_(),/源表返回的项目页不完整/);
});
