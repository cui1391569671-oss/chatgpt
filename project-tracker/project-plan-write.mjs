import {validateProjectPlanEdit,normalizeProjectPlanSnapshot,PROJECT_PLAN_SOURCE_ID} from './project-plan-sheet.mjs';
import {readBoundedText} from './request-body.mjs';

export const projectPlanWriteConfigured=env=>typeof env.PROJECT_PLAN_WRITE_URL==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.PROJECT_PLAN_WRITE_URL)&&env.PROJECT_PLAN_SYNC_SECRET?.length>=32;
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function projectPlanWrite(request,env,send=fetch){
 if(request.method!=='POST')return reply({error:'不支持的操作'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'请求来源无效'},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return reply({error:'需要 JSON 格式'},415);
 if(!projectPlanWriteConfigured(env))return reply({error:'原表回写尚未启用，请完成 Google 授权与回写服务配置'},503);
 let edit;try{edit=validateProjectPlanEdit(JSON.parse(await readBoundedText(request,20000)));}catch{return reply({error:'任务修改格式不正确'},400);}
 // The authenticated snapshot authorizes only known task rows and explicitly editable fields.
 const row=await env.DB.prepare('SELECT payload, sync_version FROM project_plan_snapshot WHERE id=1').first();
 const project=row&&JSON.parse(row.payload).projects.find(item=>item.sheetId===edit.sheetId);
 const task=project?.tasks.find(item=>item.row===edit.row),fields=project?.editing?.find(item=>item.row===edit.row)?.fields;
 if(!task||!['title','phase','module'].every(key=>task[key]===edit.identity[key]))return reply({error:'任务已变化，请刷新后核对'},409);
 if(!fields||edit.changes.some(change=>!fields.some(field=>field.key===change.key)))return reply({error:'该字段尚不支持回写或由原表公式控制'},400);
 const payload=JSON.stringify(edit),timestamp=String(Date.now()),encoder=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.PROJECT_PLAN_SYNC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(timestamp+'.'+payload))),b=>b.toString(16).padStart(2,'0')).join('');
 try{
  const response=await send(env.PROJECT_PLAN_WRITE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({timestamp,signature,payload}),signal:AbortSignal.timeout(45000),redirect:'follow'});
  if(!response.ok)throw Error('upstream');
  const result=JSON.parse(await readBoundedText(response,1_000_000));
  if(result.requestId!==edit.requestId)throw Error('invalid reply');
  if(!result.ok)return reply({error:result.error||'原表未接受本次修改'},[400,409,503].includes(result.status)?result.status:503);
  if(result.project?.sheetId!==edit.sheetId)throw Error('invalid project');
  const project=normalizeProjectPlanSnapshot({sourceSpreadsheetId:PROJECT_PLAN_SOURCE_ID,projects:[result.project]}).projects[0];
  // Persist the confirmed project without waiting for a full Google workbook read.
  // A concurrent snapshot wins; never replace it using this earlier snapshot.
  let synced=false,lastSyncedAt=null;
  try{
   const snapshot=JSON.parse(row.payload),stamp=Math.max(Date.now(),row.sync_version+1);
   snapshot.projects=snapshot.projects.map(item=>item.sheetId===project.sheetId?project:item);
   const saved=await env.DB.prepare('UPDATE project_plan_snapshot SET payload=?,sync_version=? WHERE id=1 AND sync_version=?')
    .bind(JSON.stringify(snapshot),stamp,row.sync_version).run();
   if(saved.meta?.changes){synced=true;lastSyncedAt=new Date(stamp).toISOString();}
  }catch{ /* The source write is confirmed; the regular sync can refresh the cache. */ }
  return reply({ok:true,project,synced,lastSyncedAt});
 }catch{return reply({error:'未能确认原表保存结果，输入已保留。请重试核对结果，避免重复修改。'},503);}
}
