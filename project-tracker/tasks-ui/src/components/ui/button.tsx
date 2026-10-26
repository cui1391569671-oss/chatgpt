// Application variants share the same semantic appearance across React and native adapters.
import {forwardRef} from 'react';
import {ButtonGlass,type ButtonGlassProps} from '@/vendor/shadcn-glass-ui/button-glass';
export const Button=forwardRef<HTMLButtonElement,ButtonGlassProps>(function Button({variant='default',size='default',...props},ref){return <ButtonGlass ref={ref} size={size} data-workspace-size={size} variant={variant==='outline'?'secondary':variant} {...props}/>;});
export {buttonGlassVariants as buttonVariants} from '@/vendor/shadcn-glass-ui/button-glass-variants';
