# 项目问题跟进表
独立目录，数据保存在 Cloudflare D1，仓库不包含真实项目数据或密码。

## 一次性连接
现有 Worker project-tracker → Settings → Builds 连接本仓库。
生产分支 main；根目录 project-tracker。
构建命令 npm run build；部署命令 npx wrangler deploy --keep-vars。
构建变量 CF_D1_DATABASE_ID 填现有 project-tracker-db 数据库 ID。
保留运行时 TRACKER_USER、TRACKER_PASSWORD Secrets。
可设置监听路径 project-tracker/**。
部署不执行初始化 SQL，不改写项目数据。现有数据库需已初始化。
每天北京时间18:00归档已完成问题。首次部署后检查登录、数据、保存及项目管理，再处理域名。

## 首次构建检查
连接仓库后，如果构建历史为空，先确认生产分支为 main、根目录为 project-tracker，监听路径包含 project-tracker/**。向该目录提交更新后，到 Deployments 页面中的 Go to build history 检查是否出现对应提交的构建记录。没有记录时需排查仓库连接和触发设置；有失败记录时查看日志。代码已提交不代表已上线，需确认生产部署完成并验证项目管理按钮。

## 双工作台（仅本人使用）

首页 `/` 是空间选择入口，`/work` 是工作工作台，`/personal` 是私人工作台。两边都有独立的待办、笔记和日程。
原项目问题表位于 `/projects`，从工作工作台进入。
两个工作台沿用现有 TRACKER_USER 和 TRACKER_PASSWORD 登录，适用于仅本人使用。
日程时间按北京时间录入，不连接外部日历，也不发送系统通知。

数据保存在现有 `tracker_state` 记录中，原 `workspace` 归入私人范围，新增 `workWorkspace` 保存工作范围；无需新建数据库或初始化 SQL。
两边维护独立版本号，互相保存不会造成工作台版本冲突。底层更新仍使用原子版本检查，避免并发覆盖。
项目接口仅返回项目字段；项目保存与每日归档保留两边工作台的数据和版本。

修改 `index.html`、`workbench.html` 或 `landing.html` 后运行 `npm run build:pages`，生成 Worker 使用的 `pages.mjs`，并将生成文件一起提交。
Cloudflare 原构建命令 `node configure.mjs` 仍可部署提交中已生成的页面，建议改为 `npm run build` 自动生成。
运行 `npm test` 验证数据保留、空间隔离、版本冲突、归档、输入校验和页面路由。

## 日历与工作台切换

工作和私人空间均提供月历，可切换月份、返回今天、按日期查看及新增日程。跨天日程在覆盖的日期内显示，搜索同步筛选月历标记与当天安排。
导航中提供直接切换到另一工作台的按钮，也可返回工作台选择入口。

## 中国节假日与调休

`holidays.json` 保存已核对的官方年度放假区间和补班日期，目前收录 2026 年。
月历与当天详情显示节日名称、休息标记及调休补班标记，工作和私人空间共用这套公共日历数据。
没有收录的年份明确提示缺少官方安排，不推算补班。
修改年度数据后运行 `npm run build:pages`，更新 HTML 中的嵌入数据及 Worker 页面。
新增年度安排需按国务院办公厅年度通知核对。

新功能发布前须获得用户针对本批改动的明确同意；开发、测试和草稿 PR 不代表授权合并生产分支。
