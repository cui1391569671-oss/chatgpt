import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSteamGames,getGameReleases,getSteamReleases,parsePlayStationGames,mergeReleaseGames,PS_SOURCE} from '../game-releases.mjs';
const row=(id,date,name='A &amp; B')=>`<a data-ds-appid="${id}"><img src="https://shared.fastly.steamstatic.com/store_item_assets/test.jpg"><span class="title">${name}</span><span class="platform_img win"></span><div class="search_released responsive_secondrow">${date}</div></a>`;
test('Steam parsing preserves calendar dates without local timezone shifts and uncertain dates',()=>{
 const [game,tbd]=parseSteamGames(row(1,'1 Jan, 2026')+row(2,'Q4 2026'));
 assert.equal(game.releaseDate,'2026-01-01');assert.equal(game.title,'A & B');assert.equal(game.platform,'Windows');assert.equal(tbd.releaseDate,'');
 assert.equal(parseSteamGames(row(1,'Coming soon').replace('https://shared.fastly.steamstatic.com/store_item_assets/test.jpg','https://evil.example/image'))[0].coverUrl,'');
});
test('annual Steam catalog traverses pages, excludes future and old releases, deduplicates',async()=>{
 let calls=0;const fetcher=async url=>{if(new URL(url).searchParams.get('l')==='schinese')return Response.json({success:1,results_html:''});calls++;assert.equal(new URL(url).hostname,'store.steampowered.com');return Response.json({success:1,total_count:200,results_html:calls===1?row(1,'9 Oct, 2026')+row(2,'12 Oct, 2026'):row(1,'9 Oct, 2026')+row(3,'1 Jan, 2026')+row(4,'31 Dec, 2025')});};
 const d=await getSteamReleases('released',fetcher,new Date('2026-10-11T00:00:00Z'));assert.equal(calls,2);assert.deepEqual(d.items.map(g=>g.id),['1','3']);assert.equal(d.complete,true);
});
test('Chinese titles match by Steam app ID, prefer Chinese portion and preserve English search title',async()=>{
 const d=await getSteamReleases('upcoming',async url=>Response.json({success:1,total_count:1,results_html:new URL(url).searchParams.get('l')==='schinese'?row(7,'即将推出','Moonfrost / 月霜'):row(7,'Coming soon','Moonfrost')}));
 assert.equal(d.items[0].title,'月霜');assert.equal(d.items[0].originalTitle,'Moonfrost');
});
test('PS official parsing decodes Chinese entities and keeps uncertain release dates',()=>{
 const html='<img src="https://gmedia.playstation.com/is/image/test"><h3>影之刃零</h3><p>发布日期&#xff1a;2026年10月29日</p><a class="btn--cta" href="/zh-hans-hk/games/phantom-blade-zero/">更多</a><h5>Example</h5><p>发布日期：2027年</p><a class="btn--cta" href="/zh-hans-hk/games/example/">更多</a>';
 const games=parsePlayStationGames(html);assert.equal(games[0].releaseDate,'2026-10-29');assert.equal(games[1].releaseDate,'');assert.equal(games[1].releaseLabel,'2027年');assert.equal(games[0].platform,'PS5');
});
test('cross-platform deduplication preserves separate dates and PS-only games appear among five',()=>{
 const steam=Array.from({length:8},(_,i)=>({id:String(i),title:i===0?'Phantom Blade Zero':'Game '+i,releaseDate:'2026-10-12',platform:'Windows'}));
 const ps={id:'ps:phantom-blade-zero',originalTitle:'phantom blade zero',title:'影之刃零',releaseDate:'2026-10-29',platform:'PS5'};
 const list=mergeReleaseGames(steam,[ps],'released');assert.equal(list.length,8);assert.equal(list[0].title,'影之刃零');assert.equal(list[0].platformReleases[1].releaseDate,'2026-10-29');
 const upcoming=mergeReleaseGames(steam,[{...ps,title:'Exclusive',originalTitle:'exclusive'}],'upcoming');assert.equal(upcoming.length,5);assert(upcoming.some(g=>g.platform==='PS5'));
});
test('PS still returns games when Steam is unavailable and reports the missing source',async()=>{
 const d=await getGameReleases('upcoming',async url=>url===PS_SOURCE?new Response('<h3>PS Only</h3><p>发布日期：2027年1月2日</p><a class="btn--cta" href="/zh-hans-hk/games/ps-only/">更多</a>'):new Response('',{status:503}),new Date('2026-10-11T00:00:00Z'));
 assert.equal(d.items[0].platform,'PS5');assert.equal(d.complete,false);assert.equal(d.warnings.length,1);
});
test('upcoming is limited to five and upstream failure is reported',async()=>{
 const d=await getGameReleases('upcoming',async()=>Response.json({success:1,total_count:20,results_html:Array.from({length:8},(_,i)=>row(i+1,'Coming soon')).join('')}));assert.equal(d.items.length,5);
 await assert.rejects(getGameReleases('upcoming',async()=>new Response('',{status:503})));
});
