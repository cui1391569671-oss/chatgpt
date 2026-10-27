import {validProjectCoreInfo} from './project-core-info.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readProjectCorePushBody(request){
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
 let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw Error('Too large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function projectCorePushRoute(request,env){
 if(request.method!=='POST')return reply({error:'不支持的操作'},405);
 if(!env.PROJECT_CORE_SYNC_SECRET||env.PROJECT_CORE_SYNC_SECRET.length<32)return reply({error:'尚未配置项目信息同步密钥'},503);
 const timestamp=request.headers.get('X-Project-Core-Timestamp'),signature=request.headers.get('X-Project-Core-Signature'),now=Date.now();
 if(!/^\d{13}$/.test(timestamp||'')||Math.abs(now-Number(timestamp))>300000||!/^[a-f0-9]{64}$/.test(signature||''))return reply({error:'同步签名无效或已过期'},401);
 if(!request.headers.get('Content-Type')?.toLowerCase().includes('application/json'))return reply({error:'需要JSON格式'},415);
 let body;try{body=await readProjectCorePushBody(request);}catch{return reply({error:'数据过大或格式不正确'},413);}
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PROJECT_CORE_SYNC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),s=>parseInt(s,16)),new TextEncoder().encode(timestamp+'.'+body)))return reply({error:'同步签名无效或已过期'},401);
 let source;try{source=JSON.parse(body);}catch{return reply({error:'数据格式不正确'},400);}
 if(!validProjectCoreInfo(source)||!source.items.length||typeof source.automationInstalled!=='boolean')return reply({error:'项目信息格式不正确或源表为空，原数据已保留'},400);
 // Only accept the declared source fields, never a client's receipt/version metadata.
 const payload={sourceSpreadsheetId:source.sourceSpreadsheetId,sourceTitle:source.sourceTitle,syncedAt:source.syncedAt,items:source.items.map(item=>Object.fromEntries(['projectCode','projectName','supplyScope','transport','palletSize','equipmentLoad','efficiency','sourceSheet','sourceSheetId','sourceUpdatedAt'].filter(k=>Object.hasOwn(item,k)).map(k=>[k,item[k]])))};
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS project_core_information (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)').run();
  const previous=await env.DB.prepare('SELECT payload FROM project_core_information WHERE id=1').first();
  const stored=previous?JSON.parse(previous.payload):null,stamp=Number(timestamp);
  if(stored?.syncVersion>=stamp){if(stored.syncVersion===stamp&&stored.syncHash===hash)return reply({ok:true,skipped:true});return reply({error:'此同步已过期，原数据已保留'},409);}
  // Sheet IDs survive source code edits; a renumber is not a project deletion.
  const incomingSheets=new Set(payload.items.map(item=>item.sourceSheetId)),incomingCodes=new Set(payload.items.map(item=>item.projectCode));
  if(stored?.items?.some(item=>Number.isInteger(item.sourceSheetId)?!incomingSheets.has(item.sourceSheetId):!incomingCodes.has(item.projectCode)))return reply({error:'源表缺少已有项目，请核对原表后重试；原数据已保留'},409);
  Object.assign(payload,{syncMode:'apps-script',syncVersion:stamp,syncHash:hash,lastSyncedAt:new Date().toISOString(),automationInstalled:source.automationInstalled});
  const result=await env.DB.prepare('INSERT INTO project_core_information (id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE project_core_information.payload=? AND COALESCE(json_extract(project_core_information.payload,\'$.syncVersion\'),0)<?').bind(JSON.stringify(payload),previous?.payload||'',stamp).run();
  if(!result.meta?.changes)return reply({error:'数据已更新，请重新同步；原数据已保留'},409);
  return reply({ok:true,count:payload.items.length,syncedAt:payload.lastSyncedAt});
 }catch{return reply({error:'同步保存失败，原数据已保留，请重试'},503);}
}
