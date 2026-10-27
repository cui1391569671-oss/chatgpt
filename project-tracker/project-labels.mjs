// Project identities confirmed by the user on 2026-10-27. Codes always come
// from the information-sheet snapshot, never from the legacy numeric prefix.
const verifiedProjectNames=[
 ['台湾相洋项目','台湾桃园项目'],
 ['北起旭创泰国四向车立库项目','北起旭创泰国项目','北起泰国项目'],
 ['韩国 Altiall Samsung Gwangju 四向车项目','韩国Altiall Samsung Gwangju项目','韩国三星项目'],
 ['林德马来西亚CEL四向车项目','林德马来西亚CEL项目','林德马来西亚项目'],
 ['林德香港邦泰流浮山六向车立体库项目','林德香港邦泰流浮山项目','林德香港项目'],
 ['意大利 Logivia Pierrel Capua 医药四向车项目','意大利Logivia Pierrel Capua项目','意大利 pirrel 项目']
];
export function projectNameOnly(value){return String(value||'').replace(/^\s*(?:PM|P)\s*\d+\s*[-—:：|｜]?\s*/i,'').trim();}
const projectNameKey=value=>projectNameOnly(value).replace(/\s+/g,'').toLowerCase();
const verifiedProjectKeys=verifiedProjectNames.map(names=>new Set(names.map(projectNameKey)));
const namesWithoutLegacyCode=new Set(['杭州中策','杭州中策项目','四川达州','四川达州项目'].map(projectNameKey));
export function projectLabel(value,items=[]){
 const original=String(value||'').trim(),name=projectNameOnly(value),key=projectNameKey(value);
 if(!key)return original;
 const matches=items.filter(item=>{
  const aliases=[item.projectName,item.sourceSheet,...(item.aliases||[])].filter(Boolean).map(projectNameKey);
  return aliases.includes(key)||verifiedProjectKeys.some(group=>group.has(key)&&aliases.some(alias=>group.has(alias)));
 });
 if(matches.length===1&&matches[0].projectCode)return matches[0].projectCode.trim()+' '+name;
 return namesWithoutLegacyCode.has(key)?name:original;
}
// Sort by the labels users see, so hidden legacy prefixes cannot put an
// unnumbered project between information-sheet codes.
export function compareProjectLabels(a,b,items=projectLabelItems){
 const left=projectLabel(a,items),right=projectLabel(b,items);
 const leftNumbered=projectNameOnly(left)!==left,rightNumbered=projectNameOnly(right)!==right;
 return Number(rightNumbered)-Number(leftNumbered)||left.localeCompare(right,'zh-CN',{numeric:true});
}
let projectLabelItems=[];
export function displayProject(value){return projectLabel(value,projectLabelItems);}
export async function loadProjectLabels(){
 try{
  const response=await fetch('/api/project-core-information',{cache:'no-store'});if(!response.ok)throw Error();
  const payload=await response.json();
  if(!Array.isArray(payload.items)||!payload.items.every(item=>item&&typeof item.projectCode==='string'&&item.projectCode.trim()&&typeof item.projectName==='string'&&(item.sourceSheet===undefined||typeof item.sourceSheet==='string')&&(item.aliases===undefined||Array.isArray(item.aliases)&&item.aliases.every(alias=>typeof alias==='string'))))throw Error();
  const next=payload.items.map(item=>({projectCode:item.projectCode.trim(),projectName:item.projectName,sourceSheet:item.sourceSheet,aliases:item.aliases}));
  const changed=JSON.stringify(projectLabelItems)!==JSON.stringify(next);projectLabelItems=next;return changed;
 }catch{return false;/* A failed refresh retains the last successfully loaded labels. */}
}
