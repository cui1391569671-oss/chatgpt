import {RRule,Weekday} from 'rrule';
const wall=ms=>new Date(ms+8*3600000).toISOString().slice(0,16);
function options(rule){const value={...rule,dtstart:new Date(rule.dtstart)};if(rule.until)value.until=new Date(rule.until);if(rule.byweekday!==undefined)value.byweekday=[rule.byweekday].flat().map(day=>typeof day==='object'?new Weekday(day.weekday,day.n):day);return value;}
export function validCalendarRule(event){
 if(event.rrule===undefined)return true;const rule=event.rrule;
 try{if(!rule||!Number.isInteger(rule.freq)||rule.freq<0||rule.freq>3||!Number.isFinite(Date.parse(rule.dtstart))||rule.interval!==undefined&&(!Number.isInteger(rule.interval)||rule.interval<1||rule.interval>366)||rule.count!==undefined&&(!Number.isInteger(rule.count)||rule.count<1||rule.count>10000)||rule.until&&!Number.isFinite(Date.parse(rule.until))||JSON.stringify(rule).length>10000||event.end&&Date.parse(event.end+'Z')-Date.parse(event.start+'Z')>31*86400000)return false;
 for(const key of ['byhour','byminute','bysecond'])if(Array.isArray(rule[key])&&rule[key].length>1)return false;
 new RRule(options(rule));return true;}catch{return false;}
}
export function ruleOccurrencesOn(date,items){
 const result=[],start=Date.parse(date+'T00:00:00+08:00'),end=start+86400000;
 for(const event of items){if(!event.rrule)continue;try{
  const duration=event.end?Date.parse(event.end+'Z')-Date.parse(event.start+'Z'):0,excluded=new Set((event.exdates||[]).map(value=>Date.parse(value))),uid=event.uid||event.id+'@ilamy.calendar';
  const overrides=new Set(items.filter(x=>x.recurrenceId&&(x.uid||x.id+'@ilamy.calendar')===uid).map(x=>Date.parse(x.recurrenceId)));
  const dates=new RRule(options(event.rrule)).between(new Date(start-Math.min(duration,31*86400000)),new Date(end-1),true,(value,index)=>index<1000);
  for(const occurrence of dates){const ms=occurrence.getTime();if(excluded.has(ms)||overrides.has(ms)||ms+duration<start||event.allDay&&ms+duration<=start)continue;const occurrenceDate=wall(ms).slice(0,10);result.push({...event,start:wall(ms),end:event.end?wall(ms+duration):'',occurrenceDate,done:event.done||(event.completedDates||[]).includes(occurrenceDate)});}
 }catch{}}
 return result;
}
