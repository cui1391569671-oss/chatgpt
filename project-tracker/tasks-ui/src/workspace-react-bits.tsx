import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Magnet from './vendor/react-bits/Magnet';
import AnimatedContent from './vendor/react-bits/AnimatedContent';
import BlurText from './vendor/react-bits/BlurText';
import {useWorkspaceMotionOff,motionTiming,motionEase,workspaceCardSelector} from './workspace-motion-policy';

const cardSelector=workspaceCardSelector.split(',').map(selector=>'#content '+selector).join(',');
const buttonSelector='.header-actions .btn.primary,#content .btn.primary,#content [data-slot="button"][data-variant="default"]';
let lastHeadingView='';
let nextNodeId=0;
const nodeIds=new WeakMap<HTMLElement,number>();
const nodeKey=(node:HTMLElement)=>{if(!nodeIds.has(node))nodeIds.set(node,++nextNodeId);return nodeIds.get(node)!;};
type Targets={cards:HTMLElement[];buttons:HTMLElement[];covers:HTMLElement[];title:HTMLElement|null;view:string};
const same=(a:HTMLElement[],b:HTMLElement[])=>a.length===b.length&&a.every((node,i)=>node===b[i]);

// Keep completed card identities across native DOM rebuilds within one visit.
function AnimatedCards({cards,view}:{cards:HTMLElement[];view:string}){
 const completed=useRef(new Set<string>());
 return <>{cards.map((target,index)=>{const identity=target.dataset.motionCard||target.closest<HTMLElement>('[data-tile]')?.dataset.tile||target.id||target.className+':'+index;return <CardEntrance key={nodeKey(target)} target={target} index={index} identity={identity} completed={completed.current} stationary={view==='calendar'}/>;})}</>;
}
function CardEntrance({target,index,identity,completed,stationary}:{target:HTMLElement;index:number;identity:string;completed:Set<string>;stationary:boolean}){
 const [animate]=useState(()=>!completed.has(identity));
 return animate?<AnimatedContent target={target} container={document.getElementById('content')} trigger='scroll' once distance={stationary?0:motionTiming.distance} duration={motionTiming.card/1000} ease={motionEase.gsap} initialOpacity={0} delay={Math.min(index*motionTiming.stagger,motionTiming.staggerMax)/1000} threshold={.05} onComplete={()=>completed.add(identity)}/>:null;
}

// Add decoration to existing nodes. Never wrap, clone or replace business controls.
function AnimatedHeading({target,view}:{target:HTMLElement;view:string}){
 const [animate]=useState(()=>{const play=lastHeadingView!==view;lastHeadingView=view;return play;});
 return animate?<AnimatedContent target={target} trigger='mount' distance={0} duration={motionTiming.heading/1000} blur={7} initialOpacity={.35}/>:null;
}

export function WorkspaceReactBits(){
 const off=useWorkspaceMotionOff();
 const [complete,setComplete]=useState(false);
 const completeTimer=useRef(0);
 const [targets,setTargets]=useState<Targets>({cards:[],buttons:[],covers:[],title:null,view:''});
 useEffect(()=>{
  let frame=0;
  const scan=()=>{
   frame=0;
   const cards=Array.from(document.querySelectorAll<HTMLElement>(cardSelector)).filter(node=>!node.parentElement?.closest(workspaceCardSelector)&&!node.closest('[role=dialog],dialog,.ilamy-calendar,.annual-chart'));
   const buttons=Array.from(document.querySelectorAll<HTMLElement>(buttonSelector)).filter(node=>!node.closest('dialog,[role=dialog],.annual-chart,.ilamy-calendar')).slice(0,8);
   const covers=Array.from(document.querySelectorAll<HTMLElement>('#content .media-wall-cover'));
   const title=document.querySelector<HTMLElement>('#content .home2-intro h1,#content .workspace-page-hero h1,#content .workspace-page-hero h2');
   const view=document.body.dataset.workspaceView||'';
   setTargets(old=>same(cards,old.cards)&&same(buttons,old.buttons)&&same(covers,old.covers)&&title===old.title&&view===old.view?old:{cards,buttons,covers,title,view});
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
  {targets.view&&<AnimatedCards key={targets.view} cards={targets.cards} view={targets.view}/>}
  {targets.buttons.map(target=><Magnet key={'button-'+nodeKey(target)} target={target} padding={12} maxOffset={2} magnetStrength={12} spring={{stiffness:170,damping:22}}/>)}
  {targets.covers.map(target=><Magnet key={'cover-'+nodeKey(target)} target={target} motionTarget={target.querySelector<HTMLElement>('img')||target} padding={0} maxOffset={0} tilt={7} scale={1.025} exclusive={false} spring={{stiffness:170,damping:22}}/>)}
  {targets.title&&<AnimatedHeading key={nodeKey(targets.title)} target={targets.title} view={targets.view}/>}
 </>;
}
