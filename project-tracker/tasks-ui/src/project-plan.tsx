import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {WorkspaceIconButton} from '@/components/workspace-icon-action';
import {WorkspaceSelect} from '@/components/workspace-select';
import {WorkspaceToolbar} from '@/components/workspace-toolbar';
import {PROJECT_PLAN_SOURCE_ID} from '../../project-plan-sheet.mjs';
import {activeProjectPlanTasks,projectPlanTimeline,projectTaskBar,projectTaskTiming} from './project-plan-timeline.mjs';

type Task={row:number;phase:string;module:string;title:string;applicability:string;department:string;start:string;end:string;status:string};
type Project={sheetId:number;name:string;code:string;tasks:Task[]};
type Snapshot={projects:Project[];lastSyncedAt:string|null};
const filters=[{value:'all',label:'全部任务'},{value:'dated',label:'有计划日期'},{value:'pending',label:'待补或核对日期'}];
const source='https://docs.google.com/spreadsheets/d/'+PROJECT_PLAN_SOURCE_ID+'/edit';
const hasDate=kind=>kind==='range'||kind==='point';
const syncTime=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

function PlanChart({project,filter}:{project:Project;filter:string}){
 const applicableTasks=useMemo(()=>project.tasks.filter(task=>task.applicability!=='否'),[project.tasks]);
 const rows=useMemo(()=>activeProjectPlanTasks(applicableTasks).map(task=>({task,timing:projectTaskTiming(task)})),[applicableTasks]);
 const timeline=useMemo(()=>projectPlanTimeline(rows.map(row=>row.timing)),[rows]);
 const visible=rows.filter(({timing:{kind}})=>filter==='all'||(filter==='dated'&&hasDate(kind))||
  (filter==='pending'&&['pending','point','invalid'].includes(kind)));
 if(!visible.length)return <p className='project-plan-empty' role='status'>{rows.length?'没有符合筛选条件的任务。':applicableTasks.length?'该项目的适用阶段均已完成。':'该项目暂无适用任务。'}</p>;
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
 const todayPosition=timeline?.position(today,true);
 const showToday=todayPosition!==undefined&&todayPosition>=0&&todayPosition<100;
 const groups=new Map<string,typeof visible>();
 for(const row of visible){const phase=row.task.phase||'未分阶段';const group=groups.get(phase)??[];group.push(row);groups.set(phase,group);}
 const separators=timeline?.days.slice(1).map(({day,position})=>{
  const start=position+'%',end='calc('+start+' + 1px)';
  const color=day===1?'var(--semantic-border-strong)':'var(--semantic-border)';
  return ['transparent '+start,color+' '+start,color+' '+end,'transparent '+end].join(',');
 });
 const grid=separators?.length?'linear-gradient(90deg,'+separators.join(',')+')':undefined;
 return <div className='project-plan-scroll' role='region' aria-label={project.code+' '+project.name+'任务时间轴'} tabIndex={0}>
  <table className='project-plan-table' style={{'--project-plan-grid':grid} as CSSProperties}>
   <thead><tr><th scope='col' className='project-plan-name'>任务 <span>{visible.length} / {rows.length}</span></th>
    <th scope='col' className='project-plan-axis' style={{minWidth:timeline?.width}} aria-label='计划时间'>
     {timeline?<div aria-hidden='true'>
      <div className='project-plan-months'>{timeline.months.map(month=><span key={month.position} style={{left:month.position+'%'}}>{month.label}</span>)}</div>
      <div className='project-plan-days'>{timeline.days.map(({start,day,end,position,width})=><span key={start} title={start.slice(0,7)+' · '+(day===end?day:day+'–'+end)+'日'} data-month-start={day===1} style={{left:position+'%',width:width+'%'}}>{day}</span>)}
       {showToday&&<b className='project-plan-axis-today' style={{left:todayPosition+'%'}}>今天</b>}
      </div>
     </div>:<span>计划时间</span>}
    </th></tr></thead>
   {Array.from(groups,([phase,items])=><tbody key={phase}>
    <tr className='project-plan-phase'><th scope='rowgroup' className='project-plan-name'>{phase}</th><td/></tr>
    {items.map(({task,timing})=>{
     const bar=projectTaskBar(timing,timeline);
     const status=task.status;
     const detail=[task.module==='通用'?'':task.module,task.department].filter(Boolean).join(' · ');
     const label=timing.kind==='range'?timing.start+' 至 '+timing.end:
      timing.kind==='point'?(task.start===timing.date?'开始 ':'完成 ')+timing.date+' · '+(task.start===timing.date?'待补完成日期':'待补开始日期'):
       timing.kind==='invalid'?task.start+' 至 '+task.end+' · 日期顺序待核对':'待排期';
     return <tr key={task.row} data-status={status}>
      <th scope='row' className='project-plan-name'>
       <strong>{task.title}</strong>
       {(detail||status)&&<small>{detail}{status&&<>{detail&&' · '}<span className='project-plan-task-status'>{status}</span></>}</small>}
       <small>{label}</small>
      </th>
      <td className='project-plan-time-cell'><div className='project-plan-track'>
       {showToday&&<span aria-hidden='true' className='project-plan-today' style={{left:todayPosition+'%'}}/>}
       {bar&&<span className='project-plan-bar' data-kind={timing.kind} style={bar} aria-hidden='true'/>}
      </div></td>
     </tr>;
    })}
   </tbody>)}
  </table>
 </div>;
}

function ProjectPlan(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState(()=>new URLSearchParams(location.search).get('planProject')||'');
 const [filter,setFilter]=useState('all');
 const request=useRef<AbortController|null>(null);
 async function refresh(){
  if(request.current)return;
  const controller=new AbortController();request.current=controller;
  setLoading(true);setError('');
  const timeout=window.setTimeout(()=>controller.abort('timeout'),15000);
  try{
   const response=await fetch('/api/project-plan',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error(response.status===401?'登录已失效，请重新登录。':'项目计划读取失败，请重试。');
   const next=await response.json();
   if(request.current===controller)setSnapshot(next);
  }catch(e){
   if(request.current===controller)setError(controller.signal.aborted?'项目计划读取超时，请重试。':e.message||'项目计划读取失败，请重试。');
  }finally{
   clearTimeout(timeout);
   if(request.current===controller){request.current=null;setLoading(false);}
  }
 }
 useEffect(()=>{void refresh();return()=>{const active=request.current;request.current=null;active?.abort();};},[]);
 const projects=useMemo(()=>[...(snapshot?.projects??[])].sort((a,b)=>a.code.localeCompare(b.code,'zh-CN',{numeric:true})),[snapshot]);
 const project=projects.find(item=>String(item.sheetId)===selected)??projects[0];
 const openSource=source+(project?'#gid='+project.sheetId:'');
 return <section className='project-plan' aria-label='项目任务计划'>
  <WorkspaceToolbar>
   <WorkspaceIconButton icon={RefreshCw} label='刷新项目计划' disabled={loading} onClick={()=>void refresh()}/>
   <a className='workspace-icon-action' data-ui-control='button' data-workspace-size='icon' data-icon-label='打开任务清单源表' href={openSource} target='_blank' rel='noopener noreferrer' aria-label='打开任务清单源表'><ExternalLink size={18} aria-hidden='true'/></a>
  </WorkspaceToolbar>
  {project&&<div className='project-plan-controls'>
   <WorkspaceSelect label='选择项目' value={String(project.sheetId)} options={projects.map(item=>({value:String(item.sheetId),label:item.code+' '+item.name}))} onValueChange={value=>{
    setSelected(value);setFilter('all');const url=new URL(location.href);url.searchParams.set('planProject',value);history.replaceState(null,'',url.pathname+url.search);
   }}/>
   <WorkspaceSelect label='筛选任务' value={filter} options={filters} onValueChange={setFilter}/>
   <span className='project-plan-sync' role='status'>{loading?'正在读取…':snapshot.lastSyncedAt&&<>同步于 <time dateTime={snapshot.lastSyncedAt}>{syncTime.format(new Date(snapshot.lastSyncedAt))}</time></>}</span>
  </div>}
  {error&&<p className='tasks-error' role='alert'>{error} {snapshot&&'仍显示上次读取的计划。'}</p>}
  {project?<PlanChart key={project.sheetId} project={project} filter={filter}/>:!error&&<p className='project-plan-empty' role='status'>{loading?'正在读取项目计划…':'尚未收到任务清单同步数据。'}</p>}
 </section>;
}

export const workspaceProjectPlan={mount(node:HTMLElement){
 const root=createRoot(node);
 root.render(<ProjectPlan/>);
 return {dispose:()=>root.unmount()};
}};
window.WorkspaceProjectPlan=workspaceProjectPlan;
