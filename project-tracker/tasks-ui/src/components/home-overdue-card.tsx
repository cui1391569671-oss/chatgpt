import {useState} from 'react';
import {ChevronLeft,ChevronRight,RotateCw} from 'lucide-react';
import {Button} from './ui/button';

export function HomeOverdueCard({items,loading,loaded,error,disabled,onOpen,onRefresh}){
 const [selectedId,setSelectedId]=useState('');
 const index=Math.max(0,items.findIndex(item=>item.id===selectedId)),item=items[index];
 const step=direction=>setSelectedId(items[(index+direction+items.length)%items.length].id);
 return <section className='workspace-overdue-card' aria-label='延期问题'>
  <div className='workspace-overdue-head'><h2>延期问题</h2><div className='workspace-overdue-controls'><span aria-label={items.length||loaded?'共 '+items.length+' 项':'延期问题数量尚未确认'}>{items.length?`${index+1} / ${items.length}`:loaded?'0 项':'—'}</span><Button size='icon' variant='ghost' aria-label='上一项延期问题' disabled={items.length<2} onClick={()=>step(-1)}><ChevronLeft size={16}/></Button><Button size='icon' variant='ghost' aria-label='下一项延期问题' disabled={items.length<2} onClick={()=>step(1)}><ChevronRight size={16}/></Button></div></div>
  <div className='workspace-overdue-body' aria-live='polite' aria-atomic='true'>{item?<><button className='workspace-overdue-title' disabled={disabled} onClick={()=>onOpen(item.id)}>{item.title}</button><p className='workspace-overdue-meta'>{item.source}{item.project&&!item.source?.includes(item.project)?' · '+item.project:''}</p><p className='workspace-overdue-date'>已延期 · <time dateTime={item.dueDate}>{item.dueDate}</time></p></>:<p className='workspace-overdue-empty'>{loaded?'暂无延期问题':error?'暂时无法读取延期问题':'正在读取延期问题…'}</p>}</div>
  {error&&<div className='workspace-overdue-error'><p role='alert'>{error}</p><Button size='icon' variant='ghost' aria-label='重试读取延期问题' disabled={loading} onClick={onRefresh}><RotateCw size={16}/></Button></div>}
 </section>;
}
