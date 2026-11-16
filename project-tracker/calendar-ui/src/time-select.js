import {selectVariables,moveSelectHighlight} from '../../tasks-ui/src/components/workspace-select-motion.mjs';

// Keep ilamy's searchable time values and React handlers; share Glide's presentation.
export function createCalendarTimeSelect(){
 const adapters=new Map();
 const motionOff=()=>document.body.dataset.motionLevel==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 function prune(){for(const [menu,adapter] of adapters)if(!menu.isConnected){adapter.dispose();adapters.delete(menu);}}
 function enhance(root){
  prune();
  for(const input of root.querySelectorAll('input[placeholder="Search time..."],input[data-workspace-time-search]')){
   const menu=input.closest('[data-slot=popover-content]');
   if(!menu||adapters.has(menu))continue;
   const trigger=[...document.querySelectorAll('button[aria-controls="time-picker-listbox"][aria-expanded=true]')].at(-1);
   if(!trigger)continue;
   const label=trigger.previousElementSibling?.textContent?.trim()||trigger.parentElement?.querySelector('label')?.textContent?.trim()||'选择时间';
   const selected=trigger.textContent.trim();
   trigger.setAttribute('aria-label',label);
   const abort=new AbortController(),signal=abort.signal;
   input.dataset.workspaceTimeSearch='';input.placeholder='搜索时间…';input.setAttribute('aria-label','搜索'+label);
   input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','true');
   menu.className='glide-select__menu workspace-time-select';
   menu.dataset.uiPortal='';menu.dataset.workspaceTimeMenu='';menu.dataset.slot='select-content';menu.setAttribute('role','presentation');
   for(const [key,value] of Object.entries(selectVariables))menu.style.setProperty(key,value);
   menu.style.setProperty('--gs-menu-w','var(--radix-popover-trigger-width)');
   menu.style.removeProperty('width');
   let active=null,list=null,pill=null;
   const rows=()=>[...menu.querySelectorAll('[data-radix-scroll-area-viewport] button')];
   const highlight=(row,instant=false)=>{
    active=row;list?.toggleAttribute('data-live',!!row);
    moveSelectHighlight(pill,row?row.offsetTop:null,{instant:instant||motionOff()});
    if(row)input.setAttribute('aria-activedescendant',row.id);else input.removeAttribute('aria-activedescendant');
   };
   const sync=()=>{
    const closing=menu.dataset.state==='closed';menu.inert=closing;menu.setAttribute('aria-hidden',String(closing));input.setAttribute('aria-expanded',String(!closing));
    const buttons=rows();
    list=buttons[0]?.parentElement||menu.querySelector('[data-radix-scroll-area-viewport] > div > div');
    if(!list)return;
    list.className='glide-select__list';list.setAttribute('role','listbox');
    if(!list.id)list.id='workspace-time-'+crypto.randomUUID();
    list.setAttribute('aria-label',label);input.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-controls',list.id);
    if(!pill||pill.parentElement!==list){pill=document.createElement('span');pill.className='glide-select__pill';pill.setAttribute('aria-hidden','true');list.prepend(pill);}
    for(const [index,button] of buttons.entries()){
     button.className='glide-select__option';button.setAttribute('role','option');button.tabIndex=-1;
     button.id=list.id+'-'+index;button.setAttribute('aria-selected',String(button.textContent.trim()===selected));
    }
    const empty=buttons.length?null:list.querySelector('div');if(empty&&empty.textContent==='N/A')empty.textContent='没有匹配的时间';
    highlight(buttons.includes(active)?active:buttons.find(button=>button.textContent.trim()===selected)||null,true);
   };
   sync();
   const viewport=menu.querySelector('[data-radix-scroll-area-viewport]');if(active&&viewport)viewport.scrollTop=active.offsetTop;
   const updateMotion=()=>{menu.toggleAttribute('data-motion-off',motionOff());if(active)highlight(active,true);};
   updateMotion();
   menu.addEventListener('pointerover',event=>{const row=event.target.closest('[role=option]');if(row&&list?.contains(row))highlight(row);},{signal});
   menu.addEventListener('pointerdown',event=>{if(event.target.closest('[role=option]'))event.preventDefault();},{signal});
   input.addEventListener('keydown',event=>{
    if(event.isComposing)return;
    const buttons=rows();let index=buttons.indexOf(active);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'||event.key==='End'){
     event.preventDefault();event.stopPropagation();
     index=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?Math.min(buttons.length-1,index+1):Math.max(0,index<0?buttons.length-1:index-1);
     highlight(buttons[index]||null,true);active?.scrollIntoView({block:'nearest'});
    }else if(event.key==='Enter'){
     event.preventDefault();event.stopPropagation();active?.click();
    }
   },{signal});
   const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',updateMotion,{signal});
   window.addEventListener('workspace-motion-change',updateMotion,{signal});
   const observer=new MutationObserver(sync);observer.observe(menu,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-state']});
   adapters.set(menu,{dispose(){abort.abort();observer.disconnect();trigger.setAttribute('aria-controls','time-picker-listbox');}});
  }
 }
 return {enhance,prune,dispose(){for(const adapter of adapters.values())adapter.dispose();adapters.clear();}};
}
