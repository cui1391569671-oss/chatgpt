import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {didaCalendarTasks,syncDidaCalendar} from '../dida-calendar-sync.mjs';

function database(){
 const sqlite=new DatabaseSync(':memory:');
 return {prepare(sql){
  const stmt=sqlite.prepare(sql);
  const wrapper=(args=[])=>({run:()=>({meta:stmt.run(...args)}),all:()=>({results:stmt.all(...args)}),bind:(...args)=>wrapper(args)});
  return wrapper();
 }};
}
const now=Date.parse('2026-11-25T10:00:00+08:00');
const event=(id,start='2026-11-26T11:00',end='2026-11-26T12:00')=>({id,title:id,start,end,detail:'private notes'});
test('Calendar scope keeps work events and fresh DingTalk meetings only',()=>{
 const state={workspace:{events:[event('personal')]},workWorkspace:{events:[event('meeting'),event('old','2026-11-24T11:00','2026-11-24T12:00'),{...event('done'),done:true}],tasks:[{id:'task'}]}};
 const external={connected:true,events:[event('dingtalk')]};
 const items=[...didaCalendarTasks(state,external,now).values()];
 assert.deepEqual(items.map(x=>x.task.title),['meeting','dingtalk']);
 assert.deepEqual(items[0].task.reminders,['TRIGGER;RELATED=START:-PT5M']);
 assert.match(items[1].task.content,/source=dingtalk/);
 assert.ok(!JSON.stringify(items).includes('private notes'));
 assert.equal(didaCalendarTasks(state,{...external,stale:true},now).size,1);
});
test('Calendar mirror creates once, updates the same ID, and closes it when removed',async()=>{
 const env={DB:database(),DIDA_API_TOKEN:'synthetic'};
 const state={workWorkspace:{events:[event('meeting')]}},external={connected:false},calls=[];
 const connect=async()=>async(name,args)=>{
  calls.push([name,args]);
  return {id:'remote-id',projectId:args.task?.projectId};
 };
 await Promise.all([syncDidaCalendar(env,state,external,now,connect),syncDidaCalendar(env,state,external,now,connect)]);
 await syncDidaCalendar(env,state,external,now,connect);
 assert.deepEqual(calls.map(x=>x[0]),['create_task']);
 state.workWorkspace.events[0].title='renamed';
 await syncDidaCalendar(env,state,external,now,connect);
 assert.equal(calls[1][1].task_id,'remote-id');
 state.workWorkspace.events=[];
 await syncDidaCalendar(env,state,external,now,connect);
 assert.deepEqual(calls.map(x=>x[0]),['create_task','update_task','complete_task']);
});
test('An ambiguous create is never automatically repeated',async()=>{
 const env={DB:database(),DIDA_API_TOKEN:'synthetic'};
 let calls=0;
 const connect=async()=>async()=>{calls++;throw new Error('timeout');};
 const state={workWorkspace:{events:[event('meeting')]}};
 await syncDidaCalendar(env,state,{},now,connect);
 await syncDidaCalendar(env,state,{},now,connect);
 assert.equal(calls,1);
});
