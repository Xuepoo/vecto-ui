# Changelog

VectoUI is a monorepo. **Per-package, machine-generated changelogs are the source of truth:**

- [`@vecto-ui/core`](./packages/core/CHANGELOG.md)
- [`@vecto-ui/ui`](./packages/ui/CHANGELOG.md)

This file keeps a curated, high-level history. Versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) via
[Changesets](https://github.com/changesets/changesets).

## Highlights

### core 0.7.1 · three 0.2.0 (unreleased)

WebGL/Three.js 3D space UI adapter integration and custom viewport control.

- **3D Space UI Adapter (`@vecto-ui/three`)** — Bridges VectoUI's 2D layout/component system into Three.js 3D/WebXR. Features dynamic `CanvasTexture` update intercepting, universal 3D-to-2D raycast event translation, multi-pointer WebXR state tracking, event routing to transparent DOM overlays, hover transition boundaries, and clean resource disposal.
- **Offscreen Canvas & Custom Viewports** — Added `disableWindowResize` to `SceneOptions` and exposed a manual `Scene.resize(width, height)` API, allowing Vecto core to run on custom-sized canvas texture layers without window listener interference.

### core 0.6.0 · ui 0.3.0 (unreleased)

Rich typography, GPU text, and a leaner repo.

- **Inline rich text** — bold/italic/colored/differently-sized runs flowing and wrapping on a
  shared baseline (`RichText`, `LayoutEngine.prepareRich`).
- **Inline links with a11y** — an `href` run is underlined on canvas and projects a real,
  operable `<a href>` shadow node (agent- and screen-reader-drivable).
- **Text flow around exclusion rects** ("文字绕流") — `computeLineSegments` + per-line
  segment flow, like CSS floats.
- **Streaming / typewriter** — `prepareRich` paragraph memoization makes a growing styled
  document re-lay out in O(changed paragraph); `RichText.appendSpans` / `Text.append`.
- **MSDF GPU text + off-thread layout** — `MSDFFont`, `MSDFTextEntity` (WebGL median/`fwidth`
  with a Canvas 2D fallback), `LayoutWorkerManager` (Web Worker reflow).
- **Streaming Markdown** + components — `Markdown` (`appendMarkdown`), `Table`, `Dropdown`,
  `Slider`, `Modal`, `Flow`, multi-line `TextArea`.
- **Engine-only repo** — demos and docs moved to
  [vecto-website](https://github.com/Xuepoo/vecto-website); the core repo stays lean.

### 0.1.0 — 2026-06-25

Initial public release of the Canvas 2D ECS engine: rendering runtime (10k+ entities),
`LayoutEngine` (`Intl.Segmenter` reflow), spring physics (with off-thread `SharedArrayBuffer`
fallback), `SpatialHashGrid`, zero-GC `LayoutResultBuffer`, and scene/lifecycle management.
