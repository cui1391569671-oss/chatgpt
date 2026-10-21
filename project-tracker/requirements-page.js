let requirementFilter='all',requirementStatusError='';
function requirementRow(r){
 const completed=r.status==='done';
 return `<article class="requirement-row ${completed?'completed':''}">
 <label class="workspace-checkbox-target"><input type="checkbox" data-requirement-toggle="${esc(r.id)}" aria-label="${completed?'取消完成需求：':'完成需求：'}${esc(r.title)}" ${completed?'checked ':''}${busy||!ready||conflict?'disabled':''}></label>
 <div class="requirement-body"><div class="requirement-heading"><h2 class="row-title">${esc(r.title)}</h2><div class="row-meta requirement-meta"><span class="tag">${esc(REQUIREMENT_STATUSES[r.status])}</span><span class="tag">${priority(r.priority)}</span><span class="requirement-date">登记于 ${esc(r.createdAt.slice(0,10))}</span></div></div>${r.detail?'<p class="requirement-detail">'+esc(r.detail)+'</p>':''}</div>
 ${controls('requirements',r.id)}</article>`;
}
function renderRequirements(){
 const node=$('results');if(!node)return;
 const selector=$('requirementFilter');if(selector)selector.value=requirementFilter;
 const q=query.trim().toLowerCase(),items=(state.requirements||[]).filter(r=>(requirementFilter==='all'||r.status===requirementFilter)&&(r.title+' '+r.detail).toLowerCase().includes(q)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 node.innerHTML=(requirementStatusError?'<p class="form-error" id="requirementStatusError" role="alert">'+esc(requirementStatusError)+'</p>':'')+'<div class="card workspace-card-compact requirements-list">'+(items.length?items.map(requirementRow).join(''):empty('暂无'+(q||requirementFilter!=='all'?'符合条件的':'')+'需求','点击“新建需求”，记下你想调整的功能。'))+'</div>';
}
document.addEventListener('change',async event=>{
 const input=event.target;if(!input.matches('input[data-requirement-toggle]'))return;
 const id=input.dataset.requirementToggle,original=(state.requirements||[]).find(r=>r.id===id);
 if(!original)return;if(busy||!ready||conflict){input.checked=original.status==='done';return;}
 requirementStatusError='';$('requirementStatusError')?.remove();
 const next=structuredClone(state),index=next.requirements.findIndex(r=>r.id===id);next.requirements[index]=requirementCompletion(original,input.checked);
 const ok=await change(next);
 if(!ok){requirementStatusError=saveError||'状态保存失败，请重试。';if(view==='requirements')renderRequirements();}
 if(view==='requirements')queueMicrotask(()=>{const target=[...document.querySelectorAll('input[data-requirement-toggle]')].find(el=>el.dataset.requirementToggle===id);(target||$('requirementFilter-control'))?.focus({preventScroll:true});});
});
