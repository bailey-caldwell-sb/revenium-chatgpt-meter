# Installation Instructions

## Prerequisites

- **Google Chrome** or **Chromium-based browser** (Edge, Brave, etc.)
- **Developer Mode** enabled in Chrome Extensions
- No special permissions or tools required!

---

## Method 1: Load as Unpacked Extension (Recommended for Testing)

### Step 1: Download the Extension

If you have the source code:
```bash
cd /path/to/revenium-chatgpt-meter
```

If downloading from GitHub:
```bash
git clone https://github.com/yourusername/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter
```

### Step 2: Open Chrome Extensions Page

**Option A**: Via URL
1. Open a new tab
2. Navigate to: `chrome://extensions/`

**Option B**: Via Menu
1. Click the three-dot menu (⋮) in Chrome
2. Go to: **More tools** → **Extensions**

### Step 3: Enable Developer Mode

1. Look for the **"Developer mode"** toggle in the top-right corner
2. Click to enable it
3. New buttons will appear: "Load unpacked", "Pack extension", "Update"

### Step 4: Load the Extension

1. Click **"Load unpacked"**
2. Navigate to the `revenium-chatgpt-meter` folder
3. Select the folder (not a specific file inside it)
4. Click **"Select Folder"** or **"Open"**

### Step 5: Verify Installation

You should see:
- ✅ "Revenium ChatGPT Live Meter" in your extensions list
- ✅ Extension icon in your browser toolbar
- ✅ No errors in the extension card

---

## Method 2: Install from .zip (Chrome Web Store Format)

### Step 1: Create Package

```bash
cd revenium-chatgpt-meter
npm run package
# Or manually:
zip -r revenium-chatgpt-meter.zip . -x 'node_modules/*' '*.git/*'
```

### Step 2: Drag & Drop

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Drag `revenium-chatgpt-meter.zip` onto the page
4. Confirm installation

---

## Method 3: Install from Chrome Web Store (Future)

*When published to Chrome Web Store:*

1. Visit: [Chrome Web Store Link]
2. Click **"Add to Chrome"**
3. Confirm permissions
4. Extension auto-installs

---

## Post-Installation Setup

### 1. Verify Extension is Active

1. Check extension icon appears in toolbar
2. If hidden, click puzzle icon (🧩) to pin it

### 2. Test on ChatGPT

1. Navigate to [chat.openai.com](https://chat.openai.com)
2. Look for **Revenium Meter** overlay (top-right by default)
3. If not visible:
   - Refresh the page (Ctrl+R / Cmd+R)
   - Check browser console (F12) for errors

### 3. Configure Settings (Optional)

1. Right-click extension icon
2. Select **"Options"**
3. Review/adjust:
   - Model pricing
   - UI position
   - Privacy settings
4. Click **"Save Settings"**

---

## Troubleshooting Installation

### Extension Won't Load

**Error: "Manifest file is missing or unreadable"**
- Solution: Ensure you selected the root folder containing `manifest.json`

**Error: "Manifest version 3 required"**
- Solution: Update Chrome to latest version (minimum: Chrome 88)

### Extension Loads but Doesn't Work

**Overlay not showing on ChatGPT**
1. Refresh the ChatGPT page
2. Check `chrome://extensions/` → Errors
3. Open DevTools (F12) → Console tab → Look for Revenium logs

**Service Worker errors**
1. Go to `chrome://extensions/`
2. Find Revenium extension
3. Click "Service worker" link
4. Check console for errors

### Permissions Issues

**Extension requires additional permissions**
- All required permissions are in manifest.json
- Click "Review" and accept if prompted

---

## Updating the Extension

### For Unpacked Extension

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Find Revenium extension
4. Click **refresh icon** (🔄)
5. Reload any open ChatGPT tabs

### For Packaged Extension

1. Download new version
2. Go to `chrome://extensions/`
3. Click **"Update"** button (top-left)
4. Or remove old version and reinstall

---

## Uninstalling

### Complete Removal

1. Go to `chrome://extensions/`
2. Find "Revenium ChatGPT Live Meter"
3. Click **"Remove"**
4. Confirm deletion

### Clear Stored Data

Extension data auto-deletes on uninstall, but to manually clear:

1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **Storage** → **Local Storage**
4. Find extension ID
5. Right-click → **Clear**

---

## Next Steps After Installation

### 1. Read Quick Start
See [QUICKSTART.md](QUICKSTART.md) for usage guide

### 2. Test Basic Functionality
- Open ChatGPT
- Send a message
- Watch overlay update
- Click extension icon for details

### 3. Integrate Tiktoken (Optional)
For accurate token counts:
```bash
npm install @dqbd/tiktoken
npm run build:tiktoken
# Reload extension
```

See [src/vendor/tiktoken-info.md](src/vendor/tiktoken-info.md) for details

---

## System Requirements

### Minimum
- **Browser**: Chrome 88+ / Edge 88+ / Brave (Chromium-based)
- **OS**: Windows 10, macOS 10.13, Linux (any)
- **RAM**: 100MB additional
- **Disk**: 2MB for extension files

### Recommended
- **Browser**: Chrome 120+ (latest)
- **RAM**: 200MB for optimal performance
- **Connection**: Active internet for ChatGPT

---

## Security Notes

### Permissions Requested

The extension requires:
- `storage`: Save settings and session data locally
- `scripting`: Inject content script on ChatGPT pages
- `activeTab`: Access current tab for popup dashboard
- `host_permissions`: Access chat.openai.com and chatgpt.com

### Data Privacy

- ✅ All data stored **locally** (chrome.storage.local)
- ✅ No external API calls
- ✅ No telemetry or tracking
- ✅ Optional text redaction

### What the Extension Can Access

**Can access:**
- ChatGPT API requests/responses (on chat.openai.com only)
- Token counts, costs, latency (calculated locally)
- Your settings and preferences

**Cannot access:**
- Other websites or tabs
- Your browsing history
- Passwords or credentials
- Files on your computer

---

## Getting Help

### Resources
- **Full Docs**: [README.md](README.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **File Structure**: [FILE_STRUCTURE.md](FILE_STRUCTURE.md)

### Support Channels
- **Issues**: [GitHub Issues](https://github.com/yourusername/revenium-chatgpt-meter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/revenium-chatgpt-meter/discussions)

### Common Questions

**Q: Why isn't the overlay showing?**
A: Refresh ChatGPT page, check extension is enabled, verify no console errors

**Q: Are token counts accurate?**
A: Currently using approximation. Install tiktoken for accuracy.

**Q: Does this work with GPT-4?**
A: Yes! Supports GPT-4, GPT-3.5, O1, and custom models.

**Q: Can I use this on multiple computers?**
A: Yes, but settings are stored locally per browser.

---

## Advanced Installation Options

### For Developers

**Clone and modify:**
```bash
git clone https://github.com/yourusername/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter
# Make changes
# Load unpacked in Chrome
```

**Build with tiktoken:**
```bash
npm install
npm run build:tiktoken
# Reload extension
```

**Package for distribution:**
```bash
npm run package
# Creates revenium-chatgpt-meter.zip
```

### For Enterprise Deployment

**Policy-based installation** (Chrome Enterprise):
```json
{
  "ExtensionInstallForcelist": [
    "[EXTENSION_ID];https://path-to-update-manifest.xml"
  ]
}
```

See [Chrome Enterprise Documentation](https://support.google.com/chrome/a/answer/9296680)

---

**Installation complete! 🎉**

Next: [QUICKSTART.md](QUICKSTART.md) → Start tracking your ChatGPT usage!
