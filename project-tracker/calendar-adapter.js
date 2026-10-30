/* exported disposeWorkspaceCalendar, openCalendarEvent, mountWorkspaceCalendar */
// ilamy owns the calendar and its standard event form. This adapter owns only
// workbench routing, scope isolation and the existing cloud persistence boundary.
let workspaceCalendar=null,workspaceCalendarView='month',workspaceCalendarAnchor='',calendarDeferredRender=false;
function isCalendarEditing(){return !!(workspaceCalendar?.gesturing||workspaceCalendar?.gestureScopeOpen||workspaceCalendar?.editing||workspaceCalendar?.pending||workspaceCalendar?.failed);}
function disposeWorkspaceCalendar(){stopDingtalkRefresh();if(!workspaceCalendar)return;workspaceCalendarView=workspaceCalendar.view;workspaceCalendarAnchor=workspaceCalendar.anchor;workspaceCalendar.dispose();workspaceCalendar=null;}
function openCalendarEvent(id){
 if(!ready||busy||conflict)return;if(!workspaceCalendar){toast('日历尚未加载，请刷新后重试。');return;}
 if(id){const event=workspaceCalendar.api?.events.find(x=>String(x.id)===id)||workspaceCalendar.api?.rawEvents.find(x=>String(x.id)===id);if(event)workspaceCalendar.api.onEventClick(event);else toast('日程已移除或不在当前日期范围内，请核对日历。');}else workspaceCalendar.open();
}
function mountWorkspaceCalendar(items,tasks,issues){
 const host=$('workspaceCalendar');if(!host)return;
 if(!window.IlamyCalendarRuntime){host.innerHTML='<p class="form-error" role="alert">日历加载失败，请刷新页面重试。</p>';return;}
 workspaceCalendar=window.IlamyCalendarRuntime.mount(host,{scope,events:items,tasks,issues,externalEvents:scope==='work'?dingtalkEvents:[],projectName:displayProject,holiday:holidayInfo,selectedDate,view:workspaceCalendarView,anchor:workspaceCalendarAnchor,
  onIdle:()=>{if(calendarDeferredRender&&!isCalendarEditing()){calendarDeferredRender=false;render();}},
  openSource:(source,id)=>{if(source==='dingtalk'){showDingtalkEvent(id);return;}if(source==='projects'){view='projects';render();}else edit('tasks',id);},
  persist:async mutation=>{if(busy||!ready)return {ok:false,error:'云端暂不可用，请稍后重试。'};try{const next=structuredClone(state);next.events=applyCalendarMutation(state.events,mutation);const ok=await change(next,{renderPage:false});if(ok){refreshTodayTasks();renderTaskBadge();workspaceTasks?.update?.(state.tasks);}return {ok,error:saveError,events:ok?state.events:undefined};}catch(error){return {ok:false,error:error.message};}}
 });
 if(scope==='work')startDingtalkRefresh();
}

if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(isCalendarEditing()){event.preventDefault();event.returnValue='';}});

let dingtalkEvents=[],dingtalkTimer=null,dingtalkRequest=null,dingtalkGeneration=0;
function stopDingtalkRefresh(){clearInterval(dingtalkTimer);dingtalkTimer=null;dingtalkRequest?.abort();dingtalkRequest=null;dingtalkGeneration++;document.removeEventListener('visibilitychange',refreshDingtalkCalendar);}
function startDingtalkRefresh(){stopDingtalkRefresh();refreshDingtalkCalendar();dingtalkTimer=setInterval(refreshDingtalkCalendar,30000);document.addEventListener('visibilitychange',refreshDingtalkCalendar);}
async function refreshDingtalkCalendar(){
 if(document.hidden||dingtalkRequest||isCalendarEditing()||!workspaceCalendar)return;
 const generation=dingtalkGeneration;dingtalkRequest=new AbortController();
 try{const response=await fetch('/api/dingtalk-calendar?scope=work',{cache:'no-store',signal:dingtalkRequest.signal});if(!response.ok)throw Error('读取失败');const payload=await response.json();if(!Array.isArray(payload.events))throw Error('格式无效');if(generation!==dingtalkGeneration||!workspaceCalendar)return;
  if(isCalendarEditing())return;
  const changed=JSON.stringify(dingtalkEvents)!==JSON.stringify(payload.events);dingtalkEvents=payload.events;if(changed)workspaceCalendar.updateExternal?.(dingtalkEvents);
  setDingtalkStatus(!payload.connected?'钉钉日历尚未同步':payload.stale?'钉钉日历暂未更新，已保留上次日程；请检查同步电脑和授权。':'钉钉主日历 · 最近同步 '+new Date(payload.lastSyncedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}));
 }catch(error){if(error.name!=='AbortError'&&generation===dingtalkGeneration)setDingtalkStatus('钉钉日历读取失败，已保留上次显示内容，将自动重试。');}finally{if(generation===dingtalkGeneration)dingtalkRequest=null;}
}
function setDingtalkStatus(message){const help=$('workspaceCalendar')?.querySelector('.ilamy-help');if(!help)return;help.textContent=message+' · 钉钉日程只读';help.setAttribute('role','status');}

function showDingtalkEvent(id){
 const item=dingtalkEvents.find(event=>event.id===id)||todayTaskData?.items.find(event=>event.source==='dingtalk'&&event.id===id);if(!item)return;let dialog=$('dingtalkEventDetails');if(!dialog){dialog=document.createElement('dialog');dialog.id='dingtalkEventDetails';dialog.innerHTML='<h2></h2><p data-dingtalk-time></p><p data-dingtalk-location></p><p data-dingtalk-detail></p><p class="muted">来自钉钉主日历，请在钉钉中修改或取消。</p><button type="button">关闭</button>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();}
 dialog.querySelector('h2').textContent=item.title;dialog.querySelector('[data-dingtalk-time]').textContent=(item.allDay?'全天 · ':'北京时间 · ')+item.start.replace('T',' ')+' 至 '+item.end.replace('T',' ');dialog.querySelector('[data-dingtalk-location]').textContent=item.location;dialog.querySelector('[data-dingtalk-detail]').textContent=item.detail;if(window.WorkspacePrimitives?.openDialog)window.WorkspacePrimitives.openDialog(dialog);else toast('详情组件尚未加载，请稍后重试。');
}
