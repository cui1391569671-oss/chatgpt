import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {WorkspaceIconButton} from '@/components/workspace-icon-action';
import {WorkspaceSelect} from '@/components/workspace-select';
import {WorkspaceToolbar} from '@/components/workspace-toolbar';
import {ProjectPlanPreview,type PlanProject} from './project-plan-preview';
import {ProjectPlanEditor} from './project-plan-editor';
import {projectPlanDefaultMode,projectPlanSheetUrls} from './project-plan-embed.mjs';

type Snapshot={projects:PlanProject[];lastSyncedAt:string|null;writeEnabled?:boolean};
const syncTime=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const modes=[{value:'preview',label:'私有任务表'},{value:'original',label:'Google 原表'}];

function ProjectPlan({controller}:{controller:{isEditing:()=>boolean}}){
 const [mode,setMode]=useState(()=>projectPlanDefaultMode(navigator.userAgent,new URLSearchParams(location.search).get('planMode')));
 const [selected,setSelected]=useState(()=>new URLSearchParams(location.search).get('planProject')||'');
 const [revision,setRevision]=useState(0),[frameStatus,setFrameStatus]=useState('loading');
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null);
 const [editing,setEditing]=useState<{project:PlanProject;row:number}|null>(null);
 const editTrigger=useRef<HTMLButtonElement|null>(null);
 controller.isEditing=()=>!!editing;
 const projects=[...(snapshot?.projects??[])].sort((a,b)=>a.code.localeCompare(b.code,'zh-CN',{numeric:true}));
 const project=projects.find(item=>String(item.sheetId)===selected)??projects[0];
 const urls=projectPlanSheetUrls(mode==='preview'&&project?String(project.sheetId):selected);
 useEffect(()=>{
  if(mode!=='original')return;
  const timeout=window.setTimeout(()=>setFrameStatus(current=>current==='loading'?'slow':current),15000);
  return()=>window.clearTimeout(timeout);
 },[revision,mode]);
 useEffect(()=>{
  if(mode!=='preview')return;
  const controller=new AbortController();request.current=controller;
  const timeout=window.setTimeout(()=>controller.abort(),15000);
  setLoading(true);setError('');
  void (async()=>{
   try{
    const response=await fetch('/api/project-plan',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error(response.status===401?'登录已失效，请重新登录工作台。':'任务表读取失败，请重试。');
    const next=await response.json();
    if(request.current===controller&&!controller.signal.aborted)setSnapshot(next);
   }catch(e){
    if(request.current===controller)setError(controller.signal.aborted?'任务表读取超时，请重试。':e.message||'任务表读取失败，请重试。');
   }finally{
    clearTimeout(timeout);
    if(request.current===controller){request.current=null;setLoading(false);}
   }
  })();
  return()=>{if(request.current===controller)request.current=null;controller.abort();clearTimeout(timeout);};
 },[mode,revision]);
 const refresh=()=>{setFrameStatus('loading');setRevision(value=>value+1);};
 return <section className='project-plan' aria-label='项目任务清单'>
  <WorkspaceToolbar>
   <WorkspaceIconButton icon={RefreshCw} label={mode==='preview'?'刷新任务表':'刷新任务清单原表'} disabled={mode==='preview'&&loading} onClick={refresh}/>
   <a className='workspace-icon-action' data-ui-control='button' data-workspace-size='icon' data-icon-label='在新窗口打开任务清单原表' href={urls.source} target='_blank' rel='noopener noreferrer' aria-label='在新窗口打开任务清单原表'><ExternalLink size={18} aria-hidden='true'/></a>
  </WorkspaceToolbar>
  <div className='project-plan-controls'>
   <WorkspaceSelect label='查看方式' value={mode} options={modes} onValueChange={value=>{setFrameStatus('loading');setMode(value);const url=new URL(location.href);url.searchParams.set('planMode',value);history.replaceState(null,'',url.pathname+url.search);}}/>
   {mode==='preview'&&project&&<WorkspaceSelect label='选择项目' value={String(project.sheetId)} options={projects.map(item=>({value:String(item.sheetId),label:item.code+' '+item.name}))} onValueChange={value=>{
    setSelected(value);const url=new URL(location.href);url.searchParams.set('planProject',value);history.replaceState(null,'',url.pathname+url.search);
   }}/>}
   {mode==='preview'&&<span className='project-plan-sync' role='status'>{loading?'正在读取任务表…':snapshot?.lastSyncedAt&&<>同步于 <time dateTime={snapshot.lastSyncedAt}>{syncTime.format(new Date(snapshot.lastSyncedAt))}</time></>}</span>}
  </div>
  {mode==='preview'?<>
   {error&&<p className='tasks-error' role='alert'>{error} {snapshot&&'仍显示上次读取的预览。'}</p>}
   {project&&!project.preview&&<p className='project-plan-status'>原表排版尚未同步，暂按任务列显示。</p>}
   {project?.editing&&<p className='project-plan-status'>{snapshot.writeEnabled?'点击任务名称修改可编辑字段，保存后写回原表。':'任务表仅供查看，原表回写服务尚未启用。'}</p>}
   {project?<ProjectPlanPreview project={project} onEdit={(row,trigger)=>{editTrigger.current=trigger;setEditing({project,row});}}/>:<div className='workspace-empty-state' role='status'>{loading?'正在读取任务清单…':error?'可重试读取，或在新窗口打开原表。':'尚未收到任务清单同步数据。'}</div>}
  </>:<>
   {frameStatus==='loading'&&<p className='project-plan-status' role='status'>正在打开 Google 任务清单…</p>}
   {(frameStatus==='slow'||frameStatus==='error')&&<p className='project-plan-status' role={frameStatus==='error'?'alert':'status'}>
    {frameStatus==='error'?'任务清单原表加载失败。':'任务清单原表加载较慢。'}可切换“私有任务表”，或<a href={urls.source} target='_blank' rel='noopener noreferrer'>在新窗口打开原表</a>。
   </p>}
   <iframe key={revision+':'+selected} className='project-plan-frame' title='项目任务清单汇总 · Google 表格' src={urls.embed}
    referrerPolicy='strict-origin-when-cross-origin' onLoad={()=>setFrameStatus('loaded')} onError={()=>setFrameStatus('error')}/>
  </>}
  {editing&&<ProjectPlanEditor project={editing.project} row={editing.row} writeEnabled={snapshot.writeEnabled===true} returnFocus={()=>editTrigger.current} close={()=>setEditing(null)} saved={data=>{
   setSnapshot(current=>({...current,projects:current.projects.map(item=>item.sheetId===data.project.sheetId?data.project:item),lastSyncedAt:data.lastSyncedAt||current.lastSyncedAt}));setEditing(null);
   window.WorkspaceFeedback?.show(document.getElementById('toast'),data.synced?'已写回原表':'已写回原表，完整预览稍后同步','success');
  }}/>}
 </section>;
}

export const workspaceProjectPlan={mount(node:HTMLElement){
 const controller={isEditing:()=>false},root=createRoot(node);root.render(<ProjectPlan controller={controller}/>);
 return {isEditing:()=>controller.isEditing(),dispose:()=>root.unmount()};
}};
window.WorkspaceProjectPlan=workspaceProjectPlan;
