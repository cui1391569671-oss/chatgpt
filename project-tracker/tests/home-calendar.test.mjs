import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function nextTasksCard(){'),html.indexOf('function wordTitleButton'));
test('home calendar renders in its own container and shares selected day with calendar tab',()=>{
 const nodes={homeCalendar:{innerHTML:''},results:{innerHTML:''}};
 const c=vm.createContext({disposeWorkspaceCalendar:()=>{},mountWorkspaceCalendar:()=>{},$:id=>nodes[id],view:'home',state:{events:[],tasks:[]},projectCalendar:[],query:'',calendarMonth:'2026-10',selectedDate:'2026-10-13',scope:'work',displayProject:x=>x,Date,CHINA_HOLIDAYS:{},projectCalendarError:'',projectCalendarLoading:false,eventsOn:()=>[],tasksOn:()=>[],issuesOn:()=>[],holidayInfo:()=>null,day:()=> '2026-10-13',esc:x=>String(x),empty:()=>'',taskRows:items=>items.map(t=>'<div>'+t.title+'</div>').join(''),titles:{tasks:'工作待办'}});
 vm.runInContext(readFileSync(new URL('../calendar-adapter.js',import.meta.url),'utf8'),c);vm.runInContext(source,c);c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/id="workspaceCalendar"/);assert.doesNotMatch(nodes.homeCalendar.innerHTML,/calendarAgenda|calendar-side/);assert.equal(nodes.results.innerHTML,'');
 c.selectedDate='2026-10-14';c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/calendar-full-surface/);
 c.view='calendar';c.renderCalendar();assert.match(nodes.results.innerHTML,/workspaceCalendar/);
 c.state.tasks=[{title:'没有期限',done:false},{title:'后续任务',dueDate:'2026-10-20',done:false},{title:'已完成',dueDate:'2026-10-01',done:true},{title:'选中日任务',dueDate:'2026-10-14',done:false},{title:'近期任务',dueDate:'2026-10-16',done:false}];
 const next=c.nextTasksCard();assert.ok(next.indexOf('近期任务')<next.indexOf('后续任务'));assert.ok(next.indexOf('后续任务')<next.indexOf('没有期限'));assert.doesNotMatch(next,/已完成|选中日任务/);assert.match(next,/data-nav="tasks"/);
 c.state.tasks=[];assert.match(c.nextTasksCard(),/data-add-task="true"/);
});
