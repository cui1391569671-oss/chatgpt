let annualPlanController=null;
function isAnnualPlanEditing(){return !!annualPlanController?.isEditing();}
function disposeAnnualPlans(){annualPlanController?.dispose();annualPlanController=null;}
function renderAnnualPlans(){
 if(scope!=='personal')return;
 $('heading').textContent='年度计划';$('add').classList.add('hidden');$('projectPanel').classList.add('hidden');document.body.classList.remove('project-view');document.body.dataset.workspaceView='annualPlans';
 if(annualPlanController){annualPlanController.update(state.annualPlans||[]);return;}
 disposeWorkspaceTasks();disposeWorkspaceCalendar();disposePersonalInfo();stopWordAudio();
 $('content').innerHTML='<p class="muted">年度目标在这里管理起止日期与进度；具体到某天的安排请在生活计划日历中记录。</p><div id="workspaceAnnualPlans" data-ui-root data-ui-owner="annual-plans"></div>';
 if(!window.WorkspaceAnnualPlans){$('workspaceAnnualPlans').textContent='年度计划组件加载失败，请刷新重试。';return;}
 annualPlanController=window.WorkspaceAnnualPlans.mount($('workspaceAnnualPlans'),{rows:state.annualPlans||[],save:async operation=>{
  if(scope!=='personal'||busy||!ready)throw Error('暂时无法保存，请稍后重试。');
  const next=structuredClone(state);next.annualPlans??=[];
  if(operation.type==='save'){const record=operation.record;if(record.id){const index=next.annualPlans.findIndex(x=>x.id===record.id);if(index<0)throw Error('该事项已删除，请刷新后重试。');next.annualPlans[index]={...record};}else next.annualPlans.push({...record,id:crypto.randomUUID()});}
  else if(operation.type==='delete')next.annualPlans=next.annualPlans.filter(x=>x.id!==operation.id);else throw Error('无效操作');
  if(!await change(next))throw Error(saveError||'保存失败，输入已保留。');return state.annualPlans||[];
 }});
}
window.addEventListener('beforeunload',event=>{if(isAnnualPlanEditing()){event.preventDefault();event.returnValue='';}});
