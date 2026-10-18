# Vocabulary Apps Script sync verification — 2026-10-18

- Source Drive sheet and visible tab were verified previously; bounded A1:K1004 read contained 138 unique words and passed local parser validation. Private source data is retained only under ignored preview fixtures.
- Replaced service-account polling with a bound Apps Script that signs POSTs to a narrowly scoped vocabulary push endpoint. No Google credentials, user login passwords or sheet sharing changes required.
- HMAC-SHA256, timestamp validation, fixed spreadsheet/tab, body size limit, schema checks and serialized D1 lease tested. Bad signatures, stale requests, wrong source, empty/oversized data rejected. Replay is idempotent; CAS retry preserves concurrent review progress and work-space versions.
- Apps Script VM test checks signature parity, unchanged-body suppression, failed-send retries, secret preservation, trigger deduplication and retaining other scripts' triggers.
- All 150 Node tests pass; page build succeeds. Builder now assembles generated files in memory and writes each once, addressing repeated Windows file-lock errors during source embedding.
- Edge synthetic browser test passes for state refresh, changed data reload, read failure, unconfigured/disabled state and 320px bounds. Tests do not modify production records or install Google triggers.
- Google authorization/trigger installation and Cloudflare VOCABULARY_SYNC_SECRET remain user setup steps. Production deployment and actual signed Google-to-D1 delivery are not yet verified or claimed complete. Instructions: VOCABULARY-SYNC.md.
