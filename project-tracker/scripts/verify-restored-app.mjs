// Offline application-level checks against an explicitly supplied SQL snapshot.
// All writes (including login counters) affect a disposable local clone only.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {readState,reminderTasks,projectCalendarItems} from '../worker.mjs';
import {todayTasks} from '../today-tasks.mjs';
import {deriveVaultKey,newVaultSalt,encryptVault,decryptVault} from '../personal-vault.mjs';
const index=process.argv.indexOf('--input');
if(index<0||!process.argv[index+1])throw Error('Explicit local SQL snapshot required: --input /protected/restored.sql');
const input=process.argv[index+1],folder=await mkdtemp(join(tmpdir(),'workbench-restored-app-'));
const sourceHash=createHash('sha256').update(await readFile(input)).digest('hex');
let mf;
try{
 const script=fileURLToPath(new URL('./prepare-d1-recovery.py',import.meta.url));
 const python="import importlib.util,sqlite3,json,sys;spec=importlib.util.spec_from_file_location('restore',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);d=sqlite3.connect(':memory:');d.executescript(open(sys.argv[2]).read());print(json.dumps(list(m.restore_statements(d))))";
 const statements=JSON.parse(execFileSync('python3',['-c',python,script,input],{encoding:'utf8',maxBuffer:64000000}));
 const bundle=join(folder,'worker.mjs');
 await build({entryPoints:[fileURLToPath(new URL('../worker.mjs',import.meta.url))],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:bundle});
 mf=new Miniflare({modules:true,modulesRoot:folder,scriptPath:bundle,compatibilityDate:'2026-07-30',host:'127.0.0.1',port:0,d1Databases:{DB:'offline-restored-clone'},bindings:{TRACKER_USER:'recovery-synthetic',TRACKER_PASSWORD:'recovery-local-only'},outboundService:()=>new Response('External services disabled',{status:503})});
 const db=await mf.getD1Database('DB');
 for(let offset=0;offset<statements.length;offset+=50)await db.batch(statements.slice(offset,offset+50).map(sql=>db.prepare(sql)));
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results.map(x=>x.name);
 const tableDigest=async name=>createHash('sha256').update(JSON.stringify((await db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()).results)).digest('hex');
 const before=Object.fromEntries(await Promise.all(tables.map(async name=>[name,await tableDigest(name)])));
 const expected=await readState(db),url=await mf.ready;
 const unauth=await mf.dispatchFetch(new URL('/api/state',url));assert.equal(unauth.status,401);
 const login=await mf.dispatchFetch(new URL('/auth/login',url),{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.129'},body:'username=recovery-synthetic&password=recovery-local-only',redirect:'manual'});
 assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie').split(';')[0];
 const call=path=>mf.dispatchFetch(new URL(path,url),{headers:{Cookie:cookie}});
 const get=async path=>{const response=await call(path);assert.equal(response.status,200,'Restored API unavailable');return response.json();};
 for(const path of ['/work','/personal','/projects']){const response=await call(path);assert.equal(response.status,200);assert.ok(response.headers.has('Content-Security-Policy-Report-Only'));}
 const tracker=await get('/api/state');assert.ok(JSON.stringify(tracker.data)===JSON.stringify(expected.data),'Project records differ');assert.ok(JSON.stringify(tracker.archive)===JSON.stringify(expected.archive),'Archived records differ');
 for(const [scope,key] of [['work','workWorkspace'],['personal','workspace']]){
  const value=await get('/api/workspace?scope='+scope);
  assert.ok(JSON.stringify(value.workspace)===JSON.stringify(expected[key]),'Workspace records differ');
  assert.equal(value.version,expected.workspaceVersions[scope]);
  assert.ok(JSON.stringify((await get('/api/reminders?scope='+scope)).tasks)===JSON.stringify(reminderTasks(expected,scope)),'Reminder derivation differs');
  assert.ok(JSON.stringify(await get('/api/today-tasks?scope='+scope))===JSON.stringify(todayTasks(expected,scope)),'Today derivation differs');
 }
 assert.ok(JSON.stringify((await get('/api/project-calendar')).items)===JSON.stringify(projectCalendarItems(expected)),'Calendar derivation differs');
 assert.equal((await call('/api/project-core-information')).status,200);
 assert.equal((await call('/api/account/vault')).status,200);
 let images=0;
 if(tables.includes('calendar_images'))for(const image of (await db.prepare('SELECT id,scope,bytes FROM calendar_images').all()).results){
  const response=await call('/api/calendar-images/'+image.scope+'/'+image.id);assert.equal(response.status,200);
  const actual=Buffer.from(await response.arrayBuffer()),expectedBytes=Buffer.from(image.bytes);
  assert.ok(actual.equals(expectedBytes),'Restored image bytes differ');
  const other=image.scope==='work'?'personal':'work';assert.equal((await call('/api/calendar-images/'+other+'/'+image.id)).status,404);images++;
 }
 const unchanged=[];for(const name of tables)if(name!=='login_attempts'){assert.equal(await tableDigest(name),before[name],'Read routes changed restored business data');unchanged.push(name);}
 // Exercise mutations only after proving that reads leave the restored business data intact.
 const patch=(path,operations)=>mf.dispatchFetch(new URL(path,url),{method:'POST',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({operations})});
 for(const scope of ['work','personal']){
  const record={id:'recovery-check-'+scope,title:'Synthetic recovery task',done:false,priority:'normal',dueDate:'',detail:'Disposable local clone only'};
  const operation={collection:'tasks',id:record.id,action:'create',record};
  assert.equal((await patch('/api/workspace/patch?scope='+scope,[operation])).status,200,'Restored workspace rejects new writes');
  assert.equal((await patch('/api/workspace/patch?scope='+scope,[operation])).status,200,'Restored idempotent create failed');
  assert.equal((await patch('/api/workspace/patch?scope='+scope,[{collection:'tasks',id:record.id,action:'update',changes:{title:{before:{exists:true,value:'stale'},after:{exists:true,value:'overwrite'}}}}])).status,409);
  assert.equal((await patch('/api/workspace/patch?scope='+scope,[{collection:'tasks',id:record.id,action:'delete',before:record}])).status,200);
  const key=scope==='work'?'workWorkspace':'workspace';
  assert.ok(JSON.stringify((await get('/api/workspace?scope='+scope)).workspace)===JSON.stringify(expected[key]),'Workspace mutation changed original records');
 }
 const issue={id:'recovery-check-issue',project:expected.projects[0]||'Synthetic recovery project',task:'Synthetic recovery issue',reason:'',note:'',plannedDate:'',status:'进行中',done:false};
 assert.equal((await patch('/api/state/patch',[{collection:'data',id:issue.id,action:'create',record:issue}])).status,200);
 assert.equal((await patch('/api/state/patch',[{collection:'data',id:issue.id,action:'delete',before:issue}])).status,200);
 const restoredTracker=await get('/api/state');assert.ok(JSON.stringify(restoredTracker.data)===JSON.stringify(expected.data),'Project mutation changed original rows');
 assert.ok(JSON.stringify(restoredTracker.archive)===JSON.stringify(expected.archive),'Project mutation changed original archive');
 const historyCount=await db.prepare('SELECT count(*) AS count FROM tracker_history').first();assert.ok(historyCount.count<=100,'Restored history trigger retention failed');
 assert.notEqual(await tableDigest('tracker_history'),before.tracker_history,'Restored history trigger did not record clone writes');
 let syntheticVaultRoundtrip=false;
 if((await db.prepare('SELECT count(*) AS count FROM account_vault').first()).count===0){
  const records=[{id:'synthetic-only',type:'other',label:'Recovery fixture',holder:'Synthetic',number:'TEST-000',issuer:'Test',expiry:'',note:'Not personal data'}];
  const salt=newVaultSalt(),key=await deriveVaultKey('synthetic-recovery-key',salt),envelope=await encryptVault(records,key,salt);
  const put=body=>mf.dispatchFetch(new URL('/api/account/vault',url),{method:'PUT',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await put({version:0,envelope})).status,200);assert.equal((await put({version:0,envelope})).status,409);
  const recovered=await get('/api/account/vault');assert.ok(JSON.stringify(await decryptVault(recovered.envelope,key))===JSON.stringify(records),'Synthetic vault roundtrip failed');
  const wrongKey=await deriveVaultKey('wrong-synthetic-key',salt);await assert.rejects(decryptVault(recovered.envelope,wrongKey));syntheticVaultRoundtrip=true;
 }
 assert.equal(createHash('sha256').update(await readFile(input)).digest('hex'),sourceHash,'Source snapshot changed');
 const localApiSamples=[];
 for(const path of ['/api/state','/api/workspace?scope=work','/api/workspace?scope=personal','/api/project-calendar']){
  const times=[];let bytes=0;
  for(let sample=0;sample<10;sample++){const start=performance.now(),response=await call(path);assert.equal(response.status,200);bytes=new TextEncoder().encode(await response.text()).length;times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);localApiSamples.push({path,samples:times.length,responseBytes:bytes,minMs:times[0],medianMs:(times[4]+times[5])/2,maxMs:times.at(-1)});
 }
 console.log(JSON.stringify({date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),sourceSha256:sourceHash,offlineCloneOnly:true,remoteAccess:false,compatibilityDate:'2026-07-30',productionCompatibilityVerified:false,syntheticLogin:true,authenticationBoundary:true,threePagesServed:true,projectAndArchiveExact:true,workspaceContentAndVersionsExact:true,reminderAndTodayDerivation:true,projectCalendar:true,projectCoreReadable:true,vaultEndpointReadable:true,realVaultDecryptionVerified:false,syntheticVaultRoundtrip,imagesVerified:images,imageScopeIsolation:true,businessTablesUnchangedByReadChecks:unchanged,cloneOnlyWrites:{twoWorkspaceCreateDelete:true,idempotentCreate:true,staleConflict:true,projectCreateDelete:true,originalRecordsPreserved:true,historyTriggerRetention:true},sourceUnchanged:true,localApiSamples,productionLatencyMeasured:false}));
}finally{await mf?.dispose();await rm(folder,{recursive:true,force:true});}
