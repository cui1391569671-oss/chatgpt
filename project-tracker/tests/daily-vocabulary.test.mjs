import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function selectDailyVocabulary('),html.indexOf('function dailyVocabularyCard('));
const context=vm.createContext({});vm.runInContext(code,context);
const select=(v,date)=>Array.from(context.selectDailyVocabulary(v,date),w=>w.word);
test('daily study selects five distinct words consistently across reloads, devices and input order',()=>{
 const words=Array.from({length:30},(_,i)=>({word:'word'+i}));
 const selected=select(words,'2026-10-11');assert.equal(selected.length,5);assert.equal(new Set(selected).size,5);
 assert.deepEqual(select([...words].reverse(),'2026-10-11'),selected);assert.deepEqual(select(words,'2026-10-11'),selected);
 assert.notDeepEqual(select(words,'2026-10-12'),selected);assert.equal(words[0].word,'word0');
});
test('small and empty vocabularies are supported and duplicate words do not repeat',()=>{
 assert.deepEqual(select(undefined,'2026-10-11'),[]);
 const words=select([{word:'apple'},{word:'Apple'},{word:'banana'},{word:''}],'2026-10-11');assert.equal(words.length,2);assert(words.includes('apple'));assert(words.includes('banana'));
});
