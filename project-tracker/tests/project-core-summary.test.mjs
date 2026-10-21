import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeProjectCore} from '../project-core-summary.mjs';

test('core display groups goods and preserves quantities and responsibility without source prose',()=>{
 const item={supplyScope:'货架系统：甲方提供货架，5847个货位。（表列数量：5847货位）；供货方：甲方；备注：合同第9页\n四向穿梭车系统：车4台，充电8套。（表列数量：4台）；供货方：乙方\n货架运输：货架运输1项\n人员境外险：1项\n安装调试及培训：1项'};
 const original=JSON.stringify(item),r=summarizeProjectCore(item);
 assert.deepEqual(r.supplyScope,[{category:'货架',value:'5847 货位（甲方提供）'},{category:'四向车',value:'4 台'}]);
 assert.equal(JSON.stringify(item),original);assert(!JSON.stringify(r).includes('合同第9页'));
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
 assert.equal(r.supplyScope[0].value,'四向车4台');assert.equal(r.equipmentLoad[0].value,'1000 kg');assert.equal(r.transport,'海运');assert.equal(r.palletSize.length,1);
});
test('installation duties never become supply ownership and software component quantities stay distinct',()=>{
 const r=summarizeProjectCore({supplyScope:'电气控制系统：电控1套。（表列数量：1套）；供货方：乙方；备注：安装接线甲方负责\n软件系统：WMS（含PDA）1套；WCS1套；供货方：乙方'});
 assert.equal(r.supplyScope[0].value,'1 套');assert.equal(r.supplyScope[1].value,'WMS1套、WCS1套');
});
