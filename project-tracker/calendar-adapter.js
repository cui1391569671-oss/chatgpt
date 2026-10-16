// ilamy owns the calendar and its standard event form. This adapter owns only
// workbench routing, scope isolation and the existing cloud persistence boundary.
let workspaceCalendar=null,workspaceCalendarView='month',workspaceCalendarAnchor='',calendarDeferredRender=false;
function isCalendarEditing(){return !!(workspaceCalendar?.editing||workspaceCalendar?.pending||workspaceCalendar?.failed);}
function disposeWorkspaceCalendar(){if(!workspaceCalendar)return;workspaceCalendarView=workspaceCalendar.view;workspaceCalendarAnchor=workspaceCalendar.anchor;workspaceCalendar.dispose();workspaceCalendar=null;}
function openCalendarEvent(id){
 if(!ready||busy||conflict)return;if(!workspaceCalendar){toast('日历尚未加载，请刷新后重试。');return;}
 if(id){const event=workspaceCalendar.api?.events.find(x=>String(x.id)===id)||workspaceCalendar.api?.rawEvents.find(x=>String(x.id)===id);if(event)workspaceCalendar.api.onEventClick(event);else toast('日程已移除或不在当前日期范围内，请核对日历。');}else workspaceCalendar.open();
}
function mountWorkspaceCalendar(items,tasks,issues){
 const host=$('workspaceCalendar');if(!host)return;
 if(!window.IlamyCalendarRuntime){host.innerHTML='<p class="form-error" role="alert">日历加载失败，请刷新页面重试。</p>';return;}
 workspaceCalendar=window.IlamyCalendarRuntime.mount(host,{events:items,tasks,issues,projectName:displayProject,holiday:holidayInfo,selectedDate,view:workspaceCalendarView,anchor:workspaceCalendarAnchor,
  onIdle:()=>{if(calendarDeferredRender&&!isCalendarEditing()){calendarDeferredRender=false;render();}},
  openSource:(source,id)=>{if(source==='projects'){view='projects';render();}else edit('tasks',id);},
  persist:async mutation=>{if(busy||!ready)return {ok:false,error:'云端暂不可用，请稍后重试。'};try{const next=structuredClone(state);next.events=applyCalendarMutation(state.events,mutation);const ok=await change(next);return {ok,error:saveError,events:ok?state.events:undefined};}catch(error){return {ok:false,error:error.message};}}
 });
}

if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(workspaceCalendar?.pending||workspaceCalendar?.failed){event.preventDefault();event.returnValue='';}});
