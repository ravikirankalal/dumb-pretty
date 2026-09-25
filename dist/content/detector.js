// JSON Visualizer — entry point / detector (classic script, runs last).
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  async function main() {
    // Guard: only act once per document, and never inside iframes we don't own.
    if (window.__jvRendered) return;
    if (!document.body && !document.documentElement) return;

    const settings = await JV.getSettings();
    JV._settings = settings;

    if (!settings.enabled) return;
    let hostname = '';
    try { hostname = location.hostname; } catch (_e) { return; }
    if (JV.isOriginDisabled(settings, hostname)) return;

    const mime = (() => { try { return document.contentType; } catch (_e) { return ''; } })();
    const sourceText = extractSourceText(mime);
    if (sourceText === null) return;

    const result = JV.parseJson(sourceText, settings.maxPayloadBytes);
    if (!result.ok) {
      maybeShowTooLargeBanner(result, settings, sourceText);
      return;
    }
    window.__jvRendered = true;

    const app = JV.buildApp({
      value: result.value,
      sourceText: result.source,
      settings,
    });
    document.documentElement.replaceChildren(
      document.createElement('head'),
      buildBody(app)
    );
    document.title = 'JSON · ' + (hostname || 'document');
    notifyBadge(true);
  }

  function buildBody(app) {
    const body = document.createElement('body');
    body.className = 'jv-body';
    body.appendChild(app);
    return body;
  }

  /** Return the raw text if this document looks like JSON, else null. */
  function extractSourceText(mime) {
    if (JV.isJsonMime(mime)) {
      return getDocumentText();
    }
    // Fallback: server sent JSON as text/plain or text/html with a bare <pre>.
    if (mime === 'text/plain' || mime === 'text/html' || mime === '') {
      // Heuristic: first non-space char must be { or [ to avoid parsing HTML.
      const probe = getDocumentText();
      if (probe === null) return null;
      const first = probe.trimStart()[0];
      if (first !== '{' && first !== '[') return null;
      return probe;
    }
    return null;
  }

  function getDocumentText() {
    try {
      const pre = document.querySelector('pre');
      if (pre && pre.parentElement && pre.textContent.trim()) return pre.textContent;
      const text = (document.body && document.body.innerText) ||
                   (document.documentElement && document.documentElement.textContent);
      return text || null;
    } catch (_e) {
      return null;
    }
  }

  function maybeShowTooLargeBanner(result, settings, sourceText) {
    if (result.error !== 'too-large') return;
    const banner = JV.el('div', 'jv-toolbar jv-banner');
    banner.appendChild(JV.el('span', null,
      `JSON payload is ${JV.formatBytes(result.size)} — above the ${JV.formatBytes(settings.maxPayloadBytes)} render limit.`));
    const btn = JV.el('button', 'jv-btn', 'Render anyway');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const parsed = JV.parseJson(sourceText, 0);
      if (!parsed.ok) return;
      banner.remove();
      document.body.prepend(JV.buildApp({ value: parsed.value, sourceText: parsed.source, settings }));
    });
    banner.appendChild(btn);
    document.body.prepend(banner);
  }

  function notifyBadge(active) {
    try {
      chrome.runtime.sendMessage({ type: 'jv-state', active }, () => void chrome.runtime.lastError);
    } catch (_e) { /* no-op */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => main().catch(() => {}));
  } else {
    main().catch(() => {});
  }
})();
