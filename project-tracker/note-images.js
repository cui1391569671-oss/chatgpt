// Native note editor adapter; records and lifecycle remain owned by the shared editor.
let noteImageEditor=null;
export function noteImageFields(images=[]){
 return '<section class="workspace-note-attachments" aria-label="笔记照片"><label for="noteImages">照片（最多 4 张）</label><input id="noteImages" type="file" accept="image/jpeg,image/png,image/webp" multiple data-file-trigger-label="插入照片" aria-describedby="noteImageHint"><input type="hidden" id="noteImageRefs" name="images" value="'+esc(JSON.stringify(images))+'"><p id="noteImageHint" class="muted">支持 JPG、PNG、WebP，单张不超过 10MB；也可在正文中粘贴照片。</p><p id="noteImageStatus" role="status" aria-live="polite"></p><div id="noteImagePreviews" class="workspace-note-photos"></div></section>';
}
function updateNoteImages(context){
 if(noteImageEditor!==context)return;
 $('noteImageRefs').value=JSON.stringify(context.images);
 $('noteImages').disabled=context.pending||context.images.length>=4;
 $('noteImagePreviews').innerHTML=context.images.map((url,i)=>'<figure><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="查看笔记照片 '+(i+1)+'"><img src="'+esc(url)+'" alt="笔记照片 '+(i+1)+'"></a><button class="btn" type="button" data-remove-note-image="'+i+'" '+(context.pending?'disabled':'')+'>移除照片 '+(i+1)+'</button></figure>').join('');
}
export function noteImagesPending(){return !!noteImageEditor?.pending;}
export function destroyNoteImages(){noteImageEditor?.controller.abort();noteImageEditor=null;}
export function initNoteImages(item){
 destroyNoteImages();
 const context={images:[...(item.images||[])],pending:false,controller:new AbortController()};noteImageEditor=context;
 const {signal}=context.controller;
 const status=message=>{if(noteImageEditor===context)$('noteImageStatus').textContent=message;};
 async function upload(files){
  if(!files.length||busy)return;
  if(context.pending){status('照片正在上传，请稍候。');return;}
  if(context.images.length+files.length>4){status('每篇笔记最多插入 4 张照片。');return;}
  context.pending=true;updateNoteImages(context);status('正在处理并上传照片…');
  try{
   for(const file of files){
    const blob=await compressWorkspaceImage(file);if(signal.aborted)return;
    const response=await fetch('/api/note-images/'+scope,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob,signal});
    if(!response.ok)throw Error('照片上传失败，请重试（'+response.status+'）。');
    const result=await response.json();if(signal.aborted)return;
    if(typeof result.image!=='string'||!new RegExp('^/api/note-images/'+scope+'/[a-f0-9-]{36}$').test(result.image))throw Error('照片上传结果无效，请重试。');
    context.images.push(result.image);
   }
   status('照片已添加，保存笔记后保留。');
  }catch(error){if(!signal.aborted)status(error.message||'照片上传失败，请重试。');}
  finally{context.pending=false;updateNoteImages(context);}
 }
 $('noteImages').addEventListener('change',event=>{const files=[...event.target.files];event.target.value='';upload(files);},{signal});
 $('body').addEventListener('paste',event=>{const clipboard=event.clipboardData;if(!clipboard)return;const files=[...clipboard.files].filter(file=>file.type.startsWith('image/'));if(!files.length)return;if(!clipboard.getData('text/plain'))event.preventDefault();upload(files);},{signal});
 $('noteImagePreviews').addEventListener('click',event=>{const button=event.target.closest('[data-remove-note-image]');if(!button||context.pending||busy)return;context.images.splice(Number(button.dataset.removeNoteImage),1);updateNoteImages(context);status('照片已移除，保存笔记后生效。');},{signal});
 updateNoteImages(context);
}
