import React,{useState,useRef} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {WorkspaceSelect} from '@/components/workspace-select';

export function GameTaskMigration({rows,games,pending,error,close,save}){
 const opener=useRef(document.activeElement);
 const [page,setPage]=useState(0),pageCount=Math.ceil(rows.length/10);
 const visibleRows=rows.slice(page*10,page*10+10);
 const [targets,setTargets]=useState({});
 const [ids]=useState(()=>Object.fromEntries(rows.map(t=>[t.id,crypto.randomUUID()])));
 const selected=rows.filter(t=>targets[t.id]&&targets[t.id]!=='skip');
 return <Dialog open onOpenChange={v=>{if(!v&&!pending)close();}}><DialogContent className='ui-business-dialog' onCloseAutoFocus={e=>{e.preventDefault();const target=opener.current?.isConnected?opener.current:document.querySelector('.tasks-create-button');target?.focus();}} onEscapeKeyDown={e=>{if(pending)e.preventDefault();}} onPointerDownOutside={e=>{if(pending)e.preventDefault();}} showCloseButton={!pending}>
 <DialogHeader><DialogTitle>整理游戏待办</DialogTitle><DialogDescription>先预览，再确认。保留每条待办的日期、详情和完成状态，将游戏资料统一放入娱乐记录。</DialogDescription></DialogHeader>
 <div className='tasks-fields'><p className='muted'>同名作品不会自动合并，请明确选择关联已有游戏或新建。新建作品状态为“想玩”；待办已完成不等于游戏已通关，游玩状态可在娱乐记录中修改。</p>
 {visibleRows.map(t=><label key={t.id} className='ui-confirm-field'><strong>{t.title}</strong><span>{t.dueDate||'无截止日期'} · {t.done?'提醒已完成':'提醒未完成'}{t.gamePlatform?' · '+t.gamePlatform:''}</span><WorkspaceSelect label={'整理方式：'+t.title} value={targets[t.id]||'skip'} onValueChange={v=>setTargets(s=>({...s,[t.id]:v}))} disabled={pending} options={[{value:'skip',label:'暂不整理'},{value:'new',label:'新建娱乐记录 · 想玩'},...games.map(g=>({value:'game:'+g.id,label:'关联：'+g.title+(g.platform?'（'+g.platform+'）':'')}))]}/></label>)}
 {pageCount>1&&<div className='tasks-bulk'><Button variant='outline' disabled={pending||page===0} onClick={()=>setPage(p=>p-1)}>上一组</Button><span>第 {page+1} / {pageCount} 组</span><Button variant='outline' disabled={pending||page+1>=pageCount} onClick={()=>setPage(p=>p+1)}>下一组</Button></div>}
 <p role='status'>将整理 {selected.length} 项，其中新建 {selected.filter(t=>targets[t.id]==='new').length} 条游戏记录；原待办保留为关联提醒。</p>
 {error&&<p role='alert' className='tasks-error'>{error}</p>}</div>
 <DialogFooter><Button variant='outline' disabled={pending} onClick={close}>取消</Button><Button disabled={pending||!selected.length} onClick={()=>save(selected.map(t=>({taskId:t.id,...(targets[t.id]==='new'?{newId:ids[t.id]}:{targetId:targets[t.id].slice(5)})})))}>{pending?'正在整理…':'确认整理'}</Button></DialogFooter>
 </DialogContent></Dialog>;
}
