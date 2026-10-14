import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../workbench.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('async function loadExpenseProjects'),html.indexOf('function edit(type,id)'));
function setup(payload,current='',ok=true){
 const select={innerHTML:'',value:'',disabled:false},error={textContent:''};
 const context=vm.createContext({$:id=>id==='project'?select:id==='editor'?{open:true}:error,esc:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'),fetch:async()=>({ok,json:async()=>payload})});
 vm.runInContext(source,context);return {select,error,run:()=>context.loadExpenseProjects(current)};
}
test('expense project selector includes empty and archived projects, deduplicates, sorts and escapes names',async()=>{
 const x=setup({projects:['P10 空项目','P2 项目','P3 <项目>'],data:[{project:'P2 项目'}],archive:[{project:'P1 归档'}]});await x.run();assert.equal(x.select.disabled,false);assert.equal((x.select.innerHTML.match(/value="P2 项目"/g)||[]).length,1);assert.ok(x.select.innerHTML.indexOf('P2 项目')<x.select.innerHTML.indexOf('P10 空项目'));assert.match(x.select.innerHTML,/P1 归档/);assert.match(x.select.innerHTML,/P3 &lt;项目&gt;/);assert.equal(x.select.value,'');
});
test('editing preserves the existing project and failed loads retain existing values',async()=>{
 for(const ok of [true,false]){const x=setup({projects:[]},'原项目',ok);await x.run();assert.equal(x.select.value,'原项目');assert.equal(x.select.disabled,false);assert.match(x.select.innerHTML,/原项目/);}
});
test('empty and failed project loads block creating expenses without a project',async()=>{
 for(const ok of [true,false]){const x=setup({projects:[]},'',ok);await x.run();assert.equal(x.select.disabled,true);assert.equal(x.select.value,'');}
});
