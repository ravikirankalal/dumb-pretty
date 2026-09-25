// JSON Visualizer — renderer: turns parsed JSON into real UI elements.
// Classic script under namespace JV. DOM built exclusively with createElement +
// textContent (never innerHTML with data) => XSS-safe by construction.
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  /**
   * Render `value` into a container element.
   * @param {*} value parsed JSON
   * @param {{chunkSize?:number, depth?:number}} opts
   * @returns {HTMLElement}
   */
  JV.renderValue = function renderValue(value, opts = {}) {
    const depth = opts.depth || 0;
    const chunkSize = opts.chunkSize || 300;
    const shape = JV.analyzeShape(value, depth);
    switch (shape.kind) {
      case 'primitive': return JV.renderPrimitive(shape.value, depth);
      case 'table':     return JV.renderTable(shape, depth, chunkSize);
      case 'list':      return JV.renderList(shape, depth, chunkSize);
      case 'nestedList':
      case 'mixedArray':return JV.renderMixedArray(shape, depth, chunkSize);
      case 'grid':      return JV.renderGrid(shape, depth, chunkSize);
      case 'emptyArray':
      case 'emptyObject': return JV.el('span', 'jv-empty', shape.kind === 'emptyArray' ? '[ ] empty' : '{ } empty');
      case 'collapsed': return JV.renderCollapsed(shape.value, depth);
      default:          return JV.renderPrimitive(shape.value, depth);
    }
  };

  // ---------- primitives ----------
  JV.renderPrimitive = function renderPrimitive(value, depth) {
    if (value === null) return JV.el('span', 'jv-badge jv-badge-null', 'null');
    if (typeof value === 'boolean') {
      return JV.el('span', 'jv-badge ' + (value ? 'jv-badge-true' : 'jv-badge-false'), String(value));
    }
    if (typeof value === 'number') {
      const span = JV.el('span', 'jv-number', formatNumber(value));
      if (!Number.isSafeInteger(value) && Number.isInteger(value)) {
        span.title = 'Precision may be lost: ' + value.toExponential();
        span.classList.add('jv-number-big');
      }
      return span;
    }
    // string
    if (JV.looksLikeUrl(value)) return JV.makeLink(value);
    if (JV.looksLikeDate(value)) {
      const span = JV.el('span', 'jv-date', value);
      span.title = JV.relativeTime(value) + ' · ' + new Date(value).toString();
      return span;
    }
    if (value.length > 120 && depth >= 1) {
      const details = JV.el('span', 'jv-longstring');
      details.textContent = value.slice(0, 120) + '… ';
      const more = JV.el('button', 'jv-chip jv-expand-chip', 'expand');
      more.type = 'button';
      more.addEventListener('click', () => { details.textContent = value; });
      details.appendChild(more);
      return details;
    }
    return JV.el('span', 'jv-string', value);
  };

  function formatNumber(n) {
    if (Number.isInteger(n) && Math.abs(n) >= 1000) return n.toLocaleString('en-US');
    return String(n);
  }

  // ---------- table (array of objects) ----------
  JV.renderTable = function renderTable(shape, depth, chunkSize) {
    const wrap = JV.el('div', 'jv-card jv-table-card');
    const info = JV.el('div', 'jv-card-title');
    info.appendChild(JV.el('span', 'jv-icon', '▦'));
    info.appendChild(JV.el('span', null, `Table · ${JV.formatCount(shape.rowCount)} rows × ${shape.columns.length} columns`));
    wrap.appendChild(info);

    const table = JV.el('table', 'jv-table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    const idxTh = JV.el('th', 'jv-th jv-th-index', '#');
    htr.appendChild(idxTh);
    for (const col of shape.columns) {
      const th = JV.el('th', 'jv-th jv-type-' + col.dominantType);
      th.appendChild(JV.el('span', 'jv-th-key', col.key));
      th.appendChild(JV.el('span', 'jv-th-meta', colTypeLabel(col)));
      th.dataset.sortKey = col.key;
      th.addEventListener('click', () => sortTable(table, shape, col, th));
      htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    const scroll = JV.el('div', 'jv-table-scroll');
    scroll.appendChild(table);
    wrap.appendChild(scroll);

    shape._chunkSize = chunkSize;
    shape._depth = depth;
    mountChunked(tbody, shape.value, chunkSize, (row, i) => buildRow(row, i, shape.columns, depth), table);
    return wrap;
  };

  function colTypeLabel(col) {
    let label = col.dominantType;
    if (col.missing > 0) label += ` · ${col.missing} missing`;
    return label;
  }

  function buildRow(row, index, columns, depth) {
    const tr = document.createElement('tr');
    tr.className = 'jv-row';
    tr.appendChild(JV.el('td', 'jv-td-index', String(index + 1)));
    for (const col of columns) {
      const td = document.createElement('td');
      td.className = 'jv-td jv-type-' + col.dominantType;
      if (!JV.isPlainObject(row) || !(col.key in row)) {
        td.appendChild(JV.el('span', 'jv-missing', '—'));
      } else {
        td.appendChild(cellValue(row[col.key], depth + 1));
      }
      tr.appendChild(td);
    }
    return tr;
  }

  function cellValue(v, depth) {
    if (JV.isPrimitive(v)) return JV.renderPrimitive(v, depth);
    // complex cell: collapsed chip that expands inline on click
    const holder = JV.el('span', 'jv-cell-complex');
    holder.appendChild(JV.renderCollapsed(v, depth, true));
    return holder;
  }

  function sortTable(table, shape, col, th) {
    const tbody = table.tBodies[0];
    const asc = !th.classList.contains('jv-sorted-asc');
    table.querySelectorAll('.jv-th').forEach((h) => h.classList.remove('jv-sorted-asc', 'jv-sorted-desc'));
    th.classList.add(asc ? 'jv-sorted-asc' : 'jv-sorted-desc');
    const rows = shape.value.slice().sort((a, b) => {
      const av = JV.isPlainObject(a) ? a[col.key] : undefined;
      const bv = JV.isPlainObject(b) ? b[col.key] : undefined;
      return cmp(av, bv) * (asc ? 1 : -1);
    });
    tbody.replaceChildren();
    mountChunked(tbody, rows, shape._chunkSize || 300, (r, i) => buildRow(r, i, shape.columns, shape._depth || 0), table);
  }

  function cmp(a, b) {
    const an = a === undefined || a === null, bn = b === undefined || b === null;
    if (an && bn) return 0;
    if (an) return 1;
    if (bn) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  // ---------- grid (object) ----------
  JV.renderGrid = function renderGrid(shape, depth, chunkSize) {
    const wrap = JV.el('div', 'jv-card jv-grid-card');
    const title = JV.el('div', 'jv-card-title');
    title.appendChild(JV.el('span', 'jv-icon', '{}'));
    title.appendChild(JV.el('span', null, `Object · ${shape.keys.length} keys`));
    wrap.appendChild(title);

    const grid = JV.el('dl', 'jv-grid');
    const keys = shape.keys.slice(0, Math.max(chunkSize, 50));
    for (const key of keys) {
      grid.appendChild(JV.el('dt', 'jv-key', key));
      const dd = document.createElement('dd');
      dd.className = 'jv-value';
      dd.appendChild(JV.renderNested(shape.value[key], depth + 1, chunkSize));
      grid.appendChild(dd);
    }
    wrap.appendChild(grid);
    if (shape.keys.length > keys.length) {
      wrap.appendChild(JV.el('div', 'jv-note', `Showing first ${keys.length} of ${JV.formatCount(shape.keys.length)} keys`));
    }
    return wrap;
  };

  // Nested value inside grid/list cells: containers become cards, inline past-depth collapse.
  JV.renderNested = function renderNested(v, depth, chunkSize) {
    const shape = JV.analyzeShape(v, depth);
    if (shape.kind === 'primitive' || shape.kind === 'emptyArray' || shape.kind === 'emptyObject') {
      return JV.renderValue(v, { depth, chunkSize });
    }
    if (depth >= 4) return JV.renderCollapsed(v, depth, false);
    return JV.renderValue(v, { depth, chunkSize });
  };

  // ---------- list (array of primitives) ----------
  JV.renderList = function renderList(shape, depth, chunkSize) {
    const wrap = JV.el('div', 'jv-card jv-list-card');
    const title = JV.el('div', 'jv-card-title');
    title.appendChild(JV.el('span', 'jv-icon', '☰'));
    title.appendChild(JV.el('span', null, `List of ${shape.itemType}s · ${JV.formatCount(shape.value.length)} items`));
    wrap.appendChild(title);
    const ul = document.createElement('ul');
    ul.className = 'jv-list';
    mountChunked(ul, shape.value, chunkSize, (item, i) => {
      const li = document.createElement('li');
      li.className = 'jv-li';
      li.appendChild(JV.renderPrimitive(item, depth + 1));
      return li;
    });
    wrap.appendChild(ul);
    return wrap;
  };

  // ---------- mixed / nested arrays ----------
  JV.renderMixedArray = function renderMixedArray(shape, depth, chunkSize) {
    const wrap = JV.el('div', 'jv-card jv-mixed-card');
    const title = JV.el('div', 'jv-card-title');
    title.appendChild(JV.el('span', 'jv-icon', '[]'));
    title.appendChild(JV.el('span', null, `Array · ${JV.formatCount(shape.value.length)} items (mixed)`));
    wrap.appendChild(title);
    const container = JV.el('div', 'jv-mixed-items');
    mountChunked(container, shape.value, chunkSize, (item, i) => {
      const row = JV.el('div', 'jv-mixed-item');
      row.appendChild(JV.el('span', 'jv-index', String(i)));
      row.appendChild(JV.renderNested(item, depth + 1, chunkSize));
      return row;
    });
    wrap.appendChild(container);
    return wrap;
  };

  // ---------- collapsed chip (depth cap / big nested) ----------
  JV.renderCollapsed = function renderCollapsed(v, depth, inline) {
    const isArr = Array.isArray(v);
    const count = isArr ? v.length : Object.keys(v).length;
    const btn = JV.el('button', 'jv-chip jv-collapsed-chip',
      (isArr ? '[…]' : '{…}') + ' ' + count + (isArr ? ' items' : ' keys'));
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const replacement = JV.renderNested(v, depth + 1, JV._settings ? JV._settings.chunkSize : 300);
      btn.replaceWith(replacement);
    });
    return btn;
  };

  // ---------- chunked mounting for perf ----------
  function mountChunked(container, items, chunkSize, buildNode, tableEl) {
    let mounted = 0;
    let loadMoreBtn = null;

    function mountNext() {
      if (loadMoreBtn) loadMoreBtn.remove();
      const frag = document.createDocumentFragment();
      const end = Math.min(mounted + chunkSize, items.length);
      for (; mounted < end; mounted++) frag.appendChild(buildNode(items[mounted], mounted));
      container.appendChild(frag);
      if (mounted < items.length) {
        loadMoreBtn = JV.el('button', 'jv-chip jv-loadmore',
          `Load ${Math.min(chunkSize, items.length - mounted)} more (${JV.formatCount(items.length - mounted)} remaining)`);
        loadMoreBtn.type = 'button';
        loadMoreBtn.addEventListener('click', mountNext);
        if (tableEl) {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.colSpan = 99;
          td.className = 'jv-loadmore-cell';
          td.appendChild(loadMoreBtn);
          tr.appendChild(td);
          container.appendChild(tr);
        } else {
          container.appendChild(loadMoreBtn);
        }
      }
    }
    mountNext();
  }

  // ---------- Pretty view (text tree fallback) ----------
  JV.renderPretty = function renderPretty(sourceText) {
    const pre = JV.el('pre', 'jv-pretty');
    let obj;
    try { obj = JSON.parse(sourceText); } catch (_e) { obj = null; }
    pre.textContent = obj !== null ? JSON.stringify(obj, null, 2) : sourceText;
    return pre;
  };
})();
