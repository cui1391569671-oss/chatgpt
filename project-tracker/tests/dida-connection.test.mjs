import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDidaConnection} from '../dida-connection.mjs';

test('Dida probe preserves its MCP session and lists only task-related schemas',async()=>{
 const methods=[];
 const result=await inspectDidaConnection('test-token',async(url,options)=>{
  assert.equal(url,'https://mcp.dida365.com');
  assert.equal(options.redirect,'manual');
  const {id,method}=JSON.parse(options.body);
  methods.push(method);
  if(method==='initialize')return Response.json({id,result:{protocolVersion:'2025-03-26'}},{headers:{'Mcp-Session-Id':'synthetic'}});
  assert.equal(options.headers.get('Mcp-Session-Id'),'synthetic');
  if(method==='notifications/initialized')return new Response(null,{status:202});
  const tools=[{name:'create_task',inputSchema:{type:'object'}},{name:'unrelated'}];
  return new Response('event: message\ndata: '+JSON.stringify({id,result:{tools}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 assert.deepEqual(methods,['initialize','notifications/initialized','tools/list']);
 assert.deepEqual(result,{configured:true,tools:[{name:'create_task',inputSchema:{type:'object'}}]});
});
