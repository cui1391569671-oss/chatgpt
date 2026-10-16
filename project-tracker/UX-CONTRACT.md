# Workbench UX contract

## Product invariants
工作与私人数据隔离；来源WORKBENCH-PLAN.md、CLOUD-STORAGE.md及服务端API。保留记录级保存、冲突恢复、失败保留输入与防重复提交。UI统一不改变云端权限、数据格式或同步协议。

## Canonical UI map

名称联想由 `workspace-autocomplete.js` 维护 DOM combobox/listbox 适配器，视觉归属 `workspace.css`。娱乐名称输入400ms后显示来源候选；方向键导航、Enter确认、Escape只收起列表、Tab或点击外部关闭。中文组合输入不请求，过时结果取消。候选不自动选择；确认时填写名称、封面与来源ID，随后按ID读取详细信息。原始输入节点、字段ID和保存协议保留。
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

## Personal information
账号中心的个人信息页使用共享 Input、WorkspaceSelect、WorkspaceDateInput、Dialog、确认和 WorkspaceFeedback。工作/私人空间打开同一账号的资料库，不进入 workspace 导出或集合。独立资料密码使用 PBKDF2-SHA256（600000 次）派生 AES-256-GCM 密钥；每次保存独立随机 IV，数据库仅保存密文、盐、IV 和版本号，接口按登录账号隔离。密码和密钥不上传、不放浏览器持久化存储。密码不可找回，首次创建前明确告知。号码默认遮挡；切换标签页、退出视图和闲置五分钟清除解锁状态及未保存表单，隐私锁定优先于草稿恢复。普通关闭编辑须确认放弃修改，编辑或提交期间阻止导航；失败保留输入，版本冲突阻止覆盖。最多100条资料，不提供银行卡PIN/CVV字段。

## Verification

封面搜索统一为显式候选选择，包含来源、原名、日期及平台，未选中不覆盖。输入使用400ms防抖，IME期间暂停，取消请求并丢弃过时响应。保存 mediaSource/mediaSourceId/steamAppId/coverMode；服务端校验来源与媒体类型。名称或类型变更解除旧关联；关联资料按ID刷新，不以标题重新猜测。手动封面在刷新时保留。未配置/上游失败明确提示，原表单与封面保留。配置文档见 MEDIA-SOURCES.md，浏览器与Git中不保存密钥。

娱乐作品保存沿用记录级 patch、服务端校验和冲突保护。旧记录缺少 trackingStatus 时视为 completed；新记录默认 planned，只有已完成状态要求完成日期。进度/总量/季数/重复次数为非负整数，进度不能超过已知总量，结束不能早于开始。操作失败保留编辑输入；历史只在新建或状态、进度、季数、重复次数改变时追加，最多100条；剧集和动漫支持明确的“＋1集”，不擅自标记整部完成。状态/排序/显示模式使用 URL 参数，不包含敏感信息。
构建组件资源与页面，运行Node测试及样式归属检查。浏览器核对工作与私人全部入口、原生适配和React表单、日期约束/键盘、搜索清空/无结果、保存成功/失败重试、手机及长文本边界。
静态审计是辅助证据：委托事件监听器、隐藏兼容字段和运行时noValidate可能被误报；须用代码与浏览器验证并记录，不为消除报告而伪造归属或改动业务行为。
