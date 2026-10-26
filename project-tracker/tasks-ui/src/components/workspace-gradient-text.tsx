import type {ReactNode} from 'react';
import GradientText from '../vendor/react-bits/GradientText';

// Shared app treatment for homepage headings and sidebar names.
export function WorkspaceGradientText({children,target}:{children?:ReactNode;target?:HTMLElement}){
 return <GradientText target={target} colors={['var(--heading-gradient-start)','var(--heading-gradient-middle)','var(--heading-gradient-end)']} animationSpeed={8} variant='flow' glow={.4}>{children}</GradientText>;
}
