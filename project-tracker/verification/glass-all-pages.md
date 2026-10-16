# 全站玻璃材质与边界验证 · 2026-10-16

## 实现

liquid-glass.css 统一玻璃材质及边界规则，由 build-pages 嵌入工作台、独立项目表和首页，生成 glass-theme.mjs 供登录页复用。原版 shadcn floating Sidebar、原业务表单、日历及持久化接口不变。本地预览服务器使用隔离数据，包含长任务标题、长笔记及连续英文，无生产写入。

表格、资料宽表和日历保留容器内滚动；工具栏/操作组可换行，flex/grid子项可收缩。弹窗限制视口尺寸且可滚动；Radix日期弹层提高门户层级，项目遗留优先级/状态菜单使用共享positionProjectMenu按视口碰撞定位。没有通过根节点overflow-x:hidden掩盖问题。

## 浏览器证据

glass-layout-checks.json记录12个业务view在1280、768、390、320px下的48组运行时检查。文档宽度等于视口宽度，检查的操作按钮未越过左右边界。工作页面：home/projects/tasks/drive/notes；私人页面：home/tasks/notes/vocabulary/completedGames/wardrobe/maintenance。

- 320px独立项目表：文档320px，表格容器302px，内部表格1080px，横向滚动仅发生在表格内。
- 320px长笔记：文档320px，笔记文字区域270px，scrollWidth270px。
- 320px笔记弹窗：左右16px，内容宽286px且无水平溢出。
- 320px项目详情：左右0/320px，内容scrollWidth等于clientWidth318px。
- 320px日历表单及日期弹层：表单位于x16至304px，日期弹层x30至320px；修复后z-index90，截图确认可见、未被表单遮挡。
- 320px项目优先级菜单：x167.78至312px，底部741.20px，在844px视口内。
- 390×600短屏：手机导航面板y12至588px；新建待办抽屉底部576px，保存按钮底部559px，可达。
- 1280px桌面折叠：侧栏面板52px，文档无水平溢出，展开后恢复。
- 首页及登录页320px：文档宽320px；账号、CSRF及安全Cookie逻辑未变。
- 待办新建、优先级下拉、保存关闭与回显通过；笔记和项目表单打开/取消通过。控制台无错误。

## 工程验证与限制

build-pages成功，124项测试全部通过，git diff --check通过。严格静态审计保存于glass-static-audit.json，仍有46项既有兼容层/控件归属等问题，未宣称全项目严格审计通过。此批未引入新依赖，无数据库迁移，尚未发布。
