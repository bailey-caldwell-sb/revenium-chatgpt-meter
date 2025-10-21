# Quick Start - Revenium ChatGPT Live Meter

**Get from clone to running extension in 5 minutes**

**Version:** 1.1.0
**Date:** 2025-10-21
**Repository:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
**Branch:** master

---

## ⚡ One-Command Installation (For AI Assistants)

**Prerequisites:** Git, Node.js 16.0.0+, npm, Chrome 88+

```bash
# Clone repository
git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter

# Install dependencies and build tiktoken
npm install && npm run build:tiktoken

# Verify build
ls -lh src/vendor/tiktoken*
# Expected: tiktoken.min.js (~14KB) and tiktoken_bg.wasm (~5.3MB)
```

**Then load in Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `revenium-chatgpt-meter` directory

**Verify:**
- Open https://chat.openai.com
- Overlay appears in top-right corner (wait 3-5 seconds)
- Send test message: "Hello"
- Token count appears and updates

---

## 📋 Step-by-Step Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter
```

**Expected output:**
```
Cloning into 'revenium-chatgpt-meter'...
remote: Enumerating objects: ...
```

**Verify:**
```bash
pwd
# Should show: /path/to/revenium-chatgpt-meter

ls manifest.json
# Should show: manifest.json
```

---

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added X packages, and audited Y packages in Zs
```

**Verify:**
```bash
ls node_modules/@dqbd/tiktoken
# Should show tiktoken package directory
```

---

### Step 3: Build Tiktoken Tokenizer

```bash
npm run build:tiktoken
```

**Expected output:**
```
> revenium-chatgpt-meter@1.0.0 build:tiktoken
> npm run copy:tiktoken:wasm && npm run bundle:tiktoken

> revenium-chatgpt-meter@1.0.0 copy:tiktoken:wasm
> cp node_modules/@dqbd/tiktoken/tiktoken_bg.wasm src/vendor/

> revenium-chatgpt-meter@1.0.0 bundle:tiktoken
> esbuild ./node_modules/@dqbd/tiktoken/lite/init.js --bundle --outfile=src/vendor/tiktoken.min.js --format=esm --external:fs --external:path
```

**Verify build:**
```bash
ls -lh src/vendor/
```

**Expected files:**
```
tiktoken.min.js     ~14KB
tiktoken_bg.wasm    ~5.3MB
```

**If build fails:**
```bash
# Clean and retry
npm run clean
npm install
npm run build:tiktoken
```

---

### Step 4: Load Extension in Chrome

1. **Open Chrome Extensions page:**
   - Type in address bar: `chrome://extensions/`
   - Press Enter

2. **Enable Developer Mode:**
   - Look for toggle in **top-right corner**
   - Click to enable (should turn blue/on)

3. **Load the extension:**
   - Click **"Load unpacked"** button (top-left area)
   - Navigate to the `revenium-chatgpt-meter` directory
   - Click **"Select"** or **"Open"**

4. **Verify extension loaded:**
   - Extension card appears with title: **"Revenium ChatGPT Live Meter"**
   - Status shows: **"Enabled"**
   - Extension icon appears in Chrome toolbar (top-right)

**If extension doesn't load:**
- Verify you selected the directory containing `manifest.json`
- Check for errors in extension card (click "Errors" button)
- Verify Chrome version: `chrome://version/` (need 88+)

---

### Step 5: Test the Extension

1. **Open ChatGPT:**
   ```
   https://chat.openai.com
   OR
   https://chatgpt.com
   ```

2. **Wait for overlay to appear:**
   - Should appear in **top-right corner** after 3-5 seconds
   - Shows: Cost, Tokens, Context %, Model

3. **Send a test message:**
   ```
   Hello, how are you?
   ```

4. **Verify token counting:**
   - Token count should appear (e.g., "6 tokens")
   - Cost should update (e.g., "$0.0002")
   - Count should increase with each message

5. **Verify tiktoken loaded:**
   - Press **F12** to open browser console
   - Look for: `[Revenium] Tiktoken initialized successfully`
   - If missing, tiktoken failed to load (rebuild required)

6. **Test tag persistence:**
   - Click tag dropdown in overlay
   - Select a tag (e.g., "Work")
   - Press **F5** to refresh page
   - Wait 3-5 seconds
   - Tag should still be selected ✅

---

## ✅ Success Criteria

**Installation is successful if:**

✅ `src/vendor/tiktoken.min.js` exists (~14KB)
✅ `src/vendor/tiktoken_bg.wasm` exists (~5.3MB)
✅ Extension appears in `chrome://extensions/` as "Enabled"
✅ Overlay appears on ChatGPT page (top-right corner)
✅ Console shows: `[Revenium] Tiktoken initialized successfully`
✅ Token count updates when sending messages
✅ Token counts are accurate (compare with https://platform.openai.com/tokenizer)
✅ Tags persist after page refresh

---

## 🐛 Troubleshooting

### Issue: Build Fails

**Error:** `npm run build:tiktoken` fails

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:tiktoken

# Verify
ls -lh src/vendor/
```

---

### Issue: Extension Not Loading

**Error:** "Load unpacked" fails or extension doesn't appear

**Solution:**
1. Verify you selected directory containing `manifest.json`
2. Check Chrome version: `chrome://version/` (need 88+)
3. Look for errors in `chrome://extensions/` (click "Errors")
4. Try reloading: Click refresh icon (🔄)

---

### Issue: Overlay Not Appearing

**Error:** No overlay on ChatGPT page

**Solution:**
1. Wait 3-5 seconds after page loads
2. Check console (F12) for `[Revenium] Tiktoken initialized successfully`
3. Reload extension: `chrome://extensions/` → Click refresh (🔄)
4. Hard refresh ChatGPT: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

### Issue: Token Counts Not Updating

**Error:** Token count shows 0 or doesn't change

**Solution:**
1. Check console for: `[Revenium] Tiktoken initialized successfully`
2. If missing, rebuild tiktoken:
   ```bash
   npm run clean
   npm run build:tiktoken
   ```
3. Reload extension and refresh ChatGPT

---

### Issue: Tag Not Persisting

**Error:** Tag reverts to "No tag" after refresh

**Solution:**
1. Verify you have latest version:
   ```bash
   git pull origin master
   npm install
   npm run build:tiktoken
   ```
2. Reload extension: `chrome://extensions/` → Click refresh (🔄)
3. Test: Select tag → Press F5 → Wait 3-5 seconds → Tag should persist

---

## 📚 Complete Documentation

**For detailed information, see:**

- **[README.md](README.md)** - Full project documentation with features and architecture
- **[INSTALL.md](INSTALL.md)** - Complete installation guide with 30+ troubleshooting scenarios (1,238 lines)
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing instructions
- **[TOKEN_COUNTER_FIX.md](TOKEN_COUNTER_FIX.md)** - Token accumulation bug fix details (356 lines)
- **[TAG_PERSISTENCE_FIX.md](TAG_PERSISTENCE_FIX.md)** - Tag persistence bug fix details (595 lines)
- **[TEST_TOKEN_COUNTER.md](TEST_TOKEN_COUNTER.md)** - Token counter testing guide (367 lines)
- **[TEST_TAG_PERSISTENCE.md](TEST_TAG_PERSISTENCE.md)** - Tag persistence testing guide (322 lines)

---

## 🎯 What's New in v1.1.0

### Critical Bug Fixes

✅ **Token Accumulation Fixed**
- Input tokens now accumulate correctly (was replacing instead of adding)
- Cost calculations are now accurate
- See [TOKEN_COUNTER_FIX.md](TOKEN_COUNTER_FIX.md) for details

✅ **Tag Persistence Fixed**
- Tags now persist after page refresh
- Tags persist after browser restart
- Session restoration from storage implemented
- See [TAG_PERSISTENCE_FIX.md](TAG_PERSISTENCE_FIX.md) for details

✅ **Tiktoken Integration**
- Production-accurate token counting using OpenAI's tiktoken WASM
- Automatic encoding selection (cl100k_base vs o200k_base)
- Graceful fallback to 4:1 if tiktoken fails
- Async initialization (non-blocking)

### Files Modified
- `src/sw.js` - Token accumulation fix + session restoration (37 lines)
- `src/content.js` - Tag loading improvements (20 lines)
- `package.json` - Tiktoken build script
- `src/inject.js` - Tiktoken integration (65 lines)

### Files Generated
- `src/vendor/tiktoken.min.js` (~14KB)
- `src/vendor/tiktoken_bg.wasm` (~5.3MB)

### Documentation Added
- 4 comprehensive testing and fix documentation files (1,640+ lines)

---

## 🚦 Status

**Version:** 1.1.0
**Implementation:** ✅ COMPLETE
**Testing:** ✅ READY FOR TESTING
**Production:** ✅ READY FOR USE

---

## 📞 Support

**If you encounter issues:**

1. Check [INSTALL.md](INSTALL.md) troubleshooting section (30+ scenarios)
2. Check browser console (F12) for error messages
3. Report issue: https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues

**Include in bug reports:**
- Chrome version (`chrome://version/`)
- Node.js version (`node --version`)
- Console errors (copy full error message)
- Steps to reproduce

---

**Installation complete!** 🎉

The extension is now ready to track your ChatGPT usage with accurate token counting and persistent tag assignment.
