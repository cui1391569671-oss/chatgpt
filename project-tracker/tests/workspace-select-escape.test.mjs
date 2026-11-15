import test from 'node:test';
import assert from 'node:assert/strict';
import {closeSelectOnEscape} from '../tasks-ui/src/components/workspace-select-escape.ts';

test('Escape from a focused combobox closes its portalled listbox without dismissing the parent editor',()=>{
 const previousElement=globalThis.Element,previousDocument=globalThis.document;
 let closed=0,prevented=0;
 class TestElement{closest(){return null;}matches(){return false;}}
 const menu=new TestElement();menu.matches=selector=>selector==='[data-slot="select-content"][data-state="open"]';menu.dispatchEvent=event=>{assert.equal(event.type,'workspace-select-close');closed++;};
 const listbox=new TestElement();listbox.closest=selector=>selector==='[data-slot="select-content"]'?menu:null;
 const trigger=new TestElement();trigger.getAttribute=name=>name==='aria-controls'?'format-list':null;trigger.closest=selector=>selector==='[data-slot="select-trigger"][aria-expanded="true"]'?trigger:null;
 try{
  globalThis.Element=TestElement;globalThis.document={getElementById:id=>id==='format-list'?listbox:null};
  assert.equal(closeSelectOnEscape({target:trigger,defaultPrevented:false,preventDefault(){prevented++;}}),true);
  assert.equal(closed,1);assert.equal(prevented,1);
  assert.equal(closeSelectOnEscape({target:new TestElement(),defaultPrevented:false,preventDefault(){throw Error('unrelated editor key must remain available');}}),false);
  menu.matches=()=>false;
  assert.equal(closeSelectOnEscape({target:trigger,defaultPrevented:false,preventDefault(){throw Error('closed select must not consume Escape');}}),false);
 }finally{globalThis.Element=previousElement;globalThis.document=previousDocument;}
});
