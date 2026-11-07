import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {motion} from 'motion/react';
import {NavigationMenu as Menu} from 'radix-ui';
import {createNavigationIntent,navigateWorkspace} from './workspace-navigation-intent.mjs';
import {Check} from 'lucide-react';
import {useWorkspaceMotionOff,motionTiming,navigationTiming} from '../workspace-motion-policy';
import {workspaceNavView,workspacePageMeta,workspaceSiteNavigation} from '../workspace-page-meta.mjs';

function focusNavigationLink(link:HTMLAnchorElement|undefined){
 if(!link)return;link.focus({preventScroll:true});
 const panel=link.closest<HTMLElement>('.wb-navigation-content');if(!panel)return;
 const item=link.getBoundingClientRect(),box=panel.getBoundingClientRect();
 if(item.bottom>box.bottom)panel.scrollTop+=item.bottom-box.bottom;
 else if(item.top<box.top)panel.scrollTop-=box.top-item.top;
}

/** One full-width Radix viewport, with shared route ownership and non-modal dismissal. */
export function WorkspaceNavigation({bridge,snapshot,accountMenu}){
 const [open,setOpen]=useState(''),[top,setTop]=useState(0),[left,setLeft]=useState(0),root=useRef<HTMLElement>(null),keyboardEntry=useRef<{value:string;last:boolean}|null>(null),valueRef=useRef(open),intentRef=useRef<ReturnType<typeof createNavigationIntent>|null>(null),reduce=useWorkspaceMotionOff();
 valueRef.current=open;
 if(!intentRef.current)intentRef.current=createNavigationIntent({getValue:()=>valueRef.current,onChange:setOpen});
 const {cancel,change,enter,leave,click}=intentRef.current;
 const current=workspaceNavView(snapshot.view),groups=workspaceSiteNavigation(bridge.scope);
 useEffect(()=>cancel,[cancel]);
 useEffect(()=>{change('');},[snapshot.view,bridge.scope,change]);
 useLayoutEffect(()=>{
  const row=root.current?.closest<HTMLElement>('.wb-navigation-row');if(!row)return;
  const align=()=>{setTop(row.getBoundingClientRect().bottom);const trigger=root.current?.querySelector<HTMLElement>('[data-nav-group="'+open+'"]');if(trigger)setLeft(trigger.getBoundingClientRect().left);};
  align();const observer=new ResizeObserver(align);observer.observe(row);window.addEventListener('resize',align);
  const leaveRow=(event:PointerEvent)=>leave(event.pointerType);
  row.addEventListener('pointerenter',cancel);row.addEventListener('pointerleave',leaveRow);
  return()=>{observer.disconnect();window.removeEventListener('resize',align);row.removeEventListener('pointerenter',cancel);row.removeEventListener('pointerleave',leaveRow);};
 },[cancel,leave,open]);
 useEffect(()=>{
  if(!open){keyboardEntry.current=null;return;}if(keyboardEntry.current?.value!==open)return;
  let frame=0,attempts=0;
  const focus=()=>{const links=root.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-panel="'+open+'"] a');if(links?.length){const last=keyboardEntry.current?.last;keyboardEntry.current=null;focusNavigationLink(links[last?links.length-1:0]);}else if(++attempts<4)frame=requestAnimationFrame(focus);};
  frame=requestAnimationFrame(focus);return()=>cancelAnimationFrame(frame);
 },[open]);
 const reveal=(delay:number)=>({initial:{opacity:reduce?1:0,y:reduce?0:-4},animate:{opacity:open?1:0,y:0},transition:{duration:reduce?0:(open?navigationTiming.content:motionTiming.navigation)/1000,delay:reduce||!open?0:delay/1000,ease:[.25,.1,.25,1] as const}});
 const choose=(event:Event,space:string,next:string)=>{if(navigateWorkspace(bridge,space,next)===false)event.preventDefault();else change('');};
 return <Menu.Root ref={root} className='wb-primary-navigation' style={{'--navigation-group-count':groups.length,'--navigation-top':top+'px','--navigation-left':left+'px','--navigation-duration':(reduce?0:motionTiming.navigation)+'ms','--navigation-close-delay':(reduce||open?0:navigationTiming.closeDelay)+'ms'} as CSSProperties} aria-label='主导航' activationMode='manual' value={open} onValueChange={change} onPointerEnter={cancel} onPointerLeave={event=>{if(event.pointerType!=='mouse')return;if(event.relatedTarget instanceof Node&&root.current?.closest('.wb-navigation-row')?.contains(event.relatedTarget))cancel();else leave();}} onFocusCapture={cancel} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))change('');}} onKeyDownCapture={cancel}>
  <Menu.List className='wb-top-navigation'>
   <Menu.Item className='wb-site-logo-item'><Menu.Link href={'/'+bridge.scope+'?view=home'} className='wb-site-logo' active={current==='home'} aria-label='我的工作台首页' title='我的工作台' onClick={event=>event.preventDefault()} onSelect={event=>choose(event,bridge.scope,'home')} onPointerEnter={event=>leave(event.pointerType)}><img src='/favicon.svg?v=workbench-mark-1' width={28} height={28} alt='' aria-hidden='true'/></Menu.Link></Menu.Item>

   {groups.map(group=>{
    if(group.direct){
     const [[space,id]]=group.items,active=space===bridge.scope&&current===id;
     return <Menu.Item className='wb-site-nav-item' key={group.title} value={group.title}><Menu.Link href={'/'+space+'?view='+encodeURIComponent(id)} className='wb-site-nav-link' active={active} data-active={String(active)} aria-current={active?'page':undefined} onClick={event=>event.preventDefault()} onSelect={event=>choose(event,space,id)} onPointerEnter={event=>leave(event.pointerType)}>{group.title}</Menu.Link></Menu.Item>;
    }
    return <Menu.Item className='wb-site-nav-item' key={group.title} value={group.title}>
    <Menu.Trigger className='wb-site-nav-link' data-nav-group={group.title} data-active={group.items.some(([space,id])=>space===bridge.scope&&id===current)} onPointerEnter={event=>enter(group.title,event.pointerType)} onClick={event=>{if(click(group.title))event.preventDefault();}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();keyboardEntry.current={value:group.title,last:event.key==='ArrowUp'};if(open===group.title){const links=root.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-panel="'+open+'"] a');focusNavigationLink(links?.[event.key==='ArrowUp'?links.length-1:0]);keyboardEntry.current=null;}else change(group.title);}}}>{group.title}</Menu.Trigger>
    <Menu.Content asChild onPointerEnter={cancel} onPointerLeave={event=>leave(event.pointerType)}>
     <div className='wb-navigation-content' data-nav-panel={group.title}>
      <div className='wb-navigation-columns' style={{'--navigation-column-count':group.columns.length} as CSSProperties} aria-label={group.title+'页面'}>{group.columns.map((column,columnIndex)=>{const groupDelay=Math.min(navigationTiming.group+(columnIndex-1)*navigationTiming.groupStep,columnIndex*navigationTiming.group);return <section className='wb-navigation-column' data-primary={column.primary} key={column.title} aria-label={column.title}><motion.h2 {...reveal(navigationTiming.headingDelay+groupDelay)}>{column.title}</motion.h2><div className='wb-navigation-links'>{column.views.map((id,itemIndex)=>{const active=column.space===bridge.scope&&(snapshot.view===id||(current===id&&!column.views.includes(snapshot.view))),label=workspacePageMeta(column.space,id).label;return <motion.div key={id} {...reveal(navigationTiming.itemDelay+groupDelay+itemIndex*navigationTiming.itemStep)}><Menu.Link href={'/'+column.space+'?view='+encodeURIComponent(id)} className='wb-navigation-link' active={active} aria-current={active?'page':undefined} onClick={event=>event.preventDefault()} onSelect={event=>choose(event,column.space,id)}><span>{label}</span>{active&&<Check size={16} aria-hidden='true'/>}</Menu.Link></motion.div>;})}</div></section>;})}</div>
     </div>
    </Menu.Content>
   </Menu.Item>;})}
   <Menu.Item className='wb-account-menu-item' onPointerEnter={()=>change('')}>{accountMenu}</Menu.Item>
  </Menu.List>
  <motion.div className='wb-navigation-backdrop' aria-hidden='true' inert={!open} initial={false} animate={{opacity:open?1:0}} transition={{duration:reduce?0:motionTiming.navigation/1000,delay:reduce||open?0:navigationTiming.closeDelay/1000,ease:[.4,0,.6,1]}} style={{pointerEvents:open?'auto':'none'}} onPointerEnter={event=>leave(event.pointerType)} onPointerDown={()=>change('')}/>
  <div className='wb-navigation-panel-anchor' data-open={!!open} inert={!open} aria-hidden={!open?true:undefined} onPointerEnter={cancel} onPointerLeave={event=>leave(event.pointerType)}><Menu.Viewport forceMount className='wb-navigation-viewport'/></div>
 </Menu.Root>;
}
