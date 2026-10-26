import {createRoot,type Root} from 'react-dom/client';
import {WorkspaceCompletion} from './components/workspace-completion';
const selector='input[data-home-task],input[data-daily-checkin],input[data-requirement-toggle],input[data-toggle],input[data-event-toggle],input[data-routine-toggle],body.modern-project td input[type=checkbox][data-idx]';
type Adapter={mount:HTMLSpanElement;root:Root;observer:MutationObserver;render:()=>void;restore:()=>void};
const adapters=new Map<HTMLInputElement,Adapter>();
const progress=new Map<string,number>();
let focusedKey='';
const checkedProperty=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'checked')!;
function enhance(input:HTMLInputElement){
 if(adapters.has(input))return;
 const label=input.closest('label');
 const text=input.dataset.completionLabel||'';
 const name=input.getAttribute('aria-label')||label?.getAttribute('aria-label')||text;
 const key=location.pathname+':'+[...input.attributes].filter(a=>a.name.startsWith('data-')&&a.name!=='data-ui-control'&&a.name!=='data-completion-source').map(a=>a.name+'='+a.value).join(';')+':'+name.replace(/^(?:取消完成需求|完成需求|完成问题|完成待办|完成日程|完成每日事项|完成)：/,'');
 const mount=document.createElement('span');mount.dataset.uiOwner='spring-check';mount.className='wb-completion-mount';mount.dataset.completionMount='';
 // Original fields own existing change handlers and checked/disabled rollback. They
 // remain only as nonvisible, nonfocusable backing fields, never as a second UI.
 input.before(mount);input.hidden=true;input.style.display='none';input.tabIndex=-1;input.dataset.completionSource='';
 const root=createRoot(mount);let button:HTMLButtonElement|null=null;
 const ownChecked=Object.getOwnPropertyDescriptor(input,'checked'),ownFocus=Object.getOwnPropertyDescriptor(input,'focus');
 const render=()=>{
  if(!input.isConnected)return;
  root.render(<WorkspaceCompletion label={text} ariaLabel={name} checked={input.checked} disabled={input.matches(':disabled')} initialProgress={progress.get(key)} onProgress={value=>{progress.set(key,value);if(progress.size>500)progress.delete(progress.keys().next().value!);}} buttonRef={node=>{button=node;if(node&&focusedKey===key&&document.activeElement===document.body)node.focus({preventScroll:true});}} onFocus={()=>{focusedKey=key;}} onChange={checked=>{
   if(input.matches(':disabled'))return;
   focusedKey=key;input.checked=checked;
   input.dispatchEvent(new Event('change',{bubbles:true}));render();
  }}/>);
  if(focusedKey===key&&document.activeElement===document.body)queueMicrotask(()=>button?.focus({preventScroll:true}));
 };
 Object.defineProperty(input,'checked',{configurable:true,get(){return checkedProperty.get!.call(input);},set(value){checkedProperty.set!.call(input,value);render();}});
 Object.defineProperty(input,'focus',{configurable:true,value:(options?:FocusOptions)=>button?.focus(options)});
 const observer=new MutationObserver(render);observer.observe(input,{attributes:true,attributeFilter:['checked','disabled','aria-label']});
 const restore=()=>{if(ownChecked)Object.defineProperty(input,'checked',ownChecked);else delete (input as any).checked;if(ownFocus)Object.defineProperty(input,'focus',ownFocus);else delete (input as any).focus;};
 adapters.set(input,{mount,root,observer,render,restore});render();
}
let queued=false;
function scan(){
 for(const [input,adapter] of adapters)if(!input.isConnected){adapter.observer.disconnect();adapter.restore();adapter.root.unmount();adapter.mount.remove();adapters.delete(input);}
 document.querySelectorAll<HTMLInputElement>(selector).forEach(enhance);
}
function install(){scan();new MutationObserver(records=>{if(queued||!records.some(r=>r.target instanceof Element&&!r.target.closest('[data-ui-owner="spring-check"]')))return;queued=true;queueMicrotask(()=>{queued=false;scan();});}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
