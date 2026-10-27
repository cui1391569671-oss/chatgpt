const statuses=['all','open','done','overdue','games'];
const priorities=['all','high','normal','low'];
export function readTaskView(search,scope='personal'){
 const params=new URLSearchParams(search),status=params.get('taskStatus'),priority=params.get('taskPriority'),sort=params.get('taskSort')||'',page=Number(params.get('taskPage')||1),size=Number(params.get('taskPageSize')||10);
 const [id,direction]=sort.split(':');
 return {query:(params.get('taskQuery')||'').slice(0,200),status:statuses.includes(status)&&(scope==='personal'||status!=='games')?status:'all',priority:priorities.includes(priority)?priority:'all',sorting:['title','dueDate'].includes(id)&&['asc','desc'].includes(direction)?[{id,desc:direction==='desc'}]:[],pagination:{pageIndex:Number.isSafeInteger(page)&&page>=1&&page<=1000000?page-1:0,pageSize:[10,20,50].includes(size)?size:10}};
}
export function taskViewUrl(href,state){
 const url=new URL(href),sort=state.sorting[0];
 const values={taskQuery:state.query.slice(0,200),taskStatus:state.status==='all'?'':state.status,taskPriority:state.priority==='all'?'':state.priority,taskSort:sort?sort.id+':'+(sort.desc?'desc':'asc'):'',taskPage:state.pagination.pageIndex?String(state.pagination.pageIndex+1):'',taskPageSize:state.pagination.pageSize===10?'':String(state.pagination.pageSize)};
 for(const [key,value]of Object.entries(values)){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}
 return url.pathname+url.search+url.hash;
}
export function clampTaskPage(pagination,total){return {...pagination,pageIndex:Math.min(pagination.pageIndex,Math.max(0,Math.ceil(total/pagination.pageSize)-1))};}
