# JSON Visualizer

A Chrome extension (Manifest V3) that recognizes JSON responses in the browser and renders them as **visual UI elements** — sortable tables, nested lists, key/value grids, type badges, clickable links — instead of just pretty-printed text.

Think *Pretty JSON*, but the output is a real UI: arrays of objects become tables, deeply-nested objects become expandable grids, primitives get color-coded type badges, and everything is searchable and theme-aware.

## Features

- **Auto-detection** – When a page is a raw JSON response (`application/json`, `text/json`, or JSON-looking body), it is detected and visualized automatically.
- **Three view modes** – Toggle between **Visual** (UI rendering), **Pretty** (formatted JSON text), and **Raw** (original source) via a floating toolbar.
- **Smart layout inference** – Homogeneous arrays of objects render as tables; heterogeneous data renders as nested lists / key-value grids.
- **Sortable tables** – Click column headers to sort (string/number/date aware).
- **Search / filter** – Live-filter rows and keys as you type.
- **Type badges & links** – Booleans, nulls, numbers, strings are color-coded; URLs and emails become clickable.
- **Expand / collapse** – Drill into nested structures; expand-all / collapse-all controls.
- **Export actions** – Copy JSON, download `.json` file.
- **Light / dark themes** – Follows system preference, overridable in the popup settings.
- **Safe rendering** – All values rendered via `textContent` (no `innerHTML`/`eval`), prototype-pollution sanitization, and size guards for huge payloads.

## Project Structure

```
.
├── dist/                  # The loadable unpacked extension
│   ├── manifest.json      # Manifest V3
│   ├── background/        # Service worker (settings defaults, icon badge)
│   ├── content/           # Content scripts: detector, parser, analyzer, renderer, toolbar, styles
│   ├── popup/             # Extension popup (settings UI)
│   └── icons/             # Extension icons
├── docs/
│   ├── DESIGN.md          # Requirements & architecture design doc
│   ├── PLAN.md            # Milestones & execution plan
│   └── PROJECT_STATE.md   # Progress tracker
├── tests/                 # Node-based unit tests (parser / analyzer / renderer)
└── package.json
```

## Build & Install (Load Unpacked)

The extension ships as plain JavaScript with **no build step required** — `dist/` is already the ready-to-load extension.

1. **Clone / open this repository** locally.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the **`dist/`** folder of this repository.
6. The "JSON Visualizer" icon appears in your extensions toolbar.

### Optional: verify before loading

```bash
npm install   # no runtime deps; only used for the test runner
npm test      # runs the unit test suite (node --test)
```

All 30 tests should pass.

## Usage

1. Visit any URL that returns JSON, e.g. `https://jsonplaceholder.typicode.com/users`.
2. The response is automatically replaced by the visual rendering:
   - Arrays of objects → **sortable table** with one row per item.
   - Objects → **key/value grid** with expandable nested sections.
   - Primitives → **color-coded badges** (strings, numbers, booleans, nulls); URLs are clickable.
3. Use the **toolbar** (top of the page) to:
   - Switch **Visual / Pretty / Raw** views.
   - **Search** to filter rows and keys.
   - **Expand all / Collapse all** nested nodes.
   - **Copy** or **Download** the original JSON.
4. Click the extension **popup** icon to change global settings (auto-enable, default view, theme).

> Tip: if a JSON endpoint doesn't auto-render (e.g. served with an unusual MIME type), toggle it from the popup or reload the page.

## Packaging for Distribution

To create a `.zip` for the Chrome Web Store or manual sharing:

```bash
cd dist
zip -r ../json-visualizer.zip . -x "*.DS_Store"
```

Then upload the zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (a $5 one-time developer registration is required by Google), or share the zip and have users unzip it and **Load unpacked** as above.

## Development

- Edit files under `dist/content/`, `dist/popup/`, or `dist/background/`.
- After changes, go to `chrome://extensions` and click the **reload (⟳)** button on the JSON Visualizer card, then refresh any open JSON tab.
- Debug content scripts via DevTools → Sources → "Content scripts" tree on a JSON page.
- Design decisions and architecture are documented in [`docs/DESIGN.md`](docs/DESIGN.md); milestone tracking lives in [`docs/PLAN.md`](docs/PLAN.md) and [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).

### Adding tests

Tests run with Node's built-in test runner (no dependencies):

```bash
npm test                          # run all tests (plain `node --test` discovery)
node --test "tests/analyzer.test.js"  # run a single test file (from repo root; keep the quotes + ./-free relative path so Node >=20 treats it as a glob, not a module to require)
```

> Note: on Node 20+ a bare directory/path argument without this form can trigger `MODULE_NOT_FOUND`; plain `node --test` (what `npm test` runs) is always safe.

## License

MIT — see [LICENSE](LICENSE).
