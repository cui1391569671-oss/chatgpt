// A discrete edge gesture opens the existing navigation Sheet; it never moves content.
const EDGE=28,INTENT=12,DISTANCE=64,VERTICAL=32,MAX_DURATION=800;
const MODAL='dialog[open],[role="dialog"][aria-modal="true"],[role="dialog"][data-state="open"],[role="listbox"][data-state="open"],[role="menu"][data-state="open"]';
const INTERACTIVE='a[href],button,input,textarea,select,label,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[draggable="true"],.ilamy-surface,[data-sidebar-swipe-ignore]';
export const hasSidebarBlockingOverlay=doc=>!!doc.querySelector(MODAL);
/** @param {{document?:Document,window?:Window,onOpen:()=>void,edgeOffset?:()=>number,isBlocked?:()=>boolean}} options */
export function installSidebarEdgeSwipe({document:doc=document,window:view=window,onOpen,edgeOffset=()=>0,isBlocked=()=>false}){
 let gesture=null;
 const cancel=()=>{gesture=null;};
 const blocked=()=>hasSidebarBlockingOverlay(doc)||isBlocked();
 function eligible(node,point){
  if(!node||typeof node.closest!=='function')return false;
  const control=node.closest(INTERACTIVE);
  if(control){
   const rect=control.getBoundingClientRect?.();
   if(!rect||point.clientX>=rect.left&&point.clientX<=rect.right&&point.clientY>=rect.top&&point.clientY<=rect.bottom)return false;
  }
  for(let el=node;el&&el!==doc.documentElement;el=el.parentElement){
   const style=view.getComputedStyle(el);
   if(/^(auto|scroll)$/.test(style.overflowX)&&el.scrollWidth>el.clientWidth+1){
    const rect=el.getBoundingClientRect?.();
    // Touch hit testing may snap gutter touches onto a nearby scrollable table.
    if(!rect||point.clientX>=rect.left&&point.clientX<=rect.right)return false;
   }
  }
  return true;
 }
 function start(event){
  cancel();const point=event.touches[0];
  if(event.touches.length!==1||!point||point.clientX+edgeOffset()<0||point.clientX+edgeOffset()>EDGE||blocked()||!eligible(event.target,point))return;
  gesture={id:point.identifier,x:point.clientX,y:point.clientY,time:event.timeStamp,claimed:false};
 }
 function move(event){
  if(!gesture)return;const point=event.touches[0];
  if(event.touches.length!==1||!point||point.identifier!==gesture.id||event.timeStamp-gesture.time>MAX_DURATION||blocked()){cancel();return;}
  const dx=point.clientX-gesture.x,dy=Math.abs(point.clientY-gesture.y);
  if(dx<-8||dy>VERTICAL||dy>=INTENT&&dy>=Math.abs(dx)){cancel();return;}
  if(dx>=INTENT&&dx>=dy*2)gesture.claimed=true;
  if(gesture.claimed){if(!event.cancelable){cancel();return;}event.preventDefault();}
 }
 function end(event){
  const current=gesture;cancel();if(!current||!current.claimed||event.touches.length||blocked())return;
  const point=Array.from(event.changedTouches).find(p=>p.identifier===current.id);if(!point)return;
  const dx=point.clientX-current.x,dy=Math.abs(point.clientY-current.y),duration=event.timeStamp-current.time;
  if(duration>=0&&duration<=MAX_DURATION&&dx>=DISTANCE&&dy<=VERTICAL&&dx>=dy*2)onOpen();
 }
 doc.addEventListener('touchstart',start,{capture:true,passive:true});
 doc.addEventListener('touchmove',move,{capture:true,passive:false});
 doc.addEventListener('touchend',end,{capture:true,passive:true});
 doc.addEventListener('touchcancel',cancel,true);
 doc.addEventListener('visibilitychange',cancel);
 view.addEventListener('blur',cancel);
 view.addEventListener('resize',cancel);
 return ()=>{
  cancel();doc.removeEventListener('touchstart',start,true);doc.removeEventListener('touchmove',move,true);doc.removeEventListener('touchend',end,true);doc.removeEventListener('touchcancel',cancel,true);doc.removeEventListener('visibilitychange',cancel);view.removeEventListener('blur',cancel);view.removeEventListener('resize',cancel);
 };
}
