import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../today-tasks-page.js',import.meta.url),'utf8');
function setup(fetch){const node={innerHTML:'',closest:s=>s==='.calendar-today-panel'?{}:null};const button={disabled:false};const c=vm.createContext({view:'calendar',ready:true,scope:'work',esc:String,displayProject:String,$:()=>node,fetch,setInterval:()=>{},document:{hidden:false,querySelector:()=>button,addEventListener:()=>{}}});vm.runInContext(source,c);return {c,node,button};}
test('calendar sidebar reuses scoped today feed without moving its refresh into the page toolbar',async()=>{let url;const {c,node,button}=setup(async u=>{url=u;return {ok:true,json:async()=>({date:'2026-10-30',items:[{id:'t1',source:'tasks',title:'核对任务',time:'全天',status:'未完成'}]})};});const html=c.todayTasksPage('calendar');assert.match(html,/今日任务/);assert.doesNotMatch(html,/data-page-toolbar|返回概览/);await c.refreshTodayTasks();assert.equal(url,'/api/today-tasks?scope=work');assert.match(node.innerHTML,/<button type="button" class="site-task-title" data-edit="tasks" data-id="t1">核对任务<\/button>/);assert.doesNotMatch(node.innerHTML,/查看待办|class="actions"/);assert.doesNotMatch(node.innerHTML,/<h2>日历安排/);assert.equal(button.disabled,false);c.view='notes';assert.equal(c.todayTasksVisible(),false);});
test('failed sidebar refresh keeps prior rows and provides retry feedback',async()=>{let fail=false;const {c,node}=setup(async()=>{if(fail)throw Error('网络不可用');return {ok:true,json:async()=>({date:'2026-10-30',items:[{id:'e',source:'events',title:'已有安排',status:'未完成',time:'09:00'}]})};});await c.refreshTodayTasks();fail=true;await c.refreshTodayTasks();assert.match(node.innerHTML,/已有安排/);assert.match(node.innerHTML,/role="alert"/);assert.match(node.innerHTML,/刷新重试/);});
test('leaving calendar before response does not rewrite another page; empty state is explicit',async()=>{let resolve;const {c,node}=setup(()=>new Promise(r=>{resolve=r;}));const pending=c.refreshTodayTasks();c.view='notes';node.innerHTML='笔记内容';resolve({ok:true,json:async()=>({date:'2026-10-30',items:[]})});await pending;assert.equal(node.innerHTML,'笔记内容');c.view='calendar';c.renderTodayTaskResults();assert.match(node.innerHTML,/今天的日历暂无安排/);});


test('DingTalk rows open their read-only source details from the title',async()=>{
 const {c,node}=setup(async()=>({ok:true,json:async()=>({date:'2026-10-30',items:[{id:'dd-1',source:'dingtalk',title:'今日会议',time:'09:00',status:'只读'}]})}));
 await c.refreshTodayTasks();assert.match(node.innerHTML,/data-dingtalk-event="dd-1"/);assert.match(node.innerHTML,/钉钉会议/);assert.doesNotMatch(node.innerHTML,/data-edit=/);
});
