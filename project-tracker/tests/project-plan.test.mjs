import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROJECT_PLAN_SOURCE_ID,parseProjectPlanSheets,normalizeProjectPlanSnapshot} from '../project-plan-sheet.mjs';
import {activeProjectPlanTasks,projectPlanTimeline,projectTaskBar,projectTaskTiming} from '../tasks-ui/src/project-plan-timeline.mjs';
import {workspaceSiteNavigation} from '../tasks-ui/src/workspace-page-meta.mjs';

const sheet={
 sheetId:17,name:'PM001-演示标准任务清单',
 rows:[['演示标题'],['备注'],['标准任务','计划完成日期','状态','阶段','是否适用','模块','计划开始时间','责任部门','其他信息'],
  ['设备试运行','2027-01-01','进行中','实施','是','输送线','2026-12-31','项目部','不要同步'],
  ['联调确认','待定','未开始','实施','是','通用','2027-01-05','项目部'],
  [''],['预验收','','未开始','验收','是','通用','','项目部'],
  ['选配项目','2027-01-11','不适用','验收','否','通用','2027-01-08','项目部']]
};

test('project plan extracts fields by header, retains row numbers and pending tasks, and whitelists source data',()=>{
 const snapshot=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[sheet]);
 assert.equal(snapshot.projects[0].code,'PM001');
 assert.deepEqual(snapshot.projects[0].tasks.map(row=>row.row),[4,5,7,8]);
 assert.deepEqual(snapshot.projects[0].tasks.map(projectTaskTiming).map(t=>t.kind),['range','point','pending','excluded']);
 assert.deepEqual(normalizeProjectPlanSnapshot(snapshot),snapshot);
 assert(!JSON.stringify(snapshot).includes('不要同步'));
 assert.throws(()=>parseProjectPlanSheets('wrong',[sheet]));
 assert.throws(()=>parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[sheet,sheet]));
 assert.throws(()=>parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[{...sheet,rows:[['missing']]}]));
});

test('completed phases disappear while mixed, excluded-only, and unclassified tasks remain',()=>{
 const done=(phase,applicability='是')=>({phase,applicability,status:'已完成'});
 const open=(phase,applicability='是')=>({phase,applicability,status:'未开始'});
 const visible=[done('实施'),open('实施'),open('选配','否'),done(''),open('验收','')];
 assert.deepEqual(activeProjectPlanTasks([
  done('准备'),visible[0],open('准备','否'),...visible.slice(1)
 ]),visible);
 assert.deepEqual(activeProjectPlanTasks([done('准备')]),[]);
});

test('gantt uses inclusive end dates and valid day positions across months and years',()=>{
 const [range,point]=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[sheet]).projects[0].tasks.map(projectTaskTiming);
 const timeline=projectPlanTimeline([range,point]);
 assert.deepEqual(timeline.months.map(tick=>tick.label),['2026年12月','2027年1月']);
 const bar=projectTaskBar(range,timeline);
 assert(Math.abs(parseFloat(bar.width)-200/62)<1e-9);
 assert(parseFloat(projectTaskBar(point,timeline).left)>parseFloat(bar.left)+parseFloat(bar.width));
 assert.equal(projectTaskTiming({start:'2026-02-30',end:'待定'}).kind,'pending');
 assert.equal(projectTaskTiming({start:'2026-01-02',end:'2026-01-01'}).kind,'invalid');
 assert.equal(projectPlanTimeline([{kind:'pending'}]),null);
});

test('five-day ticks restart each month and use the actual final days, including leap years',()=>{
 const timeline=projectPlanTimeline([{kind:'range',start:'2028-02-02',end:'2028-04-05'}]);
 const group=month=>timeline.days.filter(tick=>tick.start.startsWith(month)).map(({day,end})=>[day,end]);
 assert.deepEqual(group('2028-02'),[[1,5],[6,10],[11,15],[16,20],[21,25],[26,29]]);
 assert.deepEqual(group('2028-03').slice(-2),[[26,30],[31,31]]);
 assert.deepEqual(group('2028-04').at(-1),[26,30]);
 const feb26=timeline.days.find(tick=>tick.start==='2028-02-26');
 const march1=timeline.days.find(tick=>tick.start==='2028-03-01');
 assert(Math.abs(feb26.position+feb26.width-march1.position)<1e-9);
 assert.equal(timeline.width,(29+31+30)*18);
});

test('project plan is a work-only navigation route and Apps Script uses the same parser',()=>{
 const group=workspaceSiteNavigation('work').find(group=>group.title==='项目计划');
 assert.equal(group.direct,true);assert.deepEqual(group.items,[['work','projectPlan']]);
 assert(!workspaceSiteNavigation('personal').some(group=>group.items.some(([,view])=>view==='projectPlan')));
 const script=readFileSync(new URL('../google-apps-script/project-plan-sync.gs',import.meta.url),'utf8');
 const parser=readFileSync(new URL('../project-plan-sheet.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
 assert(script.includes(parser));
});
