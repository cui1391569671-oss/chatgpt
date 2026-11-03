// Supply follows the ten source-sheet categories; unknown legacy modules stay under Other.
export const PROJECT_SUPPLY_CATEGORIES=Object.freeze(['货架系统','四向车系统','提升机系统','输送线系统','电气控制系统','软件系统（RMS/WMS/WCS）','网络及 IT 设备','安装调试及培训','备品备件及工具','其他']);
const supplyAliases=[['货架','货架系统','货架及附属设施'],['四向车','四向车系统','四向穿梭车','四向穿梭车系统'],['提升机','提升机系统'],['输送线','输送线系统','输送系统'],['电控','电控系统','电气控制','电气控制系统','电气控制及出入库附件','电控、检测及安全附件'],['软件','软件系统'],['网络设备','网络及IT设备'],['安装调试及培训','安装调试培训','安装调试','安装','培训'],['备品备件及工具','备品备件','备件及工具','备件'],['其他']];
const supplyName=value=>value.normalize('NFKC').replace(/\([^)]*\)/g,'').replace(/\s+/g,'').trim();
function summarizeProjectSupply(raw){
 const entries=[];
 for(const line of String(raw||'').split('\n')){
  if(!line.trim())continue;
  const split=line.indexOf('：'),name=split>=0?line.slice(0,split).trim():'';
  // A source cell can contain line breaks. Continuations belong to their module,
  // including multiline freight, insurance and source notes in the Other category.
  if(name&&name.length<=80&&!/[；。]|表列数量|供货方|备注/.test(name)&&!['说明','数量','单位'].includes(name))entries.push({name,body:line.slice(split+1)});
  else if(entries.length)entries[entries.length-1].body+='\n'+line;
  else entries.push({name:'',body:line});
 }
 if(!entries.length)return {supplyScope:[],supplyDetails:[]};
 const grouped=PROJECT_SUPPLY_CATEGORIES.map(()=>[]);
 for(const entry of entries){const index=supplyAliases.findIndex(names=>names.includes(supplyName(entry.name)));grouped[index<0?9:index].push(entry);}
 const compact=(entry,index)=>{
  const body=entry.body,description=body.split('；供货方：')[0],count=body.match(/（表列数量：([^）]+)）/);
  const responsibility=body.match(/；供货方：甲方(?:；|$)/)?'甲方提供':description.match(/不在乙方供货范围|^甲方(?:提供|负责)(?!安装|机械|电气|接线)|未列[^；。]*供货[^；。]*/)?.[0];
  const software=index===5?[...description.matchAll(/(?:WMS|WCS|RMS|RCS|WES)(?:（[^）]*）)?\s*\d+\s*套/g)].map(m=>m[0].replace(/（[^）]*）/g,'')):[];
  const control=index===4?description.match(/电控(?:系统)?\s*(\d+\s*套)/)?.[1]:null;
  const value=count?count[1].replace(/(\d)([^\d.,\s])/,'$1 $2'):software.length?software.join('、'):control||(!entry.name?description:'详见清单');
  const pending=/未单列|范围[^；。\n]*待确认|供货[^；。\n]*待确认/.test(description)?'范围待确认':'';
  const qualifiers=[responsibility,pending].filter(Boolean);
  const result=value+(qualifiers.length?'（'+qualifiers.join('，')+'）':'');
  return index===9&&entry.name&&entry.name!=='其他'?entry.name+'：'+result:result;
 };
 const supplyScope=grouped.map((rows,index)=>({category:PROJECT_SUPPLY_CATEGORIES[index],value:rows.length?rows.map(row=>compact(row,index)).join('；'):'待补充'}));
 const supplyDetails=grouped.map((rows,index)=>({category:PROJECT_SUPPLY_CATEGORIES[index],value:rows.length?rows.map(row=>(row.name&&row.name!==PROJECT_SUPPLY_CATEGORIES[index]?row.name+'：':'')+row.body).join('\n'):'待补充'}));
 return {supplyScope,supplyDetails};
}

// Read-only presentation of the original snapshot. Never rewrites source records.
export function summarizeProjectCore(item){
 const lines=value=>String(value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
 const unique=values=>[...new Set(values)];
 const category=name=>name.replace(/（[^）]*）/g,'').replace(/系统$/,'').trim().replace(/^四向穿梭车$/,'四向车').replace(/^货架及附属设施$/,'货架').replace(/^电气控制$/,'电控').replace(/^(电气控制及出入库附件|电控、检测及安全附件)$/,'电控及附件').replace(/^网络及.*设备$/,'网络设备').replace(/^备品备件及工具$/,'备品备件');
 const {supplyScope,supplyDetails}=summarizeProjectSupply(item.supplyScope);
 const transport=String(item.transport||'').replace(/^原表运输方式\/贸易条件：/,'').replace(/；实际运输方式须按原表确认$/,'（贸易条件）');
 const dimensions=[];
 for(const line of lines(item.palletSize)){
  const pattern='([0-9,]+\\s*[×xX*]\\s*[0-9,]+(?:\\s*[×xX*]\\s*[0-9,]+)?\\s*(?:mm|毫米))';
  for(const re of [new RegExp('托盘\\s*'+pattern,'g'),new RegExp(pattern+'\\s*托盘','g')]){
   for(const match of line.matchAll(re))dimensions.push(match[1].replace(/\s*[xX*×]\s*/g,' × ').replace(/\s*(mm|毫米)$/,' mm'));
  }
 }
 // Legacy imported data can already contain a bare, explicitly named pallet field.
 if(!dimensions.length&&/^\s*[0-9,]+\s*[×xX*]\s*[0-9,]+\s*(?:mm|毫米)\s*$/.test(item.palletSize||''))dimensions.push(String(item.palletSize).trim());
 const equipmentLoad=lines(item.equipmentLoad).flatMap(line=>{
  const split=line.indexOf('：'),name=split<0?'载荷':category(line.slice(0,split));
  if(split>=0&&!/(车|提升|输送|升降|移载)/.test(name))return [];
  const loads=unique([...line.matchAll(/[≥≤约]?\s*\d[\d,]*(?:\.\d+)?\s*(?:kg|千克|公斤)/gi)].map(m=>m[0].trim().replace(/\s*(?:kg|千克|公斤)$/i,' kg')));
  if(!loads.length)return [];
  const qualifier=[/含车/.test(line)?'含车':'',loads.length>1&&/(差异|不一致|待确认)/.test(line)?'待确认':'',/(冷冻库|阴凉库|常温库)/.test(line)?'分库区':''].filter(Boolean).join('，');
  return [{category:name,value:loads.join(' / ')+(qualifier?'（'+qualifier+'）':'')}];
 });
 const efficiency=lines(item.efficiency).flatMap(line=>{
  if(/^(其他验收|项目目标|验收依据)：/.test(line))return [...line.matchAll(/[^。]*(?:口径差异|不一致|待确认)[^。]*。?/g)].map(m=>m[0].trim());
  if(/^测试条件：/.test(line))return ['测试：'+line.slice(5).split('。')[0]];
  // Keep restrictions and disagreements verbatim; they change the meaning of a rate.
  return [line];
 });
 return {supplyScope,supplyDetails,transport:transport||'待补充',palletSize:unique(dimensions),equipmentLoad,efficiency};
}
