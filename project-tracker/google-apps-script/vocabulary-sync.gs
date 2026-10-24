// Paste into Extensions > Apps Script in the verified vocabulary spreadsheet.
const VOCAB_SYNC = {
  spreadsheetId: '1oXdYD6Lf5E3d2mgv8Lt7DP_cS9r0PJyAUZuhz5kY_fY',
  sheetName: '词汇库',
  endpoint: 'https://tracker.managementplatformlee.com/api/vocabulary/push'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('工作台词库同步')
    .addItem('立即同步', 'syncVocabularyNow')
    .addItem('安装自动同步', 'installVocabularySync')
    .addItem('卸载自动同步', 'uninstallVocabularySync').addToUi();
}

// Run once. The secret is stored only in Script Properties; it is never logged.
function prepareVocabularySync() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('SYNC_SECRET')) {
    properties.setProperty('SYNC_SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  console.log('密钥已准备：打开项目设置 → 脚本属性，复制 SYNC_SECRET 到 Cloudflare 的 VOCABULARY_SYNC_SECRET。');
}

function installVocabularySync() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet || spreadsheet.getId() !== VOCAB_SYNC.spreadsheetId) throw new Error('请从英语词汇库表格的“扩展程序 → Apps Script”打开此脚本。');
  syncVocabularyNow(); // Verify the endpoint and secret before installing triggers.
  uninstallVocabularySync();
  ScriptApp.newTrigger('vocabularyEdited').forSpreadsheet(spreadsheet).onEdit().create();
  ScriptApp.newTrigger('vocabularyTimer').timeBased().everyMinutes(5).create();
  spreadsheet.toast('自动同步已安装：编辑后推送，每5分钟检查更新。', '工作台词库同步');
}

function uninstallVocabularySync() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (['vocabularyEdited', 'vocabularyTimer'].indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
}

function vocabularyEdited(event) {
  if (!event || !event.range || event.source.getId() !== VOCAB_SYNC.spreadsheetId || event.range.getSheet().getName() !== VOCAB_SYNC.sheetName || event.range.getColumn() > 12) return;
  pushVocabulary_(false);
}
function vocabularyTimer() { pushVocabulary_(false); }
function syncVocabularyNow() { pushVocabulary_(true); }

function pushVocabulary_(force) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) { if (force) throw new Error('正在同步，请稍后再试。'); return; }
  try {
    const properties = PropertiesService.getScriptProperties(), secret = properties.getProperty('SYNC_SECRET');
    if (!secret || secret.length < 32) throw new Error('请先运行 prepareVocabularySync，并在 Cloudflare 配置相同的同步密钥。');
    const sheet = SpreadsheetApp.openById(VOCAB_SYNC.spreadsheetId).getSheetByName(VOCAB_SYNC.sheetName);
    if (!sheet || sheet.getLastRow() < 2) throw new Error('词汇库为空，已保留工作台原数据。');
    if (sheet.getLastRow() > 5002) throw new Error('表格行数超出限制，请先检查词汇库。');
    const rows = sheet.getRange(1, 1, sheet.getLastRow(), 12).getDisplayValues();
    const body = JSON.stringify({spreadsheetId: VOCAB_SYNC.spreadsheetId, sheetName: VOCAB_SYNC.sheetName, rows: rows});
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, body, Utilities.Charset.UTF_8).map(function(x) { return ('0' + ((x + 256) % 256).toString(16)).slice(-2); }).join('');
    if (!force && hash === properties.getProperty('LAST_SUCCESS_HASH')) return;
    const timestamp = String(Date.now());
    const signature = Utilities.computeHmacSha256Signature(timestamp + '.' + body, secret, Utilities.Charset.UTF_8).map(function(x) { return ('0' + ((x + 256) % 256).toString(16)).slice(-2); }).join('');
    const response = UrlFetchApp.fetch(VOCAB_SYNC.endpoint, {
      method: 'post', contentType: 'application/json; charset=utf-8', payload: body,
      headers: {'X-Vocabulary-Timestamp': timestamp, 'X-Vocabulary-Signature': signature},
      followRedirects: false, muteHttpExceptions: true
    });
    let result; try { result = JSON.parse(response.getContentText()); } catch (_) { throw new Error('工作台未返回有效结果，请确认同步接口已上线。'); }
    if (response.getResponseCode() !== 200 || !result.ok) throw new Error('同步失败：' + (result.error || 'HTTP ' + response.getResponseCode()));
    properties.setProperties({LAST_SUCCESS_HASH: hash, LAST_SUCCESS_AT: new Date().toISOString()});
    if (force) SpreadsheetApp.openById(VOCAB_SYNC.spreadsheetId).toast('词汇已同步，已有复习记录保留。', '工作台词库同步');
  } finally { lock.releaseLock(); }
}
