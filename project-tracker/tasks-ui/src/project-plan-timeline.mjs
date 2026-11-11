import {validPlanDate,shiftPlanDate} from '../../annual-plans.mjs';

export function activeProjectPlanTasks(tasks){
 const completed=new Set(),unfinished=new Set();
 for(const {phase,applicability,status} of tasks){
  if(!phase||applicability==='否')continue;
  if(status==='已完成')completed.add(phase);
  else unfinished.add(phase);
 }
 return tasks.filter(({phase})=>!completed.has(phase)||unfinished.has(phase));
}

export function projectTaskTiming(task){
 if(task.applicability==='否')return {kind:'excluded'};
 const start=validPlanDate(task.start)?task.start:'';
 const end=validPlanDate(task.end)?task.end:'';
 if(start&&end)return start<=end?{kind:'range',start,end}:{kind:'invalid'};
 if(start||end)return {kind:'point',date:start||end};
 return {kind:'pending'};
}

export function projectPlanTimeline(timings){
 const dates=timings.flatMap(timing=>timing.kind==='range'?[timing.start,timing.end]:timing.kind==='point'?[timing.date]:[]).sort();
 if(!dates.length)return null;
 const first=new Date(dates[0].slice(0,7)+'-01T00:00:00Z');
 const last=new Date(dates.at(-1).slice(0,7)+'-01T00:00:00Z');
 last.setUTCMonth(last.getUTCMonth()+1);
 const dayMs=86400000;
 const duration=last.valueOf()-first.valueOf();
 const position=(date,center=false)=>100*(Date.parse(date)-first.valueOf()+(center?dayMs/2:0))/duration;
 const months=[],days=[];
 for(const month=new Date(first);month<last;month.setUTCMonth(month.getUTCMonth()+1)){
  const date=month.toISOString().slice(0,7);
  const monthLabel=(month.getUTCMonth()===0||!months.length?month.getUTCFullYear()+'年':'')+(month.getUTCMonth()+1)+'月';
  months.push({label:monthLabel,position:position(date+'-01')});
  const lastDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
  for(let day=1;day<=lastDay;day+=5){
   const start=date+'-'+String(day).padStart(2,'0');
   const end=Math.min(day+4,lastDay);
   days.push({start,day,end,position:position(start),width:100*(end-day+1)*dayMs/duration});
  }
 }
 return {months,days,position,width:duration/dayMs*18};
}

export function projectTaskBar(timing,timeline){
 if(!timeline)return null;
 if(timing.kind==='point')return {left:timeline.position(timing.date,true)+'%'};
 if(timing.kind!=='range')return null;
 const left=timeline.position(timing.start);
 return {left:left+'%',width:timeline.position(shiftPlanDate(timing.end,1))-left+'%'};
}
