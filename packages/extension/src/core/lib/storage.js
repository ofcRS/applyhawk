/**
 * Chrome storage wrapper
 * Provides typed access to extension storage
 */

const STORAGE_KEYS = {
  BASE_RESUME: "baseResume",
  SETTINGS: "settings",
  APPLIED_VACANCIES: "appliedVacancies",
  DAILY_COUNTER: "dailyCounter",
  FORM_TEMPLATE_CACHE: "formTemplateCache",
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  openRouterApiKey: "",
  preferredModel: "anthropic/claude-sonnet-4",
  defaultHHResumeId: "",
  coverLetterTemplate: "",
  // Contact info for cover letters
  contactEmail: "",
  contactTelegram: "",
  aggressiveFit: {
    enabled: true,
    minFitScore: 0.15, // Skip vacancies below this
    maxAggressiveness: 0.95, // Cap on aggressiveness
    aggressivenessOverride: null, // Manual override (null = auto)
  },
};

/**
 * Default empty resume
 */
const DEFAULT_RESUME = {
  fullName: "",
  title: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  contacts: {
    email: "",
    phone: "",
    telegram: "",
  },
};

/**
 * Get settings from storage
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS, ...settings },
  });
}

/**
 * Get base resume from storage
 */
export async function getBaseResume() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.BASE_RESUME);
  return result[STORAGE_KEYS.BASE_RESUME] || null;
}

/**
 * Save base resume to storage
 */
export async function saveBaseResume(resume) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.BASE_RESUME]: { ...DEFAULT_RESUME, ...resume },
  });
}

/**
 * Get list of applied vacancy IDs
 */
export async function getAppliedVacancies() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.APPLIED_VACANCIES);
  return result[STORAGE_KEYS.APPLIED_VACANCIES] || [];
}

/**
 * Mark vacancy as applied
 */
export async function markVacancyAsApplied(vacancyId) {
  const applied = await getAppliedVacancies();
  if (!applied.includes(vacancyId)) {
    applied.push(vacancyId);
    await chrome.storage.local.set({
      [STORAGE_KEYS.APPLIED_VACANCIES]: applied,
    });
  }
}

/**
 * Check if already applied to vacancy
 */
export async function isVacancyApplied(vacancyId) {
  const applied = await getAppliedVacancies();
  return applied.includes(vacancyId);
}

/**
 * Get daily application counter
 * Resets at midnight
 */
export async function getDailyCounter() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DAILY_COUNTER);
  const counter = result[STORAGE_KEYS.DAILY_COUNTER] || { date: "", count: 0 };

  const today = new Date().toISOString().split("T")[0];

  // Reset counter if it's a new day
  if (counter.date !== today) {
    return { date: today, count: 0 };
  }

  return counter;
}

/**
 * Increment daily application counter
 */
export async function incrementDailyCounter() {
  const counter = await getDailyCounter();
  counter.count += 1;

  await chrome.storage.local.set({
    [STORAGE_KEYS.DAILY_COUNTER]: counter,
  });

  return counter;
}

/**
 * Get remaining applications for today (out of 200)
 */
export async function getRemainingApplications() {
  const counter = await getDailyCounter();
  return Math.max(0, 200 - counter.count);
}

/**
 * Clear all extension data
 */
export async function clearAllData() {
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
}
