let workspaceTasks=null,tasksEditing=false;
function isTasksEditing(){return tasksEditing||!!workspaceTasks?.isEditing?.();}
function disposeWorkspaceTasks(){const node=document.getElementById('workspaceTasks');if(node)window.WorkspaceTasks?.unmount(node);workspaceTasks=null;}
function mountWorkspaceTasks(){const node=document.getElementById('workspaceTasks');if(!node)return;if(!window.WorkspaceTasks){node.textContent='待办组件加载失败，请刷新页面重试。';return;}workspaceTasks=window.WorkspaceTasks.mount(node,{rows:state.tasks,scope,today:day(),onEditingChange:value=>{tasksEditing=value;},save:async operation=>{
 const next=structuredClone(state),ids=new Set(operation.ids||[]);
 if(operation.type==='save'){const record=operation.record;record.title=record.title.trim();if(!record.title)throw Error('请输入待办标题');if(record.id){const index=next.tasks.findIndex(t=>t.id===record.id);if(index<0)throw Error('该待办已被移除，请关闭编辑面板后刷新。');next.tasks[index]={...next.tasks[index],...record};}else next.tasks.push({...record,id:crypto.randomUUID()});}
 else if(operation.type==='delete')next.tasks=next.tasks.filter(t=>!ids.has(t.id));
 else if(operation.type==='toggle'||operation.type==='complete')next.tasks=next.tasks.map(t=>ids.has(t.id)?{...t,done:operation.type==='complete'?true:!t.done}:t);
 else throw Error('不支持的待办操作');
 if(!await change(next))throw Error(saveError||'保存失败，输入已保留，请重试。');renderTaskBadge();return state.tasks;
 }});}
function openWorkspaceTask(id){if(!ready||busy||conflict)return;if(view!=='tasks'){view='tasks';render();}setTimeout(()=>workspaceTasks?.open?.(id),0);}
window.addEventListener('beforeunload',event=>{if(isTasksEditing()){event.preventDefault();event.returnValue='';}});
