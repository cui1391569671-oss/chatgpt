import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterWorkspaceHelp,workspaceHelpTopics} from '../tasks-ui/src/workspace-help-content.mjs';
import {workspaceNavigation,workspacePageMeta} from '../tasks-ui/src/workspace-page-meta.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('central help covers every current work and private page, account and supported aliases',()=>{
 assert.equal(new Set(workspaceHelpTopics.map(topic=>topic.id)).size,workspaceHelpTopics.length);
 for(const scope of ['work','personal']){
  const views=[...workspaceNavigation(scope).flatMap(group=>group.views),'personalInfo',...(scope==='personal'?['vocabularyLibrary']:[])];
  for(const view of views)assert(workspaceHelpTopics.some(topic=>topic.scopes.includes(scope)&&topic.views.includes(view)),scope+':'+view);
  assert.equal(workspacePageMeta(scope,'help').label,'帮助');
 }
 for(const topic of workspaceHelpTopics){assert(topic.sections.length);assert(topic.sections.every(section=>section.title&&section.items.length&&section.items.every(item=>typeof item==='string'&&item.trim())));}
});
test('help search matches operations across headings, Chinese text, shortcuts and categories',()=>{
 assert(filterWorkspaceHelp('摄影 上传').some(topic=>topic.id==='personal:photography'));
 assert(filterWorkspaceHelp('enter').some(topic=>topic.id==='personal:vocabulary'));
 assert(filterWorkspaceHelp('Ｅｎｔｅｒ').some(topic=>topic.id==='personal:vocabulary'));
 assert(filterWorkspaceHelp('５分钟').some(topic=>topic.id==='account'));
 assert.equal(filterWorkspaceHelp('this-will-not-match-help').length,0);
 assert(filterWorkspaceHelp('','work').every(topic=>topic.category==='work'));
 assert.equal(filterWorkspaceHelp('摄影','work').length,0);
 assert(filterWorkspaceHelp('原图').some(topic=>topic.id==='personal:photography'));
});
test('account menu and both route allowlists expose help through existing navigation and leave guards',()=>{
 const shell=source('tasks-ui/src/workspace-shell.tsx'),page=source('workbench.html');
 assert.match(shell,/queueAccountAction\(\(\)=>bridge.navigate\('help'\)\)/);
 assert.match(shell,/aria-current=\{snapshot.view==='help'/);
 assert.match(shell,/bridge.canLeave\(\)===false/);
 const routes=page.match(/const allowedViews=scope==='work'\?\[([^\]]+)\]:\[([^\]]+)\]/);assert(routes);
 assert(routes[1].includes("'help'"));assert(routes[2].includes("'help'"));
 assert.match(page,/if\(view==='help'\)\{renderHelp\(\);return;\}disposeHelp\(\)/);
});
test('operation tutorials move to the catalog while safety, live status and attribution stay in place',()=>{
 for(const path of ['tasks-ui/src/annual-plans.tsx','tasks-ui/src/word-practice.tsx','tasks-ui/src/workspace-personal.tsx','tasks-ui/src/photography.tsx','calendar-ui/src/main.jsx'])assert.doesNotMatch(source(path),/<WorkspaceHelp\b|className="workspace-help"/);
 const page=source('workbench.html');assert.doesNotMatch(page,/helpDisclosure\(|vocabularySyncHelp|<summary>预览帮助|<summary>提醒范围/);
 assert.match(page,/This product uses the TMDB API/);assert.match(source('tasks-ui/src/personal-info.tsx'),/闲置5分钟会锁定并清除未保存内容/);
 assert.match(source('tasks-ui/src/word-practice.tsx'),/missingTranslations>0/);assert.match(source('tasks-ui/src/photography.tsx'),/仅保存压缩浏览版，请保留原片/);
 assert.match(source('tasks-ui/src/workspace-help.tsx'),/WorkspaceSearch/);assert.match(source('tasks-ui/src/workspace-help.tsx'),/WorkspaceSelect/);assert.doesNotMatch(source('tasks-ui/src/workspace-help.tsx'),/dangerouslySetInnerHTML/);
});
