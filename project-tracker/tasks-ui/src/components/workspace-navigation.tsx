import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import {NavigationMenu as Menu} from '@animate-ui/react/primitives/radix-ui';
import {createNavigationIntent,navigateWorkspace} from './workspace-navigation-intent.mjs';
import {Check,ChevronDown} from 'lucide-react';
import {useWorkspaceMotionOff,motionTiming} from '../workspace-motion-policy';
import {workspaceNavView,workspacePageMeta,workspaceSiteNavigation} from '../workspace-page-meta.mjs';

/** One measured viewport owns all primary navigation panels. */
export function WorkspaceNavigation({bridge,snapshot,icons}){
 const [open,setOpen]=useState(''),[offset,setOffset]=useState(0),root=useRef<HTMLElement>(null),keyboardEntry=useRef<{value:string;last:boolean}|null>(null),valueRef=useRef(open),intentRef=useRef<ReturnType<typeof createNavigationIntent>|null>(null),reduce=useWorkspaceMotionOff();
 valueRef.current=open;
 if(!intentRef.current)intentRef.current=createNavigationIntent({getValue:()=>valueRef.current,onChange:setOpen});
 const intent=intentRef.current,{cancel,change,enter,leave}=intent;
 const current=workspaceNavView(snapshot.view),groups=workspaceSiteNavigation();
 useEffect(()=>cancel,[cancel]);
 useEffect(()=>{change('');},[snapshot.view,bridge.scope,change]);
 useLayoutEffect(()=>{
  if(!open||!root.current)return;
  const align=()=>{const node=root.current,trigger=node?.querySelector<HTMLElement>('[data-nav-group="'+open+'"]');if(!node||!trigger)return;const box=node.getBoundingClientRect(),button=trigger.getBoundingClientRect(),half=(open==='记录'?240:288)/2,center=Math.max(half+16,Math.min(innerWidth-half-16,button.left+button.width/2));setOffset(center-(box.left+box.width/2));};
  align();const observer=new ResizeObserver(align);observer.observe(root.current);window.addEventListener('resize',align);return()=>{observer.disconnect();window.removeEventListener('resize',align);};
 },[open]);
 useEffect(()=>{
  if(!open||keyboardEntry.current?.value!==open)return;
  let frame=0,attempts=0;
  const focus=()=>{const buttons=root.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-panel="'+open+'"] a');if(buttons?.length){const last=keyboardEntry.current?.last;keyboardEntry.current=null;buttons[last?buttons.length-1:0].focus();}else if(++attempts<4)frame=requestAnimationFrame(focus);};
  frame=requestAnimationFrame(focus);return()=>cancelAnimationFrame(frame);
 },[open]);
 const transition=reduce?{duration:0}:{type:'spring' as const,visualDuration:motionTiming.control/1000,bounce:.08};
 const navigate=(space:string,next:string)=>navigateWorkspace(bridge,space,next);
 return <Menu.Root ref={root} className='wb-primary-navigation' aria-label='主导航' activationMode='manual' value={open} onValueChange={change} onPointerEnter={cancel} onPointerLeave={leave} onFocusCapture={cancel} onKeyDownCapture={cancel}>
  <Menu.List className='wb-top-navigation'>
   <Menu.Item><Menu.Link href={'/'+bridge.scope+'?view=home'} active={current==='home'} className='wb-site-nav-link' data-active={current==='home'} onClick={event=>event.preventDefault()} onSelect={event=>{if(bridge.navigate('home')===false)event.preventDefault();}} onPointerEnter={leave}>首页</Menu.Link></Menu.Item>
   {groups.map(group=><Menu.Item key={group.title} value={group.title}>
    <Menu.Trigger className='wb-site-nav-link' data-nav-group={group.title} data-active={group.items.some(([space,id])=>space===bridge.scope&&id===current)} onPointerEnter={event=>{if(event.pointerType==='mouse')enter(group.title);}} onClick={event=>{if(intent.click(group.title))event.preventDefault();}} onKeyDown={event=>{if(!open&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();keyboardEntry.current={value:group.title,last:event.key==='ArrowUp'};change(group.title);}}}>{group.title}<ChevronDown className='wb-nav-chevron' size={12} aria-hidden='true'/></Menu.Trigger>
    <Menu.Content className='wb-navigation-content' data-nav-panel={group.title} style={{width:group.title==='记录'?240:288}} onPointerEnter={cancel}>
     <div className='wb-navigation-links' aria-label={group.title+'页面'}>{group.items.map(([space,id])=>{const Icon=icons[id]||icons.home,active=space===bridge.scope&&current===id,label=workspacePageMeta(space,id).label;return <Menu.Link key={space+id} href={'/'+space+'?view='+encodeURIComponent(id)} className='wb-navigation-link' active={active} onClick={event=>event.preventDefault()} onSelect={event=>{if(navigate(space,id)===false)event.preventDefault();}}><Icon size={16} aria-hidden='true'/><span>{label}{id==='tasks'?' · '+(space==='work'?'工作':'私人'):''}</span>{active&&<Check size={16} aria-hidden='true'/>}</Menu.Link>;})}</div>
    </Menu.Content>
   </Menu.Item>)}
  </Menu.List>
  <motion.div className='wb-navigation-panel-anchor' inert={!open} aria-hidden={!open?true:undefined} animate={{x:offset}} transition={transition}><Menu.Viewport className='wb-navigation-viewport' transition={transition} exitTransition={{duration:reduce?0:motionTiming.exit/1000}} onPointerEnter={cancel}/></motion.div>
 </Menu.Root>;
}
