export function agendaDays(events,start,end){
 const ordered=[...events].sort((a,b)=>
  Number(!!b.allDay)-Number(!!a.allDay)||a.start.valueOf()-b.start.valueOf()
 );
 const days=[];
 for(let date=start.startOf('day');!date.isAfter(end);date=date.add(1,'day')){
  const nextDay=date.add(1,'day');
  const entries=ordered.filter(event=>
   event.start.isBefore(nextDay)&&(event.end.isAfter(date)||event.start.isSame(date))
  );
  if(entries.length)days.push({date,entries});
 }
 return days;
}
