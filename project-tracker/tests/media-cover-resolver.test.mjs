import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../media-cover-picker.js',import.meta.url),'utf8');
test('missing cover lookups run four at a time, deduplicate concurrent renders and preserve manual covers',async()=>{
 let active=0,max=0,calls=0;const records=Array.from({length:8},(_,i)=>({id:'test-'+i,mediaSource:'steam',mediaSourceId:String(i+1),mediaType:'game'}));records.push({id:'manual',coverMode:'manual',mediaSource:'steam',mediaSourceId:'9'});
 const context=vm.createContext({URL,URLSearchParams,AbortSignal,Map,Promise,state:{completedGames:records},view:'completedGames',renderCompletedGames:()=>{},fetch:async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return Response.json({coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/1/library_600x900.jpg'});}});
 vm.runInContext(source,context);await vm.runInContext('Promise.all([resolveMediaSourceCovers(),resolveMediaSourceCovers()])',context);assert.equal(calls,8);assert.equal(max,4);await vm.runInContext('resolveMediaSourceCovers()',context);assert.equal(calls,8);
});
test('failed source requests can retry and unrelated manual image hosts keep their original URLs',async()=>{
 let calls=0;const context=vm.createContext({URL,URLSearchParams,AbortSignal,Map,Promise,state:{completedGames:[{id:'retry',mediaSource:'steam',mediaSourceId:'1'}]},view:'other',fetch:async()=>{calls++;return calls===1?new Response('',{status:503}):Response.json({coverUrl:'https://example.test/a.jpg'});}});
 vm.runInContext(source,context);await vm.runInContext('resolveMediaSourceCovers()',context);await vm.runInContext('resolveMediaSourceCovers()',context);assert.equal(calls,2);
 assert.equal(vm.runInContext("gameCoverImageUrl('https://example.test/manual.jpg')",context),'https://example.test/manual.jpg');assert.equal(vm.runInContext("gameCoverImageUrl('https://upload.wikimedia.org/a.jpg','movie')",context),'https://upload.wikimedia.org/a.jpg');assert.match(vm.runInContext("gameCoverImageUrl('https://shared.fastly.steamstatic.com/a.jpg')",context),/^\/api\/media\/image\?/);
});

test('a failed cached image falls back to its original URL exactly once',()=>{
 const context=vm.createContext({Map});vm.runInContext(source,context);
 const image={dataset:{coverFallback:'https://upload.wikimedia.org/a.png'},hidden:true,src:'/api/media/image?url=x'};
 context.image=image;assert.equal(vm.runInContext('retryOriginalMediaCover(image)',context),true);assert.equal(image.src,'https://upload.wikimedia.org/a.png');assert.equal(image.hidden,false);assert.equal(vm.runInContext('retryOriginalMediaCover(image)',context),false);
});
