# AnimatedContent card entry — 2026-10-26

User clarification: AnimatedContent is intended for page cards. WorkspaceReactBits now attaches it to individual existing cards instead of the whole content host. Cards rise 18px and fade over 500ms, spaced by 70ms with total delay capped at 280ms. The content panel is the ScrollTrigger scroller, so cards below the viewport reveal when shown. Calendar cards fade without displacement; title animation retains its existing owner.

Completed card identities are remembered within each view visit. Initial asynchronous native DOM rebuilds can finish their entrance, while completed cards remain still during later same-view refreshes. Navigation starts a new visit. Original card nodes, business listeners and SpotlightCard ownership remain unchanged. Reduced motion keeps content visible and removes decoration.

Validation: Tasks build, page generation, asset fingerprints, lint and typecheck passed. Full tests passed 243/243. Headless Edge against the actual local preview verified five individual homepage cards animating, no content-host transform, no replay after a same-view mutation/rescan, reduced-motion cancellation, and a positive-width 390px content panel within viewport bounds. Screenshot reviewed. Evidence: ignored preview/card-entrance-browser.json and preview/card-entrance-home-390.png. No production deployment or GitHub push.
