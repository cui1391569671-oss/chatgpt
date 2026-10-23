// Project-only validation. Legacy violations may survive unchanged, but cannot be introduced or worsened.
import {equalRecord,canonical} from './cloud-records.mjs';
export const PROJECT_TEXT_LIMITS={project:120,task:5000,reason:10000,note:20000};
export function realDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
const validStamp=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
function rowIssues(row){
 const issues=[];const add=(field,rule)=>issues.push({field,rule});
 if(!row||typeof row!=='object'||Array.isArray(row))return [{field:'',rule:'record-object'}];
 for(const [field,max] of Object.entries(PROJECT_TEXT_LIMITS))if(typeof row[field]!=='string'||row[field].length>max||field==='project'&&!row[field].trim())add(field,'text-limit');
 if(row.id!==undefined&&(typeof row.id!=='string'||!row.id||row.id.length>200))add('id','record-id');
 if(row.plannedDate!==''&&!realDate(row.plannedDate))add('plannedDate','calendar-date');
 if(!['进行中','暂停','已完成'].includes(row.status))add('status','status');
 if(typeof row.done!=='boolean'||row.done!==(row.status==='已完成'))add('done','completion-state');
 if(row.archivedAt!==undefined&&!validStamp(row.archivedAt))add('archivedAt','timestamp');
 return issues;
}
const withoutId=row=>{if(!row||typeof row!=='object')return row;const {id,...rest}=row;return rest;};
function rowLookup(rows){
 const byId=new Map();for(const row of rows||[])if(row?.id&&!byId.has(row.id))byId.set(row.id,row);
 let byContent,legacyContent;return row=>{
  if(row?.id&&byId.has(row.id))return byId.get(row.id);
  if(!byContent){byContent=new Map();legacyContent=new Map();for(const old of rows||[]){const key=JSON.stringify(canonical(withoutId(old)));byContent.set(key,old);if(!old?.id)legacyContent.set(key,old);}}
  return (row?.id?legacyContent:byContent).get(JSON.stringify(canonical(withoutId(row))));
 };
}
export function projectValidationIssues(next,previous){
 const issues=[];
 const historicalRows=[...(previous?.data||[]),...(previous?.archive||[]),...(previous?.deletedProjects||[]).filter(item=>item&&typeof item==='object').flatMap(item=>[...(Array.isArray(item.data)?item.data:[]),...(Array.isArray(item.archive)?item.archive:[])])];
 const historical=rowLookup(historicalRows);
 const inspectRows=(rows,oldRows,path)=>{
  if(!Array.isArray(rows)){issues.push({path,rule:'record-array'});return;}
  const ids=new Set(),lookup=rowLookup(oldRows),oldCounts=new Map(),counts=new Map();
  for(const row of oldRows||[])if(row?.id)oldCounts.set(row.id,(oldCounts.get(row.id)||0)+1);
  for(const row of rows)if(row?.id)counts.set(row.id,(counts.get(row.id)||0)+1);
  rows.forEach((row,index)=>{
   const old=lookup(row)||historical(row);
   for(const issue of rowIssues(row)){
    const value=issue.field?row?.[issue.field]:row,oldValue=issue.field?old?.[issue.field]:old;
    if(old&&equalRecord(value,oldValue))continue;
    issues.push({path:[...path,index,issue.field].filter(x=>x!==''),rule:issue.rule});
   }
   if(row?.id){if(ids.has(row.id)&&(counts.get(row.id)>(oldCounts.get(row.id)||0)))issues.push({path:[...path,index,'id'],rule:'duplicate-id'});ids.add(row.id);}
  });
 };
 for(const collection of ['data','archive'])inspectRows(next?.[collection],previous?.[collection],[collection]);
 if(!Array.isArray(next?.deletedProjects??[]))issues.push({path:['deletedProjects'],rule:'record-array'});
 else {const lookup=rowLookup(previous?.deletedProjects);(next.deletedProjects||[]).forEach((item,index)=>{
  const old=lookup(item),path=['deletedProjects',index];
  if(!item||typeof item!=='object'){issues.push({path,rule:'record-object'});return;}
  const checks={name:typeof item.name==='string'&&!!item.name.trim()&&item.name.length<=120,deletedAt:item.deletedAt===undefined||validStamp(item.deletedAt),priority:item.priority===undefined||['urgent','high','medium','low',''].includes(item.priority)};
  for(const [field,valid] of Object.entries(checks))if(!valid&&(!old||!equalRecord(item[field],old[field])))issues.push({path:[...path,field],rule:field==='name'?'project-name':field==='deletedAt'?'timestamp':'priority'});
  for(const collection of ['data','archive'])inspectRows(item[collection],old?.[collection],[...path,collection]);
 });}
 return issues;
}
export function assertProjectChanges(previous,next){
 const issues=projectValidationIssues(next,previous);
 if(issues.length)throw new Error('项目数据校验失败：'+issues[0].path.join('.')+'（'+issues[0].rule+'）');
}
