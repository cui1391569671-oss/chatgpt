import {oceanSizing,OCEAN_REFERENCE} from '../tasks-ui/src/workspace-ocean-sizing.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
const code=ts.transpileModule(fs.readFileSync(new URL('../tasks-ui/src/workspace-ocean.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
test('ocean respects motion preference, hidden documents, context recovery and GPU disposal',()=>{
let cleanup,callback,raf=0,draws=0,deleted=0,disconnected=false,generation=0,vertices=0,clock=0;
const handlers={},canvasHandlers={},media={matches:true,addEventListener:(n,f)=>handlers.motion=f,removeEventListener:()=>deleted++};
const gl=new Proxy({getParameter:()=>8192,getShaderParameter:()=>true,getProgramParameter:()=>true,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getAttribLocation:()=>0,getUniformLocation:(program,name)=>name,uniform1f:(name,value)=>{if(name==='time')clock=value;},drawArrays:(mode,start,count)=>{draws++;vertices=count;},deleteBuffer:()=>deleted++,deleteProgram:()=>deleted++,deleteShader:()=>deleted++},{get:(t,k)=>k in t?t[k]:k===k.toUpperCase()?1:()=>{}});
const canvas={dataset:{},getContext:()=>gl,getBoundingClientRect:()=>({width:1248,height:576}),addEventListener:(n,f)=>canvasHandlers[n]=f,removeEventListener:()=>deleted++};
const doc={hidden:false,documentElement:{},body:{},addEventListener:(n,f)=>handlers.visibility=f,removeEventListener:()=>deleted++};
const sandbox={exports:{},console,require:n=>n==='./workspace-ocean-sizing.mjs'?{oceanSizing}:n==='react'?{useRef:()=>({current:canvas}),useState:()=>[0,f=>generation=f(0)],useEffect:f=>cleanup=f()}:n==='react-dom'?{createPortal:n=>n}:{jsx:()=>({})},matchMedia:query=>query.includes('resolution:')?{addEventListener:(n,f)=>handlers.density=f,removeEventListener:()=>deleted++}:media,getComputedStyle:()=>({getPropertyValue:()=> '#0090ff'}),document:doc,devicePixelRatio:1.5,performance:{now:()=>0},requestAnimationFrame:f=>{callback=f;return ++raf;},cancelAnimationFrame(){},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}disconnect(){disconnected=true;}}};
vm.runInNewContext(code,sandbox);sandbox.exports.WorkspaceOcean();
assert.equal(canvas.dataset.oceanRenderer,'webgl');assert.equal(vertices,oceanSizing(1248,576,1.5).count);assert.equal(draws,1);assert.equal(raf,0);
media.matches=false;handlers.motion();assert.ok(raf);const before=draws;for(let i=1;i<=120;i++)callback(i*1000/120);assert.equal(draws,before+120);assert.ok(Math.abs(clock-2)<1e-8,'120 Hz draws must preserve two seconds of simulation per real second');
sandbox.performance.now=()=>1000;sandbox.devicePixelRatio=2;handlers.density();assert.equal(canvas.width,oceanSizing(1248,576,2).width);assert.ok(Math.abs(clock-2)<1e-8,'pixel density changes preserve animation time');
const next=draws;for(let i=1;i<=60;i++)callback(1000+i*1000/60);assert.equal(draws,next+60);assert.ok(Math.abs(clock-4)<1e-8,'60 Hz must have the same propagation speed');
doc.hidden=true;const scheduled=raf;handlers.visibility();assert.equal(raf,scheduled);
let prevented=false;canvasHandlers.webglcontextlost({preventDefault(){prevented=true;}});assert.ok(prevented);canvasHandlers.webglcontextrestored();assert.equal(generation,1);
cleanup();assert.ok(disconnected);assert.equal(deleted,10);
});

test('ocean sizing preserves the reference and bounds density, pixel budget and GPU dimensions',()=>{
 const ref=oceanSizing(2560,1440*.88,1);assert.equal(ref.count,OCEAN_REFERENCE.particles);assert.equal(ref.pointScale,1);assert.equal(ref.sceneX,1);assert.equal(ref.sceneY,1);
 for(const [w,h] of [[1920,1080*.88],[1440,900*.88],[1366,768*.88],[1280,720*.88],[832,316.8]]){
  const sizing=oceanSizing(w,h,2);assert(sizing.count<ref.count);assert(sizing.pointScale>=.8);assert(sizing.width*sizing.height<=8000000);assert(sizing.sceneX<=1&&sizing.sceneY<=1);
  const coverage=sizing.count*sizing.pointScale**2/(Math.min(w/2560,h/(1440*.88))**2);assert(Math.abs(coverage-ref.count)<3);
 }
 assert.equal(oceanSizing(1280,720*.88,2).ratio,2);
 const huge=oceanSizing(7680,4320,3);assert(huge.width*huge.height<=8000000);assert(huge.count<=OCEAN_REFERENCE.particles);
 assert.equal(oceanSizing(0,500),null);assert.equal(oceanSizing(NaN,500),null);assert.equal(oceanSizing(500,-1),null);
 assert(oceanSizing(1280,720,2,1024).width<=1024);assert(oceanSizing(1280,720,2,1024).height<=1024);
});
