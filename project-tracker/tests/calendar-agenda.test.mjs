import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {agendaDays} from '../calendar-ui/src/agenda-days.js';

const require=createRequire(new URL('../calendar-ui/package.json',import.meta.url));
const dayjs=require('dayjs');
const event=(id,start,end,allDay=false)=>({id,start:dayjs(start),end:dayjs(end),allDay});

test('agenda keeps cross-day entries and exclusive midnight boundaries, including zero-duration records',()=>{
 const entries=[
  event('overnight','2026-11-04T23:30','2026-11-05T01:00'),
  event('midnight-end','2026-11-04T23:00','2026-11-05T00:00'),
  event('zero','2026-11-05T00:00','2026-11-05T00:00'),
  event('all-day','2026-11-04T00:00','2026-11-06T00:00',true)
 ];
 const days=agendaDays(entries,dayjs('2026-11-04'),dayjs('2026-11-06').endOf('day'));
 assert.deepEqual(days.map(day=>day.date.format('YYYY-MM-DD')),['2026-11-04','2026-11-05']);
 assert.deepEqual(days[0].entries.map(row=>row.id),['all-day','midnight-end','overnight']);
 assert.deepEqual(days[1].entries.map(row=>row.id),['all-day','overnight','zero']);
 assert.equal(entries[0].id,'overnight');
});

test('agenda omits empty days and sorts timed entries without changing source identifiers',()=>{
 const entries=[
  event('source:dingtalk:meeting','2026-11-05T15:00','2026-11-05T16:00'),
  event('manual','2026-11-05T09:00','2026-11-05T10:00')
 ];
 const days=agendaDays(entries,dayjs('2026-11-01'),dayjs('2026-11-07').endOf('day'));
 assert.equal(days.length,1);
 assert.deepEqual(days[0].entries.map(row=>row.id),['manual','source:dingtalk:meeting']);
 assert.deepEqual(agendaDays([],dayjs('2026-11-01'),dayjs('2026-11-07')),[]);
});
