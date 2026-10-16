// Shared shadcn/ui adapters for the existing DOM-owned business forms.
// Forms retain their IDs, listeners, FormData and existing cloud persistence.
import React,{useCallback,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {WorkspaceSelect} from '@/components/workspace-select';
const dialogs=new WeakMap(),selects=new Map(),forms=new WeakSet();
const excluded='[data-ilamy-portal],.ilamy-surface,[data-tasks-root],[data-tasks-portal],[data-shell-root],[data-shell-portal],[data-ui-owner]';
function ExistingDialog({element,parking,open,dismiss,closed}){
 const host=useRef(null);
 const attach=useCallback(node=>{host.current=node;if(node){element.removeAttribute('aria-hidden');element.removeAttribute('data-aria-hidden');node.append(element);}else parking.after(element);},[element,parking]);

 const title=element.querySelector('h1,h2,h3')?.textContent||'编辑内容';
 return <Dialog open={open} onOpenChange={v=>{if(!v)dismiss();}}><DialogContent aria-labelledby={element.querySelector('h1,h2,h3')?.id} className={'ui-business-dialog '+(element.id==='drivePreview'?'ui-wide-dialog':element.id==='issueDetails'?'ui-project-drawer':'')} showCloseButton={false} onOpenAutoFocus={e=>{e.preventDefault();const first=element.querySelector('input:not([type=hidden]):not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href]');first?.focus();}} onCloseAutoFocus={e=>{e.preventDefault();closed();}} onEscapeKeyDown={e=>{e.preventDefault();dismiss();}} onPointerDownOutside={e=>{if(e.target instanceof Element&&e.target.closest('[data-slot=select-content]')){e.preventDefault();return;}e.preventDefault();dismiss();}}><DialogTitle className='sr-only' aria-hidden='true'>{title}</DialogTitle><DialogDescription className='sr-only'>填写内容后保存，或关闭返回当前页面。</DialogDescription><div ref={attach} className='ui-dialog-body'/></DialogContent></Dialog>;
}
function enhanceDialog(element){
 if(dialogs.has(element))return;
 const heading=element.querySelector('h1,h2,h3');if(heading&&!heading.id)heading.id=element.id+'-title';
 const parking=document.createComment('shadcn dialog '+element.id);element.before(parking);
 const mount=document.createElement('div');mount.dataset.uiOwner='dialog';document.body.append(mount);const root=createRoot(mount);
 let opener=null,opened=false;
 const finishFocus=()=>{if(opener?.isConnected)opener.focus();};
 const close=value=>{if(!opened)return;opened=false;element.removeAttribute('open');element.returnValue=value||'';parking.after(element);flushSync(()=>root.render(null));element.dispatchEvent(new Event('close'));finishFocus();};
 const dismiss=()=>{const cancel=new Event('cancel',{cancelable:true});if(element.dispatchEvent(cancel))close();};
 element.dataset.uiDialog='';element.setAttribute('role','presentation');
 element.showModal=()=>{if(opened)return;opener=document.activeElement;opened=true;element.setAttribute('open','');flushSync(()=>root.render(<ExistingDialog element={element} parking={parking} open dismiss={dismiss} closed={finishFocus}/>));scan(element);element.querySelectorAll('select[data-ui-native]').forEach(select=>selects.get(select)?.render());};
 element.close=close;dialogs.set(element,{root,close});
}
function enhanceSelect(element){
 if(selects.has(element)||element.multiple||element.closest(excluded)||element.dataset.uiNative!==undefined)return;
 const mount=document.createElement('span');mount.dataset.uiRoot='';mount.dataset.uiOwner='select';mount.className='ui-select-mount';element.after(mount);const root=createRoot(mount);
 const triggerId=(element.id||'select-'+crypto.randomUUID())+'-control';
 const label=()=>element.getAttribute('aria-label')||element.labels?.[0]?.textContent||'选择选项';
 const render=()=>{mount.hidden=element.hidden||element.classList.contains('hidden');root.render(<WorkspaceSelect value={element.value} label={label()} id={triggerId} disabled={element.disabled} options={Array.from(element.options).map(o=>({value:o.value,label:o.textContent,disabled:o.disabled}))} onValueChange={value=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));render();}}/>);};
 const labels=Array.from(element.labels||[]);for(const l of labels)l.addEventListener('click',()=>document.getElementById(triggerId)?.focus());
 element.dataset.uiNative='';element.setAttribute('aria-hidden','true');element.tabIndex=-1;
 const observer=new MutationObserver(render);observer.observe(element,{attributes:true,childList:true,subtree:true});element.addEventListener('change',render);
 const onReset=()=>queueMicrotask(render);element.form?.addEventListener('reset',onReset);
 selects.set(element,{root,mount,observer,onReset,render});render();
}
function enhanceForm(form){
 if(forms.has(form)||form.closest(excluded))return;forms.add(form);form.noValidate=true;
 form.addEventListener('submit',event=>{const invalid=Array.from(form.elements).find(field=>field.willValidate&&!field.validity.valid);if(!invalid)return;event.preventDefault();event.stopImmediatePropagation();let error=form.querySelector('.form-error');if(!error){error=document.createElement('p');error.className='form-error';error.setAttribute('role','alert');form.append(error);}if(!error.id)error.id='form-error-'+crypto.randomUUID();invalid.setAttribute('aria-invalid','true');invalid.setAttribute('aria-describedby',error.id);const label=invalid.labels?.[0]?.textContent||'内容';error.textContent=invalid.validity.valueMissing?'请填写'+label:invalid.validity.typeMismatch?'请填写有效的'+label:invalid.validity.rangeUnderflow||invalid.validity.rangeOverflow?label+'不在允许范围内，请检查后重试。':label+'格式不正确，请检查后重试。';(document.getElementById(invalid.id+'-control')||invalid).focus();},true);
 const clear=event=>{event.target.removeAttribute?.('aria-invalid');};form.addEventListener('input',clear);form.addEventListener('change',clear);
}
function scan(scope=document){
 scope.querySelectorAll('form').forEach(enhanceForm);
 scope.querySelectorAll('dialog:not([data-ui-dialog])').forEach(el=>{if(!el.closest(excluded))enhanceDialog(el);});
 scope.querySelectorAll('select:not([data-ui-native])').forEach(enhanceSelect);
 scope.querySelectorAll('button.btn,a.btn,.actions>button,.card-head>button,input:not([type=checkbox]):not([type=file]):not([type=hidden]),textarea').forEach(el=>{if(!el.closest(excluded)){const kind=el.tagName==='TEXTAREA'?'textarea':el.matches('input')?'input':'button';if(el.dataset.uiControl!==kind)el.dataset.uiControl=kind;}});
}
let installed=false;
window.WorkspacePrimitives={install(){if(installed)return;installed=true;document.body.classList.add('shadcn-controls');scan();let queued=false;const observer=new MutationObserver(records=>{if(!records.some(r=>Array.from(r.addedNodes).some(n=>n instanceof Element&&!n.closest('[data-ui-owner]'))||r.removedNodes.length))return;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;for(const [element,adapter] of selects){if(!element.isConnected){adapter.observer.disconnect();adapter.root.unmount();adapter.mount.remove();selects.delete(element);}}scan();});});observer.observe(document.body,{childList:true,subtree:true});},
 confirm({title='确认删除',description='',action='删除',input=false,initialValue=''}){return new Promise(resolve=>{const mount=document.createElement('div');mount.dataset.uiRoot='';mount.dataset.uiOwner='confirmation';document.body.append(mount);const root=createRoot(mount);const opener=document.activeElement;function finish(result){flushSync(()=>root.render(null));mount.remove();opener?.isConnected&&opener.focus();resolve(result);}function Confirmation(){const field=useRef(null);return <Dialog open onOpenChange={v=>{if(!v)finish(input?null:false);}}><DialogContent className='ui-confirm-dialog' showCloseButton={false} onOpenAutoFocus={e=>{if(!input){e.preventDefault();document.getElementById('ui-confirm-cancel')?.focus();}}}><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>{input&&<label className='ui-confirm-field'>名称<input ref={field} data-ui-control='input' defaultValue={initialValue} maxLength={100} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&field.current.value.trim())finish(field.current.value.trim());}}/></label>}<DialogFooter><Button id='ui-confirm-cancel' variant='outline' onClick={()=>finish(input?null:false)}>取消</Button><Button variant={input?'default':'destructive'} onClick={()=>{if(input&&!field.current.value.trim()){field.current.focus();return;}finish(input?field.current.value.trim():true);}}>{action}</Button></DialogFooter></DialogContent></Dialog>;}flushSync(()=>root.render(<Confirmation/>));});}
};
