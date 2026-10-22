import worker from '../../worker.mjs';
import {sessionCookie} from '../../auth.mjs';
export * from '../../worker.mjs';
// Exercise business routes using the production browser authentication path.
// Invalid credentials are left intact; only the fixture's matching credentials become a session.
export default {...worker,async fetch(request,env,...args){
 const basic=request.headers.get('Authorization');
 if(env?.TRACKER_USER&&env?.TRACKER_PASSWORD&&basic==='Basic '+btoa(env.TRACKER_USER+':'+env.TRACKER_PASSWORD)){
  const headers=new Headers(request.headers);headers.delete('Authorization');headers.set('Cookie',(await sessionCookie(env,false)).split(';')[0]);
  request=new Request(request,{headers});
 }
 return worker.fetch(request,env,...args);
}};
