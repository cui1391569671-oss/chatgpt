import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function dueTaskNotifications('),html.indexOf('function renderNotifications('));
const reminders=vm.runInNewContext(source+';dueTaskNotifications');
test('reminders include only unfinished overdue, today and tomorrow tasks',()=>{
 const tasks=[{id:'later',dueDate:'2026-10-11'},{id:'tomorrow',dueDate:'2026-10-10'},{id:'today',dueDate:'2026-10-09'},{id:'late',dueDate:'2026-10-08'},{id:'done',dueDate:'2026-10-08',done:true},{id:'undated',dueDate:''}];
 assert.equal(JSON.stringify(reminders(tasks,'2026-10-09').map(x=>[x.task.id,x.label])),JSON.stringify([['late','已逾期'],['today','今天到期'],['tomorrow','明天到期']]));
 tasks[2].done=true;assert.equal(reminders(tasks,'2026-10-09').length,2);
});
test('reminder cutoff handles year and leap-month boundaries',()=>{
 assert.equal(reminders([{dueDate:'2027-01-01'}],'2026-12-31')[0].label,'明天到期');
 assert.equal(reminders([{dueDate:'2028-02-29'}],'2028-02-28')[0].label,'明天到期');
 assert.equal(reminders([{dueDate:'2026-03-01'}],'2026-02-28')[0].label,'明天到期');
});

test('home overdue cards exclude today, tomorrow and completed records without changing source routes',()=>{const select=vm.runInNewContext(source+';overdueTaskNotifications');const rows=[{id:'project:1',scope:'projects',dueDate:'2026-10-20'},{id:'work:t1',scope:'work',recordId:'t1',dueDate:'2026-10-28'},{id:'today',dueDate:'2026-10-29'},{id:'tomorrow',dueDate:'2026-10-30'},{id:'done',dueDate:'2026-10-10',done:true}];const items=select(rows,'2026-10-29');assert.deepEqual(Array.from(items,item=>item.id),['project:1','work:t1']);assert.equal(items[0],rows[0]);assert.equal(items[1].recordId,'t1');assert.equal(rows.length,5);});

test('shell snapshot supplies the home card data and loading state through the canonical bridge',()=>{
 const select=vm.runInNewContext(source+';overdueTaskNotifications'),records=[{id:'work:t1',scope:'work',dueDate:'2026-10-20'},{id:'future',dueDate:'2026-11-01'}];
 const expression=html.match(/const snapshot=\(\)=>\((\{view,heading:[^\n]+)\);/)[1];
 const snapshot=vm.runInNewContext('('+expression+')',{view:'home',$:id=>id==='heading'?{textContent:'工作概览'}:{disabled:false},overdueTaskNotifications:select,currentReminderTasks:()=>records,day:()=> '2026-10-29',remindersLoading:false,remindersLoaded:true,remindersError:'',busy:false,conflict:false});
 assert.equal(snapshot.overdue.length,1);assert.equal(snapshot.overdue[0].id,'work:t1');assert.equal(snapshot.remindersLoaded,true);assert.equal(snapshot.ready,true);
});
