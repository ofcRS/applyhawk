/**
 * ApplyHawk Side Panel
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
let currentTab = "generate";
let lastJobDescription = "";
let lastGeneratedCoverLetter = "";
let lastFitAssessment = null;
let extractedFormFields = null;
let autofillAttempt = 0;
let lastAutofillResult = null;
let lastCacheKey = null;
let lastFromCache = false;
let lastFormFillFields = null;
const MAX_AUTOFILL_ATTEMPTS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// DOM Elements
// ═══════════════════════════════════════════════════════════════════════════

const elements = {
  // Generate Tab (merged Resume + Cover Letter)
  jobDescriptionInput: document.getElementById("job-description-input"),
  generatePdfBtn: document.getElementById("generate-pdf-btn"),
  resumeProgress: document.getElementById("resume-progress"),
  resumeError: document.getElementById("resume-error"),
  pdfAggressiveness: document.getElementById("pdf-aggressiveness"),
  pdfAggressivenessValue: document.getElementById("pdf-aggressiveness-value"),
  aggressivenessInfoBtn: document.getElementById("aggressiveness-info-btn"),
  aggressivenessTooltip: document.getElementById("aggressiveness-tooltip"),
  generateCoverBtn: document.getElementById("generate-cover-btn"),
  coverResult: document.getElementById("cover-result"),
  coverText: document.getElementById("cover-text"),
  copyCoverBtn: document.getElementById("copy-cover-btn"),
  coverError: document.getElementById("cover-error"),

  // Fit Assessment
  fitAssessmentSection: document.getElementById("fit-assessment-section"),
  fitScorePercentage: document.getElementById("fit-score-percentage"),
  fitScoreBar: document.getElementById("fit-score-bar"),
  fitDetails: document.getElementById("fit-details"),
  fitWarning: document.getElementById("fit-warning"),
  fitCancelBtn: document.getElementById("fit-cancel-btn"),
  fitProceedBtn: document.getElementById("fit-proceed-btn"),

  // Form Fill Tab
  formfillJobDescription: document.getElementById("formfill-job-description"),
  extractFieldsBtn: document.getElementById("extract-fields-btn"),
  aiAnalyzeBtn: document.getElementById("ai-analyze-btn"),
  formfillFieldsPreview: document.getElementById("formfill-fields-preview"),
  formfillFieldsCount: document.getElementById("formfill-fields-count"),
  formfillFieldsList: document.getElementById("formfill-fields-list"),
  generateAnswersBtn: document.getElementById("generate-answers-btn"),
  formfillError: document.getElementById("formfill-error"),
  formfillAnswers: document.getElementById("formfill-answers"),
  formfillAnswersList: document.getElementById("formfill-answers-list"),
  copyAllAnswersBtn: document.getElementById("copy-all-answers-btn"),
  autofillBtn: document.getElementById("autofill-btn"),

  // Autofill Verification
  autofillVerification: document.getElementById("autofill-verification"),
  verificationStatus: document.getElementById("verification-status"),
  verificationFailedList: document.getElementById("verification-failed-list"),
  verificationFeedback: document.getElementById("verification-feedback"),
  verificationAcceptBtn: document.getElementById("verification-accept-btn"),
  verificationRetryBtn: document.getElementById("verification-retry-btn"),
  verificationRetryText: document.getElementById("verification-retry-text"),

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

  // Permission Banner
  permissionBanner: document.getElementById("permission-banner"),
  permissionGrantBtn: document.getElementById("permission-grant-btn"),

  // Form Cache
  clearFormCacheBtn: document.getElementById("clear-form-cache-btn"),
};

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  // Tab navigation
  document.querySelectorAll(".main-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Generate Tab
  elements.generatePdfBtn?.addEventListener("click", handleGeneratePdf);
  elements.pdfAggressiveness?.addEventListener(
    "input",
    handleAggressivenessChange,
  );
  elements.aggressivenessInfoBtn?.addEventListener(
    "click",
    toggleAggressivenessTooltip,
  );
  elements.generateCoverBtn?.addEventListener(
    "click",
    handleGenerateCoverLetter,
  );
  elements.copyCoverBtn?.addEventListener("click", handleCopyCoverLetter);

  // Form Fill Tab
  elements.extractFieldsBtn?.addEventListener("click", handleExtractFields);
  elements.aiAnalyzeBtn?.addEventListener("click", handleAiAnalyzePage);
  elements.generateAnswersBtn?.addEventListener("click", handleGenerateAnswers);
  elements.copyAllAnswersBtn?.addEventListener("click", handleCopyAllAnswers);
  elements.autofillBtn?.addEventListener("click", handleIterativeAutofill);

  // Listen for ATS form detection from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ATS_FORM_DETECTED") {
      console.log("[Panel] ATS form detected:", message.url);
      switchTab("formfill");
      // Pre-fill job description if available from Generate tab
      if (lastJobDescription && elements.formfillJobDescription) {
        elements.formfillJobDescription.value = lastJobDescription;
      }
      // Auto-trigger field extraction
      setTimeout(() => handleExtractFields(), 500);
    }
  });

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

  // Permission banner — "Enable" button requests persistent host permission
  elements.permissionGrantBtn?.addEventListener("click", handleGrantPermission);

  // Form template cache
  elements.clearFormCacheBtn?.addEventListener("click", handleClearFormCache);

  // Listen for vacancy data changes (handles case when panel is already open)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.detectedVacancy?.newValue) {
      console.log("[Panel] Detected vacancy change in storage");
      loadDetectedVacancy();
    }
  });

  // Check if current tab needs permission banner
  await checkTabPermission();

  // Load data
  await loadSettings();
  await loadResearchMode();
  await loadDetectedVacancy();
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

  // Pre-fill form fill job description from Generate tab if available
  if (tabId === "formfill" && lastJobDescription && elements.formfillJobDescription) {
    if (!elements.formfillJobDescription.value.trim()) {
      elements.formfillJobDescription.value = lastJobDescription;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Host Permission Banner
// ═══════════════════════════════════════════════════════════════════════════

/** URL of the current active tab (cached during permission check) */
let currentTabUrl = null;

async function checkTabPermission() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url || !tab.url.startsWith("http")) return;

    currentTabUrl = tab.url;

    const result = await sendMessage({
      type: "CHECK_HOST_PERMISSION",
      url: tab.url,
    });

    if (result.success && !result.hasPermission && !result.isKnown) {
      elements.permissionBanner?.classList.remove("hidden");
    }
  } catch (error) {
    console.warn("[Panel] Permission check failed:", error);
  }
}

async function handleGrantPermission() {
  try {
    // Always fetch the current tab URL to handle navigation after panel open
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabUrl = tab?.url || currentTabUrl;
    if (!tabUrl || !tabUrl.startsWith("http")) return;

    // Build origin pattern from the current tab URL
    const url = new URL(tabUrl);
    const parts = url.hostname.split(".");
    const domain = parts.length > 2 ? parts.slice(-2).join(".") : url.hostname;
    const pattern = `${url.protocol}//*.${domain}/*`;

    const granted = await chrome.permissions.request({ origins: [pattern] });

    if (granted) {
      elements.permissionBanner?.classList.add("hidden");
      showToast("Permission granted — reloading page", "success");

      // Reload the tab so content scripts can be injected on the now-permitted domain
      if (tab?.id) {
        chrome.tabs.reload(tab.id);
      }
    } else {
      showToast("Permission denied", "info");
    }
  } catch (error) {
    console.error("[Panel] Permission request failed:", error);
    showToast("Permission request failed: " + error.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Detected Vacancy Loading
// ═══════════════════════════════════════════════════════════════════════════

const VACANCY_TTL_MS = 60000; // 1 minute

async function loadDetectedVacancy() {
  try {
    const result = await chrome.storage.local.get("detectedVacancy");
    const vacancy = result.detectedVacancy;

    if (!vacancy) {
      return;
    }

    // Check TTL - vacancy must be recent (within 1 minute)
    const age = Date.now() - (vacancy.timestamp || 0);
    if (age > VACANCY_TTL_MS) {
      console.log("[Panel] Detected vacancy expired, clearing");
      await chrome.storage.local.remove("detectedVacancy");
      return;
    }

    // Pre-fill job description input
    if (vacancy.content && elements.jobDescriptionInput) {
      elements.jobDescriptionInput.value = vacancy.content;
      console.log(
        "[Panel] Auto-filled job description from detected vacancy:",
        {
          title: vacancy.title,
          platform: vacancy.detection?.platform,
          contentLength: vacancy.content.length,
        },
      );

      // Switch to Generate tab if not already there
      switchTab("generate");

      // Show toast notification
      const platform = vacancy.detection?.platform || "job page";
      const title = vacancy.title
        ? ` "${vacancy.title.substring(0, 40)}${vacancy.title.length > 40 ? "..." : ""}"`
        : "";
      showToast(`Loaded${title} from ${platform}`, "success");
    }

    // Clear stored vacancy after loading
    await chrome.storage.local.remove("detectedVacancy");
  } catch (error) {
    console.error("[Panel] Failed to load detected vacancy:", error);
  }
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
    if (!settings.aggressiveFit) settings.aggressiveFit = {};
    settings.aggressiveFit.aggressivenessOverride =
      Number.parseInt(value, 10) / 100;
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
    // Add actionable link to open Options page
    const settingsLink = document.createElement("a");
    settingsLink.href = "#";
    settingsLink.textContent = "Open Resume Settings \u2192";
    settingsLink.className = "error-action-link";
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    elements.resumeError?.appendChild(settingsLink);
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

    // Step 2: Assess fit score
    setProgressStep(elements.resumeProgress, "assess", "active");
    elements.fitAssessmentSection?.classList.add("hidden");
    lastFitAssessment = null;

    let aggressiveness =
      Number.parseInt(elements.pdfAggressiveness?.value || "50", 10) / 100;

    try {
      const fitResult = await sendMessage({
        type: "ASSESS_FIT_SCORE",
        vacancy: parsedVacancy,
        resume: baseResume,
      });

      if (fitResult && fitResult.fitScore !== undefined) {
        lastFitAssessment = fitResult;
        displayFitAssessment(fitResult);

        // Auto-set aggressiveness slider from calculated value
        if (fitResult.aggressiveness !== undefined) {
          const sliderValue = Math.round(fitResult.aggressiveness * 100);
          const previousValue = elements.pdfAggressiveness?.value;
          if (elements.pdfAggressiveness) {
            elements.pdfAggressiveness.value = sliderValue;
          }
          if (elements.pdfAggressivenessValue) {
            elements.pdfAggressivenessValue.textContent = `${sliderValue}%`;
          }
          aggressiveness = fitResult.aggressiveness;
          if (previousValue != sliderValue) {
            showToast(`Aggressiveness auto-adjusted to ${sliderValue}% based on fit analysis`, "info");
          }
        }

        // Check if low fit — show warning and wait for user decision
        if (fitResult.skipRecommendation?.skip) {
          const shouldProceed = await waitForFitProceedConfirmation();
          if (!shouldProceed) {
            setProgressStep(elements.resumeProgress, "assess", "complete");
            showToast("Generation cancelled", "info");
            return;
          }
        }
      }
    } catch (fitError) {
      console.warn("[Panel] Fit assessment failed (non-fatal):", fitError);
    }

    setProgressStep(elements.resumeProgress, "assess", "complete");

    // Step 3: Personalize resume
    setProgressStep(elements.resumeProgress, "personalize", "active");

    console.log("[DEBUG:Personalize] Sending request with:", {
      aggressiveness,
      baseResumeExperienceCount: baseResume.experience?.length,
      vacancyKeySkills: parsedVacancy.keySkills,
    });

    // Re-read slider value in case user adjusted it during assessment
    aggressiveness =
      Number.parseInt(elements.pdfAggressiveness?.value || "50", 10) / 100;

    const personalizeResult = await sendMessage({
      type: "GENERATE_PERSONALIZED_RESUME",
      baseResume,
      vacancy: parsedVacancy,
      aggressiveness,
      fitAssessment: lastFitAssessment,
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

    // Step 4: Generate PDF
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

    // Store job description for Form Fill tab
    lastJobDescription = jobDescription;

    showToast("PDF resume generated!", "success");

    // Hide progress after a short delay to show completion state
    setTimeout(() => {
      elements.resumeProgress?.classList.add("hidden");
    }, 2000);
  } catch (error) {
    console.error("[DEBUG:Panel] PDF generation failed:", error);
    showError(elements.resumeError, error.message || "Failed to generate PDF");

    // Mark current step as error
    for (const step of ["parse", "assess", "personalize", "generate"]) {
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
  const jobDescription = elements.jobDescriptionInput?.value?.trim();

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
      fitAssessment: lastFitAssessment,
    });

    if (!coverResult.success) {
      throw new Error(coverResult.error || "Failed to generate cover letter");
    }

    // Display result
    elements.coverText.textContent = coverResult.coverLetter;
    elements.coverResult?.classList.remove("hidden");

    // Store for Form Fill tab use
    lastJobDescription = jobDescription;
    lastGeneratedCoverLetter = coverResult.coverLetter;

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
// Fit Assessment Display
// ═══════════════════════════════════════════════════════════════════════════

function displayFitAssessment(assessment) {
  const section = elements.fitAssessmentSection;
  const bar = elements.fitScoreBar;
  const percentage = elements.fitScorePercentage;
  const details = elements.fitDetails;

  if (!section || !bar || !percentage || !details) return;

  const score = assessment.fitScore || 0;
  const percent = Math.round(score * 100);

  // Determine color class based on thresholds
  let colorClass = "low";
  if (score >= 0.7) colorClass = "high";
  else if (score >= 0.4) colorClass = "medium";

  // Update bar
  bar.style.width = `${percent}%`;
  bar.className = `fit-score-bar ${colorClass}`;

  // Update percentage text
  percentage.textContent = `${percent}%`;
  percentage.className = `fit-score-percentage ${colorClass}`;

  // Render strengths and gaps
  let detailsHtml = "";

  if (assessment.strengths?.length) {
    for (const strength of assessment.strengths.slice(0, 3)) {
      detailsHtml += `<div class="fit-detail-item fit-strength"><span class="fit-icon">\u2713</span><span>${escapeHtml(strength)}</span></div>`;
    }
  }

  if (assessment.gaps?.length) {
    for (const gap of assessment.gaps.slice(0, 3)) {
      detailsHtml += `<div class="fit-detail-item fit-gap"><span class="fit-icon">\u2212</span><span>${escapeHtml(gap)}</span></div>`;
    }
  }

  details.innerHTML = detailsHtml;

  // Show/hide warning
  elements.fitWarning?.classList.add("hidden");

  // Show the section
  section.classList.remove("hidden");
}

function waitForFitProceedConfirmation() {
  return new Promise((resolve) => {
    // Show warning
    elements.fitWarning?.classList.remove("hidden");

    const cleanup = () => {
      elements.fitProceedBtn?.removeEventListener("click", onProceed);
      elements.fitCancelBtn?.removeEventListener("click", onCancel);
    };

    const onProceed = () => {
      cleanup();
      elements.fitWarning?.classList.add("hidden");
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      elements.fitWarning?.classList.add("hidden");
      resolve(false);
    };

    elements.fitProceedBtn?.addEventListener("click", onProceed);
    elements.fitCancelBtn?.addEventListener("click", onCancel);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Form Fill
// ═══════════════════════════════════════════════════════════════════════════

async function handleExtractFields() {
  elements.extractFieldsBtn.disabled = true;
  hideError(elements.formfillError);
  elements.formfillAnswers?.classList.add("hidden");

  try {
    const response = await sendMessage({ type: "EXTRACT_FORM_FIELDS" });

    if (!response.success) {
      if (response.needsPermission) {
        await handleGrantPermission();
        return;
      }
      throw new Error(response.error || "Failed to extract form fields");
    }

    extractedFormFields = response.fields;
    const fields = response.fields || [];

    if (fields.length === 0) {
      showError(elements.formfillError, "No form fields detected on the current page. Navigate to an application form and try again.");
      return;
    }

    // Render fields preview
    if (elements.formfillFieldsCount) {
      elements.formfillFieldsCount.textContent = fields.length;
    }

    elements.formfillFieldsList.innerHTML = fields
      .map((field) => {
        const typeBadge = getFieldTypeBadge(field.type);
        return `
          <div class="formfill-field-item">
            <span class="formfill-field-label">${escapeHtml(field.label || field.name || field.placeholder || "Unnamed field")}</span>
            <span class="formfill-field-type ${typeBadge.class}">${typeBadge.text}</span>
          </div>
        `;
      })
      .join("");

    elements.formfillFieldsPreview?.classList.remove("hidden");
    elements.generateAnswersBtn?.classList.remove("hidden");

    showToast(`Detected ${fields.length} form fields`, "success");
  } catch (error) {
    console.error("[Panel] Field extraction failed:", error);
    showError(elements.formfillError, error.message || "Failed to extract fields");
  } finally {
    elements.extractFieldsBtn.disabled = false;
  }
}

async function handleAiAnalyzePage() {
  elements.aiAnalyzeBtn.disabled = true;
  elements.extractFieldsBtn.disabled = true;
  hideError(elements.formfillError);
  elements.formfillAnswers?.classList.add("hidden");
  elements.formfillFieldsPreview?.classList.add("hidden");
  elements.generateAnswersBtn?.classList.add("hidden");

  try {
    const jobDescription =
      elements.formfillJobDescription?.value?.trim() ||
      lastJobDescription ||
      "";

    const response = await sendMessage({
      type: "EXTRACT_AND_FILL_FROM_HTML",
      jobDescription,
      coverLetter: lastGeneratedCoverLetter,
    });

    if (!response.success) {
      if (response.needsPermission) {
        await handleGrantPermission();
        return;
      }
      throw new Error(response.error || "Failed to analyze page");
    }

    const answers = response.fields || [];

    // Track cache state for save-on-accept
    lastCacheKey = response.cacheKey || null;
    lastFromCache = response.fromCache === true;
    lastFormFillFields = answers;

    if (answers.length === 0) {
      showError(elements.formfillError, "No form fields detected by AI. The page may not contain a form.");
      return;
    }

    renderFormFillAnswers(answers);
    elements.formfillAnswers?.classList.remove("hidden");

    const cacheLabel = lastFromCache ? " (cached)" : "";
    const tokenInfo = !lastFromCache && response.usage
      ? ` (${response.usage.prompt_tokens + response.usage.completion_tokens} tokens)`
      : "";
    showToast(`AI found ${answers.length} fields${cacheLabel}${tokenInfo}`, "success");
  } catch (error) {
    console.error("[Panel] AI page analysis failed:", error);
    showError(elements.formfillError, error.message || "Failed to analyze page");
  } finally {
    elements.aiAnalyzeBtn.disabled = false;
    elements.extractFieldsBtn.disabled = false;
  }
}

function getFieldTypeBadge(type) {
  const badges = {
    text: { text: "Text", class: "type-text" },
    email: { text: "Email", class: "type-email" },
    tel: { text: "Phone", class: "type-tel" },
    url: { text: "URL", class: "type-url" },
    number: { text: "Number", class: "type-number" },
    textarea: { text: "Long text", class: "type-textarea" },
    select: { text: "Select", class: "type-select" },
    radio: { text: "Radio", class: "type-radio" },
    checkbox: { text: "Check", class: "type-checkbox" },
    file: { text: "File", class: "type-file" },
    contenteditable: { text: "Rich text", class: "type-textarea" },
  };
  return badges[type] || { text: type || "?", class: "type-text" };
}

async function handleGenerateAnswers() {
  if (!extractedFormFields || extractedFormFields.length === 0) {
    showError(elements.formfillError, "Please extract form fields first");
    return;
  }

  elements.generateAnswersBtn.disabled = true;
  hideError(elements.formfillError);

  try {
    // Use formfill job description, fall back to Generate tab job description
    const jobDescription =
      elements.formfillJobDescription?.value?.trim() ||
      lastJobDescription ||
      "";

    const response = await sendMessage({
      type: "GENERATE_FORM_FILL",
      formFields: extractedFormFields,
      jobDescription,
      coverLetter: lastGeneratedCoverLetter,
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to generate answers");
    }

    const answers = response.fields || [];
    renderFormFillAnswers(answers);
    elements.formfillAnswers?.classList.remove("hidden");

    showToast(`Generated ${answers.length} answers`, "success");
  } catch (error) {
    console.error("[Panel] Answer generation failed:", error);
    showError(elements.formfillError, error.message || "Failed to generate answers");
  } finally {
    elements.generateAnswersBtn.disabled = false;
  }
}

function renderFormFillAnswers(answers) {
  elements.formfillAnswersList.innerHTML = answers
    .filter((a) => a.suggestedValue !== null && a.suggestedValue !== "")
    .map((answer, index) => {
      const confidenceClass = `confidence-${answer.confidence || "medium"}`;
      const isLongText = (answer.suggestedValue || "").length > 100;

      return `
        <div class="formfill-answer-item" data-index="${index}">
          <div class="formfill-answer-header">
            <span class="formfill-answer-label">${escapeHtml(answer.label || "Field")}</span>
            <div class="formfill-answer-actions">
              <span class="confidence-badge ${confidenceClass}">${answer.confidence || "medium"}</span>
              <button class="btn-icon btn-sm copy-answer-btn" data-value="${escapeHtml(answer.suggestedValue)}" title="Copy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
          ${
            isLongText
              ? `<textarea class="formfill-answer-value textarea" rows="3" data-selector="${escapeHtml(answer.selector || "")}">${escapeHtml(answer.suggestedValue)}</textarea>`
              : `<input class="formfill-answer-value input" type="text" value="${escapeHtml(answer.suggestedValue)}" data-selector="${escapeHtml(answer.selector || "")}">`
          }
          ${answer.note ? `<span class="formfill-answer-note">${escapeHtml(answer.note)}</span>` : ""}
        </div>
      `;
    })
    .join("");

  // Attach copy handlers
  elements.formfillAnswersList.querySelectorAll(".copy-answer-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.value);
        showToast("Copied!", "success");
      } catch {
        showToast("Failed to copy", "error");
      }
    });
  });
}

async function handleCopyAllAnswers() {
  const answerInputs = elements.formfillAnswersList?.querySelectorAll(".formfill-answer-value");
  if (!answerInputs || answerInputs.length === 0) return;

  const labels = elements.formfillAnswersList.querySelectorAll(".formfill-answer-label");
  const lines = [];

  answerInputs.forEach((input, i) => {
    const label = labels[i]?.textContent || `Field ${i + 1}`;
    const value = input.value || input.textContent || "";
    if (value.trim()) {
      lines.push(`${label}: ${value.trim()}`);
    }
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n\n"));
    showToast("All answers copied!", "success");
  } catch {
    showToast("Failed to copy", "error");
  }
}

async function handleIterativeAutofill() {
  autofillAttempt = 0;
  lastAutofillResult = null;
  hideVerificationPrompt();
  await performAutofillAndVerify();
}

async function performAutofillAndVerify() {
  const answerInputs = elements.formfillAnswersList?.querySelectorAll(".formfill-answer-value");
  if (!answerInputs || answerInputs.length === 0) return;

  const fieldValues = [];
  const answerLabels = elements.formfillAnswersList.querySelectorAll(".formfill-answer-label");
  answerInputs.forEach((input, i) => {
    const selector = input.dataset.selector;
    const value = input.value || input.textContent || "";
    const label = answerLabels[i]?.textContent || "";
    if (selector && value.trim()) {
      fieldValues.push({ selector, label, value: value.trim() });
    }
  });

  if (fieldValues.length === 0) {
    showToast("No fields to auto-fill", "info");
    return;
  }

  autofillAttempt++;
  elements.autofillBtn.disabled = true;
  hideVerificationPrompt();

  try {
    const response = await sendMessage({
      type: "AUTOFILL_FORM",
      fieldValues,
    });

    if (!response.success) {
      if (response.needsPermission) {
        await handleGrantPermission();
        return;
      }
      showToast(response.error || "Auto-fill failed", "error");
      return;
    }

    lastAutofillResult = response;
    const fieldResults = response.fieldResults || [];
    const failedFields = fieldResults.filter((f) => f.status !== "filled");
    const isFinal = autofillAttempt >= MAX_AUTOFILL_ATTEMPTS;

    showToast(
      `Auto-filled ${response.filledCount || 0} of ${fieldValues.length} fields`,
      failedFields.length > 0 ? "info" : "success",
    );

    // Show verification prompt
    const userAction = await showVerificationPrompt(fieldResults, isFinal);

    if (userAction.action === "accept") {
      hideVerificationPrompt();
      showToast("Form fill complete!", "success");
    } else if (userAction.action === "retry") {
      await retryWithFeedback(fieldResults, userAction.feedback);
    }
  } catch (error) {
    console.error("[Panel] Auto-fill failed:", error);
    showToast("Auto-fill failed: " + error.message, "error");
  } finally {
    elements.autofillBtn.disabled = false;
  }
}

async function retryWithFeedback(fieldResults, userFeedback) {
  hideVerificationPrompt();

  elements.aiAnalyzeBtn.disabled = true;
  elements.autofillBtn.disabled = true;
  showToast(`Re-analyzing page (attempt ${autofillAttempt + 1}/${MAX_AUTOFILL_ATTEMPTS})...`, "info");

  // Small delay to allow dynamic forms to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const jobDescription =
      elements.formfillJobDescription?.value?.trim() ||
      lastJobDescription ||
      "";

    const response = await sendMessage({
      type: "EXTRACT_AND_FILL_FROM_HTML",
      jobDescription,
      coverLetter: lastGeneratedCoverLetter,
      previousAttempt: {
        attemptNumber: autofillAttempt,
        fieldResults,
        userFeedback: userFeedback || "",
      },
    });

    if (!response.success) {
      if (response.needsPermission) {
        await handleGrantPermission();
        return;
      }
      showToast(response.error || "Re-analysis failed", "error");
      return;
    }

    const answers = response.fields || [];
    if (answers.length === 0) {
      showToast("No fields detected on retry", "info");
      return;
    }

    renderFormFillAnswers(answers);
    elements.formfillAnswers?.classList.remove("hidden");

    // Automatically trigger fill with the new answers
    await performAutofillAndVerify();
  } catch (error) {
    console.error("[Panel] Retry failed:", error);
    showToast("Retry failed: " + error.message, "error");
  } finally {
    elements.aiAnalyzeBtn.disabled = false;
    elements.autofillBtn.disabled = false;
  }
}

function showVerificationPrompt(fieldResults, isFinal) {
  return new Promise((resolve) => {
    const failedFields = fieldResults.filter((f) => f.status !== "filled");

    // Update status text
    if (failedFields.length > 0) {
      elements.verificationStatus.textContent = `${failedFields.length} field${failedFields.length !== 1 ? "s" : ""} may need attention`;
      elements.verificationStatus.classList.add("has-issues");
    } else {
      elements.verificationStatus.textContent = "All fields filled successfully";
      elements.verificationStatus.classList.remove("has-issues");
    }

    // Render failed fields list
    if (failedFields.length > 0) {
      elements.verificationFailedList.innerHTML = failedFields
        .map((f) => `
          <div class="verification-failed-item">
            <span class="failed-icon">\u2717</span>
            <span class="failed-label">${escapeHtml(f.label || f.selector)}</span>
            <span class="failed-reason">${escapeHtml(f.status)}</span>
          </div>
        `)
        .join("");
      elements.verificationFailedList.classList.remove("hidden");
    } else {
      elements.verificationFailedList.classList.add("hidden");
    }

    // Update retry button text and visibility
    if (isFinal) {
      elements.verificationRetryBtn.disabled = true;
      elements.verificationRetryText.textContent = "Max retries reached";
    } else {
      elements.verificationRetryBtn.disabled = false;
      elements.verificationRetryText.textContent = `Retry (${autofillAttempt}/${MAX_AUTOFILL_ATTEMPTS})`;
    }

    // Clear feedback
    if (elements.verificationFeedback) {
      elements.verificationFeedback.value = "";
    }

    // Show the section
    elements.autofillVerification?.classList.remove("hidden");

    const cleanup = () => {
      elements.verificationAcceptBtn?.removeEventListener("click", onAccept);
      elements.verificationRetryBtn?.removeEventListener("click", onRetry);
    };

    const onAccept = () => {
      cleanup();
      // Save template to cache on successful accept
      if (lastCacheKey && lastFormFillFields?.length && !lastFromCache) {
        sendMessage({
          type: "SAVE_FORM_TEMPLATE",
          cacheKey: lastCacheKey,
          fields: lastFormFillFields,
        }).catch((err) => console.warn("[Panel] Failed to save form template:", err));
      }
      // Reset fail count if using cached template
      if (lastCacheKey && lastFromCache) {
        sendMessage({
          type: "RESET_FORM_TEMPLATE_FAIL",
          cacheKey: lastCacheKey,
        }).catch(() => {});
      }
      resolve({ action: "accept", feedback: "" });
    };

    const onRetry = () => {
      cleanup();
      // Increment fail count for cache
      if (lastCacheKey) {
        sendMessage({
          type: "INCREMENT_FORM_TEMPLATE_FAIL",
          cacheKey: lastCacheKey,
        }).catch(() => {});
      }
      const feedback = elements.verificationFeedback?.value?.trim() || "";
      resolve({ action: "retry", feedback });
    };

    elements.verificationAcceptBtn?.addEventListener("click", onAccept);
    elements.verificationRetryBtn?.addEventListener("click", onRetry);
  });
}

function hideVerificationPrompt() {
  elements.autofillVerification?.classList.add("hidden");
  if (elements.verificationFeedback) {
    elements.verificationFeedback.value = "";
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
    const aggrValue =
      settings.defaultAggressiveness ??
      (settings.aggressiveFit?.aggressivenessOverride != null
        ? Math.round(settings.aggressiveFit.aggressivenessOverride * 100)
        : undefined);
    if (aggrValue !== undefined && elements.pdfAggressiveness) {
      elements.pdfAggressiveness.value = aggrValue;
      if (elements.pdfAggressivenessValue) {
        elements.pdfAggressivenessValue.textContent = `${aggrValue}%`;
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

function toggleApiKeyVisibility() {
  const input = elements.apiKeyInput;
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

async function handleClearFormCache() {
  try {
    await sendMessage({ type: "CLEAR_FORM_TEMPLATE_CACHE" });
    showToast("Form cache cleared", "success");
  } catch (error) {
    console.error("[Panel] Failed to clear form cache:", error);
    showToast("Failed to clear cache", "error");
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
