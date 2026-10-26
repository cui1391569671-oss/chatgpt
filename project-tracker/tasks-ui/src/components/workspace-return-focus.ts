type CloseFocusEvent={defaultPrevented:boolean;preventDefault:()=>void};
export function restoreWorkspaceFocus(event:CloseFocusEvent,resolvers:Array<(()=>HTMLElement|null|undefined)|undefined>){
 if(event.defaultPrevented)return;
 for(const resolve of resolvers){
  const target=resolve?.();
  if(!target?.isConnected||target.closest('[inert]')||target.matches(':disabled,[aria-disabled="true"]')||!target.getClientRects().length||getComputedStyle(target).visibility==='hidden')continue;
  event.preventDefault();target.focus({preventScroll:true});break;
 }
}
