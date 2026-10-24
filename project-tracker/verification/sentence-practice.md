# Chinese-to-English sentence practice — 2026-10-24

- Default sentence practice uses aligned original examples and Chinese translations. English reference stays hidden until reveal or submission. Word dictation and typing remain available.
- Optional `exampleTranslation` flows through vocabulary validation, Sheet parsing and source-preserving merge. Apps Script now reads/listens through column L; the installed Google script must be updated separately before production can push this field.
- Source spreadsheet: approved L1:L140 write; 139 translations read back exactly, original words and English examples compared unchanged. Private source contents are excluded from repository assets.
- 239 Node tests pass. Strict lint/typecheck and project UI audit report zero findings. Browser fixture covers hidden answers, punctuation, wrong answers, IME, multiline, reference/audio, failed final save/retry with one session, original review IDs, replay, missing translation fallback, 320px bounds and zero page errors.
- Screenshot inspected at desktop width; canonical card surface keeps the sentence/input readable on the scenic background. Local preview uses translations from ignored preview files, preserving source IDs and learning history.
- Not deployed. Google source values updated; installed Apps Script code and worker release are separate deployment steps.
