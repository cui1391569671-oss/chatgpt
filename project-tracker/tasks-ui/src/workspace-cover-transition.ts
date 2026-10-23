// Shared visual continuity only: original editor owns focus, cancellation and persistence.
export function installCoverTransition(){
 let sourceId='',sourceUrl='',lastRect:DOMRect|null=null,sequence=0;
 let ghost:HTMLImageElement|null=null;
 const enabled=()=>document.body.dataset.motionLevel==='lavish'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clear=()=>{ghost?.remove();ghost=null;};
 const fly=(from:DOMRect,to:DOMRect,url:string)=>{
  clear();if(!enabled()||from.width<1||to.width<1)return;
  const image=new Image();image.src=url;image.alt='';image.setAttribute('aria-hidden','true');image.className='wb-cover-flight';Object.assign(image.style,{left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px'});document.body.append(image);ghost=image;
  const animation=image.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`,opacity:1},{transform:'none',opacity:1,offset:.85},{transform:'none',opacity:0}],{duration:580,easing:'cubic-bezier(.22,1,.36,1)'});
  animation.onfinish=()=>{image.remove();if(ghost===image)ghost=null;};
 };
 const click=(event:MouseEvent)=>{
  const button=(event.target as Element).closest<HTMLElement>('.media-wall-cover[data-id]');if(!button||!enabled())return;
  const image=button.querySelector('img');if(!image?.complete||!image.naturalWidth)return;
  sourceId=button.dataset.id||'';sourceUrl=image.currentSrc;const from=image.getBoundingClientRect(),current=++sequence;
  setTimeout(()=>{if(current!==sequence)return;const preview=document.querySelector<HTMLImageElement>('#editor[open] #gameCoverPreview');if(!preview||preview.classList.contains('hidden'))return;const to=preview.getBoundingClientRect();if(to.top<0||to.bottom>innerHeight)return;lastRect=to;fly(from,to,sourceUrl);},220);
 };
 const closing=(event:Event)=>{if((event.target as HTMLElement).id!=='editor'||!sourceId)return;++sequence;const source=Array.from(document.querySelectorAll<HTMLElement>('.media-wall-cover[data-id]')).find(el=>el.dataset.id===sourceId);const target=source?.querySelector('img');if(target&&lastRect&&sourceUrl&&target.getBoundingClientRect().bottom>0&&target.getBoundingClientRect().top<innerHeight)fly(lastRect,target.getBoundingClientRect(),sourceUrl);else clear();sourceId='';lastRect=null;};
 const cancel=(event:Event)=>{if((event.target as HTMLElement).id==='editor'){const preview=document.getElementById('gameCoverPreview');if(preview)lastRect=preview.getBoundingClientRect();}};
 document.addEventListener('click',click,true);document.addEventListener('close',closing,true);document.addEventListener('cancel',cancel,true);
 return()=>{++sequence;clear();document.removeEventListener('click',click,true);document.removeEventListener('close',closing,true);document.removeEventListener('cancel',cancel,true);};
}
