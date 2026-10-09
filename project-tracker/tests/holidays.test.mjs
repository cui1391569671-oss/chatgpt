import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../holidays.json',import.meta.url),'utf8'));
const helper=html.slice(html.indexOf('function holidayInfo('),html.indexOf('function eventsOn('));
const context=vm.createContext({CHINA_HOLIDAYS:data});vm.runInContext(helper,context);
const info=date=>context.holidayInfo(date);
test('2026 official holiday ranges and all makeup workdays match the notice',()=>{
 assert.deepEqual(data['2026'].holidays.map(x=>[x.name,x.start,x.end]),[
 ['元旦','2026-01-01','2026-01-03'],['春节','2026-02-15','2026-02-23'],['清明节','2026-04-04','2026-04-06'],['劳动节','2026-05-01','2026-05-05'],['端午节','2026-06-19','2026-06-21'],['中秋节','2026-09-25','2026-09-27'],['国庆节','2026-10-01','2026-10-07']]);
 assert.deepEqual(data['2026'].workdays.map(x=>x.date),['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10']);
 for(const x of data['2026'].workdays){assert.equal(info(x.date).type,'work');assert.equal(info(x.date).name,x.name);}
 assert.equal(info('2026-10-07').type,'rest');assert.equal(info('2026-10-08'),null);assert.equal(info('2026-10-11'),null);
 assert.equal(info('2026-02-15').type,'rest');assert.equal(info('2026-02-23').type,'rest');assert.equal(info('2026-02-24'),null);
});
test('unknown years are not inferred; embedded data stays in sync',()=>{
 assert.equal(info('2028-10-01'),null);assert.equal(info('2025-10-01'),null);
 const embedded=html.match(/const CHINA_HOLIDAYS=(.*);/)[1];assert.deepEqual(JSON.parse(embedded),data);
});

test('2027 festival dates are recorded without guessing leave or makeup workdays',()=>{
 assert.equal(data['2027'].officialSchedule,false);assert.deepEqual(data['2027'].workdays,[]);assert.deepEqual(data['2027'].holidays,[]);
 for(const [date,name] of [['2027-02-05','除夕'],['2027-02-06','春节'],['2027-02-20','元宵节'],['2027-04-05','清明节'],['2027-06-09','端午节'],['2027-09-15','中秋节']]){assert.equal(info(date).name,name);assert.equal(info(date).type,'festival');}
 assert.equal(info('2027-02-07'),null);
});
