import {useEffect,useState} from 'react';
const token=(name:string,fallback:number)=>typeof document==='undefined'?fallback:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace-motion-'+name))||fallback;
// Assets load before the page theme; read tokens at use time, not module evaluation.
export const motionTiming={get card(){return token('card',500);},get page(){return token('page',320);},get scale(){return token('scale',.985);},get heading(){return token('heading',480);},get control(){return token('control',240);},get navigation(){return token('navigation',240);},get exit(){return token('exit',180);},get stagger(){return token('stagger',70);},get staggerMax(){return token('stagger-max',280);},get distance(){return token('distance',18);}};
// Apple global navigation timing observed on 2026-10-29; values remain theme-owned.
export const navigationTiming={get content(){return token('navigation-content',320);},get closeDelay(){return token('navigation-close-delay',120);},get headingDelay(){return token('navigation-heading-delay',80);},get itemDelay(){return token('navigation-item-delay',120);},get group(){return token('navigation-group',80);},get groupStep(){return token('navigation-group-step',40);},get itemStep(){return token('navigation-item-step',20);}};
export const motionEase={get css(){return typeof document==='undefined'?'cubic-bezier(.22,1,.36,1)':getComputedStyle(document.documentElement).getPropertyValue('--workspace-motion-ease').trim()||'cubic-bezier(.22,1,.36,1)';},get native():[number,number,number,number]{const values=this.css.match(/-?\d*\.?\d+/g)?.map(Number);return values?.length===4?[values[0],values[1],values[2],values[3]]:[.22,1,.36,1];},gsap:'power3.out'};
export const workspaceCardSelector='.card,.workspace-board-card,.workspace-goal-card,.workspace-goal-note,.workspace-note-reader,.workspace-overdue-card,.tasks-empty-board,.photography-card,.media-wall-item,.clothing-cover,.workspace-record,.site-empty,.workspace-empty-state,.project-core-panel,.workspace-help-topic,.annual-empty,.project-plan-empty';
const active=new Set<{element:HTMLElement;animation:Animation}>();
export function animateWorkspaceElement(element:HTMLElement,keyframes:Keyframe[],duration=motionTiming.control){
 if(motionDisabled())return;
 const animation=element.animate(keyframes,{duration,easing:motionEase.css}),entry={element,animation};
 active.add(entry);
 const release=()=>active.delete(entry);animation.addEventListener('finish',release,{once:true});animation.addEventListener('cancel',release,{once:true});
 return animation;
}
export function observeWorkspaceAnimations(){
 const cancel=(all=false)=>{for(const entry of active)if(all||!entry.element.isConnected){entry.animation.cancel();active.delete(entry);}};
 const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>cancel(motionDisabled()||document.hidden);
 const observer=new MutationObserver(records=>{cancel(records.some(r=>r.type==='attributes'&&r.attributeName==='data-workspace-view'));});
 observer.observe(document.body,{attributes:true,attributeFilter:['data-workspace-view'],subtree:true,childList:true});
 media.addEventListener('change',update);window.addEventListener('workspace-motion-change',update);document.addEventListener('visibilitychange',update);
 return()=>{cancel(true);observer.disconnect();media.removeEventListener('change',update);window.removeEventListener('workspace-motion-change',update);document.removeEventListener('visibilitychange',update);};
}
export function motionDisabled(){return document.body.dataset.motionLevel==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function useWorkspaceMotionOff(){const [off,setOff]=useState(motionDisabled);useEffect(()=>{const update=()=>setOff(motionDisabled()),media=matchMedia('(prefers-reduced-motion: reduce)');window.addEventListener('workspace-motion-change',update);media.addEventListener('change',update);update();return()=>{window.removeEventListener('workspace-motion-change',update);media.removeEventListener('change',update);};},[]);return off;}
