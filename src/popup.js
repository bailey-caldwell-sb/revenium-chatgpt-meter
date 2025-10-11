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
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p style="margin-top: 12px;">Loading session data...</p>
    </div>
  `;

  try {
    const sessionResponse = await chrome.runtime.sendMessage({ type: 'getSession' });
    const sessionData = sessionResponse.ok ? sessionResponse.totals : null;

    if (sessionData) {
      renderSession(sessionData);
    } else {
      renderEmptyState();
    }
  } catch (error) {
    renderEmptyState();
  }
}

/**
 * Render session data
 */
function renderSession(sessionData) {
  const content = document.getElementById('content');

  const html = `
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
          <div class="stat-label">Model</div>
          <div class="stat-value" style="font-size: 14px;">${sessionData.model || 'N/A'}</div>
        </div>
      </div>
    </div>

    <div class="button-group">
      <button id="refresh-btn">Refresh</button>
      <button id="reset-btn">Reset Session</button>
      <button class="primary" id="settings-btn">Settings</button>
    </div>
  `;

  content.innerHTML = html;

  // Add event listeners
  document.getElementById('refresh-btn').addEventListener('click', loadSessionData);
  document.getElementById('reset-btn').addEventListener('click', resetSession);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

/**
 * Render empty state
 */
function renderEmptyState() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="empty-state">
      <p>No active session</p>
      <p style="margin-top: 8px; font-size: 12px;">Start a conversation on ChatGPT to see metrics</p>
    </div>
    <div class="button-group">
      <button class="primary" id="settings-btn">Settings</button>
    </div>
  `;

  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

/**
 * Reset current session
 */
async function resetSession() {
  try {
    await chrome.runtime.sendMessage({ type: 'reset' });
    await loadSessionData();
  } catch (error) {
    // Handle error silently
  }
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Initialize
document.addEventListener('DOMContentLoaded', loadSessionData);
