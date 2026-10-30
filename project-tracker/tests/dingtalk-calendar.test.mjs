import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {validSnapshot,dingtalkCalendarPush,readDingtalkCalendar} from '../dingtalk-calendar.mjs';
import {normalizeDingtalkEvents,collectSnapshot} from '../scripts/sync-dingtalk-calendar.mjs';
const secret='test-only-secret-'.repeat(3),profile='test-org:test-user';
const event=(id='e1')=>({id,summary:'测试会议',start:{dateTime:'2026-10-30T01:00:00Z'},end:{dateTime:'2026-10-30T02:00:00Z'},status:'confirmed',attendees:[],description:'说明',location:{displayName:'会议室'}});
const snapshot=(version=Date.now()-100)=>({profile,calendarId:'primary',version,complete:true,windowStart:'2026-10-01T00:00:00+08:00',windowEnd:'2027-01-30T00:00:00+08:00',events:normalizeDingtalkEvents([event()])});
const signed=(s,stamp=Date.now(),sig)=>{const body=JSON.stringify(s);return new Request('https://test.local/api/dingtalk-calendar/push',{method:'POST',headers:{'Content-Type':'application/json','X-Dingtalk-Timestamp':String(stamp),'X-Dingtalk-Signature':sig||createHmac('sha256',secret).update(stamp+'.'+body).digest('hex')},body});};
function database(){const sql=new DatabaseSync(':memory:');return {prepare(query){return {bind(...args){this.args=args;return this;},async run(){const result=sql.prepare(query).run(...this.args||[]);return {meta:{changes:Number(result.changes)}};},async first(){return sql.prepare(query).get(...this.args||[]);}};}};}
test('source converts timezone, all-day, excludes cancellations and declined invites, stable IDs',()=>{
 const e=normalizeDingtalkEvents([event(),event(),{...event('gone'),status:'cancelled'},{...event('declined'),attendees:[{self:true,responseStatus:'declined'}]}]);assert.equal(e.length,1);assert.equal(e[0].start,'2026-10-30T09:00');assert.equal(e[0].location,'会议室');
 const all=normalizeDingtalkEvents([{...event(),isAllDay:true,start:{date:'2026-10-30'},end:{date:'2026-10-31'}}]);assert.equal(all[0].end,'2026-10-31T00:00');assert(all[0].allDay);
 assert.throws(()=>normalizeDingtalkEvents([{...event(),start:{dateTime:'bad'}}]));assert.throws(()=>normalizeDingtalkEvents([event(),{...event(),summary:'冲突'}]));
});
test('complete pagination and failure protection',async()=>{
 const calls=[];const run=async(_binary,args)=>{calls.push(args);return {stdout:JSON.stringify({success:true,result:{events:[event(args.includes('--cursor')?'e2':'e1')],hasMore:!args.includes('--cursor'),...(!args.includes('--cursor')?{nextCursor:'next'}:{})}})};};
 const s=await collectSnapshot({profile,run,now:Date.parse('2026-10-30T12:00:00+08:00')});assert.equal(s.events.length,2);assert(validSnapshot(s));assert.equal(calls.length,2);assert(calls.every(a=>a.includes(profile)));
 for(const result of [{events:[],hasMore:true},{events:[],nextCursor:'loop'},{bad:true}])await assert.rejects(()=>collectSnapshot({profile,run:async()=>({stdout:JSON.stringify({success:true,result})})}));
 await assert.rejects(()=>collectSnapshot({profile,run:async()=>{throw Error('offline');}}));
});
test('strict snapshot validation rejects invalid dates, duplicates and incomplete sources',()=>{
 const s=snapshot();assert(validSnapshot(s));for(const candidate of [{...s,complete:false},{...s,calendarId:'other'},{...s,events:[s.events[0],s.events[0]]},{...s,events:[{...s.events[0],start:'2026-10-99T09:00'}]},{...s,events:[{...s.events[0],end:s.events[0].start}]}])assert.equal(validSnapshot(candidate),false);
});
test('signed atomic replacement handles edits, cancellations, account mismatch and stale snapshots',async()=>{
 const env={DB:database(),DINGTALK_CALENDAR_SYNC_SECRET:secret},s=snapshot();
 assert.equal((await dingtalkCalendarPush(await signed(s),env)).status,200);let data=await readDingtalkCalendar(env);assert.equal(data.events.length,1);assert(!JSON.stringify(data).includes(profile));assert(!JSON.stringify(data).includes(secret));
 assert.equal((await dingtalkCalendarPush(await signed(s),env)).status,409);
 assert.equal((await dingtalkCalendarPush(await signed({...s,version:s.version+1,profile:'other:user'}),env)).status,409);
 assert.equal((await dingtalkCalendarPush(await signed({...s,version:s.version+1,complete:false,events:[]}),env)).status,400);assert.equal((await readDingtalkCalendar(env)).events.length,1);
 assert.equal((await dingtalkCalendarPush(await signed({...s,version:s.version+2,events:[]}),env)).status,200);assert.equal((await readDingtalkCalendar(env)).events.length,0);
 assert.equal((await dingtalkCalendarPush(await signed(s,Date.now()-400000),env)).status,401);assert.equal((await dingtalkCalendarPush(await signed(s,Date.now(),'0'.repeat(64)),env)).status,401);
});
