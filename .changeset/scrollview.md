---
'@vecto-ui/core': patch
'@vecto-ui/ui': patch
---

Add a scrollable viewport (`ScrollView`) with clipping + wheel scrolling.

- `core`: `Entity.clipChildren` (Scene clips a node's children to its local box) and a forwarded `'wheel'` event from the shadow node (non-passive, so a scroll container can `preventDefault()` the page scroll).
- `ui`: `ScrollView({ width, height })` — nests children in a clipped content layer, scrolls on wheel with a damped spring, and clamps to the content bounds. Unblocks scrollable docs/long-list pages built with VectoUI.
