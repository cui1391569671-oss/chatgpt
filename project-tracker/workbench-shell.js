/* exported disposePersonalInfo, renderPersonalInfo */
/* shadcn-admin shell bridge: business state remains owned by workbench.html. */
let personalInfoController=null;
function isPersonalInfoEditing(){return !!personalInfoController?.isEditing();}
function disposePersonalInfo(){personalInfoController?.dispose();personalInfoController=null;}
function renderPersonalInfo(){
 if(personalInfoController)return;
 disposeWorkspaceTasks();disposeWorkspaceCalendar();stopWordAudio();
 document.body.dataset.workspaceView='personalInfo';document.body.classList.remove('project-view');
 $('heading').textContent='个人信息';$('add').classList.add('hidden');$('projectPanel').classList.add('hidden');$('status').classList.add('hidden');
 $('content').innerHTML='<div id="workspacePersonalInfo" data-ui-root data-ui-owner="personal-info"></div>';
 personalInfoController=window.WorkspacePersonalInfo.mount($('workspacePersonalInfo'));
}
function mountWorkbenchShell(){
 if(!window.WorkspaceShell)return;
 const legacy=document.querySelector('.shell>aside');
 legacy.dataset.legacyNavigation='';
 const root=document.createElement('div');root.id='workbenchShell';root.dataset.shellRoot='';
 const header=document.createElement('div');header.id='workbenchTopbar';header.dataset.shellRoot='';
 legacy.after(root,header);
 const canLeave=()=>{if(isCalendarEditing()||isTasksEditing()||isAnnualPlanEditing()||isWordPracticing()||isFitnessEditing()||isPersonalInfoEditing()||document.querySelector('dialog[open],[data-slot=dialog-content]')||$('projectFrame')?.contentDocument?.querySelector('dialog[open],[data-slot=dialog-content]')){toast('请先关闭编辑面板或处理未保存修改。');return false;}return true;};
 const snapshot=()=>({view,heading:$('heading').textContent,overdue:overdueTaskNotifications(currentReminderTasks(),day()),remindersLoading,remindersLoaded,remindersError,busy:busy||conflict,ready:!$('notificationToggle').disabled});
 const actions=document.createElement('div');actions.id='workspacePageActions';actions.className='wb-page-actions';
 const nativeActions=document.createElement('div');nativeActions.id='workspaceNativeActions';nativeActions.className='wb-page-toolbar';
 const reactActions=document.createElement('div');reactActions.id='workspaceReactActions';
 const projectActions=document.createElement('div');projectActions.id='workspaceProjectActions';
 actions.append(nativeActions,reactActions,projectActions);header.append(actions);
 const moved=new Map();
 const restore=()=>{for(const [node,entry] of moved){if(entry.marker.isConnected)entry.marker.replaceWith(node);else node.remove();node.className=entry.className;}moved.clear();};
 window.WorkspacePageActions={restore};
 const move=node=>{if(!node||moved.has(node)||node.closest('#workspacePageActions'))return;const marker=document.createComment('page action position');node.before(marker);moved.set(node,{marker,className:node.className});if(!node.matches('button,label'))node.classList.add('wb-page-toolbar');nativeActions.append(node);};
 const syncLayout=()=>{
  document.body.dataset.workspaceView=view;document.querySelector('main').setAttribute('aria-label',$('heading').textContent);
  projectActions.hidden=view!=='projects';nativeActions.hidden=view==='projects';reactActions.hidden=view==='projects';
  for(const [node,entry] of moved)if(!entry.marker.isConnected){node.remove();moved.delete(node);}
  const add=$('add');if(add&&!add.classList.contains('hidden')&&!add.closest('#workspacePageActions'))move(add);
  for(const node of $('content').querySelectorAll('[data-page-toolbar],.filters,.wardrobe-tabs,.media-controls,.wb-segment-page-tabs')){if(view==='notes'&&node.matches('.filters'))continue;move(node);}
 };
 const frame=$('projectFrame');let projectDialogObserver=null;
 frame.addEventListener('load',()=>{
  projectDialogObserver?.disconnect();projectActions.inert=false;
  const doc=frame.contentDocument,toolbar=doc?.querySelector('.toolbar');if(!toolbar)return;
  // Compile legacy inline handlers in their original realm before adopting nodes.
  for(const button of toolbar.querySelectorAll('button'))for(const key of ['onclick','onmousedown']){const handler=button[key];if(handler){button.removeAttribute(key);button[key]=handler;}}
  toolbar.className='wb-page-toolbar';toolbar.querySelector('.toolbar-row')?.setAttribute('class','wb-page-toolbar');toolbar.dataset.uiOwner='project-actions';
  projectActions.replaceChildren(toolbar);
  const lockProjectActions=()=>{projectActions.inert=!!doc.querySelector('dialog[open],[data-slot=dialog-content]');};
  projectDialogObserver=new MutationObserver(lockProjectActions);projectDialogObserver.observe(doc.body,{attributes:true,attributeFilter:['open'],childList:true,subtree:true});lockProjectActions();doc.querySelector('.backlink')?.remove();syncLayout();
 });
 syncLayout();
 const controller=window.WorkspaceShell.mount(root,header,{
  scope,date:$('today').textContent,snapshot,canLeave,openReminder,refreshReminders,
  navigate(next){if(!canLeave())return false;view=next;query='';render();history.replaceState(null,'',location.pathname+'?view='+encodeURIComponent(next));return true;},
  notifications:()=>{if(!frame.contentDocument?.querySelector('dialog[open],[data-slot=dialog-content]'))$('notificationToggle').click();},account:()=>{if(!frame.contentDocument?.querySelector('dialog[open],[data-slot=dialog-content]'))$('accountToggle').click();}
 },actions);
 $('personalInfoLink').onclick=()=>{if(isCalendarEditing()||isTasksEditing()||isAnnualPlanEditing()||isWordPracticing()||isFitnessEditing())return;$('accountCenter').close();if(!canLeave())return;view='personalInfo';query='';render();history.replaceState(null,'',location.pathname+'?view=personalInfo');};
 document.body.classList.add('shadcn-workbench');
 const observer=new MutationObserver(()=>{syncLayout();controller.update?.();});
 observer.observe($('content'),{childList:true,subtree:true});
 for(const node of [$('heading'),$('notificationBadge'),$('notificationToggle')])observer.observe(node,{attributes:true,childList:true,subtree:true});
}
mountWorkbenchShell();
window.WorkspacePrimitives?.install();
