import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderCalendar(){'),html.indexOf('function wordTitleButton'));
test('home calendar renders in its own container and shares selected day with calendar tab',()=>{
 const nodes={homeCalendar:{innerHTML:''},results:{innerHTML:''}};
 const c=vm.createContext({$:id=>nodes[id],view:'home',state:{events:[],tasks:[]},projectCalendar:[],query:'',calendarMonth:'2026-10',selectedDate:'2026-10-13',scope:'work',Date,CHINA_HOLIDAYS:{},projectCalendarError:'',projectCalendarLoading:false,eventsOn:()=>[],tasksOn:()=>[],issuesOn:()=>[],holidayInfo:()=>null,day:()=> '2026-10-13',esc:x=>String(x),empty:()=>'',titles:{tasks:'工作待办'}});
 vm.runInContext(source,c);c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/2026年10月/);assert.match(nodes.homeCalendar.innerHTML,/2026-10-13 的安排/);assert.equal(nodes.results.innerHTML,'');
 assert.match(nodes.homeCalendar.innerHTML,/data-task-count="0"/);
 c.eventsOn=date=>Array.from({length:date==='2026-10-21'?3:date==='2026-10-22'?12:0},()=>({}));
 c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/--wave-color:hsl\(60,65%,35%\)[^>]*data-schedule-count="3"[^>]*data-date="2026-10-21"/);assert.match(nodes.homeCalendar.innerHTML,/--wave-color:hsl\(0,65%,35%\)[^>]*data-schedule-count="12"[^>]*data-date="2026-10-22"/);
 c.eventsOn=date=>date==='2026-10-21'?[{}]:[];c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/--wave-color:hsl\(120,65%,35%\)[^>]*data-task-count="1"/);
 c.eventsOn=date=>Array.from({length:date==='2026-10-21'?10:date==='2026-10-22'?20:0},()=>({}));c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/--wave-color:hsl\(0,65%,35%\)[^>]*data-task-count="10"/);assert.match(nodes.homeCalendar.innerHTML,/--wave-color:hsl\(0,65%,35%\)[^>]*data-task-count="20"/);
 c.eventsOn=()=>[];

 c.selectedDate='2026-10-14';c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/2026-10-14 的安排/);
 c.view='calendar';c.renderCalendar();assert.match(nodes.results.innerHTML,/2026-10-14 的安排/);
});
