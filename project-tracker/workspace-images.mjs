import {readBoundedBytes,RequestBodyLimitError} from './request-body.mjs';
function validImages(images,scope,namespace){return images===undefined||Array.isArray(images)&&images.length<=4&&new Set(images).size===images.length&&images.every(url=>typeof url==='string'&&new RegExp('^/api/'+namespace+'-images/'+(scope||'(work|personal)')+'/[a-f0-9-]{36}$').test(url));}
async function imagesRoute(request,env,namespace){
 const table=namespace==='note'?'note_images':'calendar_images';
 const url=new URL(request.url),parts=url.pathname.split('/'),scope=parts[3],id=parts[4];if(!['work','personal'].includes(scope))return Response.json({error:'Invalid scope'},{status:400});
 if(request.method==='POST'&&!id){
  if(request.headers.get('Origin')!==url.origin)return Response.json({error:'Invalid origin'},{status:403});
  if(request.headers.get('Content-Type')!=='image/jpeg')return Response.json({error:'JPEG required'},{status:415});
  if(Number(request.headers.get('Content-Length'))>240000)return Response.json({error:'Too large'},{status:413});
  let bytes;try{bytes=await readBoundedBytes(request,240000);}catch(e){if(e instanceof RequestBodyLimitError)return Response.json({error:'Too large'},{status:413});throw e;}if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return Response.json({error:'Invalid image'},{status:400});
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS '+table+' (id TEXT PRIMARY KEY, scope TEXT NOT NULL, bytes BLOB NOT NULL)').run();const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO '+table+' (id,scope,bytes) VALUES (?,?,?)').bind(id,scope,Array.from(bytes)).run();return Response.json({image:'/api/'+namespace+'-images/'+scope+'/'+id},{headers:{'Cache-Control':'no-store'}});
 }
 if(request.method==='GET'&&/^[a-f0-9-]{36}$/.test(id||'')){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS '+table+' (id TEXT PRIMARY KEY, scope TEXT NOT NULL, bytes BLOB NOT NULL)').run();const item=await env.DB.prepare('SELECT bytes FROM '+table+' WHERE id=? AND scope=?').bind(id,scope).first();if(!item)return new Response('Not found',{status:404});return new Response(new Uint8Array(item.bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
 }
 return new Response('Not found',{status:404});
}

export const validEventImages=(images,scope)=>validImages(images,scope,'calendar');
export const validNoteImages=(images,scope)=>validImages(images,scope,'note');
export const calendarImagesRoute=(request,env)=>imagesRoute(request,env,'calendar');
export const noteImagesRoute=(request,env)=>imagesRoute(request,env,'note');
