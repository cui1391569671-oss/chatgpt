import {readBoundedText,RequestBodyLimitError} from './request-body.mjs';
import {GLASS_STYLE} from './glass-theme.mjs';
const encoder=new TextEncoder();
const COOKIE='__Host-tracker_session';
const LOGIN_STYLE=`*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;font:14px/1.6 Inter,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased}.card{width:100%;max-width:440px;border-radius:var(--radius-xl);padding:38px}h1{font-size:32px;letter-spacing:-1px;line-height:1.3;font-weight:600;margin:24px 0}.login-brand{display:inline-flex;align-items:center;gap:12px;color:var(--semantic-text);text-decoration:none;font-size:16px;font-weight:600;min-height:44px}.login-brand img{width:28px;height:28px}label{display:block;font-size:14px;margin:18px 0 6px}input:not([type=checkbox]),button{width:100%;font:inherit;border:1px solid var(--semantic-border);border-radius:var(--control-radius);height:var(--control-height);min-height:var(--control-height);padding:8px 14px}button{cursor:pointer;margin:22px 0 0}.remember{display:flex;gap:8px;align-items:center;min-height:44px;color:var(--semantic-text-muted)}.remember input{width:18px;height:18px;accent-color:var(--semantic-primary)}.error{color:var(--semantic-error-text);background:var(--semantic-error-subtle);padding:12px;border-radius:var(--radius-md)}@media(max-width:480px){body{padding:20px}.card{padding:28px 24px}h1{font-size:30px}}`;
const safeNext=value=>['/','/work','/personal','/projects'].includes(value)?value:'/work';
async function key(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([env.TRACKER_USER,env.TRACKER_PASSWORD]))),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
function decode(text){return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export async function sessionValid(request,env,now=Date.now()){
 const value=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return false;
 try{const [payload,sig,extra]=value.split('.');if(extra)return false;const data=JSON.parse(new TextDecoder().decode(decode(payload)));if(data.user!==env.TRACKER_USER||!Number.isSafeInteger(data.exp)||data.exp<=now||data.exp>now+31*86400000)return false;return await crypto.subtle.verify('HMAC',await key(env),decode(sig),encoder.encode(payload));}catch{return false;}
}
export async function sessionCookie(env,remember,now=Date.now()){
 const lifetime=(remember?30:1)*86400;const payload=encode(encoder.encode(JSON.stringify({user:env.TRACKER_USER,exp:now+lifetime*1000,nonce:crypto.randomUUID()})));const sig=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(payload))));return COOKIE+'='+payload+'.'+sig+'; Path=/; Secure; HttpOnly; SameSite=Lax'+(remember?'; Max-Age='+lifetime:'');
}
function baseLoginPage(next='/work',error='',csrf=''){
 const target=safeNext(next);
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录我的工作台</title><link rel="icon" href="/favicon.svg?v=workbench-daylight-1"><style>${LOGIN_STYLE}${GLASS_STYLE}</style></head><body class="glass-login"><main class="card"><h1>登录我的工作台</h1><form action="/auth/login" method="post"><input type="hidden" name="next" value="${target}"><input type="hidden" name="csrf" value="${csrf}"><label for="username">账号</label><input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="200"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1000"><label class="remember"><input type="checkbox" name="remember" value="yes" checked>保持登录 30 天</label>${error?'<p class="error" role="alert">'+error+'</p>':''}<button type="submit">登录</button></form></main></body></html>`;
}
export function loginPage(next='/work',error='',csrf=''){
 const brand='<a class="login-brand" href="/" aria-label="我的工作台首页"><img src="/favicon.svg?v=workbench-daylight-1" width="28" height="28" alt="">我的工作台</a>';
 return baseLoginPage(next,error,csrf).replace('<title>','<meta name="robots" content="noindex,nofollow"><title>').replace('<h1>登录我的工作台</h1>',brand+'<h1>登录</h1>');
}
export function loginResponse(next='/work',error='',status=200){
 const csrf=crypto.randomUUID();return new Response(loginPage(next,error,csrf),{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','X-Robots-Tag':'noindex, nofollow','Set-Cookie':'__Host-tracker_csrf='+csrf+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
export async function authenticationAttempt(request,env){
 const ip=request.headers.get('CF-Connecting-IP')||'unknown',bucket=Math.floor(Date.now()/600000),id=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode('session-upgrade-v2:'+ip+':'+bucket))));
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS login_attempts (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
  await env.DB.prepare('INSERT INTO login_attempts (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(id,(bucket+1)*600000).run();
  const attempts=await env.DB.prepare('SELECT count FROM login_attempts WHERE id=?').bind(id).first();
  if(!attempts||!Number.isSafeInteger(attempts.count))return 503;
  if(attempts.count>10)return 429;
  await env.DB.prepare('DELETE FROM login_attempts WHERE expires<?').bind(Date.now()-600000).run();
  return 200;
 }catch{return 503;}
}
export async function authRoute(request,env){
 const url=new URL(request.url),html=loginResponse;
 if(url.pathname==='/login'&&request.method==='GET')return html(url.searchParams.get('next'));
 if(!['/auth/login','/auth/logout'].includes(url.pathname))return null;
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const origin=request.headers.get('Origin');let sameReferer=false;try{sameReferer=new URL(request.headers.get('Referer')).origin===url.origin;}catch{sameReferer=false;}
 if(origin&&origin!=='null'&&origin!==url.origin)return html('/work','登录来源不匹配，请重新打开登录页。',403);
 if(url.pathname==='/auth/logout'&&origin!==url.origin&&!sameReferer)return html('/work','请重新打开工作台后退出登录。',403);
 if(url.pathname==='/auth/logout')return new Response(null,{status:303,headers:{Location:'/login','Set-Cookie':COOKIE+'=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0','Cache-Control':'no-store'}});
 if(!request.headers.get('Content-Type')?.includes('application/x-www-form-urlencoded'))return new Response('Invalid form',{status:415});
 let body;try{body=await readBoundedText(request,4096);}catch(e){if(e instanceof RequestBodyLimitError)return new Response('Too large',{status:413});throw e;}const form=new URLSearchParams(body),next=safeNext(form.get('next'));
 if(origin!==url.origin){const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-tracker_csrf='))?.split('=')[1];if(!token||!/^[-a-f0-9]{36}$/.test(token)||token!==form.get('csrf'))return html(next,'登录页面已过期，请在此页面重新登录。',403);}
 // Database-backed attempts keep the limit effective across Worker instances.
 const attempt=await authenticationAttempt(request,env);if(attempt!==200)return html(next,attempt===429?'尝试次数过多，请十分钟后再试。':'登录服务暂不可用，请稍后重试。',attempt);
 const entered=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([form.get('username'),form.get('password')]))),expected=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([env.TRACKER_USER,env.TRACKER_PASSWORD])));let diff=0;const a=new Uint8Array(entered),b=new Uint8Array(expected);for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return html(next,'账号或密码不正确。',401);
 return new Response(null,{status:303,headers:{Location:next,'Set-Cookie':await sessionCookie(env,form.get('remember')==='yes'),'Cache-Control':'no-store'}});
}
