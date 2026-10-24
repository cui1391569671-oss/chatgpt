const timers=new WeakMap<HTMLElement,ReturnType<typeof setTimeout>>();
export function showFeedback(node:HTMLElement,message:string,tone='info'){
 if(!node)return;
 clearTimeout(timers.get(node));
 const show=()=>{
  // Await the caller's inline failure rendering; persistent errors own recovery.
  const persistent=tone==='error'&&[...document.querySelectorAll<HTMLElement>('.form-error,.tasks-error,.ilamy-failure,#status.error')].some(el=>el.getBoundingClientRect().width>0&&el.textContent?.includes(message));
  if(persistent){node.hidden=true;return;}
  node.className='workspace-toast';node.dataset.tone=tone;node.setAttribute('role',tone==='error'?'alert':'status');node.setAttribute('aria-atomic','true');node.textContent=message;node.hidden=false;
  timers.set(node,setTimeout(()=>{node.hidden=true;},tone==='error'?6000:3500));
 };
 if(tone==='error')timers.set(node,setTimeout(show,0));else show();
}
export const workspaceFeedback={show:showFeedback};

window.WorkspaceFeedback=workspaceFeedback;
