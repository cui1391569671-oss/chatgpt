# UI静态告警逐项复核

2026-10-22；保留原始严格审计结果，不修改审计归属来掩盖问题。下面是源码核对；除明确写明外，不代表每条业务路径都已在浏览器重测。

|原编号|位置|核对结论|代码依据|
|---|---|---|---|
|1|index.html:4955|共享适配有源码证据；项目表单已实测|tasks-ui/src/workspace-primitives.tsx:39–69，enhanceDate/enhanceSelect/scan；workspace.css 隐藏 data-ui-native/data-ui-date-native；保留原节点和事件。|
|2|tasks-ui/src/annual-plans.tsx:43|共享组件归属明确；各业务面板未逐一重测|tasks-ui/src/components/ui/input.tsx:4 按 type=date 转到 WorkspaceDateInput。|
|3|tasks-ui/src/main.tsx:62|共享组件归属明确；各业务面板未逐一重测|tasks-ui/src/components/ui/input.tsx:4 按 type=date 转到 WorkspaceDateInput。|
|4|tasks-ui/src/personal-info.tsx:81|共享组件归属明确；各业务面板未逐一重测|tasks-ui/src/components/ui/input.tsx:4 按 type=date 转到 WorkspaceDateInput。|
|5|index.html:4948|共享适配有源码证据；项目表单已实测|tasks-ui/src/workspace-primitives.tsx:39–69，enhanceDate/enhanceSelect/scan；workspace.css 隐藏 data-ui-native/data-ui-date-native；保留原节点和事件。|
|6|tasks-ui/src/components/workspace-select.tsx:4|大小写解析误报|tasks-ui/src/components/workspace-select.tsx 导入 Radix Select；审计器将大写 Select 当成原生 select。|
|7|workbench.html:6511|共享适配有源码证据；项目表单已实测|tasks-ui/src/workspace-primitives.tsx:39–69，enhanceDate/enhanceSelect/scan；workspace.css 隐藏 data-ui-native/data-ui-date-native；保留原节点和事件。|
|8|index.html:4919|外部绑定存在|index.html closeProjectSearch/searchToggle.onclick（约5356行）。|
|9|index.html:4966|外部绑定存在|index.html projectCreateCancel.onclick（约5439行）；创建按钮 type=submit。|
|10|index.html:4971|外部绑定/隐藏旧控件|index.html issueClose.onclick 与 issueCancel.onclick（约5350行）；workspace-primitives 隐藏旧关闭按钮。|
|11|index.html:4971|外部绑定/隐藏旧控件|index.html issueClose.onclick 与 issueCancel.onclick（约5350行）；workspace-primitives 隐藏旧关闭按钮。|
|12|landing.html:4199|历史未路由源码，不当成线上无效入口|worker.mjs 页面路由仅 /work /personal /projects；landing.html 无公开路由。|
|13|landing.html:4201|历史未路由源码，不当成线上无效入口|worker.mjs 页面路由仅 /work /personal /projects；landing.html 无公开路由。|
|14|landing.html:4201|历史未路由源码，不当成线上无效入口|worker.mjs 页面路由仅 /work /personal /projects；landing.html 无公开路由。|
|15|tasks-ui/src/fitness.tsx:34|链接行为，非无动作按钮|tasks-ui/src/fitness.tsx Button asChild 包裹 href 链接；ui/button.tsx 使用 Slot 转发。|
|16|tasks-ui/src/fitness.tsx:39|链接行为，非无动作按钮|tasks-ui/src/fitness.tsx Button asChild 包裹 href 链接；ui/button.tsx 使用 Slot 转发。|
|17|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=home；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|18|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=tasks；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|19|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=requirements；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|20|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=notes；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|21|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=completedGames；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|22|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=upcoming；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|23|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=maintenance；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|24|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=wardrobe；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|25|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=vocabulary；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|26|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=drive；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|27|workbench.html:6510|隐藏兼容导航；非可见无效按钮|旧 nav data-view=projects；workbench-shell.js mountWorkbenchShell 标记 data-legacy-navigation；workspace.css 隐藏；新导航通过 bridge.navigate（workbench-shell.js:26）执行。|
|28|workbench.html:6510|外部绑定存在|workbench.html accountToggle.onclick（约7192行）。|
|29|workbench.html:6510|外部绑定存在|workbench.html recover.onclick 调用 load（约7169行），status 控制显示。|
|30|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #accountClose：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|31|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #personalInfoLink：personalInfoLink.onclick（约7313行）。|
|32|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #drivePreviewClose：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|33|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #clothingCancel：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|34|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #notificationClose：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|35|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #releaseClose：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|36|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #releaseRefresh：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|37|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #deleteEntertainment：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|38|workbench.html:6511|外部绑定存在；完整业务回归仍需分面板验收|workbench.html #cancel：按 ID 绑定 .onclick；见对应控制名搜索结果（约6764/6791/6845/7169/7183/7193行）。|
|39|tasks-ui/src/personal-info.tsx:81|共享样式归属明确|tasks-ui/src/components/ui/textarea.tsx:10 含 resize-none，共享 Textarea 被当成原生 textarea。|

浏览器额外发现日期选择器选中或取消后焦点落到BODY。已在 WorkspaceDateInput 保存触发器引用并通过 DateChooser.onCloseAutoFocus 显式恢复；这是真实运行时问题，不属于原39条静态告警。最终回归结果见本批整改验收。
