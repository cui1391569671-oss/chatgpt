// Runs only synthetic data in Miniflare's local D1 emulator. No remote binding or .dev.vars.
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {deriveVaultKey,newVaultSalt,encryptVault,decryptVault} from '../personal-vault.mjs';
const folder=await mkdtemp(join(tmpdir(),'workbench-local-d1-'));
let mf;
try{
 const bundle=join(folder,'worker.mjs');
 await build({entryPoints:[fileURLToPath(new URL('../worker.mjs',import.meta.url))],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:bundle});
 mf=new Miniflare({d1Persist:join(folder,'d1'),modules:true,modulesRoot:folder,scriptPath:bundle,compatibilityDate:'2026-07-30',host:'127.0.0.1',port:0,d1Databases:{DB:'audit-synthetic-db'},bindings:{TRACKER_USER:'audit-user',TRACKER_PASSWORD:'audit-local-only'},outboundService:()=>new Response(JSON.stringify({items:[],error:'Synthetic preview: external services disabled'}),{status:503,headers:{'Content-Type':'application/json'}})});
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE tracker_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, version INTEGER NOT NULL)').run();
 const state={data:[],archive:[],projects:['Synthetic project'],priorities:{},deletedProjects:[],workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}};
 await db.prepare('INSERT INTO tracker_state VALUES (1,?,1)').bind(JSON.stringify(state)).run();
 const url=await mf.ready;
 const login=await mf.dispatchFetch(new URL('/auth/login',url),{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.1'},body:'username=audit-user&password=audit-local-only',redirect:'manual'});
 assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie').split(';')[0];
 const call=(path,body)=>mf.dispatchFetch(new URL(path,url),{method:body?'POST':'GET',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
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
 assert.equal((await(await call('/api/workspace?scope=work')).json()).workspace.tasks.length,1);
 assert.equal((await(await call('/api/workspace?scope=personal')).json()).workspace.notes[0].id,note.id);
 const upload=await mf.dispatchFetch(new URL('/api/wardrobe-images',url),{method:'POST',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'image/jpeg'},body:new Uint8Array([255,216,255,217])});assert.equal(upload.status,200);
 const imagePath=(await upload.json()).image;const image=await call(imagePath);assert.equal(image.status,200);assert.deepEqual([...new Uint8Array(await image.arrayBuffer())],[255,216,255,217]);
 const salt=newVaultSalt(),key=await deriveVaultKey('synthetic-vault-password',salt),envelope=await encryptVault([],key,salt);
 const putVault=body=>mf.dispatchFetch(new URL('/api/account/vault',url),{method:'PUT',headers:{Origin:url.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await putVault({version:0,envelope})).status,200);
 assert.equal((await putVault({version:0,envelope})).status,409);
 const vault=await(await call('/api/account/vault')).json();assert.deepEqual(await decryptVault(vault.envelope,key),[]);
 assert.equal((await call('/api/state/patch',{operations:[{collection:'data',id:issue.id,action:'delete',before:issue}]})).status,200);
 assert.equal((await(await call('/api/state')).json()).data.length,0);
 const basic={Authorization:'Basic '+btoa('audit-user:wrong'),'CF-Connecting-IP':'192.0.2.2'};
 for(let i=0;i<10;i++)assert.equal((await mf.dispatchFetch(new URL('/work',url),{headers:basic})).status,401);
 assert.equal((await mf.dispatchFetch(new URL('/work',url),{headers:{...basic,Authorization:'Basic '+btoa('audit-user:audit-local-only')}})).status,429);
 assert.equal((await call('/work')).status,200);
 console.log(JSON.stringify({localD1:true,compatibilityDate:'2026-07-30',productionCompatibilityVerified:false,remoteAccess:false,login:true,scopeIsolation:true,fieldConflict:true,basicLimit:true,cookieStillWorks:true,idempotentCreate:true,mixedWritesPreserved:true,imageBlob:true,vaultRoundtrip:true,vaultConflict:true,projectDelete:true}));
 if(process.argv.includes('--serve')){
  console.log('Preview '+url.origin+' (synthetic login: audit-user / audit-local-only; no production data)');
  await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
 }
}finally{await mf?.dispose();await rm(folder,{recursive:true,force:true});}
