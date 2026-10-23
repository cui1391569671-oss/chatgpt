import test from 'node:test';import assert from 'node:assert/strict';
import worker from './helpers/session-worker.mjs';
import {cspReportRoute,summarizeCspReports} from '../security-policy.mjs';
test('malformed CSP report values are rejected without logging or throwing',async()=>{
 for(const input of [null,{},[null],{'csp-report':[]},{body:'invalid'},{body:{effectiveDirective:{}}}]){
  assert.deepEqual(summarizeCspReports(input),[]);
  const response=await cspReportRoute(new Request('https://test.local/api/security/csp-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),()=>assert.fail('invalid report logged'));
  assert.equal(response.status,400);
 }
});
test('workspace policy is report-only and leaves the enforced login policy intact',async()=>{
 const env={TRACKER_USER:'u',TRACKER_PASSWORD:'p'};
 const page=await worker.fetch(new Request('https://test.local/work',{headers:{Authorization:'Basic '+btoa('u:p')}}),env);
 assert.equal(page.status,200);assert.match(page.headers.get('Content-Security-Policy-Report-Only'),/report-uri \/api\/security\/csp-report/);assert.equal(page.headers.get('Content-Security-Policy'),null);
 const login=await worker.fetch(new Request('https://test.local/login'),env);assert.match(login.headers.get('Content-Security-Policy'),/default-src 'none'/);
 assert.equal((await worker.fetch(new Request('https://test.local/api/security/csp-report',{method:'POST',body:'{}'}),env)).status,401);
});
test('CSP reports drop document URLs, source paths, tokens and samples before logging',async()=>{
 const input={'csp-report':{'document-uri':'https://test.local/?secret=abc','effective-directive':'img-src','blocked-uri':'https://cdn.example/private/user.jpg?token=secret','script-sample':'sensitive','source-file':'/secret-path.js'}};
 const reports=summarizeCspReports(input);assert.deepEqual(reports,[{directive:'img-src',blockedOrigin:'https://cdn.example',disposition:'report'}]);
 const logged=[];const response=await cspReportRoute(new Request('https://test.local/api/security/csp-report',{method:'POST',headers:{'Content-Type':'application/csp-report'},body:JSON.stringify(input)}),(...args)=>logged.push(args));assert.equal(response.status,204);assert.doesNotMatch(JSON.stringify(logged),/secret|private|user.jpg|sensitive/);
});
test('CSP report route rejects unsupported methods, types and oversized chunked bodies',async()=>{
 const url='https://test.local/api/security/csp-report',logger=()=>assert.fail('rejected report logged');
 assert.equal((await cspReportRoute(new Request(url),logger)).status,405);
 assert.equal((await cspReportRoute(new Request(url,{method:'POST',body:'{}'}),logger)).status,415);
 const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(9000));controller.enqueue(new Uint8Array(9000));controller.close();}});
 assert.equal((await cspReportRoute(new Request(url,{method:'POST',duplex:'half',headers:{'Content-Type':'application/csp-report'},body}),logger)).status,413);
});
