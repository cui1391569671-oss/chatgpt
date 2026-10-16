# 封面数据源配置

代码接入 TMDB（电影/电视剧）、IGDB（游戏）、Bangumi + MyAnimeList（动漫）。Bangumi 不需要密钥；IGDB 未配置或无结果时可回退 Steam。影视不再把百科图片作为主搜索源。所有来源先展示候选，由用户确认作品；保存来源、作品 ID、封面模式及可用 Steam App ID。

## 1. 先配置 TMDB

1. 注册并登录 https://www.themoviedb.org/ 。
2. 打开 https://www.themoviedb.org/settings/api ，申请 API 访问，按真实用途填写应用资料。
3. 复制 **API Read Access Token**（API 读取访问令牌）。
4. 在 Cloudflare 添加加密变量 `TMDB_API_TOKEN`，值为该令牌，不要额外加 `Bearer `。

兼容已有的 `TMDB_API` 或 `TMDB_API_KEY`：32位十六进制 API Key 使用 v3 api_key 认证；读取令牌使用 Bearer 认证。推荐使用 `TMDB_API_TOKEN`。

## 2. 配置 IGDB

1. 登录 Twitch，并启用双重验证。
2. 打开 https://dev.twitch.tv/console/apps 创建应用；应用类型选 **Confidential**。
3. OAuth Redirect URL 按门户要求填写 `http://localhost`；本项目使用客户端凭据，不要求用户登录 Twitch。
4. 获取 Client ID，并生成 Client Secret。
5. 在 Cloudflare 添加两个加密变量：`IGDB_CLIENT_ID`、`IGDB_CLIENT_SECRET`。

服务端自动获取、缓存访问令牌，过期或401时刷新。不要把短期 access token 当成 Client Secret。兼容 Yamtrack 名称 `IGDB_ID`、`IGDB_SECRET`。

## 3. 配置 MyAnimeList

1. 登录 https://myanimelist.net/ 。
2. 打开 https://myanimelist.net/apiconfig 创建 API 应用，按真实用途填写资料。
3. 将应用的 **Client ID** 保存为 Cloudflare 加密变量 `MAL_CLIENT_ID`。

只读取公开动漫资料，使用 `X-MAL-CLIENT-ID`；无需用户 OAuth Access Token。兼容 `MAL_API`。Bangumi 可独立使用，MAL 用作补充来源。

## 4. Cloudflare 中在哪里填

进入 Cloudflare Dashboard → Workers & Pages → **project-tracker** → Settings → **Variables and Secrets** → Add。

每个值使用 **Secret / 加密** 类型，填写上述变量名称并保存/部署。请配置 Worker 的运行时变量，而非仅配置 Git Builds 构建变量。保留原有 TRACKER_USER、TRACKER_PASSWORD、DB 绑定。新代码仍须发布到 Worker 才会启用新接口。

| 名称 | 值 |
|---|---|
| TMDB_API_TOKEN | TMDB 的 API Read Access Token |
| IGDB_CLIENT_ID | Twitch 应用 Client ID |
| IGDB_CLIENT_SECRET | Twitch 应用 Client Secret |
| MAL_CLIENT_ID | MyAnimeList 应用 Client ID |

密钥不应发送到聊天、写入 Git、放在网页脚本或 URL 参数中。

## 本地预览

复制 `.dev.vars.example` 为同目录 `.dev.vars`，自行填入密钥后重启本地预览。`.dev.vars` 已加入忽略规则。Cloudflare 中的 Secret 不会自动同步到本机。没有密钥时，界面明确提示对应来源未配置，保留手动封面及当前记录。

## 验证

进入私人空间 → 娱乐记录 → 新建记录，选择电影/电视剧/游戏/动漫，输入名称后选择候选作品。候选显示来源、年份和平台。保存后重新打开应保留关联；“刷新已选封面”按来源 ID 读取详情，电视剧按当前季数读取分季海报。手动改封面后刷新不覆盖自定义图片。更改名称或类型会解除旧关联，避免将原作品的 ID 误用于新名称。

接口不会自动迁移、改写旧记录；无 ID 的历史记录保留现有封面，编辑时可主动关联。

参考：
- https://developer.themoviedb.org/docs/authentication-application
- https://api-docs.igdb.com/#authentication
- https://myanimelist.net/apiconfig/references/api/v2
- https://developers.cloudflare.com/workers/configuration/secrets/
