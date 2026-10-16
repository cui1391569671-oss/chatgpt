/* shadcn-admin shell bridge: business state remains owned by workbench.html. */
function mountWorkbenchShell(){
 if(!window.WorkspaceShell)return;
 const legacy=document.querySelector('.shell>aside');
 legacy.dataset.legacyNavigation='';
 const root=document.createElement('div');root.id='workbenchShell';root.dataset.shellRoot='';
 const header=document.createElement('div');header.id='workbenchTopbar';header.dataset.shellRoot='';
 legacy.after(root,header);
 const canLeave=()=>{if(isCalendarEditing()||isTasksEditing()||document.querySelector('dialog[open]')){toast('请先关闭编辑面板或处理未保存修改。');return false;}return true;};
 const snapshot=()=>({view,heading:$('heading').textContent,count:currentReminderTasks().length,ready:!$('notificationToggle').disabled});
 const syncLayout=()=>{document.body.dataset.workspaceView=view;document.querySelector('main').setAttribute('aria-label',$('heading').textContent);const add=$('add'),toolbar=$('content').querySelector('.filters');if(['notes','maintenance','completedGames'].includes(view)&&add&&toolbar&&add.parentElement!==toolbar)toolbar.append(add);};
 syncLayout();
 const controller=window.WorkspaceShell.mount(root,header,{
  scope,date:$('today').textContent,snapshot,canLeave,
  navigate(next){if(!canLeave())return false;view=next;query='';render();history.replaceState(null,'',location.pathname+'?view='+encodeURIComponent(next));return true;},
  notifications:()=>$('notificationToggle').click(),account:()=>$('accountToggle').click()
 });
 document.body.classList.add('shadcn-workbench');
 const observer=new MutationObserver(()=>{syncLayout();controller.update?.();});
 for(const node of [$('heading'),$('notificationBadge'),$('notificationToggle')])observer.observe(node,{attributes:true,childList:true,subtree:true});
}
mountWorkbenchShell();
window.WorkspacePrimitives?.install();
