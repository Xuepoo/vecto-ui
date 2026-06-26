---
'@vecto-ui/core': patch
---

Fix: Add keyboard accessibility (tabindex and Enter/Space keydown events) for non-natively focusable elements with interactive roles (like `role="switch"`) in the a11y shadow DOM.
