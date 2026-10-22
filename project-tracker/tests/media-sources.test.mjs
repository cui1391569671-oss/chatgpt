import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';
import {searchMediaSources,mediaSourceDetails} from '../media-sources.mjs';
import {validMediaIdentity} from '../media-tracking.mjs';
import {gameSearchTerms} from '../game-covers.mjs';
const json=data=>Response.json(data);
test('Chinese Final Fantasy searches use canonical Roman titles and keep editions as distinct choices',async()=>{
 assert.equal(gameSearchTerms('最终幻想7')[0],'Final Fantasy VII');assert.equal(gameSearchTerms('最终幻想16')[0],'Final Fantasy XVI');assert.equal(gameSearchTerms('最終幻想７重製版')[0],'Final Fantasy VII Remake');assert.equal(gameSearchTerms('最终幻想7重生')[0],'Final Fantasy VII Rebirth');
 for(const [query,expected] of [['最终幻想7','Final Fantasy VII'],['最终幻想16','Final Fantasy XVI']]){
  const bodies=[],env={IGDB_CLIENT_ID:'ff-client-'+query,IGDB_CLIENT_SECRET:'test-secret'},fetcher=async(url,options)=>{if(url.includes('oauth2/token'))return json({access_token:'test-token',expires_in:3600});bodies.push(options.body);return json([{id:1,name:expected,cover:{image_id:'co1'}},{id:2,name:expected+' Remake',cover:{image_id:'co2'}}]);};
  const result=await searchMediaSources('game',query,env,fetcher);assert.ok(bodies[0].includes('search '+JSON.stringify(expected)));assert.equal(result.candidates.length,2);assert.notEqual(result.candidates[0].sourceId,result.candidates[1].sourceId);assert.ok(result.candidates.every(x=>x.coverUrl));
 }
});
test('TMDB separates movies and TV, retains duplicate titles by ID, and loads season posters by stable ID',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push({url,options});if(url.includes('/search/'))return json({results:[{id:10,title:'同名电影',poster_path:'/a.jpg',release_date:'2000-01-01'},{id:20,title:'同名电影',poster_path:'/b.jpg',release_date:'2020-01-01'}]});if(url.includes('/season/'))return json({id:99,poster_path:'/season2.jpg',episodes:[{},{}]});return json({id:10,name:'电视剧',poster_path:'/series.jpg',number_of_episodes:30});};
 const result=await searchMediaSources('movie','同名电影',{TMDB_API_TOKEN:'test-token'},fetcher);assert.equal(result.candidates.length,2);assert.deepEqual(result.candidates.map(x=>x.sourceId),['10','20']);assert.ok(calls[0].url.includes('/search/movie?'));assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');assert.ok(!JSON.stringify(result).includes('test-token'));
 const details=await mediaSourceDetails('tmdb','10','tv',2,{TMDB_API_TOKEN:'test-token'},fetcher);assert.equal(details.sourceId,'10');assert.equal(details.coverUrl,'https://image.tmdb.org/t/p/w500/season2.jpg');assert.equal(details.total,2);assert.ok(calls.some(x=>x.url.includes('/tv/10/season/2')));
});
test('IGDB authenticates on the server, refreshes a revoked token once and supplies platform and Steam IDs',async()=>{
 let tokens=0,queries=0;const fetcher=async(url,options)=>{if(url.includes('oauth2/token')){tokens++;assert.ok(options.body.includes('client_secret=test-secret'));return json({access_token:'token-'+tokens,expires_in:3600});}queries++;if(queries===1)return new Response('',{status:401});assert.equal(options.headers.Authorization,'Bearer token-2');return json([{id:123,name:'Game',slug:'game',cover:{image_id:'co123'},platforms:[{name:'PS5'}],websites:[{url:'https://store.steampowered.com/app/12345/'}]}]);};
 const result=await searchMediaSources('game','Game',{IGDB_CLIENT_ID:'test-client',IGDB_CLIENT_SECRET:'test-secret'},fetcher);assert.equal(tokens,2);assert.equal(result.candidates[0].source,'igdb');assert.equal(result.candidates[0].steamAppId,'12345');assert.match(result.candidates[0].coverUrl,/t_cover_big\/co123.jpg/);assert.equal(result.candidates[0].platforms,'PS5');assert.doesNotMatch(JSON.stringify(result),/test-secret|token-2/);
});
test('Bangumi and MAL supplement one another without merging unrelated provider IDs',async()=>{
 const fetcher=async(url,options)=>{if(url.includes('api.bgm.tv'))return json({total:1,data:[{id:1,type:2,name:'Test',name_cn:'测试',images:{large:'https://lain.bgm.tv/pic/cover/l/1.jpg'}}]});assert.equal(options.headers['X-MAL-CLIENT-ID'],'test-mal');return json({data:[{node:{id:1,title:'测试',main_picture:{large:'https://cdn.myanimelist.net/images/anime/1.jpg'},num_episodes:12}}]});};
 const result=await searchMediaSources('anime','测试',{MAL_CLIENT_ID:'test-mal'},fetcher);assert.deepEqual(result.candidates.map(x=>x.source).sort(),['bangumi','mal']);assert.equal(result.candidates.find(x=>x.source==='mal').total,12);
});
test('missing configuration is explicit; unavailable IGDB can fall back to a Steam record',async()=>{
 let calls=0;const missing=await searchMediaSources('movie','电影',{},async()=>{calls++;throw Error();});assert.equal(calls,0);assert.deepEqual(missing.candidates,[]);assert.match(missing.warnings[0],/TMDB.*未配置/);
 const fallback=await searchMediaSources('game','无主之地4',{},async()=>json({}));assert.equal(fallback.candidates[0].source,'steam');assert.equal(fallback.candidates[0].sourceId,'1285190');
 const result=await searchMediaSources('anime','测试',{MAL_CLIENT_ID:'test-mal'},async url=>{if(url.includes('myanimelist'))throw Error('secret-error');return json({data:[],total:0});});assert.ok(result.warnings.some(x=>x.includes('MyAnimeList')));assert.doesNotMatch(JSON.stringify(result),/secret-error/);
});
test('identity validation and authenticated routes prevent forged source queries and ID injection',async()=>{
 assert.equal(validMediaIdentity({mediaSource:'tmdb',mediaSourceId:'12',mediaType:'movie'}),true);assert.equal(validMediaIdentity({mediaSource:'tmdb',mediaSourceId:'12',mediaType:'game'}),false);assert.equal(validMediaIdentity({mediaSource:'igdb',mediaSourceId:'1; fields *;',mediaType:'game'}),false);assert.equal(validMediaIdentity({coverMode:'source'}),false);
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p'},auth={Authorization:'Basic '+btoa('u:p')};
 for(const path of ['/api/media/search?type=movie&q=x','/api/media/details?type=movie&source=tmdb&id=1'])assert.equal((await worker.fetch(new Request('https://site.test'+path),env)).status,401);
 const invalid=await worker.fetch(new Request('https://site.test/api/media/details?type=game&source=igdb&id=1%3Bfields*',{headers:auth}),env);assert.equal(invalid.status,400);
 const unconfigured=await worker.fetch(new Request('https://site.test/api/media/search?type=movie&q=x',{headers:auth}),env);assert.equal(unconfigured.status,200);assert.match((await unconfigured.json()).warnings[0],/未配置/);
});
