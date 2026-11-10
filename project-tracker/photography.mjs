// Photography is a private collection, separate from workspace snapshots and event images.
export const PHOTO_MAX_BYTES=1000000;
export const PHOTO_THUMB_MAX_BYTES=70000;
export const PHOTO_MAX_EDGE=2400;
export const PHOTO_PAGE_SIZE=24;
export function photoFields(value){
 if(!value||!['title','spot','shotOn','note'].every(k=>typeof value[k]==='string'))return null;
 const fields=Object.fromEntries(['title','spot','shotOn','note'].map(k=>[k,value[k].trim()]));
 if(fields.title.length>100||!fields.spot||fields.spot.length>80||fields.note.length>2000)return null;
 if(fields.shotOn&&(!/^\d{4}-\d{2}-\d{2}$/.test(fields.shotOn)||!Number.isFinite(Date.parse(fields.shotOn+'T00:00:00Z'))||new Date(fields.shotOn+'T00:00:00Z').toISOString().slice(0,10)!==fields.shotOn))return null;
 fields.title ||= '未命名照片';
 return fields;
}
