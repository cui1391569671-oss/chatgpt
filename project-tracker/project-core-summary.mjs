// Read-only presentation of the original snapshot. Never rewrites source records.
export function summarizeProjectCore(item){
 const lines=value=>String(value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
 const unique=values=>[...new Set(values)];
 const category=name=>name.replace(/（[^）]*）/g,'').replace(/系统$/,'').trim().replace(/^四向穿梭车$/,'四向车').replace(/^货架及附属设施$/,'货架').replace(/^电气控制$/,'电控').replace(/^(电气控制及出入库附件|电控、检测及安全附件)$/,'电控及附件').replace(/^网络及.*设备$/,'网络设备').replace(/^备品备件及工具$/,'备品备件');
 const supplyScope=lines(item.supplyScope).flatMap(line=>{
  const split=line.indexOf('：');
  if(split<0)return [{category:'供货',value:line}];
  const name=category(line.slice(0,split)),body=line.slice(split+1),count=body.match(/（表列数量：([^）]+)）/);
  if(/运输|保险|境外险|包装|实施|安装|培训/.test(name)||!/(货架|车|提升|输送|电|软件|移载|升降|轨道|门|备件|附件|网络|IT)/.test(name))return [];
  const description=body.split('；供货方：')[0];
  const responsibility=body.match(/；供货方：甲方(?:；|$)/)?'甲方提供':description.match(/不在乙方供货范围|^甲方(?:提供|负责)(?!安装|机械|电气|接线)|未列[^；。]*供货[^；。]*/)?.[0];
  const software=/软件/.test(name)?[...description.matchAll(/(?:WMS|WCS|RMS|RCS|WES)(?:（[^）]*）)?\s*\d+\s*套/g)].map(m=>m[0].replace(/（[^）]*）/g,'')):[];
  const control=/电控|电气控制/.test(name)?description.match(/电控(?:系统)?\s*(\d+\s*套)/)?.[1]:null;
  const value=count?count[1].replace(/(\d)([^\d.,])/,'$1 $2'):software.length?software.join('、'):control||'待确认';
  return [{category:name,value:responsibility&&value==='待确认'?responsibility:value+(responsibility?'（'+responsibility+'）':'')}];
 });
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
 return {supplyScope,transport:transport||'待补充',palletSize:unique(dimensions),equipmentLoad,efficiency};
}
