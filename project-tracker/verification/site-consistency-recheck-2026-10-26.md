# 浅灰描边调整后的一致性复查 · 2026-10-26

## 结论

本轮为检查，不修改界面源码，不上线。视觉样式复查未发现深浅按钮描边混用；仍发现一项 P2 弹层键盘行为问题，不能标为全面通过。

## P2 · 项目编辑的 Esc 会关闭父抽屉并留下状态下拉菜单

复现：390×827 → 工作/项目问题 → 点击“确认现场安装计划” → 展开“当前状态” → Esc。

实际：父编辑抽屉消失，焦点回到问题标题，但 listbox 仍为 visible、高218px。预期：第一次 Esc 只收起最上层下拉菜单，保留编辑抽屉及草稿；第二次 Esc 才按编辑弹窗规则退出。

源码依据：tasks-ui/src/workspace-primitives.tsx:21 的 ExistingDialog onEscapeKeyDown 仅对自有 autocomplete 做例外，其他情况直接 dismiss；未排除展开的 Select portal。建议在共用 Dialog/Select 层处理顶层弹层归属并验证焦点恢复，不在项目页增加单独事件补丁。截图：/private/tmp/workbench-consistency-fixed/project-select-escape-recheck.jpg。

## 已通过的视觉复查

- 工作7页、私人15页，各检查1280、582、390px，共66个页面/视口组合；主区域边界与文档宽度均未溢出。
- 普通 React 按钮均44px高、10px圆角，次按钮1px rgb(211,219,233)浅灰描边。顶部收起、搜索、通知复用44×44px、16px圆角、相同底色和阴影。
- 全部实测按钮字体均为Inter及统一系统中文回退；同级卡片阴影均0 4px 16px rgba(45,61,91,.06)。
- 日历编辑的日期/时间/颜色/附件/取消均浅灰描边、44px；主创建按钮保留紫色语义；关闭为图标按钮。
- 项目内嵌页工具栏44px/10px浅灰描边；手机编辑抽屉left0/top0/366×607完整显示。
- 项目状态下拉展开面板浅灰描边，宽155px，left21/right176，在366px内嵌视口内。

## 工程检查与限制

npm run verify通过：资源指纹、lint、类型检查、239项测试；静态premium扫描仍41项，与此前基线一致（7归属未决、34模式提示），未宣称严格扫描清零。无源码变化，不重复构建；运行页面为此前已构建的最新浅灰描边版本。

本轮不验证真实生产数据、完整CRUD提交、跨浏览器/实体手机、全部主题、200%缩放或真实账号解密流程。预览为隔离示例数据。原始66状态测量：/private/tmp/workbench-consistency-fixed/recheck-light-borders.json；静态结果：/private/tmp/workbench-consistency-fixed/static-light-recheck.json。
