import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {compareProjectLabels,projectNameOnly,projectLabel} from '../project-labels.mjs';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const render=html.slice(html.indexOf('const collapsedIssueProjects='),html.indexOf('const issueFields='));
function node(){const element={children:[],dataset:{},textContent:'',open:false,append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(key,value){this[key]=value;},closest(){return null;},focus(){}};element.classList={add(value){element.className+=' '+value;}};return element;}
function table(items,{names=[],all=items}={}){const tbody=node(),summary=node();const context=vm.createContext({Set,issueEditingId:null,projectNameOnly,compareProjectLabels,document:{getElementById:id=>id==='tableBody'?tbody:id==='issueTableSummary'?summary:node(),createElement:node,querySelectorAll:()=>[]},displayProject:value=>projectLabel(value),data:all,projectNames:()=>names,getProjectRows:()=>items,ready:true,getOverdueDays:date=>date==='2026-01-01'?2:null,getPriority:()=>'',getPriorityInfo:()=>({label:'普通优先级',cls:''}),handleCheckboxChange(){},showPriorityDropdown(){},Date});vm.runInContext(render,context);context.renderTable();return {rows:tbody.children,context,tbody,summary};}
const item=(id,project,status,done=false)=>({id,project,task:id,status,done,plannedDate:'',_idx:Number(id.slice(1))});
test('project headers group interleaved records in displayed-label order without repeating priority',()=>{
 const {rows,summary}=table([item('i1','PM010 后续项目','进行中'),item('i2','PM002 当前项目','暂停'),item('i3','PM010 后续项目','进行中',true),item('i4','PM002 当前项目','进行中')]);
 const headers=rows.filter(row=>row.className==='issue-project-group');assert.equal(headers.length,2);
 assert.deepEqual(headers.map(row=>row.children[0].children[0].children[0].children[0].textContent),['后续项目','当前项目'].sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true})));
 const issues=rows.filter(row=>row.className==='compact-issue');assert.equal(issues.length,4);assert.ok(issues.every(row=>row.children.length===4));
 assert.equal(summary.textContent,'2 个项目 · 4 项问题');
 assert.equal(headers[0].children[0].children[0].children[2].textContent,'2 项问题');
});
test('collapsing a project only affects presentation and retains its count and records',()=>{
 const data=[item('i1','示例项目','进行中')],view=table(data);const toggle=view.rows[0].children[0].children[0].children[0];toggle.onclick();
 assert.equal(view.tbody.children.length,1);assert.equal(data.length,1);assert.equal(view.summary.textContent,'1 个项目 · 1 项问题');
 view.tbody.children[0].children[0].children[0].children[0].onclick();assert.equal(view.tbody.children.length,2);
});
test('a project originally without issues retains its create entry, while completed groups stay out',()=>{
 const empty=table([],{names:['空项目']});assert.equal(empty.rows.length,2);assert.equal(empty.rows[1].children[0].colSpan,4);assert.equal(empty.rows[1].children[0].children[1].textContent,'添加问题');
 const active=item('i1','有问题项目','暂停'),view=table([],{names:['有问题项目','空项目'],all:[active]});assert.equal(view.rows.length,2);assert.equal(view.rows[0].children[0].children[0].children[0].children[0].textContent,'空项目');
 assert.equal(table([]).rows[0].children[0].className,'issue-empty');
});
test('notes are safe previews under issue names, and completion retains original stable indices',()=>{
 const {rows}=table([{...item('i3','示例项目','进行中'),note:'<script>\n等待物流单号',plannedDate:'2026-01-01'}]);const row=rows[1];
 assert.equal(row.children[1].children[1].textContent,'<script>\n等待物流单号');assert.equal(row.children[1].children[1].type,'button');
 assert.equal(row.children[0].children[0].dataset.idx,3);assert.equal(row.children[3].textContent,'已逾期 2 天');
});
test('saved completions leave the active list while pending completions keep their stable indices',()=>{
 const saved=item('i1','项目一','已完成',true),pending=item('i2','项目一','已完成',true),open=item('i3','项目二','进行中');
 const c=vm.createContext({data:[saved,pending,open],cloudBase:{data:[saved,{...pending,done:false},open]}});
 vm.runInContext(html.slice(html.indexOf('function getProjectRows(){'),html.indexOf('let issueEditingId=')),c);
 assert.deepEqual(Array.from(c.getProjectRows(),row=>[row.id,row._idx]),[['i2',1],['i3',2]]);c.cloudBase.data[1]={...pending};assert.deepEqual(Array.from(c.getProjectRows(),row=>row.id),['i3']);assert.equal(c.data.length,3);
});
