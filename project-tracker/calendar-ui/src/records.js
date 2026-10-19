export const BEIJING='Asia/Shanghai';
export function legacyRule(event){
 const rule=event.recurrence;if(!rule)return;
 const start=new Date(event.start+'+08:00'),out={freq:{yearly:0,monthly:1,weekly:2,daily:3}[rule.frequency],dtstart:start.toISOString(),interval:1};if(rule.until)out.until=rule.until+'T23:59:59+08:00';
 if(rule.frequency==='weekly')out.byweekday=rule.weekdays.map(day=>(day+6)%7);
 const day=Number(event.start.slice(8,10));if(rule.frequency==='monthly'||rule.frequency==='yearly'){if(day>28){out.bymonthday=Array.from({length:day-27},(_,i)=>28+i);out.bysetpos=-1;}else out.bymonthday=day;if(rule.frequency==='yearly')out.bymonth=Number(event.start.slice(5,7));}
 return out;
}
export function eventToRecord(event,previous){
 const format=value=>typeof value==='string'?value:event.start?.constructor&&value?.format?value.tz(BEIJING).format('YYYY-MM-DDTHH:mm'):value;
 const start=format(event.start),end=format(event.end);if(!event.title?.trim()||event.title.trim().length>200)throw Error('日程标题应为 1–200 字。');if(!start||!end||end<start)throw Error('请检查日程开始与结束时间。');
 const record={...previous,id:String(event.id),title:event.title.trim(),start,end,location:event.location||'',detail:event.description||'',done:previous?.done||false,allDay:!!event.allDay};
 if(record.location.length>500||record.detail.length>5000)throw Error('地点最多 500 字，备注最多 5000 字。');
 for(const key of ['rrule','exdates','recurrenceId','uid','color','backgroundColor']){if(event[key]!==undefined)record[key]=JSON.parse(JSON.stringify(event[key]));else delete record[key];}
 if(event.data?.images!==undefined)record.images=[...event.data.images];
 delete record.recurrence;return record;
}
export function applyCalendarMutation(records,mutation){
 const known=new Map(records.map(x=>[x.id,x])),deleted=new Set(mutation.deleted.map(x=>String(x.id))),updates=new Map();
 for(const event of [...mutation.added,...mutation.updated]){if(event.data?.source||String(event.id).startsWith('source:'))throw Error('待办和项目问题请从各自页面修改。');const previous=known.get(String(event.id));if(mutation.updated.includes(event)&&!previous)throw Error('该日程已移除，请重新加载核对。');updates.set(String(event.id),eventToRecord(event,previous));}
 for(const event of mutation.deleted)if(event.data?.source||!known.has(String(event.id)))throw Error('该条目不能从日历删除，请核对来源页面。');
 return [...records.filter(x=>!deleted.has(x.id)).map(x=>updates.get(x.id)||x),...mutation.added.filter(x=>!known.has(String(x.id))).map(x=>updates.get(String(x.id)))];
}
