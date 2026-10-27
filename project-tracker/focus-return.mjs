// Shared focus eligibility used by application overlays and calendar adapters.
export function restoreFocusTarget(resolvers){
 for(const resolve of resolvers){const target=resolve?.();if(!target?.isConnected||target.closest('[inert]')||target.matches(':disabled,[aria-disabled="true"]')||!target.getClientRects().length||getComputedStyle(target).visibility==='hidden')continue;target.focus({preventScroll:true});if(document.activeElement===target)return true;}
 return false;
}
