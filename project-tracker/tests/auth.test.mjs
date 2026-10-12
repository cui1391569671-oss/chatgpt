import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionCookie,sessionValid,authRoute,loginPage} from '../auth.mjs';
const env=()=>{const counts=new Map();return {TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(sql){let args;return {bind(...a){args=a;return this;},async run(){if(sql.startsWith('INSERT'))counts.set(args[0],(counts.get(args[0])||0)+1);return {};},async first(){return {count:counts.get(args[0])};}};}}};};
const login=(password='secret',origin='https://site.test')=>new Request('https://site.test/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'127.0.0.1'},body:new URLSearchParams({username:'user',password,remember:'yes',next:'/personal'})});
test('secure sessions validate, expire, reject tampering and revoke when password changes',async()=>{
 const e=env(),now=Date.now(),cookie=await sessionCookie(e,true,now),header=cookie.split(';')[0];assert.match(cookie,/Secure; HttpOnly; SameSite=Lax; Max-Age=2592000/);
 const req=new Request('https://site.test/work',{headers:{Cookie:header}});assert.equal(await sessionValid(req,e,now),true);assert.equal(await sessionValid(req,e,now+31*86400000),false);assert.equal(await sessionValid(req,{...e,TRACKER_PASSWORD:'changed'},now),false);
 assert.equal(await sessionValid(new Request('https://site.test',{headers:{Cookie:header+'x'}}),e,now),false);
});
test('login uses existing credentials and supports autofill, rejects cross-site form and bad password',async()=>{
 const e=env();assert.equal((await authRoute(login('bad'),e)).status,401);assert.equal((await authRoute(login('secret','https://evil.test'),e)).status,403);
 const r=await authRoute(login(),e);assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/personal');assert.ok(r.headers.get('Set-Cookie'));
 assert.match(loginPage('/work'),/autocomplete="username"/);assert.match(loginPage('/work'),/autocomplete="current-password"/);assert.doesNotMatch(loginPage('//evil.test'),/value="\/\/evil/);
});
test('login attempts are limited and logout clears persistent cookie',async()=>{
 const e=env();for(let i=0;i<10;i++)await authRoute(login('bad'),e);assert.equal((await authRoute(login(),e)).status,429);
 const r=await authRoute(new Request('https://site.test/auth/logout',{method:'POST',headers:{Origin:'https://site.test'}}),e);assert.match(r.headers.get('Set-Cookie'),/Max-Age=0/);
});
