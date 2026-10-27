import {restoreFocusTarget} from '../../focus-return.mjs';
// Capture before the upstream portal takes focus, then restore after its cleanup.
export function createCalendarFormFocus(host,canRestore){
 let origin=null,day=null,opened=false,waiting=false,frame=0,disposed=false;
 const capture=target=>{if(opened||!(target instanceof Element))return;const cell=target.closest('[class*="ilamy-date-"]');day=cell&&[...cell.classList].find(name=>name.startsWith('ilamy-date-'));origin=target.closest('button,a[href],[tabindex]')||cell;};
 const onCapture=event=>capture(event.target);
 for(const name of ['pointerdown','focusin','click'])host.addEventListener(name,onCapture,true);
 const restore=()=>{cancelAnimationFrame(frame);if(!waiting||opened||disposed||!canRestore())return;frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{if(disposed||opened||!host.isConnected||!canRestore())return;if(document.querySelector('[role="dialog"][data-state="open"]'))return;const stable=()=>origin?.id?document.getElementById(origin.id):null;const cell=()=>day?host.querySelector('.'+CSS.escape(day)):null;const create=()=>[...host.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')==='新建'||button.textContent.trim()==='新建');const dateCell=cell();if(dateCell&&!dateCell.matches('button,a,[tabindex]'))dateCell.tabIndex=-1;waiting=!restoreFocusTarget([()=>origin,stable,cell,create]);});});};
 return {capture,update(value){if(value&&!opened){waiting=false;cancelAnimationFrame(frame);}if(!value&&opened)waiting=true;opened=value;restore();},restore,dispose(){disposed=true;cancelAnimationFrame(frame);for(const name of ['pointerdown','focusin','click'])host.removeEventListener(name,onCapture,true);}};
}
