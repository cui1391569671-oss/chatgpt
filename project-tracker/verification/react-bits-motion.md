# React Bits 动效替换与一致性验收

2026-10-24。保留晨雾山景、浅色主题、共享卡片材质及所有业务数据/控件节点。

## 来源与归属

固定上游 https://github.com/DavidHDev/react-bits/tree/e12c22192ac7b4b452c5e2feb9b586d74765d696 的 ts-default 源码，许可证 MIT + Commons Clause 已保留并纳入生成资源署名。GSAP 3.15.0 锁定在 npm lock。适配说明见 tasks-ui/src/vendor/react-bits/README.md。

- AnimatedContent：切页/标题聚焦入场，420/480ms；同页数据保存、刷新不重播，日历无位移。
- SpotlightCard：共享卡片淡紫聚光与边缘高光，统一主题 token，键盘 focus-visible 等价响应。
- Magnet：主按钮最多2px磁吸，娱乐封面7度倾斜，触屏不启用。
- ClickSpark：按钮点击/成功勾选火花，兼容键盘触发，动画结束回收Canvas。
- BlurText：两项打卡完成后的短暂文字反馈。
- 旧的页面淡入、卡片聚光、按钮波纹、磁吸、封面倾斜/飞行及散落粒子实现已退役。保留原无障碍导航/弹层、列表重排与表单业务状态，控件共享240ms/退场180ms时序。

共享入口 workspace-react-bits.tsx 在工作与私人空间挂载。组件对原业务宿主附加装饰，既有ID、监听器、React记录节点与保存管线不变；减少动态效果时卸载全部装饰。

## 验证

- tasks-ui 构建、页面生成、check-assets 通过。
- node --test：232/232通过。
- lint：无新增；41项历史诊断仍在，严格检查未通过。
- typecheck：无新增；98项历史诊断仍在，严格检查未通过。
- Premium静态审计：41项现存未解决/违例，包括未识别适配日期/事件代理；未声称严格审计通过。报告位于本地preview/react-bits-audit.json。
- 隔离浏览器：22个工作/私人页面 ×1440/768/390/320，共88个边界检查；覆盖主要原生及React编辑表单，页面/表单无越界、无运行时错误。
- 专项：聚光实际触发，点击Canvas生成/回收，封面倾斜，打卡成功提示/回收，减少动态效果切换，320px布局，均通过。
- 业务回归：待办删除失败/焦点恢复，娱乐筛选，单词错误输入、保存失败重试、下一词焦点和会话恢复均通过。
- 修复上游ClickSpark帧时间边界：同一RAF内事件晚于帧时间戳，elapsed可能为负；夹到0后连续点击不再触发负半径Canvas错误。

浏览器脚本与截图为忽略的隔离测试文件：preview/verify-react-bits.cjs、verify-refine-all.cjs、verify-refine-behavior.cjs；不会发布测试记录。未部署生产。

后续状态：上述历史静态告警已在 [静态告警清理](static-warning-cleanup.md) 中完成修复/证据复核，lint与typecheck严格检查现均为0。
