// Own one clock; hidden tabs resume with a full reading interval rather than catching up.
export function startOverdueRotation(tick,{document:page=document,setInterval:repeat=setInterval,clearInterval:clear=clearInterval}={}){
 let timer=null;
 const stop=()=>{if(timer!==null){clear(timer);timer=null;}};
 const sync=()=>{stop();if(!page.hidden)timer=repeat(tick,8000);};
 page.addEventListener('visibilitychange',sync);sync();
 return()=>{stop();page.removeEventListener('visibilitychange',sync);};
}
