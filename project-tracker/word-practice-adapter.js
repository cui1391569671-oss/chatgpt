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

let vocabularySyncLoading=false;
async function renderVocabularySync(){const node=$('vocabularySync');if(!node)return;node.textContent='正在读取表格同步状态…';try{const response=await fetch('/api/vocabulary/sync',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(!node.isConnected)return;node.innerHTML='<span>'+esc((data.status==='running'?'正在同步…':data.message||'等待首次同步')+(data.syncedAt?' · 最近成功 '+new Date(data.syncedAt).toLocaleString('zh-CN'):''))+'</span><a href="'+esc(data.source)+'" target="_blank" rel="noopener noreferrer">打开源表格</a><button type="button" class="btn" data-sync-vocabulary '+(!data.configured?'disabled':'')+'>刷新同步状态</button>';}catch{if(node.isConnected)node.textContent='同步状态暂时无法读取，请刷新页面重试。';}}
$('content').addEventListener('click',async e=>{if(!e.target.closest('[data-sync-vocabulary]')||vocabularySyncLoading||busy||scope!=='personal')return;vocabularySyncLoading=true;const button=e.target.closest('button');button.disabled=true;button.textContent='正在刷新…';try{await refreshWorkspace();}finally{vocabularySyncLoading=false;if(view==='vocabularyLibrary')renderVocabularySync();}});
