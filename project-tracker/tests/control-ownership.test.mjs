import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workspaceSegmentMarkup} from '../tasks-ui/src/components/workspace-segment-markup.mjs';

test('native choice mounts escape user text and emit no duplicate legacy controls',()=>{
 const markup=workspaceSegmentMarkup({key:'media',label:'类别" onclick="bad',value:'<all>',items:[{value:'<all>',label:'作品 "A" & <img onerror="bad">'}]});
 assert.ok(markup.includes('data-ui-owner="rubber-segment"'));
 assert.ok(markup.includes('data-segment-value="&lt;all&gt;"'));
 assert.ok(markup.includes('&amp; &lt;img onerror='));
 const encoded=markup.match(/data-segment-items="([^"]*)"/)[1];
 const decoded=encoded.replace(/&(quot|amp|lt|gt|#39);/g,(_,name)=>({quot:'"',amp:'&',lt:'<',gt:'>',"#39":"'"}[name]));
 assert.equal(JSON.parse(decoded)[0].label,'作品 "A" & <img onerror="bad">');
 assert.doesNotMatch(markup,/<(?:button|input|select|img)\b|" onclick="/);
 assert.ok(workspaceSegmentMarkup({key:'pages',label:'页面',value:'home',items:[],disabled:true}).includes('data-segment-disabled="true"'));
});
test('retired application choice controls and search chrome cannot reappear beside their replacements',()=>{
 const page=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
 const media=readFileSync(new URL('../media-library.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../workspace.css',import.meta.url),'utf8');
 const shell=readFileSync(new URL('../tasks-ui/src/workspace-shell.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(page+media,/data-media-filter=|data-wardrobe-mode=|class="view-tabs"/);
 assert.doesNotMatch(css,/\.view-tabs\b|\.wb-search-trigger[^{}]*\b(?:span|kbd)\b/);
 assert.doesNotMatch(shell,/<kbd>|<span>搜索页面…<\/span>/);
});
