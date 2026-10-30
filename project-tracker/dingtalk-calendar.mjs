import {readBoundedText} from './request-body.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const table='CREATE TABLE IF NOT EXISTS dingtalk_calendar (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, payload TEXT NOT NULL)';
export function validSnapshot(s){
 const instant=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
 const local=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'+08:00'))&&new Date(Date.parse(v+'+08:00')+28800000).toISOString().slice(0,16)===v;
 if(!s||s.calendarId!=='primary'||s.complete!==true||typeof s.profile!=='string'||!s.profile||s.profile.length>200||!Number.isSafeInteger(s.version)||!instant(s.windowStart)||!instant(s.windowEnd)||Date.parse(s.windowEnd)<=Date.parse(s.windowStart)||Date.parse(s.windowEnd)-Date.parse(s.windowStart)>125*86400000||!Array.isArray(s.events)||s.events.length>5000)return false;
 const ids=new Set();return s.events.every(e=>e&&typeof e.id==='string'&&e.id.length>0&&e.id.length<=500&&!ids.has(e.id)&&(ids.add(e.id),true)&&typeof e.title==='string'&&e.title.trim()&&e.title.length<=200&&local(e.start)&&local(e.end)&&e.end>e.start&&Date.parse(e.start+'+08:00')<Date.parse(s.windowEnd)&&Date.parse(e.end+'+08:00')>Date.parse(s.windowStart)&&typeof e.allDay==='boolean'&&typeof e.location==='string'&&e.location.length<=500&&typeof e.detail==='string'&&e.detail.length<=5000);
}
export async function readDingtalkCalendar(env){
 if(!env.DINGTALK_CALENDAR_SYNC_SECRET)return {events:[],connected:false};
 await env.DB.prepare(table).run();const row=await env.DB.prepare('SELECT payload FROM dingtalk_calendar WHERE id=1').first();
 if(!row)return {events:[],connected:false};const s=JSON.parse(row.payload);
 return {events:s.events,connected:true,lastSyncedAt:s.lastSyncedAt,windowStart:s.windowStart,windowEnd:s.windowEnd,stale:Date.now()-Date.parse(s.lastSyncedAt)>15*60000};
}
export async function dingtalkCalendarPush(request,env){
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const secret=env.DINGTALK_CALENDAR_SYNC_SECRET;if(!secret||secret.length<32)return reply({error:'钉钉日历同步尚未配置'},503);
 const stamp=request.headers.get('X-Dingtalk-Timestamp'),sig=request.headers.get('X-Dingtalk-Signature');
 if(!/^\d{13}$/.test(stamp||'')||Math.abs(Date.now()-Number(stamp))>300000||!/^[a-f0-9]{64}$/.test(sig||''))return reply({error:'同步签名无效或过期'},401);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return reply({error:'JSON required'},415);
 let body;try{body=await readBoundedText(request,1500000);}catch{return reply({error:'同步数据过大'},413);}
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(sig.match(/../g),v=>parseInt(v,16)),new TextEncoder().encode(stamp+'.'+body)))return reply({error:'同步签名无效'},401);
 let s;try{s=JSON.parse(body);}catch{return reply({error:'Invalid JSON'},400);}
 if(!validSnapshot(s)||s.version>Number(stamp)||Number(stamp)-s.version>300000)return reply({error:'同步数据不完整或格式无效，保留原日程'},400);
 // Whitelist source data; external events never enter editable workspace state.
 const payload={profile:s.profile,calendarId:'primary',windowStart:s.windowStart,windowEnd:s.windowEnd,events:s.events.map(e=>Object.fromEntries(['id','title','start','end','allDay','location','detail'].map(k=>[k,e[k]]))),lastSyncedAt:new Date().toISOString()};
 try{
  await env.DB.prepare(table).run();
  const result=await env.DB.prepare("INSERT INTO dingtalk_calendar (id,version,payload) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,payload=excluded.payload WHERE dingtalk_calendar.version<excluded.version AND json_extract(dingtalk_calendar.payload,'$.profile')=json_extract(excluded.payload,'$.profile')").bind(s.version,JSON.stringify(payload)).run();
  if(!result.meta?.changes)return reply({error:'同步已过期或账号不匹配，保留原日程'},409);
  return reply({ok:true,count:payload.events.length,lastSyncedAt:payload.lastSyncedAt});
 }catch{return reply({error:'保存失败，保留原日程'},503);}
}
