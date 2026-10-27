import {useLayoutEffect,useState} from 'react';
import {whenWorkspaceToolbarReady} from '../../../workspace-toolbar-host.js';
import {createPortal} from 'react-dom';
// The shell owns the position; each page retains its controls and state.
export function WorkspaceToolbar({children,className=''}){
 const [host,setHost]=useState(()=>document.getElementById('workspaceReactActions'));
 useLayoutEffect(()=>whenWorkspaceToolbarReady(setHost),[]);
 const toolbar=<div className={host?'wb-page-toolbar':className} role='toolbar' aria-label='页面操作'>{children}</div>;
 return host?createPortal(toolbar,host):toolbar;
}
