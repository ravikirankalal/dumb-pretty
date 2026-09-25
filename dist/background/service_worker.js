// JSON Visualizer — MV3 service worker: per-tab badge state.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'jv-state' || sender.tab == null) return;
  const tabId = sender.tab.id;
  if (msg.active) {
    chrome.action.setBadgeText({ tabId, text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});

chrome.action.onClicked.addListener(() => {
  // Popup is defined in manifest; this is a no-op fallback for robustness.
});
