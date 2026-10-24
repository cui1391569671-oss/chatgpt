export const VOCABULARY_SHEET={id:'1oXdYD6Lf5E3d2mgv8Lt7DP_cS9r0PJyAUZuhz5kY_fY',tab:'词汇库',url:'https://docs.google.com/spreadsheets/d/1oXdYD6Lf5E3d2mgv8Lt7DP_cS9r0PJyAUZuhz5kY_fY/edit'};
const fields={Lesson:['lesson',100],单词:['word',200],音标:['phonetic',500],词性:['partOfSpeech',100],中文释义:['meaning',2000],例句:['example',5000],例句译文:['exampleTranslation',5000],熟练度:['mastery',100],首次学习日期:['firstLearned',40],最近复习:['lastReviewed',40],复习次数:['reviewCount',20],备注:['note',5000]};
const learning=['mastery','firstLearned','lastReviewed','reviewCount'];
const key=word=>word.normalize('NFKC').trim().toLowerCase();
function wordId(word){let a=2166136261,b=5381;for(const c of key(word)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return 'sheet-'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16);}
export function parseVocabularyRows(rows){
 if(!Array.isArray(rows)||rows.length<2)throw Error('表格为空，已保留原词库。');
 const headers=rows[0].map(x=>String(x||'').replace(/^\uFEFF/,'').trim());
 if(['单词','中文释义'].some(x=>!headers.includes(x))||new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('表头不正确，需要“单词”和“中文释义”列。');
 const seen=new Set(),items=[];
 for(const row of rows.slice(1)){if(!Array.isArray(row))throw Error('表格行格式不正确。');if(!String(row[headers.indexOf('单词')]||'').trim())continue;
  const item={};for(const [header,[field,max]] of Object.entries(fields)){const index=headers.indexOf(header);if(index<0)continue;const value=String(row[index]??'').trim();if(value.length>max)throw Error('表格内容超过字段长度限制，原词库已保留。');item[field]=value;}
  const normalized=key(item.word);if(seen.has(normalized))throw Error('表格含有重复单词，请先合并重复行。');seen.add(normalized);items.push(item);
 }
 if(!items.length||items.length>5000)throw Error('表格需包含 1–5000 个有效单词，原词库已保留。');return items;
}
export function mergeSheetVocabulary(existing,incoming){
 const byWord=new Map(existing.map(w=>[key(w.word),w])),result=existing.map(w=>({...w}));let added=0,updated=0;
 for(const item of incoming){const old=byWord.get(key(item.word));if(old){const next={...old,...item};for(const field of learning)if(Object.hasOwn(old,field))next[field]=old[field];if(JSON.stringify(old)!==JSON.stringify(next)){result[result.findIndex(x=>x.id===old.id)]=next;updated++;}}
  else{result.push({...item,id:wordId(item.word),mastery:item.mastery||'不会',firstLearned:item.firstLearned||'',lastReviewed:item.lastReviewed||'',reviewCount:item.reviewCount||'0'});added++;}}
 if(result.length>5000||new Set(result.map(w=>w.id)).size!==result.length)throw Error('词库容量或编号冲突，原词库已保留。');
 return {vocabulary:result,added,updated,sourceCount:incoming.length};
}

async function ensureSyncTable(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS vocabulary_sheet_sync (id INTEGER PRIMARY KEY, attempted_at INTEGER NOT NULL, status TEXT NOT NULL, synced_at TEXT, summary TEXT)').run();}
export async function vocabularySyncStatus(env){
 if(!env.VOCABULARY_SYNC_SECRET)return {configured:false,mode:'apps-script',status:'unconfigured',source:VOCABULARY_SHEET.url,message:'尚未配置 Apps Script 同步密钥'};
 await ensureSyncTable(env);const row=await env.DB.prepare('SELECT attempted_at,status,synced_at,summary FROM vocabulary_sheet_sync WHERE id=1').first();
 return {configured:true,mode:'apps-script',source:VOCABULARY_SHEET.url,status:row?.status||'ready',syncedAt:row?.synced_at||null,...(row?.summary?JSON.parse(row.summary):{})};
}
async function readPushBody(request){if(Number(request.headers.get('Content-Length'))>1500000)throw Error('Too large');const reader=request.body?.getReader();if(!reader)throw Error('Empty body');const chunks=[];let length=0;for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1500000){await reader.cancel();throw Error('Too large');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);}
export async function vocabularyPushRoute(request,env,{readState,writeState,validWorkspace}){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!env.VOCABULARY_SYNC_SECRET)return reply({error:'尚未配置 Apps Script 同步密钥'},503);
 const timestamp=request.headers.get('X-Vocabulary-Timestamp'),signature=request.headers.get('X-Vocabulary-Signature'),now=Date.now();
 if(!/^\d{13}$/.test(timestamp||'')||Math.abs(now-Number(timestamp))>300000||!/^([a-f0-9]{2}){32}$/.test(signature||''))return reply({error:'Invalid signature'},401);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return reply({error:'JSON required'},415);
 let body;try{body=await readPushBody(request);}catch{return reply({error:'Invalid or oversized body'},413);}
 const hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.VOCABULARY_SYNC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);const bytes=Uint8Array.from(signature.match(/../g),x=>Number.parseInt(x,16));
 if(!await crypto.subtle.verify('HMAC',hmac,bytes,new TextEncoder().encode(timestamp+'.'+body)))return reply({error:'Invalid signature'},401);
 let incoming;try{const data=JSON.parse(body);if(data.spreadsheetId!==VOCABULARY_SHEET.id||data.sheetName!==VOCABULARY_SHEET.tab)throw Error('同步源不匹配');incoming=parseVocabularyRows(data.rows);}catch(error){return reply({error:error.message||'Invalid data'},400);}
 await ensureSyncTable(env);const stamp=Number(timestamp),lease=await env.DB.prepare("INSERT INTO vocabulary_sheet_sync (id,attempted_at,status) VALUES (1,?,'running') ON CONFLICT(id) DO UPDATE SET attempted_at=excluded.attempted_at,status='running' WHERE attempted_at<? AND (status!='running' OR attempted_at<=?)").bind(stamp,stamp,now-60000).run();
 if(!lease.meta?.changes){const current=await env.DB.prepare('SELECT attempted_at,status,synced_at,summary FROM vocabulary_sheet_sync WHERE id=1').first();if(current?.status==='success'&&current.attempted_at>=stamp)return reply({ok:true,skipped:true});return reply({error:'同步正在进行，请稍后重试'},503);}
 try{for(let attempt=0;attempt<5;attempt++){
  const current=await env.DB.prepare('SELECT attempted_at,status,synced_at,summary FROM vocabulary_sheet_sync WHERE id=1').first();if(current.attempted_at!==stamp)return reply({error:'同步请求已过期，请重新推送'},409);
  const state=await readState(env.DB),workspace=state.workspace||{tasks:[],notes:[],events:[]},merged=mergeSheetVocabulary(workspace.vocabulary||[],incoming),next={...workspace,vocabulary:merged.vocabulary};if(!validWorkspace(next))throw Error('同步数据校验失败，原词库已保留');
  if(merged.added||merged.updated){state.workspace=next;const versions=state.workspaceVersions||{personal:1,work:1};state.workspaceVersions={...versions,personal:(versions.personal||1)+1};if(!await writeState(env.DB,state))continue;}
  const summary={added:merged.added,updated:merged.updated,sourceCount:merged.sourceCount,message:'Apps Script 同步成功'},at=new Date().toISOString();await env.DB.prepare("UPDATE vocabulary_sheet_sync SET status='success',synced_at=?,summary=? WHERE id=1 AND attempted_at=?").bind(at,JSON.stringify(summary),stamp).run();return reply({ok:true,...summary,syncedAt:at});
 }throw Error('云端正在更新，请稍后重试');}catch{await env.DB.prepare("UPDATE vocabulary_sheet_sync SET status='error',summary=? WHERE id=1 AND attempted_at=?").bind(JSON.stringify({message:'同步保存失败，原词库已保留，请在表格重新推送'}),stamp).run();return reply({error:'同步保存失败，原词库已保留，请稍后重试'},503);}
}
