import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Style audit: keeps the layout standard enforceable without rewriting legacy CSS.
// - A stylesheet without a budget entry is new and must already comply.
// - A stylesheet with a budget entry may not exceed its recorded counts.
// See 开发规则.md「页面与布局标准」.
const root=new URL('..',import.meta.url);
const dir=fileURLToPath(root);
const budget=JSON.parse(readFileSync(new URL('style-budget.json',import.meta.url),'utf8'));
const ALLOWED_BREAKPOINTS=new Set([320,480,768,1100]);
const GENERATED=new Set(['glass-preset.css']);
const problems=[];
const measure=css=>{
 const body=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[\w-]+:\s*[^;]*;/g,'');
 const px=[...body.matchAll(/(?<![-\w.])(\d+(?:\.\d+)?)px/g)].map(m=>Number(m[1])).filter(v=>v>1);
 const breakpoints=[...new Set([...body.matchAll(/@media[^{]*?(\d+)px/g)].map(m=>Number(m[1])))]
  .filter(v=>!ALLOWED_BREAKPOINTS.has(v)).sort((a,b)=>a-b);
 return {px:[...new Set(px)].sort((a,b)=>a-b),pxCount:px.length,breakpoints};
};
const files=readdirSync(dir).filter(name=>name.endsWith('.css')).sort();
for(const file of files){
 if(GENERATED.has(file))continue;
 const {px,pxCount,breakpoints}=measure(readFileSync(new URL(file,root),'utf8'));
 const entry=budget[file];
 if(!entry){
  if(pxCount)problems.push(`${file}: new stylesheet must use layout tokens, found ${pxCount} raw px (${px.slice(0,6).join(', ')})`);
  if(breakpoints.length)problems.push(`${file}: breakpoint(s) ${breakpoints.join(', ')} are outside 320/480/768/1100`);
  continue;
 }
 if(pxCount>entry.rawPx)problems.push(`${file}: raw px ${pxCount} exceeds the recorded budget ${entry.rawPx}`);
 const added=breakpoints.filter(value=>!entry.breakpoints.includes(value));
 if(added.length)problems.push(`${file}: new breakpoint(s) ${added.join(', ')} are outside the recorded set`);
}
if(problems.length){
 for(const problem of problems)console.error('style-audit: '+problem);
 process.exitCode=1;
}else{
 console.log(`style-audit: ok (${files.length} stylesheets, ${Object.keys(budget).length} legacy budgets)`);
}
