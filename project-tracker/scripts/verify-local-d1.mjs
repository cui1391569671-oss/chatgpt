// Runs only synthetic data in Miniflare's local D1 emulator. No remote binding or .dev.vars.
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {PROJECT_PLAN_SOURCE_ID,parseProjectPlanSheets} from '../project-plan-sheet.mjs';
import {deriveVaultKey,newVaultSalt,encryptVault,decryptVault} from '../personal-vault.mjs';
const folder=await mkdtemp(join(tmpdir(),'workbench-local-d1-'));
const planSecret='synthetic-project-plan-sync-secret-only';
let mf;
try{
 const bundle=join(folder,'worker.mjs');
 await build({entryPoints:[fileURLToPath(new URL('../worker.mjs',import.meta.url))],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:bundle});
 mf=new Miniflare({d1Persist:join(folder,'d1'),modules:true,modulesRoot:folder,scriptPath:bundle,compatibilityDate:'2026-07-30',host:'127.0.0.1',port:0,d1Databases:{DB:'audit-synthetic-db'},bindings:{TRACKER_USER:'audit-user',TRACKER_PASSWORD:'audit-local-only',PROJECT_PLAN_SYNC_SECRET:planSecret},outboundService:()=>new Response(JSON.stringify({items:[],error:'Synthetic preview: external services disabled'}),{status:503,headers:{'Content-Type':'application/json'}})});
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE tracker_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, version INTEGER NOT NULL)').run();
 const state={data:[],archive:[],projects:['Synthetic project'],priorities:{},deletedProjects:[],workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}};
 await db.prepare('INSERT INTO tracker_state VALUES (1,?,1)').bind(JSON.stringify(state)).run();
 const url=await mf.ready;
 const login=await mf.dispatchFetch(new URL('/auth/login',url),{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.1'},body:'username=audit-user&password=audit-local-only',redirect:'manual'});
 assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie').split(';')[0];
 const call=(path,body)=>mf.dispatchFetch(new URL(path,url),{method:body?'POST':'GET',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const beauty={id:'synthetic-beauty',title:'隔离护肤记录',category:'skincare',date:'2026-11-08',products:'演示产品',detail:'隔离检查'};
 assert.equal((await call('/api/workspace/patch?scope=personal',{operations:[{collection:'beautyRecords',id:beauty.id,action:'create',record:beauty}]})).status,200);
 assert.deepEqual((await (await call('/api/workspace?scope=personal')).json()).workspace.beautyRecords,[beauty]);
 assert.equal((await call('/api/workspace/patch?scope=work',{operations:[{collection:'beautyRecords',id:beauty.id,action:'create',record:beauty}]})).status,400);
 assert.equal((await call('/api/workspace/patch?scope=personal',{operations:[{collection:'beautyRecords',id:beauty.id,action:'delete',before:beauty}]})).status,200);
 assert.equal((await mf.dispatchFetch(new URL('/api/project-plan',url))).status,401);
 assert.deepEqual((await (await call('/api/project-plan')).json()).projects,[]);
 const plan=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[17,18].map(sheetId=>({
  sheetId,name:'PM'+sheetId+'-演示标准任务清单',
  rows:[['阶段','模块','标准任务','是否适用','责任部门','计划开始时间','计划完成日期','状态'],
        ['验收','通用','演示任务','是','项目部','2026-12-31','2027-01-01','进行中']]
 })));
 const now=Date.now();
 const pushPlan=(data,stamp,secret=planSecret)=>{
  const body=JSON.stringify(data);
  const signature=createHmac('sha256',secret).update(stamp+'.'+body).digest('hex');
  return mf.dispatchFetch(new URL('/api/project-plan/push',url),{method:'POST',headers:{'Content-Type':'application/json','X-Project-Plan-Timestamp':String(stamp),'X-Project-Plan-Signature':signature},body});
 };
 assert.equal((await pushPlan(plan,now,'incorrect')).status,401);
 assert.equal((await pushPlan(plan,now)).status,200);
 assert.equal((await (await pushPlan(plan,now)).json()).skipped,true);
 assert.equal((await pushPlan(plan,now-1)).status,409);
 assert.equal((await pushPlan({...plan,projects:[]},now+1)).status,400);
 assert.equal((await pushPlan({...plan,projects:plan.projects.slice(0,1)},now+2)).status,409);
 assert.equal((await (await call('/api/project-plan')).json()).projects.length,2);
 const editedPlan=structuredClone(plan);editedPlan.projects[0].tasks[0].end='2027-01-05';
 assert.equal((await pushPlan(editedPlan,now+3)).status,200);
 assert.equal((await (await call('/api/project-plan')).json()).projects[0].tasks[0].end,'2027-01-05');
 const [retainedProject]=editedPlan.projects;
 const replacementProject={...retainedProject,sheetId:19,sourceSheet:'PM19-新演示项目标准任务清单'};
 const replacement={...editedPlan,projects:[retainedProject,replacementProject]};
 assert.equal((await pushPlan({...replacement,sourceSheetIds:[17,18,19,20]},now+4)).status,409);
 assert.equal((await pushPlan({...replacement,sourceSheetIds:[17,20]},now+4)).status,400);
 assert.equal((await pushPlan({...replacement,sourceSheetIds:[17,19,19]},now+4)).status,400);
 assert.equal((await pushPlan({...replacement,projects:[],sourceSheetIds:[20]},now+4)).status,400);
 assert.deepEqual((await (await call('/api/project-plan')).json()).projects.map(project=>project.sheetId),[17,18]);
 const confirmedDeletion={...replacement,sourceSheetIds:[17,19,20]};
 assert.equal((await pushPlan(confirmedDeletion,now+4)).status,200);
 assert.equal((await (await pushPlan(confirmedDeletion,now+4)).json()).skipped,true);
 const currentPlan=await (await call('/api/project-plan')).json();
 assert.deepEqual(currentPlan.projects.map(project=>project.sheetId),[17,19]);
 assert.equal(currentPlan.projects[0].tasks[0].end,'2027-01-05');
 assert.equal(Object.hasOwn(currentPlan,'sourceSheetIds'),false);
 const record={id:'synthetic-task',title:'Synthetic task',done:false,priority:'normal',dueDate:'',detail:''};
 let result=await call('/api/workspace/patch?scope=work',{operations:[{collection:'tasks',id:record.id,action:'create',record}]});assert.equal(result.status,200);
 assert.equal((await(await call('/api/workspace?scope=personal')).json()).workspace.tasks.length,0);
 result=await call('/api/workspace/patch?scope=work',{operations:[{collection:'tasks',id:record.id,action:'update',changes:{title:{before:{exists:true,value:'stale'},after:{exists:true,value:'overwrite'}}}}]});assert.equal(result.status,409);
 assert.equal((await(await call('/api/workspace?scope=work')).json()).workspace.tasks[0].title,record.title);
 // Repeated create stays idempotent; unrelated private/project writes preserve work data.
 result=await call('/api/workspace/patch?scope=work',{operations:[{collection:'tasks',id:record.id,action:'create',record}]});assert.equal(result.status,200);
 const note={id:'private-note',title:'Synthetic private note',body:'local only',updatedAt:new Date().toISOString()};
 assert.equal((await call('/api/workspace/patch?scope=personal',{operations:[{collection:'notes',id:note.id,action:'create',record:note}]})).status,200);
 const issue={id:'issue-1',project:'Synthetic project',task:'Synthetic issue',reason:'',plannedDate:'',note:'',status:'进行中',done:false};
 assert.equal((await call('/api/state/patch',{operations:[{collection:'data',id:issue.id,action:'create',record:issue}]})).status,200);
 assert.equal((await call('/api/state/patch',{operations:[{collection:'data',id:issue.id,action:'update',changes:{plannedDate:{before:{exists:true,value:''},after:{exists:true,value:'2026-02-30'}}}}]})).status,400);
 assert.equal((await(await call('/api/state')).json()).data[0].plannedDate,'');
 const audit=await call('/api/maintenance/audit');assert.equal(audit.status,200);assert.equal((await audit.json()).automaticChanges,false);
 assert.equal((await(await call('/api/workspace?scope=work')).json()).workspace.tasks.length,1);
 assert.equal((await(await call('/api/workspace?scope=personal')).json()).workspace.notes[0].id,note.id);
 const upload=await mf.dispatchFetch(new URL('/api/wardrobe-images',url),{method:'POST',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'image/jpeg'},body:new Uint8Array([255,216,255,217])});assert.equal(upload.status,200);
 const imagePath=(await upload.json()).image;const image=await call(imagePath);assert.equal(image.status,200);assert.deepEqual([...new Uint8Array(await image.arrayBuffer())],[255,216,255,217]);
 const imagePreview=await(await call('/api/maintenance/images')).json();assert.equal(imagePreview.automaticDeletion,false);assert.equal(imagePreview.totalImages,1);assert.equal((await call(imagePath)).status,200);
 assert.equal((await mf.dispatchFetch(new URL('/api/maintenance/images',url),{method:'DELETE',headers:{Origin:url.origin,Cookie:cookie}})).status,405);
 const salt=newVaultSalt(),key=await deriveVaultKey('synthetic-vault-password',salt),envelope=await encryptVault([],key,salt);
 const putVault=body=>mf.dispatchFetch(new URL('/api/account/vault',url),{method:'PUT',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await putVault({version:0,envelope})).status,200);
 assert.equal((await putVault({version:0,envelope})).status,409);
 const vault=await(await call('/api/account/vault')).json();assert.deepEqual(await decryptVault(vault.envelope,key),[]);
 assert.equal((await call('/api/state/patch',{operations:[{collection:'data',id:issue.id,action:'delete',before:issue}]})).status,200);
 assert.equal((await(await call('/api/state')).json()).data.length,0);
 const legacyHeaders={Authorization:'Basic '+btoa('audit-user:audit-local-only'),'CF-Connecting-IP':'192.0.2.3'};
 const legacyPage=await mf.dispatchFetch(new URL('/work',url),{headers:legacyHeaders});assert.equal(legacyPage.status,200);
 const upgradedCookie=legacyPage.headers.get('Set-Cookie')?.split(';')[0];assert.ok(upgradedCookie);
 const upgraded=await Promise.all(Array.from({length:12},()=>mf.dispatchFetch(new URL('/work',url),{headers:{...legacyHeaders,Cookie:upgradedCookie}})));
 assert.ok(upgraded.every(response=>response.status===200));
 const basic={Authorization:'Basic '+btoa('audit-user:wrong'),'CF-Connecting-IP':'192.0.2.2'};
 for(let i=0;i<10;i++)assert.equal((await mf.dispatchFetch(new URL('/work',url),{headers:basic})).status,401);
 assert.equal((await mf.dispatchFetch(new URL('/work',url),{headers:{...basic,Authorization:'Basic '+btoa('audit-user:audit-local-only')}})).status,429);
 assert.equal((await call('/work')).status,200);
 console.log(JSON.stringify({localD1:true,compatibilityDate:'2026-07-30',productionCompatibilityVerified:false,remoteAccess:false,login:true,scopeIsolation:true,fieldConflict:true,basicLimit:true,cookieStillWorks:true,legacyBasicUpgrade:true,idempotentCreate:true,mixedWritesPreserved:true,imageBlob:true,vaultRoundtrip:true,vaultConflict:true,projectDelete:true,projectPlanSync:true}));
 if(process.argv.includes('--serve')){
  console.log('Preview '+url.origin+' (synthetic login: audit-user / audit-local-only; no production data)');
  await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
 }
}finally{await mf?.dispose();await rm(folder,{recursive:true,force:true});}
