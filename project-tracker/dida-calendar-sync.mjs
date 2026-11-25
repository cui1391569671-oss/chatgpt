import {eventOccurrencesOn} from './event-recurrence.mjs';
import {didaWorkProject,openDidaTools} from './dida-connection.mjs';

const DAY=86400000,BEIJING=28800000,zone='Asia/Shanghai';
const dateAt=ms=>new Date(ms+BEIJING).toISOString().slice(0,10);
const isoLocal=value=>value+'+08:00';
const runTable='CREATE TABLE IF NOT EXISTS dida_calendar_run (id INTEGER PRIMARY KEY, ran_at INTEGER NOT NULL, result TEXT NOT NULL)';
const table=`CREATE TABLE IF NOT EXISTS dida_calendar_mirror (
 source_key TEXT PRIMARY KEY, source TEXT NOT NULL, remote_id TEXT, payload TEXT,
 status TEXT NOT NULL, changed_at INTEGER NOT NULL
)`;

export function didaCalendarTasks(state,external,now=Date.now()){
 const dates=Array.from({length:7},(_,i)=>dateAt(now+i*DAY));
 const tasks=new Map();
 function add(event,source){
  const day=event.start.slice(0,10);
  if(!dates.includes(day)||event.done||!event.title)return;
  const start=isoLocal(event.start),end=event.end?isoLocal(event.end):start;
  if(!Number.isFinite(Date.parse(start))||Date.parse(end)<now&&!event.allDay)return;
  const url=new URL('https://tracker.managementplatformlee.com/work');
  url.search=new URLSearchParams({view:'calendar',event:event.id,date:day,source});
  const isAllDay=!!event.allDay;
  const key=JSON.stringify([source,event.id,event.occurrenceDate||(event.rrule?day:'')]);
  tasks.set(key,{source,task:{
   projectId:didaWorkProject,title:event.title,
   content:(source==='dingtalk'?'钉钉会议':'工作日程')+' · [打开原日程]('+url.href+')',
   startDate:start,dueDate:end,isAllDay,timeZone:zone,
   reminders:[isAllDay?'TRIGGER:PT0S':'TRIGGER;RELATED=START:-PT5M']
  }});
 }
 for(const date of dates){
  for(const event of eventOccurrencesOn(date,state.workWorkspace?.events||[]))add(event,'events');
 }
 if(external.connected&&!external.stale){
  for(const event of external.events||[])add(event,'dingtalk');
 }
 return tasks;
}

export async function didaCalendarStatus(db){
 await db.prepare(table).run();
 const {results}=await db.prepare('SELECT status,COUNT(*) AS count,MAX(changed_at) AS last_change FROM dida_calendar_mirror GROUP BY status').all();
 await db.prepare(runTable).run();
 const run=await db.prepare('SELECT ran_at,result FROM dida_calendar_run WHERE id=1').first();
 return {counts:results,lastRun:run?{at:new Date(run.ran_at).toISOString(),...JSON.parse(run.result)}:null};
}

export async function syncDidaCalendar(env,state,external,now=Date.now(),connect=openDidaTools){
 if(!env.DIDA_API_TOKEN)return {configured:false};
 const db=env.DB;
 await db.prepare(table).run();
 await db.prepare('CREATE TABLE IF NOT EXISTS dida_calendar_lease (id INTEGER PRIMARY KEY, holder TEXT NOT NULL, expires INTEGER NOT NULL)').run();
 const holder=crypto.randomUUID();
 const lock=await db.prepare('INSERT INTO dida_calendar_lease VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET holder=excluded.holder,expires=excluded.expires WHERE expires<=?').bind(holder,now+240000,now).run();
 if(!lock.meta.changes)return {busy:true};
 try{
  const result=await reconcileCalendar(db,env,state,external,now,connect);
  await db.prepare(runTable).run();
  await db.prepare('INSERT OR REPLACE INTO dida_calendar_run VALUES (1,?,?)').bind(now,JSON.stringify(result)).run();
  return result;
 }
 finally{await db.prepare('DELETE FROM dida_calendar_lease WHERE id=1 AND holder=?').bind(holder).run();}
}

async function reconcileCalendar(db,env,state,external,now,connect){
 await db.prepare("UPDATE dida_calendar_mirror SET status='uncertain' WHERE status='creating'").run();
 const {results}=await db.prepare('SELECT * FROM dida_calendar_mirror').all();
 const existing=new Map(results.map(row=>[row.source_key,row]));
 const desired=didaCalendarTasks(state,external,now);
 const jobs=[];
 for(const [key,item] of desired){
  const row=existing.get(key),payload=JSON.stringify(item.task);
  if(!row||row.status==='closed')jobs.push({key,...item,payload,row,type:'create'});
  else if(row.status==='active'&&row.payload!==payload)jobs.push({key,...item,payload,row,type:'update'});
 }
 for(const row of existing.values()){
  if(row.status!=='active'||desired.has(row.source_key))continue;
  if(row.source==='dingtalk'&&(!external.connected||external.stale))continue;
  jobs.push({key:row.source_key,row,type:'close'});
 }
 const totals={eligible:desired.size,created:0,updated:0,closed:0,failed:0};
 if(!jobs.length)return totals;
 const call=await connect(env.DIDA_API_TOKEN);
 for(const job of jobs.slice(0,12)){
  const {key,row}=job;
  if(job.type==='create'){
   const claim=await db.prepare("INSERT INTO dida_calendar_mirror VALUES (?,?,NULL,?,'creating',?) ON CONFLICT(source_key) DO UPDATE SET remote_id=NULL,payload=excluded.payload,status='creating',changed_at=excluded.changed_at WHERE status='closed'").bind(key,job.source,job.payload,now).run();
   if(!claim.meta.changes)continue;
   try{
    const data=await call('create_task',{client_timezone:zone,task:job.task});
    const entry=[data,data?.task,data?.data,data?.result].find(x=>x?.projectId===didaWorkProject&&typeof x.id==='string');
    if(!entry)throw new Error('Dida create not confirmed');
    await db.prepare("UPDATE dida_calendar_mirror SET remote_id=?,status='active' WHERE source_key=?").bind(entry.id,key).run();
    totals.created++;
   }catch{
    // An ambiguous create may have succeeded upstream. Never create the same copy again automatically.
    await db.prepare("UPDATE dida_calendar_mirror SET status='uncertain' WHERE source_key=?").bind(key).run();
    totals.failed++;
   }
   continue;
  }
  try{
   if(job.type==='update'){
    await call('update_task',{task_id:row.remote_id,client_timezone:zone,task:{...job.task,id:row.remote_id}});
    await db.prepare('UPDATE dida_calendar_mirror SET payload=?,changed_at=? WHERE source_key=? AND remote_id=?').bind(job.payload,now,key,row.remote_id).run();
    totals.updated++;
   }else{
    await call('complete_task',{task_id:row.remote_id,project_id:didaWorkProject});
    await db.prepare("UPDATE dida_calendar_mirror SET status='closed',changed_at=? WHERE source_key=? AND remote_id=?").bind(now,key,row.remote_id).run();
    totals.closed++;
   }
  }catch{totals.failed++;}
 }
 return totals;
}
