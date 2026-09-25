# Project State Tracker (living document)

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 Docs & skeleton | ✅ done | DESIGN.md, PLAN.md, README |
| M1 Extension shell | ✅ done | manifest/popup/icons |
| M2 Core pipeline | ✅ done | detector/parser/analyzer + tests |
| M3 Renderer | ✅ done | table/grid/list/primitives/chunking/css + syntax-highlighted pretty view |
| M4 Toolbar | ✅ done | views/search/actions |
| M5 Verification | ✅ done | 37/37 tests pass (Node 18/20/22 in CI) |
| M6 CI/CD | ✅ done | GitHub Actions: test matrix + release job (.github/workflows/ci.yml) |
| v1.0.0 Release | ✅ done | Tagged & published 2026-09-25 — github.com/ravikirankalal/dumb-pretty/releases/tag/v1.0.0 |

## Release Process (v1.x)
1. Bump `version` in BOTH `package.json` and `dist/manifest.json` to the same value.
2. Commit (`chore(release): vX.Y.Z`) and push to master; wait for CI green.
3. `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z` → the workflow's release job
   validates version consistency, zips `dist/`, and publishes a GitHub Release
   (asset: `json-visualizer-vX.Y.Z.zip`).
4. Optionally upload the same zip to the Chrome Web Store.

## Decision Log
- 2026-09-25: v1.0.0 cut from master @ 9cad606; release asset verified (19 files, manifest v1.0.0, MV3).
- 2026-09-25: Load unpacked from `dist/` directly; content scripts written as classic scripts
  that register globals on a single namespace (`JV`) to avoid MV3 ES-module import friction.
- 2026-09-25: XSS strategy = `createElement`+`textContent` only; never `innerHTML` with data.
- 2026-09-25: Bug fix — geo lat/lng rendered vertically in table cells. Root cause: nested
  objects expanded as dl.jv-grid (dt/dd stack = vertical). Fix: `JV.inlineObjectChip` renders
  small flat objects (≤4 primitive keys) as one inline "key: value · key: value" chip, applied
  both in table cells (`cellValue`) and at any depth via `renderNested`. Deeper/nested objects
  still collapse to expandable chips. Regression tests added (renderer.test.js): 37/37 green.
