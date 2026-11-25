import test from 'node:test';
import assert from 'node:assert/strict';

test('Dida scheduled sync updates only mapped tasks and sends dated tasks first',async()=>{
 const {syncDida}=await import('../dida-sync.mjs');
 let lock=false;
 const seen=new Set();
 const db={prepare(sql){let bindings;return {bind(...values){bindings=values;return this;},async all(){return {results:[...seen].map(source=>({source}))};},async run(){
  if(sql.startsWith('INSERT OR IGNORE'))seen.add(bindings[2]);
  if(sql.startsWith('INSERT INTO dida_sync_lock')){if(lock)return {meta:{changes:0}};lock=true;}
  if(sql.startsWith('DELETE'))lock=false;
  return {meta:{changes:1}};
 }};}};
 const link=id=>'https://tracker.managementplatformlee.com/work?view=tasks&task='+id;
 const remote=[
  {id:'old',content:link('edit'),title:'原名称',dueDate:'2026-11-27T00:00:00+0800'},
  {id:'done',content:link('done')},
  {id:'deleted',content:link('deleted')},
  {id:'elsewhere',content:'手动创建'}
 ];
 const state={workWorkspace:{tasks:[
  {id:'later',title:'后到期',dueDate:'2026-11-28'},
  {id:'none',title:'无日期'},
  {id:'edit',title:'改日期',dueDate:'2026-11-26'},
  {id:'done',done:true}
 ]},workspace:{tasks:[{id:'private',title:'私人待办'}]}};
 const calls=[];
 let lostReply=true;
 const fetcher=async(_url,{body})=>{
  const {id,method,params}=JSON.parse(body);
  if(method==='initialize')return Response.json({id,result:{}});
  if(method==='notifications/initialized')return new Response(null,{status:202});
  calls.push(params);
  if(params.name==='get_project_with_undone_tasks'){assert.equal(params.arguments.project_id,'work-list');return Response.json({id,result:{structuredContent:{project:{id:'work-list'},tasks:remote}}});}
  const task=params.arguments.task;
  if(params.name==='update_task')Object.assign(remote.find(item=>item.id===task.id),task);
  if(params.name==='create_task'){
   remote.push({id:task.title,...task});
   if(lostReply){lostReply=false;throw new Error('reply lost');}
  }
  return Response.json({id,result:{structuredContent:{task:{...task,id:task.id||task.title}}}});
 };
 const env={DB:db,DIDA_API_TOKEN:'test',DIDA_PROJECT_ID:'work-list'};
 const first=await Promise.allSettled([syncDida(env,state,fetcher),syncDida(env,state,fetcher)]);
 assert.equal(first.filter(outcome=>outcome.status==='rejected').length,1);
 assert.deepEqual(calls.map(call=>call.name),['get_project_with_undone_tasks','update_task','create_task','create_task']);
 assert.deepEqual(calls[1].arguments.task,{id:'old',projectId:'work-list',title:'改日期',content:link('edit'),isAllDay:true,timeZone:'Asia/Shanghai',startDate:'2026-11-26T00:00:00+08:00',dueDate:'2026-11-26T00:00:00+08:00'});
 assert.equal(calls[3].arguments.task.title,'无日期');
 assert.equal(lock,false);
 calls.length=0;
 await syncDida(env,state,fetcher);
 assert.deepEqual(calls.map(call=>call.name),['get_project_with_undone_tasks']);
 remote.splice(remote.findIndex(task=>task.id==='后到期'),1);
 calls.length=0;
 await syncDida(env,state,fetcher);
 assert.deepEqual(calls.map(call=>call.name),['get_project_with_undone_tasks']);
});
