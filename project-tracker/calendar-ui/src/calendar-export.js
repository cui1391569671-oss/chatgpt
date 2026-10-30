// Adapted from @ilamy/calendar 3.2.1's MIT-licensed iCalendar exporter.
// Keep raw recurring records and the plugin's RRULE/exception properties.
export function calendarIcs(events,collect,stamp){
 const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n').replaceAll('\r','');
 const date=(value,allDay)=>allDay?value.format('YYYYMMDD'):value.utc().format('YYYYMMDD[T]HHmmss[Z]');
 const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ilamy//ilamy Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:我的工作台'];
 for(const event of events){const suffix=event.allDay?';VALUE=DATE':'';rows.push('BEGIN:VEVENT','UID:'+(event.uid||event.id+'@ilamy.calendar'),'DTSTART'+suffix+':'+date(event.start,event.allDay),'DTEND'+suffix+':'+date(event.end,event.allDay),'SUMMARY:'+escape(event.title));if(event.description)rows.push('DESCRIPTION:'+escape(event.description));if(event.location)rows.push('LOCATION:'+escape(event.location));rows.push(...collect('ical:vevent-properties',event).filter(value=>typeof value==='string'),'DTSTAMP:'+stamp,'CREATED:'+stamp,'LAST-MODIFIED:'+stamp,'STATUS:CONFIRMED','SEQUENCE:0','TRANSP:OPAQUE','END:VEVENT');}
 rows.push('END:VCALENDAR');return rows.join('\r\n');
}
