// Workbench implementation of typing/dictation practice; no upstream code copied.
export function spellingKey(value){return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/\s+/g,' ');}
export function spellingMatches(answer,word){return spellingKey(answer)===spellingKey(word);}
export function practiceQueue(words,scope='all',limit=20){return [...words].filter(w=>w?.word?.trim()&&(scope!=='unknown'||!String(w.mastery||'').includes('掌握'))).sort((a,b)=>String(a.lastReviewed||'').localeCompare(String(b.lastReviewed||''))||String(a.word).localeCompare(String(b.word),'en')).slice(0,Math.max(1,Math.min(100,Number(limit)||20))).map(w=>({...w}));}
export function reviewedWord(word,correct,date){const count=Number.parseInt(word.reviewCount||'0',10);return {...word,mastery:correct?'已掌握':'不会',reviewCount:String((Number.isFinite(count)&&count>=0?count:0)+1),firstLearned:word.firstLearned||date,lastReviewed:date};}
