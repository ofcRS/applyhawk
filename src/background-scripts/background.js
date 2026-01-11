/**
 * Background service worker for HH Job AutoApply extension
 * Handles API calls and message routing
 */

import { getBaseResume, getSettings } from "../lib/storage.js";
import {
  applyToVacancy,
  checkHHAuth,
  createCompleteResume,
  createResume,
  getUserResumes,
  updateResumeCommon,
  updateResumeEducation,
  updateResumeExperience,
  updateResumeSkills,
} from "./hh-internal-api.js";
import {
  assessFitScore,
  calculateAggressiveness,
  generateCoverLetter,
  generatePersonalizedResume,
  generateResumeTitle,
  parseResumePDF,
  shouldSkipVacancy,
} from "./openrouter.js";

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
      console.error("Message handler error:", error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate async response
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    // Settings
    case "GET_SETTINGS":
      return await getSettings();

    case "GET_BASE_RESUME":
      return await getBaseResume();

    // AI Generation
    case "ASSESS_FIT_SCORE": {
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
    }

    case "GENERATE_COVER_LETTER":
      return await generateCoverLetter(
        message.vacancy,
        message.resume,
        message.fitAssessment,
      );

    case "GENERATE_PERSONALIZED_RESUME":
      return await generatePersonalizedResume(
        message.baseResume,
        message.vacancy,
        message.fitAssessment,
        message.aggressiveness,
      );

    case "PARSE_RESUME_PDF":
      return await parseResumePDF(message.pdfText);

    case "GENERATE_RESUME_TITLE":
      return await generateResumeTitle(message.vacancy, message.resume);

    // HH.ru Internal API (uses session cookies)
    case "CHECK_HH_AUTH":
      return await checkHHAuth();

    case "GET_USER_RESUMES":
      return await getUserResumes();

    case "CREATE_RESUME":
      return await createResume(message.title, message.professionalRoleId);

    case "UPDATE_RESUME_EXPERIENCE":
      return await updateResumeExperience(
        message.resumeHash,
        message.experience,
      );

    case "UPDATE_RESUME_SKILLS":
      return await updateResumeSkills(message.resumeHash, message.keySkills);

    case "UPDATE_RESUME_COMMON":
      return await updateResumeCommon(message.resumeHash, message.personalInfo);

    case "UPDATE_RESUME_EDUCATION":
      return await updateResumeEducation(message.resumeHash, message.education);

    case "CREATE_COMPLETE_RESUME":
      return await createCompleteResume(
        message.baseResume,
        message.personalizedData,
        message.title,
      );

    case "APPLY_INTERNAL":
      return await applyToVacancy(
        message.vacancyId,
        message.resumeHash,
        message.coverLetter,
      );

    // Research Mode handlers
    case "SET_RESEARCH_MODE":
      await chrome.storage.local.set({ researchMode: message.enabled });
      return { success: true, enabled: message.enabled };

    case "GET_RESEARCH_MODE":
      const rmResult = await chrome.storage.local.get("researchMode");
      return { enabled: rmResult.researchMode === true };

    case "CAPTURE_REQUEST":
      return await captureRequest(message.data);

    case "GET_CAPTURED_REQUESTS":
      return await getCapturedRequests();

    case "CLEAR_CAPTURED_REQUESTS":
      await chrome.storage.local.set({ capturedRequests: [] });
      return { success: true };

    case "EXPORT_CAPTURED_REQUESTS":
      return await exportCapturedRequests();

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
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

console.log("HH Job AutoApply background service worker started");
