import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
function sources(dir){return readdirSync(new URL(dir,import.meta.url),{withFileTypes:true}).filter(entry=>!entry.name.startsWith('.')).flatMap(entry=>entry.isDirectory()?sources(dir+'/'+entry.name):[dir+'/'+entry.name]).sort();}
export function tasksSourceHash(){
 const hash=createHash('sha256');
 for(const file of ['package.json','package-lock.json','fingerprint.mjs','build.mjs','LICENSE.txt','UPSTREAM.json',...sources('src'),'../personal-vault.mjs','../file-trigger.js'])hash.update(file+'\n'+readFileSync(new URL(file,import.meta.url),'utf8').replace(/\r\n/g,'\n')+'\n');
 return hash.digest('hex');
}
