/**
 * Prompt loader utility
 * Loads and interpolates YAML prompt templates
 */

import yaml from "js-yaml";

// Cache for loaded prompts
const promptCache = new Map();

/**
 * Load a prompt template from YAML file
 *
 * @param {string} promptName - Name of the prompt file (without .yaml extension)
 * @returns {Promise<Object>} - Parsed prompt object with name, system, user, temperature, max_tokens
 */
export async function loadPrompt(promptName) {
  // Check cache first
  if (promptCache.has(promptName)) {
    return promptCache.get(promptName);
  }

  const url = chrome.runtime.getURL(`prompts/${promptName}.yaml`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load prompt: ${promptName}`);
  }

  const yamlText = await response.text();
  const prompt = yaml.load(yamlText);

  // Cache the parsed prompt
  promptCache.set(promptName, prompt);

  return prompt;
}

/**
 * Interpolate template variables in a string
 *
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Object with variable values
 * @returns {string} - Interpolated string
 */
export function interpolate(template, variables) {
  if (!template) return "";

  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    // Handle nested paths like "vacancy.name"
    const value = path.split(".").reduce((obj, key) => {
      return obj?.[key.trim()];
    }, variables);

    // Return empty string for undefined/null, otherwise convert to string
    if (value === undefined || value === null) {
      return "";
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  });
}

/**
 * Load and build a complete prompt with interpolated variables
 *
 * @param {string} promptName - Name of the prompt file
 * @param {Object} variables - Variables to interpolate
 * @returns {Promise<Object>} - { system, user, temperature, max_tokens }
 */
export async function buildPromptFromTemplate(promptName, variables) {
  const template = await loadPrompt(promptName);

  return {
    system: interpolate(template.system, variables),
    user: interpolate(template.user, variables),
    temperature: template.temperature,
    max_tokens: template.max_tokens,
  };
}

/**
 * Clear the prompt cache (useful for development/testing)
 */
export function clearPromptCache() {
  promptCache.clear();
}
