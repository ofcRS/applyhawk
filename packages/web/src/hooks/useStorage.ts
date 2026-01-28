import { useState, useEffect, useCallback } from 'react';
import {
  createWebStorage,
  getBaseResume,
  saveBaseResume,
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  DEFAULT_RESUME,
} from '@applyhawk/core';
import type { Resume, Settings } from '@applyhawk/core';

const storage = createWebStorage();

export function useStorage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from storage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedResume, loadedSettings] = await Promise.all([
          getBaseResume(storage),
          getSettings(storage),
        ]);
        setResume(loadedResume || DEFAULT_RESUME);
        setSettings(loadedSettings);
      } catch (err) {
        console.error('Failed to load data from storage:', err);
        setResume(DEFAULT_RESUME);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  const updateResume = useCallback(async (newResume: Partial<Resume>) => {
    const updated = { ...resume, ...newResume } as Resume;
    setResume(updated);
    await saveBaseResume(storage, updated);
  }, [resume]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(storage, updated);
  }, [settings]);

  const clearAllData = useCallback(async () => {
    await storage.clear();
    setResume(DEFAULT_RESUME);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    resume,
    settings,
    isLoaded,
    updateResume,
    updateSettings,
    clearAllData,
  };
}
