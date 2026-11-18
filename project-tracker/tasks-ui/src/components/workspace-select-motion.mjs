// Shared motion/theme contract for React and DOM-owned searchable selects.
export const selectMotion={pop:180,exit:120,glide:220};
export const selectVariables={
 '--gs-accent':'var(--semantic-primary)','--gs-surface':'var(--semantic-surface-elevated)',
 '--gs-highlight':'var(--semantic-primary-selected)','--gs-text':'var(--semantic-text)',
 '--gs-row':'44px','--gs-font':'14px','--gs-radius':'var(--radius-md)',
 '--gs-inner-radius':'var(--radius-sm)','--gs-pop':selectMotion.pop+'ms',
 '--gs-pop-out':selectMotion.exit+'ms','--gs-glide':selectMotion.glide+'ms',
 '--gs-origin':'var(--radix-popover-content-transform-origin)',
 // Select surfaces are opaque; avoid a second backdrop layer during scaling.
 '--workspace-select-backdrop':'none'
};
export function moveSelectHighlight(pill,offset,{instant=false}={}){
 if(!pill)return;
 if(offset===null){pill.style.opacity='0';return;}
 const jump=instant||pill.style.opacity!=='1';
 pill.style.transitionDuration=jump?'0ms, 150ms':'';
 pill.style.transform=`translateY(${offset}px)`;
 pill.style.opacity='1';
}
// Scroll only the menu: scrollIntoView can move its parent dialog and iframe.
export function revealSelectOption(menu,option){
 if(!menu||!option||!menu.clientHeight)return;
 const bounds=menu.getBoundingClientRect(),row=option.getBoundingClientRect();
 const scale=menu.offsetHeight?bounds.height/menu.offsetHeight:1;
 if(!scale)return;
 const top=(row.top-bounds.top)/scale-menu.clientTop+menu.scrollTop;
 const bottom=top+row.height/scale;
 if(top<menu.scrollTop)menu.scrollTop=Math.max(0,top);
 else if(bottom>menu.scrollTop+menu.clientHeight)menu.scrollTop=bottom-menu.clientHeight;
}
