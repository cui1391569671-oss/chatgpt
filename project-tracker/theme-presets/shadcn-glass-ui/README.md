# Workbench glass preset

Upstream: https://github.com/artyhoo/shadcn-glass-ui-library
Pinned version/commit and original file hashes: `UPSTREAM.json`.

The raw `tokens/` and `themes/light.css` files are unchanged upstream source. `build-glass-preset.mjs` extracts variable declarations from the primitive palettes and Light theme, then includes upstream animations. It deliberately excludes upstream global resets and other themes. `build-pages.mjs` embeds the resulting `glass-preset.css` into application, project iframe, landing, and authentication surfaces.

`admin-theme.css` aliases the preset for legacy shadcn consumers; `glass-material.css` binds existing business DOM, Radix portals and ilamy surfaces to the same tokens. `liquid-glass.css` owns only geometry/scroll behavior. Change a shared token mapping rather than adding page-specific colors.

Actual upstream ButtonGlass and Input source plus required hooks/variants live in `tasks-ui/src/vendor/shadcn-glass-ui/`; existing Radix shell and business forms retain their behavior. No claim is made that all business components were replaced by upstream components.

The pinned repository LICENSE is Apache-2.0 and is preserved here and beside vendored components. Its package metadata states MIT; this integration retains the actual repository license rather than relying on that metadata.

Local verification: React bundle and page build, 126 Node tests, task create/save, desktop work/personal view checks, and calendar at 768/390/320 CSS pixels. The legacy accessibility audit has outstanding findings and is not represented as a clean full accessibility certification.
