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

## Annual plans
`annualPlans` 为私人空间独立集合，日期以 YYYY-MM-DD 保存，结束日期包含当天；适配 SVAR 时转换为不包含结束边界，避免日期偏移。跨年事项在相交年份显示。默认2026年，年份写入URL。支持新增、编辑、删除、分类搜索、进度和拖动排期；双击时间条或点击事项入口打开共享侧栏。拖动使用组件日期计算结果提交原有记录级patch；保存中锁定交互，失败恢复原时间条并保留拟修改数据于编辑面板。侧栏打开或拖动保存期间阻止导航和后台刷新，关闭未保存编辑须确认，删除须确认。服务端校验日期、进度、分类、唯一ID，拒绝从工作空间写入年度计划。

## Word practice

词汇库的 Google 表格同步状态和状态刷新入口使用原按钮、状态区与 Feedback。Apps Script 密钥未配置时禁用状态刷新并提示配置；失败展示原因且不清空原记录。成功读取单词内容后合并 D1，保留已存在的掌握程度与学习日期/次数；练习时不刷新当前队列，避免中断输入。Apps Script 编辑后推送、每5分钟检查，现有每日项目归档调度独立保留。
跟打显示英文，默写隐藏英文及音标直至查看答案或提交结果；输入在IME组合期间不提交。错误拼写不自动前进且允许修改；本轮拼错、查看答案或暂时不会的词记为不会，首次正确记为已掌握；每次成功提交增加一次复习次数并记录日期，首次学习日期已有时保留。每词使用原 vocabulary 记录级patch 保存，失败保留当前输入并允许重试，不前进或重复计数；成功后才能进入下一词。统计仅针对本轮，错词可单独重练；不宣称间隔重复算法。练习期间阻止外部导航和后台刷新；退出确认只影响未提交答案，已提交记录保留。朗读使用浏览器英语语音，失败明确提示并在退出时停止。

单词练习直接渲染在英语学习页面，不以模态弹窗展示。词汇库独立路由 `vocabularyLibrary` 保留导入、搜索、熟练度筛选和词条；练习页右上入口和词库返回按钮双向导航。练习进行中切换词库须确认；设置与完成状态允许正常导航，跨页面卸载 React 根并停止朗读，重新进入后正确重建。词汇库路由保持英语学习侧栏的选中状态。

## English practice completion records
A completed round is saved atomically with the final word review in the private `wordPracticeSessions` collection. Each record contains a stable round ID, mode, start/completion timestamps, completion date in Asia/Shanghai, word count, first-attempt correct count, and elapsed seconds. Retry reuses the round ID; partial rounds are not recorded as completed. Failed saves preserve the final answer and allow retry. Practice displays today’s completed rounds/word count and the ten most recent rounds with accuracy and duration; refresh reads cloud records. Shared collection patches preserve concurrent sessions and unrelated vocabulary/review data. Work-space writes to this collection are rejected. Existing data needs no migration.

## Home fitness
The fitness view is private-only. Independently authored Chinese summaries of four verified Free Exercise DB bodyweight movements provide steps and source links. Editable example sets/amounts are not personalized prescriptions. The user starts a round, marks actually completed sets, then explicitly ends and records; zero completed sets cannot be saved. Partial completion stores only completed sets. Failed writes preserve checks and the stable record ID for retry. Leaving an active round or edited arrangement is blocked until recording, cancelling, or resetting. Fitness records use the existing collection patch/CAS flow, remain isolated from work scope, and survive ordinary vocabulary sync. The ten most recent records and today’s training count are shown. No records are written to third-party fitness services.

Fitness animations use same-origin authenticated GIFs with PNG posters. Each can be played/paused; offscreen and background animations switch to static posters. Reduced-motion defaults to static, while explicit user playback is allowed. Failed GIFs fall back to posters with persistent feedback; missing posters preserve the text instructions. Width/height reserves image geometry.

Fitness profile changes are explicit save-and-regenerate operations. Unsubmitted edits do not affect the current plan; failed saves retain inputs and the prior applied plan. An active workout prevents editing the profile. Completed training records retain actual sets and are not recomputed after profile updates. Optional measurements are validated, never guessed, and do not mechanically determine load. Profiles are private-only and use shared record patches/CAS conflict handling. Profile/plan drafts are independently tracked and cancel/reset preserve the other draft. Component-owned buttons under workspaceFitness are excluded from the legacy global busy mutation.
