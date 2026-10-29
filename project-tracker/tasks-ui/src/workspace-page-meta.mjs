const common={tasks:'待办事项',notes:'笔记',calendar:'日历与日程',today:'今日任务',personalInfo:'个人信息',drive:'项目资料',projects:'项目问题'};
const personal={home:'我的一天',calendar:'生活日历',annualPlans:'年度计划',notes:'我的笔记',checkins:'打卡记录',vocabulary:'英语学习',vocabularyLibrary:'词汇库',fitness:'居家健身',completedGames:'娱乐记录',upcoming:'即将发售',wardrobe:'我的衣橱',maintenance:'设备维保'};
const work={home:'工作概览',notes:'工作笔记'};
export function workspacePageMeta(scope,view){const space=scope==='work'?'工作台':'私人工作台',label=(scope==='work'?work:personal)[view]||common[view]||space;return {label,title:label+' · '+space};}

// Shared by top navigation and page search; labels stay with page metadata.
export function workspaceNavigation(scope){return scope==='work'?[{title:'工作管理',short:'工作',views:['home','projects','tasks','today','calendar']},{title:'资料与记录',short:'资料',views:['drive','notes']}]:[{title:'安排与记录',short:'安排',views:['home','calendar','annualPlans','tasks','notes']},{title:'成长与生活',short:'生活',views:['checkins','vocabulary','fitness','completedGames','wardrobe','maintenance']}];}
export function workspaceNavView(view){return view==='vocabularyLibrary'?'vocabulary':view==='upcoming'?'completedGames':view;}

// Personal-site navigation preserves each route's workspace and source record ownership.
export function workspaceSiteNavigation(scope){
 const column=(title,space,views,primary=false)=>({title,space,views,primary});
 return [
  {title:'工作',columns:[column('项目与待办','work',['projects','tasks'],true),column('今日与日历','work',['today','calendar']),column('项目资料','work',['drive'])]},
  {title:'记录',columns:[column('工作记录','work',['notes'],true),column('私人记录','personal',['notes'],true)]},
  {title:'生活',columns:[column('日程与计划','personal',['calendar','annualPlans','tasks'],true),column('成长与习惯','personal',['checkins','vocabulary','fitness']),column('生活管理','personal',['completedGames','wardrobe','maintenance'])]}
 ].map(group=>({...group,columns:group.columns.filter(column=>!scope||column.space===scope)})).filter(group=>group.columns.length).map(group=>({...group,items:group.columns.flatMap(column=>column.views.map(view=>[column.space,view]))}));
}
