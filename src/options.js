// options.js - Settings page logic

const DEFAULT_PRICING = [
  { modelPrefix: 'gpt-4', inputPerK: 0.03, outputPerK: 0.06, encoding: 'cl100k_base' },
  { modelPrefix: 'gpt-3.5', inputPerK: 0.0015, outputPerK: 0.002, encoding: 'cl100k_base' },
  { modelPrefix: 'o1-preview', inputPerK: 0.015, outputPerK: 0.06, encoding: 'o200k_base' },
  { modelPrefix: 'o1-mini', inputPerK: 0.003, outputPerK: 0.012, encoding: 'o200k_base' }
];

const DEFAULT_TAGS = [
  { id: 'work', name: 'Work', color: '#00d4ff', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'personal', name: 'Personal', color: '#00ff88', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'research', name: 'Research', color: '#ff00ff', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } },
  { id: 'acme', name: 'Acme Industries', color: '#ffa500', stats: { totalCost: 0, totalTokens: 0, messageCount: 0 } }
];

const DEFAULT_SETTINGS = {
  pricing: DEFAULT_PRICING,
  tags: DEFAULT_TAGS,
  ui: {
    position: 'right',
    compact: false,
    showTTFB: true
  },
  privacy: {
    storeHistory: true,
    redactUserText: true
  }
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
    const pricingRows = document.querySelectorAll('#pricing-body tr');

    for (const row of pricingRows) {
      const modelPrefix = row.querySelector('.model-prefix').value.trim();
      const encoding = row.querySelector('.encoding').value;
      const inputPerK = parseFloat(row.querySelector('.input-perk').value);
      const outputPerK = parseFloat(row.querySelector('.output-perk').value);

      if (modelPrefix && !isNaN(inputPerK) && !isNaN(outputPerK)) {
        pricing.push({ modelPrefix, encoding, inputPerK, outputPerK });
      }
    }

    // Collect tags data
    const tags = [];
    const tagRows = document.querySelectorAll('#tags-body tr');

    for (const row of tagRows) {
      const name = row.querySelector('.tag-name').value.trim();
      const color = row.querySelector('.tag-color').value;
      const id = row.dataset.tagId;

      if (name) {
        tags.push({
          id: id || crypto.randomUUID(),
          name,
          color,
          stats: { totalCost: 0, totalTokens: 0, messageCount: 0 }
        });
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

    const settings = { pricing, tags, ui, privacy };

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

  // Render tags table
  renderTagsTable();

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
 * Render tags table
 */
function renderTagsTable() {
  const tbody = document.getElementById('tags-body');
  tbody.innerHTML = '';

  const tags = currentSettings.tags || DEFAULT_TAGS;
  tags.forEach((tag) => {
    addTagRow(tag);
  });
}

/**
 * Add tag row
 */
function addTagRow(data = null) {
  const tbody = document.getElementById('tags-body');
  const row = document.createElement('tr');

  const id = data?.id || '';
  const name = data?.name || '';
  const color = data?.color || '#00d4ff';

  row.dataset.tagId = id;

  row.innerHTML = `
    <td><input type="text" class="tag-name" value="${name}" placeholder="Work"></td>
    <td><input type="color" class="tag-color" value="${color}"></td>
    <td>
      <div class="tag-preview" style="background: ${color}20; color: ${color};">
        <span class="tag-preview-dot" style="background: ${color};"></span>
        <span class="tag-preview-text">${name || 'Tag name'}</span>
      </div>
    </td>
    <td><button class="delete-btn js-delete-tag">Delete</button></td>
  `;

  // Update preview on change
  const nameInput = row.querySelector('.tag-name');
  const colorInput = row.querySelector('.tag-color');
  const preview = row.querySelector('.tag-preview');
  const previewDot = row.querySelector('.tag-preview-dot');
  const previewText = row.querySelector('.tag-preview-text');

  nameInput.addEventListener('input', () => {
    previewText.textContent = nameInput.value || 'Tag name';
  });

  colorInput.addEventListener('input', () => {
    const newColor = colorInput.value;
    preview.style.background = `${newColor}20`;
    preview.style.color = newColor;
    previewDot.style.background = newColor;
  });

  // Add delete handler
  row.querySelector('.js-delete-tag').addEventListener('click', () => {
    if (confirm('Delete this tag? This cannot be undone.')) {
      row.remove();
    }
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
 * Initialize
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Event listeners
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('reset').addEventListener('click', resetSettings);
  document.getElementById('add-pricing').addEventListener('click', () => addPricingRow());
  document.getElementById('add-tag').addEventListener('click', () => addTagRow());
});
