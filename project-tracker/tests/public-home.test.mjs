import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';

test('product homepage is public and does not access private storage',async()=>{
 const env={TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(){throw new Error('Public homepage must not read private data');}}};
 for(const config of [env,{}]){
  const response=await worker.fetch(new Request('https://site.test/'),config);
  assert.equal(response.status,200);
  const html=await response.text();assert.match(html,/把工作推进/);assert.match(html,/不展示任何真实账号数据/);assert.match(html,/目前不提供公开自助注册/);
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 }
 const head=await worker.fetch(new Request('https://site.test/',{method:'HEAD'}),{});assert.equal(head.status,200);assert.equal(await head.text(),'');
});

test('public product homepage does not make workspace routes or APIs public',async()=>{
 const env={TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(){throw new Error('Unauthenticated requests must not reach storage');}}};
 for(const path of ['/work','/personal','/projects','/api/workspace?scope=personal','/api/state','/api/steam-review?appid=2358720','/api/project-calendar','/api/reminders?scope=work']){
  const response=await worker.fetch(new Request('https://site.test'+path),env);assert.equal(response.status,401,path);
  assert.doesNotMatch(await response.text(),/把工作推进/);
 }
 const response=await worker.fetch(new Request('https://site.test/',{method:'POST'}),env);assert.equal(response.status,401);
});

test('public search metadata includes only the public homepage and login is not indexed',async()=>{
 const robots=await worker.fetch(new Request('https://site.test/robots.txt'),{});assert.equal(robots.status,200);const rules=await robots.text();assert.match(rules,/Disallow: \/api\//);assert.match(rules,/Disallow: \/personal/);assert.match(rules,/Sitemap: https:\/\/site.test\/sitemap.xml/);
 const sitemap=await worker.fetch(new Request('https://site.test/sitemap.xml'),{});assert.equal(sitemap.status,200);const xml=await sitemap.text();assert.match(xml,/<loc>https:\/\/site.test\/<\/loc>/);assert.doesNotMatch(xml,/\/work|\/personal|\/projects/);
 const login=await worker.fetch(new Request('https://site.test/login'),{TRACKER_USER:'user',TRACKER_PASSWORD:'secret'});assert.equal(login.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.match(await login.text(),/返回产品官网/);
});
