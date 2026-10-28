import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderCalendar(){'),html.indexOf('function wordTitleButton'));
test('full calendar stays on its own route and cannot overwrite the typographic homepage',()=>{
 const node={innerHTML:'original content'},mounted=[];
 const c=vm.createContext({isCalendarEditing:()=>false,disposeWorkspaceCalendar:()=>{},mountWorkspaceCalendar:(...args)=>mounted.push(args),$:()=>node,view:'home',state:{events:[],tasks:[]},projectCalendar:[],query:'',scope:'work',displayProject:x=>x,projectCalendarError:'',esc:String});
 vm.runInContext(source,c);c.renderCalendar();assert.equal(node.innerHTML,'original content');assert.equal(mounted.length,0);
 c.view='calendar';c.renderCalendar();assert.match(node.innerHTML,/id="workspaceCalendar"/);assert.equal(mounted.length,1);
 c.isCalendarEditing=()=>true;c.calendarDeferredRender=false;node.innerHTML='editor remains mounted';c.renderCalendar();assert.equal(node.innerHTML,'editor remains mounted');assert.equal(c.calendarDeferredRender,true);
});
