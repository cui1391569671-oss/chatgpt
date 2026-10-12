import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {WORKSPACE_COLLECTIONS,recordChanges} from '../cloud-records.mjs';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const code=html.split('// WORKSPACE_MERGE_START')[1].split('// WORKSPACE_MERGE_END')[0];
const merge=vm.runInNewContext(code+';mergeWorkspace',{structuredClone});
const base={tasks:[{id:'a',title:'原任务',done:false}],notes:[],events:[]};
test('concurrent new tasks merge without losing either addition',()=>{
 const local=structuredClone(base),remote=structuredClone(base);local.tasks.push({id:'b',title:'本地新增'});remote.tasks.push({id:'c',title:'云端新增'});
 const result=merge(base,local,remote);assert.deepEqual(Array.from(result.tasks,x=>x.id).sort(),['a','b','c']);
});
test('different fields of a task merge and remote unrelated data remains',()=>{
 const local=structuredClone(base),remote=structuredClone(base);local.tasks[0].title='新标题';remote.tasks[0].done=true;remote.notes.push({id:'n',body:'云端笔记'});
 const result=merge(base,local,remote);assert.equal(result.tasks[0].done,true);assert.equal(result.tasks[0].title,'新标题');assert.equal(result.notes.length,1);
});
test('same field edits and deletion versus editing require review',()=>{
 const local=structuredClone(base),remote=structuredClone(base);local.tasks[0].title='本地标题';remote.tasks[0].title='远端标题';assert.throws(()=>merge(base,local,remote),/同一项/);
 remote.tasks=[];assert.throws(()=>merge(base,local,remote),/同一项/);
});
test('save sends only changes and renders authoritative cloud response',async()=>{
 const local=structuredClone(base);local.tasks.push({id:'b',title:'本地新增'});const remote=structuredClone(local);remote.tasks.push({id:'c',title:'云端新增'});let body;
 const context=vm.createContext({structuredClone,JSON,Error,state:base,version:1,busy:false,ready:true,conflict:false,scope:'work',WORKSPACE_COLLECTIONS,recordChanges,setBusy:()=>{},status:()=>{},toast:()=>{},render:()=>{},fetch:async(url,opts)=>{body=JSON.parse(opts.body);assert.equal(url,'/api/workspace/patch?scope=work');return {ok:true,json:async()=>({workspace:remote,version:3})};}});
 vm.runInContext(html.slice(html.indexOf("let saveError='';"),html.indexOf('function empty(')),context);
 assert.equal(await context.change(local),true);assert.equal(body.workspace,undefined);assert.equal(body.operations.length,1);assert.equal(context.state.tasks.length,3);
});
const deleteCode=html.slice(html.indexOf('async function deleteRecord('),html.indexOf('function empty('));
for(const scenario of ['stale','changed-cancel','changed-confirm','already-deleted','retry']){
 test('delete handles '+scenario+' without overwriting unrelated records',async()=>{
  const remote=structuredClone(base);remote.tasks.push({id:'other',title:'其他页面新增'});if(scenario.startsWith('changed'))remote.tasks[0].title='远端改过';if(scenario==='already-deleted')remote.tasks=remote.tasks.filter(t=>t.id!=='a');
  const writes=[];let prompts=0;
  const c=vm.createContext({structuredClone,JSON,Error,state:structuredClone(base),version:1,busy:false,ready:true,conflict:false,scope:'work',api:'/api/workspace?scope=work',labels:{tasks:'待办'},setBusy:()=>{},status:()=>{},toast:()=>{},render:()=>{},confirm:()=>{prompts++;return scenario==='changed-confirm';},fetch:async(url,opts)=>{if(!opts?.method)return {ok:true,json:async()=>({workspace:remote,version:5+writes.length})};writes.push(JSON.parse(opts.body));return scenario==='retry'&&writes.length===1?{status:409}:{ok:true,status:200,json:async()=>({version:8,workspace:{...remote,tasks:remote.tasks.filter(x=>x.id!=='a')}})};}});
  vm.runInContext(deleteCode,c);const result=await c.deleteRecord('tasks','a');assert.equal(result,scenario!=='changed-cancel');
  if(scenario==='already-deleted'||scenario==='changed-cancel')assert.equal(writes.length,0);else{assert.equal(writes.at(-1).workspace,undefined);assert.equal(writes[0].operations[0].action,'delete');assert.equal(writes[0].operations[0].id,'a');}
  assert.equal(prompts,scenario.startsWith('changed')?1:0);
 });
}
