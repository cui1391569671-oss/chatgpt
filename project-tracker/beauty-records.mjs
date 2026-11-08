export const BEAUTY_CATEGORIES={makeup:'化妆',skincare:'护肤'};
export function validBeautyRecord(row){
 const text=(value,max)=>typeof value==='string'&&value.length<=max;
 if(!row||!text(row.id,100)||!row.id||!text(row.title,200)||!row.title.trim()||!Object.hasOwn(BEAUTY_CATEGORIES,row.category)||!text(row.date,10)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!text(row.products,2000)||!text(row.detail,5000))return false;
 const date=new Date(row.date+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===row.date;
}
export function validBeautyRecords(rows){return Array.isArray(rows)&&rows.length<=2000&&new Set(rows.map(row=>row?.id)).size===rows.length&&rows.every(validBeautyRecord);}
export function beautyRecordPage(rows,{query='',category='all',page=1}={}){
 const words=query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const items=rows.filter(row=>(category==='all'||row.category===category)&&words.every(word=>[row.title,row.products,row.detail,row.date,BEAUTY_CATEGORIES[row.category]].join(' ').normalize('NFKC').toLocaleLowerCase().includes(word))).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(items.length/20)),current=Math.min(pages,Math.max(1,Number.isSafeInteger(page)?page:1));
 return {items:items.slice((current-1)*20,current*20),total:items.length,page:current,pages};
}
