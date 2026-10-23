let workspaceTasks=null,tasksEditing=false;
function isTasksEditing(){return tasksEditing||!!workspaceTasks?.isEditing?.();}
function disposeWorkspaceTasks(){const node=document.getElementById('workspaceTasks');if(node)window.WorkspaceTasks?.unmount(node);workspaceTasks=null;}
function mountWorkspaceTasks(){const node=document.getElementById('workspaceTasks');if(!node)return;if(!window.WorkspaceTasks){node.textContent='待办组件加载失败，请刷新页面重试。';return;}const workspaceTasksBridge={rows:state.tasks,scope,games:gameRecords(state),openGame:id=>{if(!gameRecords(state).some(g=>g.id===id))return;view='completedGames';render();history.replaceState(null,'',location.pathname+'?view=completedGames');edit('completedGames',id);},today:day(),onEditingChange:value=>{tasksEditing=value;if(!value&&view==='home'&&scope==='personal')queueMicrotask(()=>{if(view==='home'&&!isTasksEditing())renderCalendar();});},save:async operation=>{
 let next=structuredClone(state);const ids=new Set(operation.ids||[]);
 if(operation.type==='migrateGames'){if(scope!=='personal')throw Error('仅能整理私人游戏待办。');next=migrateGameTasks(state,operation.choices);}
 else if(operation.type==='save'){const record={...operation.record};if(scope==='work')delete record.mediaRecordId;if(record.mediaRecordId&&!gameRecords(state).some(g=>g.id===record.mediaRecordId)&&state.tasks.find(t=>t.id===record.id)?.mediaRecordId!==record.mediaRecordId)throw Error('关联游戏已移除，请重新选择。');if(record.mediaRecordId||!record.id)record.taskType='task';record.title=record.title.trim();if(!record.title)throw Error('请输入待办标题');if(record.id){const index=next.tasks.findIndex(t=>t.id===record.id);if(index<0)throw Error('该待办已被移除，请关闭编辑面板后刷新。');next.tasks[index]={...next.tasks[index],...record};}else next.tasks.push({...record,id:crypto.randomUUID()});}
 else if(operation.type==='delete')next.tasks=next.tasks.filter(t=>!ids.has(t.id));
 else if(operation.type==='toggle'||operation.type==='complete')next.tasks=next.tasks.map(t=>ids.has(t.id)?{...t,done:operation.type==='complete'?true:!t.done}:t);
 else throw Error('不支持的待办操作');
 if(!await change(next))throw Error(saveError||'保存失败，输入已保留，请重试。');renderTaskBadge();workspaceTasksBridge.games=gameRecords(state);return state.tasks;
 }};workspaceTasks=window.WorkspaceTasks.mount(node,workspaceTasksBridge);}
function openWorkspaceTask(id){if(!ready||busy||conflict)return;if(view!=='tasks'&&!(view==='home'&&scope==='personal'&&workspaceTasks)){view='tasks';render();}setTimeout(()=>workspaceTasks?.open?.(id),0);}
window.addEventListener('beforeunload',event=>{if(isTasksEditing()){event.preventDefault();event.returnValue='';}});
