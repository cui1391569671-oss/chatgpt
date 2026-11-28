import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {workspaceSiteNavigation} from '../tasks-ui/src/workspace-page-meta.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('workbench.html'),source=page.slice(page.indexOf('function homeMaintenance(today){'),page.indexOf('function openHomeEvent('));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function home(scope='work',tasks=[],events=[],summary=null,maintenance=[]){const context=vm.createContext({scope,ready:true,state:{tasks,events,maintenance,notes:[],checkins:[]},projectSummary:summary,day:()=> '2026-10-28',eventsOn:(_day,rows)=>rows,esc});vm.runInContext(source,context);return context.productHome();}
test('both home spaces use the immersive hero with shortcuts only on the work homepage',()=>{
 for(const scope of ['work','personal']){const html=home(scope);assert.match(html,/data-home-sentence>每日一句/);assert.match(html,/data-home-sentence-status/);assert.match(html,/10月28日 · 星期三/);if(scope==='work')assert.match(html,/data-edit="notes">新建笔记.*查看今日安排/);else assert.doesNotMatch(html,/新建笔记|查看今日安排/);assert.doesNotMatch(html,/site-home-motto|安排好重要的事/);assert.match(html,/data-tasks-root/);assert.doesNotMatch(html,/site-home-stats|data-home-project-count/);assert.doesNotMatch(html,/class="card|homeCalendar|home2-columns|workspace-mosaic/);}
});
test('home daily action stays on the work homepage without sample record text',()=>{
 const work=home('work'),personal=home('personal');assert.match(work,/data-nav="today"/);assert.doesNotMatch(personal,/data-nav="calendar"/);assert.doesNotMatch(work,/DEMO|星河|XH001/);
});
test('site menus retain owning workspace and cover both spaces without duplicate route pairs',()=>{
 const groups=workspaceSiteNavigation();assert.deepEqual(groups.map(g=>g.title),['项目问题','日历','项目资料','记录','英语','生活','形象管理','摄影','娱乐']);const pairs=groups.flatMap(g=>g.items.map(([scope,view])=>scope+':'+view));assert.equal(new Set(pairs).size,pairs.length);for(const group of groups){assert(group.columns.length>=1);assert.deepEqual(group.items,group.columns.flatMap(column=>column.views.map(view=>[column.space,view])));}for(const route of ['work:projects','work:calendar','work:notes','personal:notes','personal:checkins','personal:fitness','personal:maintenance'])assert(pairs.includes(route),route);
});
test('home editing uses the same task editor in both spaces and daily stream polling stays on the two daily-stream surfaces',()=>{
 assert.match(read('tasks-adapter.js'),/editorOnly:view==='home'/);assert.doesNotMatch(read('tasks-adapter.js'),/view==='home'&&scope==='personal'/);const dailyContext=vm.createContext({view:'home'});vm.runInContext(read('today-tasks-page.js').match(/function todayTasksVisible\(\)\{[^}]+\}/)[0],dailyContext);for(const view of ['today','calendar','home','notes','tasks']){dailyContext.view=view;assert.equal(dailyContext.todayTasksVisible(),['today','calendar'].includes(view),view);}assert.doesNotMatch(read('tasks-ui/src/workspace-personal.tsx'),/enhanceHomeLayout/);
});

test('legacy navigation decoration cannot overwrite React navigation state',()=>{
 assert.match(page,/querySelectorAll\('nav button\[data-view\]'\)/);
 assert.doesNotMatch(page,/querySelectorAll\('nav button'\)\.forEach/);
});

test('top navigation only contains the current workspace routes',()=>{for(const scope of ['work','personal']){const groups=workspaceSiteNavigation(scope);assert.deepEqual(groups.map(group=>group.title),scope==='work'?['项目问题','日历','项目资料','记录']:['日历','记录','英语','生活','形象管理','摄影','娱乐']);assert(groups.every(group=>group.columns.length>0&&group.items.every(([space])=>space===scope)));assert(groups.flatMap(group=>group.items).some(([,view])=>view==='notes'));}});

test('project materials own the work routes and budget page uses the source-backed read-only renderer',()=>{const group=workspaceSiteNavigation('work').find(group=>group.title==='项目资料');assert.deepEqual(group.items,[['work','drive'],['work','projectBudget'],['work','projectShipping']]);assert(!workspaceSiteNavigation('personal').some(group=>group.title==='项目资料'));assert.match(page,/view==='projectBudget'\)\{renderProjectBudget\(\);return;/);assert.match(page,/view==='checkins'\)return/);assert.match(page,/view==='projectShipping'\)\{renderShipping\(\);return;/);});

test('private home shows the nearest upcoming maintenance',()=>{
 const maintenance=[{title:'稍后',nextDate:'2026-11-01'},{title:'已经逾期',nextDate:'2026-10-27'},{title:'今天维保',nextDate:'2026-10-28'}];
 const html=home('personal',[],[],null,maintenance);
 assert.match(html,/data-nav="maintenance">今天维保<.*datetime="2026-10-28"/);
 assert.doesNotMatch(html,/已经逾期|稍后/);
 assert.match(home('personal'),/暂无即将到期的维保/);
 assert.doesNotMatch(home('work',[],[],null,maintenance),/下一项维保/);
});
