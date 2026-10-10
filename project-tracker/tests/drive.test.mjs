import test from 'node:test';
import assert from 'node:assert/strict';
import {validWorkspace} from '../worker.mjs';
test('Drive bookmarks accept Google HTTPS links and reject unsafe destinations and duplicate IDs',()=>{
 const workspace={tasks:[],notes:[],events:[],driveLinks:[{id:'drive1',title:'项目文件',description:'',url:'https://drive.google.com/drive/folders/example'}]};
 assert.equal(validWorkspace(workspace),true);
 for(const url of ['javascript:alert(1)','http://drive.google.com/file/d/a','https://drive.google.com.evil.test/a','https://user:pass@docs.google.com/document/d/a']){const next=structuredClone(workspace);next.driveLinks[0].url=url;assert.equal(validWorkspace(next),false);}
 const next=structuredClone(workspace);next.driveLinks.push(next.driveLinks[0]);assert.equal(validWorkspace(next),false);
});

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const preview=vm.runInNewContext(html.slice(html.indexOf('function validDriveUrl('),html.indexOf('function drivePage('))+html.slice(html.indexOf('function sheetPreviewUrl('),html.indexOf('function previewSheet('))+';sheetPreviewUrl',{URL,URLSearchParams});
test('sheet previews preserve tabs, support published sheets, and reject non-sheet or foreign links',()=>{
 assert.equal(preview('https://docs.google.com/spreadsheets/d/abc_123/edit#gid=42'),'https://docs.google.com/spreadsheets/d/abc_123/preview?gid=42');
 assert.equal(preview('https://docs.google.com/spreadsheets/d/e/pub_id/pubhtml?gid=9'),'https://docs.google.com/spreadsheets/d/e/pub_id/pubhtml?widget=true&gid=9');
 for(const url of ['https://drive.google.com/drive/folders/abc','https://docs.google.com/document/d/abc/edit','https://docs.google.com.evil.test/spreadsheets/d/abc/edit'])assert.equal(preview(url),null);
});
