# Chrome Web Store Privacy Disclosure — JSON Visualizer

Answers to the CWS Developer Dashboard privacy questions:

1. **Does your extension handle user data?** No.
   - The extension reads only the JSON response body already being displayed in the user's browser tab and renders it locally.
   - No user data is sent to any server, collected, stored remotely, sold, or shared.
   - `chrome.storage.local` is used solely to persist the user's own UI preferences (auto-enable, default view, theme) on the user's device.
2. **Limited Use:** Not applicable — no user data is collected.
3. **Privacy Policy URL:** Required by the dashboard even for zero-collection extensions. Host a simple statement (see PRIVACY_POLICY_URL below) — GitHub Pages of this repo works.

## Certification checkbox selections
- [x] Single purpose: yes — visualizes JSON responses.
- [x] No hidden functionality.
- [ ] "My extension only uses required permissions" — see note about `<all_urls>` below.
