import test from 'node:test';import assert from 'node:assert/strict';
import worker,{reminderTasks} from '../worker.mjs';
const s={data:[{project:'项目A',task:'联调',plannedDate:'2026-10-10',status:'暂停',done:false,reason:'',note:''},{project:'项目A',task:'已完成',plannedDate:'2026-10-10',status:'已完成',done:true,reason:'',note:''}],archive:[],priorities:{},workWorkspace:{tasks:[{id:'same',title:'工作',dueDate:'2026-10-10',done:false},{id:'done',title:'完成',dueDate:'2026-10-10',done:true}]},workspace:{tasks:[{id:'same',title:'私人游戏',dueDate:'2026-10-11',done:false,taskType:'game'},{id:'none',title:'未定日期',dueDate:'',done:false}]}};
test('work reminders include projects, personal includes games, without cross-space leakage',()=>{
 assert.deepEqual(reminderTasks(s,'work').map(t=>t.title),['工作','联调']);
 assert.deepEqual(reminderTasks(s,'personal').map(t=>t.title),['私人游戏']);
 assert.equal(reminderTasks(s,'personal')[0].source,'私人游戏待办');
 s.data[0].done=true;assert.equal(reminderTasks(s,'work').length,1);s.data[0].done=false;
});
test('reminder endpoint authenticates and requires an explicit valid scope',async()=>{
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){return {async first(){return {payload:JSON.stringify(s),version:1};}};}}};
 const req=scope=>new Request('https://test.local/api/reminders'+scope,{headers:{Authorization:'Basic '+btoa('u:p')}});
 assert.equal((await worker.fetch(new Request('https://test.local/api/reminders?scope=work'),env)).status,401);
 assert.equal((await worker.fetch(req(''),env)).status,400);assert.equal((await worker.fetch(req('?scope=invalid'),env)).status,400);
 assert.deepEqual((await (await worker.fetch(req('?scope=personal'),env)).json()).tasks.map(t=>t.title),['私人游戏']);
});
