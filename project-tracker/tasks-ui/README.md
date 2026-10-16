# shadcn-admin 工作台集成

固定上游：https://github.com/satnaing/shadcn-admin ，提交与许可证见 UPSTREAM.json / LICENSE.txt。

`src/workspace-shell.tsx` 使用上游 AppSidebar / NavGroup / TeamSwitcher / Header 的布局与组合；`components/ui/sidebar.tsx`、dropdown-menu、tooltip、separator、skeleton 和 use-mobile 来自同一固定提交。修改包括中文文案、输入法安全的快捷键、原业务导航桥接、工作/私人空间真实链接和隔离样式。手机抽屉使用独立 shell-sheet，避免与待办编辑门户互相覆盖。

`src/main.tsx` 保留已接入的 TasksTable 与 TasksMutateDrawer，数据通过 tasks-adapter.js 调用原工作台的按记录保存。应用框架通过 workbench-shell.js 接入；原导航隐藏但保留降级路径，不保存任何业务副本。`shadcn-workbench.css` 管理页面布局，组件样式由 src/style.css 隔离到 data-shell-root / data-shell-portal。

构建：在项目根执行 `npm run build:tasks`，再执行 `npm run build:pages`。部署使用生成的 tasks-assets.mjs 与 pages.mjs，不依赖在线 CDN。增加共享原语时要检查两个门户与宽/窄断点，并保留上游 MIT 许可。
