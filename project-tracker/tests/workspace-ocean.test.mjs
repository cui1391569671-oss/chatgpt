import {oceanBoatParticles} from '../tasks-ui/src/workspace-ocean-boat.mjs';
import {oceanSizing,OCEAN_REFERENCE} from '../tasks-ui/src/workspace-ocean-sizing.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
const code=ts.transpileModule(fs.readFileSync(new URL('../tasks-ui/src/workspace-ocean.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
test('ocean respects motion preference, hidden documents, context recovery and GPU disposal',()=>{
let cleanup,callback,raf=0,draws=0,deleted=0,disconnected=false,generation=0,vertices=0,clock=0,color='#0090ff';
const palettes=[],passes=[],handlers={},canvasHandlers={},media={matches:true,addEventListener:(n,f)=>handlers.motion=f,removeEventListener:()=>deleted++};
const gl=new Proxy({getParameter:()=>8192,getShaderParameter:()=>true,getProgramParameter:()=>true,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getAttribLocation:()=>0,getUniformLocation:(program,name)=>name,uniform1f:(name,value)=>{if(name==='time')clock=value;},uniform3fv:(name,value)=>palettes.push({name,value}),drawArrays:(mode,start,count)=>{draws++;vertices=count;passes.push({start,count,clock});},deleteBuffer:()=>deleted++,deleteProgram:()=>deleted++,deleteShader:()=>deleted++},{get:(t,k)=>k in t?t[k]:k===k.toUpperCase()?1:()=>{}});
const canvas={dataset:{},getContext:()=>gl,getBoundingClientRect:()=>({width:1248,height:576}),addEventListener:(n,f)=>canvasHandlers[n]=f,removeEventListener:()=>deleted++};
const doc={hidden:false,documentElement:{},body:{dataset:{workspaceView:'home'}},addEventListener:(n,f)=>handlers.visibility=f,removeEventListener:()=>deleted++};
const sandbox={exports:{},console,require:n=>n==='./workspace-ocean-sizing.mjs'?{oceanSizing}:n==='./workspace-ocean-boat.mjs'?{oceanBoatParticles}:n==='react'?{useRef:()=>({current:canvas}),useState:()=>[0,f=>generation=f(0)],useEffect:f=>cleanup=f()}:n==='react-dom'?{createPortal:n=>n}:{jsx:()=>({}),jsxs:()=>({})},matchMedia:query=>query.includes('resolution:')?{addEventListener:(n,f)=>handlers.density=f,removeEventListener:()=>deleted++}:media,getComputedStyle:()=>({getPropertyValue:()=>color}),document:doc,devicePixelRatio:1.5,performance:{now:()=>0},requestAnimationFrame:f=>{callback=f;return ++raf;},cancelAnimationFrame(){},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}disconnect(){disconnected=true;}}};
vm.runInNewContext(code,sandbox);sandbox.exports.WorkspaceOcean();
assert.equal(canvas.dataset.oceanRenderer,'webgl');assert.equal(passes[0].count,oceanSizing(1248,576,1.5).count);assert.equal(vertices,oceanBoatParticles().length/3);assert.equal(draws,2);assert.equal(raf,0);assert.equal(canvas.dataset.oceanBoat,'visible');assert.equal(passes[1].start,OCEAN_REFERENCE.particles);
media.matches=false;handlers.motion();assert.ok(raf);const before=draws;for(let i=1;i<=120;i++)callback(i*1000/120);assert.equal(draws,before+240);for(let i=before;i<passes.length;i+=2)assert.equal(passes[i].clock,passes[i+1].clock,'water and boat share the same GPU clock');assert.ok(Math.abs(clock-2)<1e-8,'120 Hz draws must preserve two seconds of simulation per real second');
assert.equal(palettes.length,2,'unchanged theme must not re-upload the palette every frame');color='#0d74ce';
sandbox.performance.now=()=>1000;sandbox.devicePixelRatio=2;handlers.density();assert.equal(canvas.width,oceanSizing(1248,576,2).width);assert.equal(palettes.length,4);assert.equal(palettes[2].value[0],13/255,'late theme installation updates both boat and sea');assert.ok(Math.abs(clock-2)<1e-8,'pixel density changes preserve animation time');
const next=draws;for(let i=1;i<=60;i++)callback(1000+i*1000/60);assert.equal(draws,next+120);assert.ok(Math.abs(clock-4)<1e-8,'60 Hz must have the same propagation speed');
doc.body.dataset.workspaceView='notes';doc.hidden=true;const scheduled=raf;const beforeHidden=draws;handlers.visibility();assert.equal(raf,scheduled);assert.equal(draws,beforeHidden+1);assert.equal(canvas.dataset.oceanBoat,'hidden');
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

test('boat particle geometry has bounded coordinates, translucent coverage, sail and waterline',()=>{
 const points=oceanBoatParticles();assert(points.length/3>400&&points.length/3<1500);
 let sail=false,hull=false;
 for(let i=0;i<points.length;i+=3){assert(Math.abs(points[i])<=.51);assert(points[i+1]>=0&&points[i+1]<=1);assert(points[i+2]<0&&points[i+2]>=-1);if(points[i+1]>.8)sail=true;if(points[i+1]<.1)hull=true;}
 assert(sail&&hull);
});
