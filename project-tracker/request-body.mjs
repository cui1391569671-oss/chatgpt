export class RequestBodyLimitError extends Error{constructor(){super('Too large');this.status=413;}}
export async function readBoundedBytes(request,limit){
 const declared=Number(request.headers.get('Content-Length'));
 if(Number.isFinite(declared)&&declared>limit)throw new RequestBodyLimitError();
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RequestBodyLimitError();}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function readBoundedText(request,limit){return new TextDecoder().decode(await readBoundedBytes(request,limit));}
