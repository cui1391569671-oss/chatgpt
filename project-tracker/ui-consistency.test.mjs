import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('./workbench.html',import.meta.url),'utf8');
test('unlocking the workspace retains business-disabled actions while enabling available ones',()=>{
 const make=held=>({disabled:held,closest:()=>null,hasAttribute:name=>name==='data-disabled-when-idle'&&held});
 const protectedAction=make(true),availableAction=make(false),add={},submit={},runway={dataset:{}};
 const sandbox={renderNotifications(){},$:(id)=>id==='add'?add:submit,document:{querySelectorAll:selector=>selector==='[data-workspace-segment]'?[]:selector==='wardrobe-runway'?[runway]:[protectedAction,availableAction]}};
 vm.createContext(sandbox);vm.runInContext('let busy=false;const ready=true,conflict=false;'+page.match(/^function setBusy\(value\).*$/m)[0],sandbox);
 sandbox.setBusy(true);assert.equal(protectedAction.disabled,true);assert.equal(availableAction.disabled,true);
 assert.equal(runway.dataset.locked,'true');
 sandbox.setBusy(false);assert.equal(protectedAction.disabled,true);assert.equal(availableAction.disabled,false);
 assert.equal(runway.dataset.locked,'false');
});
test('calendar polling retains its snapshot offline and retries without status controls',async()=>{
 const adapter=readFileSync(new URL('./calendar-adapter.js',import.meta.url),'utf8');
 const source=adapter.slice(adapter.indexOf('async function refreshDingtalkCalendar'),adapter.indexOf('function showDingtalkEvent'));
 let fail=false,calls=0;const sandbox={document:{hidden:false},AbortController,JSON,isCalendarEditing:()=>false,fetch:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({events:[{id:'cached'}]})};}};
 vm.createContext(sandbox);vm.runInContext('let dingtalkEvents=[],dingtalkRequest=null,dingtalkGeneration=0;const workspaceCalendar={updateExternal(){}};'+source,sandbox);
 await sandbox.refreshDingtalkCalendar();fail=true;await sandbox.refreshDingtalkCalendar();assert.equal(vm.runInContext('dingtalkEvents[0].id',sandbox),'cached');assert.equal(vm.runInContext('dingtalkRequest',sandbox),null);
 fail=false;sandbox.fetch=async()=>{calls++;return {ok:true,json:async()=>({events:[{id:'recovered'}]})};};await sandbox.refreshDingtalkCalendar();assert.equal(calls,1);assert.equal(vm.runInContext('dingtalkEvents[0].id',sandbox),'recovered');
});
