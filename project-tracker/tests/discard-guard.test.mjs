import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscardGuard} from '../tasks-ui/src/discard-guard.mjs';

function editor(){
 const state={dirty:false,busy:false,active:true,closed:0,prompts:0,approve:false};
 const guard=createDiscardGuard({hasChanges:()=>state.dirty,isBusy:()=>state.busy,isActive:()=>state.active,close:()=>{state.closed++;state.active=false;},confirm:async()=>{state.prompts++;return state.approve;}});
 return {state,guard};
}
test('clean editors close without prompting; dirty drafts survive a cancelled dismissal',async()=>{
 const {state,guard}=editor();state.dirty=true;
 assert.equal(await guard.requestClose(),false);assert.equal(state.closed,0);
 state.approve=true;assert.equal(await guard.requestClose(),true);assert.equal(state.closed,1);
 const clean=editor();assert.equal(await clean.guard.requestClose(),true);assert.equal(clean.state.prompts,0);
});
test('Escape, backdrop and cancel requests share one pending confirmation',async()=>{
 let answer,closed=0,prompts=0;
 const guard=createDiscardGuard({hasChanges:()=>true,isBusy:()=>false,close:()=>closed++,confirm:()=>{prompts++;return new Promise(resolve=>{answer=resolve;});}});
 const first=guard.requestClose(),second=guard.requestClose();assert.equal(first,second);
 await Promise.resolve();assert.equal(prompts,1);answer(false);assert.equal(await first,false);assert.equal(closed,0);
});
test('saving or inactive editors cannot be dismissed, including after a pending confirmation',async()=>{
 const {state,guard}=editor();state.busy=true;assert.equal(await guard.requestClose(),false);assert.equal(state.prompts,0);
 state.busy=false;state.active=false;assert.equal(await guard.requestClose(),false);
 for(const block of ['busy','inactive']){
  let answer,closed=false,busy=false,active=true;
  const late=createDiscardGuard({hasChanges:()=>true,isBusy:()=>busy,isActive:()=>active,close:()=>{closed=true;},confirm:()=>new Promise(resolve=>{answer=resolve;})});
  const pending=late.requestClose();await Promise.resolve();if(block==='busy')busy=true;else active=false;answer(true);
  assert.equal(await pending,false);assert.equal(closed,false);
 }
});
test('actual page unload is blocked only while an active editor has changes or is saving',()=>{
 const {state,guard}=editor();const event=()=>({prevented:false,returnValue:undefined,preventDefault(){this.prevented=true;}});
 let e=event();guard.beforeUnload(e);assert.equal(e.prevented,false);
 state.dirty=true;e=event();guard.beforeUnload(e);assert.equal(e.prevented,true);assert.equal(e.returnValue,'');
 state.dirty=false;state.busy=true;e=event();guard.beforeUnload(e);assert.equal(e.prevented,true);
 state.active=false;e=event();guard.beforeUnload(e);assert.equal(e.prevented,false);
});
