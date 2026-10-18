# Apps Script 词汇表同步

源表格：[英语词汇库](https://docs.google.com/spreadsheets/d/1oXdYD6Lf5E3d2mgv8Lt7DP_cS9r0PJyAUZuhz5kY_fY/edit)，标签页 `词汇库`。

不需要服务账号、不需要公开表格，也不需要把 Apps Script 部署为 Web 应用。采用绑定表格的脚本和可安装触发器。

## 一次性操作

1. 打开源表格 → **扩展程序 → Apps Script**。将本项目 `google-apps-script/vocabulary-sync.gs` 的完整内容粘贴到 `代码.gs`，保存。
2. 顶部函数下拉选择 **prepareVocabularySync**，点击“运行”，按 Google 提示授权。然后在左侧 **项目设置 → 脚本属性** 找到生成的 **SYNC_SECRET**。
3. Cloudflare → Workers & Pages → `project-tracker` → **Settings → Variables and Secrets（运行时）**，添加类型 **Secret**，名称 **VOCABULARY_SYNC_SECRET**，值与脚本属性中的 **SYNC_SECRET** 完全相同。不要放在 Builds 构建变量里，不要把密钥发到聊天或提交 Git。
4. 发布包含本次同步接口的工作台代码后，返回 Apps Script，选择 **installVocabularySync** 并运行。它会先完成一次真实同步，成功后再安装编辑触发器和每5分钟检查触发器。重复运行不会重复安装。
5. 返回表格并刷新，会看到 **工作台词库同步** 菜单。可点“立即同步”；工作台“词汇库”页面显示最近同步时间，点击“刷新同步状态”查看最新数据。

如果第4步失败，先检查接口已上线和双方密钥一致；失败不会安装触发器，也不会清空原词库。

## 后续使用

- 修改 A:K 列后自动尝试推送；每5分钟检查用于补漏，包括公式或其他程序导致的值变化。内容没有变化时不重复推送。
- 多行粘贴会读取完整词表。短时间并发编辑若锁冲突，下一次检查会读取最终数据。
- “立即同步”强制推送。脚本只有收到成功响应才记录成功标记，失败会在下次检查重试。可在 Apps Script 的“执行记录”查看失败。
- 需要停止时，在表格菜单选择“卸载自动同步”。不会移除其他脚本的触发器。

## 数据保护

- 仅接受指定源表格及 `词汇库` 标签页的数据。保持第一行表头和 A:K 列结构。
- 新单词加入；旧单词更新 Lesson、拼写、音标、词性、释义、例句、备注。
- 已有单词 ID、掌握程度、首次学习、最近复习、复习次数保留工作台值。表格学习列仅为新单词提供初始值，工作台不回写 Google 表格。
- 表格删除行、更改单词名称时，旧学习记录保留，不自动删除；手工导入的其他词也保留。
- 空表、重复单词、表头错误或字段过长将拒绝导入，保留原词库。
- 脚本使用 HMAC-SHA256 签名和5分钟有效时间窗；不传递工作台登录密码。同步接口只允许合并私人词汇库，不能读取项目、任务或账号资料。
- 工作台原每日归档调度不变；每5分钟检查发生在 Google Apps Script。

相关文件：`vocabulary-sheet.mjs`、`google-apps-script/vocabulary-sync.gs`。授权和 Google 触发器需要你在 Google 页面完成，当前 Drive 连接无法代替安装授权。
