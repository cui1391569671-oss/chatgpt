import {useEffect,useRef,useState,type FocusEventHandler} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
type SelectValueType=string|number;
type WorkspaceSelectProps<T extends SelectValueType>={value:T;onValueChange:(value:NoInfer<T>)=>void;options:{value:NoInfer<T>;label:string;disabled?:boolean}[];label:string;id?:string;disabled?:boolean;onBlur?:FocusEventHandler<HTMLButtonElement>;invalid?:boolean;className?:string};
export function WorkspaceSelect<T extends SelectValueType>({value,onValueChange,options,label,id,disabled=false,onBlur,invalid=false,className=''}:WorkspaceSelectProps<T>){
 const [open,setOpen]=useState(false),content=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=event=>{if(event.target===content.current)setOpen(false);};document.addEventListener('workspace-select-close',close);return()=>document.removeEventListener('workspace-select-close',close);},[]);
 return <Select open={open} onOpenChange={setOpen} value={'v:'+String(value??'')} onValueChange={v=>onValueChange(options.find(option=>String(option.value)===v.slice(2))?.value ?? value)} disabled={disabled}><SelectTrigger id={id} aria-label={label} aria-invalid={invalid||undefined} onBlur={onBlur} className={'ui-select '+className}><SelectValue/></SelectTrigger><SelectContent ref={content} className='ui-select-content' position='popper'>{options.map(option=><SelectItem key={String(option.value)} value={'v:'+String(option.value)} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
