import {sentenceKey} from './word-practice.mjs';

// One vocabulary example line is one candidate, matching the sentence-practice convention.
export function dailySentence(words,now=new Date()){
 const date=new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
 const examples=(Array.isArray(words)?words:[]).flatMap(word=>typeof word?.example==='string'?word.example.split(/\r?\n/):[]).map(line=>line.trim()).filter(line=>/[a-z]/i.test(line));
 const unique=new Map();
 for(const sentence of examples.sort())if(!unique.has(sentenceKey(sentence)))unique.set(sentenceKey(sentence),sentence);
 const candidates=[...unique].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,sentence])=>sentence);
 const ordinal=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
 return {date,sentence:candidates.length?candidates[ordinal%candidates.length]:null};
}
