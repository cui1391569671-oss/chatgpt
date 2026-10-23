import {readFileSync,writeFileSync} from 'node:fs';
export function checkDiagnosticBaseline(kind,diagnostics){
 const path=new URL('../verification/'+kind+'-baseline.json',import.meta.url),actual={};
 for(const diagnostic of diagnostics){const key=JSON.stringify([diagnostic.file,diagnostic.code,diagnostic.message]);actual[key]=(actual[key]||0)+1;}
 if(process.argv.includes('--write-baseline')){
  writeFileSync(path,JSON.stringify({schema:1,note:'Existing diagnostics only; this is a ratchet, not a clean strict check.',diagnostics},null,2)+'\n');
  console.log(kind+': recorded '+diagnostics.length+' existing diagnostics');return;
 }
 const baseline=JSON.parse(readFileSync(path,'utf8')),allowed={};
 for(const diagnostic of baseline.diagnostics){const key=JSON.stringify([diagnostic.file,diagnostic.code,diagnostic.message]);allowed[key]=(allowed[key]||0)+1;}
 const added=Object.entries(actual).filter(([key,count])=>count>(allowed[key]||0));
 if(added.length||process.argv.includes('--strict')&&diagnostics.length){console.error(JSON.stringify({kind,total:diagnostics.length,newDiagnostics:added},null,2));process.exitCode=1;return;}
 console.log(kind+': no new diagnostics ('+diagnostics.length+' existing; strict clean check '+(diagnostics.length?'NOT passed':'passed')+')');
}
