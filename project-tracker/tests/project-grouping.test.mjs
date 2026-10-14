import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const render=html.slice(html.indexOf('function renderTable(){'),html.indexOf('function openIssueDetails('));
function node(){const element={children:[],dataset:{},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(){}};element.classList={add(value){element.className+=' '+value;}};return element;}
function table(items){const tbody=node();const context=vm.createContext({document:{getElementById:()=>tbody,createElement:node},getFilteredData:()=>items,quickIssueFilter:'all',ready:true,getOverdueDays:()=>0,getPriority:()=>'',getPriorityInfo:()=>({label:'未设置',cls:''}),handleCheckboxChange(){},Date});vm.runInContext(render,context);context.renderTable();return tbody.children;}
const item=(id,project,status,done=false)=>({id,project,task:id,status,done,plannedDate:'',_idx:Number(id.slice(1))});
test('interleaved projects stay together even when their issue statuses differ',()=>{
 const rows=table([item('i1','P10 后续项目','进行中'),item('i2','P2 当前项目','暂停'),item('i3','P10 后续项目','进行中',true),item('i4','P2 当前项目','进行中')]);
 const merged=rows.flatMap(x=>x.children).filter(x=>x.className==='issue-project-name project-merged');assert.deepEqual(merged.map(x=>x.textContent),['P2 当前项目','P10 后续项目']);assert.deepEqual(merged.map(x=>x.rowSpan),[2,2]);assert.deepEqual(merged.map(x=>x.children[0].textContent),['2 项问题','2 项问题']);
 const issues=rows.filter(x=>x.className.includes('compact-issue'));
 assert.equal(issues.length,4);assert.deepEqual(issues.map(x=>x.children.length),[6,5,6,5]);
 assert.deepEqual(issues.map(x=>x.children[x.children.length===6?2:1].children[0].textContent),['暂停','进行中','进行中','已完成']);
 assert.deepEqual(issues.map(x=>x.children.at(-1).children[0].dataset.idx),[2,4,1,3]);
});
test('project group counts use visible records and no-result state has no empty groups',()=>{
 const rows=table([item('i2','P2 当前项目','暂停')]);assert.equal(rows[0].children[1].textContent,'P2 当前项目');assert.equal(rows[0].children[1].rowSpan,1);assert.equal(rows[0].children[1].children[0].textContent,'1 项问题');
 const empty=table([]);assert.equal(empty.length,1);assert.equal(empty[0].children[0].className,'issue-empty');
});
