import type {FocusEventHandler} from 'react';
import GlideSelect from '@/vendor/react-bits/GlideSelect';
import {useWorkspaceMotionOff} from '../workspace-motion-policy';

type SelectValueType=string|number;
type WorkspaceSelectProps<T extends SelectValueType>={value:T;onValueChange:(value:NoInfer<T>)=>void;options:{value:NoInfer<T>;label:string;disabled?:boolean;tag?:string}[];label:string;id?:string;disabled?:boolean;onBlur?:FocusEventHandler<HTMLButtonElement>;invalid?:boolean;'aria-describedby'?:string;className?:string;menuWidth?:number|'trigger'};
export function WorkspaceSelect<T extends SelectValueType>({value,onValueChange,options,label,id,disabled=false,onBlur,invalid=false,'aria-describedby':description,className='',menuWidth=176}:WorkspaceSelectProps<T>){
 const off=useWorkspaceMotionOff();
 return <GlideSelect
  value={'v:'+String(value??'')} options={options.map(option=>({...option,value:'v:'+String(option.value)}))}
  onChange={next=>{const option=options.find(item=>'v:'+String(item.value)===next);if(option&&!option.disabled)onValueChange(option.value);}}
  ariaLabel={label} disabled={disabled} showTags size='lg' rowHeight={44} radius={10} menuWidth={menuWidth}
  placement='bottom' align='left' popDuration={180} glideDuration={220} rememberPosition motionOff={off}
  className={'ui-select-mount workspace-glide-select '+className}
  accentColor='var(--semantic-primary)' surfaceColor='var(--semantic-surface-elevated)'
  highlightColor='var(--semantic-primary-selected)' textColor='var(--semantic-text)'
  triggerProps={{id,onBlur,'aria-invalid':invalid||undefined,'aria-describedby':description,className:'ui-select workspace-select '+className}}
  style={{'--gs-radius':'var(--radius-md)','--gs-inner-radius':'var(--radius-sm)'}}/>;
}
