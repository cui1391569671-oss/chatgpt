import {celebrateCheck} from './workspace-spectacle';
import {animateWorkspaceElement,motionDisabled} from './workspace-motion-policy';
const running=new WeakMap<HTMLElement,Animation>();
const cards=(host:HTMLElement)=>Array.from(host.querySelectorAll<HTMLElement>('.media-wall-item[data-media-record]'));
Object.assign(window,{WorkspaceMotion:{
 snapshot(host:HTMLElement){return motionDisabled()?null:cards(host).map(el=>({id:el.dataset.mediaRecord,rect:el.getBoundingClientRect()}));},
 rearrange(host:HTMLElement,prior:{id:string;rect:DOMRect}[]|null){
  if(motionDisabled()||!prior?.length)return;
  const latest=cards(host),same=latest.length===prior.length&&latest.every((el,i)=>el.dataset.mediaRecord===prior[i].id);if(same)return;
  const old=new Map(prior.map(row=>[row.id,row.rect]));
  for(const el of latest){const previous=old.get(el.dataset.mediaRecord),next=el.getBoundingClientRect();running.get(el)?.cancel();
   const animation=animateWorkspaceElement(el,previous?[{transform:`translate(${previous.left-next.left}px,${previous.top-next.top}px)`},{transform:'none'}]:[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}]);
   if(animation)running.set(el,animation);
  }
 },
 check(input:HTMLInputElement){celebrateCheck(input);if(motionDisabled()||input.hasAttribute('data-completion-source'))return;running.get(input)?.cancel();const animation=animateWorkspaceElement(input,[{transform:'scale(1)'},{transform:'scale(.88)'},{transform:'scale(1)'}]);if(animation)running.set(input,animation);}
}});
