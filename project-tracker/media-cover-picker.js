/* exported mediaReviewKey, setupMediaCoverPicker, resolveMediaSourceCovers, resolveSteamReviews */
const mediaSourceNames={tmdb:'TMDB',igdb:'IGDB',steam:'Steam',bangumi:'Bangumi',mal:'MyAnimeList'};
const resolvedMediaCovers=new Map();
const steamReviews=new Map();
function mediaCoverKey(item){return [item.id,item.mediaSource,item.mediaSourceId,item.mediaType,item.season].join(':');}
function mediaReviewKey(item){return item.steamAppId||(item.mediaSource==='steam'?item.mediaSourceId:'')||item.title;}
function setupMediaCoverPicker(){
 let timer,controller,composition=false;const session=++gameCoverSequence;
 const active=seq=>seq===gameCoverSequence&&$('editor').open&&kind==='completedGames';
 const preview=()=>{const url=$('coverUrl').value.trim(),valid=/^https:\/\//.test(url);$('gameCoverPreview').classList.toggle('hidden',!valid);if(valid){const image=$('gameCoverPreview'),source=gameCoverImageUrl(url,$('mediaType').value);image.dataset.coverFallback=source!==url?url:'';image.src=source;}};
 const binding=()=>{const source=$('mediaSource').value;$('refreshMediaSource').classList.toggle('hidden',!source);$('clearMediaSource').classList.toggle('hidden',!source);$('selectedMediaSource').textContent=source?'已关联 '+mediaSourceNames[source]+' 作品'+($('coverMode').value==='manual'?' · 使用自定义封面':''):'';};
 const clearBinding=()=>{for(const id of ['mediaSource','mediaSourceId','steamAppId'])$(id).value='';$('coverMode').value='manual';binding();};
 const invalidate=()=>{clearTimeout(timer);controller?.abort();++gameCoverSequence;$('matchGameCover').disabled=false;$('refreshMediaSource').disabled=false;autocomplete.clear();};
 const request=async(url,seq)=>{controller=new AbortController();const response=await fetch(url,{signal:controller.signal,cache:'no-cache'});const data=await response.json();if(!response.ok)throw Error(data.error||'作品资料暂不可用');if(!active(seq))return null;return data;};
 const setIdentity=item=>{for(const [id,value] of Object.entries({mediaSource:item.source,mediaSourceId:item.sourceId,steamAppId:item.steamAppId||'',coverMode:'source'}))$(id).value=value;binding();};
 const applyDetails=(item,replaceTitle=false)=>{if(replaceTitle&&item.matchedTitle)$('title').value=item.matchedTitle;if(item.coverUrl)$('coverUrl').value=item.coverUrl;if(item.platforms&&!$('platform').value)$('platform').value=item.platforms.slice(0,100);if(item.total>0&&!Number($('total').value)&&['anime','tv'].includes($('mediaType').value))$('total').value=item.total;if(item.steamAppId)$('steamAppId').value=item.steamAppId;preview();binding();};
 const detailsUrl=()=>'/api/media/details?'+new URLSearchParams({source:$('mediaSource').value,id:$('mediaSourceId').value,type:$('mediaType').value,season:$('season').value||'0'});
 const refresh=async()=>{if(!$('mediaSource').value)return;invalidate();const seq=gameCoverSequence;$('gameCoverStatus').textContent='正在按已选作品读取资料…';$('refreshMediaSource').disabled=true;try{const data=await request(detailsUrl(),seq);if(!data)return;if($('coverMode').value==='manual'){$('gameCoverStatus').textContent='已保留自定义封面。重新选择候选作品后可使用来源封面。';return;}applyDetails(data);$('gameCoverStatus').textContent=data.coverUrl?'已刷新所选作品封面。':'此作品暂时没有封面，可填写自定义链接。';}catch(e){if(active(seq)&&e.name!=='AbortError')$('gameCoverStatus').textContent='作品资料暂不可用，已保留现有封面。';}finally{if(active(seq))$('refreshMediaSource').disabled=false;}};
 const choose=async(item)=>{
  invalidate();const seq=gameCoverSequence;setIdentity(item);$('coverUrl').value=item.coverUrl||'';applyDetails(item,true);$('gameCoverStatus').textContent='已选择 '+mediaSourceNames[item.source]+'：'+item.matchedTitle+(item.coverUrl?'':'（暂无封面，可填写自定义链接）');
  try{const data=await request(detailsUrl(),seq);if(data&&$('coverMode').value!=='manual'){applyDetails(data);$('gameCoverStatus').textContent='已关联 '+mediaSourceNames[item.source]+'：'+item.matchedTitle;}}catch(e){if(active(seq)&&e.name!=='AbortError')$('gameCoverStatus').textContent='已选择作品；详细资料暂不可用，现有结果仍可保存。';}
 };
 const search=async()=>{
  const title=$('title').value.trim(),type=$('mediaType').value;if(!title)return;invalidate();const seq=gameCoverSequence;$('matchGameCover').disabled=true;$('gameCoverStatus').textContent='正在搜索作品…';
  try{const data=await request('/api/media/search?'+new URLSearchParams({q:title,type}),seq);if(!data||$('title').value.trim()!==title||$('mediaType').value!==type)return;const candidates=data.candidates||[];
   autocomplete.set(candidates,candidates.map((x,i)=>'<button type="button" class="media-name-option" data-choice="'+i+'" aria-label="选择 '+esc(x.matchedTitle)+' · '+esc(mediaSourceNames[x.source])+' · '+esc(x.date||'日期未知')+'">'+(x.coverUrl?'<img src="'+esc(gameCoverImageUrl(x.coverUrl,type))+'" data-cover-fallback="'+esc(gameCoverImageUrl(x.coverUrl,type)!==x.coverUrl?x.coverUrl:'')+'" onerror="if(!retryOriginalMediaCover(this))this.hidden=true" alt="'+esc(x.matchedTitle)+'封面" loading="lazy" referrerpolicy="no-referrer">':'<span>暂无封面</span>')+'<span>'+esc(x.matchedTitle)+'</span><small>'+esc(x.originalTitle&&x.originalTitle!==x.matchedTitle?x.originalTitle:'')+'</small><small>'+esc(x.date||'日期未知')+' · '+esc(mediaSourceNames[x.source])+'</small>'+(x.platforms?'<small>'+esc(x.platforms)+'</small>':'')+'</button>').join(''));
   $('gameCoverStatus').textContent=(candidates.length?'找到 '+candidates.length+' 部作品，请按名称、年份和平台选择。':'没有找到作品，可调整关键词或填写封面链接。')+(data.warnings?.length?' '+data.warnings.join('；')+'。':'');
  }catch(e){if(active(seq)&&e.name!=='AbortError')$('gameCoverStatus').textContent='作品搜索暂不可用，现有封面与输入已保留，可稍后重试。';}finally{if(active(seq))$('matchGameCover').disabled=false;}
 };
 const autocomplete=enhanceWorkspaceAutocomplete($('title'),$('animeCoverChoices'),item=>{if(!busy)choose(item);},()=>search());
 $('title').setAttribute('aria-describedby','gameCoverStatus');$('title').closest('.workspace-autocomplete').after($('gameCoverStatus'));
 const changed=()=>{invalidate();const wasBound=!!$('mediaSource').value;if(wasBound&&$('coverMode').value==='source')$('coverUrl').value='';clearBinding();preview();$('gameCoverStatus').textContent='输入作品名称，选择对应年份、版本或季度。';if($('title').value.trim()&&!composition)timer=setTimeout(search,400);};
 $('coverUrl').oninput=()=>{invalidate();$('coverMode').value='manual';preview();binding();};
 $('title').oninput=e=>{if(!e.isComposing&&!composition)changed();};$('title').oncompositionstart=()=>{composition=true;invalidate();};$('title').oncompositionend=()=>{composition=false;changed();};
 $('mediaType').addEventListener('change',changed);$('season').addEventListener('change',()=>{invalidate();if($('mediaSource').value&&$('coverMode').value==='source')refresh();});
 $('matchGameCover').onclick=search;$('refreshMediaSource').onclick=refresh;$('clearMediaSource').onclick=()=>{invalidate();clearBinding();$('gameCoverStatus').textContent='已解除关联，保留当前自定义封面。';};
 $('gameCoverPreview').onerror=()=>{if(retryOriginalMediaCover($('gameCoverPreview')))return;$('gameCoverPreview').classList.add('hidden');$('gameCoverStatus').textContent='图片暂时无法加载，可刷新已选作品或填写其他封面链接。';};
 preview();binding();$('gameCoverStatus').textContent=$('mediaSource').value?'已保留所选作品。可按作品 ID 刷新资料。':'输入名称后搜索，点击候选作品以关联封面。';
 $('editor').addEventListener('close',()=>{autocomplete.destroy();clearTimeout(timer);controller?.abort();if(gameCoverSequence>=session)++gameCoverSequence;},{once:true});
}
const pendingMediaCovers=new Map();
function gameCoverImageUrl(url,type='game'){
 if(type!=='game'||!url)return url;
 try{const u=new URL(url);return u.protocol==='https:'&&['shared.fastly.steamstatic.com','shared.akamai.steamstatic.com','cdn.akamai.steamstatic.com','cdn.cloudflare.steamstatic.com','images.igdb.com','images.launchbox-app.com','cdn.wikimg.net'].includes(u.hostname)?'/api/media/image?'+new URLSearchParams({url:u.href}):url;}catch{return url;}
}
async function resolveMediaSourceCovers(){
 const queue=(state.completedGames||[]).filter(item=>!item.coverUrl&&item.coverMode!=='manual'&&item.mediaSource&&item.mediaSourceId);
 let cursor=0;
 const resolve=async item=>{
  const key=mediaCoverKey(item);if(resolvedMediaCovers.has(key))return;
  if(!pendingMediaCovers.has(key))pendingMediaCovers.set(key,(async()=>{
   try{const response=await fetch('/api/media/details?'+new URLSearchParams({source:item.mediaSource,id:item.mediaSourceId,type:item.mediaType||'game',season:String(item.season||0)}),{signal:AbortSignal.timeout(12000)});
    if(response.ok){
     const coverUrl=(await response.json()).coverUrl||'';
     resolvedMediaCovers.set(key,coverUrl);
     if(coverUrl)updateVisibleMediaCover(item);
    }
   }catch{/* Optional cover resolution keeps the saved cover and retries on a later render. */}finally{pendingMediaCovers.delete(key);}
  })());
  await pendingMediaCovers.get(key);
 };
 await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(cursor<queue.length)await resolve(queue[cursor++]);}));

}

function retryOriginalMediaCover(image){
 const original=image.dataset.coverFallback;if(!original)return false;
 delete image.dataset.coverFallback;image.hidden=false;image.src=original;return true;
}

// Enrichment updates preserve card nodes, loaded images, focus and entrance animations.
function updateVisibleMediaCover(item){
 if(view!=='completedGames')return;
 const current=(state.completedGames||[]).find(record=>record.id===item.id);
 if(!current||mediaCoverKey(current)!==mediaCoverKey(item)||current.coverMode==='manual')return;
 const url=current.coverUrl||resolvedMediaCovers.get(mediaCoverKey(current));
 if(!url)return;
 const host=$('results');
 if(!host)return;
 for(const cover of host.querySelectorAll('.media-wall-cover,.record-cover')){
  if(cover.dataset.id!==current.id||cover.querySelector('img'))continue;
  const image=document.createElement('img');
  const source=gameCoverImageUrl(url,current.mediaType||'game');
  image.width=300;
  image.height=450;
  image.loading='lazy';
  image.decoding='async';
  image.referrerPolicy='no-referrer';
  image.alt=current.title+' 封面';
  if(cover.classList.contains('record-cover'))image.className='game-cover';
  if(source!==url)image.dataset.coverFallback=url;
  image.onerror=()=>{if(!retryOriginalMediaCover(image))image.hidden=true;};
  image.src=source;
  cover.prepend(image);
  if(cover.classList.contains('record-cover')&&(current.mediaType||'game')==='game'){
   const review=document.createElement('span');
   review.className='cover-rating';
   review.dataset.mediaReviewKey=mediaReviewKey(current);
   review.textContent=steamReviews.get(mediaReviewKey(current))?.label||'评价加载中…';
   cover.append(review);
   void resolveSteamReviews();
  }
 }
}
function updateVisibleMediaReview(key){
 if(view!=='completedGames')return;
 const host=$('results');
 if(!host)return;
 const label=steamReviews.get(key)?.label||'评价暂不可用';
 for(const node of host.querySelectorAll('[data-media-review-key]')){
  if(node.dataset.mediaReviewKey===key&&node.textContent!==label)node.textContent=label;
 }
}
async function resolveSteamReviews(){
 if(view!=='completedGames'||mediaLayout!=='list')return;
 const host=$('results');
 if(!host)return;
 const visibleKeys=new Set(Array.from(host.querySelectorAll('[data-media-review-key]'),node=>node.dataset.mediaReviewKey));
 for(const game of state.completedGames||[]){
  if(view!=='completedGames'||mediaLayout!=='list')return;
  const key=mediaReviewKey(game);
  if((game.mediaType||'game')!=='game'||!visibleKeys.has(key)||steamReviews.has(key))continue;
  steamReviews.set(key,{label:'评价加载中…'});
  try{
   const query=game.steamAppId||game.mediaSource==='steam'?{appid:game.steamAppId||game.mediaSourceId}:{title:game.title};
   const response=await fetch('/api/steam-review?'+new URLSearchParams(query),{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Review lookup failed');
   steamReviews.set(key,await response.json());
  }catch{steamReviews.set(key,{label:'评价暂不可用'});}
  updateVisibleMediaReview(key);
 }
}
