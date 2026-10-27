export const PLAN_CATEGORIES={learning:'学习',health:'健康',life:'生活',travel:'旅行',other:'其他'};
export function validPlanDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='1900-01-01'&&value<='2100-12-31'&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function annualPlanFieldError(item){
 if(typeof item.title!=='string'||!item.title.trim())return {field:'title',message:'请填写事项名称。'};
 if(item.title.length>200)return {field:'title',message:'事项名称最多200字。'};
 if(!Object.hasOwn(PLAN_CATEGORIES,item.category))return {field:'category',message:'请选择有效分类。'};
 if(!validPlanDate(item.startDate))return {field:'start',message:'请选择1900–2100年内的有效开始日期。'};
 if(!validPlanDate(item.endDate))return {field:'end',message:'请选择1900–2100年内的有效结束日期。'};
 if(item.endDate<item.startDate)return {field:'end',message:'结束日期不能早于开始日期。'};
 if(!Number.isInteger(item.progress)||item.progress<0||item.progress>100)return {field:'progress',message:'完成进度须为0–100的整数。'};
 if(typeof item.detail!=='string'||item.detail.length>5000)return {field:'detail',message:'备注最多5000字。'};
 return null;
}
export function validAnnualPlan(item){return !!item&&typeof item.id==='string'&&!!item.id&&item.id.length<=100&&typeof item.title==='string'&&!!item.title.trim()&&item.title.length<=200&&validPlanDate(item.startDate)&&validPlanDate(item.endDate)&&item.endDate>=item.startDate&&Object.hasOwn(PLAN_CATEGORIES,item.category)&&Number.isInteger(item.progress)&&item.progress>=0&&item.progress<=100&&typeof item.detail==='string'&&item.detail.length<=5000;}
export function validAnnualPlans(items){return Array.isArray(items)&&items.length<=2000&&new Set(items.map(x=>x?.id)).size===items.length&&items.every(validAnnualPlan);}
export function planIntersectsYear(item,year){return item.startDate<=year+'-12-31'&&item.endDate>=year+'-01-01';}
export function shiftPlanDate(value,days){const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
