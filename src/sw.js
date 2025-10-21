// sw.js - Service Worker for session management and persistence

// In-memory session state per tab
const state = new Map(); // tabId -> SessionTotals

// Settings cache
let settings = null;

// Inline core functions for service worker (since we can't import as ES module)
const DEFAULT_PRICING = [
  {
    modelPrefix: "gpt-4",
    inputPerK: 0.03,
    outputPerK: 0.06,
    encoding: "cl100k_base",
    imageInputCost: 0.00255, // ~85 tokens @ $0.03/1K
    imageOutputCost: 0.04, // DALL-E standard
    imageOutputHDCost: 0.08 // DALL-E HD
  },
  {
    modelPrefix: "gpt-3.5",
    inputPerK: 0.0015,
    outputPerK: 0.002,
    encoding: "cl100k_base",
    imageInputCost: 0.0001275, // ~85 tokens @ $0.0015/1K
    imageOutputCost: 0.04
  },
  {
    modelPrefix: "o1-preview",
    inputPerK: 0.015,
    outputPerK: 0.06,
    encoding: "o200k_base",
    reasoningMultiplier: 3,
    imageInputCost: 0.001275 // ~85 tokens @ $0.015/1K
  },
  {
    modelPrefix: "o1-mini",
    inputPerK: 0.003,
    outputPerK: 0.012,
    encoding: "o200k_base",
    reasoningMultiplier: 3,
    imageInputCost: 0.000255 // ~85 tokens @ $0.003/1K
  },
  {
    modelPrefix: "o1-pro",
    inputPerK: 0.15,
    outputPerK: 0.6,
    encoding: "o200k_base",
    reasoningMultiplier: 10,
    imageInputCost: 0.01275 // ~85 tokens @ $0.15/1K
  }
];

const DEFAULT_TAGS = [
  { id: 'work', name: 'Work', color: '#00d4ff', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'personal', name: 'Personal', color: '#00ff88', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'research', name: 'Research', color: '#ff00ff', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'acme', name: 'Acme Industries', color: '#ffa500', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } }
];

function round6(num) {
  return Math.round(num * 1000000) / 1000000;
}

/**
 * Initialize settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  settings = result.settings || {
    pricing: DEFAULT_PRICING,
    tags: DEFAULT_TAGS,
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
      totalReasoningTokens: 0,
      totalImageInputs: 0,
      totalImageOutputs: 0,
      totalCostUSD: 0,
      textCostUSD: 0,
      imageCostUSD: 0,
      reasoningCostUSD: 0,
      lastUpdatedAt: Date.now(),
      perMessage: [],
      tagId: null,
      tagName: null,
      tagColor: null
    });
  }
  return state.get(tabId);
}

/**
 * Update session with finalized metrics
 * Note: We accumulate tokens across all message exchanges in the conversation
 * - Input tokens = accumulate all user prompts
 * - Output tokens = accumulate all assistant responses
 * - Multimodal content = accumulate images and reasoning tokens
 */
function updateSessionWithFinal(session, metrics) {
  // Input tokens = accumulate all user prompts
  session.totalPromptTokens += metrics.promptTokens || 0;

  // Output tokens = accumulate all assistant responses
  session.totalCompletionTokens += metrics.completionTokens || 0;

  // Reasoning tokens = accumulate estimated reasoning
  session.totalReasoningTokens += metrics.estimatedReasoningTokens || 0;

  // Images = accumulate counts
  session.totalImageInputs += metrics.imageInputCount || 0;
  session.totalImageOutputs += metrics.imageOutputCount || 0;

  // Calculate cost breakdown - accumulate all costs
  const textInputCost = metrics.inputCostUSD || 0;
  const textOutputCost = metrics.outputCostUSD || 0;
  const imageCost = metrics.imageCostUSD || 0;
  const reasoningCost = metrics.reasoningCostUSD || 0;

  // Accumulate all costs
  session.textCostUSD = (session.textCostUSD || 0) + textInputCost + textOutputCost;
  session.imageCostUSD = (session.imageCostUSD || 0) + imageCost;
  session.reasoningCostUSD = (session.reasoningCostUSD || 0) + reasoningCost;

  session.totalCostUSD = session.textCostUSD + session.imageCostUSD + session.reasoningCostUSD;
  session.totalCostUSD = round6(session.totalCostUSD);
  session.textCostUSD = round6(session.textCostUSD);
  session.imageCostUSD = round6(session.imageCostUSD);
  session.reasoningCostUSD = round6(session.reasoningCostUSD);

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
  const history = result[key] || { date: today, modelTotals: {}, tagTotals: {} };

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

  // Track by tag
  const tagId = session.tagId || 'untagged';
  if (!history.tagTotals[tagId]) {
    history.tagTotals[tagId] = {
      promptTokens: 0,
      completionTokens: 0,
      costUSD: 0,
      messageCount: 0
    };
  }

  const tagTotals = history.tagTotals[tagId];
  tagTotals.promptTokens += session.totalPromptTokens;
  tagTotals.completionTokens += session.totalCompletionTokens;
  tagTotals.costUSD += session.totalCostUSD;
  tagTotals.messageCount += session.perMessage.length;

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
    totalReasoningTokens: session.totalReasoningTokens || 0,
    totalTokens: session.totalPromptTokens + session.totalCompletionTokens + (session.totalReasoningTokens || 0),
    totalCostUSD: session.totalCostUSD,
    textCostUSD: session.textCostUSD || 0,
    imageCostUSD: session.imageCostUSD || 0,
    reasoningCostUSD: session.reasoningCostUSD || 0,
    totalImageInputs: session.totalImageInputs || 0,
    totalImageOutputs: session.totalImageOutputs || 0,
    hasMultimodal: (session.totalImageInputs || 0) > 0 || (session.totalImageOutputs || 0) > 0 || (session.totalReasoningTokens || 0) > 0,
    messageCount: session.perMessage.length,
    lastUpdatedAt: session.lastUpdatedAt,
    tagId: session.tagId,
    tagName: session.tagName,
    tagColor: session.tagColor
  };
}

/**
 * Tag CRUD Operations
 */
function getAllTags() {
  return settings?.tags || DEFAULT_TAGS;
}

function createTag(tag) {
  if (!settings.tags) {
    settings.tags = [...DEFAULT_TAGS];
  }

  const newTag = {
    id: tag.id || crypto.randomUUID(),
    name: tag.name,
    color: tag.color,
    stats: {
      totalCost: 0,
      totalTokens: 0,
      messageCount: 0
    }
  };

  settings.tags.push(newTag);
  return newTag;
}

function updateTag(tagId, updates) {
  const tagIndex = settings.tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) {
    throw new Error('Tag not found');
  }

  settings.tags[tagIndex] = {
    ...settings.tags[tagIndex],
    ...updates,
    id: tagId, // Prevent ID changes
    stats: settings.tags[tagIndex].stats // Preserve stats
  };

  return settings.tags[tagIndex];
}

function deleteTag(tagId) {
  const tagIndex = settings.tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) {
    throw new Error('Tag not found');
  }

  settings.tags.splice(tagIndex, 1);
  return true;
}

async function setSessionTag(tabId, tagId) {
  const session = state.get(tabId);
  if (!session) {
    throw new Error('Session not found');
  }

  const tag = settings.tags.find(t => t.id === tagId);
  if (!tag && tagId !== null) {
    throw new Error('Tag not found');
  }

  session.tagId = tagId;
  session.tagName = tag?.name || null;
  session.tagColor = tag?.color || null;

  await persist(tabId, session);
  return session;
}

async function getTagReport(startDate, endDate) {
  const tags = getAllTags();
  const report = {};

  // Initialize report with all tags
  tags.forEach(tag => {
    report[tag.id] = {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      totalCost: 0,
      totalTokens: 0,
      messageCount: 0,
      dailyBreakdown: []
    };
  });

  // Add untagged category
  report['untagged'] = {
    id: 'untagged',
    name: 'Untagged',
    color: '#666666',
    totalCost: 0,
    totalTokens: 0,
    messageCount: 0,
    dailyBreakdown: []
  };

  // Query daily history for date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const keys = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    keys.push(`history:${dateStr}`);
  }

  const results = await chrome.storage.local.get(keys);

  // Aggregate data
  Object.values(results).forEach(dayHistory => {
    if (!dayHistory.tagTotals) return;

    Object.entries(dayHistory.tagTotals).forEach(([tagId, totals]) => {
      if (report[tagId]) {
        report[tagId].totalCost += totals.costUSD || 0;
        report[tagId].totalTokens += (totals.promptTokens || 0) + (totals.completionTokens || 0);
        report[tagId].messageCount += totals.messageCount || 0;
        report[tagId].dailyBreakdown.push({
          date: dayHistory.date,
          cost: totals.costUSD || 0,
          tokens: (totals.promptTokens || 0) + (totals.completionTokens || 0)
        });
      }
    });
  });

  return Object.values(report);
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

          // Check in-memory session first
          let session = state.get(tabId);

          // If not in memory, try to restore from storage
          if (!session) {
            try {
              const key = `session:${tabId}`;
              const result = await chrome.storage.local.get(key);
              if (result[key]) {
                session = result[key];
                state.set(tabId, session); // Restore to memory
              }
            } catch (error) {
              console.error('[Revenium SW] Failed to restore session from storage:', error);
            }
          }

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

        case 'getTags': {
          const tags = getAllTags();
          sendResponse({ ok: true, tags });
          break;
        }

        case 'createTag': {
          const newTag = createTag(msg.tag);
          await chrome.storage.local.set({ settings });
          sendResponse({ ok: true, tag: newTag });
          break;
        }

        case 'updateTag': {
          const updatedTag = updateTag(msg.tagId, msg.updates);
          await chrome.storage.local.set({ settings });
          sendResponse({ ok: true, tag: updatedTag });
          break;
        }

        case 'deleteTag': {
          deleteTag(msg.tagId);
          await chrome.storage.local.set({ settings });
          sendResponse({ ok: true });
          break;
        }

        case 'setTag': {
          if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
          }

          const session = await setSessionTag(tabId, msg.tagId);
          sendResponse({ ok: true, totals: summarize(session) });
          break;
        }

        case 'getTagReport': {
          const report = await getTagReport(msg.startDate, msg.endDate);
          sendResponse({ ok: true, report });
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
  await loadSettings();
});

// Load settings on startup
loadSettings();
