import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChevronDown,BookOpen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {WorkspaceSearch} from '@/components/workspace-search';
import {WorkspaceSelect} from '@/components/workspace-select';
import {filterWorkspaceHelp,workspaceHelpTopics} from './workspace-help-content.mjs';
const categories=[{value:'all',label:'所有页面'},{value:'common',label:'通用操作'},{value:'work',label:'工作空间'},{value:'personal',label:'私人空间'},{value:'account',label:'账号与设置'}];
function HelpPage(){
 const initial=new URLSearchParams(location.search),first=initial.get('helpTopic')||'';
 const [query,setQuery]=useState((initial.get('helpQuery')||'').slice(0,200)),[category,setCategory]=useState(categories.some(c=>c.value===initial.get('helpCategory'))?initial.get('helpCategory'):'all'),[opened,setOpened]=useState(()=>new Set(workspaceHelpTopics.some(t=>t.id===first)?[first]:[]));
 const root=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null),topics=filterWorkspaceHelp(query,category);
 useEffect(()=>{root.current?.querySelector<HTMLInputElement>('input')?.focus();},[]);
 useEffect(()=>{const url=new URL(location.href);for(const [key,value] of [['helpQuery',query],['helpCategory',category==='all'?'':category],['helpTopic',[...opened].at(-1)||'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(history.state,'',url.pathname+url.search);},[query,category,opened]);
 useEffect(()=>{const restore=()=>{const p=new URLSearchParams(location.search);if(p.get('view')!=='help')return;setQuery((p.get('helpQuery')||'').slice(0,200));setCategory(categories.some(c=>c.value===p.get('helpCategory'))?p.get('helpCategory'):'all');setOpened(new Set(p.get('helpTopic')?[p.get('helpTopic')]:[]));};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
 useEffect(()=>{if(query.trim())setOpened(new Set(filterWorkspaceHelp(query,category).map(topic=>topic.id)));},[query,category]);
 const resetScroll=()=>scroll.current?.scrollTo({top:0});
 return <section ref={root} className='workspace-help-page' aria-label='所有页面的操作帮助'><div className='workspace-help-filters'><WorkspaceSearch label='搜索操作帮助' placeholder='搜索页面、操作或快捷键' value={query} onValueChange={value=>{setQuery(value.slice(0,200));resetScroll();}}/><WorkspaceSelect label='帮助分类' value={category} options={categories} onValueChange={value=>{setCategory(value);resetScroll();}}/><span role='status'>{topics.length} 项</span></div><div className='workspace-help-scroll' ref={scroll}>{topics.length?<div className='workspace-help-grid'>{topics.map(topic=><details className='workspace-help-topic' key={topic.id} open={opened.has(topic.id)}><summary onClick={event=>{event.preventDefault();setOpened(previous=>{const next=new Set(previous);if(next.has(topic.id))next.delete(topic.id);else next.add(topic.id);return next;});}}><BookOpen size={18} aria-hidden='true'/><span><strong>{topic.title}</strong><small>{categories.find(c=>c.value===topic.category)?.label}</small></span><ChevronDown size={18} className='workspace-help-chevron' aria-hidden='true'/></summary><div className='workspace-help-topic-body'>{topic.sections.map(section=><section key={section.title}><h2>{section.title}</h2><ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul></section>)}</div></details>)}</div>:<div className='site-empty workspace-help-empty'><BookOpen size={32} aria-hidden='true'/><h2>没有找到相关操作</h2><Button variant='outline' onClick={()=>{setQuery('');setCategory('all');root.current?.querySelector<HTMLInputElement>('input')?.focus();}}>清空筛选</Button></div>}</div></section>;
}
export const workspaceHelp={mount(element:HTMLElement){const root=createRoot(element);root.render(<HelpPage/>);return {dispose(){root.unmount();}};}};
window.WorkspaceHelpPage=workspaceHelp;
