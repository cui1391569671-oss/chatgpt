import {motionTiming} from './workspace-motion-policy';
// Original implementation inspired by React Bits backgrounds and Aceternity spotlight interactions.
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const allowed=()=>!reduced()&&document.body.dataset.motionLevel!=='off';
let cleanup=()=>{};
let previousView='';
let previousPolicy='';
export function refreshSpectacle(){
 const content=document.getElementById('content');if(!content)return;
 const level=document.body.dataset.motionLevel||'lavish',currentView=document.body.dataset.workspaceView||'';
 const policy=currentView+':'+level+':'+reduced();if(policy===previousPolicy)return;previousPolicy=policy;cleanup();
 const changed=previousView!==currentView;previousView=currentView;
 if(!allowed())return;
 const animations:Animation[]=[];
 // Animate one stable page surface once per navigation, never on record refresh.
 if(changed)animations.push((currentView==='projects'?document.getElementById('projectPanel')||content:content).animate([{opacity:0},{opacity:1}],{duration:level==='lavish'?motionTiming.page:motionTiming.control,easing:'cubic-bezier(.22,1,.36,1)'}));
 const covers=new Set<HTMLElement>();
 const magnets=new Set<HTMLElement>();
 const magnetic=(event:PointerEvent)=>{if(level!=='lavish'||event.pointerType==='touch')return;const button=(event.target as Element).closest<HTMLButtonElement>('.btn.primary,[data-slot=button][data-variant=default]');if(!button||button.disabled)return;const r=button.getBoundingClientRect();button.style.translate=`${(event.clientX-r.left-r.width/2)*.08}px ${(event.clientY-r.top-r.height/2)*.12}px`;magnets.add(button);};
 const release=(event:PointerEvent)=>{const button=(event.target as Element).closest<HTMLElement>('.btn.primary,[data-slot=button][data-variant=default]');if(button&&!button.contains(event.relatedTarget as Node))button.style.removeProperty('translate');};
 const ripple=(event:MouseEvent)=>{if(level!=='lavish')return;const button=(event.target as Element).closest<HTMLButtonElement>('.btn,[data-slot=button]');if(!button||button.disabled)return;const r=button.getBoundingClientRect(),ring=document.createElement('span');ring.className='wb-click-ring';ring.setAttribute('aria-hidden','true');ring.style.left=(event.detail?event.clientX:r.left+r.width/2)+'px';ring.style.top=(event.detail?event.clientY:r.top+r.height/2)+'px';document.body.append(ring);const animation=ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.8},{transform:'translate(-50%,-50%) scale(3)',opacity:0}],{duration:500,easing:'ease-out'});animation.onfinish=()=>ring.remove();};

 const move=(event:PointerEvent)=>{if(level!=='lavish'||event.pointerType==='touch')return;const target=event.target as Element;const cover=target.closest<HTMLElement>('.media-wall-cover');if(cover){const r=cover.getBoundingClientRect();cover.style.setProperty('--tilt-x',`${-(event.clientY-r.top-r.height/2)/r.height*12}deg`);cover.style.setProperty('--tilt-y',`${(event.clientX-r.left-r.width/2)/r.width*12}deg`);covers.add(cover);}const card=target.closest<HTMLElement>('.card');if(!card)return;const rect=card.getBoundingClientRect();card.style.setProperty('--spot-x',`${event.clientX-rect.left}px`);card.style.setProperty('--spot-y',`${event.clientY-rect.top}px`);};
 const leave=(event:PointerEvent)=>{const cover=(event.target as Element).closest<HTMLElement>('.media-wall-cover');if(cover&&!cover.contains(event.relatedTarget as Node)){cover.style.removeProperty('--tilt-x');cover.style.removeProperty('--tilt-y');}};
 content.addEventListener('pointermove',move,{passive:true});
 content.addEventListener('pointerout',leave,{passive:true});
 content.addEventListener('pointermove',magnetic,{passive:true});content.addEventListener('pointerout',release,{passive:true});content.addEventListener('click',ripple);
 cleanup=()=>{animations.forEach(a=>a.cancel());magnets.forEach(el=>el.style.removeProperty('translate'));covers.forEach(el=>{el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');});content.removeEventListener('pointermove',move);content.removeEventListener('pointerout',leave);content.removeEventListener('pointermove',magnetic);content.removeEventListener('pointerout',release);content.removeEventListener('click',ripple);};
}
export function celebrateCheck(input:HTMLInputElement){
 if(!allowed()||!input.checked||document.body.dataset.motionLevel==='light')return;
 const rect=input.getBoundingClientRect();
 requestAnimationFrame(()=>{if(!input.isConnected||!allowed())return;const checks=Array.from(document.querySelectorAll<HTMLInputElement>('[data-daily-checkin]'));if(checks.length!==2||!checks.every(box=>box.checked))return;document.querySelector('.wb-day-complete')?.remove();const message=document.createElement('div');message.className='wb-day-complete';message.setAttribute('role','status');message.textContent='今日英语与健身，全部打卡完成 ✓';document.body.append(message);const animation=message.animate([{opacity:0,transform:'translate(-50%,16px) scale(.9)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.2},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.8},{opacity:0,transform:'translate(-50%,-8px) scale(.98)'}],{duration:2200,easing:'ease-out'});animation.onfinish=()=>message.remove();});
 for(let i=0;i<20;i++){const dot=document.createElement('span');dot.className='wb-celebration';dot.setAttribute('aria-hidden','true');dot.style.left=rect.left+rect.width/2+'px';dot.style.top=rect.top+rect.height/2+'px';document.body.append(dot);const angle=i*Math.PI*2/20,distance=35+Math.random()*55;const animation=dot.animate([{transform:'translate(-50%,-50%) scale(0)',opacity:1},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance-20}px) rotate(${i*35}deg) scale(1)`,opacity:1,offset:.55},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance+30}px) scale(.2)`,opacity:0}],{duration:700+Math.random()*200,easing:'ease-out'});animation.onfinish=()=>dot.remove();}
}
