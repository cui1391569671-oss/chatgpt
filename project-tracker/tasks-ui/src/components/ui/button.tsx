// Application variants share the same semantic appearance across React and native adapters.
import {forwardRef} from 'react';
import {cn} from '@/lib/utils';
import {ButtonGlass,type ButtonGlassProps} from '@/vendor/shadcn-glass-ui/button-glass';
export const Button=forwardRef<HTMLButtonElement,ButtonGlassProps>(function Button({variant='default',size='default',className,...props},ref){return <ButtonGlass ref={ref} size={size} data-workspace-size={size} className={cn((size==='default'||size==='sm'||size==='icon')&&'h-[var(--control-height)] min-w-[var(--control-height)] px-[var(--control-button-padding-x)] py-0 leading-[var(--control-line-height)]',size==='icon'&&'w-[var(--control-height)] p-0',className)} variant={variant==='outline'?'secondary':variant} {...props}/>;});
export {buttonGlassVariants as buttonVariants} from '@/vendor/shadcn-glass-ui/button-glass-variants';
