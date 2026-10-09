import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('./wrangler.json',import.meta.url);
const config=JSON.parse(readFileSync(path,'utf8'));
const id=process.env.CF_D1_DATABASE_ID || config.d1_databases[0].database_id;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('请设置构建变量 CF_D1_DATABASE_ID 为现有数据库 ID');
config.d1_databases[0].database_id=id;
writeFileSync(path,JSON.stringify(config,null,2)+'\n');
