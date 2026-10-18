# Word practice verification — 2026-10-18

- Workbench-native implementation of the Qwerty Learner typing/dictation workflow, linked to the upstream project in the setup screen. No upstream code, dictionary or sound asset is copied; this is not an embedded full Qwerty application.
- Existing vocabulary fields and import behavior retained. Each reviewed word uses the existing record-level cloud patch; successful save updates mastery/count/date. Failed save keeps the current answer and does not advance the queue.
- Tasks bundle and pages rebuilt; 145 Node tests passed. `git diff --check` passed with repository CRLF allowance.
- `preview/verify-word-practice.cjs` passed in Edge: typing, incorrect spelling, input composition guard, failed save/retry without double-counting, successful review, wrong-word round, dictation hidden answer/reveal, exit confirmation, reload persistence and empty vocabulary.
- Practice page measured at 1440px, 390px and 320px; screenshots `preview/word-practice-{width}.png` inspected. Mobile action buttons use two columns with the primary action spanning both. Shared authored select, confirmation and input components retained. No practice modal is rendered. Separate vocabularyLibrary route and navigation through annual plans verified.
- Browser tests use synthetic local workspace/D1 responses and never modify production records. Browser speech requires an installed English voice; unavailable/error cases have visible feedback and leaving the practice page cancels speech.
- Strict static audit `preview/word-practice-audit.json` has 36 existing findings, unchanged from the annual-plan baseline, including adapted date inputs and delegated actions. Static audit is not claimed as passed.
- Not deployed. Local preview is independent from production D1.
