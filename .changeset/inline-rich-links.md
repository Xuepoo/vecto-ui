---
'@vecto-ui/core': patch
'@vecto-ui/ui': patch
---

Inline links in rich text (战役一, PR A.5): a `{ href }` run in a `RichText` is underlined and painted in the link color on the canvas, and projects a real, operable `<a href>` shadow node so screen readers announce it and automation agents (Playwright / AI) can find it by href and click it — routing back to `onLinkClick`.

- **`@vecto-ui/core`**: new public `Scene.detachA11y(entity)` to prune the shadow node(s) of an entity subtree on demand. Interactive _child_ entities (e.g. per-link hotspots) call this when they are removed, so the per-frame `syncA11y` (which only creates/updates) never leaks stale nodes.
- **`@vecto-ui/ui`**: `RichText` gains `linkColor` and `onLinkClick` options. Each contiguous `href` run gets one transparent `<a>` hotspot child, kept stable across re-wrap (one per run) and pruned when the links change. Link glyphs render with the link color plus an underline.
