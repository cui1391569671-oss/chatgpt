# tracker 报表导出（本地个人使用）

从 tracker 工作台（`https://tracker.managementplatformlee.com`）读取项目数据并生成报表。
**只导出、不改写远端数据**；除 `GET` 外没有任何写接口调用。

## 与仓库规则的关系

- 本目录只放脚本，不含任何业务数据、账号或密码。
- 产出（项目名、合同金额等）属于真实业务数据，按 `开发规则.md`「不得将生产业务数据混入发布文件」的要求，**不提交**；`tracker-credentials.json`、`.secrets/`、`projects-report.md`、`projects.csv` 均已在 `.gitignore` 中忽略。
- 本目录在 `project-tracker/` 之外，不在 Cloudflare 构建监听路径内，改动不会触发生产构建。

## 用法

```bash
# 凭据：在工作区根目录建 tracker-credentials.json（已忽略），或指定路径
export TRACKER_CREDENTIALS=/path/to/tracker-credentials.json

# 1) 抓取页面（登录 + /work?view=projects）
python3 tools/project-export/tracker_fetch.py

# 2) 抓取接口 JSON（默认存到 .secrets/out/）
python3 tools/project-export/tracker_api.py /api/project-core-information /api/project-calendar

# 3) 生成 projects-report.md 与 projects.csv
python3 tools/project-export/build_report.py
```

凭据文件格式（二选一）：

```json
{
  "_方式1_账号密码": { "username": "", "password": "" },
  "_方式2_直接给已登录的Cookie": { "cookie": "" },
  "base_url": "https://tracker.managementplatformlee.com",
  "target_path": "/work?view=projects"
}
```

## 说明

- `/work?view=projects` 是前端渲染页面，项目数据来自 `/api/project-core-information`（来源 Google 表《项目信息表汇总》），近期节点来自 `/api/project-calendar`。
- 登录走表单 `POST /auth/login`，需带登录页下发的 `csrf` 与 `__Host-tracker_csrf` Cookie；`cookie` 方式可绕开密码与 2FA。
- 输出目录可用 `TRACKER_OUT` 覆盖，默认 `.secrets/out/`。
