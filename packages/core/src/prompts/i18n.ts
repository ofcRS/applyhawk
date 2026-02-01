/**
 * Language detection for prompts
 * Detects whether text is primarily Russian or English
 */

import type { Language } from "../types";

// Cyrillic character range: U+0400 to U+04FF
const CYRILLIC_REGEX = /[\u0400-\u04FF]/g;

/**
 * Detect language of text based on Cyrillic character ratio
 * @param text - Text to analyze
 * @param threshold - Ratio of Cyrillic chars needed to classify as Russian (default 0.3)
 * @returns Detected language ('ru' or 'en')
 */
export function detectLanguage(text: string, threshold = 0.3): Language {
  if (!text || text.trim().length === 0) {
    return "en";
  }

  // Count Cyrillic characters
  const cyrillicMatches = text.match(CYRILLIC_REGEX);
  const cyrillicCount = cyrillicMatches?.length || 0;

  // Count total letter characters (excluding numbers, punctuation, whitespace)
  const letterMatches = text.match(/[\p{L}]/gu);
  const letterCount = letterMatches?.length || 1; // Avoid division by zero

  const cyrillicRatio = cyrillicCount / letterCount;

  return cyrillicRatio >= threshold ? "ru" : "en";
}

/**
 * Check if text contains any Cyrillic characters
 */
export function containsCyrillic(text: string): boolean {
  return CYRILLIC_REGEX.test(text);
}

/**
 * Get language name for display
 */
export function getLanguageName(lang: Language): string {
  return lang === "ru" ? "Russian" : "English";
}
