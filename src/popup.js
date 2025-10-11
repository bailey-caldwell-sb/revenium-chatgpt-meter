// popup.js - Popup UI logic

/**
 * Get current ChatGPT tab
 */
async function getCurrentChatGPTTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (tab?.url?.includes('chat.openai.com') || tab?.url?.includes('chatgpt.com')) {
    return tab;
  }

  // If current tab is not ChatGPT, find any ChatGPT tab
  const chatTabs = await chrome.tabs.query({ url: ['https://chat.openai.com/*', 'https://chatgpt.com/*'] });
  return chatTabs[0] || null;
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p style="margin-top: 12px;">Loading dashboard...</p>
    </div>
  `;

  try {
    // Load settings to get API key
    const result = await chrome.storage.local.get('settings');
    const apiKey = result.settings?.openaiApiKey;

    // Load current session
    const sessionResponse = await chrome.runtime.sendMessage({ type: 'getSession' });
    const sessionData = sessionResponse.ok ? sessionResponse.totals : null;

    // If API key exists, fetch OpenAI usage data
    let openaiData = null;
    let openaiError = null;
    if (apiKey) {
      console.log('[Revenium] API key found, fetching OpenAI data...');
      try {
        const client = new OpenAIAPIClient(apiKey);
        const monthData = await client.getCurrentMonthUsage();
        console.log('[Revenium] OpenAI data fetched:', monthData);
        openaiData = {
          usage: parseUsageData(monthData.usage),
          subscription: monthData.subscription
        };
        console.log('[Revenium] Parsed OpenAI data:', openaiData);
      } catch (error) {
        console.error('[Revenium] Failed to fetch OpenAI data:', error);
        openaiError = error.message;
      }
    } else {
      console.log('[Revenium] No API key found in settings');
    }

    renderDashboard(sessionData, openaiData, openaiError, apiKey);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    renderEmptyState('Error loading dashboard data.');
  }
}

/**
 * Load session data (legacy function for compatibility)
 */
async function loadSessionData() {
  await loadDashboardData();
}

/**
 * Test OpenAI API
 */
async function testOpenAIAPI() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p style="margin-top: 12px;">Testing OpenAI API connection...</p>
    </div>
  `;

  try {
    // Get API key from settings
    const result = await chrome.storage.local.get('settings');
    const apiKey = result.settings?.openaiApiKey;

    if (!apiKey) {
      content.innerHTML = `
        <div class="empty-state">
          <p>⚠️ No API key configured</p>
          <p style="margin-top: 8px; font-size: 12px;">Go to Settings to add your OpenAI API key</p>
        </div>
        <div class="button-group">
          <button class="primary" id="open-settings">Open Settings</button>
        </div>
      `;
      document.getElementById('open-settings').addEventListener('click', openSettings);
      return;
    }

    // Create API client
    const client = new OpenAIAPIClient(apiKey);

    // Fetch current month usage
    const data = await client.getCurrentMonthUsage();

    // Parse the data
    const parsed = parseUsageData(data.usage);

    // Display results
    content.innerHTML = `
      <div class="section">
        <div class="section-title">✓ API Connection Successful</div>
        <div class="stat-card">
          <div class="stat-label">Total Cost (Current Month)</div>
          <div class="stat-value cost">$${parsed?.totalCost?.toFixed(2) || '0.00'}</div>
        </div>
        <div class="stat-card" style="margin-top: 12px;">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value">${parsed?.totalRequests || 0}</div>
        </div>
        <div class="stat-card" style="margin-top: 12px;">
          <div class="stat-label">Data Points</div>
          <div class="stat-value">${parsed?.dailyData?.length || 0} days</div>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border-radius: 8px;">
        <div style="font-size: 12px; color: #00ff88;">Raw API Response (first 500 chars):</div>
        <pre style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 8px; overflow-x: auto;">${JSON.stringify(data, null, 2).substring(0, 500)}...</pre>
      </div>
      <div class="button-group">
        <button id="back">Back to Session</button>
        <button class="primary" id="open-settings">Settings</button>
      </div>
    `;

    document.getElementById('back').addEventListener('click', loadSessionData);
    document.getElementById('open-settings').addEventListener('click', openSettings);

  } catch (error) {
    content.innerHTML = `
      <div class="empty-state">
        <p>❌ API Test Failed</p>
        <p style="margin-top: 8px; font-size: 12px; color: #ff6b6b;">${error.message}</p>
      </div>
      <div class="button-group">
        <button id="back">Back</button>
        <button class="primary" id="open-settings">Settings</button>
      </div>
    `;
    document.getElementById('back').addEventListener('click', loadSessionData);
    document.getElementById('open-settings').addEventListener('click', openSettings);
    console.error('OpenAI API test failed:', error);
  }
}

/**
 * Render full dashboard
 */
function renderDashboard(sessionData, openaiData, openaiError = null, hasApiKey = false) {
  const content = document.getElementById('content');

  let html = '';

  // OpenAI API Section
  if (openaiData && openaiData.usage) {
    const usage = openaiData.usage;
    const subscription = openaiData.subscription;

    // Budget tracking
    const budget = subscription?.hard_limit_usd || subscription?.soft_limit_usd || 120; // Default $120
    const spent = usage.totalCost || 0;
    const budgetPercent = Math.min((spent / budget) * 100, 100);
    const remaining = Math.max(budget - spent, 0);

    html += `
      <div class="section">
        <div class="section-title">October Budget</div>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 24px; font-weight: 700; color: #00ff88;">$${spent.toFixed(2)}</span>
            <span style="font-size: 16px; color: rgba(255,255,255,0.5);">/ $${budget.toFixed(0)}</span>
          </div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
            Resets in ${getDaysUntilMonthEnd()} days
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${budgetPercent}%; background: ${budgetPercent < 70 ? 'linear-gradient(90deg, #00ff88, #00d4ff)' : budgetPercent < 90 ? 'linear-gradient(90deg, #ffa500, #ff8c00)' : 'linear-gradient(90deg, #ff6b6b, #ff4444)'}; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Total Tokens</div>
        <div class="stat-card">
          <div class="stat-value">${formatNumber(usage.totalRequests * 1000)}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
            Estimated based on ${usage.dailyData?.length || 0} days of usage
          </div>
        </div>
        ${renderMiniChart(usage.dailyData, 'cost')}
      </div>

      <div class="section">
        <div class="section-title">Total Requests</div>
        <div class="stat-card">
          <div class="stat-value">${usage.totalRequests}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
            ${(usage.totalRequests / (usage.dailyData?.length || 1)).toFixed(1)} avg per day
          </div>
        </div>
        ${renderMiniChart(usage.dailyData, 'requests')}
      </div>
    `;
  } else if (hasApiKey && openaiError) {
    // API key exists but there was an error
    html += `
      <div class="section">
        <div style="text-align: center; padding: 20px; background: rgba(255, 100, 100, 0.1); border-radius: 8px; border: 1px solid rgba(255, 100, 100, 0.3);">
          <p style="color: #ff6b6b; margin-bottom: 8px;">⚠️ OpenAI API Error</p>
          <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">${openaiError}</p>
          <p style="font-size: 11px; color: rgba(255,255,255,0.4);">Check your API key in Settings or view the console for details</p>
        </div>
      </div>
    `;
  } else if (!hasApiKey) {
    // No API key configured
    html += `
      <div class="section">
        <div style="text-align: center; padding: 20px; background: rgba(255, 255, 136, 0.1); border-radius: 8px;">
          <p style="color: #ffff88; margin-bottom: 8px;">⚡ Enhanced Analytics Available</p>
          <p style="font-size: 12px; color: rgba(255,255,255,0.6);">Add your OpenAI API key to track official usage metrics, budgets, and historical data</p>
        </div>
      </div>
    `;
  }

  // Current Session Section
  if (sessionData) {
    html += `
      <div class="section">
        <div class="section-title">Current Session</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Cost</div>
            <div class="stat-value cost">$${sessionData.totalCostUSD.toFixed(4)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tokens</div>
            <div class="stat-value">${sessionData.totalTokens || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Context Used</div>
            <div class="stat-value">${sessionData.contextUsagePercent || 0}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Model</div>
            <div class="stat-value" style="font-size: 14px;">${sessionData.model || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Buttons
  html += `
    <div class="button-group">
      <button id="refresh">🔄 Refresh</button>
      ${sessionData ? '<button id="reset-session">Reset</button>' : ''}
      <button class="primary" id="open-settings">Settings</button>
    </div>
  `;

  content.innerHTML = html;

  // Add event listeners
  document.getElementById('refresh').addEventListener('click', loadDashboardData);
  if (sessionData) {
    document.getElementById('reset-session').addEventListener('click', resetSession);
  }
  document.getElementById('open-settings').addEventListener('click', openSettings);
}

/**
 * Render mini chart
 */
function renderMiniChart(dailyData, metric) {
  if (!dailyData || dailyData.length === 0) {
    return '';
  }

  const maxValue = Math.max(...dailyData.map(d => d[metric] || 0));
  const points = dailyData.slice(-30).map((d, i) => {
    const x = (i / Math.max(dailyData.slice(-30).length - 1, 1)) * 100;
    const y = 100 - ((d[metric] || 0) / maxValue) * 80; // 80% max height
    return `${x},${y}`;
  }).join(' ');

  return `
    <svg viewBox="0 0 100 40" style="width: 100%; height: 60px; margin-top: 12px;">
      <polyline
        points="${points}"
        fill="none"
        stroke="#00d4ff"
        stroke-width="2"
        style="vector-effect: non-scaling-stroke;"
      />
      ${dailyData.slice(-30).map((d, i) => {
        const x = (i / Math.max(dailyData.slice(-30).length - 1, 1)) * 100;
        const y = 100 - ((d[metric] || 0) / maxValue) * 80;
        return `<circle cx="${x}" cy="${y}" r="1.5" fill="#00ff88" />`;
      }).join('')}
    </svg>
  `;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Get days until end of month
 */
function getDaysUntilMonthEnd() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
}

/**
 * Render session data (legacy)
 */
function renderSession(totals, messages) {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="section">
      <div class="section-title">Current Session</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Cost</div>
          <div class="stat-value cost">$${totals.totalCostUSD.toFixed(4)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Tokens</div>
          <div class="stat-value">${totals.totalTokens || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Input Tokens</div>
          <div class="stat-value">${totals.totalPromptTokens}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Output Tokens</div>
          <div class="stat-value">${totals.totalCompletionTokens}</div>
        </div>
      </div>
    </div>

    ${messages.length > 0 ? `
      <div class="section">
        <div class="section-title">Recent Messages (${messages.length})</div>
        <div class="messages-list">
          ${messages.map(msg => `
            <div class="message-item">
              <div class="message-header">
                <span class="message-model">${msg.model}</span>
                <span class="message-cost">$${msg.totalCostUSD.toFixed(4)}</span>
              </div>
              <div class="message-details">
                ${msg.promptTokens} in / ${msg.completionTokens} out
                ${msg.latencyMs ? ` • ${msg.latencyMs}ms` : ''}
                ${msg.ttfbMs ? ` (TTFB: ${msg.ttfbMs}ms)` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="button-group">
      <button id="test-api">Test API</button>
      <button id="reset-session">Reset</button>
      <button class="primary" id="open-settings">Settings</button>
    </div>
  `;

  // Add event listeners
  document.getElementById('test-api').addEventListener('click', testOpenAIAPI);
  document.getElementById('reset-session').addEventListener('click', resetSession);
  document.getElementById('open-settings').addEventListener('click', openSettings);
}

/**
 * Render empty state
 */
function renderEmptyState(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
    </div>
    <div class="button-group">
      <button class="primary" id="open-settings">Settings</button>
    </div>
  `;

  document.getElementById('open-settings').addEventListener('click', openSettings);
}

/**
 * Reset session
 */
async function resetSession() {
  if (!confirm('Reset the current session? This will clear all metrics.')) return;

  try {
    await chrome.runtime.sendMessage({ type: 'reset' });
    await loadSessionData();
  } catch (error) {
    console.error('Failed to reset session:', error);
  }
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadSessionData();
});
