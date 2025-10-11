// content.js - Content script with fetch patching and overlay UI

(async () => {
  console.log('[Revenium] Content script loading...');

  // Load meter-core.js
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/meter-core.js');
  script.onload = () => {
    console.log('[Revenium] meter-core.js loaded');
    init();
  };
  (document.head || document.documentElement).appendChild(script);

  let pricingTable = [];
  let settings = null;

  /**
   * Initialize extension
   */
  async function init() {
    // Load settings
    const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
    if (response.ok) {
      settings = response.settings;
      pricingTable = settings.pricing || window.MeterCore.DEFAULT_PRICING;
    }

    // Initialize tokenizer
    await window.MeterCore.initTokenizer();

    // Patch fetch
    patchFetch();

    // Create overlay
    createOverlay();

    // Listen for URL changes (new conversation)
    watchForConversationChanges();

    console.log('[Revenium] Content script initialized');
  }

  /**
   * Patch window.fetch to intercept ChatGPT API calls
   */
  function patchFetch() {
    const _fetch = window.fetch;

    window.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : input.url;
      const method = (init?.method || 'GET').toUpperCase();
      const isChat = url.includes('/backend-api/conversation') && method === 'POST';

      const t0 = performance.now();
      let reqBodyText;

      try {
        if (typeof init?.body === 'string') {
          reqBodyText = init.body;
        }
      } catch (e) {
        console.warn('[Revenium] Failed to capture request body:', e);
      }

      const res = await _fetch(input, init);

      if (!isChat) return res;

      // Clone the readable body with tee()
      const reader = res.body?.getReader?.();
      if (!reader) return res;

      const { readable, writable } = new TransformStream();
      const teeWriter = writable.getWriter();
      let firstByteSeen = false;

      // Process stream asynchronously
      (async () => {
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        let totalAssistantText = '';

        // Parse request and build initial metrics
        let metrics = window.MeterCore.buildInitialMetrics(reqBodyText, url, t0);

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (!firstByteSeen && value) {
              firstByteSeen = true;
              metrics.tTFB = performance.now();
              metrics.ttfbMs = Math.round(metrics.tTFB - metrics.t0);
              updateOverlay({ type: 'ttfb', metrics });
            }

            if (done) break;

            // Mirror chunks to the page
            await teeWriter.write(value);

            const chunk = decoder.decode(value, { stream: true });
            buf += chunk;

            // Process SSE lines: "data: {json}\n\n"
            const parts = buf.split('\n\n');
            buf = parts.pop() ?? '';

            for (const part of parts) {
              if (!part.startsWith('data:')) continue;
              const json = part.slice(5).trim();
              if (json === '[DONE]') continue;

              try {
                const evt = JSON.parse(json);
                const delta = window.MeterCore.extractDeltaText(evt);

                if (delta) {
                  totalAssistantText += delta;
                  throttleTokenizeAndReport(metrics, totalAssistantText);
                }

                if (evt?.conversation_id && !metrics.conversationId) {
                  metrics.conversationId = evt.conversation_id;
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }

          metrics.tDone = performance.now();
          metrics.latencyMs = Math.round(metrics.tDone - metrics.t0);

          // Final tokenization and cost calculation
          window.MeterCore.finalizeMetrics(metrics, totalAssistantText, pricingTable);

          // Send to service worker
          const response = await chrome.runtime.sendMessage({
            type: 'final',
            metrics
          });

          if (response.ok) {
            updateOverlay({ type: 'final', metrics, totals: response.totals });
          }
        } catch (e) {
          metrics.status = 'error';
          metrics.errorMessage = String(e?.message || e);
          console.error('[Revenium] Stream processing error:', e);
          updateOverlay({ type: 'error', metrics });
        } finally {
          await teeWriter.close();
        }
      })();

      // Return proxied response
      const resHeaders = new Headers(res.headers);
      const proxied = new Response(readable, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders
      });

      return proxied;
    };

    console.log('[Revenium] Fetch patched successfully');
  }

  /**
   * Throttled tokenization for live updates
   */
  let tokTimer = null;
  function throttleTokenizeAndReport(metrics, assistantText) {
    if (tokTimer) return;

    tokTimer = setTimeout(() => {
      tokTimer = null;
      const outTok = window.MeterCore.encodeForModel(metrics.model, assistantText).length;
      metrics.completionTokens = outTok;
      const costs = window.MeterCore.computeCostUSD(
        metrics.model,
        metrics.promptTokens,
        outTok,
        pricingTable
      );
      Object.assign(metrics, costs);

      updateOverlay({ type: 'partial', metrics });
    }, 90);
  }

  /**
   * Create overlay UI
   */
  let overlay = null;
  let shadowRoot = null;

  function createOverlay() {
    // Create host element
    overlay = document.createElement('div');
    overlay.id = 'revenium-meter-root';
    document.body.appendChild(overlay);

    // Attach shadow DOM
    shadowRoot = overlay.attachShadow({ mode: 'open' });

    // Create UI structure
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
        }
        .panel {
          position: fixed;
          top: 80px;
          right: 12px;
          z-index: 2147483647;
          font: 13px/1.3 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background: rgba(28, 28, 33, 0.92);
          color: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(8px);
          padding: 12px 14px;
          width: 300px;
          pointer-events: auto;
        }
        .panel.left {
          left: 12px;
          right: auto;
        }
        .panel.bottom {
          top: auto;
          bottom: 12px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
        }
        .reset-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        }
        .reset-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .kpi {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .kpi-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 8px;
          border-radius: 6px;
        }
        .kpi-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 20px;
          font-weight: 700;
          color: #00d4ff;
        }
        .kpi-value.cost {
          color: #00ff88;
        }
        .kpi-value.latency {
          color: #ff9500;
        }
        .latest {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #00d4ff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <div class="panel">
        <div class="header">
          <div class="title">Revenium Meter</div>
          <button class="reset-btn js-reset">Reset</button>
        </div>
        <div class="kpi">
          <div class="kpi-item">
            <div class="kpi-label">Cost</div>
            <div class="kpi-value cost js-cost">$0.0000</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">Tokens</div>
            <div class="kpi-value js-tokens">0</div>
          </div>
        </div>
        <div class="latest">
          <div>Latest: <span class="js-latest">-</span></div>
          <div>Model: <span class="js-model">-</span></div>
        </div>
      </div>
    `;

    // Add reset button listener
    shadowRoot.querySelector('.js-reset').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'reset' });
      updateOverlay({ type: 'reset' });
    });

    console.log('[Revenium] Overlay created');
  }

  /**
   * Update overlay with new data
   */
  function updateOverlay(data) {
    if (!shadowRoot) return;

    const costEl = shadowRoot.querySelector('.js-cost');
    const tokensEl = shadowRoot.querySelector('.js-tokens');
    const latestEl = shadowRoot.querySelector('.js-latest');
    const modelEl = shadowRoot.querySelector('.js-model');

    if (data.type === 'reset') {
      costEl.textContent = '$0.0000';
      tokensEl.textContent = '0';
      latestEl.textContent = '-';
      modelEl.textContent = '-';
      return;
    }

    if (data.totals) {
      costEl.textContent = `$${data.totals.totalCostUSD.toFixed(4)}`;
      tokensEl.textContent = `${data.totals.totalTokens || 0}`;
    }

    if (data.metrics) {
      modelEl.textContent = data.metrics.model || '-';

      if (data.type === 'final' && data.metrics.latencyMs) {
        latestEl.textContent = `${data.metrics.latencyMs}ms (TTFB: ${data.metrics.ttfbMs || '-'}ms)`;
      } else if (data.type === 'partial') {
        latestEl.innerHTML = '<span class="spinner"></span> Processing...';
      }
    }
  }

  /**
   * Watch for conversation changes (URL changes)
   */
  let lastUrl = location.href;
  function watchForConversationChanges() {
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        const oldUrl = lastUrl;
        lastUrl = location.href;

        // Check if we switched conversations
        const oldConvId = oldUrl.match(/\/c\/([^\/]+)/)?.[1];
        const newConvId = lastUrl.match(/\/c\/([^\/]+)/)?.[1];

        if (oldConvId !== newConvId) {
          console.log('[Revenium] Conversation changed, resetting session');
          chrome.runtime.sendMessage({ type: 'reset' });
          updateOverlay({ type: 'reset' });
        }
      }
    });

    observer.observe(document, { subtree: true, childList: true });
  }
})();
