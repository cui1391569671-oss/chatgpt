import {readBoundedText,RequestBodyLimitError} from './request-body.mjs';
export const WORKSPACE_CSP_REPORT_ONLY=[
 "default-src 'self'","script-src 'self' 'unsafe-inline'","style-src 'self' 'unsafe-inline'",
 "img-src 'self' https: data: blob:","font-src 'self' data:","connect-src 'self'",
 "media-src 'self' blob:","frame-src 'self' https://docs.google.com https://drive.google.com",
 "object-src 'none'","base-uri 'self'","form-action 'self'",'report-uri /api/security/csp-report'
].join('; ');
function blockedOrigin(value){
 if(['inline','eval','self','none'].includes(value))return value;
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.origin:url.protocol;}catch{return 'unknown';}
}
export function summarizeCspReports(input){
 const reports=Array.isArray(input)?input:input&&typeof input==='object'?[input]:[];
 return reports.slice(0,20).filter(report=>report&&typeof report==='object'&&!Array.isArray(report))
 .map(report=>report['csp-report']||report.body)
 .filter(body=>body&&typeof body==='object'&&!Array.isArray(body)&&typeof (body['effective-directive']||body.effectiveDirective||body['violated-directive'])==='string').map(body=>({
  directive:String(body['effective-directive']||body.effectiveDirective||body['violated-directive']||'unknown').split(' ')[0].replace(/[^a-z-]/g,'').slice(0,80)||'unknown',
  blockedOrigin:blockedOrigin(body['blocked-uri']||body.blockedURL||''),
  disposition:body.disposition==='enforce'?'enforce':'report'
 }));
}
export async function cspReportRoute(request,logger=console.warn){
 const reply=(value,status)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!/^(application\/csp-report|application\/reports\+json|application\/json)(;|$)/i.test(request.headers.get('Content-Type')||''))return reply({error:'Invalid report type'},415);
 let input;try{input=JSON.parse(await readBoundedText(request,16384));}catch(error){return reply({error:error instanceof RequestBodyLimitError?'Too large':'Invalid report'},error instanceof RequestBodyLimitError?413:400);}
 const reports=summarizeCspReports(input);if(!reports.length)return reply({error:'Invalid report'},400);
 for(const report of reports)logger('workspace-csp-report',report);
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
}
