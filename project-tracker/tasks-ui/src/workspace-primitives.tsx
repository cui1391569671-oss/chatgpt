// Shared shadcn/ui adapters for the existing DOM-owned business forms.
// Forms retain their IDs, listeners, FormData and existing cloud persistence.
import {useCallback,useRef,useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter,DialogHeader} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {enhanceWorkspaceSearch} from '@/components/workspace-search';
import {WorkspaceDateInput} from '@/components/workspace-date';
import {WorkspaceSelect} from '@/components/workspace-select';
import {enhanceFileInput} from '../../file-trigger.js';
import {restoreFocusTarget} from '../../focus-return.mjs';
import {ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,ChevronDown,CircleHelp,RefreshCw,List,Pencil,Trash2,LayoutGrid,ExternalLink,Plus,Volume2} from 'lucide-react';
const actionIcons={back:ArrowLeft,forward:ArrowRight,previous:ChevronLeft,next:ChevronRight,help:CircleHelp,details:ChevronDown,refresh:RefreshCw,list:List,edit:Pencil,delete:Trash2,grid:LayoutGrid,external:ExternalLink,plus:Plus,volume:Volume2};
const iconActions=new Map<HTMLElement,{root:ReturnType<typeof createRoot>;mount:HTMLSpanElement;labelNode?:HTMLSpanElement;signature:string;label:string}>();
function enhanceIconAction(element:HTMLElement){
 const Icon=actionIcons[element.dataset.workspaceIcon];if(!Icon)return;
 let adapter=iconActions.get(element);
 const labelled=element.dataset.workspaceIconMode==='label',text=element.textContent?.trim().replace(/^[＋+←]\s*|\s*[→↗]$/g,'')||adapter?.label||'操作';
 const previousLabel=element.dataset.iconAutoLabel,explicitLabel=element.getAttribute('aria-label');
 const label=labelled?text:explicitLabel||text;
 if(!explicitLabel||explicitLabel===previousLabel){element.setAttribute('aria-label',label);element.dataset.iconAutoLabel=label;}
 element.dataset.workspaceSize=labelled?'default':'icon';element.classList.toggle('workspace-icon-action',!labelled);element.classList.toggle('workspace-label-action',labelled);
 if(!labelled)element.dataset.iconLabel=label;
 const signature=element.dataset.workspaceIcon+':'+labelled;
 if(!adapter){const mount=document.createElement('span');mount.dataset.uiOwner='action-icon';adapter={root:createRoot(mount),mount,signature:'',label};iconActions.set(element,adapter);}
 if(labelled){
  if(!adapter.labelNode){adapter.labelNode=document.createElement('span');adapter.labelNode.dataset.uiOwner='action-label';}
  if(adapter.labelNode.textContent!==label)adapter.labelNode.textContent=label;
  if(adapter.mount.parentElement!==element||adapter.labelNode.parentElement!==element)element.replaceChildren(adapter.mount,adapter.labelNode);
 }else if(adapter.mount.parentElement!==element)element.replaceChildren(adapter.mount);
 adapter.label=label;if(adapter.signature===signature)return;
 adapter.signature=signature;adapter.root.render(<Icon size={18} aria-hidden='true' className={element.dataset.workspaceIcon==='volume'?'workspace-reveal-icon':undefined}/>);
}
const dialogs=new WeakMap(),selects=new Map(),forms=new WeakSet(),dates=new Map();
let dialogReturnTarget:HTMLElement|null=null;
function captureDialogOpener(){
 let active=document.activeElement as HTMLElement|null;
 if(window.parent!==window){const parentActive=window.parent.document.activeElement as HTMLElement|null;if(parentActive&&parentActive!==window.frameElement&&parentActive!==window.parent.document.body)active=parentActive;}
 if(!active?.getClientRects().length||active===document.body)active=dialogReturnTarget;
 if(active&&!active.closest('dialog[data-ui-dialog],[role=dialog]'))dialogReturnTarget=active;
 return active;
}
const excluded='[data-ilamy-portal],.ilamy-surface,[data-tasks-root],[data-tasks-portal],[data-shell-root],[data-shell-portal],[data-ui-owner]';
function isExternalControl(element:Element){return element.closest('#workspaceNativeActions')?!!element.closest('[data-ui-owner]'):!!element.closest(excluded);}
function ExistingDialog({element,parking,open,dismiss,closed}){
 const host=useRef(null);
 const attach=useCallback(node=>{host.current=node;if(node){element.removeAttribute('aria-hidden');element.removeAttribute('data-aria-hidden');node.append(element);}else parking.after(element);},[element,parking]);

 const variant={drivePreview:'ui-wide-dialog',projectCoreDetails:'ui-wide-dialog',releaseDialog:'ui-release-dialog',accountCenter:'ui-account-dialog',issueDetails:'ui-project-drawer'}[element.id]||'';
 const [title,setTitle]=useState(element.querySelector('h1,h2,h3')?.textContent||'编辑内容');
 useEffect(()=>{const heading=element.querySelector('h1,h2,h3') as HTMLElement|null;if(!heading)return;const observer=new MutationObserver(()=>setTitle(heading.textContent||'编辑内容'));observer.observe(heading,{childList:true,characterData:true,subtree:true});return()=>observer.disconnect();},[element]);
 return <Dialog open={open} onOpenChange={v=>{if(!v)dismiss();}}><DialogContent className={'ui-business-dialog '+variant} aria-describedby={element.id==='issueDetails'?'native-issue-description':undefined} showCloseButton={true} onOpenAutoFocus={e=>{e.preventDefault();const first=[...element.querySelectorAll('input:not([type=hidden]):not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href]')].find(node=>node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden');first?.focus();}} onCloseAutoFocus={e=>{e.preventDefault();closed();}} onEscapeKeyDown={e=>{e.preventDefault();const focused=document.activeElement;if(focused?.getAttribute('role')==='combobox'&&focused.getAttribute('aria-expanded')==='true'&&focused.hasAttribute('data-workspace-autocomplete')){focused.dispatchEvent(new Event('workspace-autocomplete-close'));return;}dismiss();}} onPointerDownOutside={e=>{if(e.target instanceof Element&&e.target.closest('[data-slot=select-content],.workspace-date-dialog')){e.preventDefault();return;}e.preventDefault();dismiss();}}><DialogHeader><DialogTitle>{title}</DialogTitle>{element.id==='issueDetails'&&<DialogDescription id='native-issue-description'>{element.querySelector('#issueProjectName')?.textContent||'项目问题详情'}</DialogDescription>}</DialogHeader><div ref={attach} className='ui-dialog-body'/></DialogContent></Dialog>;
}
function enhanceDialog(element:HTMLDialogElement){
 if(dialogs.has(element))return;
 const legacyHeader=element.querySelector<HTMLElement>('.issue-details-head');if(legacyHeader){legacyHeader.dataset.uiLegacyHeader='';legacyHeader.hidden=true;}
 const existingHeading=element.querySelector('h1,h2,h3'),header=existingHeading?.closest('.card-head');
 if(header){const buttons=[...header.querySelectorAll('button')],closes=buttons.filter(button=>/^(关闭|×|✕|Close)$/.test(button.textContent.trim())||/^关闭/.test(button.getAttribute('aria-label')||''));const park=node=>{const wrapper=document.createElement('span');wrapper.hidden=true;wrapper.dataset.uiLegacyHeader='';node.before(wrapper);wrapper.append(node);};if(closes.length&&closes.length===buttons.length&&!header.querySelector('a,input,select,textarea'))park(header);else closes.forEach(park);}
 const heading=element.querySelector('h1,h2,h3') as HTMLElement|null;if(heading){heading.hidden=true;heading.setAttribute('aria-hidden','true');}
 const parking=document.createComment('shadcn dialog '+element.id);element.before(parking);
 const mount=document.createElement('div');mount.dataset.uiOwner='dialog';document.body.append(mount);const root=createRoot(mount);
 let opener=null,opened=false,focusFrame=0;
 const finishFocus=()=>{cancelAnimationFrame(focusFrame);let attempts=0;const restore=()=>{if(opened||document.querySelector('dialog[open]'))return;const restored=restoreFocusTarget([()=>opener,()=>element.dataset.returnFocus?document.querySelector(element.dataset.returnFocus):null,()=>element.dataset.returnFocusFallback?document.querySelector(element.dataset.returnFocusFallback):null]);if(!restored&&attempts++<30)focusFrame=requestAnimationFrame(restore);};queueMicrotask(restore);};
 const close=(value='')=>{if(!opened)return;opened=false;element.removeAttribute('open');element.returnValue=value||'';parking.after(element);flushSync(()=>root.render(null));element.dispatchEvent(new Event('close'));finishFocus();};
 const dismiss=()=>{const cancel=new Event('cancel',{cancelable:true});if(element.dispatchEvent(cancel))close();};
 element.dataset.uiDialog='';element.setAttribute('role','presentation');element.removeAttribute('aria-labelledby');element.removeAttribute('aria-label');element.removeAttribute('aria-modal');
 element.showModal=()=>{if(opened)return;for(const button of element.querySelectorAll('button')){if(button.closest('[hidden]')||!(/^(关闭|×|✕|Close)$/.test(button.textContent?.trim()||'')||/^关闭/.test(button.getAttribute('aria-label')||'')))continue;const parked=document.createElement('span');parked.hidden=true;parked.dataset.uiLegacyHeader='';button.before(parked);parked.append(button);}const heading=element.querySelector('h1,h2,h3') as HTMLElement|null;if(heading){heading.hidden=true;heading.setAttribute('aria-hidden','true');}cancelAnimationFrame(focusFrame);opener=captureDialogOpener();opened=true;element.setAttribute('open','');flushSync(()=>root.render(<ExistingDialog element={element} parking={parking} open dismiss={dismiss} closed={finishFocus}/>));scan(element);element.querySelectorAll('input[data-ui-date-native]').forEach(input=>dates.get(input)?.render());element.querySelectorAll('select[data-ui-native]').forEach(select=>selects.get(select)?.render());};
 const originalRemove=element.remove.bind(element);element.remove=()=>{close();root.unmount();mount.remove();parking.remove();originalRemove();dialogs.delete(element);};
 element.close=close;dialogs.set(element,{root,close});
}
function enhanceSelect(element:HTMLSelectElement){
 if(selects.has(element)||element.multiple||isExternalControl(element)||element.dataset.uiNative!==undefined)return;
 const mount=document.createElement('span');mount.dataset.uiRoot='';mount.dataset.uiOwner='select';mount.className='ui-select-mount';element.after(mount);const root=createRoot(mount);
 const triggerId=(element.id||'select-'+crypto.randomUUID())+'-control';
 const label=()=>element.getAttribute('aria-label')||element.labels?.[0]?.textContent||'选择选项';
 const render=()=>{mount.hidden=element.hidden||element.classList.contains('hidden');root.render(<WorkspaceSelect value={element.value} label={label()} id={triggerId} disabled={element.disabled} invalid={element.getAttribute('aria-invalid')==='true'} aria-describedby={element.getAttribute('aria-describedby')||undefined} options={Array.from(element.options).map(o=>({value:o.value,label:o.textContent,disabled:o.disabled}))} onValueChange={value=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));render();}}/>);};
 const labels=Array.from(element.labels||[]);for(const l of labels)l.addEventListener('click',()=>document.getElementById(triggerId)?.focus());
 element.dataset.uiNative='';element.setAttribute('aria-hidden','true');element.tabIndex=-1;
 const observer=new MutationObserver(render);observer.observe(element,{attributes:true,childList:true,subtree:true});element.addEventListener('change',render);
 const onReset=()=>queueMicrotask(render);element.form?.addEventListener('reset',onReset);
 selects.set(element,{root,mount,observer,onReset,render});render();
}
function enhanceDate(element:HTMLInputElement){
 if(dates.has(element)||isExternalControl(element)||element.type!=='date')return;
 const mount=document.createElement('span');mount.dataset.uiOwner='date';mount.className='workspace-date-mount';element.after(mount);const root=createRoot(mount);
 const id=(element.id||'date-'+crypto.randomUUID())+'-control';
 const render=()=>{mount.hidden=element.hidden||element.classList.contains('hidden');root.render(<WorkspaceDateInput id={id} value={element.value} disabled={element.disabled} min={element.min} max={element.max} required={element.required} aria-label={element.getAttribute('aria-label')||element.labels?.[0]?.textContent||element.previousElementSibling?.textContent||'选择日期'} aria-invalid={element.getAttribute('aria-invalid')==='true'} aria-describedby={element.getAttribute('aria-describedby')||undefined} onChange={event=>{element.value=event.target.value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));render();}}/>);};
 element.dataset.uiDateNative='';element.tabIndex=-1;element.setAttribute('aria-hidden','true');for(const label of element.labels||[])label.addEventListener('click',event=>{event.preventDefault();document.getElementById(id)?.focus();});
 element.addEventListener('input',render);element.addEventListener('change',render);element.form?.addEventListener('reset',()=>queueMicrotask(render));
 const observer=new MutationObserver(render);observer.observe(element,{attributes:true});dates.set(element,{root,mount,render,observer});render();
}
function enhanceForm(form:HTMLFormElement){
 if(forms.has(form)||isExternalControl(form))return;forms.add(form);form.noValidate=true;
 form.addEventListener('submit',event=>{const invalid=Array.from(form.elements).find((field):field is HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement=>(field instanceof HTMLInputElement||field instanceof HTMLSelectElement||field instanceof HTMLTextAreaElement)&&field.willValidate&&!field.validity.valid);if(!invalid)return;event.preventDefault();event.stopImmediatePropagation();let error=form.querySelector('.form-error');if(!error){error=document.createElement('p');error.className='form-error';error.setAttribute('role','alert');form.append(error);}if(!error.id)error.id='form-error-'+crypto.randomUUID();invalid.setAttribute('aria-invalid','true');invalid.setAttribute('aria-describedby',error.id);const label=invalid.labels?.[0]?.textContent||'内容';error.textContent=invalid.validity.valueMissing?'请填写'+label:invalid.validity.typeMismatch?'请填写有效的'+label:invalid.validity.rangeUnderflow||invalid.validity.rangeOverflow?label+'不在允许范围内，请检查后重试。':label+'格式不正确，请检查后重试。';(document.getElementById(invalid.id+'-control')||invalid).focus();},true);
 const clear=event=>{const field=event.target;if(field.validity?.valid){const error=document.getElementById(field.getAttribute('aria-describedby'));if(error?.classList.contains('form-error'))error.textContent='';field.removeAttribute?.('aria-invalid');if(error?.classList.contains('form-error'))field.removeAttribute?.('aria-describedby');}};form.addEventListener('input',clear);form.addEventListener('change',clear);
}
function scan(scope:ParentNode=document){
 scope.querySelectorAll<HTMLElement>('[data-delete],[data-delete-clothing],[data-delete-outfit]').forEach(element=>{const record=element.closest('article,li,.row');if(record){record.classList.add('workspace-record');element.classList.add('workspace-reveal-action');}});
 for(const [selector,icon,label] of [
  ['[data-refresh-core]','refresh','刷新项目信息'],
  ['[data-sync-vocabulary]','refresh','刷新词汇同步状态'],
  ['[data-refresh-project-calendar]','refresh','刷新项目日历'],
  ['.workspace-note-reader [data-edit="notes"]','edit','编辑笔记'],
  ['.workspace-note-reader [data-delete="notes"]','delete','删除笔记'],
  ['[data-shipping-edit]','edit','编辑发货信息']
 ])scope.querySelectorAll<HTMLElement>(selector).forEach(element=>{if(!element.dataset.workspaceIcon){element.dataset.workspaceIcon=icon;if(!element.hasAttribute('aria-label'))element.setAttribute('aria-label',label);}});
 for(const [element,adapter] of iconActions)if(!element.isConnected){adapter.root.unmount();iconActions.delete(element);}
 scope.querySelectorAll<HTMLElement>('[data-workspace-icon]').forEach(enhanceIconAction);
 scope.querySelectorAll('form').forEach(enhanceForm);
 scope.querySelectorAll('input[type=date]').forEach(enhanceDate);
 scope.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(el=>{if(!isExternalControl(el))enhanceFileInput(el);});
 scope.querySelectorAll('input').forEach(el=>{if(el.type==='search'||/搜索/.test((el.getAttribute('aria-label')||'')+(el.placeholder||'')))enhanceWorkspaceSearch(el);});
 scope.querySelectorAll<HTMLDialogElement>('dialog:not([data-ui-dialog])').forEach(el=>{if(!isExternalControl(el))enhanceDialog(el);});
 scope.querySelectorAll('select:not([data-ui-native])').forEach(enhanceSelect);
 scope.querySelectorAll<HTMLElement>('button.btn,a.btn,.actions>button,.card-head>button,input:not([type=checkbox]):not([type=file]):not([type=hidden]),textarea').forEach(el=>{if(!isExternalControl(el)){const kind=el.tagName==='TEXTAREA'?'textarea':el.matches('input')?'input':'button';if(el.dataset.uiControl!==kind)el.dataset.uiControl=kind;}});
}
let installed=false;
export const workspacePrimitives={groupFields(container,ids){
 const fields=ids.map(id=>({control:container.querySelector('#'+id),label:container.querySelector('label[for="'+id+'"]')}));
 if(fields.some(f=>!f.control||!f.label)||fields.some(f=>f.control.parentElement!==fields[0].control.parentElement))return;
 const row=document.createElement('div');row.className='workspace-field-row';fields[0].label.before(row);
 for(const {control,label} of fields){const cell=document.createElement('div');cell.append(label,control);row.append(cell);}
 },openDialog(element){enhanceDialog(element);element.showModal();scan(element);},install(){if(installed)return;installed=true;document.body.classList.add('shadcn-controls');
 scan();let queued=false;const observer=new MutationObserver(records=>{if(!records.some(r=>Array.from(r.addedNodes).some(n=>n instanceof Element&&!n.closest('[data-ui-owner]'))||r.removedNodes.length))return;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;for(const [element,adapter] of dates){if(!element.isConnected){adapter.observer.disconnect();adapter.root.unmount();adapter.mount.remove();dates.delete(element);}}for(const [element,adapter] of selects){if(!element.isConnected){adapter.observer.disconnect();adapter.root.unmount();adapter.mount.remove();selects.delete(element);}}scan();});});observer.observe(document.body,{childList:true,subtree:true});},
 confirm({title='确认删除',description='',action='删除',input=false,optionalInput=false,initialValue=''}){return new Promise(resolve=>{const mount=document.createElement('div');mount.dataset.uiRoot='';mount.dataset.uiOwner='confirmation';document.body.append(mount);const root=createRoot(mount);const opener=captureDialogOpener();function finish(result){flushSync(()=>root.render(null));mount.remove();queueMicrotask(()=>{if(opener?.isConnected&&opener.getClientRects().length)opener.focus();});resolve(result);}function Confirmation(){const field=useRef(null);return <Dialog open onOpenChange={v=>{if(!v)finish(input?null:false);}}><DialogContent className='ui-confirm-dialog' showCloseButton={false} onOpenAutoFocus={e=>{if(!input){e.preventDefault();document.getElementById('ui-confirm-cancel')?.focus();}}}><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>{input&&<label className='ui-confirm-field'>{optionalInput?'名称（可选）':'名称'}<input ref={field} data-ui-control='input' defaultValue={initialValue} maxLength={100} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&(optionalInput||field.current.value.trim()))finish(field.current.value.trim());}}/></label>}<DialogFooter><Button id='ui-confirm-cancel' variant='outline' onClick={()=>finish(input?null:false)}>取消</Button><Button variant={input?'default':'destructive'} onClick={()=>{if(input&&!optionalInput&&!field.current.value.trim()){field.current.focus();return;}finish(input?field.current.value.trim():true);}}>{action}</Button></DialogFooter></DialogContent></Dialog>;}flushSync(()=>root.render(<Confirmation/>));});}
};

window.WorkspacePrimitives=workspacePrimitives;
