import type {ReactElement} from 'react';
export type GlideOption={value:string;label:string;tag?:string;disabled?:boolean};
type GlideSelectProps={options?:Array<string|GlideOption>;value?:string;defaultValue?:string;onChange?:(value:string,option:GlideOption)=>void;[name:string]:unknown};
export default function GlideSelect(props:GlideSelectProps):ReactElement;
