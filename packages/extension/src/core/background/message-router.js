/**
 * Core Message Router
 * Handles generic AI and utility message types
 * Platform-specific handlers are registered separately
 */

import {
  assessFitScore,
  calculateAggressiveness,
  generateCoverLetter,
  generatePersonalizedResume,
  generateResumeTitle,
  parseResumePDF,
  parseUniversalVacancy,
  shouldSkipVacancy,
} from "../ai/openrouter.js";
import { generatePdfResume } from "../lib/pdf-generator.js";
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
  // Open side panel when extension icon is clicked
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
  });

  // Enable side panel for all URLs
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
