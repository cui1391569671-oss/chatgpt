import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('workbench.html');
const projectRefresh=html.slice(html.indexOf('async function refreshProjectCalendar(){'),html.indexOf('\nfunction projectIssueRows'));
const workspaceRefresh=html.slice(html.indexOf('async function refreshWorkspace(){'),html.indexOf('\nsetInterval(()=>{if(!document.hidden)refreshWorkspace();}'));
const calendarRender=html.slice(html.indexOf('function renderCalendar(){'),html.indexOf('\nfunction wordTitleButton'));

test('repeated project polling draws only changed records or error transitions and retains the last snapshot',async()=>{
 let response={items:[{title:'项目安排',date:'2026-11-02'}]},fail=false,draws=0;
 const c=vm.createContext({scope:'work',view:'calendar',ready:true,busy:false,projectCalendar:response.items,projectCalendarLoading:false,projectCalendarPending:false,projectCalendarLoaded:true,projectCalendarError:'',renderCalendar:()=>draws++,setBusy:()=>{},fetch:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>structuredClone(response)};}});
 vm.runInContext(projectRefresh,c);
 for(let i=0;i<8;i++)await c.refreshProjectCalendar();assert.equal(draws,0);
 response.items[0].date='2026-11-03';await c.refreshProjectCalendar();assert.equal(draws,1);
 fail=true;await c.refreshProjectCalendar();assert.equal(draws,2);assert.equal(c.projectCalendar[0].date,'2026-11-03');
 await c.refreshProjectCalendar();assert.equal(draws,2);
 fail=false;await c.refreshProjectCalendar();assert.equal(draws,3);assert.equal(c.projectCalendarError,'');
 c.view='notes';response.items=[];await c.refreshProjectCalendar();assert.equal(draws,3);
});

test('a newer workspace snapshot updates the mounted calendar instead of rendering the entire page',async()=>{
 let renderCount=0,calendarCount=0,resolve;
 const status={dataset:{},classList:{contains:()=>false}};
 const c=vm.createContext({state:{events:[],tasks:[]},version:1,ready:true,busy:false,workspaceRefreshing:false,view:'calendar',api:'/api/workspace',document:{querySelector:()=>null},$:()=>status,isCalendarEditing:()=>false,isTasksEditing:()=>false,isAnnualPlanEditing:()=>false,isWordPracticing:()=>false,isFitnessEditing:()=>false,isPhotographyEditing:()=>false,status:()=>{},render:()=>renderCount++,renderCalendar:()=>calendarCount++,fetch:()=>new Promise(r=>resolve=r)});
 vm.runInContext(workspaceRefresh,c);
 let pending=c.refreshWorkspace();resolve({ok:true,json:async()=>({version:2,workspace:{events:[],tasks:[],notes:[{title:'其他页面的更新'}]}})});await pending;
 assert.equal(renderCount,0);assert.equal(calendarCount,1);assert.equal(c.version,2);
 pending=c.refreshWorkspace();c.isCalendarEditing=()=>true;resolve({ok:true,json:async()=>({version:3,workspace:{events:[],tasks:[]}})});await pending;
 assert.equal(c.version,2);assert.equal(calendarCount,1);
});

test('calendar source refresh retains the host, view, anchor and controls, including error recovery',()=>{
 let mounts=0,disposes=0,updates=0;
 const host={},node={innerHTML:'existing calendar and expanded sidebar'},error={textContent:'',hidden:true};
 const controller={host,view:'week',anchor:'2026-12-09',updateSources(next){updates++;assert.equal(next.events[0].title,'新安排');}};
 const c=vm.createContext({view:'calendar',workspaceCalendar:controller,calendarDeferredRender:false,state:{events:[{title:'新安排'}],tasks:[]},projectCalendar:[],scope:'work',projectCalendarError:'',isCalendarEditing:()=>false,$:id=>id==='results'?node:id==='workspaceCalendar'?host:id==='calendarProjectError'?error:null,disposeWorkspaceCalendar:()=>disposes++,mountWorkspaceCalendar:()=>mounts++,esc:String});
 vm.runInContext(calendarRender,c);c.renderCalendar();c.projectCalendarError='读取失败，保留原数据';c.renderCalendar();assert.equal(error.hidden,false);c.projectCalendarError='';c.renderCalendar();assert.equal(error.hidden,true);
 assert.equal(updates,3);assert.equal(mounts,0);assert.equal(disposes,0);assert.equal(node.innerHTML,'existing calendar and expanded sidebar');assert.equal(controller.view,'week');assert.equal(controller.anchor,'2026-12-09');
 c.isCalendarEditing=()=>true;c.renderCalendar();assert.equal(updates,3);assert.equal(c.calendarDeferredRender,true);
});

test('calendar runtime ignores equivalent sources and refuses replacement while editing, dragging or recovering a save',()=>{
 const source=read('calendar-ui/src/main.jsx');
 const update=source.slice(source.indexOf(' controller.updateSources='),source.indexOf(' controller.open='));
 const options={events:[{id:'one',title:'原日程'}]},base={current:structuredClone(options.events)},locked={current:false},controller={};let writes=0;
 const c=vm.createContext({options,base,locked,controller,entries:input=>structuredClone(input.events),setEvents:()=>writes++});vm.runInContext(update,c);
 assert.equal(controller.updateSources({events:structuredClone(options.events)}),true);assert.equal(writes,0);
 assert.equal(controller.updateSources({events:[{id:'one',title:'更正日程'}]}),true);assert.equal(writes,1);
 for(const field of ['editing','gesturing','gestureScopeOpen','pending','failed']){controller[field]=true;assert.equal(controller.updateSources({events:[]}),false);controller[field]=false;assert.equal(options.events.length,1);}
 locked.current=true;assert.equal(controller.updateExternal([]),false);assert.equal(writes,1);
});

test('equivalent today-feed polling keeps the actual rows and expanded details mounted',async()=>{
 let replacements=0,value='';const node={closest:()=>({}),get innerHTML(){return value;},set innerHTML(next){replacements++;value=next;}};
 const data={date:'2026-11-02',items:[{id:'one',source:'tasks',title:'今天的安排',time:'全天',detail:'备注'}]};
 const c=vm.createContext({view:'calendar',ready:true,scope:'work',esc:String,displayProject:String,$:()=>node,fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setInterval:()=>{},document:{hidden:false,querySelector:()=>({disabled:false}),addEventListener:()=>{}}});
 vm.runInContext(read('today-tasks-page.js'),c);await c.refreshTodayTasks();const first=replacements;
 for(let i=0;i<8;i++)await c.refreshTodayTasks();assert.equal(replacements,first);
 data.items[0].title='更新后的安排';await c.refreshTodayTasks();assert.equal(replacements,first+1);assert.match(node.innerHTML,/更新后的安排/);
});

test('DingTalk status polling preserves the same controls until status or the successful snapshot actually changes',()=>{
 let replacements=0,value='';const host={dataset:{},get innerHTML(){return value;},set innerHTML(next){value=next;replacements++;}};
 const source=read('calendar-adapter.js'),status=source.slice(source.indexOf('function setDingtalkStatus('),source.indexOf("document.addEventListener('click',event=>"));
 const c=vm.createContext({dingtalkStatusRendered:new WeakMap(),dingtalkLastSyncedAt:'2026-11-02T03:00:00Z',$:()=>host,esc:String});vm.runInContext(status,c);
 for(let i=0;i<8;i++)c.setDingtalkStatus('钉钉日历已同步','success');assert.equal(replacements,1);
 c.setDingtalkStatus('读取失败，原数据保留','error');assert.equal(replacements,2);assert.match(value,/2026\/11\/2|2026\/11\/02/);
 c.setDingtalkStatus('读取失败，原数据保留','error');assert.equal(replacements,2);
 c.setDingtalkStatus('钉钉日历已同步','success');assert.equal(replacements,3);
});
