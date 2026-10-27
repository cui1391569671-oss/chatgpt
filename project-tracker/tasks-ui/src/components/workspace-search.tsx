import {useRef} from 'react';
import {Search,X} from 'lucide-react';
import {Input} from '@/components/ui/input';
export function WorkspaceSearch({value,onValueChange,label,placeholder,className=''}){
 const ref=useRef<HTMLInputElement>(null);
 return <div className={'workspace-search '+className}><Search size={16} aria-hidden='true'/><Input ref={ref} aria-label={label} placeholder={placeholder} value={value} onChange={e=>onValueChange(e.target.value)}/><button type='button' className='workspace-search-clear' aria-label={'清空'+label} hidden={!value} onClick={()=>{onValueChange('');ref.current?.focus();}}><X size={16}/></button></div>;
}
export function enhanceWorkspaceSearch(input:HTMLInputElement){
 if(input.dataset.workspaceSearch!==undefined||input.closest('[data-tasks-root],[data-ui-owner]')||input.closest('[data-shell-root]')&&!input.closest('#workspaceNativeActions'))return;
 input.dataset.workspaceSearch='';const wrap=document.createElement('div');wrap.className='workspace-search';input.before(wrap);wrap.append(input);
 const makeIcon=kind=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('aria-hidden','true');svg.innerHTML=kind==='search'?'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>':'<path d="m18 6-12 12M6 6l12 12"/>';return svg;};
 const icon=makeIcon('search');wrap.prepend(icon);
 const clear=document.createElement('button');clear.type='button';clear.className='workspace-search-clear';clear.setAttribute('aria-label','清空'+(input.getAttribute('aria-label')||'搜索'));clear.append(makeIcon('clear'));wrap.append(clear);
 const sync=()=>{clear.hidden=!input.value;};input.addEventListener('input',sync);input.addEventListener('change',sync);sync();
 clear.addEventListener('click',()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));if(input.isConnected)input.focus();else document.getElementById(input.id)?.focus();});
}
