import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Magnet from './vendor/react-bits/Magnet';
import BlurText from './vendor/react-bits/BlurText';
import {useWorkspaceMotionOff} from './workspace-motion-policy';

const buttonSelector='.header-actions .btn.primary,#content .btn.primary,#content [data-slot="button"][data-variant="default"]';
let nextNodeId=0;
const nodeIds=new WeakMap<HTMLElement,number>();
const nodeKey=(node:HTMLElement)=>{if(!nodeIds.has(node))nodeIds.set(node,++nextNodeId);return nodeIds.get(node)!;};
type Targets={buttons:HTMLElement[];covers:HTMLElement[]};
const same=(a:HTMLElement[],b:HTMLElement[])=>a.length===b.length&&a.every((node,i)=>node===b[i]);

export function WorkspaceReactBits(){
 const off=useWorkspaceMotionOff();
 const [complete,setComplete]=useState(false);
 const completeTimer=useRef(0);
 const [targets,setTargets]=useState<Targets>({buttons:[],covers:[]});
 useEffect(()=>{
  let frame=0;
  const scan=()=>{
   frame=0;
   const buttons=Array.from(document.querySelectorAll<HTMLElement>(buttonSelector)).filter(node=>!node.closest('dialog,[role=dialog],.annual-chart,.ilamy-calendar')).slice(0,8);
   const covers=Array.from(document.querySelectorAll<HTMLElement>('#content .media-wall-cover'));
   setTargets(old=>same(buttons,old.buttons)&&same(covers,old.covers)?old:{buttons,covers});
  };
  const queue=(records:MutationRecord[])=>{
   if(records.every(record=>(record.target as Element).closest?.('[data-rb-decoration]')))return;
   if(!frame)frame=requestAnimationFrame(scan);
  };
  const observer=new MutationObserver(queue);
  const content=document.getElementById('content');if(content)observer.observe(content,{subtree:true,childList:true});
  observer.observe(document.body,{attributes:true,attributeFilter:['data-workspace-view']});scan();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{
  if(off)return;
  const celebrate=(event:Event)=>{const {complete}=(event as CustomEvent<{complete:boolean}>).detail;if(complete){setComplete(true);clearTimeout(completeTimer.current);completeTimer.current=window.setTimeout(()=>setComplete(false),2200);}};
  window.addEventListener('workspace-celebrate',celebrate);
  return()=>{window.removeEventListener('workspace-celebrate',celebrate);clearTimeout(completeTimer.current);setComplete(false);};
 },[off]);
 if(off)return null;
 return <>
  {complete&&createPortal(<div className='wb-day-complete' role='status'><BlurText text='今日英语与健身，全部打卡完成 ✓' trigger='load' animateBy='letters' delay={16} stepDuration={.14} distance={6} blur={5}/></div>,document.body)}
  {targets.buttons.map(target=><Magnet key={'button-'+nodeKey(target)} target={target} padding={12} maxOffset={2} magnetStrength={12} spring={{stiffness:170,damping:22}}/>)}
  {targets.covers.map(target=><Magnet key={'cover-'+nodeKey(target)} target={target} motionTarget={target.querySelector<HTMLElement>('img')||target} padding={0} maxOffset={0} tilt={7} scale={1.025} exclusive={false} spring={{stiffness:170,damping:22}}/>)}
 </>;
}
