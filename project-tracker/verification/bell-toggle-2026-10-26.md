# 通知入口 BellToggle 接入 · 2026-10-26

使用用户附件提供的React Bits BellToggle JavaScript + CSS源码；附件未注明上游提交，不冒称属于vendor已有固定版本。新增显式action变体，工作/私人顶部消息通知使用该变体打开既有到期提醒，不维护订阅开关、不使用aria-pressed。原始pill toggle保留但未用于业务页面。

外观继续归wb-icon-button（44×44px、16px圆角、浅底描边）；原wb-notification-count继续持有角标，不改变计数来源、零项隐藏、99+封顶及可访问数量。BellToggle.css经既有style.css构建，未新增覆盖样式或选择器权重。就绪后首次读到非零提醒及数量增加时自动摇铃并显示声波；指针点击和键盘仅打开列表，数量不变或减少不重复触发。卸载清理WAAPI与spring动画，减少动态效果停止并取消摇摆/声波。依赖motion沿用原固定版本；新增@hugeicons/react 1.1.10、@hugeicons/core-free-icons 4.3.5精确锁定，两份许可已纳入Tasks构建资源。

## 验证

- Tasks/页面构建成功；npm run verify通过239项测试、lint、类型和资源指纹；lint:strict、typecheck:strict、git diff --check通过。
- Cua内置浏览器：两种空间×1280/582/390/320px共8组合；通知按钮均44×44px/16px，位于视口内、主区域有效、无页面横向溢出，每组均打开并关闭提醒弹窗。
- 按用户最新纠正重新实测：首次加载已有1条提醒、0→1及1→2均产生旋转matrix；鼠标点击及同数量刷新均为none，不因点击触发摇铃。键盘Enter仍打开列表，Esc关闭焦点返回逻辑保持原样。
- 仅本地演示服务：0项无角标；105项显示99+且可访问名称保留105；模拟读取503后保留105条旧提醒并显示错误，刷新重试到0后角标清除，弹窗与计数逻辑保持原管线。
- 独立组件fixture验证disabled属性，以及motionOff=true时指针点击和数量增加均不摇摆、动作仍可用；卸载无error日志。本次未切换真实OS减少动态效果设置，实时媒体监听沿用共享hook及Motion useReducedMotion，不能将fixture结果冒充为OS环境验证。
- 正常交互无浏览器error日志；503仅为显式故障注入。Premium strict保留41项历史提示（7归属未决、34模式提示），未宣称清零。

仅本地开发，尚未提交、推送或上线；未写生产业务数据，不改schema、凭据或保存协议。保留此前“仅选中侧栏名称渐变”的本地修改及所有原有未跟踪文件。完整BellToggle中未用于app的pill/标签展开/clapper等选项未逐项验收。

正常演示预览：http://127.0.0.1:8895/personal?view=home；数量/失败fixture在8896，组件状态fixture在8897，仅用于验证。
