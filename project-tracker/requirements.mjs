export const REQUIREMENT_STATUSES={proposed:'待评估',planned:'已排期',active:'处理中',done:'已完成',dismissed:'暂不处理'};
export function validRequirements(rows){const ids=new Set();return Array.isArray(rows)&&rows.length<=2000&&rows.every(r=>r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=100&&!ids.has(r.id)&&(ids.add(r.id),true)&&typeof r.title==='string'&&!!r.title.trim()&&r.title.length<=200&&typeof r.detail==='string'&&r.detail.length<=5000&&['high','normal','low'].includes(r.priority)&&typeof r.status==='string'&&Object.hasOwn(REQUIREMENT_STATUSES,r.status)&&(r.statusBeforeCompletion===undefined||typeof r.statusBeforeCompletion==='string'&&r.statusBeforeCompletion!=='done'&&Object.hasOwn(REQUIREMENT_STATUSES,r.statusBeforeCompletion))&&['createdAt','updatedAt'].every(k=>typeof r[k]==='string'&&Number.isFinite(Date.parse(r[k]))));}
export function requirementWithStatus(row,status,at=new Date().toISOString()){
 if(typeof status!=='string'||!Object.hasOwn(REQUIREMENT_STATUSES,status))throw Error('无效需求状态');
 const next={...row,status,updatedAt:at};
 if(status==='done'&&row.status!=='done')next.statusBeforeCompletion=typeof row.status==='string'&&Object.hasOwn(REQUIREMENT_STATUSES,row.status)?row.status:'proposed';
 if(status!=='done')delete next.statusBeforeCompletion;
 return next;
}
export function requirementCompletion(row,completed,at){
 const previous=row.statusBeforeCompletion;
 const restored=typeof previous==='string'&&previous!=='done'&&Object.hasOwn(REQUIREMENT_STATUSES,previous)?previous:'proposed';
 return requirementWithStatus(row,completed?'done':restored,at);
}
