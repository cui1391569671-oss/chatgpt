# Home fitness verification — 2026-10-18

154 Node tests pass, including actual-set validation, idempotent retries/concurrent sessions and rejecting work-scope and unauthenticated writes. Components/pages build successfully. Synthetic Edge workflow validates deep links, private-only navigation, search/clear, invalid quantities, zero-set prevention, save failure/retry with checks retained, actual-set persistence, reload, cancellation, sibling English page navigation and 320/390/1440 widths. Screenshots: preview/fitness-1440.png, preview/fitness-390.png, preview/fitness-320.png.

Static premium audit has pre-existing shared adapter/native-field findings; runtime evidence is used for the changed workflow. No production data used, no push/deployment performed.

Static audit: 38 findings total; the two fitness findings are false-positive actionless-button reports for shared Button asChild links. Browser DOM verifies four exercise source links and the guidance anchor. Their URLs resolve to the already verified upstream entries; no fake click handlers were added to suppress the audit. Other findings predate this page.

GIF addition: 155 tests pass; all four GIFs contain multiple frames. Synthetic browser verifies all four load, play/pause, reduced-motion and explicit playback, failed-GIF PNG fallback, plus the existing workout flow and responsive widths. Media is procedurally generated original schematic artwork. Still local-only, with no git push or deployment.

Profile addition: 158 tests pass. Browser checks validate empty-profile gating, measurement validation, failed-save retention/retry, saved profile reload, novice/regular quantities, explicit exercise exclusions, all-excluded empty-state/disabled start, standing-only selection, disabled editing during active rounds, preserving historical records and 320/390/1440 form bounds. Existing GIF/workout checks pass with a saved synthetic profile. A legacy global busy handler was corrected to respect component-owned fitness button disabled states. No user measurements used in testing; no production write or deployment.
