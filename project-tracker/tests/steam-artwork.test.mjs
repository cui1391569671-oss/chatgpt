import test from 'node:test';import assert from 'node:assert/strict';import {getSteamPortrait,isSteamPortrait} from '../steam-artwork.mjs';
test('current hashed library artwork replaces legacy preview artwork',async()=>{
 const hash='e68c1eeacfc21e61e5a03ae81a20694856665af4';
 const url=await getSteamPortrait('1285190',async()=>Response.json({response:{store_items:[{appid:1285190,assets:{asset_url_format:'steam/apps/1285190/${FILENAME}?t=123',library_capsule:hash+'/library_600x900.jpg'}}]}}));
 assert.equal(url,'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1285190/'+hash+'/library_600x900.jpg?t=123');assert.equal(isSteamPortrait(url),true);
});
test('Borderlands 4 fallback retains verified red artwork rather than the old teaser',async()=>{const url=await getSteamPortrait('1285190',async()=>{throw Error();});assert.match(url,/e68c1eeacfc21e61e5a03ae81a20694856665af4/);assert.equal(isSteamPortrait('https://evil.test/steam/apps/1285190/library_600x900.jpg'),false);assert.equal(isSteamPortrait('https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1285190/header.jpg'),false);});
