import type {ComponentProps,ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {CircleHelp} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

export function WorkspaceIconButton({label,icon:Icon,className,onClick,...props}:Omit<ComponentProps<typeof Button>,'children'|'size'|'aria-label'> & {label:string;icon:LucideIcon;onClick:NonNullable<ComponentProps<typeof Button>['onClick']>}){
 return <Button type='button' variant='outline' {...props} onClick={onClick} size='icon' aria-label={label} data-icon-label={label} className={cn('workspace-icon-action overflow-visible',className)}><Icon size={18} aria-hidden='true'/></Button>;
}

export function WorkspaceHelp({label='操作帮助',children}: {label?:string;children:ReactNode}){
 return <details className='workspace-help'><summary className='workspace-icon-action' data-workspace-size='icon' data-icon-label={label} aria-label={label}><CircleHelp size={18} aria-hidden='true'/></summary><div className='workspace-help-content'>{children}</div></details>;
}
