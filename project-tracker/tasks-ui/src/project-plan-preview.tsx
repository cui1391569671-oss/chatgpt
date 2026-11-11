import type {CSSProperties} from 'react';

export type SheetPreview={columns:number[];heights:number[];styles:[string,string,number,boolean,boolean,string,string,boolean][];
 cells:[string,number,boolean?][][];merges:number[][];frozenRows:number;hiddenRows:number[];hiddenColumns:number[]};
export type PlanEditField={key:string;column:number;type:string;value:string|boolean};
export type PlanProject={sheetId:number;name:string;code:string;tasks:{row:number;phase:string;module:string;title:string;applicability:string;department:string;start:string;end:string;status:string}[];preview?:SheetPreview;editing?:{row:number;fields:PlanEditField[]}[]};

function OriginalGrid({project,onEdit}:{project:PlanProject;onEdit:(row:number,trigger:HTMLButtonElement)=>void}){
 const preview=project.preview;
 const titleColumn=preview.cells.slice(0,12).find(cells=>cells.some(cell=>cell[0]==='标准任务'))?.findIndex(cell=>cell[0]==='标准任务');
 const hiddenRows=new Set(preview.hiddenRows),hiddenColumns=new Set(preview.hiddenColumns),covered=new Set<string>(),merges=new Map<string,number[]>();
 for(const [r,c,h,w] of preview.merges){
  const rows=Array.from({length:h},(_,i)=>r+i).filter(i=>!hiddenRows.has(i));
  const columns=Array.from({length:w},(_,i)=>c+i).filter(i=>!hiddenColumns.has(i));
  if(!rows.length||!columns.length)continue;
  merges.set(rows[0]+':'+columns[0],[rows.length,columns.length,r,c,h]);
  for(const y of rows)for(const x of columns)if(y!==rows[0]||x!==columns[0])covered.add(y+':'+x);
 }
 const row=(cells:SheetPreview['cells'][number],r:number)=>!hiddenRows.has(r)&&<tr key={r} style={{height:preview.heights[r]}}>
  <th className='project-plan-row-number' scope='row'>{r+1}</th>
  {cells.map((cell,c)=>{
   const key=r+':'+c;if(hiddenColumns.has(c)||covered.has(key))return null;
   const merge=merges.get(key);
   const [text,index,checked]=merge?preview.cells[merge[2]][merge[3]]:cell;
   const [background,color,fontSize,bold,italic,textAlign,verticalAlign,wrap]=preview.styles[index];
   const cellHeight=merge?preview.heights.slice(merge[2],merge[2]+merge[4]).reduce((sum,height,i)=>sum+(hiddenRows.has(merge[2]+i)?0:height),0):preview.heights[r];
   const style={background,color,fontSize:fontSize+'pt',fontWeight:bold?700:400,fontStyle:italic?'italic':'normal',textAlign,verticalAlign,whiteSpace:wrap?'pre-wrap':'pre','--project-plan-cell-height':Math.max(16,cellHeight-7)+'px'} as CSSProperties;
   const task=c===titleColumn&&project.tasks.find(item=>item.row===r+1&&item.title===text);
   return <td key={c} rowSpan={merge?.[0]} colSpan={merge?.[1]} style={style}>
    {task&&project.editing?.some(item=>item.row===task.row&&item.fields.length)?<button type='button' className='project-plan-task-link' title={text} aria-label={'编辑任务：'+task.title} onClick={event=>onEdit(task.row,event.currentTarget)}>{text}</button>:
     typeof checked==='boolean'?<span className='project-plan-checkbox' role='img' aria-label={checked?'已勾选':'未勾选'}>{checked?'☑':'☐'}</span>:<span title={text}>{text}</span>}
   </td>;
  })}
 </tr>;
 return <table className='project-plan-sheet' aria-label={project.code+' '+project.name+'任务表预览'} style={{width:40+preview.columns.reduce((sum,width,c)=>sum+(hiddenColumns.has(c)?0:width),0)}}>
  <colgroup><col style={{width:40}}/>{preview.columns.map((width,c)=>!hiddenColumns.has(c)&&<col key={c} style={{width}}/>)}</colgroup>
  <thead><tr className='project-plan-column-letters'><th aria-label='行号'/>{preview.columns.map((_,c)=>!hiddenColumns.has(c)&&<th key={c} scope='col'>{String.fromCharCode(65+c)}</th>)}</tr>
   {preview.cells.slice(0,preview.frozenRows).map(row)}
  </thead>
  <tbody>{preview.cells.slice(preview.frozenRows).map((cells,i)=>row(cells,i+preview.frozenRows))}</tbody>
 </table>;
}

export function ProjectPlanPreview({project,onEdit}:{project:PlanProject;onEdit:(row:number,trigger:HTMLButtonElement)=>void}){
 return <div className='project-plan-preview-scroll' key={project.sheetId} role='region' aria-label={project.code+' '+project.name+'任务表，可横向和纵向滚动'} tabIndex={0}>
  {project.preview?<OriginalGrid project={project} onEdit={onEdit}/>:<table className='project-plan-legacy-table'>
   <caption>{project.code+' '+project.name+' · 任务数据'}</caption>
   <thead><tr>{['行','阶段','模块','标准任务','是否适用','责任部门','计划开始时间','计划完成日期','状态'].map(label=><th key={label} scope='col'>{label}</th>)}</tr></thead>
   <tbody>{project.tasks.map(task=><tr key={task.row}><th scope='row'>{task.row}</th>{['phase','module','title','applicability','department','start','end','status'].map(key=><td key={key}>{task[key]||'—'}</td>)}</tr>)}</tbody>
  </table>}
 </div>;
}
