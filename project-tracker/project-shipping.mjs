export function validProjectShipping(rows){
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 return Array.isArray(rows)&&rows.length<=500&&new Set(rows.map(x=>x?.id)).size===rows.length&&rows.every(x=>x&&/^shipping-\d+$/.test(x.id)&&text(x.title,300)&&text(x.recipient,100)&&text(x.address,1000)&&text(x.contact,200));
}
export function projectShippingRows(items,records){
 const rows=new Map(records.map(x=>[x.id,{...x,linked:false}]));
 for(const item of items){const id='shipping-'+item.sourceSheetId;rows.set(id,{...(rows.get(id)||{}),id,title:item.projectName,projectCode:item.projectCode,linked:true});}
 return [...rows.values()];
}
