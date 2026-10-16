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
 const description=document.createElement('p');description.className='wb-page-description';description.id='pageDescription';document.querySelector('.header-title').append(description);
 const syncDescription=()=>{const text=({home:scope==='work'?'查看日程安排，跟进工作计划。':'安排日常计划，记录生活与学习。',tasks:'查看并管理当前空间的待办事项。',projects:'按项目跟进问题、计划日期与处理进度。',notes:scope==='work'?'集中记录项目信息和工作笔记。':'记录想法与日常笔记。',drive:'查看项目供货、运输与设备信息。',completedGames:'记录游戏、影视作品与个人感想。',vocabulary:'管理词汇，跟进英语学习。',wardrobe:'整理衣服，保存季节穿搭。',maintenance:'记录设备与后续维保安排。'})[view]||'';if(description.textContent!==text)description.textContent=text;};
 syncDescription();
 const controller=window.WorkspaceShell.mount(root,header,{
  scope,date:$('today').textContent,snapshot,canLeave,
  navigate(next){if(!canLeave())return false;view=next;query='';render();history.replaceState(null,'',location.pathname+'?view='+encodeURIComponent(next));return true;},
  notifications:()=>$('notificationToggle').click(),account:()=>$('accountToggle').click()
 });
 document.body.classList.add('shadcn-workbench');
 const observer=new MutationObserver(()=>{syncDescription();controller.update?.();});
 for(const node of [$('heading'),$('notificationBadge'),$('notificationToggle')])observer.observe(node,{attributes:true,childList:true,subtree:true});
}
mountWorkbenchShell();
window.WorkspacePrimitives?.install();
