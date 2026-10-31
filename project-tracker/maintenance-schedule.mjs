// Shared by the maintenance editor and server-side record validation.
export const MAINTENANCE_FREQUENCIES={none:'不重复',daily:'每天',weekly:'每周',monthly:'每月'};
export function validMaintenanceFrequency(value){return value===undefined||typeof value==='string'&&Object.hasOwn(MAINTENANCE_FREQUENCIES,value);}
export function nextMaintenanceDate(anchor,frequency){
 if(!validMaintenanceFrequency(frequency)||!frequency||frequency==='none'||typeof anchor!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(anchor))return '';
 const date=new Date(anchor+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==anchor)return '';
 if(frequency==='monthly'){
  const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);
  const last=new Date(date.getTime());last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);date.setUTCDate(Math.min(day,last.getUTCDate()));
 }else date.setUTCDate(date.getUTCDate()+(frequency==='weekly'?7:1));
 const next=date.toISOString().slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(next)?next:'';
}
