import {workspacePageMeta,workspaceNavigation} from './workspace-page-meta.mjs';
import {WorkspaceNavigation} from './components/workspace-navigation';
import {navigateWorkspace} from './components/workspace-navigation-intent.mjs';
import {AnimateUIProvider} from '@animate-ui/react/provider';
import BellToggle from './vendor/react-bits/BellToggle';
import {useWorkspaceMotionOff} from '@/workspace-motion-policy';
// Adapted from satnaing/shadcn-admin AppSidebar, NavGroup, TeamSwitcher and Header (MIT).
import {useState, useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {Button} from '@/components/ui/button';
import {WorkspaceOcean} from './workspace-ocean';
import {PersonalPreferences,WorkspaceMotionRuntime} from './workspace-personal';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Command,CommandInput,CommandList,CommandEmpty,CommandGroup,CommandItem} from '@/components/ui/command';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator} from '@/components/ui/dropdown-menu';
import {BriefcaseBusiness, CalendarDays, CheckSquare, NotebookPen, FolderOpen, BookOpen, Dumbbell, Shirt, Wrench, Clapperboard, UserRound, Home, Check, X} from 'lucide-react';
const pageIcons={home:Home,projects:BriefcaseBusiness,tasks:CheckSquare,today:CheckSquare,drive:FolderOpen,notes:NotebookPen,calendar:CalendarDays,annualPlans:CalendarDays,checkins:CheckSquare,vocabulary:BookOpen,fitness:Dumbbell,completedGames:Clapperboard,wardrobe:Shirt,maintenance:Wrench};
const navigationGroups=scope=>workspaceNavigation(scope).map(group=>({...group,items:group.views.map(id=>[id,workspacePageMeta(scope,id).label,pageIcons[id]||Home] as const)}));
function ShellHeader({bridge,snapshot,actions}){
 const reduceMotion=useWorkspaceMotionOff();
 const [searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(''),[preferencesOpen,setPreferencesOpen]=useState(false),[accountOpen,setAccountOpen]=useState(false);
 const accountNext=useRef<null|(()=>void)>(null);
 const queueAccountAction=(action:()=>void)=>{accountNext.current=action;setAccountOpen(false);};
 const afterAccountClose=(event:Event)=>{const action=accountNext.current;if(action){event.preventDefault();accountNext.current=null;requestAnimationFrame(action);}};
 const groups=navigationGroups(bridge.scope);
 const openSearch=()=>{if(bridge.canLeave()===false)return;setQuery('');setSearchOpen(true);};
 useEffect(()=>{const handler=event=>{if(event.isComposing||event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable=true]'))return;if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[bridge]);
 const page=workspacePageMeta(bridge.scope,snapshot.view);
 useEffect(()=>{document.title=page.title;},[page.title]);
 const [recent,setRecent]=useState<string[]>([]);
 useEffect(()=>{try{const key='workbench-recent-'+bridge.scope;const next=[snapshot.view,...JSON.parse(localStorage.getItem(key)||'[]').filter(id=>id!==snapshot.view)].slice(0,4);localStorage.setItem(key,JSON.stringify(next));setRecent(next);}catch{setRecent([]);}},[snapshot.view,bridge.scope]);
 return <AnimateUIProvider reducedMotion={reduceMotion?'always':'user'}><WorkspaceOcean/><div className='wb-topbar' role='banner'><div className='wb-navigation-row'><WorkspaceNavigation bridge={bridge} snapshot={snapshot}/><div className='wb-topbar-actions'><BellToggle action label={'消息通知'+(snapshot.count?'，'+snapshot.count+' 项到期提醒':'')} title='消息通知' disabled={!snapshot.ready} count={snapshot.count} motionOff={reduceMotion} onClick={bridge.notifications}/><DropdownMenu variant='topbar' open={accountOpen} onOpenChange={setAccountOpen}><DropdownMenuTrigger asChild><Button size='icon' variant='ghost' className='wb-icon-button wb-account-trigger' aria-label='账号菜单' title='账号菜单'><UserRound size={18}/></Button></DropdownMenuTrigger><DropdownMenuContent align='end' className='wb-nav-menu' onCloseAutoFocus={afterAccountClose}><DropdownMenuLabel>切换空间</DropdownMenuLabel>{(['work','personal'] as const).map(space=>{const current=bridge.scope===space,Icon=space==='work'?BriefcaseBusiness:Home;return <DropdownMenuItem key={space} aria-current={current?'page':undefined} onSelect={event=>{if(!current&&navigateWorkspace(bridge,space)===false)event.preventDefault();}}><Icon size={16}/><span>{space==='work'?'工作空间':'私人空间'}</span>{current&&<Check size={16} className='ml-auto' aria-hidden='true'/>}</DropdownMenuItem>;})}<DropdownMenuSeparator/><DropdownMenuLabel>我的账号</DropdownMenuLabel><DropdownMenuItem onSelect={()=>queueAccountAction(()=>{document.querySelector<HTMLButtonElement>('.wb-account-trigger')?.focus();bridge.account();})}>个人中心</DropdownMenuItem>{bridge.scope==='personal'&&<DropdownMenuItem onSelect={()=>queueAccountAction(()=>setPreferencesOpen(true))}>个性设置</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div></div><div className='wb-page-row' hidden={snapshot.view==='home'}>{snapshot.view!=='home'&&<div className='wb-page-location'><p>{snapshot.view==='notes'?'记录':bridge.scope==='work'?'工作':'生活'} / {page.label}</p><h1>{snapshot.view==='tasks'?<>把重要的事，<span>逐一</span>完成。</>:page.label}</h1><p>{snapshot.view==='projects'?'跟进每一个关键节点。':snapshot.view==='notes'?'记录想法，也记录每一次推进。':''}</p></div>}<div className='wb-page-actions-mount' ref={node=>{if(node&&actions.parentElement!==node)node.append(actions);}}/></div></div>{bridge.scope==='personal'&&<PersonalPreferences open={preferencesOpen} onOpenChange={setPreferencesOpen}/>}
 <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className='wb-command-dialog' showCloseButton={false} returnFocus={()=>document.querySelector<HTMLButtonElement>('.wb-account-trigger')}> <DialogTitle className='sr-only'>搜索页面</DialogTitle><DialogDescription className='sr-only'>输入页面名称，通过方向键和回车选择。</DialogDescription><Command label='页面搜索' data-ui-owner='command' onKeyDownCapture={event=>{if(event.nativeEvent.isComposing&&event.key==='Enter'){event.preventDefault();event.stopPropagation();}}}><div className='wb-command-input'><CommandInput aria-label='搜索工作台页面' placeholder='搜索页面…' value={query} onValueChange={setQuery}/>{query&&<button className='wb-command-clear' aria-label='清空页面搜索' onClick={event=>{setQuery('');event.currentTarget.parentElement.querySelector('input')?.focus();}}><X size={16}/></button>}</div><CommandList label='页面搜索结果'><CommandEmpty>没有找到页面，请尝试其他名称。</CommandEmpty>{!query&&recent.length>1&&<CommandGroup heading='最近访问'>{recent.filter(id=>id!==snapshot.view).map(id=>{const item=groups.flatMap(g=>g.items).find(x=>x[0]===id);return item&&<CommandItem key={'recent-'+id} value={'最近 '+item[1]} onSelect={()=>{setSearchOpen(false);bridge.navigate(id);}}>{String(item[1])}</CommandItem>;})}</CommandGroup>}{groups.map(group=><CommandGroup heading={group.title} key={group.title}>{group.items.map(([id,label,Icon])=><CommandItem key={id} value={label} onSelect={()=>{setSearchOpen(false);bridge.navigate(id);}}><Icon size={16}/><span>{label}</span></CommandItem>)}</CommandGroup>)}</CommandList></Command></DialogContent></Dialog>
 </AnimateUIProvider>;
}
function WorkspaceShell({bridge,controller,header,actions}){
 const [snapshot,setSnapshot]=useState(bridge.snapshot());
 controller.update=()=>setSnapshot(bridge.snapshot());
 return <><WorkspaceMotionRuntime/>{createPortal(<ShellHeader bridge={bridge} snapshot={snapshot} actions={actions}/>,header)}</>;
}
export const workspaceShell={mount(node,header,bridge,actions){const controller={};createRoot(node).render(<WorkspaceShell bridge={bridge} controller={controller} header={header} actions={actions}/>);return controller;}};

window.WorkspaceShell=workspaceShell;
