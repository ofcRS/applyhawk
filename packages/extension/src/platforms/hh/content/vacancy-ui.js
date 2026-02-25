/**
 * Content script for HH.ru vacancy pages
 * New UX: Side-by-side resume diff + cover letter, creates new resume on apply
 */

import { parseVacancy } from "./vacancy-parser.js";

// State
let modal = null;
let currentVacancy = null;
let baseResume = null;
let generatedResume = null;
let fitAssessment = null;
let isGenerating = false;

/**
 * Initialize content script
 */
async function init() {
  // Wait for page to fully load
  if (document.readyState !== "complete") {
    window.addEventListener("load", init);
    return;
  }

  // Check if we're on a vacancy page
  const vacancyId = getVacancyIdFromUrl();
  if (!vacancyId) return;

  // Parse vacancy data from page
  currentVacancy = parseVacancy(document);
  if (!currentVacancy) return;

  currentVacancy.id = vacancyId;

  // Inject AI apply button
  injectApplyButton();
}

/**
 * Get vacancy ID from current URL
 */
function getVacancyIdFromUrl() {
  const match = window.location.pathname.match(/\/vacancy\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Inject AI apply button next to the standard apply button
 */
function injectApplyButton() {
  // Find the response button container
  const responseActions =
    document.querySelector('[data-qa="vacancy-response-link-top"]')
      ?.parentElement || document.querySelector(".vacancy-actions");

  if (!responseActions) {
    console.log("ApplyHawk: Could not find response button container");
    return;
  }

  // Check if button already exists
  if (document.getElementById("hh-autoapply-btn")) return;

  // Create AI apply button
  const aiButton = document.createElement("button");
  aiButton.id = "hh-autoapply-btn";
  aiButton.className = "hh-autoapply-btn";
  aiButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
    AI Отклик
  `;
  aiButton.addEventListener("click", openModal);

  // Insert button
  responseActions.appendChild(aiButton);
}

/**
 * Open the AI apply modal
 */
async function openModal() {
  // Check HH auth status (cookies-based)
  const hhAuth = await sendMessage({ type: "CHECK_HH_AUTH" });
  if (!hhAuth.isLoggedIn) {
    showNotification("Войдите в HH.ru чтобы использовать расширение", "error");
    return;
  }

  // Reset state
  generatedResume = null;
  baseResume = null;
  fitAssessment = null;

  // Create modal if not exists
  if (!modal) {
    createModal();
  }

  // Show modal in ready state (user must click Generate)
  modal.classList.add("visible");
  document.body.style.overflow = "hidden";

  // Show vacancy preview and enable Generate button
  const generateBtn = document.getElementById("modal-generate-btn");
  if (generateBtn) {
    generateBtn.disabled = false;
    generateBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      Генерировать
    `;
  }

  // Reset resume columns to initial state
  const baseContent = document.getElementById("base-resume-content");
  const personalizedContent = document.getElementById("personalized-resume-content");
  if (baseContent) {
    baseContent.innerHTML = `<div style="color: #999; text-align: center; padding: 20px;">Нажмите «Генерировать» для начала</div>`;
  }
  if (personalizedContent) {
    personalizedContent.innerHTML = `<div style="color: #999; text-align: center; padding: 20px;">Ожидание генерации...</div>`;
  }
}

/**
 * Create the modal HTML with new layout
 */
function createModal() {
  modal = document.createElement("div");
  modal.id = "hh-autoapply-modal";
  modal.className = "hh-autoapply-modal";
  modal.innerHTML = `
    <div class="hh-autoapply-modal-content">
      <div class="hh-autoapply-modal-header">
        <h2>AI Персонализация для ${escapeHtml(currentVacancy?.company || "компании")}</h2>
        <div class="hh-autoapply-header-actions">
          <button id="modal-generate-btn" class="hh-autoapply-btn-generate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Генерировать
          </button>
          <button class="hh-autoapply-close" aria-label="Закрыть">&times;</button>
        </div>
      </div>

      <div class="hh-autoapply-modal-body">
        <!-- Vacancy Summary Bar -->
        <div class="vacancy-summary">
          <div class="vacancy-summary-item">
            <strong>${escapeHtml(currentVacancy?.name || "Вакансия")}</strong>
          </div>
          ${
            currentVacancy?.keySkills?.length
              ? `
            <div class="vacancy-summary-item">
              <span>Требуемые навыки:</span>
              <div class="vacancy-skills">
                ${currentVacancy.keySkills
                  .slice(0, 5)
                  .map(
                    (s) =>
                      `<span class="vacancy-skill">${escapeHtml(s)}</span>`,
                  )
                  .join("")}
                ${currentVacancy.keySkills.length > 5 ? `<span class="vacancy-skill">+${currentVacancy.keySkills.length - 5}</span>` : ""}
              </div>
            </div>
          `
              : ""
          }
        </div>

        <!-- Resume Comparison Section -->
        <div class="resume-comparison" id="resume-comparison">
          <!-- Left: Base Resume -->
          <div class="resume-column original">
            <div class="resume-column-header">
              <h4>Базовое резюме</h4>
              <span class="badge">Из настроек</span>
            </div>
            <div id="base-resume-content" class="resume-loading">
              <div class="spinner"></div>
              <span>Загрузка...</span>
            </div>
          </div>

          <!-- Right: Personalized Resume -->
          <div class="resume-column personalized">
            <div class="resume-column-header">
              <h4>Персонализированное</h4>
              <span class="badge">AI</span>
            </div>
            <div id="personalized-resume-content" class="resume-loading">
              <div class="spinner"></div>
              <span>Генерация (30-60 сек)...</span>
            </div>
          </div>
        </div>

        <!-- Fit Score Section -->
        <div id="fit-score-section" class="fit-score-section hidden">
          <div class="fit-score-header">
            <div class="fit-score-bar-container">
              <div id="fit-score-bar" class="fit-score-bar" style="width: 0%"></div>
            </div>
            <span id="fit-score-value" class="fit-score-value">--</span>
          </div>
          <div id="fit-score-details" class="fit-score-details">
            <!-- Will show gaps and strengths -->
          </div>
          <div id="fit-warning" class="fit-warning hidden">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text"></span>
            <button id="proceed-anyway-btn" class="btn-link">Продолжить</button>
          </div>
        </div>

        <!-- Match Summary -->
        <div id="match-summary" class="match-summary hidden">
          <!-- Will be populated after generation -->
        </div>

        <!-- Cover Letter Section -->
        <div class="cover-letter-section">
          <div class="cover-letter-header">
            <h4>Сопроводительное письмо</h4>
            <button id="regenerate-letter-btn" class="hh-autoapply-btn-generate btn-sm" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Перегенерировать
            </button>
          </div>
          <textarea
            id="modal-cover-letter"
            class="hh-autoapply-textarea"
            rows="6"
            placeholder="Сопроводительное письмо будет сгенерировано автоматически..."
            disabled
          ></textarea>
          <div id="letter-status" class="hh-autoapply-status"></div>
        </div>
      </div>

      <div class="hh-autoapply-modal-footer">
        <button id="modal-cancel-btn" class="hh-autoapply-btn-secondary">
          Отмена
        </button>
        <button id="modal-apply-btn" class="hh-autoapply-btn-apply" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span id="apply-btn-text">Откликнуться</span>
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  modal
    .querySelector(".hh-autoapply-close")
    .addEventListener("click", closeModal);
  modal
    .querySelector("#modal-cancel-btn")
    .addEventListener("click", closeModal);
  modal
    .querySelector("#modal-generate-btn")
    .addEventListener("click", () => {
      const btn = document.getElementById("modal-generate-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Генерация...';
      }
      startGeneration();
    });
  modal
    .querySelector("#regenerate-letter-btn")
    .addEventListener("click", regenerateLetter);
  modal
    .querySelector("#modal-apply-btn")
    .addEventListener("click", submitApplication);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.body.appendChild(modal);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

/**
 * Close the modal
 */
function closeModal() {
  if (modal) {
    modal.classList.remove("visible");
    document.body.style.overflow = "";
  }
}

/**
 * Start the generation process when modal opens
 */
async function startGeneration() {
  if (isGenerating) return;
  isGenerating = true;

  const baseContent = document.getElementById("base-resume-content");
  const personalizedContent = document.getElementById(
    "personalized-resume-content",
  );
  const fitScoreSection = document.getElementById("fit-score-section");

  try {
    // Step 1: Load base resume
    baseResume = await sendMessage({ type: "GET_BASE_RESUME" });

    if (!baseResume || !baseResume.experience?.length) {
      baseContent.innerHTML = `
        <div style="color: #f44336; text-align: center; padding: 20px;">
          <p>Базовое резюме не заполнено</p>
          <p style="font-size: 12px; color: #666;">Откройте настройки расширения и загрузите своё резюме</p>
        </div>
      `;
      personalizedContent.innerHTML = `
        <div style="color: #999; text-align: center; padding: 20px;">
          Сначала заполните базовое резюме
        </div>
      `;
      return;
    }

    // Display base resume
    baseContent.innerHTML = renderResumeColumn(baseResume, false);

    // Step 2: Assess fit score
    personalizedContent.innerHTML = `
      <div class="resume-loading">
        <div class="spinner"></div>
        <span>Оценка соответствия...</span>
      </div>
    `;

    fitAssessment = await sendMessage({
      type: "ASSESS_FIT_SCORE",
      vacancy: currentVacancy,
      resume: baseResume,
    });

    if (fitAssessment.success) {
      // Display fit score
      displayFitScore(fitAssessment);

      // Check if should skip
      if (fitAssessment.skipRecommendation?.skip) {
        // Replace spinner with warning message in the personalized column
        const percent = Math.round((fitAssessment.fitScore || 0) * 100);
        const gapsHtml = (fitAssessment.gaps || [])
          .slice(0, 3)
          .map((g) => `<div>• ${escapeHtml(g)}</div>`)
          .join("");

        personalizedContent.innerHTML = `
          <div class="low-fit-warning">
            <div class="warning-icon-large">⚠️</div>
            <div class="warning-title">Низкое соответствие: ${percent}%</div>
            <div class="warning-message">
              Резюме не соответствует вакансии. Генерация может быть неэффективной.
            </div>
            <div class="warning-gaps">${gapsHtml}</div>
          </div>
        `;

        showFitWarning();
        // Wait for user to click "Proceed anyway" before continuing
        const shouldContinue = await waitForProceedConfirmation();
        if (!shouldContinue) {
          personalizedContent.innerHTML = `
            <div style="color: #999; text-align: center; padding: 20px;">
              Генерация отменена
            </div>
          `;
          return;
        }
      }
    }

    // Step 3: Generate personalized resume (with fit assessment)
    personalizedContent.innerHTML = `
      <div class="resume-loading">
        <div class="spinner"></div>
        <span>Генерация резюме (30-60 сек)...</span>
      </div>
    `;

    const response = await sendMessage({
      type: "GENERATE_PERSONALIZED_RESUME",
      baseResume: baseResume,
      vacancy: currentVacancy,
      fitAssessment: fitAssessment,
      aggressiveness: fitAssessment?.aggressiveness,
    });

    if (response.success) {
      generatedResume = response;

      // Display personalized resume with diff highlighting
      personalizedContent.innerHTML = renderResumeColumn(
        {
          experience: response.experience,
          skills: response.keySkills,
        },
        true,
      );

      // Show match summary
      showMatchSummary(response);

      // Step 4: Generate cover letter (with fit assessment)
      await generateCoverLetterWithFit();

      // Enable apply button
      document.getElementById("modal-apply-btn").disabled = false;
      document.getElementById("regenerate-letter-btn").disabled = false;
    } else {
      throw new Error(response.error || "Ошибка генерации");
    }
  } catch (error) {
    console.error("Generation error:", error);
    personalizedContent.innerHTML = `
      <div style="color: #f44336; text-align: center; padding: 20px;">
        <p>Ошибка генерации</p>
        <p style="font-size: 12px;">${escapeHtml(error.message)}</p>
        <button onclick="window.hhAutoApplyRetry()" class="hh-autoapply-btn-generate" style="margin-top: 12px;">
          Попробовать снова
        </button>
      </div>
    `;

    // Add retry handler
    window.hhAutoApplyRetry = () => {
      isGenerating = false;
      fitAssessment = null;
      personalizedContent.innerHTML = `
        <div class="resume-loading">
          <div class="spinner"></div>
          <span>Генерация (30-60 сек)...</span>
        </div>
      `;
      if (fitScoreSection) fitScoreSection.classList.add("hidden");
      startGeneration();
    };
  } finally {
    isGenerating = false;
  }
}

/**
 * Display fit score in the UI
 */
function displayFitScore(assessment) {
  const section = document.getElementById("fit-score-section");
  const bar = document.getElementById("fit-score-bar");
  const value = document.getElementById("fit-score-value");
  const details = document.getElementById("fit-score-details");

  if (!section || !bar || !value || !details) return;

  const score = assessment.fitScore || 0;
  const percent = Math.round(score * 100);
  const aggressiveness = assessment.aggressiveness || 0;

  // Update bar
  bar.style.width = `${percent}%`;
  bar.className = "fit-score-bar";
  if (score >= 0.7) {
    bar.classList.add("high");
  } else if (score >= 0.4) {
    bar.classList.add("medium");
  } else {
    bar.classList.add("low");
  }

  // Update value
  value.textContent = `${percent}%`;

  // Update details
  let detailsHtml = "";

  if (assessment.strengths?.length) {
    detailsHtml += `
      <div class="fit-detail positive">
        <span class="icon">✓</span>
        <span>${escapeHtml(assessment.strengths.slice(0, 2).join(", "))}</span>
      </div>
    `;
  }

  if (assessment.gaps?.length) {
    detailsHtml += `
      <div class="fit-detail negative">
        <span class="icon">−</span>
        <span>${escapeHtml(assessment.gaps.slice(0, 2).join(", "))}</span>
      </div>
    `;
  }

  detailsHtml += `
    <div class="fit-detail neutral">
      <span class="icon">⚙</span>
      <span>Агрессивность: ${Math.round(aggressiveness * 100)}%</span>
    </div>
  `;

  details.innerHTML = detailsHtml;
  section.classList.remove("hidden");
}

/**
 * Show fit warning when score is too low
 */
function showFitWarning() {
  const warning = document.getElementById("fit-warning");
  if (!warning) return;

  const text = warning.querySelector(".warning-text");
  if (text) {
    text.textContent = "Уверены, что хотите продолжить генерацию?";
  }

  warning.classList.remove("hidden");
}

/**
 * Wait for user to confirm proceeding despite low fit
 */
function waitForProceedConfirmation() {
  return new Promise((resolve) => {
    const proceedBtn = document.getElementById("proceed-anyway-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");

    const cleanup = () => {
      if (proceedBtn) proceedBtn.removeEventListener("click", onProceed);
      if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
    };

    const onProceed = () => {
      cleanup();
      const warning = document.getElementById("fit-warning");
      if (warning) warning.classList.add("hidden");
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    if (proceedBtn) proceedBtn.addEventListener("click", onProceed);
    if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
  });
}

/**
 * Render a resume column (base or personalized)
 */
function renderResumeColumn(resume, isPersonalized) {
  let html = "";

  // Experience section
  const experience = resume.experience || [];
  if (experience.length) {
    html += '<div class="preview-section"><strong>Опыт работы</strong>';
    experience.forEach((exp) => {
      const position = exp.position || exp.title || "Должность";
      const company = exp.companyName || exp.company || "Компания";
      const description = exp.description || "";

      html += `
        <div class="exp-item">
          <div class="exp-item-header">
            <div>
              <div class="exp-item-title">${escapeHtml(position)}</div>
              <div class="exp-item-company">${escapeHtml(company)}</div>
            </div>
            <div class="exp-item-period">
              ${exp.startDate || ""} — ${exp.endDate || "настоящее время"}
            </div>
          </div>
          <div class="exp-item-description ${isPersonalized ? "diff-changed" : ""}">
            ${escapeHtml(description).replace(/\n/g, "<br>")}
          </div>
        </div>
      `;
    });
    html += "</div>";
  }

  // Skills section
  const skills = resume.skills || resume.keySkills || [];
  if (skills.length) {
    const vacancySkills = (currentVacancy?.keySkills || []).map((s) =>
      s.toLowerCase(),
    );

    html += '<div class="preview-section"><strong>Ключевые навыки</strong>';
    html += '<div class="preview-skills">';

    skills.forEach((skill, index) => {
      const skillLower = skill.toLowerCase();
      const isMatched = vacancySkills.some(
        (vs) => vs.includes(skillLower) || skillLower.includes(vs),
      );

      let tagClass = "skill-tag";
      if (isPersonalized) {
        if (isMatched) {
          tagClass += " matched";
        } else if (index < 5) {
          tagClass += " reordered";
        }
      }

      html += `<span class="${tagClass}">${escapeHtml(skill)}</span>`;
    });

    html += "</div></div>";
  }

  return (
    html || '<div style="color: #999; text-align: center;">Нет данных</div>'
  );
}

/**
 * Show match summary after generation
 */
function showMatchSummary(response) {
  const summary = document.getElementById("match-summary");
  if (!summary) return;

  const vacancySkills = currentVacancy?.keySkills || [];
  const resumeSkills = response.keySkills || [];

  // Count matched skills
  const matchedCount = resumeSkills.filter((rs) =>
    vacancySkills.some(
      (vs) =>
        vs.toLowerCase().includes(rs.toLowerCase()) ||
        rs.toLowerCase().includes(vs.toLowerCase()),
    ),
  ).length;

  // Get aggressiveness level description
  const aggressiveness = response.appliedAggressiveness || 0;
  let aggressivenessLabel = "Консервативный";
  if (aggressiveness >= 0.9) {
    aggressivenessLabel = "Максимальный";
  } else if (aggressiveness >= 0.6) {
    aggressivenessLabel = "Агрессивный";
  } else if (aggressiveness >= 0.3) {
    aggressivenessLabel = "Умеренный";
  }

  summary.innerHTML = `
    <div class="match-summary-item positive">
      <span class="icon">✓</span>
      <span>Опыт адаптирован под вакансию</span>
    </div>
    <div class="match-summary-item ${matchedCount > 0 ? "positive" : "neutral"}">
      <span class="icon">${matchedCount > 0 ? "✓" : "○"}</span>
      <span>Совпадает навыков: ${matchedCount} из ${vacancySkills.length}</span>
    </div>
    <div class="match-summary-item neutral">
      <span class="icon">⚙</span>
      <span>Уровень переписывания: ${aggressivenessLabel} (${Math.round(aggressiveness * 100)}%)</span>
    </div>
  `;

  summary.classList.remove("hidden");
}

/**
 * Generate cover letter (legacy, without fit assessment)
 */
async function generateCoverLetter() {
  return generateCoverLetterWithFit();
}

/**
 * Generate cover letter with fit assessment
 * Uses personalized resume data (not base resume) for better relevance
 */
async function generateCoverLetterWithFit() {
  const textarea = document.getElementById("modal-cover-letter");
  const status = document.getElementById("letter-status");

  textarea.disabled = true;
  textarea.placeholder = "Генерация письма...";

  try {
    const response = await sendMessage({
      type: "GENERATE_COVER_LETTER",
      vacancy: currentVacancy,
      // Use personalized resume data instead of base resume
      personalized: {
        title: generatedResume?.title || baseResume?.title || "",
        keySkills: generatedResume?.keySkills || baseResume?.skills || [],
        experience: generatedResume?.experience || baseResume?.experience || [],
      },
      fitAssessment: fitAssessment,
      // Pass aggressiveness to match the tone with resume personalization
      aggressiveness: fitAssessment?.aggressiveness || 0.5,
    });

    if (response.success) {
      textarea.value = response.coverLetter;
      textarea.disabled = false;
      status.textContent = `Сгенерировано с ${response.model}`;
      status.className = "hh-autoapply-status success";
    } else {
      throw new Error(response.error || "Ошибка генерации");
    }
  } catch (error) {
    console.error("Cover letter error:", error);
    textarea.disabled = false;
    textarea.placeholder = "Напишите сопроводительное письмо...";
    status.textContent = `Ошибка: ${error.message}`;
    status.className = "hh-autoapply-status error";
  }
}

/**
 * Regenerate cover letter
 */
async function regenerateLetter() {
  const btn = document.getElementById("regenerate-letter-btn");
  const origHtml = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Генерация...';

  await generateCoverLetter();

  btn.disabled = false;
  btn.innerHTML = origHtml;
}

/**
 * Submit application: Create new resume and apply
 */
async function submitApplication() {
  const btn = document.getElementById("modal-apply-btn");
  const coverLetter = document
    .getElementById("modal-cover-letter")
    .value.trim();
  const status = document.getElementById("letter-status");

  if (!generatedResume) {
    status.textContent = "Дождитесь генерации резюме";
    status.className = "hh-autoapply-status error";
    return;
  }

  btn.disabled = true;

  try {
    // Step 1: Generate AI title for resume
    btn.innerHTML = '<span class="spinner"></span> Генерация названия...';

    const titleResponse = await sendMessage({
      type: "GENERATE_RESUME_TITLE",
      vacancy: currentVacancy,
      resume: generatedResume,
    });

    // Fallback title if AI generation fails
    const resumeTitle =
      titleResponse.success && titleResponse.title
        ? titleResponse.title
        : generatedResume.experience?.[0]?.position || "Специалист";

    console.log("[ApplyHawk] Resume title:", resumeTitle);

    // Step 2: Create new resume on HH.ru
    btn.innerHTML = '<span class="spinner"></span> Создание резюме...';

    const createResponse = await sendMessage({
      type: "CREATE_COMPLETE_RESUME",
      baseResume: baseResume,
      personalizedData: generatedResume,
      title: resumeTitle,
    });

    if (!createResponse.success) {
      throw new Error(createResponse.error || "Не удалось создать резюме");
    }

    const resumeHashToUse = createResponse.resumeHash;
    console.log("[ApplyHawk] Created resume:", resumeHashToUse);

    // Step 3: Apply to vacancy
    btn.innerHTML = '<span class="spinner"></span> Отправка отклика...';

    const applyResponse = await sendMessage({
      type: "APPLY_INTERNAL",
      vacancyId: currentVacancy.id,
      resumeHash: resumeHashToUse,
      coverLetter,
    });

    if (applyResponse.success) {
      showNotification("Отклик успешно отправлен!", "success");
      closeModal();

      // Mark button as applied
      const aiBtn = document.getElementById("hh-autoapply-btn");
      if (aiBtn) {
        aiBtn.innerHTML = "✓ Отклик отправлен";
        aiBtn.disabled = true;
        aiBtn.classList.add("applied");
      }
    } else {
      throw new Error(applyResponse.error || "Ошибка отправки отклика");
    }
  } catch (error) {
    console.error("Application error:", error);
    status.textContent = error.message;
    status.className = "hh-autoapply-status error";

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span id="apply-btn-text">Откликнуться</span>
    `;
  }
}

/**
 * Show notification toast
 */
function showNotification(message, type = "info") {
  const existing = document.querySelector(".hh-autoapply-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `hh-autoapply-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

// Initialize
init();
