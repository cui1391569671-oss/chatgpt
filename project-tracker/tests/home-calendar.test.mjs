import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderCalendar(){'),html.indexOf('function wordTitleButton'));
test('home calendar renders in its own container and shares selected day with calendar tab',()=>{
 const nodes={homeCalendar:{innerHTML:''},results:{innerHTML:''}};
 const c=vm.createContext({$:id=>nodes[id],view:'home',state:{events:[],tasks:[]},projectCalendar:[],query:'',calendarMonth:'2026-10',selectedDate:'2026-10-13',scope:'work',Date,CHINA_HOLIDAYS:{},projectCalendarError:'',projectCalendarLoading:false,eventsOn:()=>[],tasksOn:()=>[],issuesOn:()=>[],holidayInfo:()=>null,day:()=> '2026-10-13',esc:x=>String(x),empty:()=>'',titles:{tasks:'工作待办'}});
 vm.runInContext(source,c);c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/2026年10月/);assert.match(nodes.homeCalendar.innerHTML,/2026-10-13 的安排/);assert.equal(nodes.results.innerHTML,'');
 c.selectedDate='2026-10-14';c.renderCalendar();assert.match(nodes.homeCalendar.innerHTML,/2026-10-14 的安排/);
 c.view='calendar';c.renderCalendar();assert.match(nodes.results.innerHTML,/2026-10-14 的安排/);
});
