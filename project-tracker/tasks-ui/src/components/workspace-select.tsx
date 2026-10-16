import React from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
export function WorkspaceSelect({value,onValueChange,options,label,id,disabled=false,onBlur,invalid=false,className=''}){
 return <Select value={'v:'+String(value??'')} onValueChange={v=>onValueChange(v.slice(2))} disabled={disabled}><SelectTrigger id={id} aria-label={label} aria-invalid={invalid||undefined} onBlur={onBlur} className={'ui-select '+className}><SelectValue/></SelectTrigger><SelectContent className='ui-select-content' position='popper'>{options.map(option=><SelectItem key={String(option.value)} value={'v:'+String(option.value)} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
