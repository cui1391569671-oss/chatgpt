import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';
import {deriveVaultKey,newVaultSalt,encryptVault,decryptVault,validVaultEnvelope,validVaultRecords,personalVaultRoute} from '../personal-vault.mjs';
const record={id:'passport-1',type:'passport',label:'旅行护照',holder:'测试用户',number:'E12345678',issuer:'测试机构',expiry:'2030-01-01',note:''};
function environment(){const rows=new Map();return {TRACKER_USER:'owner',TRACKER_PASSWORD:'password',rows,DB:{prepare(sql){let args;return {bind(...values){args=values;return this;},async first(){return rows.get(args[0])||null;},async run(){if(sql.startsWith('CREATE'))return {};if(sql.startsWith('INSERT')){if(rows.has(args[0]))return {meta:{changes:0}};rows.set(args[0],{envelope:args[1],version:1});return {meta:{changes:1}};}if(sql.startsWith('UPDATE')){const row=rows.get(args[1]);if(!row||row.version!==args[2])return {meta:{changes:0}};rows.set(args[1],{envelope:args[0],version:row.version+1});return {meta:{changes:1}};}throw Error('Unexpected query');}};}}};}
const request=(method='GET',body,headers={})=>new Request('https://site.test/api/account/vault',{method,headers:{Origin:'https://site.test',Authorization:'Basic '+btoa('owner:password'),'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
test('private vault encrypts entire records, rejects wrong keys/tampering and uses a new IV per save',async()=>{
 const salt=newVaultSalt(),key=await deriveVaultKey('test-password-long',salt),envelope=await encryptVault([record],key,salt),second=await encryptVault([record],key,salt);
 assert.ok(validVaultEnvelope(envelope));assert.notEqual(envelope.iv,second.iv);assert.notEqual(envelope.ciphertext,second.ciphertext);assert.ok(!JSON.stringify(envelope).includes(record.number));assert.deepEqual(await decryptVault(envelope,key),[record]);
 await assert.rejects(decryptVault(envelope,await deriveVaultKey('wrong-password',salt)));
 await assert.rejects(decryptVault({...envelope,iv:second.iv},key));assert.equal(validVaultEnvelope({...envelope,number:'plaintext'}),false);
 assert.equal(validVaultRecords([{...record,expiry:'2030-02-31'}]),false);assert.equal(validVaultRecords([record,record]),false);
});
test('authenticated vault persists encrypted CRUD separately and prevents concurrent overwrites',async()=>{
 const env=environment(),salt=newVaultSalt(),key=await deriveVaultKey('test-password-long',salt),envelope=await encryptVault([record],key,salt);
 assert.deepEqual(await(await worker.fetch(request(),env)).json(),{version:0,envelope:null});
 assert.equal((await worker.fetch(request('PUT',{version:0,envelope}),env)).status,200);
 assert.equal((await worker.fetch(request('PUT',{version:0,envelope}),env)).status,409);
 assert.equal((await worker.fetch(request('PUT',{version:1,envelope:await encryptVault([{...record,number:'E87654321'}],key,salt)}),env)).status,200);
 assert.equal((await worker.fetch(request('PUT',{version:1,envelope}),env)).status,409);
 const saved=await(await worker.fetch(request(),env)).json();assert.equal(saved.version,2);assert.equal((await decryptVault(saved.envelope,key))[0].number,'E87654321');
 assert.equal((await worker.fetch(request('PUT',{version:2,envelope:await encryptVault([],key,salt)}),env)).status,200);
 assert.deepEqual(await decryptVault((await(await worker.fetch(request(),env)).json()).envelope,key),[]);
 assert.ok(!JSON.stringify([...env.rows]).includes('E87654321'));
 assert.deepEqual(await(await personalVaultRoute(request(),{...env,TRACKER_USER:'other'})).json(),{version:0,envelope:null});
});
test('vault access boundary rejects unauthenticated and cross-origin requests, plaintext, oversize bodies and unsupported methods',async()=>{
 const env=environment();assert.equal((await worker.fetch(new Request('https://site.test/api/account/vault'),env)).status,401);
 assert.equal((await worker.fetch(request('PUT',{}, {Origin:'https://evil.test'}),env)).status,403);
 assert.equal((await worker.fetch(request('PUT',{version:0,envelope:{number:'1234'}}),env)).status,400);
 assert.equal((await worker.fetch(request('PUT',{padding:'x'.repeat(190001)}),env)).status,413);
 assert.equal((await worker.fetch(request('DELETE'),env)).status,405);assert.equal(env.rows.size,0);
});
