import {createRoot} from 'react-dom/client';
import {Button} from '@/components/ui/button';
import {WorkspaceDateInput} from '@/components/workspace-date';
import {WorkspaceSelect} from '@/components/workspace-select';
import {WorkspaceSegment} from '@/components/workspace-segment';
import {ChevronLeft,ChevronRight} from 'lucide-react';
function CalendarControls({date,view,disabled,onDate,onView,previous,next,today,create,exportCalendar}){
 const items=[{value:'year',label:'年'},{value:'month',label:'月'},{value:'week',label:'周'},{value:'day',label:'日'},{value:'agenda',label:'列表'}];
 return <><Button variant='outline' aria-label='上一段时间' disabled={disabled} onClick={previous}><ChevronLeft size={16}/></Button><span className='wb-calendar-date'><WorkspaceDateInput aria-label='日历显示日期' value={date} disabled={disabled} onChange={event=>onDate(event.target.value)}/></span><Button variant='outline' aria-label='下一段时间' disabled={disabled} onClick={next}><ChevronRight size={16}/></Button><Button variant='outline' disabled={disabled} onClick={today}>今天</Button><div className='wb-calendar-view-wide'><WorkspaceSegment label='日历视图' value={view} items={items} disabled={disabled} onChange={onView}/></div><div className='wb-calendar-view-compact'><WorkspaceSelect label='日历视图' value={view} options={items} disabled={disabled} onValueChange={onView}/></div><Button variant='outline' disabled={disabled} onClick={exportCalendar}>导出日历</Button><Button disabled={disabled} onClick={create}>新建日程</Button></>;
}
export const workspaceCalendarControls={mount(host,props){const node=document.createElement('div');node.className='wb-page-toolbar';node.dataset.uiOwner='calendar-controls';host.append(node);const root=createRoot(node);root.render(<CalendarControls {...props}/>);return {update(next){root.render(<CalendarControls {...next}/>);},dispose(){root.unmount();node.remove();}};}};

window.WorkspaceCalendarControls=workspaceCalendarControls;
