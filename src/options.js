// options.js - Settings page logic

const DEFAULT_PRICING = [
  { modelPrefix: 'gpt-4', inputPerK: 0.03, outputPerK: 0.06, encoding: 'cl100k_base' },
  { modelPrefix: 'gpt-3.5', inputPerK: 0.0015, outputPerK: 0.002, encoding: 'cl100k_base' },
  { modelPrefix: 'o1-preview', inputPerK: 0.015, outputPerK: 0.06, encoding: 'o200k_base' },
  { modelPrefix: 'o1-mini', inputPerK: 0.003, outputPerK: 0.012, encoding: 'o200k_base' }
];

const DEFAULT_SETTINGS = {
  pricing: DEFAULT_PRICING,
  ui: {
    position: 'right',
    compact: false,
    showTTFB: true
  },
  privacy: {
    storeHistory: true,
    redactUserText: true
  },
  openaiApiKey: null
};

let currentSettings = null;

/**
 * Load settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  currentSettings = result.settings || DEFAULT_SETTINGS;
  renderSettings();
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    // Collect pricing table data
    const pricing = [];
    const rows = document.querySelectorAll('#pricing-body tr');

    for (const row of rows) {
      const modelPrefix = row.querySelector('.model-prefix').value.trim();
      const encoding = row.querySelector('.encoding').value;
      const inputPerK = parseFloat(row.querySelector('.input-perk').value);
      const outputPerK = parseFloat(row.querySelector('.output-perk').value);

      if (modelPrefix && !isNaN(inputPerK) && !isNaN(outputPerK)) {
        pricing.push({ modelPrefix, encoding, inputPerK, outputPerK });
      }
    }

    // Collect UI settings
    const ui = {
      position: document.getElementById('position').value,
      compact: document.getElementById('compact-mode').checked,
      showTTFB: document.getElementById('show-ttfb').checked
    };

    // Collect privacy settings
    const privacy = {
      storeHistory: document.getElementById('store-history').checked,
      redactUserText: document.getElementById('redact-text').checked
    };

    // Collect API key
    const apiKey = document.getElementById('openai-api-key').value.trim() || null;

    const settings = { pricing, ui, privacy, openaiApiKey: apiKey };

    // Save to storage
    await chrome.storage.local.set({ settings });

    // Update service worker
    await chrome.runtime.sendMessage({ type: 'updateSettings', settings });

    currentSettings = settings;
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

/**
 * Reset to default settings
 */
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;

  currentSettings = DEFAULT_SETTINGS;
  await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  await chrome.runtime.sendMessage({ type: 'updateSettings', settings: DEFAULT_SETTINGS });

  renderSettings();
  showStatus('Settings reset to defaults', 'success');
}

/**
 * Render settings to UI
 */
function renderSettings() {
  // Render pricing table
  renderPricingTable();

  // Render UI settings
  document.getElementById('position').value = currentSettings.ui.position;
  document.getElementById('compact-mode').checked = currentSettings.ui.compact;
  document.getElementById('show-ttfb').checked = currentSettings.ui.showTTFB;

  // Render privacy settings
  document.getElementById('store-history').checked = currentSettings.privacy.storeHistory;
  document.getElementById('redact-text').checked = currentSettings.privacy.redactUserText;
}

/**
 * Render pricing table
 */
function renderPricingTable() {
  const tbody = document.getElementById('pricing-body');
  tbody.innerHTML = '';

  currentSettings.pricing.forEach((item, index) => {
    addPricingRow(item);
  });
}

/**
 * Add pricing row
 */
function addPricingRow(data = null) {
  const tbody = document.getElementById('pricing-body');
  const row = document.createElement('tr');

  const modelPrefix = data?.modelPrefix || '';
  const encoding = data?.encoding || 'cl100k_base';
  const inputPerK = data?.inputPerK || 0;
  const outputPerK = data?.outputPerK || 0;

  row.innerHTML = `
    <td><input type="text" class="model-prefix" value="${modelPrefix}" placeholder="gpt-4"></td>
    <td>
      <select class="encoding">
        <option value="cl100k_base" ${encoding === 'cl100k_base' ? 'selected' : ''}>cl100k_base</option>
        <option value="p50k_base" ${encoding === 'p50k_base' ? 'selected' : ''}>p50k_base</option>
        <option value="o200k_base" ${encoding === 'o200k_base' ? 'selected' : ''}>o200k_base</option>
      </select>
    </td>
    <td><input type="number" class="input-perk" value="${inputPerK}" step="0.0001" min="0"></td>
    <td><input type="number" class="output-perk" value="${outputPerK}" step="0.0001" min="0"></td>
    <td><button class="delete-btn">Delete</button></td>
  `;

  // Add delete handler
  row.querySelector('.delete-btn').addEventListener('click', () => {
    row.remove();
  });

  tbody.appendChild(row);
}

/**
 * Show status message
 */
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;

  setTimeout(() => {
    status.className = 'status';
  }, 3000);
}

/**
 * Show API key status message
 */
function showAPIKeyStatus(message, type) {
  const status = document.getElementById('api-key-status');
  status.textContent = message;
  status.className = `status ${type}`;

  setTimeout(() => {
    status.className = 'status';
  }, 5000);
}

/**
 * Test OpenAI API key
 */
async function testAPIKey() {
  const apiKey = document.getElementById('openai-api-key').value.trim();

  if (!apiKey) {
    showAPIKeyStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showAPIKeyStatus('Invalid API key format (should start with sk-)', 'error');
    return;
  }

  showAPIKeyStatus('Testing API key...', 'success');

  try {
    // Test the API key by making a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      showAPIKeyStatus('✓ API key is valid!', 'success');
    } else {
      const error = await response.json();
      showAPIKeyStatus(`✗ Invalid API key: ${error.error?.message || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showAPIKeyStatus(`✗ Connection failed: ${error.message}`, 'error');
  }
}

/**
 * Clear OpenAI API key
 */
async function clearAPIKey() {
  if (!confirm('Clear your OpenAI API key?')) return;

  document.getElementById('openai-api-key').value = '';
  const settings = currentSettings;
  settings.openaiApiKey = null;

  await chrome.storage.local.set({ settings });
  await chrome.runtime.sendMessage({ type: 'updateSettings', settings });

  showAPIKeyStatus('API key cleared', 'success');
}

/**
 * Load API key into field
 */
async function loadAPIKey() {
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings || DEFAULT_SETTINGS;

  if (settings.openaiApiKey) {
    document.getElementById('openai-api-key').value = settings.openaiApiKey;
  }
}

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadAPIKey();

  // Event listeners
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('reset').addEventListener('click', resetSettings);
  document.getElementById('add-pricing').addEventListener('click', () => addPricingRow());
  document.getElementById('test-api-key').addEventListener('click', testAPIKey);
  document.getElementById('clear-api-key').addEventListener('click', clearAPIKey);
});
