// Standalone script. Use the OAuth scopes in project-plan-appsscript.json.
const PROJECT_PLAN_ENDPOINT='https://tracker.managementplatformlee.com/api/project-plan/push';

function installProjectPlanSync(){
 pushProjectPlan_(true);
 const previous=ScriptApp.getProjectTriggers().filter(trigger=>trigger.getHandlerFunction()==='projectPlanTimer');
 ScriptApp.newTrigger('projectPlanTimer').timeBased().everyMinutes(5).create();
 previous.forEach(trigger=>ScriptApp.deleteTrigger(trigger));
 console.log('项目计划已自动同步，每5分钟检查一次。');
}

function uninstallProjectPlanSync(){
 ScriptApp.getProjectTriggers().filter(trigger=>trigger.getHandlerFunction()==='projectPlanTimer').forEach(trigger=>ScriptApp.deleteTrigger(trigger));
}
function projectPlanTimer(){pushProjectPlan_(false);}
function syncProjectPlanNow(){pushProjectPlan_(true);}

function readProjectPlanSheets_(onlyId){
 const tabs=Sheets.Spreadsheets.get(PROJECT_PLAN_SOURCE_ID,{fields:'sheets(properties(sheetId,title,gridProperties(rowCount,columnCount,frozenRowCount)))'}).sheets
  .map(sheet=>sheet.properties);
 const projectTabs=tabs.filter(sheet=>PROJECT_PLAN_TAB.test(sheet.title)&&(onlyId===undefined||sheet.sheetId===onlyId));
 if(!projectTabs.length||projectTabs.length>200)throw Error('项目页数量超出范围。');
 const sheets=[];
 for(let i=0;i<projectTabs.length;i++){
  const batch=projectTabs.slice(i,i+1);
  const ranges=batch.map(sheet=>{
   const {rowCount,columnCount}=sheet.gridProperties;
   if(rowCount>1000||columnCount<9||columnCount>26)throw Error('项目页超出支持范围，请核对源表。');
   return "'"+sheet.title.replace(/'/g,"''")+"'!A1:"+String.fromCharCode(64+columnCount)+rowCount;
  });
  const result=Sheets.Spreadsheets.get(PROJECT_PLAN_SOURCE_ID,{ranges,fields:'sheets(properties(sheetId,title,gridProperties(columnCount,frozenRowCount)),merges,data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue(formulaValue),note,effectiveValue(boolValue),dataValidation(condition(type,values),strict),effectiveFormat(backgroundColor,textFormat(foregroundColor,fontSize,bold,italic),horizontalAlignment,verticalAlignment,wrapStrategy))),columnMetadata(pixelSize,hiddenByUser,hiddenByFilter),rowMetadata(pixelSize,hiddenByUser,hiddenByFilter)))'}).sheets;
  if(result?.length!==batch.length)throw Error('源表返回的项目页不完整。');
  batch.forEach(sheet=>{
   const source=result.find(item=>item.properties.sheetId===sheet.sheetId);
   if(!source||source.properties.title!==sheet.title)throw Error('源表返回的项目页不完整。');
   const preview=projectPlanPreviewFromGrid(source);
   sheets.push({sheetId:sheet.sheetId,name:sheet.title,rows:preview.cells.map(row=>row.map(cell=>cell[0])),preview,editing:projectPlanEditingFromGrid(source),...(onlyId===undefined?{}:{grid:source})});
  });
 }
 return {sheets,sourceSheetIds:tabs.map(tab=>tab.sheetId)};
}

// Deploy this standalone project as a web app executing as its owner. Every request
// must be signed by the workbench; the browser never receives the key or this URL.
function doPost(event){
 let requestId='';
 const output=data=>ContentService.createTextOutput(JSON.stringify({requestId,...data})).setMimeType(ContentService.MimeType.JSON);
 let lock,edit,project;
 try{
  const envelope=JSON.parse(event?.postData?.contents||'');
  const {timestamp,signature,payload}=envelope;
  const secret=PropertiesService.getScriptProperties().getProperty('PROJECT_PLAN_SYNC_SECRET');
  if(!secret||secret.length<32||typeof payload!=='string'||payload.length>20000||!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^\w{64}$/.test(signature))throw Error('请求签名无效');
  const expected=Utilities.computeHmacSha256Signature(timestamp+'.'+payload,secret,Utilities.Charset.UTF_8).map(value=>(value&255).toString(16).padStart(2,'0')).join('');
  let difference=0;for(let i=0;i<64;i++)difference|=signature.charCodeAt(i)^expected.charCodeAt(i);
  if(difference)throw Error('请求签名无效');
  edit=validateProjectPlanEdit(JSON.parse(payload));requestId=edit.requestId;
  lock=LockService.getScriptLock();if(!lock.tryLock(1000))return output({ok:false,status:503,error:'原表正在同步，请稍后重试'});
  const source=readProjectPlanSheets_(edit.sheetId).sheets[0];
  const requests=projectPlanUpdateRequests(source.grid,edit);
  if(requests.length){
   // Mark before attempting the write, including an uncertain API outcome.
   PropertiesService.getScriptProperties().setProperty('PROJECT_PLAN_EDIT_VERSION',String(Date.now()));
   Sheets.Spreadsheets.batchUpdate({requests},PROJECT_PLAN_SOURCE_ID);
  }
  const fresh=readProjectPlanSheets_(edit.sheetId).sheets[0];
  project=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,[fresh]).projects[0];
  const fields=project.editing.find(item=>item.row===edit.row)?.fields||[];
  if(!edit.changes.every(change=>fields.find(field=>field.key===change.key)?.value===change.value))return output({ok:false,status:409,error:'原表回读结果与修改不一致，请在原表核对'});
 }catch(error){return output({ok:false,status:409,error:edit?error.message:'回写授权无效，请检查服务配置'});}
 finally{if(lock?.hasLock())lock.releaseLock();}
 // Confirm this project promptly; the existing timer refreshes the full snapshot.
 // Reading every project here can exceed the workbench's response timeout.
 return output({ok:true,project,synced:false,lastSyncedAt:null});
}

function pushProjectPlan_(force){
 const properties=PropertiesService.getScriptProperties();
 const secret=properties.getProperty('PROJECT_PLAN_SYNC_SECRET');
 if(!secret||secret.length<32)throw Error('请先配置项目计划同步密钥。');
 const editVersion=properties.getProperty('PROJECT_PLAN_EDIT_VERSION')||'';
 // Source reads are slow and do not mutate the workbook. Keep writes available.
 const {sheets,sourceSheetIds}=readProjectPlanSheets_();
 const snapshot=parseProjectPlanSheets(PROJECT_PLAN_SOURCE_ID,sheets);
 const body=JSON.stringify({...snapshot,sourceSheetIds});
 if(Utilities.newBlob(body).getBytes().length>1000000)throw Error('项目计划预览超过1MB，原快照保留；请检查源表范围。');
 const hex=bytes=>bytes.map(value=>(value&255).toString(16).padStart(2,'0')).join('');
 const hash=hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,body,Utilities.Charset.UTF_8));
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(1000)){if(force)throw Error('正在同步，请稍后重试。');return;}
 try{
  if((properties.getProperty('PROJECT_PLAN_EDIT_VERSION')||'')!==editVersion){
   if(force)throw Error('读取期间任务已修改，请重新同步。');
   return;
  }
  if(!force&&hash===properties.getProperty('PROJECT_PLAN_LAST_HASH'))return;
  const timestamp=String(Date.now());
  const signature=hex(Utilities.computeHmacSha256Signature(timestamp+'.'+body,secret,Utilities.Charset.UTF_8));
  const response=UrlFetchApp.fetch(PROJECT_PLAN_ENDPOINT,{method:'post',contentType:'application/json; charset=utf-8',payload:body,headers:{'X-Project-Plan-Timestamp':timestamp,'X-Project-Plan-Signature':signature},followRedirects:false,muteHttpExceptions:true});
  const result=JSON.parse(response.getContentText());
  if(response.getResponseCode()!==200||!result.ok)throw Error(result.error||'项目计划同步失败。');
  properties.setProperty('PROJECT_PLAN_LAST_HASH',hash);
  if(force)console.log('项目计划同步成功，共 '+result.count+' 个项目。');
 }finally{lock.releaseLock();}
}
/* PROJECT_PLAN_PARSER_START */
const PROJECT_PLAN_SOURCE_ID='1HK5vt_agyRTJvfGGoDbo0E76-o5k04Iy8z6Xdsz9nRA';
const PROJECT_PLAN_TAB=/^((?:PM|P)\d+)[\s-]+(.+?)标准任务清单$/;
const projectPlanFields=[
 ['phase','阶段',120],['module','模块',120],['title','标准任务',400],['applicability','是否适用',10],
 ['department','责任部门',120],['start','计划开始时间',40],['end','计划完成日期',40],['status','状态',80]
];
const planText=value=>String(value??'').trim();
const PROJECT_PLAN_EDIT_FIELDS=[['done','完成','boolean'],['start','计划开始时间','date'],['end','计划完成日期','date'],['status','状态','status'],['evidence','交付证据','text'],['note','备注','text']];
function validateProjectPlanEdit(source){
 const fail=()=>{throw Error('任务修改格式不正确');};
 if(!source||typeof source.requestId!=='string'||!/^\w[\w-]{15,79}$/.test(source.requestId)||!planInteger(source.sheetId,0,2**32)||
  !planInteger(source.row,2,1000)||!source.identity||!['title','phase','module'].every(key=>typeof source.identity[key]==='string'&&source.identity[key].length<=400)||
  !source.identity.title||!Array.isArray(source.changes)||!source.changes.length||source.changes.length>6)fail();
 const keys=new Set();
 const changes=source.changes.map(change=>{
  const field=PROJECT_PLAN_EDIT_FIELDS.find(([key])=>key===change?.key);
  if(!field||keys.has(field[0]))fail();keys.add(field[0]);
  if(field[2]==='boolean'){
   if(typeof change.before!=='boolean'||typeof change.value!=='boolean')fail();
  }else{
   if(typeof change.before!=='string'||typeof change.value!=='string'||change.before.length>5000||change.value.length>2000)fail();
   if(field[2]==='date'&&change.value!==''&&change.value!=='待定'&&(!/^\d{4}-\d{2}-\d{2}$/.test(change.value)||
    !Number.isFinite(Date.parse(change.value+'T00:00:00Z'))||new Date(change.value+'T00:00:00Z').toISOString().slice(0,10)!==change.value||change.value<'1900-01-01'||change.value>'2100-12-31'))fail();
   if(field[2]==='status'&&!['未开始','进行中','待确认','阻塞','已完成','不适用'].includes(change.value))fail();
  }
  return {key:field[0],before:change.before,value:change.value};
 });
 return {requestId:source.requestId,sheetId:source.sheetId,row:source.row,identity:Object.fromEntries(['title','phase','module'].map(key=>[key,source.identity[key]])),changes};
}
function projectPlanEditingFromGrid(sheet){
 const rows=sheet.data[0].rowData.map(row=>row.values||[]);
 const headerIndex=rows.slice(0,12).findIndex(row=>projectPlanFields.every(([,label])=>row.some(cell=>planText(cell.formattedValue)===label)));
 if(headerIndex<0)throw Error('未找到任务表头');
 const headers=rows[headerIndex].map(cell=>planText(cell.formattedValue)),titleColumn=headers.indexOf('标准任务');
 return rows.slice(headerIndex+1).flatMap((row,i)=>{
  if(!planText(row[titleColumn]?.formattedValue))return [];
  const fields=PROJECT_PLAN_EDIT_FIELDS.flatMap(([key,label,type])=>{
   const column=headers.indexOf(label),cell=row[column]||{};
   if(column<0||cell.userEnteredValue?.formulaValue||cell.note&&key==='done'&&/关闭|审批|凭证/.test(cell.note))return [];
   if(key==='done'&&headers.includes('发货款已到账')&&/发货|货物发出/.test(row[titleColumn]?.formattedValue||'')&&!/资料/.test(row[titleColumn]?.formattedValue||''))return [];
   const validation=cell.dataValidation?.condition?.type;
   if(validation&&!['BOOLEAN','ONE_OF_LIST','DATE_IS_VALID'].includes(validation))return [];
   if(type==='boolean'&&cell.dataValidation?.condition?.type!=='BOOLEAN')return [];
   return [{key,column,type,value:type==='boolean'?!!cell.effectiveValue?.boolValue:String(cell.formattedValue??'')}];
  });
  return [{row:headerIndex+i+2,fields}];
 });
}
function normalizeProjectPlanEditing(editing,tasks){
 if(!Array.isArray(editing)||editing.length>1000)throw Error('任务编辑元数据无效');
 const seen=new Set();return editing.map(item=>{
  if(!tasks.some(task=>task.row===item?.row)||seen.has(item.row)||!Array.isArray(item.fields)||item.fields.length>6)throw Error('任务编辑行无效');seen.add(item.row);
  const keys=new Set();return {row:item.row,fields:item.fields.map(field=>{
   const spec=PROJECT_PLAN_EDIT_FIELDS.find(([key])=>key===field?.key);
   if(!spec||keys.has(field.key)||spec[2]!==field.type||!planInteger(field.column,0,25)||
    (field.type==='boolean'?typeof field.value!=='boolean':typeof field.value!=='string'||field.value.length>5000))throw Error('任务编辑字段无效');
   keys.add(field.key);return {key:field.key,column:field.column,type:field.type,value:field.value};
  })};
 });
}

// Re-read source formulas, identity and cell values immediately before preparing writes.
function projectPlanUpdateRequests(source,edit){
 edit=validateProjectPlanEdit(edit);
 if(source.properties.sheetId!==edit.sheetId||!PROJECT_PLAN_TAB.test(source.properties.title))throw Error('项目页已变化，请刷新后核对');
 const rows=source.data?.[0]?.rowData||[],headerIndex=rows.slice(0,12).findIndex(row=>projectPlanFields.every(([,label])=>row.values?.some(cell=>planText(cell.formattedValue)===label)));
 if(headerIndex<0)throw Error('项目任务表头已变化，请刷新');
 const header=rows[headerIndex].values.map(cell=>planText(cell.formattedValue)),cells=rows[edit.row-1]?.values;
 if(!cells||!['title','phase','module'].every(key=>{
  const label=projectPlanFields.find(([field])=>field===key)[1];return planText(cells[header.indexOf(label)]?.formattedValue)===edit.identity[key];
 }))throw Error('任务行已移动或内容变化，请刷新后核对');
 const fields=projectPlanEditingFromGrid(source).find(row=>row.row===edit.row)?.fields||[];
 const finalDate=key=>edit.changes.find(change=>change.key===key)?.value??planText(cells[header.indexOf(PROJECT_PLAN_EDIT_FIELDS.find(([field])=>field===key)[1])]?.formattedValue);
 const start=finalDate('start'),end=finalDate('end');
 if(edit.changes.some(change=>['start','end'].includes(change.key))&&/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)&&start>end)throw Error('计划开始日期不能晚于完成日期');
 return edit.changes.flatMap(change=>{
  const field=fields.find(item=>item.key===change.key);
  if(!field)throw Error('该字段由公式或原表业务流程控制，请在原表中处理');
  if(field.value===change.value)return [];
  if(field.value!==change.before)throw Error('原表已被修改，本次未覆盖，请刷新后核对');
  const cell=cells[field.column]||{},condition=cell.dataValidation?.condition;
  if(condition?.type==='ONE_OF_LIST'&&!condition.values?.some(item=>item.userEnteredValue===change.value))throw Error('所选值不在原表允许范围内');
  if(condition?.type==='DATE_IS_VALID'&&change.value==='待定')throw Error('该单元格只允许日期或留空');
  if(condition?.type&&!['BOOLEAN','ONE_OF_LIST','DATE_IS_VALID','DATE_AFTER','DATE_ON_OR_AFTER','DATE_BEFORE','DATE_ON_OR_BEFORE','DATE_BETWEEN'].includes(condition.type))throw Error('该字段存在自定义校验，请在原表中处理');
  // Date comparisons and custom validation must be handled by the source workflow.
  if(condition?.type?.startsWith('DATE_')&&condition.type!=='DATE_IS_VALID')throw Error('该日期有额外范围校验，请在原表中处理');
  let value={},format;
  if(typeof change.value==='boolean')value={boolValue:change.value};
  else if(field.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(change.value)){
   value={numberValue:(Date.parse(change.value+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000};format={numberFormat:{type:'DATE',pattern:'yyyy-mm-dd'}};
  }else if(change.value)value={stringValue:change.value};
  return [{updateCells:{range:{sheetId:edit.sheetId,startRowIndex:edit.row-1,endRowIndex:edit.row,startColumnIndex:field.column,endColumnIndex:field.column+1},
   rows:[{values:[{userEnteredValue:value,...(format?{userEnteredFormat:format}:{})}]}],fields:'userEnteredValue'+(format?',userEnteredFormat.numberFormat':'')}}];
 });
}
const planInteger=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
// Source formatting is data, never HTML/CSS supplied by the sheet.
function normalizeProjectPlanPreview(source){
 const fail=()=>{throw Error('项目原表预览格式不正确');};
 if(!source||!Array.isArray(source.columns)||!source.columns.length||source.columns.length>26||
  !source.columns.every(n=>planInteger(n,24,1000))||!Array.isArray(source.cells)||!source.cells.length||source.cells.length>1000||
  !Array.isArray(source.heights)||source.heights.length!==source.cells.length||!source.heights.every(n=>planInteger(n,16,1000))||
  !Array.isArray(source.styles)||!source.styles.length||source.styles.length>1000)fail();
 const styles=source.styles.map(style=>{
  if(!Array.isArray(style)||style.length!==8||!style.slice(0,2).every(color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color))||
   !planInteger(style[2],6,72)||typeof style[3]!=='boolean'||typeof style[4]!=='boolean'||
   !['left','center','right'].includes(style[5])||!['top','middle','bottom'].includes(style[6])||typeof style[7]!=='boolean')fail();
  return [...style];
 });
 const cells=source.cells.map(row=>{
  if(!Array.isArray(row)||row.length!==source.columns.length)fail();
  return row.map(cell=>{
   if(!Array.isArray(cell)||![2,3].includes(cell.length)||typeof cell[0]!=='string'||cell[0].length>5000||
    !planInteger(cell[1],0,styles.length-1)||(cell.length===3&&typeof cell[2]!=='boolean'))fail();
   return [...cell];
  });
 });
 const indices=(list,size)=>{
  if(!Array.isArray(list)||list.length>size||new Set(list).size!==list.length||!list.every(n=>planInteger(n,0,size-1)))fail();
  return [...list];
 };
 if(!planInteger(source.frozenRows,0,Math.min(20,cells.length))||!Array.isArray(source.merges)||source.merges.length>1000)fail();
 const occupied=new Set();
 const merges=source.merges.map(merge=>{
  if(!Array.isArray(merge)||merge.length!==4)fail();
  const [r,c,h,w]=merge;
  if(!planInteger(r,0,cells.length-1)||!planInteger(c,0,source.columns.length-1)||
   !planInteger(h,1,cells.length-r)||!planInteger(w,1,source.columns.length-c))fail();
  for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++){
   const key=y*26+x;if(occupied.has(key))fail();occupied.add(key);
  }
  return [...merge];
 });
 return {columns:[...source.columns],heights:[...source.heights],styles,cells,merges,frozenRows:source.frozenRows,
  hiddenRows:indices(source.hiddenRows,cells.length),hiddenColumns:indices(source.hiddenColumns,source.columns.length)};
}

function projectPlanPreviewFromGrid(sheet){
 const grid=sheet.data?.[0];
 if(!grid?.rowData?.length||(grid.startRow||0)!==0||(grid.startColumn||0)!==0)throw Error('源表预览未完整读取');
 const rowCount=grid.rowData.length,columnCount=sheet.properties.gridProperties.columnCount;
 if(!planInteger(rowCount,1,1000)||!planInteger(columnCount,9,26))throw Error('源表预览超出支持范围');
 const color=(rgb,fallback)=>rgb?'#'+['red','green','blue'].map(key=>Math.round(Math.max(0,Math.min(1,rgb[key]||0))*255).toString(16).padStart(2,'0')).join(''):fallback;
 const styles=[],palette=new Map();
 const cells=grid.rowData.map(row=>Array.from({length:columnCount},(_,index)=>{
  const cell=row.values?.[index]||{},format=cell.effectiveFormat||{},font=format.textFormat||{};
  const style=[color(format.backgroundColor,'#ffffff'),color(font.foregroundColor,'#000000'),
   Math.max(6,Math.min(72,Math.round(font.fontSize||10))),!!font.bold,!!font.italic,
   ({LEFT:'left',CENTER:'center',RIGHT:'right'})[format.horizontalAlignment]||'left',
   ({TOP:'top',MIDDLE:'middle',BOTTOM:'bottom'})[format.verticalAlignment]||'bottom',format.wrapStrategy==='WRAP'];
  const key=JSON.stringify(style);
  if(!palette.has(key)){palette.set(key,styles.length);styles.push(style);}
  const result=[String(cell.formattedValue??''),palette.get(key)];
  if(cell.dataValidation?.condition?.type==='BOOLEAN'&&typeof cell.effectiveValue?.boolValue==='boolean')result.push(cell.effectiveValue.boolValue);
  return result;
 }));
 const hidden=(metadata,count)=>Array.from({length:count},(_,index)=>index).filter(index=>metadata?.[index]?.hiddenByUser||metadata?.[index]?.hiddenByFilter);
 const size=(metadata,index,fallback,min)=>Math.max(min,Math.min(1000,Math.round(metadata?.[index]?.pixelSize||fallback)));
 return normalizeProjectPlanPreview({cells,styles,columns:Array.from({length:columnCount},(_,i)=>size(grid.columnMetadata,i,140,24)),
  heights:Array.from({length:rowCount},(_,i)=>size(grid.rowMetadata,i,28,16)),
  hiddenRows:hidden(grid.rowMetadata,rowCount),hiddenColumns:hidden(grid.columnMetadata,columnCount),
  frozenRows:Math.min(sheet.properties.gridProperties.frozenRowCount||0,rowCount,20),
  merges:(sheet.merges||[]).map(m=>[m.startRowIndex||0,m.startColumnIndex||0,m.endRowIndex-(m.startRowIndex||0),m.endColumnIndex-(m.startColumnIndex||0)])
   .filter(([r,c,h,w])=>r<rowCount&&c<columnCount&&r+h<=rowCount&&c+w<=columnCount)});
}
function normalizeProjectPlanSnapshot(source){
 if(source?.sourceSpreadsheetId!==PROJECT_PLAN_SOURCE_ID||!Array.isArray(source.projects)||!source.projects.length||source.projects.length>200)throw Error('项目计划来源或项目页数量不正确');
 const ids=new Set(),codes=new Set();
 const projects=source.projects.map(project=>{
  const match=typeof project?.sourceSheet==='string'&&project.sourceSheet.length<=300&&project.sourceSheet.match(PROJECT_PLAN_TAB);
  if(!match||!Number.isSafeInteger(project.sheetId)||project.sheetId<0||ids.has(project.sheetId)||codes.has(match[1])||
   !Array.isArray(project.tasks)||!project.tasks.length||project.tasks.length>1000)throw Error('项目页无效、重复或任务为空');
  ids.add(project.sheetId);codes.add(match[1]);
  const rows=new Set();
  const tasks=project.tasks.map(task=>{
   if(!Number.isSafeInteger(task?.row)||task.row<2||task.row>1000||rows.has(task.row))throw Error('任务行无效或重复');
   rows.add(task.row);
   const clean={row:task.row};
   for(const [key,,limit] of projectPlanFields){
    if(typeof task[key]!=='string'||task[key].length>limit)throw Error('任务字段无效或过长');
    clean[key]=task[key].trim();
   }
   if(!clean.title||!['','是','否'].includes(clean.applicability))throw Error('任务名称或适用性无效');
   return clean;
  });
  return {sheetId:project.sheetId,sourceSheet:project.sourceSheet,code:match[1],name:match[2].trim(),tasks,
   ...(project.editing?{editing:normalizeProjectPlanEditing(project.editing,tasks)}:{}),
   ...(project.preview?{preview:normalizeProjectPlanPreview(project.preview)}:{})};
 });
 return {sourceSpreadsheetId:PROJECT_PLAN_SOURCE_ID,projects};
}

function parseProjectPlanSheets(spreadsheetId,sheets){
 const projects=sheets.map(sheet=>{
  const headerIndex=sheet.rows.slice(0,12).findIndex(row=>projectPlanFields.every(([,label])=>row.filter(cell=>planText(cell)===label).length===1));
  if(headerIndex<0)throw Error('未找到项目任务表头，请核对源表');
  const header=sheet.rows[headerIndex].map(planText);
  const columns=projectPlanFields.map(([key,label])=>[key,header.indexOf(label)]);
  const titleColumn=header.indexOf('标准任务');
  const tasks=sheet.rows.slice(headerIndex+1).flatMap((row,index)=>planText(row[titleColumn])?
   [{row:headerIndex+index+2,...Object.fromEntries(columns.map(([key,column])=>[key,planText(row[column])]))}]:[]);
  return {sheetId:sheet.sheetId,sourceSheet:sheet.name,tasks,...(sheet.preview?{preview:sheet.preview}:{}),...(sheet.editing?{editing:sheet.editing}:{})};
 });
 return normalizeProjectPlanSnapshot({sourceSpreadsheetId:spreadsheetId,projects});
}

/* PROJECT_PLAN_PARSER_END */
