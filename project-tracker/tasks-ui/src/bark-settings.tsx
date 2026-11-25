import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {workspacePrimitives} from './workspace-primitives';

type Preferences={work:boolean;personal:boolean;tasks:boolean;events:boolean;projects:boolean};
type Settings={configured:boolean;bound:boolean;version:number;label:string;enabled:boolean;preferences:Preferences;recent:{id:string;status:string;sent_at:number|null;opened_at:number|null;due_at:number}[]};
const statuses={queued:'等待后台发送',sending:'正在发送',sent:'推送服务已接受',uncertain:'发送结果待确认，不自动重发',failed:'发送失败，请检查 Bark 绑定',cancelled:'已取消'};
const time=(value:number)=>new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
async function api(method='GET',body?:object,action=''){
 const response=await fetch('/api/account/bark'+action,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'手机通知请求失败，请重试');return data as Settings;
}
export function BarkSettings({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}){
 const [saved,setSaved]=useState<Settings|null>(null),[draft,setDraft]=useState<Settings|null>(null),[address,setAddress]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),generation=useRef(0),addressInput=useRef<HTMLInputElement>(null);
 const dirty=!!saved&&!!draft&&(!!address||saved.label!==draft.label||saved.enabled!==draft.enabled||JSON.stringify(saved.preferences)!==JSON.stringify(draft.preferences));
 function accept(value:Settings){setSaved(value);setDraft(value);setAddress('');setShow(false);}
 async function load(){if(lock.current)return;const id=++generation.current;setLoading(true);setError('');try{const value=await api();if(id===generation.current)accept(value);}catch(e){if(id===generation.current)setError((e as Error).message);}finally{if(id===generation.current)setLoading(false);}}
 useEffect(()=>{if(open){setSaved(null);setDraft(null);setAddress('');setError('');setNotice('');void load();}return()=>{generation.current++;};},[open]);
 useEffect(()=>{if(!open||!dirty)return;const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[open,dirty]);
 async function close(){if(lock.current)return;if(dirty&&!await workspacePrimitives.confirm({title:'放弃修改？',description:'手机通知设置尚未保存。',action:'放弃修改'}))return;setAddress('');setShow(false);onOpenChange(false);}
 async function perform(method:string,body:object,action='',message='设置已保存'){
  if(lock.current)return;lock.current=true;setPending(true);setError('');setNotice('');try{accept(await api(method,body,action));setNotice(message);}catch(e){setError((e as Error).message);if(!saved?.bound)addressInput.current?.focus();}finally{lock.current=false;setPending(false);}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!value)void close();}}><DialogContent returnFocus={()=>document.querySelector<HTMLButtonElement>('.wb-account-trigger')}><DialogTitle>手机通知</DialogTitle><DialogDescription>通过 Bark 接收工作台提醒</DialogDescription>
 {loading&&<div className='workspace-state' data-state='loading' role='status'><strong>正在读取手机绑定</strong></div>}
 {!loading&&!draft&&<div className='workspace-state' data-state='error'><strong>未能读取手机绑定</strong><p role='alert'>{error}</p><Button onClick={()=>void load()}>重试</Button></div>}
 {draft&&<form noValidate className='wb-personal-form' onSubmit={event=>{event.preventDefault();if(!draft.bound&&!address.trim()){setError('请填写 Bark 推送地址');addressInput.current?.focus();return;}void perform('PUT',{version:draft.version,address,label:draft.label,enabled:draft.enabled,preferences:draft.preferences});}}>
 {!draft.configured&&<p role='status'>服务端加密密钥尚未配置，暂时无法保存绑定。</p>}
 <fieldset className='wb-personal-form' disabled={pending||loading}>
 <div className='workspace-field-row'><div><label htmlFor='bark-label'>设备名称</label><Input id='bark-label' maxLength={60} value={draft.label} placeholder='我的 iPhone' onChange={e=>setDraft({...draft,label:e.target.value})}/></div></div>
 <div className='workspace-field-row'><div><label htmlFor='bark-address'>{draft.bound?'更换 Bark 推送地址':'Bark 推送地址'}</label><Input id='bark-address' ref={addressInput} type={show?'text':'password'} autoComplete='off' spellCheck={false} autoCapitalize='none' value={address} maxLength={1000} aria-describedby='bark-privacy bark-error' aria-invalid={!!error} placeholder={draft.bound?'已加密保存，留空保留原绑定':'https://api.day.app/…'} onChange={e=>setAddress(e.target.value)}/><Button type='button' variant='ghost' aria-pressed={show} onClick={()=>setShow(!show)}>{show?'隐藏推送地址':'显示推送地址'}</Button><p id='bark-privacy'>地址含设备密钥，仅加密保存；已保存的地址不回显。</p></div></div>
 <label className='wb-preference-row'><span>启用手机通知</span><input type='checkbox' checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/></label>
 {(Object.entries({work:'工作空间',personal:'私人空间',tasks:'待办到期与逾期',events:'日程与钉钉会议',projects:'项目到期、逾期及暂停'}) as [keyof Preferences,string][]).map(([key,label])=><label className='wb-preference-row' key={key}><span>{label}</span><input type='checkbox' checked={draft.preferences[key]} onChange={e=>setDraft({...draft,preferences:{...draft.preferences,[key]:e.target.checked}})}/></label>)}
 <p>北京时间：日程提前 15 分钟；全天日程、到期待办及异常汇总在 9 点提醒。后台每 5 分钟检查，绑定前的提醒不补发。</p>
 <p id='bark-error' role='alert'>{error}</p><p role='status'>{notice}</p>
 <div className='wb-personal-actions'><Button type='button' variant='outline' onClick={()=>void close()}>取消</Button><Button type='submit' disabled={!draft.configured} aria-busy={pending}>保存设置</Button></div>
 <div className='wb-personal-actions'><Button type='button' variant='outline' disabled={!draft.bound||!draft.enabled||dirty} onClick={()=>void perform('POST',{version:draft.version,mode:'now'},'/test','测试已提交，请在 iPhone 核对通知')}>发送测试</Button><Button type='button' variant='outline' disabled={!draft.bound||!draft.enabled||dirty} onClick={()=>void perform('POST',{version:draft.version,mode:'background'},'/test','后台测试已安排，可关闭网页后等待约 1–6 分钟')}>关闭网页后测试</Button></div>
 {draft.bound&&<Button type='button' variant='ghost' onClick={async()=>{if(await workspacePrimitives.confirm({title:'解除手机绑定？',description:'解除后，此手机不再接收工作台通知。',action:'解除绑定'}))void perform('DELETE',{version:draft.version},'','手机绑定已解除');}}>解除绑定</Button>}
 <Button type='button' variant='ghost' disabled={dirty} onClick={()=>void load()}>刷新发送状态</Button>
 {!draft.recent.length?<div className='workspace-state' data-state='empty'><strong>尚无手机通知</strong></div>:<ul>{draft.recent.map(item=><li key={item.id}>{time(item.due_at)} · {statuses[item.status]||item.status}{item.opened_at?' · 已打开工作台 '+time(item.opened_at):''}</li>)}</ul>}
 </fieldset></form>}
 </DialogContent></Dialog>;
}
