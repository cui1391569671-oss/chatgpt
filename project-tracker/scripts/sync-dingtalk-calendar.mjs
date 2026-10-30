// Local bridge: OAuth credentials remain in the official DWS credential store.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readFileSync,statSync} from 'node:fs';
import {validSnapshot} from '../dingtalk-calendar.mjs';
const exec=promisify(execFile);
export function normalizeDingtalkEvents(events){
 const local=value=>{
  if(value?.date&&!value.dateTime)return value.date+'T00:00';
  if(typeof value?.dateTime!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value.dateTime)||!Number.isFinite(Date.parse(value.dateTime)))throw Error('钉钉日程时间无效');
  return new Date(Date.parse(value.dateTime)+28800000).toISOString().slice(0,16);
 };
 const records=new Map();
 for(const e of events){
  if(e.status==='cancelled'||e.status==='canceled'||e.attendees?.some(a=>a.self&&a.responseStatus==='declined'))continue;
  if(typeof e.id!=='string'||typeof e.summary!=='string'||!e.summary.trim())throw Error('钉钉日程缺少稳定ID或标题');
  const start=local(e.start),end=local(e.end),location=typeof e.location==='string'?e.location:e.location?.displayName||'';
  const detail=[e.description,e.onlineMeetingInfo?.url].filter(v=>typeof v==='string'&&v).join('\n');
  const record={id:e.id,title:e.summary.slice(0,200),start,end,allDay:!!e.isAllDay,location:location.slice(0,500),detail:detail.slice(0,5000)};
  if(records.has(e.id)&&JSON.stringify(records.get(e.id))!==JSON.stringify(record))throw Error('钉钉返回冲突的重复日程');
  records.set(e.id,record);
 }
 return [...records.values()];
}
export async function collectSnapshot({profile,binary='dws',run=exec,now=Date.now()}){
 if(!profile||!profile.includes(':'))throw Error('必须明确设置 DINGTALK_PROFILE 为已授权的组织:用户');
 const day=new Date(now+28800000).toISOString().slice(0,10),midnight=Date.parse(day+'T00:00:00+08:00');
 const windowStart=new Date(midnight-30*86400000).toISOString(),windowEnd=new Date(midnight+91*86400000).toISOString();
 const events=[],seen=new Set();let cursor;
 for(let page=0;page<100;page++){
  const args=['calendar','event','list','--profile',profile,'--start',windowStart,'--end',windowEnd,'--limit','100','--format','json'];if(cursor)args.push('--cursor',cursor);
  const {stdout}=await run(binary,args,{timeout:60000,maxBuffer:16000000});const data=JSON.parse(stdout),result=data.result;
  if(data.success!==true||!Array.isArray(result?.events))throw Error('钉钉查询未成功，停止同步并保留原日程');
  events.push(...result.events);if(events.length>5000)throw Error('日程超出同步上限，停止同步并保留原日程');
  const next=result.nextCursor||data.nextCursor;
  if(!next){if(result.hasMore===true||data.hasMore===true)throw Error('钉钉分页未完成，停止同步并保留原日程');break;}
  if(seen.has(next)||page===99)throw Error('钉钉分页游标无效');seen.add(next);cursor=next;
 }
 const snapshot={profile,calendarId:'primary',version:now,complete:true,windowStart,windowEnd,events:normalizeDingtalkEvents(events)};
 if(!validSnapshot(snapshot))throw Error('钉钉日程校验未通过，保留原日程');return snapshot;
}
export async function syncDingtalkCalendar(config=process.env){
 const endpoint=new URL('/api/dingtalk-calendar/push',config.WORKBENCH_URL);
 if(endpoint.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(endpoint.hostname))throw Error('同步地址必须使用HTTPS');
 const secret=config.DINGTALK_CALENDAR_SYNC_SECRET;if(!secret||secret.length<32)throw Error('缺少独立同步密钥');
 const snapshot=await collectSnapshot({profile:config.DINGTALK_PROFILE,binary:config.DWS_BINARY||'dws'});
 const body=JSON.stringify(snapshot),stamp=String(Date.now()),signature=createHmac('sha256',secret).update(stamp+'.'+body).digest('hex');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Dingtalk-Timestamp':stamp,'X-Dingtalk-Signature':signature},body,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('工作日历同步未成功（HTTP '+response.status+'），保留原日程');
 const result=await response.json();if(!result.ok||result.count!==snapshot.events.length)throw Error('工作日历未确认同步结果');
 console.log(JSON.stringify({ok:true,count:result.count,lastSyncedAt:result.lastSyncedAt}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let config=process.env;
 try{if(process.argv[2]==='--config'){const path=process.argv[3];if(statSync(path).mode&0o077)throw Error('配置文件必须为0600');config=JSON.parse(readFileSync(path,'utf8'));}}
 catch{console.error('无法读取受保护的同步配置文件');process.exit(1);}
 syncDingtalkCalendar(config).catch(()=>{console.error('钉钉日历同步失败：请检查授权、网络与同步配置；云端原日程已保留。');process.exitCode=1;});
}

