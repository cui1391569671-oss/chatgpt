import {createRoot,type Root} from 'react-dom/client';
import FoldText from './vendor/react-bits/FoldText';
import {useWorkspaceMotionOff} from './workspace-motion-policy';

function HomeFoldTitle({heading,text,english,revealed}:{heading:HTMLElement;text:string;english:boolean;revealed:boolean}){
 const off=useWorkspaceMotionOff();
 if(!english)return <>{text}</>;
 return <FoldText text={text} foldStyle='paper' splitBy='char' hinge='top' trigger='scroll'
  foldAngle={92} duration={.65} stagger={.045} staggerFrom='start' ease='power3.out' loopDelay={1.4}
  hoverRefold refoldRadius={140} refoldAngle={45} perspective={700} creaseShading={.55}
  fontSize='var(--workspace-title-size)' fontWeight='var(--workspace-title-weight)' color='var(--semantic-text)'
  container={heading.closest<HTMLElement>('#content')||undefined} motionOff={off} initiallyRevealed={revealed}/>;
}

const roots=new Map<HTMLElement,{root:Root;text:string;english:boolean}>();
const shown=new Set<string>();let view=document.body?.dataset?.workspaceView||'home';
const syncVisit=()=>{const next=document.body?.dataset?.workspaceView||'home';if(next!==view){shown.clear();view=next;}};
function render(heading:HTMLElement,text:string,english:boolean){
 syncVisit();
 const previous=roots.get(heading);if(previous?.text===text&&previous.english===english)return true;
 heading.dataset.uiRoot='';heading.dataset.uiOwner='home-fold-title';
 const root=previous?.root||createRoot(heading);roots.set(heading,{root,text,english});
 const revealed=shown.has(text);if(english)shown.add(text);
 root.render(<HomeFoldTitle heading={heading} text={text} english={english} revealed={revealed}/>);return true;
}
const prune=()=>{syncVisit();for(const [heading,entry] of roots)if(!heading.isConnected){entry.root.unmount();roots.delete(heading);}};
const observer=new MutationObserver(prune);
const observe=()=>{observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-workspace-view']});prune();};
if(document.body)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
window.addEventListener('pagehide',event=>{observer.disconnect();if(!event.persisted){for(const entry of roots.values())entry.root.unmount();roots.clear();}});
window.addEventListener('pageshow',observe);
window.WorkspaceHomeFoldText={render};

declare global{interface Window{WorkspaceHomeFoldText?:{render:(heading:HTMLElement,text:string,english:boolean)=>boolean};}}
