// inject.js - Injected into page context to patch fetch

(function() {
  'use strict';

  // Prevent double injection
  if (window.__REVENIUM_INJECTED__) {
    console.log('[Revenium] Already injected, skipping...');
    return;
  }
  window.__REVENIUM_INJECTED__ = true;

  console.log('[Revenium] Injected script starting...');

  // Model context window limits (tokens)
  const CONTEXT_LIMITS = {
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-turbo': 128000,
    'gpt-4o': 128000,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    'o1-preview': 128000,
    'o1-mini': 128000,
    'default': 8192
  };

  // Get context limit for a model
  function getContextLimit(model) {
    if (!model) return CONTEXT_LIMITS.default;

    // Find matching limit
    for (const [key, limit] of Object.entries(CONTEXT_LIMITS)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        return limit;
      }
    }
    return CONTEXT_LIMITS.default;
  }

  // Simple tokenizer (4:1 approximation)
  function encodeForModel(text) {
    if (!text) return [];
    return new Array(Math.ceil(text.length / 4)).fill(0);
  }

  function serializeMessages(messages) {
    if (!messages || !Array.isArray(messages)) return '';
    return messages.map(m => {
      const content = typeof m.content === 'string' ? m.content :
                     Array.isArray(m.content) ? m.content.map(p => p.text || p.content || '').join('') :
                     m.content?.text || '';
      return `${m.role}:\n${content}`;
    }).join('\n\n');
  }

  function extractDelta(evt) {
    return evt.delta?.content ||
           evt.message?.content?.parts?.join('') ||
           evt.choices?.[0]?.delta?.content ||
           evt.choices?.[0]?.text ||
           null;
  }

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const init = args[1] || {};
    const method = (init.method || 'GET').toUpperCase();

    // Debug: Log ALL POST requests to see what endpoints are being used
    if (method === 'POST') {
      console.log('[Revenium] 📡 POST request:', url);
    }

    // Match ChatGPT conversation API endpoint (matches /backend-api/conversation or /backend-api/f/conversation)
    const isChat = method === 'POST' && (
      url.includes('/backend-api/conversation') ||
      url.includes('/backend-api/f/conversation')
    );

    // Debug: Log conversation requests with extra detail
    if (isChat) {
      console.log('[Revenium] 🎯 CONVERSATION ENDPOINT MATCHED!:', url);
    }

    // Call original fetch first
    const response = await originalFetch.apply(this, args);

    // Debug logging
    if (isChat) {
      console.log('[Revenium] Chat request found!', {
        url,
        ok: response.ok,
        status: response.status,
        hasBody: !!response.body
      });
    }

    // Only intercept successful chat conversation requests
    if (!isChat || !response.ok || !response.body) {
      return response;
    }

    console.log('[Revenium] ✅ Intercepting chat API call:', url);

    const t0 = Date.now();
    let reqBody = null;

    try {
      if (typeof init.body === 'string') {
        reqBody = JSON.parse(init.body);
      }
    } catch (e) {
      console.warn('[Revenium] Could not parse request body:', e);
    }

    const reader = response.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';
        let firstByte = false;
        let tTFB = null;

        const model = reqBody?.model || 'gpt-4';
        const inputText = serializeMessages(reqBody?.messages || []);
        const inputTokens = encodeForModel(inputText).length;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (!firstByte && value) {
              firstByte = true;
              tTFB = Date.now();
            }

            if (done) {
              const tDone = Date.now();
              const outputTokens = encodeForModel(assistantText).length;
              const totalTokens = inputTokens + outputTokens;
              const contextLimit = getContextLimit(model);
              const contextUsagePercent = Math.round((totalTokens / contextLimit) * 100);

              // Send metrics via custom event
              window.dispatchEvent(new CustomEvent('revenium-metrics', {
                detail: {
                  model,
                  inputTokens,
                  outputTokens,
                  totalTokens,
                  contextLimit,
                  contextUsagePercent,
                  latency: tDone - t0,
                  ttfb: tTFB ? tTFB - t0 : null,
                  conversationId: reqBody?.conversation_id
                }
              }));

              controller.close();
              break;
            }

            controller.enqueue(value);

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              if (!part.startsWith('data:')) continue;
              const json = part.slice(5).trim();
              if (json === '[DONE]') continue;

              try {
                const evt = JSON.parse(json);

                // Debug: Log first event to see structure
                if (assistantText.length === 0) {
                  console.log('[Revenium] 🔍 First streaming event structure:', evt);
                }

                const delta = extractDelta(evt);
                if (delta) {
                  assistantText += delta;
                  console.log('[Revenium] 📝 Captured delta text (total length now: ' + assistantText.length + ')');

                  // Send partial update
                  const partialOutputTokens = encodeForModel(assistantText).length;
                  const partialTotalTokens = inputTokens + partialOutputTokens;
                  const contextLimit = getContextLimit(model);

                  window.dispatchEvent(new CustomEvent('revenium-partial', {
                    detail: {
                      model,
                      inputTokens,
                      outputTokens: partialOutputTokens,
                      totalTokens: partialTotalTokens,
                      contextLimit,
                      contextUsagePercent: Math.round((partialTotalTokens / contextLimit) * 100)
                    }
                  }));
                } else if (assistantText.length === 0) {
                  console.log('[Revenium] ⚠️ extractDelta returned null for event');
                }
              } catch (e) {
                console.warn('[Revenium] Failed to parse streaming event:', e);
              }
            }
          }
        } catch (error) {
          console.error('[Revenium] Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  console.log('[Revenium] Fetch patched in page context');
})();
