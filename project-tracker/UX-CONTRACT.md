# 工作台交互归属

## ilamy Calendar 交互归属（2026-10-15，替代此前日历约定）

| 能力 | 维护实现 | 约定 |
|---|---|---|
| 日历及日程表单 | 官方 ilamy Calendar 3.2.1 | 默认表单和官方插件；不使用旧通用表单，不覆盖 renderEventForm |
| 日历日期/单选 | 官方 Radix 日期、时间、选择器 | 中文 translations、zh-cn locale、Asia/Shanghai；由组件维护弹层和焦点 |
| 其他业务表单 | workbench.html edit() | 日期保持原生；单选由共享 shadcn Select 管理显示与键盘交互 |
| 日程 CRUD | calendar-adapter.js / change() | onEventsChange 原子提交整次操作，稳定 ID，按记录冲突校验 |
| 失败恢复 | calendar-ui/src/main.jsx | 失败保留本页操作并提供重试或放弃，失败期间不接受后续写入 |
| 删除 | 官方范围选择 + 集成确认 | 明确对象与范围，取消不写入，冲突不覆盖云端 |
| 全局视觉/滚动条 | workspace-design.css | ilamy 通过隔离的变量适配，不改变其他页面 |

不新增浏览器业务缓存。后台刷新避开打开的表单、未决请求和失败待重试操作。工作与私人接口 scope 不变；来源待办/项目问题禁止日历改写。时区、全日排他结束和 RRULE 展开在前后端保持一致。依赖与许可证、构建命令见 calendar-ui/README.md。其他业务规则继续以 CLOUD-STORAGE.md、DESIGN.md 和后端校验为准。

## shadcn-admin 应用框架（2026-10-16）

| 能力 | 维护实现 | 约定 |
|---|---|---|
| 导航/空间切换 | tasks-ui/src/workspace-shell.tsx、workbench-shell.js | 分组列表；路由与原 view 共用，正在编辑时阻止离开；工作/私人按原接口隔离 |
| 侧栏 | 上游 SidebarProvider / Sidebar | 桌面图标折叠；手机 Radix Sheet、焦点管理、Escape关闭；Ctrl/Command+B不抢占输入法和表单编辑 |
| 账号/提醒 | 原 accountCenter / notifications | 顶部与底部入口转发原操作，失败反馈、刷新及鉴权继续由原业务拥有 |
| 框架菜单 | Radix DropdownMenu | 键盘方向键、Escape关闭、焦点回到触发器，真实空间跳转 |
| Scrollbar | workspace-design.css | 复用全局可见滚动条，不隐藏业务容器滚动条 |
| Toast | workbench.html toast() | 复用原通知；编辑中导航提供原文提示 |
| CRUD | 原 change()/cloud-records.mjs | 业务记录和冲突检查保持不变，此次不迁移数据库 |

业务来源：WORKBENCH-PLAN.md 数据隔离与保留要求、CLOUD-STORAGE.md 存储契约。导航 query 记录当前视图；业务搜索保持现有短暂状态，此次不扩大到 URL 持久化。Date 保留 native 归属（操作系统弹层）；Select/Listbox 采用 authored 归属，共用 shadcn Select。日历按上节 authored 归属。

## 共用业务组件归属（2026-10-16）

| 能力 | Canonical owner | 约定 |
|---|---|---|
| Select/Listbox | tasks-ui/src/components/workspace-select.tsx | authored；Radix Select 中文名称、键盘选择、等宽门户；隐藏原 select 保留 FormData，弹窗重开同步当前业务值 |
| Date | 原生 date input；日历 ilamy | 业务日期 native；日历 authored；北京时间与原数据格式不变 |
| Form | workspace-primitives.tsx enhanceForm / 原有保存逻辑 | noValidate、中文错误、首个无效字段焦点；保留原表单ID、监听器与输入 |
| Dialog | workspace-primitives.tsx / components/ui/dialog.tsx | 焦点限制与恢复、Escape/遮罩走原 cancel 阻止逻辑；项目详情为右侧变体 |
| 删除/命名 | WorkspacePrimitives.confirm | 异步结果；删除默认聚焦取消，取消不发请求；不覆盖 cloud-records 冲突规则 |
| CRUD | 既有 change()/deleteRecord()/项目按记录 patch | 保存成功关闭，失败保留表单并可重试；不执行数据库迁移 |

适配器不改写原记录值、数据隔离或权限。原生节点作为兼容层，不再是单选可见交互的维护入口。原项目表自定义管理/归档浮层仍由 index.html 管理；不宣称该遗留区域已完成 shadcn React 迁移。

## 原版框架布局与页面搜索（2026-10-16）

- 原版Sidebar inset、Main、Header结构；页面标题说明来自真实栏目，替代自定义面包屑/日期。
- 页面搜索由 workspace-shell.tsx 与上游 Command/cmdk维护；Cmd/Ctrl+K避开输入法合成与表单输入，空结果、清空、方向键和回车选择使用同一维护入口。编辑未完成时沿用原 canLeave 阻止跳转。
- 待办“新建”通过React Portal放入页面标题操作区，保留原本的保存与失败恢复。
- 表单适配器写属性、标题说明同步都必须幂等；不能因MutationObserver互相触发而反复更新。
- 只采用浅色原版主题，不添加无法使用的主题/配置按钮或虚假演示数据。

侧栏外观补充：WorkspaceSidebar 采用上游 floating variant；桌面边框与圆角由 Sidebar 内置样式维护，手机继续 Sheet。

## 玻璃材质与视口边界（2026-10-16）

共享材质归属 liquid-glass.css；工作、私人各view使用同一框架。原有数据隔离、保存、冲突、删除和失效恢复流程不变。玻璃层不改变可点击层级，嵌套日期/下拉门户必须高于表单并留在视口内。

页面可以自然纵向滚动；宽数据表与日历在自身区域滚动，操作区不能随宽表被推出页面。小屏工具栏换行，标题/笔记连续字符断行，grid/flex子项可收缩；弹窗/详情内部可滚动，保存与取消可达。桌面、768px、390px和320px验证不得出现文档横向溢出。只隐藏原兼容导航和装饰内容，不以裁切隐藏业务控件处理溢出。
