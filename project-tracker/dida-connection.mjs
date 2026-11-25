const endpoint='https://mcp.dida365.com';
const taskTools=new Set(['get_project_by_id','list_projects','get_tasks_by_project','list_tasks','create_task','update_task','complete_task']);

async function didaSession(token,fetcher){
 if(!token)throw new Error("Dida token missing");
 const headers=new Headers({
  Authorization:'Bearer '+token,
  'Content-Type':'application/json',
  Accept:'application/json, text/event-stream'
 });
 async function send(method,params,id){
  const request={jsonrpc:'2.0',method,params,...(id?{id}:{})};
  const response=await fetcher(endpoint,{method:'POST',headers,body:JSON.stringify(request),redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Dida HTTP '+response.status);
  if(!id)return;
  const session=response.headers.get('Mcp-Session-Id');
  if(session)headers.set('Mcp-Session-Id',session);
  const content=await response.text();
  const messages=response.headers.get('Content-Type')?.includes('text/event-stream')
   ?content.split(/\r?\n\r?\n/).map(frame=>frame.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n')).filter(Boolean).map(value=>JSON.parse(value))
   :[JSON.parse(content)];
  const message=messages.find(value=>value.id===id);
  if(!message?.result||message.error)throw new Error('Dida MCP request failed');
  return message.result;
 }
 const initialized=await send('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'project-tracker',version:'1.0'}},1);
 headers.set('MCP-Protocol-Version',initialized.protocolVersion||'2025-03-26');
 await send('notifications/initialized',{});
 return send;
}

export async function inspectDidaConnection(token,fetcher=fetch){
 if(!token)return {configured:false};
 const send=await didaSession(token,fetcher);

 const tools=[];
 let cursor;
 for(let page=0;page<8;page++){
  const result=await send('tools/list',cursor?{cursor}:{},2+page);
  for(const tool of result.tools||[]){
   if(taskTools.has(tool.name))tools.push({name:tool.name,inputSchema:tool.inputSchema});
  }
  cursor=result.nextCursor;
  if(!cursor)break;
 }
 return {configured:true,tools};
}

const testProject='6b068f9bcfea111164edfe39';
export async function sendDidaTest(token,now=Date.now(),fetcher=fetch){
 const send=await didaSession(token,fetcher);
 const date=new Date(now+28800000+86400000).toISOString().slice(0,10);
 const result=await send('tools/call',{name:'create_task',arguments:{client_timezone:'Asia/Shanghai',task:{
  projectId:testProject,title:'【工作台测试】验证滴答清单同步',
  content:'这是一条测试待办，用于验证截止日期和链接。\nhttps://tracker.managementplatformlee.com/work?view=tasks',
  startDate:date+'T00:00:00+08:00',dueDate:date+'T00:00:00+08:00',isAllDay:true,timeZone:'Asia/Shanghai'
 }}},2);
 if(result.isError)throw new Error('Dida rejected test task');
 const value=result.structuredContent??result.content?.find(item=>item.type==='text')?.text;
 const data=typeof value==='string'?JSON.parse(value):value;
 const entry=[data,data?.task,data?.data,data?.result].find(item=>item?.projectId===testProject&&typeof item.id==='string');
 if(!entry)throw new Error('Dida did not confirm the created task');
 return {id:entry.id,date};
}
