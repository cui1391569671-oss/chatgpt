/* Wardrobe presentation only. Records, selection and editing stay with the wardrobe owner. */
window.WorkspaceWardrobeRunway={markup(records,mode,{clothes,seasons,categories,active,selecting,selected:selection,escape:esc}){
 const outfits=mode==='outfits';
 const image=clothing=>'<img src="'+esc(clothing.image)+'" alt="" loading="lazy" decoding="async">';
 const recordClothes=record=>outfits?record.items.map(id=>clothes.find(c=>c.id===id)).filter(Boolean):[record];
 return '<wardrobe-runway class="wardrobe-runway" data-mode="'+mode+'" data-active="'+esc(active||'')+'" data-selecting="'+selecting+'" aria-label="'+(outfits?'穿搭展台':'衣服展台')+'"><div class="wardrobe-runway-main"><div class="wardrobe-runway-stage" tabindex="0" role="region" aria-roledescription="轮播" aria-label="'+(outfits?'穿搭轮播':'衣服轮播')+'">'+records.map(record=>{
  const pieces=recordClothes(record),selected=!outfits&&selection.has(record.id);
  const action=outfits?'data-runway-view="'+esc(record.id)+'" aria-label="查看'+esc(record.name)+'"':selecting?'data-pick-clothing="'+esc(record.id)+'" aria-pressed="'+selected+'" aria-label="选择'+esc(record.name)+'"':'data-edit-clothing="'+esc(record.id)+'" aria-label="编辑'+esc(record.name)+'"';
  return '<div class="wardrobe-runway-slide" data-runway-slide data-record-id="'+esc(record.id)+'"><button type="button" class="wardrobe-runway-cover'+(outfits?' wardrobe-runway-look':'')+(selected?' is-selected':'')+'" '+action+'>'+pieces.map(image).join('')+'</button></div>';
 }).join('')+'</div><div class="wardrobe-runway-controls"><button type="button" class="btn" data-workspace-icon="previous" data-runway-step="-1" aria-label="上一件'+(outfits?'搭配':'衣服')+'">上一件</button><span class="wardrobe-runway-count" role="status" aria-live="polite"></span><div class="wardrobe-runway-progress" aria-hidden="true"><span></span></div><button type="button" class="btn" data-runway-play aria-pressed="false">自动轮播</button><button type="button" class="btn" data-workspace-icon="next" data-runway-step="1" aria-label="下一件'+(outfits?'搭配':'衣服')+'">下一件</button></div></div><div class="wardrobe-runway-panel">'+records.map(record=>{
  const pieces=recordClothes(record);
  return '<section data-runway-details="'+esc(record.id)+'" hidden><span class="wardrobe-runway-label">'+(outfits?'这套搭配':'当前衣服')+'</span><h2>'+esc(record.name)+'</h2><p class="muted">'+(outfits?esc(seasons[record.season])+' · '+pieces.length+' 件':esc(categories[record.category])+' · '+record.seasons.map(s=>esc(seasons[s])).join(' / '))+'</p>'+(outfits?'<div class="wardrobe-runway-pieces">'+pieces.map(c=>'<button type="button" class="wardrobe-runway-piece" data-edit-clothing="'+esc(c.id)+'" aria-label="编辑'+esc(c.name)+'">'+image(c)+'<span>'+esc(c.name)+'</span><span class="muted">'+esc(categories[c.category])+'</span></button>').join('')+'</div><button type="button" class="btn danger" data-workspace-icon="delete" data-delete-outfit="'+esc(record.id)+'" aria-label="删除'+esc(record.name)+'">删除搭配</button>':'')+'</section>';
 }).join('')+'</div></wardrobe-runway>';
}};
if(!customElements.get('wardrobe-runway'))customElements.define('wardrobe-runway',class extends HTMLElement{
 connectedCallback(){
  this.slides=[...this.querySelectorAll('[data-runway-slide]')];this.details=[...this.querySelectorAll('[data-runway-details]')];this.stage=this.querySelector('.wardrobe-runway-stage');
  this.index=Math.max(0,this.slides.findIndex(slide=>slide.dataset.recordId===this.dataset.active));this.media=matchMedia('(prefers-reduced-motion: reduce)');this.controller=new AbortController();const signal=this.controller.signal;
  this.addEventListener('click',event=>{
   const slide=event.target.closest('[data-runway-slide]');
   if(this.suppressClick){event.preventDefault();event.stopPropagation();return;}
   if(slide&&slide!==this.slides[this.index]){event.preventDefault();event.stopPropagation();this.stop();this.go(this.slides.indexOf(slide));return;}
   const step=event.target.closest('[data-runway-step]');if(step){this.stop();this.go(this.index+Number(step.dataset.runwayStep));}
   if(event.target.closest('[data-runway-play]')){if(this.playing)this.stop();else this.play();}
   if(event.target.closest('[data-runway-view]')){this.stop();this.querySelector('[data-runway-details]:not([hidden])')?.querySelector('h2')?.focus({preventScroll:true});}
  },{capture:true,signal});
  this.addEventListener('focusin',event=>{if(!event.target.closest('[data-runway-play]'))this.stop();},{signal});
  this.stage.addEventListener('keydown',event=>{if(this.dataset.locked==='true')return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();this.stage.focus({preventScroll:true});this.stop();this.go(this.index+(event.key==='ArrowRight'?1:-1));}},{signal});
  this.stage.addEventListener('pointerdown',event=>{if(event.button!==0||this.dataset.locked==='true')return;this.stop();this.drag={x:event.clientX,y:event.clientY,id:event.pointerId,index:this.index,moved:false};},{signal});
  this.stage.addEventListener('pointermove',event=>{
   const drag=this.drag;if(!drag||drag.id!==event.pointerId||this.dataset.locked==='true')return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(!drag.moved&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){this.drag=null;return;}
   if(Math.abs(dx)>8&&Math.abs(dx)>1.2*Math.abs(dy)){drag.moved=true;this.stage.setPointerCapture(event.pointerId);this.dataset.dragging='true';}
  },{signal});
  const finish=event=>{const drag=this.drag;if(!drag||drag.id!==event.pointerId)return;this.drag=null;delete this.dataset.dragging;if(drag.moved){this.suppressClick=true;clearTimeout(this.clickTimer);this.clickTimer=setTimeout(()=>{this.suppressClick=false;},80);const dx=event.clientX-drag.x;if(event.type!=='pointercancel'&&this.dataset.locked!=='true'&&Math.abs(dx)>30)this.go(drag.index+(dx<0?1:-1));}};
  this.stage.addEventListener('pointerup',finish,{signal});this.stage.addEventListener('pointercancel',finish,{signal});
  this.stage.addEventListener('wheel',event=>{if(this.dataset.locked==='true'||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;event.preventDefault();if(Date.now()<(this.wheelLock||0))return;this.wheelDelta=(this.wheelDelta||0)+event.deltaX;if(Math.abs(this.wheelDelta)>45){this.stop();this.go(this.index+(this.wheelDelta>0?1:-1));this.wheelDelta=0;this.wheelLock=Date.now()+520;}},{passive:false,signal});
  this.updateMotion=()=>{this.dataset.motion=this.media.matches||document.body.dataset.motionLevel==='off'?'off':'on';if(this.dataset.motion==='off')this.stop();const button=this.querySelector('[data-runway-play]'),unavailable=this.slides.length<2||this.dataset.motion==='off'||this.dataset.selecting==='true';button.toggleAttribute('data-disabled-when-idle',unavailable);button.disabled=unavailable||this.dataset.locked==='true';};
  this.media.addEventListener('change',this.updateMotion,{signal});window.addEventListener('workspace-motion-change',this.updateMotion,{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearTimer();else this.schedule();},{signal});
  this.observer=new ResizeObserver(()=>this.layout());this.observer.observe(this.stage);
  this.visibility=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.schedule();else this.clearTimer();});this.visibility.observe(this);
  this.querySelectorAll('[data-runway-details] h2').forEach(title=>title.tabIndex=-1);
  for(const button of this.querySelectorAll('[data-runway-step],[data-runway-play]'))if(this.slides.length<2){button.disabled=true;button.setAttribute('data-disabled-when-idle','');}
  if(this.dataset.selecting==='true'){const button=this.querySelector('[data-runway-play]');button.disabled=true;button.setAttribute('data-disabled-when-idle','');}
  this.updateMotion();this.go(this.index);if(this.dataset.selecting!=='true'&&this.dataset.motion!=='off')this.play();
 }
 disconnectedCallback(){this.stop();clearTimeout(this.clickTimer);this.observer?.disconnect();this.visibility?.disconnect();this.controller?.abort();}
 go(index){
  if(!this.slides.length)return;this.index=(index+this.slides.length)%this.slides.length;const id=this.slides[this.index].dataset.recordId;this.dataset.active=id;
  this.details.forEach(panel=>panel.hidden=panel.dataset.runwayDetails!==id);
  this.querySelector('.wardrobe-runway-count').textContent=String(this.index+1).padStart(2,'0')+' / '+String(this.slides.length).padStart(2,'0');
  this.querySelector('.wardrobe-runway-progress span').style.width=((this.index+1)/this.slides.length*100)+'%';
  this.layout();this.dispatchEvent(new CustomEvent('wardrobe-runway-change',{bubbles:true,detail:{mode:this.dataset.mode,id}}));this.schedule();
 }
 layout(){
  if(!this.stage)return;const width=this.stage.clientWidth,height=this.stage.clientHeight,n=this.slides.length;
  this.slides.forEach((slide,i)=>{
   let rank=(i-this.index+n)%n;if(rank>n/2)rank-=n;const visible=Math.abs(rank)<=2,angle=rank*Math.PI/6,depth=width*.62*(1-Math.cos(angle)),perspective=width*1.65/(width*1.65+depth),scale=perspective*(rank===0?1.08:1),x=width*.5+width*.62*Math.sin(angle)*perspective,bottom=24+(height-24-height*.36)*(1-perspective);
   slide.style.transform='translate3d('+x+'px,'+(-bottom)+'px,0) translateX(-50%) scale('+scale+')';slide.style.zIndex=String(Math.round(scale*100));slide.style.filter='blur('+(Math.abs(rank)*1.8)+'px)';slide.style.opacity=visible?'1':'0';slide.style.visibility=visible?'visible':'hidden';slide.setAttribute('aria-hidden',String(!visible));slide.querySelector('button').tabIndex=visible?0:-1;slide.dataset.front=String(rank===0);
  });
 }
 clearTimer(){clearTimeout(this.timer);this.timer=null;}
 stop(){this.playing=false;this.clearTimer();const button=this.querySelector('[data-runway-play]');if(button){button.textContent='自动轮播';button.setAttribute('aria-pressed','false');}}
 play(){if(this.slides.length<2||this.dataset.motion==='off'||this.dataset.selecting==='true')return;this.playing=true;const button=this.querySelector('[data-runway-play]');button.textContent='暂停轮播';button.setAttribute('aria-pressed','true');this.schedule();}
 schedule(){this.clearTimer();if(!this.playing||!this.visible||document.hidden)return;this.timer=setTimeout(()=>{if(this.dataset.locked!=='true'&&!document.querySelector('dialog[open],[role="dialog"]'))this.go(this.index+1);else this.schedule();},5000);}
});
