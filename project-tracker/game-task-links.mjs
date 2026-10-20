// Game ownership stays in completedGames; tasks retain only an optional reference.
export function gameRecords(workspace){return (workspace.completedGames||[]).filter(x=>(x.mediaType||'game')==='game');}
export function validGameTaskReference(task){return task.mediaRecordId===undefined||typeof task.mediaRecordId==='string'&&task.mediaRecordId.length<=100;}
export function migrateGameTasks(workspace,choices){
 if(!Array.isArray(choices)||!choices.length)throw Error('请选择要整理的游戏待办。');
 const next=structuredClone(workspace),seen=new Set();next.completedGames??=[];
 for(const choice of choices){
  if(seen.has(choice.taskId))throw Error('同一待办不能重复整理。');seen.add(choice.taskId);
  const task=next.tasks.find(x=>x.id===choice.taskId);
  if(!task||task.taskType!=='game'||task.mediaRecordId)throw Error('待办已变更，请关闭预览后重新整理。');
  let game;
  if(choice.targetId){game=gameRecords(next).find(x=>x.id===choice.targetId);if(!game)throw Error('关联游戏已移除，请重新选择。');}
  else{
   if(typeof choice.newId!=='string'||!choice.newId||choice.newId.length>100||next.completedGames.some(x=>x.id===choice.newId))throw Error('新游戏标识已被使用，请重新打开预览。');
   // A completed reminder is not evidence that a game has been completed.
   game={id:choice.newId,title:task.title,mediaType:'game',trackingStatus:'planned',platform:task.gamePlatform||'',detail:task.detail||'',completedDate:'',startedDate:'',rating:null,coverUrl:'',coverMode:'manual',progress:0,total:0,season:0,repeats:0};
   next.completedGames.push(game);
  }
  task.mediaRecordId=game.id;task.taskType='task';delete task.gamePlatform;
 }
 return next;
}
