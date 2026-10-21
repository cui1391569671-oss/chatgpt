// Shared parser for the bound Apps Script and isolated Node tests. No source data is embedded.
export const PROJECT_CORE_SOURCE_ID='1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM';
export function parseProjectCoreSheets(source,day){
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
