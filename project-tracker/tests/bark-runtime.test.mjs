import test from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('Bark sends from the Workers runtime without redirecting device credentials',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bark-runtime-'));let mf,calls=0;
 try{
  const source=fileURLToPath(new URL('../bark-notifications.mjs',import.meta.url)),bundle=join(folder,'worker.mjs');
  await build({stdin:{contents:`import {deliverBark} from ${JSON.stringify(source)};export default {async fetch(){return Response.json({status:await deliverBark('synthetic-device',{title:'synthetic',body:'test',url:'https://tracker.managementplatformlee.com/work'})});}}`,resolveDir:folder},bundle:true,format:'esm',platform:'neutral',outfile:bundle});
  mf=new Miniflare({modules:true,modulesRoot:folder,scriptPath:bundle,compatibilityDate:'2026-07-30',outboundService:async request=>{calls++;assert.equal(request.url,'https://api.day.app/push');assert.equal((await request.json()).device_key,'synthetic-device');return calls===1?Response.json({code:200}):new Response(null,{status:302,headers:{Location:'https://should-not-follow.invalid'}});}});
  assert.equal((await (await mf.dispatchFetch('http://localhost')).json()).status,'sent');
  assert.equal((await (await mf.dispatchFetch('http://localhost')).json()).status,'failed');assert.equal(calls,2);
 }finally{await mf?.dispose();await rm(folder,{recursive:true,force:true});}
});
