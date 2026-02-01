/**
 * Chrome extension storage adapter
 * Uses chrome.storage.local for persistent storage
 */

import type { StorageAdapter } from "./types";

declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    };
    session: {
      clear(): Promise<void>;
    };
  };
};

export class ExtensionStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
  }
}

export function createExtensionStorage(): StorageAdapter {
  return new ExtensionStorageAdapter();
}
