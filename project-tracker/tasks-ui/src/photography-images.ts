import {PHOTO_MAX_BYTES,PHOTO_THUMB_MAX_BYTES,PHOTO_MAX_EDGE} from '../../photography.mjs';
export function validatePhotoFile(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return '请选择 JPG、PNG 或 WebP 照片；HEIC 请先导出为 JPG。';
 if(!file.size||file.size>30000000)return '单张照片需大于0字节且不超过30 MB。';
 return '';
}
async function encode(bitmap:ImageBitmap,maxEdge:number,maxBytes:number){
 const canvas=document.createElement('canvas');
 try{
  for(let edge=maxEdge;edge>=Math.min(400,maxEdge/2);edge=Math.floor(edge*.8)){
   const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器暂时无法处理照片，请重新打开页面。');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.9,.8,.7,.6]){
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('照片压缩失败，请重新选择。')),'image/jpeg',quality));
    if(blob.size<=maxBytes){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {data:btoa(binary),width:canvas.width,height:canvas.height};}
   }
  }
  throw Error('照片压缩后仍过大，请裁剪后重新选择。');
 }finally{canvas.width=0;canvas.height=0;}
}
export async function preparePhoto(file:File){
 const invalid=validatePhotoFile(file);if(invalid)throw Error(invalid);
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('无法读取这张照片，请导出为 JPG 后重试。');}
 try{
  if(bitmap.width*bitmap.height>100000000)throw Error('照片像素过大，请缩小后重试。');
  const image=await encode(bitmap,PHOTO_MAX_EDGE,PHOTO_MAX_BYTES),thumbnail=await encode(bitmap,480,PHOTO_THUMB_MAX_BYTES);
  return {image:image.data,thumbnail:thumbnail.data,width:image.width,height:image.height};
 }finally{bitmap.close();}
}
