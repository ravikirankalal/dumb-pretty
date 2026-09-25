// JSON Visualizer — shape analyzer (classic script, namespace JV).
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  JV.MAX_DEPTH = 12;

  JV.isPlainObject = function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  };

  JV.isPrimitive = function isPrimitive(v) {
    return v === null || ['string', 'number', 'boolean'].includes(typeof v);
  };

  /**
   * Infer the visual shape of a value.
   * @returns {{kind:'table'|'list'|'nestedList'|'mixedArray'|'grid'|'primitive', ...}}
   */
  JV.analyzeShape = function analyzeShape(value, depth = 0) {
    if (JV.isPrimitive(value)) {
      return { kind: 'primitive', type: value === null ? 'null' : typeof value, value };
    }
    if (depth >= JV.MAX_DEPTH) {
      return { kind: 'collapsed', value };
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return { kind: 'emptyArray' };

      let objCount = 0, primCount = 0, arrCount = 0;
      for (const item of value) {
        if (JV.isPlainObject(item)) objCount++;
        else if (Array.isArray(item)) arrCount++;
        else if (JV.isPrimitive(item)) primCount++;
      }
      const n = value.length;

      if (objCount / n >= 0.8) {
        return { kind: 'table', columns: JV.analyzeColumns(value), rowCount: n, value };
      }
      if (primCount === n) {
        const types = new Set(value.map((v) => (v === null ? 'null' : typeof v)));
        return { kind: 'list', itemType: types.size === 1 ? [...types][0] : 'mixed', value };
      }
      if (arrCount / n >= 0.8) {
        return { kind: 'nestedList', value };
      }
      return { kind: 'mixedArray', value };
    }
    // plain object
    const keys = Object.keys(value);
    if (keys.length === 0) return { kind: 'emptyObject' };
    return { kind: 'grid', keys, value };
  };

  /**
   * Compute table columns from an array (mostly) of objects.
   * Column order = first-seen order across rows. Types inferred per column.
   */
  JV.analyzeColumns = function analyzeColumns(rows) {
    // key -> {key, present, counts:{string,number,boolean,null,object,array}}
    const seen = new Map();
    let objectRows = 0;
    for (const row of rows) {
      if (!JV.isPlainObject(row)) continue;
      objectRows++;
      for (const key of Object.keys(row)) {
        let info = seen.get(key);
        if (!info) {
          info = { key, present: 0, counts: {} };
          seen.set(key, info);
        }
        info.present++;
        const v = row[key];
        const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
        info.counts[t] = (info.counts[t] || 0) + 1;
      }
    }
    const columns = [];
    for (const info of seen.values()) {
      columns.push({
        key: info.key,
        present: info.present,
        missing: objectRows - info.present,
        dominantType: JV.dominantType(info.counts),
        hasComplex: !!(info.counts.object || info.counts.array),
        counts: info.counts,
      });
    }
    return columns;
  };

  JV.dominantType = function dominantType(counts) {
    let best = 'mixed', bestN = 0, sum = 0;
    for (const [t, c] of Object.entries(counts)) {
      if (t === 'null') continue; // nulls don't count against homogeneity
      sum += c;
      if (c > bestN) { bestN = c; best = t; }
    }
    if (sum === 0) return 'null';
    return bestN / sum >= 0.9 ? best : 'mixed';
  };
})();
