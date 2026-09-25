# JSON Visualizer — Implementation Plan

## Milestones

### M0 — Project Skeleton & Docs  ✅
- [x] Repo layout (`docs/`, `src/`, `dist/` as loadable extension root)
- [x] DESIGN.md, PLAN.md (this file), PROJECT_STATE.md (tracking)
- [x] README with install/load instructions

### M1 — Extension Shell (MV3)
- [ ] `dist/manifest.json` — MV3, content script on `<all_urls>`, popup, service worker
- [ ] `dist/background/service_worker.js` — badge state per tab
- [ ] `dist/popup/` — enable/disable UI wired to storage
- [ ] Icons (generated simple PNGs)

### M2 — Core Pipeline (content scripts)
- [ ] `detector.js` — MIME + fallback detection, disabled-origin check (PR-1, PR-8)
- [ ] `parser.js` — size guard, safe parse, pollution sanitizer (PR-6 partial, security)
- [ ] `analyzer.js` — shape inference: table/list/grid/primitive/mixed (PR-3)
- [ ] Unit-testable pure modules + Node test harness (`tests/`)

### M3 — Renderer
- [ ] `renderer.js` — table view w/ sticky header, sorting, zebra rows (PR-3)
- [ ] grid/key-value view for objects (PR-2)
- [ ] list views (primitive lists, nested lists, mixed arrays) (PR-2)
- [ ] primitive styling: badges, chips, URL links, date tooltips (PR-5)
- [ ] nested expand/collapse + depth cap (PR-4)
- [ ] chunked mounting + "Load more" (PR-6)
- [ ] `styles.css` — theming, light/dark (PR-10)

### M4 — Toolbar & Views
- [ ] Visual / Pretty / Raw switcher (PR-7)
- [ ] Search filter with highlight (PR-7)
- [ ] Copy / Download / Expand-all / Collapse-all / Disable-site (PR-7, PR-8)

### M5 — Verification & Polish
- [ ] Automated tests pass (analyzer/parser/renderer-to-string snapshots)
- [ ] Manual smoke fixtures in `tests/fixtures/` (open in browser checklist in README)
- [ ] Final README, load-unpacked instructions, screenshots section placeholder

## Task → Requirement Traceability
| Req  | Tasks                    |
|------|--------------------------|
| PR-1 | M2 detector              |
| PR-2 | M3 renderer              |
| PR-3 | M2 analyzer + M3 table   |
| PR-4 | M3 nested expand         |
| PR-5 | M3 primitives            |
| PR-6 | M2 parser guard + M3 chunking |
| PR-7 | M4 toolbar               |
| PR-8 | M1 popup/storage + M4 disable-site |
| PR-9 | all (no deps, no fetch)  |
| PR-10| M3 styles.css            |

## Testing Strategy
- **Unit (Node):** parser sanitizer, analyzer shape rules, column union, edge cases
  (empty, deep, huge array stubs, malformed input). Run via `npm test` (plain node:test).
- **DOM snapshot:** lightweight fake-DOM shim to assert renderer output structure without Chrome.
- **Manual:** fixture JSON files served locally; checklist in README.

## Risk Register
| Risk                          | Mitigation                                   |
|-------------------------------|----------------------------------------------|
| Giant payloads freeze tab     | byte cap + chunked mount + collapsed defaults|
| XSS via JSON strings          | textContent-only rendering                   |
| Breaking non-JSON pages       | strict contentType gate                      |
| MV3 content-script module limits | plain scripts (no ES-module import graph at runtime) |
