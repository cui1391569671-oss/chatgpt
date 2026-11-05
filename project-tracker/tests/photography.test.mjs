import test from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {photographyRoute} from '../photography-route.mjs';
import {photoFields,PHOTO_MAX_BYTES} from '../photography.mjs';
import worker from './helpers/session-worker.mjs';
import {workspaceNavigation,workspaceSiteNavigation,workspacePageMeta} from '../tasks-ui/src/workspace-page-meta.mjs';
const jpeg=Buffer.from([255,216,1,255,217]).toString('base64');
const photo=(changes={})=>({id:crypto.randomUUID(),title:'玄武湖日落',spot:'玄武湖',shotOn:'2026-11-03',note:'南京秋日',width:2400,height:1600,image:jpeg,thumbnail:jpeg,...changes});
const request=(path='',method='GET',body,scope='personal',origin='https://test.local')=>new Request('https://test.local/api/photography'+path+(path.includes('?')?'&':'?')+'scope='+scope,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
async function fixture(t){const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-07-30',d1Databases:{DB:'photography-synthetic'}});t.after(()=>mf.dispose());return {DB:await mf.getD1Database('DB')};}
test('photography has private navigation, Chinese metadata and strict fields',()=>{
 assert.equal(workspacePageMeta('personal','photography').label,'摄影');
 assert(workspaceNavigation('personal').some(group=>group.views.includes('photography')));
 assert(!workspaceSiteNavigation('work').some(group=>group.items.some(item=>item[1]==='photography')));
 assert(workspaceSiteNavigation('personal').some(group=>group.items.some(item=>item[1]==='photography')));
 assert(photoFields(photo()));for(const shotOn of ['2026-02-30','2026-99-01','bad'])assert.equal(photoFields(photo({shotOn})),null);
 for(const spot of ['日本·京都·鴨川','France · Paris · Seine','美国·纽约·中央公园'])assert.equal(photoFields(photo({spot})).spot,spot);
 assert.equal(photoFields(photo({spot:' '})),null);assert.equal(photoFields(photo({title:'x'.repeat(101)})),null);
});
test('photo APIs require login, personal scope, origin, JPEG and bounded requests',async t=>{
 const env=await fixture(t),p=photo();
 assert.equal((await worker.fetch(request('', 'POST',p),{...env,TRACKER_USER:'test',TRACKER_PASSWORD:'test-only'})).status,401);
 assert.equal((await photographyRoute(request('','GET',undefined,'work'),env)).status,403);
 assert.equal((await photographyRoute(request('','POST',p,'personal','https://other.local'),env)).status,403);
 for(const value of [null,{},photo({image:'not-base64'}),photo({thumbnail:Buffer.from('bad').toString('base64')}),photo({width:2401}),photo({shotOn:'2026-02-30'})])assert.equal((await photographyRoute(request('','POST',value),env)).status,400);
 assert.equal((await photographyRoute(request('','POST',photo({image:'x'.repeat(1500001)})),env)).status,413);
 assert.equal((await photographyRoute(request('/not-a-photo','GET'),env)).status,404);
});
test('atomic photo upload is idempotent; reads preserve image bytes and private caching',async t=>{
 const env=await fixture(t),p=photo();
 const first=await photographyRoute(request('','POST',p),env);assert.equal(first.status,200);
 assert.equal((await photographyRoute(request('','POST',p),env)).status,200);
 assert.equal((await photographyRoute(request('','POST',{...p,title:'changed retry'}),env)).status,409);
 const list=await(await photographyRoute(request(),env)).json();assert.equal(list.total,1);assert.equal(list.items[0].title,p.title);assert.deepEqual(list.spots,['玄武湖']);assert(!JSON.stringify(list).includes('fingerprint'));assert(!JSON.stringify(list).includes('thumbnail'));
 for(const kind of ['image','thumbnail']){const response=await photographyRoute(request('/'+p.id+'/'+kind),env);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/jpeg');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(Buffer.from(await response.arrayBuffer()).toString('base64'),jpeg);}
 const large=new Uint8Array(PHOTO_MAX_BYTES);large[0]=255;large[1]=216;large[large.length-2]=255;large[large.length-1]=217;
 assert.equal((await photographyRoute(request('','POST',photo({image:Buffer.from(large).toString('base64')})),env)).status,200);
 const stored=await env.DB.prepare('SELECT typeof(image) AS kind,length(image) AS bytes FROM photography WHERE id<>?').bind(p.id).first();assert.deepEqual(stored,{kind:'blob',bytes:PHOTO_MAX_BYTES});
});
test('pagination, location and search filters do not expose bytes; stale edits and deletes are rejected',async t=>{
 const env=await fixture(t),photos=Array.from({length:25},(_,i)=>photo({spot:i===24?'France · Paris · Seine':'玄武湖',title:'照片 '+i}));
 for(const p of photos)assert.equal((await photographyRoute(request('','POST',p),env)).status,200);
 const list=async(path='')=>(await photographyRoute(request(path),env)).json();
 assert.equal((await list()).items.length,24);assert.equal((await list('?page=2')).items.length,1);assert.equal((await list('?page=999')).page,2);assert.equal((await list('?spot='+encodeURIComponent('France · Paris · Seine'))).total,1);assert.equal((await list('?q=paris')).total,1);assert.equal((await list('?q='+encodeURIComponent('南京'))).total,25);assert.equal((await list('?q=nomatch')).total,0);
 const p=photos[0];assert.equal((await photographyRoute(request('/'+p.id,'PATCH',{...p,version:1,title:'更新照片',spot:'日本·京都·鴨川'}),env)).status,200);
 const updated=await list('?spot='+encodeURIComponent('日本·京都·鴨川'));assert.equal(updated.total,1);assert.equal(updated.items[0].id,p.id);
 assert.equal((await photographyRoute(request('/'+p.id,'PATCH',{...p,version:1}),env)).status,409);
 assert.equal((await photographyRoute(request('/'+p.id,'DELETE',{version:1}),env)).status,409);
 assert.equal((await photographyRoute(request('/'+p.id,'DELETE',{version:2}),env)).status,200);
 assert.equal((await photographyRoute(request('/'+p.id,'DELETE',{version:2}),env)).status,200);
 assert.equal((await photographyRoute(request('/'+p.id+'/image'),env)).status,404);
 assert.equal((await list()).total,24);
});
