// inject.js - Injected into page context to patch fetch

(function() {
  'use strict';

  // Prevent double injection
  if (window.__REVENIUM_INJECTED__) {
    console.log('[Revenium] Already injected, skipping...');
    return;
  }
  window.__REVENIUM_INJECTED__ = true;


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
    // ChatGPT streaming format - input_message or message with content.parts
    if (evt.input_message?.content?.parts) {
      const parts = evt.input_message.content.parts;
      // Only extract if it's from assistant (not user input)
      if (evt.input_message.author?.role !== 'user') {
        return Array.isArray(parts) ? parts.join('') : parts;
      }
    }

    // Standard message format
    if (evt.message?.content?.parts) {
      const parts = evt.message.content.parts;
      return Array.isArray(parts) ? parts.join('') : parts;
    }

    // Look for message.content directly
    if (evt.message?.content && typeof evt.message.content === 'string') {
      return evt.message.content;
    }

    // Check for delta in various places
    if (evt.delta?.content) {
      return evt.delta.content;
    }

    if (evt.delta?.text) {
      return evt.delta.text;
    }

    // OpenAI API format
    if (evt.choices?.[0]?.delta?.content) {
      return evt.choices[0].delta.content;
    }

    if (evt.choices?.[0]?.text) {
      return evt.choices[0].text;
    }

    // Generic text/content fields
    if (typeof evt.text === 'string' && evt.text.length > 0) {
      return evt.text;
    }

    if (typeof evt.content === 'string' && evt.content.length > 0) {
      return evt.content;
    }

    // Deep search for 'parts' arrays anywhere in the object
    function findParts(obj, depth = 0) {
      if (depth > 3) return null; // Prevent infinite recursion
      if (!obj || typeof obj !== 'object') return null;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findParts(item, depth + 1);
          if (found) return found;
        }
      } else {
        if (obj.parts && Array.isArray(obj.parts)) {
          return obj.parts.join('');
        }
        for (const key in obj) {
          if (key === 'parts' && Array.isArray(obj[key])) {
            return obj[key].join('');
          }
          const found = findParts(obj[key], depth + 1);
          if (found) return found;
        }
      }
      return null;
    }

    const deepParts = findParts(evt);
    if (deepParts) return deepParts;

    return null;
  }

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const init = args[1] || {};
    const method = (init.method || 'GET').toUpperCase();

    // Match ChatGPT conversation API endpoint
    const isChat = method === 'POST' && (
      url.includes('/backend-api/conversation') ||
      url.includes('/backend-api/f/conversation')
    );

    // Call original fetch first
    const response = await originalFetch.apply(this, args);

    // Only intercept successful chat conversation requests
    if (!isChat || !response.ok || !response.body) {
      return response;
    }

    const t0 = Date.now();
    let reqBody = null;

    try {
      if (typeof init.body === 'string') {
        reqBody = JSON.parse(init.body);
      }
    } catch (e) {
      // Silently handle parse errors
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
              // Parse SSE format: "event: delta\ndata: {...}"
              const lines = part.split('\n');
              let eventType = null;
              let data = null;

              for (const line of lines) {
                if (line.startsWith('event:')) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  data = line.slice(5).trim();
                }
              }

              // Skip if no data or if it's [DONE]
              if (!data || data === '[DONE]') continue;

              try {
                const evt = JSON.parse(data);

                // Handle SSE delta events: {p: "", o: "add", v: {message: {...}}}
                let messageToExtract = evt;
                if (eventType === 'delta' && evt.v?.message && evt.v.message.content?.parts) {
                  messageToExtract = { input_message: evt.v.message };
                }

                const delta = extractDelta(messageToExtract);
                if (delta) {
                  assistantText += delta;

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
                }
              } catch (e) {
                // Silently handle parse errors
              }
            }
          }
        } catch (error) {
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
})();
