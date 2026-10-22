import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';

test('retired product homepage redirects straight to work without reading private storage',async()=>{
 const env={TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(){throw new Error('Public homepage must not read private data');}}};
 for(const config of [env,{}]){
  const response=await worker.fetch(new Request('https://site.test/'),config);
  assert.equal(response.status,302);assert.equal(response.headers.get('Location'),'/work');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(await response.text(),'');
 }
 const head=await worker.fetch(new Request('https://site.test/',{method:'HEAD'}),{});assert.equal(head.status,302);assert.equal(head.headers.get('Location'),'/work');assert.equal(await head.text(),'');
});

test('public product homepage does not make workspace routes or APIs public',async()=>{
 const env={TRACKER_USER:'user',TRACKER_PASSWORD:'secret',DB:{prepare(){throw new Error('Unauthenticated requests must not reach storage');}}};
 for(const path of ['/work','/personal','/projects','/api/workspace?scope=personal','/api/state','/api/steam-review?appid=2358720','/api/project-calendar','/api/reminders?scope=work']){
  const response=await worker.fetch(new Request('https://site.test'+path),env);assert.equal(response.status,401,path);
  assert.doesNotMatch(await response.text(),/把工作推进/);
 }
 const response=await worker.fetch(new Request('https://site.test/',{method:'POST'}),env);assert.equal(response.status,401);
});

test('private workbench and retired homepage are excluded from search indexing',async()=>{
 const robots=await worker.fetch(new Request('https://site.test/robots.txt'),{});assert.equal(robots.status,200);assert.equal(await robots.text(),'User-agent: *\nDisallow: /\n');
 const sitemap=await worker.fetch(new Request('https://site.test/sitemap.xml'),{});assert.equal(sitemap.status,200);assert.doesNotMatch(await sitemap.text(),/<loc>/);
 const login=await worker.fetch(new Request('https://site.test/login'),{TRACKER_USER:'user',TRACKER_PASSWORD:'secret'});assert.equal(login.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.match(await login.text(),/返回工作台/);
});
