import {validCalendarRule,ruleOccurrencesOn} from './ilamy-recurrence-runtime.mjs';
export function validEventRecurrence(event){
 if(!validCalendarRule(event)||event.allDay!==undefined&&typeof event.allDay!=='boolean'||event.exdates!==undefined&&(!Array.isArray(event.exdates)||event.exdates.length>10000||!event.exdates.every(x=>typeof x==='string'&&x.length<=40&&Number.isFinite(Date.parse(x))))||event.recurrenceId!==undefined&&(typeof event.recurrenceId!=='string'||!Number.isFinite(Date.parse(event.recurrenceId)))||event.uid!==undefined&&(typeof event.uid!=='string'||event.uid.length>200))return false;
 if(event.rrule)return event.recurrence===undefined;
 const rule=event.recurrence;if(rule===undefined)return true;if(typeof event.start!=='string')return false;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 return !!rule&&['daily','weekly','monthly','yearly'].includes(rule.frequency)&&Array.isArray(rule.weekdays)&&rule.weekdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6)&&new Set(rule.weekdays).size===rule.weekdays.length&&(rule.frequency!=='weekly'||rule.weekdays.length>0)&&(rule.until===''||date(rule.until)&&rule.until>=event.start.slice(0,10))&&(!event.end||Date.parse(event.end+'Z')-Date.parse(event.start+'Z')<=31*86400000)&&(event.completedDates===undefined||Array.isArray(event.completedDates)&&event.completedDates.length<=10000&&new Set(event.completedDates).size===event.completedDates.length&&event.completedDates.every(date));
}
export function eventOccurrencesOn(date,items){
 const dayMs=86400000,target=Date.parse(date+'T00:00:00Z'),result=ruleOccurrencesOn(date,items);
 for(const event of items){
  if(event.rrule)continue;
  if(!event.recurrence){if(event.start.slice(0,10)<=date&&(event.allDay&&event.end?.endsWith('T00:00')?event.end.slice(0,10)>date:(event.end||event.start).slice(0,10)>=date))result.push(event);continue;}
  const rule=event.recurrence,base=Date.parse(event.start+'Z'),duration=event.end?Date.parse(event.end+'Z')-base:0,span=Math.min(31,Math.ceil(duration/dayMs)),baseDate=event.start.slice(0,10),baseDay=Number(baseDate.slice(8)),baseMonth=Number(baseDate.slice(5,7));
  for(let back=span;back>=0;back--){const candidate=new Date(target-back*dayMs),key=candidate.toISOString().slice(0,10);if(key<baseDate||rule.until&&key>rule.until)continue;
   const month=candidate.getUTCMonth()+1,last=new Date(Date.UTC(candidate.getUTCFullYear(),month,0)).getUTCDate(),day=candidate.getUTCDate();
   const matches=rule.frequency==='daily'||rule.frequency==='weekly'&&rule.weekdays.includes(candidate.getUTCDay())||rule.frequency==='monthly'&&day===Math.min(baseDay,last)||rule.frequency==='yearly'&&month===baseMonth&&day===Math.min(baseDay,last);
   if(!matches)continue;const start=key+event.start.slice(10),end=event.end?new Date(Date.parse(start+'Z')+duration).toISOString().slice(0,16):'';
   if(key<=date&&(end||start).slice(0,10)>=date)result.push({...event,start,end,occurrenceDate:key,done:(event.completedDates||[]).includes(key)});
  }
 }
 return result.sort((a,b)=>a.start.localeCompare(b.start));
}
