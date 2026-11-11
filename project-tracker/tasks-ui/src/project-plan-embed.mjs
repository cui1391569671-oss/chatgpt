import {PROJECT_PLAN_SOURCE_ID} from '../../project-plan-sheet.mjs';

export function projectPlanSheetUrls(sheetId){
 const source=new URL('https://docs.google.com/spreadsheets/d/'+PROJECT_PLAN_SOURCE_ID+'/edit');
 if(typeof sheetId==='string'&&/^\d+$/.test(sheetId)&&Number.isSafeInteger(Number(sheetId))){
  source.hash='gid='+Number(sheetId);
 }
 const embed=new URL(source);
 embed.searchParams.set('rm','minimal');
 return {source:source.href,embed:embed.href};
}
