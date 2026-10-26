import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLabel,projectNameOnly,displayProject,loadProjectLabels} from '../project-labels.mjs';
const items=[{projectCode:'PM001',projectName:'台湾相洋项目',sourceSheet:'PM001 台湾相洋项目',aliases:['P001 台湾桃园项目']},{projectCode:'PM006',projectName:'意大利 Pierrel 项目',aliases:['P006 意大利pirrel项目']}];
test('labels use the information-sheet code only for an exact name or verified alias',()=>{
 assert.equal(projectLabel('P001 台湾桃园项目',items),'PM001 台湾桃园项目');
 assert.equal(projectLabel('PM001 台湾相洋项目',items),'PM001 台湾相洋项目');
 assert.equal(projectLabel('P006 意大利pirrel项目',items),'PM006 意大利pirrel项目');
 assert.equal(projectLabel('P011 意大利LOGVIA-SPA项目',items),'P011 意大利LOGVIA-SPA项目');
 assert.equal(projectLabel('P007 杭州中策项目',items),'P007 杭州中策项目');
 assert.equal(projectLabel('台湾相洋项目',items),'PM001 台湾相洋项目');
 assert.equal(projectLabel('P001 其他项目',items),'P001 其他项目');
});
test('ambiguous mappings and unavailable source never invent codes',()=>{
 assert.equal(projectLabel('P001 台湾桃园项目'),'P001 台湾桃园项目');
 assert.equal(projectLabel('P001 台湾桃园项目',[...items,{projectCode:'PM099',projectName:'台湾桃园项目'}]),'P001 台湾桃园项目');
 assert.equal(projectNameOnly('PM001 台湾相洋项目'),'台湾相洋项目');
 assert.equal(projectNameOnly('项目P001备用'),'项目P001备用');
});

test('fallback retains existing identifiers without inventing a new mapping',()=>{
 assert.equal(projectLabel('  PM012 未同步项目  '),'PM012 未同步项目');
 assert.equal(projectLabel('P 013：未同步项目'),'P 013：未同步项目');
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
 assert.equal(displayProject('P001 台湾桃园项目'),'P001 台湾桃园项目');
});
