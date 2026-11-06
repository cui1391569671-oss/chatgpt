export const PROJECT_PLAN_SOURCE_ID='1HK5vt_agyRTJvfGGoDbo0E76-o5k04Iy8z6Xdsz9nRA';
export const PROJECT_PLAN_TAB=/^((?:PM|P)\d+)[\s-]+(.+?)标准任务清单$/;
const projectPlanFields=[
 ['phase','阶段',120],['module','模块',120],['title','标准任务',400],['applicability','是否适用',10],
 ['department','责任部门',120],['start','计划开始时间',40],['end','计划完成日期',40],['status','状态',80]
];
const planText=value=>String(value??'').trim();
export function normalizeProjectPlanSnapshot(source){
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

export function parseProjectPlanSheets(spreadsheetId,sheets){
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
