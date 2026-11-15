import WakeSlider from '@/vendor/react-bits/WakeSlider';
import {useWorkspaceMotionOff} from '../workspace-motion-policy';

type Props={value:number|'';onValueChange:(value:number)=>void;label:string;disabled?:boolean;invalid?:boolean;descriptionId?:string};
export function WorkspaceWakeSlider({value,onValueChange,label,disabled=false,invalid=false,descriptionId}:Props){
 const motionOff=useWorkspaceMotionOff();
 return <div className='workspace-wake-slider'><WakeSlider value={value} onChange={onValueChange}
  min={0} max={100} step={1} bars={32} height={56} restHeight={12} gap={4}
  fillColor='var(--slider-fill)' trackColor='var(--slider-track)' sensitivity={1} reach={6} skew={.6} glide={.3} smoothing={100}
  showValue formatValue={number=>number+'%'} disabled={disabled} ariaLabel={label} motionOff={motionOff}
  handleProps={{'aria-invalid':invalid||undefined,'aria-describedby':descriptionId}}/></div>;
}
