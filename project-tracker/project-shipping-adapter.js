/* exported renderShipping, openShippingEditor, saveShipping, closeShippingEditor, shippingDirty */
let shippingBaseline='',shippingSelecting=false;
function shippingFormSnapshot(){return JSON.stringify(['recipient','address','contact'].map(id=>$(id)?.value||''));}
function shippingDirty(){return kind==='projectShipping'&&$('editor').open&&shippingFormSnapshot()!==shippingBaseline;}
function renderShipping(){
 if(view!=='projectShipping'||!$('results'))return;
 const rows=projectShippingRows(projectCoreInfo?.items||[],state.projectShipping||[]);
 $('results').innerHTML='<div data-page-toolbar><button type="button" class="btn primary" data-shipping-add>添加信息</button><button type="button" class="btn" data-refresh-core '+(projectCoreLoading?'disabled':'')+'>'+(projectCoreLoading?'正在刷新…':'刷新项目')+'</button></div>'+(projectCoreError?'<p class="form-error" role="alert">'+esc(projectCoreError)+'</p>':'')+(!projectCoreInfo&&!projectCoreError?'<p role="status" class="muted">正在加载项目…</p>':'')+(rows.length?'<div class="project-core-scroll" role="region" aria-label="项目发货信息表" tabindex="0"><table class="project-core-table project-shipping-table"><thead><tr><th scope="col">项目</th><th scope="col">收件人</th><th scope="col">收件地址</th><th scope="col">联系方式</th><th scope="col">操作</th></tr></thead><tbody>'+rows.map(row=>'<tr><th scope="row">'+esc((row.projectCode?row.projectCode+' · ':'')+row.title)+(!row.linked&&projectCoreInfo?'<span class="muted">（源表已移除，保留发货资料）</span>':'')+'</th><td>'+esc(row.recipient||'未填写')+'</td><td>'+esc(row.address||'未填写')+'</td><td>'+esc(row.contact||'未填写')+'</td><td><button type="button" class="btn" data-shipping-edit="'+esc(row.id)+'" aria-label="编辑'+esc(row.title)+'的发货信息">编辑</button></td></tr>').join('')+'</tbody></table></div>':projectCoreInfo?empty('暂无项目','请先在项目基础信息的源表中添加项目，再刷新。'):'');
}
function openShippingEditor(id,adding=false){
 if(scope!=='work'||!ready||busy||conflict)return;
 const rows=projectShippingRows(projectCoreInfo?.items||[],state.projectShipping||[]),row=id?rows.find(item=>item.id===id):rows.find(item=>!item.recipient)||rows[0];if(!row){toast(projectCoreLoading?'项目正在加载，请稍后重试。':'请先在项目基础信息中添加项目，再刷新。');return;}
 id=row.id;kind='projectShipping';editing=id;$('editorTitle').textContent=adding?'添加发货信息':'编辑发货信息';$('formError').textContent='';$('deleteEntertainment').classList.add('hidden');
 $('editor').dataset.returnFocus=adding?'[data-shipping-add]':'[data-shipping-edit="'+CSS.escape(id)+'"]';
 $('fields').innerHTML=(adding?'<label for="shippingProject">收件对象</label><select id="shippingProject" aria-label="收件对象">'+rows.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===id?'selected':'')+'>'+esc((item.projectCode?item.projectCode+' · ':'')+item.title)+(item.recipient?'（已填写）':'')+'</option>').join('')+'</select>':'<p>'+esc(row.title)+'</p>')+field('recipient','收件人','text',row.recipient||'','maxlength="100" autocomplete="shipping name" aria-required="true"')+textField('address','收件地址',row.address||'',1000)+field('contact','联系方式','text',row.contact||'','maxlength="200" autocomplete="shipping tel" aria-required="true"');
 $('address').setAttribute('autocomplete','shipping street-address');$('address').setAttribute('aria-required','true');
 shippingBaseline=shippingFormSnapshot();
 if(adding)$('shippingProject').onchange=async event=>{
  const select=event.target,nextId=select.value;if(nextId===editing||shippingSelecting||busy)return;
  shippingSelecting=true;select.disabled=true;
  try{if(shippingDirty()&&!await window.WorkspacePrimitives.confirm({title:'切换项目？',description:'当前项目尚未保存的发货信息将丢失。',action:'切换项目'})){select.value=editing;select.dispatchEvent(new Event('change',{bubbles:true}));return;}openShippingEditor(nextId,true);}
  finally{shippingSelecting=false;if(select.isConnected)select.disabled=false;}
 };
 $('editor').showModal();if(adding)document.getElementById('shippingProject-control')?.focus();else $('recipient').focus();
}
async function saveShipping(){
 if(busy||!ready||scope!=='work'||conflict)return;
 const row=projectShippingRows(projectCoreInfo?.items||[],state.projectShipping||[]).find(item=>item.id===editing);if(!row)return;
 $('formError').textContent='';
 const item={id:row.id,title:row.title};
 for(const [key,label,max] of [['recipient','收件人',100],['address','收件地址',1000],['contact','联系方式',200]]){
  const input=$(key);input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');item[key]=input.value.trim();
  if(!item[key]||item[key].length>max){$('formError').textContent=!item[key]?'请填写'+label+'。':label+'最多'+max+'字。';input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','formError');input.focus();return;}
 }
 const next=structuredClone(state);next.projectShipping=[...(state.projectShipping||[]).filter(x=>x.id!==item.id),item];
 $('fields').querySelectorAll('input,textarea,select').forEach(input=>input.disabled=true);
 try{if(await change(next,{renderPage:false})){shippingBaseline=shippingFormSnapshot();$('editor').close();renderShipping();setBusy(false);toast('发货信息已保存');}else $('formError').textContent=saveError||'保存失败，输入已保留，请重试。';}
 finally{$('fields').querySelectorAll('input,textarea,select').forEach(input=>input.disabled=false);}
}
async function closeShippingEditor(){
 if(busy)return;if(shippingDirty()&&!await window.WorkspacePrimitives.confirm({title:'放弃修改？',description:'尚未保存的发货信息将丢失。',action:'放弃修改'}))return;
 $('editor').close();
}
