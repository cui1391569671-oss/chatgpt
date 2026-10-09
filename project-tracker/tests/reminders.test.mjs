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
