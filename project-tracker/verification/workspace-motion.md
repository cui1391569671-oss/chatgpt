# 工作台轻量动效验证

第一批范围：顶部快捷导航共享背景、打卡保存成功反馈、共享Dialog/Sheet及手机侧栏。Animate UI提供Radix兼容动效，Motion驱动导航/原生打卡。保留已有CSS主题及业务保存。未添加整页或日历重复入场。

修复居中transform与库动画冲突：共享几何改用translate属性。搜索显式返回开启按钮焦点。对应旧CSS动画移除，库支持系统减少动态效果。新增包许可文本随构建产物提供。JS未压缩传输前从约852KB增至1046KB；实际按服务端传输编码压缩。

231项测试通过，lint/typecheck无新增诊断（既存41/98），指纹一致、diff检查通过。

隔离浏览器：正常/减少动态效果，导航切换、打卡、搜索退出及焦点；1382/768/390/320弹窗边界与笔记取消；正常动效手机侧栏开关；需求、维保、衣物、消息通知弹窗开关；待办创建/编辑/失败重试/完成/日历联动；打卡保存失败回滚、撤销、刷新及焦点均通过。无运行时错误。脚本preview/verify-workspace-motion.cjs、verify-manual-checkins.cjs、verify-life-tasks.cjs。截图preview/motion-dialog-*.png。

未实测生产、真实触屏；本次未覆盖项目管理复杂嵌套创建及Google表格预览、发售列表等全部弹窗。未上线。

锁定依赖：
- @animate-ui/react: 2.0.0
- motion: 14.6.0
- radix-ui: 1.8.1
