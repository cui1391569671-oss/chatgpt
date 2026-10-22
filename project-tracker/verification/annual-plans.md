# Annual plans verification — 2026-10-18

- SVAR React Gantt 2.8.1, MIT license included in `/assets/tasks.LICENSE.txt` via the existing generated asset export. No PRO features or new remote persistence service.
- `node build.mjs` in `tasks-ui`, then `node build-pages.mjs` and `node --test` in the project: 143 tests passed.
- `preview/verify-annual-plans.cjs`: Edge browser with synthetic in-memory API; create, reload, source date preservation, double-click editor, real pointer drag (January to March), failed save/input preservation/retry, discard confirmation, deletion, no-result reset, sibling task editor. Desktop 1440px and mobile 390/320px verified; chart bounds and chart interior measured. No uncaught page errors.
- Mobile uses the component's chart display mode and an accessible item list for editing, so a hidden grid cannot consume the whole timeline width.
- `preview/annual-plan-desktop.png`, `annual-plan-390.png`, `annual-plan-320.png` inspected. Test fixtures do not write production data.
- Static premium audit: `preview/annual-plan-audit.json`, 36 findings (35 baseline, one new native-date ownership detection). New date inputs are the maintained `Input type=date` adapter that renders `WorkspaceDateInput`, not an OS popup; dates remain authored. Existing delegate-action/hidden compatibility field findings remain documented in UX-CONTRACT.md. Static audit is not claimed as passed.
- Production deployment has not been performed for this feature. Local preview uses local snapshots and memory; live D1 persistence is covered with a simulated D1 service in the API tests, not a production write.


规范文档位置更新：本记录涉及的独立设计、UX及开发规范现已统一到 [开发规则.md](../开发规则.md)，后续开发与验收以统一文件为准。
