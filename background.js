/**
 * KeyHop - Background Service Worker (Manifest V3)
 * Handles hotkey execution messages from content scripts and manages browser tabs.
 */

// Initialize default storage on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const { shortcuts } = await chrome.storage.local.get(['shortcuts']);
    if (!shortcuts || shortcuts.length === 0) {
      // Seed with sample shortcut matching the spec/screenshot
      const initialShortcuts = [
        {
          id: 'sc_' + Date.now(),
          name: 'Google',
          url: 'https://google.com',
          keys: 'Alt+Shift+1',
          openInNewTab: true,
          enabled: true
        }
      ];
      await chrome.storage.local.set({ shortcuts: initialShortcuts });
      console.log('KeyHop: Initialized with default shortcut.');
    }
  }
});

/**
 * Normalizes URLs to ensure valid protocol
 */
function normalizeUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Message listener for content script trigger requests
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'EXECUTE_HOTKEY') {
    handleExecuteHotkey(message)
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

/**
 * Executes a shortcut: either navigates active tab or creates new tab
 */
async function handleExecuteHotkey(data) {
  const targetUrl = normalizeUrl(data.url);
  if (!targetUrl) throw new Error('Invalid URL');

  const openInNewTab = Boolean(data.openInNewTab);

  if (!openInNewTab) {
    // Navigate the currently active tab in the current window
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id !== undefined) {
      await chrome.tabs.update(activeTab.id, { url: targetUrl });
      return { action: 'navigated', tabId: activeTab.id };
    }
  }

  // Otherwise create new tab
  const newTab = await chrome.tabs.create({ url: targetUrl });
  return { action: 'created', tabId: newTab.id };
}
