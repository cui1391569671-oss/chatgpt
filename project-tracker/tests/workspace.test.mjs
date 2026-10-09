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
 const saved=await (await worker.fetch(request('/api/workspace'),e)).json();assert.deepEqual(saved.workspace,workspace);assert.equal(saved.version,2);
 r=await worker.fetch(request('/api/workspace',{workspace,version:1}),e);assert.equal(r.status,409);
});
test('archive preserves personal data',async()=>{
 const e=env();await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 const s=await (await worker.fetch(request('/api/state'),e)).json();s.data.push({project:'保留项目',task:'完成问题',reason:'',plannedDate:'',note:'',status:'已完成',done:true});await worker.fetch(request('/api/state',s),e);
 let job;await worker.scheduled({},e,{waitUntil(p){job=p;}});await job;
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.equal(after.data.length,0);assert.equal(after.archive.length,1);assert.equal(after.workspace,undefined);assert.deepEqual((await (await worker.fetch(request('/api/workspace'),e)).json()).workspace,workspace);
});
test('validation and access control reject bad writes',async()=>{
 assert.equal(validWorkspace(workspace),true);
 for(const mutate of [w=>w.tasks[0].dueDate='2026-02-30',w=>w.events[0].start='2026-10-09T25:00',w=>w.events[0].end='2026-10-09T08:00',w=>w.notes[0].id='task',w=>w.tasks[0].title=' ',w=>w.notes[0].body='a'.repeat(20001)]){const w=structuredClone(workspace);mutate(w);assert.equal(validWorkspace(w),false);}
 const e=env();assert.equal((await worker.fetch(new Request('https://test.local/api/workspace'),e)).status,401);
 const cross=request('/api/workspace',{workspace,version:1});cross.headers.set('Origin','https://other.local');assert.equal((await worker.fetch(cross,e)).status,403);
 assert.equal((await worker.fetch(request('/api/workspace',{workspace:null,version:1}),e)).status,400);
});
test('home and project routes serve their own pages',async()=>{const e=env();const home=await (await worker.fetch(request('/'),e)).text(),project=await (await worker.fetch(request('/projects'),e)).text();assert.match(home,/选择你的空间/);assert.match(home,/href="\/work"/);assert.match(home,/href="\/personal"/);assert.match(project,/<title>项目问题跟进表/);assert.match(project,/返回工作工作台/);});

test('workspace editing and deletion persist without changing projects',async()=>{
 const e=env();await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 const edited=structuredClone(workspace);edited.tasks[0].done=true;edited.notes[0].body='更新后的笔记';edited.events[0].start='2026-10-10T11:00';edited.events[0].end='2026-10-10T12:00';
 let r=await worker.fetch(request('/api/workspace',{workspace:edited,version:2}),e);assert.equal(r.status,200);
 const saved=await (await worker.fetch(request('/api/workspace'),e)).json();assert.deepEqual(saved.workspace,edited);
 r=await worker.fetch(request('/api/workspace',{workspace:{tasks:[],notes:[],events:[]},version:3}),e);assert.equal(r.status,200);
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.equal(after.workspace,undefined);assert.deepEqual((await (await worker.fetch(request('/api/workspace'),e)).json()).workspace,{tasks:[],notes:[],events:[]});assert.deepEqual(after.projects,['保留项目']);
});

test('stale project page cannot overwrite a newer workspace save',async()=>{
 const e=env();const stale=await (await worker.fetch(request('/api/state'),e)).json();
 await worker.fetch(request('/api/workspace',{workspace,version:1}),e);
 stale.projects.push('过期页面的新项目');
 const r=await worker.fetch(request('/api/state',stale),e);assert.equal(r.status,409);
 const after=await (await worker.fetch(request('/api/state'),e)).json();assert.deepEqual(after.projects,['保留项目']);assert.equal(after.workspace,undefined);assert.deepEqual((await (await worker.fetch(request('/api/workspace'),e)).json()).workspace,workspace);
});

test('generated worker pages exactly match HTML sources',async()=>{
 const {readFile}=await import('node:fs/promises');const {HTML,WORKBENCH,LANDING}=await import('../pages.mjs');
 assert.equal(HTML,await readFile(new URL('../index.html',import.meta.url),'utf8'));
 assert.equal(WORKBENCH,await readFile(new URL('../workbench.html',import.meta.url),'utf8'));
 assert.equal(LANDING,await readFile(new URL('../landing.html',import.meta.url),'utf8'));
});


test('work and personal CRUD are isolated with independent versions',async()=>{
 const e=env(),work=structuredClone(workspace);work.tasks[0].title='工作任务';work.notes[0].title='工作笔记';work.events[0].title='工作会议';
 const save=(scope,data,version)=>worker.fetch(request('/api/workspace?scope='+scope,{workspace:data,version}),e);
 const read=async scope=>(await (await worker.fetch(request('/api/workspace?scope='+scope),e)).json());
 assert.equal((await save('personal',workspace,1)).status,200);
 assert.equal((await save('work',work,1)).status,200);
 assert.deepEqual((await read('personal')).workspace,workspace);assert.deepEqual((await read('work')).workspace,work);
 assert.equal((await read('personal')).version,2);assert.equal((await read('work')).version,2);
 assert.equal((await save('work',{tasks:[],notes:[],events:[]},2)).status,200);
 assert.equal((await read('personal')).version,2);assert.deepEqual((await read('personal')).workspace,workspace);
 assert.deepEqual((await read('work')).workspace,{tasks:[],notes:[],events:[]});
 assert.equal((await save('personal',workspace,1)).status,409);
 assert.equal((await worker.fetch(request('/api/workspace?scope=unknown'),e)).status,400);
 const tracker=await (await worker.fetch(request('/api/state'),e)).json();assert.equal(tracker.workspace,undefined);assert.equal(tracker.workWorkspace,undefined);
 tracker.projects.push('工作新项目');assert.equal((await worker.fetch(request('/api/state',tracker),e)).status,200);
 assert.deepEqual((await read('personal')).workspace,workspace);assert.equal((await read('work')).version,3);
});

test('simultaneous work and personal saves merge without lost updates',async()=>{
 const e=env(),work=structuredClone(workspace);work.tasks[0].title='并发工作任务';
 const results=await Promise.all([
  worker.fetch(request('/api/workspace?scope=personal',{workspace,version:1}),e),
  worker.fetch(request('/api/workspace?scope=work',{workspace:work,version:1}),e)
 ]);assert.deepEqual(results.map(r=>r.status),[200,200]);
 const personal=await (await worker.fetch(request('/api/workspace?scope=personal'),e)).json();
 const business=await (await worker.fetch(request('/api/workspace?scope=work'),e)).json();
 assert.deepEqual(personal.workspace,workspace);assert.deepEqual(business.workspace,work);assert.equal(personal.version,2);assert.equal(business.version,2);
});

test('embedded project table stays authenticated and only allows same-origin framing',async()=>{
 const e=env();const r=await worker.fetch(request('/projects?embedded=1'),e);assert.equal(r.status,200);assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.match(await r.text(),/\.header,\.footer\{display:none\}/);
 assert.equal((await worker.fetch(new Request('https://test.local/projects?embedded=1'),e)).status,401);
 assert.equal((await worker.fetch(request('/projects'),e)).headers.get('X-Frame-Options'),'DENY');
});

test('personal game records survive reload and keep work space isolated',async()=>{
 const e=env(),game=structuredClone(workspace);
 Object.assign(game.tasks[0],{taskType:'game',gamePlatform:'PC / Switch'});
 assert.equal((await worker.fetch(request('/api/workspace?scope=personal',{workspace:game,version:1}),e)).status,200);
 const saved=await (await worker.fetch(request('/api/workspace?scope=personal'),e)).json();
 assert.deepEqual(saved.workspace,game);
 const work=await (await worker.fetch(request('/api/workspace?scope=work'),e)).json();
 assert.equal(work.workspace.tasks.length,0);
 const invalid=structuredClone(game);invalid.tasks[0].gamePlatform='x'.repeat(101);
 assert.equal(validWorkspace(invalid),false);
 invalid.tasks[0].gamePlatform='PC';invalid.tasks[0].taskType='invalid';
 assert.equal(validWorkspace(invalid),false);
});

test('personal vocabulary persists and survives work and project updates',async()=>{
 const e=env(),personal=structuredClone(workspace);
 personal.vocabulary=[{id:'word-1',word:'example',lesson:'001',meaning:'示例',mastery:'不会'}];
 assert.equal((await worker.fetch(request('/api/workspace?scope=personal',{workspace:personal,version:1}),e)).status,200);
 assert.equal((await worker.fetch(request('/api/workspace?scope=work',{workspace,version:1}),e)).status,200);
 const project=await (await worker.fetch(request('/api/state'),e)).json();project.projects.push('新项目');
 assert.equal((await worker.fetch(request('/api/state',project),e)).status,200);
 assert.deepEqual((await (await worker.fetch(request('/api/workspace?scope=personal'),e)).json()).workspace.vocabulary,personal.vocabulary);
 const invalid=structuredClone(personal);invalid.vocabulary[0].meaning='x'.repeat(2001);assert.equal(validWorkspace(invalid),false);
});
