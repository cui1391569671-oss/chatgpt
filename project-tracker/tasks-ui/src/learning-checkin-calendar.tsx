import {useRef, useState} from 'react';
import {Check, ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {WorkspaceIconButton} from '@/components/workspace-icon-action';
import {dateGrid, dateAllowed, localDateStamp} from '@/components/date-model.mjs';
import {learningCalendarDays} from './learning-calendar-model.mjs';

export function LearningCheckinCalendar({sessions, checkins, today}) {
 const [month, setMonth] = useState(today.slice(0, 7));
 const [selected, setSelected] = useState(today);
 const grid = useRef<HTMLDivElement>(null);
 const days = learningCalendarDays(sessions, checkins, today);
 const monthDate = new Date(month + '-01T12:00:00');
 const dates = dateGrid(monthDate);
 const activity = days.get(selected);
 const monthlyDays = [...days.keys()].filter(date => date.startsWith(month)).length;
 const title = monthDate.getFullYear() + '年' + (monthDate.getMonth() + 1) + '月';
 const allowed = (date: string) => dateAllowed(date, '1900-01-01', today);

 function moveMonth(offset: number) {
  const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1, 12);
  const date = localDateStamp(next);
  if (!allowed(date)) return;
  setMonth(date.slice(0, 7));
  setSelected(date);
 }
 function moveFocus(event: React.KeyboardEvent<HTMLButtonElement>, date: Date) {
  const steps = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay()};
  const step = steps[event.key];
  if (step === undefined) return;
  event.preventDefault();
  const next = new Date(date);
  next.setDate(next.getDate() + step);
  const stamp = localDateStamp(next);
  if (!allowed(stamp)) return;
  setMonth(stamp.slice(0, 7));
  setSelected(stamp);
  requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>('[data-date="' + stamp + '"]')?.focus());
 }
 return <section className='learning-calendar card' aria-label='学习打卡日历'>
  <div className='learning-calendar-title'><h2>打卡日历</h2><Button variant='ghost' onClick={() => {setMonth(today.slice(0, 7)); setSelected(today);}}>今天</Button></div>
  <p className='muted learning-calendar-caption'>完成一轮练习即点亮当天，已有英语打卡同步显示。</p>
  <div className='learning-calendar-month'>
   <WorkspaceIconButton label='打卡日历上个月' icon={ChevronLeft} disabled={month === '1900-01'} onClick={() => moveMonth(-1)}/>
   <strong aria-live='polite'>{title}</strong>
   <WorkspaceIconButton label='打卡日历下个月' icon={ChevronRight} disabled={month >= today.slice(0, 7)} onClick={() => moveMonth(1)}/>
  </div>
  <div className='workspace-date-grid' ref={grid} role='grid' aria-label={title + '学习打卡'}>
   <div role='row' className='workspace-date-week'>{['日','一','二','三','四','五','六'].map(day => <span role='columnheader' key={day}>周{day}</span>)}</div>
   {Array.from({length: 6}, (_, week) => <div role='row' className='workspace-date-week' key={week}>
    {dates.slice(week * 7, week * 7 + 7).map(date => {
     const stamp = localDateStamp(date), record = days.get(stamp);
     return <button type='button' role='gridcell' className='learning-calendar-day' key={stamp} data-date={stamp}
      aria-label={stamp + (record ? '，已打卡，' + record.rounds + '轮练习' : '，暂无学习打卡')}
      aria-selected={selected === stamp} aria-current={stamp === today ? 'date' : undefined}
      data-outside={stamp.slice(0, 7) !== month || undefined} disabled={!allowed(stamp)} tabIndex={selected === stamp ? 0 : -1}
      onClick={() => setSelected(stamp)} onKeyDown={event => moveFocus(event, date)}>
      <span>{date.getDate()}</span><span className='learning-calendar-mark' aria-hidden='true'>{record && <Check size={12}/>}</span>
     </button>;
    })}
   </div>)}
  </div>
  <p className='learning-calendar-count'>本月打卡 <strong>{monthlyDays}</strong> 天</p>
  <div className='learning-calendar-detail' aria-live='polite'>
   <h3>{selected}</h3>
   {activity ? <><p>完成 {activity.rounds} 轮 · 单词 {activity.words} · 句子 {activity.sentences}</p>{activity.manual && <p className='muted'>已记录英语打卡</p>}</> : <p className='muted'>当天暂无学习打卡</p>}
  </div>
 </section>;
}
