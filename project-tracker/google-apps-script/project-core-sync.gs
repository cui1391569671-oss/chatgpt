// Bound to the verified 项目信息表汇总 spreadsheet. Contains no business values or secrets.
const PROJECT_CORE_SYNC={endpoint:'https://tracker.managementplatformlee.com/api/project-core-information/push'};
const PROJECT_CORE_HANDLERS=['projectCoreEdited','projectCoreChanged','projectCoreTimer','projectCoreOpened'];
function prepareProjectCoreSync(){
 const properties=PropertiesService.getScriptProperties();
 if(!properties.getProperty('PROJECT_CORE_SYNC_SECRET'))properties.setProperty('PROJECT_CORE_SYNC_SECRET',Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));
 console.log('密钥已准备。请在项目设置 → 脚本属性中，将 PROJECT_CORE_SYNC_SECRET 安全复制到 Cloudflare 同名 Secret；不要粘贴到聊天或表格。');
}
function projectCoreOpened(){SpreadsheetApp.getUi().createMenu('工作台项目信息同步').addItem('立即同步','syncProjectCoreNow').addItem('安装自动同步','installProjectCoreSync').addItem('卸载自动同步','uninstallProjectCoreSync').addToUi();}
function installProjectCoreSync(){
 const spreadsheet=SpreadsheetApp.getActiveSpreadsheet();
 if(!spreadsheet||spreadsheet.getId()!==PROJECT_CORE_SOURCE_ID)throw new Error('请从项目信息表汇总的扩展程序 → Apps Script 打开此脚本。');
 syncProjectCoreNow(); // Verify source, authorization, secret and endpoint before changing triggers.
 const old=ScriptApp.getProjectTriggers().filter(t=>PROJECT_CORE_HANDLERS.indexOf(t.getHandlerFunction())>=0),created=[];
 try{
  created.push(ScriptApp.newTrigger('projectCoreEdited').forSpreadsheet(spreadsheet).onEdit().create());
  created.push(ScriptApp.newTrigger('projectCoreChanged').forSpreadsheet(spreadsheet).onChange().create());
  created.push(ScriptApp.newTrigger('projectCoreTimer').timeBased().everyMinutes(5).create());
  created.push(ScriptApp.newTrigger('projectCoreOpened').forSpreadsheet(spreadsheet).onOpen().create());
 }catch(error){created.forEach(t=>ScriptApp.deleteTrigger(t));throw error;}
 old.forEach(t=>ScriptApp.deleteTrigger(t));
 syncProjectCoreNow();projectCoreOpened();spreadsheet.toast('已安装：编辑后同步，每5分钟补查。','工作台项目信息同步');
}
function uninstallProjectCoreSync(){ScriptApp.getProjectTriggers().filter(t=>PROJECT_CORE_HANDLERS.indexOf(t.getHandlerFunction())>=0).forEach(t=>ScriptApp.deleteTrigger(t));}
function projectCoreEdited(event){if(event&&event.source&&event.source.getId()===PROJECT_CORE_SOURCE_ID)pushProjectCore_(false);}
function projectCoreChanged(event){if(event&&event.source&&event.source.getId()===PROJECT_CORE_SOURCE_ID&&event.changeType!=='EDIT')pushProjectCore_(false);}
function projectCoreTimer(){pushProjectCore_(false);}
function syncProjectCoreNow(){pushProjectCore_(true);}
function pushProjectCore_(force){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000)){if(force)throw new Error('同步正在进行，请稍后重试。');return;}
 try{
  const properties=PropertiesService.getScriptProperties(),secret=properties.getProperty('PROJECT_CORE_SYNC_SECRET');
  if(!secret||secret.length<32)throw new Error('请先运行 prepareProjectCoreSync 并在 Cloudflare 配置同名 Secret。');
  const spreadsheet=SpreadsheetApp.openById(PROJECT_CORE_SOURCE_ID);
  const sheets=spreadsheet.getSheets().filter(sheet=>/^(?:PM|P)\d+(?:\s|$)/i.test(sheet.getName()));
  if(!sheets.length||sheets.length>200)throw new Error('未找到有效项目页，或项目页超过200个。原数据已保留。');
  const source={spreadsheetId:spreadsheet.getId(),title:spreadsheet.getName(),sheets:sheets.map(sheet=>{
   if(sheet.getLastRow()>200||sheet.getLastColumn()<12)throw new Error('项目页超出支持范围或缺少模板列，请先核对原表。');
   return {name:sheet.getName(),id:sheet.getSheetId(),rows:sheet.getRange(1,1,sheet.getLastRow(),12).getDisplayValues()};
  })};
  const payload=parseProjectCoreSheets(source,Utilities.formatDate(new Date(),'Asia/Shanghai','yyyy-MM-dd'));
  const handlers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  payload.automationInstalled=['projectCoreEdited','projectCoreChanged','projectCoreTimer'].every(name=>handlers.indexOf(name)>=0);
  // The parser selects only core fields; contacts and financial records never enter the push body.
  const body=JSON.stringify(payload);
  if(payload.items.some(item=>['supplyScope','transport','palletSize','equipmentLoad','efficiency'].some(k=>item[k].length>5000)))throw new Error('核心字段超过5000字，原数据已保留，请核对原表。');
  const hex=bytes=>bytes.map(x=>('0'+((x+256)%256).toString(16)).slice(-2)).join('');
  const hash=hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,body,Utilities.Charset.UTF_8));
  if(!force&&hash===properties.getProperty('PROJECT_CORE_LAST_SUCCESS_HASH'))return;
  const timestamp=String(Date.now()),signature=hex(Utilities.computeHmacSha256Signature(timestamp+'.'+body,secret,Utilities.Charset.UTF_8));
  const response=UrlFetchApp.fetch(PROJECT_CORE_SYNC.endpoint,{method:'post',contentType:'application/json; charset=utf-8',payload:body,headers:{'X-Project-Core-Timestamp':timestamp,'X-Project-Core-Signature':signature},followRedirects:false,muteHttpExceptions:true});
  let result;try{result=JSON.parse(response.getContentText());}catch(_){throw new Error('工作台未返回有效结果，请确认同步接口已上线。');}
  if(response.getResponseCode()!==200||!result.ok)throw new Error(result.error||'同步失败，下次自动重试。');
  properties.setProperties({PROJECT_CORE_LAST_SUCCESS_HASH:hash,PROJECT_CORE_LAST_SUCCESS_AT:new Date().toISOString()});
  if(force)spreadsheet.toast('项目信息同步成功。','工作台项目信息同步');
 }finally{lock.releaseLock();}
}
/* PROJECT_CORE_PARSER_START */
// Shared parser for the bound Apps Script and isolated Node tests. No source data is embedded.
const PROJECT_CORE_SOURCE_ID='1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM';
function parseProjectCoreSheets(source,day){
 const text=value=>String(value??'').trim();
 if(source?.spreadsheetId!==PROJECT_CORE_SOURCE_ID||!Array.isArray(source.sheets)||!source.sheets.length||source.sheets.length>200)throw Error('项目信息表来源或项目页数量不正确');
 const seen=new Set();
 const items=source.sheets.map(sheet=>{
  if(!Number.isInteger(sheet.id)||sheet.id<0||!Array.isArray(sheet.rows)||sheet.rows.length>200||sheet.rows.some(row=>!Array.isArray(row)||row.length>12||row.some(v=>typeof v!=='string'&&v!==null)))throw Error('项目页格式不正确');
  const labels=new Map();
  for(const row of sheet.rows)for(let i=0;i<row.length-1;i++){
   const key=text(row[i]);if(['项目编号','项目名称','信息更新日期','运输方式','托盘尺寸','设备负载','效率信息','项目目标/验收标准','主要风险与限制'].includes(key)){
    if(labels.has(key))throw Error('项目页含有重复字段，请检查原表');labels.set(key,text(row[i+1]));
   }
  }
  const projectCode=labels.get('项目编号'),projectName=labels.get('项目名称');
  if(!projectCode||!projectName||seen.has(projectCode))throw Error('项目编号/名称缺失或编号重复，保留工作台原数据');seen.add(projectCode);
  const start=sheet.rows.findIndex(row=>/^\d+\s+供货范围$/.test(text(row[0])));
  if(start<0)throw Error('未找到供货范围，保留工作台原数据');
  const supply=[];
  for(const row of sheet.rows.slice(start+1)){
   if(/^\d+\s+/.test(text(row[0])))break;
   if(!/^\d+$/.test(text(row[0])))continue;
   const module=text(row[1]),content=text(row[3]),note=text(row[11]);
   if(!module||!content)throw Error('供货条目缺少模块或内容，保留工作台原数据');
   supply.push({module,content,note,quantity:text(row[6])+text(row[7]),supplier:text(row[8])});
  }
  if(!supply.length)throw Error('供货范围为空，保留工作台原数据');
  const lines=supply.map(row=>row.module+'：'+row.content+(row.quantity?'（表列数量：'+row.quantity+'）':'')+(row.supplier?'；供货方：'+row.supplier:'')+(row.note?'；备注：'+row.note:''));
  // Keep original module-level excerpts, units and conflict notes; do not infer
  // a single load for different devices or mistake chassis dimensions for pallets.
  const excerpt=pattern=>supply.filter(row=>pattern.test(row.content+' '+row.note)).map(row=>row.module+'：'+row.content+(row.note?'；备注：'+row.note:'')).join('\n');
  let transport=labels.get('运输方式')||'';
  if(/\b(?:EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i.test(transport))transport='原表运输方式/贸易条件：'+transport+'；实际运输方式须按原表确认';
  let palletSize=labels.get('托盘尺寸')||excerpt(/托盘|含托.*\d/);
  const risks=labels.get('主要风险与限制')||'';
  if(/托盘|货物含托/.test(risks))palletSize+=(palletSize?'\n':'')+'原表风险说明：'+risks;
  const efficiency=labels.get('效率信息')||labels.get('项目目标/验收标准')||'';
  return {projectCode,projectName,supplyScope:lines.join('\n'),transport,palletSize,equipmentLoad:labels.get('设备负载')||excerpt(/额载|负载|载重|载荷|\d\s*(?:kg|公斤|千克)/i),efficiency,sourceSheet:text(sheet.name),sourceSheetId:sheet.id,sourceUpdatedAt:labels.get('信息更新日期')||''};
 });
 return {sourceSpreadsheetId:source.spreadsheetId,sourceTitle:text(source.title),syncedAt:day,items};
}

/* PROJECT_CORE_PARSER_END */
