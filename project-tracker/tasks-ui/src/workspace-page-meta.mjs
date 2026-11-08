const common={help:'帮助',tasks:'待办事项',notes:'笔记',calendar:'日历与日程',today:'今日计划',personalInfo:'个人信息',drive:'项目资料',projects:'项目问题'};
const personal={home:'我的一天',calendar:'生活日历',annualPlans:'年度计划',notes:'我的笔记',checkins:'打卡记录',vocabulary:'英语学习',vocabularyLibrary:'词汇库',fitness:'居家健身',completedGames:'娱乐记录',upcoming:'即将发售',photography:'摄影',photographyNotes:'摄影笔记',wardrobe:'衣橱／穿搭',beauty:'化妆／护肤',maintenance:'设备维保'};
const work={home:'工作概览',notes:'工作笔记',drive:'项目基础信息',projectBudget:'项目预算成本',projectShipping:'项目发货信息',projectPlan:'项目计划'};
export function workspacePageMeta(scope,view){const space=scope==='work'?'工作台':'私人工作台',label=(scope==='work'?work:personal)[view]||common[view]||space;return {label,title:label+' · '+space};}

// Shared by top navigation and page search; labels stay with page metadata.
export function workspaceNavigation(scope){return scope==='work'?[{title:'工作管理',short:'工作',views:['home','projects','projectPlan','tasks','today','calendar']},{title:'资料与记录',short:'资料',views:['drive','projectBudget','projectShipping','notes']}]:[{title:'安排与记录',short:'安排',views:['home','calendar','today','annualPlans','tasks','notes']},{title:'英语',short:'英语',views:['vocabulary','vocabularyLibrary']},{title:'成长与生活',short:'生活',views:['checkins','fitness','maintenance']},{title:'形象管理',short:'形象',views:['wardrobe','beauty']},{title:'摄影',short:'摄影',views:['photography','photographyNotes']},{title:'娱乐',short:'娱乐',views:['completedGames']}];}
export function workspaceNavView(view){return view==='vocabularyLibrary'?'vocabulary':view==='upcoming'?'completedGames':view;}

// Personal-site navigation preserves each route's workspace and source record ownership.
export function workspaceSiteNavigation(scope){
 const column=(title,space,views,primary=false)=>({title,space,views,primary});
 return [
  {title:'项目问题',columns:[column('项目','work',['projects'],true)]},
  {title:'项目计划',direct:true,columns:[column('项目计划','work',['projectPlan'],true)]},
  {title:'日历',columns:[column('日历与计划','work',['calendar','today'],true),column('日历与计划','personal',['calendar','today'],true)]},
  {title:'项目资料',columns:[column('项目资料','work',['drive','projectBudget','projectShipping'],true)]},
  {title:'记录',columns:[column('工作记录','work',['notes'],true),column('私人记录','personal',['notes'],true)]},
  {title:'英语',columns:[column('学习与词汇','personal',['vocabulary','vocabularyLibrary'],true)]},
  {title:'生活',columns:[column('日程与计划','personal',['annualPlans','tasks'],true),column('成长与习惯','personal',['checkins','fitness']),column('生活管理','personal',['maintenance'])]},
  {title:'形象管理',columns:[column('形象管理','personal',['wardrobe','beauty'],true)]},
  {title:'摄影',columns:[column('摄影作品','personal',['photography','photographyNotes'],true)]},
  {title:'娱乐',columns:[column('娱乐作品','personal',['completedGames'],true)]}
 ].map(group=>({...group,columns:group.columns.filter(column=>!scope||column.space===scope)})).filter(group=>group.columns.length).map(group=>({...group,items:group.columns.flatMap(column=>column.views.map(view=>[column.space,view]))}));
}
