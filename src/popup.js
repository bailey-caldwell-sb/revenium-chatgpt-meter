// popup.js - Popup UI logic

let currentTab = 'session'; // 'session' or 'reports'

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
 * Switch tabs
 */
function switchTab(tabName) {
  currentTab = tabName;

  // Update tab button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Load appropriate content
  if (tabName === 'session') {
    loadSessionData();
  } else if (tabName === 'reports') {
    loadReportsData();
  }
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
 * Load reports data
 */
async function loadReportsData() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p style="margin-top: 12px;">Loading reports...</p>
    </div>
  `;

  try {
    // Get last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await chrome.runtime.sendMessage({
      type: 'getTagReport',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    if (response?.ok) {
      renderReports(response.report);
    } else {
      renderEmptyReports();
    }
  } catch (error) {
    console.error('[Revenium] Failed to load reports:', error);
    renderEmptyReports();
  }
}

/**
 * Render session data
 */
function renderSession(sessionData) {
  const content = document.getElementById('content');

  const tagBadge = sessionData.tagName ? `
    <div class="tag-badge" style="background: ${sessionData.tagColor}20; color: ${sessionData.tagColor};">
      <span class="tag-dot" style="background: ${sessionData.tagColor};"></span>
      ${sessionData.tagName}
    </div>
  ` : '';

  const html = `
    <div class="section">
      <div class="section-title">
        Current Session
        ${tagBadge}
      </div>
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
 * Render reports
 */
function renderReports(report) {
  const content = document.getElementById('content');

  // Filter out tags with no usage
  const activeReport = report.filter(item => item.totalCost > 0 || item.messageCount > 0);

  if (activeReport.length === 0) {
    renderEmptyReports();
    return;
  }

  // Sort by cost descending
  activeReport.sort((a, b) => b.totalCost - a.totalCost);

  // Calculate total
  const totalCost = activeReport.reduce((sum, item) => sum + item.totalCost, 0);
  const totalTokens = activeReport.reduce((sum, item) => sum + item.totalTokens, 0);

  const itemsHtml = activeReport.map(item => {
    const percentage = totalCost > 0 ? ((item.totalCost / totalCost) * 100).toFixed(1) : 0;
    return `
      <div class="report-item">
        <div class="report-header">
          <div class="report-tag">
            <span class="tag-dot" style="background: ${item.color};"></span>
            <span class="tag-name">${item.name}</span>
          </div>
          <div class="report-cost">$${item.totalCost.toFixed(4)}</div>
        </div>
        <div class="report-details">
          <div class="report-stat">${item.totalTokens.toLocaleString()} tokens</div>
          <div class="report-stat">${item.messageCount} messages</div>
          <div class="report-stat">${percentage}%</div>
        </div>
        <div class="report-bar">
          <div class="report-bar-fill" style="width: ${percentage}%; background: ${item.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <div class="section">
      <div class="section-title">Tag Report (Last 30 Days)</div>
      <div class="stats-grid" style="margin-bottom: 16px;">
        <div class="stat-card">
          <div class="stat-label">Total Cost</div>
          <div class="stat-value cost">$${totalCost.toFixed(4)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Tokens</div>
          <div class="stat-value">${totalTokens.toLocaleString()}</div>
        </div>
      </div>
      <div class="report-list">
        ${itemsHtml}
      </div>
    </div>

    <div class="button-group">
      <button id="refresh-reports-btn">Refresh</button>
      <button class="primary" id="settings-btn">Settings</button>
    </div>
  `;

  content.innerHTML = html;

  // Add event listeners
  document.getElementById('refresh-reports-btn').addEventListener('click', loadReportsData);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

/**
 * Render empty reports
 */
function renderEmptyReports() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="empty-state">
      <p>No tagged conversations yet</p>
      <p style="margin-top: 8px; font-size: 12px;">Tag conversations to track costs by category</p>
    </div>
    <div class="button-group">
      <button class="primary" id="settings-btn">Settings</button>
    </div>
  `;

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
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Load initial tab
  switchTab('session');
});
