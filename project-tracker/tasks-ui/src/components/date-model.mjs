export function localDateStamp(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
export function beijingDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');
}
export function dateGrid(month){const first=new Date(month.getFullYear(),month.getMonth(),1,12),offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i-offset+1,12));}
export function dateAllowed(value,min,max){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&localDateStamp(new Date(value+'T12:00:00'))===value&&(!min||value>=min)&&(!max||value<=max);}
