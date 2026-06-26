---
'@vecto-ui/core': patch
'@vecto-ui/ui': patch
---

IME / text-selection moat for the canvas `Input` (canvas-mirror approach).

The real, transparent `<input>` shadow node already handles all native input
(IME composition, selection, clipboard, undo); the canvas now mirrors it visually.

- **core**: `IRenderer.clip(x, y, w, h)` (rect clip, implemented in `CanvasRenderer`).
  `Scene.syncA11y` forwards IME composition (`{ start, length } | null`), selection
  (`selectionStart`/`selectionEnd`), and new `focus`/`blur` events from text `<input>`
  shadow nodes; the `change` payload is extended accordingly.
- **ui**: `Input` renders a blinking caret (when focused), a selection highlight, the
  IME composing segment (underlined), and scrolls horizontally to keep the caret in
  view for overflowing text. A human can now type CJK into a pure-canvas field; agents
  still drive it by role.
