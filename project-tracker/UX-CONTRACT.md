# Workbench UX contract

## Product invariants
工作与私人数据隔离；来源WORKBENCH-PLAN.md、CLOUD-STORAGE.md及服务端API。保留记录级保存、冲突恢复、失败保留输入与防重复提交。UI统一不改变云端权限、数据格式或同步协议。

## Canonical UI map
| Capability | Owner | Contract |
|---|---|---|
| Navigation | workspace-shell.tsx / workbench-shell.js | URL记录视图；保留原导航桥接；编辑期间沿用离开限制 |
| Table selection | TasksTable / 原项目表 | 待办按页选择，批量操作与排序保留 |
| Select/Listbox | WorkspaceSelect | authored Radix；原select仅隐藏存值；中文标签、键盘、焦点与碰撞处理 |
| Date | WorkspaceDateInput / DateChooser；ilamy内部日期组件 | authored中文弹层；YYYY-MM-DD；Asia/Shanghai；min/max/required；方向键/回车/Escape |
| Form | workspace-primitives / RHF Form / ilamy Form | 统一字段规格、应用校验、保留输入、错误关联和提交锁 |
| Dialog | shared Dialog / Sheet | 可见标题说明、关闭、取消/保存；项目/待办可侧开；焦点陷阱与返回 |
| Search | WorkspaceSearch / enhanceWorkspaceSearch | 同一外观与清空行为；原本地/远程搜索归属保留；IME不触发误提交 |
| Feedback | WorkspaceFeedback + form alert | 成功/信息短暂提示；错误文字在所属表单或内容区域持续可见 |
| Scrollbar | workspace.css | 细滚动条且可见，控件内部滚动；标准与WebKit兼容 |

## Interaction details
普通输入/搜索/选择器44px、圆角14px；多行输入140px起。按钮状态和日期按钮状态引用同一主题与动效变量。危险操作保留确认，默认焦点位于安全操作。
无结果页保留搜索/筛选与清空/重置，不能伪装成加载。空列表说明没有记录并保留新建入口；网络失败可重试。成功不覆盖错误、不仅依赖颜色。
日期组件只改显示与选择交互，隐藏原生字段保留FormData、ID与合法性约束。选择后触发原input/change事件；表单重置与打开时重新同步。可选日期可清除，必填日期不可清除。
应用文档固定视口；宽表、日历、长列表及弹窗内部滚动。320px/390px下主操作可达，不以裁切隐藏业务功能。

## Verification
构建组件资源与页面，运行Node测试及样式归属检查。浏览器核对工作与私人全部入口、原生适配和React表单、日期约束/键盘、搜索清空/无结果、保存成功/失败重试、手机及长文本边界。
静态审计是辅助证据：委托事件监听器、隐藏兼容字段和运行时noValidate可能被误报；须用代码与浏览器验证并记录，不为消除报告而伪造归属或改动业务行为。
