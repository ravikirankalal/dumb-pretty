# JSON Visualizer — Design Document

## 1. Problem Statement
Developers frequently hit raw JSON endpoints in the browser (APIs, config files, data dumps).
Chrome's default behavior is to show a plain monospace text dump. Existing "Pretty JSON" style
extensions improve readability with syntax highlighting and collapsible trees, but they still
render **text**.

**Goal:** When the browser receives a JSON response, re-render it as **real UI elements** —
tables for arrays of objects, definition grids for objects, badges for booleans/nulls,
expandable nested cards — so humans can scan data visually.

## 2. Product Requirements

| ID   | Requirement                                                                       |
|------|-----------------------------------------------------------------------------------|
| PR-1 | Detect `application/json` (and `text/json`, `+json`) responses rendered by Chrome |
| PR-2 | Replace the document with a visual rendering: tables, lists, key-value grids      |
| PR-3 | Arrays of homogeneous objects → columnar table with type-aware cells              |
| PR-4 | Nested objects/arrays inside table cells → expandable sub-rendering               |
| PR-5 | Primitives get distinct visual treatments (strings, numbers, booleans, null)      |
| PR-6 | Large payloads stay responsive (chunked mounting / capped expansion)              |
| PR-7 | Toolbar: Raw / Pretty / Visual view toggle, search filter, copy, collapse-all     |
| PR-8 | User can disable per-site or globally via popup                                   |
| PR-9 | Works offline; no network calls; zero third-party runtime dependencies            |
| PR-10| Light/dark theme following `prefers-color-scheme`                                 |

## 3. High-Level Architecture

```
┌────────────────────── Chrome Tab (JSON document) ──────────────────────┐
│  Content Script (isolated world)                                       │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Detector  │─▶│ Parser   │─▶│ Analyzer  │─▶│ Renderer (DOM build) │  │
│  │ MIME/body │  │ safe js  │  │ shape inf │  │ table/list/primitive │  │
│  └───────────┘  └──────────┘  └───────────┘  └──────────┬───────────┘  │
│  ┌───────────┐  ┌──────────┐                            ▼              │
│  │ Popup     │◀▶│ Storage  │              ┌──────────────────────────┐ │
│  │ (toggle)  │  │ chrome.* │              │ Toolbar: views/search    │ │
│  └───────────┘  └──────────┘              └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Components

**a) Detector (`src/content/detector.js`)**
- Runs at `document_idle` on `<all_urls>`.
- Primary path: `document.contentType` ∈ {`application/json`, `text/json`, `*/*+json`,
  `application/problem+json`, …}.
- Fallback path: if the document is effectively a single `<pre>`/text blob (servers sending
  JSON as `text/plain`), attempt a *guarded* parse of the trimmed body text.
- Checks disabled-origin list from storage before doing anything.

**b) Safe Parser (`src/content/parser.js`)**
- Rejects payloads > 5 MB (configurable) to avoid freezing on giant dumps.
- Sanitizes prototype-pollution keys (`__proto__`, `constructor`, `prototype`) recursively.
- Never uses `eval`. Unsafe integers are preserved verbatim as flagged string values.

**c) Shape Analyzer (`src/content/analyzer.js`)**
Pure functions over parsed JSON producing a `Shape` descriptor:

| Shape        | Rule                                                       | Example             |
|--------------|-------------------------------------------------------------|---------------------|
| `table`      | Array where ≥80% items are plain objects sharing ≥1 key     | `[{id,name},…]`     |
| `list`       | Array of primitives                                         | `["a","b"]`         |
| `nestedList` | Array containing arrays                                     | `[[1,2],[3,4]]`     |
| `grid`       | Plain object (key → value map)                              | `{"a":1,"b":2}`     |
| `primitive`  | string / number / boolean / null                            | `42`, `"hi"`        |
| `mixedArray` | Anything else → indexed list card                           | `[1,{…},"x"]`       |

Table analysis additionally computes the union of columns (missing keys → `—` placeholder),
per-column type inference (numeric → right-aligned, boolean → badge), and enforces a max
recursion depth of 12 (deeper nodes render as collapsed chips).

**d) Renderer (`src/content/renderer.js`)**
Builds DOM via `document.createElement` only — all JSON values enter the page through
`textContent` (XSS-safe by design).

- **Table view:** sticky header, zebra rows, click-to-sort columns, row-count summary,
  cell click expands nested value inline.
- **Grid view (objects):** two-column definition grid; URLs become validated anchors;
  ISO-8601 dates get humanized relative-time tooltips.
- **Primitives:** strings → quoted chip; booleans → green/red badge; null → gray badge;
  numbers → tabular figures.
- **Expand/collapse:** nested containers past depth 2 start collapsed showing
  `{…} 5 keys` / `[…] 120 items`.
- **Chunked mounting:** arrays > chunkSize (default 300) mount in slices with a
  "Load more" sentinel row to keep first paint fast.

**e) Toolbar (`src/content/toolbar.js`)**
Fixed top bar:
- View switcher: **Visual** · **Pretty** (collapsible highlighted text tree) · **Raw**
  (three DOM roots, visibility toggled).
- Search box: filters/highlights matching keys/values.
- Buttons: Copy JSON, Download JSON, Expand/Collapse all, Disable-on-this-site.

**f) Popup + Background (`src/popup/`, `src/background/`)**
- Popup: master enable toggle, quick per-origin toggle, max-payload setting.
- MV3 service worker: updates toolbar icon badge per tab state. Deliberately thin.

**g) Storage schema (`chrome.storage.local`)**
```json
{
  "enabled": true,
  "disabledOrigins": ["intranet.corp"],
  "maxPayloadBytes": 5242880,
  "defaultView": "visual",
  "theme": "auto",
  "chunkSize": 300
}
```

### 3.2 Data Flow (happy path)
1. Navigate to `https://api.example.com/users` → MIME `application/json`.
2. Content script boots → detector confirms JSON → reads original text.
3. Parser sanitizes → Analyzer infers root shape (`table`) → Renderer builds toolbar + table.
4. Original DOM replaced; Raw view preserves exact source text.

### 3.3 Edge Cases & Failure Modes
| Case                              | Behavior                                               |
|-----------------------------------|--------------------------------------------------------|
| Malformed JSON                    | Silent bail-out; native Chrome view untouched          |
| Empty object/array                | Renders `(empty)` chip                                  |
| Payload > max size                | Skips rendering; banner offers "render anyway"          |
| Page already interactive (SPA)    | Only acts when contentType is JSON                      |
| CSP-restricted pages              | Inline-free code, extension files only                  |
| Depth > 12                        | Collapsed chips, no further recursion                   |

## 4. Tech Choices
- **Manifest V3**, plain ES modules; dev loads unpacked directly from `dist/` (no build
  required). A tiny bundler script is a later nice-to-have.
- No frameworks; one CSS file with custom properties + `@media (prefers-color-scheme)`.

## 5. Non-Goals (v1)
- Editing/reposting JSON, diff view, GraphQL/Protobuf decoding, DevTools panel.

## 6. Security
- `<all_urls>` host permission mitigated by read-only behavior and zero network egress.
- All rendering via `textContent` — JSON can never execute as HTML.
- Prototype-pollution sanitizer on every parsed payload.
