// sw.js - Service Worker for session management and persistence

// In-memory session state per tab
const state = new Map(); // tabId -> SessionTotals

// Settings cache
let settings = null;

// Inline core functions for service worker (since we can't import as ES module)
const DEFAULT_PRICING = [
  { modelPrefix: "gpt-4", inputPerK: 0.03, outputPerK: 0.06, encoding: "cl100k_base" },
  { modelPrefix: "gpt-3.5", inputPerK: 0.0015, outputPerK: 0.002, encoding: "cl100k_base" },
  { modelPrefix: "o1-preview", inputPerK: 0.015, outputPerK: 0.06, encoding: "o200k_base" },
  { modelPrefix: "o1-mini", inputPerK: 0.003, outputPerK: 0.012, encoding: "o200k_base" }
];

function round4(num) {
  return Math.round(num * 10000) / 10000;
}

/**
 * Initialize settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  settings = result.settings || {
    pricing: DEFAULT_PRICING,
    ui: {
      position: 'right',
      compact: false,
      showTTFB: true
    },
    privacy: {
      storeHistory: true,
      redactUserText: true
    }
  };
  return settings;
}

/**
 * Get or create session for a tab
 */
function ensureSession(tabId, metrics) {
  if (!state.has(tabId)) {
    state.set(tabId, {
      conversationId: metrics?.conversationId,
      model: metrics?.model || 'gpt-4',
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCostUSD: 0,
      contextLimit: metrics?.contextLimit || 8192,
      contextUsagePercent: 0,
      lastUpdatedAt: Date.now(),
      perMessage: []
    });
  }
  return state.get(tabId);
}

/**
 * Update session with finalized metrics
 * Note: Each API call includes the FULL conversation history in the input
 * So we track the cumulative total by:
 * - Using the latest input tokens (which includes full history)
 * - Accumulating output tokens (each response adds to total)
 */
function updateSessionWithFinal(session, metrics) {
  // Input tokens = full conversation history (replace with latest)
  session.totalPromptTokens = metrics.promptTokens || 0;

  // Output tokens = accumulate all assistant responses
  session.totalCompletionTokens += metrics.completionTokens || 0;

  // Context window tracking
  session.contextLimit = metrics.contextLimit || session.contextLimit || 8192;
  const totalTokens = session.totalPromptTokens + session.totalCompletionTokens;
  session.contextUsagePercent = Math.round((totalTokens / session.contextLimit) * 100);

  // Total cost = latest input cost + cumulative output cost
  const cumulativeOutputCost = (session.totalCostUSD || 0) - (session.lastInputCostUSD || 0);
  session.totalCostUSD = (metrics.inputCostUSD || 0) + cumulativeOutputCost + (metrics.outputCostUSD || 0);
  session.totalCostUSD = Math.round(session.totalCostUSD * 10000) / 10000;

  // Track last input cost for next calculation
  session.lastInputCostUSD = metrics.inputCostUSD || 0;
  session.lastUpdatedAt = Date.now();

  // Update conversation ID if available
  if (metrics.conversationId && !session.conversationId) {
    session.conversationId = metrics.conversationId;
  }

  // Add to per-message array (limit to last 100 messages to avoid memory bloat)
  session.perMessage.push(metrics);
  if (session.perMessage.length > 100) {
    session.perMessage.shift();
  }

  return session;
}

/**
 * Persist session to storage
 */
async function persist(tabId, session) {
  try {
    const key = `session:${tabId}`;
    await chrome.storage.local.set({ [key]: session });

    // Also update daily history if enabled
    if (settings?.privacy?.storeHistory) {
      await updateDailyHistory(session);
    }
  } catch (error) {
    console.error('[Revenium SW] Failed to persist session:', error);
  }
}

/**
 * Update daily history rollup
 */
async function updateDailyHistory(session) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `history:${today}`;

  const result = await chrome.storage.local.get(key);
  const history = result[key] || { date: today, modelTotals: {} };

  const model = session.model || 'gpt-4';
  if (!history.modelTotals[model]) {
    history.modelTotals[model] = {
      promptTokens: 0,
      completionTokens: 0,
      costUSD: 0,
      messageCount: 0
    };
  }

  const totals = history.modelTotals[model];
  totals.promptTokens += session.totalPromptTokens;
  totals.completionTokens += session.totalCompletionTokens;
  totals.costUSD += session.totalCostUSD;
  totals.messageCount += session.perMessage.length;

  await chrome.storage.local.set({ [key]: history });
}

/**
 * Summarize session for UI
 */
function summarize(session) {
  return {
    conversationId: session.conversationId,
    model: session.model,
    totalPromptTokens: session.totalPromptTokens,
    totalCompletionTokens: session.totalCompletionTokens,
    totalTokens: session.totalPromptTokens + session.totalCompletionTokens,
    totalCostUSD: session.totalCostUSD,
    contextLimit: session.contextLimit,
    contextUsagePercent: session.contextUsagePercent,
    messageCount: session.perMessage.length,
    lastUpdatedAt: session.lastUpdatedAt
  };
}

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  (async () => {
    try {
      // Load settings if not cached
      if (!settings) {
        await loadSettings();
      }

      switch (msg.type) {
        case 'final': {
          if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
          }

          const session = ensureSession(tabId, msg.metrics);
          updateSessionWithFinal(session, msg.metrics);
          await persist(tabId, session);

          sendResponse({
            ok: true,
            totals: summarize(session),
            perMessage: session.perMessage.slice(-10) // Last 10 messages
          });
          break;
        }

        case 'partial': {
          if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
          }

          const session = ensureSession(tabId, msg.metrics);
          sendResponse({
            ok: true,
            totals: summarize(session)
          });
          break;
        }

        case 'reset': {
          if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
          }

          // Persist current session before reset
          if (state.has(tabId)) {
            await persist(tabId, state.get(tabId));
          }

          state.delete(tabId);
          await chrome.storage.local.remove(`session:${tabId}`);

          sendResponse({ ok: true });
          break;
        }

        case 'getSession': {
          if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
          }

          const session = state.get(tabId);
          if (session) {
            sendResponse({
              ok: true,
              totals: summarize(session),
              perMessage: session.perMessage.slice(-10)
            });
          } else {
            sendResponse({ ok: false, error: 'No session found' });
          }
          break;
        }

        case 'getSettings': {
          sendResponse({ ok: true, settings });
          break;
        }

        case 'updateSettings': {
          settings = msg.settings;
          await chrome.storage.local.set({ settings });
          sendResponse({ ok: true });
          break;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Revenium SW] Message handler error:', error);
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

/**
 * Cleanup on tab close
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (state.has(tabId)) {
    await persist(tabId, state.get(tabId));
    state.delete(tabId);
  }
});

/**
 * Initialize on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Revenium SW] Extension installed');
  await loadSettings();
});

// Load settings on startup
loadSettings();

console.log('[Revenium SW] Service worker initialized');
