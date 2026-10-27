import {enhanceHomeLayout} from './workspace-home-layout';
import {WorkspaceReactBits} from './workspace-react-bits';
import {observeWorkspaceAnimations} from './workspace-motion-policy';
import {useState,useEffect} from 'react';
import {Button} from './components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
const key='workbench-personal-v2';
const defaults={motto:'今日安排与待办，一处处理。',compact:false,goals:true,leisure:true,motion:'lavish'};
function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(key)||'{}'),motion:'lavish'};}catch{return defaults;}}
function apply(value){document.documentElement.dataset.theme='light';const previousMotion=document.body.dataset.motionLevel;document.body.dataset.motionLevel='lavish';if(previousMotion!==document.body.dataset.motionLevel)window.dispatchEvent(new Event('workspace-motion-change'));document.body.dataset.personalDensity=value.compact?'compact':'comfortable';document.body.dataset.homeGoals=String(value.goals);document.body.dataset.homeLeisure=String(value.leisure);document.querySelectorAll('.home2-intro>p:last-child').forEach(node=>node.textContent=value.motto||defaults.motto);}
export function PersonalPreferences({open,onOpenChange}:{open:boolean;onOpenChange:(value:boolean)=>void}){
 const [draft,setDraft]=useState(read),[error,setError]=useState('');
 const setOpen=onOpenChange;
 useEffect(()=>{if(open){setDraft(read());setError('');}},[open]);

 return <Dialog open={open} onOpenChange={setOpen}><DialogContent returnFocus={()=>document.querySelector<HTMLButtonElement>('.wb-account-trigger')}><DialogTitle>让工作台更像你</DialogTitle><DialogDescription>偏好保存在当前浏览器，业务记录仍按原方式同步。</DialogDescription><form noValidate className='wb-personal-form' onSubmit={e=>{e.preventDefault();try{localStorage.setItem(key,JSON.stringify(draft));apply(draft);setOpen(false);}catch{setError('浏览器未允许保存偏好，请检查存储设置后重试。');}}}><label htmlFor='personal-motto'>首页寄语</label><input id='personal-motto' maxLength={80} value={draft.motto} onChange={e=>setDraft({...draft,motto:e.target.value})}/><small>留一句想对自己说的话，最多80字。</small>{[['compact','紧凑布局'],['goals','展示年度目标'],['leisure','展示娱乐记录']].map(([name,label])=><label className='wb-preference-row' key={name}><span>{label}</span><input type='checkbox' checked={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.checked})}/></label>)}<small>华丽动效已启用，系统减少动态效果设置仍优先。</small><p role='alert'>{error}</p><div className='wb-personal-actions'><Button type='button' variant='secondary' onClick={()=>setDraft(defaults)}>恢复默认</Button><Button type='submit'>保存偏好</Button></div></form></DialogContent></Dialog>;
}

export function WorkspaceMotionRuntime(){
 useEffect(observeWorkspaceAnimations,[]);
 useEffect(()=>{apply(read());enhanceHomeLayout();const observer=new MutationObserver(()=>{apply(read());enhanceHomeLayout();});const content=document.getElementById('content');if(content)observer.observe(content,{childList:true});return()=>{observer.disconnect();};},[]);
 return <WorkspaceReactBits/>;
}
