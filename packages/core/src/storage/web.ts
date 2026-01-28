/**
 * Web storage adapter using localStorage
 * For use in the web application (applyhawk.top)
 */

import type { StorageAdapter } from './types';

const STORAGE_PREFIX = 'applyhawk_';

export class WebStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this.getKey(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export function createWebStorage(prefix?: string): StorageAdapter {
  return new WebStorageAdapter(prefix);
}
