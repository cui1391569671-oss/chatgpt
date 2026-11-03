import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_SUPPLY_CATEGORIES,summarizeProjectCore} from '../project-core-summary.mjs';

test('core display keeps the ten source categories, quantities and responsibility while details retain source prose',()=>{
 const item={supplyScope:'货架系统：甲方提供货架，5847个货位。（表列数量：5847货位）；供货方：甲方；备注：合同第9页\n四向穿梭车系统：车4台，充电8套。（表列数量：4台）；供货方：乙方\n货架运输：货架运输1项\n人员境外险：1项\n安装调试及培训：1项'};
 const original=JSON.stringify(item),r=summarizeProjectCore(item);
 assert.deepEqual(r.supplyScope.slice(0,2),[{category:'货架系统',value:'5847 货位（甲方提供）'},{category:'四向车系统',value:'4 台'}]);
 assert.equal(r.supplyScope.length,10);assert.equal(r.supplyScope[7].category,'安装调试及培训');assert.match(r.supplyScope[9].value,/货架运输/);assert.match(r.supplyScope[9].value,/人员境外险/);
 assert.equal(JSON.stringify(item),original);assert(!JSON.stringify(r.supplyScope).includes('合同第9页'));assert.match(r.supplyDetails[0].value,/合同第9页/);
});
test('pallet dimensions never come from vehicle or cargo dimensions and load differences stay visible',()=>{
 const r=summarizeProjectCore({palletSize:'四向车系统：车体1000×900 mm，适配1200×800 mm托盘\n货架：托盘1200×800 mm\n原表风险说明：货物含托最大1200×1200×1700 mm',equipmentLoad:'四向车系统：载重1000 kg；备注：参数表1200 kg不一致，待确认\n提升机系统：额载≥1275 kg（含车）\n四向车系统：额载1500 kg；备注：充电器7套与8套不一致'});
 assert.deepEqual(r.palletSize,['1200 × 800 mm']);
 assert.equal(r.equipmentLoad[0].value,'1000 kg / 1200 kg（待确认）');
 assert.equal(r.equipmentLoad[1].value,'≥1275 kg（含车）');
 assert.equal(r.equipmentLoad[2].value,'1500 kg');
 assert.deepEqual(summarizeProjectCore({palletSize:'货物含托最大1200×1200×1700 mm'}).palletSize,[]);
});
test('efficiency retains combined-action definitions, test windows and acceptance restrictions',()=>{
 const r=summarizeProjectCore({efficiency:'效率要求：合计49次搬运/小时，含全部动作，不等于净出库49托。\n测试条件：5台车；16–75分钟计数≥49托。所有设备运行。\n验收适用性：效率不作为验收依据。\n其他验收：按清单执行。单出与总出入库口径差异待确认。'});
 assert(r.efficiency.some(s=>s.includes('不等于净出库')));assert(r.efficiency.some(s=>s.includes('16–75分钟')));assert(r.efficiency.some(s=>s.includes('不作为验收依据')));assert(r.efficiency.some(s=>s.includes('口径差异待确认')));
 assert(!r.efficiency.some(s=>s.includes('按清单执行')));
});
test('empty and already concise legacy snapshots remain usable',()=>{
 const empty=summarizeProjectCore({});assert.deepEqual(empty.supplyScope,[]);assert.equal(empty.transport,'待补充');
 const r=summarizeProjectCore({supplyScope:'四向车4台',palletSize:'1200×1000 mm',equipmentLoad:'1000 kg',transport:'海运'});
 assert.equal(r.supplyScope[9].value,'四向车4台');assert.equal(r.equipmentLoad[0].value,'1000 kg');assert.equal(r.transport,'海运');assert.equal(r.palletSize.length,1);
});
test('installation duties never become supply ownership and software component quantities stay distinct',()=>{
 const r=summarizeProjectCore({supplyScope:'电气控制系统：电控1套。（表列数量：1套）；供货方：乙方；备注：安装接线甲方负责\n软件系统：WMS（含PDA）1套；WCS1套；供货方：乙方'});
 assert.equal(r.supplyScope[4].value,'1 套');assert.equal(r.supplyScope[5].value,'WMS1套、WCS1套');
});

test('all ten categories follow the approved order, including services, spares and multiline other items',()=>{
 const names=['货架系统','四向车系统','提升机系统','输送线系统','电气控制系统','软件系统（RMS/WMS/WCS）','网络及 IT 设备','安装调试及培训','备品备件及工具','其他'];
 assert.deepEqual(PROJECT_SUPPLY_CATEGORIES,names);
 const rows=names.map((name,index)=>name+'：'+(index===9?'包装1项\n运输1项\n保险1项':'示例内容')+'（表列数量：'+(index+1)+'套）；供货方：示例供方；备注：来源记录'+index);
 const r=summarizeProjectCore({supplyScope:rows.reverse().join('\n')});
 assert.deepEqual(r.supplyScope.map(row=>row.category),names);
 for(let i=0;i<10;i++){assert.equal(r.supplyScope[i].value,(i+1)+' 套');assert.match(r.supplyDetails[i].value,new RegExp('来源记录'+i));assert.match(r.supplyDetails[i].value,/供货方：示例供方/);}
 assert.match(r.supplyDetails[9].value,/包装1项\n运输1项\n保险1项/);
});

test('unknown source ranges and missing categories stay explicit without adding counts or service totals',()=>{
 const r=summarizeProjectCore({supplyScope:'网络及IT设备：原表未单列网络供货，范围待确认。（表列数量：1套）；供货方：待确认\n安装调试及培训：服务项，不与设备数量叠加。（表列数量：1项）\n备品备件及工具：未单列备件，范围待确认。（表列数量：1套）\n四向车系统：设备（表列数量：4台）\n四向穿梭车系统：另一区域设备（表列数量：2台）'});
 assert.equal(r.supplyScope[0].value,'待补充');assert.equal(r.supplyScope[1].value,'4 台；2 台');assert.equal(r.supplyScope[6].value,'1 套（范围待确认）');assert.equal(r.supplyScope[7].value,'1 项');assert.equal(r.supplyScope[8].value,'1 套（范围待确认）');
 assert.match(r.supplyDetails[7].value,/不与设备数量叠加/);assert.equal(r.supplyScope[9].value,'待补充');
});
