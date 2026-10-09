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

## 个人工作台

首页 `/` 为个人工作台，包含工作总览、待办、笔记和日程；原项目问题表位于 `/projects`。
日程时间按北京时间录入，不连接外部日历，也不发送系统通知。
个人数据保存在现有 `tracker_state` 记录的 `workspace` 字段，无需新建数据库或初始化 SQL。
个人数据与项目数据使用同一版本号；多个页面同时更新时，过期页面提示重新加载，避免覆盖其他修改。

修改 `index.html` 或 `workbench.html` 后运行 `npm run build:pages`，生成 Worker 使用的 `pages.mjs`，并将生成文件一起提交。
Cloudflare 原构建命令 `node configure.mjs` 仍可部署提交中已生成的页面，建议改为 `npm run build` 自动生成。
运行 `npm test` 验证数据保留、版本冲突、归档、输入校验和页面路由。
