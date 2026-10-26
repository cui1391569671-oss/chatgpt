# SpotlightCard integration — 2026-10-26

Replaced the existing TypeScript source with the user-supplied React Bits JavaScript + CSS component, retaining TypeScript declarations. No new dependency was required. Source and adaptation notes are in `tasks-ui/src/vendor/react-bits/README.md`; the existing license remains packaged.

The existing `WorkspaceReactBits` card entry point uses the new component. Its portal adds only three aria-hidden, pointer-transparent decoration layers to the original card. Shared card materials, dimensions, business nodes and listeners remain owned by the existing application. Standalone usage supports supplied light/dark themes, circle/beam shapes, smoothing, proximity, grain and press flare. Component CSS uses the wb prefix for the existing asset scoper; the former duplicate decoration rules were removed from workspace.css.

Live reduced-motion changes, offscreen cards, background documents and window blur cancel/reset frames. Unmount removes frames, IntersectionObserver, media/document/window listeners and portal layers. Touch movement is excluded from hover tracking; keyboard focus-visible remains supported. Shared application reduced-motion gating continues to remove decorations entirely.

Validation:

- Tasks production build and page generation passed.
- Asset check passed: generated pages and Tasks/Calendar fingerprints match.
- Lint and typecheck passed with zero diagnostics.
- Full test suite: 243 passed, zero failed.
- Isolated headless Edge: 11 checks passed — light surface/spotlight, click-through, grain texture, keyboard focus-visible, dark beam/ambient, live reduced motion, existing target identity/bounds/listeners, offscreen suspension, unmount portal cleanup, 320px layout with reachable 44px action, forced colors. Screenshot visually reviewed. Local script, screenshot and JSON evidence are under ignored `preview/`.
- Premium strict audit: 41 existing findings (7 unresolved, 34 violations), none in SpotlightCard. Strict compliance is not claimed. Background visibility handling is implemented but was not separately exercised as a real tab-background transition.

No production deployment or GitHub push was performed.
