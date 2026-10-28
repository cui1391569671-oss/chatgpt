// Mouse intent stays separate from Radix click/keyboard dismissal.
export function createNavigationIntent({getValue,onChange,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,hovered=null;
 const cancel=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
 const change=value=>{cancel();hovered=null;onChange(value);};
 return {
  cancel,change,
  enter(value){cancel();const show=()=>{timer=null;hovered={value,at:now()};onChange(value);};if(getValue()){if(getValue()!==value)show();}else timer=setTimer(show,150);},
  leave(){cancel();timer=setTimer(()=>{timer=null;hovered=null;onChange('');},180);},
  click(value){cancel();const keep=getValue()===value&&hovered?.value===value&&now()-hovered.at<500;hovered=null;return keep;}
 };
}
export function navigateWorkspace(bridge,space,next='home',go=url=>{location.href=url;}){
 if(space===bridge.scope)return bridge.navigate(next);
 if(bridge.canLeave()===false)return false;
 go('/'+space+'?view='+encodeURIComponent(next));return true;
}
