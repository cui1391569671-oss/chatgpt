import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validWorkspace} from '../worker.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const image='/api/wardrobe-images/11111111-1111-4111-8111-111111111111';
const clothing=(id,category,seasons=['spring'])=>({id,name:id,color:'白色',category,seasons,image});
const workspace={tasks:[],notes:[],events:[],wardrobe:[clothing('top','top'),clothing('bottom','bottom')],outfits:[{id:'o',name:'春季组合',season:'spring',items:['top','bottom']}]};
test('wardrobe validates photos, seasons and outfit references',()=>{
 assert.equal(validWorkspace(workspace),true);
 for(const mutate of [w=>w.wardrobe[0].image='javascript:alert(1)',w=>w.wardrobe[0].seasons=['invalid'],w=>w.outfits[0].items=['missing'],w=>w.wardrobe.push(w.wardrobe[0])]){const w=structuredClone(workspace);mutate(w);assert.equal(validWorkspace(w),false);}
});
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const fn=vm.runInNewContext(html.slice(html.indexOf('function basicOutfit('),html.indexOf('async function saveOutfit('))+';basicOutfit');
test('seasonal outfit suggestions only use eligible items and require a complete base',()=>{
 const clothes=[clothing('t','top'),clothing('b','bottom'),clothing('coat','outer',['winter']),clothing('shoe','shoes')];
 assert.equal(JSON.stringify(fn(clothes,'spring')),JSON.stringify(['t','b','shoe']));assert.equal(fn(clothes,'winter').length,0);
 assert.equal(JSON.stringify(fn([clothing('dress','dress',['summer']),clothing('coat','outer',['summer'])],'summer')),JSON.stringify(['dress']));
});
test('cloud photo upload stays authenticated, checks origin and serves uploaded bytes',async()=>{
 const photos=new Map();const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(sql){let args;return {bind(...a){args=a;return this;},async run(){if(sql.startsWith('INSERT'))photos.set(args[0],args[1]);return {};},async first(){return photos.has(args[0])?{bytes:photos.get(args[0])}:null;}};}}};
 const req=(auth=true,origin='https://test.local',body=new Uint8Array([255,216,255,217]))=>new Request('https://test.local/api/wardrobe-images',{method:'POST',headers:{...(auth?{Authorization:'Basic '+btoa('u:p')}:{ }),Origin:origin,'Content-Type':'image/jpeg'},body});
 assert.equal((await worker.fetch(req(false),env)).status,401);assert.equal((await worker.fetch(req(true,'https://evil.local'),env)).status,403);assert.equal((await worker.fetch(req(true,'https://test.local',new Uint8Array([1,2,3,4])),env)).status,400);
 const r=await worker.fetch(req(),env);assert.equal(r.status,200);const path=(await r.json()).image;const fetched=await worker.fetch(new Request('https://test.local'+path,{headers:{Authorization:'Basic '+btoa('u:p')}}),env);assert.equal(fetched.headers.get('Content-Type'),'image/jpeg');assert.deepEqual(new Uint8Array(await fetched.arrayBuffer()),new Uint8Array([255,216,255,217]));
});
