import {WorkspaceHelp} from './components/workspace-icon-action';
import {WorkspaceReactBits} from './workspace-react-bits';
import {observeWorkspaceAnimations} from './workspace-motion-policy';
import {useState,useEffect} from 'react';
import {Button} from './components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
const key='workbench-personal-v2';
const defaults={motto:'安排好重要的事，\n留一点时间给自己。',compact:false,goals:true,leisure:true,motion:'lavish'};
function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(key)||'{}'),motion:'lavish'};}catch{return defaults;}}
function apply(value){document.documentElement.dataset.theme='dark';const previousMotion=document.body.dataset.motionLevel;document.body.dataset.motionLevel='lavish';if(previousMotion!==document.body.dataset.motionLevel)window.dispatchEvent(new Event('workspace-motion-change'));document.body.dataset.personalDensity=value.compact?'compact':'comfortable';document.body.dataset.homeGoals=String(value.goals);document.body.dataset.homeLeisure=String(value.leisure);document.querySelectorAll('.site-home[data-scope=personal] .site-home-motto').forEach(node=>node.textContent=value.motto||defaults.motto);}
export function PersonalPreferences({open,onOpenChange}:{open:boolean;onOpenChange:(value:boolean)=>void}){
 const [draft,setDraft]=useState(read),[error,setError]=useState('');
 const setOpen=onOpenChange;
 useEffect(()=>{if(open){setDraft(read());setError('');}},[open]);

 return <Dialog open={open} onOpenChange={setOpen}><DialogContent returnFocus={()=>document.querySelector<HTMLButtonElement>('.wb-account-trigger')}><DialogTitle>个性设置</DialogTitle><DialogDescription>仅保存在当前浏览器</DialogDescription><form noValidate className='wb-personal-form' onSubmit={e=>{e.preventDefault();try{localStorage.setItem(key,JSON.stringify(draft));apply(draft);setOpen(false);}catch{setError('浏览器未允许保存偏好，请检查存储设置后重试。');}}}><label htmlFor='personal-motto'>首页寄语（最多80字）</label><input id='personal-motto' maxLength={80} value={draft.motto} onChange={e=>setDraft({...draft,motto:e.target.value})}/>{[['compact','紧凑布局']].map(([name,label])=><label className='wb-preference-row' key={name}><span>{label}</span><input type='checkbox' checked={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.checked})}/></label>)}<WorkspaceHelp label='个性设置说明'><p>偏好仅保存在当前浏览器，业务记录继续按原方式同步。华丽动效已启用，系统减少动态效果设置优先。</p></WorkspaceHelp><p role='alert'>{error}</p><div className='wb-personal-actions'><Button type='button' variant='secondary' onClick={()=>setDraft(defaults)}>恢复默认</Button><Button type='submit'>保存偏好</Button></div></form></DialogContent></Dialog>;
}

export function WorkspaceMotionRuntime(){
 useEffect(observeWorkspaceAnimations,[]);
 useEffect(()=>{apply(read());const observer=new MutationObserver(()=>{apply(read());});const content=document.getElementById('content');if(content)observer.observe(content,{childList:true});return()=>{observer.disconnect();};},[]);
 return <WorkspaceReactBits/>;
}
