/* exported enhanceWorkspaceAutocomplete */
// Shared DOM combobox adapter. The caller owns fetching and candidate markup.
function enhanceWorkspaceAutocomplete(input,list,onSelect,onSearch){
 input.setAttribute('data-workspace-autocomplete','');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.autocomplete='off';
 list.setAttribute('role','listbox');list.setAttribute('aria-label','作品名称联想');list.className='workspace-autocomplete-list';list.hidden=true;
 const wrapper=document.createElement('div');wrapper.className='workspace-autocomplete';input.before(wrapper);wrapper.append(input,list);
 let index=-1,items=[];
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1;};
 const activate=next=>{index=next;const options=[...list.querySelectorAll('[role=option]')];options.forEach((node,i)=>node.setAttribute('aria-selected',String(i===index)));if(options[index]){input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});}};
 const select=i=>{const item=items[i];if(!item)return;close();onSelect(item);input.focus({preventScroll:true});};
 const keydown=e=>{if(e.isComposing)return;if(['ArrowDown','ArrowUp'].includes(e.key)&&items.length){e.preventDefault();list.hidden=false;input.setAttribute('aria-expanded','true');activate(index<0?(e.key==='ArrowDown'?0:items.length-1):(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length);}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(!list.hidden&&index>=0)select(index);else onSearch();}else if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab')close();};
 const pointer=e=>{if(e.target.closest('[role=option]'))e.preventDefault();};
 const click=e=>{const option=e.target.closest('[role=option]');if(option)select(Number(option.dataset.choice));};
 const outside=e=>{if(!wrapper.contains(e.target))close();};
 input.addEventListener('workspace-autocomplete-close',close);input.addEventListener('keydown',keydown);list.addEventListener('pointerdown',pointer);list.addEventListener('click',click);document.addEventListener('pointerdown',outside);
 return {clear(){items=[];list.replaceChildren();close();},set(candidates,markup){items=candidates;index=-1;list.innerHTML=markup;list.querySelectorAll('[data-choice]').forEach((node,i)=>{node.id=list.id+'-option-'+i;node.setAttribute('role','option');node.setAttribute('aria-selected','false');node.tabIndex=-1;});list.hidden=!items.length;input.setAttribute('aria-expanded',String(!!items.length));},destroy(){input.removeEventListener('workspace-autocomplete-close',close);document.removeEventListener('pointerdown',outside);input.removeEventListener('keydown',keydown);}};
}
