/**
 * ApplyHawk Options Page
 * Handles settings and resume editing with tabbed interface
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker (relative to options.html)
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let currentTab = "general";
let experienceCount = 0;

// ═══════════════════════════════════════════════════════════════════════════
// DOM Elements
// ═══════════════════════════════════════════════════════════════════════════

const elements = {
  // General tab
  language: document.getElementById("language"),
  defaultAggressiveness: document.getElementById("default-aggressiveness"),
  defaultAggressivenessValue: document.getElementById(
    "default-aggressiveness-value",
  ),
  autoFitEnabled: document.getElementById("auto-fit-enabled"),
  contactTelegram: document.getElementById("contact-telegram"),
  contactEmail: document.getElementById("contact-email"),
  salaryExpectation: document.getElementById("salary-expectation"),

  // Resume tab
  pdfImport: document.getElementById("pdf-import"),
  importStatus: document.getElementById("import-status"),
  fullName: document.getElementById("full-name"),
  title: document.getElementById("title"),
  summary: document.getElementById("summary"),
  skills: document.getElementById("skills"),
  experienceList: document.getElementById("experience-list"),
  addExperience: document.getElementById("add-experience"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  telegram: document.getElementById("telegram"),
  linkedin: document.getElementById("linkedin"),

  // General tab (continued)
  coverTemplate: document.getElementById("cover-template"),

  // Platforms tab
  hhAuthBadge: document.getElementById("hh-auth-badge"),
  loadHHResumes: document.getElementById("load-hh-resumes"),
  deleteAllResumes: document.getElementById("delete-all-resumes"),
  hhResumesList: document.getElementById("hh-resumes-list"),

  // Actions
  saveBtn: document.getElementById("save-btn"),
  resetBtn: document.getElementById("reset-btn"),
  toastContainer: document.getElementById("toast-container"),
};

const experienceTemplate = document.getElementById("experience-template");

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  setupTabNavigation();
  setupEventListeners();
  await loadSettings();
  await loadResume();
  checkHHAuth();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Navigation
// ═══════════════════════════════════════════════════════════════════════════

function setupTabNavigation() {
  const tabs = document.querySelectorAll(".settings-tabs .tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;

  // Update tab buttons
  document.querySelectorAll(".settings-tabs .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `tab-${tabId}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
  // Actions
  elements.saveBtn?.addEventListener("click", saveAll);
  elements.resetBtn?.addEventListener("click", resetAll);

  // General tab
  elements.defaultAggressiveness?.addEventListener("input", (e) => {
    elements.defaultAggressivenessValue.textContent = `${e.target.value}%`;
  });

  // Resume tab
  elements.addExperience?.addEventListener("click", () => addExperienceItem());
  elements.pdfImport?.addEventListener("change", handlePdfImport);

  // Platforms tab
  elements.loadHHResumes?.addEventListener("click", loadHHResumes);
  elements.deleteAllResumes?.addEventListener("click", deleteAllHHResumes);
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings Management
// ═══════════════════════════════════════════════════════════════════════════

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get("settings");
    const settings = result.settings || {};

    // General tab
    if (elements.language) {
      elements.language.value = settings.language || "en";
    }

    if (elements.defaultAggressiveness) {
      const aggrValue = Math.round(
        (settings.aggressiveFit?.aggressivenessOverride ?? 0.5) * 100,
      );
      elements.defaultAggressiveness.value = aggrValue;
      elements.defaultAggressivenessValue.textContent = `${aggrValue}%`;
    }

    if (elements.autoFitEnabled) {
      elements.autoFitEnabled.checked =
        settings.aggressiveFit?.enabled !== false;
    }

    if (elements.contactTelegram) {
      elements.contactTelegram.value = settings.contactTelegram || "";
    }
    if (elements.contactEmail) {
      elements.contactEmail.value = settings.contactEmail || "";
    }
    if (elements.salaryExpectation) {
      elements.salaryExpectation.value = settings.salaryExpectation || "";
    }

    // Custom prompt template (in General tab)
    if (elements.coverTemplate) {
      elements.coverTemplate.value = settings.coverLetterTemplate || "";
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
    showToast("Failed to load settings", "error");
  }
}

async function loadResume() {
  try {
    const result = await chrome.storage.local.get("baseResume");
    const resume = result.baseResume || {};

    elements.fullName.value = resume.fullName || "";
    elements.title.value = resume.title || "";
    elements.summary.value = resume.summary || "";
    elements.skills.value = resume.skills?.join(", ") || "";
    elements.email.value = resume.contacts?.email || "";
    elements.phone.value = resume.contacts?.phone || "";
    elements.telegram.value = resume.contacts?.telegram || "";
    elements.linkedin.value = resume.contacts?.linkedin || "";

    // Load experience
    elements.experienceList.innerHTML = "";
    experienceCount = 0;
    if (resume.experience?.length) {
      for (const exp of resume.experience) {
        addExperienceItem(exp);
      }
    }
  } catch (error) {
    console.error("Failed to load resume:", error);
  }
}

function collectSettings() {
  const defaultAggr =
    (Number.parseInt(elements.defaultAggressiveness?.value, 10) || 50) / 100;

  return {
    language: elements.language?.value || "en",
    coverLetterTemplate: elements.coverTemplate?.value.trim() || "",
    contactTelegram: elements.contactTelegram?.value.trim() || "",
    contactEmail: elements.contactEmail?.value.trim() || "",
    salaryExpectation: elements.salaryExpectation?.value.trim() || "",
    aggressiveFit: {
      enabled: elements.autoFitEnabled?.checked !== false,
      minFitScore: 0.15,
      maxAggressiveness: 0.95,
      aggressivenessOverride: defaultAggr,
    },
  };
}

function collectResume() {
  const experience = [];
  const experienceItems =
    elements.experienceList.querySelectorAll(".experience-item");

  for (const item of experienceItems) {
    const achievementsText = item
      .querySelector(".exp-achievements")
      ?.value.trim();
    const achievements = achievementsText
      ? achievementsText
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    experience.push({
      company: item.querySelector(".exp-company")?.value.trim() || "",
      position: item.querySelector(".exp-position")?.value.trim() || "",
      startDate: item.querySelector(".exp-start")?.value || "",
      endDate: item.querySelector(".exp-end")?.value || null,
      description: item.querySelector(".exp-description")?.value.trim() || "",
      achievements,
    });
  }

  const skillsText = elements.skills?.value.trim() || "";
  const skills = skillsText
    ? skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    fullName: elements.fullName?.value.trim() || "",
    title: elements.title?.value.trim() || "",
    summary: elements.summary?.value.trim() || "",
    skills,
    experience,
    contacts: {
      email: elements.email?.value.trim() || "",
      phone: elements.phone?.value.trim() || "",
      telegram: elements.telegram?.value.trim() || "",
      linkedin: elements.linkedin?.value.trim() || "",
    },
  };
}

async function saveAll() {
  elements.saveBtn.disabled = true;
  const originalText = elements.saveBtn.innerHTML;
  elements.saveBtn.innerHTML = `
    <span class="spinner spinner-sm"></span>
    Saving...
  `;

  try {
    const settings = collectSettings();
    const resume = collectResume();

    await chrome.storage.local.set({
      settings,
      baseResume: resume,
    });

    showToast("Settings saved successfully", "success");
  } catch (error) {
    console.error("Failed to save:", error);
    showToast("Failed to save: " + error.message, "error");
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.innerHTML = originalText;
  }
}

async function resetAll() {
  if (!confirm("Are you sure you want to reset all settings?")) {
    return;
  }

  try {
    await chrome.storage.local.remove(["settings", "baseResume"]);
    await loadSettings();
    await loadResume();
    showToast("Settings reset", "info");
  } catch (error) {
    showToast("Failed to reset: " + error.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Experience Management
// ═══════════════════════════════════════════════════════════════════════════

function addExperienceItem(data = null) {
  experienceCount++;
  const template = experienceTemplate.content.cloneNode(true);
  const item = template.querySelector(".experience-item");

  // Set experience number
  const numberEl = item.querySelector(".experience-number");
  if (numberEl) {
    numberEl.textContent = `Experience #${experienceCount}`;
  }

  // Fill with data if provided
  if (data) {
    const companyEl = item.querySelector(".exp-company");
    const positionEl = item.querySelector(".exp-position");
    const startEl = item.querySelector(".exp-start");
    const endEl = item.querySelector(".exp-end");
    const descEl = item.querySelector(".exp-description");
    const achievementsEl = item.querySelector(".exp-achievements");

    if (companyEl) companyEl.value = data.company || "";
    if (positionEl) positionEl.value = data.position || "";
    if (startEl) startEl.value = data.startDate || "";
    if (endEl) endEl.value = data.endDate || "";
    if (descEl) descEl.value = data.description || "";
    if (achievementsEl)
      achievementsEl.value = data.achievements?.join("\n") || "";
  }

  // Setup remove button
  const removeBtn = item.querySelector(".btn-remove");
  removeBtn?.addEventListener("click", () => {
    item.remove();
    updateExperienceNumbers();
  });

  elements.experienceList.appendChild(item);
}

function updateExperienceNumbers() {
  const items = elements.experienceList.querySelectorAll(".experience-item");
  items.forEach((item, index) => {
    const numberEl = item.querySelector(".experience-number");
    if (numberEl) {
      numberEl.textContent = `Experience #${index + 1}`;
    }
  });
  experienceCount = items.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF Import
// ═══════════════════════════════════════════════════════════════════════════

async function handlePdfImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const statusEl = elements.importStatus;
  statusEl.textContent = "Extracting text from PDF...";
  statusEl.className = "import-status loading";

  try {
    // Extract text from PDF
    const pdfText = await extractTextFromPdf(file);

    if (!pdfText || pdfText.length < 100) {
      throw new Error("Could not extract text from PDF. Try a different file.");
    }

    statusEl.textContent = "Analyzing resume with AI...";

    // Send to AI for parsing
    const response = await chrome.runtime.sendMessage({
      type: "PARSE_RESUME_PDF",
      pdfText: pdfText,
    });

    if (!response.success) {
      throw new Error(response.error || "Error analyzing resume");
    }

    // Fill the form with parsed data
    fillResumeForm(response.resume);

    statusEl.textContent = "Resume imported successfully!";
    statusEl.className = "import-status success";

    // Switch to resume tab
    switchTab("resume");

    // Clear after 3 seconds
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "import-status";
    }, 3000);
  } catch (error) {
    console.error("PDF import error:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "import-status error";
  }

  // Clear the file input for re-import
  event.target.value = "";
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText.trim();
}

function fillResumeForm(resume) {
  elements.fullName.value = resume.fullName || "";
  elements.title.value = resume.title || "";
  elements.summary.value = resume.summary || "";
  elements.skills.value = resume.skills?.join(", ") || "";
  elements.email.value = resume.contacts?.email || "";
  elements.phone.value = resume.contacts?.phone || "";
  elements.telegram.value = resume.contacts?.telegram || "";
  elements.linkedin.value = resume.contacts?.linkedin || "";

  // Clear existing experience and add new
  elements.experienceList.innerHTML = "";
  experienceCount = 0;
  if (resume.experience?.length) {
    for (const exp of resume.experience) {
      addExperienceItem(exp);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HH.ru Integration
// ═══════════════════════════════════════════════════════════════════════════

async function checkHHAuth() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_HH_AUTH",
    });

    if (response.success && response.authenticated) {
      elements.hhAuthBadge.textContent = "Connected";
      elements.hhAuthBadge.className = "badge badge-success";
    } else {
      elements.hhAuthBadge.textContent = "Not Connected";
      elements.hhAuthBadge.className = "badge";
    }
  } catch (error) {
    console.error("Failed to check HH auth:", error);
  }
}

async function loadHHResumes() {
  elements.loadHHResumes.disabled = true;
  const originalHTML = elements.loadHHResumes.innerHTML;
  elements.loadHHResumes.innerHTML = `
    <span class="spinner spinner-sm"></span>
    Loading...
  `;

  elements.hhResumesList.innerHTML =
    '<p class="form-hint">Loading resumes...</p>';

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_USER_RESUMES",
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to load resumes");
    }

    renderHHResumes(response.resumes);
  } catch (error) {
    console.error("Failed to load HH resumes:", error);
    elements.hhResumesList.innerHTML = `<p class="form-hint" style="color: var(--color-error)">Error: ${error.message}</p>`;
  } finally {
    elements.loadHHResumes.disabled = false;
    elements.loadHHResumes.innerHTML = originalHTML;
  }
}

function renderHHResumes(resumes) {
  if (!resumes || resumes.length === 0) {
    elements.hhResumesList.innerHTML =
      '<p class="form-hint">No resumes found</p>';
    elements.deleteAllResumes.classList.add("hidden");
    return;
  }

  elements.deleteAllResumes.classList.remove("hidden");

  const html = resumes
    .map(
      (resume) => `
      <div class="hh-resume-item" data-hash="${resume.hash}">
        <div class="hh-resume-info">
          <div class="hh-resume-title">${escapeHtml(resume.title)}</div>
          <div class="hh-resume-meta">
            <span class="hh-resume-status ${resume.status}">${getStatusText(resume.status)}</span>
            ${resume.keySkills?.length ? `<span class="hh-resume-skills">${resume.keySkills.slice(0, 3).join(", ")}</span>` : ""}
          </div>
        </div>
        <button type="button" class="btn btn-danger btn-sm delete-resume-btn" data-hash="${resume.hash}">
          Delete
        </button>
      </div>
    `,
    )
    .join("");

  elements.hhResumesList.innerHTML = html;

  // Attach delete handlers
  elements.hhResumesList
    .querySelectorAll(".delete-resume-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => deleteHHResume(btn.dataset.hash));
    });
}

function getStatusText(status) {
  const statusMap = {
    published: "Published",
    hidden: "Hidden",
    draft: "Draft",
    unknown: "Unknown",
  };
  return statusMap[status] || status;
}

async function deleteHHResume(hash) {
  if (!confirm("Delete this resume from HH.ru?")) {
    return;
  }

  const item = elements.hhResumesList.querySelector(
    `.hh-resume-item[data-hash="${hash}"]`,
  );
  const btn = item?.querySelector(".delete-resume-btn");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "...";
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "DELETE_RESUME",
      resumeHash: hash,
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to delete resume");
    }

    item?.remove();
    showToast("Resume deleted", "success");

    // Check if list is now empty
    const remaining =
      elements.hhResumesList.querySelectorAll(".hh-resume-item");
    if (remaining.length === 0) {
      elements.hhResumesList.innerHTML =
        '<p class="form-hint">No resumes found</p>';
      elements.deleteAllResumes.classList.add("hidden");
    }
  } catch (error) {
    console.error("Failed to delete resume:", error);
    showToast(`Error: ${error.message}`, "error");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  }
}

async function deleteAllHHResumes() {
  const items = elements.hhResumesList.querySelectorAll(".hh-resume-item");
  const count = items.length;

  if (
    !confirm(`Delete ALL ${count} resumes from HH.ru? This cannot be undone!`)
  ) {
    return;
  }

  elements.deleteAllResumes.disabled = true;
  const originalHTML = elements.deleteAllResumes.innerHTML;
  elements.deleteAllResumes.innerHTML = `
    <span class="spinner spinner-sm"></span>
    Deleting...
  `;

  let deleted = 0;
  let failed = 0;

  for (const item of items) {
    const hash = item.dataset.hash;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "DELETE_RESUME",
        resumeHash: hash,
      });

      if (response.success) {
        item.remove();
        deleted++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to delete resume ${hash}:`, error);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  elements.deleteAllResumes.disabled = false;
  elements.deleteAllResumes.innerHTML = originalHTML;

  if (failed === 0) {
    showToast(`Deleted ${deleted} resumes`, "success");
    elements.hhResumesList.innerHTML =
      '<p class="form-hint">No resumes found</p>';
    elements.deleteAllResumes.classList.add("hidden");
  } else {
    showToast(`Deleted ${deleted}, failed: ${failed}`, "error");
    await loadHHResumes();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${
        type === "success"
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
          : type === "error"
            ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
            : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
      }
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(16px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", init);
