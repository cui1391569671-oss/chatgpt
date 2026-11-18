import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Markup audit: the page skeleton rules are worthless if nothing checks them.
// Two machine-checkable rules from 开发规则.md「页面骨架」:
//   1. titles go through setPageHeader, never through a direct DOM write;
//   2. page-level states use .workspace-state, not the legacy empty-state classes.
const root=fileURLToPath(new URL('..',import.meta.url));
const GENERATED=new Set(['pages.mjs']);
const RULES=[
  {name:'direct heading write', pattern:/\$\(['"]heading['"]\)\.textContent\s*=/g},
  {name:'legacy empty state', pattern:/class="(?:empty|card empty|site-empty|workspace-empty-state)"/g}
];
const sources=readdirSync(root,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&/\.(?:js|mjs|html)$/.test(entry.name)&&!GENERATED.has(entry.name))
  .map(entry=>entry.name)
  .sort();
const problems=[];
for(const file of sources){
  const text=readFileSync(root+file,'utf8');
  for(const rule of RULES){
    const matches=text.match(rule.pattern);
    if(matches)problems.push(`${file}: ${rule.name} x${matches.length}`);
  }
}
if(problems.length){
  for(const problem of problems)console.error('markup-audit: '+problem);
  process.exitCode=1;
}else{
  console.log(`markup-audit: ok (${sources.length} sources, ${RULES.length} rules)`);
}
