/**
 * Storage adapter interface
 * Abstracts storage implementation for web (localStorage) vs extension (chrome.storage)
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEYS = {
  BASE_RESUME: 'baseResume',
  SETTINGS: 'settings',
  APPLIED_VACANCIES: 'appliedVacancies',
  DAILY_COUNTER: 'dailyCounter',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
