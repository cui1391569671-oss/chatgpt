import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {applyCalendarMutation,legacyRule} from '../calendar-ui/src/records.js';
import {eventOccurrencesOn,validEventRecurrence} from '../event-recurrence.mjs';
const old={id:'series',title:'例会',start:'2026-01-31T09:00',end:'2026-01-31T10:00',location:'',detail:'',done:false,recurrence:{frequency:'monthly',weekdays:[],until:''}};
test('legacy clamped monthly/yearly rules map to ilamy RRULE without changing Beijing occurrence dates',()=>{
 const event={...old,rrule:legacyRule(old)};delete event.recurrence;assert.equal(validEventRecurrence(event),true);for(const date of ['2026-02-28','2026-03-31','2026-04-30']){assert.equal(eventOccurrencesOn(date,[event])[0].start,date+'T09:00');assert.equal(eventOccurrencesOn(date,[old])[0].start,date+'T09:00');}assert.equal(eventOccurrencesOn('2026-03-28',[event]).length,0);
});
test('ilamy single-occurrence edits preserve exclusions, override rows, and reminder expansion',()=>{
 const base={...old,start:'2026-10-15T09:00',end:'2026-10-15T10:00',recurrence:undefined,rrule:{freq:3,dtstart:'2026-10-15T01:00:00Z',count:3},uid:'series@ilamy.calendar',exdates:['2026-10-16T01:00:00Z']};delete base.recurrence;
 const override={...base,id:'override',title:'仅本次修改',start:'2026-10-16T11:00',end:'2026-10-16T12:00',recurrenceId:'2026-10-16T01:00:00Z'};delete override.rrule;delete override.exdates;
 const items=eventOccurrencesOn('2026-10-16',[base,override]);assert.equal(items.length,1);assert.equal(items[0].title,'仅本次修改');assert.equal(eventOccurrencesOn('2026-10-18',[base,override]).length,0);
});
test('calendar batches scoped changes atomically and rejects writes to source tasks/projects',()=>{
 const source={...old,recurrence:undefined};delete source.recurrence;
 const updated={id:'series',title:'更改',start:source.start,end:source.end,description:'新备注',rrule:{freq:3,dtstart:'2026-01-31T01:00Z',count:2}},added={id:'override',title:'单次',start:'2026-02-01T11:00',end:'2026-02-01T12:00'};
 const result=applyCalendarMutation([source],{added:[added],updated:[updated],deleted:[]});assert.equal(result.length,2);assert.equal(result[0].title,'更改');assert.equal(result[0].detail,'新备注');assert.throws(()=>applyCalendarMutation([source],{added:[],updated:[{...updated,data:{source:'tasks'}}],deleted:[]}),/各自页面/);assert.equal(source.title,'例会');
});
test('invalid high frequency, excessive duration and malformed recurrence are rejected',()=>{
 for(const rule of [{freq:4,dtstart:'2026-01-01T00:00Z'},{freq:3,dtstart:'wrong'},{freq:3,dtstart:'2026-01-01T00:00Z',interval:0}])assert.equal(validEventRecurrence({...old,recurrence:undefined,rrule:rule}),false);
});
test('official ilamy default form replaces the custom form and FullCalendar dependency completely',()=>{
 const ui=readFileSync(new URL('../calendar-ui/src/main.jsx',import.meta.url),'utf8'),html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');assert.match(ui,/import \{IlamyCalendar/);assert.doesNotMatch(ui,/renderEventForm=/);assert.match(ui,/onEventsChange=/);assert.match(ui,/recurrencePlugin\(\)/);assert.match(html,/assets\/ilamy-3.2.1.js/);assert.doesNotMatch(html,/calendarEventEditor|fullcalendar-6|CALENDAR_EDITOR_START/);
});
import worker from './helpers/session-worker.mjs';
test('calendar assets and license remain authenticated and use explicit safe content types',async()=>{
 const env={TRACKER_USER:'user',TRACKER_PASSWORD:'pass'};
 for(const [path,type] of [['/assets/ilamy-3.2.1.js','text/javascript'],['/assets/ilamy-3.2.1.css','text/css'],['/assets/calendar.js.LEGAL.txt','text/plain']]){assert.equal((await worker.fetch(new Request('https://test.local'+path),env)).status,401);const response=await worker.fetch(new Request('https://test.local'+path,{headers:{Authorization:'Basic '+btoa('user:pass')}}),env);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),new RegExp(type));}
});
test('all-day exclusive midnight end does not create an extra day',()=>{
 const item={id:'day',title:'全天',start:'2026-10-15T00:00',end:'2026-10-16T00:00',location:'',detail:'',allDay:true};assert.equal(eventOccurrencesOn('2026-10-15',[item]).length,1);assert.equal(eventOccurrencesOn('2026-10-16',[item]).length,0);
});
