# Revenium ChatGPT Live Meter

**Real-time cost, token, and latency tracking for ChatGPT conversations**

A Chrome Extension (Manifest V3) that provides live visibility into your ChatGPT usage metrics including token counts, costs, and response latency.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 🚀 Features

### Real-Time Metrics
- **Live Token Counting**: Track input and output tokens as messages stream
- **Cost Calculation**: Automatic cost computation based on configurable pricing
- **Latency Tracking**: Measure Time to First Byte (TTFB) and total response time
- **Session Totals**: Cumulative metrics per conversation

### Smart Monitoring
- **Fetch Patching**: Intercepts ChatGPT API calls without DevTools
- **Streaming Support**: Works with Server-Sent Events (SSE) responses
- **Multi-Model Support**: GPT-4, GPT-3.5, O1, and custom models
- **Session Management**: Per-tab session isolation with automatic persistence

### User Interface
- **Overlay Panel**: Non-intrusive floating panel on ChatGPT pages
- **Popup Dashboard**: Quick access to session summary and recent messages
- **Settings Page**: Customize pricing, UI preferences, and privacy controls

### Privacy-First Design
- **Local Storage Only**: All data stays on your device
- **No Telemetry**: Zero external data collection
- **Redaction Options**: Optional user text redaction for privacy

---

## 📦 Installation

### From Source (Developer Mode)

1. **Clone or download this repository:**
   ```bash
   git clone https://github.com/yourusername/revenium-chatgpt-meter.git
   cd revenium-chatgpt-meter
   ```

2. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)

3. **Load the extension:**
   - Click "Load unpacked"
   - Select the `revenium-chatgpt-meter` directory

4. **Verify installation:**
   - You should see "Revenium ChatGPT Live Meter" in your extensions list
   - The extension icon will appear in your toolbar

---

## 🎯 Usage

### Quick Start

1. **Open ChatGPT:**
   - Navigate to [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)

2. **Start a conversation:**
   - The Revenium Meter overlay will appear automatically (top-right by default)
   - Metrics update in real-time as messages are sent and received

3. **View metrics:**
   - **Overlay**: Shows current session cost, tokens, and latest latency
   - **Popup**: Click extension icon for detailed session breakdown
   - **Options**: Right-click extension icon → Options for settings

### Overlay Panel

The overlay displays:
- **Cost**: Total session cost in USD (configurable pricing)
- **Tokens**: Total input + output tokens
- **Latest**: Most recent message latency (TTFB shown if enabled)
- **Model**: Current model being used
- **Reset Button**: Clear current session metrics

### Popup Dashboard

Access via extension icon:
- **Session Summary**: Total cost, tokens (input/output)
- **Recent Messages**: Last 10 messages with individual metrics
- **Actions**: Reset session or open settings

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
- Cross-tab message handling
- Daily history aggregation

#### 2. **Content Script** (`src/content.js`)
- Fetch API patching
- SSE stream interception
- Real-time tokenization
- Overlay UI injection

#### 3. **Meter Core** (`src/meter-core.js`)
- Tokenization engine (with fallback)
- Cost calculation logic
- Message parsing utilities
- Pricing table management

#### 4. **UI Components**
- **Overlay**: Shadow DOM panel on ChatGPT pages
- **Popup**: Session dashboard (popup.html)
- **Options**: Settings page (options.html)

### Data Flow

```
ChatGPT Request
    ↓
Patched fetch() intercepts
    ↓
Parse request → Count input tokens
    ↓
Stream response → Count output tokens (throttled)
    ↓
Calculate costs → Update overlay
    ↓
Send to Service Worker → Persist session
    ↓
Update popup dashboard
```

---

## 🔬 Tokenization

### Current Implementation

The extension uses a **simplified fallback tokenizer** (4:1 char-to-token ratio) for demonstration purposes.

**⚠️ This is NOT accurate for production use.**

### Adding Real Tiktoken

For accurate token counts, integrate `@dqbd/tiktoken`:

1. **Install package:**
   ```bash
   npm install @dqbd/tiktoken
   ```

2. **Bundle for browser:**
   ```bash
   npx esbuild node_modules/@dqbd/tiktoken/dist/tiktoken.js \
     --bundle --outfile=src/vendor/tiktoken.min.js --format=esm
   ```

3. **Copy WASM:**
   ```bash
   cp node_modules/@dqbd/tiktoken/tiktoken_bg.wasm src/vendor/
   ```

4. **Update `meter-core.js`** (see `src/vendor/tiktoken-info.md` for details)

### Supported Encodings

- `cl100k_base`: GPT-4, GPT-3.5, Ada
- `p50k_base`: Codex, Davinci
- `o200k_base`: GPT-4o, O1 models

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
  "lastUpdatedAt": 1703001234567,
  "perMessage": [
    {
      "id": "uuid",
      "model": "gpt-4",
      "promptTokens": 150,
      "completionTokens": 80,
      "inputCostUSD": 0.0045,
      "outputCostUSD": 0.0048,
      "totalCostUSD": 0.0093,
      "latencyMs": 2340,
      "ttfbMs": 450,
      "status": "ok"
    }
  ]
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

## 🧪 Testing Checklist

- [ ] Streamed responses: Correct TTFB and total latency
- [ ] Token counts match OpenAI's tokenizer tool
- [ ] Costs align with configured pricing
- [ ] Model switching mid-conversation
- [ ] Error handling (network failures, rate limits)
- [ ] Multiple tabs maintain separate sessions
- [ ] Overlay doesn't interfere with ChatGPT UI
- [ ] Storage caps and pruning work correctly
- [ ] Privacy redaction mode (no text stored)

### Test URLs

- **Tokenizer Comparison**: https://platform.openai.com/tokenizer
- **ChatGPT**: https://chat.openai.com

---

## 🛡️ Security & Privacy

### Local-Only Operation
- All data stored in `chrome.storage.local`
- No external API calls (except ChatGPT itself)
- No telemetry or analytics

### Shadow DOM Isolation
- UI injected via Shadow DOM for style isolation
- No interference with ChatGPT's DOM

### Content Security Policy
- No remote script loading
- WASM loaded from extension resources
- Strict CSP compliance

---

## 🐛 Troubleshooting

### Metrics Not Updating
1. Refresh the ChatGPT page
2. Check browser console for errors
3. Verify extension is enabled
4. Try reloading the extension

### Inaccurate Token Counts
- Currently using fallback tokenizer (4:1 ratio)
- Install real tiktoken for accuracy (see Tokenization section)
- Compare with OpenAI's tokenizer tool

### Overlay Not Visible
1. Check if overlay position is off-screen (try changing in Options)
2. Look for browser console errors
3. Verify content script injection
4. Try toggling compact mode

### Cost Calculations Wrong
1. Verify pricing in Options matches your expected rates
2. Check model prefix matching (case-sensitive)
3. Ensure correct encoding is set

---

## 📝 Development

### Project Structure

```
revenium-chatgpt-meter/
├── manifest.json              # Extension manifest
├── src/
│   ├── sw.js                 # Service worker
│   ├── content.js            # Content script (fetch patching + overlay)
│   ├── meter-core.js         # Core logic (tokenization, pricing)
│   ├── popup.html/js         # Popup dashboard
│   ├── options.html/js       # Settings page
│   └── vendor/
│       └── tiktoken-info.md  # Tokenizer integration guide
├── icons/                     # Extension icons
└── README.md
```

### Building Icons

Generate icons at 16x16, 32x32, 48x48, and 128x128 pixels.

**Using ImageMagick:**
```bash
convert -size 128x128 xc:#00d4ff -fill white -pointsize 80 \
  -gravity center -annotate +0+0 'R' icons/icon128.png
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 32x32 icons/icon32.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

### Debug Mode

Enable debug logging:
```javascript
// Add to meter-core.js
window.REVENIUM_DEBUG = true;
```

---

## 🚧 Known Limitations

1. **Tokenization**: Currently uses approximate fallback (not production-ready)
2. **API Changes**: ChatGPT's internal API may change without notice
3. **Browser Support**: Chrome/Chromium only (MV3)
4. **Streaming Formats**: Assumes SSE format (may break if OpenAI changes)

---

## 🗺️ Roadmap

- [ ] Integrate real tiktoken WASM
- [ ] Export metrics (CSV/JSON)
- [ ] Charts and visualizations
- [ ] Firefox support (WebExtensions API)
- [ ] Cost budgets and alerts
- [ ] Multi-conversation aggregation
- [ ] Dark/light theme support

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/revenium-chatgpt-meter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/revenium-chatgpt-meter/discussions)

---

## 🙏 Acknowledgments

- Built on the Chrome Extension Manifest V3 platform
- Inspired by the need for transparent AI cost tracking
- Tokenization powered by tiktoken (when integrated)

---

**Made with ❤️ by Revenium**

Track smarter, spend wiser.
