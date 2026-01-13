/**
 * Side Panel UI logic
 * Handles user interactions in the extension side panel
 */

// Recommended models for cover letter generation
const RECOMMENDED_MODELS = [
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-pro-1.5",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
];

// State
let allModels = [];
let filteredModels = [];
let selectedModelId = null;
let currentCategory = "recommended";
let researchModeEnabled = false;
let selectedResumeHash = null;
let hhResumes = [];

// DOM Elements
const elements = {
  // HH.ru Status
  hhStatus: document.getElementById("hh-status"),
  hhStatusIcon: document.getElementById("hh-status-icon"),
  hhStatusTitle: document.getElementById("hh-status-title"),
  hhStatusText: document.getElementById("hh-status-text"),
  openHHBtn: document.getElementById("open-hh-btn"),

  // Model
  modelSearch: document.getElementById("model-search"),
  refreshModelsBtn: document.getElementById("refresh-models-btn"),
  modelList: document.getElementById("model-list"),
  selectedModelInfo: document.getElementById("selected-model-info"),
  selectedModelName: document.getElementById("selected-model-name"),
  selectedModelPrice: document.getElementById("selected-model-price"),
  selectedModelContext: document.getElementById("selected-model-context"),

  // API Key
  apiKeyInput: document.getElementById("api-key-input"),
  toggleApiKey: document.getElementById("toggle-api-key"),

  // Actions
  saveBtn: document.getElementById("save-btn"),
  settingsBtn: document.getElementById("settings-btn"),

  // Toast
  toastContainer: document.getElementById("toast-container"),

  // Resumes
  resumesList: document.getElementById("resumes-list"),
  refreshResumesBtn: document.getElementById("refresh-resumes-btn"),

  // Research Mode
  researchToggle: document.getElementById("research-toggle"),
  researchStats: document.getElementById("research-stats"),
  capturedCount: document.getElementById("captured-count"),
  viewRequestsBtn: document.getElementById("view-requests-btn"),
  exportRequestsBtn: document.getElementById("export-requests-btn"),
  clearRequestsBtn: document.getElementById("clear-requests-btn"),
  requestViewer: document.getElementById("request-viewer"),
  requestList: document.getElementById("request-list"),
  closeViewerBtn: document.getElementById("close-viewer-btn"),
};

/**
 * Initialize panel
 */
async function init() {
  // Bind event listeners
  elements.modelSearch.addEventListener("input", handleModelSearch);
  elements.refreshModelsBtn.addEventListener("click", () => loadModels(true));
  elements.toggleApiKey.addEventListener("click", toggleApiKeyVisibility);
  elements.saveBtn.addEventListener("click", saveSettings);
  elements.settingsBtn.addEventListener("click", openOptionsPage);

  // Resumes
  elements.refreshResumesBtn?.addEventListener("click", () =>
    loadHHResumes(true),
  );

  // Category buttons
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleCategoryChange(btn.dataset.category),
    );
  });

  // Research Mode
  elements.researchToggle.addEventListener("change", handleResearchToggle);
  elements.viewRequestsBtn.addEventListener("click", showRequestViewer);
  elements.exportRequestsBtn.addEventListener("click", exportRequests);
  elements.clearRequestsBtn.addEventListener("click", clearRequests);
  elements.closeViewerBtn.addEventListener("click", hideRequestViewer);

  // Load research mode state
  await loadResearchMode();

  // Load saved settings
  await loadSettings();

  // Check HH.ru auth status (uses session cookies)
  await checkHHAuthStatus();

  // Load HH resumes
  await loadHHResumes();

  // Load models
  await loadModels();
}

/**
 * Check HH.ru auth status (session-based, no OAuth)
 */
async function checkHHAuthStatus() {
  try {
    const response = await sendMessage({ type: "CHECK_HH_AUTH" });

    if (response.success && response.isLoggedIn) {
      showHHLoggedIn();
    } else {
      showHHLoggedOut();
    }
  } catch (error) {
    console.error("HH auth check failed:", error);
    showHHLoggedOut();
  }
}

/**
 * Show HH.ru logged in status
 */
function showHHLoggedIn() {
  elements.hhStatusIcon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;
  elements.hhStatusIcon.classList.add("success");
  elements.hhStatusTitle.textContent = "Подключен к HH.ru";
  elements.hhStatusText.textContent = "Можно откликаться на вакансии";
  elements.openHHBtn.style.display = "none";
}

/**
 * Show HH.ru logged out status
 */
function showHHLoggedOut() {
  elements.hhStatusIcon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4M12 8h.01"></path>
    </svg>
  `;
  elements.hhStatusIcon.classList.remove("success");
  elements.hhStatusIcon.classList.add("warning");
  elements.hhStatusTitle.textContent = "Войдите на HH.ru";
  elements.hhStatusText.textContent = "Откройте hh.ru и авторизуйтесь";
  elements.openHHBtn.style.display = "inline-flex";
}

/**
 * Load models from OpenRouter API
 */
async function loadModels(forceRefresh = false) {
  elements.modelList.innerHTML = `
    <div class="model-loading">
      <div class="spinner"></div>
      <span>Загрузка моделей...</span>
    </div>
  `;

  if (forceRefresh) {
    elements.refreshModelsBtn.classList.add("spinning");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Неверный формат ответа API");
    }

    allModels = data.data
      .filter((model) => {
        const modality = model.architecture?.modality || "";
        return (
          (modality.includes("text") || !modality) &&
          !model.id.includes("embed")
        );
      })
      .map((model) => ({
        id: model.id,
        name: formatModelName(model.name || model.id),
        contextLength: model.context_length || 0,
        pricing: model.pricing || {},
        isRecommended: RECOMMENDED_MODELS.includes(model.id),
      }))
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.name.localeCompare(b.name);
      });

    if (allModels.length === 0) {
      throw new Error("Нет доступных моделей");
    }

    filterAndRenderModels();

    if (selectedModelId) {
      const modelExists = allModels.find((m) => m.id === selectedModelId);
      if (modelExists) {
        selectModel(selectedModelId);
      }
    }

    if (forceRefresh) {
      showToast(`Загружено ${allModels.length} моделей`, "success");
    }
  } catch (error) {
    console.error("Failed to load models:", error);
    elements.modelList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 8v4M12 16h.01"></path>
          </svg>
        </div>
        <div class="error-message">${escapeHtml(error.message)}</div>
        <button class="btn btn-ghost btn-sm" id="retry-models-btn">
          Попробовать снова
        </button>
      </div>
    `;

    document
      .getElementById("retry-models-btn")
      ?.addEventListener("click", () => loadModels(true));
  } finally {
    elements.refreshModelsBtn.classList.remove("spinning");
  }
}

/**
 * Format model name for display
 */
function formatModelName(name) {
  return name
    .replace(
      /^(anthropic|openai|google|meta-llama|qwen|mistralai|cohere|deepseek|microsoft)\//,
      "",
    )
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Filter and render models
 */
function filterAndRenderModels() {
  const searchQuery = elements.modelSearch.value.toLowerCase();

  filteredModels = allModels.filter((model) => {
    const matchesSearch =
      !searchQuery ||
      model.id.toLowerCase().includes(searchQuery) ||
      model.name.toLowerCase().includes(searchQuery);

    let matchesCategory = true;
    if (currentCategory === "recommended") {
      matchesCategory = model.isRecommended;
    } else if (currentCategory === "cheap") {
      const price = Number.parseFloat(model.pricing?.prompt || 0);
      matchesCategory = price < 0.000001;
    }

    return matchesSearch && matchesCategory;
  });

  renderModelList();
}

/**
 * Render model list
 */
function renderModelList() {
  if (filteredModels.length === 0) {
    elements.modelList.innerHTML = `
      <div class="no-models">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <span>Модели не найдены</span>
      </div>
    `;
    return;
  }

  elements.modelList.innerHTML = filteredModels
    .slice(0, 50)
    .map((model) => {
      const isSelected = model.id === selectedModelId;
      const price = formatPrice(model.pricing);
      const context = formatContext(model.contextLength);

      return `
        <div class="model-item ${isSelected ? "selected" : ""}" data-model-id="${escapeHtml(model.id)}">
          <div class="model-radio"></div>
          <div class="model-item-content">
            <div class="model-item-name">${escapeHtml(model.name)}</div>
            <div class="model-item-meta">
              <span class="model-tag price">${price}</span>
              <span class="model-tag context">${context}</span>
              ${model.isRecommended ? '<span class="model-tag recommended">Рекомендуемая</span>' : ""}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  elements.modelList.querySelectorAll(".model-item").forEach((item) => {
    item.addEventListener("click", () => selectModel(item.dataset.modelId));
  });
}

/**
 * Select a model
 */
function selectModel(modelId) {
  selectedModelId = modelId;
  const model = allModels.find((m) => m.id === modelId);

  if (model) {
    elements.selectedModelInfo.classList.remove("hidden");
    elements.selectedModelName.textContent = model.name;
    elements.selectedModelPrice.textContent = formatPrice(model.pricing);
    elements.selectedModelContext.textContent = formatContext(
      model.contextLength,
    );
  }

  elements.modelList.querySelectorAll(".model-item").forEach((item) => {
    item.classList.toggle("selected", item.dataset.modelId === modelId);
  });
}

/**
 * Format price for display
 */
function formatPrice(pricing) {
  const promptPrice = Number.parseFloat(pricing?.prompt || 0);
  if (promptPrice === 0) return "Бесплатно";

  const perMillion = promptPrice * 1000000;

  if (perMillion < 0.01) return "<$0.01/1M";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}/1M`;
  return `$${perMillion.toFixed(0)}/1M`;
}

/**
 * Format context length
 */
function formatContext(length) {
  if (!length) return "N/A";
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M ctx`;
  if (length >= 1000) return `${Math.round(length / 1000)}K ctx`;
  return `${length} ctx`;
}

/**
 * Handle model search
 */
function handleModelSearch() {
  filterAndRenderModels();
}

/**
 * Handle category change
 */
function handleCategoryChange(category) {
  currentCategory = category;

  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });

  filterAndRenderModels();
}

/**
 * Toggle API key visibility
 */
function toggleApiKeyVisibility() {
  const input = elements.apiKeyInput;
  input.type = input.type === "password" ? "text" : "password";
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const settings = await getStoredSettings();

    elements.apiKeyInput.value = settings.openRouterApiKey || "";
    selectedModelId = settings.preferredModel || "anthropic/claude-sonnet-4";
    selectedResumeHash = settings.defaultHHResumeId || null;
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  elements.saveBtn.disabled = true;

  try {
    const settings = await getStoredSettings();

    settings.openRouterApiKey = elements.apiKeyInput.value.trim();
    settings.preferredModel = selectedModelId;

    await chrome.storage.local.set({ settings });

    showToast("Настройки сохранены!", "success");
  } catch (error) {
    showToast("Ошибка сохранения: " + error.message, "error");
  } finally {
    elements.saveBtn.disabled = false;
  }
}

/**
 * Get stored settings
 */
async function getStoredSettings() {
  const result = await chrome.storage.local.get("settings");
  return result.settings || {};
}

/**
 * Open options page
 */
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

/**
 * Show toast notification
 */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Send message to background
 */
function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

// ========== HH Resumes Functions ==========

/**
 * Load HH.ru resumes
 */
async function loadHHResumes(forceRefresh = false) {
  if (forceRefresh) {
    elements.refreshResumesBtn?.classList.add("spinning");
  }

  try {
    const response = await sendMessage({ type: "GET_USER_RESUMES" });

    if (!response.success) {
      throw new Error(response.error || "Не удалось загрузить резюме");
    }

    hhResumes = response.resumes || [];
    renderHHResumes();

    if (forceRefresh && hhResumes.length > 0) {
      showToast(`Загружено ${hhResumes.length} резюме`, "success");
    }
  } catch (error) {
    console.error("Failed to load HH resumes:", error);
    elements.resumesList.innerHTML = `
      <div class="no-resumes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4M12 16h.01"></path>
        </svg>
        <span>Войдите на HH.ru</span>
      </div>
    `;
  } finally {
    elements.refreshResumesBtn?.classList.remove("spinning");
  }
}

/**
 * Render HH resumes list
 */
function renderHHResumes() {
  if (!hhResumes || hhResumes.length === 0) {
    elements.resumesList.innerHTML = `
      <div class="no-resumes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Нет резюме</span>
      </div>
    `;
    return;
  }

  const html = hhResumes
    .map((resume) => {
      const isSelected = resume.hash === selectedResumeHash;
      return `
        <div class="resume-item ${isSelected ? "selected" : ""}" data-hash="${escapeHtml(resume.hash)}">
          <div class="resume-info">
            <div class="resume-title">${escapeHtml(resume.title)}</div>
            <div class="resume-meta">
              <span class="resume-status ${resume.status}">${getStatusText(resume.status)}</span>
            </div>
          </div>
          ${
            isSelected
              ? `
            <svg class="resume-selected-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");

  elements.resumesList.innerHTML = html;

  // Attach click handlers
  elements.resumesList.querySelectorAll(".resume-item").forEach((item) => {
    item.addEventListener("click", () => selectResume(item.dataset.hash));
  });
}

/**
 * Select a resume as default
 */
async function selectResume(hash) {
  selectedResumeHash = hash;
  renderHHResumes();

  // Save to storage
  try {
    const settings = await getStoredSettings();
    settings.defaultHHResumeId = hash;
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error("Failed to save selected resume:", error);
  }
}

/**
 * Get status text in Russian
 */
function getStatusText(status) {
  const statusMap = {
    published: "Активно",
    hidden: "Скрыто",
    draft: "Черновик",
    unknown: "?",
  };
  return statusMap[status] || status;
}

// ========== Research Mode Functions ==========

/**
 * Load research mode state
 */
async function loadResearchMode() {
  try {
    const response = await sendMessage({ type: "GET_RESEARCH_MODE" });
    researchModeEnabled = response.enabled === true;
    elements.researchToggle.checked = researchModeEnabled;

    if (researchModeEnabled) {
      elements.researchStats.classList.remove("hidden");
      await updateCapturedCount();
    }
  } catch (error) {
    console.error("Failed to load research mode:", error);
  }
}

/**
 * Handle research mode toggle
 */
async function handleResearchToggle() {
  const enabled = elements.researchToggle.checked;

  try {
    await sendMessage({ type: "SET_RESEARCH_MODE", enabled });
    researchModeEnabled = enabled;

    if (enabled) {
      elements.researchStats.classList.remove("hidden");
      await updateCapturedCount();
      showToast("Режим исследования включен", "info");
    } else {
      elements.researchStats.classList.add("hidden");
      hideRequestViewer();
      showToast("Режим исследования выключен", "info");
    }
  } catch (error) {
    console.error("Failed to toggle research mode:", error);
    elements.researchToggle.checked = !enabled;
    showToast("Ошибка: " + error.message, "error");
  }
}

/**
 * Update captured request count
 */
async function updateCapturedCount() {
  try {
    const response = await sendMessage({ type: "GET_CAPTURED_REQUESTS" });
    if (response.success) {
      elements.capturedCount.textContent = response.count;
    }
  } catch (error) {
    console.error("Failed to update captured count:", error);
  }
}

/**
 * Show request viewer
 */
async function showRequestViewer() {
  try {
    const response = await sendMessage({ type: "GET_CAPTURED_REQUESTS" });

    if (!response.success) {
      showToast("Ошибка загрузки запросов", "error");
      return;
    }

    const requests = response.requests || [];

    if (requests.length === 0) {
      elements.requestList.innerHTML = `
        <div class="no-requests">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4M12 8h.01"></path>
          </svg>
          <span>Нет перехваченных запросов</span>
          <span style="font-size:11px">Включите режим и взаимодействуйте с HH.ru</span>
        </div>
      `;
    } else {
      elements.requestList.innerHTML = requests
        .slice(0, 50)
        .map((req, index) => renderRequestItem(req, index))
        .join("");

      elements.requestList
        .querySelectorAll(".request-body-toggle")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const body = btn.parentElement.querySelector(".request-body");
            if (body) {
              body.classList.toggle("hidden");
              btn.textContent = body.classList.contains("hidden")
                ? "Показать тело"
                : "Скрыть тело";
            }
          });
        });
    }

    elements.requestViewer.classList.remove("hidden");
  } catch (error) {
    console.error("Failed to show requests:", error);
    showToast("Ошибка: " + error.message, "error");
  }
}

/**
 * Render a single request item
 */
function renderRequestItem(req, index) {
  const statusClass =
    req.status >= 200 && req.status < 300 ? "success" : "error";
  const time = new Date(req.timestamp).toLocaleTimeString("ru-RU");

  let displayUrl = req.url;
  try {
    const url = new URL(req.url);
    displayUrl = url.pathname + url.search;
  } catch {}

  let requestBody = "";
  let responseBody = "";

  if (req.requestBody) {
    try {
      requestBody =
        typeof req.requestBody === "string"
          ? req.requestBody
          : JSON.stringify(req.requestBody, null, 2);
    } catch {
      requestBody = String(req.requestBody);
    }
  }

  if (req.responseBody) {
    try {
      responseBody =
        typeof req.responseBody === "string"
          ? req.responseBody
          : JSON.stringify(req.responseBody, null, 2);
    } catch {
      responseBody = String(req.responseBody);
    }
  }

  return `
    <div class="request-item" data-index="${index}">
      <div class="request-header">
        <span class="request-method ${req.method}">${req.method}</span>
        <span class="request-status ${statusClass}">${req.status || "?"}</span>
      </div>
      <div class="request-url">${escapeHtml(displayUrl.substring(0, 100))}${displayUrl.length > 100 ? "..." : ""}</div>
      <div class="request-time">${time} (${req.duration || 0}ms)</div>
      ${
        requestBody || responseBody
          ? `
        <div class="request-details">
          <button class="request-body-toggle">Показать тело</button>
          <div class="request-body hidden">
            ${requestBody ? `<strong>Request:</strong>\n${escapeHtml(requestBody.substring(0, 1000))}\n\n` : ""}
            ${responseBody ? `<strong>Response:</strong>\n${escapeHtml(responseBody.substring(0, 1000))}` : ""}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Hide request viewer
 */
function hideRequestViewer() {
  elements.requestViewer.classList.add("hidden");
}

/**
 * Export captured requests
 */
async function exportRequests() {
  try {
    const response = await sendMessage({ type: "EXPORT_CAPTURED_REQUESTS" });

    if (!response.success) {
      showToast("Ошибка экспорта", "error");
      return;
    }

    const data = response.exportData;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `hh-api-capture-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Экспортировано ${data.totalRequests} запросов`, "success");
  } catch (error) {
    console.error("Failed to export:", error);
    showToast("Ошибка экспорта: " + error.message, "error");
  }
}

/**
 * Clear captured requests
 */
async function clearRequests() {
  try {
    await sendMessage({ type: "CLEAR_CAPTURED_REQUESTS" });
    elements.capturedCount.textContent = "0";
    hideRequestViewer();
    showToast("Запросы очищены", "success");
  } catch (error) {
    console.error("Failed to clear:", error);
    showToast("Ошибка: " + error.message, "error");
  }
}

// Refresh captured count periodically when research mode is on
setInterval(async () => {
  if (researchModeEnabled) {
    await updateCapturedCount();
  }
}, 3000);

// Initialize
document.addEventListener("DOMContentLoaded", init);
