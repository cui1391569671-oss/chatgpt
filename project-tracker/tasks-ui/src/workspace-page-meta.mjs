const common={tasks:'待办事项',notes:'笔记',calendar:'日历与日程',today:'今日任务',personalInfo:'个人信息',drive:'项目资料',projects:'项目问题'};
const personal={home:'我的一天',calendar:'生活日历',annualPlans:'年度计划',notes:'我的笔记',checkins:'打卡记录',vocabulary:'英语学习',vocabularyLibrary:'词汇库',fitness:'居家健身',completedGames:'娱乐记录',upcoming:'即将发售',wardrobe:'我的衣橱',maintenance:'设备维保'};
const work={home:'工作概览',notes:'工作笔记'};
export function workspacePageMeta(scope,view){const space=scope==='work'?'工作台':'私人工作台',label=(scope==='work'?work:personal)[view]||common[view]||space;return {label,title:label+' · '+space};}

// Shared by top navigation and page search; labels stay with page metadata.
export function workspaceNavigation(scope){return scope==='work'?[{title:'工作管理',short:'工作',views:['home','projects','tasks','today']},{title:'资料与记录',short:'资料',views:['drive','notes']}]:[{title:'安排与记录',short:'安排',views:['home','calendar','annualPlans','tasks','notes']},{title:'成长与生活',short:'生活',views:['checkins','vocabulary','fitness','completedGames','wardrobe','maintenance']}];}
export function workspaceNavView(view){return view==='vocabularyLibrary'?'vocabulary':view==='upcoming'?'completedGames':view;}
