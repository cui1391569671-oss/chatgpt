# Workbench design

## Direction
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
