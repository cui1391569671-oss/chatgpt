import {validPracticeSession} from '../../word-practice.mjs';
import {validCheckin} from '../../checkin-records.mjs';

export function learningCalendarDays(sessions, checkins, today) {
 const days = new Map();
 const sessionIds = new Set();
 function day(date) {
  if (!days.has(date)) days.set(date, {date, rounds: 0, words: 0, sentences: 0, manual: false});
  return days.get(date);
 }
 for (const session of sessions) {
  if (!validPracticeSession(session) || session.completedOn > today || sessionIds.has(session.id)) continue;
  sessionIds.add(session.id);
  const activity = day(session.completedOn);
  activity.rounds += 1;
  if (session.mode === 'sentence') activity.sentences += session.total;
  else activity.words += session.total;
 }
 for (const checkin of checkins) {
  if (validCheckin(checkin) && checkin.kind === 'english' && checkin.date <= today) day(checkin.date).manual = true;
 }
 return days;
}
