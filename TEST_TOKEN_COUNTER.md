# Token Counter Testing Guide

**Purpose:** Verify that the token counter fix works correctly  
**Date:** 2025-10-21  
**Estimated Time:** 10 minutes

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
3. **Expected:** Overlay appears in top-right corner showing:
   ```
   Cost:    $0.000000
   Tokens:  0
   Latest:  -
   Model:   -
   ```

### Step 3: Check Console for Tiktoken

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. **Expected output:**
   ```
   [Revenium] Tiktoken initialized successfully
   [Revenium] Content script initialized
   ```
4. ⚠️ If you see "using fallback tokenizer", tiktoken didn't load (still works, but less accurate)

---

## 🧪 Test Cases

### Test 1: Single Message Token Count

**Purpose:** Verify basic token counting works

1. **Send message:** "Hello, how are you today?"
2. **Wait for response** to complete
3. **Check overlay:**
   - Tokens should be > 0 (expect ~30-50 tokens total)
   - Cost should be > $0 (expect ~$0.0001-$0.0003)
   - Model should show (e.g., "gpt-4" or "gpt-3.5-turbo")
   - Latest should show latency (e.g., "1250ms (TTFB: 450ms)")

**✅ Pass Criteria:**
- Tokens > 0
- Cost > $0
- Model displayed
- Latency displayed

---

### Test 2: Cumulative Token Counting (CRITICAL)

**Purpose:** Verify tokens accumulate across multiple messages

**Turn 1:**
1. **Send message:** "Hello"
2. **Wait for response**
3. **Note the token count** (e.g., 25 tokens)
4. **Note the cost** (e.g., $0.000270)

**Turn 2:**
5. **Send message:** "How are you?"
6. **Wait for response**
7. **Check token count** - should be HIGHER than Turn 1 (e.g., 60 tokens)
8. **Check cost** - should be HIGHER than Turn 1 (e.g., $0.000720)

**Turn 3:**
9. **Send message:** "Tell me a joke"
10. **Wait for response**
11. **Check token count** - should be HIGHER than Turn 2 (e.g., 125 tokens)
12. **Check cost** - should be HIGHER than Turn 2 (e.g., $0.001650)

**✅ Pass Criteria:**
- Token count INCREASES with each message
- Token count NEVER decreases (unless you click Reset)
- Cost INCREASES with each message
- Cost NEVER decreases (unless you click Reset)

**❌ Fail Criteria (OLD BUG):**
- Token count stays the same or decreases
- Token count resets to a low number after each message
- Cost doesn't increase proportionally

---

### Test 3: Token Accuracy Verification

**Purpose:** Verify tiktoken produces accurate token counts

1. **Send message:** "The quick brown fox jumps over the lazy dog"
2. **Note the INPUT token count** from overlay (after response completes)
3. **Open new tab:** https://platform.openai.com/tokenizer
4. **Select encoding:** "cl100k_base" (for GPT-4/GPT-3.5)
5. **Paste message:** "The quick brown fox jumps over the lazy dog"
6. **Compare token counts**

**✅ Pass Criteria:**
- Token counts match exactly (±1 token for special tokens)
- If using GPT-4, encoding should be cl100k_base
- If using O1 models, encoding should be o200k_base

**Example:**
- Message: "The quick brown fox jumps over the lazy dog"
- Expected tokens (cl100k_base): 9 tokens
- Overlay should show: ~9 input tokens (±1)

---

### Test 4: Reset Functionality

**Purpose:** Verify reset button clears session correctly

1. **Send 2-3 messages** to accumulate tokens (e.g., 100+ tokens)
2. **Note the token count** (e.g., 125 tokens)
3. **Click "Reset" button** in overlay
4. **Check overlay:**
   - Tokens should reset to: 0
   - Cost should reset to: $0.000000
   - Latest should reset to: -
   - Model should reset to: -
5. **Send a new message**
6. **Check overlay:**
   - Tokens should start counting from 0 again
   - Cost should start from $0 again

**✅ Pass Criteria:**
- Reset clears all metrics to 0
- New messages start counting from 0
- No leftover data from previous session

---

### Test 5: Conversation Switching

**Purpose:** Verify session resets when switching conversations

1. **Send 2-3 messages** in current conversation (accumulate tokens)
2. **Note the token count** (e.g., 100 tokens)
3. **Click "+ New chat"** to start a new conversation
4. **Check overlay:**
   - Tokens should reset to: 0
   - Cost should reset to: $0.000000
5. **Send a message in new conversation**
6. **Check overlay:**
   - Tokens should start counting from 0
   - Cost should start from $0

**✅ Pass Criteria:**
- Switching conversations automatically resets session
- Each conversation tracks independently
- No token leakage between conversations

---

### Test 6: Real-Time Updates During Streaming

**Purpose:** Verify overlay updates in real-time as response streams

1. **Send message:** "Write me a long story about a dragon"
2. **Watch the overlay** as the response streams
3. **During streaming:**
   - Latest should show: "⟳ Processing..."
   - Tokens should update in real-time (increasing)
   - Cost should update in real-time (increasing)
4. **After streaming completes:**
   - Latest should show: latency (e.g., "2500ms (TTFB: 600ms)")
   - Tokens should show final count
   - Cost should show final amount

**✅ Pass Criteria:**
- Overlay updates in real-time during streaming
- Spinner shows during processing
- Final metrics displayed after completion

---

### Test 7: Multi-Turn Conversation (Extended)

**Purpose:** Verify cumulative tracking over many turns

**Conversation:**
1. "Hello" → Note tokens (e.g., T1 = 25)
2. "How are you?" → Verify tokens > T1 (e.g., T2 = 60)
3. "What's the weather?" → Verify tokens > T2 (e.g., T3 = 95)
4. "Tell me a joke" → Verify tokens > T3 (e.g., T4 = 145)
5. "Explain quantum physics" → Verify tokens > T4 (e.g., T5 = 250)

**✅ Pass Criteria:**
- Each turn increases total token count
- Token count never decreases
- Cost increases proportionally
- Overlay shows cumulative totals, not per-message

**Expected Pattern:**
```
Turn 1: 25 tokens   → $0.000270
Turn 2: 60 tokens   → $0.000720   (↑ 35 tokens, ↑ $0.000450)
Turn 3: 95 tokens   → $0.001170   (↑ 35 tokens, ↑ $0.000450)
Turn 4: 145 tokens  → $0.001890   (↑ 50 tokens, ↑ $0.000720)
Turn 5: 250 tokens  → $0.003150   (↑ 105 tokens, ↑ $0.001260)
```

---

## 🐛 Troubleshooting

### Issue: Tokens Not Accumulating

**Symptoms:**
- Token count stays the same after each message
- Token count resets to a low number
- Token count decreases

**Solution:**
1. Make sure you reloaded the extension after the fix
2. Hard refresh ChatGPT page (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors
4. Verify `src/sw.js` has the fix (line 122 should have `+=` not `=`)

### Issue: Tiktoken Not Initializing

**Symptoms:**
- Console shows: "using fallback tokenizer"
- Token counts are approximate (4:1 ratio)

**Solution:**
1. Verify tiktoken files exist:
   ```bash
   ls -lh src/vendor/tiktoken*
   ```
2. Should see:
   - `tiktoken_bg.wasm` (~5.3MB)
   - `tiktoken.min.js` (~14KB)
3. If missing, rebuild:
   ```bash
   npm run build:tiktoken
   ```
4. Reload extension

### Issue: Overlay Not Showing

**Symptoms:**
- No overlay appears on ChatGPT page

**Solution:**
1. Refresh ChatGPT page (F5)
2. Check extension is enabled in `chrome://extensions/`
3. Check browser console for errors
4. Verify you're on chat.openai.com or chatgpt.com

### Issue: Costs Seem Wrong

**Symptoms:**
- Cost doesn't match expected calculation

**Solution:**
1. Check pricing in Options page (right-click extension → Options)
2. Default GPT-4 pricing:
   - Input: $0.03 per 1K tokens
   - Output: $0.06 per 1K tokens
3. Verify model detection is correct (check overlay "Model" field)
4. Calculate manually: (inputTokens/1000 × $0.03) + (outputTokens/1000 × $0.06)

---

## 📊 Test Results Template

Use this template to record your test results:

```
Date: ___________
Tester: ___________
Chrome Version: ___________
Extension Version: 1.0.0

Test 1: Single Message Token Count
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 2: Cumulative Token Counting
[ ] Pass  [ ] Fail
Turn 1 tokens: _____
Turn 2 tokens: _____ (should be > Turn 1)
Turn 3 tokens: _____ (should be > Turn 2)
Notes: _________________________________

Test 3: Token Accuracy Verification
[ ] Pass  [ ] Fail
Overlay tokens: _____
Tokenizer tokens: _____
Difference: _____ (should be ±1)
Notes: _________________________________

Test 4: Reset Functionality
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 5: Conversation Switching
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 6: Real-Time Updates
[ ] Pass  [ ] Fail
Notes: _________________________________

Test 7: Multi-Turn Conversation
[ ] Pass  [ ] Fail
Turn 1: _____ tokens
Turn 2: _____ tokens
Turn 3: _____ tokens
Turn 4: _____ tokens
Turn 5: _____ tokens
Notes: _________________________________

Overall Result: [ ] All Pass  [ ] Some Fail
```

---

## ✅ Success Criteria

**The fix is successful if:**

✅ Tokens accumulate across multiple messages  
✅ Token count never decreases (unless reset)  
✅ Cost accumulates proportionally to tokens  
✅ Reset button clears session correctly  
✅ Conversation switching resets session  
✅ Real-time updates work during streaming  
✅ Token counts match OpenAI tokenizer (±1)

**If all tests pass, the token counter is working correctly!** 🎉

---

## 📝 Reporting Issues

If you find any issues during testing:

1. **Note the exact steps** to reproduce
2. **Capture screenshots** of the overlay
3. **Copy console errors** (if any)
4. **Record test results** using template above
5. **Report on GitHub:** https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues

Include:
- Chrome version
- Extension version
- Test case that failed
- Expected vs actual behavior
- Console errors
- Screenshots

