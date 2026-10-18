# Frontend style ownership

- Follow the project development rules in [开发规则.md](开发规则.md) for all page changes.

用户要求：后续不要采用追加覆盖样式的方式开发网站。

- Shared tokens: pinned `theme-presets/shadcn-glass-ui` → generated `glass-preset.css`; aliases in `admin-theme.css`.
- Shared layout, materials and canonical control metrics: `workspace.css`. Modify the owning rule directly. Do not append a new override stylesheet, increase selector specificity, or add `!important` to win a conflict.
- Page-specific business layout: `workbench-page.css` and `projects-page.css`. Do not redefine shared control height, radius, typography or theme colors there.
- React behavior/component markup: `tasks-ui/src/components/` and `workspace-primitives.tsx`; behavioral variants belong in shared primitives. Preserve native form IDs, listeners and persistence semantics.
- `tasks-ui/src/style.css` owns React layout and utility integration; shared visual specifications must reference workspace tokens, not independently copy values.
- Native adapted forms retain their original nodes. Their visible title/description/close controls come from the shared Dialog header. Do not remove nodes referenced by business code.
- Existing higher-specificity/important rules are migration debt, not a template for new code. Remove conflicting declarations at their source before changing an owner.
- Do not hand-edit generated HTML style blocks, `pages.mjs`, `tasks-assets.mjs` or `glass-theme.mjs`. Rebuild changed component assets and pages.
- Verify native and React forms together, save/failure recovery, focus return, nested scrolling, and narrow viewports before delivery.

- Search, authored business dates and feedback must use WorkspaceSearch/enhanceWorkspaceSearch, WorkspaceDateInput/DateChooser and WorkspaceFeedback. Do not introduce OS date popups or browser alert/confirm. Calendar retains its official authored form/recurrence components.
- Responsive checks must measure actual main/toolbar/dialog bounds and clickable hit targets, not only document scrollWidth; a clipped zero-width main is a failure even when the document does not overflow.
