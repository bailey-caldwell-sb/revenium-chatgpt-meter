# Tag Persistence Testing Guide

**Purpose:** Verify that tag selection persists correctly after the fix  
**Date:** 2025-10-21  
**Estimated Time:** 5 minutes

---

## 🚀 Quick Start

### Step 1: Reload the Extension

1. Open Chrome and go to: `chrome://extensions/`
2. Find "Revenium ChatGPT Live Meter"
3. Click the **refresh icon (🔄)** on the extension card
4. **Expected:** Extension reloads with the fix

### Step 2: Open ChatGPT

1. Go to: https://chat.openai.com or https://chatgpt.com
2. Start a **new conversation** (click "+ New chat")
3. **Expected:** Overlay appears showing "No tag" in dropdown

---

## ✅ Critical Test: Tag Persistence After Refresh

**This is the main test to verify the fix works!**

### Steps:

1. **Select a tag:**
   - Click the tag dropdown in the overlay
   - Select "Acme Industries" (orange)
   - **Verify:** Dropdown shows "Acme Industries" with orange dot ✅

2. **Refresh the page:**
   - Press **F5** (or Cmd+R on Mac)
   - Wait 3-5 seconds for the page to reload
   - **Verify:** Tag STILL shows "Acme Industries" ✅

3. **Send a message:**
   - Type: "Hello, test message"
   - Send the message
   - Wait for response
   - **Verify:** Tag STILL shows "Acme Industries" ✅

4. **Refresh again:**
   - Press **F5** again
   - Wait 3-5 seconds
   - **Verify:** Tag STILL shows "Acme Industries" ✅

### ✅ Pass Criteria:

- ✅ Tag persists after first refresh
- ✅ Tag persists after sending message
- ✅ Tag persists after second refresh
- ✅ Tag color (orange) displays correctly
- ✅ Tag name displays correctly

### ❌ Fail Criteria (OLD BUG):

- ❌ Tag reverts to "No tag" after refresh
- ❌ Tag disappears after sending message
- ❌ Tag color changes or disappears

---

## 🧪 Additional Tests

### Test 2: Browser Restart Persistence

**Purpose:** Verify tag persists after closing and reopening browser

1. **Select a tag:**
   - Select "Work" tag (blue)
   - **Verify:** Shows "Work"

2. **Note the conversation URL:**
   - Copy the URL (e.g., `https://chat.openai.com/c/abc123...`)

3. **Close browser completely:**
   - Quit Chrome (Cmd+Q on Mac, Alt+F4 on Windows)

4. **Reopen browser:**
   - Open Chrome
   - Paste the conversation URL
   - Wait 5 seconds for overlay to load
   - **Verify:** Tag shows "Work" ✅

**✅ Pass:** Tag persists after browser restart  
**❌ Fail:** Tag reverts to "No tag"

---

### Test 3: Tag Clearing

**Purpose:** Verify "No tag" selection persists

1. **Select a tag:**
   - Select "Research" tag (purple)

2. **Clear the tag:**
   - Click dropdown
   - Select "No tag"
   - **Verify:** Shows "No tag" with gray dot

3. **Refresh page:**
   - Press F5
   - **Verify:** Still shows "No tag" ✅

**✅ Pass:** "No tag" state persists  
**❌ Fail:** Tag reappears after refresh

---

### Test 4: Conversation Independence

**Purpose:** Verify each conversation has independent tag

1. **Conversation A:**
   - Open conversation A
   - Select "Personal" tag (green)
   - **Verify:** Shows "Personal"

2. **Conversation B:**
   - Click "+ New chat"
   - **Verify:** Shows "No tag" (reset) ✅
   - Select "Work" tag (blue)
   - **Verify:** Shows "Work"

3. **Back to Conversation A:**
   - Navigate back to conversation A URL
   - **Verify:** Shows "Personal" (original tag) ✅

**✅ Pass:** Each conversation has independent tag  
**❌ Fail:** Tags leak between conversations

---

### Test 5: Reset Button

**Purpose:** Verify reset clears tag

1. **Select tag and accumulate data:**
   - Select "Acme Industries"
   - Send 2-3 messages
   - **Verify:** Tokens accumulate, tag shows "Acme Industries"

2. **Click Reset:**
   - Click "Reset" button
   - **Verify:** Tag resets to "No tag" ✅
   - **Verify:** Tokens reset to 0

3. **Refresh page:**
   - Press F5
   - **Verify:** Tag still "No tag" ✅

**✅ Pass:** Reset clears tag and persists  
**❌ Fail:** Tag reappears after refresh

---

## 🐛 Troubleshooting

### Issue: Tag Not Persisting

**If tag still reverts to "No tag" after refresh:**

1. **Verify extension reloaded:**
   - Go to `chrome://extensions/`
   - Check "Revenium ChatGPT Live Meter" is enabled
   - Click refresh icon again
   - Hard refresh ChatGPT (Ctrl+Shift+R)

2. **Check browser console:**
   - Press F12 → Console tab
   - Look for errors:
     - `[Revenium SW] Failed to restore session from storage`
     - `[Revenium] Failed to set tag`
   - If you see errors, report them

3. **Check storage:**
   - In console, run:
     ```javascript
     chrome.storage.local.get(null, (data) => {
       console.log('Storage:', data);
     });
     ```
   - Look for keys like `session:123` with `tagId` field
   - If missing, the session isn't being saved

4. **Clear storage and retry:**
   - In console, run:
     ```javascript
     chrome.storage.local.clear(() => {
       console.log('Cleared');
       location.reload();
     });
     ```
   - Retry the test

---

### Issue: Tag Loads Slowly

**If tag takes 5-10 seconds to appear:**

- **This is expected!** The retry mechanism tries at:
  - 500ms (first attempt)
  - 1500ms (second attempt)
  - 3000ms (third attempt)
- Tag should appear within 3-5 seconds
- If it takes longer than 10 seconds, check console for errors

---

### Issue: Wrong Tag Appears

**If different tag appears:**

1. **Check conversation URL:**
   - Verify you're in the correct conversation
   - Each conversation has unique ID in URL

2. **Clear storage:**
   - Run in console:
     ```javascript
     chrome.storage.local.clear(() => location.reload());
     ```

---

## 📊 Test Results Template

Use this to record your results:

```
Date: ___________
Tester: ___________
Chrome Version: ___________

CRITICAL TEST: Tag Persistence After Refresh
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 2: Browser Restart Persistence
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 3: Tag Clearing
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 4: Conversation Independence
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 5: Reset Button
[ ] Pass  [ ] Fail
Notes: _________________________________

Overall Result: [ ] All Pass  [ ] Some Fail

Issues Found:
_________________________________
_________________________________
```

---

## ✅ Success Criteria

**The fix is successful if:**

✅ Tag persists after page refresh (F5)  
✅ Tag persists after browser restart  
✅ Tag persists after sending messages  
✅ "No tag" selection persists  
✅ Each conversation has independent tag  
✅ Reset button clears tag correctly

**If all tests pass, tag persistence is working correctly!** 🎉

---

## 📝 Reporting Issues

If you find issues:

1. **Record the exact steps** to reproduce
2. **Capture screenshots** of the dropdown
3. **Copy console errors** (F12 → Console)
4. **Note browser and extension version**
5. **Report on GitHub:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues

Include:
- Test case that failed
- Expected vs actual behavior
- Console errors
- Screenshots
- Browser version
- Extension version

---

## 🎯 Quick Verification (30 seconds)

**Fastest way to verify the fix:**

1. Open ChatGPT
2. Select "Acme Industries" tag
3. Press F5 to refresh
4. Wait 3 seconds
5. **Check:** Does it still show "Acme Industries"?
   - ✅ **YES** → Fix works!
   - ❌ **NO** → Fix failed, check troubleshooting

---

**Status:** Ready for testing! 🚀

