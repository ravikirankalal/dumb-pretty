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

## Publishing to the Chrome Web Store

### One-time setup (manual, ~20 minutes)

1. **Register as a Chrome Web Store developer**: sign in at the
   [Developer Dashboard](https://chrome.google.com/webstore/devconsole) with your Google account
   and pay the **one-time $5 USD registration fee**.
2. **Create the listing**: click "New item", upload the packaged zip (`json-visualizer.zip` from
   the command above — repackage after every release), then fill in the store text from
   [`store/LISTING.md`](store/LISTING.md) (name, descriptions, category). Upload a 128×128 icon
   (reuse `dist/icons/icon128.png`) and at least one 1280×800 screenshot — open e.g.
   `https://jsonplaceholder.typicode.com/users` with the extension installed and capture each view.
3. **Privacy disclosures**: answer the questionnaire using
   [`store/PRIVACY.md`](store/PRIVACY.md) (correct answer: no data is collected; single purpose).
   The dashboard requires a **privacy policy URL** — a ready-made page lives at
   [`site/privacy.html`](site/privacy.html); enable GitHub Pages for this repo and use
   `https://ravikirankalal.github.io/dumb-pretty/privacy.html`.
4. **Visibility**: choose Unlisted or Public, then click "Publish item". First submissions of a
   broad-host-permission extension typically undergo a human review taking a few hours to several
   days. Note the assigned extension ID shown in the dashboard.

### Automated uploads via GitHub Actions (optional, for future releases)

The workflow [`.github/workflows/publish.yml`](.github/workflows/publish.yml) packages `dist/` and
uploads it to the store automatically when you push a `v*` tag (or run it manually from the
Actions tab). It stays disabled until you configure it:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, enable the
   **Chrome Web Store API**, and create **OAuth client ID** credentials (type: *Desktop app*).
   Add `https://www.googleapis.com/auth/chromewebstore` as an authorized redirect URI.
2. Exchange that client ID/secret for a **refresh token** once, locally:
   ```bash
   npx chrome-web-store-login <CLIENT_ID> <CLIENT_SECRET>   # opens browser consent; prints refresh token
   ```
3. In your GitHub repo → Settings → Secrets and variables → Actions, add secrets
   `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, and repository variable
   `ENABLE_CWS_PUBLISH = true`.
4. From then on, tagging a release also pushes the new package to the store as a draft update;
   flip it to published in the dashboard (the API cannot skip review).

Note: `<all_urls>` host permission draws extra scrutiny during review. If reviewers ask, justify
it in the submission notes ("reads only JSON documents the user opens; renders locally; makes no
network requests") or narrow permissions to specific origins you actually need.

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
