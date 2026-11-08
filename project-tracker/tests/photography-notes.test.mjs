import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validWorkspace} from './helpers/session-worker.mjs';
import {recordChanges,applyRecordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
import {workspaceSiteNavigation,workspacePageMeta} from '../tasks-ui/src/workspace-page-meta.mjs';
const oldNote={id:'old',title:'私人旧笔记',body:'旧正文',updatedAt:'2026-11-01T00:00:00Z'};
const photoNote={id:'photo',title:'<构图练习>',body:'光线\n<script>test</script>',updatedAt:'2026-11-08T00:00:00Z',notebook:'photography'};
const workspace=notes=>({tasks:[],notes,events:[]});
test('photography notebook is private, validates an optional marker and preserves legacy notes in record patches',()=>{
 assert.equal(workspacePageMeta('personal','photographyNotes').label,'摄影笔记');
 assert(workspaceSiteNavigation('personal').find(group=>group.title==='摄影').items.some(([,view])=>view==='photographyNotes'));
 assert(!workspaceSiteNavigation('work').some(group=>group.items.some(([,view])=>view==='photographyNotes')));
 assert(validWorkspace(workspace([oldNote,photoNote])));
 for(const notebook of [null,0,'other',{}])assert.equal(validWorkspace(workspace([{...photoNote,notebook}])),false);
 const before=workspace([oldNote]),next=workspace([oldNote,photoNote]);
 const operations=recordChanges(before,next,WORKSPACE_COLLECTIONS);
 const cloud=workspace([{...oldNote,body:'另一台电脑的修改'}]);
 const saved=applyRecordChanges(cloud,operations,WORKSPACE_COLLECTIONS);
 assert.equal(saved.notes[0].body,'另一台电脑的修改');assert.deepEqual(saved.notes[1],photoNote);
 assert.deepEqual(applyRecordChanges(saved,operations,WORKSPACE_COLLECTIONS),saved);
});
test('shared notebook reader separates photography and general records while escaping text and keeping search',()=>{
 const page=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
 const renderer=page.slice(page.indexOf('function noteDate('),page.indexOf('let projectCalendar='));
 const results={innerHTML:''};
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context=vm.createContext({view:'photographyNotes',query:'',state:workspace([oldNote,photoNote]),readingNoteId:null,esc:escape,controls:()=>'',document:{},$:id=>id==='content'?{querySelector:()=>null}:id==='results'?results:null});
 vm.runInContext(renderer,context);vm.runInContext('renderResults()',context);
 assert.match(results.innerHTML,/&lt;构图练习&gt;/);assert.match(results.innerHTML,/&lt;script&gt;/);assert(!results.innerHTML.includes('私人旧笔记'));
 context.view='notes';vm.runInContext('renderResults()',context);
 assert.match(results.innerHTML,/私人旧笔记/);assert(!results.innerHTML.includes('构图练习'));
 context.view='photographyNotes';context.query='no-match';vm.runInContext('renderResults()',context);
 assert.match(results.innerHTML,/没有符合条件的笔记/);assert(!results.innerHTML.includes('data-read-note='));
});

test('photography note titles accept blank input, use the first non-empty body line and bound generated titles',()=>{
 const page=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
 const helper=page.slice(page.indexOf('function photographyNoteTitle('),page.indexOf('function noteDate('));
 const context=vm.createContext({});vm.runInContext(helper,context);
 assert.equal(context.photographyNoteTitle(' 手动标题 ','正文首行'),'手动标题');
 assert.equal(context.photographyNoteTitle('','\n  光线与构图  \n拍摄参数'),'光线与构图');
 assert.equal(context.photographyNoteTitle('  ','\n  '),'未命名摄影笔记');
 assert.equal(context.photographyNoteTitle('', '光'.repeat(250)).length,200);
});
