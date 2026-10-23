import {WORKSPACE_COLLECTIONS} from './cloud-records.mjs';
import {projectValidationIssues} from './project-validation.mjs';
export function auditState(state){
 const counts={projects:{data:state.data?.length||0,archive:state.archive?.length||0,deletedProjects:state.deletedProjects?.length||0},work:{},personal:{}};
 for(const [scope,key] of [['work','workWorkspace'],['personal','workspace']])for(const collection of WORKSPACE_COLLECTIONS)counts[scope][collection]=Array.isArray(state[key]?.[collection])?state[key][collection].length:0;
 const issues=projectValidationIssues(state),byRule={};for(const issue of issues)byRule[issue.rule]=(byRule[issue.rule]||0)+1;
 return {readOnly:true,payloadBytes:new TextEncoder().encode(JSON.stringify(state)).length,counts,projectValidation:{issueCount:issues.length,byRule,issues},automaticChanges:false};
}
function imageReferences(state){
 const refs=new Set();
 // Traverse all stored collections conservatively, including recurrence exceptions and historical records.
 const visit=value=>{if(typeof value==='string'&&/^\/api\/(wardrobe-images|calendar-images)\//.test(value))refs.add(value);else if(Array.isArray(value))for(const child of value)visit(child);else if(value&&typeof value==='object')for(const child of Object.values(value))visit(child);};
 visit(state);return refs;
}
export function previewImageCleanup(state,images){
 const refs=imageReferences(state),candidates=[],missing=[...refs];let totalBytes=0;
 for(const image of images){totalBytes+=image.bytes||0;const url=image.kind==='wardrobe'?'/api/wardrobe-images/'+image.id:'/api/calendar-images/'+image.scope+'/'+image.id;const index=missing.indexOf(url);if(index>=0)missing.splice(index,1);
  if(!refs.has(url))candidates.push({kind:image.kind,id:image.id,scope:image.scope||'personal',bytes:image.bytes||0,url,eligibleForDeletion:false,reason:'历史图片缺少可靠上传时间；仅预览，需复核引用与保留期。'});
 }
 return {readOnly:true,totalImages:images.length,totalBytes,unreferencedCount:candidates.length,unreferencedBytes:candidates.reduce((sum,item)=>sum+item.bytes,0),candidates,missingReferences:missing,automaticDeletion:false};
}
export async function maintenanceAudit(request,db,state){
 const url=new URL(request.url);if(request.method!=='GET')return Response.json({error:'只支持只读检查'},{status:405,headers:{'Cache-Control':'no-store'}});
 let result;
 if(url.pathname==='/api/maintenance/audit')result=auditState(state);
 else{
  const tables=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('wardrobe_images','calendar_images')").all();const names=new Set((tables.results||[]).map(row=>row.name)),images=[];
  if(names.has('wardrobe_images'))for(const row of (await db.prepare('SELECT id,length(bytes) AS bytes FROM wardrobe_images').all()).results||[])images.push({...row,kind:'wardrobe',scope:'personal'});
  if(names.has('calendar_images'))for(const row of (await db.prepare('SELECT id,scope,length(bytes) AS bytes FROM calendar_images').all()).results||[])images.push({...row,kind:'calendar'});
  result=previewImageCleanup(state,images);
 }
 return Response.json(result,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
