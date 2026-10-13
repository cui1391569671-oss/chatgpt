import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker.mjs';
import {WORKSPACE_COLLECTIONS,PROJECT_COLLECTIONS,ensureProjectIds,recordChanges,applyRecordChanges} from '../cloud-records.mjs';
const task=id=>({id,title:id,dueDate:'',priority:'normal',detail:'',done:false});
function setup(){let payload={data:[{project:'A',task:'问题A',reason:'',note:'',status:'进行中',done:false,plannedDate:''},{project:'B',task:'问题B',reason:'',note:'',status:'进行中',done:false,plannedDate:''}],archive:[],priorities:{},projects:['A','B'],deletedProjects:[],workWorkspace:{tasks:[task('a'),task('b')],notes:[],events:[]},workspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}},version=1,race=null;return {env:{TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...a){args=a;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(race){race(payload);race=null;version++;return {meta:{changes:0}};}if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}},race(fn){race=fn;}};}
const req=(path,body)=>new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const get=async(e,p)=>(await worker.fetch(req(p),e)).json();
const patch=async(e,p,operations)=>worker.fetch(req(p,{operations}),e);
test('cloud applies independent device edits without sending a workspace snapshot',async()=>{
 const {env}=setup(),path='/api/workspace?scope=work',endpoint='/api/workspace/patch?scope=work',a=(await get(env,path)).workspace,b=structuredClone(a);
 const nextA=structuredClone(a);nextA.tasks[0].title='设备A';const nextB=structuredClone(b);nextB.tasks[1].done=true;
 assert.equal((await patch(env,endpoint,recordChanges(a,nextA,WORKSPACE_COLLECTIONS))).status,200);
 const r=await patch(env,endpoint,recordChanges(b,nextB,WORKSPACE_COLLECTIONS));assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.workspace.tasks[0].title,'设备A');assert.equal(saved.workspace.tasks[1].done,true);
 const conflict=structuredClone(a);conflict.tasks[0].title='另一个标题';assert.equal((await patch(env,endpoint,recordChanges(a,conflict,WORKSPACE_COLLECTIONS))).status,409);
 const sameRow=structuredClone(a);sameRow.tasks[0].detail='另一个字段';assert.equal((await patch(env,endpoint,recordChanges(a,sameRow,WORKSPACE_COLLECTIONS))).status,200);
});
test('patch preserves unrelated data during database CAS race and repeated create is idempotent',async()=>{
 const {env,race}=setup(),base=(await get(env,'/api/workspace?scope=work')).workspace,next=structuredClone(base);next.tasks.push(task('new'));
 race(s=>{s.workWorkspace.notes.push({id:'n',title:'云端笔记',body:'保留',updatedAt:'2026-10-12T00:00:00Z'});});const ops=recordChanges(base,next,WORKSPACE_COLLECTIONS);
 for(let i=0;i<2;i++){const r=await patch(env,'/api/workspace/patch?scope=work',ops);assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.workspace.tasks.filter(t=>t.id==='new').length,1);assert.equal(saved.workspace.notes.length,1);}
});
test('project changes use stable IDs and retain other project and workspace updates',async()=>{
 const {env}=setup(),base=await get(env,'/api/state');assert.ok(base.data[0].id);const a=structuredClone(base),b=structuredClone(base);a.data[0].note='A备注';b.data[1].plannedDate='2026-10-13';
 assert.equal((await patch(env,'/api/state/patch',recordChanges(base,a,PROJECT_COLLECTIONS))).status,200);
 const r=await patch(env,'/api/state/patch',recordChanges(base,b,PROJECT_COLLECTIONS));assert.equal(r.status,200);const saved=(await r.json()).state;assert.equal(saved.data[0].note,'A备注');assert.equal(saved.data[1].plannedDate,'2026-10-13');assert.equal((await get(env,'/api/workspace?scope=work')).workspace.tasks.length,2);
 const gone=structuredClone(base);gone.data.shift();assert.equal((await patch(env,'/api/state/patch',recordChanges(base,gone,PROJECT_COLLECTIONS))).status,409);
});
test('create, archive, project priorities and membership are applied atomically',()=>{
 const base=ensureProjectIds({data:[{task:'a'}],archive:[],deletedProjects:[],projects:['A'],priorities:{}}),next=structuredClone(base);next.archive.push(next.data.pop());next.projects.push('B');next.priorities.B='high';
 const saved=applyRecordChanges(base,recordChanges(base,next,PROJECT_COLLECTIONS),PROJECT_COLLECTIONS);assert.deepEqual(saved,next);
 assert.throws(()=>applyRecordChanges(base,[{collection:'workspace',id:'x',action:'create',record:{id:'x'}}],PROJECT_COLLECTIONS));
 assert.throws(()=>applyRecordChanges(base,[{collection:'priorities',id:'__proto__',action:'value'}],PROJECT_COLLECTIONS));
});
test('business data is never written to browser storage; existing pending copy remains a migration read',async()=>{
 const {readFileSync}=await import('node:fs');const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/localStorage\.setItem/);assert.match(html,/localStorage\.getItem\(PENDING_KEY\)/);
});

test('successful state writes with trigger side effects are not mistaken for CAS conflicts',async()=>{
 const {env}=setup();const prepare=env.DB.prepare.bind(env.DB);let writes=0;
 env.DB.prepare=(...args)=>{const stmt=prepare(...args),run=stmt.run.bind(stmt);stmt.run=async()=>{const result=await run();writes++;if(result.meta.changes===1)result.meta.changes=2;return result;};return stmt;};
 const base=await get(env,'/api/state');const id=base.data[0].id;
 const response=await worker.fetch(req('/api/state/patch',{operations:[{collection:'data',id,action:'update',changes:{note:{before:{exists:true,value:''},after:{exists:true,value:'成功保存'}}}}]}),env);
 assert.equal(response.status,200);assert.equal(writes,1);assert.equal((await get(env,'/api/state')).data[0].note,'成功保存');
});
test('maintenance create edit delete persist through cloud patches and keep work data isolated',async()=>{
 const {env}=setup(),path='/api/workspace?scope=personal',endpoint='/api/workspace/patch?scope=personal';let base=(await get(env,path)).workspace;
 const item={id:'device-1',title:'空调',location:'客厅',lastDate:'2026-10-01',nextDate:'2026-11-01',detail:'清洁滤网'};
 for(const records of [[item],[{...item,nextDate:'2026-12-01'}],[]]){const next={...base,maintenance:records};const r=await patch(env,endpoint,recordChanges(base,next,WORKSPACE_COLLECTIONS));assert.equal(r.status,200);base=(await get(env,path)).workspace;assert.deepEqual(base.maintenance,records);assert.equal((await get(env,'/api/workspace?scope=work')).workspace.maintenance,undefined);}
 const bad={...item,nextDate:'2026-02-30'};assert.equal((await patch(env,endpoint,recordChanges(base,{...base,maintenance:[bad]},WORKSPACE_COLLECTIONS))).status,400);
});
test('daily routines persist daily completion independently from tasks',async()=>{const {env}=setup(),path='/api/workspace?scope=personal',endpoint='/api/workspace/patch?scope=personal';let base=(await get(env,path)).workspace;for(const completedOn of ['', '2026-10-12','']){const next={...base,dailyRoutines:[{id:'daily-1',title:'阅读',detail:'20分钟',completedOn}]};const r=await patch(env,endpoint,recordChanges(base,next,WORKSPACE_COLLECTIONS));assert.equal(r.status,200);base=(await get(env,path)).workspace;assert.equal(base.dailyRoutines[0].completedOn,completedOn);assert.equal(base.tasks.length,0);}const bad={...base,dailyRoutines:[{...base.dailyRoutines[0],completedOn:'invalid'}]};assert.equal((await patch(env,endpoint,recordChanges(base,bad,WORKSPACE_COLLECTIONS))).status,400);});

test('work daily routines and maintenance persist independently of private records',async()=>{
 const {env}=setup();const collections={dailyRoutines:{id:'routine',title:'检查项目进度',detail:'',completedOn:'2026-10-13'},maintenance:{id:'equipment',title:'工作电脑',location:'办公室',detail:'检查设备',lastDate:'2026-10-01',nextDate:'2026-11-01'}};
 for(const scope of ['personal','work']){
  const operations=Object.entries(collections).map(([collection,record])=>({collection,id:record.id,action:'create',record:{...record,title:scope+' '+record.title}}));
  assert.equal((await patch(env,'/api/workspace/patch?scope='+scope,operations)).status,200);
 }
 for(const scope of ['personal','work']){
  const stored=(await get(env,'/api/workspace?scope='+scope)).workspace;
  assert.equal(stored.dailyRoutines[0].title,scope+' 检查项目进度');assert.equal(stored.maintenance[0].title,scope+' 工作电脑');
 }
 const operations=[{collection:'dailyRoutines',id:'routine',action:'update',changes:{completedOn:{before:{exists:true,value:'2026-10-13'},after:{exists:true,value:''}}}}];
 assert.equal((await patch(env,'/api/workspace/patch?scope=work',operations)).status,200);
 assert.equal((await get(env,'/api/workspace?scope=personal')).workspace.dailyRoutines[0].completedOn,'2026-10-13');
 assert.equal((await get(env,'/api/workspace?scope=work')).workspace.dailyRoutines[0].completedOn,'');
});

test('project expenses persist, edit and delete without changing private records; invalid money is rejected',async()=>{
 const {env}=setup();const endpoint='/api/workspace/patch?scope=work',record={id:'expense-1',title:'采购工具',project:'P003',category:'项目采购',date:'2026-10-13',amountCents:12345,currency:'CNY',status:'pending',detail:'现场工具'};
 assert.equal((await patch(env,endpoint,[{collection:'expenses',id:record.id,action:'create',record}])).status,200);
 assert.equal((await get(env,'/api/workspace?scope=work')).workspace.expenses[0].amountCents,12345);
 assert.equal((await get(env,'/api/workspace?scope=personal')).workspace.expenses,undefined);
 assert.equal((await patch(env,endpoint,[{collection:'expenses',id:record.id,action:'update',changes:{status:{before:{exists:true,value:'pending'},after:{exists:true,value:'paid'}}}}])).status,200);
 assert.equal((await patch(env,endpoint,[{collection:'expenses',id:'bad',action:'create',record:{...record,id:'bad',amountCents:-1}}])).status,400);
 assert.equal((await patch(env,endpoint,[{collection:'expenses',id:record.id,action:'delete',before:{...record,status:'paid'}}])).status,200);
 assert.equal((await get(env,'/api/workspace?scope=work')).workspace.expenses.length,0);
});
