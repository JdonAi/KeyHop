/**
 * Website Hotkey - Popup Logic
 * Manages shortcut list, hotkey recording, validation, tab settings, and bookmarks picker.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const shortcutsListEl = document.getElementById('shortcuts-list');
  const emptyStateEl = document.getElementById('empty-state');
  const formEl = document.getElementById('hotkey-form');
  const editingIdInput = document.getElementById('editing-id');
  const inputName = document.getElementById('input-name');
  const inputUrl = document.getElementById('input-url');
  const inputKeys = document.getElementById('input-keys');
  const btnClearKeys = document.getElementById('btn-clear-keys');
  const checkNewTab = document.getElementById('check-new-tab');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');

  // Error & Helper Elements
  const nameErrorEl = document.getElementById('name-error');
  const urlErrorEl = document.getElementById('url-error');
  const keysErrorEl = document.getElementById('keys-error');
  const keysHelpEl = document.getElementById('keys-help');

  // Bookmarks Modal Elements
  const btnSelectBookmarks = document.getElementById('btn-select-bookmarks');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const btnCloseBookmarks = document.getElementById('btn-close-bookmarks');
  const bookmarkSearchInput = document.getElementById('bookmark-search-input');
  const bookmarksTreeEl = document.getElementById('bookmarks-tree');

  // Toast Element
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  // Local State
  let shortcuts = [];
  let allBookmarks = [];
  let isRecordingKeys = false;

  // Storage adapter supporting both Chrome extension API and standalone preview fallback
  const storage = {
    async getShortcuts() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get(['shortcuts']);
          return Array.isArray(res.shortcuts) ? res.shortcuts : [];
        }
      } catch (e) {
        console.warn('Storage API unavailable, using local fallback', e);
      }
      const raw = localStorage.getItem('shortcuts');
      if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
      }
      return [
        {
          id: 'sc_initial',
          name: 'Google',
          url: 'https://google.com',
          keys: 'Alt+Shift+1',
          openInNewTab: true,
          enabled: true
        }
      ];
    },

    async setShortcuts(list) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ shortcuts: list });
          return;
        }
      } catch (e) {
        console.warn('Storage API unavailable, saving to local fallback', e);
      }
      localStorage.setItem('shortcuts', JSON.stringify(list));
    }
  };

  // ==========================================
  // Initialization & Storage
  // ==========================================

  async function loadShortcuts() {
    shortcuts = await storage.getShortcuts();
    renderShortcuts();
  }

  async function saveShortcutsToStorage() {
    await storage.setShortcuts(shortcuts);
  }

  // ==========================================
  // Render Shortcut List
  // ==========================================

  function renderShortcuts() {
    shortcutsListEl.innerHTML = '';
    const editingId = editingIdInput.value;

    if (shortcuts.length === 0) {
      emptyStateEl.style.display = 'flex';
      return;
    }
    emptyStateEl.style.display = 'none';

    shortcuts.forEach((sc) => {
      const card = document.createElement('div');
      card.className = 'shortcut-card' + 
        (sc.id === editingId ? ' is-editing' : '') +
        (sc.enabled === false ? ' is-disabled' : '');
      card.dataset.id = sc.id;

      // Card Information (Left)
      const infoDiv = document.createElement('div');
      infoDiv.className = 'card-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = sc.name;
      nameEl.title = sc.name;

      const urlEl = document.createElement('div');
      urlEl.className = 'card-url';
      urlEl.textContent = sc.url;
      urlEl.title = sc.url;

      infoDiv.appendChild(nameEl);
      infoDiv.appendChild(urlEl);

      // Card Actions (Right)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'card-actions';

      // Badge (Keys)
      const badgeEl = document.createElement('span');
      badgeEl.className = 'shortcut-badge';
      badgeEl.textContent = sc.keys || 'None';

      // New tab indicator (Arrow icon ↗)
      const indicatorEl = document.createElement('span');
      indicatorEl.className = 'new-tab-indicator' + (sc.openInNewTab ? '' : ' hidden-indicator');
      indicatorEl.title = sc.openInNewTab ? 'Opens in new tab' : 'Reuses existing tab';
      indicatorEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      `;

      // Enable/Disable Toggle Switch
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'toggle-switch';
      toggleLabel.title = sc.enabled !== false ? 'Enabled' : 'Disabled';

      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = sc.enabled !== false;
      toggleInput.addEventListener('change', async (e) => {
        e.stopPropagation();
        sc.enabled = toggleInput.checked;
        await saveShortcutsToStorage();
        card.classList.toggle('is-disabled', !sc.enabled);
        showToast(sc.enabled ? `"${sc.name}" enabled` : `"${sc.name}" disabled`);
      });

      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'toggle-slider';

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSlider);

      // Edit Button (Pencil)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit shortcut';
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', () => {
        populateFormForEdit(sc);
      });

      // Delete Button (Inline confirmation)
      const deleteWrapper = document.createElement('div');
      deleteWrapper.style.display = 'inline-flex';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-icon btn-icon-delete';
      deleteBtn.title = 'Delete shortcut';
      deleteBtn.textContent = '×';

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showInlineDeleteConfirm(deleteWrapper, sc);
      });

      deleteWrapper.appendChild(deleteBtn);

      // Assemble card
      actionsDiv.appendChild(badgeEl);
      actionsDiv.appendChild(indicatorEl);
      actionsDiv.appendChild(toggleLabel);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteWrapper);

      card.appendChild(infoDiv);
      card.appendChild(actionsDiv);
      shortcutsListEl.appendChild(card);
    });
  }

  // Inline Delete Confirmation
  function showInlineDeleteConfirm(container, shortcut) {
    container.innerHTML = '';

    const confirmGroup = document.createElement('div');
    confirmGroup.className = 'inline-delete-confirm';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-delete-confirm';
    confirmBtn.textContent = 'Delete?';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-delete-cancel';
    cancelBtn.textContent = 'Cancel';

    let revertTimeout = setTimeout(() => {
      revertDeleteButton(container, shortcut);
    }, 4000);

    confirmBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      clearTimeout(revertTimeout);
      shortcuts = shortcuts.filter((s) => s.id !== shortcut.id);
      await saveShortcutsToStorage();

      if (editingIdInput.value === shortcut.id) {
        resetForm();
      }

      renderShortcuts();
      showToast(`Deleted "${shortcut.name}"`);
    });

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(revertTimeout);
      revertDeleteButton(container, shortcut);
    });

    confirmGroup.appendChild(confirmBtn);
    confirmGroup.appendChild(cancelBtn);
    container.appendChild(confirmGroup);
  }

  function revertDeleteButton(container, shortcut) {
    container.innerHTML = '';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-icon btn-icon-delete';
    deleteBtn.title = 'Delete shortcut';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showInlineDeleteConfirm(container, shortcut);
    });
    container.appendChild(deleteBtn);
  }

  // ==========================================
  // Form Operations (Add / Edit)
  // ==========================================

  function populateFormForEdit(sc) {
    editingIdInput.value = sc.id;
    inputName.value = sc.name;
    inputUrl.value = sc.url;
    inputKeys.value = sc.keys || '';
    checkNewTab.checked = Boolean(sc.openInNewTab);

    btnSave.textContent = 'Update';
    btnClearKeys.style.display = inputKeys.value ? 'block' : 'none';

    clearErrors();
    renderShortcuts();
    inputName.focus();
  }

  function resetForm() {
    editingIdInput.value = '';
    formEl.reset();
    btnSave.textContent = 'Save';
    checkNewTab.checked = true;
    btnClearKeys.style.display = 'none';
    isRecordingKeys = false;
    inputKeys.classList.remove('recording');

    clearErrors();
    renderShortcuts();
  }

  function clearErrors() {
    nameErrorEl.textContent = '';
    nameErrorEl.classList.remove('visible');
    urlErrorEl.textContent = '';
    urlErrorEl.classList.remove('visible');
    keysErrorEl.textContent = '';
    keysErrorEl.classList.remove('visible');
    inputName.classList.remove('input-invalid');
    inputUrl.classList.remove('input-invalid');
    inputKeys.classList.remove('input-invalid');
  }

  // URL Auto-formatting and normalization
  function formatAndValidateUrl(raw) {
    let url = (raw || '').trim();
    if (!url) return { valid: false, error: 'URL is required' };

    // Auto-prepend https:// if protocol is missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      const parsed = new URL(url);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return { valid: false, error: 'Please enter a valid website address (e.g. google.com)' };
      }
      return { valid: true, url };
    } catch (e) {
      return { valid: false, error: 'Please enter a valid URL' };
    }
  }

  // Save / Update Handler
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const editingId = editingIdInput.value;
    const nameVal = inputName.value.trim();
    const rawUrl = inputUrl.value.trim();
    const keysVal = inputKeys.value.trim();
    const openInNewTabVal = checkNewTab.checked;

    let hasError = false;

    // Validate Name
    if (!nameVal) {
      nameErrorEl.textContent = 'Please enter a shortcut name';
      nameErrorEl.classList.add('visible');
      inputName.classList.add('input-invalid');
      hasError = true;
    }

    // Validate URL
    const urlValidation = formatAndValidateUrl(rawUrl);
    if (!urlValidation.valid) {
      urlErrorEl.textContent = urlValidation.error;
      urlErrorEl.classList.add('visible');
      inputUrl.classList.add('input-invalid');
      hasError = true;
    }

    // Validate Shortcut Keys
    if (!keysVal) {
      keysErrorEl.textContent = 'Please press a shortcut key combination';
      keysErrorEl.classList.add('visible');
      inputKeys.classList.add('input-invalid');
      hasError = true;
    } else {
      // Check duplicate combination
      const duplicate = shortcuts.find(
        (s) => s.id !== editingId && s.keys && s.keys.toLowerCase() === keysVal.toLowerCase()
      );
      if (duplicate) {
        keysErrorEl.textContent = `Combo already used by "${duplicate.name}"`;
        keysErrorEl.classList.add('visible');
        inputKeys.classList.add('input-invalid');
        hasError = true;
      }
    }

    if (hasError) return;

    const formattedUrl = urlValidation.url;

    if (editingId) {
      // Update existing
      const index = shortcuts.findIndex((s) => s.id === editingId);
      if (index !== -1) {
        shortcuts[index] = {
          ...shortcuts[index],
          name: nameVal,
          url: formattedUrl,
          keys: keysVal,
          openInNewTab: openInNewTabVal
        };
        showToast(`Updated "${nameVal}"`);
      }
    } else {
      // Create new
      const newShortcut = {
        id: 'sc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: nameVal,
        url: formattedUrl,
        keys: keysVal,
        openInNewTab: openInNewTabVal,
        enabled: true
      };
      shortcuts.push(newShortcut);
      showToast(`Added "${nameVal}"`);
    }

    await saveShortcutsToStorage();
    resetForm();
  });

  btnCancel.addEventListener('click', () => {
    resetForm();
  });

  // ==========================================
  // Shortcut Key Recording
  // ==========================================

  inputKeys.addEventListener('focus', () => {
    startKeyRecording();
  });

  inputKeys.addEventListener('click', () => {
    startKeyRecording();
  });

  function startKeyRecording() {
    isRecordingKeys = true;
    inputKeys.classList.add('recording');
    keysHelpEl.textContent = 'Press your desired shortcut combination now...';
    keysHelpEl.style.color = 'var(--accent)';
  }

  function stopKeyRecording() {
    isRecordingKeys = false;
    inputKeys.classList.remove('recording');
    keysHelpEl.textContent = 'Click input and press key combination (e.g., Alt+Shift+1)';
    keysHelpEl.style.color = 'var(--text-dim)';
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.shortcut-input-wrapper')) {
      stopKeyRecording();
    }
  });

  inputKeys.addEventListener('keydown', (e) => {
    if (!isRecordingKeys) return;
    e.preventDefault();
    e.stopPropagation();

    const key = e.key;

    // Allow Escape to cancel recording
    if (key === 'Escape') {
      stopKeyRecording();
      return;
    }

    // Allow Backspace/Delete without modifiers to clear
    if ((key === 'Backspace' || key === 'Delete') && !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      inputKeys.value = '';
      btnClearKeys.style.display = 'none';
      keysErrorEl.textContent = '';
      keysErrorEl.classList.remove('visible');
      inputKeys.classList.remove('input-invalid');
      stopKeyRecording();
      return;
    }

    // Ignore standalone modifier presses
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      return;
    }

    // Must include at least one modifier to prevent capturing normal typing
    const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;
    if (!hasModifier) {
      keysErrorEl.textContent = 'Please include a modifier key (Ctrl, Alt, Shift, or Cmd)';
      keysErrorEl.classList.add('visible');
      inputKeys.classList.add('input-invalid');
      return;
    }

    // Format modifier list
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');

    // Normalize primary key
    let normalizedKey = key;
    if (key.length === 1) {
      normalizedKey = key.toUpperCase();
    } else if (key === ' ') {
      normalizedKey = 'Space';
    } else if (/^f[1-9][0-2]?$/i.test(key)) {
      normalizedKey = key.toUpperCase();
    }

    const combo = [...modifiers, normalizedKey].join('+');

    // Check duplicate
    const editingId = editingIdInput.value;
    const duplicate = shortcuts.find(
      (s) => s.id !== editingId && s.keys && s.keys.toLowerCase() === combo.toLowerCase()
    );

    if (duplicate) {
      keysErrorEl.textContent = `Combo already in use by "${duplicate.name}"`;
      keysErrorEl.classList.add('visible');
      inputKeys.classList.add('input-invalid');
    } else {
      keysErrorEl.textContent = '';
      keysErrorEl.classList.remove('visible');
      inputKeys.classList.remove('input-invalid');
    }

    inputKeys.value = combo;
    btnClearKeys.style.display = 'block';
    stopKeyRecording();
  });

  btnClearKeys.addEventListener('click', () => {
    inputKeys.value = '';
    btnClearKeys.style.display = 'none';
    keysErrorEl.textContent = '';
    keysErrorEl.classList.remove('visible');
    inputKeys.classList.remove('input-invalid');
  });

  // ==========================================
  // Select from Bookmarks Modal
  // ==========================================

  btnSelectBookmarks.addEventListener('click', async () => {
    await openBookmarksModal();
  });

  btnCloseBookmarks.addEventListener('click', () => {
    closeBookmarksModal();
  });

  bookmarksModal.addEventListener('click', (e) => {
    if (e.target === bookmarksModal) {
      closeBookmarksModal();
    }
  });

  bookmarkSearchInput.addEventListener('input', () => {
    filterAndRenderBookmarks(bookmarkSearchInput.value);
  });

  async function openBookmarksModal() {
    bookmarkSearchInput.value = '';
    bookmarksModal.style.display = 'flex';
    bookmarkSearchInput.focus();

    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
        const tree = await chrome.bookmarks.getTree();
        allBookmarks = [];
        extractBookmarks(tree, allBookmarks);
      } else {
        // Fallback bookmarks for previewing
        allBookmarks = [
          { id: 'bm1', title: 'Google', url: 'https://google.com' },
          { id: 'bm2', title: 'GitHub', url: 'https://github.com' },
          { id: 'bm3', title: 'YouTube', url: 'https://youtube.com' },
          { id: 'bm4', title: 'Reddit', url: 'https://reddit.com' },
          { id: 'bm5', title: 'Wikipedia', url: 'https://en.wikipedia.org' }
        ];
      }
      filterAndRenderBookmarks('');
    } catch (e) {
      console.error('Failed to load bookmarks', e);
      bookmarksTreeEl.innerHTML = '<div class="bookmarks-empty">Could not load browser bookmarks.</div>';
    }
  }

  function closeBookmarksModal() {
    bookmarksModal.style.display = 'none';
  }

  // Recursively extract bookmark leaves
  function extractBookmarks(nodes, results) {
    if (!nodes || !nodes.length) return;
    for (const node of nodes) {
      if (node.url && !node.url.startsWith('javascript:')) {
        results.push({
          id: node.id,
          title: node.title || node.url,
          url: node.url
        });
      }
      if (node.children) {
        extractBookmarks(node.children, results);
      }
    }
  }

  function filterAndRenderBookmarks(query) {
    bookmarksTreeEl.innerHTML = '';
    const q = (query || '').toLowerCase().trim();

    const filtered = allBookmarks.filter((bm) => {
      if (!q) return true;
      return bm.title.toLowerCase().includes(q) || bm.url.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      bookmarksTreeEl.innerHTML = '<div class="bookmarks-empty">No bookmarks found matching query.</div>';
      return;
    }

    filtered.slice(0, 50).forEach((bm) => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';

      const icon = document.createElement('div');
      icon.className = 'bookmark-favicon';
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;

      const details = document.createElement('div');
      details.className = 'bookmark-details';

      const titleEl = document.createElement('div');
      titleEl.className = 'bookmark-item-title';
      titleEl.textContent = bm.title;

      const urlEl = document.createElement('div');
      urlEl.className = 'bookmark-item-url';
      urlEl.textContent = bm.url;

      details.appendChild(titleEl);
      details.appendChild(urlEl);

      item.appendChild(icon);
      item.appendChild(details);

      item.addEventListener('click', () => {
        inputUrl.value = bm.url;
        if (!inputName.value.trim()) {
          inputName.value = bm.title;
        }
        closeBookmarksModal();
        inputKeys.focus();
      });

      bookmarksTreeEl.appendChild(item);
    });
  }

  // ==========================================
  // Notification Toast Helper
  // ==========================================

  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.style.display = 'flex';

    toastTimer = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 2400);
  }

  // Initial load
  loadShortcuts();
});
