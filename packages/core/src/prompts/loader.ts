/**
 * Prompt loader utility
 * Loads and interpolates YAML prompt templates
 * Works with both web (fetch from URL) and extension (chrome.runtime.getURL)
 */

import yaml from 'js-yaml';
import type { BuiltPrompt, Language, PromptTemplate } from '../types';

// Cache for loaded prompts
const promptCache = new Map<string, PromptTemplate>();

/**
 * Interpolate template variables in a string
 *
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Interpolated string
 */
export function interpolate(template: string | undefined, variables: Record<string, unknown>): string {
  if (!template) return '';

  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    // Handle nested paths like "vacancy.name"
    const value = path.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key.trim()];
      }
      return undefined;
    }, variables);

    // Return empty string for undefined/null, otherwise convert to string
    if (value === undefined || value === null) {
      return '';
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  });
}

/**
 * Prompt loader configuration
 */
export interface PromptLoaderConfig {
  /**
   * Base URL for loading prompts
   * For extension: use chrome.runtime.getURL('prompts/')
   * For web: use '/prompts/' or full URL
   */
  baseUrl: string;

  /**
   * Default language for prompts
   */
  defaultLanguage?: Language;

  /**
   * Whether to use language-specific subdirectories (templates/en/, templates/ru/)
   */
  useLanguageSubdirs?: boolean;
}

/**
 * Create a prompt loader with configuration
 */
export function createPromptLoader(config: PromptLoaderConfig) {
  const { baseUrl, defaultLanguage = 'en', useLanguageSubdirs = false } = config;

  /**
   * Get the URL for a prompt file
   */
  function getPromptUrl(promptName: string, language?: Language): string {
    const lang = language || defaultLanguage;

    if (useLanguageSubdirs) {
      return `${baseUrl}templates/${lang}/${promptName}.yaml`;
    }

    return `${baseUrl}${promptName}.yaml`;
  }

  /**
   * Get cache key for a prompt
   */
  function getCacheKey(promptName: string, language?: Language): string {
    return useLanguageSubdirs ? `${language || defaultLanguage}:${promptName}` : promptName;
  }

  /**
   * Load a prompt template from YAML file
   */
  async function loadPrompt(promptName: string, language?: Language): Promise<PromptTemplate> {
    const cacheKey = getCacheKey(promptName, language);

    // Check cache first
    if (promptCache.has(cacheKey)) {
      return promptCache.get(cacheKey)!;
    }

    const url = getPromptUrl(promptName, language);
    const response = await fetch(url);

    if (!response.ok) {
      // If language-specific prompt not found, try default
      if (useLanguageSubdirs && language !== defaultLanguage) {
        return loadPrompt(promptName, defaultLanguage);
      }
      throw new Error(`Failed to load prompt: ${promptName}`);
    }

    const yamlText = await response.text();
    const prompt = yaml.load(yamlText) as PromptTemplate;

    // Cache the parsed prompt
    promptCache.set(cacheKey, prompt);

    return prompt;
  }

  /**
   * Load and build a complete prompt with interpolated variables
   */
  async function buildPromptFromTemplate(
    promptName: string,
    variables: Record<string, unknown>,
    language?: Language
  ): Promise<BuiltPrompt> {
    const template = await loadPrompt(promptName, language);

    return {
      system: interpolate(template.system, variables),
      user: interpolate(template.user, variables),
      temperature: template.temperature,
      max_tokens: template.max_tokens,
    };
  }

  /**
   * Clear the prompt cache
   */
  function clearPromptCache(): void {
    promptCache.clear();
  }

  return {
    loadPrompt,
    buildPromptFromTemplate,
    clearPromptCache,
    getPromptUrl,
  };
}

/**
 * Export types for prompt building
 */
export type { BuiltPrompt, PromptTemplate } from '../types';
