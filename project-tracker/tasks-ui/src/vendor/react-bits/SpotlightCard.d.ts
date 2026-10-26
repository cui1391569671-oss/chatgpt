import type {HTMLAttributes,ReactElement} from 'react';
export type SpotlightShape = 'circle' | 'beam';
export type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  target?: HTMLElement;
  spotlightColor?: string;
  intensity?: number;
  spotlightSize?: number;
  softness?: number;
  shape?: SpotlightShape;
  borderGlow?: number;
  proximity?: number;
  smoothing?: number;
  ambient?: boolean;
  flare?: boolean;
  grain?: number;
  theme?: 'dark' | 'light';
};
declare const SpotlightCard: (props: SpotlightCardProps) => ReactElement;
export default SpotlightCard;
