import React,{forwardRef} from 'react';
import {Input as GlassInput} from '@/vendor/shadcn-glass-ui/input-glass';
import {WorkspaceDateInput} from '@/components/workspace-date';
export const Input=forwardRef<any,React.InputHTMLAttributes<HTMLInputElement>>(function Input({type,...props},ref){return type==='date'?<WorkspaceDateInput ref={ref} {...props}/>:<GlassInput ref={ref} type={type} {...props}/>;});
