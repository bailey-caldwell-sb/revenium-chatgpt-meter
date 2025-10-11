# Quick Start Guide

## Installation (5 minutes)

### Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `revenium-chatgpt-meter` folder
5. Verify the extension appears in your extensions list

### Step 2: Test the Extension

1. Navigate to [chat.openai.com](https://chat.openai.com)
2. Look for the **Revenium Meter** overlay (top-right corner)
3. Start a new conversation
4. Watch metrics update in real-time!

### Step 3: Explore Features

- **Overlay Panel**: Shows live cost, tokens, and latency
- **Popup Dashboard**: Click extension icon for session details
- **Settings**: Right-click extension icon → Options

---

## What You'll See

### On ChatGPT Pages

An overlay panel showing:
- 💰 **Cost**: Total USD for current session
- 🎯 **Tokens**: Combined input + output tokens
- ⚡ **Latest**: Most recent message latency
- 🤖 **Model**: Active model (e.g., gpt-4)

### In Popup (Click Extension Icon)

- Session summary with totals
- Last 10 messages with individual metrics
- Reset session button
- Link to settings

### In Options (Right-click → Options)

- **Pricing table**: Customize model costs
- **UI preferences**: Position, compact mode, TTFB display
- **Privacy**: History storage, text redaction

---

## First-Time Setup

### Configure Pricing (Optional)

1. Right-click extension icon → **Options**
2. Review default pricing:
   - GPT-4: $0.03 input / $0.06 output per 1K tokens
   - GPT-3.5: $0.0015 / $0.002 per 1K tokens
3. Add custom models if needed
4. Click **Save Settings**

### Adjust UI (Optional)

1. In Options → **UI Preferences**
2. Change overlay position (right/left/bottom)
3. Enable/disable TTFB display
4. Toggle compact mode for smaller overlay

---

## How It Works

### Behind the Scenes

1. **Extension loads** → Patches `window.fetch()` on ChatGPT pages
2. **You send message** → Extension captures request payload
3. **ChatGPT responds** → Extension intercepts streaming response
4. **Tokens counted** → Input/output text tokenized in real-time
5. **Costs calculated** → Based on your pricing configuration
6. **UI updates** → Overlay and popup show latest metrics
7. **Session saved** → Data persisted to local storage

### Privacy & Security

- ✅ All data stays **local** (chrome.storage.local)
- ✅ No external API calls or telemetry
- ✅ Optional text redaction (stores only counts)
- ✅ Shadow DOM isolation (no UI conflicts)

---

## Common Tasks

### Reset Current Session

**Option A**: Click "Reset" button in overlay
**Option B**: Open popup → "Reset Session"

### View Historical Data

Currently stored in `chrome.storage.local`:
- Per-tab sessions: `session:<tabId>`
- Daily rollups: `history:YYYY-MM-DD`

Access via Chrome DevTools:
1. Inspect extension popup
2. Console tab
3. Run: `chrome.storage.local.get(null, console.log)`

### Export Metrics

Coming soon! For now:
1. Open popup
2. Right-click on metrics
3. "Inspect" → Copy values from DOM

### Add New Model Pricing

1. Options → **Model Pricing**
2. Click **"+ Add Model"**
3. Enter:
   - Model prefix (e.g., "gpt-4-turbo")
   - Encoding (cl100k_base, p50k_base, o200k_base)
   - Input price per 1K tokens
   - Output price per 1K tokens
4. **Save Settings**

---

## Troubleshooting

### Overlay not showing?
- Refresh ChatGPT page
- Check if overlay is off-screen (change position in Options)
- Look for errors in browser console (F12)

### Token counts seem wrong?
- Extension uses approximate fallback tokenizer (4:1 char-to-token)
- For accuracy, integrate real tiktoken (see [README](README.md#tokenization))
- Compare with [OpenAI's tokenizer](https://platform.openai.com/tokenizer)

### Metrics not updating?
1. Check extension is enabled
2. Verify you're on chat.openai.com or chatgpt.com
3. Try disabling/re-enabling extension
4. Check service worker: `chrome://extensions/` → Details → "Service worker"

### Costs don't match expectations?
- Verify pricing in Options
- Check model prefix matching (case-sensitive)
- Ensure correct encoding for your model

---

## Next Steps

### Improve Accuracy

**Install Real Tiktoken** (recommended):

```bash
# Install package
npm install @dqbd/tiktoken

# Bundle for browser
npx esbuild node_modules/@dqbd/tiktoken/dist/tiktoken.js \
  --bundle --outfile=src/vendor/tiktoken.min.js --format=esm

# Copy WASM
cp node_modules/@dqbd/tiktoken/tiktoken_bg.wasm src/vendor/

# Update meter-core.js (see src/vendor/tiktoken-info.md)
```

### Customize UI

- Change colors in `src/content.js` (search for color hex codes)
- Adjust overlay size in Shadow DOM styles
- Add custom metrics to display

### Advanced Usage

- Monitor multiple tabs simultaneously
- Track spending across days/weeks
- Set cost budgets and alerts (coming soon)
- Export data for analysis

---

## Resources

- **Full Documentation**: [README.md](README.md)
- **Tokenization Guide**: [src/vendor/tiktoken-info.md](src/vendor/tiktoken-info.md)
- **Icons Guide**: [icons/ICONS.md](icons/ICONS.md)
- **OpenAI Tokenizer**: https://platform.openai.com/tokenizer
- **OpenAI Pricing**: https://openai.com/pricing

---

## Support

**Found a bug?** Open an issue on GitHub

**Need help?** Check the README or create a discussion

**Want to contribute?** Pull requests welcome!

---

**Happy tracking! 🚀**
