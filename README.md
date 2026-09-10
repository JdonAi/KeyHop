# KeyHop 🐸⌨️

KeyHop is a lightweight browser extension that lets you create keyboard shortcuts for opening websites quickly.

You can assign a custom shortcut to any URL. You can also choose whether the website should open in a **new tab** or replace the **current tab**.

---

## ✨ Features

- Create custom keyboard shortcuts for any website
- Give each shortcut its own name, URL, and key combination
- Choose whether to open the website in a new tab or the current tab
- Select URLs directly from your bookmarks
- Enable or disable shortcuts without deleting them
- Edit or delete existing shortcuts
- Save everything in local browser storage
- No account or login required
- No tracking, ads, or external API calls
- Works offline and keeps your data private

---

## 🌐 Compatible Browsers

KeyHop is a **Manifest V3 extension** made for Chromium-based browsers.

It works with:

- ✅ **Brave** — primary and recommended browser
- ✅ **Google Chrome**
- ✅ **Microsoft Edge**
- ✅ **Opera**
- ✅ **Vivaldi**
- ✅ **Arc**

It does not directly support:

- ❌ **Firefox**
- ❌ **Safari**

Firefox and Safari use different extension systems and APIs, so KeyHop would need code changes to support them.

---

## 📥 How to Download and Install

KeyHop is currently not available on the Chrome Web Store. You need to install it as an **unpacked extension**.

The process is simple and usually takes only a few minutes.

### Step 1 — Download the Repository

1. Open the KeyHop GitHub repository.
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file to an easy-to-find location, such as your Desktop or Documents folder.

If you use Git, you can clone the repository with:

```bash
git clone https://github.com/your-username/keyhop.git
```

### Step 2 — Open the Extensions Page

Open your browser and enter the correct address:

- **Brave:** `brave://extensions`
- **Chrome:** `chrome://extensions`
- **Edge:** `edge://extensions`

### Step 3 — Enable Developer Mode

Find **Developer mode** on the extensions page and turn it on.

### Step 4 — Load KeyHop

1. Click **Load unpacked**.
2. Select the extracted KeyHop folder.
3. Make sure you select the folder that contains `manifest.json`.
4. KeyHop will now appear in your extensions list.

### Step 5 — Pin KeyHop

1. Click the puzzle-piece icon in your browser toolbar.
2. Find **KeyHop**.
3. Click the pin icon to keep KeyHop visible in your toolbar.
4. Click the KeyHop icon to start creating shortcuts.

---

## 🛠️ How to Use KeyHop

1. Click the **KeyHop** icon to open the popup.
2. Enter the website name in the **Name** field.
3. Enter the website URL in the **URL** field.
   - You can also click **Select from Bookmarks** to choose a saved bookmark.
4. Click the **Shortcut** field and press your desired key combination, such as `Alt+Shift+1`.
5. Choose whether **Open in new tab** should be ON or OFF.
6. Click **Save**.

Your shortcut is now ready.

Whenever you are on a normal webpage, press the assigned shortcut and KeyHop will open the saved URL.

> ⚠️ **Note:** Browser internal pages, such as `brave://extensions`, the Chrome Web Store, and new tab pages, do not allow extension shortcuts for security reasons. This is a browser limitation, not a KeyHop issue.

---

## 📁 Folder Structure

```text
keyhop/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
├── fonts/
│   └── README.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔒 Privacy

KeyHop does not send your data anywhere.

Your shortcuts, URLs, and settings are stored only in your browser's local storage.

KeyHop does not use:

- Servers
- API keys
- Tracking
- External API calls
- Advertising

Your data stays on your device.

---

## 🤝 Contributing

If you find a bug or have an idea for a new feature, you can:

- Open an **Issue**
- Suggest a feature
- Submit a **Pull Request**

Contributions and suggestions are welcome.

---

## 📄 License

KeyHop is free to use and modify for **personal and educational purposes**.
