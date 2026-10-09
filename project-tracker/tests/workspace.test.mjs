import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validWorkspace} from '../worker.mjs';
export function database(){
 const initial={data:[],archive:[],priorities:{},projects:['保留项目'],deletedProjects:[]};
 let payload=JSON.stringify(initial),version=1;
 return {prepare(sql){let args;return {bind(...v){args=v;return this;},async first(){return {payload,version};},async run(){if(version!==args[1])return {meta:{changes:0}};payload=args[0];version++;return {meta:{changes:1}};}};}};
}
const workspace={tasks:[{id:'task',title:'个人待办',done:false,dueDate:'2026-10-09',priority:'high',detail:''}],notes:[{id:'note',title:'笔记',body:'测试内容',updatedAt:'2026-10-09T08:00:00Z'}],events:[{id:'event',title:'会议',start:'2026-10-09T09:00',end:'2026-10-09T10:00',location:'办公室',detail:''}]};
function request(path,body){return new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('user:password'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
const env=()=>({DB:database(),TRACKER_USER:'user',TRACKER_PASSWORD:'password'});
test('existing database needs no migration; workspace and project writes preserve each other',async()=>{
 const e=env();let r=await worker.fetch(request('/api/workspace'),e);assert.deepEqual((await r.json()).workspace,{tasks:[],notes:[],events:[]});
 r=await worker.fetch(request('/api/workspace',{workspace,version:1}),e);assert.equal(r.status,200);
 const project=await (await worker.fetch(request('/api/state'),e)).json();assert.deepEqual(project.projects,['保留项目']);
 delete project.workspace;project.projects.push('新项目');r=await worker.fetch(request('/api/state',project),e);assert.equal(r.status,200);
 const saved=await (await worker.fetch(request('/api/workspace'),e)).json();assert.deepEqual(saved.workspace,workspace);assert.equal(saved.version,3);
 r=await worker.fetch(request('/api/workspace',{workspace,version:2}),e);assert.equal(r.status,409);
});
test('archive preserves personal data',async()=>{
 const e=env();await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 const s=await (await worker.fetch(request('/api/state'),e)).json();s.data.push({project:'保留项目',task:'完成问题',reason:'',plannedDate:'',note:'',status:'已完成',done:true});await worker.fetch(request('/api/state',s),e);
 let job;await worker.scheduled({},e,{waitUntil(p){job=p;}});await job;
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.equal(after.data.length,0);assert.equal(after.archive.length,1);assert.deepEqual(after.workspace,workspace);
});
test('validation and access control reject bad writes',async()=>{
 assert.equal(validWorkspace(workspace),true);
 for(const mutate of [w=>w.tasks[0].dueDate='2026-02-30',w=>w.events[0].start='2026-10-09T25:00',w=>w.events[0].end='2026-10-09T08:00',w=>w.notes[0].id='task',w=>w.tasks[0].title=' ',w=>w.notes[0].body='a'.repeat(20001)]){const w=structuredClone(workspace);mutate(w);assert.equal(validWorkspace(w),false);}
 const e=env();assert.equal((await worker.fetch(new Request('https://test.local/api/workspace'),e)).status,401);
 const cross=request('/api/workspace',{workspace,version:1});cross.headers.set('Origin','https://other.local');assert.equal((await worker.fetch(cross,e)).status,403);
 assert.equal((await worker.fetch(request('/api/workspace',{workspace:null,version:1}),e)).status,400);
});
test('home and project routes serve their own pages',async()=>{const e=env();const home=await (await worker.fetch(request('/'),e)).text(),project=await (await worker.fetch(request('/projects'),e)).text();assert.match(home,/<title>我的工作台/);assert.match(project,/<title>项目问题跟进表/);assert.match(project,/返回我的工作台/);});

test('workspace editing and deletion persist without changing projects',async()=>{
 const e=env();await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 const edited=structuredClone(workspace);edited.tasks[0].done=true;edited.notes[0].body='更新后的笔记';edited.events[0].start='2026-10-10T11:00';edited.events[0].end='2026-10-10T12:00';
 let r=await worker.fetch(request('/api/workspace',{workspace:edited,version:2}),e);assert.equal(r.status,200);
 const saved=await (await worker.fetch(request('/api/workspace'),e)).json();assert.deepEqual(saved.workspace,edited);
 r=await worker.fetch(request('/api/workspace',{workspace:{tasks:[],notes:[],events:[]},version:3}),e);assert.equal(r.status,200);
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.deepEqual(after.workspace,{tasks:[],notes:[],events:[]});assert.deepEqual(after.projects,['保留项目']);
});

test('stale project page cannot overwrite a newer workspace save',async()=>{
 const e=env();const stale=await (await worker.fetch(request('/api/state'),e)).json();
 await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 stale.projects.push('过期页面的新项目');
 const r=await worker.fetch(request('/api/state',stale),e);assert.equal(r.status,409);
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.deepEqual(after.projects,['保留项目']);assert.deepEqual(after.workspace,workspace);
});

test('generated worker pages exactly match HTML sources',async()=>{
 const {readFile}=await import('node:fs/promises');const {HTML,WORKBENCH}=await import('../pages.mjs');
 assert.equal(HTML,await readFile(new URL('../index.html',import.meta.url),'utf8'));
 assert.equal(WORKBENCH,await readFile(new URL('../workbench.html',import.meta.url),'utf8'));
});
