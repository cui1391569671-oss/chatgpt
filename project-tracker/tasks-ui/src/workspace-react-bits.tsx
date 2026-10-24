import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import ClickSpark,{type ClickSparkHandle} from './vendor/react-bits/ClickSpark';
import SpotlightCard from './vendor/react-bits/SpotlightCard';
import Magnet from './vendor/react-bits/Magnet';
import AnimatedContent from './vendor/react-bits/AnimatedContent';
import BlurText from './vendor/react-bits/BlurText';
import {motionTiming,useWorkspaceMotionOff} from './workspace-motion-policy';

const cardSelector='#content .card,#content .workspace-board-card,#content .workspace-goal-card';
const buttonSelector='.header-actions .btn.primary,#content .btn.primary,#content [data-slot="button"][data-variant="default"]';
let lastHeadingView='';
let nextNodeId=0;
const nodeIds=new WeakMap<HTMLElement,number>();
const nodeKey=(node:HTMLElement)=>{if(!nodeIds.has(node))nodeIds.set(node,++nextNodeId);return nodeIds.get(node)!;};
type Targets={cards:HTMLElement[];buttons:HTMLElement[];covers:HTMLElement[];title:HTMLElement|null;view:string};
const same=(a:HTMLElement[],b:HTMLElement[])=>a.length===b.length&&a.every((node,i)=>node===b[i]);

// Add decoration to existing nodes. Never wrap, clone or replace business controls.
function AnimatedHeading({target,view}:{target:HTMLElement;view:string}){
 const [animate]=useState(()=>{const play=lastHeadingView!==view;lastHeadingView=view;return play;});
 return animate?<AnimatedContent target={target} trigger='mount' distance={0} duration={.48} blur={7} initialOpacity={.35}/>:null;
}

export function WorkspaceReactBits(){
 const off=useWorkspaceMotionOff(),spark=useRef<ClickSparkHandle>(null);
 const [complete,setComplete]=useState(false);
 const completeTimer=useRef(0);
 const [targets,setTargets]=useState<Targets>({cards:[],buttons:[],covers:[],title:null,view:''});
 useEffect(()=>{
  let frame=0;
  const scan=()=>{
   frame=0;
   const cards=Array.from(document.querySelectorAll<HTMLElement>(cardSelector)).filter(node=>!node.parentElement?.closest('.card'));
   const buttons=Array.from(document.querySelectorAll<HTMLElement>(buttonSelector)).filter(node=>!node.closest('dialog,[role=dialog],.annual-chart,.ilamy-calendar')).slice(0,8);
   const covers=Array.from(document.querySelectorAll<HTMLElement>('#content .media-wall-cover'));
   const title=document.querySelector<HTMLElement>('#content .home2-intro h1,#content .workspace-page-hero h1,#content .workspace-page-hero h2');
   const view=document.body.dataset.workspaceView||'';
   setTargets(old=>same(cards,old.cards)&&same(buttons,old.buttons)&&same(covers,old.covers)&&title===old.title&&view===old.view?old:{cards,buttons,covers,title,view});
  };
  const queue=(records:MutationRecord[])=>{
   if(records.every(record=>(record.target as Element).closest?.('[data-rb-decoration],.spotlight-card__light,.spotlight-card__grain,.spotlight-card__edge')))return;
   if(!frame)frame=requestAnimationFrame(scan);
  };
  const observer=new MutationObserver(queue);
  const content=document.getElementById('content');if(content)observer.observe(content,{subtree:true,childList:true});
  observer.observe(document.body,{attributes:true,attributeFilter:['data-workspace-view']});scan();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{
  if(off)return;
  const click=(event:MouseEvent)=>{
   if(!(event.target instanceof Element))return;
   const target=event.target.closest<HTMLElement>('button,.btn,a[href]');
   if(!target||target.matches(':disabled,[aria-disabled=true]')||target.closest('[inert]')||target.matches('[role=checkbox]'))return;
   const rect=target.getBoundingClientRect();
   spark.current?.spark(event.detail?event.clientX:rect.left+rect.width/2,event.detail?event.clientY:rect.top+rect.height/2);
  };
  const celebrate=(event:Event)=>{const {rect,complete}=(event as CustomEvent<{rect:DOMRect;complete:boolean}>).detail;spark.current?.spark(rect.left+rect.width/2,rect.top+rect.height/2);if(complete){setComplete(true);clearTimeout(completeTimer.current);completeTimer.current=window.setTimeout(()=>setComplete(false),2200);}};
  document.addEventListener('click',click);window.addEventListener('workspace-celebrate',celebrate);
  return()=>{document.removeEventListener('click',click);window.removeEventListener('workspace-celebrate',celebrate);clearTimeout(completeTimer.current);setComplete(false);};
 },[off]);
 if(off)return null;
 return <>
  {complete&&createPortal(<div className='wb-day-complete' role='status'><BlurText text='今日英语与健身，全部打卡完成 ✓' trigger='load' animateBy='letters' delay={16} stepDuration={.14} distance={6} blur={5}/></div>,document.body)}
  {targets.view&&<AnimatedContent key={targets.view} target={document.getElementById('content')!} trigger='mount' distance={0} duration={motionTiming.page/1000} blur={targets.view==='calendar'?0:2} initialOpacity={.4}/>}
  {createPortal(<ClickSpark ref={spark} sparkColor='var(--semantic-primary)' sparkCount={10} sparkRadius={28} sparkSize={8} duration={480} shape='star' ring glow={.4} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:1000}}/>,document.body)}
  {targets.cards.map(target=><SpotlightCard key={'card-'+nodeKey(target)} target={target} theme='light' spotlightColor='var(--semantic-primary)' intensity={.55} borderGlow={.7} spotlightSize={280} proximity={0} smoothing={.3} grain={0} ambient={false}/>)}
  {targets.buttons.map(target=><Magnet key={'button-'+nodeKey(target)} target={target} padding={12} maxOffset={2} magnetStrength={12} spring={{stiffness:170,damping:22}}/>)}
  {targets.covers.map(target=><Magnet key={'cover-'+nodeKey(target)} target={target} motionTarget={target.querySelector<HTMLElement>('img')||target} padding={0} maxOffset={0} tilt={7} scale={1.025} exclusive={false} spring={{stiffness:170,damping:22}}/>)}
  {targets.title&&<AnimatedHeading key={nodeKey(targets.title)} target={targets.title} view={targets.view}/>}
 </>;
}
