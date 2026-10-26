import {useEffect,useRef} from 'react';
import SpringCheck from '../vendor/react-bits/SpringCheck';
import {useWorkspaceMotionOff} from '../workspace-motion-policy';
const continuity=new Map<string,number>();
let lastFocused:object|null=null;
let lastFocusedKey:string|undefined;
type Props={motionKey?:string;checked:boolean;onChange:(checked:boolean)=>void;label?:string;ariaLabel:string;disabled?:boolean;strike?:'left'|'none';initialProgress?:number;onProgress?:(value:number)=>void;buttonRef?:(node:HTMLButtonElement|null)=>void;onFocus?:()=>void};
/** Completion only; selection and preference checkboxes retain their own semantics. */
export function WorkspaceCompletion(props:Props){
 const off=useWorkspaceMotionOff(),button=useRef<HTMLButtonElement|null>(null),identity=useRef({});
 useEffect(()=>{if(!props.disabled&&lastFocused===identity.current&&document.activeElement===document.body)button.current?.focus({preventScroll:true});},[props.disabled]);
 const remember=(value:number)=>{if(props.motionKey){continuity.set(props.motionKey,value);if(continuity.size>500)continuity.delete(continuity.keys().next().value!);}props.onProgress?.(value);};
 return <SpringCheck {...props} initialProgress={props.initialProgress??(props.motionKey?continuity.get(props.motionKey):undefined)} onProgress={remember} buttonRef={node=>{button.current=node;props.buttonRef?.(node);if(node&&props.motionKey&&lastFocusedKey===props.motionKey&&document.activeElement===document.body)node.focus({preventScroll:true});}} onFocus={()=>{lastFocused=identity.current;lastFocusedKey=props.motionKey;props.onFocus?.();}} label={props.label??''} strike={props.strike??(props.label?'left':'none')} motionOff={off} color='var(--semantic-text)' ringColor='var(--checkbox-border)' fillColor='var(--checkbox-checked-bg)' checkColor='var(--semantic-text-inverse)' boxSize={22} boxRadius={7} fontSize={14} doneOpacity={.65}/>;
}
