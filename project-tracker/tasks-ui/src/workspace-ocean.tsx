import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
// Authored from visual observation, without React Bits Pro source or runtime dependencies.
const vertex=`
attribute vec3 seed;
uniform vec2 viewport;
uniform float time;
uniform float pixelRatio;
uniform vec3 gold;
uniform vec3 pearl;
varying vec4 tint;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Value and analytic spatial gradient, sharing the same four lattice samples.
vec3 noiseGradient(vec2 p){
 vec2 cell=floor(p),f=fract(p),blend=f*f*(3.-2.*f),slope=6.*f*(1.-f);
 float a=hash(cell),b=hash(cell+vec2(1.,0.)),c=hash(cell+vec2(0.,1.)),d=hash(cell+1.);
 return vec3(mix(mix(a,b,blend.x),mix(c,d,blend.x),blend.y),
  mix(b-a,d-c,blend.y)*slope.x,mix(c-a,d-b,blend.x)*slope.y);
}
vec3 sea(vec2 p){
 // Depth grows away from the camera: +time moves each crest toward smaller depth.
 float travel=p.y+time*1.6;
 vec2 water=vec2(p.x,travel);
 vec3 bendNoise=noiseGradient(water*.14),swellNoise=noiseGradient(vec2(p.x*.065,travel*.075)),chopNoise=noiseGradient(water*.18),fineNoise=noiseGradient(water*.85);
 float bend=(bendNoise.x-.5)*2.,swellSize=.45+swellNoise.x*1.15,chopSize=.12+chopNoise.x*.22;
 vec2 bendSlope=bendNoise.yz*.28;
 // Bend each crest across its width while the entire shape still travels toward the eye.
 vec2 crossPhase=vec2(p.x*.16+travel*.055,p.x*.31-travel*.035);
 vec2 crossTilt=cos(crossPhase);
 float crossSwell=sin(crossPhase.x)*1.1+sin(crossPhase.y)*.3;
 vec2 crossSlope=crossTilt.x*vec2(.176,.0605)+crossTilt.y*vec2(.093,-.0105);
 vec3 phase=vec3(travel*.34+p.x*.035+bend*.28+crossSwell,travel*.79-p.x*.085+bend*.5+crossSwell*.6,travel*1.63+p.x*.13);
 vec3 waves=sin(phase),tilts=cos(phase);
 float height=waves.x*swellSize+waves.y*chopSize+waves.z*.07+(fineNoise.x-.5)*.12;
 // Compute the normal once, instead of evaluating the entire sea three times.
 vec2 gradient=tilts.x*swellSize*(vec2(.035,.34)+bendSlope*.28+crossSlope)+waves.x*swellNoise.yz*vec2(.065,.075)*1.15
  +tilts.y*chopSize*(vec2(-.085,.79)+bendSlope*.5+crossSlope*.6)+waves.y*chopNoise.yz*.0396
  +tilts.z*vec2(.13,1.63)*.07+fineNoise.yz*.102;
 return vec3(height,gradient);
}
void main(){
 float depth=3.+seed.y*seed.y*74.;
 float aspect=viewport.x/viewport.y;
 float x=(seed.x-.5)*(9.+depth*aspect*1.48);
 vec2 p=vec2(x,depth);
 vec3 surface=sea(p);
 float h=surface.x;
 vec3 normal=normalize(vec3(-surface.y,1.,-surface.z));
 vec3 eye=normalize(vec3(-x,5.2-h,-depth-5.));
 vec3 light=normalize(vec3(.12,.6,.79));
 float spec=pow(max(dot(normal,normalize(light+eye)),0.),24.);
 float corridor=exp(-pow((x/(depth+5.)-.22)*3.2,2.));
 float grain=hash(seed.xz*931.7);
 float twinkle=pow(max(0.,sin(time*(.8+grain)+seed.z*90.)),14.);
 float reflection=spec*(.25+.75*corridor)+corridor*.28*pow(clamp(.5+h*.5,0.,1.),2.)*(1.-smoothstep(16.,70.,depth));
 float crest=pow(clamp(.5+h*.5,0.,1.),4.);
 float brightness=(.045+crest*.65+reflection*1.45+twinkle*reflection*.5)*(.6+.4*corridor);
 float projection=1.65/(depth+5.);
 vec2 screen=vec2(.53+x*projection/aspect,.225+(4.8-h)*projection);
 gl_Position=vec4(screen.x*2.-1.,1.-screen.y*2.,0.,1.);
 gl_PointSize=clamp((.9+grain*.8)*(1.+projection*.4)*pixelRatio,.6,2.6*pixelRatio);
 tint=vec4(mix(gold,pearl,clamp(reflection*1.2*(1.-smoothstep(12.,65.,depth)),0.,.92)),brightness);
}`;
const fragment=`
precision mediump float;
varying vec4 tint;
void main(){float radius=length(gl_PointCoord-.5);float coverage=1.-smoothstep(.18,.5,radius);gl_FragColor=vec4(tint.rgb,tint.a*coverage);}
`;
/** Shared, non-interactive ocean with GPU wave normals and a moving specular reflection. */
export function WorkspaceOcean(){
 const canvas=useRef<HTMLCanvasElement>(null),[generation,setGeneration]=useState(0);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;
  const gl=node.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl){node.dataset.oceanRenderer='unavailable';return;}
  let frame=0,last=0,time=0,disposed=false,lost=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),colors=getComputedStyle(document.documentElement);
  // Theme primitives resolve to six-digit sRGB values; no independent shader palette.
  const rgb=(name:string)=>{const value=colors.getPropertyValue(name).trim();return [1,3,5].map(start=>parseInt(value.slice(start,start+2),16)/255);};
  function shader(type:number,source:string){const item=gl.createShader(type);if(!item)return null;gl.shaderSource(item,source);gl.compileShader(item);if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){console.warn('Ocean shader compilation failed:',gl.getShaderInfoLog(item));gl.deleteShader(item);return null;}return item;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
  if(!vs||!fs||!program){node.dataset.oceanRenderer='compile-failed';if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);if(program)gl.deleteProgram(program);return;}
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){node.dataset.oceanRenderer='link-failed';console.warn('Ocean shader link failed:',gl.getProgramInfoLog(program));gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return;}
  node.dataset.oceanRenderer='webgl';
  const count=512*384,data=new Float32Array(count*3),random=(i:number)=>{const n=Math.sin(i*127.1+31.7)*43758.5453;return n-Math.floor(n);};
  for(let i=0;i<count;i++){data[i*3]=(i%512+random(i+1))/512;data[i*3+1]=(Math.floor(i/512)+random(i+7))/384;data[i*3+2]=random(i+13);}
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.useProgram(program);
  const position=gl.getAttribLocation(program,'seed');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);
  const clock=gl.getUniformLocation(program,'time'),viewport=gl.getUniformLocation(program,'viewport'),ratio=gl.getUniformLocation(program,'pixelRatio');
  gl.uniform3fv(gl.getUniformLocation(program,'gold'),rgb('--particle-gold'));gl.uniform3fv(gl.getUniformLocation(program,'pearl'),rgb('--particle-white'));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  function draw(){if(lost||disposed)return;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(clock,time);gl.drawArrays(gl.POINTS,0,count);}
  function tick(now:number){if(disposed||lost||document.hidden||reduced.matches)return;time+=Math.min((now-last)/1000,.1)*2;last=now;draw();frame=requestAnimationFrame(tick);}
  function restart(){cancelAnimationFrame(frame);draw();if(!disposed&&!lost&&!document.hidden&&!reduced.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
  const resize=new ResizeObserver(()=>{const box=node.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);node.width=Math.round(box.width*dpr);node.height=Math.round(box.height*dpr);gl.viewport(0,0,node.width,node.height);gl.uniform2f(viewport,box.width,box.height);gl.uniform1f(ratio,dpr);restart();});resize.observe(node);
  const contextLost=(event:Event)=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);};
  // A restored canvas is remounted through React, rebuilding every GPU-owned resource.
  const contextRestored=()=>setGeneration(value=>value+1);
  node.addEventListener('webglcontextlost',contextLost);node.addEventListener('webglcontextrestored',contextRestored);
  reduced.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();node.removeEventListener('webglcontextlost',contextLost);node.removeEventListener('webglcontextrestored',contextRestored);reduced.removeEventListener('change',restart);document.removeEventListener('visibilitychange',restart);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
 },[generation]);
 return createPortal(<div className='workspace-atmosphere' aria-hidden='true'><canvas key={generation} ref={canvas}/></div>,document.body);
}
