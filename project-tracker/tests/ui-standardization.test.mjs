import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localDateStamp,dateGrid,dateAllowed,beijingDate} from '../tasks-ui/src/components/date-model.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('authored date calendar handles leap day and Monday-first month boundaries',()=>{
 const grid=dateGrid(new Date(2024,1,1,12));assert.equal(grid.length,42);assert.equal(grid[0].getDay(),1);assert.ok(grid.some(d=>localDateStamp(d)==='2024-02-29'));assert.equal(new Set(grid.map(localDateStamp)).size,42);
 assert.equal(localDateStamp(dateGrid(new Date(2026,10,1,12))[0]),'2026-10-26');
});
test('date constraints retain inclusive min/max and Beijing day rollover',()=>{
 assert.equal(dateAllowed('2026-10-16','2026-10-16','2026-10-20'),true);assert.equal(dateAllowed('2026-10-20','2026-10-16','2026-10-20'),true);assert.equal(dateAllowed('2026-02-30'),false);assert.equal(dateAllowed('2026-10-15','2026-10-16','2026-10-20'),false);assert.equal(dateAllowed('2026-10-21','2026-10-16','2026-10-20'),false);assert.equal(beijingDate(new Date('2026-10-15T16:30:00Z')),'2026-10-16');
});
test('maintained UI styles have no independent literal palette',()=>{
 for(const file of ['workspace.css','workbench-page.css','projects-page.css','tasks-ui/src/style.css','calendar-ui/src/style.css'])assert.doesNotMatch(read(file),/(?:^|[;{])\s*[-\w]+\s*:[^;{}]*#[0-9a-f]{3,8}\b/im,file+' cannot add an independent color');
});
test('project actions use app-owned confirmation and retain the add modal identifier',()=>{
 const html=read('index.html').replace(/<!-- PRODUCT_DESIGN_START -->[\s\S]*?<!-- PRODUCT_DESIGN_END -->/g,'');assert.doesNotMatch(html,/(?<![\w.])(?:alert|confirm|prompt)\(/);assert.match(html,/<dialog id="addModal"/);assert.match(html,/getElementById\('modalTitle'\)/);assert.doesNotMatch(html,/querySelector\('\.modal h3'\)/);
});
