/* exported disposeFitness, renderFitness */
let fitnessController=null;
function isFitnessEditing(){return !!fitnessController?.isEditing();}
function disposeFitness(){fitnessController?.dispose();fitnessController=null;}
function renderFitness(){
 if(scope!=='personal')return;
 $('heading').textContent='居家健身';$('add').classList.add('hidden');$('projectPanel').classList.add('hidden');document.body.dataset.workspaceView='fitness';document.body.classList.remove('project-view');
 if(fitnessController){fitnessController.update(state.fitnessSessions||[],state.fitnessProfiles?.[0]||null);return;}
 disposeWordPractice();disposeWorkspaceTasks();disposeWorkspaceCalendar();disposePersonalInfo();disposeAnnualPlans();stopWordAudio();
 $('content').innerHTML='<div id="workspaceFitness" data-ui-root data-ui-owner="fitness"></div>';
 if(!window.WorkspaceFitness){$('workspaceFitness').textContent='健身页面加载失败，请刷新重试。';return;}
 fitnessController=window.WorkspaceFitness.mount($('workspaceFitness'),{sessions:state.fitnessSessions||[],profile:state.fitnessProfiles?.[0]||null,today:day,async saveProfile(profile){
  if(scope!=='personal'||busy||!ready)throw Error('暂时无法保存，请稍后重试。');
  const next=structuredClone(state);next.fitnessProfiles=[profile];
  if(!await change(next))throw Error(saveError||'档案未保存，填写内容已保留。');
  toast('训练档案已保存，安排已更新');return state.fitnessProfiles[0];
 },async save(record){
  if(scope!=='personal'||busy||!ready)throw Error('暂时无法保存，请稍后重试。');
  const next=structuredClone(state);next.fitnessSessions??=[];
  if(!next.fitnessSessions.some(x=>x.id===record.id))next.fitnessSessions.push({...record,completedOn:day()});
  if(!await change(next))throw Error(saveError||'训练未保存，完成状态仍保留，请重试。');
  toast('训练记录已保存');return state.fitnessSessions||[];
 }});
}
window.addEventListener('beforeunload',event=>{if(isFitnessEditing()){event.preventDefault();event.returnValue='';}});
