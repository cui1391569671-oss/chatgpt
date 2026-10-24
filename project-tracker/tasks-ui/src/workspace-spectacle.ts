// A successful check dispatches visual feedback; React Bits owns its rendering.
export function celebrateCheck(input:HTMLInputElement){
 if(!input.checked||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const rect=input.getBoundingClientRect();
 requestAnimationFrame(()=>{
  if(!input.isConnected)return;
  const checks=Array.from(document.querySelectorAll<HTMLInputElement>('[data-daily-checkin]'));
  window.dispatchEvent(new CustomEvent('workspace-celebrate',{detail:{rect,complete:checks.length===2&&checks.every(box=>box.checked)}}));
 });
}
