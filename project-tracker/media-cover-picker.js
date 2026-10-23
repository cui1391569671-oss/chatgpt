const mediaSourceNames={tmdb:'TMDB',igdb:'IGDB',steam:'Steam',bangumi:'Bangumi',mal:'MyAnimeList'};
const resolvedMediaCovers=new Map();
function mediaCoverKey(item){return [item.id,item.mediaSource,item.mediaSourceId,item.mediaType,item.season].join(':');}
function mediaReviewKey(item){return item.steamAppId||(item.mediaSource==='steam'?item.mediaSourceId:'')||item.title;}
function setupMediaCoverPicker(){
 let timer,controller,composition=false;const session=++gameCoverSequence;
 const active=seq=>seq===gameCoverSequence&&$('editor').open&&kind==='completedGames';
 const preview=()=>{const url=$('coverUrl').value.trim(),valid=/^https:\/\//.test(url);$('gameCoverPreview').classList.toggle('hidden',!valid);if(valid)$('gameCoverPreview').src=gameCoverImageUrl(url,$('mediaType').value);};
 const binding=()=>{const source=$('mediaSource').value;$('refreshMediaSource').classList.toggle('hidden',!source);$('clearMediaSource').classList.toggle('hidden',!source);$('selectedMediaSource').textContent=source?'已关联 '+mediaSourceNames[source]+' 作品'+($('coverMode').value==='manual'?' · 使用自定义封面':''):'';};
 const clearBinding=()=>{for(const id of ['mediaSource','mediaSourceId','steamAppId'])$(id).value='';$('coverMode').value='manual';binding();};
 const invalidate=()=>{clearTimeout(timer);controller?.abort();++gameCoverSequence;$('matchGameCover').disabled=false;$('refreshMediaSource').disabled=false;autocomplete.clear();};
 const request=async(url,seq)=>{controller=new AbortController();const response=await fetch(url,{signal:controller.signal,cache:'no-cache'});const data=await response.json();if(!response.ok)throw Error(data.error||'作品资料暂不可用');if(!active(seq))return null;return data;};
 const setIdentity=item=>{for(const [id,value] of Object.entries({mediaSource:item.source,mediaSourceId:item.sourceId,steamAppId:item.steamAppId||'',coverMode:'source'}))$(id).value=value;binding();};
 const applyDetails=(item,replaceTitle=false)=>{if(replaceTitle&&item.matchedTitle)$('title').value=item.matchedTitle;if(item.coverUrl)$('coverUrl').value=item.coverUrl;if(item.platforms&&!$('platform').value)$('platform').value=item.platforms.slice(0,100);if(item.total>0&&!Number($('total').value)&&['anime','tv'].includes($('mediaType').value))$('total').value=item.total;if(item.steamAppId)$('steamAppId').value=item.steamAppId;preview();binding();};
 const detailsUrl=()=>'/api/media/details?'+new URLSearchParams({source:$('mediaSource').value,id:$('mediaSourceId').value,type:$('mediaType').value,season:$('season').value||'0'});
 const refresh=async()=>{if(!$('mediaSource').value)return;invalidate();const seq=gameCoverSequence;$('gameCoverStatus').textContent='正在按已选作品读取资料…';$('refreshMediaSource').disabled=true;try{const data=await request(detailsUrl(),seq);if(!data)return;if($('coverMode').value==='manual'){$('gameCoverStatus').textContent='已保留自定义封面。重新选择候选作品后可使用来源封面。';return;}applyDetails(data);$('gameCoverStatus').textContent=data.coverUrl?'已刷新所选作品封面。':'此作品暂时没有封面，可填写自定义链接。';}catch(e){if(active(seq)&&e.name!=='AbortError')$('gameCoverStatus').textContent='作品资料暂不可用，已保留现有封面。';}finally{if(active(seq))$('refreshMediaSource').disabled=false;}};
 const choose=async(item,button)=>{
  invalidate();const seq=gameCoverSequence;setIdentity(item);$('coverUrl').value=item.coverUrl||'';applyDetails(item,true);$('gameCoverStatus').textContent='已选择 '+mediaSourceNames[item.source]+'：'+item.matchedTitle+(item.coverUrl?'':'（暂无封面，可填写自定义链接）');
  try{const data=await request(detailsUrl(),seq);if(data&&$('coverMode').value!=='manual'){applyDetails(data);$('gameCoverStatus').textContent='已关联 '+mediaSourceNames[item.source]+'：'+item.matchedTitle;}}catch(e){if(active(seq)&&e.name!=='AbortError')$('gameCoverStatus').textContent='已选择作品；详细资料暂不可用，现有结果仍可保存。';}
 };
 const search=async()=>{
  const title=$('title').value.trim(),type=$('mediaType').value;if(!title)return;invalidate();const seq=gameCoverSequence;$('matchGameCover').disabled=true;$('gameCoverStatus').textContent='正在搜索作品…';
  try{const data=await request('/api/media/search?'+new URLSearchParams({q:title,type}),seq);if(!data||$('title').value.trim()!==title||$('mediaType').value!==type)return;const candidates=data.candidates||[],choices=$('animeCoverChoices');
   autocomplete.set(candidates,candidates.map((x,i)=>'<button type="button" class="media-name-option" data-choice="'+i+'" aria-label="选择 '+esc(x.matchedTitle)+' · '+esc(mediaSourceNames[x.source])+' · '+esc(x.date||'日期未知')+'">'+(x.coverUrl?'<img src="'+esc(gameCoverImageUrl(x.coverUrl,type))+'" alt="'+esc(x.matchedTitle)+'封面" loading="lazy" referrerpolicy="no-referrer">':'<span>暂无封面</span>')+'<span>'+esc(x.matchedTitle)+'</span><small>'+esc(x.originalTitle&&x.originalTitle!==x.matchedTitle?x.originalTitle:'')+'</small><small>'+esc(x.date||'日期未知')+' · '+esc(mediaSourceNames[x.source])+'</small>'+(x.platforms?'<small>'+esc(x.platforms)+'</small>':'')+'</button>').join(''));
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
 $('gameCoverPreview').onerror=()=>{$('gameCoverPreview').classList.add('hidden');$('gameCoverStatus').textContent='图片暂时无法加载，可刷新已选作品或填写其他封面链接。';};
 preview();binding();$('gameCoverStatus').textContent=$('mediaSource').value?'已保留所选作品。可按作品 ID 刷新资料。':'输入名称后搜索，点击候选作品以关联封面。';
 $('editor').addEventListener('close',()=>{autocomplete.destroy();clearTimeout(timer);controller?.abort();if(gameCoverSequence>=session)++gameCoverSequence;},{once:true});
}
const pendingMediaCovers=new Map();
function gameCoverImageUrl(url,type='game'){
 if(type!=='game'||!url)return url;
 try{const u=new URL(url);return u.protocol==='https:'&&['shared.fastly.steamstatic.com','shared.akamai.steamstatic.com','cdn.akamai.steamstatic.com','cdn.cloudflare.steamstatic.com','images.igdb.com','upload.wikimedia.org','images.launchbox-app.com','cdn.wikimg.net'].includes(u.hostname)?'/api/media/image?'+new URLSearchParams({url:u.href}):url;}catch{return url;}
}
async function resolveMediaSourceCovers(){
 const queue=(state.completedGames||[]).filter(item=>!item.coverUrl&&item.coverMode!=='manual'&&item.mediaSource&&item.mediaSourceId);
 let cursor=0;
 const resolve=async item=>{
  const key=mediaCoverKey(item);if(resolvedMediaCovers.has(key))return;
  if(!pendingMediaCovers.has(key))pendingMediaCovers.set(key,(async()=>{
   try{const response=await fetch('/api/media/details?'+new URLSearchParams({source:item.mediaSource,id:item.mediaSourceId,type:item.mediaType||'game',season:String(item.season||0)}),{signal:AbortSignal.timeout(12000)});
    if(response.ok)resolvedMediaCovers.set(key,(await response.json()).coverUrl||'');
   }catch{}finally{pendingMediaCovers.delete(key);}
  })());
  await pendingMediaCovers.get(key);
 };
 await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(cursor<queue.length)await resolve(queue[cursor++]);}));
 if(view==='completedGames'&&queue.length)renderCompletedGames(false);
}
