import {createRoot, type Root} from 'react-dom/client';
import {WorkspaceSegment} from './components/workspace-segment';

type Adapter={source:HTMLElement;mount:HTMLDivElement;root:Root;render:()=>void};
const adapters=new Map<HTMLElement,Adapter>();
const previous=new Map<string,string>();
const focusRequests=new Set<string>();
const definitions=[
 {selector:'.view-tabs',buttons:'button[data-nav]',key:'pages',label:'记录页面'},
 {selector:'.media-filters',buttons:'button[data-media-filter]',key:'media',label:'作品类别'},
 {selector:'.wardrobe-tabs',buttons:'button[data-wardrobe-mode]',key:'wardrobe',label:'衣橱视图'},
 {selector:'#workspaceCalendar [data-testid="calendar-header"] [data-slot="toggle-group"]',buttons:'button',key:'calendar',label:'日历视图'}
];
const selected=(button:HTMLButtonElement)=>button.getAttribute('aria-pressed')==='true'||button.getAttribute('aria-checked')==='true'||button.dataset.state==='on'||button.classList.contains('primary');
function scan(){
 for(const [source,adapter] of adapters){if(!source.isConnected){adapter.root.unmount();adapter.mount.remove();adapters.delete(source);}}
 for(const definition of definitions)for(const source of document.querySelectorAll<HTMLElement>(definition.selector)){
  if(adapters.has(source))continue;
  if(definition.key==='pages'&&getComputedStyle(source).display==='none')continue;
  const buttons=Array.from(source.querySelectorAll<HTMLButtonElement>(definition.buttons));
  if(buttons.length<2)continue;
  const mount=document.createElement('div');mount.dataset.uiOwner='rubber-segment';
  mount.className='wb-segment-native'+(definition.key==='pages'?' wb-segment-page-tabs':'');
  // Preserve the calendar's own responsive dropdown/desktop switch breakpoint.
  if(definition.key==='calendar')mount.classList.add(...Array.from(source.classList).filter(name=>name==='hidden'||name.includes('/base-header:')));
  if(definition.key==='wardrobe')buttons[0].before(mount);else source.before(mount);
  // Keep every original node/listener and any independent action beside the switch.
  for(const button of buttons){button.hidden=true;button.style.display='none';}
  if(definition.key!=='wardrobe')source.style.display='none';
  const root=createRoot(mount);
  const values=buttons.map((button,index)=>button.dataset.nav||button.dataset.mediaFilter||button.dataset.wardrobeMode||String(index));
  const current=()=>values[Math.max(0,buttons.findIndex(selected))];
  const transitionFrom=previous.get(definition.key);
  const render=()=>{
   if(!source.isConnected)return;
   const value=current();previous.set(definition.key,value);
   root.render(<WorkspaceSegment label={definition.label} value={value} transitionFrom={transitionFrom} focusSelection={focusRequests.has(definition.key)} onFocusRestored={()=>focusRequests.delete(definition.key)} disabled={buttons.some(button=>button.disabled)} items={buttons.map((button,index)=>({value:values[index],label:button.textContent?.trim()||values[index]}))} onChange={next=>{
    const button=buttons[values.indexOf(next)];if(!button||button.disabled)return false;
    focusRequests.add(definition.key);
    previous.set(definition.key,value);button.click();
    queueMicrotask(()=>{
     if(source.isConnected)render();

    });
    const accepted=!source.isConnected||current()===next;
    if(!accepted)focusRequests.delete(definition.key);
    return accepted;
   }}/>);
  };
  adapters.set(source,{source,mount,root,render});render();
 }
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();for(const adapter of adapters.values())adapter.render();});}
function install(){scan();new MutationObserver(records=>{
 if(records.some(record=>!(record.target instanceof Element&&record.target.closest('[data-ui-owner="rubber-segment"]'))))schedule();
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-checked','data-state','disabled','class']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
