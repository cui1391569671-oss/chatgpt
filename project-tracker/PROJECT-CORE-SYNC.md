# 项目信息表自动同步

唯一来源：已核实的“项目信息表汇总” `1ta_eTbXEwFFr-r3szbPVgI83m2BBBzc_e5tYYs3HdcM`。原表不必公开，不把账号密码写进脚本。

## 首次启用（需要表格所有者/可授权账号操作一次）

1. 先发布包含 `/api/project-core-information/push` 的工作台版本。
2. 在原表打开“扩展程序 → Apps Script”，新增脚本文件，粘贴 `google-apps-script/project-core-sync.gs` 的完整内容。保留现有其他脚本，不覆盖它们的 `onOpen`。
3. 运行 `prepareProjectCoreSync`。在“项目设置 → 脚本属性”找到它生成的 `PROJECT_CORE_SYNC_SECRET`；将该值安全复制至 Cloudflare Worker `project-tracker` 的同名 Secret。不要贴在聊天、表格单元格、GitHub 或日志中。两边必须相同。
4. 运行 `installProjectCoreSync`，在 Google 授权页确认读取原表、管理该账号的触发器以及向工作台发请求的权限。该安装函数先验证同步接口可用，再安装触发器；后续推送失败不会标记成功，下次定时检查会重试。
5. 验收：原表修改一项核心资料或效率说明，查看 Apps Script 执行结果及工作台“最近接收”时间、对应项目字段；可见的资料页每30秒检查一次。未打开网页时，Google 触发器仍会推送。定时器的实际调度可能延迟，不承诺秒级同步。

当前连接器支持 Sheets 数据读写，未暴露 Apps Script 项目/触发器安装与 Google 授权接口；本地脚本和测试通过不等于已安装 Google 触发器。Cloudflare Secret 也必须在受保护的设置中配置。

## 同步职责

- 自动同步是单向：原表 → 受登录保护的项目核心信息快照。不会改写原表、项目问题、待办或私人资料。
- 表页以 `PM数字` 或 `P数字` 开头，按“项目编号/项目名称”和“供货范围”等标签解析；同一项目编号不能重复。原表插行不会改变字段定位，项目编号作为关联标识。
- 导出供货范围、运输原文、托盘规格原文、分设备载荷原文及冲突备注。效率取显式“效率信息”，否则保留“项目目标/验收标准”全文；测试条件、计数口径和不作为验收依据等限制一并保留，不按设备速度推算能力。
- CIF/EXW 等不直接推断为海运/陆运；模块描述保留数量、单位、供货方和备注。无明确数值显示待补充。联系人、电话、商务金额与预算不进入推送体。
- 编辑、表结构更改触发推送；每5分钟校验公式/API更新。内容未变时不发送。仅成功响应后记录哈希，失败下次重试。
- 带时间戳的 HMAC-SHA256 签名，5分钟窗口，按持久化版本拦截旧请求；相同请求重试幂等。数据库比较上次快照后原子替换，失败不覆盖已有资料。密钥仅存 Script Properties 和 Worker Secret。
- 自动同步配置后，资料页隐藏“导入更新”，接口拒绝手工覆盖。未配置时原导入能力保留。源码中不内嵌源表业务记录或密钥。
- 发现空表、格式错误、重复编号，或源表缺少已有项目编号时，拒绝整个快照并保留旧数据；原表删除/重命名编号须先核对，避免把临时缺页视作删除。主动退役项目需另行确认，不会自动清理。

## 维护与回退

脚本在 Google 中保存后立即生效；更新共享解析器后应运行 `npm run build:pages`，再复制生成的完整 `.gs`。它的解析区由 `project-core-sheet.mjs` 生成，勿单独改解析区。脚本不需要部署为公开 Web App。

Google“触发器”可查看/删除此功能的四个处理器，也可运行 `uninstallProjectCoreSync`；它仅删除该功能触发器。删除 Worker Secret 可回到手动导入模式，之前的快照保留。最后接收时间只表示最近成功推送，不代表当前 Google 触发器仍在运行；实际启用要通过一次原表改动验收。

依据：[Google 可安装触发器](https://developers.google.com/apps-script/guides/triggers/installable)、[Utilities 签名接口](https://developers.google.com/apps-script/reference/utilities/utilities)。
