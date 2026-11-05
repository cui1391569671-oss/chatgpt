import {useIlamyCalendarContext} from '@ilamy/calendar';
import {agendaDays} from './agenda-days.js';

export function CalendarAgenda({openSource,focus}){
 const api=useIlamyCalendarContext();
 const {start,end}=api.currentRange;
 const days=agendaDays(api.getEventsForDateRange(start,end),start,end);
 return <section className="ilamy-agenda" aria-label="本周日程">
  <p className="ilamy-agenda-range">{start.format('M月D日')} – {end.format('M月D日')}</p>
  {days.length===0&&<p className="ilamy-agenda-empty">这段时间没有安排</p>}
  {days.map(({date,entries})=><section className="ilamy-agenda-day" key={date.format('YYYY-MM-DD')}>
   <h2>{date.format('M月D日 dddd')}</h2>
   <ul>{entries.map(event=>{
    const continuing=event.start.isBefore(date);
    const time=event.allDay?'全天':continuing?'跨日':event.start.format('HH:mm');
    return <li key={event.id}><button type="button" className="ilamy-agenda-event" onClick={click=>{
     if(event.data?.source){
      openSource(event.data.source,event.data.recordId);
     }else{
      focus.capture(click.currentTarget);
      api.onEventClick(event);
     }
    }}>
     <span className="ilamy-agenda-time">{time}</span>
     <span className="ilamy-agenda-title">
      <span className="ilamy-agenda-marker" aria-hidden="true" style={{backgroundColor:event.backgroundColor}}/>
      <span className={event.data?.done?'ilamy-completed-event':undefined}>{event.title}</span>
     </span>
    </button></li>;
   })}</ul>
  </section>)}
 </section>;
}
