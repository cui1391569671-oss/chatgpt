import test from 'node:test';
import assert from 'node:assert/strict';
import {spellingMatches,practiceQueue,reviewedWord,validPracticeSession,sentenceMatches,sentenceQueue} from '../word-practice.mjs';
import {validWorkspace} from './helpers/session-worker.mjs';
import {recordChanges,applyRecordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
test('completed practice sessions are validated and merge without losing other devices or vocabulary updates',()=>{
 const session={id:'round-1',mode:'dictation',total:20,correct:17,durationSeconds:80,startedAt:'2026-10-18T09:00:00Z',completedAt:'2026-10-18T09:01:20Z',completedOn:'2026-10-18'};
 assert.ok(validPracticeSession(session));for(const bad of [{total:0},{correct:21},{durationSeconds:-1},{mode:'other'},{completedOn:'2026-02-30'},{completedAt:'2026-10-18T08:00:00Z'}])assert.equal(validPracticeSession({...session,...bad}),false);
 const base={tasks:[],notes:[],events:[],vocabulary:[{id:'word-1',word:'apple'}]},next={...base,wordPracticeSessions:[session]};
 const changes=recordChanges(base,next,WORKSPACE_COLLECTIONS),cloud={...base,wordPracticeSessions:[{...session,id:'other-device'}]};
 const merged=applyRecordChanges(cloud,changes,WORKSPACE_COLLECTIONS);assert.equal(merged.wordPracticeSessions.length,2);assert.deepEqual(merged.vocabulary,base.vocabulary);assert.deepEqual(applyRecordChanges(merged,changes,WORKSPACE_COLLECTIONS),merged);assert.ok(validWorkspace(merged));assert.equal(validWorkspace({...merged,wordPracticeSessions:[session,session]}),false);
});
test('typing practice matches normalized spelling without accepting incomplete answers',()=>{
 assert.equal(spellingMatches(' Apple ','apple'),true);assert.equal(spellingMatches('don’t',"don't"),true);assert.equal(spellingMatches('ＡＰＰＬＥ','apple'),true);assert.equal(spellingMatches('appl','apple'),false);assert.equal(spellingMatches('apples','apple'),false);
});

test('sentence matching tolerates presentation, not changed words or missing negation',()=>{
 assert.ok(sentenceMatches('  THE report is accurate!  ','The report is accurate.'));
 assert.ok(sentenceMatches('I’m ready.',"I'm ready."));
 assert.equal(sentenceMatches('The report is not accurate.','The report is accurate.'),false);
 assert.equal(sentenceMatches('The report','The report is accurate.'),false);
 assert.equal(sentenceMatches('',''),false);
});

test('sentence queue uses aligned Chinese examples, deduplicates and keeps source IDs',()=>{
 const words=[{id:'a',word:'report',example:'The report is accurate.',exampleTranslation:'这份报告是准确的。',mastery:'不会'},
 {id:'b',word:'accurate',example:'The report is accurate.',exampleTranslation:'这份报告是准确的。'},
 {id:'c',word:'confirm',example:'Please confirm.\nI can confirm that.',exampleTranslation:'请确认。\n这一点我可以确认。'},
 {id:'missing',word:'book',meaning:'书',example:'Read the book.'},
 {id:'mismatch',word:'ready',example:'Are you ready?\nI am ready.',exampleTranslation:'你准备好了吗？'}];
 const copy=structuredClone(words),queue=sentenceQueue(words,'all',20);
 assert.equal(queue.length,3);assert.deepEqual(words,copy);
 assert.ok(queue.every(row=>row.id&&row.practiceId&&row.exampleTranslation));
 assert.equal(queue.filter(row=>row.id==='c').length,2);
 assert.equal(queue.some(row=>['missing','mismatch'].includes(row.id)),false);
});

test('sentence queue searches beyond the first hundred words',()=>{
 const words=Array.from({length:150},(_,i)=>({id:String(i),word:'word'+i}));
 words.push({id:'last',word:'zzzz',example:'I am ready.',exampleTranslation:'我准备好了。'});
 assert.equal(sentenceQueue(words,'all',10)[0].id,'last');
});

test('sentence sessions and optional translations preserve existing workspace schema',()=>{
 const session={id:'sentence-round',mode:'sentence',total:2,correct:1,durationSeconds:20,startedAt:'2026-10-24T09:00:00Z',completedAt:'2026-10-24T09:00:20Z',completedOn:'2026-10-24'};
 const workspace={tasks:[],notes:[],events:[],wordPracticeSessions:[session],vocabulary:[{id:'word',word:'ready',example:'I am ready.',exampleTranslation:'我准备好了。'}]};
 assert.ok(validPracticeSession(session));assert.ok(validWorkspace(workspace));
 assert.equal(validWorkspace({...workspace,vocabulary:[{...workspace.vocabulary[0],exampleTranslation:42}]}),false);
});
test('practice queue prioritizes unreviewed words and preserves existing word data',()=>{
 const words=[{id:'a',word:'apple',mastery:'已掌握',lastReviewed:'2026-10-01'},{id:'b',word:'book',mastery:'不会',meaning:'书',reviewCount:'2',firstLearned:'2026-01-01'},{id:'c',word:'cat',mastery:'不会',lastReviewed:'2026-10-02'}];
 assert.deepEqual(practiceQueue(words,'unknown',1).map(x=>x.id),['b']);assert.equal(practiceQueue(words,'all',20).length,3);
 const reviewed=reviewedWord(words[1],true,'2026-10-18');assert.equal(reviewed.reviewCount,'3');assert.equal(reviewed.mastery,'已掌握');assert.equal(reviewed.firstLearned,'2026-01-01');assert.equal(reviewed.meaning,'书');assert.equal(words[1].reviewCount,'2');assert.equal(reviewedWord({...words[1],reviewCount:'invalid'},false,'2026-10-18').reviewCount,'1');
});
