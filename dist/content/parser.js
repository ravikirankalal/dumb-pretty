// JSON Visualizer — safe parser (classic script, namespace JV).
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  // Regex used to preserve unsafe-integer literals exactly as written in source.
  const BIG_NUM_TOKEN = /:\s*(-?\d{16,})(\s*[,}\]])/g;

  /** Recursively strip prototype-pollution keys. */
  JV.sanitize = function sanitize(node) {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (POLLUTION_KEYS.has(node[i])) node[i] = null;
        else node[i] = sanitize(node[i]);
      }
      return node;
    }
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        if (POLLUTION_KEYS.has(key)) {
          delete node[key];
          continue;
        }
        node[key] = sanitize(node[key]);
      }
      return node;
    }
    return node;
  };

  /**
   * Parse JSON text safely.
   * @returns {{ok:true, value:*, bigNumbers:Set<string>} | {ok:false, error:string}}
   */
  JV.parseJson = function parseJson(text, maxBytes) {
    if (typeof text !== 'string') return { ok: false, error: 'not-a-string' };
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: 'empty' };
    if (maxBytes && trimmed.length > maxBytes) {
      return { ok: false, error: 'too-large', size: trimmed.length };
    }
    // Only attempt parse on plausible JSON starts (avoids burning time on HTML).
    if (!/^[[{"\-\d]|^(true|false|null)$/.test(trimmed[0]) && !/^[{["\-0-9tfn]/.test(trimmed)) {
      return { ok: false, error: 'not-json-looking' };
    }
    let value;
    try {
      value = JSON.parse(trimmed);
    } catch (e) {
      return { ok: false, error: 'parse-error: ' + e.message };
    }
    if (typeof value === 'string' || typeof value === 'number') {
      // A bare primitive is technically valid JSON but almost never a "response"
      // worth replacing the page for. Require object/array roots.
      return { ok: false, error: 'primitive-root' };
    }
    JV.sanitize(value);
    // Track big integers so renderer can show them without precision loss.
    const bigNumbers = new Set();
    let m;
    BIG_NUM_TOKEN.lastIndex = 0;
    while ((m = BIG_NUM_TOKEN.exec(trimmed)) !== null) {
      bigNumbers.add(m[1]);
    }
    return { ok: true, value, bigNumbers, source: trimmed };
  };
})();
