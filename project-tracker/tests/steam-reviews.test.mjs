import test from 'node:test';import assert from 'node:assert/strict';import {getSteamReview} from '../steam-reviews.mjs';
test('Steam overall reviews use official all-language summary and no key',async()=>{
 let called='';const review=await getSteamReview({appid:'2358720'},async url=>{called=url;return Response.json({response:{query_summary:{review_score:9,review_score_desc:'好评如潮',total_reviews:100,total_positive:96}}});});
 const url=new URL(called),input=JSON.parse(url.searchParams.get('input_json'));assert.match(url.pathname,/GetAppReviews/);assert.deepEqual(input.languages,['all']);assert.equal(input.day_range,0);assert.equal(input.review_type,0);assert.equal(input.purchase_type,0);assert.equal(review.label,'好评如潮');assert.equal(review.positivePercent,96);
});
test('review outages and zero reviews are distinct and never invent a rating',async()=>{
 assert.equal((await getSteamReview({appid:'1'},async()=>{throw Error();})).status,'unavailable');
 assert.equal((await getSteamReview({appid:'1'},async()=>Response.json({response:{query_summary:{total_reviews:0,total_positive:0}}}))).status,'empty');
 assert.equal((await getSteamReview({appid:'invalid'},async()=>{throw Error('must not fetch');})).status,'unmatched');
});
