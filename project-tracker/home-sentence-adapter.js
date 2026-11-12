/* exported refreshHomeSentence */
// Shared by work and personal home; no learning records or client storage are changed.
let homeSentenceCache=null,homeSentenceRequest=null;
function cancelHomeSentence(){homeSentenceRequest?.abort();homeSentenceRequest=null;}
function paintHomeSentence(message=''){
 const heading=document.querySelector('[data-home-sentence]'),status=document.querySelector('[data-home-sentence-status]');
 if(view!=='home'||!heading||!status)return;
 const today=day(),current=homeSentenceCache?.date===today,example=current?homeSentenceCache.sentence:null;
 if(heading.textContent!==(example||'每日一句'))heading.textContent=example||'每日一句';
 heading.lang=example?'en':'zh-CN';
 heading.classList.toggle('site-home-sentence',!!example);
 const feedback=message||(current?(example?'':'词汇库暂无英文例句，添加后刷新页面查看。'):'正在读取词汇库例句…');
 if(status.textContent!==feedback)status.textContent=feedback;
 status.hidden=!feedback;
 const time=document.querySelector('.site-home-date time');
 if(time&&time.dateTime!==today){time.dateTime=today;time.textContent=new Date(today+'T12:00:00+08:00').toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'})+' · '+new Date(today+'T12:00:00+08:00').toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',weekday:'long'});}
}
async function refreshHomeSentence(){
 if(view!=='home'||!ready||document.hidden)return;
 paintHomeSentence();
 if(homeSentenceCache?.date===day()||homeSentenceRequest)return;
 const controller=new AbortController();homeSentenceRequest=controller;
 try{
  const response=await fetch('/api/daily-sentence',{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('读取失败');
  const data=await response.json();
  if(data.date!==day()||!(data.sentence===null||typeof data.sentence==='string'&&data.sentence.trim()))throw Error('例句暂不可用');
  if(controller.signal.aborted||homeSentenceRequest!==controller)return;
  homeSentenceCache=data;paintHomeSentence();
 }catch(error){if(error.name!=='AbortError'&&homeSentenceRequest===controller)paintHomeSentence('词汇库例句暂时无法读取，稍后自动重试。');}
 finally{if(homeSentenceRequest===controller)homeSentenceRequest=null;}
}
window.addEventListener('pagehide',cancelHomeSentence);
