import {projectCalendarItems} from './calendar-sources.mjs';
import {eventOccurrencesOn} from './event-recurrence.mjs';
export function todayTasks(state,scope,date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})){
 const workspace=state[scope==='work'?'workWorkspace':'workspace']||{},items=[];
 for(const task of workspace.tasks||[])if(task.dueDate===date)items.push({source:'tasks',id:task.id,title:task.title,detail:task.detail||'',done:!!task.done,status:task.done?'已完成':'未完成',priority:task.priority||'normal',time:'全天'});
 if(scope==='work')for(const [index,issue] of projectCalendarItems(state).entries())if(issue.date===date)items.push({source:'projects',id:String(index),title:issue.title,detail:[issue.reason,issue.note].filter(Boolean).join('\n'),project:issue.project,done:false,status:issue.status,time:'全天'});
 for(const event of eventOccurrencesOn(date,workspace.events||[]))items.push({source:'events',id:event.id,title:event.title,detail:event.detail||'',done:!!event.done,status:event.done?'已完成':'未完成',start:event.start,end:event.end||'',time:event.allDay?'全天':event.start.slice(0,10)<date?'跨日':event.start.slice(11,16)});
 items.sort((a,b)=>(a.start||date).localeCompare(b.start||date)||a.title.localeCompare(b.title,'zh-CN'));return {date,items};
}
