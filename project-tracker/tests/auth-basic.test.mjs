import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import {authRoute,sessionCookie} from '../auth.mjs';
function environment(){const counts=new Map();return {TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(sql){let args;return {bind(...a){args=a;return this;},async run(){if(sql.startsWith('INSERT'))counts.set(args[0],(counts.get(args[0])||0)+1);return {};},async first(){return {count:counts.get(args[0])};}};}}};}
const basic=(password='bad',ip='127.0.0.1')=>new Request('https://site.test/work',{headers:{Authorization:'Basic '+btoa('user:'+password),'CF-Connecting-IP':ip}});
test('Basic and form authentication share the persistent attempt budget across requests',async()=>{
 const env=environment();
 for(let i=0;i<9;i++)assert.equal((await worker.fetch(basic(),env)).status,401);
 const form=new Request('https://site.test/auth/login',{method:'POST',headers:{Origin:'https://site.test','CF-Connecting-IP':'127.0.0.1','Content-Type':'application/x-www-form-urlencoded'},body:'username=user&password=bad'});
 assert.equal((await authRoute(form,env)).status,401);
 assert.equal((await worker.fetch(basic('secret'),env)).status,429);
 assert.equal((await worker.fetch(basic('secret','127.0.0.2'),env)).status,200);
 const cookie=(await sessionCookie(env,false)).split(';')[0];
 assert.equal((await worker.fetch(new Request('https://site.test/work',{headers:{Cookie:cookie,'CF-Connecting-IP':'127.0.0.1'}}),env)).status,200);
});
test('Basic authentication fails closed when persistent rate limiting is unavailable',async()=>{
 const env=environment();env.DB.prepare=()=>{throw Error('offline');};
 assert.equal((await worker.fetch(basic('secret'),env)).status,503);
});
