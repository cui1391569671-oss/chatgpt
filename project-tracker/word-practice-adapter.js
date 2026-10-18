let wordPracticeController=null;
function isWordPracticing(){return !!wordPracticeController?.isEditing();}
function disposeWordPractice(){wordPracticeController?.dispose();wordPracticeController=null;}
function renderWordPractice(){
 $('heading').textContent='单词练习';$('add').classList.add('hidden');$('projectPanel').classList.add('hidden');document.body.dataset.workspaceView='vocabulary';document.body.classList.remove('project-view');
 if(wordPracticeController){wordPracticeController.update(state.vocabulary||[]);return;}
 disposeWorkspaceTasks();disposeWorkspaceCalendar();disposePersonalInfo();disposeAnnualPlans();stopWordAudio();
 $('content').innerHTML='<div id="workspaceWordPractice" data-ui-root data-ui-owner="word-practice"></div>';
 if(!window.WorkspaceWordPractice){$('workspaceWordPractice').textContent='单词练习组件加载失败，请刷新重试。';return;}
 wordPracticeController=window.WorkspaceWordPractice.mount($('workspaceWordPractice'),state.vocabulary||[],{close(){disposeWordPractice();view='vocabularyLibrary';query='';render();history.replaceState(null,'',location.pathname+'?view=vocabularyLibrary');},async review(id,correct){
  const next=structuredClone(state),index=(next.vocabulary||[]).findIndex(w=>w.id===id);if(index<0)throw Error('这个单词已移除，请结束练习后刷新词库。');
  next.vocabulary[index]=reviewedWord(next.vocabulary[index],correct,day());
  if(!await change(next))throw Error(saveError||'学习记录未保存，请重试。');return state.vocabulary||[];
 }});
}
$('content').addEventListener('click',e=>{if(!e.target.closest('[data-word-practice]')||scope!=='personal'||!ready||busy)return;view='vocabulary';query='';render();history.replaceState(null,'',location.pathname+'?view=vocabulary');});
window.addEventListener('beforeunload',e=>{if(isWordPracticing()){e.preventDefault();e.returnValue='';}});
