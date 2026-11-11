import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {WorkspaceIconButton} from '@/components/workspace-icon-action';
import {WorkspaceToolbar} from '@/components/workspace-toolbar';
import {projectPlanSheetUrls} from './project-plan-embed.mjs';

function ProjectPlan(){
 const [urls]=useState(()=>projectPlanSheetUrls(new URLSearchParams(location.search).get('planProject')));
 const [revision,setRevision]=useState(0);
 const [status,setStatus]=useState('loading');
 useEffect(()=>{
  const timeout=window.setTimeout(()=>setStatus(current=>current==='loading'?'slow':current),15000);
  return()=>window.clearTimeout(timeout);
 },[revision]);
 return <section className='project-plan' aria-label='项目任务清单原表'>
  <WorkspaceToolbar>
   <WorkspaceIconButton icon={RefreshCw} label='刷新任务清单原表' onClick={()=>{setStatus('loading');setRevision(value=>value+1);}}/>
   <a className='workspace-icon-action' data-ui-control='button' data-workspace-size='icon' data-icon-label='在新窗口打开任务清单原表' href={urls.source} target='_blank' rel='noopener noreferrer' aria-label='在新窗口打开任务清单原表'><ExternalLink size={18} aria-hidden='true'/></a>
  </WorkspaceToolbar>
  {status==='loading'&&<p className='project-plan-status' role='status'>正在打开 Google 任务清单…</p>}
  {(status==='slow'||status==='error')&&<p className='project-plan-status' role={status==='error'?'alert':'status'}>
   {status==='error'?'任务清单原表加载失败。':'任务清单原表加载较慢。'}
   <a href={urls.source} target='_blank' rel='noopener noreferrer'>在新窗口打开原表</a>
  </p>}
  <iframe key={revision} className='project-plan-frame' title='项目任务清单汇总 · Google 表格' src={urls.embed}
   referrerPolicy='strict-origin-when-cross-origin' onLoad={()=>setStatus('loaded')} onError={()=>setStatus('error')}/>
 </section>;
}

export const workspaceProjectPlan={mount(node:HTMLElement){
 const root=createRoot(node);
 root.render(<ProjectPlan/>);
 return {dispose:()=>root.unmount()};
}};
window.WorkspaceProjectPlan=workspaceProjectPlan;
