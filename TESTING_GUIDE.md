# Testing Guide - MVP Critical Fixes

**Date:** 2025-10-21  
**Version:** 1.1.0  
**Fixes:** Tiktoken Integration + Tag Dropdown

---

## Changes Made

### 1. ✅ Tiktoken Integration (Accurate Token Counting)

**What Changed:**
- Replaced 4:1 character approximation with real tiktoken WASM tokenization
- Installed and configured `@dqbd/tiktoken` package
- Updated `encodeForModel()` function to use tiktoken with proper encoding selection
- Added automatic encoding selection: `cl100k_base` for GPT-4/GPT-3.5, `o200k_base` for O1 models
- Kept 4:1 approximation as fallback if tiktoken fails to initialize
- WASM file properly bundled and accessible via `chrome.runtime.getURL()`

**Files Modified:**
- `package.json` - Updated build script for tiktoken
- `src/inject.js` - Replaced tokenizer with tiktoken
- `src/vendor/tiktoken.min.js` - Generated (14KB)
- `src/vendor/tiktoken_bg.wasm` - Generated (5.3MB)

**How It Works:**
1. Tiktoken initializes asynchronously when inject.js loads
2. WASM module loads from `chrome.runtime.getURL('src/vendor/tiktoken_bg.wasm')`
3. Two encoders are initialized: `cl100k_base` and `o200k_base`
4. Model name determines which encoder to use
5. If tiktoken fails, falls back to 4:1 approximation with console warning

---

### 2. ✅ Tag Dropdown Functionality (Already Implemented!)

**What Was Found:**
- Tag dropdown UI was already fully implemented in `src/content.js`
- Service worker already handles `setTag` messages
- Tag persistence already working

**What Was Fixed:**
- Added tag reset when conversation changes (was missing)
- Added automatic loading of current session's tag on page load
- Tag display now updates correctly when switching conversations

**Files Modified:**
- `src/content.js` - Added tag reset on conversation change, added session tag loading

---

## Testing Instructions

### Prerequisites

1. **Reload Extension:**
   ```
   1. Go to chrome://extensions/
   2. Find "Revenium ChatGPT Live Meter"
   3. Click the refresh icon (🔄)
   ```

2. **Reload ChatGPT:**
   ```
   1. Go to chat.openai.com or chatgpt.com
   2. Press F5 or Cmd+R to reload
   3. Wait 3 seconds for overlay to appear
   ```

3. **Open DevTools (Optional but Recommended):**
   ```
   1. Press F12
   2. Go to Console tab
   3. Look for "[Revenium]" messages
   ```

---

## Test 1: Tiktoken Initialization

**Expected Console Messages:**
```
[Revenium] Already injected, skipping... (if page was reloaded)
[Revenium] Tiktoken initialized successfully
[Revenium] Content script initialized
```

**If Tiktoken Fails:**
```
[Revenium] Failed to initialize tiktoken: [error details]
[Revenium] Tiktoken initialization failed, using fallback tokenizer: [error]
```

**Action:** If you see failure messages, check:
- WASM file exists: `src/vendor/tiktoken_bg.wasm` (5.3MB)
- JS file exists: `src/vendor/tiktoken.min.js` (14KB)
- Extension was reloaded after building tiktoken

---

## Test 2: Accurate Token Counting

### Test 2.1: GPT-4 Model (cl100k_base encoding)

**Steps:**
1. Start a new conversation on ChatGPT
2. Make sure you're using GPT-4 (check model selector)
3. Send a test message: "Hello, how are you today?"
4. Wait for response to complete
5. Check overlay shows token count

**Verify Accuracy:**
1. Copy your exact message text
2. Go to https://platform.openai.com/tokenizer
3. Select "cl100k_base" encoding
4. Paste your message
5. Compare token count with overlay

**Expected Result:**
- Token counts should match exactly (±1 token due to special tokens)
- Old behavior: ~7 tokens (4:1 approximation)
- New behavior: ~6 tokens (accurate)

---

### Test 2.2: O1 Model (o200k_base encoding)

**Steps:**
1. Switch to O1-preview or O1-mini model
2. Send a test message: "Explain quantum computing"
3. Wait for response
4. Check token count in overlay

**Verify Accuracy:**
1. Go to https://platform.openai.com/tokenizer
2. Select "o200k_base" encoding
3. Paste your message
4. Compare token count

**Expected Result:**
- Token counts should match exactly
- O1 models use different encoding than GPT-4

---

### Test 2.3: Fallback Behavior

**Steps:**
1. Open DevTools Console
2. In console, run: `window.__REVENIUM_INJECTED__ = false`
3. Reload page
4. Check if tiktoken initialization fails
5. Send a message
6. Verify fallback tokenizer is used

**Expected Console:**
```
[Revenium] Tiktoken encoding failed, using fallback: [error]
```

**Expected Result:**
- Extension still works with 4:1 approximation
- No crashes or errors

---

## Test 3: Tag Dropdown Functionality

### Test 3.1: Tag Selection

**Steps:**
1. Look at overlay on ChatGPT page
2. Find "Tag this conversation" section
3. Click the tag dropdown (shows "No tag" by default)
4. Dropdown menu should open showing available tags
5. Click on a tag (e.g., "Work")
6. Dropdown should close
7. Selected tag should display with correct color

**Expected Result:**
- Dropdown opens/closes smoothly
- Tag selection updates immediately
- Tag color dot matches tag color
- Tag name displays correctly

---

### Test 3.2: Tag Persistence

**Steps:**
1. Select a tag (e.g., "Personal")
2. Send a message in the conversation
3. Refresh the page (F5)
4. Wait for overlay to load
5. Check if tag is still selected

**Expected Result:**
- Tag persists after page reload
- Same tag shows in dropdown
- Tag appears in popup dashboard

---

### Test 3.3: Tag in Popup Dashboard

**Steps:**
1. Assign a tag to current conversation
2. Click extension icon in toolbar
3. Popup should open
4. Check "Current Session" section

**Expected Result:**
- Tag badge appears next to "Current Session" title
- Tag color and name match selected tag
- Tag shows in session summary

---

### Test 3.4: Tag Reports

**Steps:**
1. Assign tags to multiple conversations
2. Send messages in each conversation
3. Click extension icon
4. Switch to "Reports" tab
5. Check tag breakdown

**Expected Result:**
- Each tag shows total cost
- Each tag shows total tokens
- Each tag shows message count
- Percentage bars display correctly

---

### Test 3.5: Tag Reset on Conversation Change

**Steps:**
1. Assign a tag to current conversation (e.g., "Work")
2. Start a new conversation (click "+ New chat")
3. Check overlay tag dropdown

**Expected Result:**
- Tag resets to "No tag" for new conversation
- Old conversation keeps its tag (verify by going back)

---

### Test 3.6: Tag Reset Button

**Steps:**
1. Assign a tag to conversation
2. Send some messages
3. Click "Reset" button in overlay
4. Check tag dropdown

**Expected Result:**
- Tag resets to "No tag"
- All metrics reset to zero
- Conversation can be re-tagged

---

## Test 4: Multi-Model Token Accuracy

### Test 4.1: GPT-3.5 Turbo

**Model:** GPT-3.5 Turbo  
**Encoding:** cl100k_base  
**Test Message:** "What is the capital of France?"

**Verify:**
- Tokenizer: https://platform.openai.com/tokenizer
- Encoding: cl100k_base
- Expected: ~8 tokens

---

### Test 4.2: GPT-4

**Model:** GPT-4  
**Encoding:** cl100k_base  
**Test Message:** "Explain the theory of relativity in simple terms."

**Verify:**
- Tokenizer: https://platform.openai.com/tokenizer
- Encoding: cl100k_base
- Expected: ~10 tokens

---

### Test 4.3: O1-Preview

**Model:** O1-preview  
**Encoding:** o200k_base  
**Test Message:** "Solve this math problem: 2x + 5 = 15"

**Verify:**
- Tokenizer: https://platform.openai.com/tokenizer
- Encoding: o200k_base
- Expected: ~12 tokens
- Note: Reasoning tokens are estimated (3x multiplier)

---

## Test 5: Edge Cases

### Test 5.1: Empty Message

**Steps:**
1. Try to send empty message (ChatGPT won't allow)
2. Verify no errors in console

**Expected:** No crashes

---

### Test 5.2: Very Long Message

**Steps:**
1. Send a message with 1000+ words
2. Wait for response
3. Check token count

**Expected:**
- Token count should be accurate
- No performance issues
- Overlay updates correctly

---

### Test 5.3: Special Characters

**Test Message:** "Hello! 你好 🌍 #test @user"

**Expected:**
- Tiktoken handles Unicode correctly
- Emojis counted accurately
- No encoding errors

---

### Test 5.4: Code Blocks

**Test Message:**
```python
def hello():
    print("Hello, world!")
```

**Expected:**
- Code tokens counted accurately
- Formatting preserved
- No parsing errors

---

## Test 6: Performance

### Test 6.1: Initialization Time

**Measure:**
1. Open DevTools Performance tab
2. Reload ChatGPT page
3. Check time from page load to "Tiktoken initialized"

**Expected:**
- Tiktoken loads in < 500ms
- No blocking of page rendering
- Async initialization doesn't delay overlay

---

### Test 6.2: Tokenization Speed

**Measure:**
1. Send a long message (500+ words)
2. Check console for timing

**Expected:**
- Tokenization completes in < 50ms
- No noticeable delay
- Streaming updates smooth

---

## Test 7: Settings Integration

### Test 7.1: Tag Management in Settings

**Steps:**
1. Right-click extension icon
2. Click "Options"
3. Scroll to "Tag Management" section
4. Add a new tag: "Testing" with color #FF5733
5. Save settings
6. Go back to ChatGPT
7. Open tag dropdown

**Expected Result:**
- New tag appears in dropdown
- Tag color matches #FF5733
- Tag can be selected and assigned

---

### Test 7.2: Delete Tag

**Steps:**
1. Go to Options page
2. Delete a tag (e.g., "Acme Industries")
3. Save settings
4. Go to ChatGPT
5. Check tag dropdown

**Expected Result:**
- Deleted tag no longer appears
- Conversations with deleted tag show "No tag"
- No errors

---

## Troubleshooting

### Issue: Tiktoken Not Initializing

**Symptoms:**
- Console shows "Failed to initialize tiktoken"
- Token counts seem inaccurate (4:1 ratio)

**Solutions:**
1. Check WASM file exists: `src/vendor/tiktoken_bg.wasm`
2. Rebuild tiktoken: `npm run build:tiktoken`
3. Reload extension
4. Hard refresh ChatGPT (Ctrl+Shift+R)

---

### Issue: Tag Dropdown Not Opening

**Symptoms:**
- Clicking dropdown does nothing
- No menu appears

**Solutions:**
1. Check console for errors
2. Verify tags loaded: Look for `[Revenium] Content script initialized`
3. Reload extension
4. Refresh ChatGPT page

---

### Issue: Tag Not Persisting

**Symptoms:**
- Tag resets after page reload
- Tag doesn't appear in popup

**Solutions:**
1. Check service worker: `chrome://extensions/` → Service worker link
2. Verify storage: DevTools → Application → Storage → Local Storage
3. Check for `session:` keys
4. Verify tag assignment message sent (check Network tab)

---

### Issue: Token Count Mismatch

**Symptoms:**
- Token count doesn't match OpenAI tokenizer
- Off by more than 1-2 tokens

**Solutions:**
1. Verify correct encoding used (cl100k_base vs o200k_base)
2. Check model name in overlay matches actual model
3. Compare exact same text (including whitespace)
4. Check for special tokens (system messages)

---

## Success Criteria

### ✅ Tiktoken Integration
- [ ] Tiktoken initializes successfully (console message)
- [ ] Token counts match OpenAI tokenizer (±1 token)
- [ ] Works with GPT-4 (cl100k_base)
- [ ] Works with O1 models (o200k_base)
- [ ] Fallback works if tiktoken fails
- [ ] No performance degradation

### ✅ Tag Dropdown
- [ ] Dropdown opens/closes correctly
- [ ] Tags populate from settings
- [ ] Tag selection updates immediately
- [ ] Tag persists after page reload
- [ ] Tag appears in popup dashboard
- [ ] Tag appears in reports
- [ ] Tag resets on conversation change
- [ ] Tag resets on manual reset
- [ ] New tags from settings appear immediately

---

## Reporting Issues

If you find any issues:

1. **Check Console:** Look for error messages
2. **Check Service Worker:** `chrome://extensions/` → Service worker
3. **Collect Info:**
   - Browser version
   - Extension version
   - Model used
   - Steps to reproduce
   - Console errors
   - Screenshots

4. **Report:** Create GitHub issue with all info above

---

**Testing Complete!** 🎉

If all tests pass, the MVP critical fixes are working correctly.

