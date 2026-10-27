import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarIcs} from '../calendar-ui/src/calendar-export.js';
const date=(day,utc)=>({format:()=>day,utc:()=>({format:()=>utc})});
test('calendar export preserves raw recurrence properties, all-day dates and escaped content',()=>{
 const event={id:'stable-id',title:'测试,项目;日程',description:'第一行\n第二行',allDay:true,start:date('20261027','20261026T160000Z'),end:date('20261028','20261027T160000Z')};
 const calls=[],text=calendarIcs([event],(point,source)=>{calls.push([point,source]);return ['RRULE:FREQ=WEEKLY','EXDATE;VALUE=DATE:20261103',null];},'20261027T000000Z');
 assert.equal(calls[0][1],event);assert.equal(calls[0][0],'ical:vevent-properties');assert.equal(text.match(/BEGIN:VEVENT/g).length,1);assert.ok(text.includes('UID:stable-id@ilamy.calendar\r\nDTSTART;VALUE=DATE:20261027\r\nDTEND;VALUE=DATE:20261028'));assert.ok(text.includes('SUMMARY:测试\\,项目\\;日程'));assert.ok(text.includes('DESCRIPTION:第一行\\n第二行'));assert.ok(text.includes('RRULE:FREQ=WEEKLY\r\nEXDATE;VALUE=DATE:20261103'));assert.equal(text.endsWith('END:VCALENDAR'),true);
 const timed=calendarIcs([{...event,uid:'original-uid',allDay:false}],()=>[],'20261027T000000Z');assert.ok(timed.includes('UID:original-uid\r\nDTSTART:20261026T160000Z\r\nDTEND:20261027T160000Z'));assert.equal(timed.includes('VALUE=DATE'),false);
});
