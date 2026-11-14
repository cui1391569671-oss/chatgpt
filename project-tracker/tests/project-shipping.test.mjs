import test from 'node:test';
import assert from 'node:assert/strict';
import {validProjectShipping,projectShippingRows} from '../project-shipping.mjs';
import {recordChanges,WORKSPACE_COLLECTIONS} from '../cloud-records.mjs';
import worker from './helpers/session-worker.mjs';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createDiscardGuard} from '../tasks-ui/src/discard-guard.mjs';
const row={id:'shipping-12',title:'测试项目',recipient:'张先生',address:'上海市测试路 1 号',contact:'+86 138 0000 0000 / 分机 12'};

function shippingEditor(){
 const editor={open:true,close(){this.open=false;}},fields={editor,recipient:{value:''},address:{value:''},contact:{value:''}},listeners=[];
 const context={kind:'projectShipping',busy:false,$:id=>fields[id],window:{WorkspacePrimitives:{createDiscardGuard:options=>createDiscardGuard({...options,confirm:()=>context.approve})},addEventListener:(type,handler)=>{if(type==='beforeunload')listeners.push(handler);}},approve:false};
 const module=readFileSync(new URL('../project-shipping-adapter.js',import.meta.url),'utf8');
 const api=runInNewContext(module+';({baseline:()=>{shippingBaseline=shippingFormSnapshot();},close:closeShippingEditor})',context);api.baseline();
 return {context,fields,api,unload(){let prevented=false;const event={preventDefault(){prevented=true;},returnValue:undefined};listeners.forEach(handler=>handler(event));return prevented;}};
}

test('native shipping unload protection follows dirty and saving state only while its editor is active',()=>{
 const h=shippingEditor();assert.equal(h.unload(),false);h.fields.address.value='合成收件地址';assert.equal(h.unload(),true);
 h.api.baseline();assert.equal(h.unload(),false);h.context.busy=true;assert.equal(h.unload(),true);
 h.context.kind='notes';assert.equal(h.unload(),false);h.context.kind='projectShipping';h.fields.editor.open=false;assert.equal(h.unload(),false);
});

test('native shipping cancel and busy dismissal retain the draft before an approved close',async()=>{
 const h=shippingEditor();h.fields.recipient.value='合成联系人';assert.equal(await h.api.close(),false);assert.equal(h.fields.editor.open,true);
 h.context.approve=true;h.context.busy=true;assert.equal(await h.api.close(),false);assert.equal(h.fields.editor.open,true);
 h.context.busy=false;assert.equal(await h.api.close(),true);assert.equal(h.fields.editor.open,false);
});
test('shipping validation bounds required fields without imposing a domestic-only phone format',()=>{
 assert(validProjectShipping([row]));assert(validProjectShipping([]));
 for(const [key,max] of [['title',300],['recipient',100],['address',1000],['contact',200]]){
  assert(!validProjectShipping([{...row,[key]:'  '}]));assert(!validProjectShipping([{...row,[key]:'a'.repeat(max+1)}]));
 }
 assert(!validProjectShipping([row,row]));assert(!validProjectShipping([{...row,id:'__proto__'}]));
});
test('sheet identity survives renumbering and renamed or removed projects retain shipping records',()=>{
 const items=[{sourceSheetId:12,projectCode:'P-02',projectName:'更新名称'},{sourceSheetId:13,projectCode:'P-03',projectName:'新项目'}];
 const rows=projectShippingRows(items,[row,{...row,id:'shipping-99',title:'历史项目'}]);
 const linked=rows.find(x=>x.id===row.id);assert.equal(linked.title,'更新名称');assert.equal(linked.recipient,row.recipient);assert.equal(linked.projectCode,'P-02');
 assert.equal(rows.find(x=>x.id==='shipping-99').linked,false);assert.equal(rows.length,4);
});
function setup(){let payload={data:[],archive:[],priorities:{},projects:[],workWorkspace:{tasks:[],notes:[],events:[]},workspace:{tasks:[],notes:[],events:[]},workspaceVersions:{work:1,personal:1}},version=1;
 return {TRACKER_USER:'u',TRACKER_PASSWORD:'p',DB:{prepare(){let args;return {bind(...a){args=a;return this;},async first(){return {payload:JSON.stringify(payload),version};},async run(){if(args[1]!==version)return {meta:{changes:0}};payload=JSON.parse(args[0]);version++;return {meta:{changes:1}};}};}}};}
const request=(path,operations)=>new Request('https://test.local'+path,{method:operations?'POST':'GET',headers:{Authorization:'Basic '+btoa('u:p'),Origin:'https://test.local','Content-Type':'application/json'},...(operations?{body:JSON.stringify({operations})}:{})});
test('shipping patch persists, retries idempotently, rejects stale same-field writes, and remains work-only',async()=>{
 const env=setup(),path='/api/workspace/patch?scope=work',blank={tasks:[],notes:[],events:[]};
 const ops=recordChanges(blank,{...blank,projectShipping:[row]},WORKSPACE_COLLECTIONS);
 for(let i=0;i<2;i++)assert.equal((await worker.fetch(request(path,ops),env)).status,200);
 const saved=await (await worker.fetch(request('/api/workspace?scope=work'),env)).json();assert.deepEqual(saved.workspace.projectShipping,[row]);
 const next=structuredClone(saved.workspace);next.projectShipping[0].contact='新联系方式';
 assert.equal((await worker.fetch(request(path,recordChanges(saved.workspace,next,WORKSPACE_COLLECTIONS)),env)).status,200);
 const stale=structuredClone(saved.workspace);stale.projectShipping[0].contact='过期修改';
 assert.equal((await worker.fetch(request(path,recordChanges(saved.workspace,stale,WORKSPACE_COLLECTIONS)),env)).status,409);
 assert.equal((await worker.fetch(request('/api/workspace/patch?scope=personal',ops),env)).status,400);
 const personal=await (await worker.fetch(request('/api/workspace?scope=personal'),env)).json();assert.equal(personal.workspace.projectShipping,undefined);
 const invalid=[{collection:'projectShipping',id:'shipping-3',action:'create',record:{...row,id:'shipping-3',recipient:''}}];
 assert.equal((await worker.fetch(request(path,invalid),env)).status,400);
 assert.equal((await worker.fetch(new Request('https://test.local/api/workspace?scope=work'),env)).status,401);
});

test('company receiving details stay first and persist independently of project/source changes',async()=>{
 const company={...row,id:'shipping-company',title:'我公司收件信息',recipient:'公司演示收件人'};
 assert(validProjectShipping([company,row]));assert(!validProjectShipping([company,company]));
 const blankRows=projectShippingRows([],[]);assert.equal(blankRows.length,1);assert.equal(blankRows[0].id,company.id);
 const source=[{sourceSheetId:12,projectCode:'P-02',projectName:'更新项目名'}];
 const displayed=projectShippingRows(source,[row,company]);assert.equal(displayed[0].id,company.id);assert.equal(displayed[0].recipient,company.recipient);assert.equal(displayed[0].linked,true);assert.equal(displayed[1].title,'更新项目名');
 const env=setup(),blank={tasks:[],notes:[],events:[]},next={...blank,projectShipping:[company,row]};
 assert.equal((await worker.fetch(request('/api/workspace/patch?scope=work',recordChanges(blank,next,WORKSPACE_COLLECTIONS)),env)).status,200);
 const changed=structuredClone(next);changed.projectShipping[0].address='更新后的公司演示地址';
 assert.equal((await worker.fetch(request('/api/workspace/patch?scope=work',recordChanges(next,changed,WORKSPACE_COLLECTIONS)),env)).status,200);
 const saved=await(await worker.fetch(request('/api/workspace?scope=work'),env)).json();assert.equal(saved.workspace.projectShipping.find(x=>x.id===company.id).address,'更新后的公司演示地址');assert.deepEqual(saved.workspace.projectShipping.find(x=>x.id===row.id),row);
 assert.equal((await worker.fetch(request('/api/workspace/patch?scope=personal',recordChanges(blank,next,WORKSPACE_COLLECTIONS)),env)).status,400);
});
