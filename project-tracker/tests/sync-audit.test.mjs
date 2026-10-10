import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker.mjs';
function setup(){let payload={data:[{project:'A',task:'测试问题',plannedDate:'2026-10-10',reason:'',note:'',status:'进行中',done:false}],archive:[],projects:['A'],deletedProjects:[],priorities:{},workspace:{tasks:[],notes:[],events:[]},workWorkspace:{tasks:[],notes:[],events:[]},workspaceVersions:{personal:1,work:1}},version=1,race=null;return {env:{TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...v){args=v;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(race){const cb=race;race=null;cb(payload);version++;return {meta:{changes:0}};}if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}},race(cb){race=cb;}};}
const request=(path,body)=>new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
async function read(env,path='/api/state'){return (await worker.fetch(request(path),env)).json();}
const task=(id)=>({id,title:id,dueDate:'2026-10-10',priority:'normal',detail:'',done:false});
test('stale project page survives work/private saves, preserving notes, Drive bookmarks and reminder scope',async()=>{
 const {env}=setup(),base=await read(env);
 const work={tasks:[task('work')],notes:[{id:'n',title:'云端笔记',body:'保留',updatedAt:'2026-10-10T00:00:00Z'}],events:[],driveLinks:[{id:'d',title:'资料',description:'',url:'https://drive.google.com/drive/folders/a'}]};
 assert.equal((await worker.fetch(request('/api/workspace?scope=work',{workspace:work,version:1}),env)).status,200);
 assert.equal((await worker.fetch(request('/api/workspace?scope=personal',{workspace:{tasks:[task('private')],notes:[],events:[]},version:1}),env)).status,200);
 const local=structuredClone(base);local.data[0].plannedDate='2026-10-11';local.base=base;
 assert.equal((await worker.fetch(request('/api/state',local),env)).status,200);
 assert.deepEqual((await read(env,'/api/workspace?scope=work')).workspace,work);
 assert.equal((await read(env,'/api/project-calendar')).items[0].date,'2026-10-11');
 assert.deepEqual((await read(env,'/api/reminders?scope=work')).tasks.map(x=>x.dueDate),['2026-10-10','2026-10-11']);
 assert.deepEqual((await read(env,'/api/reminders?scope=personal')).tasks.map(x=>x.title),['private']);
 const latest=await read(env);latest.base=structuredClone(latest);latest.data[0].done=true;latest.data[0].status='已完成';assert.equal((await worker.fetch(request('/api/state',latest),env)).status,200);
 assert.equal((await read(env,'/api/project-calendar')).items.length,0);assert.equal((await read(env,'/api/reminders?scope=work')).tasks.length,1);
});
test('actual project conflict rejects replacement and preserves newer content',async()=>{
 const {env}=setup(),base=await read(env),remote=structuredClone(base);remote.data[0].note='另一设备修改';assert.equal((await worker.fetch(request('/api/state',remote),env)).status,200);
 const stale=structuredClone(base);stale.base=base;stale.data[0].task='本地修改';assert.equal((await worker.fetch(request('/api/state',stale),env)).status,409);assert.equal((await read(env)).data[0].note,'另一设备修改');
});
test('atomic project save retries workspace race and retains the winning workspace',async()=>{
 const {env,race}=setup(),base=await read(env),local=structuredClone(base);local.base=base;local.data[0].note='成功';race(s=>{s.workWorkspace.tasks.push(task('race'));s.workspaceVersions.work++;});
 assert.equal((await worker.fetch(request('/api/state',local),env)).status,200);assert.equal((await read(env,'/api/workspace?scope=work')).workspace.tasks[0].id,'race');assert.equal((await read(env)).data[0].note,'成功');
});

import {readFileSync} from 'node:fs';import vm from 'node:vm';
const indexHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('queued project edits advance their base after the first save instead of self-conflicting',async()=>{
 const base={data:[{task:'原值'}],priorities:{},archive:[],projects:[],deletedProjects:[]},first=structuredClone(base),second=structuredClone(base);first.data[0].task='第一次';second.data[0].task='第二次';
 const writes=[],context=vm.createContext({structuredClone,JSON,Error,pendingState:{...first,base},conflicted:false,saving:null,cloudVersion:1,cloudBase:base,dataDirty:true,trackerSnapshot:x=>({data:x.data,priorities:x.priorities,archive:x.archive,projects:x.projects,deletedProjects:x.deletedProjects}),setSync:()=>{},localStorage:{setItem(){},removeItem(){}},PENDING_KEY:'pending',window:{parent:null},fetch:async(_,opts)=>{writes.push(JSON.parse(opts.body));if(writes.length===1)context.pendingState={...second,base};return {ok:true,status:200,json:async()=>({version:1+writes.length})};}});context.window.parent=context.window;
 vm.runInContext(indexHtml.slice(indexHtml.indexOf('async function flushSave()'),indexHtml.indexOf('function deleteCompleted()')),context);
 assert.equal(await context.flushSave(),true);assert.equal(writes.length,2);assert.equal(writes[1].version,2);assert.equal(writes[1].base.data[0].task,'第一次');assert.equal(writes[1].data[0].task,'第二次');
});
const workHtml=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
test('workspace background refresh updates data but ignores responses racing a local save',async()=>{
 let respond;const document={querySelector:()=>null};const context=vm.createContext({JSON,Error,ready:true,busy:false,workspaceRefreshing:false,state:{tasks:[],notes:[],events:[]},version:1,api:'/api/workspace?scope=work',document,render:()=>{},status:()=>{},fetch:()=>new Promise(r=>respond=r)});
 vm.runInContext(workHtml.slice(workHtml.indexOf('async function refreshWorkspace()'),workHtml.indexOf('setInterval(()=>{if(!document.hidden)refreshWorkspace();}')),context);
 const running=context.refreshWorkspace();respond({ok:true,json:async()=>({workspace:{tasks:[task('remote')],notes:[],events:[]},version:2})});await running;assert.equal(context.state.tasks[0].id,'remote');
 const delayed=context.refreshWorkspace();context.version=3;context.state.tasks=[task('local-save')];respond({ok:true,json:async()=>({workspace:{tasks:[],notes:[],events:[]},version:2})});await delayed;assert.equal(context.state.tasks[0].id,'local-save');assert.equal(context.version,3);
});
test('all workspace collections survive round trips and concurrent project saves in their own space',async()=>{
 const {env}=setup(),projectBase=await read(env),image='/api/wardrobe-images/11111111-1111-4111-8111-111111111111';
 const personal={tasks:[task('private')],notes:[{id:'note',title:'笔记',body:'内容',updatedAt:'2026-10-10T00:00:00Z'}],events:[{id:'event',title:'日程',start:'2026-10-10T09:00',end:'',location:'',detail:''}],vocabulary:[{id:'word',word:'test'}],wardrobe:[{id:'shirt',name:'衬衫',category:'top',seasons:['spring'],color:'白色',image}],outfits:[{id:'outfit',name:'搭配',season:'spring',items:['shirt']}],driveLinks:[{id:'link',title:'文件',url:'https://docs.google.com/document/d/a/edit',description:''}]};
 assert.equal((await worker.fetch(request('/api/workspace?scope=personal',{workspace:personal,version:1}),env)).status,200);
 const changed=structuredClone(projectBase);changed.base=projectBase;changed.data[0].note='修改问题';assert.equal((await worker.fetch(request('/api/state',changed),env)).status,200);
 assert.deepEqual((await read(env,'/api/workspace?scope=personal')).workspace,personal);assert.deepEqual((await read(env,'/api/workspace?scope=work')).workspace,{tasks:[],notes:[],events:[]});
 await worker.scheduled({},env,{waitUntil:async p=>await p});assert.deepEqual((await read(env,'/api/workspace?scope=personal')).workspace,personal);
});
