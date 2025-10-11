# Revenium ChatGPT Live Meter - File Structure

```
revenium-chatgpt-meter/
│
├── 📄 manifest.json              # Chrome Extension Manifest V3
├── 📄 package.json               # NPM config (optional, for tiktoken)
├── 📄 .gitignore                # Git ignore rules
│
├── 📚 Documentation
│   ├── README.md                # Full technical documentation
│   ├── QUICKSTART.md            # Installation & usage guide
│   ├── PROJECT_SUMMARY.md       # Project overview (this summary)
│   └── FILE_STRUCTURE.md        # This file
│
├── 🎨 Icons
│   ├── icons/
│   │   ├── ICONS.md            # Icon generation guide
│   │   ├── icon16.png          # 16x16 (toolbar)
│   │   ├── icon32.png          # 32x32 (toolbar)
│   │   ├── icon48.png          # 48x48 (extensions page)
│   │   └── icon128.png         # 128x128 (Chrome Web Store)
│
└── 🔧 Source Code
    └── src/
        │
        ├── 🔄 Core Components
        │   ├── sw.js               # Service Worker
        │   │                       # - Session state management
        │   │                       # - Storage persistence
        │   │                       # - Message handling
        │   │                       # - Daily rollups
        │   │
        │   ├── content.js          # Content Script
        │   │                       # - Fetch API patching
        │   │                       # - SSE stream interception
        │   │                       # - Overlay UI injection
        │   │                       # - Real-time updates
        │   │
        │   └── meter-core.js       # Core Module
        │                           # - Tokenization logic
        │                           # - Pricing calculations
        │                           # - Message parsing
        │                           # - Utility functions
        │
        ├── 🖥️ User Interface
        │   ├── popup.html          # Popup Dashboard (HTML)
        │   ├── popup.js            # Popup Logic (JS)
        │   │                       # - Session summary
        │   │                       # - Recent messages
        │   │                       # - Reset/settings actions
        │   │
        │   ├── options.html        # Settings Page (HTML)
        │   └── options.js          # Settings Logic (JS)
        │                           # - Pricing table editor
        │                           # - UI preferences
        │                           # - Privacy controls
        │
        └── 📦 Vendor
            └── vendor/
                └── tiktoken-info.md  # Tokenizer integration guide
                                      # (tiktoken files go here)
```

## File Descriptions

### Core Extension Files

| File | Lines | Purpose |
|------|-------|---------|
| `manifest.json` | 35 | Extension configuration, permissions, entry points |
| `package.json` | 30 | NPM configuration for optional tiktoken integration |
| `.gitignore` | 25 | Git ignore patterns |

### Documentation

| File | Words | Purpose |
|------|-------|---------|
| `README.md` | ~4000 | Complete technical documentation |
| `QUICKSTART.md` | ~1500 | Step-by-step setup and usage guide |
| `PROJECT_SUMMARY.md` | ~2000 | High-level project overview |
| `FILE_STRUCTURE.md` | ~500 | This file - project structure reference |

### Source Code

#### Core Components

| File | Lines | Purpose |
|------|-------|---------|
| `sw.js` | ~200 | Service worker - session management & persistence |
| `content.js` | ~250 | Content script - fetch patching & overlay UI |
| `meter-core.js` | ~200 | Core logic - tokenization & pricing |

#### User Interface

| File | Lines | Purpose |
|------|-------|---------|
| `popup.html` | ~150 | Popup dashboard markup |
| `popup.js` | ~120 | Popup logic & data loading |
| `options.html` | ~180 | Settings page markup |
| `options.js` | ~150 | Settings persistence & UI |

#### Vendor

| File | Purpose |
|------|---------|
| `vendor/tiktoken-info.md` | Guide for adding real tiktoken library |
| `vendor/tiktoken.min.js` | (Not included) Bundled tiktoken library |
| `vendor/tiktoken_bg.wasm` | (Not included) Tiktoken WASM binary |

### Icons

| File | Size | Purpose |
|------|------|---------|
| `icons/icon16.png` | 16×16 | Toolbar icon (small) |
| `icons/icon32.png` | 32×32 | Toolbar icon (retina) |
| `icons/icon48.png` | 48×48 | Extension management page |
| `icons/icon128.png` | 128×128 | Chrome Web Store listing |
| `icons/ICONS.md` | - | Icon generation instructions |

## Code Statistics

### Total Lines of Code

- **JavaScript**: ~1,120 lines
- **HTML**: ~330 lines
- **JSON**: ~65 lines
- **Markdown**: ~7,000 words
- **Total Files**: 20

### Breakdown by Component

| Component | Files | JS Lines | HTML Lines |
|-----------|-------|----------|------------|
| Service Worker | 1 | 200 | - |
| Content Script | 1 | 250 | - |
| Core Logic | 1 | 200 | - |
| Popup | 2 | 120 | 150 |
| Options | 2 | 150 | 180 |
| **Total** | **7** | **920** | **330** |

## File Dependencies

```
manifest.json
    ├── sw.js
    │   └── meter-core.js (imported)
    │
    ├── content.js
    │   └── meter-core.js (loaded via script tag)
    │
    ├── popup.html
    │   └── popup.js
    │
    └── options.html
        └── options.js

Message Flow:
    content.js ←→ sw.js (chrome.runtime.sendMessage)
    popup.js ←→ sw.js (chrome.runtime.sendMessage)
    options.js ←→ sw.js (chrome.runtime.sendMessage)
```

## Key Architectural Patterns

### 1. **Module Pattern**
- Each component is self-contained
- Clear separation of concerns
- Minimal global scope pollution

### 2. **Event-Driven Communication**
- `chrome.runtime.sendMessage` for cross-context messaging
- Shadow DOM events for UI updates
- Service worker as central message hub

### 3. **Storage Strategy**
- Service worker maintains in-memory state
- Periodic persistence to chrome.storage.local
- Per-tab and per-conversation isolation

### 4. **UI Isolation**
- Shadow DOM for overlay (no style conflicts)
- Separate popup/options contexts
- CSP-compliant inline styles

## Build Process

### No Build Required (for basic usage)
- All files are vanilla JS
- Can load directly as unpacked extension

### Optional Build (for tiktoken)
```bash
npm install              # Install tiktoken + esbuild
npm run build:tiktoken   # Bundle tiktoken for browser
```

### Packaging for Distribution
```bash
npm run package          # Creates .zip for Chrome Web Store
```

## Development Workflow

1. **Make changes** to files in `src/`
2. **Reload extension** in chrome://extensions/
3. **Refresh ChatGPT** page to test content script
4. **Check console** for errors/logs
5. **Test popup/options** by opening them

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script injects on ChatGPT
- [ ] Overlay appears and updates
- [ ] Popup shows session data
- [ ] Options page saves settings
- [ ] Service worker persists data
- [ ] Multiple tabs work independently
- [ ] Conversation resets work correctly

---

**Last Updated**: 2025-10-10
**Total Project Size**: ~920 lines of code + documentation
**Status**: ✅ MVP Complete
