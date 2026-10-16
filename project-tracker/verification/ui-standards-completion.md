# UI standardization completion

Local preview only; no production deployment or schema changes.

## Seven requested categories
1. Retired override stylesheets, removed visual-patch important declarations, folded exact duplicate rules, removed unused Tasks example components. Important remains only for legacy semantic hiding and the single reduced-motion owner. Dialog, Sheet, sidebar provider and responsive frame geometry are owned explicitly by their shared component rules; no specificity escalation.
2. All five maintained application/component stylesheets use preset semantic tokens; no independent literal hex palette. User-selected calendar colors remain business data.
3. Shared table header 44px, row 52px minimum, cells 12px/16px; card material, radius and metadata typography have one owner. Business column widths, merged project cells and internal scrolling remain.
4. React and DOM search share icons, clear target, restored focus and no-results recovery. Project search clears immediately, cancels its pending debounce and respects IME composition.
5. Business dates use the shared authored Chinese DateChooser instead of OS popups. Hidden native date nodes retain FormData/validity. min/max, required, optional clear, Beijing today, keyboard grid navigation and reset/open synchronization retained. Calendar's official authored internal date controls retain its event/recurrence behavior and share theme tokens; no alternate OS picker.
6. Shared success/error feedback and app-owned confirmations replace project browser alerts/confirms and calendar's custom native confirmation. Inline errors persist, invalid field focus is restored, duplicate transient error messages are suppressed when a persistent error owns recovery. Project add, management, archive and recovery panels use the shared Dialog adapter; original IDs/listeners remain.
7. DESIGN.md and UX-CONTRACT.md rewritten as current canonical documents; superseded decisions archived under history/. AGENTS.md prohibits new override sheets/specificity repairs.

## Verification
- Tasks and calendar bundles built; pages regenerated; generated business scripts parsed.
- Node tests: 132 passed, 0 failed.
- Authored date unit tests cover leap day, Monday-first boundary, range inclusivity, invalid dates and Beijing rollover.
- Browser: work five views and personal seven views; no visible native date/select controls in ordinary views. Desktop, 768, 390 and 320 viewport checks; all 12 routes at320 had main x12/width296/right308 with document320x568. Sidebars can collapse/expand and mobile navigation can open/close.
- Native device form: max-date disabling, required validation/focus, optional vs required clear, Escape returns to parent, saved YYYY-MM-DD; failure retained title/date and retry succeeded once.
- Tasks date selection saved correctly. Project add form reported inline validation, accepted date, saved row and announced success. Search no-result/clear/refocus verified in Tasks, notes and project table.

## Static audit interpretation
Raw premium audit still reports32 findings:27 actionless-button detections (event-delegated/externally bound controls, including public demo buttons),3 native-select detections (hidden compatibility fields and a JSX Select component),2 native-date detections (hidden compatibility field and authored Input wrapper). The checker does not follow event listeners or runtime adapters. These are not represented as32 known runtime failures, nor is this report a full accessibility certification. Raw output retained separately; do not falsify native/authored ownership to silence the checker.
