import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../media-cover-picker.js',import.meta.url),'utf8');
test('missing cover lookups run four at a time, deduplicate concurrent renders and preserve manual covers',async()=>{
 let active=0,max=0,calls=0;const records=Array.from({length:8},(_,i)=>({id:'test-'+i,mediaSource:'steam',mediaSourceId:String(i+1),mediaType:'game'}));records.push({id:'manual',coverMode:'manual',mediaSource:'steam',mediaSourceId:'9'});
 const context=vm.createContext({URL,URLSearchParams,AbortSignal,Map,Promise,state:{completedGames:records},view:'completedGames',renderCompletedGames:()=>{throw Error('Enrichment must not rerender the library');},$:()=>({querySelectorAll:()=>[]}),fetch:async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return Response.json({coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/1/library_600x900.jpg'});}});
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

test('source enrichment patches the existing cover once without replacing cards or retrying a cached failure',async()=>{
 let image=null,insertions=0,renders=0,calls=0;
 const item={id:'cover',title:'A game',mediaType:'game',mediaSource:'steam',mediaSourceId:'1'};
 const cover={dataset:{id:'cover'},classList:{contains:()=>false},querySelector:()=>image,prepend:node=>{image=node;insertions++;}};
 const context=vm.createContext({URL,URLSearchParams,AbortSignal,Map,Promise,state:{completedGames:[item]},view:'completedGames',document:{createElement:()=>({dataset:{}})},$:()=>({querySelectorAll:()=>[cover]}),renderCompletedGames:()=>{renders++;},fetch:async()=>{calls++;return Response.json({coverUrl:'https://cdn.akamai.steamstatic.com/steam/apps/1/library_600x900.jpg'});}});
 vm.runInContext(source,context);
 await vm.runInContext('resolveMediaSourceCovers()',context);
 assert.equal(insertions,1);assert.equal(renders,0);assert.equal(image.alt,'A game 封面');
 assert.match(image.src,/^\/api\/media\/image\?/);
 const saved=image;image.onerror();assert.match(image.src,/^https:/);image.onerror();assert.equal(image.hidden,true);
 await vm.runInContext('resolveMediaSourceCovers()',context);
 assert.equal(image,saved);assert.equal(insertions,1);assert.equal(calls,1);assert.equal(image.hidden,true);
});

test('late cover responses preserve a newly selected manual cover',async()=>{
 let finish,insertions=0;
 const item={id:'late',title:'Game',mediaSource:'steam',mediaSourceId:'1'};
 const context=vm.createContext({URL,URLSearchParams,AbortSignal,Map,Promise,state:{completedGames:[item]},view:'completedGames',$:()=>({querySelectorAll:()=>[]}),fetch:()=>new Promise(resolve=>{finish=resolve;}),document:{createElement:()=>{insertions++;}}});
 vm.runInContext(source,context);const loading=vm.runInContext('resolveMediaSourceCovers()',context);
 item.coverMode='manual';item.coverUrl='https://example.test/custom.jpg';
 finish(Response.json({coverUrl:'https://example.test/old.jpg'}));await loading;
 assert.equal(insertions,0);assert.equal(item.coverUrl,'https://example.test/custom.jpg');
});

test('reviews request visible list games only, update existing labels and never rerender on success or failure',async()=>{
 let calls=0,renders=0;
 const labels=[{dataset:{mediaReviewKey:'1'},textContent:'评价加载中…'},{dataset:{mediaReviewKey:'2'},textContent:'评价加载中…'}];
 const records=[1,2,3].map(id=>({id:String(id),title:'Game '+id,mediaType:'game',steamAppId:String(id)}));
 const context=vm.createContext({URLSearchParams,AbortSignal,Map,Set,Promise,Array,state:{completedGames:records},view:'completedGames',mediaLayout:'grid',$:()=>({querySelectorAll:()=>labels}),renderCompletedGames:()=>{renders++;},fetch:async()=>{calls++;return calls===1?Response.json({label:'好评如潮'}):new Response('',{status:503});}});
 vm.runInContext(source,context);await vm.runInContext('resolveSteamReviews()',context);assert.equal(calls,0);
 context.mediaLayout='list';await vm.runInContext('Promise.all([resolveSteamReviews(),resolveSteamReviews()])',context);
 assert.equal(calls,2);assert.equal(renders,0);assert.equal(labels[0].textContent,'好评如潮');assert.equal(labels[1].textContent,'评价暂不可用');
 await vm.runInContext('resolveSteamReviews()',context);assert.equal(calls,2);
});
