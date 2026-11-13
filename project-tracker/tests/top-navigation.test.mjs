import test from 'node:test';import assert from 'node:assert/strict';import {workspaceNavigation,workspaceNavView,workspacePageMeta,workspaceSiteNavigation} from '../tasks-ui/src/workspace-page-meta.mjs';
test('shared work navigation and search cover current routes without duplicate or retired entries',()=>{const ids=workspaceNavigation('work').flatMap(g=>g.views);assert.deepEqual(ids,['home','projects','projectPlan','tasks','today','calendar','drive','projectBudget','projectShipping','notes']);assert.equal(new Set(ids).size,ids.length);for(const id of ids)assert.ok(workspacePageMeta('work',id).label);assert(!ids.includes('requirements'));});
test('personal navigation keeps grouped route coverage and aliases select their canonical menu',()=>{const groups=workspaceNavigation('personal'),ids=groups.flatMap(g=>g.views);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,16);for(const id of ['calendar','annualPlans','notes','checkins','vocabulary','fitness','completedGames','wardrobe','maintenance','photography'])assert(ids.includes(id));assert.equal(workspaceNavView('vocabularyLibrary'),'vocabulary');assert.equal(workspaceNavView('notes'),'notes');assert.equal(workspacePageMeta('personal','notes').label,'我的笔记');});

test('calendar and task routes are reachable once in each workspace navigation',()=>{
 for(const scope of ['work','personal']){
  const groups=workspaceSiteNavigation(scope),calendar=groups.find(group=>group.title==='日历');
  assert.deepEqual(calendar.items.map(([,view])=>view),scope==='work'?['calendar','today','tasks']:['calendar','today']);
  for(const view of ['calendar','today','tasks'])assert.deepEqual(groups.flatMap(group=>group.items).filter(([,id])=>id===view),[[scope,view]]);
 }
});
