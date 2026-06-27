---
'@vecto-ui/core': minor
---

DOM Portal + SVG entities — bridge native DOM and vector graphics into the canvas scene (战役二).

- **`DOMPortalEntity`**: mounts a real HTML element (iframe, video, third-party widget…) into the Vecto coordinate space. It forwards native `click`/`pointer*`/`wheel` into the entity tree as `VectoUIEvent`s (with capture-phase `focus`/`blur`), caches its measured size via a `ResizeObserver` to avoid forced reflow on hit-testing, and is a leaf (guards against adding canvas children).
- **`SVGEntity`**: renders an SVG source (e.g. LaTeX/Mermaid output) with dynamic level-of-detail re-rasterization — debounced on scale change, with a cached parsed document, and a browser/SSR-safe dimension parser.
- **`Scene`**: unified stacking — DOM portals mount under `a11yRoot` and share one depth-ordered `zIndex` pass with the a11y shadow nodes (fixes the a11y layer hijacking portal clicks); portals are pre-cull aligned and reconciled safely across scenes.
- **`Entity.getWorldRotation()`**: accumulated world-space rotation up the parent chain.
