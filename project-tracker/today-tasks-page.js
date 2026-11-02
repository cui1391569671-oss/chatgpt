/* exported todayTasksPage */
let todayTaskData=null,todayTaskLoading=false,todayTaskError='';
const todayTaskRendered=new WeakMap();
function todayTasksVisible(){return view==='today'||view==='calendar';}
function todayTasksPage(embedded=false){
 const sidebar=embedded==='calendar';
 return '<section class="'+(sidebar?'calendar-today-panel':embedded?'card work-home-today':'')+'" aria-label="'+(sidebar?'今日任务':'今日计划')+'"><div class="card-head">'+(embedded?'<h2>'+(sidebar?'今日任务':'今日计划')+'</h2>':'')+'<div class="actions"'+(sidebar?'':' data-page-toolbar')+'>'+(!embedded?'<button class="btn" data-workspace-icon="back" aria-label="返回概览" data-nav="home">返回概览</button>':'')+'<button class="btn" data-workspace-icon="refresh" aria-label="刷新今日计划" data-refresh-today '+(todayTaskLoading?'disabled':'')+'>刷新</button></div></div><div id="todayTaskResults" aria-live="polite"></div></section>';
}
function todayTaskAction(item){return item.source==='dingtalk'?'data-dingtalk-event="'+esc(item.id)+'"':item.source==='tasks'?'data-edit="tasks" data-id="'+esc(item.id)+'"':item.source==='projects'?'data-nav="projects"':'data-today-calendar="'+esc(todayTaskData.date)+'"';}
function renderTodayTaskResults(){
 const node=$('todayTaskResults');if(!node)return;
 const signature=JSON.stringify([todayTaskData,todayTaskError,!todayTaskData&&todayTaskLoading,(todayTaskData?.items||[]).map(item=>item.project?displayProject(item.project):'')]);if(todayTaskRendered.get(node)===signature)return;todayTaskRendered.set(node,signature);
 const expanded=new Set(Array.from(node.querySelectorAll?.('details[open][data-today-details]')||[]).map(element=>element.dataset.todayDetails));
 const focused=node.contains?.(document.activeElement)?document.activeElement?.closest?.('details[data-today-details]')?.dataset.todayDetails:null;
 let html='';if(todayTaskError)html+='<p class="form-error" role="alert">'+esc(todayTaskError)+' 当前内容保留，可点击刷新重试。</p>';
 if(!todayTaskData){node.innerHTML=html+(todayTaskLoading?'<div class="card empty" role="status">正在读取今日计划…</div>':'');return;}
 const rows=todayTaskData.items,sidebar=!!node.closest('.calendar-today-panel');
 html+='<p class="muted today-task-date">'+esc(todayTaskData.date)+' · '+rows.length+' 项</p><section class="'+(sidebar||node.closest('.work-home-today')?'':'card ')+'today-task-group" aria-label="今日日历清单">';
 html+=rows.length?rows.map(item=>{
  const key=item.source+':'+item.id,source={tasks:'待办',projects:'项目问题',events:'日程',dingtalk:'钉钉会议 · 只读'}[item.source]||'日历';
  const status=item.status&&!['未完成','只读'].includes(item.status)?'<span class="tag">'+esc(item.status)+'</span>':'';
  const details=item.detail||item.project?'<details class="today-task-details" data-today-details="'+esc(key)+'"'+(expanded.has(key)?' open':'')+'><summary data-workspace-icon="details" aria-label="查看'+esc(item.title)+'详情">详情</summary><div>'+(item.project?'<p>'+esc(displayProject(item.project))+'</p>':'')+(item.detail?'<p class="today-task-detail">'+esc(item.detail)+'</p>':'')+'</div></details>':'';
  return '<article class="row"><div class="row-content"><div class="row-title"><button type="button" class="site-task-title" '+todayTaskAction(item)+'>'+esc(item.title)+'</button></div><div class="row-meta"><span>'+esc(item.time)+'</span><span>'+source+'</span>'+status+'</div>'+details+'</div></article>';
 }).join(''):'<div class="empty">今天的日历暂无安排。</div>';
 node.innerHTML=html+'</section>';
 if(focused)Array.from(node.querySelectorAll?.('details[data-today-details]')||[]).find(element=>element.dataset.todayDetails===focused)?.querySelector('summary')?.focus({preventScroll:true});
}
async function refreshTodayTasks(){if(!ready||todayTaskLoading||!todayTasksVisible())return;todayTaskLoading=true;const refresh=document.querySelector('[data-refresh-today]');if(refresh)refresh.disabled=true;renderTodayTaskResults();try{const response=await fetch('/api/today-tasks?scope='+scope,{cache:'no-store'});if(!response.ok)throw Error('读取失败（'+response.status+'）');todayTaskData=await response.json();todayTaskError='';}catch(error){todayTaskError=error.message||'今日计划读取失败';}finally{todayTaskLoading=false;if(todayTasksVisible()){renderTodayTaskResults();const refresh=document.querySelector('[data-refresh-today]');if(refresh)refresh.disabled=false;}}}
setInterval(()=>{if(!document.hidden)refreshTodayTasks();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTodayTasks();});
