# Project State Tracker (living document)

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 Docs & skeleton | ✅ done | DESIGN.md, PLAN.md, README |
| M1 Extension shell | ⏳ pending | manifest/popup/icons |
| M2 Core pipeline | ⏳ pending | detector/parser/analyzer + tests |
| M3 Renderer | ⏳ pending | table/grid/list/primitives/chunking/css |
| M4 Toolbar | ⏳ pending | views/search/actions |
| M5 Verification | ⏳ pending | npm test green, fixtures |

## Decision Log
- 2026-09-25: Load unpacked from `dist/` directly; content scripts written as classic scripts
  that register globals on a single namespace (`JV`) to avoid MV3 ES-module import friction.
- 2026-09-25: XSS strategy = `createElement`+`textContent` only; never `innerHTML` with data.
- 2026-09-25: Bug fix — geo lat/lng rendered vertically in table cells. Root cause: nested
  objects expanded as dl.jv-grid (dt/dd stack = vertical). Fix: `JV.inlineObjectChip` renders
  small flat objects (≤4 primitive keys) as one inline "key: value · key: value" chip, applied
  both in table cells (`cellValue`) and at any depth via `renderNested`. Deeper/nested objects
  still collapse to expandable chips. Regression tests added (renderer.test.js): 37/37 green.
