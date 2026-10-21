import test from 'node:test';
import assert from 'node:assert/strict';
import {installSidebarEdgeSwipe} from '../tasks-ui/src/hooks/sidebar-edge-swipe.mjs';
function fixture(){
 const listeners=()=>({handlers:new Map(),addEventListener(k,fn){this.handlers.set(k,fn);},removeEventListener(k){this.handlers.delete(k);},emit(k,event={}){this.handlers.get(k)?.(event);}});
 const doc=listeners(),view=listeners();let opened=0,modal=false;
 doc.querySelector=()=>modal?{}:null;doc.documentElement={};
 view.getComputedStyle=node=>({overflowX:node.overflowX||'visible'});
 const node={closest:()=>null,parentElement:doc.documentElement,clientWidth:390,scrollWidth:390};
 const cleanup=installSidebarEdgeSwipe({document:doc,window:view,onOpen:()=>opened++});
 const point=(x,y=200,id=1)=>({clientX:x,clientY:y,identifier:id});
 const touch=(type,x,y=200,time=100,extra={})=>{const p=point(x,y);const e={target:node,timeStamp:time,touches:type==='touchend'?[]:[p],changedTouches:[p],cancelable:true,prevented:false,preventDefault(){this.prevented=true;},...extra};doc.emit(type,e);return e;};
 const swipe=(x=8,end=120)=>{touch('touchstart',x);const move=touch('touchmove',end,200,200);touch('touchend',end,200,250);return move;};
 return {doc,view,node,cleanup,touch,swipe,point,get opened(){return opened;},set modal(v){modal=v;}};
}
test('edge swipe opens existing navigation once, after horizontal intent and touch release',()=>{
 const f=fixture();f.touch('touchstart',8);assert.equal(f.touch('touchmove',14,201,150).prevented,false);assert.equal(f.touch('touchmove',100,204,200).prevented,true);assert.equal(f.opened,0);f.touch('touchend',100,204,250);assert.equal(f.opened,1);f.touch('touchend',100,204,260);assert.equal(f.opened,1);
});
test('ordinary scrolling, short, reverse, diagonal, central and slow gestures do not open navigation',()=>{
 for(const [start,end,y,time] of [[8,28,200,250],[8,4,200,250],[8,70,280,250],[8,50,235,250],[100,220,200,250],[8,120,200,1000]]){
  const f=fixture();f.touch('touchstart',start);f.touch('touchmove',end,y,time);f.touch('touchend',end,y,time+10);assert.equal(f.opened,0);
 }
 const f=fixture();f.touch('touchstart',8);assert.equal(f.touch('touchmove',10,250,200).prevented,false);f.touch('touchmove',130,250,250);f.touch('touchend',130,250,300);assert.equal(f.opened,0);
});
test('controls, horizontal scrolling containers and open dialogs retain touch behavior',()=>{
 for(const kind of ['control','scroll','dialog']){const f=fixture();if(kind==='control')f.node.closest=()=>({});if(kind==='scroll'){f.node.overflowX='auto';f.node.scrollWidth=900;}if(kind==='dialog')f.modal=true;assert.equal(f.swipe().prevented,false);assert.equal(f.opened,0);}
 const f=fixture();f.touch('touchstart',8);f.modal=true;assert.equal(f.touch('touchmove',120,200,200).prevented,false);f.touch('touchend',120,200,250);assert.equal(f.opened,0);
});
test('multi-touch, browser-owned scrolling and interrupted gestures are cancelled',()=>{
 for(const kind of ['multi','noncancelable','touchcancel','visibilitychange','blur','resize']){
  const f=fixture();f.touch('touchstart',8);
  if(kind==='multi')f.touch('touchmove',120,200,200,{touches:[f.point(120),f.point(130,200,2)]});
  else if(kind==='noncancelable')f.touch('touchmove',120,200,200,{cancelable:false});
  else if(['blur','resize'].includes(kind))f.view.emit(kind);
  else f.doc.emit(kind);
  f.touch('touchmove',130,200,220);f.touch('touchend',130,200,250);assert.equal(f.opened,0,kind);
 }
});
test('cleanup removes all document/window handlers and pending gestures',()=>{const f=fixture();f.touch('touchstart',8);f.cleanup();assert.equal(f.doc.handlers.size,0);assert.equal(f.view.handlers.size,0);f.swipe();assert.equal(f.opened,0);});
test('embedded content uses outer viewport edge and parent overlay protection',()=>{
 for(const [offset,start,blocked,expected] of [[12,-4,false,1],[100,8,false,0],[12,-4,true,0]]){
  const f=fixture();f.cleanup();let count=0;const dispose=installSidebarEdgeSwipe({document:f.doc,window:f.view,onOpen:()=>count++,edgeOffset:()=>offset,isBlocked:()=>blocked});f.swipe(start,start+120);assert.equal(count,expected);dispose();
 }
});
test('touch adjustment onto a nearby scroll container does not swallow the outer gutter',()=>{const f=fixture();f.node.overflowX='auto';f.node.scrollWidth=900;f.node.getBoundingClientRect=()=>({left:28,right:380});assert.equal(f.swipe().prevented,true);assert.equal(f.opened,1);});
test('edge gutter remains usable when touch adjustment targets an adjacent control',()=>{const f=fixture();f.node.closest=()=>({getBoundingClientRect:()=>({left:32,right:300,top:180,bottom:240})});f.swipe();assert.equal(f.opened,1);});
