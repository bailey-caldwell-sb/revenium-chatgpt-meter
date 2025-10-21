# AI Assistant Installation Guide

**This guide is optimized for AI code assistants (GitHub Copilot, Cursor, Augment, etc.)**

**Purpose:** Enable AI assistants to install and run the Revenium ChatGPT Live Meter Chrome extension by reading this documentation and generating complete, accurate installation commands without human intervention.

**Repository:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git  
**Branch:** master  
**Version:** 1.1.0

---

## Prerequisites Verification

**Before installation, verify these prerequisites are met:**

### 1. Git

**Check if installed:**
```bash
git --version
```

**Expected output:** `git version X.Y.Z` (any version)

**If not installed:**
- macOS: `brew install git` or download from https://git-scm.com/downloads
- Windows: Download from https://git-scm.com/downloads
- Linux: `sudo apt-get install git` or `sudo yum install git`

---

### 2. Node.js (Version 16.0.0 or higher)

**Check if installed:**
```bash
node --version
```

**Expected output:** `v16.0.0` or higher (e.g., `v18.17.0`, `v20.10.0`)

**If not installed or version too low:**
- Download LTS version from: https://nodejs.org/
- macOS: `brew install node`
- Windows: Download installer from nodejs.org
- Linux: Use nvm or package manager

**Verify npm is also installed:**
```bash
npm --version
```

**Expected output:** Version number (e.g., `9.8.1`)

---

### 3. Google Chrome (Version 88 or higher)

**Check if installed:**
- Open Chrome
- Type in address bar: `chrome://version/`
- Look for version number in first line

**Expected:** Version 88 or higher (e.g., `120.0.6099.109`)

**If not installed:**
- Download from: https://www.google.com/chrome/

---

## Complete Installation Script

**This script can be executed sequentially to install the extension:**

```bash
# Step 1: Clone repository
git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git

# Step 2: Navigate to directory
cd revenium-chatgpt-meter

# Step 3: Verify manifest.json exists
ls manifest.json
# Expected output: manifest.json

# Step 4: Install dependencies
npm install
# Expected: "added X packages" message

# Step 5: Build tiktoken tokenizer
npm run build:tiktoken
# Expected: Two commands run (copy:tiktoken:wasm and bundle:tiktoken)

# Step 6: Verify build output
ls -lh src/vendor/tiktoken*
# Expected files:
# - tiktoken.min.js (~14KB)
# - tiktoken_bg.wasm (~5.3MB)

# Step 7: Print success message
echo "✅ Build complete! Now load extension in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode' (top-right toggle)"
echo "3. Click 'Load unpacked'"
echo "4. Select directory: $(pwd)"
```

---

## Manual Chrome Extension Loading

**After running the installation script, load the extension in Chrome:**

### Step 1: Open Chrome Extensions Page

**Method 1 - Address Bar:**
```
chrome://extensions/
```

**Method 2 - Menu:**
- Click three-dot menu (⋮) in top-right
- Hover over "Extensions"
- Click "Manage Extensions"

---

### Step 2: Enable Developer Mode

**Location:** Top-right corner of extensions page

**Action:** Click toggle switch to enable

**Visual indicator:** Toggle should turn blue/on

---

### Step 3: Load Unpacked Extension

**Action:** Click "Load unpacked" button (appears after enabling Developer mode)

**Location:** Top-left area of extensions page

**File picker:** Navigate to the `revenium-chatgpt-meter` directory

**Important:** Select the directory that contains `manifest.json` (the repository root)

**Click:** "Select" or "Open" button

---

### Step 4: Verify Extension Loaded

**Check for:**
- Extension card appears with title: "Revenium ChatGPT Live Meter"
- Status shows: "Enabled"
- Extension icon appears in Chrome toolbar (top-right, may need to click puzzle icon)

**If errors appear:**
- Click "Errors" button on extension card
- Read error message
- Common issues:
  - Wrong directory selected (must contain manifest.json)
  - Chrome version too old (need 88+)
  - Build files missing (run `npm run build:tiktoken`)

---

## Verification Steps

**After loading extension, verify it works:**

### Test 1: Extension Appears in Chrome

```bash
# Extension should be visible in chrome://extensions/
# Status: Enabled
# No error messages
```

---

### Test 2: Overlay Appears on ChatGPT

**Steps:**
1. Open https://chat.openai.com or https://chatgpt.com
2. Wait 3-5 seconds
3. Look for overlay in top-right corner

**Expected overlay content:**
- Cost: $0.00
- Tokens: 0
- Context: 0%
- Model: (model name)
- Tag dropdown
- Reset button

**If overlay doesn't appear:**
- Wait up to 10 seconds (initialization delay)
- Check browser console (F12 → Console tab)
- Look for: `[Revenium] Tiktoken initialized successfully`
- If missing, tiktoken failed to load (rebuild required)

---

### Test 3: Tiktoken Initialized

**Steps:**
1. Open ChatGPT page
2. Press F12 to open browser console
3. Look for console message

**Expected console output:**
```
[Revenium] Tiktoken initialized successfully
```

**If not present:**
- Tiktoken failed to load
- Check `src/vendor/` directory for tiktoken files
- Rebuild: `npm run clean && npm run build:tiktoken`

---

### Test 4: Token Counting Works

**Steps:**
1. Send test message: "Hello, how are you?"
2. Wait for response
3. Check overlay token count

**Expected:**
- Token count increases (e.g., 6-10 tokens for short message)
- Cost updates (e.g., $0.0002)
- Count accumulates with each message

**Verify accuracy:**
- Go to: https://platform.openai.com/tokenizer
- Select encoding: `cl100k_base`
- Paste message text
- Compare token count (should match ±1 token)

---

### Test 5: Tag Persistence

**Steps:**
1. Click tag dropdown in overlay
2. Select a tag (e.g., "Work")
3. Verify tag displays in dropdown
4. Press F5 to refresh page
5. Wait 3-5 seconds
6. Check tag dropdown

**Expected:**
- Tag still shows "Work" (or selected tag)
- Tag persists after refresh

**If tag resets to "No tag":**
- Verify you have v1.1.0 (check `git log -1`)
- Reload extension: `chrome://extensions/` → Click refresh (🔄)
- Try again

---

## Troubleshooting

### Issue: npm install fails

**Error:** `npm ERR!` messages

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

### Issue: npm run build:tiktoken fails

**Error:** `Cannot find module '@dqbd/tiktoken'`

**Solution:**
```bash
# Verify tiktoken is installed
ls node_modules/@dqbd/tiktoken

# If missing, reinstall
npm install

# Retry build
npm run build:tiktoken
```

---

### Issue: Extension won't load in Chrome

**Error:** "Manifest file is missing or unreadable"

**Solution:**
- Verify you selected the correct directory
- Directory must contain `manifest.json`
- Check path: `ls manifest.json` should succeed

**Error:** "This extension requires Chrome version 88 or higher"

**Solution:**
- Update Chrome: `chrome://settings/help`
- Or download latest from https://www.google.com/chrome/

---

### Issue: Overlay not appearing

**Error:** No overlay on ChatGPT page

**Solution:**
```bash
# 1. Check console for errors
# Press F12 → Console tab
# Look for [Revenium] messages

# 2. Reload extension
# Go to chrome://extensions/
# Click refresh icon (🔄) on Revenium extension

# 3. Hard refresh ChatGPT
# Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 4. Verify tiktoken built correctly
ls -lh src/vendor/tiktoken*
# Should show two files (~14KB and ~5.3MB)
```

---

### Issue: Token counts are 0 or not updating

**Error:** Token count shows 0 or doesn't change

**Solution:**
1. Check console for: `[Revenium] Tiktoken initialized successfully`
2. If missing, rebuild tiktoken:
   ```bash
   npm run clean
   npm run build:tiktoken
   ```
3. Reload extension: `chrome://extensions/` → Click refresh (🔄)
4. Refresh ChatGPT: Press F5

---

## Success Criteria Checklist

**Installation is successful when ALL of these are true:**

- [ ] `git clone` completed without errors
- [ ] `npm install` completed without errors
- [ ] `npm run build:tiktoken` completed without errors
- [ ] `src/vendor/tiktoken.min.js` exists (~14KB)
- [ ] `src/vendor/tiktoken_bg.wasm` exists (~5.3MB)
- [ ] Extension loaded in `chrome://extensions/`
- [ ] Extension status shows "Enabled"
- [ ] No error messages in extension card
- [ ] Overlay appears on ChatGPT page (top-right corner)
- [ ] Console shows: `[Revenium] Tiktoken initialized successfully`
- [ ] Token count updates when sending messages
- [ ] Token counts match OpenAI tokenizer (±1 token)
- [ ] Tags persist after page refresh

---

## AI Assistant Instructions

**When a user asks to install this extension, follow these steps:**

1. **Verify prerequisites:**
   - Check Git: `git --version`
   - Check Node.js: `node --version` (must be ≥16.0.0)
   - Check npm: `npm --version`
   - Inform user if any are missing

2. **Execute installation script:**
   ```bash
   git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
   cd revenium-chatgpt-meter
   npm install
   npm run build:tiktoken
   ls -lh src/vendor/tiktoken*
   ```

3. **Verify build output:**
   - Check for `tiktoken.min.js` (~14KB)
   - Check for `tiktoken_bg.wasm` (~5.3MB)
   - If missing, troubleshoot build

4. **Provide Chrome loading instructions:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `revenium-chatgpt-meter` directory

5. **Verify installation:**
   - Extension appears in Chrome
   - Open ChatGPT
   - Overlay appears
   - Token counting works

6. **If issues occur:**
   - Refer to Troubleshooting section
   - Check console for errors
   - Verify all success criteria

---

## Additional Resources

**For more detailed information:**

- **[README.md](README.md)** - Full project documentation
- **[INSTALL.md](INSTALL.md)** - Complete installation guide (1,238 lines)
- **[QUICK_START.md](QUICK_START.md)** - 5-minute quick start
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing
- **[TOKEN_COUNTER_FIX.md](TOKEN_COUNTER_FIX.md)** - Token bug fix details
- **[TAG_PERSISTENCE_FIX.md](TAG_PERSISTENCE_FIX.md)** - Tag bug fix details

**Repository:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter  
**Issues:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues

---

**This guide is designed to be parsed and executed by AI assistants without human intervention.**

