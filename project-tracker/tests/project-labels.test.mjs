import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLabel,projectNameOnly} from '../project-labels.mjs';
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
