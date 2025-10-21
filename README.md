# Revenium ChatGPT Live Meter

**Real-time cost, token, and usage tracking for ChatGPT conversations with accurate tiktoken-based tokenization**

A Chrome Extension (Manifest V3) that provides live visibility into your ChatGPT usage metrics including accurate token counts using OpenAI's tiktoken library, estimated costs, context window usage, and response latency.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-orange)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

---

## 📚 Documentation Index

**For AI Assistants:** This repository is optimized for AI code assistants. All installation steps are explicit, sequential, and verifiable.

- **[INSTALL.md](INSTALL.md)** - Complete installation guide with prerequisites, build steps, and troubleshooting (1,238 lines)
- **[QUICK_START.md](QUICK_START.md)** - Minimal steps from clone to running extension (5 minutes)
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing instructions
- **[TOKEN_COUNTER_FIX.md](TOKEN_COUNTER_FIX.md)** - Token accumulation bug fix details
- **[TAG_PERSISTENCE_FIX.md](TAG_PERSISTENCE_FIX.md)** - Tag persistence bug fix details

---

## ⚡ Quick Install (For AI Assistants)

**Repository:** `https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git`
**Branch:** `master`
**Node Version Required:** `>=16.0.0`

```bash
# 1. Clone repository
git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter

# 2. Install dependencies
npm install

# 3. Build tiktoken WASM tokenizer
npm run build:tiktoken

# 4. Verify build output
ls -lh src/vendor/tiktoken*
# Expected: tiktoken.min.js (~14KB) and tiktoken_bg.wasm (~5.3MB)

# 5. Load extension in Chrome
# - Open chrome://extensions/
# - Enable "Developer mode" (top-right toggle)
# - Click "Load unpacked"
# - Select the revenium-chatgpt-meter directory

# 6. Verify installation
# - Open https://chat.openai.com or https://chatgpt.com
# - You should see the Revenium overlay in the top-right corner
# - Send a test message and verify token counts appear
```

**Success Criteria:**
- ✅ `src/vendor/tiktoken.min.js` exists (~14KB)
- ✅ `src/vendor/tiktoken_bg.wasm` exists (~5.3MB)
- ✅ Extension appears in `chrome://extensions/`
- ✅ Overlay appears on ChatGPT page
- ✅ Token counts update when sending messages

---

## 🚀 Features

### Real-Time Metrics
- **Live Token Counting**: Track input and output tokens as messages stream
- **Cost Estimation**: Automatic cost computation based on configurable pricing
- **Context Window Tracking**: Monitor how much of your model's context window is being used
- **Latency Tracking**: Measure Time to First Byte (TTFB) and total response time
- **Session Totals**: Cumulative metrics across entire conversations

### Smart Monitoring
- **Fetch Interception**: Captures ChatGPT API calls using Manifest V3's `world: "MAIN"` injection
- **SSE Streaming Support**: Parses Server-Sent Events format used by ChatGPT
- **Multi-Model Support**: GPT-4, GPT-4o, GPT-3.5, O1, and more
- **Session Management**: Per-tab session isolation with automatic persistence

### User Interface
- **Overlay Panel**: Non-intrusive floating panel on ChatGPT pages showing real-time metrics
- **Popup Dashboard**: Quick access to current session summary
- **Settings Page**: Customize pricing, UI preferences, and privacy controls

### Privacy-First Design
- **Local Storage Only**: All data stays on your device
- **No Telemetry**: Zero external data collection
- **Optional History**: Control what gets stored

---

## 📦 Installation

### Prerequisites

Before installing, ensure you have:

1. **Git** - Version control system
   - Download: https://git-scm.com/downloads
   - Verify: `git --version` (should show version number)

2. **Node.js** - Version 16.0.0 or higher
   - Download: https://nodejs.org/ (LTS version recommended)
   - Verify: `node --version` (should show v16.0.0 or higher)

3. **npm** - Comes with Node.js
   - Verify: `npm --version` (should show version number)

4. **Google Chrome** - Version 88 or higher
   - Download: https://www.google.com/chrome/
   - Verify: Open Chrome → Menu → Help → About Google Chrome

### Installation Steps

**See [INSTALL.md](INSTALL.md) for complete installation guide with troubleshooting.**

#### Quick Installation (5 minutes)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter.git
   cd revenium-chatgpt-meter
   ```
   **Expected output:** `Cloning into 'revenium-chatgpt-meter'...`

2. **Install dependencies:**
   ```bash
   npm install
   ```
   **Expected output:** `added X packages` (takes 10-30 seconds)

3. **Build tiktoken tokenizer:**
   ```bash
   npm run build:tiktoken
   ```
   **Expected output:**
   ```
   > revenium-chatgpt-meter@1.0.0 build:tiktoken
   > npm run copy:tiktoken:wasm && npm run bundle:tiktoken
   ```
   **Verify build:**
   ```bash
   ls -lh src/vendor/
   ```
   **Expected files:**
   - `tiktoken.min.js` (~14KB)
   - `tiktoken_bg.wasm` (~5.3MB)

4. **Load extension in Chrome:**
   - Open Chrome and navigate to: `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"** button
   - Navigate to and select the `revenium-chatgpt-meter` directory
   - Click **"Select"** or **"Open"**

5. **Verify installation:**
   - You should see **"Revenium ChatGPT Live Meter"** in your extensions list
   - Extension should show as **"Enabled"**
   - Extension icon appears in Chrome toolbar (top-right)

6. **Test the extension:**
   - Open https://chat.openai.com or https://chatgpt.com
   - Wait 3-5 seconds for overlay to appear in top-right corner
   - Send a test message: "Hello, how are you?"
   - Verify token count appears and updates in overlay

**Success Criteria:**
- ✅ Overlay appears on ChatGPT page
- ✅ Token count shows accurate numbers (not 4:1 approximation)
- ✅ Cost calculation displays
- ✅ Tag dropdown works and persists after page refresh

---

## 🎯 Usage

### Quick Start

1. **Open ChatGPT:**
   - Navigate to [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)

2. **Start a conversation:**
   - The Revenium Meter overlay will appear automatically in the top-right corner
   - Metrics update in real-time as messages are sent and received

3. **View metrics:**
   - **Overlay**: Shows current session cost, tokens, context usage, and model
   - **Popup**: Click extension icon for session summary
   - **Options**: Right-click extension icon → Options for settings

### Overlay Panel

The overlay displays:
- **Cost**: Total session cost in USD (based on configurable pricing)
- **Tokens**: Total input + output tokens
- **Context Window**: Percentage of model's context window used (color-coded: green < 70%, orange 70-90%, red > 90%)
- **Latest**: Most recent message info
- **Model**: Current model being used
- **Reset Button**: Clear current session metrics

### Popup Dashboard

Access via extension icon:
- **Current Session**: Total cost, tokens, context usage, and model
- **Refresh**: Reload current session data
- **Reset Session**: Clear current conversation metrics
- **Settings**: Access configuration page

---

## ⚙️ Configuration

### Pricing Settings

Configure per-model pricing in Options:

| Model Prefix | Encoding | Input ($/1K) | Output ($/1K) |
|-------------|----------|--------------|---------------|
| gpt-4       | cl100k_base | $0.03    | $0.06         |
| gpt-3.5     | cl100k_base | $0.0015  | $0.002        |
| o1-preview  | o200k_base  | $0.015   | $0.06         |
| o1-mini     | o200k_base  | $0.003   | $0.012        |

**Add custom models:**
1. Go to Options → Model Pricing
2. Click "+ Add Model"
3. Enter model prefix, encoding, and pricing
4. Click "Save Settings"

### UI Preferences

- **Overlay Position**: Right (default), Left, or Bottom
- **Compact Mode**: Minimize overlay size
- **Show TTFB**: Display Time to First Byte in metrics

### Privacy Controls

- **Store History**: Save daily usage rollups (default: on)
- **Redact User Text**: Store only metadata, no message content (default: on)

---

## 🔧 Technical Architecture

### Core Components

#### 1. **Service Worker** (`src/sw.js`)
- Session state management
- Storage persistence
- Message handling between components
- Daily history aggregation

#### 2. **Inject Script** (`src/inject.js`)
- Runs in page context (`world: "MAIN"`)
- Patches `window.fetch()` to intercept ChatGPT API calls
- Parses SSE streaming responses
- Extracts tokens from request/response
- Calculates context window usage

#### 3. **Content Script** (`src/content.js`)
- Creates overlay UI using Shadow DOM
- Listens for metrics from inject script
- Sends data to service worker
- Updates overlay in real-time

#### 4. **UI Components**
- **Overlay**: Shadow DOM panel on ChatGPT pages
- **Popup**: Session dashboard (popup.html/js)
- **Options**: Settings page (options.html/js)

### Data Flow

```
ChatGPT Request
    ↓
inject.js intercepts fetch()
    ↓
Parse request body → Extract input messages → Count tokens
    ↓
Stream SSE response → Parse delta events → Extract assistant text
    ↓
Count output tokens → Calculate costs → Compute context usage
    ↓
Dispatch custom events → content.js receives
    ↓
Send to service worker → Update session state → Persist
    ↓
Update overlay UI
```

### Key Technical Details

- **Manifest V3 Injection**: Uses `world: "MAIN"` to run in page context and bypass CSP
- **SSE Parsing**: Handles `event: delta` format with `v.message.content.parts` structure
- **Token Accumulation**: Input tokens replace (full history), output tokens accumulate
- **Context Windows**: Tracks limits per model (GPT-4: 8K-128K, etc.)

---

## 🔬 Tokenization

### Current Implementation (v1.1.0+)

The extension uses **OpenAI's official tiktoken library** via WASM for production-accurate token counting.

✅ **Accurate tokenization** using `@dqbd/tiktoken`
✅ **Automatic encoding selection** (cl100k_base for GPT-4/3.5, o200k_base for O1 models)
✅ **Graceful fallback** to 4:1 char-to-token ratio if tiktoken fails to load
✅ **Async initialization** (non-blocking)

### Token Counting Logic

```javascript
// Input tokens: Accumulate all user prompts (FIXED in v1.1.0)
session.totalPromptTokens += metrics.promptTokens;

// Output tokens: Accumulate all assistant responses
session.totalCompletionTokens += metrics.completionTokens;

// Reasoning tokens: Accumulate estimated reasoning (O1 models)
session.totalReasoningTokens += metrics.estimatedReasoningTokens;

// Total = Input + Output + Reasoning
totalTokens = totalPromptTokens + totalCompletionTokens + totalReasoningTokens;
```

### Tiktoken Integration

**Build Process:**
```bash
npm run build:tiktoken
```

This command:
1. Copies `tiktoken_bg.wasm` from node_modules to `src/vendor/`
2. Bundles `tiktoken` JavaScript using esbuild to `src/vendor/tiktoken.min.js`

**Files Generated:**
- `src/vendor/tiktoken.min.js` (~14KB) - Tiktoken JavaScript library
- `src/vendor/tiktoken_bg.wasm` (~5.3MB) - WebAssembly tokenization engine

**Encoding Support:**
- `cl100k_base` - GPT-4, GPT-4o, GPT-3.5-turbo
- `o200k_base` - O1-preview, O1-mini, O1-pro

**Verification:**
Compare token counts with OpenAI's official tokenizer: https://platform.openai.com/tokenizer

---

## 📊 Storage Schema

### Session Storage

**Key:** `session:<tabId>`

```json
{
  "conversationId": "uuid",
  "model": "gpt-4",
  "totalPromptTokens": 1500,
  "totalCompletionTokens": 800,
  "totalCostUSD": 0.093,
  "contextLimit": 8192,
  "contextUsagePercent": 28,
  "lastUpdatedAt": 1703001234567,
  "perMessage": [...]
}
```

### Daily History

**Key:** `history:YYYY-MM-DD`

```json
{
  "date": "2024-01-15",
  "modelTotals": {
    "gpt-4": {
      "promptTokens": 5000,
      "completionTokens": 2500,
      "costUSD": 0.30,
      "messageCount": 12
    }
  }
}
```

---

## 🐛 Troubleshooting

**See [INSTALL.md](INSTALL.md) for comprehensive troubleshooting (30+ scenarios).**

### Common Issues

#### 1. Build Fails - "tiktoken not found"

**Problem:** `npm run build:tiktoken` fails with module not found error

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:tiktoken
```

**Verify:**
```bash
ls -lh src/vendor/
# Should show tiktoken.min.js and tiktoken_bg.wasm
```

---

#### 2. Extension Not Loading in Chrome

**Problem:** "Load unpacked" fails or extension doesn't appear

**Solution:**
1. Verify you selected the correct directory (should contain `manifest.json`)
2. Check Chrome version: `chrome://version/` (need 88+)
3. Look for errors in `chrome://extensions/` (click "Errors" button)
4. Try reloading: Click refresh icon (🔄) on extension card

**Verify:**
- Extension shows as "Enabled" in `chrome://extensions/`
- No error messages displayed

---

#### 3. Overlay Not Appearing on ChatGPT

**Problem:** No overlay visible on chat.openai.com or chatgpt.com

**Solution:**
1. **Wait 3-5 seconds** after page loads (overlay has delayed initialization)
2. **Check browser console** (F12 → Console tab):
   - Look for `[Revenium] Tiktoken initialized successfully`
   - Look for `[Revenium] Overlay created`
3. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click refresh icon (🔄) on Revenium extension
4. **Hard refresh ChatGPT:**
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**Verify:**
- Console shows: `[Revenium] Tiktoken initialized successfully`
- Overlay appears in top-right corner after 3-5 seconds

---

#### 4. Token Counts Not Updating

**Problem:** Token count shows 0 or doesn't change when sending messages

**Solution:**
1. **Check tiktoken loaded:**
   - Open browser console (F12)
   - Look for: `[Revenium] Tiktoken initialized successfully`
   - If missing, tiktoken failed to load (see issue #1)

2. **Verify API interception:**
   - Send a test message
   - Check console for: `[Revenium] Metrics:` with token counts
   - If missing, fetch interception may have failed

3. **Reload everything:**
   ```bash
   # Reload extension
   # Go to chrome://extensions/ → Click refresh on Revenium

   # Hard refresh ChatGPT
   # Press Ctrl+Shift+R or Cmd+Shift+R
   ```

**Verify:**
- Send message: "Hello"
- Token count should show ~1-2 tokens
- Count should increase with each message

---

#### 5. Tag Selection Not Persisting

**Problem:** Tag reverts to "No tag" after page refresh

**Solution:**
This was fixed in v1.1.0. If still occurring:

1. **Verify you have latest version:**
   ```bash
   git pull origin master
   npm install
   npm run build:tiktoken
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click refresh icon (🔄)

3. **Test tag persistence:**
   - Select a tag from dropdown
   - Press F5 to refresh page
   - Wait 3-5 seconds
   - Tag should still be selected

**Verify:**
- Tag persists after refresh
- Tag persists after browser restart
- See [TAG_PERSISTENCE_FIX.md](TAG_PERSISTENCE_FIX.md) for details

---

#### 6. Inaccurate Token Counts

**Problem:** Token counts don't match OpenAI's tokenizer

**Solution:**
1. **Verify tiktoken is loaded:**
   - Check console for: `[Revenium] Tiktoken initialized successfully`
   - If using fallback (4:1 ratio), counts will be approximate

2. **Compare with official tokenizer:**
   - Go to: https://platform.openai.com/tokenizer
   - Select encoding: `cl100k_base` (for GPT-4/3.5) or `o200k_base` (for O1)
   - Paste your message text
   - Compare token count

3. **Rebuild tiktoken:**
   ```bash
   npm run clean
   npm run build:tiktoken
   ```

**Verify:**
- Token counts match OpenAI tokenizer (±1 token)
- Console shows tiktoken initialized successfully

---

#### 7. Cost Calculations Wrong

**Problem:** Cost doesn't match expected amount

**Solution:**
1. **Verify pricing in Options:**
   - Right-click extension icon → Options
   - Check "Model Pricing" section
   - Ensure rates match current OpenAI pricing

2. **Check model detection:**
   - Verify correct model is shown in overlay
   - Model prefix must match pricing table (case-sensitive)

3. **Verify token counts are accurate** (see issue #6)

**Current Default Pricing:**
- GPT-4: $0.03/1K input, $0.06/1K output
- GPT-3.5: $0.0015/1K input, $0.002/1K output
- O1-preview: $0.015/1K input, $0.06/1K output
- O1-mini: $0.003/1K input, $0.012/1K output

---

### Getting Help

**If issues persist:**

1. **Check browser console** (F12 → Console tab) for error messages
2. **Check extension console:**
   - Go to `chrome://extensions/`
   - Click "Errors" button on Revenium extension
   - Look for JavaScript errors

3. **Report issue on GitHub:**
   - URL: https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues
   - Include:
     - Chrome version (`chrome://version/`)
     - Node.js version (`node --version`)
     - Console errors (copy full error message)
     - Steps to reproduce

---

## 📝 Development

### Project Structure

```
revenium-chatgpt-meter/
├── manifest.json              # Extension manifest (MV3)
├── src/
│   ├── sw.js                 # Service worker (session management)
│   ├── inject.js             # Page context script (fetch interception)
│   ├── content.js            # Content script (overlay UI)
│   ├── popup.html/js         # Popup dashboard
│   ├── options.html/js       # Settings page
│   └── icons/                # Extension icons
├── README.md
└── LICENSE
```

### Recent Changes

**v1.1.0** - Critical Bug Fixes (2025-10-21)
- ✅ **Fixed token accumulation bug** - Input tokens now accumulate correctly (was replacing instead of adding)
- ✅ **Fixed tag persistence bug** - Tags now persist after page refresh and browser restart
- ✅ **Integrated real tiktoken** - Production-accurate token counting using OpenAI's tiktoken WASM
- ✅ **Added session restoration** - Sessions restore from storage on page load
- ✅ **Improved tag loading** - Multiple retry attempts with delays to handle race conditions
- 📚 **Comprehensive documentation** - Added 1,640+ lines of testing guides and fix documentation

**v1.0.0** - Production-ready release
- Removed OpenAI API integration (CORS restrictions)
- Added context window tracking with visual progress bar
- Fixed SSE delta event parsing for ChatGPT's current format
- Cleaned up all debug logging
- Simplified popup to show session metrics only

---

## 🚧 Known Limitations

1. **API Changes**: ChatGPT's internal API may change without notice
2. **Browser Support**: Chrome/Chromium only (Manifest V3)
3. **SSE Format**: Assumes current `event: delta` format
4. **Model Detection**: Relies on request body containing model info
5. **WASM Size**: tiktoken_bg.wasm is ~5.3MB (may slow initial load)

---

## 🗺️ Roadmap

- [x] ~~Integrate real tiktoken WASM for accurate token counting~~ ✅ **DONE in v1.1.0**
- [x] ~~Fix token accumulation bug~~ ✅ **DONE in v1.1.0**
- [x] ~~Fix tag persistence bug~~ ✅ **DONE in v1.1.0**
- [ ] Export metrics (CSV/JSON)
- [ ] Charts and visualizations for usage trends
- [ ] Firefox support (WebExtensions API)
- [ ] Cost budgets and alerts
- [ ] Multi-conversation aggregation view
- [ ] Enhanced model detection (handle API changes)
- [ ] Optimize WASM loading (lazy load or compress)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially ChatGPT integration)
5. Submit a pull request

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter/discussions)
- **Repository**: https://github.com/bailey-caldwell-sb/revenium-chatgpt-meter

---

## 🙏 Acknowledgments

- Built on Chrome Extension Manifest V3 platform
- Inspired by the need for transparent AI cost tracking
- Uses Shadow DOM for clean UI injection
- SSE parsing adapted for ChatGPT's current API format

---

**Made with ❤️ by Revenium**

Track smarter, spend wiser.
