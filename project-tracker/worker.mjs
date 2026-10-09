import {HTML,WORKBENCH} from './pages.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(request,env){
 if(!env.TRACKER_USER || !env.TRACKER_PASSWORD)return false;
 const header=request.headers.get('Authorization')||'';
 if(!header.startsWith('Basic '))return false;
 try{
  const bytes=Uint8Array.from(atob(header.slice(6)),c=>c.charCodeAt(0));
  const text=new TextDecoder().decode(bytes),p=text.indexOf(':');
  return text.slice(0,p)===env.TRACKER_USER && text.slice(p+1)===env.TRACKER_PASSWORD;
 }catch{return false;}
}
async function readState(db){
 const row=await db.prepare('SELECT payload,version FROM tracker_state WHERE id=1').first();
 if(!row)throw new Error('Database not initialized');
 const s=JSON.parse(row.payload);return {...s,projects:s.projects||[...new Set([...s.data.map(x=>x.project),...s.archive.map(x=>x.project)])],deletedProjects:s.deletedProjects||[],version:row.version};
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
 const payload=JSON.stringify({data:s.data,priorities:s.priorities,archive:s.archive,projects:s.projects||[...new Set([...s.data.map(x=>x.project),...s.archive.map(x=>x.project)])],deletedProjects:s.deletedProjects||[],workspace:s.workspace||{tasks:[],notes:[],events:[]}});
 const result=await db.prepare('UPDATE tracker_state SET payload=?, version=version+1 WHERE id=1 AND version=?').bind(payload,s.version).run();
 return result.meta.changes===1;
}

function validWorkspace(w){
 const str=(s,max)=>typeof s==='string'&&s.length<=max;
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)&&date(s.slice(0,10))&&Number(s.slice(11,13))<24&&Number(s.slice(14,16))<60;
 if(!w||typeof w!=='object'||!['tasks','notes','events'].every(k=>Array.isArray(w[k])&&w[k].length<=2000))return false;
 const ids=new Set();
 if(![...w.tasks,...w.notes,...w.events].every(x=>{if(!x||!str(x.id,100)||!x.id||ids.has(x.id)||!str(x.title,200)||!x.title.trim())return false;ids.add(x.id);return true;}))return false;
 return w.tasks.every(t=>typeof t.done==='boolean'&&['high','normal','low'].includes(t.priority)&&str(t.detail,5000)&&(t.dueDate===''||date(t.dueDate)))&&
 w.notes.every(n=>str(n.body,20000)&&str(n.updatedAt,40)&&!Number.isNaN(Date.parse(n.updatedAt)))&&
 w.events.every(e=>time(e.start)&&(e.end===''||time(e.end)&&e.end>=e.start)&&str(e.location,500)&&str(e.detail,5000));
}

export default {
 async fetch(request,env){
  if(!env.TRACKER_USER || !env.TRACKER_PASSWORD)return new Response('请先配置 TRACKER_USER 和 TRACKER_PASSWORD 两个 Secret。',{status:503});
  if(!await authorized(request,env))return new Response('需要登录',{status:401,headers:{'WWW-Authenticate':'Basic realm="Project Tracker", charset="UTF-8"','Cache-Control':'no-store'}});
  const url=new URL(request.url);
  try{
   if((url.pathname==='/' || url.pathname==='/projects') && request.method==='GET')return new Response(url.pathname==='/'?WORKBENCH:HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
   if(url.pathname==='/api/workspace' && request.method==='GET'){const s=await readState(env.DB);return json({workspace:s.workspace||{tasks:[],notes:[],events:[]},version:s.version});}
   if(url.pathname==='/api/workspace' && request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
    const body=await request.text();if(new TextEncoder().encode(body).length>1500000)return json({error:'Too large'},413);
    let input;try{input=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
    if(!Number.isSafeInteger(input?.version)||input.version<1||!validWorkspace(input.workspace))return json({error:'Invalid workspace'},400);
    const s=await readState(env.DB);if(s.version!==input.version)return json({error:'Version conflict'},409);
    s.workspace=input.workspace;if(!await writeState(env.DB,s))return json({error:'Version conflict'},409);
    return json({ok:true,version:s.version+1});
   }
   if(url.pathname==='/api/state' && request.method==='GET')return json(await readState(env.DB));
   if(url.pathname==='/api/state' && request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
    const body=await request.text();if(new TextEncoder().encode(body).length>1500000)return json({error:'Too large'},413);
    let s;try{s=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
    if(!valid(s))return json({error:'Invalid state'},400);
    const current=await readState(env.DB);s.workspace=current.workspace;
    if(!await writeState(env.DB,s))return json({error:'Version conflict'},409);
    return json({ok:true,version:s.version+1});
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
export {valid,validWorkspace,writeState,readState};
