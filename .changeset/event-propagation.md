---
'@vecto-ui/core': patch
---

Add DOM-style event propagation (capture + bubble) to the entity tree.

`Scene` now dispatches forwarded pointer/wheel/click events through a `VectoUIEvent` that walks the tree: a capture phase (root→target) then a bubble phase (target→root). Handlers get `target`, `currentTarget`, `stopPropagation()`, `stopImmediatePropagation()`, and `preventDefault()`; common native fields (`deltaY`, `clientX`, `key`, …) pass through, so existing handlers keep working.

- `Entity.on(type, cb, { capture })` registers a capture-phase listener (bubble is the default).
- `Entity.dispatchEvent(event)` runs the capture/bubble walk; `emit(type, payload)` stays a direct, self-only dispatch (back-compat, used for component-internal events like a control's own `change`).
- enter/leave (`hover`/`pointerleave`) don't bubble, matching the DOM; click/pointer/wheel do — so an ancestor (e.g. a draggable list) can react and stop a descendant's event.
