// JSON Visualizer — shared helpers, classic script (no modules) under namespace JV.
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  JV.DEFAULTS = {
    enabled: true,
    disabledOrigins: [],
    maxPayloadBytes: 5 * 1024 * 1024,
    defaultView: 'visual', // visual | pretty | raw
    theme: 'auto',
    chunkSize: 300,
  };

  /** Promise wrapper for chrome.storage.local with defaults merged in. */
  JV.getSettings = function getSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(JV.DEFAULTS, (items) => {
          resolve(Object.assign({}, JV.DEFAULTS, items || {}));
        });
      } catch (_e) {
        // Non-extension context (tests): fall back to defaults.
        resolve(Object.assign({}, JV.DEFAULTS));
      }
    });
  };

  JV.setSetting = function setSetting(key, value) {
    return new Promise((resolve) => {
      const patch = {};
      patch[key] = value;
      try {
        chrome.storage.local.set(patch, resolve);
      } catch (_e) {
        resolve(); // non-extension context (tests)
      }
    });
  };

  /** Is this origin disabled by the user? */
  JV.isOriginDisabled = function isOriginDisabled(settings, hostname) {
    const list = settings.disabledOrigins || [];
    return list.some(
      (o) => hostname === o || hostname.endsWith('.' + o.replace(/^\./, ''))
    );
  };

  const JSON_MIME_RE = /^application\/(?:[\w.+-]+\+)?json$/i;
  JV.isJsonMime = function isJsonMime(type) {
    if (!type) return false;
    const base = String(type).split(';')[0].trim().toLowerCase();
    return (
      base === 'application/json' ||
      base === 'text/json' ||
      JSON_MIME_RE.test(base) ||
      /\+json$/.test(base)
    );
  };

  /** Format bytes: 1234 -> "1.2 KB" */
  JV.formatBytes = function formatBytes(n) {
    if (n < 1024) return n + ' B';
    const units = ['KB', 'MB', 'GB'];
    let u = -1;
    do { n /= 1024; u++; } while (n >= 1024 && u < units.length - 1);
    return n.toFixed(1) + ' ' + units[u];
  };

  JV.formatCount = function formatCount(n) {
    return Number(n).toLocaleString('en-US');
  };

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  JV.looksLikeDate = function looksLikeDate(s) {
    if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return false;
    const t = Date.parse(s);
    return !Number.isNaN(t);
  };

  JV.relativeTime = function relativeTime(iso) {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return '';
    const diff = (Date.now() - then) / 1000;
    const abs = Math.abs(diff);
    const fmt = (v, unit) => (diff >= 0 ? v + ' ' + unit + (v === 1 ? '' : 's') + ' ago' : 'in ' + v + ' ' + unit + (v === 1 ? '' : 's'));
    if (abs < 60) return fmt(Math.round(abs), 'second');
    if (abs < 3600) return fmt(Math.round(abs / 60), 'minute');
    if (abs < 86400) return fmt(Math.round(abs / 3600), 'hour');
    if (abs < 86400 * 30) return fmt(Math.round(abs / 86400), 'day');
    if (abs < 86400 * 365) return fmt(Math.round(abs / (86400 * 30)), 'month');
    return fmt(Math.round(abs / (86400 * 365)), 'year');
  };

  const URL_RE = /^https?:\/\/[^\s]+$/i;
  JV.looksLikeUrl = function looksLikeUrl(s) {
    if (typeof s !== 'string' || !URL_RE.test(s)) return false;
    try { new URL(s); return true; } catch (_e) { return false; }
  };

  /** Safe anchor creation — only http/https schemes allowed. */
  JV.makeLink = function makeLink(url) {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'jv-link';
    return a;
  };

  JV.el = function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
})();
