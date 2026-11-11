import {normalizeProjectPlanSnapshot} from './project-plan-sheet.mjs';
import {readBoundedText} from './request-body.mjs';

const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const readSnapshot=async db=>{
 await db.prepare('CREATE TABLE IF NOT EXISTS project_plan_snapshot (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, sync_version INTEGER NOT NULL)').run();
 return db.prepare('SELECT payload, sync_version FROM project_plan_snapshot WHERE id=1').first();
};

export async function projectPlanRead(request,env){
 if(request.method!=='GET')return reply({error:'不支持的操作'},405);
 const row=await readSnapshot(env.DB);
 return reply(row?{...JSON.parse(row.payload),lastSyncedAt:new Date(row.sync_version).toISOString()}:{projects:[],lastSyncedAt:null});
}

export async function projectPlanPush(request,env){
 if(request.method!=='POST')return reply({error:'不支持的操作'},405);
 const secret=env.PROJECT_PLAN_SYNC_SECRET;
 if(!secret||secret.length<32)return reply({error:'尚未配置项目计划同步密钥'},503);
 const timestamp=request.headers.get('X-Project-Plan-Timestamp')||'';
 const signature=request.headers.get('X-Project-Plan-Signature')||'';
 const stamp=Number(timestamp);
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-stamp)>300000||!/^[a-f0-9]{64}$/.test(signature))return reply({error:'同步签名无效或已过期'},401);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return reply({error:'需要 JSON 格式'},415);
 let body;
 try{body=await readBoundedText(request,1_000_000);}catch{return reply({error:'项目计划内容过大或读取失败'},413);}
 const encoder=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g),value=>parseInt(value,16));
 if(!await crypto.subtle.verify('HMAC',key,bytes,encoder.encode(timestamp+'.'+body)))return reply({error:'同步签名无效或已过期'},401);
 let snapshot,sourceIds;
 try{
  const source=JSON.parse(body);
  snapshot=normalizeProjectPlanSnapshot(source);
  if(Object.hasOwn(source,'sourceSheetIds')){
   const ids=source.sourceSheetIds;
   if(!Array.isArray(ids)||!ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<0))throw Error('源表页清单无效');
   sourceIds=new Set(ids);
   if(sourceIds.size!==ids.length||snapshot.projects.some(project=>!sourceIds.has(project.sheetId)))throw Error('源表页清单不一致');
  }
 }catch{return reply({error:'项目计划格式不正确，原数据已保留'},400);}
 const payload=JSON.stringify(snapshot);
 try{
  const previous=await readSnapshot(env.DB);
  if(previous&&previous.sync_version>=stamp){
   if(previous.sync_version===stamp&&previous.payload===payload)return reply({ok:true,skipped:true});
   return reply({error:'此同步已过期，原数据已保留'},409);
  }
  const incomingIds=new Set(snapshot.projects.map(project=>project.sheetId));
  // Only a signed inventory of all source tabs can confirm an existing tab was deleted.
  const missing=project=>!incomingIds.has(project.sheetId)&&(!sourceIds||sourceIds.has(project.sheetId));
  if(previous&&JSON.parse(previous.payload).projects.some(missing))return reply({error:'已有项目页未完整同步，原数据已保留'},409);
  const result=await env.DB.prepare('INSERT INTO project_plan_snapshot (id,payload,sync_version) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,sync_version=excluded.sync_version WHERE project_plan_snapshot.sync_version=?')
   .bind(payload,stamp,previous?.sync_version??0).run();
  if(!result.meta?.changes)return reply({error:'项目计划已更新，请重新同步'},409);
  return reply({ok:true,count:snapshot.projects.length});
 }catch{return reply({error:'项目计划同步保存失败，请重试'},503);}
}
