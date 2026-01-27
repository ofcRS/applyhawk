/**
 * JobGenius Side Panel
 * Handles the tabbed UI for resume generation, cover letters, and job applications
 */

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let allModels = [];
let filteredModels = [];
let selectedModelId = null;
let currentCategory = "recommended";
let researchModeEnabled = false;
let selectedResumeHash = null;
let hhResumes = [];
let currentTab = "resume";

// ═══════════════════════════════════════════════════════════════════════════
// DOM Elements
// ═══════════════════════════════════════════════════════════════════════════

const elements = {
  // Settings
  settingsBtn: document.getElementById("settings-btn"),

  // Resume Tab
  jobDescriptionInput: document.getElementById("job-description-input"),
  generatePdfBtn: document.getElementById("generate-pdf-btn"),
  resumeProgress: document.getElementById("resume-progress"),
  resumeError: document.getElementById("resume-error"),
  pdfAggressiveness: document.getElementById("pdf-aggressiveness"),
  pdfAggressivenessValue: document.getElementById("pdf-aggressiveness-value"),
  aggressivenessInfoBtn: document.getElementById("aggressiveness-info-btn"),
  aggressivenessTooltip: document.getElementById("aggressiveness-tooltip"),

  // Cover Letter Tab
  coverJobDescription: document.getElementById("cover-job-description"),
  generateCoverBtn: document.getElementById("generate-cover-btn"),
  coverResult: document.getElementById("cover-result"),
  coverText: document.getElementById("cover-text"),
  copyCoverBtn: document.getElementById("copy-cover-btn"),
  coverError: document.getElementById("cover-error"),

  // Apply Tab - HH.ru
  hhAuthIcon: document.getElementById("hh-auth-icon"),
  hhAuthTitle: document.getElementById("hh-auth-title"),
  hhAuthText: document.getElementById("hh-auth-text"),
  hhResumesList: document.getElementById("hh-resumes-list"),
  refreshResumesBtn: document.getElementById("refresh-resumes-btn"),
  quickApplyCard: document.getElementById("quick-apply-card"),
  quickApplyBtn: document.getElementById("quick-apply-btn"),
  vacancyInfo: document.getElementById("vacancy-info"),

  // Platforms Tab
  hhPlatformStatus: document.getElementById("hh-platform-status"),
  hhResumesCount: document.getElementById("hh-resumes-count"),
  researchToggle: document.getElementById("research-toggle"),
  researchStats: document.getElementById("research-stats"),
  capturedCount: document.getElementById("captured-count"),
  viewRequestsBtn: document.getElementById("view-requests-btn"),
  exportRequestsBtn: document.getElementById("export-requests-btn"),
  clearRequestsBtn: document.getElementById("clear-requests-btn"),
  requestViewer: document.getElementById("request-viewer"),
  requestList: document.getElementById("request-list"),
  closeViewerBtn: document.getElementById("close-viewer-btn"),

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
  saveApiKeyBtn: document.getElementById("save-api-key-btn"),

  // Toast
  toastContainer: document.getElementById("toast-container"),
};

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  // Tab navigation
  document.querySelectorAll(".main-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Settings button
  elements.settingsBtn?.addEventListener("click", openOptionsPage);

  // Resume Tab
  elements.generatePdfBtn?.addEventListener("click", handleGeneratePdf);
  elements.pdfAggressiveness?.addEventListener(
    "input",
    handleAggressivenessChange,
  );
  elements.aggressivenessInfoBtn?.addEventListener(
    "click",
    toggleAggressivenessTooltip,
  );

  // Cover Letter Tab
  elements.generateCoverBtn?.addEventListener(
    "click",
    handleGenerateCoverLetter,
  );
  elements.copyCoverBtn?.addEventListener("click", handleCopyCoverLetter);

  // Apply Tab
  elements.refreshResumesBtn?.addEventListener("click", () =>
    loadHHResumes(true),
  );

  // Platforms Tab - Research Mode
  elements.researchToggle?.addEventListener("change", handleResearchToggle);
  elements.viewRequestsBtn?.addEventListener("click", showRequestViewer);
  elements.exportRequestsBtn?.addEventListener("click", exportRequests);
  elements.clearRequestsBtn?.addEventListener("click", clearRequests);
  elements.closeViewerBtn?.addEventListener("click", hideRequestViewer);

  // Model
  elements.modelSearch?.addEventListener("input", handleModelSearch);
  elements.refreshModelsBtn?.addEventListener("click", () => loadModels(true));
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleCategoryChange(btn.dataset.category),
    );
  });

  // API Key
  elements.toggleApiKey?.addEventListener("click", toggleApiKeyVisibility);
  elements.saveApiKeyBtn?.addEventListener("click", saveSettings);

  // Load data
  await loadSettings();
  await loadResearchMode();
  await checkHHAuthStatus();
  await loadHHResumes();
  await loadModels();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Navigation
// ═══════════════════════════════════════════════════════════════════════════

function switchTab(tabId) {
  currentTab = tabId;

  // Update tab buttons
  document.querySelectorAll(".main-tabs .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `tab-${tabId}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HH.ru Authentication
// ═══════════════════════════════════════════════════════════════════════════

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

function showHHLoggedIn() {
  elements.hhAuthIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  `;
  elements.hhAuthIcon.classList.remove("warning");
  elements.hhAuthIcon.classList.add("success");
  elements.hhAuthTitle.textContent = "Connected to HH.ru";
  elements.hhAuthText.textContent = "Ready to apply to jobs";

  // Update platform status badge
  if (elements.hhPlatformStatus) {
    elements.hhPlatformStatus.textContent = "Connected";
    elements.hhPlatformStatus.className = "badge badge-success";
  }
}

function showHHLoggedOut() {
  elements.hhAuthIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01"/>
    </svg>
  `;
  elements.hhAuthIcon.classList.remove("success");
  elements.hhAuthIcon.classList.add("warning");
  elements.hhAuthTitle.textContent = "Not connected";
  elements.hhAuthText.textContent = "Please log in to hh.ru";

  // Update platform status badge
  if (elements.hhPlatformStatus) {
    elements.hhPlatformStatus.textContent = "Disconnected";
    elements.hhPlatformStatus.className = "badge badge-warning";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HH.ru Resumes
// ═══════════════════════════════════════════════════════════════════════════

async function loadHHResumes(forceRefresh = false) {
  if (forceRefresh) {
    elements.refreshResumesBtn?.classList.add("spinning");
  }

  try {
    const response = await sendMessage({ type: "GET_USER_RESUMES" });

    if (!response.success) {
      throw new Error(response.error || "Failed to load resumes");
    }

    hhResumes = response.resumes || [];
    renderHHResumes();

    // Update count in platforms tab
    if (elements.hhResumesCount) {
      elements.hhResumesCount.textContent = hhResumes.length;
    }

    if (forceRefresh && hhResumes.length > 0) {
      showToast(`Loaded ${hhResumes.length} resumes`, "success");
    }
  } catch (error) {
    console.error("Failed to load HH resumes:", error);
    elements.hhResumesList.innerHTML = `
      <div class="no-resumes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>Log in to HH.ru to see resumes</span>
      </div>
    `;
  } finally {
    elements.refreshResumesBtn?.classList.remove("spinning");
  }
}

function renderHHResumes() {
  if (!hhResumes || hhResumes.length === 0) {
    elements.hhResumesList.innerHTML = `
      <div class="no-resumes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>No resumes found</span>
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

  elements.hhResumesList.innerHTML = html;

  // Attach click handlers
  elements.hhResumesList.querySelectorAll(".resume-item").forEach((item) => {
    item.addEventListener("click", () => selectResume(item.dataset.hash));
  });
}

async function selectResume(hash) {
  selectedResumeHash = hash;
  renderHHResumes();

  try {
    const settings = await getStoredSettings();
    settings.defaultHHResumeId = hash;
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error("Failed to save selected resume:", error);
  }
}

function getStatusText(status) {
  const statusMap = {
    published: "Active",
    hidden: "Hidden",
    draft: "Draft",
    unknown: "?",
  };
  return statusMap[status] || status;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resume Generation (PDF)
// ═══════════════════════════════════════════════════════════════════════════

async function handleAggressivenessChange() {
  const value = elements.pdfAggressiveness?.value || 50;
  if (elements.pdfAggressivenessValue) {
    elements.pdfAggressivenessValue.textContent = `${value}%`;
  }

  // Save to storage
  try {
    const settings = await getStoredSettings();
    settings.defaultAggressiveness = Number.parseInt(value, 10);
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error("Failed to save aggressiveness:", error);
  }
}

function toggleAggressivenessTooltip() {
  elements.aggressivenessTooltip?.classList.toggle("hidden");
}

async function handleGeneratePdf() {
  const jobDescription = elements.jobDescriptionInput?.value?.trim();

  if (!jobDescription || jobDescription.length < 20) {
    showError(
      elements.resumeError,
      "Please paste a job description (at least 20 characters)",
    );
    return;
  }

  const baseResume = await sendMessage({ type: "GET_BASE_RESUME" });
  console.log("[DEBUG:Panel] Base resume loaded:", {
    fullName: baseResume?.fullName,
    experienceCount: baseResume?.experience?.length,
    skillsCount: baseResume?.skills?.length,
  });

  if (!baseResume || !baseResume.fullName) {
    showError(
      elements.resumeError,
      "Please configure your base resume in Settings first",
    );
    return;
  }

  hideError(elements.resumeError);
  showProgress(elements.resumeProgress);
  elements.generatePdfBtn.disabled = true;

  try {
    // Step 1: Parse job description
    setProgressStep(elements.resumeProgress, "parse", "active");
    console.log(
      "[DEBUG:Parse] Input text length:",
      jobDescription.length,
      "chars",
    );
    const parseResult = await sendMessage({
      type: "PARSE_UNIVERSAL_VACANCY",
      rawText: jobDescription,
    });

    if (!parseResult.success) {
      throw new Error(parseResult.error || "Failed to parse job description");
    }

    const parsedVacancy = parseResult.vacancy;
    console.log("[DEBUG:Parse] Parsed vacancy:", {
      name: parsedVacancy.name,
      company: parsedVacancy.company,
      keySkillsCount: parsedVacancy.keySkills?.length,
      keySkills: parsedVacancy.keySkills?.slice(0, 5),
    });
    setProgressStep(elements.resumeProgress, "parse", "complete");

    // Step 2: Personalize resume
    setProgressStep(elements.resumeProgress, "personalize", "active");
    const aggressiveness =
      Number.parseInt(elements.pdfAggressiveness?.value || "50", 10) / 100;

    console.log("[DEBUG:Personalize] Sending request with:", {
      aggressiveness,
      baseResumeExperienceCount: baseResume.experience?.length,
      vacancyKeySkills: parsedVacancy.keySkills,
    });

    const personalizeResult = await sendMessage({
      type: "GENERATE_PERSONALIZED_RESUME",
      baseResume,
      vacancy: parsedVacancy,
      aggressiveness,
    });

    console.log("[DEBUG:Personalize] Result received:", {
      success: personalizeResult.success,
      experienceCount: personalizeResult.experience?.length,
      keySkillsCount: personalizeResult.keySkills?.length,
      keySkills: personalizeResult.keySkills,
      appliedAggressiveness: personalizeResult.appliedAggressiveness,
    });

    if (personalizeResult.experience?.length > 0) {
      console.log("[DEBUG:Personalize] First experience comparison:", {
        before: baseResume.experience?.[0]?.description?.substring(0, 150),
        after: personalizeResult.experience?.[0]?.description?.substring(
          0,
          150,
        ),
      });
    }

    if (!personalizeResult.success) {
      throw new Error(
        personalizeResult.error || "Failed to personalize resume",
      );
    }

    setProgressStep(elements.resumeProgress, "personalize", "complete");

    // Step 3: Generate PDF
    setProgressStep(elements.resumeProgress, "generate", "active");
    console.log("[DEBUG:PDF] Sending to PDF generator:", {
      personalizedExperienceCount: personalizeResult.experience?.length,
      personalizedKeySkillsCount: personalizeResult.keySkills?.length,
      baseResumeExperienceCount: baseResume.experience?.length,
    });

    const pdfResult = await sendMessage({
      type: "GENERATE_PDF_RESUME",
      personalizedResume: personalizeResult,
      baseResume,
      vacancy: parsedVacancy,
    });

    if (!pdfResult.success) {
      throw new Error(pdfResult.error || "Failed to generate PDF");
    }

    setProgressStep(elements.resumeProgress, "generate", "complete");

    // Download PDF
    const pdfBytes = new Uint8Array(pdfResult.pdfBytes);
    downloadPdf(pdfBytes, generatePdfFilename(parsedVacancy));

    showToast("PDF resume generated!", "success");

    // Hide progress after a short delay to show completion state
    setTimeout(() => {
      elements.resumeProgress?.classList.add("hidden");
    }, 2000);
  } catch (error) {
    console.error("[DEBUG:Panel] PDF generation failed:", error);
    showError(elements.resumeError, error.message || "Failed to generate PDF");

    // Mark current step as error
    for (const step of ["parse", "personalize", "generate"]) {
      const el = elements.resumeProgress?.querySelector(
        `[data-step="${step}"]`,
      );
      if (el?.classList.contains("active")) {
        setProgressStep(elements.resumeProgress, step, "error");
        break;
      }
    }
  } finally {
    elements.generatePdfBtn.disabled = false;
  }
}

function generatePdfFilename(vacancy) {
  const position = vacancy?.name || "Resume";
  const company = vacancy?.company || "";
  const date = new Date().toISOString().split("T")[0];

  const cleanName = `${position}${company ? ` - ${company}` : ""}`
    .replace(/[^a-zA-Z0-9\u0400-\u04FF\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);

  return `${cleanName}_${date}.pdf`;
}

function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// Cover Letter Generation
// ═══════════════════════════════════════════════════════════════════════════

async function handleGenerateCoverLetter() {
  const jobDescription = elements.coverJobDescription?.value?.trim();

  if (!jobDescription || jobDescription.length < 20) {
    showError(
      elements.coverError,
      "Please paste a job description (at least 20 characters)",
    );
    return;
  }

  const baseResume = await sendMessage({ type: "GET_BASE_RESUME" });
  if (!baseResume || !baseResume.fullName) {
    showError(
      elements.coverError,
      "Please configure your base resume in Settings first",
    );
    return;
  }

  hideError(elements.coverError);
  elements.generateCoverBtn.disabled = true;
  elements.coverResult?.classList.add("hidden");

  try {
    // Parse vacancy first
    const parseResult = await sendMessage({
      type: "PARSE_UNIVERSAL_VACANCY",
      rawText: jobDescription,
    });

    if (!parseResult.success) {
      throw new Error(parseResult.error || "Failed to parse job description");
    }

    // Generate cover letter
    const coverResult = await sendMessage({
      type: "GENERATE_COVER_LETTER",
      baseResume,
      vacancy: parseResult.vacancy,
    });

    if (!coverResult.success) {
      throw new Error(coverResult.error || "Failed to generate cover letter");
    }

    // Display result
    elements.coverText.textContent = coverResult.coverLetter;
    elements.coverResult?.classList.remove("hidden");

    showToast("Cover letter generated!", "success");
  } catch (error) {
    console.error("Cover letter generation failed:", error);
    showError(
      elements.coverError,
      error.message || "Failed to generate cover letter",
    );
  } finally {
    elements.generateCoverBtn.disabled = false;
  }
}

async function handleCopyCoverLetter() {
  const text = elements.coverText?.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  } catch (error) {
    showToast("Failed to copy", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Research Mode
// ═══════════════════════════════════════════════════════════════════════════

async function loadResearchMode() {
  try {
    const response = await sendMessage({ type: "GET_RESEARCH_MODE" });
    researchModeEnabled = response.enabled === true;
    if (elements.researchToggle) {
      elements.researchToggle.checked = researchModeEnabled;
    }

    if (researchModeEnabled) {
      elements.researchStats?.classList.remove("hidden");
      await updateCapturedCount();
    }
  } catch (error) {
    console.error("Failed to load research mode:", error);
  }
}

async function handleResearchToggle() {
  const enabled = elements.researchToggle?.checked ?? false;

  try {
    await sendMessage({ type: "SET_RESEARCH_MODE", enabled });
    researchModeEnabled = enabled;

    if (enabled) {
      elements.researchStats?.classList.remove("hidden");
      await updateCapturedCount();
      showToast("Research mode enabled", "info");
    } else {
      elements.researchStats?.classList.add("hidden");
      hideRequestViewer();
      showToast("Research mode disabled", "info");
    }
  } catch (error) {
    console.error("Failed to toggle research mode:", error);
    if (elements.researchToggle) {
      elements.researchToggle.checked = !enabled;
    }
    showToast("Error: " + error.message, "error");
  }
}

async function updateCapturedCount() {
  try {
    const response = await sendMessage({ type: "GET_CAPTURED_REQUESTS" });
    if (response.success && elements.capturedCount) {
      elements.capturedCount.textContent = response.count;
    }
  } catch (error) {
    console.error("Failed to update captured count:", error);
  }
}

async function showRequestViewer() {
  try {
    const response = await sendMessage({ type: "GET_CAPTURED_REQUESTS" });

    if (!response.success) {
      showToast("Failed to load requests", "error");
      return;
    }

    const requests = response.requests || [];

    if (requests.length === 0) {
      elements.requestList.innerHTML = `
        <div class="no-requests">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>No captured requests</span>
          <span style="font-size:11px">Enable research mode and browse HH.ru</span>
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
                ? "Show body"
                : "Hide body";
            }
          });
        });
    }

    elements.requestViewer?.classList.remove("hidden");
  } catch (error) {
    console.error("Failed to show requests:", error);
    showToast("Error: " + error.message, "error");
  }
}

function renderRequestItem(req, index) {
  const statusClass =
    req.status >= 200 && req.status < 300 ? "success" : "error";
  const time = new Date(req.timestamp).toLocaleTimeString();

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
          <button class="request-body-toggle">Show body</button>
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

function hideRequestViewer() {
  elements.requestViewer?.classList.add("hidden");
}

async function exportRequests() {
  try {
    const response = await sendMessage({ type: "EXPORT_CAPTURED_REQUESTS" });

    if (!response.success) {
      showToast("Export failed", "error");
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

    showToast(`Exported ${data.totalRequests} requests`, "success");
  } catch (error) {
    console.error("Failed to export:", error);
    showToast("Export error: " + error.message, "error");
  }
}

async function clearRequests() {
  try {
    await sendMessage({ type: "CLEAR_CAPTURED_REQUESTS" });
    if (elements.capturedCount) {
      elements.capturedCount.textContent = "0";
    }
    hideRequestViewer();
    showToast("Requests cleared", "success");
  } catch (error) {
    console.error("Failed to clear:", error);
    showToast("Error: " + error.message, "error");
  }
}

// Refresh captured count periodically
setInterval(async () => {
  if (researchModeEnabled) {
    await updateCapturedCount();
  }
}, 3000);

// ═══════════════════════════════════════════════════════════════════════════
// Models
// ═══════════════════════════════════════════════════════════════════════════

async function loadModels(forceRefresh = false) {
  elements.modelList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Loading models...</span>
    </div>
  `;

  if (forceRefresh) {
    elements.refreshModelsBtn?.classList.add("spinning");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid API response format");
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
      throw new Error("No models available");
    }

    filterAndRenderModels();

    if (selectedModelId) {
      const modelExists = allModels.find((m) => m.id === selectedModelId);
      if (modelExists) {
        selectModel(selectedModelId);
      }
    }

    if (forceRefresh) {
      showToast(`Loaded ${allModels.length} models`, "success");
    }
  } catch (error) {
    console.error("Failed to load models:", error);
    elements.modelList.innerHTML = `
      <div class="no-models">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>${escapeHtml(error.message)}</span>
        <button class="btn btn-ghost btn-sm" id="retry-models-btn">Retry</button>
      </div>
    `;

    document
      .getElementById("retry-models-btn")
      ?.addEventListener("click", () => loadModels(true));
  } finally {
    elements.refreshModelsBtn?.classList.remove("spinning");
  }
}

function formatModelName(name) {
  return name
    .replace(
      /^(anthropic|openai|google|meta-llama|qwen|mistralai|cohere|deepseek|microsoft)\//,
      "",
    )
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function filterAndRenderModels() {
  const searchQuery = elements.modelSearch?.value?.toLowerCase() || "";

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

function renderModelList() {
  if (filteredModels.length === 0) {
    elements.modelList.innerHTML = `
      <div class="no-models">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <span>No models found</span>
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
              ${model.isRecommended ? '<span class="model-tag recommended">Recommended</span>' : ""}
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

function selectModel(modelId) {
  selectedModelId = modelId;
  const model = allModels.find((m) => m.id === modelId);

  if (model) {
    elements.selectedModelInfo?.classList.remove("hidden");
    if (elements.selectedModelName)
      elements.selectedModelName.textContent = model.name;
    if (elements.selectedModelPrice)
      elements.selectedModelPrice.textContent = formatPrice(model.pricing);
    if (elements.selectedModelContext)
      elements.selectedModelContext.textContent = formatContext(
        model.contextLength,
      );
  }

  elements.modelList.querySelectorAll(".model-item").forEach((item) => {
    item.classList.toggle("selected", item.dataset.modelId === modelId);
  });
}

function formatPrice(pricing) {
  const promptPrice = Number.parseFloat(pricing?.prompt || 0);
  if (promptPrice === 0) return "Free";

  const perMillion = promptPrice * 1000000;

  if (perMillion < 0.01) return "<$0.01/1M";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}/1M`;
  return `$${perMillion.toFixed(0)}/1M`;
}

function formatContext(length) {
  if (!length) return "N/A";
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M ctx`;
  if (length >= 1000) return `${Math.round(length / 1000)}K ctx`;
  return `${length} ctx`;
}

function handleModelSearch() {
  filterAndRenderModels();
}

function handleCategoryChange(category) {
  currentCategory = category;

  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });

  filterAndRenderModels();
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════════════════

async function loadSettings() {
  try {
    const settings = await getStoredSettings();

    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = settings.openRouterApiKey || "";
    }
    selectedModelId = settings.preferredModel || "anthropic/claude-sonnet-4";
    selectedResumeHash = settings.defaultHHResumeId || null;

    // Load default aggressiveness
    if (
      settings.defaultAggressiveness !== undefined &&
      elements.pdfAggressiveness
    ) {
      elements.pdfAggressiveness.value = settings.defaultAggressiveness;
      if (elements.pdfAggressivenessValue) {
        elements.pdfAggressivenessValue.textContent = `${settings.defaultAggressiveness}%`;
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

async function saveSettings() {
  elements.saveApiKeyBtn.disabled = true;

  try {
    const settings = await getStoredSettings();

    settings.openRouterApiKey = elements.apiKeyInput?.value?.trim() || "";
    settings.preferredModel = selectedModelId;

    await chrome.storage.local.set({ settings });

    showToast("Settings saved!", "success");
  } catch (error) {
    showToast("Save error: " + error.message, "error");
  } finally {
    elements.saveApiKeyBtn.disabled = false;
  }
}

async function getStoredSettings() {
  const result = await chrome.storage.local.get("settings");
  return result.settings || {};
}

function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

function toggleApiKeyVisibility() {
  const input = elements.apiKeyInput;
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════════════════════

function showProgress(container) {
  // First, reset all step states to ensure clean visual state
  container?.querySelectorAll(".progress-step").forEach((el) => {
    el.classList.remove("active", "complete", "error");
  });
  // Then show the container
  container?.classList.remove("hidden");
}

function setProgressStep(container, step, state) {
  const stepEl = container?.querySelector(`[data-step="${step}"]`);
  if (stepEl) {
    stepEl.classList.remove("active", "complete", "error");
    stepEl.classList.add(state);
  }
}

function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.classList.remove("hidden");
  }
}

function hideError(element) {
  element?.classList.add("hidden");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  elements.toastContainer?.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

// ═══════════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", init);
