const textEncoder=new TextEncoder();
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode=v=>{const bytes=new Uint8Array(v);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
export const newVaultSalt=()=>encode(crypto.getRandomValues(new Uint8Array(16)));
export function validVaultEnvelope(v){
 if(!v||Object.keys(v).sort().join(',')!=='ciphertext,iv,salt,v'||v.v!==1)return false;
 try{return typeof v.salt==='string'&&decode(v.salt).length===16&&typeof v.iv==='string'&&decode(v.iv).length===12&&typeof v.ciphertext==='string'&&v.ciphertext.length<=180000&&decode(v.ciphertext).length>=16;}catch{return false;}
}
export async function deriveVaultKey(password,salt){
 const material=await crypto.subtle.importKey('raw',textEncoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function validVaultRecords(records){
 const limits={id:100,type:20,label:80,holder:100,number:80,issuer:150,expiry:10,note:1000};
 return Array.isArray(records)&&records.length<=100&&new Set(records.map(x=>x?.id)).size===records.length&&records.every(x=>x&&Object.entries(limits).every(([k,max])=>typeof x[k]==='string'&&x[k].length<=max)&&x.id&&x.label.trim()&&x.number.trim()&&['passport','bank','identity','other'].includes(x.type)&&(!x.expiry||/^\d{4}-\d{2}-\d{2}$/.test(x.expiry)&&!Number.isNaN(Date.parse(x.expiry))&&new Date(x.expiry).toISOString().slice(0,10)===x.expiry));
}
export async function encryptVault(records,key,salt){
 if(!validVaultRecords(records))throw Error('资料格式不正确');
 const plain=textEncoder.encode(JSON.stringify(records));if(plain.length>130000)throw Error('资料总量过大，请缩短备注后重试。');
 const iv=crypto.getRandomValues(new Uint8Array(12)),ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode('personal-vault:v1')},key,plain);
 return {v:1,salt,iv:encode(iv),ciphertext:encode(ciphertext)};
}
export async function decryptVault(envelope,key){
 if(!validVaultEnvelope(envelope))throw Error('加密资料格式不正确');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv),additionalData:textEncoder.encode('personal-vault:v1')},key,decode(envelope.ciphertext));
 const records=JSON.parse(new TextDecoder().decode(plain));if(!validVaultRecords(records))throw Error('资料格式不正确');return records;
}
// Called only behind the Worker's authenticated route boundary.
export async function personalVaultRoute(request,env){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!['GET','PUT'].includes(request.method))return reply({error:'不支持的操作'},405);
 let payload;
 if(request.method==='PUT'){
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'请求来源不匹配，请重新打开工作台'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'请使用 JSON 请求'},415);
  const reader=request.body?.getReader();if(!reader)return reply({error:'缺少资料'},400);let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>190000){await reader.cancel();return reply({error:'资料过大'},413);}chunks.push(value);}
  try{const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}payload=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'资料格式不正确'},400);}
  if(!payload||Object.keys(payload).sort().join(',')!=='envelope,version'||!Number.isSafeInteger(payload.version)||payload.version<0||!validVaultEnvelope(payload.envelope))return reply({error:'加密资料格式不正确'},400);
 }
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS account_vault (owner TEXT PRIMARY KEY, envelope TEXT NOT NULL, version INTEGER NOT NULL)').run();
 if(request.method==='GET'){
  const row=await env.DB.prepare('SELECT envelope,version FROM account_vault WHERE owner=?').bind(env.TRACKER_USER).first();
  return reply(row?{envelope:JSON.parse(row.envelope),version:row.version}:{envelope:null,version:0});
 }
 const first=payload.version===0;
 const sql=first?'INSERT INTO account_vault (owner,envelope,version) VALUES (?,?,1) ON CONFLICT(owner) DO NOTHING':'UPDATE account_vault SET envelope=?,version=version+1 WHERE owner=? AND version=?';
 const args=first?[env.TRACKER_USER,JSON.stringify(payload.envelope)]:[JSON.stringify(payload.envelope),env.TRACKER_USER,payload.version];
 const result=await env.DB.prepare(sql).bind(...args).run();
 if(!result.meta?.changes)return reply({error:'资料已在其他页面更新。请先保留本次修改，再锁定并重新解锁后编辑。'},409);
 return reply({version:payload.version+1});
}
