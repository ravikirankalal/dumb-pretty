// JSON Visualizer — popup logic.
const $ = (id) => document.getElementById(id);

chrome.storage.local.get({
  enabled: true,
  disabledOrigins: [],
  maxPayloadBytes: 5 * 1024 * 1024,
  defaultView: 'visual',
}, (items) => {
  $('enabled').checked = items.enabled;
  $('defaultView').value = items.defaultView;
  $('maxMb').value = Math.round(items.maxPayloadBytes / (1024 * 1024));
  renderSites(items.disabledOrigins);
});

$('enabled').addEventListener('change', (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

$('defaultView').addEventListener('change', (e) => {
  chrome.storage.local.set({ defaultView: e.target.value });
});

$('maxMb').addEventListener('change', (e) => {
  const mb = Math.min(50, Math.max(1, Number(e.target.value) || 5));
  chrome.storage.local.set({ maxPayloadBytes: mb * 1024 * 1024 });
  e.target.value = mb;
});

function renderSites(list) {
  const ul = $('disabledList');
  ul.replaceChildren();
  $('emptyNote').classList.toggle('hidden', list.length > 0);
  for (const origin of list) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = origin;
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      chrome.storage.local.get('disabledOrigins', ({ disabledOrigins }) => {
        const next = (disabledOrigins || []).filter((o) => o !== origin);
        chrome.storage.local.set({ disabledOrigins: next }, () => renderSites(next));
      });
    });
    li.appendChild(span);
    li.appendChild(btn);
    ul.appendChild(li);
  }
}
