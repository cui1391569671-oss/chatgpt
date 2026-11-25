import {readBoundedText,RequestBodyLimitError} from './request-body.mjs';
import {BARK_DEFAULTS,barkCandidates,barkDeviceKey,sealBarkKey,unsealBarkKey,deliverBark} from './bark-notifications.mjs';

const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function ensureBark(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS bark_bindings (owner TEXT PRIMARY KEY, version INTEGER NOT NULL, envelope TEXT, label TEXT NOT NULL, preferences TEXT NOT NULL, enabled INTEGER NOT NULL, activated_at INTEGER NOT NULL, tested_at INTEGER NOT NULL DEFAULT 0)').run();
 await db.prepare("CREATE TABLE IF NOT EXISTS bark_deliveries (id TEXT PRIMARY KEY, owner TEXT NOT NULL, binding_version INTEGER NOT NULL, dedup_key TEXT NOT NULL, due_at INTEGER NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0, lease_at INTEGER, sent_at INTEGER, opened_at INTEGER, UNIQUE(owner,dedup_key))").run();
 await db.prepare('CREATE INDEX IF NOT EXISTS bark_pending ON bark_deliveries(owner,status,next_at)').run();
}
const binding=(db,owner)=>db.prepare('SELECT * FROM bark_bindings WHERE owner=?').bind(owner).first();
const ready=env=>typeof env.BARK_ENCRYPTION_KEY==='string'&&env.BARK_ENCRYPTION_KEY.length>=32;
async function overview(env){
 const row=await binding(env.DB,env.TRACKER_USER),recent=await env.DB.prepare('SELECT id,status,sent_at,opened_at,due_at FROM bark_deliveries WHERE owner=? ORDER BY due_at DESC LIMIT 10').bind(env.TRACKER_USER).all();
 return {configured:ready(env),bound:!!row?.envelope,version:row?.version||0,label:row?.label||'',enabled:!!row?.enabled,preferences:row?JSON.parse(row.preferences):BARK_DEFAULTS,recent:recent.results||[]};
}
async function enqueue(db,owner,version,item){
 await db.prepare('INSERT OR IGNORE INTO bark_deliveries (id,owner,binding_version,dedup_key,due_at,payload) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,version,item.key,item.due,JSON.stringify(item)).run();
}
export async function barkRoute(request,env){
 const url=new URL(request.url),path=url.pathname,owner=env.TRACKER_USER;
 if(path!=='/api/account/bark'&&!['/api/account/bark/test','/api/account/bark/opened'].includes(path))return response({error:'Not found'},404);
 if(request.method!=='GET'){
  if(request.headers.get('Origin')!==url.origin)return response({error:'请求来源不匹配，请重新打开工作台'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return response({error:'JSON required'},415);
 }
 await ensureBark(env.DB);
 if(path==='/api/account/bark'&&request.method==='GET')return response(await overview(env));
 let input;try{input=JSON.parse(await readBoundedText(request,4096));}catch(error){return response({error:error instanceof RequestBodyLimitError?'请求过大':'请求格式无效'},error instanceof RequestBodyLimitError?413:400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return response({error:'请求格式无效'},400);
 if(path.endsWith('/opened')&&request.method==='POST'){
  if(typeof input.id!=='string'||!/^[-a-f0-9]{36}$/.test(input.id))return response({error:'通知编号无效'},400);
  await env.DB.prepare("UPDATE bark_deliveries SET opened_at=COALESCE(opened_at,?) WHERE id=? AND owner=? AND status IN ('sent','uncertain')").bind(Date.now(),input.id,owner).run();return response({ok:true});
 }
 const current=await binding(env.DB,owner);
 if(!Number.isSafeInteger(input.version)||input.version!==(current?.version||0))return response({error:'设置已在其他页面更改，请刷新后重试'},409);
 if(path==='/api/account/bark'&&request.method==='DELETE'){
  if(current){const removed=await env.DB.prepare('UPDATE bark_bindings SET envelope=NULL,enabled=0,version=version+1 WHERE owner=? AND version=?').bind(owner,input.version).run();if(!removed.meta?.changes)return response({error:'设置已变更，请刷新后重试'},409);}
  return response(await overview(env));
 }
 if(!ready(env))return response({error:'手机通知尚未配置服务端加密密钥'},503);
 if(path==='/api/account/bark'&&request.method==='PUT'){
  const preferences=input.preferences;
  if(typeof input.label!=='string'||input.label.trim().length>60||typeof input.enabled!=='boolean'||!preferences||Object.keys(preferences).length!==5||Object.keys(BARK_DEFAULTS).some(k=>typeof preferences[k]!=='boolean'))return response({error:'设备名称或通知类型无效'},400);
  let envelope=current?.envelope;
  if(input.address){try{envelope=await sealBarkKey(barkDeviceKey(input.address),env.BARK_ENCRYPTION_KEY,owner);}catch{return response({error:'请使用 https://api.day.app/设备密钥 格式的官方 Bark 地址'},400);}}
  if(!envelope)return response({error:'请先填写 Bark 推送地址'},400);
  const activated=input.address?Math.max(Date.now(),(current?.activated_at||0)+1):current.activated_at;
  const saved=await env.DB.prepare('INSERT INTO bark_bindings (owner,version,envelope,label,preferences,enabled,activated_at) VALUES (?,1,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET version=version+1,envelope=excluded.envelope,label=excluded.label,preferences=excluded.preferences,enabled=excluded.enabled,activated_at=excluded.activated_at WHERE bark_bindings.version=?').bind(owner,envelope,input.label.trim()||'我的 iPhone',JSON.stringify(preferences),input.enabled?1:0,activated,input.version).run();
  if(!saved.meta?.changes)return response({error:'设置已变更，请刷新后重试'},409);
  return response(await overview(env));
 }
 if(path.endsWith('/test')&&request.method==='POST'){
  if(!current?.envelope||!current.enabled)return response({error:'请先保存并启用手机绑定'},400);
  if(!['now','background'].includes(input.mode))return response({error:'测试类型无效'},400);
  const now=Date.now(),throttle=await env.DB.prepare('UPDATE bark_bindings SET tested_at=? WHERE owner=? AND version=? AND tested_at<? AND enabled=1').bind(now,owner,current.version,now-60000).run();
  if(!throttle.meta?.changes)return response({error:'请一分钟后再发送测试'},429);
  const due=input.mode==='background'?now+60000:now;
  await enqueue(env.DB,owner,current.activated_at,{key:'test:'+crypto.randomUUID(),due,scope:'work',kind:'test',title:input.mode==='background'?'后台手机通知测试':'手机通知测试',body:'点击打开我的工作台。此测试由服务端发送。',path:'/work?view=home'});
  if(input.mode==='now')await flushBark(env,[],now,true);
  return response(await overview(env));
 }
 return response({error:'Method not allowed'},405);
}

export async function flushBark(env,candidates,now=Date.now(),testsOnly=false,fetcher=fetch){
 const owner=env.TRACKER_USER,current=await binding(env.DB,owner);
 // Never resend an expired sending lease: the upstream may already have accepted it.
 await env.DB.prepare("UPDATE bark_deliveries SET status='uncertain' WHERE owner=? AND status='sending' AND lease_at<?").bind(owner,now-60000).run();
 if(!current?.enabled||!current.envelope||!ready(env))return;
 const pending=await env.DB.prepare("SELECT * FROM bark_deliveries WHERE owner=? AND status='queued' AND due_at<=? AND next_at<=? ORDER BY due_at LIMIT 30").bind(owner,now,now).all();
 for(const job of pending.results||[]){
  const payload=JSON.parse(job.payload),isTest=payload.kind==='test';
  if(testsOnly&&!isTest)continue;
  const active=await binding(env.DB,owner),prefs=active?JSON.parse(active.preferences):{};
  const relevant=isTest?now-job.due_at<30*60000:candidates.some(x=>x.key===job.dedup_key)&&prefs[payload.scope]&&prefs[payload.kind];
  if(!active?.enabled||!active.envelope||active.activated_at!==job.binding_version||!relevant){await env.DB.prepare("UPDATE bark_deliveries SET status='cancelled' WHERE id=? AND status='queued'").bind(job.id).run();continue;}
  const claim=await env.DB.prepare("UPDATE bark_deliveries SET status='sending',attempts=attempts+1,lease_at=? WHERE id=? AND status='queued' AND EXISTS (SELECT 1 FROM bark_bindings WHERE owner=? AND version=? AND enabled=1)").bind(now,job.id,owner,active.version).run();if(!claim.meta?.changes)continue;
  let deviceKey;try{deviceKey=await unsealBarkKey(active.envelope,env.BARK_ENCRYPTION_KEY,owner);}catch{await env.DB.prepare("UPDATE bark_deliveries SET status='failed' WHERE id=?").bind(job.id).run();continue;}
  const target=new URL(payload.path,'https://tracker.managementplatformlee.com');target.searchParams.set('push',job.id);
  const outcome=await deliverBark(deviceKey,{...payload,url:target.href},fetcher),retry=outcome==='retry'&&job.attempts<2,status=retry?'queued':outcome==='retry'?'failed':outcome;
  await env.DB.prepare('UPDATE bark_deliveries SET status=?,next_at=?,sent_at=? WHERE id=? AND status=\'sending\'').bind(status,now+5*60000,status==='sent'?now:null,job.id).run();
 }
}
export async function runBark(env,state,external=[],now=Date.now()){
 if(!ready(env)||!env.TRACKER_USER)return;
 await ensureBark(env.DB);const current=await binding(env.DB,env.TRACKER_USER);if(!current?.enabled||!current.envelope)return;
 const prefs=JSON.parse(current.preferences),candidates=barkCandidates(state,external,now).filter(x=>prefs[x.scope]&&prefs[x.kind]&&x.due>=current.activated_at);
 for(const item of candidates)await enqueue(env.DB,current.owner,current.activated_at,item);
 await flushBark(env,candidates,now);
 // Keep a bounded audit history without retaining indefinitely growing notification bodies.
 await env.DB.prepare("DELETE FROM bark_deliveries WHERE due_at<? AND status!='sending'").bind(now-35*86400000).run();
}
