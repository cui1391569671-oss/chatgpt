import {useLayoutEffect,useRef,useState} from 'react';
import {MoreHorizontal} from 'lucide-react';
import {WorkspaceIconButton} from './workspace-icon-action';

// One page owns each control. Collapse changes visibility, never parents or handlers.
export function WorkspacePageActionBar({actions,view}:{actions:HTMLElement;view:string}){
 const host=useRef<HTMLDivElement>(null),more=useRef<HTMLButtonElement>(null);
 const [expanded,setExpanded]=useState(false),[overflow,setOverflow]=useState(false);
 useLayoutEffect(()=>{const mount=host.current;if(mount&&actions.parentElement!==mount)mount.prepend(actions);},[actions]);
 useLayoutEffect(()=>{
  const mount=host.current;if(!mount)return;let frame=0,disposed=false;
  const marked=new Set<HTMLElement>();
  const walk=(node:HTMLElement,units:HTMLElement[])=>{
   if(node.hidden||node.classList.contains('hidden')||getComputedStyle(node).display==='none')return;
   if(node.matches('.workspace-search,[data-workspace-segment],.wb-segment-scroll,[role=radiogroup],.workspace-view-actions,.ui-select-mount,.workspace-select,.workspace-checkbox-target,button,a,label,input,select,form')){
    if(!node.matches('[data-ui-native],[data-workspace-file-native],input[type=hidden]'))units.push(node);return;
   }
   if(!node.children.length){if(node.textContent?.trim())units.push(node);return;}
   node.dataset.pageActionGroup='';marked.add(node);
   for(const child of Array.from(node.children))if(child instanceof HTMLElement)walk(child,units);
  };
  const layout=()=>{
   frame=0;if(disposed||!mount.isConnected)return;
   for(const node of marked){delete node.dataset.pageActionOverflow;if(!actions.contains(node)){delete node.dataset.pageActionGroup;delete node.dataset.pageActionUnit;node.classList.remove('wb-page-action-compact');marked.delete(node);}}
   const units:HTMLElement[]=[];for(const child of Array.from(actions.children))if(child instanceof HTMLElement)walk(child,units);
   for(const unit of units){
    unit.dataset.pageActionUnit='';marked.add(unit);
    if(unit.matches('button,a')&&unit.querySelector('svg')&&!unit.matches('[role=combobox],[role=radio],[aria-haspopup],[aria-busy]')){
     const label=unit.getAttribute('aria-label')||unit.dataset.iconLabel||unit.textContent?.trim();
     if(label){if(!unit.hasAttribute('aria-label'))unit.setAttribute('aria-label',label);unit.dataset.iconLabel=label;if(!unit.classList.contains('wb-page-action-compact'))unit.classList.add('wb-page-action-compact');}
    }
   }
   const available=mount.clientWidth,gap=8;
   const sizes=units.map(unit=>({unit,width:unit.getBoundingClientRect().width}));
   const total=sizes.reduce((sum,item)=>sum+item.width+gap,0)-gap,needs=total>available+1;
   let remaining=available-(needs?52:0),first=true;
   // Keep the primary operation reachable before optional view groups.
   const primary=(unit:HTMLElement)=>unit.matches('.primary,[data-variant=default],#add')||unit.style.background.includes('--btn-primary');
   const priority=sizes.slice().sort((a,b)=>Number(primary(b.unit))-Number(primary(a.unit)));
   for(const {unit,width} of priority){const needed=width+(first?0:gap);if(needed<=remaining+1){remaining-=needed;first=false;}else if(unit.contains(document.activeElement))setExpanded(true);else unit.dataset.pageActionOverflow='';}
   setOverflow(needs);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
  const observer=new MutationObserver(schedule);observer.observe(actions,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled','aria-label']});
  const resize=new ResizeObserver(schedule);resize.observe(mount);setExpanded(false);schedule();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();for(const node of marked){delete node.dataset.pageActionOverflow;delete node.dataset.pageActionGroup;delete node.dataset.pageActionUnit;node.classList.remove('wb-page-action-compact');}};
 },[actions,view]);
 return <div ref={host} className='wb-page-action-bar' data-expanded={expanded} data-has-overflow={overflow} onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented&&expanded){event.preventDefault();setExpanded(false);more.current?.focus();}}}>
  <WorkspaceIconButton ref={more} className='wb-page-actions-more' icon={MoreHorizontal} label={expanded?'收起本页操作':'展开本页操作'} aria-expanded={expanded} aria-controls='workspacePageActions' hidden={!overflow} onClick={()=>setExpanded(value=>!value)}/>
 </div>;
}
