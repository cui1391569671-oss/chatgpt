import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';
import {validWorkspace} from './helpers/session-worker.mjs';
test('entertainment records validate four types and remain compatible with legacy games',()=>{
 const g={id:'g',title:'记录',platform:'',completedDate:'2026-10-11',rating:null,detail:''};
 for(const mediaType of [undefined,'game','movie','tv','anime'])assert.equal(validWorkspace({tasks:[],notes:[],events:[],completedGames:[{...g,...(mediaType?{mediaType}:{})}]}),true);
 assert.equal(validWorkspace({tasks:[],notes:[],events:[],completedGames:[{...g,mediaType:'unknown'}]}),false);
});
function setup(workspaceVersions){
 let payload=JSON.stringify({data:[],archive:[],priorities:{},projects:[],workspaceVersions}),version=1;
 return {TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...v){args=v;return this;},async first(){return {payload,version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=args[0];version++;return {meta:{changes:1}};}};}}};
}
const req=(scope,body)=>new Request('https://test.local/api/workspace?scope='+scope,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
for(const legacy of [undefined,null,{personal:0,work:0},{personal:-1,work:'2'},{personal:2,work:null}])test('legacy workspace versions permit consecutive saves: '+JSON.stringify(legacy),async()=>{
 const env=setup(legacy);for(const scope of ['personal','work']){
  let cloud=await (await worker.fetch(req(scope),env)).json();
  for(let i=0;i<3;i++){
   const r=await worker.fetch(req(scope,{workspace:cloud.workspace,version:cloud.version}),env);assert.equal(r.status,200);
   const saved=await r.json(),next=await (await worker.fetch(req(scope),env)).json();assert.equal(saved.version,cloud.version+1);assert.equal(next.version,saved.version);cloud=next;
  }
 }
});
test('all save collections support creation, edit and removal without losing unrelated records',async()=>{
 const env=setup({personal:0,work:0}),image='/api/wardrobe-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const sample={tasks:[{id:'task',title:'待办',done:false,dueDate:'2026-10-11',priority:'normal',detail:''}],notes:[{id:'note',title:'笔记',body:'内容',updatedAt:'2026-10-11T08:00:00Z'}],events:[{id:'event',title:'日程',start:'2026-10-11T09:00',end:'',location:'',detail:''}],completedGames:[{id:'game',title:'游戏',platform:'PS5',completedDate:'2026-10-10',rating:8,coverUrl:'https://example.com/cover.jpg',detail:''}],vocabulary:[{id:'word',word:'apple',meaning:'苹果'}],wardrobe:[{id:'clothes',name:'衬衫',category:'top',seasons:['spring'],color:'白',image}],outfits:[{id:'outfit',name:'搭配',season:'spring',items:['clothes']}],driveLinks:[{id:'drive',title:'文件',url:'https://docs.google.com/spreadsheets/d/example/edit',description:''}]};
 for(const scope of ['personal','work']){
  let cloud=await (await worker.fetch(req(scope),env)).json();
  const save=async workspace=>{const r=await worker.fetch(req(scope,{workspace,version:cloud.version}),env);assert.equal(r.status,200);cloud=await (await worker.fetch(req(scope),env)).json();assert.deepEqual(cloud.workspace,workspace);};
  await save(structuredClone(sample));
  for(const key of Object.keys(sample)){
   const next=structuredClone(cloud.workspace),item=next[key][0];if(key==='vocabulary')item.meaning='更新释义';else if(key==='wardrobe'||key==='outfits')item.name+='编辑';else item.title+='编辑';await save(next);
  }
  await save({tasks:[],notes:[],events:[]});
 }
});
