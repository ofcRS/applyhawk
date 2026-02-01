/**
 * @applyhawk/core
 * Shared core functionality for ApplyHawk web and extension
 */

// Types
export * from "./types";

// AI
export {
  OpenRouterClient,
  createAIClient,
  calculateAggressiveness,
  shouldSkipVacancy,
  stripHtml,
  formatExperience,
  formatExperienceForPersonalization,
} from "./ai";

// Storage
export {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_RESUME,
  WebStorageAdapter,
  ExtensionStorageAdapter,
  createWebStorage,
  createExtensionStorage,
  getSettings,
  saveSettings,
  getBaseResume,
  saveBaseResume,
  getAppliedVacancies,
  markVacancyAsApplied,
  isVacancyApplied,
  getDailyCounter,
  incrementDailyCounter,
  getRemainingApplications,
} from "./storage";
export type { StorageAdapter, StorageKey } from "./storage";

// Prompts
export {
  detectLanguage,
  containsCyrillic,
  getLanguageName,
  createPromptLoader,
  interpolate,
} from "./prompts";
export type {
  PromptLoaderConfig,
  BuiltPrompt,
  PromptTemplate,
} from "./prompts";

// PDF
export { generatePdfResume, PAGE_WIDTH, PAGE_HEIGHT, MARGIN } from "./pdf";
