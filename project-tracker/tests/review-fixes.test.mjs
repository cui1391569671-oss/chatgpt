import test from 'node:test';
import assert from 'node:assert/strict';
import {readTaskView,taskViewUrl,clampTaskPage} from '../tasks-ui/src/task-view-state.mjs';
import {workspacePageMeta} from '../tasks-ui/src/workspace-page-meta.mjs';
import {annualPlanFieldError} from '../annual-plans.mjs';

test('task URLs restore filters and paging without touching layout, other views or the hash',()=>{
 const state={query:'中文 目标 & 完成',status:'open',priority:'high',sorting:[{id:'dueDate',desc:true}],pagination:{pageIndex:2,pageSize:20}};
 const path=taskViewUrl('https://test.local/personal?view=tasks&taskLayout=table&planYear=2026#list',state);
 const url=new URL(path,'https://test.local');assert.equal(url.searchParams.get('view'),'tasks');assert.equal(url.searchParams.get('taskLayout'),'table');assert.equal(url.searchParams.get('planYear'),'2026');assert.equal(url.hash,'#list');assert.deepEqual(readTaskView(url.search),state);
 const cleared=taskViewUrl(url.href,readTaskView(''));assert(!cleared.includes('taskQuery'));assert(!cleared.includes('taskPage='));assert(cleared.includes('taskLayout=table'));
});
test('task route input rejects invalid states and clamps pages after deletion/filter changes',()=>{
 const bad=readTaskView('?taskStatus=games&taskPriority=wrong&taskSort=secret:desc&taskPage=-2&taskPageSize=999','work');assert.equal(bad.status,'all');assert.equal(bad.priority,'all');assert.deepEqual(bad.sorting,[]);assert.deepEqual(bad.pagination,{pageIndex:0,pageSize:10});
 assert.deepEqual(clampTaskPage({pageIndex:3,pageSize:10},21),{pageIndex:2,pageSize:10});assert.equal(clampTaskPage({pageIndex:3,pageSize:10},0).pageIndex,0);assert.equal(clampTaskPage({pageIndex:1,pageSize:10},21).pageIndex,1);
 assert.equal(readTaskView('?taskQuery='+encodeURIComponent('a'.repeat(250))).query.length,200);
});
test('annual field errors identify the first invalid business field instead of focusing progress for missing dates',()=>{
 const plan={title:'测试',category:'learning',startDate:'2026-01-01',endDate:'2026-12-31',progress:0,detail:''};assert.equal(annualPlanFieldError(plan),null);
 for(const [change,field]of [[{title:' '},'title'],[{category:'bad'},'category'],[{startDate:''},'start'],[{startDate:'2026-02-30'},'start'],[{endDate:''},'end'],[{endDate:'2025-12-31'},'end'],[{progress:2.5},'progress'],[{detail:'a'.repeat(5001)},'detail']])assert.equal(annualPlanFieldError({...plan,...change}).field,field);
});
test('page metadata names private aliases and shared account routes in either space',()=>{
 assert.equal(workspacePageMeta('personal','upcoming').label,'即将发售');assert.equal(workspacePageMeta('personal','personalInfo').label,'个人信息');assert.equal(workspacePageMeta('work','personalInfo').title,'个人信息 · 工作台');assert.notEqual(workspacePageMeta('personal','tasks').title,workspacePageMeta('personal','notes').title);assert.equal(workspacePageMeta('personal','vocabularyLibrary').label,'词汇库');
});
