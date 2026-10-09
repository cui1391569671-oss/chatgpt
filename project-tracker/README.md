# 项目问题跟进表
独立目录，数据保存在 Cloudflare D1，仓库不包含真实项目数据或密码。

## 一次性连接
现有 Worker project-tracker → Settings → Builds 连接本仓库。
生产分支 main；根目录 project-tracker。
构建命令 node configure.mjs；部署命令 npx wrangler deploy --keep-vars。
构建变量 CF_D1_DATABASE_ID 填现有 project-tracker-db 数据库 ID。
保留运行时 TRACKER_USER、TRACKER_PASSWORD Secrets。
可设置监听路径 project-tracker/**。
部署不执行初始化 SQL，不改写项目数据。现有数据库需已初始化。
每天北京时间18:00归档已完成问题。首次部署后检查登录、数据、保存及项目管理，再处理域名。
