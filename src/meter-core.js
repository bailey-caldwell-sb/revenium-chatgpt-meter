// meter-core.js - Core tokenization, pricing, and utility functions

/**
 * Default pricing table for OpenAI models
 */
const DEFAULT_PRICING = [
  { modelPrefix: "gpt-4", inputPerK: 0.03, outputPerK: 0.06, encoding: "cl100k_base" },
  { modelPrefix: "gpt-3.5", inputPerK: 0.0015, outputPerK: 0.002, encoding: "cl100k_base" },
  { modelPrefix: "o1-preview", inputPerK: 0.015, outputPerK: 0.06, encoding: "o200k_base" },
  { modelPrefix: "o1-mini", inputPerK: 0.003, outputPerK: 0.012, encoding: "o200k_base" }
];

/**
 * Simple tokenizer fallback (approximate)
 * In production, replace with @dqbd/tiktoken or similar
 */
class SimpleTokenizer {
  constructor() {
    this.ready = true;
  }

  encode(text) {
    if (!text) return [];
    // Rough approximation: ~4 chars per token on average
    // This is NOT accurate - replace with real tiktoken implementation
    const approxTokens = Math.ceil(text.length / 4);
    return new Array(approxTokens).fill(0);
  }

  free() {
    // Cleanup if needed
  }
}

// Global tokenizer instance
let tokenizer = null;

/**
 * Initialize tokenizer (lazy load)
 */
async function initTokenizer() {
  if (tokenizer) return tokenizer;

  try {
    // TODO: Load actual tiktoken WASM module
    // For now, use simple fallback
    tokenizer = new SimpleTokenizer();
    console.log('[Revenium] Tokenizer initialized (using fallback)');
    return tokenizer;
  } catch (error) {
    console.error('[Revenium] Tokenizer init failed:', error);
    tokenizer = new SimpleTokenizer();
    return tokenizer;
  }
}

/**
 * Encode text for a given model
 */
function encodeForModel(model, text) {
  if (!tokenizer) {
    console.warn('[Revenium] Tokenizer not initialized, using fallback');
    return new SimpleTokenizer().encode(text);
  }
  return tokenizer.encode(text);
}

/**
 * Get pricing for a model
 */
function getModelPricing(model, pricingTable = DEFAULT_PRICING) {
  const pricing = pricingTable.find(p => model?.startsWith(p.modelPrefix));
  return pricing || DEFAULT_PRICING[0]; // Default to GPT-4 pricing
}

/**
 * Compute cost in USD
 */
function computeCostUSD(model, inTok, outTok, pricingTable = DEFAULT_PRICING) {
  const pricing = getModelPricing(model, pricingTable);
  const inputCost = (inTok / 1000) * pricing.inputPerK;
  const outputCost = (outTok / 1000) * pricing.outputPerK;

  return {
    inputCostUSD: round4(inputCost),
    outputCostUSD: round4(outputCost),
    totalCostUSD: round4(inputCost + outputCost)
  };
}

/**
 * Round to 4 decimal places
 */
function round4(num) {
  return Math.round(num * 10000) / 10000;
}

/**
 * Serialize OpenAI chat messages for tokenization
 */
function serializeOpenAIChatMessages(messages) {
  if (!messages || !Array.isArray(messages)) return '';
  return messages.map(m => `${m.role}:\n${partsToText(m.content)}`).join('\n\n');
}

/**
 * Extract text from message content (handles string, array, object formats)
 */
function partsToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(p =>
      typeof p === 'string' ? p : (p.text || p.content || '')
    ).join('');
  }
  return content?.text || content?.content || '';
}

/**
 * Extract delta text from SSE event
 * Handles various ChatGPT response formats
 */
function extractDeltaText(evt) {
  // Try different path patterns ChatGPT uses
  if (evt.delta?.content) return evt.delta.content;
  if (evt.message?.content?.parts) {
    return evt.message.content.parts.join('');
  }
  if (evt.choices?.[0]?.delta?.content) {
    return evt.choices[0].delta.content;
  }
  if (evt.choices?.[0]?.text) {
    return evt.choices[0].text;
  }
  return null;
}

/**
 * Build initial metrics from request
 */
function buildInitialMetrics(reqBodyText, url, t0) {
  let model = 'gpt-4';
  let messages = [];
  let temperature;
  let max_tokens;
  let requestId;
  let conversationId;

  try {
    const body = JSON.parse(reqBodyText || '{}');
    model = body.model || model;
    messages = body.messages || [];
    temperature = body.temperature;
    max_tokens = body.max_tokens ?? body.max_new_tokens;
    requestId = body.message_id || body.request_id;
    conversationId = body.conversation_id || body.conversationId;
  } catch (e) {
    console.warn('[Revenium] Failed to parse request body:', e);
  }

  const inputText = serializeOpenAIChatMessages(messages);
  const promptTokens = encodeForModel(model, inputText).length;

  return {
    id: crypto.randomUUID(),
    requestId,
    conversationId,
    model,
    promptTokens,
    completionTokens: 0,
    inputCostUSD: 0,
    outputCostUSD: 0,
    totalCostUSD: 0,
    t0: Date.now(),
    tTFB: null,
    tDone: null,
    latencyMs: null,
    ttfbMs: null,
    temperature,
    maxTokens: max_tokens,
    status: 'ok'
  };
}

/**
 * Finalize metrics with output tokens
 */
function finalizeMetrics(metrics, assistantText, pricingTable) {
  const outTok = encodeForModel(metrics.model, assistantText).length;
  metrics.completionTokens = outTok;
  const costs = computeCostUSD(metrics.model, metrics.promptTokens, outTok, pricingTable);
  Object.assign(metrics, costs);
  return metrics;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MeterCore = {
    initTokenizer,
    encodeForModel,
    getModelPricing,
    computeCostUSD,
    serializeOpenAIChatMessages,
    partsToText,
    extractDeltaText,
    buildInitialMetrics,
    finalizeMetrics,
    DEFAULT_PRICING
  };
}

// Export for service worker / modules
if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.MeterCore = {
    initTokenizer,
    encodeForModel,
    getModelPricing,
    computeCostUSD,
    serializeOpenAIChatMessages,
    partsToText,
    extractDeltaText,
    buildInitialMetrics,
    finalizeMetrics,
    DEFAULT_PRICING
  };
}
