import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const retired=['workspace-design.css','modern-workspace.css','shadcn-workbench.css','liquid-glass.css','glass-material.css'];
test('retired override styles cannot return to the active build',()=>{
 const build=read('build-pages.mjs');
 for(const name of retired){assert.ok(!existsSync(new URL('../'+name,import.meta.url)),name+' must remain retired');assert.ok(!build.includes(name),name+' must not be embedded');}
 for(const name of ['index.html','workbench.html']){const source=read(name).replace(/<!-- PRODUCT_DESIGN_START -->[\s\S]*?<!-- PRODUCT_DESIGN_END -->/g,'');assert.doesNotMatch(source,/<style\b/i,'Business HTML cannot carry a second stylesheet');}
});
test('legacy root radius and skin cannot compete with canonical component metrics',()=>{
 for(const name of ['workspace.css','workbench-page.css','projects-page.css'])assert.doesNotMatch(read(name),/--radius\s*:/,name+' must not shadow upstream radius');
 assert.doesNotMatch(read('workspace.css'),/\.modern-work\b/,'Old workbench skin must not return');
 assert.match(read('tasks-ui/src/vendor/shadcn-glass-ui/input-glass.tsx'),/workspace-input/,'Stable field class must survive FormControl slot attributes');
});
