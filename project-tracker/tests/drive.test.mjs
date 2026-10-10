import test from 'node:test';
import assert from 'node:assert/strict';
import {validWorkspace} from '../worker.mjs';
test('Drive bookmarks accept Google HTTPS links and reject unsafe destinations and duplicate IDs',()=>{
 const workspace={tasks:[],notes:[],events:[],driveLinks:[{id:'drive1',title:'项目文件',description:'',url:'https://drive.google.com/drive/folders/example'}]};
 assert.equal(validWorkspace(workspace),true);
 for(const url of ['javascript:alert(1)','http://drive.google.com/file/d/a','https://drive.google.com.evil.test/a','https://user:pass@docs.google.com/document/d/a']){const next=structuredClone(workspace);next.driveLinks[0].url=url;assert.equal(validWorkspace(next),false);}
 const next=structuredClone(workspace);next.driveLinks.push(next.driveLinks[0]);assert.equal(validWorkspace(next),false);
});
