// JSON Visualizer — toolbar: view switcher, search, actions.
(function () {
  const JV = (globalThis.JV = globalThis.JV || {});

  /**
   * Build the app: toolbar + three view roots (visual/pretty/raw), wire interactions.
   * @param {object} ctx { value, sourceText, settings }
   * @returns {DocumentFragment-ready root element}
   */
  JV.buildApp = function buildApp(ctx) {
    const { value, sourceText, settings } = ctx;
    const root = JV.el('div', 'jv-root');

    // --- view roots ---
    const visualView = JV.el('div', 'jv-view jv-view-visual');
    visualView.appendChild(JV.renderValue(value, { depth: 0, chunkSize: settings.chunkSize }));

    const prettyView = JV.el('div', 'jv-view jv-view-pretty');
    prettyView.appendChild(JV.renderPretty(sourceText));

    const rawView = JV.el('div', 'jv-view jv-view-raw');
    rawView.appendChild(JV.renderRaw(sourceText));

    // --- toolbar ---
    const bar = JV.el('div', 'jv-toolbar');
    const brand = JV.el('span', 'jv-brand');
    brand.appendChild(JV.el('span', 'jv-brand-logo', '{ }'));
    brand.appendChild(JV.el('span', null, 'JSON Visualizer'));
    bar.appendChild(brand);

    const seg = JV.el('div', 'jv-segmented');
    const buttons = {};
    for (const name of ['visual', 'pretty', 'raw']) {
      const b = JV.el('button', 'jv-seg-btn', name[0].toUpperCase() + name.slice(1));
      b.type = 'button';
      b.dataset.view = name;
      b.addEventListener('click', () => showView(name, true));
      seg.appendChild(b);
      buttons[name] = b;
    }
    bar.appendChild(seg);

    // search
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'jv-search';
    search.placeholder = 'Filter keys & values…';
    search.addEventListener('input', () => applyFilter(visualView, search.value.trim().toLowerCase()));
    bar.appendChild(search);

    // actions
    const actions = JV.el('div', 'jv-actions');
    let btnCopy;
    function actionButton(label, fn) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jv-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      return b;
    }
    btnCopy = actionButton('Copy', () => {
      copyText(JSON.stringify(value, null, 2));
      flash(btnCopy, 'Copied!');
    });
    actions.appendChild(btnCopy);
    actions.appendChild(actionButton('Download', () => downloadJson(sourceText)));
    actions.appendChild(actionButton('Expand nested', () => clickAllCollapsed(visualView)));
    const disableBtn = actionButton('Disable site', () => {
      const origin = location.hostname;
      const list = (settings.disabledOrigins || []).slice();
      if (!list.includes(origin)) list.push(origin);
      JV.setSetting('disabledOrigins', list).then(() => location.reload());
    });
    actions.appendChild(disableBtn);
    bar.appendChild(actions);

    root.appendChild(bar);
    root.appendChild(visualView);
    root.appendChild(prettyView);
    root.appendChild(rawView);

    function showView(name, persist) {
      visualView.hidden = name !== 'visual';
      prettyView.hidden = name !== 'pretty';
      rawView.hidden = name !== 'raw';
      for (const [k, b] of Object.entries(buttons)) b.classList.toggle('active', k === name);
      if (persist) JV.setSetting('defaultView', name);
    }
    showView(settings.defaultView || 'visual', false);
    return root;
  };

  function flash(btn, msg) {
    const old = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = old; }, 1200);
  }

  function copyText(text) {
    try {
      navigator.clipboard.writeText(text);
    } catch (_e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function downloadJson(text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (location.pathname.split('/').pop() || 'data') .replace(/\.\w+$/, '') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function clickAllCollapsed(view) {
    view.querySelectorAll('.jv-collapsed-chip').forEach((chip) => chip.click());
  }

  // Simple filter: hide grid rows / table rows / list items that don't match.
  function applyFilter(view, q) {
    const match = (node) => !q || node.textContent.toLowerCase().includes(q);
    view.querySelectorAll('.jv-row').forEach((row) => { row.hidden = !match(row); });
    view.querySelectorAll('.jv-li').forEach((li) => { li.hidden = !match(li); });
    view.querySelectorAll('.jv-mixed-item').forEach((it) => { it.hidden = !match(it); });
    // dt/dd pairs in grids
    view.querySelectorAll('dl.jv-grid > dt').forEach((dt) => {
      const dd = dt.nextElementSibling;
      const hit = !q || dt.textContent.toLowerCase().includes(q) || (dd && dd.textContent.toLowerCase().includes(q));
      dt.style.display = hit ? '' : 'none';
      if (dd) dd.style.display = hit ? '' : 'none';
    });
  }
})();
