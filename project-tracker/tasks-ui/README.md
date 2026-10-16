# shadcn-admin 工作台集成

固定上游：https://github.com/satnaing/shadcn-admin ，提交与许可证见 UPSTREAM.json / LICENSE.txt。

`src/workspace-shell.tsx` 使用上游 AppSidebar / NavGroup / TeamSwitcher / Header 的布局与组合；`components/ui/sidebar.tsx`、dropdown-menu、tooltip、separator、skeleton 和 use-mobile 来自同一固定提交。修改包括中文文案、输入法安全的快捷键、原业务导航桥接、工作/私人空间真实链接和隔离样式。手机抽屉使用独立 shell-sheet，避免与待办编辑门户互相覆盖。

`src/main.tsx` 保留已接入的 TasksTable 与 TasksMutateDrawer，数据通过 tasks-adapter.js 调用原工作台的按记录保存。应用框架通过 workbench-shell.js 接入；原导航隐藏但保留降级路径，不保存任何业务副本。`shadcn-workbench.css` 管理页面布局，组件样式由 src/style.css 隔离到 data-shell-root / data-shell-portal。

构建：在项目根执行 `npm run build:tasks`，再执行 `npm run build:pages`。部署使用生成的 tasks-assets.mjs 与 pages.mjs，不依赖在线 CDN。增加共享原语时要检查两个门户与宽/窄断点，并保留上游 MIT 许可。

## shadcn/ui 共用业务控件

`workspace-primitives.tsx` 在工作台与项目表安装共享 Dialog、Select 适配器，保留旧表单节点与保存监听器。`components/workspace-select.tsx` 供 React 表单和旧单选适配共用；`components/ui/dialog.tsx` 的门户隔离到 data-ui-portal。原生 select 是 FormData 兼容层，禁止直接作为新可见控件新增。弹窗重开必须重读业务值，关闭必须还原节点并恢复焦点；从父表单打开选择菜单时不要关闭父弹窗。

新增上游原语：Dialog、Select、Textarea（同 UPSTREAM.json 固定提交）。Select 依赖 @radix-ui/react-select 2.2.6；中文、浅色主题与手机44px操作尺寸。日期暂沿用原生；项目自定义管理浮层保留。

## 原版视觉基线

当前以原版浅色主题和inset布局为准。主题唯一来源为上级 admin-theme.css（原版src/styles/theme.css的同提交浅色token，带--admin-前缀）。style.css仅将token映射到shadcn角色，不重新定义品牌蓝色。构建内嵌Inter Latin WOFF2并合并SIL OFL许可，中文使用系统字体回退。Header/Main/Sidebar尺寸与原版源码对齐；业务页面内容仍来自当前系统，不加入演示销售数据。

新增上游原语：Command；cmdk 1.1.1负责页面命令菜单。新建待办通过Portal放到标题操作区，新增Portal必须具备对应data-*-root，以免失去组件样式隔离。DOM适配器和标题同步必须保持幂等。
