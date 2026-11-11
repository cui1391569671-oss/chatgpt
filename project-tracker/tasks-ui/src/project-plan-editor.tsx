import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {WorkspaceSelect} from '@/components/workspace-select';
import {WorkspaceDateInput} from '@/components/workspace-date';
import {SaveButton} from '@/components/save-button';
import {PROJECT_PLAN_EDIT_FIELDS,validateProjectPlanEdit} from '../../project-plan-sheet.mjs';
import type {PlanProject} from './project-plan-preview';

export function ProjectPlanEditor({project,row,writeEnabled,close,saved,returnFocus}:{project:PlanProject;row:number;writeEnabled:boolean;close:()=>void;saved:(data:any)=>void;returnFocus:()=>HTMLElement|null}){
 const task=project.tasks.find(item=>item.row===row),fields=project.editing.find(item=>item.row===row).fields;
 const initial=Object.fromEntries(fields.map(field=>[field.key,field.value]));
 const [draft,setDraft]=useState(initial),[pending,setPending]=useState(false),[error,setError]=useState(''),[invalid,setInvalid]=useState(false);
 const locked=useRef(false),alive=useRef(true),requestId=useRef(crypto.randomUUID());
 const dirty=fields.some(field=>draft[field.key]!==field.value);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const unload=(event:BeforeUnloadEvent)=>{if(dirty||pending){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[dirty,pending]);
 const update=(key:string,value:string|boolean)=>{setDraft(current=>({...current,[key]:value}));setInvalid(false);};
 async function cancel(){
  if(locked.current)return;
  if(dirty&&!await window.WorkspacePrimitives.confirm({title:'放弃任务修改？',description:'尚未写回原表的修改会丢失。',action:'放弃修改'}))return;
  close();
 }
 async function save(){
  if(locked.current||!writeEnabled||!dirty)return;
  let edit;
  try{edit=validateProjectPlanEdit({requestId:requestId.current,sheetId:project.sheetId,row,identity:{title:task.title,phase:task.phase,module:task.module},changes:fields.filter(field=>draft[field.key]!==field.value).map(field=>({key:field.key,before:field.value,value:draft[field.key]}))});}
  catch{setInvalid(true);setError('请核对日期与文字长度，日期应为有效日期、待定或留空。');document.getElementById('plan-field-error')?.focus();return;}
  locked.current=true;setPending(true);setError('');
  try{
   const response=await fetch('/api/project-plan/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(edit),signal:AbortSignal.timeout(55000)});
   const data=await response.json();
   if(!response.ok)throw Error(response.status===401?'登录已失效，请重新登录工作台。':data.error||'原表保存失败，请重试。');
   if(alive.current)saved(data);
  }catch(e){if(alive.current)setError((e.name==='TimeoutError'?'未能确认保存结果，请重试核对原表。':e.message)+' 输入已保留。');}
  finally{locked.current=false;if(alive.current)setPending(false);}
 }
 return <Dialog open onOpenChange={open=>{if(!open)void cancel();}}><DialogContent className='project-plan-editor' returnFocus={returnFocus} returnFocusFallback={()=>document.querySelector<HTMLButtonElement>('[aria-label="选择项目"]')} onInteractOutside={event=>{if(pending)event.preventDefault();}}>
  <DialogTitle>编辑任务</DialogTitle><DialogDescription>{project.code+' · '+task.title}</DialogDescription>
  <form noValidate onSubmit={event=>{event.preventDefault();void save();}} onKeyDown={event=>{if(event.nativeEvent.isComposing&&event.key==='Enter')event.preventDefault();}}>
   <div className='project-plan-edit-fields'>
    {fields.map(field=>{
     const label=PROJECT_PLAN_EDIT_FIELDS.find(([key])=>key===field.key)[1],id='plan-edit-'+field.key;
     return <div key={field.key}><label htmlFor={id}>{label}</label>{field.type==='boolean'?<Checkbox id={id} checked={draft[field.key]===true} disabled={pending||!writeEnabled} onCheckedChange={value=>update(field.key,value===true)}/>:
      field.type==='date'?<div className='project-plan-edit-date'><WorkspaceDateInput id={id} aria-label={label} value={String(draft[field.key])} min='1900-01-01' max='2100-12-31' disabled={pending||!writeEnabled} aria-invalid={invalid||undefined} aria-describedby={invalid?'plan-field-error':undefined} onChange={event=>update(field.key,event.target.value)}/><Button type='button' variant='outline' disabled={pending||!writeEnabled} onClick={()=>update(field.key,'待定')}>待定</Button></div>:
      field.type==='status'?<WorkspaceSelect id={id} label={label} value={String(draft[field.key])} disabled={pending||!writeEnabled} options={['未开始','进行中','待确认','阻塞','已完成','不适用'].map(value=>({value,label:value}))} onValueChange={value=>update(field.key,value)}/>:
       <Textarea id={id} value={String(draft[field.key])} maxLength={2000} disabled={pending||!writeEnabled} aria-invalid={invalid||undefined} aria-describedby={invalid?'plan-field-error':undefined} onChange={event=>update(field.key,event.target.value)}/>}</div>;
    })}
   </div>
   <p className='project-plan-status'>公式及发货关闭流程控制的字段保持只读；其他字段保存前会核对原表当前值。</p>
   {!writeEnabled&&<p className='project-plan-status'>回写服务尚未启用，当前仅可查看。</p>}
   {error&&<p id='plan-field-error' tabIndex={-1} className='tasks-error' role='alert'>{error}</p>}
   <DialogFooter><Button type='button' variant='outline' disabled={pending} onClick={()=>void cancel()}>取消</Button><SaveButton type='submit' label='保存并同步原表' pendingLabel='正在写回原表…' pending={pending} disabled={!writeEnabled||!dirty}/></DialogFooter>
  </form>
 </DialogContent></Dialog>;
}
