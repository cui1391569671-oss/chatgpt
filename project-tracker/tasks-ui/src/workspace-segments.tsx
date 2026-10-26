import {createRoot,type Root} from 'react-dom/client';
import {WorkspaceSegment} from './components/workspace-segment';
import {workspaceSegmentMarkup} from './components/workspace-segment-markup.mjs';

type Adapter={mount:HTMLElement;root:Root;render:()=>void};
const adapters=new Map<HTMLElement,Adapter>();
const previous=new Map<string,string>();
const focusRequests=new Set<string>();
export const workspaceSegments={markup:workspaceSegmentMarkup};
window.WorkspaceSegments=workspaceSegments;

function attach(source:HTMLElement,mount:HTMLElement,key:string,label:string,read:()=>{value:string;disabled:boolean;items:{value:string;label:string}[]},change:(next:string)=>boolean){
 const root=createRoot(mount),transitionFrom=previous.get(key);
 const render=()=>{
  if(!source.isConnected)return;
  const props=read();previous.set(key,props.value);
  root.render(<WorkspaceSegment {...props} label={label} transitionFrom={transitionFrom} focusSelection={focusRequests.has(key)} onFocusRestored={()=>focusRequests.delete(key)} onChange={next=>{
   focusRequests.add(key);previous.set(key,props.value);
   const accepted=change(next);
   if(!accepted)focusRequests.delete(key);
   if(source.isConnected)queueMicrotask(render);
   return accepted;
  }}/>);
 };
 adapters.set(source,{mount,root,render});render();
}
function scan(){
 for(const [source,adapter] of adapters)if(!source.isConnected){adapter.root.unmount();if(adapter.mount!==source)adapter.mount.remove();adapters.delete(source);}
 for(const source of document.querySelectorAll<HTMLElement>('[data-workspace-segment]')){
  if(adapters.has(source))continue;
  const items=JSON.parse(source.dataset.segmentItems);
  attach(source,source,source.dataset.workspaceSegment,source.dataset.segmentLabel,()=>({items,value:source.dataset.segmentValue,disabled:source.dataset.segmentDisabled==='true'}),next=>source.dispatchEvent(new CustomEvent('workspace-segment-change',{bubbles:true,cancelable:true,detail:{key:source.dataset.workspaceSegment,value:next}})));
 }
 // The library owns this Radix tree. Retain its nodes solely as the calendar API
 // bridge; application-owned choice groups above contain no legacy buttons.
 for(const source of document.querySelectorAll<HTMLElement>('#workspaceCalendar [data-testid="calendar-header"] [data-slot="toggle-group"]')){
  if(adapters.has(source))continue;
  const buttons=Array.from(source.querySelectorAll<HTMLButtonElement>('button'));
  if(buttons.length<2)continue;
  const mount=document.createElement('div');mount.dataset.uiOwner='rubber-segment';mount.className='wb-segment-native';
  mount.classList.add(...Array.from(source.classList).filter(name=>name==='hidden'||name.includes('/base-header:')));
  source.before(mount);source.hidden=true;source.style.display='none';
  const value=()=>String(Math.max(0,buttons.findIndex(button=>button.dataset.state==='on'||button.getAttribute('aria-checked')==='true')));
  attach(source,mount,'calendar','日历视图',()=>({items:buttons.map((button,index)=>({value:String(index),label:button.textContent.trim()})),value:value(),disabled:buttons.some(button=>button.disabled)}),next=>{const button=buttons[Number(next)];if(!button||button.disabled)return false;button.click();return value()===next;});
 }
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();for(const adapter of adapters.values())adapter.render();});}
function install(){scan();new MutationObserver(records=>{
 if(records.some(record=>record.target instanceof Element&&(record.target.matches('[data-workspace-segment]')||!record.target.closest('[data-ui-owner="rubber-segment"]'))))schedule();
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-checked','data-state','disabled','data-segment-value','data-segment-disabled']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
