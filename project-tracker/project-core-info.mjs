export function validProjectCoreInfo(value){
 const text=(v,max)=>typeof v==='string'&&v.length<=max;
 return !!value&&value.sourceSpreadsheetId==='1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM'&&text(value.sourceTitle,200)&&/^\d{4}-\d{2}-\d{2}$/.test(value.syncedAt)&&Array.isArray(value.items)&&value.items.length<=200&&new Set(value.items.map(x=>x?.projectCode)).size===value.items.length&&value.items.every(x=>x&&text(x.projectCode,80)&&x.projectCode.trim()&&text(x.projectName,300)&&x.projectName.trim()&&['supplyScope','transport','palletSize','equipmentLoad'].every(k=>text(x[k],5000))&&text(x.sourceSheet,300)&&Number.isInteger(x.sourceSheetId)&&x.sourceSheetId>=0&&text(x.sourceUpdatedAt,40));
}

export async function projectCoreInfoRoute(request,env){
 const respond=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!['GET','PUT'].includes(request.method))return respond({error:'不支持的操作'},405);
 if(request.method==='PUT'){
  if(request.headers.get('Origin')!==new URL(request.url).origin)return respond({error:'Invalid origin'},403);
  const raw=await request.text();if(raw.length>1000000)return respond({error:'数据过大'},413);
  let payload;try{payload=JSON.parse(raw);}catch{return respond({error:'数据格式不正确'},400);}
  if(!validProjectCoreInfo(payload))return respond({error:'项目信息格式不正确'},400);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS project_core_information (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)').run();
  await env.DB.prepare('INSERT INTO project_core_information (id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(JSON.stringify(payload)).run();
  return respond({ok:true,count:payload.items.length});
 }
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS project_core_information (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)').run();
 const row=await env.DB.prepare('SELECT payload FROM project_core_information WHERE id=1').first();
 return respond(row?JSON.parse(row.payload):{items:[],syncedAt:null});
}
