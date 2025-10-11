# Revenium ChatGPT Live Meter - Project Summary

## 🎯 Project Overview

**Revenium ChatGPT Live Meter** is a Chrome Extension (Manifest V3) that provides real-time visibility into ChatGPT usage metrics including token counts, costs, and response latency.

**Status**: ✅ Complete MVP Ready for Testing

---

## 📁 Project Structure

```
revenium-chatgpt-meter/
├── manifest.json                 # Extension manifest (MV3)
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Installation & usage guide
├── PROJECT_SUMMARY.md           # This file
├── .gitignore                   # Git ignore rules
│
├── src/
│   ├── sw.js                    # Service worker (session management)
│   ├── content.js               # Content script (fetch patching + UI)
│   ├── meter-core.js            # Core logic (tokenization, pricing)
│   │
│   ├── popup.html               # Popup dashboard UI
│   ├── popup.js                 # Popup logic
│   │
│   ├── options.html             # Settings page UI
│   ├── options.js               # Settings logic
│   │
│   └── vendor/
│       └── tiktoken-info.md     # Tokenizer integration guide
│
└── icons/
    ├── ICONS.md                 # Icon generation guide
    ├── icon16.png               # 16x16 toolbar icon
    ├── icon32.png               # 32x32 toolbar icon
    ├── icon48.png               # 48x48 extension page icon
    └── icon128.png              # 128x128 Chrome Web Store icon
```

---

## 🚀 Core Features

### ✅ Implemented

1. **Real-Time Metrics**
   - Live token counting (input/output)
   - Cost calculation with configurable pricing
   - Latency tracking (TTFB + total)
   - Session totals per conversation

2. **Smart Monitoring**
   - `window.fetch()` patching (no DevTools needed)
   - SSE streaming support
   - Multi-model support (GPT-4, GPT-3.5, O1)
   - Per-tab session isolation

3. **User Interface**
   - Shadow DOM overlay on ChatGPT pages
   - Popup dashboard with session summary
   - Settings page for pricing/UI/privacy

4. **Data Management**
   - Local storage persistence
   - Daily usage rollups
   - Session state management
   - Storage size caps

5. **Privacy & Security**
   - All data local (no telemetry)
   - Optional text redaction
   - Shadow DOM isolation
   - CSP-compliant

### 🔧 Requires Setup

- **Accurate Tokenization**: Currently uses 4:1 char-to-token fallback
  - Integrate `@dqbd/tiktoken` for production accuracy
  - See `src/vendor/tiktoken-info.md` for instructions

---

## 🏗️ Technical Architecture

### Components

| Component | File | Purpose |
|-----------|------|---------|
| **Service Worker** | `sw.js` | Session state, storage, message handling |
| **Content Script** | `content.js` | Fetch patching, stream interception, overlay |
| **Core Module** | `meter-core.js` | Tokenization, pricing, utilities |
| **Popup** | `popup.html/js` | Session dashboard UI |
| **Options** | `options.html/js` | Settings management |

### Data Flow

```
User sends message on ChatGPT
    ↓
Content script patches fetch()
    ↓
Intercepts request → Parse payload → Count input tokens
    ↓
Stream response → Extract delta text → Count output tokens (throttled)
    ↓
Calculate costs → Update overlay UI
    ↓
Send to service worker → Update session state
    ↓
Persist to chrome.storage.local
    ↓
Update popup dashboard
```

### Key Technologies

- **Manifest V3**: Modern Chrome extension platform
- **Shadow DOM**: UI isolation on ChatGPT pages
- **Fetch API Patching**: Intercept network calls
- **SSE Parsing**: Handle streaming responses
- **Chrome Storage API**: Local data persistence
- **Throttled Tokenization**: Performance optimization

---

## 📊 Metrics Tracked

### Per Message

- Input tokens
- Output tokens
- Input cost (USD)
- Output cost (USD)
- Total cost (USD)
- TTFB (Time to First Byte)
- Total latency
- Model used
- Request/conversation IDs
- Temperature, max_tokens

### Per Session

- Cumulative tokens (in/out/total)
- Cumulative cost
- Message count
- Last updated timestamp
- Conversation ID

### Historical

- Daily rollups by model
- Total usage over time
- Message counts

---

## ⚙️ Configuration

### Default Pricing

| Model | Input ($/1K) | Output ($/1K) | Encoding |
|-------|--------------|---------------|----------|
| gpt-4 | $0.03 | $0.06 | cl100k_base |
| gpt-3.5 | $0.0015 | $0.002 | cl100k_base |
| o1-preview | $0.015 | $0.06 | o200k_base |
| o1-mini | $0.003 | $0.012 | o200k_base |

**Fully customizable** via Options page.

### UI Preferences

- Overlay position: Right (default), Left, Bottom
- Compact mode
- Show/hide TTFB
- Future: Dark/light theme

### Privacy Controls

- Store history (default: ON)
- Redact user text (default: ON)
- Future: Export controls

---

## 🧪 Testing Status

### ✅ Ready to Test

- Basic fetch interception
- SSE streaming parsing
- Token approximation (fallback)
- Cost calculation
- Overlay rendering
- Popup dashboard
- Settings persistence
- Session management

### ⚠️ Needs Testing

- Multiple concurrent tabs
- Conversation switching
- Error handling (rate limits, network failures)
- Storage cap enforcement
- Daily rollup accuracy
- Different ChatGPT response formats

### 🔜 Needs Production Setup

- Real tiktoken integration
- Accurate token counting
- Performance under load
- Cross-browser testing (if extending beyond Chrome)

---

## 📝 Installation & Usage

### Quick Install (Developer Mode)

```bash
# 1. Clone/download repository
cd revenium-chatgpt-meter

# 2. Open Chrome
chrome://extensions/

# 3. Enable Developer mode (toggle top-right)

# 4. Click "Load unpacked" → Select this folder

# 5. Navigate to chat.openai.com and test!
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## 🛠️ Development Roadmap

### Phase 1: MVP ✅ COMPLETE

- [x] Fetch patching
- [x] SSE streaming support
- [x] Token approximation
- [x] Cost calculation
- [x] Overlay UI
- [x] Popup dashboard
- [x] Settings page
- [x] Session persistence

### Phase 2: Production Ready

- [ ] Integrate real tiktoken WASM
- [ ] Accurate token counting
- [ ] Comprehensive error handling
- [ ] Performance optimization
- [ ] Cross-tab aggregation
- [ ] Export functionality (CSV/JSON)

### Phase 3: Advanced Features

- [ ] Charts & visualizations
- [ ] Cost budgets & alerts
- [ ] Multi-conversation analytics
- [ ] Firefox support (WebExtensions)
- [ ] Dark/light themes
- [ ] Keyboard shortcuts

### Phase 4: Enterprise

- [ ] Team usage tracking
- [ ] Cost allocation
- [ ] API integration
- [ ] Custom reporting
- [ ] SSO support

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Tokenization Accuracy**
   - Using 4:1 character-to-token approximation
   - Not production-accurate
   - Requires tiktoken integration

2. **ChatGPT API Dependency**
   - Relies on ChatGPT's internal API format
   - May break if OpenAI changes response structure
   - Parsers designed to be resilient

3. **Browser Support**
   - Chrome/Chromium only (MV3)
   - Firefox requires WebExtensions adaptation

4. **Storage Limits**
   - chrome.storage.local has 10MB limit
   - Pruning logic prevents overflow
   - Large histories may need compression

### Edge Cases

- Model switching mid-conversation (handled)
- Network errors during streaming (handled)
- Rate limiting responses (handled)
- Cancelled requests (handled)
- Missing conversation IDs (fallback logic)

---

## 🔒 Security & Privacy

### Data Handling

- **Storage**: 100% local (chrome.storage.local)
- **Network**: No external API calls (except ChatGPT itself)
- **Telemetry**: Zero tracking or analytics
- **Redaction**: Optional user text removal

### Code Security

- **CSP Compliant**: No remote scripts
- **Shadow DOM**: UI isolation
- **Input Validation**: All user inputs sanitized
- **Permissions**: Minimal required permissions

### Compliance

- **OpenAI ToS**: Review usage compliance
- **Privacy**: GDPR-friendly (local-only)
- **Licensing**: MIT (open source)

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Full technical documentation |
| [QUICKSTART.md](QUICKSTART.md) | Installation & setup guide |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | This overview |
| [src/vendor/tiktoken-info.md](src/vendor/tiktoken-info.md) | Tokenizer integration |
| [icons/ICONS.md](icons/ICONS.md) | Icon generation guide |

---

## 🤝 Contributing

Contributions welcome! Areas needing help:

1. **Tiktoken Integration** - Replace fallback tokenizer
2. **Testing** - Edge cases, different models
3. **UI/UX** - Design improvements, themes
4. **Features** - Export, charts, budgets
5. **Documentation** - Tutorials, videos

### Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/yourusername/revenium-chatgpt-meter.git
cd revenium-chatgpt-meter

# 2. Make changes
# (No build step required for basic changes)

# 3. Test in Chrome
# Load unpacked extension from chrome://extensions/

# 4. Submit PR
git checkout -b feature/your-feature
git commit -am "Add your feature"
git push origin feature/your-feature
# Create PR on GitHub
```

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/revenium-chatgpt-meter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/revenium-chatgpt-meter/discussions)
- **Email**: support@revenium.io (if applicable)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Credits

- **Built by**: Revenium Team
- **Inspired by**: Need for transparent AI cost tracking
- **Technologies**: Chrome Extensions API, tiktoken (planned), Shadow DOM
- **Community**: Thanks to all contributors!

---

**Status**: ✅ MVP Complete | 🚀 Ready for Testing | 🔧 Tiktoken Integration Pending

**Next Steps**:
1. Test on live ChatGPT
2. Integrate real tiktoken
3. Gather user feedback
4. Iterate and improve

---

**Last Updated**: 2025-10-10
