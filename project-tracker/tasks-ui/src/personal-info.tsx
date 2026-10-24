import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {WorkspaceSelect} from '@/components/workspace-select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {LockKeyhole,Plus,Eye,EyeOff,ShieldCheck,Landmark,ContactRound} from 'lucide-react';
import {deriveVaultKey,newVaultSalt,encryptVault,decryptVault} from '../../personal-vault.mjs';
const types={passport:'护照',bank:'银行卡',identity:'身份证',other:'其他证件'};
const preventImeSubmit=event=>{if(event.key==='Enter'&&event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();}};
const blank=()=>({id:'',type:'passport',label:'',holder:'',number:'',issuer:'',expiry:'',note:''});
const feedback=(message)=>window.WorkspaceFeedback?.show(document.getElementById('toast'),message,'success');
async function requestVault(options={}){
 const response=await fetch('/api/account/vault',{cache:'no-store',...options});
 const data=await response.json();if(!response.ok)throw Error(response.status===401?'登录已过期，请重新登录工作台。':data.error||'资料暂时无法保存，请重试。');return data;
}
function Secret({id,label,value,onChange,disabled,autoComplete='off',invalid=false,description}){
 const [visible,setVisible]=useState(false);
 return <div className='personal-field'><label htmlFor={id}>{label}</label><div className='personal-secret'><Input id={id} type={visible?'text':'password'} value={value} onChange={onChange} disabled={disabled} autoComplete={autoComplete} maxLength={id==='vault-number'?80:200} spellCheck={false} aria-invalid={invalid||undefined} aria-describedby={description}/><Button type='button' variant='outline' disabled={disabled} aria-label={(visible?'隐藏':'显示')+label} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</Button></div></div>;
}
function PersonalInfo({controller}){
 const [phase,setPhase]=useState('loading'),[stored,setStored]=useState(null),[rows,setRows]=useState([]),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[editor,setEditor]=useState(null),[formError,setFormError]=useState(''),[invalid,setInvalid]=useState('');
 const session=useRef(null),generation=useRef(0),locked=useRef(false),lastActivity=useRef(Date.now()),draft=useRef(null),initial=useRef('');
 draft.current=editor;controller.isEditing=()=>!!draft.current||locked.current;
 const setBusy=value=>{locked.current=value;setPending(value);};
 function clear(){generation.current++;session.current=null;setRows([]);setEditor(null);draft.current=null;setPassword('');setConfirmation('');setFormError('');setError('');setInvalid('');locked.current=false;setPending(false);setStored(null);setPhase('loading');}
 async function load(){
  const seq=++generation.current;setPhase('loading');setError('');
  try{const data=await requestVault();if(seq!==generation.current)return;setStored(data);setPhase('locked');}catch(e){if(seq===generation.current){setError(e.message);setPhase('failed');}}
 }
 function lock(){clear();load();}
 useEffect(()=>{
  load();
  const activity=()=>lastActivity.current=Date.now();
  const visibility=()=>{if(document.hidden)clear();else load();};
  const pagehide=()=>clear();const pageshow=e=>{if(e.persisted)load();};
  const unload=e=>{if(draft.current&&JSON.stringify(draft.current)!==initial.current){e.preventDefault();e.returnValue='';}};
  for(const name of ['pointerdown','keydown','input'])document.addEventListener(name,activity,{passive:true});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);window.addEventListener('beforeunload',unload);
  const timer=setInterval(()=>{if(session.current&&Date.now()-lastActivity.current>=300000)lock();},15000);
  return()=>{generation.current++;session.current=null;clearInterval(timer);for(const name of ['pointerdown','keydown','input'])document.removeEventListener(name,activity);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);window.removeEventListener('beforeunload',unload);};
 },[]);
 async function save(next,seq=generation.current){
  const current=session.current;if(!current)throw Error('资料已锁定，请重新解锁。');
  const envelope=await encryptVault(next,current.key,current.salt);if(seq!==generation.current)return false;
  const result=await requestVault({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:current.version,envelope})});
  if(seq!==generation.current)return false;session.current={...current,version:result.version};setStored({envelope,version:result.version});setRows(next);return true;
 }
 async function unlock(e){
  e.preventDefault();if(locked.current||!stored)return;setError('');setInvalid('');
  if(!password||!stored.envelope&&(password.length<12||password.length>200||password!==confirmation)){setError(stored.envelope?'请输入资料密码。':'请设置 12–200 位资料密码，确保两次输入一致。');setInvalid('vault-password');document.getElementById('vault-password')?.focus();return;}
  const seq=generation.current;setBusy(true);
  try{const salt=stored.envelope?.salt||newVaultSalt(),key=await deriveVaultKey(password,salt);if(seq!==generation.current)return;const decoded=stored.envelope?await decryptVault(stored.envelope,key):[];if(seq!==generation.current)return;session.current={key,salt,version:stored.version};if(!stored.envelope&&!await save([],seq))return;setRows(decoded);setPassword('');setConfirmation('');setPhase('unlocked');lastActivity.current=Date.now();}
  catch(e){if(seq===generation.current){session.current=null;setError(e.name==='OperationError'?'资料密码不正确，或加密资料已损坏。':e.message);setInvalid('vault-password');}}
  finally{if(seq===generation.current)setBusy(false);}
 }
 function edit(item=blank()){if(locked.current)return;initial.current=JSON.stringify(item);setFormError('');setInvalid('');setEditor({...item});}
 async function close(){if(locked.current)return;if(editor&&JSON.stringify(editor)!==initial.current){const yes=await window.WorkspacePrimitives.confirm({title:'放弃修改？',description:'此条资料尚未保存的修改将丢失。',action:'放弃修改'});if(!yes)return;}setEditor(null);setFormError('');}
 async function submit(e){
  e.preventDefault();if(locked.current||!editor)return;setFormError('');setInvalid('');
  for(const field of ['label','number'])if(!editor[field].trim()){setFormError(field==='label'?'请填写资料名称。':'请填写证件号或银行卡号。');setInvalid('vault-'+field);document.getElementById('vault-'+field)?.focus();return;}
  if(!editor.id&&rows.length>=100){setFormError('最多保存 100 条资料，请先删除不再需要的记录。');return;}
  const item={...editor,id:editor.id||crypto.randomUUID(),label:editor.label.trim(),number:editor.number.trim()};const next=editor.id?rows.map(x=>x.id===item.id?item:x):[...rows,item],seq=generation.current;setBusy(true);
  try{if(await save(next,seq)){setEditor(null);feedback('个人资料已加密保存');}}
  catch(e){if(seq===generation.current)setFormError(e.message);}
  finally{if(seq===generation.current)setBusy(false);}
 }
 async function remove(){
  if(locked.current||!editor?.id)return;const id=editor.id,seq=generation.current;
  const yes=await window.WorkspacePrimitives.confirm({title:'删除资料？',description:'删除此条资料后无法恢复，其他资料会保留。',action:'删除资料'});if(!yes||seq!==generation.current)return;
  setBusy(true);setFormError('');try{if(await save(rows.filter(x=>x.id!==id),seq)){setEditor(null);feedback('个人资料已删除');}}catch(e){if(seq===generation.current)setFormError(e.message);}finally{if(seq===generation.current)setBusy(false);}
 }
 const update=field=>e=>setEditor(current=>({...current,[field]:e.target.value}));
 return <section className='personal-info' data-ui-root='' data-ui-owner='personal-info' aria-label='个人信息' aria-busy={pending||phase==='loading'}>
  <div className='personal-toolbar workspace-page-hero'><div><h2>个人信息</h2><p className='muted'>证件与银行卡，集中保存、按需查看。</p></div>{phase==='unlocked'&&<div className='personal-actions'><Button variant='outline' disabled={pending} onClick={lock}><LockKeyhole size={16}/>锁定资料</Button><Button disabled={pending} onClick={()=>edit()}><Plus size={16}/>添加资料</Button></div>}</div>
  {phase==='loading'&&<div className='card personal-gate' role='status'>正在读取加密资料…</div>}
  {phase==='failed'&&<div className='card personal-gate'><p role='alert'>{error}</p><Button variant='outline' onClick={load}>重新加载</Button></div>}
  {phase==='locked'&&stored&&<div className='card personal-gate'><ShieldCheck size={28} aria-hidden='true'/><h3>{stored.envelope?'解锁个人信息':'设置资料密码'}</h3><p id='vault-help' className='muted'>{stored.envelope?'输入资料密码，查看和编辑已保存的资料。':'请设置至少 12 位独立资料密码。密码无法找回，请妥善保管；与工作台登录密码相互独立。'}</p><form noValidate onKeyDownCapture={preventImeSubmit} onSubmit={unlock}><Secret key='password' id='vault-password' label='资料密码' value={password} onChange={e=>setPassword(e.target.value)} disabled={pending} autoComplete={stored.envelope?'current-password':'new-password'} invalid={invalid==='vault-password'} description='vault-help vault-error'/>{!stored.envelope&&<div className='personal-field'><label htmlFor='vault-confirm'>再次输入资料密码</label><Input id='vault-confirm' type='password' value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={pending} autoComplete='new-password' maxLength={200}/></div>}<p id='vault-error' className='form-error' role='alert'>{error}</p><Button type='submit' disabled={pending}>{pending?'正在处理…':stored.envelope?'解锁资料':'创建资料库'}</Button></form></div>}
  {phase==='unlocked'&&<><p className='muted'>号码默认隐藏。切换标签页或闲置 5 分钟会锁定并清除未保存内容。</p>{rows.length?<div className='personal-records'>{rows.map(item=><article key={item.id} className='card'><div className='personal-record-type'>{item.type==='bank'?<Landmark size={18}/>:<ContactRound size={18}/>}<span>{types[item.type]}</span></div><h3>{item.label}</h3><p className='personal-number'>•••• {item.number.length>4?item.number.slice(-4):'••••'}</p><p className='muted'>{item.issuer||'未填写签发机关 / 银行'}</p><Button variant='outline' disabled={pending} onClick={()=>edit(item)}>查看 / 编辑<span className='sr-only'>：{item.label}</span></Button></article>)}</div>:<div className='card personal-empty'><ContactRound size={28}/><h3>还没有个人资料</h3><p className='muted'>添加护照、银行卡、身份证或其他证件。</p><Button onClick={()=>edit()}>添加第一条资料</Button></div>}</>}
  <Dialog open={!!editor} onOpenChange={open=>{if(!open)close();}}><DialogContent data-ui-owner='personal-info' className='personal-editor' onOpenAutoFocus={e=>{e.preventDefault();document.getElementById('vault-label')?.focus({preventScroll:true});}} onCloseAutoFocus={e=>{e.preventDefault();document.querySelector<HTMLElement>('.personal-actions button:last-child')?.focus();}} onEscapeKeyDown={e=>{e.preventDefault();close();}} onPointerDownOutside={e=>{e.preventDefault();}}><DialogHeader><DialogTitle>{editor?.id?'查看 / 编辑资料':'添加资料'}</DialogTitle><DialogDescription>资料加密保存。请勿填写银行卡密码或安全码。</DialogDescription></DialogHeader>{editor&&<form noValidate onKeyDownCapture={preventImeSubmit} onSubmit={submit} className='personal-form' aria-busy={pending}><div className='personal-fields'><div className='personal-field'><label htmlFor='vault-type'>资料类型</label><WorkspaceSelect id='vault-type' label='资料类型' value={editor.type} disabled={pending} options={Object.entries(types).map(([value,label])=>({value,label}))} onValueChange={value=>setEditor(current=>({...current,type:value}))}/></div><div className='personal-field'><label htmlFor='vault-label'>名称（必填）</label><Input id='vault-label' maxLength={80} value={editor.label} onChange={update('label')} disabled={pending} aria-invalid={invalid==='vault-label'||undefined} aria-describedby='vault-form-error' placeholder='如 工资卡、旅行护照'/></div><div className='personal-field'><label htmlFor='vault-holder'>持有人</label><Input id='vault-holder' value={editor.holder} onChange={update('holder')} disabled={pending} autoComplete='off' maxLength={100}/></div><Secret key={editor.id||'new'} id='vault-number' label='证件号 / 银行卡号（必填）' value={editor.number} onChange={update('number')} disabled={pending} invalid={invalid==='vault-number'} description='vault-form-error'/><div className='personal-field'><label htmlFor='vault-issuer'>签发机关 / 开户银行</label><Input id='vault-issuer' value={editor.issuer} onChange={update('issuer')} disabled={pending} maxLength={150}/></div><div className='personal-field'><label htmlFor='vault-expiry'>有效期至</label><Input id='vault-expiry' type='date' aria-label='有效期至' value={editor.expiry} onChange={update('expiry')} disabled={pending}/></div><div className='personal-field'><label htmlFor='vault-note'>备注</label><Textarea id='vault-note' value={editor.note} onChange={update('note')} disabled={pending} maxLength={1000}/></div></div><p id='vault-form-error' className='form-error' role='alert'>{formError}</p><DialogFooter>{editor.id&&<Button type='button' variant='destructive' disabled={pending} onClick={remove}>删除资料</Button>}<Button type='button' variant='outline' disabled={pending} onClick={close}>取消</Button><Button type='submit' disabled={pending}>{pending?'正在保存…':'保存资料'}</Button></DialogFooter></form>}</DialogContent></Dialog>
 </section>;
}
window.WorkspacePersonalInfo={mount(node){const root=createRoot(node),controller={};root.render(<PersonalInfo controller={controller}/>);return {...controller,isEditing:()=>controller.isEditing?.()||false,dispose:()=>root.unmount()};}};
