# 工作台交互归属

## ilamy Calendar 交互归属（2026-10-15，替代此前日历约定）

| 能力 | 维护实现 | 约定 |
|---|---|---|
| 日历及日程表单 | 官方 ilamy Calendar 3.2.1 | 默认表单和官方插件；不使用旧通用表单，不覆盖 renderEventForm |
| 日历日期/单选 | 官方 Radix 日期、时间、选择器 | 中文 translations、zh-cn locale、Asia/Shanghai；由组件维护弹层和焦点 |
| 其他业务表单 | workbench.html edit() | 原有原生日期和 select 保持系统行为 |
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

业务来源：WORKBENCH-PLAN.md 数据隔离与保留要求、CLOUD-STORAGE.md 存储契约。导航 query 记录当前视图；业务搜索保持现有短暂状态，此次不扩大到 URL 持久化。原业务表单 Date 与 Select/Listbox 保留 native 归属（操作系统弹层）；日历按上节 authored 归属。不存在统一替换所有业务编辑组件的授权推断。
