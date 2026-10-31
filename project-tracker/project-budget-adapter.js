/* exported renderProjectBudget */
function renderProjectBudget(){
 if(view!=='projectBudget'||!$('results'))return;
 const host=$('results'),scroll=host.querySelector('.project-core-scroll'),position={left:scroll?.scrollLeft||0,top:scroll?.scrollTop||0};
 const items=projectCoreInfo?.items||[],sync=projectCoreInfo?.sync;
 const toolbar='<div data-page-toolbar><a class="btn" href="https://docs.google.com/spreadsheets/d/1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM/edit" target="_blank" rel="noopener noreferrer">打开项目信息表</a><button type="button" class="btn" data-refresh-core '+(projectCoreLoading?'disabled':'')+'>'+(projectCoreLoading?'正在刷新…':'刷新')+'</button></div>';
 const received=sync?.lastSyncedAt,stamp=received&&!Number.isNaN(Date.parse(received))?new Date(received).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）':projectCoreInfo?.syncedAt||'尚未同步';
 host.innerHTML=toolbar+'<p class="muted" role="status">'+(projectCoreLoading?'正在读取源表同步数据…':'最近同步：'+esc(stamp))+'</p>'+(projectCoreError?'<p class="form-error" role="alert">'+esc(projectCoreError)+'</p>':'')+(!projectCoreInfo&&!projectCoreError?'<p class="muted" role="status">正在加载项目预算…</p>':'')+(items.length?'<div class="project-core-scroll" role="region" aria-label="项目预算成本表，可横向滚动" tabindex="0"><table class="project-core-table project-budget-table"><thead><tr>'+['项目 / 币种','安装费用','实施费用','运输费用','质保费用','风险金'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+items.map(item=>{
  const budget=item.budget;
  return '<tr><th scope="row">'+esc(item.projectCode+' · '+item.projectName)+(budget?'<p class="muted">'+esc(budget.currency||'币种未填写')+'</p>':'')+'</th>'+(budget?['installation','implementation','transport','warranty','risk'].map(key=>'<td>'+esc(budget[key]||'未填写')+'</td>').join(''):'<td colspan="5">源表预算尚未同步，请检查同步状态后重试。</td>')+'</tr>';
 }).join('')+'</tbody></table></div>':projectCoreInfo?empty('暂无项目预算','请在项目信息表中维护项目及其核心预算区块。'):'');
 const next=host.querySelector('.project-core-scroll');if(next){next.scrollLeft=position.left;next.scrollTop=position.top;}
}
