/**
 * Options page logic
 * Handles settings and resume editing
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker (relative to options.html)
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";

// DOM Elements
const elements = {
  openRouterKey: document.getElementById("openrouter-key"),
  aiModel: document.getElementById("ai-model"),
  fullName: document.getElementById("full-name"),
  title: document.getElementById("title"),
  summary: document.getElementById("summary"),
  skills: document.getElementById("skills"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  telegram: document.getElementById("telegram"),
  experienceList: document.getElementById("experience-list"),
  addExperience: document.getElementById("add-experience"),
  coverTemplate: document.getElementById("cover-template"),
  saveBtn: document.getElementById("save-btn"),
  resetBtn: document.getElementById("reset-btn"),
  statusMessage: document.getElementById("status-message"),
  pdfImport: document.getElementById("pdf-import"),
  importStatus: document.getElementById("import-status"),
  // Contact fields for cover letters
  contactTelegram: document.getElementById("contact-telegram"),
  contactEmail: document.getElementById("contact-email"),
  // AggressiveFit elements
  aggressiveFitEnabled: document.getElementById("aggressivefit-enabled"),
  minFitScore: document.getElementById("min-fit-score"),
  minFitScoreValue: document.getElementById("min-fit-score-value"),
  maxAggressiveness: document.getElementById("max-aggressiveness"),
  maxAggressivenessValue: document.getElementById("max-aggressiveness-value"),
  aggressivenessOverrideEnabled: document.getElementById(
    "aggressiveness-override-enabled",
  ),
  aggressivenessOverride: document.getElementById("aggressiveness-override"),
  aggressivenessOverrideValue: document.getElementById(
    "aggressiveness-override-value",
  ),
  overrideSliderGroup: document.getElementById("override-slider-group"),
};

const experienceTemplate = document.getElementById("experience-template");

/**
 * Initialize options page
 */
async function init() {
  // Bind event listeners
  elements.saveBtn.addEventListener("click", saveAll);
  elements.resetBtn.addEventListener("click", resetAll);
  elements.addExperience.addEventListener("click", addExperienceItem);
  elements.pdfImport.addEventListener("change", handlePdfImport);

  // AggressiveFit slider listeners
  setupAggressiveFitListeners();

  // Setup collapsible sections
  setupCollapsibles();

  // Load saved data
  await loadSettings();
  await loadResume();
}

/**
 * Setup AggressiveFit event listeners
 */
function setupAggressiveFitListeners() {
  // Min fit score slider
  elements.minFitScore?.addEventListener("input", (e) => {
    elements.minFitScoreValue.textContent = `${e.target.value}%`;
  });

  // Max aggressiveness slider
  elements.maxAggressiveness?.addEventListener("input", (e) => {
    elements.maxAggressivenessValue.textContent = `${e.target.value}%`;
  });

  // Aggressiveness override slider
  elements.aggressivenessOverride?.addEventListener("input", (e) => {
    elements.aggressivenessOverrideValue.textContent = `${e.target.value}%`;
  });

  // Toggle override slider visibility
  elements.aggressivenessOverrideEnabled?.addEventListener("change", (e) => {
    if (elements.overrideSliderGroup) {
      elements.overrideSliderGroup.style.display = e.target.checked
        ? "block"
        : "none";
    }
  });
}

/**
 * Setup collapsible sections
 */
function setupCollapsibles() {
  const collapsibles = document.querySelectorAll(".section-title.collapsible");

  for (const title of collapsibles) {
    title.addEventListener("click", () => {
      const targetId = title.dataset.target;
      const content = document.getElementById(targetId);

      title.classList.toggle("collapsed");
      content.classList.toggle("collapsed");
    });
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get("settings");
    const settings = result.settings || {};

    elements.openRouterKey.value = settings.openRouterApiKey || "";
    elements.aiModel.value =
      settings.preferredModel || "anthropic/claude-sonnet-4";
    elements.coverTemplate.value = settings.coverLetterTemplate || "";

    // Load contact settings
    if (elements.contactTelegram) {
      elements.contactTelegram.value = settings.contactTelegram || "";
    }
    if (elements.contactEmail) {
      elements.contactEmail.value = settings.contactEmail || "";
    }

    // Load AggressiveFit settings
    const aggressiveFit = settings.aggressiveFit || {};

    if (elements.aggressiveFitEnabled) {
      elements.aggressiveFitEnabled.checked = aggressiveFit.enabled !== false;
    }

    if (elements.minFitScore) {
      const minFitValue = Math.round((aggressiveFit.minFitScore ?? 0.15) * 100);
      elements.minFitScore.value = minFitValue;
      elements.minFitScoreValue.textContent = `${minFitValue}%`;
    }

    if (elements.maxAggressiveness) {
      const maxAggrValue = Math.round(
        (aggressiveFit.maxAggressiveness ?? 0.95) * 100,
      );
      elements.maxAggressiveness.value = maxAggrValue;
      elements.maxAggressivenessValue.textContent = `${maxAggrValue}%`;
    }

    if (elements.aggressivenessOverrideEnabled) {
      const hasOverride = aggressiveFit.aggressivenessOverride !== null;
      elements.aggressivenessOverrideEnabled.checked = hasOverride;

      if (elements.overrideSliderGroup) {
        elements.overrideSliderGroup.style.display = hasOverride
          ? "block"
          : "none";
      }

      if (elements.aggressivenessOverride && hasOverride) {
        const overrideValue = Math.round(
          (aggressiveFit.aggressivenessOverride ?? 0.5) * 100,
        );
        elements.aggressivenessOverride.value = overrideValue;
        elements.aggressivenessOverrideValue.textContent = `${overrideValue}%`;
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

/**
 * Load resume from storage
 */
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

    // Load experience
    elements.experienceList.innerHTML = "";
    if (resume.experience?.length) {
      for (const exp of resume.experience) {
        addExperienceItem(exp);
      }
    }
  } catch (error) {
    console.error("Failed to load resume:", error);
  }
}

/**
 * Add experience item to the list
 */
function addExperienceItem(data = null) {
  const template = experienceTemplate.content.cloneNode(true);
  const item = template.querySelector(".experience-item");

  // Fill with data if provided
  if (data) {
    item.querySelector(".exp-company").value = data.company || "";
    item.querySelector(".exp-position").value = data.position || "";
    item.querySelector(".exp-start").value = data.startDate || "";
    item.querySelector(".exp-end").value = data.endDate || "";
    item.querySelector(".exp-description").value = data.description || "";
    item.querySelector(".exp-achievements").value =
      data.achievements?.join("\n") || "";
  }

  // Setup remove button
  const removeBtn = item.querySelector(".btn-remove");
  removeBtn.addEventListener("click", () => {
    item.remove();
  });

  elements.experienceList.appendChild(item);
}

/**
 * Collect settings from form
 */
function collectSettings() {
  // Collect AggressiveFit settings
  const aggressiveFitEnabled =
    elements.aggressiveFitEnabled?.checked !== false;
  const minFitScore = (parseInt(elements.minFitScore?.value, 10) || 15) / 100;
  const maxAggressiveness =
    (parseInt(elements.maxAggressiveness?.value, 10) || 95) / 100;

  let aggressivenessOverride = null;
  if (elements.aggressivenessOverrideEnabled?.checked) {
    aggressivenessOverride =
      (parseInt(elements.aggressivenessOverride?.value, 10) || 50) / 100;
  }

  return {
    openRouterApiKey: elements.openRouterKey.value.trim(),
    preferredModel: elements.aiModel.value,
    coverLetterTemplate: elements.coverTemplate.value.trim(),
    contactTelegram: elements.contactTelegram?.value.trim() || "",
    contactEmail: elements.contactEmail?.value.trim() || "",
    aggressiveFit: {
      enabled: aggressiveFitEnabled,
      minFitScore,
      maxAggressiveness,
      aggressivenessOverride,
    },
  };
}

/**
 * Collect resume from form
 */
function collectResume() {
  const experience = [];
  const experienceItems =
    elements.experienceList.querySelectorAll(".experience-item");

  for (const item of experienceItems) {
    const achievementsText = item
      .querySelector(".exp-achievements")
      .value.trim();
    const achievements = achievementsText
      ? achievementsText
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    experience.push({
      company: item.querySelector(".exp-company").value.trim(),
      position: item.querySelector(".exp-position").value.trim(),
      startDate: item.querySelector(".exp-start").value,
      endDate: item.querySelector(".exp-end").value || null,
      description: item.querySelector(".exp-description").value.trim(),
      achievements,
    });
  }

  const skillsText = elements.skills.value.trim();
  const skills = skillsText
    ? skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    fullName: elements.fullName.value.trim(),
    title: elements.title.value.trim(),
    summary: elements.summary.value.trim(),
    skills,
    experience,
    contacts: {
      email: elements.email.value.trim(),
      phone: elements.phone.value.trim(),
      telegram: elements.telegram.value.trim(),
    },
  };
}

/**
 * Save all settings and resume
 */
async function saveAll() {
  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = "Сохранение...";

  try {
    const settings = collectSettings();
    const resume = collectResume();

    await chrome.storage.local.set({
      settings,
      baseResume: resume,
    });

    showStatus("Настройки сохранены!", "success");
  } catch (error) {
    console.error("Failed to save:", error);
    showStatus("Ошибка сохранения: " + error.message, "error");
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = "Сохранить настройки";
  }
}

/**
 * Reset all data
 */
async function resetAll() {
  if (!confirm("Вы уверены, что хотите сбросить все настройки?")) {
    return;
  }

  try {
    await chrome.storage.local.remove(["settings", "baseResume"]);
    await loadSettings();
    await loadResume();
    showStatus("Настройки сброшены", "info");
  } catch (error) {
    showStatus("Ошибка: " + error.message, "error");
  }
}

/**
 * Show status message
 */
function showStatus(message, type = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.classList.remove("hidden");

  setTimeout(() => {
    elements.statusMessage.classList.add("hidden");
  }, 5000);
}

/**
 * Handle PDF file import
 */
async function handlePdfImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const statusEl = elements.importStatus;
  statusEl.textContent = "Извлечение текста из PDF...";
  statusEl.className = "import-status loading";

  try {
    // Extract text from PDF
    const pdfText = await extractTextFromPdf(file);

    if (!pdfText || pdfText.length < 100) {
      throw new Error(
        "Не удалось извлечь текст из PDF. Попробуйте другой файл.",
      );
    }

    statusEl.textContent = "Анализ резюме с помощью AI...";

    // Send to AI for parsing
    const response = await chrome.runtime.sendMessage({
      type: "PARSE_RESUME_PDF",
      pdfText: pdfText,
    });

    if (!response.success) {
      throw new Error(response.error || "Ошибка при анализе резюме");
    }

    // Fill the form with parsed data
    fillResumeForm(response.resume);

    statusEl.textContent = "Резюме успешно импортировано!";
    statusEl.className = "import-status success";

    // Clear after 3 seconds
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "import-status";
    }, 3000);
  } catch (error) {
    console.error("PDF import error:", error);
    statusEl.textContent = `Ошибка: ${error.message}`;
    statusEl.className = "import-status error";
  }

  // Clear the file input for re-import
  event.target.value = "";
}

/**
 * Extract text content from a PDF file
 */
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

/**
 * Fill resume form with parsed data
 */
function fillResumeForm(resume) {
  elements.fullName.value = resume.fullName || "";
  elements.title.value = resume.title || "";
  elements.summary.value = resume.summary || "";
  elements.skills.value = resume.skills?.join(", ") || "";
  elements.email.value = resume.contacts?.email || "";
  elements.phone.value = resume.contacts?.phone || "";
  elements.telegram.value = resume.contacts?.telegram || "";

  // Clear existing experience and add new
  elements.experienceList.innerHTML = "";
  if (resume.experience?.length) {
    for (const exp of resume.experience) {
      addExperienceItem(exp);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
