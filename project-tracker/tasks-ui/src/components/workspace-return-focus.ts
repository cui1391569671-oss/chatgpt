import {restoreFocusTarget} from '../../../focus-return.mjs';
type CloseFocusEvent={defaultPrevented:boolean;preventDefault:()=>void};
export function restoreWorkspaceFocus(event:CloseFocusEvent,resolvers:Array<(()=>HTMLElement|null|undefined)|undefined>){
 if(!event.defaultPrevented&&restoreFocusTarget(resolvers))event.preventDefault();
}
