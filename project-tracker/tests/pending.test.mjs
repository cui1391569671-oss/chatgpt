import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const helpers=html.split('// PENDING_HELPERS_START')[1].split('// PENDING_HELPERS_END')[0];
function setup(saved){
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{style:{},textContent:''});return elements.get(id);};
 const storage=new Map(saved===undefined?[]:[['pending',typeof saved==='string'?saved:JSON.stringify(saved)]]);
 const state={data:[{project:'A',task:'原问题'}],archive:[],projects:['A'],deletedProjects:[],priorities:{A:'high'}};
 const context=vm.createContext({JSON,Object,Array,localStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},document:{getElementById:element,querySelectorAll:()=>[]}});
 vm.runInContext(helpers+`\nlet data=${JSON.stringify(state.data)},archive=[],projects=['A'],deletedProjects=[],projectPriorities={A:'high'},unresolvedPending=null,pendingCloud=null;const PENDING_KEY='pending';`+html.slice(html.indexOf('function currentTracker()'),html.indexOf('function reviewPending()')),context);
 return {context,storage,elements,state};
}
test('matching local snapshot clears despite object-key order and ignores version metadata',()=>{
 const {context,storage}=setup({priorities:{A:'high'},deletedProjects:[],projects:['A'],archive:[],data:[{task:'原问题',project:'A'}],version:9});
 vm.runInContext('inspectPending()',context);assert.equal(storage.size,0);assert.equal(vm.runInContext('unresolvedPending',context),null);
});
test('different snapshot remains intact and prevents editing while awaiting review',()=>{
 const saved={data:[{project:'A',task:'未同步问题'}],archive:[],projects:['A'],deletedProjects:[],priorities:{A:'high'}};
 const {context,storage,elements}=setup(saved);vm.runInContext('inspectPending()',context);
 assert.deepEqual(JSON.parse(storage.get('pending')),saved);assert.equal(elements.get('tableBody').inert,true);assert.equal(elements.get('pendingNotice').style.display,'block');assert.equal(vm.runInContext('data[0].task',context),'原问题');
});
test('malformed snapshot is preserved for inspection rather than discarded',()=>{
 const {context,storage}=setup('{broken');vm.runInContext('inspectPending()',context);assert.equal(storage.get('pending'),'{broken');assert.equal(vm.runInContext('unresolvedPending.invalid',context),true);
});
