// content.js - Content script (simplified to just UI)

(async () => {

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
          // Extra delay to ensure React is fully initialized
          setTimeout(resolve, 3000);
        }
      }, 200);

      // Timeout after 20 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 20000);
    });
  }
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
  let tags = [];
  let currentTag = null;

  // Load settings and tags
  try {
    const settingsResponse = await chrome.runtime.sendMessage({ type: 'getSettings' });
    if (settingsResponse?.ok) {
      pricingTable = settingsResponse.settings?.pricing || DEFAULT_PRICING;
    }

    const tagsResponse = await chrome.runtime.sendMessage({ type: 'getTags' });
    if (tagsResponse?.ok) {
      tags = tagsResponse.tags || [];
    }
  } catch (error) {
    // Extension context invalidated - exit silently
    if (error.message?.includes('Extension context invalidated')) {
      return;
    }
  }

  function round6(num) {
    return Math.round(num * 1000000) / 1000000;
  }

  function computeCost(model, inTok, outTok) {
    const pricing = pricingTable.find(p => model?.startsWith(p.modelPrefix)) || pricingTable[0];
    const inputCost = (inTok / 1000) * pricing.inputPerK;
    const outputCost = (outTok / 1000) * pricing.outputPerK;
    return round6(inputCost + outputCost);
  }

  function computeMultimodalCost(model, metrics) {
    const pricing = pricingTable.find(p => model?.startsWith(p.modelPrefix)) || pricingTable[0];

    // Text costs
    const inputCost = (metrics.inputTokens / 1000) * pricing.inputPerK;
    const outputCost = (metrics.outputTokens / 1000) * pricing.outputPerK;

    // Image costs
    const imageInputCost = (metrics.imageInputCount || 0) * (pricing.imageInputCost || 0);
    const imageOutputCost = (metrics.imageOutputCount || 0) * (pricing.imageOutputCost || 0);

    // Reasoning costs (estimated)
    const reasoningTokens = metrics.estimatedReasoningTokens || 0;
    const reasoningCost = (reasoningTokens / 1000) * pricing.outputPerK; // Reasoning billed as output

    return {
      textCost: round6(inputCost + outputCost),
      imageCost: round6(imageInputCost + imageOutputCost),
      reasoningCost: round6(reasoningCost),
      totalCost: round6(inputCost + outputCost + imageInputCost + imageOutputCost + reasoningCost),
      inputCostUSD: round6(inputCost),
      outputCostUSD: round6(outputCost),
      imageCostUSD: round6(imageInputCost + imageOutputCost),
      reasoningCostUSD: round6(reasoningCost)
    };
  }

  // Listen for metrics from injected script
  window.addEventListener('revenium-metrics', async (e) => {
    const {
      model,
      inputTokens,
      outputTokens,
      latency,
      ttfb,
      conversationId,
      imageInputCount,
      imageOutputCount,
      imageInputTokens,
      hasReasoningModel,
      reasoningMultiplier,
      estimatedReasoningTokens
    } = e.detail;

    // Calculate multimodal costs
    const costs = computeMultimodalCost(model, {
      inputTokens,
      outputTokens,
      imageInputCount,
      imageOutputCount,
      estimatedReasoningTokens
    });

    const metrics = {
      id: crypto.randomUUID(),
      conversationId,
      model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalCostUSD: costs.totalCost,
      inputCostUSD: costs.inputCostUSD,
      outputCostUSD: costs.outputCostUSD,
      imageCostUSD: costs.imageCostUSD,
      reasoningCostUSD: costs.reasoningCostUSD,
      imageInputCount: imageInputCount || 0,
      imageOutputCount: imageOutputCount || 0,
      imageInputTokens: imageInputTokens || 0,
      hasReasoningModel: hasReasoningModel || false,
      reasoningMultiplier: reasoningMultiplier || 1,
      estimatedReasoningTokens: estimatedReasoningTokens || 0,
      latencyMs: latency,
      ttfbMs: ttfb,
      status: 'ok'
    };

    try {
      const response = await chrome.runtime.sendMessage({ type: 'final', metrics });
      if (response?.ok) {
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
        .tag-selector {
          margin-bottom: 12px; position: relative;
        }
        .tag-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
        .tag-dropdown {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.08); padding: 8px 10px;
          border-radius: 6px; cursor: pointer; position: relative;
        }
        .tag-dropdown:hover { background: rgba(255,255,255,0.12); }
        .tag-current {
          display: flex; align-items: center; gap: 6px; flex: 1;
        }
        .tag-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--tag-color, #666);
        }
        .tag-name { font-size: 12px; color: #fff; }
        .tag-arrow { font-size: 10px; color: rgba(255,255,255,0.5); }
        .tag-menu {
          position: absolute; top: 100%; left: 0; right: 0;
          background: rgba(40, 40, 45, 0.98); border-radius: 6px;
          margin-top: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          max-height: 200px; overflow-y: auto; z-index: 10000;
          display: none;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .tag-menu.open { display: block; }
        .tag-menu-item {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; cursor: pointer;
          transition: background 0.15s;
        }
        .tag-menu-item:hover { background: rgba(255,255,255,0.15); }
        .tag-menu-item.selected { background: rgba(0, 212, 255, 0.25); }
        .tag-menu-item:first-child { border-radius: 5px 5px 0 0; }
        .tag-menu-item:last-child { border-radius: 0 0 5px 5px; }
        .kpi {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 12px;
        }
        .kpi-item { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; }
        .kpi-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #00d4ff; }
        .kpi-value.cost { color: #00ff88; }
        .multimodal-indicators {
          display: flex; gap: 8px; margin-top: 8px;
          font-size: 11px; color: rgba(255,255,255,0.6);
        }
        .multimodal-indicator {
          display: flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.05); padding: 4px 8px;
          border-radius: 4px;
        }
        .cost-breakdown {
          font-size: 10px; color: rgba(255,255,255,0.4);
          margin-top: 6px; line-height: 1.4;
        }
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
        <div class="tag-selector">
          <div class="tag-label">Tag this conversation</div>
          <div class="tag-dropdown js-tag-dropdown">
            <div class="tag-current">
              <div class="tag-dot js-tag-dot" style="--tag-color: #666"></div>
              <span class="tag-name js-tag-name">No tag</span>
            </div>
            <span class="tag-arrow">▼</span>
          </div>
          <div class="tag-menu js-tag-menu">
            <div class="tag-menu-item js-tag-item" data-tag-id="">
              <div class="tag-dot" style="--tag-color: #666"></div>
              <span class="tag-name">No tag</span>
            </div>
          </div>
        </div>
        <div class="kpi">
          <div class="kpi-item">
            <div class="kpi-label">Cost</div>
            <div class="kpi-value cost js-cost">$0.000000</div>
            <div class="cost-breakdown js-cost-breakdown"></div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">Tokens</div>
            <div class="kpi-value js-tokens">0</div>
          </div>
        </div>
        <div class="multimodal-indicators js-multimodal" style="display: none;">
          <div class="multimodal-indicator js-images" style="display: none;">
            📷 <span class="js-image-count">0</span>
          </div>
          <div class="multimodal-indicator js-reasoning" style="display: none;">
            🧠 reasoning
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
        // Silently handle errors
      }
    });

    // Tag dropdown functionality
    const dropdown = shadowRoot.querySelector('.js-tag-dropdown');
    const menu = shadowRoot.querySelector('.js-tag-menu');

    dropdown.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    // Close menu when clicking outside (listen on shadow root)
    shadowRoot.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Also close when clicking outside the panel
    document.addEventListener('click', (e) => {
      if (!overlay.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Populate tag menu
    renderTagMenu();
  }

  function renderTagMenu() {
    if (!shadowRoot) return;

    const menu = shadowRoot.querySelector('.js-tag-menu');
    menu.innerHTML = `
      <div class="tag-menu-item js-tag-item" data-tag-id="">
        <div class="tag-dot" style="--tag-color: #666"></div>
        <span class="tag-name">No tag</span>
      </div>
    `;

    tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = `tag-menu-item js-tag-item${currentTag?.id === tag.id ? ' selected' : ''}`;
      item.dataset.tagId = tag.id;
      item.innerHTML = `
        <div class="tag-dot" style="--tag-color: ${tag.color}"></div>
        <span class="tag-name">${tag.name}</span>
      `;
      menu.appendChild(item);
    });

    // Add click handlers
    menu.querySelectorAll('.js-tag-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tagId = item.dataset.tagId || null;
        await setTag(tagId);
        menu.classList.remove('open');
      });
    });
  }

  function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  async function setTag(tagId) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'setTag', tagId });
      if (response?.ok) {
        const tag = tags.find(t => t.id === tagId);
        currentTag = tag || null;
        updateTagDisplay();
      }
    } catch (error) {
      console.error('[Revenium] Failed to set tag:', error);
    }
  }

  function updateTagDisplay() {
    if (!shadowRoot) return;

    const dot = shadowRoot.querySelector('.js-tag-dot');
    const name = shadowRoot.querySelector('.js-tag-name');

    if (currentTag) {
      dot.style.setProperty('--tag-color', currentTag.color);
      name.textContent = currentTag.name;
    } else {
      dot.style.setProperty('--tag-color', '#666');
      name.textContent = 'No tag';
    }

    // Update selected state in menu
    shadowRoot.querySelectorAll('.js-tag-item').forEach(item => {
      if (item.dataset.tagId === (currentTag?.id || '')) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function updateOverlay(data) {
    if (!shadowRoot) return;

    const costEl = shadowRoot.querySelector('.js-cost');
    const tokensEl = shadowRoot.querySelector('.js-tokens');
    const latestEl = shadowRoot.querySelector('.js-latest');
    const modelEl = shadowRoot.querySelector('.js-model');
    const costBreakdownEl = shadowRoot.querySelector('.js-cost-breakdown');
    const multimodalEl = shadowRoot.querySelector('.js-multimodal');
    const imagesEl = shadowRoot.querySelector('.js-images');
    const imageCountEl = shadowRoot.querySelector('.js-image-count');
    const reasoningEl = shadowRoot.querySelector('.js-reasoning');

    if (data.type === 'reset') {
      costEl.textContent = '$0.000000';
      tokensEl.textContent = '0';
      latestEl.textContent = '-';
      modelEl.textContent = '-';
      costBreakdownEl.textContent = '';
      multimodalEl.style.display = 'none';
      imagesEl.style.display = 'none';
      reasoningEl.style.display = 'none';
      return;
    }

    if (data.totals) {
      costEl.textContent = `$${data.totals.totalCostUSD.toFixed(6)}`;
      tokensEl.textContent = `${data.totals.totalTokens || 0}`;

      // Show cost breakdown if multimodal
      if (data.totals.hasMultimodal) {
        const breakdown = [];
        if (data.totals.textCostUSD > 0) {
          breakdown.push(`Text: $${data.totals.textCostUSD.toFixed(6)}`);
        }
        if (data.totals.imageCostUSD > 0) {
          breakdown.push(`Images: $${data.totals.imageCostUSD.toFixed(6)}`);
        }
        if (data.totals.reasoningCostUSD > 0) {
          breakdown.push(`Reasoning: $${data.totals.reasoningCostUSD.toFixed(6)}`);
        }
        costBreakdownEl.textContent = breakdown.join(' | ');
      } else {
        costBreakdownEl.textContent = '';
      }

      // Show multimodal indicators
      const hasImages = (data.totals.totalImageInputs || 0) > 0 || (data.totals.totalImageOutputs || 0) > 0;
      const hasReasoning = (data.totals.totalReasoningTokens || 0) > 0;

      if (hasImages || hasReasoning) {
        multimodalEl.style.display = 'flex';

        if (hasImages) {
          const totalImages = (data.totals.totalImageInputs || 0) + (data.totals.totalImageOutputs || 0);
          imageCountEl.textContent = totalImages;
          imagesEl.style.display = 'flex';
        } else {
          imagesEl.style.display = 'none';
        }

        if (hasReasoning) {
          reasoningEl.style.display = 'flex';
        } else {
          reasoningEl.style.display = 'none';
        }
      } else {
        multimodalEl.style.display = 'none';
      }

      // Update tag display if session has tag info
      if (data.totals.tagId) {
        const tag = tags.find(t => t.id === data.totals.tagId);
        if (tag) {
          currentTag = tag;
          updateTagDisplay();
        }
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
