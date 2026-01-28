/**
 * Storage module exports
 */

export { STORAGE_KEYS } from './types';
export type { StorageAdapter, StorageKey } from './types';
export { WebStorageAdapter, createWebStorage } from './web';
export { ExtensionStorageAdapter, createExtensionStorage } from './extension';

import type { StorageAdapter } from './types';
import { STORAGE_KEYS } from './types';
import type { Resume, Settings } from '../types';

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  openRouterApiKey: '',
  preferredModel: 'anthropic/claude-sonnet-4',
  defaultHHResumeId: '',
  coverLetterTemplate: '',
  contactEmail: '',
  contactTelegram: '',
  aggressiveFit: {
    enabled: true,
    minFitScore: 0.15,
    maxAggressiveness: 0.95,
    aggressivenessOverride: null,
  },
};

/**
 * Default empty resume
 */
export const DEFAULT_RESUME: Resume = {
  fullName: '',
  title: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
  contacts: {
    email: '',
    phone: '',
    telegram: '',
  },
};

/**
 * Storage helper functions that work with any adapter
 */
export async function getSettings(storage: StorageAdapter): Promise<Settings> {
  const settings = await storage.get<Settings>(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(storage: StorageAdapter, settings: Partial<Settings>): Promise<void> {
  const current = await getSettings(storage);
  await storage.set(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
}

export async function getBaseResume(storage: StorageAdapter): Promise<Resume | null> {
  return storage.get<Resume>(STORAGE_KEYS.BASE_RESUME);
}

export async function saveBaseResume(storage: StorageAdapter, resume: Partial<Resume>): Promise<void> {
  await storage.set(STORAGE_KEYS.BASE_RESUME, { ...DEFAULT_RESUME, ...resume });
}

export async function getAppliedVacancies(storage: StorageAdapter): Promise<string[]> {
  const applied = await storage.get<string[]>(STORAGE_KEYS.APPLIED_VACANCIES);
  return applied ?? [];
}

export async function markVacancyAsApplied(storage: StorageAdapter, vacancyId: string): Promise<void> {
  const applied = await getAppliedVacancies(storage);
  if (!applied.includes(vacancyId)) {
    applied.push(vacancyId);
    await storage.set(STORAGE_KEYS.APPLIED_VACANCIES, applied);
  }
}

export async function isVacancyApplied(storage: StorageAdapter, vacancyId: string): Promise<boolean> {
  const applied = await getAppliedVacancies(storage);
  return applied.includes(vacancyId);
}

interface DailyCounter {
  date: string;
  count: number;
}

export async function getDailyCounter(storage: StorageAdapter): Promise<DailyCounter> {
  const counter = await storage.get<DailyCounter>(STORAGE_KEYS.DAILY_COUNTER);
  const today = new Date().toISOString().split('T')[0];

  if (!counter || counter.date !== today) {
    return { date: today, count: 0 };
  }

  return counter;
}

export async function incrementDailyCounter(storage: StorageAdapter): Promise<DailyCounter> {
  const counter = await getDailyCounter(storage);
  counter.count += 1;
  await storage.set(STORAGE_KEYS.DAILY_COUNTER, counter);
  return counter;
}

export async function getRemainingApplications(storage: StorageAdapter): Promise<number> {
  const counter = await getDailyCounter(storage);
  return Math.max(0, 200 - counter.count);
}
