// Parent layers receive Escape before the portalled Select layer in mixed Radix versions.
// Close only the Select that owns the key target and leave the parent draft mounted.
export function closeSelectOnEscape(event: KeyboardEvent): boolean {
 if(event.defaultPrevented)return true;
 const target=event.target;
 if(!(target instanceof Element))return false;
 const trigger=target.closest('[data-slot="select-trigger"][aria-expanded="true"]');
 const controlled=trigger?.getAttribute('aria-controls');
 const content=target.closest('[data-slot="select-content"][data-state="open"]')
  ||(controlled?document.getElementById(controlled):null);
 if(!content?.matches('[data-slot="select-content"][data-state="open"]'))return false;
 event.preventDefault();
 content.dispatchEvent(new Event('workspace-select-close',{bubbles:true}));
 return true;
}
