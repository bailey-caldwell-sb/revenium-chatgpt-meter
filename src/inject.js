// inject.js - Injected into page context to patch fetch

(function() {
  'use strict';

  // Prevent double injection
  if (window.__REVENIUM_INJECTED__) {
    console.log('[Revenium] Already injected, skipping...');
    return;
  }
  window.__REVENIUM_INJECTED__ = true;

  // Tiktoken tokenizer state
  let tiktokenReady = false;
  let tiktokenEncoders = {};

  // Initialize tiktoken
  async function initTiktoken() {
    if (tiktokenReady) return true;

    try {
      // Import tiktoken module
      const tiktokenModule = await import(chrome.runtime.getURL('src/vendor/tiktoken.min.js'));

      // Load WASM
      const wasmUrl = chrome.runtime.getURL('src/vendor/tiktoken_bg.wasm');
      await tiktokenModule.init((imports) => WebAssembly.instantiateStreaming(fetch(wasmUrl), imports));

      // Get encoders from the module
      const { get_encoding } = tiktokenModule;

      // Initialize encodings we need
      tiktokenEncoders.cl100k_base = get_encoding('cl100k_base');
      tiktokenEncoders.o200k_base = get_encoding('o200k_base');

      tiktokenReady = true;
      console.log('[Revenium] Tiktoken initialized successfully');
      return true;
    } catch (error) {
      console.error('[Revenium] Failed to initialize tiktoken:', error);
      return false;
    }
  }

  // Get encoding for model
  function getEncodingForModel(model) {
    if (!model) return 'cl100k_base';
    const modelLower = model.toLowerCase();

    // O1 series uses o200k_base
    if (modelLower.includes('o1') || modelLower.includes('o3')) {
      return 'o200k_base';
    }

    // GPT-4, GPT-3.5 use cl100k_base
    return 'cl100k_base';
  }

  // Tokenize text with tiktoken (with fallback)
  function encodeForModel(text, model) {
    if (!text) return [];

    // Try tiktoken if ready
    if (tiktokenReady) {
      try {
        const encodingName = getEncodingForModel(model);
        const encoder = tiktokenEncoders[encodingName];
        if (encoder) {
          return encoder.encode(text);
        }
      } catch (error) {
        console.warn('[Revenium] Tiktoken encoding failed, using fallback:', error);
      }
    }

    // Fallback: 4:1 approximation
    return new Array(Math.ceil(text.length / 4)).fill(0);
  }

  // Start tiktoken initialization (async, non-blocking)
  initTiktoken().catch(err => {
    console.warn('[Revenium] Tiktoken initialization failed, using fallback tokenizer:', err);
  });

  // Detect if model is a reasoning model (o1, o3 series)
  function isReasoningModel(model) {
    if (!model) return false;
    const modelLower = model.toLowerCase();
    return modelLower.includes('o1') || modelLower.includes('o3');
  }

  // Get reasoning token multiplier for model
  function getReasoningMultiplier(model) {
    if (!model) return 1;
    const modelLower = model.toLowerCase();

    if (modelLower.includes('o1-pro') || modelLower.includes('o3-pro')) {
      return 10; // o1-pro uses ~10x reasoning tokens
    }
    if (modelLower.includes('o1') || modelLower.includes('o3')) {
      return 3; // o1/o3 mini/preview use ~3x reasoning tokens
    }
    return 1;
  }

  // Count images in message content
  function countImages(messages) {
    if (!messages || !Array.isArray(messages)) return 0;

    let imageCount = 0;
    for (const msg of messages) {
      if (!msg.content) continue;

      // Content can be string or array
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image_url' || part.image_url) {
            imageCount++;
          }
        }
      }
    }
    return imageCount;
  }

  // Detect DALL-E image generation in response
  function detectImageGeneration(evt) {
    // Check for DALL-E content markers
    if (evt.message?.content?.content_type === 'multimodal_text') {
      // Check for image parts
      if (evt.message.content.parts) {
        const parts = Array.isArray(evt.message.content.parts)
          ? evt.message.content.parts
          : [evt.message.content.parts];

        for (const part of parts) {
          if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
            return 1; // Found generated image
          }
        }
      }
    }

    // Check for dalle in metadata
    if (evt.message?.metadata?.dalle_generation) {
      return 1;
    }

    return 0;
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
        const inputTokens = encodeForModel(inputText, model).length;

        // Count multimodal content
        const imageInputCount = countImages(reqBody?.messages || []);
        const hasReasoningModel = isReasoningModel(model);
        const reasoningMultiplier = getReasoningMultiplier(model);

        let imageOutputCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (!firstByte && value) {
              firstByte = true;
              tTFB = Date.now();
            }

            if (done) {
              const tDone = Date.now();
              const outputTokens = encodeForModel(assistantText, model).length;

              // Estimate reasoning tokens for o1/o3 models
              const estimatedReasoningTokens = hasReasoningModel
                ? outputTokens * (reasoningMultiplier - 1)
                : 0;

              const totalTokens = inputTokens + outputTokens + estimatedReasoningTokens;

              // Add image tokens (estimate 85 tokens per image for low detail)
              const imageInputTokens = imageInputCount * 85;

              // Send metrics via custom event
              window.dispatchEvent(new CustomEvent('revenium-metrics', {
                detail: {
                  model,
                  inputTokens,
                  outputTokens,
                  totalTokens,
                  latency: tDone - t0,
                  ttfb: tTFB ? tTFB - t0 : null,
                  conversationId: reqBody?.conversation_id,
                  imageInputCount,
                  imageOutputCount,
                  imageInputTokens,
                  hasReasoningModel,
                  reasoningMultiplier,
                  estimatedReasoningTokens
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

                // Check for image generation
                const generatedImages = detectImageGeneration(evt);
                if (generatedImages > 0) {
                  imageOutputCount += generatedImages;
                }

                // Handle SSE delta events: {p: "", o: "add", v: {message: {...}}}
                let messageToExtract = evt;
                if (eventType === 'delta' && evt.v?.message && evt.v.message.content?.parts) {
                  messageToExtract = { input_message: evt.v.message };
                }

                const delta = extractDelta(messageToExtract);
                if (delta) {
                  assistantText += delta;

                  // Send partial update
                  const partialOutputTokens = encodeForModel(assistantText, model).length;
                  const partialTotalTokens = inputTokens + partialOutputTokens;

                  window.dispatchEvent(new CustomEvent('revenium-partial', {
                    detail: {
                      model,
                      inputTokens,
                      outputTokens: partialOutputTokens,
                      totalTokens: partialTotalTokens,
                      imageInputCount,
                      imageOutputCount,
                      hasReasoningModel,
                      reasoningMultiplier
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
