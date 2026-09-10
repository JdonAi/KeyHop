/**
 * KeyHop - Content Script
 * Intercepts keyboard shortcuts on web pages and requests the background service worker to open/focus target URLs.
 */

(function () {
  'use strict';

  // In-memory cache of saved shortcuts
  let cachedShortcuts = [];

  // Fetch shortcuts from storage
  function loadShortcuts() {
    try {
      chrome.storage.local.get(['shortcuts'], (result) => {
        if (chrome.runtime.lastError) return;
        cachedShortcuts = Array.isArray(result.shortcuts) ? result.shortcuts : [];
      });
    } catch (e) {
      // Extension context invalidated or storage unavailable
    }
  }

  loadShortcuts();

  // Keep shortcuts updated whenever storage changes
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.shortcuts) {
        cachedShortcuts = Array.isArray(changes.shortcuts.newValue) ? changes.shortcuts.newValue : [];
      }
    });
  } catch (e) {
    // Ignored
  }

  /**
   * Formats keydown event into canonical combo string (e.g. "Alt+Shift+1")
   */
  function formatKeyCombo(e) {
    const key = e.key;

    // Ignore standalone modifier presses
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      return null;
    }

    const modifiers = [];
    if (e.altKey) modifiers.push('Alt');
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');

    // Canonical key formatting
    let normalizedKey = key;
    if (key.length === 1) {
      normalizedKey = key.toUpperCase();
    } else if (key === ' ') {
      normalizedKey = 'Space';
    } else if (/^f[1-9][0-2]?$/i.test(key)) {
      normalizedKey = key.toUpperCase();
    }

    // Must have at least one key
    if (!normalizedKey) return null;

    // Return combination
    return [...modifiers, normalizedKey].join('+');
  }

  /**
   * Check if event target is an interactive text input
   */
  function isEditableElement(element) {
    if (!element) return false;
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
      const type = (element.type || '').toLowerCase();
      return !['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(type);
    }
    return Boolean(element.isContentEditable);
  }

  // Keydown listener in capturing phase
  window.addEventListener('keydown', (e) => {
    if (!cachedShortcuts || cachedShortcuts.length === 0) return;

    // Build combo string
    const pressedCombo = formatKeyCombo(e);
    if (!pressedCombo) return;

    // If focused on an editable element, ignore hotkeys that do not include Alt, Ctrl, or Meta
    if (isEditableElement(document.activeElement)) {
      const hasMajorModifier = e.altKey || e.ctrlKey || e.metaKey;
      if (!hasMajorModifier) {
        return;
      }
    }

    // Find enabled match (case-insensitive combo compare)
    const pressedLower = pressedCombo.toLowerCase();
    const matched = cachedShortcuts.find(
      (sc) => sc.enabled !== false && sc.keys && sc.keys.toLowerCase() === pressedLower
    );

    if (matched) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      try {
        chrome.runtime.sendMessage({
          type: 'EXECUTE_HOTKEY',
          shortcutId: matched.id,
          url: matched.url,
          openInNewTab: matched.openInNewTab
        });
      } catch (err) {
        console.warn('Website Hotkey: Could not send message to background worker', err);
      }
    }
  }, true);
})();
