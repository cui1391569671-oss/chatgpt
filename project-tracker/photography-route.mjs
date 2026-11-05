import {readBoundedText,RequestBodyLimitError} from './request-body.mjs';
import {PHOTO_MAX_BYTES,PHOTO_THUMB_MAX_BYTES,PHOTO_MAX_EDGE,PHOTO_PAGE_SIZE,photoFields} from './photography.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const table='CREATE TABLE IF NOT EXISTS photography (id TEXT PRIMARY KEY, title TEXT NOT NULL, spot TEXT NOT NULL, shotOn TEXT NOT NULL, note TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, createdAt TEXT NOT NULL, version INTEGER NOT NULL, fingerprint TEXT NOT NULL, image BLOB NOT NULL, thumbnail BLOB NOT NULL)';
const columns='id,title,spot,shotOn,note,width,height,createdAt,version';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function jpeg(value,limit){
 if(typeof value!=='string'||value.length>Math.ceil(limit/3)*4||!value.length||value.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))return null;
 let bytes;try{bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{return null;}
 return bytes.length<=limit&&bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217?bytes:null;
}
export async function photographyRoute(request,env){
 const url=new URL(request.url),parts=url.pathname.split('/').slice(3),id=parts[0];
 if(url.searchParams.get('scope')!=='personal')return reply({error:'摄影仅在私人工作台使用'},403);
 if(parts.length>2||id&&!uuid.test(id)||parts[1]&&!['image','thumbnail'].includes(parts[1]))return reply({error:'没有找到照片'},404);
 if(!['GET','POST','PATCH','DELETE'].includes(request.method))return reply({error:'不支持的操作'},405);
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return reply({error:'请求来源无效'},403);
 if(request.method==='GET'&&!id){
  await env.DB.prepare(table).run();
  const spot=(url.searchParams.get('spot')||'').slice(0,80),query=(url.searchParams.get('q')||'').slice(0,200),requested=Number(url.searchParams.get('page')||1),pageNumber=Number.isSafeInteger(requested)&&requested>0?Math.min(requested,10000):1;
  const where=" WHERE (?='' OR spot=?) AND (?='' OR instr(lower(title||' '||spot||' '||note),lower(?))>0)",args=[spot,spot,query,query];
  const count=await env.DB.prepare('SELECT count(*) AS total FROM photography'+where).bind(...args).first(),total=Number(count?.total||0),page=Math.min(pageNumber,Math.max(1,Math.ceil(total/PHOTO_PAGE_SIZE)));
  const rows=await env.DB.prepare('SELECT '+columns+' FROM photography'+where+' ORDER BY CASE WHEN shotOn=\'\' THEN substr(createdAt,1,10) ELSE shotOn END DESC,createdAt DESC,id LIMIT ? OFFSET ?').bind(...args,PHOTO_PAGE_SIZE,(page-1)*PHOTO_PAGE_SIZE).all();
  const spots=await env.DB.prepare('SELECT DISTINCT spot FROM photography ORDER BY spot LIMIT 1000').all();
  return reply({items:rows.results,total,page,pageSize:PHOTO_PAGE_SIZE,spots:spots.results.map(r=>r.spot)});
 }
 if(request.method==='GET'&&id&&parts[1]){
  await env.DB.prepare(table).run();const row=await env.DB.prepare('SELECT '+parts[1]+' AS bytes FROM photography WHERE id=?').bind(id).first();
  if(!row)return reply({error:'照片已删除'},404);
  return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(parts[1]||request.method==='GET'||request.method==='POST'&&id||request.method!=='POST'&&!id)return reply({error:'不支持的操作'},405);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'需要JSON数据'},415);
 let value;try{value=JSON.parse(await readBoundedText(request,1500000));}catch(e){return reply({error:e instanceof RequestBodyLimitError?'照片过大，请重新压缩':'无法读取照片数据'},e instanceof RequestBodyLimitError?413:400);}
 if(!value||typeof value!=='object'||Array.isArray(value))return reply({error:'照片数据无效'},400);
 if(request.method==='POST'){
  const fields=photoFields(value),image=jpeg(value.image,PHOTO_MAX_BYTES),thumbnail=jpeg(value.thumbnail,PHOTO_THUMB_MAX_BYTES);
  if(!fields||!uuid.test(value.id||'')||!image||!thumbnail||![value.width,value.height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=PHOTO_MAX_EDGE))return reply({error:'请检查照片格式、拍摄地点及日期'},400);
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...fields,image:value.image,thumbnail:value.thumbnail,width:value.width,height:value.height})))),b=>b.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare(table).run();
  await env.DB.prepare('INSERT INTO photography (id,title,spot,shotOn,note,width,height,createdAt,version,fingerprint,image,thumbnail) VALUES (?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING').bind(value.id,fields.title,fields.spot,fields.shotOn,fields.note,value.width,value.height,new Date().toISOString(),fingerprint,Array.from(image),Array.from(thumbnail)).run();
  const row=await env.DB.prepare('SELECT '+columns+',fingerprint FROM photography WHERE id=?').bind(value.id).first();
  if(row.fingerprint!==fingerprint)return reply({error:'照片标识已存在，请重新选择照片'},409);
  delete row.fingerprint;return reply({item:row});
 }
 if(!Number.isSafeInteger(value?.version)||value.version<1)return reply({error:'照片版本无效，请刷新后重试'},400);
 const fields=request.method==='PATCH'?photoFields(value):null;
 if(request.method==='PATCH'&&!fields)return reply({error:'请输入照片名称、拍摄地点和有效日期'},400);
 await env.DB.prepare(table).run();
 const result=request.method==='PATCH'?await env.DB.prepare('UPDATE photography SET title=?,spot=?,shotOn=?,note=?,version=version+1 WHERE id=? AND version=?').bind(fields.title,fields.spot,fields.shotOn,fields.note,id,value.version).run():await env.DB.prepare('DELETE FROM photography WHERE id=? AND version=?').bind(id,value.version).run();
 if(!result.meta?.changes){const row=await env.DB.prepare('SELECT id FROM photography WHERE id=?').bind(id).first();if(!row&&request.method==='DELETE')return reply({ok:true});return reply({error:row?'照片已在其他设备修改，请刷新后重试':'照片已删除'},409);}
 return reply({ok:true});
}
