// content.js - Content script (simplified to just UI)

(async () => {
  console.log('[Revenium] Content script loading...');

  // Note: inject.js runs automatically via manifest.json with world:"MAIN"
  // This bypasses CSP and runs in the page context

  // Wait for ChatGPT's React app to be ready before creating overlay
  function waitForChatGPTReady() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const chatInput = document.querySelector('textarea[data-id], textarea[placeholder*="Message"], #prompt-textarea, textarea');
        const mainContent = document.querySelector('main, [role="main"], .flex.flex-col');

        if (chatInput || mainContent || document.querySelector('[class*="composer"]')) {
          clearInterval(checkInterval);
          console.log('[Revenium] ChatGPT UI detected, waiting for React...');
          // Extra delay to ensure React is fully initialized
          setTimeout(resolve, 3000);
        }
      }, 200);

      // Timeout after 20 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('[Revenium] Timeout waiting for ChatGPT, proceeding anyway...');
        resolve();
      }, 20000);
    });
  }

  console.log('[Revenium] Waiting for ChatGPT to be ready...');
  await waitForChatGPTReady();

  const DEFAULT_PRICING = [
    { modelPrefix: "gpt-4", inputPerK: 0.03, outputPerK: 0.06 },
    { modelPrefix: "gpt-3.5", inputPerK: 0.0015, outputPerK: 0.002 },
    { modelPrefix: "o1-preview", inputPerK: 0.015, outputPerK: 0.06 },
    { modelPrefix: "o1-mini", inputPerK: 0.003, outputPerK: 0.012 }
  ];

  let pricingTable = DEFAULT_PRICING;
  let overlay = null;
  let shadowRoot = null;

  // Load settings
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
    if (response?.ok) {
      pricingTable = response.settings?.pricing || DEFAULT_PRICING;
    }
  } catch (error) {
    // Extension context invalidated (extension was reloaded)
    if (error.message?.includes('Extension context invalidated')) {
      console.log('[Revenium] Extension was reloaded, please refresh the page');
      return;
    }
    console.error('[Revenium] Failed to load settings:', error);
  }

  function round4(num) {
    return Math.round(num * 10000) / 10000;
  }

  function computeCost(model, inTok, outTok) {
    const pricing = pricingTable.find(p => model?.startsWith(p.modelPrefix)) || pricingTable[0];
    const inputCost = (inTok / 1000) * pricing.inputPerK;
    const outputCost = (outTok / 1000) * pricing.outputPerK;
    return round4(inputCost + outputCost);
  }

  // Listen for metrics from injected script
  window.addEventListener('revenium-metrics', async (e) => {
    const { model, inputTokens, outputTokens, latency, ttfb, conversationId, contextLimit, contextUsagePercent } = e.detail;

    console.log('[Revenium] 📊 Received metrics from inject.js:', {
      model,
      inputTokens,
      outputTokens,
      conversationId
    });

    const metrics = {
      id: crypto.randomUUID(),
      conversationId,
      model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalCostUSD: computeCost(model, inputTokens, outputTokens),
      inputCostUSD: computeCost(model, inputTokens, 0),
      outputCostUSD: computeCost(model, 0, outputTokens),
      contextLimit,
      contextUsagePercent,
      latencyMs: latency,
      ttfbMs: ttfb,
      status: 'ok'
    };

    console.log('[Revenium] 💰 Computed costs:', {
      totalCost: metrics.totalCostUSD,
      inputCost: metrics.inputCostUSD,
      outputCost: metrics.outputCostUSD
    });

    try {
      const response = await chrome.runtime.sendMessage({ type: 'final', metrics });
      console.log('[Revenium] 📈 Service worker response:', response);
      if (response?.ok) {
        console.log('[Revenium] ✅ Updating overlay with totals:', response.totals);
        updateOverlay({ type: 'final', metrics, totals: response.totals });
      }
    } catch (error) {
      console.error('[Revenium] Failed to send metrics:', error);
    }
  });

  window.addEventListener('revenium-partial', (e) => {
    const { model, inputTokens, outputTokens } = e.detail;
    updateOverlay({
      type: 'partial',
      metrics: { model },
      totals: {
        totalTokens: inputTokens + outputTokens,
        totalCostUSD: computeCost(model, inputTokens, outputTokens)
      }
    });
  });

  function createOverlay() {
    if (!document.body) {
      setTimeout(createOverlay, 100);
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'revenium-meter-root';
    document.body.appendChild(overlay);

    shadowRoot = overlay.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        :host { all: initial; }
        .panel {
          position: fixed; top: 80px; right: 12px; z-index: 2147483647;
          font: 13px/1.3 ui-sans-serif, system-ui, sans-serif;
          background: rgba(28, 28, 33, 0.92); color: #fff;
          border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.25);
          backdrop-filter: blur(8px); padding: 12px 14px; width: 300px;
          pointer-events: auto;
        }
        .header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .title { font-size: 14px; font-weight: 600; color: #00d4ff; }
        .reset-btn {
          background: rgba(255,255,255,0.1); border: none; color: #fff;
          padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
        }
        .reset-btn:hover { background: rgba(255,255,255,0.2); }
        .kpi {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 12px;
        }
        .kpi-item { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; }
        .kpi-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #00d4ff; }
        .kpi-value.cost { color: #00ff88; }
        .context-bar {
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .context-label {
          font-size: 11px; color: rgba(255,255,255,0.6);
          margin-bottom: 6px; display: flex; justify-content: space-between;
        }
        .context-progress {
          height: 6px; background: rgba(255,255,255,0.1);
          border-radius: 3px; overflow: hidden; position: relative;
        }
        .context-fill {
          height: 100%; background: linear-gradient(90deg, #00ff88, #00d4ff);
          border-radius: 3px; transition: width 0.3s ease;
        }
        .context-fill.warning { background: linear-gradient(90deg, #ffa500, #ff8c00); }
        .context-fill.danger { background: linear-gradient(90deg, #ff6b6b, #ff4444); }
        .latest {
          font-size: 11px; color: rgba(255,255,255,0.5);
          margin-top: 8px; padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .spinner {
          display: inline-block; width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #00d4ff; border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
        <div class="context-bar">
          <div class="context-label">
            <span>Context Window</span>
            <span class="js-context-percent">0%</span>
          </div>
          <div class="context-progress">
            <div class="context-fill js-context-fill" style="width: 0%"></div>
          </div>
        </div>
        <div class="latest">
          <div>Latest: <span class="js-latest">-</span></div>
          <div>Model: <span class="js-model">-</span></div>
        </div>
      </div>
    `;

    shadowRoot.querySelector('.js-reset').addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'reset' });
        updateOverlay({ type: 'reset' });
      } catch (error) {
        console.error('[Revenium] Failed to reset:', error);
      }
    });

    console.log('[Revenium] Overlay created');
  }

  function updateOverlay(data) {
    if (!shadowRoot) return;

    const costEl = shadowRoot.querySelector('.js-cost');
    const tokensEl = shadowRoot.querySelector('.js-tokens');
    const latestEl = shadowRoot.querySelector('.js-latest');
    const modelEl = shadowRoot.querySelector('.js-model');
    const contextPercentEl = shadowRoot.querySelector('.js-context-percent');
    const contextFillEl = shadowRoot.querySelector('.js-context-fill');

    if (data.type === 'reset') {
      costEl.textContent = '$0.0000';
      tokensEl.textContent = '0';
      latestEl.textContent = '-';
      modelEl.textContent = '-';
      contextPercentEl.textContent = '0%';
      contextFillEl.style.width = '0%';
      contextFillEl.className = 'context-fill js-context-fill';
      return;
    }

    if (data.totals) {
      costEl.textContent = `$${data.totals.totalCostUSD.toFixed(4)}`;
      tokensEl.textContent = `${data.totals.totalTokens || 0}`;

      // Update context window bar
      const percent = data.totals.contextUsagePercent || 0;
      contextPercentEl.textContent = `${percent}%`;
      contextFillEl.style.width = `${Math.min(percent, 100)}%`;

      // Change color based on usage
      contextFillEl.className = 'context-fill js-context-fill';
      if (percent >= 90) {
        contextFillEl.classList.add('danger');
      } else if (percent >= 70) {
        contextFillEl.classList.add('warning');
      }
    }

    if (data.metrics) {
      modelEl.textContent = data.metrics.model || '-';

      if (data.type === 'final' && data.metrics.latencyMs) {
        latestEl.textContent = `${data.metrics.latencyMs}ms${data.metrics.ttfbMs ? ` (TTFB: ${data.metrics.ttfbMs}ms)` : ''}`;
      } else if (data.type === 'partial') {
        latestEl.innerHTML = '<span class="spinner"></span> Processing...';
      }
    }
  }

  // Watch for conversation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      const oldConvId = lastUrl.match(/\/c\/([^\/]+)/)?.[1];
      const newConvId = location.href.match(/\/c\/([^\/]+)/)?.[1];
      lastUrl = location.href;

      if (oldConvId !== newConvId) {
        try {
          chrome.runtime.sendMessage({ type: 'reset' });
          updateOverlay({ type: 'reset' });
        } catch (error) {
          console.error('[Revenium] Failed to reset on conversation change:', error);
        }
      }
    }
  }).observe(document, { subtree: true, childList: true });

  createOverlay();
  console.log('[Revenium] Content script initialized');
})();
