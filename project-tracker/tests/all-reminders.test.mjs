import test from 'node:test';import assert from 'node:assert/strict';
import worker,{reminderTasks} from './helpers/session-worker.mjs';
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

const withAliases={...s,data:[{project:'P001 台湾桃园项目',task:'联调',plannedDate:'2026-10-10',status:'进行中',done:false,reason:'',note:''}],archive:[],priorities:{},workWorkspace:{tasks:[]},workspace:{tasks:[]}};
const coreItems=[{projectCode:'PM001',projectName:'台湾相洋项目',aliases:['台湾桃园项目']}];
test('project reminder sources reuse information-sheet codes and never keep a legacy number',()=>{
 assert.equal(reminderTasks(withAliases,'work',coreItems)[0].source,'项目问题 · PM001 台湾桃园项目');
 const unmatched={...withAliases,data:[{project:'P007 杭州中策项目',task:'联调',plannedDate:'2026-10-10',status:'进行中',done:false,reason:'',note:''}]};
 assert.equal(reminderTasks(unmatched,'work',coreItems)[0].source,'项目问题 · 杭州中策项目');
 assert.equal(reminderTasks(unmatched,'work')[0].source,'项目问题 · 杭州中策项目');
 assert.equal(reminderTasks(withAliases,'work')[0].source,'项目问题 · 台湾桃园项目');
});
const remindersEnv=(core)=>({TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(sql){return {async first(){if(sql.includes('project_core_information')){if(core instanceof Error)throw core;return {payload:JSON.stringify({items:core})};}return {payload:JSON.stringify(withAliases),version:1};}};}}});
const reminderRequest=()=>new Request('https://test.local/api/reminders?scope=work',{headers:{Authorization:'Basic '+btoa('u:p')}});
test('reminder endpoint labels project sources from the snapshot and degrades to names alone',async()=>{
 assert.equal((await (await worker.fetch(reminderRequest(),remindersEnv(coreItems))).json()).tasks[0].source,'项目问题 · PM001 台湾桃园项目');
 assert.equal((await (await worker.fetch(reminderRequest(),remindersEnv([]))).json()).tasks[0].source,'项目问题 · 台湾桃园项目');
 assert.equal((await (await worker.fetch(reminderRequest(),remindersEnv(new Error('no table')))).json()).tasks[0].source,'项目问题 · 台湾桃园项目');
});
