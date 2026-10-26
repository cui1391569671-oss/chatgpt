import {useLayoutEffect,useRef,type ReactNode} from 'react';
import RubberSegment from '../vendor/react-bits/RubberSegment';

type SegmentProps={items:{value:string;label:ReactNode}[];value:string;onChange:(value:string)=>void|boolean;label:string;className?:string;disabled?:boolean;transitionFrom?:string;focusSelection?:boolean;onFocusRestored?:()=>void};
/** One owner for the themed, 44px radio targets used by horizontal switches. */
export function WorkspaceSegment({label,className='',focusSelection,onFocusRestored,...props}:SegmentProps){
 const host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const viewport=host.current;
  const reveal=()=>{const button=viewport?.querySelector<HTMLButtonElement>('button[aria-checked="true"]');if(!button||!viewport)return;const box=viewport.getBoundingClientRect(),item=button.getBoundingClientRect();if(item.right>box.right)viewport.scrollLeft+=item.right-box.right+3;else if(item.left<box.left)viewport.scrollLeft-=box.left-item.left+3;};
  reveal();
  if(focusSelection){viewport?.querySelector<HTMLButtonElement>('button[aria-checked="true"]')?.focus({preventScroll:true});onFocusRestored?.();}
  const observer=new ResizeObserver(reveal);if(viewport)observer.observe(viewport);return()=>observer.disconnect();
 },[props.value,focusSelection,onFocusRestored]);
 return <div ref={host} data-ui-owner="rubber-segment" className={'wb-segment-scroll '+className}><RubberSegment {...props} aria-label={label} size='lg' equalSlots={false} trackColor='var(--admin-muted)' thumbColor='var(--tab-active-bg)' textColor='var(--text-muted)' activeTextColor='var(--tab-active-text)' style={{'--rs-h':'calc(var(--control-height) + 6px)','--rs-radius':'var(--control-radius)','--rs-pad':'12px'}}/></div>;
}
