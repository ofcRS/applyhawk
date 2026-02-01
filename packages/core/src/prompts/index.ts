/**
 * Prompts module exports
 */

export { detectLanguage, containsCyrillic, getLanguageName } from "./i18n";
export { createPromptLoader, interpolate } from "./loader";
export type { PromptLoaderConfig, BuiltPrompt, PromptTemplate } from "./loader";
