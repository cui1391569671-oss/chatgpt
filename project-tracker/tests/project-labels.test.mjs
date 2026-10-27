import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLabel,projectNameOnly,displayProject,loadProjectLabels,compareProjectLabels} from '../project-labels.mjs';
const items=[{projectCode:'PM001',projectName:'台湾相洋项目',sourceSheet:'PM001 台湾相洋项目',aliases:['P001 台湾桃园项目']},{projectCode:'PM006',projectName:'意大利 Pierrel 项目',aliases:['P006 意大利pirrel项目']}];
test('labels use the information-sheet code only for an exact name or verified alias',()=>{
 assert.equal(projectLabel('P001 台湾桃园项目',items),'PM001 台湾桃园项目');
 assert.equal(projectLabel('PM001 台湾相洋项目',items),'PM001 台湾相洋项目');
 assert.equal(projectLabel('P006 意大利pirrel项目',items),'PM006 意大利pirrel项目');
 assert.equal(projectLabel('P011 意大利LOGVIA-SPA项目',items),'意大利LOGVIA-SPA项目');
 assert.equal(projectLabel('P007 杭州中策项目',items),'杭州中策项目');
 assert.equal(projectLabel('台湾相洋项目',items),'PM001 台湾相洋项目');
 assert.equal(projectLabel('P001 其他项目',items),'其他项目');
});
test('ambiguous mappings and unavailable source never invent codes',()=>{
 assert.equal(projectLabel('P001 台湾桃园项目'),'台湾桃园项目');
 assert.equal(projectLabel('P001 台湾桃园项目',[...items,{projectCode:'PM099',projectName:'台湾桃园项目'}]),'台湾桃园项目');
 assert.equal(projectNameOnly('PM001 台湾相洋项目'),'台湾相洋项目');
 assert.equal(projectNameOnly('项目P001备用'),'项目P001备用');
});

test('unmatched or ambiguous names do not display unverified legacy identifiers',()=>{
 assert.equal(projectLabel('  PM012 未同步项目  '),'未同步项目');
 assert.equal(projectLabel('P 013：未同步项目'),'未同步项目');
 assert.equal(projectLabel('没有编号的项目'),'没有编号的项目');
 assert.equal(projectLabel('台湾相洋项目',[...items,{projectCode:'PM099',projectName:'台湾相洋项目'}]),'台湾相洋项目');
});
test('failed or malformed label refresh retains the last successful mapping',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({items}));
 await loadProjectLabels();
 assert.equal(displayProject('P001 台湾桃园项目'),'PM001 台湾桃园项目');
 for(const response of [()=>Response.json({error:'unavailable'},{status:503}),()=>Response.json({}),()=>Response.json({items:[null]}),()=>Response.json({items:[{projectName:'台湾相洋项目'}]}),()=>Response.json({items:[{projectCode:'PM001',projectName:'台湾相洋项目',aliases:{}}]})]){
  globalThis.fetch=async()=>response();await loadProjectLabels();assert.equal(displayProject('P001 台湾桃园项目'),'PM001 台湾桃园项目');
 }
 globalThis.fetch=async()=>{throw Error('offline');};await loadProjectLabels();
 assert.equal(displayProject('P001 台湾桃园项目'),'PM001 台湾桃园项目');
 globalThis.fetch=async()=>Response.json({items:[{projectCode:'PM002',projectName:'台湾相洋项目',aliases:['台湾桃园项目']}]});await loadProjectLabels();
 assert.equal(displayProject('P001 台湾桃园项目'),'PM002 台湾桃园项目');
 globalThis.fetch=async()=>Response.json({items:[]});await loadProjectLabels();
 assert.equal(displayProject('P001 台湾桃园项目'),'台湾桃园项目');
});

test('confirmed unmatched projects show names until the information sheet assigns a code',()=>{
 for(const [legacy,name] of [['P007｜杭州中策项目','杭州中策项目'],['P008｜四川达州项目','四川达州项目']]){
  assert.equal(projectLabel(legacy),name);
  assert.equal(projectLabel(legacy,[{projectCode:'PM007',projectName:'哈萨克斯坦项目'},{projectCode:'PM008',projectName:'意大利Pozzuoli Euromed项目'}]),name);
  assert.equal(projectLabel(legacy,[{projectCode:'PM021',projectName:name}]),'PM021 '+name);
 }
 assert.equal(projectLabel('P099｜未核实项目'), '未核实项目');
});
test('verified aliases resolve current information-sheet codes without relying on the old number',()=>{
 const pairs=[['台湾桃园项目','台湾相洋项目'],['北起泰国项目','北起旭创泰国四向车立库项目'],['韩国三星项目','韩国 Altiall Samsung Gwangju 四向车项目'],['林德马来西亚项目','林德马来西亚CEL四向车项目'],['林德香港项目','林德香港邦泰流浮山六向车立体库项目'],['意大利 pirrel 项目','意大利 Logivia Pierrel Capua 医药四向车项目']];
 for(const [legacy,canonical] of pairs){
  const source=[{projectCode:'PM123',projectName:canonical}];
  assert.equal(projectLabel('P099｜'+legacy,source),'PM123 '+legacy);
  assert.equal(projectLabel('P099｜'+legacy,[...source,{projectCode:'PM124',projectName:canonical}]),legacy);
 }
 assert.equal(projectNameOnly(' PM001｜台湾相洋项目 '),'台湾相洋项目');
 assert.equal(projectNameOnly('PM001|台湾相洋项目'),'台湾相洋项目');
});
test('label refresh reports only label changes and preserves a valid mapping on failure',async t=>{
 let payload={items:[{projectCode:'PM041',projectName:'同名测试项目',efficiency:'a'}]};
 t.mock.method(globalThis,'fetch',async()=>Response.json(payload));
 assert.equal(await loadProjectLabels(),true);
 assert.equal(await loadProjectLabels(),false);
 payload.items[0].efficiency='b';assert.equal(await loadProjectLabels(),false);
 payload.items[0].projectCode='PM042';assert.equal(await loadProjectLabels(),true);
 assert.equal(displayProject('P001 同名测试项目'),'PM042 同名测试项目');
 globalThis.fetch=async()=>Response.json({}, {status:503});assert.equal(await loadProjectLabels(),false);
 assert.equal(displayProject('P001 同名测试项目'),'PM042 同名测试项目');
});

test('numbered projects precede unnumbered ones using visible codes and natural ordering',()=>{
 const names=['P007｜杭州中策项目','P009｜哈萨克斯坦项目','P008｜四川达州项目','P010 未建档项目','P002 测试项目'];
 const source=[{projectCode:'PM007',projectName:'哈萨克斯坦项目'}];
 const sorted=[...names].sort((a,b)=>compareProjectLabels(a,b,source));
 assert.deepEqual(sorted,['P009｜哈萨克斯坦项目','P002 测试项目','P007｜杭州中策项目','P008｜四川达州项目','P010 未建档项目']);
 assert.deepEqual(names,['P007｜杭州中策项目','P009｜哈萨克斯坦项目','P008｜四川达州项目','P010 未建档项目','P002 测试项目']);
});
test('project sort follows the current source code rather than a stored legacy number',()=>{
 const names=['P099 乙项目','P001 甲项目','无编号项目'];
 const source=[{projectCode:'PM2',projectName:'乙项目'},{projectCode:'PM10',projectName:'甲项目'}];
 assert.deepEqual([...names].sort((a,b)=>compareProjectLabels(a,b,source)),['P099 乙项目','P001 甲项目','无编号项目']);
 assert.equal(compareProjectLabels('相同项目','相同项目',source),0);
});
