import {eventOccurrencesOn} from './event-recurrence.mjs';

const DAY=86400000;
export const BARK_DEFAULTS={work:true,personal:true,tasks:true,events:true,projects:true};
export const beijingDate=now=>new Date(now+28800000).toISOString().slice(0,10);
const instant=value=>Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:value+'+08:00');
export function barkCandidates(state,external=[],now=Date.now()){
 const date=beijingDate(now),morning=instant(date+'T09:00'),items=[];
 const add=(key,scope,kind,due,title,body,path)=>{if(Number.isFinite(due)&&due<=now&&due>now-30*60000)items.push({key,scope,kind,due,title,body:body.slice(0,1200),path});};
 for(const [scope,field] of [['work','workWorkspace'],['personal','workspace']]){
  const workspace=state[field]||{},tasks=(workspace.tasks||[]).filter(t=>!t.done&&t.dueDate);
  for(const task of tasks.filter(t=>t.dueDate===date))add('task:'+scope+':'+task.id+':'+date,scope,'tasks',morning,'待办今天到期',task.title,`/${scope}?view=tasks&task=${encodeURIComponent(task.id)}`);
  const overdue=tasks.filter(t=>t.dueDate<date);
  if(overdue.length)add('overdue:'+scope+':'+date,scope,'tasks',morning,`${overdue.length} 项待办已逾期`,overdue.slice(0,5).map(t=>t.title).join('；'),`/${scope}?view=tasks`);
  for(const offset of [-1,0,1]){
   const day=beijingDate(now+offset*DAY);
   for(const source of ['events',...(scope==='work'?['dingtalk']:[])]){
    const events=source==='events'?eventOccurrencesOn(day,workspace.events||[]):external.filter(e=>e.start.slice(0,10)===day);
    for(const event of events){
     if(event.done)continue;
     const start=instant(event.start),due=event.allDay?instant(event.start.slice(0,10)+'T09:00'):start-15*60000;
     const params=new URLSearchParams({view:'calendar',event:event.id,date:event.start.slice(0,10),source});
     add(`event:${scope}:${source}:${event.id}:${event.start}`,scope,'events',due,event.allDay?'今天的全天日程':'日程即将开始',event.title,`/${scope}?${params}`);
    }
   }
  }
 }
 const problems=(state.data||[]).filter(x=>!x.done&&x.status!=='已完成'&&(x.status==='暂停'||x.plannedDate&&x.plannedDate<=date));
 if(problems.length){const one=problems.length===1?problems[0]:null;add('projects:'+date,'work','projects',morning,`${problems.length} 项项目问题需关注`,problems.slice(0,5).map(x=>`${x.project}：${x.task}${x.status==='暂停'?'（暂停）':x.plannedDate<date?'（逾期）':'（今天到期）'}`).join('；'),one?'/projects?issue='+encodeURIComponent(one.id):'/projects');}
 return [...new Map(items.map(x=>[x.key,x])).values()];
}

export function barkDeviceKey(value){
 if(typeof value!=='string'||value.length>1000)throw new Error('请填写 Bark 中复制的推送地址');
 let url;try{url=new URL(value.trim());}catch{throw new Error('推送地址格式无效');}
 const key=url.pathname.split('/')[1];
 if(url.origin!=='https://api.day.app'||url.username||url.password||url.search||url.hash||!/^[-_a-zA-Z0-9]{8,200}$/.test(key||'')||url.pathname.split('/').slice(2).some(Boolean))throw new Error('请使用 https://api.day.app/设备密钥 格式的官方 Bark 地址');
 return key;
}
const enc=new TextEncoder(),base64=b=>btoa(String.fromCharCode(...b)),bytes=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
async function encryptionKey(secret){if(typeof secret!=='string'||secret.length<32)throw new Error('Bark encryption unavailable');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(secret)),'AES-GCM',false,['encrypt','decrypt']);}
export async function sealBarkKey(value,secret,owner){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(owner)},await encryptionKey(secret),enc.encode(value));return JSON.stringify({iv:base64(iv),data:base64(new Uint8Array(encrypted))});}
export async function unsealBarkKey(envelope,secret,owner){const value=JSON.parse(envelope);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv),additionalData:enc.encode(owner)},await encryptionKey(secret),bytes(value.data)));}

// A missing response can mean APNS already accepted the message. Do not retry it.
export async function deliverBark(deviceKey,message,fetcher=fetch){
 try{
  const response=await fetcher('https://api.day.app/push',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({device_key:deviceKey,title:message.title,body:message.body,url:message.url,group:'我的工作台',isArchive:'1'})});
  if(response.status>=300&&response.status<400)return 'failed';
  let result;try{result=await response.json();}catch{return 'uncertain';}
  if(response.ok&&result.code===200)return 'sent';
  if(response.status===429||result.code===429)return 'retry';
  if(response.status>=500)return 'uncertain';
  return 'failed';
 }catch{return 'uncertain';}
}
