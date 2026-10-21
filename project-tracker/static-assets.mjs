// Immutable module assets share a digest within each Worker isolate.
const fingerprints=new Map();
export async function staticAssetResponse(request,path,content){
 if(!fingerprints.has(path))fingerprints.set(path,crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)).then(bytes=>'"'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')+'"'));
 const etag=await fingerprints.get(path);
 const headers={
  'Content-Type':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/plain; charset=utf-8',
  'Cache-Control':'private, max-age=0, must-revalidate',
  'ETag':etag,
  'Vary':'Cookie, Authorization',
  'X-Content-Type-Options':'nosniff'
 };
 const candidates=request.headers.get('If-None-Match')?.split(',').map(value=>value.trim().replace(/^W\//,''))||[];
 if(candidates.includes('*')||candidates.includes(etag))return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:content,{headers});
}
