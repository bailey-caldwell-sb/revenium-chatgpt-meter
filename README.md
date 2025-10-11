# Revenium ChatGPT Meter

**Real-time cost, token, and usage tracking for ChatGPT conversations**

A Chrome Extension (Manifest V3) that provides live visibility into your ChatGPT usage metrics including token counts, estimated costs, context window usage, and response latency.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-orange)

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
   - You should see "Revenium ChatGPT Meter" in your extensions list
   - The extension icon will appear in your toolbar

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

### Current Implementation

The extension uses a **simplified fallback tokenizer** (4:1 char-to-token ratio) for demonstration purposes.

**⚠️ This is NOT accurate for production use.**

### Token Counting Logic

```javascript
// Input tokens: Full conversation history (replaces each time)
session.totalPromptTokens = metrics.promptTokens;

// Output tokens: Accumulate all assistant responses
session.totalCompletionTokens += metrics.completionTokens;

// Total = Input + Output
totalTokens = totalPromptTokens + totalCompletionTokens;
```

### Future Enhancement: Real Tiktoken

For accurate token counts, integrate `@dqbd/tiktoken`:

1. Install package: `npm install @dqbd/tiktoken`
2. Bundle for browser with esbuild
3. Update inject.js to use real tokenizer

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

### Metrics Not Updating

1. **Reload the extension**: Go to `chrome://extensions/` and click refresh
2. **Reload ChatGPT page**: Press F5 or Cmd+R
3. **Check console**: Look for `[Revenium]` messages
4. **Verify injection**: Should see overlay appear after 3 seconds

### Inaccurate Token Counts

- Currently using approximate 4:1 character-to-token ratio
- For more accuracy, compare with OpenAI's tokenizer tool
- Real tiktoken integration recommended for production

### Overlay Not Visible

1. Check if overlay position is off-screen (try changing in Options)
2. Look for browser console errors
3. Try refreshing the ChatGPT page
4. Verify extension is enabled

### Cost Calculations Wrong

1. Verify pricing in Options matches expected rates
2. Check model prefix matching (case-sensitive)
3. Ensure correct encoding is set
4. Note: Costs are estimates based on token approximation

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

**v1.0.0** - Production-ready release
- Removed OpenAI API integration (CORS restrictions)
- Added context window tracking with visual progress bar
- Fixed SSE delta event parsing for ChatGPT's current format
- Cleaned up all debug logging
- Simplified popup to show session metrics only
- Fixed token accumulation logic (input replaces, output accumulates)

---

## 🚧 Known Limitations

1. **Tokenization**: Uses approximate 4:1 ratio (not production-accurate)
2. **API Changes**: ChatGPT's internal API may change without notice
3. **Browser Support**: Chrome/Chromium only (Manifest V3)
4. **SSE Format**: Assumes current `event: delta` format
5. **Model Detection**: Relies on request body containing model info

---

## 🗺️ Roadmap

- [ ] Integrate real tiktoken WASM for accurate token counting
- [ ] Export metrics (CSV/JSON)
- [ ] Charts and visualizations for usage trends
- [ ] Firefox support (WebExtensions API)
- [ ] Cost budgets and alerts
- [ ] Multi-conversation aggregation view
- [ ] Enhanced model detection (handle API changes)

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

- **Issues**: [GitHub Issues](https://github.com/yourusername/revenium-chatgpt-meter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/revenium-chatgpt-meter/discussions)

---

## 🙏 Acknowledgments

- Built on Chrome Extension Manifest V3 platform
- Inspired by the need for transparent AI cost tracking
- Uses Shadow DOM for clean UI injection
- SSE parsing adapted for ChatGPT's current API format

---

**Made with ❤️ by Revenium**

Track smarter, spend wiser.
