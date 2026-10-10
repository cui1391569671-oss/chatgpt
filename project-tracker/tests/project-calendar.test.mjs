import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{projectCalendarItems} from '../worker.mjs';
const issue=(task,date,status='进行中')=>({project:'示例项目',task,plannedDate:date,status,done:status==='已完成',reason:'原因',note:'备注'});
test('calendar projects active dated issues including paused, excludes archives and invalid dates',()=>{
 const s={data:[issue('进行中','2026-10-10'),issue('暂停','2026-10-11','暂停'),issue('完成','2026-10-10','已完成'),issue('无日期',''),issue('错误日期','2026-02-30')],archive:[issue('归档','2026-10-10')]};
 assert.deepEqual(projectCalendarItems(s).map(x=>x.title),['进行中','暂停']);assert.equal(projectCalendarItems(s)[0].date,'2026-10-10');
});
test('authenticated calendar reads track date edits, completions and deletion without modifying stored events',async()=>{
 const s={data:[issue('跟进问题','2026-10-10')],archive:[],priorities:{},workWorkspace:{tasks:[],notes:[],events:[{id:'manual'}]}};
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){return {async first(){return {payload:JSON.stringify(s),version:1};}};}}};
 const request=()=>new Request('https://test.local/api/project-calendar',{headers:{Authorization:'Basic '+btoa('u:p')}});
 assert.equal((await worker.fetch(new Request('https://test.local/api/project-calendar'),env)).status,401);
 const read=async()=> (await (await worker.fetch(request(),env)).json()).items;
 assert.equal((await read())[0].date,'2026-10-10');s.data[0].plannedDate='2026-10-12';assert.equal((await read())[0].date,'2026-10-12');
 s.data[0].done=true;s.data[0].status='已完成';assert.deepEqual(await read(),[]);s.data=[];assert.deepEqual(await read(),[]);assert.deepEqual(s.workWorkspace.events,[{id:'manual'}]);
});
