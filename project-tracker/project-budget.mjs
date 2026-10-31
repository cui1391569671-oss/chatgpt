export const PROJECT_BUDGET_FIELDS=[['currency','预算币种',300],['basis','金额口径',300],['installation','安装费用',300],['transport','运输费用',300],['warranty','质保费用',300],['implementation','实施费用',300],['risk','风险金',300],['identifiedSubtotal','已识别小计',300],['total','五类合计',300],['review','复核状态',300],['note','预算说明',2000],['source','预算来源',2000]];
export function validProjectBudget(budget){return !!budget&&typeof budget==='object'&&!Array.isArray(budget)&&Object.keys(budget).length===PROJECT_BUDGET_FIELDS.length&&PROJECT_BUDGET_FIELDS.every(([key,,max])=>typeof budget[key]==='string'&&budget[key].length<=max);}
export function parseProjectBudget(rows){
 const text=v=>String(v??'').trim(),start=rows.findIndex(row=>/^\d+\s+项目核心预算$/.test(text(row[0])));if(start<0)return undefined;
 const fields=new Map(PROJECT_BUDGET_FIELDS.map(([key,label])=>[label,key])),values={};
 for(const row of rows.slice(start+1)){
  if(/^\d+\s+/.test(text(row[0])))break;
  for(let i=0;i<row.length-1;i++){const key=fields.get(text(row[i]));if(!key)continue;if(Object.hasOwn(values,key))throw Error('预算区块含重复字段，请核对源表');values[key]=text(row[i+1]);}
 }
 // Older project sheets may have a budget heading without the supported financial fields.
 if(!Object.keys(values).length)return undefined;
 const budget=Object.fromEntries(PROJECT_BUDGET_FIELDS.map(([key])=>[key,values[key]||'']));
 if(!validProjectBudget(budget))throw Error('预算字段过长，原数据已保留，请核对源表');return budget;
}
