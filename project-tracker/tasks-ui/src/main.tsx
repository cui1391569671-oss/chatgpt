import './workspace-calendar-controls';

import './workspace-completions';
import {readTaskView,taskViewUrl,clampTaskPage} from './task-view-state.mjs';
import {WorkspaceCompletion} from '@/components/workspace-completion';
import './workspace-segments';

import {SaveButton} from '@/components/save-button';

import './workspace-motion';
import './fitness';
import {GameTaskMigration} from './game-task-migration';
import './workspace-feedback';
import {WorkspaceSearch} from '@/components/workspace-search';
import './workspace-shell';
import './workspace-primitives';
import './personal-info';
import './annual-plans';
import './word-practice';
import {WorkspaceSelect} from '@/components/workspace-select';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogHeader,DialogFooter} from '@/components/ui/dialog';
// Adapted from satnaing/shadcn-admin TasksTable and TasksMutateDrawer (MIT).
import {useState,useMemo,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';

import {useForm} from 'react-hook-form';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';

import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter} from '@/components/ui/sheet';
import {Form as FormProvider,FormField,FormItem,FormLabel,FormControl,FormMessage} from '@/components/ui/form';


import {WorkspaceToolbar} from './components/workspace-toolbar';
import {WorkspaceSegment} from './components/workspace-segment';
import {filterTaskList,taskGroup} from './task-list-state.mjs';
import {Checkbox} from '@/components/ui/checkbox';
import {Plus,Trash2} from 'lucide-react';
function App({bridge,controller}){
 const [initialView]=useState(()=>readTaskView(bridge.editorOnly?'':location.search,bridge.scope));
 const [rows,setRows]=useState(bridge.rows),[query,setQuery]=useState(initialView.query),[status,setStatus]=useState(initialView.status),[priority,setPriority]=useState(initialView.priority),[sorting,setSorting]=useState(initialView.sorting),[pagination,setPagination]=useState(initialView.pagination),[editor,setEditor]=useState(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[deleting,setDeleting]=useState(null),[migrating,setMigrating]=useState(false),[selecting,setSelecting]=useState(false),[selected,setSelected]=useState<string[]>([]);
 const games=bridge.games||[],legacyGames=rows.filter(t=>t.taskType==='game'&&!t.mediaRecordId),locked=useRef(false),editorRef=useRef(null);editorRef.current=editor;
 const editButtons=useRef(new Map<string,HTMLButtonElement>()),createButton=useRef<HTMLButtonElement>(null),deleteButtons=useRef(new Map<string,HTMLButtonElement>()),deleteOrigin=useRef<string|null>(null);
 controller.update=data=>setRows(data);controller.open=id=>{if(!locked.current){setError('');setEditor(id?rows.find(t=>t.id===id)||null:{});}};controller.isEditing=()=>!!editorRef.current||locked.current||!!deleting||migrating;
 useEffect(()=>{bridge.onEditingChange?.(!!editor||pending||!!deleting||migrating);return()=>bridge.onEditingChange?.(false);},[editor,pending,deleting,migrating]);
 async function commit(op){if(locked.current)return;locked.current=true;setPending(true);setError('');try{const latest=await bridge.save(op);setRows(latest);setSelected([]);setEditor(null);setDeleting(null);setMigrating(false);window.WorkspaceFeedback?.show(document.getElementById('toast'),op.type==='delete'?'已删除待办':op.type==='save'?'已保存待办':op.type==='migrateGames'?'已整理游戏待办':'已更新待办','success');}catch(e){setError(e.message||'保存失败，输入已保留，请重试。');}finally{locked.current=false;setPending(false);}}
 const filtered=useMemo(()=>filterTaskList(rows,{query,status,priority,sorting},bridge.today),[rows,query,status,priority,sorting,bridge.today]);
 const visible=filtered.slice(pagination.pageIndex*pagination.pageSize,(pagination.pageIndex+1)*pagination.pageSize),todayCount=rows.filter(r=>!r.done&&r.dueDate===bridge.today).length;
 const resetPage=()=>{setSelected([]);setPagination(p=>({...p,pageIndex:0}));};
 const resetFilters=()=>{setQuery('');setStatus('all');setPriority('all');resetPage();};
 useEffect(()=>{setPagination(p=>{const next=clampTaskPage(p,filtered.length);return next.pageIndex===p.pageIndex?p:next;});},[filtered.length,pagination.pageSize]);
 useEffect(()=>{if(bridge.editorOnly||new URLSearchParams(location.search).get('view')!=='tasks')return;const next=taskViewUrl(location.href,{query,status,priority,sorting,pagination});if(next!==location.pathname+location.search+location.hash)history.replaceState(history.state,'',next);},[query,status,priority,sorting,pagination,bridge.editorOnly]);
 useEffect(()=>{if(bridge.editorOnly)return;const restore=()=>{if(new URLSearchParams(location.search).get('view')!=='tasks')return;const next=readTaskView(location.search,bridge.scope);setQuery(next.query);setStatus(next.status);setPriority(next.priority);setSorting(next.sorting);setPagination(next.pagination);};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[bridge.scope,bridge.editorOnly]);
 return <>{!bridge.editorOnly&&<section className='tasks-app site-task-list' aria-label='待办管理' aria-busy={pending}>
 <WorkspaceToolbar><Button ref={createButton} disabled={pending} onClick={()=>{setError('');setEditor({});}}><Plus size={16}/>新建待办</Button><Button variant='ghost' disabled={pending} aria-pressed={selecting} onClick={()=>{setSelecting(v=>!v);setSelected([]);}}>批量处理</Button></WorkspaceToolbar>
 <p className='site-task-summary'>今天有 {todayCount} 项待办，留出专注的时间。</p>
 <div className='site-list-controls'><WorkspaceSegment label='待办分组筛选' appearance='underline' className='site-filter-tabs' disabled={pending} value={status} onChange={value=>{setStatus(value);resetPage();}} items={[{value:'all',label:'全部 '+rows.length},{value:'today',label:'今天 '+todayCount},{value:'upcoming',label:'即将到期'},{value:'done',label:'已完成'},...(['open','overdue','games'].includes(status)?[{value:status,label:{open:'未完成',overdue:'已逾期',games:'游戏提醒'}[status]}]:[])]}/><div className='site-list-search'><WorkspaceSearch label='搜索待办' placeholder='搜索待办' value={query} onValueChange={value=>{setQuery(value.slice(0,200));resetPage();}}/><WorkspaceSelect label='待办排序' value={sorting[0]?.id==='title'?'title':sorting[0]?.desc?'latest':'due'} onValueChange={value=>{setSorting([{id:value==='title'?'title':'dueDate',desc:value==='latest'}]);resetPage();}} options={[{value:'due',label:'截止日期'},{value:'latest',label:'日期倒序'},{value:'title',label:'标题'}]}/><WorkspaceSelect label='优先级筛选' value={priority} onValueChange={value=>{setPriority(value);resetPage();}} options={[{value:'all',label:'全部优先级'},{value:'high',label:'高'},{value:'normal',label:'普通'},{value:'low',label:'低'}]}/></div></div>
 {bridge.scope==='personal'&&legacyGames.length>0&&<div className='tasks-bulk'><span>有 {legacyGames.length} 项旧游戏待办可整理为关联提醒。</span><Button variant='outline' disabled={pending} onClick={()=>{setError('');setMigrating(true);}}>预览整理</Button></div>}
 {error&&!editor&&!deleting&&!migrating&&<p role='alert' className='tasks-error'>{error}</p>}
 {selecting&&<div className='tasks-bulk' role='toolbar' aria-label='批量操作'><label className='workspace-checkbox-target'><Checkbox aria-label='选择本页全部待办' checked={visible.length>0&&visible.every(row=>selected.includes(row.id))} disabled={pending} onCheckedChange={value=>setSelected(value?[...new Set([...selected,...visible.map(row=>row.id)])]:selected.filter(id=>!visible.some(row=>row.id===id)))}/></label><span>已选择 {selected.length} 项</span><Button variant='ghost' disabled={pending||!selected.length} onClick={()=>void commit({type:'complete',ids:selected})}>标记完成</Button><Button variant='ghost' disabled={pending||!selected.length} onClick={()=>{deleteOrigin.current=null;setError('');setDeleting(selected);}}>删除所选</Button></div>}
 <div className='site-task-scroll'>{filtered.length?['today','next','done'].map(group=>{const items=visible.filter(row=>taskGroup(row,bridge.today)===group);return items.length?<section className='site-task-group' key={group} aria-label={{today:'今天与逾期待办',next:'接下来的待办',done:'已完成待办'}[group]}><h2>{{today:'今天',next:'接下来',done:'已完成'}[group]}{group==='today'&&<small>{bridge.today.slice(5).replace('-','月')}日</small>}</h2><ul>{items.map(row=><li key={row.id} data-done={row.done}>{selecting?<label className='workspace-checkbox-target'><Checkbox aria-label={'选择待办：'+row.title} disabled={pending} checked={selected.includes(row.id)} onCheckedChange={value=>setSelected(value?[...selected,row.id]:selected.filter(id=>id!==row.id))}/></label>:<WorkspaceCompletion motionKey={'task:'+bridge.scope+':'+row.id} checked={row.done} ariaLabel={(row.done?'重新打开':'完成')+'：'+row.title} disabled={pending} strike='none' onChange={()=>void commit({type:'toggle',ids:[row.id]})}/>}<button ref={node=>{if(node)editButtons.current.set(row.id,node);else editButtons.current.delete(row.id);}} className='site-task-title' disabled={pending} onClick={()=>{setError('');setEditor(row);}}><strong>{row.title}</strong>{row.detail&&<span>{row.detail}</span>}{row.mediaRecordId&&<small>关联游戏：{games.find(g=>g.id===row.mediaRecordId)?.title||'原关联已移除'}</small>}</button>{!row.done&&row.priority==='high'&&<span className='site-task-priority'>优先处理</span>}<time className={!row.done&&row.dueDate&&row.dueDate<bridge.today?'site-task-overdue':''}>{row.dueDate===bridge.today?'今天':row.dueDate?row.dueDate.slice(5).replace('-','月')+'日':'无截止日期'}</time>{row.mediaRecordId&&games.some(g=>g.id===row.mediaRecordId)&&<Button variant='ghost' disabled={pending} onClick={()=>bridge.openGame(row.mediaRecordId)}>查看游戏</Button>}<Button ref={node=>{if(node)deleteButtons.current.set(row.id,node);else deleteButtons.current.delete(row.id);}} variant='ghost' size='icon' aria-label={'删除：'+row.title} disabled={pending} onClick={()=>{deleteOrigin.current=row.id;setError('');setDeleting([row.id]);}}><Trash2 size={16}/></Button></li>)}</ul></section>:null;}):<div className='site-empty'><h2>{rows.length?'没有符合条件的待办':'从一件想做的事开始'}</h2><p>{rows.length?'调整搜索或筛选条件，查看其他待办。':'点击上方“新建待办”，记下下一步要做的事。'}</p>{rows.length>0&&<Button variant='ghost' onClick={resetFilters}>清空筛选</Button>}</div>}</div>
 <footer className='site-list-footer'><span>已完成 {rows.filter(r=>r.done).length} / {rows.length} · 当前筛选 {filtered.length} 项</span>{filtered.length>pagination.pageSize&&<div><Button variant='ghost' disabled={pending||pagination.pageIndex===0} onClick={()=>setPagination(p=>({...p,pageIndex:p.pageIndex-1}))}>上一页</Button><span>{pagination.pageIndex+1} / {Math.ceil(filtered.length/pagination.pageSize)}</span><Button variant='ghost' disabled={pending||(pagination.pageIndex+1)*pagination.pageSize>=filtered.length} onClick={()=>setPagination(p=>({...p,pageIndex:p.pageIndex+1}))}>下一页</Button></div>}</footer>
 </section>}
 {editor&&<TasksMutateDrawer key={editor.id||'new'} currentRow={editor} returnFocus={()=>editButtons.current.get(editor.id)||createButton.current||document.querySelector<HTMLButtonElement>('[data-add-task]')} scope={bridge.scope} games={games} pending={pending} error={error} close={()=>{if(!locked.current){setEditor(null);setError('');}}} save={value=>commit({type:'save',record:{...editor,...value}})}/>}
 {migrating&&<GameTaskMigration rows={legacyGames} games={games} pending={pending} error={error} close={()=>{setMigrating(false);setError('');}} save={choices=>commit({type:'migrateGames',choices})}/>}
 <Dialog open={!!deleting} onOpenChange={v=>{if(!v&&!locked.current){setDeleting(null);setError('');}}}><DialogContent className='ui-confirm-dialog' returnFocus={()=>deleteButtons.current.get(deleteOrigin.current)} returnFocusFallback={()=>createButton.current} showCloseButton={false} onOpenAutoFocus={e=>{e.preventDefault();document.getElementById('tasks-delete-cancel')?.focus();}}><DialogHeader><DialogTitle>删除 {deleting?.length} 项待办？</DialogTitle><DialogDescription>删除后，相关待办会从日历和到期提醒中移除。</DialogDescription></DialogHeader><div className='px-4'>{deleting?.map(id=><p key={id}>{rows.find(t=>t.id===id)?.title}</p>)}{error&&<p role='alert' className='tasks-error'>{error}</p>}</div><DialogFooter><Button id='tasks-delete-cancel' variant='outline' disabled={pending} onClick={()=>{setDeleting(null);setError('');}}>取消</Button><Button variant='destructive' disabled={pending} onClick={()=>commit({type:'delete',ids:deleting})}>{pending?'正在删除…':'确认删除'}</Button></DialogFooter></DialogContent></Dialog>
 </>;
}
function TasksMutateDrawer({currentRow,returnFocus,scope,games,pending,error,close,save}){
 const form=useForm({defaultValues:{title:currentRow.title||'',dueDate:currentRow.dueDate||'',priority:currentRow.priority||'normal',done:!!currentRow.done,detail:currentRow.detail||'',mediaRecordId:currentRow.mediaRecordId||''}});
 const field=(name,label,input)=> <FormField key={name} control={form.control} name={name} rules={name==='title'?{validate:v=>!!v.trim()||'请输入待办标题',maxLength:{value:200,message:'标题最多 200 字'}}:undefined} render={({field})=><FormItem><FormLabel>{label}</FormLabel><FormControl>{input(field)}</FormControl><FormMessage/></FormItem>}/>;
 return <Sheet open onOpenChange={v=>{if(!v&&!pending)close();}}><SheetContent returnFocus={returnFocus} onEscapeKeyDown={e=>{if(pending)e.preventDefault();}} onPointerDownOutside={e=>{if(pending)e.preventDefault();}} className='tasks-drawer flex flex-col'><SheetHeader><SheetTitle>{currentRow.id?'编辑待办':'新建待办'}</SheetTitle><SheetDescription>保存后同步到当前空间的日历和到期提醒。</SheetDescription></SheetHeader><FormProvider {...form}><form id='tasks-form' noValidate onSubmit={form.handleSubmit(v=>save({...v,title:v.title.trim()}))} className='flex-1 space-y-6 overflow-y-auto px-4'><fieldset disabled={pending} className='tasks-fields'>
 {field('title','标题',f=><Input {...f} maxLength={200} autoFocus placeholder='输入待办标题'/>)}
 <div className='workspace-field-row'>{field('done','状态',f=><WorkspaceSelect value={f.value?'done':'open'} onValueChange={v=>f.onChange(v==='done')} label='状态' options={[{value:'open',label:'未完成'},{value:'done',label:'已完成'}]}/>)}{field('priority','优先级',f=><WorkspaceSelect {...f} onValueChange={f.onChange} label='优先级' options={[{value:'high',label:'高'},{value:'normal',label:'普通'},{value:'low',label:'低'}]}/>)}</div>
 {field('dueDate','截止日期（可选）',f=><Input {...f} type='date'/>)}
 {scope==='personal'&&field('mediaRecordId','关联游戏（可选）',f=><WorkspaceSelect value={f.value?'game:'+f.value:'none'} onValueChange={v=>f.onChange(v==='none'?'':v.slice(5))} label='关联游戏' options={[{value:'none',label:'不关联游戏'},...(currentRow.mediaRecordId&&!games.some(g=>g.id===currentRow.mediaRecordId)?[{value:'game:'+currentRow.mediaRecordId,label:'原关联游戏已移除'}]:[]),...games.map(g=>({value:'game:'+g.id,label:g.title+(g.platform?'（'+g.platform+'）':'')}))]}/>)}
 {scope==='personal'&&<p className='muted'>在娱乐记录中新建游戏后，可在这里关联。待办完成状态只代表提醒已处理。</p>}
 {field('detail','详情（可选）',f=><Textarea {...f} maxLength={5000} rows={5} className='resize-none'/>)}
 </fieldset>{error&&<p className='tasks-error' role='alert'>{error}</p>}</form></FormProvider><SheetFooter><Button variant='outline' disabled={pending} onClick={close}>取消</Button><SaveButton form='tasks-form' type='submit' pending={pending}/></SheetFooter></SheetContent></Sheet>;
}
const roots=new WeakMap();export const workspaceTasks={mount(node,bridge){let mounted=roots.get(node);if(mounted){mounted.controller.update(bridge.rows);return mounted.controller;}const controller={update(data){bridge.rows=data;}},root=createRoot(node);roots.set(node,{root,controller});root.render(<App bridge={bridge} controller={controller}/>);return controller;},unmount(node){const m=roots.get(node);if(m){m.root.unmount();roots.delete(node);}}};

window.WorkspaceTasks=workspaceTasks;
