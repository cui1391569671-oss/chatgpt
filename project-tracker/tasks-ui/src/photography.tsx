import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Camera,Upload,RefreshCw,MapPin,ChevronLeft,ChevronRight,Pencil,Trash2,X,Check,ImageOff,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {WorkspaceToolbar} from '@/components/workspace-toolbar';
import {WorkspaceIconButton} from '@/components/workspace-icon-action';
import {WorkspaceSearch} from '@/components/workspace-search';
import {WorkspaceSelect} from '@/components/workspace-select';
import {WorkspaceDateInput} from '@/components/workspace-date';
import {SaveButton} from '@/components/save-button';
import {photoFields} from '../../photography.mjs';
import {preparePhoto,validatePhotoFile} from './photography-images';

type Photo={id:string;title:string;spot:string;shotOn:string;note:string;width:number;height:number;version:number;createdAt:string};
type QueueItem={id:string;file:File;preview:string;status:'queued'|'preparing'|'uploading'|'saved'|'error';error:string};
type Controller={isEditing:()=>boolean};
const api='/api/photography',scope='scope=personal',today=()=>new Date(Date.now()+28800000).toISOString().slice(0,10);
const imageUrl=(id:string,thumbnail=false)=>api+'/'+id+'/'+(thumbnail?'thumbnail':'image')+'?'+scope;
const feedback=(message:string)=>window.WorkspaceFeedback?.show(document.getElementById('toast'),message,'success');
async function requestPhoto(path:string,options:RequestInit={}){
 const signal=options.signal||AbortSignal.timeout(30000);let response:Response;
 try{response=await fetch(api+path+(path.includes('?')?'&':'?')+scope,{cache:'no-store',...options,signal});}catch(e){if(signal.aborted)throw e;throw Error('网络连接失败，请检查网络后重试。');}
 if(response.status===401)throw Error('登录已过期，请重新登录后重试。');
 let data;try{data=await response.json();}catch{throw Error('服务返回异常，请稍后重试。');}
 if(!response.ok)throw Error(data.error||'读取失败，请重试。');return data;
}
const mutation=(method:string,value:unknown,signal?:AbortSignal):RequestInit=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal});
function PhotoImage({photo,thumbnail=false}:{photo:Photo;thumbnail?:boolean}){
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 return failed?<div className='photo-image-error'><ImageOff aria-hidden='true'/><span>照片读取失败</span><Button variant='ghost' onClick={()=>{setFailed(false);setRetry(v=>v+1);}}>重试</Button></div>:<img key={retry} src={imageUrl(photo.id,thumbnail)+(retry?'&retry='+retry:'')} alt={photo.title} width={photo.width} height={photo.height} loading={thumbnail?'lazy':'eager'} decoding='async' onError={()=>setFailed(true)}/>;
}
function Photography({controller}:{controller:Controller}){
 const initial=new URLSearchParams(location.search);
 const [query,setQuery]=useState(initial.get('photoQuery')||''),[committed,setCommitted]=useState(query),[spot,setSpot]=useState(initial.get('photoSpot')||''),[page,setPage]=useState(Math.max(1,Number(initial.get('photoPage'))||1));
 const [list,setList]=useState<{items:Photo[];total:number;spots:string[];page:number;pageSize:number}>({items:[],total:0,spots:[],page:1,pageSize:24});
 const [composing,setComposing]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[uploadOpen,setUploadOpen]=useState(false),[uploadDirty,setUploadDirty]=useState(false),[detail,setDetail]=useState<Photo|null>(null),[editing,setEditing]=useState(false),[deleting,setDeleting]=useState(false),[draft,setDraft]=useState<Photo|null>(null),[formError,setFormError]=useState(''),[pending,setPending]=useState(false);
 const createButton=useRef<HTMLButtonElement>(null),photoButtons=useRef(new Map<string,HTMLButtonElement>()),listAbort=useRef<AbortController|null>(null),mutating=useRef(false),alive=useRef(true),active=useRef(false),unsaved=useRef(false);
 const busy=uploadOpen||!!detail||pending;active.current=busy;unsaved.current=pending||uploadDirty||!!(editing&&draft&&detail&&JSON.stringify(draft)!==JSON.stringify(detail));controller.isEditing=()=>active.current;
 useEffect(()=>{alive.current=true;const unload=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>{alive.current=false;listAbort.current?.abort();window.removeEventListener('beforeunload',unload);};},[]);
 useEffect(()=>{if(composing||query===committed)return;const timer=setTimeout(()=>{setCommitted(query);setPage(1);},300);return()=>clearTimeout(timer);},[query,composing,committed]);
 useEffect(()=>{
  const url=new URL(location.href);for(const [key,value] of [['photoQuery',committed],['photoSpot',spot],['photoPage',page>1?String(page):'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(history.state,'',url.pathname+url.search);
  const abort=new AbortController();listAbort.current?.abort();listAbort.current=abort;const timeout=setTimeout(()=>abort.abort('timeout'),30000);setLoading(true);setError('');
  void requestPhoto('?'+new URLSearchParams({q:committed,spot,page:String(page)}),{signal:abort.signal}).then(data=>{if(!abort.signal.aborted){setList(data);if(data.page!==page)setPage(data.page);}}).catch(e=>{if(!abort.signal.aborted||abort.signal.reason==='timeout')setError(abort.signal.reason==='timeout'?'读取超时，请重试。':e.message);}).finally(()=>{clearTimeout(timeout);if(!abort.signal.aborted||abort.signal.reason==='timeout')setLoading(false);});
  return()=>{clearTimeout(timeout);abort.abort();};
 },[committed,spot,page,revision]);
 useEffect(()=>{const restore=()=>{const p=new URLSearchParams(location.search);if(p.get('view')!=='photography')return;setQuery(p.get('photoQuery')||'');setCommitted(p.get('photoQuery')||'');setSpot(p.get('photoSpot')||'');setPage(Math.max(1,Number(p.get('photoPage'))||1));};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
 async function closeDetail(){
  if(mutating.current)return;
  if(editing&&draft&&detail&&JSON.stringify(draft)!==JSON.stringify(detail)&&!await window.WorkspacePrimitives.confirm({title:'放弃未保存修改？',description:'本次照片信息修改不会保存。',action:'放弃修改'}))return;
  setDetail(null);setEditing(false);setDeleting(false);setFormError('');
 }
 async function saveDetail(remove=false){
  if(!detail||mutating.current)return;
  if(!remove&&!photoFields(draft)){setFormError('请输入拍摄地点并核对日期与文字长度。');document.getElementById(!draft?.spot.trim()?'photo-spot':'photo-date')?.focus();return;}
  mutating.current=true;setPending(true);setFormError('');
  try{await requestPhoto('/'+detail.id,mutation(remove?'DELETE':'PATCH',remove?{version:detail.version}:draft));if(!alive.current)return;setDetail(null);setEditing(false);setDeleting(false);setRevision(v=>v+1);feedback(remove?'已删除照片':'已保存照片信息');}catch(e){if(alive.current)setFormError(e.message+' 输入已保留，可重试或关闭后刷新。');}finally{mutating.current=false;if(alive.current)setPending(false);}
 }
 return <section className='photography-page' aria-label='摄影作品' aria-busy={loading}>
  <WorkspaceToolbar><Button ref={createButton} onClick={()=>setUploadOpen(true)} disabled={busy}><Upload size={18} aria-hidden='true'/>上传照片</Button><WorkspaceIconButton icon={RefreshCw} label='刷新摄影照片' disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}/></WorkspaceToolbar>
  <div className='photography-filters' onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)}><span className='photography-count'>{list.total} 张</span><WorkspaceSelect label='按拍摄地点筛选' value={spot?'spot:'+spot:'__all'} onValueChange={value=>{setSpot(value==='__all'?'':value.slice(5));setPage(1);}} options={[{value:'__all',label:'全部地点'},...[...new Set([...list.spots,...(spot?[spot]:[])])].map(value=>({value:'spot:'+value,label:value}))]}/><WorkspaceSearch label='搜索照片' placeholder='搜索照片、地点' value={query} onValueChange={value=>{setQuery(value.slice(0,200));if(!value){setCommitted('');setPage(1);}}}/></div>
  {error&&<div className='photo-page-error' role='alert'><span>{error}</span><Button variant='outline' onClick={()=>setRevision(v=>v+1)}>重试</Button></div>}
  <div className='photography-scroll'>
   {loading&&!list.items.length?<div className='site-empty' role='status'>正在读取照片…</div>:!list.items.length&&!error?<div className='site-empty photography-empty'><Camera size={40} aria-hidden='true'/><h2>{committed||spot?'没有符合条件的照片':'把世界，留在镜头里'}</h2>{committed||spot?<Button variant='outline' onClick={()=>{setQuery('');setCommitted('');setSpot('');setPage(1);}}>清空筛选</Button>:<Button variant='outline' onClick={()=>setUploadOpen(true)}>上传第一组照片</Button>}</div>:<div className='photography-grid'>{list.items.map(photo=><article key={photo.id} className='photography-card' data-motion-card={'photo:'+photo.id}><div className='photography-card-image'><button ref={node=>{if(node)photoButtons.current.set(photo.id,node);else photoButtons.current.delete(photo.id);}} className='photography-open' aria-label={'查看照片：'+photo.title} onClick={()=>{setDetail(photo);setDraft({...photo});setEditing(false);setDeleting(false);setFormError('');}}/><PhotoImage photo={photo} thumbnail/></div><div className='photography-caption'><strong>{photo.title}</strong><span>{photo.spot}{photo.shotOn&&<time dateTime={photo.shotOn}>{photo.shotOn.replaceAll('-','.')}</time>}</span></div></article>)}</div>}
  </div>
  {list.total>list.pageSize&&<footer className='photography-pagination'><WorkspaceIconButton icon={ChevronLeft} label='上一页照片' disabled={loading||page<=1} onClick={()=>setPage(v=>v-1)}/><span>{list.page} / {Math.ceil(list.total/list.pageSize)}</span><WorkspaceIconButton icon={ChevronRight} label='下一页照片' disabled={loading||page>=Math.ceil(list.total/list.pageSize)} onClick={()=>setPage(v=>v+1)}/></footer>}
  {uploadOpen&&<PhotoUpload onDirty={setUploadDirty} close={()=>setUploadOpen(false)} saved={()=>{setPage(1);setRevision(v=>v+1);}} returnFocus={()=>createButton.current}/>}
  <Dialog open={!!detail} onOpenChange={value=>{if(!value)void closeDetail();}}><DialogContent className='photography-detail' data-ui-owner='photography' returnFocus={()=>detail?photoButtons.current.get(detail.id):null} returnFocusFallback={()=>createButton.current} onInteractOutside={e=>{if(pending)e.preventDefault();}}><DialogTitle>{deleting?'删除照片？':editing?'编辑照片信息':detail?.title||'照片'}</DialogTitle><DialogDescription className={deleting?'':'sr-only'}>{deleting?'照片及摄影记录会永久删除。':'查看照片、拍摄地点和拍摄记录'}</DialogDescription>
   {detail&&(deleting?<p>{detail.title} · {detail.spot}</p>:editing&&draft?<PhotoFields value={draft} setValue={value=>{setDraft(value);if(formError==='请输入拍摄地点并核对日期与文字长度。')setFormError('');}} disabled={pending} prefix='photo' invalid={!!formError&&!photoFields(draft)}/>:<div className='photography-detail-body'><div className='photography-full-image'><PhotoImage key={detail.id} photo={detail}/></div><div className='photography-detail-meta'><span><MapPin size={16} aria-hidden='true'/>{detail.spot}</span>{detail.shotOn&&<time dateTime={detail.shotOn}>{detail.shotOn}</time>}<small>{detail.width} × {detail.height}</small></div>{detail.note&&<p className='photography-note'>{detail.note}</p>}</div>)}
   {formError&&<p id='photo-field-error' role='alert' className='tasks-error'>{formError}</p>}
   <DialogFooter>{deleting?<><Button variant='outline' disabled={pending} autoFocus onClick={()=>{setDeleting(false);setFormError('');}}>取消</Button><SaveButton variant='destructive' pending={pending} label='删除照片' onClick={()=>void saveDetail(true)}/></>:editing?<><Button variant='outline' disabled={pending} onClick={()=>void closeDetail()}>取消</Button><SaveButton pending={pending} onClick={()=>void saveDetail()}/></>:<><WorkspaceIconButton icon={Pencil} label='编辑照片信息' onClick={()=>setEditing(true)}/>{detail&&<a className='btn workspace-icon-action' data-workspace-size='icon' data-icon-label='下载浏览版照片' aria-label='下载浏览版照片' href={imageUrl(detail.id)} download={detail.title+'.jpg'}><Download size={18} aria-hidden='true'/></a>}<WorkspaceIconButton icon={Trash2} label='删除照片' onClick={()=>setDeleting(true)}/></>}</DialogFooter>
  </DialogContent></Dialog>
 </section>;
}
function PhotoFields({value,setValue,disabled,prefix,invalid=false}:{value:{title?:string;spot:string;shotOn:string;note?:string};setValue:(value:any)=>void;disabled:boolean;prefix:string;invalid?:boolean}){
 return <div className='photography-fields'>{value.title!==undefined&&<div><label htmlFor={prefix+'-title'}>照片名称（可选）</label><Input id={prefix+'-title'} maxLength={100} aria-invalid={invalid&&(value.title?.length||0)>100||undefined} aria-describedby={invalid?'photo-field-error':undefined} value={value.title} disabled={disabled} onChange={e=>setValue({...value,title:e.target.value})}/></div>}<div className='workspace-field-row'><div><label htmlFor={prefix+'-spot'}>拍摄地点</label><Input id={prefix+'-spot'} maxLength={80} aria-invalid={invalid&&!value.spot.trim()||undefined} aria-describedby={invalid?'photo-field-error':undefined} placeholder='如：南京·玄武湖、巴黎·塞纳河' value={value.spot} disabled={disabled} onChange={e=>setValue({...value,spot:e.target.value})}/></div><div><label htmlFor={prefix+'-date'}>拍摄日期</label><WorkspaceDateInput id={prefix+'-date'} aria-label='拍摄日期' value={value.shotOn} disabled={disabled} aria-describedby={invalid?'photo-field-error':undefined} onChange={e=>setValue({...value,shotOn:e.target.value})}/></div></div>{value.note!==undefined&&<div><label htmlFor={prefix+'-note'}>备注</label><Textarea className='resize-none' id={prefix+'-note'} maxLength={2000} value={value.note} disabled={disabled} onChange={e=>setValue({...value,note:e.target.value})}/></div>}</div>;
}
function PhotoUpload({close,saved,returnFocus,onDirty}:{onDirty:(value:boolean)=>void;close:()=>void;saved:()=>void;returnFocus:()=>HTMLButtonElement}){
 const [queue,setQueue]=useState<QueueItem[]>([]),[fields,setFields]=useState({spot:'',shotOn:today()}),[error,setError]=useState(''),[running,setRunning]=useState(false),[dragging,setDragging]=useState(false);
 const fileInput=useRef<HTMLInputElement>(null),items=useRef(queue),abort=useRef<AbortController|null>(null),locked=useRef(false),mounted=useRef(true),prepared=useRef(new Map<string,Awaited<ReturnType<typeof preparePhoto>>>());items.current=queue;
 useEffect(()=>{onDirty(running||queue.some(item=>item.status!=='saved'));},[queue,running,onDirty]);
 const change=(id:string,changes:Partial<QueueItem>)=>{if(mounted.current)setQueue(rows=>rows.map(row=>row.id===id?{...row,...changes}:row));};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;onDirty(false);abort.current?.abort();for(const item of items.current)if(item.preview)URL.revokeObjectURL(item.preview);prepared.current.clear();};},[]);
 function select(files:FileList|null){
  if(!files||locked.current)return;const next=Array.from(files);if(items.current.length+next.length>8){setError('一次最多选择8张照片，请分批上传。');return;}
  setError('');setQueue(rows=>[...rows,...next.map(file=>{const invalid=validatePhotoFile(file);return {id:crypto.randomUUID(),file,preview:invalid?'':URL.createObjectURL(file),status:invalid?'error' as const:'queued' as const,error:invalid};})]);
 }
 async function closeUpload(){
  if(locked.current)return;
  if(items.current.some(item=>item.status!=='saved')&&!await window.WorkspacePrimitives.confirm({title:'放弃待上传照片？',description:'已上传照片会保留，其余照片不会保存。',action:'放弃上传'}))return;
  close();
 }
 async function upload(){
  if(locked.current)return;setError('');if(!fields.spot.trim()){setError('请输入这组照片的拍摄地点。');document.getElementById('photo-upload-spot')?.focus();return;}
  const candidates=items.current.filter(item=>item.status!=='saved'&&!validatePhotoFile(item.file));if(!candidates.length){setError('请先选择可上传的照片。');return;}
  locked.current=true;setRunning(true);abort.current=new AbortController();let count=0;
  try{for(const item of candidates){
   if(abort.current.signal.aborted)break;
   try{change(item.id,{status:'preparing',error:''});let image=prepared.current.get(item.id);if(!image){image=await preparePhoto(item.file);prepared.current.set(item.id,image);}if(abort.current.signal.aborted){change(item.id,{status:'queued'});break;}
    change(item.id,{status:'uploading'});const title=item.file.name.replace(/\.[^.]+$/,'').trim().slice(0,100)||'未命名照片';
    await requestPhoto('',mutation('POST',{id:item.id,title,...fields,spot:fields.spot.trim(),note:'',...image},AbortSignal.any([abort.current.signal,AbortSignal.timeout(45000)])));
    change(item.id,{status:'saved'});count++;
   }catch(e){change(item.id,{status:'error',error:abort.current.signal.aborted?'已停止；可重试确认上传结果。':e.name==='TimeoutError'?'上传超时，重试会核对结果，避免重复。':e.message});}
  }}finally{locked.current=false;if(mounted.current){setRunning(false);saved();if(count)feedback('已上传 '+count+' 张照片');}}
 }
 return <Dialog open onOpenChange={value=>{if(!value)void closeUpload();}}><DialogContent className='photography-upload' data-ui-owner='photography' returnFocus={returnFocus} onInteractOutside={event=>{if(running)event.preventDefault();}}><DialogTitle>上传照片</DialogTitle><DialogDescription>仅保存压缩浏览版，请保留原片。JPG / PNG / WebP · 每张30 MB以内</DialogDescription>
  <PhotoFields value={fields} setValue={value=>{setFields(value);if(error==='请输入这组照片的拍摄地点。')setError('');}} disabled={running||queue.some(item=>item.status==='saved')} prefix='photo-upload' invalid={!!error&&!fields.spot.trim()}/>
  <input ref={fileInput} className='hidden' type='file' multiple accept='image/jpeg,image/png,image/webp' onChange={e=>{select(e.target.files);e.target.value='';}}/>
  <Button variant='outline' className='photography-drop' disabled={running||queue.length>=8} data-dragging={dragging} onClick={()=>fileInput.current?.click()} onDragOver={e=>{e.preventDefault();if(!locked.current)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);select(e.dataTransfer.files);}}><Upload size={24} aria-hidden='true'/><span>选择或拖入照片</span><small>一次最多8张</small></Button>
  {!!queue.length&&<ul className='photography-queue' aria-label='待上传照片'>{queue.map(item=><li key={item.id} aria-busy={['preparing','uploading'].includes(item.status)}>{item.preview?<img src={item.preview} alt=''/>:<ImageOff aria-hidden='true'/>}<div><strong>{item.file.name}</strong><span role='status'>{({queued:'待上传',preparing:'正在压缩…',uploading:'正在上传…',saved:'已上传',error:'未上传'})[item.status]}</span>{item.error&&<p role='alert'>{item.error}</p>}</div>{item.status==='saved'?<Check size={18} aria-label='已上传'/>:<WorkspaceIconButton icon={X} label={'移除待上传照片：'+item.file.name} disabled={running} onClick={()=>{if(item.preview)URL.revokeObjectURL(item.preview);prepared.current.delete(item.id);setQueue(rows=>rows.filter(row=>row.id!==item.id));}}/>}</li>)}</ul>}
  {error&&<p id='photo-field-error' className='tasks-error' role='alert'>{error}</p>}
  <DialogFooter>{running?<Button variant='outline' onClick={()=>abort.current?.abort()}>停止上传</Button>:<Button variant='outline' onClick={()=>void closeUpload()}>{queue.length&&queue.every(item=>item.status==='saved')?'完成':'取消'}</Button>}<SaveButton label={queue.some(item=>item.status==='error')?'重试上传':'上传照片'} pendingLabel='正在上传…' pending={running} disabled={!queue.some(item=>item.status!=='saved'&&!validatePhotoFile(item.file))} onClick={()=>void upload()}/></DialogFooter>
 </DialogContent></Dialog>;
}
export const workspacePhotography={mount(element:HTMLElement){const controller:Controller={isEditing:()=>false},root=createRoot(element);root.render(<Photography controller={controller}/>);return {...controller,isEditing:()=>controller.isEditing(),dispose(){root.unmount();}};}};
window.WorkspacePhotography=workspacePhotography;
