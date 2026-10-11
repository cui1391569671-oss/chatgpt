import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSteamGames,getGameReleases} from '../game-releases.mjs';
const row=(id,date,name='A &amp; B')=>`<a data-ds-appid="${id}"><img src="https://shared.fastly.steamstatic.com/store_item_assets/test.jpg"><span class="title">${name}</span><span class="platform_img win"></span><div class="search_released responsive_secondrow">${date}</div></a>`;
test('Steam parsing preserves calendar dates without local timezone shifts and uncertain dates',()=>{
 const [game,tbd]=parseSteamGames(row(1,'1 Jan, 2026')+row(2,'Q4 2026'));
 assert.equal(game.releaseDate,'2026-01-01');assert.equal(game.title,'A & B');assert.equal(game.platform,'Windows');assert.equal(tbd.releaseDate,'');
 assert.equal(parseSteamGames(row(1,'Coming soon').replace('https://shared.fastly.steamstatic.com/store_item_assets/test.jpg','https://evil.example/image'))[0].coverUrl,'');
});
test('annual Steam catalog traverses pages, excludes future and old releases, deduplicates',async()=>{
 let calls=0;const fetcher=async url=>{calls++;assert.equal(new URL(url).hostname,'store.steampowered.com');return Response.json({success:1,total_count:200,results_html:calls===1?row(1,'9 Oct, 2026')+row(2,'12 Oct, 2026'):row(1,'9 Oct, 2026')+row(3,'1 Jan, 2026')+row(4,'31 Dec, 2025')});};
 const d=await getGameReleases('released',fetcher,new Date('2026-10-11T00:00:00Z'));assert.equal(calls,2);assert.deepEqual(d.items.map(g=>g.id),['1','3']);assert.equal(d.complete,true);
});
test('upcoming is limited to five and upstream failure is reported',async()=>{
 const d=await getGameReleases('upcoming',async()=>Response.json({success:1,total_count:20,results_html:Array.from({length:8},(_,i)=>row(i+1,'Coming soon')).join('')}));assert.equal(d.items.length,5);
 await assert.rejects(getGameReleases('upcoming',async()=>new Response('',{status:503})));
});
