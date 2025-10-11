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
 * Load session data
 */
async function loadSessionData() {
  try {
    const tab = await getCurrentChatGPTTab();

    if (!tab) {
      renderEmptyState('No ChatGPT tab found. Open ChatGPT to start tracking.');
      return;
    }

    // Get session from service worker
    const response = await chrome.runtime.sendMessage({ type: 'getSession' });

    if (response.ok && response.totals) {
      renderSession(response.totals, response.perMessage || []);
    } else {
      renderEmptyState('No session data yet. Start a conversation on ChatGPT.');
    }
  } catch (error) {
    console.error('Failed to load session:', error);
    renderEmptyState('Error loading session data.');
  }
}

/**
 * Render session data
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
      <button id="reset-session">Reset Session</button>
      <button class="primary" id="open-settings">Settings</button>
    </div>
  `;

  // Add event listeners
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
