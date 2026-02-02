/**
 * Core Message Router
 * Handles generic AI and utility message types
 * Platform-specific handlers are registered separately
 */

import {
  assessFitScore,
  calculateAggressiveness,
  generateCoverLetter,
  generateFormFillAnswers,
  generateFormFillFromHtml,
  generatePersonalizedResume,
  generateResumeTitle,
  parseResumePDF,
  parseUniversalVacancy,
  shouldSkipVacancy,
} from "../ai/openrouter.js";
import { generatePdfResume } from "../lib/pdf-generator.js";
import {
  hasHostPermission,
  isKnownJobSite,
  getOriginPattern,
} from "../lib/host-permissions.js";
import { getBaseResume, getSettings } from "../lib/storage.js";

// Registry for platform-specific handlers
const platformHandlers = new Map();

/**
 * Register a platform's message handlers
 * @param {string} platformName - Name of the platform (e.g., 'hh')
 * @param {Object} handlers - Object mapping message types to handler functions
 */
export function registerPlatformHandlers(platformName, handlers) {
  for (const [type, handler] of Object.entries(handlers)) {
    platformHandlers.set(type, { platform: platformName, handler });
  }
  console.log(
    `[MessageRouter] Registered ${Object.keys(handlers).length} handlers for ${platformName}`,
  );
}

/**
 * Core message handlers (platform-agnostic)
 */
const coreHandlers = {
  // Settings
  GET_SETTINGS: async () => await getSettings(),
  GET_BASE_RESUME: async () => await getBaseResume(),

  // AI Generation
  ASSESS_FIT_SCORE: async (message) => {
    const fitResult = await assessFitScore(message.vacancy, message.resume);
    const settings = await getSettings();
    const aggressiveFit = settings.aggressiveFit || {};

    // Check if vacancy should be skipped
    const skipCheck = shouldSkipVacancy(
      fitResult.fitScore,
      aggressiveFit.minFitScore ?? 0.15,
      aggressiveFit.maxAggressiveness ?? 0.95,
    );

    // Calculate aggressiveness
    const aggressiveness = calculateAggressiveness(
      fitResult.fitScore,
      aggressiveFit.aggressivenessOverride,
    );

    return {
      ...fitResult,
      skipRecommendation: skipCheck,
      aggressiveness,
    };
  },

  GENERATE_COVER_LETTER: async (message) =>
    await generateCoverLetter(
      message.vacancy,
      message.personalized,
      message.fitAssessment,
      message.aggressiveness,
    ),

  GENERATE_PERSONALIZED_RESUME: async (message) => {
    console.log("[DEBUG:Router] GENERATE_PERSONALIZED_RESUME received:", {
      hasBaseResume: !!message.baseResume,
      baseResumeExperienceCount: message.baseResume?.experience?.length,
      vacancyName: message.vacancy?.name,
      vacancyKeySkills: message.vacancy?.keySkills,
      aggressiveness: message.aggressiveness,
      hasFitAssessment: !!message.fitAssessment,
    });
    const result = await generatePersonalizedResume(
      message.baseResume,
      message.vacancy,
      message.fitAssessment,
      message.aggressiveness,
    );
    console.log("[DEBUG:Router] GENERATE_PERSONALIZED_RESUME result:", {
      success: result.success,
      experienceCount: result.experience?.length,
      keySkillsCount: result.keySkills?.length,
      appliedAggressiveness: result.appliedAggressiveness,
    });
    return result;
  },

  PARSE_RESUME_PDF: async (message) => await parseResumePDF(message.pdfText),

  GENERATE_RESUME_TITLE: async (message) =>
    await generateResumeTitle(message.vacancy, message.resume),

  // Universal CV Generation
  PARSE_UNIVERSAL_VACANCY: async (message) => {
    console.log("[DEBUG:Router] PARSE_UNIVERSAL_VACANCY received:", {
      rawTextLength: message.rawText?.length,
    });
    const result = await parseUniversalVacancy(message.rawText);
    console.log("[DEBUG:Router] PARSE_UNIVERSAL_VACANCY result:", {
      success: result.success,
      vacancyName: result.vacancy?.name,
      vacancyCompany: result.vacancy?.company,
      keySkillsCount: result.vacancy?.keySkills?.length,
    });
    return result;
  },

  GENERATE_PDF_RESUME: async (message) => {
    console.log("[DEBUG:Router] GENERATE_PDF_RESUME received:", {
      hasPersonalizedResume: !!message.personalizedResume,
      personalizedExperienceCount:
        message.personalizedResume?.experience?.length,
      personalizedKeySkillsCount: message.personalizedResume?.keySkills?.length,
      hasBaseResume: !!message.baseResume,
      baseExperienceCount: message.baseResume?.experience?.length,
    });
    const pdfBytes = await generatePdfResume(
      message.personalizedResume,
      message.baseResume,
      message.vacancy,
    );
    console.log(
      "[DEBUG:Router] GENERATE_PDF_RESUME result: PDF bytes generated, size:",
      pdfBytes.length,
    );
    // Convert Uint8Array to regular array for message passing
    return {
      success: true,
      pdfBytes: Array.from(pdfBytes),
    };
  },

  // Research Mode handlers (generic)
  SET_RESEARCH_MODE: async (message) => {
    await chrome.storage.local.set({ researchMode: message.enabled });
    return { success: true, enabled: message.enabled };
  },

  GET_RESEARCH_MODE: async () => {
    const result = await chrome.storage.local.get("researchMode");
    return { enabled: result.researchMode === true };
  },

  CAPTURE_REQUEST: async (message) => await captureRequest(message.data),

  GET_CAPTURED_REQUESTS: async () => await getCapturedRequests(),

  CLEAR_CAPTURED_REQUESTS: async () => {
    await chrome.storage.local.set({ capturedRequests: [] });
    return { success: true };
  },

  EXPORT_CAPTURED_REQUESTS: async () => await exportCapturedRequests(),

  // Host permission handlers
  CHECK_HOST_PERMISSION: async (message) => {
    const url = message.url;
    if (!url) return { success: false, error: "No URL provided" };
    const hasPermission = await hasHostPermission(url);
    const isKnown = isKnownJobSite(url);
    return { success: true, hasPermission, isKnown };
  },

  INJECT_CONTENT_SCRIPT: async (_message, _sender) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !tab.url) {
        return { success: false, error: "No active tab found" };
      }
      if (isKnownJobSite(tab.url)) {
        return { success: true, alreadyHandled: true };
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["platforms/universal/content-script.js"],
      });
      console.log(
        "[MessageRouter] Injected content script on:",
        tab.url,
      );
      return { success: true };
    } catch (error) {
      console.error("[MessageRouter] INJECT_CONTENT_SCRIPT error:", error);
      return { success: false, error: error.message };
    }
  },

  // Form Fill handlers
  EXTRACT_FORM_FIELDS: async (_message, _sender) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        return { success: false, error: "No active tab found" };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["platforms/universal/form-extractor.js"],
      });

      const result = results?.[0]?.result;
      if (!result || !result.fields) {
        return {
          success: false,
          error: "Failed to extract fields from page",
        };
      }

      console.log(
        `[MessageRouter] Extracted ${result.fields.length} form fields from ${result.pageUrl}`,
      );

      return {
        success: true,
        fields: result.fields,
        pageTitle: result.pageTitle,
        pageUrl: result.pageUrl,
      };
    } catch (error) {
      console.error("[MessageRouter] EXTRACT_FORM_FIELDS error:", error);
      if (
        error.message?.includes("Cannot access") ||
        error.message?.includes("permission")
      ) {
        return {
          success: false,
          error: "Permission needed to access this page",
          needsPermission: true,
        };
      }
      return { success: false, error: error.message };
    }
  },

  EXTRACT_AND_FILL_FROM_HTML: async (message, _sender) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        return { success: false, error: "No active tab found" };
      }

      // Inject html-extractor.js to capture cleaned page HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["platforms/universal/html-extractor.js"],
      });

      const extraction = results?.[0]?.result;
      if (!extraction || !extraction.html) {
        return {
          success: false,
          error: "Failed to extract HTML from page",
        };
      }

      console.log(
        `[MessageRouter] Extracted ${extraction.charCount} chars of HTML from ${extraction.pageUrl}`,
      );

      // Get base resume
      const baseResume = await getBaseResume();
      if (!baseResume || !baseResume.fullName) {
        return {
          success: false,
          error: "Base resume not configured",
        };
      }

      // Call LLM with page HTML + resume data
      const result = await generateFormFillFromHtml(
        extraction.html,
        baseResume,
        message.jobDescription || "",
        message.coverLetter || "",
      );

      return {
        ...result,
        pageTitle: extraction.pageTitle,
        pageUrl: extraction.pageUrl,
        htmlCharCount: extraction.charCount,
      };
    } catch (error) {
      console.error("[MessageRouter] EXTRACT_AND_FILL_FROM_HTML error:", error);
      if (
        error.message?.includes("Cannot access") ||
        error.message?.includes("permission")
      ) {
        return {
          success: false,
          error: "Permission needed to access this page",
          needsPermission: true,
        };
      }
      return { success: false, error: error.message };
    }
  },

  GENERATE_FORM_FILL: async (message) => {
    const baseResume = await getBaseResume();
    if (!baseResume || !baseResume.fullName) {
      return {
        success: false,
        error: "Base resume not configured",
      };
    }

    return await generateFormFillAnswers(
      message.formFields,
      baseResume,
      message.jobDescription || "",
      message.coverLetter || "",
    );
  },

  AUTOFILL_FORM: async (message) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        return { success: false, error: "No active tab found" };
      }

      const fieldValues = message.fieldValues || [];

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (fields) => {
          let filledCount = 0;

          for (const { selector, value } of fields) {
            try {
              const el = document.querySelector(selector);
              if (!el) continue;

              if (el.tagName === "SELECT") {
                el.value = value;
                el.dispatchEvent(new Event("change", { bubbles: true }));
                filledCount++;
              } else if (
                el.tagName === "INPUT" ||
                el.tagName === "TEXTAREA"
              ) {
                // Use native setter to trigger React/Angular change detection
                const nativeInputValueSetter =
                  Object.getOwnPropertyDescriptor(
                    el.tagName === "TEXTAREA"
                      ? HTMLTextAreaElement.prototype
                      : HTMLInputElement.prototype,
                    "value",
                  )?.set;

                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(el, value);
                } else {
                  el.value = value;
                }

                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
                el.dispatchEvent(new Event("blur", { bubbles: true }));
                filledCount++;
              } else if (el.getAttribute("contenteditable") === "true") {
                el.textContent = value;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                filledCount++;
              }
            } catch (e) {
              console.warn("[ApplyHawk] Failed to fill field:", selector, e);
            }
          }

          return { filledCount, totalFields: fields.length };
        },
        args: [fieldValues],
      });

      const result = results?.[0]?.result;
      return {
        success: true,
        filledCount: result?.filledCount || 0,
        totalFields: result?.totalFields || fieldValues.length,
      };
    } catch (error) {
      console.error("[MessageRouter] AUTOFILL_FORM error:", error);
      if (
        error.message?.includes("Cannot access") ||
        error.message?.includes("permission")
      ) {
        return {
          success: false,
          error: "Permission needed to access this page",
          needsPermission: true,
        };
      }
      return { success: false, error: error.message };
    }
  },

  // Universal job detection handlers
  UNIVERSAL_JOB_DETECTED: async (message, sender) => {
    const { payload } = message;

    // Validate settings before storing
    const settings = await getSettings();
    if (!settings.openRouterApiKey) {
      return {
        success: false,
        error: "API key not configured",
        needsSetup: true,
      };
    }

    const baseResume = await getBaseResume();
    if (!baseResume || !baseResume.fullName) {
      return {
        success: false,
        error: "Base resume not configured",
        needsSetup: true,
      };
    }

    // Store vacancy data with timestamp for TTL
    await chrome.storage.local.set({
      detectedVacancy: {
        ...payload,
        timestamp: Date.now(),
        tabId: sender.tab?.id,
      },
    });

    console.log("[MessageRouter] Vacancy stored:", {
      title: payload.title,
      platform: payload.detection?.platform,
      url: payload.url,
    });

    // Open side panel in same handler to preserve user gesture context
    let panelOpened = false;
    try {
      const windowId = sender.tab?.windowId;
      if (windowId) {
        await chrome.sidePanel.open({ windowId });
        panelOpened = true;
      }
    } catch (error) {
      console.error("[MessageRouter] Failed to open side panel:", error);
    }

    return { success: true, panelOpened };
  },
};

/**
 * Main message handler
 * Routes messages to appropriate handler (core or platform-specific)
 */
export async function handleMessage(message, sender) {
  const { type } = message;

  // Check core handlers first
  if (coreHandlers[type]) {
    return await coreHandlers[type](message, sender);
  }

  // Check platform-specific handlers
  if (platformHandlers.has(type)) {
    const { handler } = platformHandlers.get(type);
    return await handler(message, sender);
  }

  throw new Error(`Unknown message type: ${type}`);
}

/**
 * Initialize the message router
 * Sets up Chrome extension listeners
 */
export function initMessageRouter() {
  // Disable automatic panel-on-click so that action.onClicked fires,
  // giving us the activeTab permission grant on icon click.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

  // Open side panel when extension icon is clicked AND inject content script
  // on unknown sites (activeTab grants temporary permission for the click).
  chrome.action.onClicked.addListener(async (tab) => {
    // Open side panel
    chrome.sidePanel.open({ windowId: tab.windowId });

    // On non-known sites, inject the universal content script via activeTab
    if (tab.id && tab.url && !isKnownJobSite(tab.url) && tab.url.startsWith("http")) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["platforms/universal/content-script.js"],
        });
        console.log("[MessageRouter] Injected content script via activeTab on:", tab.url);
      } catch (error) {
        console.warn("[MessageRouter] Could not inject content script:", error.message);
      }
    }
  });

  // Message handler for communication with panel and content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error("[MessageRouter] Error:", error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  });

  // ATS form page auto-detection via URL patterns
  const ATS_URL_PATTERNS = [
    /\.greenhouse\.io\/.*\/apply/,
    /\.lever\.co\/.*\/apply/,
    /\.myworkdayjobs\.com\//,
    /\.workday\.com\/.*\/job\//,
    /\.smartrecruiters\.com\/.*\/apply/,
    /\.ashbyhq\.com\/.*\/application/,
    /\.icims\.com\//,
    /\/apply\b/,
    /\/application\b/,
  ];

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    // ATS form page auto-detection
    const isAtsForm = ATS_URL_PATTERNS.some((pattern) =>
      pattern.test(tab.url),
    );

    if (isAtsForm) {
      console.log("[MessageRouter] ATS form page detected:", tab.url);

      // Notify the side panel
      chrome.runtime
        .sendMessage({
          type: "ATS_FORM_DETECTED",
          url: tab.url,
          tabId,
        })
        .catch(() => {
          // Side panel may not be open — that's OK
        });
    }

    // Programmatic injection for sites with persistent permission (Flow B)
    // Skip known sites (already handled by declarative content_scripts),
    // non-http URLs, and chrome:// pages.
    if (
      tab.url.startsWith("http") &&
      !isKnownJobSite(tab.url) &&
      (await hasHostPermission(tab.url))
    ) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["platforms/universal/content-script.js"],
        });
        console.log(
          "[MessageRouter] Auto-injected content script (persistent permission):",
          tab.url,
        );
      } catch (error) {
        // Tab may have navigated away or closed — not critical
        console.warn("[MessageRouter] Auto-inject failed:", error.message);
      }
    }
  });

  console.log("[MessageRouter] Initialized");
}

// ========== Research Mode Functions ==========

const MAX_CAPTURED_REQUESTS = 500;

async function captureRequest(data) {
  try {
    const result = await chrome.storage.local.get("capturedRequests");
    let requests = result.capturedRequests || [];

    requests.unshift({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
    });

    if (requests.length > MAX_CAPTURED_REQUESTS) {
      requests = requests.slice(0, MAX_CAPTURED_REQUESTS);
    }

    await chrome.storage.local.set({ capturedRequests: requests });

    console.log(
      `[Research] Captured ${data.method} ${data.url} (${requests.length} total)`,
    );

    return { success: true, count: requests.length };
  } catch (error) {
    console.error("[Research] Failed to capture request:", error);
    return { success: false, error: error.message };
  }
}

async function getCapturedRequests() {
  try {
    const result = await chrome.storage.local.get("capturedRequests");
    const requests = result.capturedRequests || [];
    return { success: true, requests, count: requests.length };
  } catch (error) {
    return { success: false, error: error.message, requests: [] };
  }
}

async function exportCapturedRequests() {
  try {
    const result = await chrome.storage.local.get("capturedRequests");
    const requests = result.capturedRequests || [];

    const grouped = {};
    requests.forEach((req) => {
      const urlObj = new URL(req.url, "https://hh.ru");
      const pattern = urlObj.pathname.replace(/\/\d+/g, "/:id");
      if (!grouped[pattern]) {
        grouped[pattern] = [];
      }
      grouped[pattern].push(req);
    });

    return {
      success: true,
      exportData: {
        exportedAt: new Date().toISOString(),
        totalRequests: requests.length,
        requests: requests,
        groupedByEndpoint: grouped,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
