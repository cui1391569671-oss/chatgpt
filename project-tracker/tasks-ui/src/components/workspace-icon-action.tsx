import type {ComponentProps} from 'react';
import type {LucideIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

export function WorkspaceIconButton({label,icon:Icon,className,onClick,...props}:Omit<ComponentProps<typeof Button>,'children'|'size'|'aria-label'> & {label:string;icon:LucideIcon;onClick:NonNullable<ComponentProps<typeof Button>['onClick']>}){
 return <Button type='button' variant='ghost' {...props} onClick={onClick} size='icon' aria-label={label} data-icon-label={label} className={cn('workspace-icon-action overflow-visible',className)}><Icon size={18} aria-hidden='true'/></Button>;
}
