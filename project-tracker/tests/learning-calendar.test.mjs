import test from 'node:test';
import assert from 'node:assert/strict';
import {learningCalendarDays} from '../tasks-ui/src/learning-calendar-model.mjs';
const session = {id:'a', mode:'dictation', total:10, correct:8, durationSeconds:60, startedAt:'2026-11-06T16:00:00Z', completedAt:'2026-11-06T16:01:00Z', completedOn:'2026-11-07'};
const checkin = {id:'2026-11-07:english', kind:'english', date:'2026-11-07', completedAt:'2026-11-07T00:00:00Z'};
test('learning calendar combines saved Beijing practice days and English checkins without duplicate days or rounds', () => {
 const sessions = [session, session, {...session, id:'b', mode:'sentence', total:3, correct:2}];
 const checkins = [checkin, {...checkin, id:'2026-11-06:english', date:'2026-11-06'}, {...checkin, id:'2026-11-05:fitness', kind:'fitness', date:'2026-11-05'}];
 const original = structuredClone({sessions, checkins});
 const days = learningCalendarDays(sessions, checkins, '2026-11-07');
 assert.equal(days.size, 2);
 assert.deepEqual(days.get('2026-11-07'), {date:'2026-11-07', rounds:2, words:10, sentences:3, manual:true});
 assert.equal(days.has('2026-11-05'), false);
 assert.deepEqual({sessions, checkins}, original);
});
test('learning calendar excludes unfinished, invalid and future activity and accepts empty history', () => {
 assert.equal(learningCalendarDays([], [], '2026-11-07').size, 0);
 assert.equal(learningCalendarDays([{...session, total:0}, {...session, completedOn:'2026-11-08'}], [{...checkin, date:'2026-02-30'}], '2026-11-07').size, 0);
});
