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

## 首次构建检查
连接仓库后，如果构建历史为空，先确认生产分支为 main、根目录为 project-tracker，监听路径包含 project-tracker/**。向该目录提交更新后，到 Deployments 页面中的 Go to build history 检查是否出现对应提交的构建记录。没有记录时需排查仓库连接和触发设置；有失败记录时查看日志。代码已提交不代表已上线，需确认生产部署完成并验证项目管理按钮。
