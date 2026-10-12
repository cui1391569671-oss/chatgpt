import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('async function manualSave(){'),html.indexOf('function useCloudTracker(s)'));
test('manual save commits focused text and waits for its automatic cloud save without a duplicate write',async()=>{
 let committed=false,writes=0;const notices=[];
 const c=vm.createContext({ready:true,unresolvedPending:null,saving:null,document:{activeElement:{closest:()=>({blur(){committed=true;writes++;c.saving=Promise.resolve(true);}})}},showToast:(...args)=>notices.push(args),saveData:()=>{writes++;return Promise.resolve(true);}});
 vm.runInContext(source,c);assert.equal(await c.manualSave(),true);assert.equal(committed,true);assert.equal(writes,1);assert.equal(notices[0][0],'已保存至云端');
});
test('manual save reports failure without announcing success and can retry',async()=>{
 const notices=[];let succeed=false;
 const c=vm.createContext({ready:true,unresolvedPending:null,saving:null,document:{activeElement:null},showToast:(...args)=>notices.push(args),saveData:async()=>succeed});
 vm.runInContext(source,c);assert.equal(await c.manualSave(),false);assert.equal(notices.length,0);succeed=true;assert.equal(await c.manualSave(),true);assert.equal(notices.length,1);
});
