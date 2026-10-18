import test from 'node:test';
import assert from 'node:assert/strict';
import {spellingMatches,practiceQueue,reviewedWord} from '../word-practice.mjs';
test('typing practice matches normalized spelling without accepting incomplete answers',()=>{
 assert.equal(spellingMatches(' Apple ','apple'),true);assert.equal(spellingMatches('don’t',"don't"),true);assert.equal(spellingMatches('ＡＰＰＬＥ','apple'),true);assert.equal(spellingMatches('appl','apple'),false);assert.equal(spellingMatches('apples','apple'),false);
});
test('practice queue prioritizes unreviewed words and preserves existing word data',()=>{
 const words=[{id:'a',word:'apple',mastery:'已掌握',lastReviewed:'2026-10-01'},{id:'b',word:'book',mastery:'不会',meaning:'书',reviewCount:'2',firstLearned:'2026-01-01'},{id:'c',word:'cat',mastery:'不会',lastReviewed:'2026-10-02'}];
 assert.deepEqual(practiceQueue(words,'unknown',1).map(x=>x.id),['b']);assert.equal(practiceQueue(words,'all',20).length,3);
 const reviewed=reviewedWord(words[1],true,'2026-10-18');assert.equal(reviewed.reviewCount,'3');assert.equal(reviewed.mastery,'已掌握');assert.equal(reviewed.firstLearned,'2026-01-01');assert.equal(reviewed.meaning,'书');assert.equal(words[1].reviewCount,'2');assert.equal(reviewedWord({...words[1],reviewCount:'invalid'},false,'2026-10-18').reviewCount,'1');
});
