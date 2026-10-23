// Synthetic browser verification only. Never point this proxy at a real-data preview.
// node scripts/browser-fault-proxy.mjs --upstream http://127.0.0.1:PORT --control /tmp/fault.json
// Control JSON: {"failWorkspaceWrites":true,"delayWriteMs":0}. No production code hook.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const argument=name=>process.argv[process.argv.indexOf(name)+1];
if(!process.argv.includes('--upstream')||!process.argv.includes('--control'))throw Error('Explicit synthetic upstream and local control file required');
const upstream=new URL(argument('--upstream')),controlPath=argument('--control');
if(upstream.protocol!=='http:'||upstream.hostname!=='127.0.0.1'||!upstream.port||upstream.username||upstream.password)throw Error('Only an explicit loopback HTTP port is allowed');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,upstream),control=JSON.parse(readFileSync(controlPath,'utf8'));
  if(url.origin!==upstream.origin)throw Error('External proxy target rejected');
  const write=req.method==='POST'&&url.pathname==='/api/workspace/patch';
  if(write&&control.delayWriteMs)await new Promise(resolve=>setTimeout(resolve,Math.min(5000,Math.max(0,Number(control.delayWriteMs)||0))));
  if(write&&control.failWorkspaceWrites){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'隔离验证：模拟保存服务暂不可用，请重试。'}));return;}
  const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
  if(headers.get('Origin')==='http://'+req.headers.host)headers.set('Origin',upstream.origin);
  headers.set('Host',upstream.host);headers.delete('connection');
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2000000)throw Error('Synthetic proxy body limit');chunks.push(chunk);}
  const response=await fetch(url,{method:req.method,headers,redirect:'manual',...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const bytes=Buffer.from(await response.arrayBuffer());
  for(const [name,value] of response.headers)if(!['content-length','content-encoding','transfer-encoding','connection','set-cookie'].includes(name))res.setHeader(name,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
  res.writeHead(response.status);res.end(bytes);
 }catch{res.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Synthetic proxy unavailable"}');}
});
server.listen(0,'127.0.0.1',()=>console.log('Synthetic fault preview http://127.0.0.1:'+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
