# 存量审计第一批整改验证

日期：2026-10-22。原始基线main/dce8874，所有修改保持本地未提交。没有部署、修改实际wrangler.json、执行数据库迁移或访问生产数据。原有未跟踪业务文档和premium-audit.json保留原状。

## 修改

- auth.mjs/worker.mjs：Basic认证与表单登录共用D1持久限流；每IP固定十分钟桶10次，正确Basic也计数；Cookie请求不计数。数据库故障返回503，超限429。
- request-body.mjs：按UTF-8字节流限制主JSON、登录、衣橱、日程图片与项目资料请求；超限停止读取，返回413。
- tasks-ui/fingerprint.mjs：覆盖递归src、锁文件、构建规则及共享personal-vault模块；build-pages在源码与资源不匹配时拒绝生成。
- package.json/锁文件/CI：完整UI与页面构建；校验生成页与两个UI指纹；固定工具链。npm deploy先build再verify。CI包含Node测试、Miniflare本地D1回归和合成恢复。
- workbench.html：允许私人upcoming直达视图恢复，重新生成pages.mjs。
- 文档：现状台账、接口/配置、恢复与发布手册；首页说明同步；忽略OS和本地运行缓存。
- 业务接口测试改用真实签名Cookie测试辅助入口，避免将Basic请求计数混入业务数据库Mock。辅助入口不改变生产代码；Basic安全测试直接调用真实worker.mjs，另以Miniflare真实SQL验证。

## 证据

- 原始基线：205项Node测试通过。
- 本批最终Node测试数见本文件末尾实际结果；没有将历史验收当当前通过。
- build:ui、build:pages、资源一致性检查通过；完整npm build在临时源码副本执行，假数据库ID只写临时副本。
- Wrangler deploy --dry-run通过（临时配置），不会上传或发布。包约3893KiB，gzip约1259KiB；不是首屏网络测量，也不代表线上部署。
- scripts/rehearse-recovery.py：5张合成SQLite表SQL导出恢复、完整性检查、BLOB与空间版本保留通过；真实D1恢复未执行。
- npm run test:d1：本地workerd/D1模拟SQL通过登录、空间隔离、字段冲突、幂等、跨集合保留、照片BLOB、加密密文、版本冲突、删除、Basic额度及Cookie独立检查。
- 本地模拟器兼容日期2026-07-30，生产配置2026-10-09，生产兼容性未验证；不把模拟器通过表述成生产通过。
- 浏览器：本地合成账号登录；upcoming直达与刷新均选中正确栏目；外部服务主动禁用时显示失败并可重试；工作待办320px打开表单、新建保存、刷新后保留。390px文档宽390、main宽366；320pxupcoming文档宽320、main宽296，左右均留12px；待办390px同样main宽366。工作待办浏览器控制台未见error。
- 手机截图保存在本目录audit-task-390.jpg及audit-upcoming-390.jpg，全部合成数据。

## 静态UI审计限制

通用premium严格审计未通过，共39项：4项date归属、3项select归属、31项按钮事件检测、1项textarea resize检测。它未使用本项目中文规范映射，隐藏原生兼容字段、委托事件和共享样式可能产生误报；不能认定全部为误报，仍需逐项核对。原有开发规则已要求采用共享日期/选择器及textarea，不新增重复DESIGN/UX文档来消除报告。此次不修改这些未触及的UI行为，不宣称全站规范验收完成。

## 未执行

真实D1备份/恢复、Cloudflare控制台/域名/生产构建核对、Apps Script授权及同步、真实第三方结果、全站浏览器回归、所有历史长文本、键盘/焦点完整矩阵、CSP与历史数据收紧、数据库拆分及性能优化均未执行。无发布授权请求或生产操作。下一步按docs/项目现状与整改台账.md推进。

最终本地结果：`npm run verify` 209项Node测试全部通过；`npm run check:assets`通过；`git diff --check`通过。手机待办工具栏实际按钮边界补查：390px新建按钮右边367px；320px右边297px，小于相应视口；并非仅以document宽度判断。完整build与dry-run均在临时副本/配置运行，实际wrangler.json无差异。
