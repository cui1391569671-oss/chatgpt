import {useEffect,useRef} from 'react';
import {installSidebarEdgeSwipe,hasSidebarBlockingOverlay} from './sidebar-edge-swipe.mjs';
export function useSidebarEdgeSwipe({enabled,onOpen}){
 const open=useRef(onOpen);open.current=onOpen;
 useEffect(()=>{
  if(!enabled)return;
  const onGesture=()=>open.current();
  const frames=new Map();
  const dispose=installSidebarEdgeSwipe({onOpen:onGesture,isBlocked:()=>[...frames.values()].some(({doc})=>hasSidebarBlockingOverlay(doc))});
  // Project content lives in a same-origin iframe. Touch hit testing can target it
  // even just outside its border; use the outer viewport edge, not the frame edge.
  const syncFrames=()=>{
   const current=new Set(document.querySelectorAll<HTMLIFrameElement>('iframe#projectFrame'));
   for(const [frame,entry] of frames)if(!current.has(frame)){entry.dispose();frames.delete(frame);}
   for(const frame of current){
    try{
     const doc=frame.contentDocument,view=frame.contentWindow;
     if(!doc||!view||frames.get(frame)?.doc===doc)continue;
     frames.get(frame)?.dispose();
     frames.set(frame,{doc,dispose:installSidebarEdgeSwipe({document:doc,window:view,onOpen:onGesture,edgeOffset:()=>frame.getBoundingClientRect().left,isBlocked:()=>hasSidebarBlockingOverlay(document)})});
    }catch{/* Cross-origin previews keep their own touch handling. */}
   }
  };
  const onLoad=event=>{if(event.target instanceof HTMLIFrameElement)syncFrames();};
  const observer=new MutationObserver(syncFrames);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('load',onLoad,true);syncFrames();
  return ()=>{dispose();observer.disconnect();document.removeEventListener('load',onLoad,true);for(const entry of frames.values())entry.dispose();frames.clear();};
 },[enabled]);
}
