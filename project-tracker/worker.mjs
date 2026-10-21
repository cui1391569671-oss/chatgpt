import {staticAssetResponse} from './static-assets.mjs';
import {validGameTaskReference} from './game-task-links.mjs';
import {projectCalendarItems} from './calendar-sources.mjs';
import {todayTasks} from './today-tasks.mjs';
import {validEventImages,calendarImagesRoute} from './calendar-images.mjs';
import {validRequirements} from './requirements.mjs';
import {vocabularySyncStatus,vocabularyPushRoute} from './vocabulary-sheet.mjs';
import {FITNESS_MEDIA} from './fitness-media.mjs';
import {validFitnessSession,validFitnessProfile} from './fitness.mjs';
import {validPracticeSession} from './word-practice.mjs';
import {validAnnualPlans} from './annual-plans.mjs';
import {TASKS_JS,TASKS_CSS,TASKS_LICENSE} from './tasks-assets.mjs';
import {ILAMY_JS,ILAMY_CSS,ILAMY_LICENSE} from './ilamy-assets.mjs';
import {validEventRecurrence} from './event-recurrence.mjs';
import {projectCoreInfoRoute} from './project-core-info.mjs';
import {projectCorePushRoute} from './project-core-sync.mjs';
import {personalVaultRoute} from './personal-vault.mjs';
import {validMediaTracking} from './media-tracking.mjs';
import {mediaSourcesRoute} from './media-sources.mjs';
import {getSteamReview} from './steam-reviews.mjs';
import {WORKSPACE_COLLECTIONS,PROJECT_COLLECTIONS,ensureProjectIds,applyRecordChanges,RecordConflict} from './cloud-records.mjs';
import {sessionValid,authRoute,loginResponse} from './auth.mjs';
import {findGameCover,findMediaCover,findAnimeCover,findMovieCovers} from './game-covers.mjs';
import {getGameReleases} from './game-releases.mjs';
import {HTML,WORKBENCH,FAVICON} from './pages.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(request,env){
 if(!env.TRACKER_USER || !env.TRACKER_PASSWORD)return false;
 const header=request.headers.get('Authorization')||'';
 if(!header.startsWith('Basic '))return sessionValid(request,env);
 try{
  const bytes=Uint8Array.from(atob(header.slice(6)),c=>c.charCodeAt(0));
  const text=new TextDecoder().decode(bytes),p=text.indexOf(':');
  return text.slice(0,p)===env.TRACKER_USER && text.slice(p+1)===env.TRACKER_PASSWORD;
 }catch{return false;}
}
function normalizedWorkspaceVersions(value){return Object.fromEntries(['personal','work'].map(scope=>[scope,Number.isSafeInteger(value?.[scope])&&value[scope]>0?value[scope]:1]));}
async function readState(db){
 const row=await db.prepare('SELECT payload,version FROM tracker_state WHERE id=1').first();
 if(!row)throw new Error('Database not initialized');
 const s=ensureProjectIds(JSON.parse(row.payload));return {...s,projects:s.projects||[...new Set([...s.data.map(x=>x.project),...s.archive.map(x=>x.project)])],deletedProjects:s.deletedProjects||[],version:row.version};
}
function valid(s){
 return s && (!s.projects || (Array.isArray(s.projects) && s.projects.length<=1000 && s.projects.every(x=>typeof x==='string' && x.trim() && x.length<=120) && new Set(s.projects).size===s.projects.length)) && (!s.deletedProjects || (Array.isArray(s.deletedProjects) && s.deletedProjects.length<=1000 && s.deletedProjects.every(p=>p && typeof p.name==='string' && Array.isArray(p.data) && Array.isArray(p.archive)))) && Number.isSafeInteger(s.version) && s.version>0 &&
 Array.isArray(s.data) && Array.isArray(s.archive) &&
 s.data.length+s.archive.length<=10000 &&
 s.priorities && typeof s.priorities==='object' && !Array.isArray(s.priorities) &&
 Object.values(s.priorities).every(x=>['urgent','high','medium','low',''].includes(x)) &&
 [...s.data,...s.archive].every(x=>x && typeof x==='object' &&
 ['project','task','reason','plannedDate','note','status'].every(k=>typeof x[k]==='string') &&
 x.project.trim() && typeof x.done==='boolean' &&
 ['进行中','暂停','已完成'].includes(x.status) && x.done===(x.status==='已完成') &&
 (!x.plannedDate || /^\d{4}-\d{2}-\d{2}$/.test(x.plannedDate)));
}
async function writeState(db,s){
 const payload=JSON.stringify({data:s.data,priorities:s.priorities,archive:s.archive,projects:s.projects||[...new Set([...s.data.map(x=>x.project),...s.archive.map(x=>x.project)])],deletedProjects:s.deletedProjects||[],workspace:s.workspace||{tasks:[],notes:[],events:[]},workWorkspace:s.workWorkspace||{tasks:[],notes:[],events:[]},workspaceVersions:s.workspaceVersions||{personal:1,work:1}});
 const result=await db.prepare('UPDATE tracker_state SET payload=?, version=version+1 WHERE id=1 AND version=?').bind(payload,s.version).run();
 // D1 reports SQLite total changes, including trigger side effects.
 // The WHERE clause already limits the matched state row to id=1.
 return Number.isInteger(result.meta?.changes)&&result.meta.changes>0;
}



function reminderTasks(s,requestedScope){const tasks=[];for(const [scope,key] of [['work','workWorkspace'],['personal','workspace']])for(const t of s[key]?.tasks||[])if(scope===requestedScope&&!t.done&&t.dueDate)tasks.push({id:scope+':'+t.id,recordId:t.id,scope,title:t.title,dueDate:t.dueDate,done:false,source:scope==='work'?'工作待办':t.taskType==='game'?'私人游戏待办':'私人待办'});if(requestedScope==='work')for(const [index,x] of projectCalendarItems(s).entries())tasks.push({id:'project:'+index,scope:'projects',title:x.title,project:x.project,dueDate:x.date,done:false,source:'项目问题 · '+x.project});return tasks;}

function sameProjectState(a,b){const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;const fields=v=>({data:v.data,archive:v.archive,priorities:v.priorities,projects:v.projects||[],deletedProjects:v.deletedProjects||[]});return JSON.stringify(normalize(fields(a)))===JSON.stringify(normalize(fields(b)));}

function validWorkspace(w){
 const str=(s,max)=>typeof s==='string'&&s.length<=max;
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)&&date(s.slice(0,10))&&Number(s.slice(11,13))<24&&Number(s.slice(14,16))<60;
 if(!w||typeof w!=='object'||!['tasks','notes','events'].every(k=>Array.isArray(w[k])&&w[k].length<=2000))return false;
 if(w.events.some(event=>!event||!validEventImages(event.images)))return false;
 if(w.requirements!==undefined&&!validRequirements(w.requirements))return false;
 if(w.fitnessProfiles!==undefined&&(!Array.isArray(w.fitnessProfiles)||w.fitnessProfiles.length>1||!w.fitnessProfiles.every(validFitnessProfile)))return false;
 if(w.fitnessSessions!==undefined){if(!Array.isArray(w.fitnessSessions)||w.fitnessSessions.length>10000)return false;const ids=new Set();if(!w.fitnessSessions.every(s=>validFitnessSession(s)&&!ids.has(s.id)&&(ids.add(s.id),true)))return false;}
 if(w.annualPlans!==undefined&&!validAnnualPlans(w.annualPlans))return false;
 if(w.wordPracticeSessions!==undefined){if(!Array.isArray(w.wordPracticeSessions)||w.wordPracticeSessions.length>10000)return false;const ids=new Set();if(!w.wordPracticeSessions.every(s=>validPracticeSession(s)&&!ids.has(s.id)&&(ids.add(s.id),true)))return false;}
 if(w.dailyRoutines!==undefined){if(!Array.isArray(w.dailyRoutines)||w.dailyRoutines.length>500)return false;const seen=new Set();if(!w.dailyRoutines.every(x=>x&&str(x.id,100)&&x.id&&!seen.has(x.id)&&(seen.add(x.id),true)&&str(x.title,200)&&x.title.trim()&&str(x.detail,5000)&&(x.completedOn===''||date(x.completedOn))))return false;}
 if(w.expenses!==undefined){if(!Array.isArray(w.expenses)||w.expenses.length>5000)return false;const seen=new Set();if(!w.expenses.every(x=>x&&str(x.id,100)&&x.id&&!seen.has(x.id)&&(seen.add(x.id),true)&&str(x.title,200)&&x.title.trim()&&str(x.project,120)&&x.project.trim()&&str(x.category,100)&&x.category.trim()&&str(x.detail,5000)&&date(x.date)&&Number.isSafeInteger(x.amountCents)&&x.amountCents>0&&x.amountCents<=10000000000&&['CNY','USD','EUR','JPY','KRW','THB','MYR','TWD'].includes(x.currency)&&['pending','submitted','paid'].includes(x.status)))return false;}
 if(w.maintenance!==undefined){if(!Array.isArray(w.maintenance)||w.maintenance.length>2000)return false;const seen=new Set();if(!w.maintenance.every(x=>x&&str(x.id,100)&&x.id&&!seen.has(x.id)&&(seen.add(x.id),true)&&str(x.title,200)&&x.title.trim()&&str(x.location,500)&&str(x.detail,5000)&&date(x.nextDate)&&(x.lastDate===''||date(x.lastDate)&&x.lastDate<=x.nextDate)))return false;}
 if(w.driveLinks!==undefined){
  if(!Array.isArray(w.driveLinks)||w.driveLinks.length>500)return false;
  const seen=new Set();if(!w.driveLinks.every(x=>{if(!x||!str(x.id,100)||!x.id||seen.has(x.id)||!str(x.title,200)||!x.title.trim()||!str(x.description,1000)||!str(x.url,2000))return false;seen.add(x.id);try{const u=new URL(x.url);return u.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port;}catch{return false;}}))return false;
 }
 if(w.completedGames!==undefined){
  if(!Array.isArray(w.completedGames)||w.completedGames.length>2000)return false;
  if(w.completedGames.some(g=>g?.mediaType!==undefined&&!['game','movie','tv','anime'].includes(g.mediaType)))return false;
  const seen=new Set();if(!w.completedGames.every(g=>{if(!g||!str(g.id,100)||!g.id||seen.has(g.id)||!str(g.title,200)||!g.title.trim()||!str(g.platform,100)||(g.coverUrl!==undefined&&(!str(g.coverUrl,2000)||g.coverUrl!==''&&!/^https:\/\/[^\s]+$/.test(g.coverUrl)))||!validMediaTracking(g)||!str(g.detail,5000)||(g.rating!==null&&(!Number.isInteger(g.rating)||g.rating<1||g.rating>10)))return false;seen.add(g.id);return true;}))return false;
 }
 if(w.vocabulary!==undefined){
  if(!Array.isArray(w.vocabulary)||w.vocabulary.length>5000)return false;
  const wordIds=new Set();const fields={lesson:100,word:200,phonetic:500,partOfSpeech:100,meaning:2000,example:5000,mastery:100,firstLearned:40,lastReviewed:40,reviewCount:20,note:5000};
  if(!w.vocabulary.every(v=>{if(!v||!str(v.id,100)||!v.id||wordIds.has(v.id)||!str(v.word,200)||!v.word.trim()||!Object.entries(fields).every(([key,max])=>v[key]===undefined||str(v[key],max)))return false;wordIds.add(v.id);return true;}))return false;
 }
 if(w.wardrobe!==undefined){
  if(!Array.isArray(w.wardrobe)||w.wardrobe.length>1000)return false;
  const seen=new Set();if(!w.wardrobe.every(c=>c&&str(c.id,100)&&c.id&&!seen.has(c.id)&&(seen.add(c.id),true)&&str(c.name,100)&&c.name.trim()&&['top','bottom','dress','outer','shoes','accessory'].includes(c.category)&&Array.isArray(c.seasons)&&c.seasons.length>0&&c.seasons.every(x=>['spring','summer','autumn','winter'].includes(x))&&str(c.color,50)&&/^\/api\/wardrobe-images\/[a-f0-9-]{36}$/.test(c.image)))return false;
 }
 if(w.outfits!==undefined){if(!Array.isArray(w.outfits)||w.outfits.length>1000||!w.outfits.every(o=>o&&str(o.id,100)&&o.id&&str(o.name,100)&&o.name.trim()&&['spring','summer','autumn','winter'].includes(o.season)&&Array.isArray(o.items)&&o.items.length>0&&o.items.length<=12&&o.items.every(id=>w.wardrobe?.some(c=>c.id===id))))return false;}
 const ids=new Set();
 if(![...w.tasks,...w.notes,...w.events].every(x=>{if(!x||!str(x.id,100)||!x.id||ids.has(x.id)||!str(x.title,200)||!x.title.trim())return false;ids.add(x.id);return true;}))return false;
 return w.tasks.every(t=>validGameTaskReference(t)&&(t.taskType===undefined||['task','game'].includes(t.taskType))&&(t.gamePlatform===undefined||str(t.gamePlatform,100))&&typeof t.done==='boolean'&&['high','normal','low'].includes(t.priority)&&str(t.detail,5000)&&(t.dueDate===''||date(t.dueDate)))&&
 w.notes.every(n=>str(n.body,20000)&&str(n.updatedAt,40)&&!Number.isNaN(Date.parse(n.updatedAt)))&&
 w.events.every(e=>validEventRecurrence(e)&&(e.done===undefined||typeof e.done==='boolean')&&time(e.start)&&(e.end===''||time(e.end)&&e.end>=e.start)&&str(e.location,500)&&str(e.detail,5000));
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/robots.txt'&&request.method==='GET')return new Response('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  if(url.pathname==='/sitemap.xml'&&request.method==='GET')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  if(url.pathname==='/'&&['GET','HEAD'].includes(request.method))return new Response(null,{status:302,headers:{Location:'/work','Cache-Control':'no-store'}});
  if(url.pathname==='/favicon.svg'&&request.method==='GET')return new Response(FAVICON,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
  if(url.pathname==='/api/project-core-information/push')return await projectCorePushRoute(request,env);
  if(url.pathname==='/api/vocabulary/push')return await vocabularyPushRoute(request,env,{readState,writeState,validWorkspace});
  if(!env.TRACKER_USER || !env.TRACKER_PASSWORD)return new Response('请先配置 TRACKER_USER 和 TRACKER_PASSWORD 两个 Secret。',{status:503});
  const auth=await authRoute(request,env);if(auth)return auth;
  if(!await authorized(request,env)){
   if(['/', '/work', '/personal', '/projects'].includes(url.pathname)&&request.method==='GET')return loginResponse(url.pathname,'',401);
   return json({error:'需要登录'},401);
  }
  try{
   if(url.pathname.startsWith('/assets/fitness/')){
    if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
    const asset=FITNESS_MEDIA[url.pathname.slice('/assets/fitness/'.length)];
    if(!asset)return json({error:'Not found'},404);
    return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset.type,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
   }
   if(['/assets/tasks.js','/assets/tasks.css','/assets/tasks.LICENSE.txt'].includes(url.pathname)&&['GET','HEAD'].includes(request.method))return staticAssetResponse(request,url.pathname,url.pathname.endsWith('.js')?TASKS_JS:url.pathname.endsWith('.css')?TASKS_CSS:TASKS_LICENSE);
   if(['/assets/ilamy-3.2.1.js','/assets/ilamy-3.2.1.css','/assets/calendar.js.LEGAL.txt'].includes(url.pathname)&&['GET','HEAD'].includes(request.method))return staticAssetResponse(request,url.pathname,url.pathname.endsWith('.js')?ILAMY_JS:url.pathname.endsWith('.css')?ILAMY_CSS:ILAMY_LICENSE);
   if(url.pathname==='/api/vocabulary/sync'){
    if(request.method==='GET')return json(await vocabularySyncStatus(env));
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    return json({error:'请在 Google 表格的“工作台词库同步”菜单中推送更新'},409);
   }
   if(url.pathname==='/api/project-core-information')return await projectCoreInfoRoute(request,env);
   if(url.pathname==='/api/account/vault')return await personalVaultRoute(request,env);
   if(['/api/media/search','/api/media/details'].includes(url.pathname))return await mediaSourcesRoute(request,env);
   if(url.pathname==='/api/game-releases'&&request.method==='GET'){
    const mode=url.searchParams.get('mode')||'upcoming';
    if(!['upcoming','released'].includes(mode))return json({error:'Invalid mode'},400);
    try{return json(await getGameReleases(mode));}catch{return json({error:'Steam 游戏榜暂时无法读取，请稍后重试。'},502);}
   }
   if(['/', '/work', '/personal', '/projects'].includes(url.pathname) && request.method==='GET'){
    const embedded=url.pathname==='/projects'&&url.searchParams.get('embedded')==='1';
    const projectHtml=embedded?HTML.replace('</head>','<style>.header,.footer{display:none}.container{padding:8px;max-width:none}</style></head>'):HTML;
    return new Response(url.pathname==='/projects'?projectHtml:WORKBENCH,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':embedded?'SAMEORIGIN':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'}});
   }
   if(url.pathname.startsWith('/api/calendar-images/'))return await calendarImagesRoute(request,env);
   if(url.pathname==='/api/wardrobe-images'&&request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(request.headers.get('Content-Type')!=='image/jpeg')return json({error:'JPEG required'},415);
    const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>180000||bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return json({error:'Invalid image'},400);
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS wardrobe_images (id TEXT PRIMARY KEY, bytes BLOB NOT NULL)').run();
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO wardrobe_images (id,bytes) VALUES (?,?)').bind(id,Array.from(bytes)).run();return json({image:'/api/wardrobe-images/'+id});
   }
   if(/^\/api\/wardrobe-images\/[a-f0-9-]{36}$/.test(url.pathname)&&request.method==='GET'){
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS wardrobe_images (id TEXT PRIMARY KEY, bytes BLOB NOT NULL)').run();
    const item=await env.DB.prepare('SELECT bytes FROM wardrobe_images WHERE id=?').bind(url.pathname.split('/').at(-1)).first();if(!item)return new Response('Not found',{status:404});
    return new Response(new Uint8Array(item.bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
   }
   if(url.pathname==='/api/steam-review'&&request.method==='GET'){const appid=url.searchParams.get('appid'),title=(url.searchParams.get('title')||'').trim();if(appid&&!/^\d{1,10}$/.test(appid)||!appid&&(!title||title.length>200))return json({error:'Invalid game'},400);return json(await getSteamReview({appid,title}));}
   if(url.pathname==='/api/game-cover'&&request.method==='GET'){
    const title=(url.searchParams.get('title')||'').trim();if(!title||title.length>200)return json({error:'Invalid game title'},400);
    return json(await (url.searchParams.get('type')==='anime'?findAnimeCover(title):url.searchParams.get('type')==='movie'?findMovieCovers(title):url.searchParams.get('type')==='media'?findMediaCover(title):findGameCover(title)));
   }
   if(url.pathname==='/api/state/archive'&&request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
    const text=await request.text();if(new TextEncoder().encode(text).length>1500000)return json({error:'Too large'},413);
    let input;try{input=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
    if(!Array.isArray(input?.ids)||!input.ids.length||input.ids.length>10000||input.ids.some(id=>typeof id!=='string'||!id||id.length>200)||new Set(input.ids).size!==input.ids.length)return json({error:'Invalid records'},400);
    const ids=new Set(input.ids);
    for(let attempt=0;attempt<5;attempt++){
     const current=await readState(env.DB),selected=current.data.filter(x=>ids.has(x.id));
     if(selected.some(x=>!x.done))return json({error:'部分问题已恢复为未完成，请查看最新状态后重试'},409);
     const archivedIds=new Set(current.archive.map(x=>x.id));
     const additions=selected.filter(x=>!archivedIds.has(x.id));
     current.archive.push(...additions.map(x=>({...x,archivedAt:new Date().toISOString()})));
     current.data=current.data.filter(x=>!ids.has(x.id));
     if(selected.length&&!await writeState(env.DB,current))continue;
     const {workspace,workWorkspace,workspaceVersions,...tracker}=current;
     return json({ok:true,count:additions.length,state:{...tracker,version:current.version+(selected.length?1:0)}});
    }
    return json({error:'云端正在更新，请重试'},503);
   }
   if(['/api/workspace/patch','/api/state/patch'].includes(url.pathname)&&request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
    const text=await request.text();if(new TextEncoder().encode(text).length>1500000)return json({error:'Too large'},413);
    let input;try{input=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
    const workspace=url.pathname==='/api/workspace/patch',scope=url.searchParams.get('scope');if(workspace&&!['work','personal'].includes(scope))return json({error:'Invalid scope'},400);
    if(workspace&&scope==='work'&&input?.operations?.some(op=>['annualPlans','wordPracticeSessions','fitnessSessions','fitnessProfiles'].includes(op.collection)))return json({error:'此记录仅限私人空间'},400);
    const key=scope==='work'?'workWorkspace':'workspace';
    for(let attempt=0;attempt<5;attempt++){
     const current=await readState(env.DB);let updated;
     try{updated=applyRecordChanges(workspace?current[key]||{tasks:[],notes:[],events:[]}:current,input?.operations,workspace?WORKSPACE_COLLECTIONS:PROJECT_COLLECTIONS);}catch(e){return json({error:e.message},e instanceof RecordConflict?409:400);}
     if(workspace){if(!validWorkspace(updated)||scope==='work'&&updated.tasks.some(t=>!!t.mediaRecordId)||updated.events.some(event=>!validEventImages(event.images,scope)))return json({error:'Invalid workspace'},400);current[key]=updated;const versions=normalizedWorkspaceVersions(current.workspaceVersions);versions[scope]++;current.workspaceVersions=versions;}
     else{if(!valid(updated))return json({error:'Invalid state'},400);Object.assign(current,updated);}
     if(await writeState(env.DB,current)){
      if(workspace)return json({ok:true,workspace:updated,version:current.workspaceVersions[scope]});
      const {workspace:personalData,workWorkspace,workspaceVersions,...tracker}=current;return json({ok:true,state:{...tracker,version:current.version+1}});
     }
    }
    return json({error:'云端正在更新，请重试'},503);
   }
   if(url.pathname==='/api/workspace'){
    const scope=url.searchParams.get('scope')||'personal';
    if(!['personal','work'].includes(scope))return json({error:'Invalid scope'},400);
    const key=scope==='work'?'workWorkspace':'workspace';
    if(request.method==='GET'){const s=await readState(env.DB);return json({workspace:s[key]||{tasks:[],notes:[],events:[]},version:normalizedWorkspaceVersions(s.workspaceVersions)[scope]});}
    if(request.method==='POST'){
     if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
     if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
     const body=await request.text();if(new TextEncoder().encode(body).length>1500000)return json({error:'Too large'},413);
     let input;try{input=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
    if(scope==='work'&&(input?.workspace?.annualPlans!==undefined||input?.workspace?.wordPracticeSessions!==undefined||input?.workspace?.fitnessSessions!==undefined||input?.workspace?.fitnessProfiles!==undefined))return json({error:'学习记录和年度计划仅限私人空间'},400);
     if(!Number.isSafeInteger(input?.version)||input.version<1||!validWorkspace(input.workspace)||scope==='work'&&input.workspace.tasks.some(t=>!!t.mediaRecordId)||input.workspace.events.some(event=>!validEventImages(event.images,scope)))return json({error:'Invalid workspace'},400);
     for(let attempt=0;attempt<3;attempt++){
      const s=await readState(env.DB),versions=normalizedWorkspaceVersions(s.workspaceVersions);
      if(versions[scope]!==input.version)return json({error:'Version conflict'},409);
      s[key]=input.workspace;versions[scope]++;s.workspaceVersions=versions;
      if(await writeState(env.DB,s))return json({ok:true,version:versions[scope]});
     }
     return json({error:'Version conflict'},409);
    }
   }
   if(url.pathname==='/api/reminders'&&request.method==='GET'){const scope=url.searchParams.get('scope');if(!['work','personal'].includes(scope))return json({error:'Invalid scope'},400);return json({tasks:reminderTasks(await readState(env.DB),scope)});}
   if(url.pathname==='/api/today-tasks'&&request.method==='GET'){const scope=url.searchParams.get('scope');if(!['work','personal'].includes(scope))return json({error:'Invalid scope'},400);return json(todayTasks(await readState(env.DB),scope));}
   if(url.pathname==='/api/project-calendar'&&request.method==='GET'){const s=await readState(env.DB),today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),open=s.data.filter(x=>!x.done);return json({items:projectCalendarItems(s),summary:{openIssues:open.length,overdueIssues:open.filter(x=>x.plannedDate&&x.plannedDate<today).length,activeProjects:new Set(open.map(x=>x.project)).size}});}
   if(url.pathname==='/api/state' && request.method==='GET'){
    const {workspace,workWorkspace,workspaceVersions,...tracker}=await readState(env.DB);
    return json(tracker);
   }
   if(url.pathname==='/api/state' && request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
    const body=await request.text();if(new TextEncoder().encode(body).length>1500000)return json({error:'Too large'},413);
    let s;try{s=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
    if(!valid(s))return json({error:'Invalid state'},400);
    if(s.base!==undefined&&!valid({...s.base,version:1}))return json({error:'Invalid base'},400);
    for(let attempt=0;attempt<3;attempt++){
     const current=await readState(env.DB);
     if(current.version!==s.version&&(!s.base||!sameProjectState(s.base,current)))return json({error:'Project version conflict'},409);
     const candidate={...s,version:current.version,workspace:current.workspace,workWorkspace:current.workWorkspace,workspaceVersions:current.workspaceVersions};
     if(await writeState(env.DB,candidate))return json({ok:true,version:current.version+1});
    }
    return json({error:'Version conflict'},409);
   }
   return json({error:'Not found'},404);
  }catch(e){console.error(e);return json({error:'服务暂不可用，请检查 DB 绑定及初始化 SQL'},500);}
 },
 async scheduled(event,env,ctx){
  ctx.waitUntil((async()=>{
   for(let attempt=0;attempt<3;attempt++){
    const s=await readState(env.DB),done=s.data.filter(x=>x.done);
    if(!done.length)return;
    s.archive.push(...done.map(x=>({...x,archivedAt:new Date().toISOString()})));
    s.data=s.data.filter(x=>!x.done);
    if(await writeState(env.DB,s))return;
   }
   throw new Error('Archive conflict: retry at next scheduled run');
  })());
 }
};
export {sameProjectState,reminderTasks,projectCalendarItems,valid,validWorkspace,writeState,readState};
