import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
/** Shared non-interactive atmosphere. A static frame remains when motion is reduced. */
export function WorkspaceOcean(){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const node=canvas.current,context=node?.getContext('2d');if(!node||!context)return;
  let frame=0,last=0,time=0,width=0,height=0,disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),colors=getComputedStyle(document.documentElement),gold=colors.getPropertyValue('--particle-gold').trim(),white=colors.getPropertyValue('--particle-white').trim();
  const random=(x:number)=>{const n=Math.sin(x*127.1+31.7)*43758.5453;return n-Math.floor(n);};
  const points=Array.from({length:15360},(_,i)=>({u:((i%320)+random(i+1)*.65)/320,v:(Math.floor(i/320)+random(i+3)*.25)/48,s:random(i+8),light:random(i+13)}));
  function draw(){context.clearRect(0,0,width,height);for(let bin=0;bin<4;bin++){context.fillStyle=bin===3?white:gold;context.globalAlpha=[.2,.4,.7,.9][bin];context.beginPath();for(const point of points){if((point.light>.98?3:Math.floor(point.light*3))!==bin)continue;const {u,v,s}=point,depth=.35+v*1.6,x=width*(.5+Math.sin(v*4)*.08+(u-.5)*depth*1.8),wave=Math.sin(u*18+v*8+time*.23)+Math.sin(u*38-v*11-time*.17)*.35,y=height*(.12+Math.pow(v,1.65)*.82+wave*.14*(.3+v));const r=(.25+s*.75)*(.3+v);context.moveTo(x+r,y);context.arc(x,y,r,0,Math.PI*2);}context.fill();}context.globalAlpha=1;}
  function tick(now:number){if(disposed||document.hidden||reduced.matches)return;if(now-last>40){time+=Math.min((now-last)/1000,.1);last=now;draw();}frame=requestAnimationFrame(tick);}
  function restart(){cancelAnimationFrame(frame);draw();if(!document.hidden&&!reduced.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
  const resize=new ResizeObserver(()=>{const box=node.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);width=box.width;height=box.height;node.width=Math.round(width*ratio);node.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);restart();});resize.observe(node);
  reduced.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();reduced.removeEventListener('change',restart);document.removeEventListener('visibilitychange',restart);};
 },[]);
 return createPortal(<div className='workspace-atmosphere' aria-hidden='true'><canvas ref={canvas}/></div>,document.body);
}
