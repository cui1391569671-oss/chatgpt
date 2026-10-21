# Workbench design

## Direction

公开产品介绍首页已停用；访问 `/` 直接跳转 `/work`，未登录沿用工作台登录页面。搜索引擎不索引应用页面。账号个人信息与现有工作、私人空间保留。
中文项目管理与私人工作台，采用 floating 布局和浅色玻璃材质，优先保证表格、日历和长文本可读。沿用 shadcn-glass-ui Light 预设；不逐页配色，不增加装饰性统计或演示内容。

## Canonical sources
- `theme-presets/shadcn-glass-ui/`：固定上游32d762578b6b9997851ed8ee930ab10a418b1bf9的原始色板、Light主题及许可证。
- `glass-preset.css`：从上游生成，禁止手工修改。
- `admin-theme.css`：语义角色别名，不复制色值。
- `workspace.css`：共享框架、玻璃材质、控件规格、表格密度、搜索、日期与反馈。
- `workbench-page.css`、`projects-page.css`：页面业务布局；禁止重定义共享控件外观。
- `tasks-ui/src/style.css`、`calendar-ui/src/style.css`：组件布局/工具类隔离，语义颜色引用同一预设。
- `tasks-ui/src/components/`：共享行为与明确组件变体。日历内部 authored 日期组件保留上游行为，使用同套中文、主题和键盘规范。

## Tokens
颜色只使用semantic/component token。primary用于主操作，success/warning/error/info用于相应状态；颜色不能是唯一状态信息。数据中用户自选的日程颜色属于业务数据，保留。
字体Inter及系统中文回退；正文/控件14px，辅助信息12px，小标题16px，面板标题18px。普通控件高44px、圆角14px；多行输入至少140px。弹窗圆角20px；间距基准8px，常用16/24px。
表格表头44px，数据行52px起，单元格12px 16px内边距；长内容自然扩展。业务列宽、合并单元格保留业务归属；宽表在自身区域滚动。

## Layout
业务框架固定100dvh，无文档横向或纵向溢出；长列表、表格、日历与弹窗在各自区域滚动。flex/grid允许收缩，长文本换行。桌面侧栏独立floating，顶栏侧栏按钮/导航组/搜索/通知为独立浮岛。只有概览/项目/资料/笔记保持同组。业务页不显示重复标题说明区；账号入口只在侧栏底部。
公开首页可自然纵向滚动。手机保留12–16px边距和可操作保存入口。

## Controls and feedback

封面资料使用 TMDB（影视）、IGDB + Steam（游戏）、Bangumi + MAL（动漫）。候选选择器复用现有封面网格，展示原名、日期、平台与来源；未选择不自动覆盖封面。关联后保存来源 ID，并按 ID 获取详情；自定义封面优先。旧记录不按名称在后台重新匹配。密钥仅在 Worker Secret 中使用，配置说明见 MEDIA-SOURCES.md。

娱乐记录参考 Yamtrack 的作品跟踪方式，以现有工作台组件和 API 独立实现：游戏、电影、剧集与动漫共用想看/想玩、进行中、暂停、完成、弃坑状态，支持开始/完成日期、个人评分、当前/总进度、季数、重复次数及跟踪历史。游戏 Steam 总体评价与个人评分分别展示。保留旧 completedGames 集合及无状态记录的已完成语义，不改写旧数据；作品库默认采用紧凑封面墙：2:3封面展示状态与个人评分，下方保留名称和平台，点击封面编辑；缺图以名称占位。详细进度与备注在列表查看。作品库支持封面墙/列表、排序、状态筛选和24条分页。共享业务规则由 media-tracking.mjs 同时供前后端消费；media-library.js 通过构建嵌入，不复制第三方实现。

个人信息属于“我的账号”，在工作台内使用 `personalInfo` 视图，两种空间共享同一账号资料库。界面复用共享控件和玻璃材质，业务布局只定义于 `workbench-page.css`；加密资料与普通工作台集合分离。号码默认遮挡，编辑时提供显示/隐藏，密码不持久化。详见 UX-CONTRACT.md 的 Personal information。
搜索统一搜索图标、清空按钮、恢复焦点和原有结果刷新；无结果明确说明，并保留清空/重置入口。
日期为中文 authored 日期选择；工作台共享DateChooser提供月份/年份、键盘方向键、今天、清除及取消，普通日期保留YYYY-MM-DD和min/max/required规则。原生隐藏字段只承担兼容FormData和校验，不显示系统日期弹窗。日历内部日期也由组件管理，不混入OS弹窗。
编辑弹窗统一可见标题、说明、关闭入口、取消/保存；任务与项目侧开抽屉为明确变体。原业务节点ID与监听器保留。
短暂成功/信息提示由WorkspaceFeedback统一位置、语义色和生命周期；错误保留表单内alert/字段关联，不仅出现在toast。

## Motion and accessibility
切换采用预设duration-base（200ms）及cubic-bezier(.22,1,.36,1)，不延迟操作；减少动态偏好下关闭过渡。保留可见焦点、键盘导航、模态焦点管理与关闭后返回。
仅语义隐藏工具与减少动态偏好允许使用必要的!important；禁止用其修补视觉冲突。

## Development policy
按AGENTS.md直接修改canonical owner，先删除冲突声明。禁止新增覆盖样式表、加选择器权重或复制独立颜色。生成HTML样式块及JS资源只通过构建更新。
历史设计决策归档在verification/history，不是现行开发规范。

## Annual plans
私人工作台年度计划采用 SVAR React Gantt 2.8.1（MIT），默认2026年全年、月刻度，支持周刻度详细视图。左侧事项、右侧时间轴；手机使用纯时间轴和可键盘操作的事项入口。主题经 workspace.css 中 annual-theme 将 SVAR 变量映射至现有语义token；布局归属 workbench-page.css，依赖原样保留，侧栏编辑复用共享 Sheet、Input、日期、Select 和 Feedback。条形悬停轻微强调，侧栏沿用共享展开动效，减少动态偏好关闭过渡。

## Word practice
英语词库保留原卡片与导入，单词练习参考 Qwerty Learner 的跟打/默写流程，在工作台独立实现；未复制或整体嵌入上游源码、词库或音效。练习使用原 vocabulary 集合，默认未掌握词且优先未复习，10/20/50词一轮。英语学习默认直接展示练习页（view=vocabulary），词汇库独立为 view=vocabularyLibrary，页面提供双向入口；共享 Select、Input、Feedback 及退出确认管理交互，workbench-page.css 归属布局；逐字正误用语义色和下划线表达，成功切换轻动效尊重减少动态偏好。

Practice completion uses the existing summary surface and semantic status text. Today’s completion state and the ten most recent rounds appear on the practice page; no independent palette, modal, or dashboard is introduced.

## Home fitness
Private fitness uses the existing glass surfaces, shared Button/Input/Checkbox/Search and semantic feedback. Plan/guidance and profile columns respond to the fitness content container rather than the viewport: below 760px the plan uses one column and profile fields use two, and below 480px profile fields use one. Long content wraps within its container and actions remain reachable through the existing page scroll; a guidance jump link keeps instructions reachable on mobile. No new palette or motion system.

Fitness guidance uses native keyboard-accessible disclosure cards: the first movement is expanded initially, remaining movements open on demand. This reduces the initial scroll length while preserving all instructions and media in the page scroll container.

Game covers on the media wall use contain within the existing fixed 2:3 slots so PSP and other packaging ratios remain fully visible. Movie/TV/anime poster fill behavior is unchanged.

Entertainment density: category filters and sort/status controls share a wrapping row; poster slots use 120px minimum desktop tracks with 12px horizontal gaps and two columns on mobile. Text/pagination gaps are reduced while shared control heights and full game-cover fitting remain unchanged.

Short related form fields use the canonical `.workspace-field-row` in workspace.css, with container-driven wrapping, 160px minimum tracks and 12px gaps. Native adapted forms group original nodes through WorkspacePrimitives.groupFields; React forms use the same row class. Long names, links and notes retain their natural full-row width. Tasks/annual field spacing is 16px. Audit coverage and limits are recorded in verification/form-layout-audit.md.
