export const WORKSPACE_COLLECTIONS=['tasks','notes','events','maintenance','vocabulary','completedGames','driveLinks','wardrobe','outfits'];
export const PROJECT_COLLECTIONS=['data','archive','deletedProjects','projects','priorities'];
export function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export function equalRecord(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
export function ensureProjectIds(source){
 const out=structuredClone(source);for(const collection of ['data','archive','deletedProjects']){const used=new Set();for(const row of out[collection]||[]){if(!row.id){const text=JSON.stringify(canonical(row));let a=2166136261,b=5381;for(const c of text){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}const prefix='legacy-'+(a>>>0).toString(16)+(b>>>0).toString(16);let id=prefix,n=0;while(used.has(id))id=prefix+'-'+(++n);row.id=id;}if(used.has(row.id))throw Error('记录编号重复');used.add(row.id);}}return out;
}
const property=(obj,key)=>Object.hasOwn(obj,key)?{exists:true,value:obj[key]}:{exists:false};
export function recordChanges(base,next,collections){
 const operations=[];
 for(const collection of collections){
  if(collection==='priorities'){const b=base[collection]||{},n=next[collection]||{};for(const id of new Set([...Object.keys(b),...Object.keys(n)]))if(!equalRecord(property(b,id),property(n,id)))operations.push({collection,id,action:'value',before:property(b,id),after:property(n,id)});continue;}
  if(collection==='projects'){const b=new Set(base.projects||[]),n=new Set(next.projects||[]);for(const id of new Set([...b,...n]))if(b.has(id)!==n.has(id))operations.push({collection,id,action:'membership',present:n.has(id)});continue;}
  const b=new Map((base[collection]||[]).map(x=>[x.id,x])),n=new Map((next[collection]||[]).map(x=>[x.id,x]));
  for(const id of new Set([...b.keys(),...n.keys()])){const old=b.get(id),row=n.get(id);if(equalRecord(old,row))continue;if(!old){operations.push({collection,id,action:'create',record:row});continue;}if(!row){operations.push({collection,id,action:'delete',before:old});continue;}
   const changes={};for(const field of new Set([...Object.keys(old),...Object.keys(row)]))if(field!=='id'&&!equalRecord(property(old,field),property(row,field)))changes[field]={before:property(old,field),after:property(row,field)};
   operations.push({collection,id,action:'update',changes});
  }
 }
 return operations;
}
export class RecordConflict extends Error{}
export function applyRecordChanges(source,operations,collections){
 if(!Array.isArray(operations)||operations.length>10000)throw Error('无效变更');const result=structuredClone(source),unsafe=new Set(['__proto__','prototype','constructor']);
 const set=(obj,key,value)=>{if(unsafe.has(key))throw Error('无效字段');if(!value||typeof value.exists!=='boolean')throw Error('无效字段值');if(value.exists)obj[key]=structuredClone(value.value);else delete obj[key];};
 for(const op of operations){if(!op||!collections.includes(op.collection)||typeof op.id!=='string'||!op.id||op.id.length>200||unsafe.has(op.id))throw Error('无效记录');
  if(op.collection==='priorities'){if(op.action!=='value')throw Error('无效变更');const map=result.priorities??={};const current=property(map,op.id);if(!equalRecord(current,op.before)&&!equalRecord(current,op.after))throw new RecordConflict('该项目优先级已更新');set(map,op.id,op.after);continue;}
  if(op.collection==='projects'){if(op.action!=='membership'||typeof op.present!=='boolean')throw Error('无效变更');const list=result.projects??=[];if(op.present&&!list.includes(op.id))list.push(op.id);if(!op.present)result.projects=list.filter(x=>x!==op.id);continue;}
  const list=result[op.collection]??=[];const index=list.findIndex(x=>x.id===op.id),current=list[index];
  if(op.action==='create'){if(!op.record||op.record.id!==op.id)throw Error('无效新增');if(current&&!equalRecord(current,op.record))throw new RecordConflict('该记录已存在');if(!current)list.push(structuredClone(op.record));}
  else if(op.action==='delete'){if(current&&!equalRecord(current,op.before))throw new RecordConflict('该记录已被修改，请核对后删除');if(current)list.splice(index,1);}
  else if(op.action==='update'){if(!current)throw new RecordConflict('该记录已删除');if(!op.changes||typeof op.changes!=='object')throw Error('无效修改');for(const [field,change] of Object.entries(op.changes)){if(field==='id'||unsafe.has(field))throw Error('无效字段');const actual=property(current,field);if(!equalRecord(actual,change.before)&&!equalRecord(actual,change.after))throw new RecordConflict('同一字段已被其他页面修改：'+field);set(current,field,change.after);}}
  else throw Error('无效操作');
 }
 return result;
}
