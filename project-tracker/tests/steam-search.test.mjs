import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSteamGames} from '../steam-search.mjs';
import worker from './helpers/session-worker.mjs';
const row=(id,date,image='https://shared.fastly.steamstatic.com/store_item_assets/test.jpg')=>`<a data-ds-appid="${id}"><img src="${image}"><span class="title">A &amp; B</span><span class="platform_img win"></span><div class="search_released responsive_secondrow">${date}</div></a>`;
test('entertainment cover search retains Steam dates, uncertain dates and safe cover URLs',()=>{
 const [dated,uncertain,unsafe]=parseSteamGames(row(1,'1 Jan, 2026')+row(2,'Q4 2026')+row(3,'Coming soon','https://evil.example/image'));
 assert.equal(dated.releaseDate,'2026-01-01');assert.equal(dated.title,'A & B');assert.equal(dated.platform,'Windows');assert.equal(uncertain.releaseDate,'');assert.equal(unsafe.coverUrl,'');
});
test('retired release catalog API does not request upstream sources or access storage',async()=>{
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){throw Error('unexpected storage access');}}};
 const request=new Request('https://test.local/api/game-releases?mode=upcoming',{headers:{Authorization:'Basic '+btoa('u:p')}});
 assert.equal((await worker.fetch(request,env)).status,404);
});
