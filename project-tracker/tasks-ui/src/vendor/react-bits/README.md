# React Bits workspace adapters

Source: https://github.com/DavidHDev/react-bits
Pinned revision: e12c22192ac7b4b452c5e2feb9b586d74765d696
Variant: ts-default. License: MIT + Commons Clause (LICENSE.md).

ClickSpark clamps negative elapsed frame time to zero (an event can spawn after the RAF timestamp in the same frame). SpotlightCard and Magnet accept existing target nodes so native forms, listeners and record IDs remain owned by the app. Spotlight styles are owned by workspace.css, not the demo stylesheet. BlurText renders inline spans and allows Chinese wrapping inside the shared completion status. The app gates animated decoration on its shared reduced-motion policy; GradientText retains a static gradient when reduced motion is enabled. No source component is sold separately.

AnimatedContent also accepts an existing target, using mount-only fades with no calendar displacement. GSAP is pinned in package-lock.json.

GradientText uses the JavaScript + CSS source supplied for the 2026-10-26 integration (no upstream revision was supplied for this component). It adds an existing-heading target adapter, live reduced-motion handling, hidden-document/offscreen suspension and forced-colors fallback. Its CSS is component-owned and uses the wb- prefix for the existing asset scoper. Homepage callers use the user-requested React Bits example palette through heading-gradient-* component tokens, an eight-second flow and glow 0.4 without a pill; the work overview navigation retains its button and the personal heading retains its original text node, with an aria-hidden glow portal.
