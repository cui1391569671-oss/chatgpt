# React Bits workspace adapters

Source: https://github.com/DavidHDev/react-bits
Pinned revision: e12c22192ac7b4b452c5e2feb9b586d74765d696
Variant: ts-default. License: MIT + Commons Clause (LICENSE.md).

ClickSpark clamps negative elapsed frame time to zero (an event can spawn after the RAF timestamp in the same frame). SpotlightCard and Magnet accept existing target nodes so native forms, listeners and record IDs remain owned by the app. Spotlight styles are owned by workspace.css, not the demo stylesheet. BlurText renders inline spans and allows Chinese wrapping inside the shared completion status. The app gates all decoration on its shared reduced-motion policy. No source component is sold separately.

AnimatedContent also accepts an existing target, using mount-only fades with no calendar displacement. GSAP is pinned in package-lock.json.
