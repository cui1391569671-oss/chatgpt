import type {ButtonHTMLAttributes,ReactElement} from 'react';
export type WakeSliderProps={value?:number|'';defaultValue?:number;onChange?:(value:number)=>void;min?:number;max?:number;step?:number;bars?:number;height?:number;restHeight?:number;gap?:number;fillColor?:string;trackColor?:string;crestColor?:string;sensitivity?:number;reach?:number;skew?:number;glide?:number;smoothing?:number;showValue?:boolean;formatValue?:(value:number)=>string;disabled?:boolean;ariaLabel?:string;className?:string;motionOff?:boolean;handleProps?:ButtonHTMLAttributes<HTMLButtonElement>};
export default function WakeSlider(props:WakeSliderProps):ReactElement;
export function snapWakeValue(value:number,min:number,max:number,step:number):number;
export function wakeChangeValue(next:number,current:number|'',min:number,max:number,step:number):number|undefined;
export function wakeKeyValue(key:string,value:number,min:number,max:number,step:number,rtl?:boolean):number|null;
