// Motion's public MIT animate/in-view pattern, adapted to existing business nodes.
// https://github.com/motiondivision/motion · https://motion.dev/docs/inview
import {animate} from 'motion/mini';
import {animateAnimatedContent} from './vendor/react-bits/AnimatedContent';
import {motionDisabled,motionTiming,motionEase,workspaceCardSelector} from './workspace-motion-policy';

const cardSelector=workspaceCardSelector;
const surfaceSelector='.project-plan,.annual-chart,.workspace-help-page,.table-wrapper,#projectPanel';
const headingSelector='.wb-page-location h1,.site-home-intro h1,.workspace-page-hero h1,.workspace-page-hero h2,.modern-project .header h1';
const excluded='dialog,[role="dialog"],[data-rb-decoration],[data-motion-skip]';
const recordAttributes=['data-motion-card','data-media-record','data-edit-clothing','data-pick-clothing','data-delete-outfit','data-read-note','data-portrait-id'];
type Playback=Pick<ReturnType<typeof animate>,'cancel'> & {pause?:()=>void};
type Target={identity:string;kind:'heading'|'card'|'surface'};

function identity(element:HTMLElement,index:number){
 for(const attr of recordAttributes){const node=element.hasAttribute(attr)?element:element.querySelector<HTMLElement>('['+attr+']');if(node)return attr+':'+node.getAttribute(attr);}
 const record=element.querySelector<HTMLElement>('[data-id]');
 if(record)return (record.dataset.edit||record.dataset.delete||'record')+':'+record.dataset.id;
 return element.id||element.getAttribute('aria-label')||element.className+':'+index;
}
function stationary(element:HTMLElement,kind:Target['kind']){
 return kind==='surface'||!!element.closest('.calendar-full-surface,.annual-chart,.ilamy-calendar,.project-plan')||!!element.querySelector('iframe,.ilamy-calendar,.annual-chart');
}

export function observeWorkspaceEntrances(){
 let visit='',frame=0,pointerFrame=0,pointerHeld=false,disposed=false;
 const seen=new Set<string>(),pending=new Map<HTMLElement,Target>();
 let nodes=new WeakSet<HTMLElement>();
 const active=new Map<HTMLElement,{animation:Playback;restore:()=>void}>();
 const pressed=new Set<HTMLElement>();
 const finish=(element:HTMLElement)=>{pressed.delete(element);if(!pressed.size){pointerHeld=false;cancelAnimationFrame(pointerFrame);pointerFrame=0;}const entry=active.get(element);if(!entry)return;active.delete(element);entry.animation.cancel();entry.restore();intersection?.unobserve(element);};
 const finishAll=()=>{for(const element of active.keys())finish(element);};
 const reveal=(element:HTMLElement,target:Target,index:number)=>{
  if(seen.has(target.identity)||!element.isConnected)return;
  if(motionDisabled()||document.hidden||element.contains(document.activeElement)){seen.add(target.identity);return;}
  seen.add(target.identity);
  const properties=stationary(element,target.kind)?['opacity']:['opacity','transform'];
  const prior=properties.map(property=>[property,element.style.getPropertyValue(property),element.style.getPropertyPriority(property)]);
  const restore=()=>prior.forEach(([property,value,priority])=>{if(value)element.style.setProperty(property,value,priority);else element.style.removeProperty(property);});
  if(target.kind==='card'&&!stationary(element,target.kind)){
   let dispose:ReturnType<typeof animateAnimatedContent>;
   const animation={cancel:()=>dispose?.(),pause:()=>dispose?.pause()};
   try{
    dispose=animateAnimatedContent(element,{distance:motionTiming.distance,direction:'vertical',duration:motionTiming.card/1000,ease:motionEase.gsap,blur:0,threshold:.1,delay:index*motionTiming.stagger/1000,trigger:'mount',onComplete:()=>{queueMicrotask(()=>{if(active.get(element)?.animation===animation)finish(element);});}});
    active.set(element,{animation,restore});
   }catch{dispose?.();restore();}
   return;
  }
  const keyframes={opacity:[target.kind==='heading'?.4:0,1],...(properties.includes('transform')?{transform:[`translateY(${motionTiming.headingDistance}px)`,'none']}:{})};
  try{
   const animation=animate(element,keyframes,{duration:(target.kind==='heading'?motionTiming.heading:target.kind==='surface'?motionTiming.page:motionTiming.coordinateCard)/1000,delay:target.kind==='heading'?0:Math.min(index*motionTiming.stagger,motionTiming.staggerMax)/1000,ease:motionEase.native});
   active.set(element,{animation,restore});
   void Promise.resolve(animation).then(()=>{if(active.get(element)?.animation===animation)finish(element);});
  }catch{restore();}
 };
 const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
  let index=0;
  for(const entry of entries){const element=entry.target as HTMLElement,target=pending.get(element);if(!entry.isIntersecting){if(active.has(element))finish(element);continue;}if(entry.intersectionRatio<.1||!target)continue;
   pending.delete(element);reveal(element,target,index++);if(!active.has(element))intersection?.unobserve(element);
  }
 },{threshold:.1});
 const register=(element:HTMLElement,target:Target)=>{
  if(nodes.has(element)||!element.getClientRects().length)return;
  nodes.add(element);
  if(seen.has(target.identity))return;
  // Content stays visible before observation and when animation is unavailable.
  if(motionDisabled()||document.hidden){seen.add(target.identity);return;}
  if(intersection&&target.kind!=='heading'){pending.set(element,target);intersection.observe(element);}
  else reveal(element,target,0);
 };
 const scan=()=>{
  frame=0;if(disposed)return;
  const next=location.pathname+':'+(document.body.dataset.workspaceView||'standalone');
  if(next!==visit){finishAll();intersection?.disconnect();pending.clear();seen.clear();nodes=new WeakSet();visit=next;}
  for(const element of active.keys())if(!element.isConnected)finish(element);
  for(const element of pending.keys())if(!element.isConnected){intersection?.unobserve(element);pending.delete(element);}
  const content=document.getElementById('content')||document.querySelector<HTMLElement>('.modern-project .container');
  if(!content)return;
  // A heading node may be reused between routes; its identity belongs to a visit.
  document.querySelectorAll<HTMLElement>(headingSelector).forEach(element=>{
   if(!element.closest(excluded)&&!seen.has('heading:'+visit)){
    reveal(element,{identity:'heading:'+visit,kind:'heading'},0);
   }
  });
  const cards=Array.from(content.querySelectorAll<HTMLElement>(cardSelector)).filter(element=>!element.parentElement?.closest(cardSelector)&&!element.closest(excluded));
  cards.forEach((element,index)=>register(element,{identity:'card:'+identity(element,index),kind:'card'}));
  content.querySelectorAll<HTMLElement>(surfaceSelector).forEach((element,index)=>{
   if(!element.closest(excluded)&&!element.matches(cardSelector)&&!element.closest(cardSelector)&&!element.querySelector(cardSelector))register(element,{identity:'surface:'+identity(element,index),kind:'surface'});
  });
  const projectPanel=document.getElementById('projectPanel');
  if(projectPanel&&!content.contains(projectPanel))register(projectPanel,{identity:'surface:project-panel',kind:'surface'});
 };
 const queue=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(scan);};
 const reset=()=>{
  if(motionDisabled()||document.hidden){releasePointer();finishAll();for(const [element,target] of pending){seen.add(target.identity);intersection?.unobserve(element);}pending.clear();}
  queue();
 };
 const releasePointer=()=>{cancelAnimationFrame(pointerFrame);pointerFrame=0;pointerHeld=false;for(const element of pressed)finish(element);pressed.clear();};
 const pointerUp=()=>{if(pressed.size&&!pointerFrame)pointerFrame=requestAnimationFrame(releasePointer);};
 const interact=(event:Event)=>{
  if(!(event.target instanceof Element))return;
  if(event.type==='pointerdown'){
   cancelAnimationFrame(pointerFrame);pointerFrame=0;
   for(const element of pressed)if(!element.contains(event.target)){finish(element);pressed.delete(element);}
   for(const [element,entry] of active)if(element.contains(event.target)){entry.animation.pause?.();element.style.setProperty('opacity','1');pressed.add(element);}
   pointerHeld=pressed.size>0;return;
  }
  if(pointerHeld)return;
  for(const [element,entry] of active)if(element.contains(event.target)){entry.animation.pause?.();element.style.setProperty('opacity','1');pressed.add(element);}
 };
 const blur=(event:FocusEvent)=>{for(const element of pressed)if(!(event.relatedTarget instanceof Element)||!element.contains(event.relatedTarget)){finish(element);pressed.delete(element);}};
 const rearrange=(event:Event)=>{
  const host=(event as CustomEvent<HTMLElement>).detail;if(!(host instanceof Element))return;
  // Existing records use FLIP on filter/reorder; only newly inserted IDs reveal.
  for(const element of active.keys())if(host.contains(element))finish(element);
  for(const [element,target] of pending)if(host.contains(element)){seen.add(target.identity);intersection?.unobserve(element);pending.delete(element);}
 };
 const observer=new MutationObserver(queue);
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-workspace-view','hidden']});
 const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',reset);
 document.addEventListener('visibilitychange',reset);window.addEventListener('workspace-motion-change',reset);
 document.addEventListener('focusin',interact);document.addEventListener('pointerdown',interact,{passive:true});
 document.addEventListener('click',releasePointer);document.addEventListener('pointerup',pointerUp);document.addEventListener('pointercancel',releasePointer);
 document.addEventListener('focusout',blur);
 window.addEventListener('blur',releasePointer);
 window.addEventListener('workspace-before-rearrange',rearrange);
 const suspend=()=>{releasePointer();finishAll();for(const target of pending.values())seen.add(target.identity);pending.clear();intersection?.disconnect();cancelAnimationFrame(frame);frame=0;};
 window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',queue);scan();
 return()=>{disposed=true;suspend();observer.disconnect();media.removeEventListener('change',reset);document.removeEventListener('visibilitychange',reset);window.removeEventListener('workspace-motion-change',reset);window.removeEventListener('workspace-before-rearrange',rearrange);window.removeEventListener('blur',releasePointer);document.removeEventListener('focusin',interact);document.removeEventListener('focusout',blur);document.removeEventListener('pointerdown',interact);document.removeEventListener('click',releasePointer);document.removeEventListener('pointerup',pointerUp);document.removeEventListener('pointercancel',releasePointer);window.removeEventListener('pagehide',suspend);window.removeEventListener('pageshow',queue);};
}

if(typeof document!=='undefined'){
 const start=()=>{const dispose=observeWorkspaceEntrances(),leave=(event:PageTransitionEvent)=>{if(!event.persisted){dispose();window.removeEventListener('pagehide',leave);}};window.addEventListener('pagehide',leave);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
