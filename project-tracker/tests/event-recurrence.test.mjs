import test from 'node:test';
import assert from 'node:assert/strict';
import {eventOccurrencesOn,validEventRecurrence} from '../event-recurrence.mjs';
import {validWorkspace} from './helpers/session-worker.mjs';
const base={id:'repeat',title:'例会',start:'2026-01-31T09:00',end:'2026-01-31T10:00',location:'',detail:'',done:false};
const repeat=(frequency,patch={})=>({...base,recurrence:{frequency,weekdays:[1,3],until:'',...patch}});
test('monthly occurrences clamp to month-end and return to original day next month',()=>{
 const event=repeat('monthly');assert.equal(eventOccurrencesOn('2026-02-28',[event])[0].start,'2026-02-28T09:00');assert.equal(eventOccurrencesOn('2026-03-31',[event]).length,1);assert.equal(eventOccurrencesOn('2026-03-28',[event]).length,0);
});
test('yearly leap-day recurrence clamps and recovers on leap years',()=>{
 const event={...repeat('yearly'),start:'2024-02-29T08:30',end:''};assert.equal(eventOccurrencesOn('2025-02-28',[event]).length,1);assert.equal(eventOccurrencesOn('2028-02-29',[event]).length,1);assert.equal(eventOccurrencesOn('2028-02-28',[event]).length,0);
});
test('weekly repeats only selected weekdays, bounds are inclusive and completion is per occurrence',()=>{
 const event={...repeat('weekly',{until:'2026-02-04'}),completedDates:['2026-02-02']};
 assert.equal(eventOccurrencesOn('2026-01-28',[event]).length,0);assert.equal(eventOccurrencesOn('2026-02-02',[event])[0].done,true);assert.equal(eventOccurrencesOn('2026-02-03',[event]).length,0);assert.equal(eventOccurrencesOn('2026-02-04',[event])[0].done,false);assert.equal(eventOccurrencesOn('2026-02-09',[event]).length,0);
});
test('daily cross-midnight events preserve duration and original event ID',()=>{
 const event={...repeat('daily'),start:'2026-02-01T23:30',end:'2026-02-02T00:30'};const items=eventOccurrencesOn('2026-02-02',[event]);assert.equal(items.length,2);assert.equal(items[0].end,'2026-02-02T00:30');assert.equal(items[1].end,'2026-02-03T00:30');assert.ok(items.every(x=>x.id==='repeat'));assert.equal(event.start,'2026-02-01T23:30');
});
test('workspace accepts recurring series and rejects invalid weekdays/end dates/duration',()=>{
 const workspace=event=>({tasks:[],notes:[],events:[event]});assert.equal(validWorkspace(workspace(repeat('daily'))),true);
 for(const event of [repeat('weekly',{weekdays:[]}),repeat('weekly',{weekdays:[7]}),repeat('daily',{until:'2026-02-30'}),repeat('daily',{until:'2025-01-01'}),{...repeat('daily'),end:'2026-06-01T09:00'}])assert.equal(validEventRecurrence(event),false);
});
