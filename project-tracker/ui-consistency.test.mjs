import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('./workbench.html',import.meta.url),'utf8');
test('unlocking the workspace retains business-disabled actions while enabling available ones',()=>{
 const make=held=>({disabled:held,closest:()=>null,hasAttribute:name=>name==='data-disabled-when-idle'&&held});
 const protectedAction=make(true),availableAction=make(false),add={},submit={};
 const sandbox={renderNotifications(){},$:(id)=>id==='add'?add:submit,document:{querySelectorAll:selector=>selector==='[data-workspace-segment]'?[]:[protectedAction,availableAction]}};
 vm.createContext(sandbox);vm.runInContext('let busy=false;const ready=true,conflict=false;'+page.match(/^function setBusy\(value\).*$/m)[0],sandbox);
 sandbox.setBusy(true);assert.equal(protectedAction.disabled,true);assert.equal(availableAction.disabled,true);
 sandbox.setBusy(false);assert.equal(protectedAction.disabled,true);assert.equal(availableAction.disabled,false);
});
test('calendar stale/error feedback preserves the last snapshot and successful timestamp',async()=>{
 const adapter=readFileSync(new URL('./calendar-adapter.js',import.meta.url),'utf8');
 const source=adapter.slice(adapter.indexOf('async function refreshDingtalkCalendar'),adapter.indexOf("document.addEventListener('click'"));
 const retry={},host={dataset:{},innerHTML:'',querySelector:()=>retry};let fail=false;
 const sandbox={document:{hidden:false},AbortController,Date,JSON,esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),$:()=>host,isCalendarEditing:()=>false,fetch:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({events:[{id:'cached'}],connected:true,stale:true,lastSyncedAt:'2026-10-30T04:00:00.000Z'})};}};
 vm.createContext(sandbox);vm.runInContext("const dingtalkStatusRendered=new WeakMap();let dingtalkLastSyncedAt='',dingtalkEvents=[],dingtalkRequest=null,dingtalkGeneration=0;const workspaceCalendar={updateExternal(){}};"+source,sandbox);
 await sandbox.refreshDingtalkCalendar();assert.equal(host.dataset.tone,'warning');assert.match(host.innerHTML,/2026\/10\/30/);assert.match(host.innerHTML,/同步电脑/);
 fail=true;await sandbox.refreshDingtalkCalendar();assert.equal(host.dataset.tone,'error');assert.match(host.innerHTML,/2026\/10\/30/);assert.match(host.innerHTML,/已保留/);assert.equal(vm.runInContext('dingtalkEvents[0].id',sandbox),'cached');assert.equal(retry.disabled,false);
});
