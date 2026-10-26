export function projectNameOnly(value){return String(value||'').replace(/^\s*(?:PM|P)\s*\d+\s*[-—:：]?\s*/i,'').trim();}
export function projectLabel(value,items=[]){
 const original=String(value||'').trim(),name=projectNameOnly(value),key=name.replace(/\s+/g,'').toLowerCase();
 const matches=items.filter(item=>[item.projectName,item.sourceSheet,...(item.aliases||[])].some(alias=>projectNameOnly(alias).replace(/\s+/g,'').toLowerCase()===key));
 return matches.length===1&&matches[0].projectCode?matches[0].projectCode+' '+name:original;
}
let projectLabelItems=[];
export function displayProject(value){return projectLabel(value,projectLabelItems);}
export async function loadProjectLabels(){try{const response=await fetch('/api/project-core-information',{cache:'no-store'});if(!response.ok)throw Error();const payload=await response.json();if(!Array.isArray(payload.items)||!payload.items.every(item=>item&&typeof item.projectCode==='string'&&item.projectCode.trim()&&typeof item.projectName==='string'&&(item.aliases===undefined||Array.isArray(item.aliases)&&item.aliases.every(alias=>typeof alias==='string'))))throw Error();projectLabelItems=payload.items;}catch{/* A failed refresh must retain the last successfully loaded labels. */}}
