# 全页面动效一致性检查 — 2026-10-26

按 Frontend Design Premium 与现行开发规则检查；唯一规范正文仍为开发规则.md，本文件只记录实现和验收证据。

## 已修复

| 检查项 | 发现 | 最终实现 |
| --- | --- | --- |
| 共享时序 | 卡片参数、娱乐重排、首页布局移动、原生弹层与官网入场使用独立常量 | workspace-theme.css 统一提供卡片500ms、标题480ms、交互240ms、退场180ms、70ms间隔/280ms上限、18px及共享缓动；React在使用时读取CSS令牌，避免资源早于主题加载时固定旧值 |
| 卡片覆盖 | 年度目标实际类名 workspace-goal-note 与旧选择器不符 | 共享选择器纳入年度目标、笔记阅读面板和待办空状态；嵌套卡片只取最外层，排除弹层与第三方坐标区 |
| 同页重建 | 记录卡片仅靠类名/序号识别 | 年度目标与待办使用稳定 data-motion-card 记录标识；首页使用既有 data-tile，保留已完成入场状态 |
| 原生动画清理 | 娱乐重排和首页布局移动缺乏统一运行实例管理 | animateWorkspaceElement 注册原生动画；完成自动释放，减少动态效果、后台、切页、节点移除和卸载取消相关实例 |
| 官网 | reveal 650ms/24px 与工作台时序不一致 | 官网内容入场引用同一500ms/18px令牌，示例切换引用240ms；切换减少动态效果时内容直接可见，观察器停止，不重放已显示内容 |
| 抽屉焦点 | 年度目标卡片打开抽屉，Escape关闭后未返回原卡片 | Sheet与Dialog复用 restoreWorkspaceFocus，保留显式回调和preventDefault优先级；年度目标按记录标识定位当前卡片，删除后回退新增入口 |
| 规范冲突 | 旧150–200ms及整页淡入叙述与当前决定冲突 | 开发规则新增“所有页面动效统一”章节，并原位更新冲突口径；专项弹性/铃铛/教学GIF的用途差异保留 |

## 页面矩阵

- 私人：home、calendar、annualPlans、tasks、requirements、notes、checkins、vocabulary、vocabularyLibrary、fitness、completedGames、upcoming、wardrobe、maintenance、personalInfo、today。
- 工作：home、projects、tasks、drive、requirements、notes、calendar、today。
- 独立项目页、嵌入项目页、公开官网、登录页。
- 28个入口 × 1280px/390px × 正常/减少动态效果，共112个状态。HTTP均200，无页面运行时错误、文档横向溢出、减少动态效果下隐藏卡片或仍运行的浏览器动画；所有入口都解析到500ms/240ms共享令牌。
- 工作项目页使用独立项目面板与iframe，空的#content是既有布局；专项确认面板具有正宽高且iframe内容可达，未把空容器当作页面正常显示的证据。
- 年度目标示例、待办示例及所有写入仅存在独立本地数据库，不连接生产。

## 验证结果与限制

- Tasks生产构建、页面生成、资产指纹、lint、typecheck通过，诊断为0。
- 全量测试243/243通过。
- 原生重排实际时长240ms，系统偏好变更后立即取消。
- 最终专项7项通过：年度目标稳定标识/可见性、抽屉Escape及焦点返回、SPA切到待办、待办稳定标识、动态修改共享CSS令牌到310ms后原生动画实际读取310ms、嵌入项目面板可达。
- Premium严格静态审计仍有41项既有告警（7项未决、34项违例），包括原生日期归属、按钮动作识别、textarea规则等；未宣称全项目严格审计通过。本次没有改动或豁免这些独立问题。
- 本次矩阵侧重动效、可见性、页面边界与运行清理，覆盖代表性抽屉的键盘恢复；未重新遍历每个页面全部CRUD失败重试、所有长列表/长文本、真实后台切换及全套辅助技术。243项现有测试与之前验证不代替这些未执行的浏览器场景。
- 本地忽略证据：preview/audit-motion-pages.cjs、motion-pages-audit.json、audit-motion-final.cjs、motion-final.json、motion-premium-audit.json及对应桌面/窄屏截图。

仅更新本地预览，未部署、未推送GitHub。
