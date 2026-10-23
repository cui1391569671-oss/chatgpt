import React,{useEffect,useRef,useState} from 'react';
import {dayjs,useIlamyCalendarContext} from '@ilamy/calendar';
export function useEventGesture(controller){
 const active=useRef(null),[preview,setPreview]=useState(null),[scope,setScope]=useState(null);
 const apply=(event,updates)=>{const api=controller.api;if(api.getEventManager(event)?.applyEdit)setScope({event,updates});else api.updateEvent(event.id,updates);};
 useEffect(()=>{
  let timer;
  const cellAt=(x,y)=>[...document.querySelectorAll('#workspaceCalendar [data-view="month"][data-start]')].find(el=>{const r=el.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});
  const show=g=>{const cell=cellAt(g.x,g.y);if(!cell)return;const delta=dayjs(cell.dataset.start).tz('Asia/Shanghai').startOf('day').diff(g.origin,'day');let start=g.event.start,end=g.event.end;if(g.edge==='start')start=start.add(delta,'day');else if(g.edge==='end')end=end.add(delta,'day');else{start=start.add(delta,'day');end=end.add(delta,'day');}if(end.isBefore(start))return;g.updates={start,end};setPreview({title:g.event.title,start,end});};
  const move=e=>{const g=active.current;if(!g||e.pointerId!==g.pointerId)return;g.x=e.clientX;g.y=e.clientY;if(!g.moved&&Math.hypot(g.x-g.x0,g.y-g.y0)<6)return;g.moved=true;e.preventDefault();show(g);const box=document.querySelector('#workspaceCalendar .ilamy-calendar-box')?.getBoundingClientRect(),direction=box&&g.y>=box.top&&g.y<=box.bottom?(g.x<box.left+28?-1:g.x>box.right-28?1:0):0;if(direction!==g.direction){clearTimeout(timer);g.direction=direction;if(direction){const turn=()=>{if(active.current!==g)return;const next=controller.api.currentDate.add(direction,'month');controller.anchor=next.format('YYYY-MM-DD');controller.api.setCurrentDate(next);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active.current===g)show(g);}));timer=setTimeout(()=>{show(g);turn();},900);};timer=setTimeout(turn,700);}}};
  const finish=e=>{const g=active.current;if(!g||e.type==='pointerup'&&e.pointerId!==g.pointerId)return;clearTimeout(timer);active.current=null;controller.gesturing=false;setPreview(null);document.body.style.cursor=g.cursor;document.body.style.userSelect=g.userSelect;if(e.type==='pointerup'&&g.moved&&g.updates){controller.suppressClickUntil=Date.now()+300;apply(g.event,g.updates);}else controller.onGestureIdle?.();};
  const cancel=()=>finish({type:'cancel'}),key=e=>{if(e.key==='Escape'&&active.current){e.preventDefault();cancel();}};
  window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key);
  return()=>{cancel();clearTimeout(timer);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);};
 },[controller]);
 controller.gestureScopeOpen=!!scope;
 function begin(e,event,edge){if(e.button!==0||controller.api?.view!=='month'||controller.pending||controller.failed||scope||active.current)return;e.preventDefault();e.stopPropagation();const cell=[...document.querySelectorAll('#workspaceCalendar [data-view="month"][data-start]')].find(el=>{const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom;});if(!cell)return;active.current={event,edge,pointerId:e.pointerId,origin:dayjs(cell.dataset.start).tz('Asia/Shanghai').startOf('day'),x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,cursor:document.body.style.cursor,userSelect:document.body.style.userSelect};controller.gesturing=true;document.body.style.cursor=edge?'ew-resize':'grabbing';document.body.style.userSelect='none';}
 function key(e,event,edge){if(controller.pending||controller.failed||scope)return;if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const field=edge==='start'?'start':'end',next=event[field].add(e.key==='ArrowLeft'?-1:1,'day');if(field==='start'?next.isAfter(event.end):next.isBefore(event.start))return;apply(event,{[field]:next});}
 controller.clearGestureScope=()=>setScope(null);
 useEffect(()=>{controller.setGestureScope?.(scope);},[scope,controller]);
 return {begin,key,preview};
}
export function EventBar({event,segment,controller,gesture}){const month=useIlamyCalendarContext().view==='month';return React.createElement(React.Fragment,null,<span className={'ilamy-event-pill '+(event.data?.done?'ilamy-completed-event':'')} style={{backgroundColor:event.backgroundColor,color:event.color}} onPointerDown={e=>{if(month)gesture.begin(e,event,null);}} onClick={e=>{if(Date.now()<(controller.suppressClickUntil||0)){e.preventDefault();e.stopPropagation();}else if(month){e.stopPropagation();controller.api.onEventClick(event);}}}>
{month&&segment.isStart&&<button type="button" className="ilamy-resize-handle ilamy-resize-start" aria-label={'调整开始日期：'+event.title} onPointerDown={e=>gesture.begin(e,event,'start')} onKeyDown={e=>gesture.key(e,event,'start')} onClick={e=>e.stopPropagation()}/>}
{event.allDay?'':event.start.tz('Asia/Shanghai').format('HH:mm')+' '}{event.title}
{month&&segment.isEnd&&<button type="button" className="ilamy-resize-handle ilamy-resize-end" aria-label={'调整结束日期：'+event.title} onPointerDown={e=>gesture.begin(e,event,'end')} onKeyDown={e=>gesture.key(e,event,'end')} onClick={e=>e.stopPropagation()}/>}
</span>);}

export function GestureScope({controller}){
 const api=useIlamyCalendarContext(),[scope,setScope]=useState(null);
 useEffect(()=>{controller.setGestureScope=setScope;return()=>{controller.setGestureScope=null;};},[controller]);
 if(!scope)return null;
 return api.getEventManager(scope.event)?.renderSlot?.('event-mutation-scope',{event:scope.event,operation:'edit',resolve:value=>{api.applyScopedEdit(scope.event,scope.updates,value);controller.clearGestureScope();setScope(null);},cancel:()=>{controller.clearGestureScope();setScope(null);queueMicrotask(()=>controller.onGestureIdle?.());}});
}
