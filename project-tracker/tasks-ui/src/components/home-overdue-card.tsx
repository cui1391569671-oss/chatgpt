import {useEffect,useRef,useState} from 'react';
import {RotateCw} from 'lucide-react';
import {useWorkspaceMotionOff} from '../workspace-motion-policy';
import {startOverdueRotation} from './overdue-rotation.mjs';
import {Button} from './ui/button';

export function HomeOverdueCard({items,loading,loaded,error,disabled,onOpen,onRefresh}){
 const [selectedId,setSelectedId]=useState(''),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),latest=useRef(items),reduce=useWorkspaceMotionOff();
 latest.current=items;
 const itemKey=JSON.stringify(items.map(item=>item.id));
 useEffect(()=>{if(items.length<2||hovered||focused||disabled||reduce)return;return startOverdueRotation(()=>setSelectedId(current=>{const rows=latest.current;if(rows.length<2)return current;const index=Math.max(0,rows.findIndex(item=>item.id===current));return rows[(index+1)%rows.length].id;}));},[itemKey,hovered,focused,disabled,reduce]);
 const index=Math.max(0,items.findIndex(item=>item.id===selectedId)),item=items[index];
 return <section className='workspace-overdue-card' aria-label='延期问题' onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
  <div className='workspace-overdue-head'><h2>延期问题</h2><span className='workspace-overdue-count' aria-label={items.length||loaded?'共 '+items.length+' 项':'延期问题数量尚未确认'}>{items.length||loaded?`${items.length} 项`:'—'}</span></div>
  <div className='workspace-overdue-body' aria-live='off' aria-atomic='true'>{item?<><button className='workspace-overdue-title' disabled={disabled} onClick={()=>onOpen(item.id)}>{item.title}</button><p className='workspace-overdue-meta'>{item.source}{item.project&&!item.source?.includes(item.project)?' · '+item.project:''}</p><p className='workspace-overdue-date'>已延期 · <time dateTime={item.dueDate}>{item.dueDate}</time></p></>:<p className='workspace-overdue-empty'>{loaded?'暂无延期问题':error?'暂时无法读取延期问题':'正在读取延期问题…'}</p>}</div>
  {error&&<div className='workspace-overdue-error'><p role='alert'>{error}</p><Button size='icon' variant='ghost' aria-label='重试读取延期问题' disabled={loading} onClick={onRefresh}><RotateCw size={16}/></Button></div>}
 </section>;
}
