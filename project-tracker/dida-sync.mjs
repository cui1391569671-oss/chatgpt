import {didaWorkProject,openDidaTools} from './dida-connection.mjs';

const zone='Asia/Shanghai';
const origin='https://tracker.managementplatformlee.com';

function taskLink(scope,id){
 const url=new URL('/'+scope,origin);
 url.search=new URLSearchParams({view:'tasks',task:id}).toString();
 return url.href;
}

function remoteDate(value){
 if(!value)return '';
 const timestamp=Date.parse(value);
 return Number.isFinite(timestamp)?new Date(timestamp+8*3600000).toISOString().slice(0,10):value;
}

async function syncProject(db,call,projectId,scope,workspace){
 const result=await call('get_project_with_undone_tasks',{project_id:projectId});
 const data=[result,result?.data,result?.result].find(value=>value?.project?.id===projectId);
 if(!Array.isArray(data?.tasks)||data.tasks.some(task=>!task?.id)){
  throw new Error('滴答清单未返回可识别的目标清单与待办');
 }
 const prefix=taskLink(scope,'');
 const remote=new Map(data.tasks.filter(task=>typeof task.content==='string'&&task.content.startsWith(prefix)&&task.content===taskLink(scope,new URL(task.content).searchParams.get('task'))).map(task=>[task.content,task]));
 const stored=await db.prepare('SELECT source FROM dida_sync_seen WHERE project=? AND scope=?').bind(projectId,scope).all();
 const seen=new Set(stored.results.map(row=>row.source));
 const remember=source=>db.prepare('INSERT OR IGNORE INTO dida_sync_seen (project,scope,source) VALUES (?,?,?)').bind(projectId,scope,source).run();
 const pending=[];
 for(const source of workspace.tasks){
  if(source.done)continue;
  const content=taskLink(scope,source.id),existing=remote.get(content);
  if(!existing&&seen.has(source.id))continue;
  if(existing&&!seen.has(source.id))await remember(source.id);
  const due=source.dueDate||'';
  const title=source.title||'未命名待办';
  if(existing?.title===title&&remoteDate(existing.dueDate)===due)continue;
  const date=due?due+'T00:00:00+08:00':null;
  const dates=date||existing?.dueDate?{startDate:date,dueDate:date,isAllDay:!!date,timeZone:zone}:{};
  const task={projectId,title,content,...dates};
  pending.push([existing?'update_task':'create_task',{client_timezone:zone,...(existing?{task_id:existing.id}:{}),task:existing?{...task,id:existing.id}:task},due,source.id]);
 }
 pending.sort((a,b)=>(a[2]||'9999-99-99').localeCompare(b[2]||'9999-99-99'));
 let failed=0;
 for(const [name,args,,source] of pending.slice(0,8)){
  try{
   const result=await call(name,args);
   const entry=[result,result?.task,result?.data,result?.result].find(task=>task?.projectId===projectId&&typeof task.id==='string');
   if(!entry||(name==='update_task'&&entry.id!==args.task_id))throw new Error('滴答清单未确认待办写入');
   if(name==='create_task')await remember(source);
  }catch{failed++;}
 }
 if(failed)throw new Error('滴答清单有 '+failed+' 个同步操作未确认');
}

export async function syncDida(env,state,fetcher=fetch){
 if(!env.DIDA_API_TOKEN)return;
 const projects=[['work',env.DIDA_PROJECT_ID||didaWorkProject,state.workWorkspace],['personal',env.DIDA_PERSONAL_PROJECT_ID,state.workspace]].filter(([,id,workspace])=>id&&Array.isArray(workspace?.tasks));
 if(!projects.length)return;
 if(projects.length===2&&projects[0][1]===projects[1][1])throw new Error('工作与私人待办需要分别配置滴答清单');
 const db=env.DB;
 await db.prepare('CREATE TABLE IF NOT EXISTS dida_sync_lock (id INTEGER PRIMARY KEY, expires INTEGER NOT NULL)').run();
 const now=Date.now(),expires=now+240000;
 const lease=await db.prepare('INSERT INTO dida_sync_lock (id,expires) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE expires<=?').bind(expires,now).run();
 if(!lease.meta.changes)return;
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS dida_sync_seen (project TEXT NOT NULL, scope TEXT NOT NULL, source TEXT NOT NULL, PRIMARY KEY (project,scope,source))').run();
  const call=await openDidaTools(env.DIDA_API_TOKEN,fetcher);
  const results=await Promise.allSettled(projects.map(([scope,projectId,workspace])=>syncProject(db,call,projectId,scope,workspace)));
  const failure=results.find(result=>result.status==='rejected');
  if(failure)throw failure.reason;
 }finally{
  await db.prepare('DELETE FROM dida_sync_lock WHERE id=1 AND expires=?').bind(expires).run();
 }
}
