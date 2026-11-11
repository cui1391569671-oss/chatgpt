import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {PROJECT_PLAN_SOURCE_ID,parseProjectPlanSheets,normalizeProjectPlanSnapshot,normalizeProjectPlanPreview,projectPlanPreviewFromGrid} from '../project-plan-sheet.mjs';
import {projectPlanDefaultMode,projectPlanSheetUrls} from '../tasks-ui/src/project-plan-embed.mjs';
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
 let grids=[{properties:tabs[0],data:[{rowData:sheet.rows.map(row=>({values:row.map(formattedValue=>({formattedValue}))}))}]}];
 const spreadsheetApi={
  get(id,{ranges}){
   assert.equal(id,PROJECT_PLAN_SOURCE_ID);
   if(!ranges)return {sheets:tabs.map(properties=>({properties}))};
   assert.deepEqual(Array.from(ranges),["'"+sheet.name+"'!A1:I20"]);
   return {sheets:grids};
  }
 };
 const context={Sheets:{Spreadsheets:spreadsheetApi}};
 runInNewContext(script,context);
 const result=JSON.parse(JSON.stringify(context.readProjectPlanSheets_()));
 assert.deepEqual(result.sourceSheetIds,[17,18]);
 assert.deepEqual(result.sheets[0].rows,sheet.rows.map(row=>Array.from({length:9},(_,i)=>row[i]||'')));
 assert.equal(result.sheets[0].preview.columns.length,9);
 grids=[];
 assert.throws(()=>context.readProjectPlanSheets_(),/源表返回的项目页不完整/);
});

test('Safari defaults to private preview while desktop Chrome and iOS Chrome retain original embedding',()=>{
 assert.equal(projectPlanDefaultMode('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'),'preview');
 assert.equal(projectPlanDefaultMode('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'),'preview');
 assert.equal(projectPlanDefaultMode('Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'),'preview');
 assert.equal(projectPlanDefaultMode('Chrome/142.0 Safari/537.36','preview'),'preview');
 assert.equal(projectPlanDefaultMode('','https://example.com'),'original');
 for(const ua of ['', 'Mozilla/5.0 AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36','Mozilla/5.0 AppleWebKit/605.1.15 CriOS/142.0.0.0 Mobile/15E148 Safari/604.1','Mozilla/5.0 Gecko/20100101 Firefox/144.0'])assert.equal(projectPlanDefaultMode(ua),'original');
});

const gridFixture=()=>({properties:{sheetId:17,title:sheet.name,gridProperties:{columnCount:9,frozenRowCount:3}},
 merges:[{startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:9}],data:[{
  rowData:sheet.rows.map((row,r)=>({values:row.map((text,c)=>({formattedValue:text,effectiveFormat:{backgroundColor:{red:1,green:1,blue:1},textFormat:{bold:r<3,fontSize:11},wrapStrategy:'WRAP'},
   ...(r===4&&c===0?{dataValidation:{condition:{type:'BOOLEAN'}},effectiveValue:{boolValue:true}}:{})}))})),
  columnMetadata:Array.from({length:9},(_,i)=>({pixelSize:i===0?300:120,hiddenByUser:i===8})),
  rowMetadata:sheet.rows.map((_,i)=>({pixelSize:i===0?40:28,hiddenByFilter:i===5}))
 }]});

test('private snapshot preserves formatted results, merges, dimensions, hidden cells and readonly checkboxes without formulas',()=>{
 const grid=gridFixture();grid.data[0].rowData[0].values[0].userEnteredValue={formulaValue:'=SECRET()'};
 const preview=projectPlanPreviewFromGrid(grid);
 assert.equal(preview.columns[0],300);assert.equal(preview.heights[0],40);
 assert.deepEqual(preview.merges,[[0,0,1,9]]);assert.deepEqual(preview.hiddenRows,[5]);assert.deepEqual(preview.hiddenColumns,[8]);
 assert.equal(preview.frozenRows,3);assert.equal(preview.cells[4][0][2],true);
 assert(!JSON.stringify(preview).includes('SECRET'));
 const source={...sheet,preview};
 assert.deepEqual(parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[source]).projects[0].preview,preview);
 assert.deepEqual(normalizeProjectPlanPreview(preview),preview);
});

test('preview validation rejects CSS injection, oversized grids, invalid cell indices and overlapping merges',()=>{
 const valid=projectPlanPreviewFromGrid(gridFixture());
 for(const mutate of [
  p=>{p.styles[0][0]='url(https://example.com/leak)';},p=>{p.cells[0][0][1]=9999;},
  p=>{p.cells[0][0][0]='x'.repeat(5001);},p=>{p.columns[0]=100000;},
  p=>{p.merges.push([0,1,2,2]);},p=>{p.hiddenRows=[1,1];},p=>{p.merges=[[0,0,1,10]];},
  p=>{p.cells=Array(1001).fill(p.cells[0]);}
 ]){const next=structuredClone(valid);mutate(next);assert.throws(()=>normalizeProjectPlanPreview(next));}
 assert.throws(()=>projectPlanPreviewFromGrid({...gridFixture(),data:[{startRow:2,rowData:[{}]}]}));
});
