# Floating 侧栏逐页核查 · 2026-10-16

本地隔离预览，真实浏览器逐一直接访问路由，读取运行时 data-variant、侧栏圆角与旧导航可见性。

| 空间 | view | 结果 |
| --- | --- | --- |
| 工作 | home | floating |
| 工作 | projects | floating |
| 工作 | tasks | floating |
| 工作 | drive | floating |
| 工作 | notes | floating |
| 私人 | home | floating |
| 私人 | tasks | floating |
| 私人 | notes | floating |
| 私人 | vocabulary | floating |
| 私人 | completedGames | floating |
| 私人 | wardrobe | floating |
| 私人 | maintenance | floating |

以上12页均使用唯一 WorkspaceSidebar，内层圆角10px，旧 aside 均隐藏，无页面独立覆盖 variant。

例外：直接 /projects 是无侧栏的独立问题表，浏览器检查 sidebarCount=0；工作空间项目页通过 /projects?embedded=1 嵌入，共用外层 floating 侧栏。首页 landing 和登录页不属于应用侧栏布局。弹窗、抽屉不适用 Sidebar variant。

结论：本地12个含侧栏业务视图没有遗漏。当前 floating 调整尚未发布，不能据此宣称线上已统一。
