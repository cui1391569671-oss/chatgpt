# 页面与布局一致性审计（2026-11-16）

基线 `356db7d`，范围为源码静态检查，**未做浏览器视觉验证**；结论用于制定页面标准，不代表线上表现。方法与数字可用下列命令复现。

## 1. 页面与渲染

- `workbench.html` 473,581 字符（内含 251,626 字符的 `<style>` 块），`index.html` 250,885 字符。
- 视图 22 个：annualPlans、beauty、calendar、checkins、completedGames、drive、fitness、help、home、maintenance、personalInfo、photography、photographyNotes、projectBudget、projectPlan、projects、projectShipping、tasks、today、vocabulary、vocabularyLibrary、wardrobe。
- 命令式 `renderXxx()` 函数 23 个，React 挂载点 9 个（`Workspace*.mount`）；两套渲染方式并存。
- 内联 `style=` 极少（workbench 4 处、index 3 处），**不是**主要问题。

## 2. 页头与骨架

- `workspace-page-hero` 出现 9 次，`page-header` 1 次，`wb-page-toolbar` 10 次。
- 私人视图走 hero 页头，工作视图沿用旧 `#heading` 标题区；同一产品内两套页面开屏结构。
- 无视图级选择器（`data-workspace-view` 在 CSS 中出现 0 次），页面差异靠零散类名与 id 表达，难以整体替换骨架。

## 3. 断点

| 文件 | 断点集合 |
|---|---|
| workspace.css | 420, 600, 640, 641, 760, 767, 768, 900, 1000, 1100 |
| workbench-page.css | 360, 374, 480, 520, 600, 640, 760, 767, 900, 1000, 1100 |
| projects-page.css | 760, 1000 |

交集只有 640/760/767/900/1000/1100。`640` 与 `641`、`760` 与 `767` 与 `768` 同时存在，属逐次微调留下的邻近值，不是栅格。

## 4. 尺寸与令牌

| 文件 | `var(--…)` | 裸 px | 裸 px 占比 |
|---|---|---|---|
| workbench-page.css | 280 | 938 | 77% |
| projects-page.css | 124 | 194 | 61% |
| workspace.css | 733 | 977 | 57% |
| workspace-theme.css | 481 | 73 | 13% |
| glass-preset.css | 516 | 87 | 14% |

高频值：12px×263、8px×255、16px×175、1px×125、10px×123、14px×107、44px×98、20px×95、24px×93。其中 10px 是控件圆角、14px 是正文字号——**圆角、字号、间距共用同一批硬编码数值**，没有按语义分层，因此无法从数值本身判断用途。

4px 网格外且出现 ≥3 次的值有 23 个，含 15px×29、13px×13、7px×23、5px×17、18px×54。

## 5. 状态呈现

`empty-state` 4 处、`skeleton` 5 处、`loading` 11 处，对应 22 个视图，覆盖率不足一半；空态、加载态、错误态没有统一宿主。

## 6. 问题清单

| 编号 | 级别 | 事实 | 影响 |
|---|---|---|---|
| P01 | 高 | 两套页头（hero / 旧 heading） | 同一产品页面开屏不一致，新页面需判断走哪套 |
| P02 | 高 | 断点 10+ 个且含 640/641、760/767/768 | 响应式行为按文件漂移，改一处不影响其他页 |
| P03 | 高 | 页面级裸 px 占 77% | 间距/圆角无法统一调整，只能逐处改 |
| P04 | 中 | 空/加载/错误态覆盖不足一半视图 | 页面观感与反馈不一致 |
| P05 | 中 | 无视图级 CSS 选择器 | 无法按视图整体替换骨架，只能追加覆盖 |
| P06 | 低 | 命令式 render 与 React 混用 | 同一交互两套生命周期，属既有架构债 |

## 7. 标准草案（待评审）

- **令牌分层**：space（4/8/12/16/24/32/48）、radius（10/20/999）、type（12/14/16/18/28）、control（44 高、10 圆角）、layer（z-index 档位）。页面 CSS 只允许引用令牌，禁止裸 px（0、1px 边框、百分比除外）。
- **断点集**：320、480、768、1100 四档；验证宽度 320/390/768/1280。640/641、767 归并到 768。
- **页面骨架**：`PageHeader`（标题 + 说明 + 主操作）+ `Toolbar`（搜索/筛选/视图切换）+ `Content` + `StateLayer`（空/加载/错误），四个槽位固定，页面只填内容。
- **选择矩阵**：少量关键信息用卡片；同类多条用紧凑列表行；需要横向比较用表格；≤3 项且互斥用 Segment。
- **验收**：新增视图必须四态齐全（正常/空/加载/错误），骨架槽位不得自定义。

## 8. 建议路径

1. 先定令牌与断点（纯 CSS 变量，风险低）。
2. 抽 `PageHeader` 与 `StateLayer`，先在新页面强制使用。
3. 逐视图迁移，配合 lint 拦截新增裸 px 与非法断点。
4. 扩展 `scripts/audit-ui.py` 覆盖骨架槽位与四态检查。
