// Workbench implementation of typing/dictation practice; no upstream code copied.
export function spellingKey(value){return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/\s+/g,' ');}
export function spellingMatches(answer,word){return spellingKey(answer)===spellingKey(word);}
export function sentenceKey(value){return spellingKey(value).replace(/[.!?。！？]+$/u,'').trim();}
export function sentenceMatches(answer,reference){return !!sentenceKey(answer)&&sentenceKey(answer)===sentenceKey(reference);}
export function sentenceQueue(words,scope='all',limit=20){
 const seen=new Set(),result=[];
 for(const word of orderedWords(words,scope)){
  const examples=String(word.example||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const translations=String(word.exampleTranslation||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  // A translation is never guessed from the single-word definition. Align complete pairs only.
  if(examples.length!==translations.length)continue;
  examples.forEach((example,index)=>{const translation=translations[index],key=sentenceKey(example);if(!/[a-z]/i.test(example)||!/[\u3400-\u9fff]/u.test(translation)||seen.has(key))return;seen.add(key);result.push({...word,practiceId:word.id+':'+index,example,exampleTranslation:translation});});
 }
 return result.slice(0,Math.max(1,Math.min(100,Number(limit)||20)));
}
function orderedWords(words,scope){return [...words].filter(w=>w?.word?.trim()&&(scope!=='unknown'||!String(w.mastery||'').includes('掌握'))).sort((a,b)=>String(a.lastReviewed||'').localeCompare(String(b.lastReviewed||''))||String(a.word).localeCompare(String(b.word),'en'));}
export function practiceQueue(words,scope='all',limit=20){return orderedWords(words,scope).slice(0,Math.max(1,Math.min(100,Number(limit)||20))).map(w=>({...w}));}

export function reviewedWord(word,correct,date){const count=Number.parseInt(word.reviewCount||'0',10);return {...word,mastery:correct?'已掌握':'不会',reviewCount:String((Number.isFinite(count)&&count>=0?count:0)+1),firstLearned:word.firstLearned||date,lastReviewed:date};}
export function validPracticeSession(s){return !!s&&typeof s.id==='string'&&s.id.length>0&&s.id.length<=100&&['typing','dictation','sentence'].includes(s.mode)&&Number.isInteger(s.total)&&s.total>0&&s.total<=100&&Number.isInteger(s.correct)&&s.correct>=0&&s.correct<=s.total&&Number.isInteger(s.durationSeconds)&&s.durationSeconds>=0&&s.durationSeconds<=604800&&typeof s.completedOn==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.completedOn)&&!Number.isNaN(Date.parse(s.completedOn))&&new Date(s.completedOn).toISOString().slice(0,10)===s.completedOn&&[s.startedAt,s.completedAt].every(v=>typeof v==='string'&&v.length<=40&&!Number.isNaN(Date.parse(v)))&&Date.parse(s.completedAt)>=Date.parse(s.startedAt);}
