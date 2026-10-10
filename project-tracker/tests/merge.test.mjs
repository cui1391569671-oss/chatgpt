import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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
test('save retries stale version and commits merged data',async()=>{
 const local=structuredClone(base);local.tasks.push({id:'b',title:'本地新增'});const remote=structuredClone(base);remote.tasks.push({id:'c',title:'云端新增'});
 const writes=[];let rendered=false;
 const context=vm.createContext({structuredClone,JSON,Error,state:base,version:1,busy:false,ready:true,conflict:false,api:'/api/workspace?scope=work',setBusy:()=>{},status:()=>{},toast:()=>{},render:()=>{rendered=true;},fetch:async(url,opts)=>{if(!opts?.method)return {ok:true,json:async()=>({workspace:remote,version:2})};writes.push(JSON.parse(opts.body));return writes.length===1?{status:409}:{status:200,ok:true,json:async()=>({version:3})};}});
 vm.runInContext(code+html.slice(html.indexOf("let saveError='';"),html.indexOf('function empty(')),context);
 assert.equal(await context.change(local),true);assert.equal(writes[1].version,2);assert.deepEqual(writes[1].workspace.tasks.map(x=>x.id).sort(),['a','b','c']);assert.equal(rendered,true);
});
