import {useEffect,useState} from 'react';
export const motionTiming={page:420,control:240,exit:180};
export function motionDisabled(){return document.body.dataset.motionLevel==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function useWorkspaceMotionOff(){const [off,setOff]=useState(motionDisabled);useEffect(()=>{const update=()=>setOff(motionDisabled()),media=matchMedia('(prefers-reduced-motion: reduce)');window.addEventListener('workspace-motion-change',update);media.addEventListener('change',update);update();return()=>{window.removeEventListener('workspace-motion-change',update);media.removeEventListener('change',update);};},[]);return off;}
