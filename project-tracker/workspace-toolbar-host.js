// A page may render before the React shell. Connect once when its stable slot
// exists, and stop observing on success or page disposal.
export function whenWorkspaceToolbarReady(onReady,{
 getHost=()=>document.getElementById('workspaceReactActions'),
 observe=callback=>{const observer=new MutationObserver(callback);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();}
}={}){
 let finished=false,stopObserving=null;
 const disconnect=()=>{const stop=stopObserving;stopObserving=null;stop?.();};
 const check=()=>{if(finished)return;const host=getHost();if(!host)return;finished=true;disconnect();onReady(host);};
 check();
 if(!finished){stopObserving=observe(check);if(finished)disconnect();}
 return()=>{finished=true;disconnect();};
}
