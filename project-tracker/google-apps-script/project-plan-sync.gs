// Standalone script. Use the OAuth scopes in project-plan-appsscript.json.
const PROJECT_PLAN_ENDPOINT='https://tracker.managementplatformlee.com/api/project-plan/push';

function installProjectPlanSync(){
 pushProjectPlan_(true);
 const previous=ScriptApp.getProjectTriggers().filter(trigger=>trigger.getHandlerFunction()==='projectPlanTimer');
 ScriptApp.newTrigger('projectPlanTimer').timeBased().everyMinutes(5).create();
 previous.forEach(trigger=>ScriptApp.deleteTrigger(trigger));
 console.log('项目计划已自动同步，每5分钟检查一次。');
}

function uninstallProjectPlanSync(){
 ScriptApp.getProjectTriggers().filter(trigger=>trigger.getHandlerFunction()==='projectPlanTimer').forEach(trigger=>ScriptApp.deleteTrigger(trigger));
}
function projectPlanTimer(){pushProjectPlan_(false);}
function syncProjectPlanNow(){pushProjectPlan_(true);}

function readProjectPlanSheets_(){
 const tabs=Sheets.Spreadsheets.get(PROJECT_PLAN_SOURCE_ID,{fields:'sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))'}).sheets
  .map(sheet=>sheet.properties);
 const projectTabs=tabs.filter(sheet=>PROJECT_PLAN_TAB.test(sheet.title));
 if(!projectTabs.length||projectTabs.length>200)throw Error('项目页数量超出范围。');
 const sheets=[];
 for(let i=0;i<projectTabs.length;i+=10){
  const batch=projectTabs.slice(i,i+10);
  const ranges=batch.map(sheet=>{
   const {rowCount,columnCount}=sheet.gridProperties;
   if(rowCount>1000||columnCount<9)throw Error('项目页超出支持范围，请核对源表。');
   return "'"+sheet.title.replace(/'/g,"''")+"'!A1:I"+rowCount;
  });
  const values=Sheets.Spreadsheets.Values.batchGet(PROJECT_PLAN_SOURCE_ID,{ranges,valueRenderOption:'FORMATTED_VALUE'}).valueRanges;
  if(values?.length!==batch.length)throw Error('源表返回的项目页不完整。');
  batch.forEach((sheet,index)=>sheets.push({sheetId:sheet.sheetId,name:sheet.title,rows:values[index].values||[]}));
 }
 return {sheets,sourceSheetIds:tabs.map(tab=>tab.sheetId)};
}

function pushProjectPlan_(force){
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(1000)){if(force)throw Error('正在同步，请稍后重试。');return;}
 try{
  const properties=PropertiesService.getScriptProperties();
  const secret=properties.getProperty('PROJECT_PLAN_SYNC_SECRET');
  if(!secret||secret.length<32)throw Error('请先配置项目计划同步密钥。');
  const {sheets,sourceSheetIds}=readProjectPlanSheets_();
  const snapshot=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,sheets);
  const body=JSON.stringify({...snapshot,sourceSheetIds});
  const hex=bytes=>bytes.map(value=>(value&255).toString(16).padStart(2,'0')).join('');
  const hash=hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,body,Utilities.Charset.UTF_8));
  if(!force&&hash===properties.getProperty('PROJECT_PLAN_LAST_HASH'))return;
  const timestamp=String(Date.now());
  const signature=hex(Utilities.computeHmacSha256Signature(timestamp+'.'+body,secret,Utilities.Charset.UTF_8));
  const response=UrlFetchApp.fetch(PROJECT_PLAN_ENDPOINT,{method:'post',contentType:'application/json; charset=utf-8',payload:body,headers:{'X-Project-Plan-Timestamp':timestamp,'X-Project-Plan-Signature':signature},followRedirects:false,muteHttpExceptions:true});
  const result=JSON.parse(response.getContentText());
  if(response.getResponseCode()!==200||!result.ok)throw Error(result.error||'项目计划同步失败。');
  properties.setProperty('PROJECT_PLAN_LAST_HASH',hash);
  if(force)console.log('项目计划同步成功，共 '+result.count+' 个项目。');
 }finally{lock.releaseLock();}
}
/* PROJECT_PLAN_PARSER_START */
const PROJECT_PLAN_SOURCE_ID='1HK5vt_agyRTJvfGGoDbo0E76-o5k04Iy8z6Xdsz9nRA';
const PROJECT_PLAN_TAB=/^((?:PM|P)\d+)[\s-]+(.+?)标准任务清单$/;
const projectPlanFields=[
 ['phase','阶段',120],['module','模块',120],['title','标准任务',400],['applicability','是否适用',10],
 ['department','责任部门',120],['start','计划开始时间',40],['end','计划完成日期',40],['status','状态',80]
];
const planText=value=>String(value??'').trim();
function normalizeProjectPlanSnapshot(source){
 if(source?.sourceSpreadsheetId!==PROJECT_PLAN_SOURCE_ID||!Array.isArray(source.projects)||!source.projects.length||source.projects.length>200)throw Error('项目计划来源或项目页数量不正确');
 const ids=new Set(),codes=new Set();
 const projects=source.projects.map(project=>{
  const match=typeof project?.sourceSheet==='string'&&project.sourceSheet.length<=300&&project.sourceSheet.match(PROJECT_PLAN_TAB);
  if(!match||!Number.isSafeInteger(project.sheetId)||project.sheetId<0||ids.has(project.sheetId)||codes.has(match[1])||
   !Array.isArray(project.tasks)||!project.tasks.length||project.tasks.length>1000)throw Error('项目页无效、重复或任务为空');
  ids.add(project.sheetId);codes.add(match[1]);
  const rows=new Set();
  const tasks=project.tasks.map(task=>{
   if(!Number.isSafeInteger(task?.row)||task.row<2||task.row>1000||rows.has(task.row))throw Error('任务行无效或重复');
   rows.add(task.row);
   const clean={row:task.row};
   for(const [key,,limit] of projectPlanFields){
    if(typeof task[key]!=='string'||task[key].length>limit)throw Error('任务字段无效或过长');
    clean[key]=task[key].trim();
   }
   if(!clean.title||!['','是','否'].includes(clean.applicability))throw Error('任务名称或适用性无效');
   return clean;
  });
  return {sheetId:project.sheetId,sourceSheet:project.sourceSheet,code:match[1],name:match[2].trim(),tasks};
 });
 return {sourceSpreadsheetId:PROJECT_PLAN_SOURCE_ID,projects};
}

function parseProjectPlanSheets(spreadsheetId,sheets){
 const projects=sheets.map(sheet=>{
  const headerIndex=sheet.rows.slice(0,12).findIndex(row=>projectPlanFields.every(([,label])=>row.filter(cell=>planText(cell)===label).length===1));
  if(headerIndex<0)throw Error('未找到项目任务表头，请核对源表');
  const header=sheet.rows[headerIndex].map(planText);
  const columns=projectPlanFields.map(([key,label])=>[key,header.indexOf(label)]);
  const titleColumn=header.indexOf('标准任务');
  const tasks=sheet.rows.slice(headerIndex+1).flatMap((row,index)=>planText(row[titleColumn])?
   [{row:headerIndex+index+2,...Object.fromEntries(columns.map(([key,column])=>[key,planText(row[column])]))}]:[]);
  return {sheetId:sheet.sheetId,sourceSheet:sheet.name,tasks};
 });
 return normalizeProjectPlanSnapshot({sourceSpreadsheetId:spreadsheetId,projects});
}

/* PROJECT_PLAN_PARSER_END */
